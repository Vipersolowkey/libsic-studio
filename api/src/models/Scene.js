// Part of: Scenes: what a room looks like (layers, objects, Decorate catalog).
// Uses: constants.js.
// Used by: app.js, seedScenes.js.
const mongoose = require('mongoose');
const { EFFECTS, ACTION_TYPES, LAYER_KINDS, LAYER_BLENDS, LAYER_ANIMS } = require('../constants');

// A scene = a stack of image layers (back to front) + clickable objects + effects + the surfaces and catalog for Decorate mode.
// Most of the file is the shape of one layer. All positions are percentages of the scene, so they fit any screen.
// The checks at the bottom keep indexes (object.layer, effectLayer, drawAt) pointing at real layers.
const { Schema } = mongoose;

// Where a layer sits when it does not cover the whole scene: percentages of the scene (0 to 100).
// ===== SMALL SHARED PIECES: a box in percent, scale limits, glide coordinates =====
const boxPercent = { type: Number, required: true, min: 0, max: 100 };
const boxSchema = new Schema({ x: boxPercent, y: boxPercent, width: boxPercent, height: boxPercent }, { _id: false });

const scaleValue = { type: Number, required: true, min: 0.2, max: 3 };
const glideCoord = { type: Number, required: true, min: -2000, max: 2000 };

// A small looping movement of a layer, picked by name:
//   spin (record), tonearm, sway (leaves), steam, pulse (glows), breathe (sleeping cat), drift (clouds), flick (tail),
//   billow (curtain), throb (jellyfish bell), sweep (radar beam), shut (shell folds while music is paused),
//   cover (like shut, but only visible while paused)
// pivot = the point it turns around, in percent of the layer's own picture. Which extra fields apply depends on the name (see below).
const animSchema = new Schema(
  {
    name: { type: String, enum: LAYER_ANIMS, required: true },
    pivot: { type: new Schema({ x: Number, y: Number }, { _id: false }), default: undefined },
    duration: { type: Number, min: 0.1 }, // seconds for one round
    delay: { type: Number }, // seconds, so that neighbours do not move together
    squash: { type: Number, min: 0.05, max: 1 }, // spin: how flat the record looks from the side. shut, cover: how low the shell folds when the music is paused
    rest: { type: Number }, // tonearm: angle in degrees when the music is paused
    skew: { type: Number }, // clock: tilt in degrees
    distance: { type: Number, min: 0, max: 100 }, // drift: how far it travels, in percent of the layer's width
    amplitude: { type: Number, min: 0, max: 45 }, // sway, billow, flick: how far it swings, in degrees
    // throb: the size it starts and ends at (1 = normal), around the pivot
    scaleFrom: { type: new Schema({ x: scaleValue, y: scaleValue }, { _id: false }), default: undefined },
    scaleTo: { type: new Schema({ x: scaleValue, y: scaleValue }, { _id: false }), default: undefined },
  },
  { _id: false }
);

// One transparent image in a scene. depth: 0 = far and almost still, 1 = near and moves most with the mouse.
// Only name, image and depth are needed (full-size picture); everything else is optional.
// ===== LAYER: one picture of a scene. Drawn by client scene/SceneStage.jsx; its animations are CSS in scene/scene.css =====
const layerSchema = new Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: LAYER_KINDS, default: 'image' },
    // path inside the client's public folder (a clock layer draws itself and needs none)
    image: {
      type: String,
      required: function () {
        return this.kind !== 'clock';
      },
    },
    depth: { type: Number, required: true, min: 0, max: 1 },
    box: { type: boxSchema, default: undefined }, // default: the whole scene
    blend: { type: String, enum: LAYER_BLENDS, default: undefined }, // "screen" for glows
    light: { type: Boolean, default: undefined }, // true: lamp light that goes off with the lights
    tile: { type: Number, min: 1, max: 100, default: undefined }, // repeat the picture, this wide in percent of the layer
    anim: { type: animSchema, default: undefined },
    // Key of the catalog object this layer belongs to. Such a layer is a template: drawn once per copy the room places,
    // not at its own place in the stack. Needs a box and a catalog entry (checked below).
    item: { type: String, default: undefined },
    // A repeating slow trip (a fish swimming by). From `from` to `to`, in percent of the layer's own size (may lie outside it),
    // fading in and out. mirror flips the picture (a fish drawn facing right that swims left). Can be combined with `anim`.
    glide: {
      type: new Schema(
        {
          from: new Schema({ x: glideCoord, y: glideCoord }, { _id: false }),
          to: new Schema({ x: glideCoord, y: glideCoord }, { _id: false }),
          duration: { type: Number, required: true, min: 1 },
          delay: { type: Number },
          mirror: { type: Boolean },
          // true: goes to `to` and back again without fading, instead of restarting (a hanging jellyfish).
          pingpong: { type: Boolean },
        },
        { _id: false }
      ),
      default: undefined,
    },
    // true: shown only at night (lights off). Pair with `light: true` layers, which show only by day.
    night: { type: Boolean, default: undefined },
    // Marks a curtain: when curtains are closed it is drawn `scale` times wider, growing from the edge at `origin`
    // (0 = left edge stays, 100 = right edge stays).
    curtain: {
      type: new Schema({ scale: { type: Number, required: true, min: 1, max: 4 }, origin: { type: Number, required: true, min: 0, max: 100 } }, { _id: false }),
      default: undefined,
    },
    // false: not mirrored when its object is flipped (a shadow must keep falling away from the lamp).
    mirror: { type: Boolean, default: undefined },
  },
  { _id: false }
);

