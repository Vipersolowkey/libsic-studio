const { validateItems } = require('../src/utils/roomItems');
const { MAX_ITEMS } = require('../src/constants');

// A scene with one desk, a mug that can be placed many times and a player that can only be placed once.
const scene = {
  surfaces: [{ key: 'desk', area: { x: 2, y: 70, width: 96, height: 28 } }],
  catalog: [
    { key: 'mug', surface: 'desk', flippable: true, unique: false, scale: { min: 0.5, max: 2 } },
    { key: 'player', surface: 'desk', flippable: false, unique: true, scale: { min: 0.8, max: 1.5 } },
  ],
};

const mug = (overrides = {}) => ({ id: 'mug', key: 'mug', x: 40, y: 85, scale: 1, flip: false, ...overrides });

describe('validateItems', () => {
  it('accepts a valid list and an empty list', () => {
    expect(validateItems([mug(), { ...mug({ id: 'p', key: 'player' }) }], scene)).toBeNull();
    expect(validateItems([], scene)).toBeNull();
  });

  it('refuses something that is not a list', () => {
    expect(validateItems('mug', scene)).toHaveProperty('items');
    expect(validateItems({}, scene)).toHaveProperty('items');
  });

  it(`refuses more than ${MAX_ITEMS} items`, () => {
    const items = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => mug({ id: `m${i}` }));
    expect(validateItems(items, scene)).toHaveProperty('items');
    expect(validateItems(items.slice(0, MAX_ITEMS), scene)).toBeNull();
  });

  it('refuses a key that is not in the catalog and names it', () => {
    const details = validateItems([mug({ key: 'teapot' })], scene);
    expect(details['items[0].key']).toMatch(/teapot/);
  });

  it('refuses a contact point outside the surface, edges included', () => {
    expect(validateItems([mug({ y: 69.9 })], scene)['items[0].y']).toBeDefined();
    expect(validateItems([mug({ x: 98.1 })], scene)['items[0].x']).toBeDefined();
    expect(validateItems([mug({ x: 2, y: 98 })], scene)).toBeNull();
  });

  it('refuses a scale below the minimum or above the maximum', () => {
    expect(validateItems([mug({ scale: 0.4 })], scene)['items[0].scale']).toBeDefined();
    expect(validateItems([mug({ scale: 2.1 })], scene)['items[0].scale']).toBeDefined();
    expect(validateItems([mug({ scale: 2 })], scene)).toBeNull();
  });

  it('refuses a second copy of a unique object but allows many mugs', () => {
    const players = [mug({ id: 'a', key: 'player' }), mug({ id: 'b', key: 'player' })];
    expect(validateItems(players, scene)['items[1].key']).toBeDefined();
    expect(validateItems([mug({ id: 'a' }), mug({ id: 'b' }), mug({ id: 'c' })], scene)).toBeNull();
  });

  it('refuses repeated ids and ids with strange characters or length', () => {
    expect(validateItems([mug({ id: 'a' }), mug({ id: 'a' })], scene)['items[1].id']).toBeDefined();
    expect(validateItems([mug({ id: 'a b' })], scene)['items[0].id']).toBeDefined();
    expect(validateItems([mug({ id: 'x'.repeat(17) })], scene)['items[0].id']).toBeDefined();
    expect(validateItems([mug({ id: '' })], scene)['items[0].id']).toBeDefined();
  });

  it('refuses flip on an object that is not flippable', () => {
    expect(validateItems([mug({ key: 'player', flip: true })], scene)['items[0].flip']).toBeDefined();
    expect(validateItems([mug({ flip: true })], scene)).toBeNull();
  });

  it('refuses numbers that are not numbers and a flip that is not true or false', () => {
    const details = validateItems([mug({ x: '40', y: NaN, scale: null, flip: 'yes' })], scene);
    expect(Object.keys(details).sort()).toEqual(['items[0].flip', 'items[0].scale', 'items[0].x', 'items[0].y']);
  });

  it('needs scale and flip to be present', () => {
    const { scale, flip, ...bare } = mug();
    expect(Object.keys(validateItems([bare], scene)).sort()).toEqual(['items[0].flip', 'items[0].scale']);
  });

  it('refuses an entry that is not an object and reports every problem, not just the first', () => {
    const details = validateItems([null, mug({ key: 'teapot', scale: 9 })], scene);
    expect(details['items[0]']).toBeDefined();
    expect(details['items[1].key']).toBeDefined();
  });

  it('refuses every item of a scene without a catalog', () => {
    expect(validateItems([mug()], { surfaces: [], catalog: [] })['items[0].key']).toBeDefined();
    expect(validateItems([], { surfaces: [], catalog: [] })).toBeNull();
  });
});
