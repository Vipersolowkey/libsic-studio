// Part of: Scenes: lists scenes and sends one whole scene. Client: api.js getScenes / getScene (RoomScreen).
// Used by: app.js.
const express = require('express');

// GET /api/scenes (menu) and GET /api/scenes/:slug (one full scene). Read-only: scenes come from the seed script.
// Scene is passed in so tests can use a fake model.
function scenesRouter(Scene) {
  const router = express.Router();

  // Hides MongoDB's internal fields.
  const hidden = '-_id -__v';

  // The list sends only these 3 fields: a full scene is ~30 KB. The client fetches the full one by slug when a room opens.
  const summary = { _id: 0, slug: 1, name: 1, description: 1 };

  // GET /api/scenes <- client api.js getScenes <- RoomScreen (menu of rooms: slug, name, description only)
  router.get('/', async (req, res) => {
    const scenes = await Scene.find({}, summary).sort({ name: 1 }).lean();
    res.json(scenes);
  });

  // GET /api/scenes/:slug <- client api.js getScene <- RoomScreen wholeScene (the full scene when a room is opened)
  router.get('/:slug', async (req, res) => {
    const scene = await Scene.findOne({ slug: req.params.slug }, hidden).lean();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    res.json(scene);
  });

  return router;
}

module.exports = scenesRouter;
