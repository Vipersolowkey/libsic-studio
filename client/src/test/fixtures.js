// A small scene for tests: 3 layers, the effect goes on layer 1, one object of each kind.
export const scene = {
  slug: 'test-room',
  name: 'Test Room',
  description: 'For tests',
  layers: [
    { name: 'sky', image: '/scenes/test-room/layer-1.svg', depth: 0.05 },
    { name: 'wall', image: '/scenes/test-room/layer-2.svg', depth: 0.5 },
    { name: 'front', image: '/scenes/test-room/layer-3.svg', depth: 0.9 },
  ],
  objects: [
    { key: 'window', label: 'Window', layer: 1, x: 10, y: 10, width: 30, height: 30, action: { type: 'toggleEffect', effect: 'rain' } },
    { key: 'lamp', label: 'Lamp', layer: 2, x: 50, y: 40, width: 8, height: 30, action: { type: 'toggleLight' } },
    { key: 'radio', label: 'Radio', layer: 2, x: 70, y: 60, width: 12, height: 10, action: { type: 'nextTrack' } },
  ],
  effects: ['rain', 'snow'],
  defaultEffect: 'rain',
  effectLayer: 0,
};

export const otherScene = {
  ...scene,
  slug: 'other',
  name: 'Other Room',
  effects: ['stars'],
  defaultEffect: 'stars',
  effectLayer: 1,
};

// A room as the API returns it.
export const savedRoom = {
  code: 'abc12345',
  name: 'Study',
  sceneSlug: 'other',
  cdCode: null,
  settings: { effect: 'stars', lightOn: false, volume: 0.7 },
  items: null,
  createdAt: '2026-10-26T10:00:00.000Z',
  updatedAt: '2026-10-26T10:00:00.000Z',
};

// A scene a visitor can decorate: a desk (flat, so sizes do not change with height) with a mug that can be
// placed many times and a player that can only be placed once. The mug and the player stand in the default room.
export const decorScene = {
  slug: 'decor-room',
  name: 'Decor Room',
  description: 'For tests of the decorate mode',
  layers: [
    { name: 'sky', image: '/scenes/decor-room/sky.webp', depth: 0.05 },
    { name: 'desk', image: '/scenes/decor-room/desk.webp', depth: 0.9 },
    { name: 'mug', image: '/scenes/decor-room/mug.webp', depth: 0.9, box: { x: 37, y: 72, width: 6, height: 8 }, item: 'mug' },
    { name: 'player', image: '/scenes/decor-room/player.webp', depth: 0.9, box: { x: 50, y: 60, width: 20, height: 20 }, item: 'player' },
  ],
  objects: [{ key: 'player', label: 'Music player', layer: 3, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } }],
  effects: ['rain'],
  effectLayer: 0,
  surfaces: [{ key: 'desk', area: { x: 0, y: 60, width: 100, height: 40 }, drawAt: 1, perspective: { farY: 60, nearY: 100, farScale: 1, nearScale: 1 } }],
  catalog: [
    { key: 'mug', label: 'Mug', surface: 'desk', home: { x: 40, y: 80 }, bounds: { x: 37, y: 72, width: 6, height: 8 }, thumb: '/scenes/decor-room/mug.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.5, max: 2 } },
    { key: 'player', label: 'Music player', surface: 'desk', home: { x: 60, y: 80 }, bounds: { x: 50, y: 60, width: 20, height: 20 }, thumb: '/scenes/decor-room/player.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.8, max: 1.5 } },
  ],
};
