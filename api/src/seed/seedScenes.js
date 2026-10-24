require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDb } = require('../db');
const Scene = require('../models/Scene');
const scenes = require('./scenes');

// Saves the starter scenes. Safe to run again: a scene with the same slug is updated,
// not duplicated, and rooms that point to it keep working.
async function seedScenes() {
  await connectDb(process.env.MONGODB_URI);
  const result = await Scene.bulkWrite(
    scenes.map((scene) => ({
      updateOne: { filter: { slug: scene.slug }, update: { $set: scene }, upsert: true },
    }))
  );
  console.log(`Scenes saved: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
}

seedScenes()
  .catch((err) => {
    console.error('Seeding scenes failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
