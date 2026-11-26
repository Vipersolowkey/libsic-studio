// Part of: API rules shared by the Scene and Room models and the seeds (effects, animations, item limit).
// Used by: Room.js, Scene.js, roomItems.js.
// Allowed values shared by the models and the seed data. Adding an effect or animation here is not enough:
// the client (Effects.jsx / scene.css) must draw it too.
const EFFECTS = ['rain', 'snow', 'fireflies', 'stars', 'dust', 'bubbles', 'plankton', 'glitter'];
const ACTION_TYPES = ['toggleLight', 'toggleEffect', 'toggleCurtains', 'nextTrack'];

// Layer options (see the Scene model). anim names are matched by CSS classes in client scene.css.
const LAYER_KINDS = ['image', 'clock'];
const LAYER_BLENDS = ['normal', 'screen', 'multiply'];
const LAYER_ANIMS = ['spin', 'tonearm', 'sway', 'steam', 'pulse', 'breathe', 'drift', 'flick', 'billow', 'throb', 'sweep', 'shut', 'cover'];

// Most decoration objects one room may hold (checked in utils/roomItems).
const MAX_ITEMS = 30;

module.exports = { EFFECTS, ACTION_TYPES, LAYER_KINDS, LAYER_BLENDS, LAYER_ANIMS, MAX_ITEMS };
