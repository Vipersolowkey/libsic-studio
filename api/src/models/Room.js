const mongoose = require('mongoose');
const { EFFECTS } = require('../constants');

const { Schema } = mongoose;

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
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('Room', roomSchema);
