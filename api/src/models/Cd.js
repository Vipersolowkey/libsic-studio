const mongoose = require('mongoose');

// How a CD is painted (see client/src/music/cdLook.js): a colour and the pattern of its cover, its printed disc and its lettering.
const lookSchema = new mongoose.Schema({
  hue: { type: Number, required: true, min: 0, max: 359 },
  cover: { type: Number, required: true, min: 0, max: 3 },
  disc: { type: Number, required: true, min: 0, max: 3 },
  font: { type: Number, required: true, min: 0, max: 4 },
}, { _id: false });

const cdSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  trackIds: {
    type: [String],
    required: true,
    validate: {
      validator: (ids) => ids.length <= 30 && new Set(ids).size === ids.length,
      message: 'Choose up to 30 different tracks',
    },
  },
  // A CD is made either of our own tracks (trackIds) or of online links (links), never both. Older CDs have no links.
  links: {
    type: [new mongoose.Schema({
      provider: { type: String, required: true, enum: ['soundcloud', 'spotify', 'youtube', 'audio'] },
      url: { type: String, required: true, maxlength: 2048 },
    }, { _id: false })],
    default: [],
    validate: { validator: (links) => links.length <= 12, message: 'Put up to 12 links on a CD' },
  },
  look: { type: lookSchema, default: undefined },
  official: { type: Boolean, default: false, immutable: true },
  editKeyHash: { type: String, select: false, required() { return !this.official; } },
}, { timestamps: true });

module.exports = mongoose.model('Cd', cdSchema);
