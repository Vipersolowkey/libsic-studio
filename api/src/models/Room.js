const mongoose = require('mongoose');
const { EFFECTS } = require('../constants');

const { Schema } = mongoose;

// One object the visitor placed in the room (see the catalog of the scene). x and y are where its
// contact point sits, in percent of the scene; scale is the visitor's own size on top of the perspective size.
// The server checks the values against the scene (utils/roomItems), not this schema.
const itemSchema = new Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    scale: { type: Number, default: 1 },
    flip: { type: Boolean, default: false },
  },
  { _id: false, id: false }
);

const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // the short share code in the link
    // Only a hash of the secret edit key is stored, never the key itself.
    // select: false keeps it out of query results unless we ask for it.
    editKeyHash: { type: String, required: true, select: false },
    name: { type: String, default: 'Untitled room', trim: true, maxlength: 60 },
    // Scenes and CDs are referenced by their stable text codes (not database ids),
    // so re-running the seed scripts never breaks a saved room.
    sceneSlug: { type: String, required: true },
    cdCode: { type: String, default: null },
    settings: {
      effect: { type: String, enum: [...EFFECTS, 'none'], default: 'none' },
      lightOn: { type: Boolean, default: true },
      volume: { type: Number, min: 0, max: 1, default: 0.7 },
    },
    // Missing means "show the scene's default arrangement", an empty list means an empty room.
    items: { type: [itemSchema], default: undefined },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('Room', roomSchema);
