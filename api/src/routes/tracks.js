// Part of: Our own music: lists tracks. Client: api.js getTracks / getTrack (CdEditor "Our tracks").
// Used by: app.js, cds.js.
const express = require('express');

// GET /api/tracks and GET /api/tracks/:id. Read-only: tracks come from the seed script. src is a path on the client site.
function publicTrack(track) {
  return { id: track._id, title: track.title, artist: track.artist, src: track.src, duration: track.duration, license: track.license };
}

function tracksRouter(Track) {
  const router = express.Router();
  // GET /api/tracks <- client api.js getTracks <- CdEditor ("Our tracks" list)
  router.get('/', async (req, res) => {
    res.json((await Track.find().sort({ title: 1 }).lean()).map(publicTrack));
  });
  // GET /api/tracks/:id <- client api.js getTrack (not used by a page now)
  router.get('/:id', async (req, res) => {
    const track = await Track.findById(req.params.id).lean();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(publicTrack(track));
  });
  return router;
}

module.exports = { tracksRouter, publicTrack };
