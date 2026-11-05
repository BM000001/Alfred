/**
 * Same-origin-independent API client for the Google Calendar Worker.
 * The short-lived Alfred session bearer is kept in memory only. It is never
 * written to IndexedDB, localStorage, sessionStorage, logs, or backups.
 */
export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  updated?: string;
  htmlLink?: string;
  recurringEventId?: string;
}

interface SessionResponse {
  accessToken: string;
  expiresIn: number;
}

const API_BASE = (import.meta.env.VITE_GOOGLE_CALENDAR_API ?? "").replace(/\/$/, "");
let sessionToken: string | null = null;
let sessionExpiresAt = 0;

function apiBase(): string {
  if (!API_BASE) throw new Error("A integração Google ainda não foi configurada neste ambiente.");
  return API_BASE;
}

export function beginGoogleCalendarConnection(): void {
  window.location.assign(`${apiBase()}/auth/google/start`);
}

export async function completeGoogleCalendarConnection(): Promise<boolean> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const ticket = params.get("google_ticket");
  if (!ticket) return false;

  // Remove the one-time ticket from the address bar before making any request.
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  const response = await fetch(`${apiBase()}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket }),
  });
  const payload = await response.json() as SessionResponse & { error?: string };
  if (!response.ok || !payload.accessToken) {
    throw new Error(payload.error || "Não foi possível concluir a conexão com o Google.");
  }
  sessionToken = payload.accessToken;
  sessionExpiresAt = Date.now() + payload.expiresIn * 1000;
  return true;
}

export function isGoogleCalendarSessionActive(): boolean {
  return Boolean(sessionToken && Date.now() < sessionExpiresAt - 30_000);
}

export function clearGoogleCalendarSession(): void {
  sessionToken = null;
  sessionExpiresAt = 0;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isGoogleCalendarSessionActive()) {
    clearGoogleCalendarSession();
    throw new Error("A sessão Google expirou. Conecte novamente para continuar.");
  }
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    if (response.status === 401) clearGoogleCalendarSession();
    throw new Error(`${payload.error || "Falha na integração Google."} (HTTP ${response.status})`);
  }
  return payload as T;
}

export async function listGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  const result = await request<{ items?: GoogleCalendarInfo[] }>("/api/calendars");
  return result.items ?? [];
}

export async function listGoogleEvents(
  calendarId: string,
  options: { syncToken?: string; timeMin?: string; timeMax?: string; pageToken?: string } = {},
): Promise<{ items?: GoogleCalendarEvent[]; nextPageToken?: string; nextSyncToken?: string }> {
  const params = new URLSearchParams({ calendarId });
  Object.entries(options).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/api/events?${params.toString()}`);
}

export function createGoogleEvent(calendarId: string, event: Omit<GoogleCalendarEvent, "id" | "etag" | "status" | "updated" | "htmlLink">): Promise<GoogleCalendarEvent> {
  return request(`/api/events?calendarId=${encodeURIComponent(calendarId)}`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export function updateGoogleEvent(calendarId: string, eventId: string, event: Omit<GoogleCalendarEvent, "id" | "etag" | "status" | "updated" | "htmlLink">, etag?: string): Promise<GoogleCalendarEvent> {
  return request(`/api/events/${encodeURIComponent(eventId)}?calendarId=${encodeURIComponent(calendarId)}`, {
    method: "PUT",
    ...(etag ? { headers: { "If-Match": etag } } : {}),
    body: JSON.stringify(event),
  });
}

export function deleteGoogleEvent(calendarId: string, eventId: string, etag?: string): Promise<void> {
  return request(`/api/events/${encodeURIComponent(eventId)}?calendarId=${encodeURIComponent(calendarId)}`, {
    method: "DELETE",
    ...(etag ? { headers: { "If-Match": etag } } : {}),
  });
}

export async function disconnectGoogleCalendar(): Promise<void> {
  try {
    await request("/api/disconnect", { method: "POST" });
  } finally {
    clearGoogleCalendarSession();
  }
}
