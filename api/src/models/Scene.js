const mongoose = require('mongoose');
const { EFFECTS, ACTION_TYPES } = require('../constants');

const { Schema } = mongoose;

// One transparent image in the stack that makes up a scene.
// depth: 0 = far away and almost still, 1 = nearest and moves the most with the mouse.
const layerSchema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true }, // path inside the client's public folder
    depth: { type: Number, required: true, min: 0, max: 1 },
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
});

sceneSchema.path('objects').validate(function (objects) {
  return objects.every((object) => object.layer < this.layers.length);
}, 'An object points to a layer the scene does not have');

module.exports = mongoose.model('Scene', sceneSchema);
