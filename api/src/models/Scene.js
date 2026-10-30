const mongoose = require('mongoose');
const { EFFECTS, ACTION_TYPES, LAYER_KINDS, LAYER_BLENDS, LAYER_ANIMS } = require('../constants');

const { Schema } = mongoose;

// Where a layer sits when it does not cover the whole scene: percentages of the scene (0 to 100).
const boxPercent = { type: Number, required: true, min: 0, max: 100 };
const boxSchema = new Schema({ x: boxPercent, y: boxPercent, width: boxPercent, height: boxPercent }, { _id: false });

// A small movement for a layer. Which one is picked by name:
//   spin (the record), tonearm, sway (leaves), steam, pulse (glows)
// pivot: the point it turns around, in percent of the layer's own picture.
const animSchema = new Schema(
  {
    name: { type: String, enum: LAYER_ANIMS, required: true },
    pivot: { type: new Schema({ x: Number, y: Number }, { _id: false }), default: undefined },
    duration: { type: Number, min: 0.1 }, // seconds for one round
    delay: { type: Number }, // seconds, so that neighbours do not move together
    squash: { type: Number, min: 0.05, max: 1 }, // spin: how flat the record looks from the side
    rest: { type: Number }, // tonearm: angle in degrees when the music is paused
    skew: { type: Number }, // clock: tilt in degrees
  },
  { _id: false }
);

// One transparent image in the stack that makes up a scene.
// depth: 0 = far away and almost still, 1 = nearest and moves the most with the mouse.
// Everything after depth is optional, so a plain full-size picture only needs name, image and depth.
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
    // The key of the catalog object this layer belongs to. Such a layer is a template: it is drawn once for
    // every copy of the object a room places, and not in its own place in the stack.
    item: { type: String, default: undefined },
    // false: the picture is not mirrored when its object is flipped (a shadow keeps falling away from the lamp).
    mirror: { type: Boolean, default: undefined },
  },
  { _id: false }
);

// A clickable object. Position and size are percentages of the scene (0 to 100),
// so they stay correct on any screen size.
const percent = { type: Number, required: true, min: 0, max: 100 };

const objectSchema = new Schema(
  {
    key: { type: String, required: true }, // for example "lamp"
    label: { type: String, required: true }, // shown on hover
    // Position in the layers list (0 = first layer) of the image this object is drawn on,
    // so the object moves together with that layer when the mouse moves.
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

const point = new Schema({ x: boxPercent, y: boxPercent }, { _id: false });
const scale = { type: Number, required: true, min: 0.01 };

// A surface is a flat area objects can stand on (a desk, a window pane). The further down it an object stands,
// the closer it looks, so its size runs from farScale at farY to nearScale at nearY.
const surfaceSchema = new Schema(
  {
    key: { type: String, required: true },
    area: { type: boxSchema, required: true }, // where an object's contact point may be
    drawAt: { type: Number, required: true, min: 0 }, // its objects are drawn just before this layer
    perspective: {
      type: new Schema({ farY: boxPercent, nearY: boxPercent, farScale: scale, nearScale: scale }, { _id: false }),
      required: true,
    },
  },
  { _id: false }
);

// A kind of object visitors can place in a room (a mug, a plant). Its pictures are the layers with the same item key.
const catalogSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    surface: { type: String, required: true },
    home: { type: point, required: true }, // contact point (bottom centre) in the drawn scene; the object scales around it
    bounds: { type: boxSchema, required: true }, // the area to click or drag, at home
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
  // Effects (rain, snow...) are drawn on top of this layer and behind the ones after it.
  // For a window, that is the layer just behind the wall, so the rain only shows through the glass.
  effectLayer: { type: Number, min: 0, default: 0 },
  surfaces: { type: [surfaceSchema], default: [] },
  catalog: { type: [catalogSchema], default: [] },
});

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
