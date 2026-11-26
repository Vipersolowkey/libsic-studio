const mongoose = require('mongoose');

// One counter per day, per kind of page, per scene. Nothing here says who the visitor was.
//   page "home", "new", "room", "cd", "music", "other" = pages opened; page "scene" = a room shown (scene = its slug);
//   page "_all" = the whole day, where "visitors" counts different visitors (see DailyVisitor).
const dailyStatSchema = new mongoose.Schema({
  day: { type: String, required: true }, // "2026-11-26"
  page: { type: String, required: true },
  scene: { type: String, default: '' },
  views: { type: Number, default: 0 },
  visitors: { type: Number, default: 0 },
});
dailyStatSchema.index({ day: 1, page: 1, scene: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
