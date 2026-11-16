// Scene: Golden Hour Loft. A bright late-afternoon desk in front of a big window, drawn as many small layers so that
// the curtains can billow (and be drawn shut), the clouds drift, the cat breathe and the disc spin. Floating dust is an effect (see Effects.jsx).
// Clicking the clock switches between day and night (night = lights off: the sun goes out and the night sky layer comes in).
// Pictures: client/public/scenes/golden-loft/. Positions of layers and objects are percentages of the scene. Layers are listed
// from back to front; the layers of placeable objects (the ones with `item`) come last and are drawn where the surface says.
module.exports = {
  slug: 'golden-loft',
  name: 'Golden Hour Loft',
  description: 'A bright loft in the late afternoon: sun streaming through sheer curtains, floating dust, a sleeping cat and a portable CD player on a wooden desk.',
  layers: [
    { name: 'sky', image: '/scenes/golden-loft/l1_sky.webp', depth: 0.05 }, // 0
    { name: 'clouds', image: '/scenes/golden-loft/l2_clouds.webp', depth: 0.08, box: { x: 0.0, y: 7.78, width: 100.0, height: 42.22 }, anim: { name: 'drift', distance: 8, duration: 240 } }, // 1
    { name: 'rooftops', image: '/scenes/golden-loft/l3_roofs.webp', depth: 0.2, box: { x: 3.62, y: 44.44, width: 61.92, height: 22.22 } }, // 2
    { name: 'night sky', image: '/scenes/golden-loft/l3b_night.webp', depth: 0.2, box: { x: 0.0, y: 3.33, width: 70.0, height: 63.33 }, night: true }, // 3
    { name: 'glass sheen', image: '/scenes/golden-loft/l5_glass_sheen.webp', depth: 0.5, box: { x: 15.71, y: 7.33, width: 36.13, height: 52.44 }, light: true }, // 4
    { name: 'wall', image: '/scenes/golden-loft/l4_wall.webp', depth: 0.5 }, // 5
    { name: 'window frame', image: '/scenes/golden-loft/l6_frame.webp', depth: 0.5, box: { x: 0.0, y: 4.0, width: 69.75, height: 57.33 } }, // 6
    { name: 'shelves and print', image: '/scenes/golden-loft/c_wall_decor.webp', depth: 0.5, box: { x: 68.75, y: 11.11, width: 20.63, height: 48.22 } }, // 7
    { name: 'pothos shadow', image: '/scenes/golden-loft/pothos_shadow.webp', depth: 0.5, box: { x: 90.25, y: 19.11, width: 9.75, height: 41.56 } }, // 8
    { name: 'pothos pot', image: '/scenes/golden-loft/pothos_pot.webp', depth: 0.5, box: { x: 90.63, y: 0.0, width: 7.5, height: 26.67 } }, // 9
    { name: 'pothos vine 1', image: '/scenes/golden-loft/pothos_vine_1.webp', depth: 0.5, box: { x: 88.13, y: 16.22, width: 8.13, height: 43.56 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 75.38, y: 9.18 }, duration: 5.7, delay: -0.9 } }, // 10
    { name: 'pothos vine 2', image: '/scenes/golden-loft/pothos_vine_2.webp', depth: 0.5, box: { x: 92.13, y: 16.44, width: 6.75, height: 45.11 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 31.48, y: 8.37 }, duration: 6.4, delay: -1.8 } }, // 11
    { name: 'pothos vine 3', image: '/scenes/golden-loft/pothos_vine_3.webp', depth: 0.5, box: { x: 90.38, y: 16.67, width: 6.25, height: 33.78 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 62.0, y: 10.53 }, duration: 7.1, delay: -2.7 } }, // 12
    { name: 'pothos vine 4', image: '/scenes/golden-loft/pothos_vine_4.webp', depth: 0.5, box: { x: 92.88, y: 16.44, width: 7.13, height: 31.56 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 17.46, y: 11.97 }, duration: 7.8, delay: -3.6 } }, // 13
    { name: 'left curtain', image: '/scenes/golden-loft/l7_curtain_left.webp', depth: 0.55, box: { x: 0.0, y: 4.0, width: 15.63, height: 69.78 }, curtain: { scale: 2.3, origin: 0 }, anim: { name: 'billow', amplitude: 1.4, pivot: { x: 48.4, y: 0.96 }, duration: 7.5, delay: 0.0 } }, // 14
    { name: 'right curtain', image: '/scenes/golden-loft/l7_curtain_right.webp', depth: 0.55, box: { x: 52.63, y: 4.0, width: 16.13, height: 69.78 }, curtain: { scale: 2.3, origin: 100 }, anim: { name: 'billow', amplitude: 1.4, pivot: { x: 51.55, y: 0.96 }, duration: 5.5, delay: -1.7 } }, // 15
    { name: 'desk', image: '/scenes/golden-loft/c_desk.webp', depth: 0.9, box: { x: 0.0, y: 63.78, width: 100.0, height: 36.22 } }, // 16
    { name: 'sun on the desk', image: '/scenes/golden-loft/c_sunwash.webp', depth: 0.9, box: { x: 0.0, y: 64.0, width: 81.25, height: 26.67 }, light: true }, // 17
    { name: 'window light on the desk', image: '/scenes/golden-loft/c_sunpattern.webp', depth: 0.9, blend: 'screen', box: { x: 7.5, y: 64.0, width: 73.75, height: 26.67 }, light: true }, // 18
    { name: 'moonlight', image: '/scenes/golden-loft/n2_moonlight.webp', depth: 0.9, blend: 'screen', box: { x: 14.83, y: 64.15, width: 54.92, height: 26.15 }, night: true }, // 19
    { name: 'pothos shadow', image: '/scenes/golden-loft/pothos_shadow.webp', depth: 0.5, box: { x: 90.25, y: 19.11, width: 9.75, height: 41.56 } }, // 20
    { name: 'pothos pot', image: '/scenes/golden-loft/pothos_pot.webp', depth: 0.5, box: { x: 90.63, y: 0.0, width: 7.5, height: 26.67 } }, // 21
    { name: 'pothos vine 1', image: '/scenes/golden-loft/pothos_vine_1.webp', depth: 0.5, box: { x: 88.13, y: 16.22, width: 8.13, height: 43.56 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 75.38, y: 9.18 }, duration: 5.7, delay: -0.9 } }, // 22
    { name: 'pothos vine 2', image: '/scenes/golden-loft/pothos_vine_2.webp', depth: 0.5, box: { x: 92.13, y: 16.44, width: 6.75, height: 45.11 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 31.48, y: 8.37 }, duration: 6.4, delay: -1.8 } }, // 23
    { name: 'pothos vine 3', image: '/scenes/golden-loft/pothos_vine_3.webp', depth: 0.5, box: { x: 90.38, y: 16.67, width: 6.25, height: 33.78 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 62.0, y: 10.53 }, duration: 7.1, delay: -2.7 } }, // 24
    { name: 'pothos vine 4', image: '/scenes/golden-loft/pothos_vine_4.webp', depth: 0.5, box: { x: 92.88, y: 16.44, width: 7.13, height: 31.56 }, anim: { name: 'sway', amplitude: 2.6, pivot: { x: 17.46, y: 11.97 }, duration: 7.8, delay: -3.6 } }, // 25
    { name: 'light beams', image: '/scenes/golden-loft/l8_beams.webp', depth: 0.6, blend: 'screen', box: { x: 0.0, y: 2.44, width: 100.0, height: 97.56 }, light: true }, // 26
    { name: 'bloom', image: '/scenes/golden-loft/l9_bloom.webp', depth: 0.5, blend: 'screen', box: { x: 4.0, y: 2.15, width: 88.38, height: 67.63 }, light: true }, // 27
    { name: 'foreground drape', image: '/scenes/golden-loft/f1_drape.webp', depth: 1.0, box: { x: 0.0, y: 0.0, width: 7.0, height: 100.0 } }, // 28
    { name: 'foreground leaves', image: '/scenes/golden-loft/f2_leaves.webp', depth: 1.0, box: { x: 87.21, y: 81.71, width: 12.79, height: 18.29 } }, // 29
    { name: 'night shade', image: '/scenes/golden-loft/n1_nightshade.webp', depth: 0.5, blend: 'multiply', night: true }, // 30
    { name: 'shelf lamp glow', image: '/scenes/golden-loft/n3_lamp.webp', depth: 0.5, blend: 'screen', box: { x: 68.58, y: 14.23, width: 31.42, height: 49.63 }, night: true, anim: { name: 'pulse', duration: 7 } }, // 31
    { name: 'vignette', image: '/scenes/golden-loft/l10_grade.webp', depth: 0 }, // 32
    { name: 'film grain', image: '/scenes/golden-loft/l11_grain.webp', depth: 0, tile: 10.67 }, // 33
    { name: 'clock shadow', image: '/scenes/golden-loft/clock_shadow.webp', depth: 0.9, box: { x: 91.19, y: 73.44, width: 8.81, height: 7.89 }, item: 'clock', mirror: false }, // 34
    { name: 'clock', image: '/scenes/golden-loft/clock.webp', depth: 0.9, box: { x: 91.19, y: 65.78, width: 4.88, height: 8.89 }, item: 'clock' }, // 35
    { name: 'clock night', image: '/scenes/golden-loft/clock_night.webp', depth: 0.9, box: { x: 91.13, y: 65.33, width: 4.88, height: 9.56 }, blend: 'multiply', night: true, item: 'clock' }, // 36
    { name: 'clock nlit', image: '/scenes/golden-loft/clock_nlit.webp', depth: 0.9, box: { x: 91.13, y: 65.33, width: 4.88, height: 9.56 }, night: true, item: 'clock' }, // 37
    { name: 'plant shadow', image: '/scenes/golden-loft/plant_shadow.webp', depth: 0.9, box: { x: 55.58, y: 69.56, width: 32.75, height: 20.52 }, item: 'plant', mirror: false }, // 38
    { name: 'plant pot', image: '/scenes/golden-loft/plant_pot.webp', depth: 0.9, box: { x: 56.29, y: 57.56, width: 6.79, height: 15.63 }, item: 'plant' }, // 39
    { name: 'plant leaves 1', image: '/scenes/golden-loft/plant_leaves_1.webp', depth: 0.9, box: { x: 52.63, y: 30.59, width: 14.79, height: 33.48 }, anim: { name: 'sway', amplitude: 2.2, pivot: { x: 47.75, y: 98.72 }, duration: 5.0, delay: -0.7 }, item: 'plant' }, // 40
    { name: 'plant leaves 2', image: '/scenes/golden-loft/plant_leaves_2.webp', depth: 0.9, box: { x: 55.88, y: 38.52, width: 11.71, height: 25.56 }, anim: { name: 'sway', amplitude: 2.2, pivot: { x: 32.56, y: 98.32 }, duration: 5.8, delay: -1.4 }, item: 'plant' }, // 41
    { name: 'plant leaves 3', image: '/scenes/golden-loft/plant_leaves_3.webp', depth: 0.9, box: { x: 52.46, y: 45.63, width: 11.17, height: 18.44 }, anim: { name: 'sway', amplitude: 2.2, pivot: { x: 64.74, y: 97.67 }, duration: 6.6, delay: -2.1 }, item: 'plant' }, // 42
    { name: 'cat shadow', image: '/scenes/golden-loft/cat_shadow.webp', depth: 0.9, box: { x: 6.08, y: 80.59, width: 26.13, height: 9.48 }, item: 'cat', mirror: false }, // 43
    { name: 'cushion', image: '/scenes/golden-loft/cushion.webp', depth: 0.9, box: { x: 6.71, y: 74.89, width: 18.29, height: 7.33 }, item: 'cat' }, // 44
    { name: 'cat body', image: '/scenes/golden-loft/cat_body.webp', depth: 0.9, box: { x: 8.0, y: 66.44, width: 15.54, height: 12.74 }, item: 'cat' }, // 45
    { name: 'cat chest', image: '/scenes/golden-loft/cat_chest.webp', depth: 0.9, box: { x: 9.5, y: 66.44, width: 9.38, height: 9.78 }, anim: { name: 'breathe', pivot: { x: 50.0, y: 100.0 }, duration: 4.2 }, item: 'cat' }, // 46
    { name: 'cat tail', image: '/scenes/golden-loft/cat_tail.webp', depth: 0.9, box: { x: 8.71, y: 76.22, width: 8.83, height: 5.19 }, anim: { name: 'flick', amplitude: 5, pivot: { x: 7.55, y: 8.57 }, duration: 10 }, item: 'cat' }, // 47
    { name: 'cat night', image: '/scenes/golden-loft/cat_night.webp', depth: 0.9, box: { x: 6.38, y: 66.67, width: 18.88, height: 16.0 }, blend: 'multiply', night: true, item: 'cat' }, // 48
    { name: 'cat nlit', image: '/scenes/golden-loft/cat_nlit.webp', depth: 0.9, box: { x: 6.38, y: 66.67, width: 18.88, height: 16.0 }, night: true, item: 'cat' }, // 49
    { name: 'cdplayer shadow', image: '/scenes/golden-loft/cdplayer_shadow.webp', depth: 0.9, box: { x: 63.0, y: 81.33, width: 30.75, height: 8.74 }, item: 'cdplayer', mirror: false }, // 50
    { name: 'cdplayer reflection', image: '/scenes/golden-loft/cdplayer_reflection.webp', depth: 0.9, box: { x: 63.54, y: 83.11, width: 19.79, height: 4.15 }, item: 'cdplayer' }, // 51
    { name: 'cdplayer', image: '/scenes/golden-loft/cdplayer.webp', depth: 0.9, box: { x: 63.67, y: 64.52, width: 19.5, height: 19.04 }, item: 'cdplayer' }, // 52
    { name: 'cdplayer disc flat', image: '/scenes/golden-loft/cdplayer_disc_flat.webp', depth: 0.9, box: { x: 67.44, y: 60.08, width: 12.0, height: 21.33 }, anim: { name: 'spin', squash: 0.45, duration: 4 }, item: 'cdplayer' }, // 53
    { name: 'cdplayer sheen', image: '/scenes/golden-loft/cdplayer_sheen.webp', depth: 0.9, box: { x: 67.71, y: 66.37, width: 11.38, height: 8.74 }, item: 'cdplayer' }, // 54
    { name: 'cdplayer lid', image: '/scenes/golden-loft/cdplayer_lid.webp', depth: 0.9, box: { x: 66.21, y: 64.3, width: 14.46, height: 12.59 }, item: 'cdplayer' }, // 55
    { name: 'cdplayer glow', image: '/scenes/golden-loft/cdplayer_glow.webp', depth: 0.9, box: { x: 74.92, y: 74.67, width: 10.0, height: 10.3 }, anim: { name: 'pulse', duration: 3.4 }, item: 'cdplayer' }, // 56
    { name: 'cdplayer night', image: '/scenes/golden-loft/cdplayer_night.webp', depth: 0.9, box: { x: 63.38, y: 61.78, width: 20.13, height: 22.22 }, blend: 'multiply', night: true, item: 'cdplayer' }, // 57
    { name: 'cdplayer nlit', image: '/scenes/golden-loft/cdplayer_nlit.webp', depth: 0.9, box: { x: 63.38, y: 61.78, width: 20.13, height: 22.22 }, night: true, item: 'cdplayer' }, // 58
    { name: 'cd cases shadow', image: '/scenes/golden-loft/cd_cases_shadow.webp', depth: 0.9, box: { x: 81.94, y: 76.33, width: 18.06, height: 13.67 }, item: 'cd_cases', mirror: false }, // 59
    { name: 'cd cases', image: '/scenes/golden-loft/cd_cases.webp', depth: 0.9, box: { x: 82.81, y: 68.0, width: 12.63, height: 17.78 }, item: 'cd_cases' }, // 60
    { name: 'cd cases night', image: '/scenes/golden-loft/cd_cases_night.webp', depth: 0.9, box: { x: 82.5, y: 70.67, width: 12.13, height: 15.56 }, blend: 'multiply', night: true, item: 'cd_cases' }, // 61
    { name: 'cd cases nlit', image: '/scenes/golden-loft/cd_cases_nlit.webp', depth: 0.9, box: { x: 82.5, y: 70.67, width: 12.13, height: 15.56 }, night: true, item: 'cd_cases' }, // 62
    { name: 'mug shadow', image: '/scenes/golden-loft/mug_shadow.webp', depth: 0.9, box: { x: 43.25, y: 84.0, width: 14.19, height: 6.11 }, item: 'mug', mirror: false }, // 63
    { name: 'mug', image: '/scenes/golden-loft/mug.webp', depth: 0.9, box: { x: 44.0, y: 77.78, width: 9.25, height: 10.89 }, item: 'mug' }, // 64
    { name: 'steam', image: '/scenes/golden-loft/steam.webp', depth: 0.9, box: { x: 46.13, y: 65.0, width: 4.75, height: 13.78 }, anim: { name: 'steam', duration: 5 }, item: 'mug' }, // 65
    { name: 'mug night', image: '/scenes/golden-loft/mug_night.webp', depth: 0.9, box: { x: 44.0, y: 78.89, width: 9.0, height: 10.0 }, blend: 'multiply', night: true, item: 'mug' }, // 66
    { name: 'mug nlit', image: '/scenes/golden-loft/mug_nlit.webp', depth: 0.9, box: { x: 44.0, y: 78.89, width: 9.0, height: 10.0 }, night: true, item: 'mug' }, // 67
    { name: 'notebook shadow', image: '/scenes/golden-loft/notebook_shadow.webp', depth: 0.9, box: { x: 23.75, y: 72.89, width: 20.44, height: 13.78 }, item: 'notebook', mirror: false }, // 68
    { name: 'notebook', image: '/scenes/golden-loft/notebook.webp', depth: 0.9, box: { x: 24.13, y: 73.78, width: 18.19, height: 11.78 }, item: 'notebook' }, // 69
    { name: 'notebook night', image: '/scenes/golden-loft/notebook_night.webp', depth: 0.9, box: { x: 23.88, y: 74.67, width: 18.75, height: 11.33 }, blend: 'multiply', night: true, item: 'notebook' }, // 70
    { name: 'notebook nlit', image: '/scenes/golden-loft/notebook_nlit.webp', depth: 0.9, box: { x: 23.88, y: 74.67, width: 18.75, height: 11.33 }, night: true, item: 'notebook' }, // 71
    { name: 'candle shadow', image: '/scenes/golden-loft/candle_shadow.webp', depth: 0.9, box: { x: 49.25, y: 75.22, width: 10.81, height: 7.56 }, item: 'candle', mirror: false }, // 72
    { name: 'candle', image: '/scenes/golden-loft/candle.webp', depth: 0.9, box: { x: 50.38, y: 69.11, width: 3.63, height: 8.67 }, item: 'candle' }, // 73
    { name: 'candle flame', image: '/scenes/golden-loft/candle_flame.webp', depth: 0.9, box: { x: 47.38, y: 61.11, width: 10.5, height: 18.44 }, anim: { name: 'pulse', duration: 1.7 }, item: 'candle' }, // 74
    { name: 'photo shadow', image: '/scenes/golden-loft/photo_shadow.webp', depth: 0.9, box: { x: 44.31, y: 73.89, width: 14.13, height: 10.11 }, item: 'photo', mirror: false }, // 75
    { name: 'photo', image: '/scenes/golden-loft/photo.webp', depth: 0.9, box: { x: 44.63, y: 64.0, width: 5.13, height: 11.33 }, item: 'photo' }, // 76
    { name: 'cactus shadow', image: '/scenes/golden-loft/cactus_shadow.webp', depth: 0.9, box: { x: 34.94, y: 75.44, width: 10.19, height: 7.89 }, item: 'cactus', mirror: false }, // 77
    { name: 'cactus', image: '/scenes/golden-loft/cactus.webp', depth: 0.9, box: { x: 35.19, y: 67.22, width: 3.44, height: 9.56 }, item: 'cactus' }, // 78
    { name: 'books shadow', image: '/scenes/golden-loft/books_shadow.webp', depth: 0.9, box: { x: 53.56, y: 77.22, width: 16.5, height: 8.56 }, item: 'books', mirror: false }, // 79
    { name: 'books', image: '/scenes/golden-loft/books.webp', depth: 0.9, box: { x: 53.88, y: 68.44, width: 7.88, height: 10.22 }, item: 'books' }, // 80
    { name: 'bud vase shadow', image: '/scenes/golden-loft/bud_vase_shadow.webp', depth: 0.9, box: { x: 40.44, y: 74.78, width: 16.69, height: 13.44 }, item: 'bud_vase', mirror: false }, // 81
    { name: 'bud vase', image: '/scenes/golden-loft/bud_vase.webp', depth: 0.9, box: { x: 40.63, y: 68.67, width: 2.25, height: 7.56 }, item: 'bud_vase' }, // 82
    { name: 'bud vase flowers', image: '/scenes/golden-loft/bud_vase_flowers.webp', depth: 0.9, box: { x: 39.75, y: 56.44, width: 4.0, height: 12.89 }, anim: { name: 'sway', amplitude: 1.8, pivot: { x: 50.0, y: 98.28 }, duration: 5.5, delay: 0.0 }, item: 'bud_vase' }, // 83
    { name: 'candle light', image: '/scenes/golden-loft/candle_pool.webp', depth: 0.9, box: { x: 43.75, y: 66.67, width: 16.88, height: 23.89 }, night: true, anim: { name: 'pulse', duration: 3.1 }, item: 'candle' }, // 84
  ],
  objects: [
    { key: 'window', label: 'Window', layer: 6, x: 8.96, y: 5.81, width: 81.54, height: 91.47, action: { type: 'toggleEffect', effect: 'dust' } },
    { key: 'curtains', label: 'Curtains', layer: 15, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleCurtains' } },
    { key: 'curtains-left', label: 'Curtains', layer: 14, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleCurtains' } },
    { key: 'clock', label: 'Clock: day or night', layer: 35, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleLight' } },
    { key: 'cdplayer', label: 'CD player', layer: 52, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
  ],
  // What a visitor may put in the room. The pictures of an object are the layers with its key in `item`.
  // home: the bottom centre of the object where it stands in the picture. bounds: the area it covers there.
  catalog: [
    { key: 'plant', label: 'Rubber plant', surface: 'desk', home: { x: 59.69, y: 72.44 }, bounds: { x: 52.46, y: 30.59, width: 15.13, height: 42.59 }, thumb: '/scenes/golden-loft/plant_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 1.8 } },
    { key: 'clock', label: 'Clock', surface: 'desk', home: { x: 93.62, y: 74.44 }, bounds: { x: 91.13, y: 65.33, width: 4.94, height: 9.56 }, thumb: '/scenes/golden-loft/clock_thumb.webp', flippable: false, unique: false, inDefault: true, scale: { min: 0.6, max: 1.6 } },
    { key: 'mug', label: 'Tea cup', surface: 'desk', home: { x: 48.44, y: 86.22 }, bounds: { x: 44.0, y: 65.0, width: 9.25, height: 23.89 }, thumb: '/scenes/golden-loft/mug_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2.0 } },
    { key: 'cdplayer', label: 'CD player', surface: 'desk', home: { x: 73.44, y: 83.33 }, bounds: { x: 63.38, y: 60.08, width: 21.54, height: 24.88 }, thumb: '/scenes/golden-loft/cdplayer_thumb.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.7, max: 1.4 } },
    { key: 'notebook', label: 'Notebook', surface: 'desk', home: { x: 33.25, y: 85.73 }, bounds: { x: 23.88, y: 73.78, width: 18.75, height: 12.22 }, thumb: '/scenes/golden-loft/notebook_thumb.webp', flippable: false, unique: false, inDefault: true, scale: { min: 0.6, max: 2.0 } },
    { key: 'cd_cases', label: 'CD cases', surface: 'desk', home: { x: 89.5, y: 84.22 }, bounds: { x: 82.5, y: 68.0, width: 12.94, height: 18.22 }, thumb: '/scenes/golden-loft/cd_cases_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2.0 } },
    { key: 'cat', label: 'Sleeping cat', surface: 'desk', home: { x: 15.75, y: 82.0 }, bounds: { x: 6.38, y: 66.44, width: 18.88, height: 16.22 }, thumb: '/scenes/golden-loft/cat_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 1.6 } },
    { key: 'candle', label: 'Candle', surface: 'desk', home: { x: 52.19, y: 77.33 }, bounds: { x: 50.38, y: 69.11, width: 3.63, height: 8.67 }, thumb: '/scenes/golden-loft/candle_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.0 } },
    { key: 'photo', label: 'Framed photo', surface: 'desk', home: { x: 47.19, y: 75.33 }, bounds: { x: 44.63, y: 64.0, width: 5.13, height: 11.33 }, thumb: '/scenes/golden-loft/photo_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 2.0 } },
    { key: 'cactus', label: 'Cactus', surface: 'desk', home: { x: 36.88, y: 76.89 }, bounds: { x: 35.19, y: 67.22, width: 3.44, height: 9.56 }, thumb: '/scenes/golden-loft/cactus_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.0 } },
    { key: 'books', label: 'Books', surface: 'desk', home: { x: 57.81, y: 78.67 }, bounds: { x: 53.88, y: 68.44, width: 7.88, height: 10.22 }, thumb: '/scenes/golden-loft/books_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.0 } },
    { key: 'bud_vase', label: 'Bud vase', surface: 'desk', home: { x: 41.75, y: 76.22 }, bounds: { x: 39.75, y: 56.44, width: 4.0, height: 19.78 }, thumb: '/scenes/golden-loft/bud_vase_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.0 } },
  ],
  // desk: things further down look closer (bigger, in front). drawAt: the layer its objects are drawn in front of (the light beams).
  surfaces: [
    { key: 'desk', area: { x: 2, y: 64, width: 96, height: 27 }, drawAt: 26, perspective: { farY: 64, nearY: 90, farScale: 0.65, nearScale: 1.2 } },
  ],
  nightDim: 0, // the night is painted in its own layers (night sky, cool shade, moonlight, warm lamp and candle pools), so no extra darkening
  effects: ['dust'],
  defaultEffect: 'dust', // dust floats in the sunbeams from the start; clicking the window switches it off
  effectLayer: 26, // the light beams, so the dust drifts in front of the objects and inside the beams
};
