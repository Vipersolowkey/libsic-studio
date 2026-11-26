// Cleans a name or title typed by a visitor before it is stored: control characters and invisible characters
// (zero-width spaces, text-direction tricks) are replaced by a space, and runs of spaces become one space.
// Anything that is not text is returned unchanged, so the model's own checks still report it.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/g;

function cleanText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { cleanText };
