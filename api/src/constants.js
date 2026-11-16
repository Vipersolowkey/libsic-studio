// Values shared by the scene and room models and the seed data.
const EFFECTS = ['rain', 'snow', 'fireflies', 'stars', 'dust', 'bubbles', 'plankton'];
const ACTION_TYPES = ['toggleLight', 'toggleEffect', 'toggleCurtains', 'nextTrack'];

// Optional extras of a scene layer (see the Scene model).
const LAYER_KINDS = ['image', 'clock'];
const LAYER_BLENDS = ['normal', 'screen', 'multiply'];
const LAYER_ANIMS = ['spin', 'tonearm', 'sway', 'steam', 'pulse', 'breathe', 'drift', 'flick', 'billow', 'throb', 'sweep', 'shut', 'cover'];

// Most objects a visitor can place in one room.
const MAX_ITEMS = 30;

module.exports = { EFFECTS, ACTION_TYPES, LAYER_KINDS, LAYER_BLENDS, LAYER_ANIMS, MAX_ITEMS };
