// Part of: Accounts: turns a password into a scrambled hash and checks a typed password against it.
// Used by: auth.js (routes).
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

// scrypt is a slow, salted hash that ships with Node, so no extra package is needed. Slow on purpose: a thief who steals the
// database still needs a long time to guess each password. A password is NOT hashed like an edit key (plain SHA-256), because an
// edit key is 32 random characters while a person's password is easy to guess.
// The cost is stored inside every hash, so it can be raised later without locking anybody out. Tests set SCRYPT_COST low to run fast.
const cost = () => Number(process.env.SCRYPT_COST) || 16384;
const memoryFor = (n, r) => 128 * n * r * 2 + 1024 * 1024;

// "scrypt$cost$blockSize$parallel$salt$hash"
async function hashPassword(password) {
  const n = cost();
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N: n, r: 8, p: 1, maxmem: memoryFor(n, 8) });
  return `scrypt$${n}$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

// True when the typed password matches the stored hash. Takes the same time however close the guess is.
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: memoryFor(Number(n), Number(r)),
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// A made-up hash used when the username does not exist, so a wrong username costs the same time as a wrong password
// and nobody can find out which usernames exist by timing the answer.
let dummy = null;
const dummyHash = () => (dummy ??= hashPassword('not-a-real-password'));

module.exports = { hashPassword, verifyPassword, dummyHash };
