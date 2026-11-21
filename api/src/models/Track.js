const mongoose = require('mongoose');

// Stable text ids survive re-seeding and can be stored in a CD in playback order.
const trackSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  artist: { type: String, required: true, trim: true },
  src: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  license: { type: String, required: true },
});

module.exports = mongoose.model('Track', trackSchema);
