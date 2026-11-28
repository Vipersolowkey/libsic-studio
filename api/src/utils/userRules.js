// Part of: Accounts: what a username and a password must look like.
// Used by: auth.js (routes).
const { cleanText } = require('./cleanText');

// Names nobody may take, so nobody can pose as the team or the system.
const RESERVED = new Set(['admin', 'administrator', 'root', 'support', 'system', 'staff', 'moderator', 'mod', 'owner', 'libsic', 'studio', 'api', 'me', 'null', 'undefined']);
// A few of the most common passwords. A short list on purpose: it only stops the worst choices.
const COMMON = new Set(['password', '12345678', '123456789', '1234567890', 'qwertyui', 'qwerty123', 'iloveyou', 'password1', '11111111', '00000000', 'abc12345', 'libsicstudio']);

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128; // an upper limit so nobody can make the server hash a huge text

const normalizeUsername = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Each check returns a message for the person, or null when the value is fine.
function usernameProblem(username) {
  if (!USERNAME_PATTERN.test(username)) return 'Use 3 to 20 letters, digits or underscores';
  if (RESERVED.has(username)) return 'That username is not available';
  return null;
}

function passwordProblem(password, username) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters`;
  if (COMMON.has(password.toLowerCase()) || password.toLowerCase() === username) return 'Pick a password that is harder to guess';
  return null;
}

const displayNameProblem = (name) => (typeof name !== 'string' || name.length > 30 ? 'Use at most 30 characters' : null);

module.exports = { normalizeUsername, usernameProblem, passwordProblem, displayNameProblem, cleanText, RESERVED, PASSWORD_MIN };
