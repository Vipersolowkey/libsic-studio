// The three starter scenes. Image files are drawn in Task 4 and live in
// client/public/scenes/<slug>/. Object positions are percentages of the scene, and
// "layer" is the index of the layer the object is drawn on (0 = first layer).
const layers = (slug, items) =>
  items.map(([name, depth], i) => ({ name, image: `/scenes/${slug}/layer-${i + 1}.svg`, depth }));

module.exports = [
  {
    slug: 'rainy-night',
    name: 'Rainy Night',
    description: 'A quiet desk by a window, with the city glowing in the rain.',
    layers: layers('rainy-night', [
      ['sky', 0.05],
      ['city', 0.2],
      ['window frame', 0.5],
      ['desk', 0.9],
    ]),
    objects: [
      { key: 'lamp', label: 'Desk lamp', layer: 3, x: 12, y: 58, width: 10, height: 22, action: { type: 'toggleLight' } },
      { key: 'window', label: 'Window', layer: 2, x: 30, y: 12, width: 40, height: 40, action: { type: 'toggleEffect', effect: 'rain' } },
      { key: 'radio', label: 'Radio', layer: 3, x: 76, y: 62, width: 12, height: 14, action: { type: 'nextTrack' } },
    ],
    effects: ['rain'],
    defaultEffect: 'rain',
  },
  {
    slug: 'cozy-cabin',
    name: 'Cozy Cabin',
    description: 'A warm wooden cabin with fireflies drifting past the window.',
    layers: layers('cozy-cabin', [
      ['forest', 0.05],
      ['cabin wall', 0.25],
      ['window', 0.5],
      ['table', 0.9],
    ]),
    objects: [
      { key: 'lamp', label: 'Oil lamp', layer: 3, x: 14, y: 56, width: 9, height: 20, action: { type: 'toggleLight' } },
      { key: 'window', label: 'Window', layer: 2, x: 34, y: 14, width: 34, height: 36, action: { type: 'toggleEffect', effect: 'fireflies' } },
      { key: 'radio', label: 'Old radio', layer: 3, x: 72, y: 60, width: 14, height: 14, action: { type: 'nextTrack' } },
    ],
    effects: ['fireflies', 'snow'],
    defaultEffect: 'fireflies',
  },
  {
    slug: 'deep-space',
    name: 'Deep Space',
    description: 'A small cabin window looking out at slowly twinkling stars.',
    layers: layers('deep-space', [
      ['stars', 0.05],
      ['planet', 0.2],
      ['window frame', 0.55],
      ['console', 0.9],
    ]),
    objects: [
      { key: 'lamp', label: 'Console light', layer: 3, x: 10, y: 62, width: 9, height: 14, action: { type: 'toggleLight' } },
      { key: 'window', label: 'Viewport', layer: 2, x: 28, y: 10, width: 44, height: 42, action: { type: 'toggleEffect', effect: 'stars' } },
      { key: 'radio', label: 'Comms radio', layer: 3, x: 78, y: 64, width: 12, height: 12, action: { type: 'nextTrack' } },
    ],
    effects: ['stars'],
    defaultEffect: 'stars',
  },
];
