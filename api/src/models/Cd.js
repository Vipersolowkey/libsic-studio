// Part of: CDs: a playlist with a share code and a look.
// Used by: app.js, seedMusic.js.
const mongoose = require('mongoose');

// How a CD is painted (see client cdLook.js): hue 0-359, and the index of its cover, disc print and font.
const lookSchema = new mongoose.Schema({
  hue: { type: Number, required: true, min: 0, max: 359 },
  cover: { type: Number, required: true, min: 0, max: 3 },
  disc: { type: Number, required: true, min: 0, max: 3 },
  font: { type: Number, required: true, min: 0, max: 4 },
}, { _id: false });

// A CD = a named playlist with a share code. "official" CDs are ours (no edit key); user CDs need the edit key to change.
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
  // A CD holds either our own tracks (trackIds) or online links (links), never both. Older CDs have no links.
  links: {
    type: [new mongoose.Schema({
      provider: { type: String, required: true, enum: ['soundcloud', 'spotify', 'youtube', 'audio'] },
      url: { type: String, required: true, maxlength: 2048 },
    }, { _id: false })],
    default: [],
    validate: { validator: (links) => links.length <= 12, message: 'Put up to 12 links on a CD' },
  },
  look: { type: lookSchema, default: undefined },
  official: { type: Boolean, default: false, immutable: true }, // set at seed time, cannot be changed afterwards
  editKeyHash: { type: String, select: false, required() { return !this.official; } }, // hidden unless asked for; official CDs have none
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true }, // optional: the account that owns this CD (empty for guest CDs)
}, { timestamps: true });

module.exports = mongoose.model('Cd', cdSchema);
