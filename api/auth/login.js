import {
  authConfigurationReady, clientAddress, createSessionToken, jsonError, noStore,
  passwordMatches, requestBody, requestOriginIsValid, setSessionCookie,
} from '../_lib/security.js';

// Best-effort only: serverless instances do not share memory. Add Vercel Firewall
// or a shared rate limiter before enabling public production traffic.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isRateLimited(address, now = Date.now()) {
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < WINDOW_MS);
  attempts.set(address, recent);
  return recent.length >= MAX_ATTEMPTS;
}

function recordFailure(address, now = Date.now()) {
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < WINDOW_MS);
  attempts.set(address, [...recent, now]);
  if (attempts.size > 1_000) {
    for (const [key, times] of attempts) {
      if (!times.some((time) => now - time < WINDOW_MS)) attempts.delete(key);
      if (attempts.size <= 1_000) break;
    }
  }
}

export default function login(req, res) {
  noStore(res);
  if (req.method !== 'POST') return jsonError(res, 405, 'Método não permitido.');
  if (!requestOriginIsValid(req)) return jsonError(res, 403, 'Origem não autorizada.');
  if (!authConfigurationReady()) return jsonError(res, 503, 'Autenticação ainda não configurada no servidor.');

  const address = clientAddress(req);
  if (isRateLimited(address)) return jsonError(res, 429, 'Muitas tentativas. Aguarde antes de tentar novamente.');

  const body = requestBody(req, 2_000);
  if (!body || typeof body.password !== 'string' || body.password.length > 256) {
    recordFailure(address);
    return jsonError(res, 400, 'Credenciais inválidas.');
  }
  if (!passwordMatches(body.password)) {
    recordFailure(address);
    return jsonError(res, 401, 'Senha incorreta.');
  }

  attempts.delete(address);
  setSessionCookie(res, createSessionToken());
  return res.status(200).json({ authenticated: true, expiresInSeconds: 14_400 });
}
