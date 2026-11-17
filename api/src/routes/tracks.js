const express = require('express');

function publicTrack(track) {
  return { id: track._id, title: track.title, artist: track.artist, src: track.src, duration: track.duration, license: track.license };
}

function tracksRouter(Track) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    res.json((await Track.find().sort({ title: 1 }).lean()).map(publicTrack));
  });
  router.get('/:id', async (req, res) => {
    const track = await Track.findById(req.params.id).lean();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(publicTrack(track));
  });
  return router;
}

module.exports = { tracksRouter, publicTrack };
