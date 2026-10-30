// The starter scenes (Rainy Night Study is in its own file because it has many layers).
// Image files live in
// client/public/scenes/<slug>/. Object positions are percentages of the scene, and
// "layer" is the index of the layer the object is drawn on (0 = first layer).
// Every scene has one object for each kind of click: toggleLight, toggleEffect, nextTrack.
const layers = (slug, items) =>
  items.map(([name, depth], i) => ({ name, image: `/scenes/${slug}/layer-${i + 1}.svg`, depth }));

const nightStudy = require('./nightStudy');

module.exports = [
  nightStudy,
  {
    slug: 'rainy-cafe',
    name: 'Rainy Café',
    description: 'A late-night café with a big window onto a rainy, neon-lit street.',
    layers: layers('rainy-cafe', [
      ['sky', 0.05],
      ['city street', 0.2],
      ['window wall', 0.5],
      ['foreground', 0.9],
    ]),
    objects: [
      { key: 'window', label: 'Window', layer: 2, x: 9.4, y: 12.2, width: 81.2, height: 53.3, action: { type: 'toggleEffect', effect: 'rain' } },
      { key: 'neon', label: 'Neon sign', layer: 2, x: 63.1, y: 15.6, width: 17.5, height: 12.2, action: { type: 'toggleLight' } },
      { key: 'jukebox', label: 'Jukebox', layer: 3, x: 2.5, y: 44.4, width: 15.6, height: 48.9, action: { type: 'nextTrack' } },
    ],
    effects: ['rain'],
    defaultEffect: 'rain',
    effectLayer: 1, // between the city and the window wall
  },
  {
    slug: 'cozy-cabin',
    name: 'Cozy Cabin',
    description: 'A log cabin living room with a crackling fireplace and snow falling outside.',
    layers: layers('cozy-cabin', [
      ['snowy night', 0.05],
      ['pines and snow', 0.2],
      ['wall and fireplace', 0.5],
      ['living room', 0.9],
    ]),
    objects: [
      { key: 'window', label: 'Window', layer: 2, x: 68.8, y: 15.6, width: 22.5, height: 36.7, action: { type: 'toggleEffect', effect: 'snow' } },
      { key: 'lamp', label: 'Floor lamp', layer: 3, x: 25.9, y: 33.3, width: 8.2, height: 53.3, action: { type: 'toggleLight' } },
      { key: 'record', label: 'Record player', layer: 3, x: 8.1, y: 64.4, width: 16.2, height: 8.9, action: { type: 'nextTrack' } },
    ],
    effects: ['snow', 'fireflies'],
    defaultEffect: 'snow',
    effectLayer: 1, // between the pines and the wall
  },
  {
    slug: 'moon-base',
    name: 'Moon Base',
    description: 'A quiet outpost on the moon, with a huge planet hanging in the starry sky.',
    layers: layers('moon-base', [
      ['stars and planet', 0.05],
      ['lunar ridges', 0.2],
      ['surface and habitat', 0.5],
      ['foreground', 0.9],
    ]),
    objects: [
      { key: 'telescope', label: 'Telescope', layer: 3, x: 26.9, y: 52.2, width: 15.6, height: 37.8, action: { type: 'toggleEffect', effect: 'stars' } },
      { key: 'beacon', label: 'Beacon light', layer: 3, x: 6.2, y: 40.0, width: 8.1, height: 48.9, action: { type: 'toggleLight' } },
      { key: 'radio', label: 'Comms radio', layer: 3, x: 76.9, y: 66.7, width: 16.2, height: 22.2, action: { type: 'nextTrack' } },
    ],
    effects: ['stars'],
    defaultEffect: 'stars',
    effectLayer: 0, // in the sky, behind the ridges
  },
];
