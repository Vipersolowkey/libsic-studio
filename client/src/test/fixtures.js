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
