// Part of: Scenes: loads the five rooms into MongoDB (npm run seed:scenes).
// Uses: Scene.js, db.js, scenes.js.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDb } = require('../db');
const Scene = require('../models/Scene');
const scenes = require('./scenes');

// `npm run seed:scenes`. Safe to repeat: same slug = updated (rooms keep working). Scenes no longer listed in scenes.js are DELETED,
// so the database always matches that file.
async function seedScenes() {
  await connectDb(process.env.MONGODB_URI);
  const result = await Scene.bulkWrite(
    scenes.map((scene) => ({
      updateOne: { filter: { slug: scene.slug }, update: { $set: scene }, upsert: true },
    }))
  );
  const removed = await Scene.deleteMany({ slug: { $nin: scenes.map((s) => s.slug) } });
  console.log(`Scenes saved: ${result.upsertedCount} new, ${result.modifiedCount} updated, ${removed.deletedCount} old removed`);
}

seedScenes()
  .catch((err) => {
    console.error('Seeding scenes failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
