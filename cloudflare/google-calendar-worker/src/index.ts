interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  ALFRED_ORIGIN: string;
  ALFRED_RETURN_URL: string;
  TOKEN_ENCRYPTION_KEY: string;
  SESSION_SIGNING_KEY: string;
}

class UpstreamError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

interface OAuthStateRow {
  state_hash: string;
  code_verifier: string;
  expires_at: number;
}

interface ConnectionRow {
  id: string;
  google_sub: string;
  refresh_token_ciphertext: string;
  scopes: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenInfoResponse {
  scope?: string;
  error?: string;
  error_description?: string;
}

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
].join(" ");
const REQUIRED_GOOGLE_SCOPES = GOOGLE_SCOPES.split(" ");

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function randomToken(bytes = 32): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return base64Url(value);
}

function base64Url(value: Uint8Array): string {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(new TextEncoder().encode(value)))));
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  const raw = fromBase64Url(env.TOKEN_ENCRYPTION_KEY);
  if (raw.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte base64url value.");
  return crypto.subtle.importKey("raw", toArrayBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, await encryptionKey(env), toArrayBuffer(new TextEncoder().encode(value)));
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decrypt(value: string, env: Env): Promise<string> {
  const [ivPart, dataPart] = value.split(".");
  if (!ivPart || !dataPart) throw new Error("Encrypted token has an invalid format.");
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(fromBase64Url(ivPart)) },
    await encryptionKey(env),
    toArrayBuffer(fromBase64Url(dataPart)),
  );
  return new TextDecoder().decode(clear);
}

async function signSession(connectionId: string, env: Env): Promise<string> {
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    sub: connectionId,
    iss: "alfred-google-calendar",
    exp: Math.floor(Date.now() / 1000) + 1800,
  })));
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw", toArrayBuffer(new TextEncoder().encode(env.SESSION_SIGNING_KEY)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, toArrayBuffer(new TextEncoder().encode(input)));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

async function verifySession(token: string, env: Env): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.SESSION_SIGNING_KEY),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    const valid = await crypto.subtle.verify("HMAC", key, toArrayBuffer(fromBase64Url(parts[2])), toArrayBuffer(new TextEncoder().encode(`${parts[0]}.${parts[1]}`)));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1]))) as { sub?: string; iss?: string; exp?: number };
    if (payload.iss !== "alfred-google-calendar" || !payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    // Malformed or tampered Bearer tokens are unauthenticated, not server errors.
    return null;
  }
}

function corsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type,If-Match" });
  if (origin === env.ALFRED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function redirect(url: string, headers: HeadersInit = {}): Response {
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store", ...headers } });
}

async function getConnection(request: Request, env: Env): Promise<ConnectionRow | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const connectionId = await verifySession(match[1], env);
  if (!connectionId) return null;
  return env.DB.prepare("SELECT id, google_sub, refresh_token_ciphertext, scopes FROM google_connections WHERE id = ?")
    .bind(connectionId).first<ConnectionRow>();
}

async function googleAccessToken(connection: ConnectionRow, env: Env): Promise<string> {
  const refreshToken = await decrypt(connection.refresh_token_ciphertext, env);
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json() as GoogleTokenResponse;
  if (!response.ok || !result.access_token) {
    const message = result.error_description || result.error || "Google authorization could not be refreshed.";
    if (result.error === "invalid_grant") {
      await env.DB.prepare("DELETE FROM google_connections WHERE id = ?").bind(connection.id).run();
      throw new UpstreamError("A autorização do Google expirou ou foi revogada. Reconecte sua conta.", 401);
    }
    throw new UpstreamError(message, 502);
  }
  return result.access_token;
}

