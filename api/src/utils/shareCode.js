const crypto = require('crypto');

// Letters and digits that are easy to read out loud and to tell apart (no i, l, o, 0 or 1).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

// A short random code for a share link such as /r/k4m9x2qa. Eight characters give
// about 850 billion combinations, so nobody can find a room by guessing codes.
function generateCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

module.exports = { generateCode };
