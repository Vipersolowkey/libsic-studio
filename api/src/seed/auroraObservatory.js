// Scene: Aurora Observatory. A cosy alpine cabin rendered in 3D: a wood stove, velvet curtains, a wide window onto snowy peaks,
// and a walnut desk with a sleeping arctic fox, a retro CD player, a telescope and cocoa. Clicking the sconce switches between
// warm alpenglow and the northern lights; clicking the window brings snowfall outside the glass. Day and night are two lightings of the same 3D room.
// The room is built and rendered by docs/art-tools/aurora_observatory_blender.py and cut into layers by make_aurora_observatory.py.
module.exports = {
  slug: 'aurora-observatory',
  name: 'Aurora Observatory',
  description: 'A cosy alpine cabin above snowy peaks: a sleeping arctic fox, a retro CD player, a telescope and cocoa. Click the sconce for the northern lights, or the window for snow.',
  layers: [
    { name: 'alpenglow peaks', image: '/scenes/aurora-observatory/l1_peaks_day.webp', depth: 0.04 }, // 0
    { name: 'moonlit peaks', image: '/scenes/aurora-observatory/l1b_peaks_night.webp', depth: 0.05, box: { x: 10.94, y: 1.48, width: 74.48, height: 67.22 }, night: true }, // 1
    { name: 'aurora shimmer', image: '/scenes/aurora-observatory/shimmer_sky.webp', depth: 0.08, box: { x: 16.82, y: 2.78, width: 66.15, height: 31.85 }, night: true, anim: { name: 'drift', distance: 5, duration: 48 } }, // 2
    { name: 'twinkling stars', image: '/scenes/aurora-observatory/stars_a.webp', depth: 0.06, box: { x: 10.94, y: 1.48, width: 74.48, height: 67.22 }, night: true, anim: { name: 'pulse', duration: 3.6 } }, // 3
    { name: 'twinkling stars 2', image: '/scenes/aurora-observatory/stars_b.webp', depth: 0.06, box: { x: 10.94, y: 1.48, width: 74.48, height: 67.22 }, night: true, anim: { name: 'pulse', duration: 5.4, delay: -2 } }, // 4
    { name: 'alpine mist', image: '/scenes/aurora-observatory/l2b_mist.webp', depth: 0.14, box: { x: 13.02, y: 2.96, width: 71.98, height: 62.59 }, anim: { name: 'drift', distance: 6, duration: 95 } }, // 5
    { name: 'window glass sheen', image: '/scenes/aurora-observatory/l3_glass_sheen.webp', depth: 0.46, box: { x: 18.49, y: 5.28, width: 60.62, height: 58.7 }, light: true }, // 6
    { name: 'cabin wall', image: '/scenes/aurora-observatory/wall.webp', depth: 0.5, box: { x: 0.0, y: 0.0, width: 100.0, height: 94.54 }, light: true }, // 7
    { name: 'cabin wall at night', image: '/scenes/aurora-observatory/wall_night.webp', depth: 0.5, box: { x: 0.0, y: 0.0, width: 100.0, height: 94.54 }, night: true }, // 8
    { name: 'brass sconce', image: '/scenes/aurora-observatory/sconce.webp', depth: 0.52, box: { x: 82.6, y: 17.04, width: 5.36, height: 15.28 }, light: true }, // 9
    { name: 'brass sconce at night', image: '/scenes/aurora-observatory/sconce_night.webp', depth: 0.52, box: { x: 82.6, y: 17.04, width: 5.36, height: 15.28 }, night: true }, // 10
    { name: 'left velvet curtain', image: '/scenes/aurora-observatory/curtainL.webp', depth: 0.56, box: { x: 11.35, y: 0.0, width: 18.28, height: 63.52 }, curtain: { scale: 2.6, origin: 0 }, anim: { name: 'billow', amplitude: 0.5, duration: 7.2, delay: 0.0, pivot: { x: 48, y: 1 } }, light: true }, // 11
    { name: 'left velvet curtain at night', image: '/scenes/aurora-observatory/curtainL_night.webp', depth: 0.56, box: { x: 11.35, y: 0.0, width: 18.28, height: 63.52 }, curtain: { scale: 2.6, origin: 0 }, anim: { name: 'billow', amplitude: 0.5, duration: 7.2, delay: 0.0, pivot: { x: 48, y: 1 } }, night: true }, // 12
    { name: 'right velvet curtain', image: '/scenes/aurora-observatory/curtainR.webp', depth: 0.56, box: { x: 68.96, y: 0.0, width: 16.88, height: 63.52 }, curtain: { scale: 2.6, origin: 100 }, anim: { name: 'billow', amplitude: 0.5, duration: 5.8, delay: -1.9, pivot: { x: 52, y: 1 } }, light: true }, // 13
    { name: 'right velvet curtain at night', image: '/scenes/aurora-observatory/curtainR_night.webp', depth: 0.56, box: { x: 68.96, y: 0.0, width: 16.88, height: 63.52 }, curtain: { scale: 2.6, origin: 100 }, anim: { name: 'billow', amplitude: 0.5, duration: 5.8, delay: -1.9, pivot: { x: 52, y: 1 } }, night: true }, // 14
    { name: 'moon mobile', image: '/scenes/aurora-observatory/mobile.webp', depth: 0.58, box: { x: 12.71, y: 0.0, width: 8.65, height: 23.98 }, anim: { name: 'sway', amplitude: 1.8, duration: 6.4, pivot: { x: 50, y: 2 } }, light: true }, // 15
    { name: 'moon mobile at night', image: '/scenes/aurora-observatory/mobile_night.webp', depth: 0.58, box: { x: 12.71, y: 0.0, width: 8.65, height: 23.98 }, anim: { name: 'sway', amplitude: 1.8, duration: 6.4, pivot: { x: 50, y: 2 } }, night: true }, // 16
    { name: 'walnut desk', image: '/scenes/aurora-observatory/desk.webp', depth: 0.88, box: { x: 0.0, y: 46.11, width: 100.0, height: 53.89 }, light: true }, // 17
    { name: 'walnut desk at night', image: '/scenes/aurora-observatory/desk_night.webp', depth: 0.88, box: { x: 0.0, y: 46.11, width: 100.0, height: 53.89 }, night: true }, // 18
    { name: 'sleeping fox', image: '/scenes/aurora-observatory/fox.webp', depth: 0.88, box: { x: 5.21, y: 68.8, width: 16.61, height: 13.15 }, anim: { name: 'breathe', duration: 4.1, pivot: { x: 50, y: 100 } }, light: true }, // 19
    { name: 'sleeping fox at night', image: '/scenes/aurora-observatory/fox_night.webp', depth: 0.88, box: { x: 5.21, y: 68.8, width: 16.61, height: 13.15 }, anim: { name: 'breathe', duration: 4.1, pivot: { x: 50, y: 100 } }, night: true }, // 20
    { name: 'fox tail', image: '/scenes/aurora-observatory/foxtail.webp', depth: 0.88, box: { x: 12.34, y: 71.76, width: 12.86, height: 10.19 }, anim: { name: 'flick', amplitude: 4.5, duration: 9.6, pivot: { x: 70.1, y: 18.4 } }, light: true }, // 21
    { name: 'fox tail at night', image: '/scenes/aurora-observatory/foxtail_night.webp', depth: 0.88, box: { x: 12.34, y: 71.76, width: 12.86, height: 10.19 }, anim: { name: 'flick', amplitude: 4.5, duration: 9.6, pivot: { x: 70.1, y: 18.4 } }, night: true }, // 22
    { name: 'armillary ring', image: '/scenes/aurora-observatory/ring.webp', depth: 0.88, box: { x: 42.66, y: 55.37, width: 5.52, height: 12.13 }, anim: { name: 'sweep', duration: 22 }, light: true }, // 23
    { name: 'armillary ring at night', image: '/scenes/aurora-observatory/ring_night.webp', depth: 0.88, box: { x: 42.66, y: 55.37, width: 5.52, height: 12.13 }, anim: { name: 'sweep', duration: 22 }, night: true }, // 24
    { name: 'retro CD player', image: '/scenes/aurora-observatory/cdplayer.webp', depth: 0.88, box: { x: 61.77, y: 69.81, width: 17.03, height: 12.31 }, light: true }, // 25
    { name: 'retro CD player at night', image: '/scenes/aurora-observatory/cdplayer_night.webp', depth: 0.88, box: { x: 61.77, y: 69.81, width: 17.03, height: 12.31 }, night: true }, // 26
    { name: 'cdplayer disc flat', image: '/scenes/aurora-observatory/cdplayer_disc_flat.webp', depth: 0.88, box: { x: 64.27, y: 65.37, width: 7.5, height: 13.33 }, anim: { name: 'spin', squash: 0.25, duration: 4 }, light: true }, // 27
    { name: 'cdplayer disc flat at night', image: '/scenes/aurora-observatory/night_cdplayer_disc_flat.webp', depth: 0.88, box: { x: 64.27, y: 65.37, width: 7.5, height: 13.33 }, anim: { name: 'spin', squash: 0.25, duration: 4 }, night: true }, // 28
    { name: 'snow pine', image: '/scenes/aurora-observatory/pine.webp', depth: 0.98, box: { x: 77.86, y: 70.28, width: 22.14, height: 15.46 }, anim: { name: 'sway', amplitude: 1.4, duration: 6.8, pivot: { x: 95.3, y: 100 } }, light: true }, // 29
    { name: 'snow pine at night', image: '/scenes/aurora-observatory/pine_night.webp', depth: 0.98, box: { x: 77.86, y: 70.28, width: 22.14, height: 15.46 }, anim: { name: 'sway', amplitude: 1.4, duration: 6.8, pivot: { x: 95.3, y: 100 } }, night: true }, // 30
    { name: 'cocoa steam', image: '/scenes/aurora-observatory/steam.webp', depth: 0.88, box: { x: 55.31, y: 57.78, width: 4.38, height: 12.96 }, anim: { name: 'steam', duration: 4.6 } }, // 31
    { name: 'hearth glow', image: '/scenes/aurora-observatory/glow_hearth_night.webp', depth: 0.52, box: { x: 0.0, y: 33.43, width: 17.03, height: 42.13 }, anim: { name: 'pulse', duration: 2.8 }, night: true }, // 32
    { name: 'hearth glow', image: '/scenes/aurora-observatory/glow_hearth.webp', depth: 0.52, box: { x: 0.0, y: 40.19, width: 12.5, height: 28.52 }, anim: { name: 'pulse', duration: 2.8 }, light: true }, // 33
    { name: 'sconce glow', image: '/scenes/aurora-observatory/glow_sconce.webp', depth: 0.52, box: { x: 74.01, y: 0.0, width: 24.06, height: 42.5 }, night: true }, // 34
    { name: 'CD player display glow', image: '/scenes/aurora-observatory/glow_tubes.webp', depth: 0.88, box: { x: 67.08, y: 70.09, width: 14.17, height: 15.0 }, anim: { name: 'pulse', duration: 3.2 }, night: true }, // 35
    { name: 'vignette', image: '/scenes/aurora-observatory/vignette.webp', depth: 0.0, box: { x: 0.0, y: 0.0, width: 100.0, height: 100.0 } }, // 36
    { name: 'Potted cactus', image: '/scenes/aurora-observatory/succulent.webp', depth: 0.88, box: { x: 80.99, y: 75.0, width: 14.53, height: 16.2 }, item: 'succulent', light: true }, // 37
    { name: 'Potted cactus at night', image: '/scenes/aurora-observatory/succulent_night.webp', depth: 0.88, box: { x: 80.99, y: 75.0, width: 14.53, height: 16.2 }, item: 'succulent', night: true }, // 38
    { name: 'Brass candle', image: '/scenes/aurora-observatory/candle.webp', depth: 0.88, box: { x: 7.81, y: 73.7, width: 9.48, height: 17.59 }, item: 'candle', light: true }, // 39
    { name: 'Brass candle at night', image: '/scenes/aurora-observatory/candle_night.webp', depth: 0.88, box: { x: 4.27, y: 69.35, width: 17.92, height: 21.94 }, item: 'candle', night: true }, // 40
    { name: 'candle light', image: '/scenes/aurora-observatory/glow_candle.webp', depth: 0.88, box: { x: 0.0, y: 65.19, width: 22.34, height: 24.81 }, item: 'candle', anim: { name: 'pulse', duration: 2.6 }, night: true }, // 41
    { name: 'Desk globe', image: '/scenes/aurora-observatory/globe.webp', depth: 0.88, box: { x: 34.43, y: 59.44, width: 17.08, height: 16.39 }, item: 'globe', light: true }, // 42
    { name: 'Desk globe at night', image: '/scenes/aurora-observatory/globe_night.webp', depth: 0.88, box: { x: 30.99, y: 59.44, width: 20.31, height: 16.48 }, item: 'globe', night: true }, // 43
    { name: 'Framed star chart', image: '/scenes/aurora-observatory/photo.webp', depth: 0.88, box: { x: 66.98, y: 63.24, width: 17.14, height: 17.22 }, item: 'photo', light: true }, // 44
    { name: 'Framed star chart at night', image: '/scenes/aurora-observatory/photo_night.webp', depth: 0.88, box: { x: 68.02, y: 63.24, width: 16.04, height: 17.59 }, item: 'photo', night: true }, // 45
    { name: 'Brass clock', image: '/scenes/aurora-observatory/clock.webp', depth: 0.88, box: { x: 67.55, y: 75.19, width: 10.73, height: 16.2 }, item: 'clock', light: true }, // 46
    { name: 'Brass clock at night', image: '/scenes/aurora-observatory/clock_night.webp', depth: 0.88, box: { x: 65.47, y: 75.19, width: 13.75, height: 16.2 }, item: 'clock', night: true }, // 47
    { name: 'Old books', image: '/scenes/aurora-observatory/books.webp', depth: 0.88, box: { x: 12.19, y: 78.7, width: 17.97, height: 12.5 }, item: 'books', light: true }, // 48
    { name: 'Old books at night', image: '/scenes/aurora-observatory/books_night.webp', depth: 0.88, box: { x: 11.67, y: 78.7, width: 13.65, height: 12.41 }, item: 'books', night: true }, // 49
    { name: 'left curtain hit', image: '/scenes/aurora-observatory/hit.webp', depth: 0.56, box: { x: 11.35, y: 0.0, width: 18.28, height: 63.52 } }, // 50
    { name: 'right curtain hit', image: '/scenes/aurora-observatory/hit.webp', depth: 0.56, box: { x: 68.96, y: 0.0, width: 16.88, height: 63.52 } }, // 51
    { name: 'sconce hit', image: '/scenes/aurora-observatory/hit.webp', depth: 0.52, box: { x: 82.6, y: 17.04, width: 5.36, height: 15.28 } }, // 52
    { name: 'cd player hit', image: '/scenes/aurora-observatory/hit.webp', depth: 0.88, box: { x: 61.77, y: 69.81, width: 17.03, height: 12.31 } }, // 53
  ],
  objects: [
    { key: 'sky', label: 'Observatory window', layer: 0, x: 28, y: 8, width: 40, height: 52, action: { type: 'toggleEffect', effect: 'snow' } },
    { key: 'curtains-left', label: 'Velvet curtains', layer: 50, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleCurtains' } },
    { key: 'curtains', label: 'Velvet curtains', layer: 51, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleCurtains' } },
    { key: 'sconce', label: 'Brass sconce: warm hearth or northern lights', layer: 52, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleLight' } },
    { key: 'cd-player', label: 'Retro CD player', layer: 53, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } },
  ],
  // What a visitor may put on the desk (Decorate). The pictures of an object are the layers with its key in `item`.
  catalog: [
    { key: 'succulent', label: 'Potted cactus', surface: 'desk', home: { x: 83.39, y: 85.4 }, bounds: { x: 80.99, y: 75.0, width: 14.53, height: 16.2 }, thumb: '/scenes/aurora-observatory/succulent_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'candle', label: 'Brass candle', surface: 'desk', home: { x: 10.4, y: 85.4 }, bounds: { x: 4.27, y: 69.35, width: 17.92, height: 21.94 }, thumb: '/scenes/aurora-observatory/candle_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'globe', label: 'Desk globe', surface: 'desk', home: { x: 37.85, y: 73.55 }, bounds: { x: 30.99, y: 59.44, width: 20.31, height: 16.48 }, thumb: '/scenes/aurora-observatory/globe_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'photo', label: 'Framed star chart', surface: 'desk', home: { x: 72.25, y: 73.22 }, bounds: { x: 68.02, y: 63.24, width: 16.04, height: 17.59 }, thumb: '/scenes/aurora-observatory/photo_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'clock', label: 'Brass clock', surface: 'desk', home: { x: 71.11, y: 85.89 }, bounds: { x: 65.47, y: 75.19, width: 13.75, height: 16.2 }, thumb: '/scenes/aurora-observatory/clock_thumb.webp', flippable: false, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
    { key: 'books', label: 'Old books', surface: 'desk', home: { x: 20.28, y: 85.89 }, bounds: { x: 11.67, y: 78.7, width: 13.65, height: 12.41 }, thumb: '/scenes/aurora-observatory/books_thumb.webp', flippable: true, unique: false, inDefault: false, scale: { min: 0.6, max: 1.8 } },
  ],
  surfaces: [
    { key: 'desk', area: { x: 10, y: 71.5, width: 80, height: 17 }, perspective: { farY: 71.5, nearY: 88.5, farScale: 0.8, nearScale: 1.0 }, drawAt: 31 },
  ],
  nightDim: 0,
  effects: ['snow', 'stars'],
  effectLayer: 5, // the alpine mist, just behind the cabin wall, so snow and stars stay outside the glass
};
