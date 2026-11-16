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

  // A shadow (a layer with mirror: false) lies flat on the surface, so the shadows of all objects are drawn first and
  // the objects themselves after them. Otherwise the shadow of a nearer object would be painted over the object behind it.
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

// The ids of the items from the back to the front, in the order they are drawn. Items the scene cannot draw are left out.
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

// A scene is 16:9, so one percent of its height is shorter on screen than one percent of its width.
const HEIGHT_PER_WIDTH = 9 / 16;

const insideBox = ({ x, y }, box) => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;

// The nearest point of the surface's area, so a dragged object cannot leave its surface. A point inside one
// of the surface's blocked boxes (a spot that is taken, like the clam) is pushed out to the nearest edge that
// is still free. A surface without `blocked` only gets the clamp.
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

// A new copy of an object, standing in the middle of its surface. Its id is the key, then key2, key3, ...
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
