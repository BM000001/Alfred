import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken, verifySessionToken, requestOriginIsValid, passwordMatches,
} from './security.js';

const original = {
  password: process.env.ALFRED_ACCESS_PASSWORD,
  secret: process.env.ALFRED_SESSION_SECRET,
  origin: process.env.ALFRED_APP_ORIGIN,
};

test('assina sessões, aceita token válido e rejeita adulteração e expiração', () => {
  process.env.ALFRED_ACCESS_PASSWORD = 'senha-de-teste-com-mais-de-16';
  process.env.ALFRED_SESSION_SECRET = 's'.repeat(48);
  const now = 1_800_000_000_000;
  const token = createSessionToken(now);
  assert.equal(verifySessionToken(token, now), true);
  assert.equal(verifySessionToken(token + 'x', now), false);
  assert.equal(verifySessionToken(token, now + 4 * 60 * 60 * 1000 + 1), false);
});

test('falha fechada quando a configuração está ausente ou curta', () => {
  process.env.ALFRED_SESSION_SECRET = 'curta';
  assert.equal(verifySessionToken('qualquer.token'), false);
});

test('compara senha e exige origem exatamente configurada', () => {
  process.env.ALFRED_ACCESS_PASSWORD = 'senha-de-teste-com-mais-de-16';
  process.env.ALFRED_SESSION_SECRET = 's'.repeat(48);
  process.env.ALFRED_APP_ORIGIN = 'https://alfred.example';
  assert.equal(passwordMatches('senha-de-teste-com-mais-de-16'), true);
  assert.equal(passwordMatches('senha-errada'), false);
  assert.equal(requestOriginIsValid({ headers: { origin: 'https://alfred.example', host: 'alfred.example' } }), true);
  assert.equal(requestOriginIsValid({ headers: { origin: 'https://evil.example', host: 'alfred.example' } }), false);
});

test('restaura ambiente de testes', () => {
  for (const [key, value] of Object.entries({
    ALFRED_ACCESS_PASSWORD: original.password,
    ALFRED_SESSION_SECRET: original.secret,
    ALFRED_APP_ORIGIN: original.origin,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