async function googleApi<T>(connection: ConnectionRow, env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const token = await googleAccessToken(connection, env);
  const response = await fetch(`${GOOGLE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) throw new UpstreamError(payload.error?.message || `Google Calendar API HTTP ${response.status}.`, response.status);
  return payload as T;
}

async function handleStart(request: Request, env: Env): Promise<Response> {
  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(new TextEncoder().encode(verifier)))));
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  await env.DB.prepare("DELETE FROM oauth_states WHERE expires_at < ?").bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare("DELETE FROM oauth_tickets WHERE expires_at < ?").bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare("INSERT INTO oauth_states (state_hash, code_verifier, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(state), verifier, expiresAt).run();

  const url = new URL(GOOGLE_AUTHORIZE);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return redirect(url.toString(), {
    "Set-Cookie": `alfred_google_state=${state}; Path=/auth/google/callback; Max-Age=600; Secure; HttpOnly; SameSite=Lax`,
  });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const cookies = request.headers.get("Cookie") ?? "";
  const stateCookie = cookies.match(/(?:^|;\s*)alfred_google_state=([^;]+)/)?.[1] ?? "";
  if (!state || !code || state !== stateCookie) return json({ error: "OAuth state validation failed." }, 400);

  const stateHash = await sha256(state);
  // Consume OAuth state atomically so concurrent/replayed callbacks cannot
  // both proceed with the same PKCE verifier.
  const flow = await env.DB.prepare(
    "DELETE FROM oauth_states WHERE state_hash = ? AND expires_at >= ? RETURNING code_verifier, expires_at",
  ).bind(stateHash, Math.floor(Date.now() / 1000)).first<OAuthStateRow>();
  if (!flow) return json({ error: "OAuth flow expired or already used. Please reconnect." }, 400);

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: flow.code_verifier,
    }),
  });
  const tokens = await tokenResponse.json() as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokens.access_token) {
    return json({ error: tokens.error_description || tokens.error || "Google token exchange failed." }, 400);
  }

  // Verify the scopes actually granted by Google instead of assuming that
  // the requested scopes were all approved. Token responses may omit scope
  // when it matches the request, so use Google's tokeninfo endpoint as the
  // authoritative grant record.
  const tokenInfoResponse = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(tokens.access_token),
  );
  const tokenInfo = await tokenInfoResponse.json() as GoogleTokenInfoResponse;
  if (!tokenInfoResponse.ok || !tokenInfo.scope) {
    return json({ error: "Não foi possível confirmar as permissões concedidas pelo Google. Tente conectar novamente." }, 502);
  }
  const grantedScopes = new Set(tokenInfo.scope.split(/\s+/).filter(Boolean));
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter((scope) => !grantedScopes.has(scope));
  if (missingScopes.length) {
    return json({
      error: "O Google não concedeu todas as permissões necessárias (leitura da lista de calendários e leitura/escrita de eventos). Revise a tela de consentimento e conecte novamente.",
      missingScopes,
    }, 403);
  }

  const identityResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const identity = await identityResponse.json() as { sub?: string };
  if (!identityResponse.ok || !identity.sub) return json({ error: "Could not verify Google account identity." }, 400);

  const existing = await env.DB.prepare("SELECT id, refresh_token_ciphertext FROM google_connections WHERE google_sub = ?")
    .bind(identity.sub).first<{ id: string; refresh_token_ciphertext: string }>();
  const refreshToken = tokens.refresh_token
    ? await encrypt(tokens.refresh_token, env)
    : existing?.refresh_token_ciphertext;
  if (!refreshToken) return json({ error: "Google did not return offline access. Revoke Alfred access in Google Account settings and reconnect." }, 400);

  const proposedConnectionId = existing?.id ?? crypto.randomUUID();
  const savedConnection = await env.DB.prepare(
    "INSERT INTO google_connections (id, google_sub, refresh_token_ciphertext, scopes, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(google_sub) DO UPDATE SET refresh_token_ciphertext = excluded.refresh_token_ciphertext, scopes = excluded.scopes, updated_at = excluded.updated_at RETURNING id",
  ).bind(proposedConnectionId, identity.sub, refreshToken, tokenInfo.scope, new Date().toISOString()).first<{ id: string }>();
  if (!savedConnection?.id) throw new Error("Could not save Google connection.");
  const connectionId = savedConnection.id;

  const ticket = randomToken();
  await env.DB.prepare("INSERT INTO oauth_tickets (ticket_hash, connection_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(ticket), connectionId, Math.floor(Date.now() / 1000) + 120).run();

  const destination = new URL(env.ALFRED_RETURN_URL);
  if (destination.origin !== env.ALFRED_ORIGIN) throw new Error("ALFRED_RETURN_URL must use the configured ALFRED_ORIGIN.");
  destination.hash = new URLSearchParams({ google_ticket: ticket }).toString();
  return redirect(destination.toString(), {
    "Set-Cookie": "alfred_google_state=; Path=/auth/google/callback; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
  });
}

async function handleExchange(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { ticket?: string } | null;
  if (!body?.ticket || body.ticket.length > 200) return json({ error: "Invalid one-time authorization ticket." }, 400);
  const hash = await sha256(body.ticket);
  // Consume the ticket atomically: concurrent exchange requests cannot both
  // turn the same one-time OAuth ticket into valid sessions.
  const row = await env.DB.prepare(
    "DELETE FROM oauth_tickets WHERE ticket_hash = ? AND expires_at >= ? RETURNING connection_id, expires_at",
  ).bind(hash, Math.floor(Date.now() / 1000)).first<{ connection_id: string; expires_at: number }>();
  if (!row) return json({ error: "Authorization ticket expired or already used. Please reconnect." }, 401);
  const sessionToken = await signSession(row.connection_id, env);
  return json({ accessToken: sessionToken, expiresIn: 1800 });
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const connection = await getConnection(request, env);
  if (!connection) return json({ error: "Session expired. Reconnect Google Calendar." }, 401);
  const path = url.pathname;

  if (path === "/api/session" && request.method === "GET") return json({ connected: true, provider: "google", accountId: connection.google_sub });

  if (path === "/api/calendars" && request.method === "GET") {
    const params = new URLSearchParams({ maxResults: "250" });
    const pageToken = url.searchParams.get("pageToken");
    if (pageToken) params.set("pageToken", pageToken);
    const result = await googleApi<{ items?: unknown[]; nextPageToken?: string }>(connection, env, "/users/me/calendarList?" + params.toString());
    return json({ items: result.items ?? [], ...(result.nextPageToken ? { nextPageToken: result.nextPageToken } : {}) });
  }

  if (path === "/api/events" && request.method === "GET") {
    const calendarId = url.searchParams.get("calendarId");
    if (!calendarId) return json({ error: "calendarId is required." }, 400);
    const params = new URLSearchParams();
    for (const key of ["syncToken", "timeMin", "timeMax", "pageToken", "singleEvents", "orderBy"]) {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    }
    params.set("maxResults", "2500");
    params.set("showDeleted", "true");
    try {
      const result = await googleApi(connection, env, `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
      return json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Calendar read failed.";
      const status = error instanceof UpstreamError && (error.status === 401 || error.status === 410)
        ? error.status
        : 502;
      return json({ error: message }, status);
    }
  }

  const eventMatch = path.match(/^\/api\/events\/([^/]+)$/);
  if (path === "/api/events" && request.method === "POST") {
    const body = await request.json().catch(() => null);
    const calendarId = url.searchParams.get("calendarId");
    if (!calendarId || !body || typeof body !== "object") return json({ error: "calendarId and event body are required." }, 400);
    const created = await googleApi(connection, env, `/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", body: JSON.stringify(body) });
    return json(created, 201);
  }
  if (eventMatch && ["PATCH", "DELETE"].includes(request.method)) {
    const calendarId = url.searchParams.get("calendarId");
    if (!calendarId) return json({ error: "calendarId is required." }, 400);
    const eventId = decodeURIComponent(eventMatch[1]);
    if (request.method === "DELETE") {
      await googleApi(connection, env, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE", headers: request.headers.get("If-Match") ? { "If-Match": request.headers.get("If-Match")! } : {} });
      return new Response(null, { status: 204 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Event body is required." }, 400);
    const updated = await googleApi(connection, env, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "PATCH", headers: request.headers.get("If-Match") ? { "If-Match": request.headers.get("If-Match")! } : {}, body: JSON.stringify(body) });
    return json(updated);
  }

  if (path === "/api/disconnect" && request.method === "POST") {
    // Local disconnection must succeed even if Google's revocation endpoint is
    // temporarily unavailable. Remove the encrypted refresh token first, then
    // report whether remote revocation was confirmed.
    let refresh: string | null = null;
    try {
      refresh = await decrypt(connection.refresh_token_ciphertext, env);
    } catch {
      // A damaged ciphertext must not prevent the user from disconnecting.
    }

    await env.DB.prepare("DELETE FROM google_connections WHERE id = ?").bind(connection.id).run();

    let googleRevocation: "confirmed" | "not_confirmed" = "not_confirmed";
    if (refresh) {
      try {
        const revocation = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: refresh }),
        });
        if (revocation.ok) googleRevocation = "confirmed";
      } catch {
        // The Alfred connection is already deleted locally. The UI will
        // explain that revocation at Google could not be confirmed.
      }
    }
    return json({ disconnected: true, googleRevocation });
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      if (origin !== env.ALFRED_ORIGIN) return json({ error: "Origin not allowed." }, 403);
      return new Response(null, { status: 204, headers: cors });
    }
    if ((url.pathname.startsWith("/api/") || url.pathname === "/auth/exchange") && origin !== env.ALFRED_ORIGIN) return json({ error: "Origin not allowed." }, 403);
    try {
      let response: Response;
      if (url.pathname === "/health" && request.method === "GET") response = json({ ok: true });
      else if (url.pathname === "/auth/google/start" && request.method === "GET") response = await handleStart(request, env);
      else if (url.pathname === "/auth/google/callback" && request.method === "GET") response = await handleCallback(request, env);
      else if (url.pathname === "/auth/exchange" && request.method === "POST") response = await handleExchange(request, env);
      else if (url.pathname.startsWith("/api/")) response = await handleApi(request, env, url);
      else response = json({ error: "Not found." }, 404);

      const headers = new Headers(response.headers);
      cors.forEach((value, key) => headers.set(key, value));
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "no-referrer");
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const status = error instanceof UpstreamError
        ? error.status === 412 ? 409 : error.status === 410 ? 410 : error.status
        : 500;
      return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, status, cors);
    }
  },
};
