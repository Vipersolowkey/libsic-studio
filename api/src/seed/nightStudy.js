// Scene: Rainy Night Study. A desk beside a big window, drawn as many small layers so that
// the record can spin, the leaves can sway and the lamp can be switched off on its own.
// Pictures: client/public/scenes/night-study/. Positions of layers and objects are percentages
// of the scene. Layers are listed from back to front.
module.exports = {
  slug: 'night-study',
  name: 'Rainy Night Study',
  description: 'A quiet desk above the city at night: a turntable, a warm lamp and a clock, with the rain ready to switch on.',
  layers: [
    { name: 'sky', image: '/scenes/night-study/l1_sky.webp', depth: 0.05 }, // 0
    { name: 'city', image: '/scenes/night-study/l2_city.webp', depth: 0.2 }, // 1
    { name: 'window glass', image: '/scenes/night-study/l3_glass.webp', depth: 0.5 }, // 2
    { name: 'lamp reflection in the glass', image: '/scenes/night-study/c_glass_lamp_ghost.webp', depth: 0.5, box: { x: 69.21, y: 24.74, width: 13.38, height: 35.04 }, light: true }, // 3
    { name: 'window frame', image: '/scenes/night-study/l4_frame.webp', depth: 0.5 }, // 4
    { name: 'fairy lights', image: '/scenes/night-study/c_fairy_lights.webp', depth: 0.5, box: { x: 2.0, y: 3.11, width: 64.88, height: 5.78 } }, // 5
    { name: 'desk', image: '/scenes/night-study/c_desk.webp', depth: 0.9 }, // 6
    { name: 'lamp light on the desk', image: '/scenes/night-study/c_pool_lamp.webp', depth: 0.9, box: { x: 17.54, y: 60.59, width: 82.46, height: 37.26 }, blend: 'screen', light: true }, // 7
    { name: 'plant reflection', image: '/scenes/night-study/c_plant_reflection.webp', depth: 0.9, box: { x: 5.33, y: 77.33, width: 11.83, height: 8.0 }, item: 'plant' }, // 8
    { name: 'plant shadow', image: '/scenes/night-study/c_plant_shadow.webp', depth: 0.9, box: { x: 0.0, y: 75.26, width: 16.08, height: 5.78 }, item: 'plant', mirror: false }, // 9
    { name: 'plant pot', image: '/scenes/night-study/c_plant_pot.webp', depth: 0.9, box: { x: 8.21, y: 70.67, width: 4.83, height: 7.33 }, item: 'plant' }, // 10
    { name: 'c_plant_leaf_1', image: '/scenes/night-study/c_plant_leaf_1.webp', depth: 0.9, box: { x: 5.33, y: 67.26, width: 4.79, height: 11.93 }, anim: { name: 'sway', pivot: { x: 97.39, y: 38.83 }, duration: 4.7, delay: -0.6 }, item: 'plant' }, // 11
    { name: 'c_plant_leaf_2', image: '/scenes/night-study/c_plant_leaf_2.webp', depth: 0.9, box: { x: 5.29, y: 62.67, width: 6.92, height: 9.41 }, anim: { name: 'sway', pivot: { x: 73.57, y: 98.04 }, duration: 5.4, delay: -1.2 }, item: 'plant' }, // 12
    { name: 'c_plant_leaf_3', image: '/scenes/night-study/c_plant_leaf_3.webp', depth: 0.9, box: { x: 7.88, y: 56.0, width: 7.04, height: 16.07 }, anim: { name: 'sway', pivot: { x: 41.68, y: 98.85 }, duration: 6.1, delay: -1.8 }, item: 'plant' }, // 13
    { name: 'c_plant_leaf_4', image: '/scenes/night-study/c_plant_leaf_4.webp', depth: 0.9, box: { x: 10.04, y: 60.52, width: 7.79, height: 11.63 }, anim: { name: 'sway', pivot: { x: 14.74, y: 97.78 }, duration: 6.8, delay: -2.4 }, item: 'plant' }, // 14
    { name: 'c_plant_leaf_5', image: '/scenes/night-study/c_plant_leaf_5.webp', depth: 0.9, box: { x: 10.79, y: 68.22, width: 5.21, height: 11.63 }, anim: { name: 'sway', pivot: { x: 2.85, y: 31.54 }, duration: 7.5, delay: -3.0 }, item: 'plant' }, // 15
    { name: 'mug reflection', image: '/scenes/night-study/c_mug_reflection.webp', depth: 0.9, box: { x: 36.21, y: 86.89, width: 5.54, height: 3.33 }, item: 'mug' }, // 16
    { name: 'mug shadow', image: '/scenes/night-study/c_mug_shadow.webp', depth: 0.9, box: { x: 31.87, y: 85.04, width: 9.12, height: 4.37 }, item: 'mug', mirror: false }, // 17
    { name: 'mug', image: '/scenes/night-study/c_mug.webp', depth: 0.9, box: { x: 36.29, y: 79.26, width: 5.38, height: 8.0 }, item: 'mug' }, // 18
    { name: 'steam', image: '/scenes/night-study/c_steam.webp', depth: 0.9, box: { x: 36.08, y: 66.3, width: 4.17, height: 14.52 }, anim: { name: 'steam', duration: 5 }, item: 'mug' }, // 19
    { name: 'succulent reflection', image: '/scenes/night-study/c_succ_reflection.webp', depth: 0.9, box: { x: 13.96, y: 83.56, width: 2.83, height: 3.7 }, item: 'succulent' }, // 20
    { name: 'succulent shadow', image: '/scenes/night-study/c_succ_shadow.webp', depth: 0.9, box: { x: 10.67, y: 82.22, width: 6.33, height: 3.04 }, item: 'succulent', mirror: false }, // 21
    { name: 'succulent', image: '/scenes/night-study/c_succ.webp', depth: 0.9, box: { x: 13.75, y: 76.37, width: 3.25, height: 7.41 }, item: 'succulent' }, // 22
    { name: 'clock reflection', image: '/scenes/night-study/c_clock_reflection.webp', depth: 0.9, box: { x: 21.5, y: 81.48, width: 14.58, height: 6.37 }, item: 'clock' }, // 23
    { name: 'clock shadow', image: '/scenes/night-study/c_clock_shadow.webp', depth: 0.9, box: { x: 14.17, y: 77.33, width: 22.83, height: 8.96 }, item: 'clock', mirror: false }, // 24
    { name: 'clock', image: '/scenes/night-study/c_clock_blank.webp', depth: 0.9, box: { x: 21.58, y: 70.96, width: 14.46, height: 12.96 }, item: 'clock' }, // 25
    { name: 'clock digits', kind: 'clock', depth: 0.9, box: { x: 28.88, y: 76.29, width: 5.12, height: 4.8 }, anim: { name: 'pulse', skew: -6, duration: 6 }, item: 'clock' }, // 26
    { name: 'player shadow', image: '/scenes/night-study/c_player_shadow.webp', depth: 0.9, box: { x: 45.12, y: 78.52, width: 37.46, height: 9.78 }, item: 'player', mirror: false }, // 27
    { name: 'player reflection', image: '/scenes/night-study/c_player_reflection.webp', depth: 0.9, box: { x: 54.37, y: 85.78, width: 27.96, height: 4.44 }, item: 'player' }, // 28
    { name: 'music player', image: '/scenes/night-study/c_player.webp', depth: 0.9, box: { x: 54.0, y: 57.11, width: 28.33, height: 28.67 }, item: 'player' }, // 29
    { name: 'sleeve shadow', image: '/scenes/night-study/c_sleeve_shadow.webp', depth: 0.9, box: { x: 43.83, y: 76.22, width: 11.12, height: 11.48 }, item: 'sleeve', mirror: false }, // 30
    { name: 'sleeve reflection', image: '/scenes/night-study/c_sleeve_reflection.webp', depth: 0.9, box: { x: 49.04, y: 85.33, width: 5.29, height: 4.37 }, item: 'sleeve' }, // 31
    { name: 'record sleeve', image: '/scenes/night-study/c_sleeve.webp', depth: 0.9, box: { x: 49.12, y: 75.63, width: 5.54, height: 9.78 }, item: 'sleeve' }, // 32
    { name: 'record', image: '/scenes/night-study/c_vinyl_flat.webp', depth: 0.9, box: { x: 56.94, y: 57.94, width: 14.58, height: 25.92 }, anim: { name: 'spin', squash: 0.27, duration: 5 }, item: 'player' }, // 33
    { name: 'record shine', image: '/scenes/night-study/c_vinyl_sheen.webp', depth: 0.9, box: { x: 57.12, y: 67.48, width: 14.21, height: 6.81 }, blend: 'screen', item: 'player' }, // 34
    { name: 'tonearm', image: '/scenes/night-study/c_tonearm.webp', depth: 0.9, box: { x: 67.29, y: 65.78, width: 13.67, height: 7.48 }, anim: { name: 'tonearm', pivot: { x: 88.2, y: 19.25 }, rest: 16 }, item: 'player' }, // 35
    { name: 'c_lamp_reflection', image: '/scenes/night-study/c_lamp_reflection.webp', depth: 0.9, box: { x: 87.0, y: 86.0, width: 12.25, height: 4.22 } }, // 36
    { name: 'c_lamp_shadow', image: '/scenes/night-study/c_lamp_shadow.webp', depth: 0.9, box: { x: 83.21, y: 81.19, width: 16.79, height: 9.04 } }, // 37
    { name: 'lamp', image: '/scenes/night-study/c_lamp.webp', depth: 0.9, box: { x: 74.62, y: 21.78, width: 25.37, height: 67.04 } }, // 38
    { name: 'c_lamp_lit', image: '/scenes/night-study/c_lamp_lit.webp', depth: 0.9, box: { x: 74.71, y: 33.26, width: 14.75, height: 17.26 }, light: true }, // 39
    { name: 'city glow', image: '/scenes/night-study/l6_bloom.webp', depth: 0.5, box: { x: 3.12, y: 14.3, width: 94.29, height: 78.22 }, blend: 'screen' }, // 40
    { name: 'lamp glow', image: '/scenes/night-study/c_glow_lamp.webp', depth: 0.9, box: { x: 53.71, y: 7.78, width: 46.29, height: 92.22 }, blend: 'screen', light: true }, // 41
    { name: 'display glow', image: '/scenes/night-study/c_glow_oled.webp', depth: 0.9, box: { x: 58.5, y: 70.37, width: 23.96, height: 19.56 }, blend: 'screen', anim: { name: 'pulse', duration: 3.2 }, item: 'player' }, // 42
    { name: 'clock glow', image: '/scenes/night-study/c_glow_clock.webp', depth: 0.9, box: { x: 23.38, y: 70.37, width: 16.17, height: 18.07 }, blend: 'screen', anim: { name: 'pulse', duration: 6.0 }, item: 'clock' }, // 43
    { name: 'fairy light glow', image: '/scenes/night-study/c_glow_fairy.webp', depth: 0.5, box: { x: 2.33, y: 0.89, width: 65.04, height: 13.26 }, blend: 'screen', anim: { name: 'pulse', duration: 2.6 } }, // 44
    { name: 'vignette', image: '/scenes/night-study/l7_grade.webp', depth: 0 }, // 45
    { name: 'film grain', image: '/scenes/night-study/l7_grain.webp', depth: 0, tile: 21.33 }, // 46
    // Objects visitors can add (templates, drawn once for every copy a room places; see catalog). Keep them at the end so the layer numbers above stay put.
    { name: 'cactus shadow', image: '/scenes/night-study/d_cactus_shadow.webp', depth: 0.9, box: { x: 14.07, y: 85.27, width: 7.04, height: 3.33 }, item: 'cactus', mirror: false }, // 47
    { name: 'cactus reflection', image: '/scenes/night-study/d_cactus_reflection.webp', depth: 0.9, box: { x: 17.74, y: 86.6, width: 3.17, height: 3.63 }, item: 'cactus' }, // 48
    { name: 'cactus', image: '/scenes/night-study/d_cactus.webp', depth: 0.9, box: { x: 17.41, y: 79.86, width: 3.58, height: 7.18 }, item: 'cactus' }, // 49
    { name: 'candle shadow', image: '/scenes/night-study/d_candle_shadow.webp', depth: 0.9, box: { x: 41.69, y: 85.67, width: 6.04, height: 3.33 }, item: 'candle', mirror: false }, // 50
    { name: 'candle reflection', image: '/scenes/night-study/d_candle_reflection.webp', depth: 0.9, box: { x: 43.61, y: 87, width: 3.62, height: 4.07 }, item: 'candle' }, // 51
    { name: 'candle', image: '/scenes/night-study/d_candle.webp', depth: 0.9, box: { x: 43.69, y: 81.67, width: 3.42, height: 5.85 }, item: 'candle' }, // 52
    { name: 'candle flame', image: '/scenes/night-study/d_candle_flame.webp', depth: 0.9, box: { x: 39.73, y: 71.44, width: 11.33, height: 22.44 }, blend: 'screen', anim: { name: 'pulse', duration: 2.6 }, item: 'candle' }, // 53
    { name: 'photo shadow', image: '/scenes/night-study/d_photo_shadow.webp', depth: 0.9, box: { x: 50.78, y: 86.97, width: 9.75, height: 3.33 }, item: 'photo', mirror: false }, // 54
    { name: 'photo reflection', image: '/scenes/night-study/d_photo_reflection.webp', depth: 0.9, box: { x: 54.62, y: 88.3, width: 5.12, height: 3.85 }, item: 'photo' }, // 55
    { name: 'photo', image: '/scenes/night-study/d_photo.webp', depth: 0.9, box: { x: 54.74, y: 80.52, width: 4.92, height: 7.85 }, item: 'photo' }, // 56
    { name: 'books shadow', image: '/scenes/night-study/d_books_shadow.webp', depth: 0.9, box: { x: 20.58, y: 86.17, width: 14.42, height: 3.41 }, item: 'books', mirror: false }, // 57
    { name: 'books reflection', image: '/scenes/night-study/d_books_reflection.webp', depth: 0.9, box: { x: 24.67, y: 87.5, width: 9.62, height: 3.85 }, item: 'books' }, // 58
    { name: 'books', image: '/scenes/night-study/d_books.webp', depth: 0.9, box: { x: 24.79, y: 78.83, width: 9.42, height: 8.81 }, item: 'books' }, // 59
    { name: 'Paper star', image: '/scenes/night-study/d_stars.webp', depth: 0.5, box: { x: 19.33, y: 18.96, width: 5.33, height: 11.78 }, item: 'stars' }, // 60
    { name: 'Polaroid string', image: '/scenes/night-study/d_polaroids.webp', depth: 0.5, box: { x: 38.42, y: 19.93, width: 17.17, height: 12.74 }, item: 'polaroids' }, // 61
  ],
  objects: [
    { key: 'window', label: 'Window', layer: 4, x: 2, y: 5, width: 96, height: 66, action: { type: 'toggleEffect', effect: 'rain' } },
    { key: 'lamp', label: 'Desk lamp', layer: 38, x: 0, y: 0, width: 100, height: 50, action: { type: 'toggleLight' } },
    { key: 'lamp-base', label: 'Desk lamp base', layer: 38, x: 40, y: 50, width: 60, height: 50, action: { type: 'toggleLight' } },
    { key: 'player', label: 'Music player', layer: 29, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
  ],
  // What a visitor may put in the room. The pictures of an object are the layers with its key in `item`.
  // home: the bottom centre of the object where it stands in the picture (the point that sticks to the surface).
  // bounds: the area it covers there, which is what a visitor grabs.
  catalog: [
    { key: 'plant', label: 'Plant', surface: 'desk', home: { x: 10.63, y: 78 }, bounds: { x: 5.29, y: 56, width: 12.54, height: 23.85 }, thumb: '/scenes/night-study/c_plant_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 1.8 } },
    { key: 'succulent', label: 'Succulent', surface: 'desk', home: { x: 15.38, y: 83.78 }, bounds: { x: 13.75, y: 76.37, width: 3.25, height: 7.41 }, thumb: '/scenes/night-study/c_succ.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2.5 } },
    { key: 'mug', label: 'Mug', surface: 'desk', home: { x: 38.98, y: 87.26 }, bounds: { x: 36.29, y: 79.26, width: 5.38, height: 8 }, thumb: '/scenes/night-study/c_mug.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.5, max: 2.5 } },
    { key: 'clock', label: 'Clock', surface: 'desk', home: { x: 28.81, y: 83.92 }, bounds: { x: 21.58, y: 70.96, width: 14.46, height: 12.96 }, thumb: '/scenes/night-study/c_clock_blank.webp', flippable: false, unique: false, inDefault: true, scale: { min: 0.6, max: 1.6 } },
    { key: 'sleeve', label: 'Record sleeve', surface: 'desk', home: { x: 51.89, y: 85.9 }, bounds: { x: 49.12, y: 75.63, width: 5.54, height: 9.78 }, thumb: '/scenes/night-study/c_sleeve.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2 } },
    { key: 'player', label: 'Music player', surface: 'desk', home: { x: 68.16, y: 85.78 }, bounds: { x: 54, y: 57.11, width: 28.33, height: 28.67 }, thumb: '/scenes/night-study/c_player.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.7, max: 1.4 } },
    { key: 'books', label: 'Books', surface: 'desk', home: { x: 29.5, y: 87.65 }, bounds: { x: 24.79, y: 78.83, width: 9.42, height: 8.81 }, thumb: '/scenes/night-study/d_books_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2 } },
    { key: 'candle', label: 'Candle', surface: 'desk', home: { x: 45.4, y: 87.52 }, bounds: { x: 43.69, y: 79.61, width: 3.42, height: 7.91 }, thumb: '/scenes/night-study/d_candle_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.5 } },
    { key: 'photo', label: 'Framed photo', surface: 'desk', home: { x: 57.2, y: 88.37 }, bounds: { x: 54.74, y: 80.52, width: 4.92, height: 7.85 }, thumb: '/scenes/night-study/d_photo_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2 } },
    { key: 'cactus', label: 'Cactus', surface: 'desk', home: { x: 19.2, y: 87.04 }, bounds: { x: 17.41, y: 79.86, width: 3.58, height: 7.18 }, thumb: '/scenes/night-study/d_cactus_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.5 } },
    { key: 'stars', label: 'Paper star', surface: 'window', home: { x: 22, y: 30 }, bounds: { x: 19.79, y: 18.96, width: 4.42, height: 11.04 }, thumb: '/scenes/night-study/d_stars_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.5, max: 2.5 } },
    { key: 'polaroids', label: 'Polaroids', surface: 'window', home: { x: 47, y: 32 }, bounds: { x: 38.79, y: 20.3, width: 16.42, height: 11.7 }, thumb: '/scenes/night-study/d_polaroids_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.5, max: 2 } },
  ],
  // desk: things further down look closer (bigger, in front). window: objects hung on the glass, drawn behind the frame.
  // drawAt: index of the layer the objects of the surface are drawn in front of.
  surfaces: [
    { key: 'desk', area: { x: 2, y: 64, width: 96, height: 27 }, drawAt: 36, perspective: { farY: 64, nearY: 91, farScale: 0.65, nearScale: 1.2 } }, // in front of c_lamp_reflection, behind the lamp
    { key: 'window', area: { x: 3, y: 8, width: 94, height: 60 }, drawAt: 4, perspective: { farY: 8, nearY: 68, farScale: 1, nearScale: 1 } }, // in front of the glass, behind the frame
  ],
  effects: ['rain'],
  // No default effect: the glass is clear until the visitor clicks the window.
  effectLayer: 1, // the city, so the rain falls in front of it and behind the glass
};
