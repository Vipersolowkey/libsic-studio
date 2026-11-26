// Part of: Scenes: data of Room "Clover Hill Meadow". Drawn by client SceneStage.jsx.
// Used by: scenes.js.
// Scene: Clover Hill Meadow, a lily pond with a little cabin, a wooden dock with a radio on the porch and a boat that rocks.
// The picture is a hand-inked cartoon cut into layers (two oaks, cattails and reeds, the boat), so it can move for the mouse
// and sway in the wind. Clicking the cabin window switches between golden hour and a starry night; the radio (or the boat) opens the music player.
// The layers are cut by docs/art-tools/make_clover_meadow.py (needs numpy, Pillow, opencv-python-headless). Positions are percentages; layers go back to front.
// After editing, run `npm run seed:scenes`.
module.exports = {
  slug: 'clover-meadow',
  name: 'Clover Hill Meadow',
  description: 'A lily pond in golden light: a little cabin on a dock, two old oaks and a porch radio that plays your music. Click the lantern for a starry night.',
  // ===== LAYERS, back to front. Each row = one picture (file in client/public/scenes/<slug>/). The number at the end is the index used below. =====
  layers: [
    { name: 'lily pond and cabin', image: '/scenes/clover-meadow/pond.webp', depth: 0.12, light: true }, // 0
    { name: 'moonlit pond and cabin', image: '/scenes/clover-meadow/pond_night.webp', depth: 0.12, night: true }, // 1
    { name: 'sun glints', image: '/scenes/clover-meadow/glints.webp', depth: 0.2, box: { x: 0.0, y: 55.46, width: 100.0, height: 44.54 }, light: true, anim: { name: 'drift', distance: 2.2, duration: 24 } }, // 2
    { name: 'moon glints', image: '/scenes/clover-meadow/glints_night.webp', depth: 0.2, box: { x: 0.0, y: 55.46, width: 100.0, height: 44.54 }, night: true, anim: { name: 'drift', distance: 2.2, duration: 24 } }, // 3
    { name: 'cabin window glow', image: '/scenes/clover-meadow/glow_window.webp', depth: 0.12, box: { x: 4.17, y: 23.15, width: 23.96, height: 32.41 }, night: true, anim: { name: 'pulse', duration: 5 } }, // 4
    { name: 'Porch radio', image: '/scenes/clover-meadow/radio.webp', depth: 0.12, box: { x: 26.98, y: 46.57, width: 8.49, height: 11.94 }, light: true, item: 'radio' }, // 5
    { name: 'Porch radio at night', image: '/scenes/clover-meadow/radio_night.webp', depth: 0.12, box: { x: 26.98, y: 46.57, width: 8.49, height: 11.94 }, night: true, item: 'radio' }, // 6
    { name: 'Porch lantern', image: '/scenes/clover-meadow/lantern.webp', depth: 0.12, box: { x: 36.35, y: 47.5, width: 2.29, height: 7.04 }, light: true, item: 'lantern' }, // 7
    { name: 'Porch lantern at night', image: '/scenes/clover-meadow/lantern_night.webp', depth: 0.12, box: { x: 36.35, y: 47.5, width: 2.29, height: 7.04 }, night: true, item: 'lantern' }, // 8
    { name: 'Flower pot', image: '/scenes/clover-meadow/flower_pot.webp', depth: 0.12, box: { x: 15.31, y: 50.0, width: 4.53, height: 10.56 }, light: true, item: 'flower_pot' }, // 9
    { name: 'Flower pot at night', image: '/scenes/clover-meadow/flower_pot_night.webp', depth: 0.12, box: { x: 15.31, y: 50.0, width: 4.53, height: 10.56 }, night: true, item: 'flower_pot' }, // 10
    { name: 'Picnic basket', image: '/scenes/clover-meadow/basket.webp', depth: 0.12, box: { x: 43.59, y: 48.61, width: 6.67, height: 7.96 }, light: true, item: 'basket' }, // 11
    { name: 'Picnic basket at night', image: '/scenes/clover-meadow/basket_night.webp', depth: 0.12, box: { x: 43.59, y: 48.61, width: 6.67, height: 7.96 }, night: true, item: 'basket' }, // 12
    { name: 'Watering can', image: '/scenes/clover-meadow/watering_can.webp', depth: 0.12, box: { x: 64.11, y: 48.24, width: 6.09, height: 7.59 }, light: true, item: 'watering_can' }, // 13
    { name: 'Watering can at night', image: '/scenes/clover-meadow/watering_can_night.webp', depth: 0.12, box: { x: 64.11, y: 48.24, width: 6.09, height: 7.59 }, night: true, item: 'watering_can' }, // 14
    { name: 'Toadstools', image: '/scenes/clover-meadow/mushrooms.webp', depth: 0.12, box: { x: 51.04, y: 51.3, width: 4.95, height: 5.46 }, light: true, item: 'mushrooms' }, // 15
    { name: 'Toadstools at night', image: '/scenes/clover-meadow/mushrooms_night.webp', depth: 0.12, box: { x: 51.04, y: 51.3, width: 4.95, height: 5.46 }, night: true, item: 'mushrooms' }, // 16
    { name: 'Stack of books', image: '/scenes/clover-meadow/book_stack.webp', depth: 0.12, box: { x: 17.19, y: 54.07, width: 6.09, height: 6.2 }, light: true, item: 'book_stack' }, // 17
    { name: 'Stack of books at night', image: '/scenes/clover-meadow/book_stack_night.webp', depth: 0.12, box: { x: 17.19, y: 54.07, width: 6.09, height: 6.2 }, night: true, item: 'book_stack' }, // 18
    { name: 'Lily pads and lotus', image: '/scenes/clover-meadow/lily_pads.webp', depth: 0.12, box: { x: 18.65, y: 69.54, width: 6.35, height: 4.81 }, light: true, item: 'lily_pads', anim: { name: 'sway', amplitude: 0.8, pivot: { x: 50.0, y: 85.0 }, duration: 6.5 } }, // 19
    { name: 'Lily pads and lotus at night', image: '/scenes/clover-meadow/lily_pads_night.webp', depth: 0.12, box: { x: 18.65, y: 69.54, width: 6.35, height: 4.81 }, night: true, item: 'lily_pads', anim: { name: 'sway', amplitude: 0.8, pivot: { x: 50.0, y: 85.0 }, duration: 6.5 } }, // 20
    { name: 'Rubber duck', image: '/scenes/clover-meadow/duck.webp', depth: 0.12, box: { x: 30.89, y: 65.19, width: 4.79, height: 6.67 }, light: true, item: 'duck', anim: { name: 'sway', amplitude: 1.2, pivot: { x: 50.0, y: 88.0 }, duration: 5.2 } }, // 21
    { name: 'Rubber duck at night', image: '/scenes/clover-meadow/duck_night.webp', depth: 0.12, box: { x: 30.89, y: 65.19, width: 4.79, height: 6.67 }, night: true, item: 'duck', anim: { name: 'sway', amplitude: 1.2, pivot: { x: 50.0, y: 88.0 }, duration: 5.2 } }, // 22
    { name: 'Paper boat', image: '/scenes/clover-meadow/paper_boat.webp', depth: 0.12, box: { x: 49.38, y: 66.48, width: 5.31, height: 6.39 }, light: true, item: 'paper_boat', anim: { name: 'sway', amplitude: 1.4, pivot: { x: 50.0, y: 88.0 }, duration: 6.1 } }, // 23
    { name: 'Paper boat at night', image: '/scenes/clover-meadow/paper_boat_night.webp', depth: 0.12, box: { x: 49.38, y: 66.48, width: 5.31, height: 6.39 }, night: true, item: 'paper_boat', anim: { name: 'sway', amplitude: 1.4, pivot: { x: 50.0, y: 88.0 }, duration: 6.1 } }, // 24
    { name: 'lantern glow', image: '/scenes/clover-meadow/glow_lantern.webp', depth: 0.12, box: { x: 27.08, y: 35.19, width: 20.83, height: 31.48 }, night: true, item: 'lantern', anim: { name: 'pulse', duration: 4.2 } }, // 25
    { name: 'radio dial glow', image: '/scenes/clover-meadow/glow_radio.webp', depth: 0.12, box: { x: 22.92, y: 46.3, width: 15.62, height: 18.52 }, night: true, item: 'radio', anim: { name: 'pulse', duration: 3.1 } }, // 26
    { name: 'window light on the water', image: '/scenes/clover-meadow/water_window.webp', depth: 0.2, box: { x: 10.36, y: 59.35, width: 14.79, height: 19.44 }, night: true, anim: { name: 'drift', distance: 1.2, duration: 8 } }, // 27
    { name: 'moon on the water', image: '/scenes/clover-meadow/water_moon.webp', depth: 0.2, box: { x: 52.92, y: 57.69, width: 10.83, height: 36.11 }, night: true, anim: { name: 'drift', distance: 1.6, duration: 9 } }, // 28
    { name: 'night mist', image: '/scenes/clover-meadow/mist_night.webp', depth: 0.25, box: { x: 0.0, y: 58.33, width: 100.0, height: 22.31 }, night: true, anim: { name: 'drift', distance: 5, duration: 70 } }, // 29
    { name: 'twinkling stars', image: '/scenes/clover-meadow/stars_a.webp', depth: 0.04, box: { x: 0.0, y: 0.19, width: 96.51, height: 33.15 }, night: true, anim: { name: 'pulse', duration: 3.6, delay: 0 } }, // 30
    { name: 'twinkling stars 2', image: '/scenes/clover-meadow/stars_b.webp', depth: 0.04, box: { x: 0.0, y: 0.83, width: 95.52, height: 32.96 }, night: true, anim: { name: 'pulse', duration: 5.4, delay: -2 } }, // 31
    { name: 'little boat', image: '/scenes/clover-meadow/boat.webp', depth: 0.45, box: { x: 44.17, y: 77.31, width: 39.27, height: 11.3 }, light: true, anim: { name: 'sway', amplitude: 0.7, pivot: { x: 50.0, y: 78.0 }, duration: 7 } }, // 32
    { name: 'little boat at night', image: '/scenes/clover-meadow/boat_night.webp', depth: 0.45, box: { x: 44.17, y: 77.31, width: 39.27, height: 11.3 }, night: true, anim: { name: 'sway', amplitude: 0.7, pivot: { x: 50.0, y: 78.0 }, duration: 7 } }, // 33
    { name: 'left oak', image: '/scenes/clover-meadow/tree_left.webp', depth: 0.7, box: { x: 0.0, y: 0.0, width: 23.23, height: 28.33 }, light: true, anim: { name: 'sway', amplitude: 0.25, pivot: { x: 20.0, y: 0.0 }, duration: 11 } }, // 34
    { name: 'left oak at night', image: '/scenes/clover-meadow/tree_left_night.webp', depth: 0.7, box: { x: 0.0, y: 0.0, width: 23.23, height: 28.33 }, night: true, anim: { name: 'sway', amplitude: 0.25, pivot: { x: 20.0, y: 0.0 }, duration: 11 } }, // 35
    { name: 'right oak', image: '/scenes/clover-meadow/tree_right.webp', depth: 0.75, box: { x: 63.7, y: 0.0, width: 36.3, height: 64.72 }, light: true, anim: { name: 'sway', amplitude: 0.25, pivot: { x: 90.0, y: 90.0 }, duration: 12 } }, // 36
    { name: 'right oak at night', image: '/scenes/clover-meadow/tree_right_night.webp', depth: 0.75, box: { x: 63.7, y: 0.0, width: 36.3, height: 64.72 }, night: true, anim: { name: 'sway', amplitude: 0.25, pivot: { x: 90.0, y: 90.0 }, duration: 12 } }, // 37
    { name: 'cattails', image: '/scenes/clover-meadow/grass_left.webp', depth: 0.95, box: { x: 0.0, y: 69.91, width: 13.02, height: 30.09 }, light: true, anim: { name: 'sway', amplitude: 1.2, pivot: { x: 40.0, y: 100.0 }, duration: 6 } }, // 38
    { name: 'cattails at night', image: '/scenes/clover-meadow/grass_left_night.webp', depth: 0.95, box: { x: 0.0, y: 69.91, width: 13.02, height: 30.09 }, night: true, anim: { name: 'sway', amplitude: 1.2, pivot: { x: 40.0, y: 100.0 }, duration: 6 } }, // 39
    { name: 'reeds', image: '/scenes/clover-meadow/grass_right.webp', depth: 0.95, box: { x: 89.95, y: 82.13, width: 10.05, height: 17.87 }, light: true, anim: { name: 'sway', amplitude: 1.0, pivot: { x: 60.0, y: 100.0 }, duration: 7 } }, // 40
    { name: 'reeds at night', image: '/scenes/clover-meadow/grass_right_night.webp', depth: 0.95, box: { x: 89.95, y: 82.13, width: 10.05, height: 17.87 }, night: true, anim: { name: 'sway', amplitude: 1.0, pivot: { x: 60.0, y: 100.0 }, duration: 7 } }, // 41
    { name: 'vignette', image: '/scenes/clover-meadow/vignette.webp', depth: 0.0, box: { x: 0.0, y: 0.0, width: 100.0, height: 100.0 } }, // 42
    { name: 'window hit', image: '/scenes/clover-meadow/hit.webp', depth: 0.12, box: { x: 13.02, y: 32.87, width: 5.99, height: 11.11 } }, // 43
    { name: 'boat hit', image: '/scenes/clover-meadow/hit.webp', depth: 0.45, box: { x: 44.43, y: 77.78, width: 38.7, height: 10.37 } }, // 44
    { name: 'radio hit', image: '/scenes/clover-meadow/hit.webp', depth: 0.12, box: { x: 27.08, y: 47.22, width: 8.75, height: 11.67 }, item: 'radio' }, // 45
    { name: 'lantern hit', image: '/scenes/clover-meadow/hit.webp', depth: 0.12, box: { x: 35.94, y: 47.96, width: 3.12, height: 6.48 }, item: 'lantern' }, // 46
    { name: 'effects', image: '/scenes/clover-meadow/hit.webp', depth: 0.3, box: { x: 0, y: 0, width: 100, height: 100 } }, // 47
  ],
  // ===== CLICKABLE OBJECTS: where a click does something (toggle light / effect / curtains, or open the music player). `layer` = index above. =====
  objects: [
    { key: 'pond', label: 'Lily pond', layer: 47, x: 4, y: 64, width: 70, height: 30, action: { type: 'toggleEffect', effect: 'fireflies' } },
    { key: 'lantern', label: 'Porch lantern: golden hour or starlight', layer: 46, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleLight' } },
    { key: 'window', label: 'Cabin window: golden hour or starlight', layer: 43, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleLight' } },
    { key: 'radio', label: 'Porch radio', layer: 45, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
    { key: 'boat', label: 'Little boat', layer: 44, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
  ],
  // What a visitor may put in the room (Decorate). The pictures of an object are the layers with its key in `item`.
  // ===== DECORATE: what a visitor can add (catalog) and where it can stand (surfaces). Pictures = layers with the same `item` key. =====
  catalog: [
    { key: 'radio', label: 'Porch radio', surface: 'dock', home: { x: 31.46, y: 58.15 }, bounds: { x: 26.98, y: 46.57, width: 8.49, height: 11.94 }, thumb: '/scenes/clover-meadow/radio_thumb.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.7, max: 1.5 } },
    { key: 'lantern', label: 'Porch lantern', surface: 'dock', home: { x: 37.5, y: 54.17 }, bounds: { x: 36.35, y: 47.5, width: 2.29, height: 7.04 }, thumb: '/scenes/clover-meadow/lantern_thumb.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.7, max: 1.5 } },
    { key: 'flower_pot', label: 'Flower pot', surface: 'dock', home: { x: 17.19, y: 59.81 }, bounds: { x: 15.31, y: 50.0, width: 4.53, height: 10.56 }, thumb: '/scenes/clover-meadow/flower_pot_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.6 } },
    { key: 'basket', label: 'Picnic basket', surface: 'shore', home: { x: 46.88, y: 55.93 }, bounds: { x: 43.59, y: 48.61, width: 6.67, height: 7.96 }, thumb: '/scenes/clover-meadow/basket_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.6 } },
    { key: 'watering_can', label: 'Watering can', surface: 'shore', home: { x: 67.19, y: 55.19 }, bounds: { x: 64.11, y: 48.24, width: 6.09, height: 7.59 }, thumb: '/scenes/clover-meadow/watering_can_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.6 } },
    { key: 'mushrooms', label: 'Toadstools', surface: 'shore', home: { x: 53.65, y: 56.3 }, bounds: { x: 51.04, y: 51.3, width: 4.95, height: 5.46 }, thumb: '/scenes/clover-meadow/mushrooms_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'book_stack', label: 'Stack of books', surface: 'dock', home: { x: 20.31, y: 60.0 }, bounds: { x: 17.19, y: 54.07, width: 6.09, height: 6.2 }, thumb: '/scenes/clover-meadow/book_stack_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.6 } },
    { key: 'lily_pads', label: 'Lily pads and lotus', surface: 'water', home: { x: 21.88, y: 74.07 }, bounds: { x: 18.65, y: 69.54, width: 6.35, height: 4.81 }, thumb: '/scenes/clover-meadow/lily_pads_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'duck', label: 'Rubber duck', surface: 'water', home: { x: 33.33, y: 71.3 }, bounds: { x: 30.89, y: 65.19, width: 4.79, height: 6.67 }, thumb: '/scenes/clover-meadow/duck_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'paper_boat', label: 'Paper boat', surface: 'water', home: { x: 52.08, y: 72.22 }, bounds: { x: 49.38, y: 66.48, width: 5.31, height: 6.39 }, thumb: '/scenes/clover-meadow/paper_boat_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
  ],
  surfaces: [
    { key: 'dock', area: { x: 13, y: 53, width: 26, height: 9 }, perspective: { farY: 53, nearY: 62, farScale: 0.85, nearScale: 1.15 }, drawAt: 32 },
    { key: 'shore', area: { x: 40, y: 53.5, width: 40, height: 4.5 }, perspective: { farY: 53.5, nearY: 58, farScale: 0.85, nearScale: 1.0 }, drawAt: 32 },
    { key: 'water', area: { x: 4, y: 63, width: 90, height: 30 }, perspective: { farY: 63, nearY: 93, farScale: 0.6, nearScale: 1.2 }, drawAt: 32 },
  ],
  nightDim: 0, // the night is painted in its own layers, there is no extra dimming
  // ===== EFFECTS the room can show (client scene/Effects.jsx), which one starts, and the layer index they are drawn above =====
  effects: ['fireflies', 'stars'],
  defaultEffect: 'fireflies',
  effectLayer: 47, // the fireflies and stars float above the pond, below the trees
};
