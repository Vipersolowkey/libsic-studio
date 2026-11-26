// Part of: My rooms: remembers saved rooms and their edit keys in this browser.
// Used by: HomePage.jsx, RoomScreen.jsx.
// "My rooms": rooms saved by this browser, with each one's secret edit key, in localStorage (there are no accounts).
// A share link opens a room anywhere, but only this browser holds the key to edit it. Clearing site data loses the keys.
// Every function survives blocked storage or junk data (it acts as if empty; saving returns false).
const ROOMS_KEY = 'libsic:myRooms';
const LAST_KEY = 'libsic:lastRoom';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// Drops damaged entries (e.g. hand-edited storage) so they cannot crash the page.
const isOptionalString = (v) => v === undefined || typeof v === 'string';
const validRoomEntry = (r) =>
  Boolean(
    r &&
    typeof r.code === 'string' &&
    /^[A-Za-z0-9_-]{1,32}$/.test(r.code) &&
    isOptionalString(r.editKey) &&
    isOptionalString(r.name) &&
    isOptionalString(r.sceneSlug)
  );

// The saved rooms, newest first: [{ code, editKey, name, sceneSlug }]
// ===== THE API OF THIS FILE: used by RoomScreen (save / forget), MyRooms.jsx (list) and HomePage (My rooms, last room) =====
export function getMyRooms() {
  try {
    const list = JSON.parse(read(ROOMS_KEY));
    return Array.isArray(list) ? list.filter(validRoomEntry) : [];
  } catch {
    return [];
  }
}

// Adds a room, or updates it when its code is already saved (it then moves to the top).
// Returns false when the browser would not store it.
export function saveMyRoom(entry) {
  const others = getMyRooms().filter((r) => r.code !== entry.code);
  return write(ROOMS_KEY, JSON.stringify([entry, ...others]));
}

// Changes some fields of a saved room (for example a new name) without moving it.
export function updateMyRoom(code, changes) {
  const list = getMyRooms().map((r) => (r.code === code ? { ...r, ...changes } : r));
  return write(ROOMS_KEY, JSON.stringify(list));
}

export function removeMyRoom(code) {
  return write(ROOMS_KEY, JSON.stringify(getMyRooms().filter((r) => r.code !== code)));
}

// The room the home page reopens ("Your room"). clearLastRoomCode only clears it if it is that room.
export const getLastRoomCode = () => read(LAST_KEY) || null;
export const setLastRoomCode = (code) => write(LAST_KEY, code);
export function clearLastRoomCode(code) {
  if (getLastRoomCode() === code) write(LAST_KEY, '');
}
