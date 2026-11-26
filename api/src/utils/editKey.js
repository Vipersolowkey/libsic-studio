// Part of: Security: makes and checks edit keys (rooms and CDs).
// Used by: cds.js, requireEditKey.js, rooms.js.
const crypto = require('crypto');

// The edit key is a random secret given once to whoever creates a room or CD. We store only its hash.
// Plain SHA-256 is enough (no bcrypt): a random 32-character key cannot be guessed, unlike a human password.
const generateEditKey = () => crypto.randomBytes(24).toString('base64url'); // 32 characters

const hashEditKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// True when key matches hash. timingSafeEqual takes the same time however close the guess is.
function keyMatches(key, hash) {
  if (typeof key !== 'string' || key === '' || typeof hash !== 'string') return false;
  const a = Buffer.from(hashEditKey(key));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { generateEditKey, hashEditKey, keyMatches };
