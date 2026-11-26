// Part of: Accounts: the secret that signs login tokens.
// Used by: app.js.
const crypto = require('crypto');

const MIN_LENGTH = 32;

// JWT_SECRET is set on the host (Render > Environment), never in Git. On the live server a missing or short secret stops the API from
// starting, because tokens signed with a guessable secret could be forged. On a laptop or in tests a random secret is made instead
// (everybody is signed out whenever the server restarts, which is fine for development).
function resolveSecret(value, env = process.env) {
  if (typeof value === 'string' && value.length >= MIN_LENGTH) return value;
  const live = env.NODE_ENV === 'production' || Boolean(env.RENDER);
  if (live) throw new Error(`JWT_SECRET is missing or shorter than ${MIN_LENGTH} characters. Set it in the host's environment settings.`);
  if (env.NODE_ENV !== 'test') console.warn('JWT_SECRET is not set: using a random secret, so logins end when the server restarts.');
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { resolveSecret, MIN_LENGTH };
