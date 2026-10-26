const express = require('express');

// Read-only scene addresses. Scenes are created by the seed script, not by users.
// "Scene" is passed in (instead of required here) so tests can give it a pretend database.
function scenesRouter(Scene) {
  const router = express.Router();

  // "-_id -__v" hides MongoDB's internal fields, which the website does not need.
  const hidden = '-_id -__v';

  router.get('/', async (req, res) => {
    const scenes = await Scene.find({}, hidden).sort({ name: 1 }).lean();
    res.json(scenes);
  });

  router.get('/:slug', async (req, res) => {
    const scene = await Scene.findOne({ slug: req.params.slug }, hidden).lean();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    res.json(scene);
  });

  return router;
}

module.exports = scenesRouter;
