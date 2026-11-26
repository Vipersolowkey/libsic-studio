// Part of: Decorate mode: server-side check of the placed items in a room.
// Uses: constants.js.
// Used by: rooms.js.
const { MAX_ITEMS } = require('../constants');

// Rules for a room's placed items: at most MAX_ITEMS, unique ids, known catalog keys, scale within the entry's range,
// x/y inside the surface area, no flip if not flippable, "unique" entries only once.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// Returns null when fine, else { "items[2].x": message, ... } for every problem.
// Called by routes/rooms.js on POST and PUT. Mirrors the client rules in scene/itemsEdit.js and placement.js (MAX_ITEMS, scale range, surface area).
function validateItems(items, scene) {
  if (!Array.isArray(items)) return { items: 'items must be a list' };
  if (items.length > MAX_ITEMS) return { items: `a room holds at most ${MAX_ITEMS} objects` };

  const catalog = new Map((scene.catalog || []).map((entry) => [entry.key, entry]));
  const surfaces = new Map((scene.surfaces || []).map((surface) => [surface.key, surface]));
  const details = {};
  const seenIds = new Set();
  const seenUnique = new Set();

  items.forEach((item, i) => {
    const at = `items[${i}]`;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      details[at] = 'must be an object';
      return;
    }

    if (typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) {
      details[`${at}.id`] = 'id must be 1 to 16 letters, digits, "-" or "_"';
    } else if (seenIds.has(item.id)) {
      details[`${at}.id`] = `id "${item.id}" is used twice`;
    } else {
      seenIds.add(item.id);
    }

    if (typeof item.flip !== 'boolean') details[`${at}.flip`] = 'flip must be true or false';
    if (!isNumber(item.x)) details[`${at}.x`] = 'x must be a number';
    if (!isNumber(item.y)) details[`${at}.y`] = 'y must be a number';
    if (!isNumber(item.scale)) details[`${at}.scale`] = 'scale must be a number';

    const entry = catalog.get(item.key);
    if (!entry) {
      details[`${at}.key`] = `"${item.key}" is not an object of this scene`;
      return;
    }
    if (entry.unique && seenUnique.has(entry.key)) details[`${at}.key`] = `"${entry.key}" can be placed only once`;
    seenUnique.add(entry.key);

    if (item.flip === true && !entry.flippable) details[`${at}.flip`] = `"${entry.key}" cannot be flipped`;
    if (isNumber(item.scale) && (item.scale < entry.scale.min || item.scale > entry.scale.max)) {
      details[`${at}.scale`] = `scale must be between ${entry.scale.min} and ${entry.scale.max}`;
    }

    const { area } = surfaces.get(entry.surface) || {};
    if (!area) return;
    if (isNumber(item.x) && (item.x < area.x || item.x > area.x + area.width)) {
      details[`${at}.x`] = `x must stay on the ${entry.surface}`;
    }
    if (isNumber(item.y) && (item.y < area.y || item.y > area.y + area.height)) {
      details[`${at}.y`] = `y must stay on the ${entry.surface}`;
    }
  });

  return Object.keys(details).length ? details : null;
}

module.exports = { validateItems };
