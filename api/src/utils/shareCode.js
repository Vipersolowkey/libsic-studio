// Part of: Share links: makes the code in /r/:code and /cd/:code.
// Used by: cds.js, rooms.js.
const crypto = require('crypto');

// Easy to read aloud: no i, l, o, 0 or 1.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

// Random code for share links such as /r/k4m9x2qa. 8 characters = ~850 billion combinations: not guessable.
function generateCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

module.exports = { generateCode };
