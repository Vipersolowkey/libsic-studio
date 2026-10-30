import { describe, expect, it } from 'vitest';
import { buildDrawList, clampToSurface, defaultItems, drawOrder, itemBounds, newItem, placeBox, scaleAt } from './placement.js';

// Two surfaces. The desk gets bigger towards the viewer (0.5 at y 60, 1.5 at y 100); the window is flat.
const desk = { key: 'desk', area: { x: 0, y: 60, width: 100, height: 40 }, drawAt: 3, perspective: { farY: 60, nearY: 100, farScale: 0.5, nearScale: 1.5 } };
const glass = { key: 'window', area: { x: 10, y: 5, width: 80, height: 40 }, drawAt: 1, perspective: { farY: 5, nearY: 45, farScale: 1, nearScale: 1 } };
const mug = { key: 'mug', label: 'Mug', surface: 'desk', home: { x: 40, y: 80 }, bounds: { x: 37, y: 72, width: 6, height: 8 }, flippable: true, unique: false, inDefault: true, scale: { min: 0.5, max: 2 } };
const star = { key: 'star', label: 'Star', surface: 'window', home: { x: 50, y: 20 }, bounds: { x: 48, y: 16, width: 4, height: 4 }, flippable: true, unique: false, inDefault: false, scale: { min: 0.5, max: 2 } };

const scene = {
  layers: [
    { name: 'sky', image: 'sky.webp', depth: 0 }, // 0
    { name: 'frame', image: 'frame.webp', depth: 0.5 }, // 1
    { name: 'desk', image: 'desk.webp', depth: 0.9 }, // 2
    { name: 'lamp', image: 'lamp.webp', depth: 0.9 }, // 3
    { name: 'mug shadow', image: 'mug-shadow.webp', depth: 0.9, box: { x: 36, y: 78, width: 8, height: 4 }, item: 'mug' }, // 4
    { name: 'mug', image: 'mug.webp', depth: 0.9, box: { x: 37, y: 72, width: 6, height: 8 }, item: 'mug' }, // 5
    { name: 'star', image: 'star.webp', depth: 0.5, box: { x: 48, y: 16, width: 4, height: 4 }, item: 'star' }, // 6
  ],
  surfaces: [desk, glass],
  catalog: [mug, star],
};

const item = (overrides = {}) => ({ id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false, ...overrides });

describe('scaleAt', () => {
  it('is farScale at the far edge and nearScale at the near edge', () => {
    expect(scaleAt(desk, 60)).toBe(0.5);
    expect(scaleAt(desk, 100)).toBe(1.5);
    expect(scaleAt(desk, 80)).toBe(1);
  });

  it('stays at the edge values beyond the edges', () => {
    expect(scaleAt(desk, 10)).toBe(0.5);
    expect(scaleAt(desk, 120)).toBe(1.5);
  });

  it('does not divide by zero when the far and near edge are the same', () => {
    expect(scaleAt({ perspective: { farY: 50, nearY: 50, farScale: 0.7, nearScale: 2 } }, 50)).toBe(0.7);
  });
});

describe('defaultItems', () => {
  it('has every default entry at its home, with the key as id', () => {
    expect(defaultItems(scene)).toEqual([{ id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false }]);
  });

  it('is empty for a scene without a catalog', () => {
    expect(defaultItems({ layers: [] })).toEqual([]);
  });
});

describe('placeBox', () => {
  const box = { x: 37, y: 72, width: 6, height: 8 };

  it('returns the box unchanged for an item at home with scale 1', () => {
    expect(placeBox(box, item(), mug, desk)).toEqual(box);
  });

  it('moves the box by exactly the distance of the item on a flat surface', () => {
    const moved = placeBox({ x: 48, y: 16, width: 4, height: 4 }, item({ key: 'star', x: 60, y: 25 }), star, glass);
    expect(moved).toEqual({ x: 58, y: 21, width: 4, height: 4 });
  });

  it('scales around the contact point, so a doubled item stays standing on the same spot', () => {
    const doubled = placeBox(box, item({ scale: 2 }), mug, desk);
    expect(doubled).toEqual({ x: 34, y: 64, width: 12, height: 16 });
    expect(doubled.y + doubled.height).toBe(80);
  });

  it('makes an item bigger when it moves towards the viewer', () => {
    const near = placeBox(box, item({ y: 100 }), mug, desk); // 1.5 / 1 = 1.5 times bigger
    expect(near.width).toBeCloseTo(9);
    expect(near.y + near.height).toBeCloseTo(100);
  });

  it('mirrors the box across the contact point when flipped', () => {
    const shadow = { x: 36, y: 78, width: 8, height: 4 }; // sticks out 4 to the left of x 40 and ends at 44
    expect(placeBox(shadow, item({ flip: true }), mug, desk)).toEqual({ x: 36, y: 78, width: 8, height: 4 });
    const lopsided = { x: 38, y: 78, width: 8, height: 4 }; // from 38 to 46
    expect(placeBox(lopsided, item({ flip: true }), mug, desk)).toEqual({ x: 34, y: 78, width: 8, height: 4 });
  });
});

