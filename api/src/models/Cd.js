const mongoose = require('mongoose');

const cdSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  trackIds: {
    type: [String],
    required: true,
    validate: {
      validator: (ids) => ids.length >= 1 && ids.length <= 30 && new Set(ids).size === ids.length,
      message: 'Choose 1 to 30 different tracks',
    },
  },
  official: { type: Boolean, default: false, immutable: true },
  editKeyHash: { type: String, select: false, required() { return !this.official; } },
}, { timestamps: true });

module.exports = mongoose.model('Cd', cdSchema);
