// Part of: Accounts: the signed login token (a standard HS256 JWT, made with Node's own crypto, no package).
// Used by: auth.js (middleware).
const crypto = require('crypto');

const DEFAULT_LIFETIME = 7 * 24 * 60 * 60; // seconds: a login lasts 7 days
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest();

// The token holds only the account's id and its two dates, nothing personal. `now` is for tests.
function signToken(userId, secret, { lifetime = DEFAULT_LIFETIME, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), iat, exp: iat + lifetime })).toString('base64url');
  return `${HEADER}.${payload}.${sign(`${HEADER}.${payload}`, secret).toString('base64url')}`;
}

// Returns the account id (a string), or null when the token is forged, damaged, of another kind or expired.
function verifyToken(token, secret, { now = Date.now() } = {}) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null; // only our own HS256 header is accepted, so "alg: none" tricks fail
  const given = Buffer.from(parts[2], 'base64url');
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/.test(payload.sub)) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(now / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken, DEFAULT_LIFETIME };
