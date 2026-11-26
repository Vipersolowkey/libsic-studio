// Part of: Decorate mode: where placed objects are drawn (perspective maths).
// Used by: DecorateHud.jsx, DecorateOverlay.jsx, Hologram.jsx, SceneStage.jsx, itemsEdit.js, useItemsEditor.js.
// Decorate maths (pure, no React): where placed objects are drawn.
// Catalog entry (in the scene) = what an object is (home, bounds, surface). Item { id, key, x, y, scale, flip } = one copy in a room;
// x, y = contact point (bottom centre) on its surface, percent of the scene. The object's pictures are the scene layers
// whose `item` equals its key; each is moved and sized around the contact point, with perspective from the surface.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ===== LOOKUPS: catalog entry (what) and surface (where) of an object =====
export const entryOf = (scene, key) => scene.catalog?.find((entry) => entry.key === key);
export const surfaceOf = (scene, entry) => scene.surfaces?.find((surface) => surface.key === entry.surface);

// Perspective size at height y: farScale at farY ... nearScale at nearY (clamped).
export function scaleAt({ perspective }, y) {
  const { farY, nearY, farScale, nearScale } = perspective;
  if (farY === nearY) return farScale;
  const t = clamp((y - farY) / (nearY - farY), 0, 1);
  return farScale + t * (nearScale - farScale);
}

// The starting arrangement of a scene: every entry that is in the default, at its home.
export function defaultItems(scene) {
  return (scene.catalog || [])
    .filter((entry) => entry.inDefault)
    .map((entry) => ({ id: entry.key, key: entry.key, x: entry.home.x, y: entry.home.y, scale: 1, flip: false }));
}

// Maps a box drawn for the entry's home to where the item stands (scale + perspective, mirrored across the contact point when flipped).
// At home with scale 1 it returns the same box.
export function placeBox(box, item, entry, surface) {
  const { home } = entry;
  const s = (item.scale * scaleAt(surface, item.y)) / scaleAt(surface, home.y);
  const fromHome = item.flip ? -(box.x + box.width - home.x) : box.x - home.x; // flipped: mirrored across the contact point
  return { x: item.x + fromHome * s, y: item.y + (box.y - home.y) * s, width: box.width * s, height: box.height * s };
}

// The full back-to-front draw list. Fixed layers keep their order; the items of a surface are drawn just before the layer at
// surface.drawAt, nearer ones (larger y) later. Entry: { key (React key), itemId (undefined for fixed layers), layer, box,
// templateIndex (index in scene.layers), flip }.
// ===== DRAW LIST: used by SceneStage.jsx to draw layers and placed objects in the right order =====
export function buildDrawList(scene, items) {
  const placedBySurface = new Map();
  for (const item of items) {
    const entry = entryOf(scene, item.key);
    const surface = entry && surfaceOf(scene, entry);
    if (!surface) continue;
    if (!placedBySurface.has(surface)) placedBySurface.set(surface, []);
    placedBySurface.get(surface).push({ item, entry });
  }

  // Shadows (layers with mirror: false) are drawn before all objects, so a nearer object's shadow never covers one behind it.
  const isShadow = (layer) => layer.mirror === false;
  const drawItemsOf = (surface) => {
    const placed = (placedBySurface.get(surface) || []).sort((a, b) => a.item.y - b.item.y || a.item.id.localeCompare(b.item.id));
    const picturesOf = (wanted) =>
      placed.flatMap(({ item, entry }) =>
        scene.layers.flatMap((layer, templateIndex) => {
          if (layer.item !== item.key || isShadow(layer) !== wanted) return [];
          const flip = Boolean(item.flip) && !isShadow(layer); // a shadow keeps its side
          const box = placeBox(layer.box, { ...item, flip }, entry, surface);
          return [{ key: `${item.id}:${templateIndex}`, itemId: item.id, layer, box, templateIndex, flip }];
        })
      );
    return [...picturesOf(true), ...picturesOf(false)];
  };

  const surfaces = scene.surfaces || [];
  const list = [];
  scene.layers.forEach((layer, i) => {
    surfaces.filter((surface) => surface.drawAt === i).forEach((surface) => list.push(...drawItemsOf(surface)));
    if (!layer.item) list.push({ key: String(i), layer, box: layer.box, templateIndex: i, flip: false });
  });
  surfaces.filter((surface) => surface.drawAt >= scene.layers.length).forEach((surface) => list.push(...drawItemsOf(surface)));
  return list;
}

// Item ids back to front (used for click-box stacking). Items the scene cannot draw are left out.
export function drawOrder(scene, items) {
  const ids = buildDrawList(scene, items).flatMap((entry) => (entry.itemId ? [entry.itemId] : []));
  return [...new Set(ids)];
}

// The area an item covers (what a visitor grabs), or null when the scene does not know the object.
export function itemBounds(scene, item) {
  const entry = entryOf(scene, item.key);
  const surface = entry && surfaceOf(scene, entry);
  return surface ? placeBox(entry.bounds, item, entry, surface) : null;
}

// Scenes are 16:9: 1% of the height is shorter on screen than 1% of the width.
const HEIGHT_PER_WIDTH = 9 / 16;

const insideBox = ({ x, y }, box) => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;

// Keeps a dragged point on its surface (inside area) and pushes it out of any `blocked` box (e.g. the clam) to the nearest free edge.
// ===== KEEPING OBJECTS ON THEIR SURFACE: used by itemsEdit.js while dragging in Decorate mode =====
export function clampToSurface({ area, blocked }, point) {
  const inArea = (p) => ({ x: clamp(p.x, area.x, area.x + area.width), y: clamp(p.y, area.y, area.y + area.height) });
  let spot = inArea(point);
  const boxes = blocked || [];
  for (let round = 0; round < boxes.length + 1; round++) {
    const box = boxes.find((candidate) => insideBox(spot, candidate));
    if (!box) return spot;
    const edges = [
      { x: box.x, y: spot.y },
      { x: box.x + box.width, y: spot.y },
      { x: spot.x, y: box.y },
      { x: spot.x, y: box.y + box.height },
    ].map(inArea);
    const free = edges.filter((edge) => !boxes.some((candidate) => insideBox(edge, candidate)));
    const from = spot;
    const distance = (edge) => Math.abs(edge.x - from.x) + Math.abs(edge.y - from.y) * HEIGHT_PER_WIDTH;
    spot = (free.length ? free : edges).reduce((best, edge) => (distance(edge) < distance(best) ? edge : best));
  }
  return spot;
}

// A new copy in the middle of its surface. id = key, then key2, key3... (ids must be unique and match [A-Za-z0-9_-]{1,16} in the API).
export function newItem(scene, key, items) {
  const entry = entryOf(scene, key);
  const surface = surfaceOf(scene, entry);
  const { area } = surface;
  const taken = new Set(items.map((item) => item.id));
  let id = key;
  for (let n = 2; taken.has(id); n++) id = `${key}${n}`;
  const { x, y } = clampToSurface(surface, { x: area.x + area.width / 2, y: area.y + area.height / 2 });
  return { id, key, x, y, scale: clamp(1, entry.scale.min, entry.scale.max), flip: false };
}
