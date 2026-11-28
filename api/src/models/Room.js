// Part of: Saved rooms: share code, settings, music, placed items.
// Uses: constants.js.
// Used by: app.js.
const mongoose = require('mongoose');
const { EFFECTS } = require('../constants');

const { Schema } = mongoose;

// One decoration the visitor placed. key = catalog entry of the scene. x, y = its contact point (percent of the scene).
// scale = the visitor's own size on top of the perspective size. Values are checked against the scene in utils/roomItems, not here.
// ===== PLACED ITEM (Decorate mode). Client: scene/itemsEdit.js, placement.js =====
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

// A saved room: which scene, which music, the settings and the placed items. Anyone with the code can view it;
// only the holder of the edit key, or the signed-in owner, can change it.
const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // the short share code in the link
    // Only a hash of the secret edit key is stored. select: false hides it unless a query asks with .select('+editKeyHash').
    editKeyHash: { type: String, required: true, select: false },
    // Optional: the account that owns this room. Empty for a room saved as a guest, which only its edit key can change.
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, default: 'Untitled room', trim: true, maxlength: 60 },
    // Scenes and CDs are referenced by their text codes, not database ids, so re-seeding never breaks a saved room.
    sceneSlug: { type: String, required: true },
    cdCode: { type: String, default: null, trim: true, maxlength: 64, match: [/^[A-Za-z0-9_-]+$/, 'Invalid CD code'] },
    // Optional online music (SoundCloud, Spotify, YouTube or a direct audio link) instead of a CD.
    musicSource: {
      type: new Schema({
        provider: { type: String, enum: ['soundcloud', 'spotify', 'youtube', 'audio'], required: true },
        url: { type: String, required: true, maxlength: 2048 },
      }, { _id: false }),
      default: null,
    },
    settings: {
      effect: { type: String, enum: [...EFFECTS, 'none'], default: 'none' },
      lightOn: { type: Boolean, default: true },
      curtainsClosed: { type: Boolean, default: false },
      volume: { type: Number, min: 0, max: 1, default: 0.7 },
    },
    // Missing (undefined) = show the scene's default arrangement. [] = an empty room. The difference matters.
    items: { type: [itemSchema], default: undefined },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

module.exports = mongoose.model('Room', roomSchema);
