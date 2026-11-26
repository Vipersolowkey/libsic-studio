// Part of: Our own music: the 12 tracks.
// Used by: app.js, seedMusic.js.
const mongoose = require('mongoose');

// One song we host. _id is a text id (not an ObjectId) so it survives re-seeding; CDs list these ids in play order.
// src = audio path served by the client; license = why we may use it (royalty-free).
const trackSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  artist: { type: String, required: true, trim: true },
  src: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  license: { type: String, required: true },
});

module.exports = mongoose.model('Track', trackSchema);
