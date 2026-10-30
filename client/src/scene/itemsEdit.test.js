import { describe, expect, it } from 'vitest';
import { addItem, flipItem, itemsEqual, MAX_ITEMS, moveItem, removeItem, scaleItem } from './itemsEdit.js';
import { decorScene as scene } from '../test/fixtures.js';

const mug = { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false };
const player = { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false };
const items = [mug, player];

describe('moveItem', () => {
  it('moves the item and leaves the others as they are', () => {
    const moved = moveItem(scene, items, 'mug', { x: 20, y: 90 });
    expect(moved).toEqual([{ ...mug, x: 20, y: 90 }, player]);
    expect(moved[1]).toBe(player);
  });

  it('keeps the contact point on the surface', () => {
    expect(moveItem(scene, items, 'mug', { x: -5, y: 10 })[0]).toMatchObject({ x: 0, y: 60 });
    expect(moveItem(scene, items, 'mug', { x: 150, y: 150 })[0]).toMatchObject({ x: 100, y: 100 });
  });

  it('keeps positions to two decimals so saved rooms stay small', () => {
    expect(moveItem(scene, items, 'mug', { x: 20.123456, y: 90.987654 })[0]).toMatchObject({ x: 20.12, y: 90.99 });
  });

  it('does not change the list it was given', () => {
    moveItem(scene, items, 'mug', { x: 20, y: 90 });
    expect(items).toEqual([mug, player]);
  });

  it('returns the same list for an id that is not placed', () => {
    expect(moveItem(scene, items, 'nope', { x: 20, y: 90 })).toBe(items);
  });
});

describe('an item whose object the scene does not have (for example after the scene changed)', () => {
  const stray = { id: 'x', key: 'teapot', x: 50, y: 80, scale: 1, flip: false };

  it('is left alone by every change, and can still be removed', () => {
    const list = [mug, stray];
    expect(moveItem(scene, list, 'x', { x: 1, y: 70 })).toBe(list);
    expect(scaleItem(scene, list, 'x', 2)).toBe(list);
    expect(flipItem(scene, list, 'x')).toBe(list);
    expect(removeItem(list, 'x')).toEqual([mug]);
  });
});

describe('scaleItem', () => {
  it('sets the scale, kept inside the range of the object', () => {
    expect(scaleItem(scene, items, 'mug', 1.5)[0].scale).toBe(1.5);
    expect(scaleItem(scene, items, 'mug', 9)[0].scale).toBe(2);
    expect(scaleItem(scene, items, 'mug', 0.1)[0].scale).toBe(0.5);
  });

  it('returns the same list when the scale does not change', () => {
    expect(scaleItem(scene, items, 'mug', 1)).toBe(items);
  });
});

describe('flipItem', () => {
  it('mirrors the item and mirrors it back', () => {
    const flipped = flipItem(scene, items, 'mug');
    expect(flipped[0].flip).toBe(true);
    expect(flipItem(scene, flipped, 'mug')[0].flip).toBe(false);
  });

  it('does nothing for an object that cannot be flipped', () => {
    expect(flipItem(scene, items, 'player')).toBe(items);
  });
});

describe('removeItem', () => {
  it('removes the item with that id', () => {
    expect(removeItem(items, 'mug')).toEqual([player]);
  });

  it('returns the same list when there is no such item', () => {
    expect(removeItem(items, 'nope')).toBe(items);
  });
});

describe('addItem', () => {
  it('adds a new copy in the middle of the surface', () => {
    const added = addItem(scene, items, 'mug');
    expect(added).toHaveLength(3);
    expect(added[2]).toEqual({ id: 'mug2', key: 'mug', x: 50, y: 80, scale: 1, flip: false });
    expect(items).toHaveLength(2);
  });

  it('does not add a second copy of a unique object', () => {
    expect(addItem(scene, items, 'player')).toBe(items);
    expect(addItem(scene, [mug], 'player')).toHaveLength(2);
  });

  it('does not add an object that the scene does not have', () => {
    expect(addItem(scene, items, 'teapot')).toBe(items);
  });

  it(`stops at ${MAX_ITEMS} items`, () => {
    const full = Array.from({ length: MAX_ITEMS }, (_, i) => ({ ...mug, id: `m${i}` }));
    expect(addItem(scene, full, 'mug')).toBe(full);
    expect(addItem(scene, full.slice(1), 'mug')).toHaveLength(MAX_ITEMS);
  });
});

describe('itemsEqual', () => {
  it('treats two lists with the same objects in the same places as equal, whatever the order of the fields', () => {
    expect(itemsEqual(items, items.map((item) => ({ ...item })))).toBe(true);
    expect(itemsEqual([{ flip: false, scale: 1, y: 80, x: 40, key: 'mug', id: 'mug' }], [mug])).toBe(true);
  });

  it('sees every kind of change', () => {
    expect(itemsEqual(items, [{ ...mug, x: 41 }, player])).toBe(false);
    expect(itemsEqual(items, [mug])).toBe(false);
    expect(itemsEqual(items, [player, mug])).toBe(false);
    expect(itemsEqual([mug], [{ ...mug, flip: true }])).toBe(false);
  });

  it('knows that null (the default arrangement) is not an empty room', () => {
    expect(itemsEqual(null, null)).toBe(true);
    expect(itemsEqual(null, [])).toBe(false);
    expect(itemsEqual([], null)).toBe(false);
    expect(itemsEqual(undefined, null)).toBe(true);
  });
});