// A clickable object on the picture (lamp, clock, record player). Position and size in percent of the scene.
const percent = { type: Number, required: true, min: 0, max: 100 };

// ===== CLICKABLE OBJECT (lamp, window, music object). Client: SceneStage.jsx hotspots + sceneSettings.js =====
const objectSchema = new Schema(
  {
    key: { type: String, required: true }, // for example "lamp"
    label: { type: String, required: true }, // shown on hover
    // Index of the layer it sits on (0 = first), so the click area moves with that layer's parallax.
    layer: { type: Number, required: true, min: 0 },
    x: percent,
    y: percent,
    width: percent,
    height: percent,
    action: {
      type: { type: String, enum: ACTION_TYPES, required: true },
      // only used when type is "toggleEffect": which effect it switches
      effect: {
        type: String,
        enum: EFFECTS,
        required: function () {
          return this.action && this.action.type === 'toggleEffect';
        },
      },
    },
  },
  { _id: false }
);

// ===== DECORATE MODE data: surfaces (where) and catalog (what). Client: scene/placement.js, itemsEdit.js, room/DecorateTray.jsx =====
const point = new Schema({ x: boxPercent, y: boxPercent }, { _id: false });
const scale = { type: Number, required: true, min: 0.01 };

// A flat area decorations can stand on (desk, window pane). Lower = closer = bigger: size runs from farScale at farY to nearScale at nearY.
const surfaceSchema = new Schema(
  {
    key: { type: String, required: true },
    area: { type: boxSchema, required: true }, // where an object's contact point may be
    blocked: { type: [boxSchema], default: [] }, // no-go boxes (e.g. a fixed object); the editor pushes a dragged item out
    drawAt: { type: Number, required: true, min: 0 }, // layer index: its objects are drawn just before (in front of) that layer
    perspective: {
      type: new Schema({ farY: boxPercent, nearY: boxPercent, farScale: scale, nearScale: scale }, { _id: false }),
      required: true,
    },
  },
  { _id: false }
);

// A kind of decoration visitors can place (mug, plant). Its pictures are the layers whose `item` equals this key.
const catalogSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    surface: { type: String, required: true },
    home: { type: point, required: true }, // contact point (bottom centre) where it first stands; it scales around this point
    bounds: { type: boxSchema, required: true }, // clickable / draggable area when at home
    thumb: { type: String, required: true }, // picture shown in the tray
    flippable: { type: Boolean, default: true }, // false for things with writing on them
    unique: { type: Boolean, default: false }, // true: at most one in a room
    inDefault: { type: Boolean, default: false }, // true: in the starting arrangement
    scale: {
      type: new Schema({ min: { type: Number, required: true, min: 0.01 }, max: { type: Number, required: true } }, { _id: false }),
      required: true,
    },
  },
  { _id: false }
);

// ===== THE SCENE: slug, layers, objects, effects, night dimming, surfaces, catalog =====
const sceneSchema = new Schema({
  slug: { type: String, required: true, unique: true, trim: true }, // for example "rainy-cafe"
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  layers: {
    type: [layerSchema],
    validate: { validator: (layers) => layers.length > 0, message: 'A scene needs at least one layer' },
  },
  objects: { type: [objectSchema], default: [] },
  effects: { type: [{ type: String, enum: EFFECTS }], default: [] },
  defaultEffect: { type: String, enum: EFFECTS },
  // Effects (rain, snow...) are drawn above this layer and behind later ones. For a window: the layer behind the wall,
  // so rain shows only through the glass.
  effectLayer: { type: Number, min: 0, default: 0 },
  // How dark the picture gets when lights are off (0-1). Omit for the default; scenes with painted night layers use a small value.
  nightDim: { type: Number, min: 0, max: 1 },
  surfaces: { type: [surfaceSchema], default: [] },
  catalog: { type: [catalogSchema], default: [] },
});

// Cross-field checks (a field cannot see its siblings, so they live here).
sceneSchema.path('objects').validate(function (objects) {
  return objects.every((object) => object.layer < this.layers.length);
}, 'An object points to a layer the scene does not have');

sceneSchema.path('effectLayer').validate(function (effectLayer) {
  return effectLayer < this.layers.length;
}, 'The effect layer is a layer the scene does not have');

const hasDuplicates = (keys) => new Set(keys).size !== keys.length;

sceneSchema.path('surfaces').validate(function (surfaces) {
  return !hasDuplicates(surfaces.map((s) => s.key)) && surfaces.every((s) => s.drawAt <= this.layers.length);
}, 'Surface keys must be unique and a surface can only be drawn before a layer the scene has');

sceneSchema.path('catalog').validate(function (catalog) {
  const surfaceByKey = new Map(this.surfaces.map((s) => [s.key, s]));
  const inside = ({ x, y }, { area }) => x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
  return (
    !hasDuplicates(catalog.map((c) => c.key)) &&
    catalog.every((c) => surfaceByKey.has(c.surface) && inside(c.home, surfaceByKey.get(c.surface)) && c.scale.min <= c.scale.max)
  );
}, 'Catalog keys must be unique; each entry needs an existing surface, a home on it and a scale range with min up to max');

sceneSchema.path('layers').validate(function (layers) {
  const keys = new Set(this.catalog.map((c) => c.key));
  return layers.every((layer) => !layer.item || (keys.has(layer.item) && layer.box));
}, 'A layer of an item needs a box and must name an item that is in the catalog');

module.exports = mongoose.model('Scene', sceneSchema);
