// "My rooms": the rooms this browser has saved, and the secret edit key of each one.
// They live in the browser's localStorage (there are no accounts), so they stay on this
// browser only. A share link still opens a room anywhere, but only this browser can edit it.
// Every function copes with storage being blocked or holding junk: it then behaves as if empty.
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

// The saved rooms, newest first: [{ code, editKey, name, sceneSlug }]
export function getMyRooms() {
  try {
    const list = JSON.parse(read(ROOMS_KEY));
    return Array.isArray(list) ? list.filter((r) => r && typeof r.code === 'string') : [];
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

// The edit key for a room, or null when this browser did not create it.
export function getEditKey(code) {
  return getMyRooms().find((r) => r.code === code)?.editKey ?? null;
}

// The room to reopen when the visitor comes back to the home page.
export const getLastRoomCode = () => read(LAST_KEY) || null;
export const setLastRoomCode = (code) => write(LAST_KEY, code);
export function clearLastRoomCode(code) {
  if (getLastRoomCode() === code) write(LAST_KEY, '');
}
