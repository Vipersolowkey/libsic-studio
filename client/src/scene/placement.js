// Where the objects a visitor placed are drawn. Pure functions, no React.
//
// An object is described by a catalog entry of the scene (its home, bounds and surface) and, for every copy
// in a room, an item { id, key, x, y, scale, flip }. x and y are where the object's contact point (the bottom
// centre) touches its surface, in percent of the scene. The pictures of the object are layers of the scene
// that name it in `item`; they are drawn once per item, moved and sized around that contact point.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const entryOf = (scene, key) => scene.catalog?.find((entry) => entry.key === key);
export const surfaceOf = (scene, entry) => scene.surfaces?.find((surface) => surface.key === entry.surface);

// How big things look at height y of a surface: farScale at its far edge, nearScale at its near edge.
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

// Moves and sizes a box of the entry (drawn for its home) to where the item stands.
// An object at its home with scale 1 gets its own box back.
export function placeBox(box, item, entry, surface) {
  const { home } = entry;
  const s = (item.scale * scaleAt(surface, item.y)) / scaleAt(surface, home.y);
  const fromHome = item.flip ? -(box.x + box.width - home.x) : box.x - home.x; // flipped: mirrored across the contact point
  return { x: item.x + fromHome * s, y: item.y + (box.y - home.y) * s, width: box.width * s, height: box.height * s };
}

// The list of things to draw, back to front. Layers without an item stay in their order; the items of a
// surface are drawn just before the layer at surface.drawAt, nearer ones (larger y) later. Each entry:
//   key             stable key for React: the layer index, or "<item id>:<layer index>"
//   itemId          the id of the item a picture belongs to (undefined for the fixed layers)
//   layer, box      the layer and where it is drawn (undefined: the whole scene, or the layer's own box)
//   templateIndex   index in scene.layers of the layer this entry comes from
//   flip            true when the picture must be mirrored
export function buildDrawList(scene, items) {
  const placedBySurface = new Map();
  for (const item of items) {
    const entry = entryOf(scene, item.key);
    const surface = entry && surfaceOf(scene, entry);
    if (!surface) continue;
    if (!placedBySurface.has(surface)) placedBySurface.set(surface, []);
    placedBySurface.get(surface).push({ item, entry });
  }

  const drawItemsOf = (surface) =>
    (placedBySurface.get(surface) || [])
      .sort((a, b) => a.item.y - b.item.y || a.item.id.localeCompare(b.item.id))
      .flatMap(({ item, entry }) =>
        scene.layers.flatMap((layer, templateIndex) => {
          if (layer.item !== item.key) return [];
          const flip = Boolean(item.flip) && layer.mirror !== false; // a shadow keeps its side
          const box = placeBox(layer.box, { ...item, flip }, entry, surface);
          return [{ key: `${item.id}:${templateIndex}`, itemId: item.id, layer, box, templateIndex, flip }];
        })
      );

  const surfaces = scene.surfaces || [];
  const list = [];
  scene.layers.forEach((layer, i) => {
    surfaces.filter((surface) => surface.drawAt === i).forEach((surface) => list.push(...drawItemsOf(surface)));
    if (!layer.item) list.push({ key: String(i), layer, box: layer.box, templateIndex: i, flip: false });
  });
  surfaces.filter((surface) => surface.drawAt >= scene.layers.length).forEach((surface) => list.push(...drawItemsOf(surface)));
  return list;
}

// The area an item covers (what a visitor grabs), or null when the scene does not know the object.
export function itemBounds(scene, item) {
  const entry = entryOf(scene, item.key);
  const surface = entry && surfaceOf(scene, entry);
  return surface ? placeBox(entry.bounds, item, entry, surface) : null;
}

// The nearest point of the surface's area, so a dragged object cannot leave its surface.
export function clampToSurface({ area }, { x, y }) {
  return { x: clamp(x, area.x, area.x + area.width), y: clamp(y, area.y, area.y + area.height) };
}

// A new copy of an object, standing in the middle of its surface. Its id is the key, then key2, key3, ...
export function newItem(scene, key, items) {
  const entry = entryOf(scene, key);
  const { area } = surfaceOf(scene, entry);
  const taken = new Set(items.map((item) => item.id));
  let id = key;
  for (let n = 2; taken.has(id); n++) id = `${key}${n}`;
  return { id, key, x: area.x + area.width / 2, y: area.y + area.height / 2, scale: clamp(1, entry.scale.min, entry.scale.max), flip: false };
}
