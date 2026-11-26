// Part of: Accounts: one document per person who signed up (optional: guests need no account).
// Used by: app.js, auth.js, me.js, admin.js.
const mongoose = require('mongoose');

const { Schema } = mongoose;

// There is no email and no real name here on purpose: the less we store, the less can leak.
const userSchema = new Schema(
  {
    // Lower-case only, so "Tony" and "tony" are the same account. The unique index stops two accounts sharing a name.
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 20, match: [/^[a-z0-9_]+$/, 'Use letters, digits or underscores'] },
    // Only the scrambled hash is stored (see utils/password.js). select: false hides it unless a query asks with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 30, default: '' }, // optional nicer name, shown instead of the username
    avatarHue: { type: Number, min: 0, max: 359, default: 38 }, // the colour of the person's little disc
    // Nobody can set this through the API: sign-up and the profile update ignore it. Admins are made with `npm run make-admin`.
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
