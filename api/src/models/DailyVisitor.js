const mongoose = require('mongoose');

// Used only to count each visitor once a day. It holds a one-way scrambled mark (a hash of the day, the address and
// the browser name, mixed with a secret), never the address itself, and MongoDB deletes every entry after 2 days.
const dailyVisitorSchema = new mongoose.Schema({
  day: { type: String, required: true },
  mark: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 2 * 24 * 60 * 60 },
});
dailyVisitorSchema.index({ day: 1, mark: 1 }, { unique: true });

module.exports = mongoose.model('DailyVisitor', dailyVisitorSchema);
