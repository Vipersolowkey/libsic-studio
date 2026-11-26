// Part of: Music: remembers my CDs and their edit keys in this browser.
// Used by: CdPage.jsx, CdRow.jsx, MusicPage.jsx.
// "My CDs": CDs made in this browser, with their secret edit keys, kept in localStorage (no accounts).
// Same idea as ../myRooms.js: clearing site data loses the keys. rememberCd returns false when storage is blocked.
const KEY = 'libsic:myCds';
export function getMyCds() {
  try {
    const entries = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(entries)
      ? entries.filter((e) => e && typeof e.code === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(e.code) && typeof e.editKey === 'string' && (e.title === undefined || typeof e.title === 'string'))
      : [];
  } catch { return []; }
}
export function rememberCd(entry) {
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...getMyCds().filter((e) => e.code !== entry.code)]));
    return true;
  } catch { return false; }
}
export function forgetCd(code) {
  try { localStorage.setItem(KEY, JSON.stringify(getMyCds().filter((e) => e.code !== code))); } catch { /* storage is optional */ }
}
