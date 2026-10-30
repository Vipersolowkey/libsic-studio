// Changes to the list of placed objects. Every function returns a new list and leaves the one it was given
// alone. When a change would do nothing (unknown id, a scale that stays the same, ...) it returns the very
// same list, so callers can tell "nothing happened" with ===.
import { clampToSurface, entryOf, newItem, surfaceOf } from './placement.js';

// The most objects a room can hold (the API refuses more).
export const MAX_ITEMS = 30;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const twoDecimals = (value) => Math.round(value * 100) / 100;

// Applies `change(item, entry)` to the item with this id and gives back the new list.
// An item whose object the scene does not have cannot be changed.
function updateItem(scene, items, id, change) {
  const item = items.find((candidate) => candidate.id === id);
  const entry = item && entryOf(scene, item.key);
  if (!entry) return items;
  const changed = change(item, entry);
  if (Object.entries(changed).every(([field, value]) => item[field] === value)) return items;
  return items.map((candidate) => (candidate === item ? { ...item, ...changed } : candidate));
}

// Puts the contact point at `point`, kept on the surface of the object (and to two decimals).
export function moveItem(scene, items, id, point) {
  return updateItem(scene, items, id, (_, entry) => {
    const { x, y } = clampToSurface(surfaceOf(scene, entry), point);
    return { x: twoDecimals(x), y: twoDecimals(y) };
  });
}

export function scaleItem(scene, items, id, scale) {
  return updateItem(scene, items, id, (item, { scale: range }) => ({ scale: clamp(scale, range.min, range.max) }));
}

export function flipItem(scene, items, id) {
  return updateItem(scene, items, id, (item, entry) => (entry.flippable ? { flip: !item.flip } : {}));
}

export function removeItem(items, id) {
  return items.some((item) => item.id === id) ? items.filter((item) => item.id !== id) : items;
}

// Adds a copy of an object in the middle of its surface, unless the scene does not have it, it may only
// be placed once, or the room is full.
export function addItem(scene, items, key) {
  const entry = entryOf(scene, key);
  if (!entry || items.length >= MAX_ITEMS) return items;
  if (entry.unique && items.some((item) => item.key === key)) return items;
  return [...items, newItem(scene, key, items)];
}

// True when two lists (or two nulls, meaning the default arrangement) put the same objects in the same places.
export function itemsEqual(a, b) {
  if (!a || !b) return !a === !b;
  const fields = ['id', 'key', 'x', 'y', 'scale', 'flip'];
  return a.length === b.length && a.every((item, i) => fields.every((field) => item[field] === b[i][field]));
}
