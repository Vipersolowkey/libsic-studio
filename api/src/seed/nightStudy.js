// Scene: Rainy Night Study. A desk beside a big window, drawn as many small layers so that
// the record can spin, the leaves can sway and the lamp can be switched off on its own.
// Look: a real 3D room rendered in Blender/Cycles (true bokeh city, glossy desk, warm lamp key light, cool ambient), graded in a lo-fi anime way. See scratchpad b1_3d.
// Pictures: client/public/scenes/night-study/. Positions of layers and objects are percentages
// of the scene. Layers are listed from back to front.
module.exports = {
  slug: 'night-study',
  name: 'Rainy Night Study',
  description: 'A quiet desk above the city at night: a turntable, a warm lamp and a clock, with the rain ready to switch on.',
  layers: [
    { name: 'sky', image: '/scenes/night-study/l1_sky.webp', depth: 0.05 }, // 0
    { name: 'city', image: '/scenes/night-study/l2_city.webp', depth: 0.2, box: { x: 6.25, y: 3.67, width: 87.5, height: 65.22 } }, // 1
    { name: 'window glass', image: '/scenes/night-study/l3_glass.webp', depth: 0.5, box: { x: 6.81, y: 30.67, width: 80.25, height: 24.22 } }, // 2
    { name: 'water trickle 1', image: '/scenes/night-study/c_drop_1.webp', depth: 0.5, box: { x: 26.88, y: 14.44, width: 0.75, height: 7.33 }, glide: { to: { x: 0.8, y: 409.1 }, duration: 38, delay: -6, from: { x: 0, y: 0 } } }, // 3
    { name: 'water trickle 2', image: '/scenes/night-study/c_drop_2.webp', depth: 0.5, box: { x: 68.12, y: 11.11, width: 0.75, height: 7.33 }, glide: { to: { x: 0.1, y: 454.5 }, duration: 46, delay: -21, from: { x: 0, y: 0 } } }, // 4
    { name: 'water trickle 3', image: '/scenes/night-study/c_drop_3.webp', depth: 0.5, box: { x: 83.12, y: 18.89, width: 0.75, height: 7.33 }, glide: { to: { x: -1.4, y: 348.5 }, duration: 34, delay: -15, from: { x: 0, y: 0 } } }, // 5
    { name: 'lamp reflection in the glass', image: '/scenes/night-study/c_glass_lamp_ghost.webp', depth: 0.5, box: { x: 64.5, y: 28.67, width: 16.12, height: 23.44 }, light: true }, // 6
    { name: 'room reflection in the glass', image: '/scenes/night-study/c_glass_room_ghost.webp', depth: 0.5, box: { x: 8.81, y: 14.44, width: 77.0, height: 9.0 } }, // 7
    { name: 'window frame', image: '/scenes/night-study/l4_frame.webp', depth: 0.5, box: { x: 0.0, y: 0.0, width: 100.0, height: 75.0 } }, // 8
    { name: 'lamp light on the wall', image: '/scenes/night-study/c_wall_lamp.webp', depth: 0.5, box: { x: 0.0, y: 0.0, width: 100.0, height: 75.0 }, light: true }, // 9
    { name: 'night light on the frame', image: '/scenes/night-study/c_night_frame.webp', depth: 0.5, box: { x: 0.0, y: 0.0, width: 100.0, height: 75.0 }, night: true }, // 10
    { name: 'string light spill on the sill', image: '/scenes/night-study/c_glow_sill.webp', depth: 0.8, box: { x: 3.75, y: 51.89, width: 93.75, height: 11.0 } }, // 11
    { name: 'curtain', image: '/scenes/night-study/c_curtain.webp', depth: 0.7, box: { x: 0.0, y: 0.0, width: 10.62, height: 81.22 }, anim: { name: 'billow', pivot: { x: 58.82, y: 0.0 }, duration: 9.0, amplitude: 0.9 } }, // 12
    { name: 'night light on the curtain', image: '/scenes/night-study/c_night_curtain.webp', depth: 0.7, box: { x: 0.0, y: 0.0, width: 10.62, height: 81.22 }, night: true }, // 13
    { name: 'fairy lights', image: '/scenes/night-study/c_fairy_lights.webp', depth: 0.5, box: { x: 5.44, y: 1.78, width: 83.06, height: 10.56 } }, // 14
    { name: 'desk', image: '/scenes/night-study/c_desk.webp', depth: 0.9, box: { x: 0.0, y: 66.44, width: 100.0, height: 33.56 } }, // 15
    { name: 'lamp light on the desk', image: '/scenes/night-study/c_pool_lamp.webp', depth: 0.9, blend: 'screen', box: { x: 0.0, y: 66.44, width: 100.0, height: 33.56 }, light: true }, // 16
    { name: 'night light on the desk', image: '/scenes/night-study/c_night_desk.webp', depth: 0.9, box: { x: 0.0, y: 66.44, width: 100.0, height: 33.56 }, night: true }, // 17
    { name: 'plant reflection', image: '/scenes/night-study/c_plant_reflection.webp', depth: 0.9, box: { x: 9.25, y: 76.11, width: 7.88, height: 4.56 }, item: 'plant' }, // 18
    { name: 'plant shadow', image: '/scenes/night-study/c_plant_shadow.webp', depth: 0.9, box: { x: 0.0, y: 67.78, width: 37.69, height: 17.56 }, item: 'plant', mirror: false }, // 19
    { name: 'plant pot', image: '/scenes/night-study/c_plant_pot.webp', depth: 0.9, box: { x: 8.88, y: 62.33, width: 8.25, height: 13.67 }, item: 'plant' }, // 20
    { name: 'plant pot light', image: '/scenes/night-study/c_plant_pot_lit.webp', depth: 0.9, box: { x: 8.88, y: 62.33, width: 8.25, height: 13.67 }, light: true, item: 'plant' }, // 21
    { name: 'night plant pot', image: '/scenes/night-study/c_plant_pot_night.webp', depth: 0.9, box: { x: 8.88, y: 62.33, width: 8.25, height: 13.67 }, night: true, item: 'plant' }, // 22
    { name: 'c_plant_leaf_1', image: '/scenes/night-study/c_plant_leaf_1.webp', depth: 0.9, box: { x: 3.25, y: 49.33, width: 20.44, height: 16.22 }, anim: { name: 'sway', pivot: { x: 41.41, y: 93.29 }, duration: 4.7, delay: -0.6 }, item: 'plant' }, // 23
    { name: 'c_plant_leaf_2', image: '/scenes/night-study/c_plant_leaf_2.webp', depth: 0.9, box: { x: 5.69, y: 43.44, width: 18.31, height: 22.0 }, anim: { name: 'sway', pivot: { x: 35.63, y: 95.56 }, duration: 5.4, delay: -1.2 }, item: 'plant' }, // 24
    { name: 'c_plant_leaf_3', image: '/scenes/night-study/c_plant_leaf_3.webp', depth: 0.9, box: { x: 3.5, y: 44.67, width: 15.44, height: 21.11 }, anim: { name: 'sway', pivot: { x: 59.68, y: 93.79 }, duration: 6.1, delay: -1.7999999999999998 }, item: 'plant' }, // 25
    { name: 'c_plant_leaf_4', image: '/scenes/night-study/c_plant_leaf_4.webp', depth: 0.9, box: { x: 1.56, y: 46.44, width: 21.31, height: 18.78 }, anim: { name: 'sway', pivot: { x: 54.66, y: 95.98 }, duration: 6.8, delay: -2.4 }, item: 'plant' }, // 26
    { name: 'c_plant_leaf_5', image: '/scenes/night-study/c_plant_leaf_5.webp', depth: 0.9, box: { x: 0.94, y: 46.11, width: 20.62, height: 19.11 }, anim: { name: 'sway', pivot: { x: 61.94, y: 96.05 }, duration: 7.5, delay: -3.0 }, item: 'plant' }, // 27
    { name: 'plant light', image: '/scenes/night-study/c_plant_lit.webp', depth: 0.9, box: { x: 0.94, y: 43.44, width: 23.06, height: 22.33 }, light: true, item: 'plant' }, // 28
    { name: 'night plant', image: '/scenes/night-study/c_plant_night.webp', depth: 0.9, box: { x: 0.94, y: 43.44, width: 23.06, height: 22.33 }, night: true, item: 'plant' }, // 29
    { name: 'mug reflection', image: '/scenes/night-study/c_mug_reflection.webp', depth: 0.9, box: { x: 29.88, y: 84.78, width: 6.12, height: 3.78 }, item: 'mug' }, // 30
    { name: 'mug shadow', image: '/scenes/night-study/c_mug_shadow.webp', depth: 0.9, box: { x: 12.19, y: 71.56, width: 28.62, height: 21.78 }, item: 'mug', mirror: false }, // 31
    { name: 'mug', image: '/scenes/night-study/c_mug.webp', depth: 0.9, box: { x: 29.5, y: 73.89, width: 6.88, height: 9.89 }, item: 'mug' }, // 32
    { name: 'mug light', image: '/scenes/night-study/c_mug_lit.webp', depth: 0.9, box: { x: 29.5, y: 73.89, width: 6.88, height: 9.89 }, light: true, item: 'mug' }, // 33
    { name: 'night mug', image: '/scenes/night-study/c_mug_night.webp', depth: 0.9, box: { x: 29.5, y: 73.89, width: 6.88, height: 9.89 }, night: true, item: 'mug' }, // 34
    { name: 'steam', image: '/scenes/night-study/c_steam.webp', depth: 0.9, box: { x: 27.69, y: 54.89, width: 7.56, height: 23.33 }, anim: { name: 'steam', duration: 5 }, item: 'mug' }, // 35
    { name: 'succulent reflection', image: '/scenes/night-study/c_succ_reflection.webp', depth: 0.9, box: { x: 16.44, y: 78.11, width: 3.06, height: 3.67 }, item: 'succulent' }, // 36
    { name: 'succulent shadow', image: '/scenes/night-study/c_succ_shadow.webp', depth: 0.9, box: { x: 5.44, y: 68.56, width: 22.44, height: 17.0 }, item: 'succulent', mirror: false }, // 37
    { name: 'succulent', image: '/scenes/night-study/c_succ.webp', depth: 0.9, box: { x: 16.38, y: 70.89, width: 3.12, height: 7.0 }, item: 'succulent' }, // 38
    { name: 'succulent light', image: '/scenes/night-study/c_succ_lit.webp', depth: 0.9, box: { x: 16.38, y: 70.89, width: 3.12, height: 7.0 }, light: true, item: 'succulent' }, // 39
    { name: 'night succulent', image: '/scenes/night-study/c_succ_night.webp', depth: 0.9, box: { x: 16.38, y: 70.89, width: 3.12, height: 7.0 }, night: true, item: 'succulent' }, // 40
    { name: 'clock reflection', image: '/scenes/night-study/c_clock_reflection.webp', depth: 0.9, box: { x: 20.81, y: 74.11, width: 9.25, height: 4.33 }, item: 'clock' }, // 41
    { name: 'clock shadow', image: '/scenes/night-study/c_clock_shadow.webp', depth: 0.9, box: { x: 3.44, y: 67.89, width: 31.25, height: 15.44 }, item: 'clock', mirror: false }, // 42
    { name: 'clock', image: '/scenes/night-study/c_clock_blank.webp', depth: 0.9, box: { x: 20.69, y: 65.89, width: 9.38, height: 8.44 }, item: 'clock' }, // 43
    { name: 'clock light', image: '/scenes/night-study/c_clock_lit.webp', depth: 0.9, box: { x: 20.69, y: 65.78, width: 9.44, height: 8.56 }, light: true, item: 'clock' }, // 44
    { name: 'clock digits', kind: 'clock', depth: 0.9, box: { x: 22.41, y: 70.07, width: 3.93, height: 2.37 }, anim: { name: 'pulse', duration: 6, skew: 3.0 }, item: 'clock' }, // 45
    { name: 'night clock', image: '/scenes/night-study/c_clock_blank_night.webp', depth: 0.9, box: { x: 20.69, y: 65.89, width: 9.38, height: 8.44 }, night: true, item: 'clock' }, // 46
    { name: 'player shadow', image: '/scenes/night-study/c_player_shadow.webp', depth: 0.9, box: { x: 30.06, y: 67.0, width: 48.69, height: 26.33 }, item: 'player', mirror: false }, // 47
    { name: 'player reflection', image: '/scenes/night-study/c_player_reflection.webp', depth: 0.9, box: { x: 52.06, y: 82.78, width: 22.19, height: 4.56 }, item: 'player' }, // 48
    { name: 'music player', image: '/scenes/night-study/c_player.webp', depth: 0.9, box: { x: 51.5, y: 64.22, width: 22.75, height: 18.89 }, item: 'player' }, // 49
    { name: 'player light', image: '/scenes/night-study/c_player_lit.webp', depth: 0.9, box: { x: 51.5, y: 64.22, width: 22.75, height: 18.89 }, light: true, item: 'player' }, // 50
    { name: 'night player', image: '/scenes/night-study/c_player_night.webp', depth: 0.9, box: { x: 51.5, y: 64.22, width: 22.75, height: 18.89 }, night: true, item: 'player' }, // 51
    { name: 'sleeve shadow', image: '/scenes/night-study/c_sleeve_shadow.webp', depth: 0.9, box: { x: 29.94, y: 73.67, width: 25.12, height: 21.56 }, item: 'sleeve', mirror: false }, // 52
    { name: 'sleeve reflection', image: '/scenes/night-study/c_sleeve_reflection.webp', depth: 0.9, box: { x: 38.19, y: 87.67, width: 11.19, height: 4.56 }, item: 'sleeve' }, // 53
    { name: 'record sleeve', image: '/scenes/night-study/c_sleeve.webp', depth: 0.9, box: { x: 38.19, y: 77.11, width: 12.31, height: 10.44 }, item: 'sleeve' }, // 54
    { name: 'sleeve light', image: '/scenes/night-study/c_sleeve_lit.webp', depth: 0.9, box: { x: 38.19, y: 77.11, width: 12.31, height: 10.44 }, light: true, item: 'sleeve' }, // 55
    { name: 'night sleeve', image: '/scenes/night-study/c_sleeve_night.webp', depth: 0.9, box: { x: 38.19, y: 77.11, width: 12.31, height: 10.44 }, night: true, item: 'sleeve' }, // 56
    { name: 'record', image: '/scenes/night-study/c_vinyl_flat.webp', depth: 0.9, box: { x: 52.78, y: 55.7, width: 14.72, height: 26.17 }, anim: { name: 'spin', squash: 0.3777, duration: 5 }, item: 'player' }, // 57
    { name: 'record shine', image: '/scenes/night-study/c_vinyl_sheen.webp', depth: 0.9, box: { x: 53.5, y: 64.11, width: 13.25, height: 9.44 }, item: 'player' }, // 58
    { name: 'record warm shine', image: '/scenes/night-study/c_vinyl_sheen_warm.webp', depth: 0.9, box: { x: 53.5, y: 64.11, width: 13.25, height: 9.44 }, light: true, item: 'player' }, // 59
    { name: 'record light', image: '/scenes/night-study/c_vinyl_warm.webp', depth: 0.9, box: { x: 52.78, y: 63.84, width: 14.72, height: 9.88 }, light: true, item: 'player' }, // 60
    { name: 'tonearm', image: '/scenes/night-study/c_tonearm.webp', depth: 0.9, box: { x: 62.88, y: 62.11, width: 7.75, height: 6.56 }, anim: { name: 'tonearm', pivot: { x: 73.63, y: 41.69 }, rest: 27 }, item: 'player' }, // 61
    { name: 'tonearm light', image: '/scenes/night-study/c_tonearm_lit.webp', depth: 0.9, box: { x: 62.88, y: 62.11, width: 7.75, height: 6.56 }, light: true, anim: { name: 'tonearm', pivot: { x: 73.63, y: 41.69 }, rest: 27 }, item: 'player' }, // 62
    { name: 'night tonearm', image: '/scenes/night-study/c_tonearm_night.webp', depth: 0.9, box: { x: 62.88, y: 62.11, width: 7.75, height: 6.56 }, night: true, anim: { name: 'tonearm', pivot: { x: 73.63, y: 41.69 }, rest: 27 }, item: 'player' }, // 63
    { name: 'c_lamp_reflection', image: '/scenes/night-study/c_lamp_reflection.webp', depth: 0.9, box: { x: 82.5, y: 74.89, width: 9.19, height: 4.67 } }, // 64
    { name: 'c_lamp_shadow', image: '/scenes/night-study/c_lamp_shadow.webp', depth: 0.9, box: { x: 71.56, y: 76.67, width: 28.44, height: 17.78 } }, // 65
    { name: 'lamp', image: '/scenes/night-study/c_lamp.webp', depth: 0.9, box: { x: 76.38, y: 27.56, width: 16.12, height: 50.33 } }, // 66
    { name: 'c_lamp_lit', image: '/scenes/night-study/c_lamp_lit.webp', depth: 0.9, box: { x: 76.38, y: 27.56, width: 16.12, height: 50.33 }, light: true }, // 67
    { name: 'night lamp', image: '/scenes/night-study/c_lamp_night.webp', depth: 0.9, box: { x: 76.38, y: 27.56, width: 16.12, height: 50.33 }, night: true }, // 68
    { name: 'foreground leaves', image: '/scenes/night-study/c_fg_leaves.webp', depth: 1.0, box: { x: 0.0, y: 62.22, width: 0.12, height: 0.22 } }, // 69
    { name: 'foreground books', image: '/scenes/night-study/c_fg_books.webp', depth: 0.9, box: { x: 86.56, y: 84.89, width: 13.44, height: 15.11 }, item: 'bookstack' }, // 70
    { name: 'foreground books light', image: '/scenes/night-study/c_fg_books_lit.webp', depth: 0.9, box: { x: 86.56, y: 84.89, width: 13.44, height: 15.11 }, light: true, item: 'bookstack' }, // 71
    { name: 'night books', image: '/scenes/night-study/c_fg_books_night.webp', depth: 0.9, box: { x: 86.56, y: 84.89, width: 13.44, height: 15.11 }, night: true, item: 'bookstack' }, // 72
    { name: 'city glow', image: '/scenes/night-study/l6_bloom.webp', depth: 0.5, box: { x: 5.37, y: 14.44, width: 84.63, height: 39.33 } }, // 73
    { name: 'lamp glow', image: '/scenes/night-study/c_glow_lamp.webp', depth: 0.9, box: { x: 54.94, y: 22.22, width: 42.19, height: 60.11 }, light: true }, // 74
    { name: 'dust motes in the lamp beam', image: '/scenes/night-study/c_dust.webp', depth: 0.95, box: { x: 64.25, y: 41.67, width: 14.69, height: 31.33 }, light: true, glide: { to: { x: 1.0, y: -1.8 }, duration: 64, delay: 0, pingpong: true, from: { x: 0, y: 0 } } }, // 75
    { name: 'display glow', image: '/scenes/night-study/c_glow_oled.webp', depth: 0.9, box: { x: 53.62, y: 74.67, width: 19.56, height: 11.22 }, anim: { name: 'pulse', duration: 3.2 }, item: 'player' }, // 76
    { name: 'clock glow', image: '/scenes/night-study/c_glow_clock.webp', depth: 0.9, box: { x: 16.19, y: 62.33, width: 16.25, height: 18.44 }, anim: { name: 'pulse', duration: 6.0 }, item: 'clock' }, // 77
    { name: 'fairy light glow', image: '/scenes/night-study/c_glow_fairy.webp', depth: 0.5, box: { x: 6.31, y: 2.22, width: 81.44, height: 11.89 }, anim: { name: 'pulse', duration: 2.6 } }, // 78
    { name: 'night city glow', image: '/scenes/night-study/c_night_glow.webp', depth: 0.5, box: { x: 6.25, y: 15.77, width: 82.62, height: 36.45 }, night: true }, // 79
    { name: 'vignette', image: '/scenes/night-study/l7_grade.webp', depth: 0 }, // 80
    { name: 'film grain', image: '/scenes/night-study/l7_grain.webp', depth: 0, tile: 21.33 }, // 81
    { name: 'cactus shadow', image: '/scenes/night-study/d_cactus_shadow.webp', depth: 0.9, box: { x: 3.12, y: 75.22, width: 21.94, height: 20.33 }, item: 'cactus', mirror: false }, // 82
    { name: 'cactus reflection', image: '/scenes/night-study/d_cactus_reflection.webp', depth: 0.9, box: { x: 17.44, y: 88.78, width: 3.38, height: 4.56 }, item: 'cactus' }, // 83
    { name: 'cactus', image: '/scenes/night-study/d_cactus.webp', depth: 0.9, box: { x: 16.94, y: 78.11, width: 3.88, height: 10.78 }, item: 'cactus' }, // 84
    { name: 'cactus light', image: '/scenes/night-study/d_cactus_lit.webp', depth: 0.9, box: { x: 16.88, y: 78.11, width: 3.94, height: 10.78 }, light: true, item: 'cactus' }, // 85
    { name: 'candle shadow', image: '/scenes/night-study/d_candle_shadow.webp', depth: 0.9, box: { x: 30.25, y: 78.22, width: 20.75, height: 18.11 }, item: 'candle', mirror: false }, // 86
    { name: 'candle reflection', image: '/scenes/night-study/d_candle_reflection.webp', depth: 0.9, box: { x: 43.44, y: 89.56, width: 3.81, height: 4.56 }, item: 'candle' }, // 87
    { name: 'candle', image: '/scenes/night-study/d_candle.webp', depth: 0.9, box: { x: 43.38, y: 80.56, width: 3.88, height: 9.11 }, item: 'candle' }, // 88
    { name: 'candle light', image: '/scenes/night-study/d_candle_lit.webp', depth: 0.9, box: { x: 43.38, y: 80.56, width: 3.94, height: 9.11 }, light: true, item: 'candle' }, // 89
    { name: 'candle flame', image: '/scenes/night-study/d_candle_flame.webp', depth: 0.9, box: { x: 39.69, y: 74.0, width: 11.25, height: 20.0 }, anim: { name: 'pulse', duration: 2.6 }, item: 'candle' }, // 90
    { name: 'photo shadow', image: '/scenes/night-study/d_photo_shadow.webp', depth: 0.9, box: { x: 40.06, y: 75.89, width: 25.12, height: 20.11 }, item: 'photo', mirror: false }, // 91
    { name: 'photo reflection', image: '/scenes/night-study/d_photo_reflection.webp', depth: 0.9, box: { x: 53.25, y: 89.22, width: 8.06, height: 4.56 }, item: 'photo' }, // 92
    { name: 'photo', image: '/scenes/night-study/d_photo.webp', depth: 0.9, box: { x: 53.25, y: 78.33, width: 8.06, height: 10.78 }, item: 'photo' }, // 93
    { name: 'photo light', image: '/scenes/night-study/d_photo_lit.webp', depth: 0.9, box: { x: 53.25, y: 78.33, width: 8.06, height: 10.89 }, light: true, item: 'photo' }, // 94
    { name: 'books shadow', image: '/scenes/night-study/d_books_shadow.webp', depth: 0.9, box: { x: 9.5, y: 75.0, width: 29.81, height: 23.78 }, item: 'books', mirror: false }, // 95
    { name: 'books reflection', image: '/scenes/night-study/d_books_reflection.webp', depth: 0.9, box: { x: 23.25, y: 92.0, width: 11.38, height: 4.56 }, item: 'books' }, // 96
    { name: 'books', image: '/scenes/night-study/d_books.webp', depth: 0.9, box: { x: 23.25, y: 77.33, width: 11.88, height: 14.78 }, item: 'books' }, // 97
    { name: 'books light', image: '/scenes/night-study/d_books_lit.webp', depth: 0.9, box: { x: 23.25, y: 77.33, width: 11.88, height: 14.78 }, light: true, item: 'books' }, // 98
    { name: 'Paper star', image: '/scenes/night-study/d_stars.webp', depth: 0.5, box: { x: 18.25, y: 5.56, width: 7.62, height: 29.89 }, item: 'stars' }, // 99
    { name: 'Polaroid string', image: '/scenes/night-study/d_polaroids.webp', depth: 0.5, box: { x: 37.25, y: 21.56, width: 19.88, height: 10.0 }, item: 'polaroids' }, // 100
    // The notepad and pencil were once painted into the desk; docs/art-tools/make_notepad_item.py cut them out so they can be moved.
    { name: 'notepad shadow', image: '/scenes/night-study/c_notepad_shadow.webp', depth: 0.9, box: { x: 27.81, y: 75.55, width: 15.19, height: 13.22 }, item: 'notepad', mirror: false },
    { name: 'notepad', image: '/scenes/night-study/c_notepad.webp', depth: 0.9, box: { x: 28.56, y: 76.89, width: 13.69, height: 10.56 }, item: 'notepad' },
    { name: 'notepad light', image: '/scenes/night-study/c_notepad_lit.webp', depth: 0.9, blend: 'screen', box: { x: 28.56, y: 76.89, width: 13.69, height: 10.56 }, light: true, item: 'notepad' },
    { name: 'night notepad', image: '/scenes/night-study/c_notepad_night.webp', depth: 0.9, box: { x: 28.56, y: 76.89, width: 13.69, height: 10.56 }, night: true, item: 'notepad' },
  ],
  objects: [
    { key: 'window', label: 'Window', layer: 8, x: 7, y: 4, width: 86, height: 62, action: { type: 'toggleEffect', effect: 'rain' } },
    { key: 'lamp', label: 'Desk lamp', layer: 66, x: 0.0, y: 0.0, width: 80.31, height: 45.14, action: { type: 'toggleLight' } },
    { key: 'lamp-base', label: 'Desk lamp base', layer: 66, x: 35.62, y: 64.99, width: 61.98, height: 35.01, action: { type: 'toggleLight' } },
    { key: 'player', label: 'Music player', layer: 49, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
  ],
  // What a visitor may put in the room. The pictures of an object are the layers with its key in `item`.
  // home: the bottom centre of the object where it stands in the picture (the point that sticks to the surface).
  // bounds: the area it covers there, which is what a visitor grabs.
  catalog: [
    { key: 'plant', label: 'Plant', surface: 'desk', home: { x: 12.47, y: 75.33 }, bounds: { x: 0.94, y: 43.44, width: 23.06, height: 32.56 }, thumb: '/scenes/night-study/c_plant_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 1.8 } },
    { key: 'succulent', label: 'Succulent', surface: 'desk', home: { x: 17.94, y: 77.22 }, bounds: { x: 16.38, y: 70.89, width: 3.12, height: 7.0 }, thumb: '/scenes/night-study/c_succ_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2.5 } },
    { key: 'mug', label: 'Mug', surface: 'desk', home: { x: 32.94, y: 83.11 }, bounds: { x: 29.5, y: 73.89, width: 6.88, height: 9.89 }, thumb: '/scenes/night-study/c_mug_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.5, max: 2.5 } },
    { key: 'clock', label: 'Clock', surface: 'desk', home: { x: 25.37, y: 73.67 }, bounds: { x: 20.69, y: 65.89, width: 9.38, height: 8.44 }, thumb: '/scenes/night-study/c_clock_thumb.webp', flippable: false, unique: false, inDefault: true, scale: { min: 0.6, max: 1.6 } },
    { key: 'sleeve', label: 'Record sleeve', surface: 'desk', home: { x: 44.34, y: 86.89 }, bounds: { x: 38.19, y: 77.11, width: 12.31, height: 10.44 }, thumb: '/scenes/night-study/c_sleeve_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2 } },
    { key: 'player', label: 'Music player', surface: 'desk', home: { x: 62.88, y: 82.44 }, bounds: { x: 51.5, y: 64.22, width: 22.75, height: 18.89 }, thumb: '/scenes/night-study/c_player_thumb.webp', flippable: false, unique: true, inDefault: true, scale: { min: 0.7, max: 1.4 } },
    { key: 'notepad', label: 'Notepad', surface: 'desk', home: { x: 35.4, y: 82.5 }, bounds: { x: 28.56, y: 76.89, width: 13.69, height: 10.56 }, thumb: '/scenes/night-study/c_notepad_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.6, max: 2 } },
    { key: 'bookstack', label: 'Book stack', surface: 'desk', home: { x: 93.28, y: 98.0 }, bounds: { x: 86.56, y: 84.89, width: 13.44, height: 15.11 }, thumb: '/scenes/night-study/c_fg_books_thumb.webp', flippable: true, unique: false, inDefault: true, scale: { min: 0.5, max: 1.6 } },
    { key: 'books', label: 'Books', surface: 'desk', home: { x: 29.5, y: 87.78 }, bounds: { x: 23.25, y: 77.33, width: 11.88, height: 14.78 }, thumb: '/scenes/night-study/d_books_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2 } },
    { key: 'candle', label: 'Candle', surface: 'desk', home: { x: 45.38, y: 87.78 }, bounds: { x: 43.38, y: 80.56, width: 3.88, height: 9.11 }, thumb: '/scenes/night-study/d_candle_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.5 } },
    { key: 'photo', label: 'Framed photo', surface: 'desk', home: { x: 57.19, y: 88.44 }, bounds: { x: 53.25, y: 78.33, width: 8.06, height: 10.78 }, thumb: '/scenes/night-study/d_photo_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2 } },
    { key: 'cactus', label: 'Cactus', surface: 'desk', home: { x: 19.19, y: 87.33 }, bounds: { x: 16.94, y: 78.11, width: 3.88, height: 10.78 }, thumb: '/scenes/night-study/d_cactus_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 2.5 } },
    { key: 'stars', label: 'Paper star', surface: 'window', home: { x: 22.0, y: 33.33 }, bounds: { x: 18.25, y: 5.56, width: 7.62, height: 29.89 }, thumb: '/scenes/night-study/d_stars_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.5, max: 2.5 } },
    { key: 'polaroids', label: 'Polaroids', surface: 'window', home: { x: 47.0, y: 31.33 }, bounds: { x: 37.25, y: 21.56, width: 19.88, height: 10.0 }, thumb: '/scenes/night-study/d_polaroids_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.5, max: 2 } },
  ],
  // desk: things further down look closer (bigger, in front). window: objects hung on the glass, drawn behind the frame.
  // drawAt: index of the layer the objects of the surface are drawn in front of.
  surfaces: [
    { key: 'desk', area: { x: 2, y: 72, width: 96, height: 26 }, drawAt: 64, perspective: { farY: 72, nearY: 98, farScale: 0.7, nearScale: 1.2 } },
    { key: 'window', area: { x: 3, y: 8, width: 94, height: 60 }, drawAt: 8, perspective: { farY: 8, nearY: 68, farScale: 1, nearScale: 1 } },
  ],
  effects: ['rain'],
  // No default effect: the glass is clear until the visitor clicks the window.
  effectLayer: 1, // the city, so the rain falls in front of it and behind the glass
  nightDim: 0.12, // the night is painted in its own layers (light layers go off, night layers come in), so the extra dimming is small
};
