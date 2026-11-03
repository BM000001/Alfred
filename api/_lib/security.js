import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'alfred_session';
export const SESSION_TTL_SECONDS = 4 * 60 * 60;

export function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function requestOriginIsValid(req) {
  const configured = process.env.ALFRED_APP_ORIGIN;
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (!configured || typeof origin !== 'string' || typeof host !== 'string') return false;
  try {
    const expected = new URL(configured);
    const received = new URL(origin);
    return expected.origin === received.origin && received.host === host;
  } catch {
    return false;
  }
}

export function authConfigurationReady() {
  return typeof process.env.ALFRED_ACCESS_PASSWORD === 'string'
    && process.env.ALFRED_ACCESS_PASSWORD.length >= 16
    && typeof process.env.ALFRED_SESSION_SECRET === 'string'
    && process.env.ALFRED_SESSION_SECRET.length >= 32;
}

function sign(payload) {
  return createHmac('sha256', process.env.ALFRED_SESSION_SECRET).update(payload).digest('base64url');
}

export function createSessionToken(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  return payload + '.' + sign(payload);
}

export function verifySessionToken(token, now = Date.now()) {
  if (!authConfigurationReady() || typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isInteger(data.exp) && data.exp > Math.floor(now / 1000)
      && typeof data.nonce === 'string' && data.nonce.length >= 16;
  } catch {
    return false;
  }
}

export function readSessionCookie(req) {
  const raw = req.headers?.cookie;
  if (typeof raw !== 'string') return '';
  for (const part of raw.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return '';
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export function hasValidSession(req) {
  return verifySessionToken(readSessionCookie(req));
}

export function passwordMatches(candidate) {
  const configured = process.env.ALFRED_ACCESS_PASSWORD;
  if (typeof configured !== 'string') return false;
  const left = createHash('sha256').update(candidate).digest();
  const right = createHash('sha256').update(configured).digest();
  return timingSafeEqual(left, right);
}

export function requestBody(req, maxBytes = 24_000) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maxBytes) return null;
  return body;
}

export function clientAddress(req) {
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp) return realIp;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return 'unknown';
}
