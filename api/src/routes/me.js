// Part of: Accounts: the signed-in person's own rooms and CDs, and claiming old ones. Client: api.js getMyRooms / getMyCds / claimMine.
// Uses: editKey.js.
// Used by: app.js.
const express = require('express');
const { keyMatches } = require('../utils/editKey');

const MAX_CLAIMS = 50;
const SHARE_CODE = /^[A-Za-z0-9_-]{1,64}$/;
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Every address here needs a login (requireAuth is applied in app.js) and only ever shows the caller's own things.
function meRouter({ Room, Cd }) {
  const router = express.Router();

  // GET /api/me/rooms <- client api.js getMyRooms (My rooms on any device)
  router.get('/rooms', async (req, res) => {
    const rooms = await Room.find({ owner: req.user.id }).sort({ updatedAt: -1 }).limit(200).lean();
    res.json(rooms.map((r) => ({ code: r.code, name: r.name, sceneSlug: r.sceneSlug, updatedAt: r.updatedAt })));
  });

  // GET /api/me/cds <- client api.js getMyCds
  router.get('/cds', async (req, res) => {
    const cds = await Cd.find({ owner: req.user.id, official: false }).sort({ updatedAt: -1 }).limit(200).lean();
    res.json(cds.map((c) => ({ code: c.code, title: c.title, look: c.look ? { hue: c.look.hue, cover: c.look.cover, disc: c.look.disc, font: c.look.font } : null, updatedAt: c.updatedAt })));
  });

  // POST /api/me/claim { rooms: [{ code, editKey }], cds: [{ code, editKey }] }: puts rooms and CDs that were saved as a guest on the account.
  // Each one needs its real edit key. Anything that is not claimed is listed with a reason, and nothing else changes. Safe to repeat.
  router.post('/claim', async (req, res) => {
    const body = req.body;
    if (!isPlainObject(body)) return res.status(400).json({ error: 'Validation failed', details: { body: 'The request body must be a JSON object' } });
    const lists = { room: Array.isArray(body.rooms) ? body.rooms : [], cd: Array.isArray(body.cds) ? body.cds : [] };
    if (lists.room.length + lists.cd.length > MAX_CLAIMS) {
      return res.status(400).json({ error: 'Validation failed', details: { body: `Claim at most ${MAX_CLAIMS} rooms and CDs at a time` } });
    }
    const models = { room: Room, cd: Cd };
    const claimed = [];
    const skipped = [];
    for (const type of ['room', 'cd']) {
      for (const entry of lists[type]) {
        const code = isPlainObject(entry) && typeof entry.code === 'string' ? entry.code : '';
        const skip = (reason) => skipped.push({ type, code: code.slice(0, 64), reason });
        if (!SHARE_CODE.test(code) || typeof entry.editKey !== 'string') {
          skip('invalid entry');
          continue;
        }
        const doc = await models[type].findOne({ code }).select('+editKeyHash');
        if (!doc) skip('not found');
        else if (doc.official) skip('official CDs cannot be claimed');
        else if (!keyMatches(entry.editKey, doc.editKeyHash)) skip('wrong edit key');
        else if (doc.owner && String(doc.owner) !== req.user.id) skip('already on another account');
        else {
          if (!doc.owner) {
            doc.owner = req.user.id;
            await doc.save();
          }
          claimed.push({ type, code });
        }
      }
    }
    res.json({ claimed, skipped });
  });

  return router;
}

module.exports = meRouter;
