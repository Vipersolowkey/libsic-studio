const crypto = require('crypto');

// The edit key is a long random secret given to whoever creates a room (or CD).
// We store only its hash, so even someone who reads the database cannot edit rooms.
// A plain SHA-256 hash is enough here: unlike a human password, a random 32 character
// key cannot be guessed, so we do not need a slow password hash like bcrypt.
const generateEditKey = () => crypto.randomBytes(24).toString('base64url'); // 32 characters

const hashEditKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// True when `key` is the key that `hash` was made from.
// timingSafeEqual compares in constant time, so the response time never hints at how close a guess was.
function keyMatches(key, hash) {
  if (typeof key !== 'string' || key === '' || typeof hash !== 'string') return false;
  const a = Buffer.from(hashEditKey(key));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { generateEditKey, hashEditKey, keyMatches };
