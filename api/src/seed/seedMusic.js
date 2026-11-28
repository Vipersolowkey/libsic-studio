// Part of: Our own music: loads tracks and official CDs into MongoDB (npm run seed:music).
// Uses: Cd.js, Track.js, db.js, tracks.js.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDb } = require('../db');
const Track = require('../models/Track');
const Cd = require('../models/Cd');
const { tracks, cds } = require('./tracks');

// `npm run seed:music`. Safe to repeat: tracks and official CDs are updated by id / code. Custom CDs (made by visitors) are never touched.
async function seedMusic() {
  await connectDb(process.env.MONGODB_URI);
  await Track.bulkWrite(tracks.map((track) => ({ updateOne: { filter: { _id: track._id }, update: { $set: track }, upsert: true } })));
  // Nothing is deleted here: a track may be on a saved CD.
  await Cd.bulkWrite(cds.map((cd) => ({ updateOne: { filter: { code: cd.code, official: true }, update: { $set: cd }, upsert: true } })));
  console.log(`Music saved: ${tracks.length} tracks, ${cds.length} official CDs. Custom CDs kept.`);
}
seedMusic().catch((err) => {
  console.error('Seeding music failed:', err.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