describe('buildDrawList', () => {
  const keys = (list) => list.map((entry) => entry.key);

  it('draws the layers in their order when there are no items', () => {
    expect(keys(buildDrawList(scene, []))).toEqual(['0', '1', '2', '3']);
  });

  it('puts the desk items before the layer named by drawAt and window items before the frame', () => {
    const list = buildDrawList(scene, [item(), item({ id: 'star', key: 'star', x: 50, y: 20 })]);
    expect(keys(list)).toEqual(['0', 'star:6', '1', '2', 'mug:4', 'mug:5', '3']);
  });

  it('sorts the items of a surface by y, nearer ones last, and by id when y is equal', () => {
    const list = buildDrawList(scene, [item({ id: 'c', y: 90 }), item({ id: 'b', y: 70 }), item({ id: 'a', y: 70 })]);
    expect(keys(list).filter((key) => key.endsWith(':5'))).toEqual(['a:5', 'b:5', 'c:5']);
  });

  it('gives two entries per template layer for two items of the same kind', () => {
    const list = buildDrawList(scene, [item({ id: 'a' }), item({ id: 'b', x: 70 })]);
    expect(keys(list).filter((key) => /^[ab]:/.test(key))).toEqual(['a:4', 'a:5', 'b:4', 'b:5']);
  });

  it('describes each entry with the layer, the placed box, the template index and the flip', () => {
    const [, , , shadow, body] = buildDrawList(scene, [item({ x: 50, flip: true })]);
    expect(shadow).toMatchObject({ key: 'mug:4', itemId: 'mug', templateIndex: 4, flip: true, layer: scene.layers[4] });
    expect(body.box).toEqual(placeBox(scene.layers[5].box, item({ x: 50, flip: true }), mug, desk));
  });

  it('does not mirror a layer that is marked mirror: false, so a shadow keeps falling the same way', () => {
    const lit = { ...scene, layers: scene.layers.map((layer, i) => (i === 4 ? { ...layer, mirror: false } : layer)) };
    const flipped = item({ x: 50, flip: true });
    const [, , , shadow, body] = buildDrawList(lit, [flipped]);
    expect(shadow.flip).toBe(false);
    expect(shadow.box).toEqual(placeBox(lit.layers[4].box, { ...flipped, flip: false }, mug, desk));
    expect(body.flip).toBe(true);
  });

  it('keeps the layer and box of a fixed layer as they are', () => {
    const [sky] = buildDrawList(scene, []);
    expect(sky).toEqual({ key: '0', layer: scene.layers[0], box: undefined, templateIndex: 0, flip: false });
  });

  it('skips items whose key is not in the catalog', () => {
    expect(keys(buildDrawList(scene, [item({ key: 'teapot' })]))).toEqual(['0', '1', '2', '3']);
  });

  it('draws the items at the end when drawAt is beyond the last layer', () => {
    const late = { ...scene, surfaces: [{ ...desk, drawAt: 99 }, glass] };
    expect(keys(buildDrawList(late, [item()])).slice(-2)).toEqual(['mug:4', 'mug:5']);
  });
});

describe('drawOrder', () => {
  it('lists the ids of the items from the back to the front, as they are drawn', () => {
    const items = [item({ id: 'c', y: 90 }), item({ id: 'star', key: 'star', x: 50, y: 70 }), item({ id: 'b', y: 70 }), item({ id: 'a', y: 70 })];
    // the window is behind the desk, whatever the heights; on the desk nearer ones (larger y) come later
    expect(drawOrder(scene, items)).toEqual(['star', 'a', 'b', 'c']);
  });

  it('leaves out items the scene cannot draw', () => {
    expect(drawOrder(scene, [item({ id: 'x', key: 'teapot' }), item({ id: 'a' })])).toEqual(['a']);
  });
});

describe('itemBounds', () => {
  it('is the bounds of the entry moved and sized like the item', () => {
    expect(itemBounds(scene, item())).toEqual(mug.bounds);
    expect(itemBounds(scene, item({ scale: 2 }))).toEqual({ x: 34, y: 64, width: 12, height: 16 });
  });

  it('is null for a key that is not in the catalog', () => {
    expect(itemBounds(scene, item({ key: 'teapot' }))).toBeNull();
  });
});

describe('clampToSurface', () => {
  it('keeps a point inside the area on all four sides', () => {
    expect(clampToSurface(glass, { x: 0, y: 0 })).toEqual({ x: 10, y: 5 });
    expect(clampToSurface(glass, { x: 100, y: 100 })).toEqual({ x: 90, y: 45 });
    expect(clampToSurface(glass, { x: 50, y: 20 })).toEqual({ x: 50, y: 20 });
  });
});

describe('newItem', () => {
  it('stands in the middle of the surface at scale 1', () => {
    expect(newItem(scene, 'star', [])).toEqual({ id: 'star', key: 'star', x: 50, y: 25, scale: 1, flip: false });
  });

  it('uses the smallest number that is not taken for the id', () => {
    expect(newItem(scene, 'mug', [item()]).id).toBe('mug2');
    expect(newItem(scene, 'mug', [item(), item({ id: 'mug2' })]).id).toBe('mug3');
    expect(newItem(scene, 'mug', [item({ id: 'mug2' })]).id).toBe('mug');
  });

  it('keeps the scale inside the range of the entry', () => {
    const bigOnly = { ...scene, catalog: [{ ...mug, scale: { min: 1.2, max: 2 } }, star] };
    expect(newItem(bigOnly, 'mug', []).scale).toBe(1.2);
  });
});
