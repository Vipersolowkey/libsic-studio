// Part of: CDs: create, open, edit, delete. Client: api.js getCds / getCd / createCd / updateCd / deleteCd (CdRow,
//   CdPage, MusicPage, CdEditor).
// Uses: editKey.js, musicSource.js, requireEditKey.js, shareCode.js, tracks.js.
// Used by: app.js.
const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');
const { publicTrack } = require('./tracks');
const { parseMusicSource } = require('../utils/musicSource');
const { cleanText } = require('../utils/cleanText');

// CDs: GET / (official shelf only), GET /:code, POST (create, returns the edit key once), PUT and DELETE (need x-edit-key; official CDs are locked).
const MAX_LINKS = 12;
const LOOK_RANGES = { hue: 359, cover: 3, disc: 3, font: 4 }; // highest allowed value of each look field

function cdsRouter({ Cd, Track }, { maxCds = Infinity } = {}) {
  const router = express.Router();
  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });
  // Keeps only the fields a visitor may send.
  const fields = (body) => Object.fromEntries(['title', 'trackIds', 'links', 'look'].filter((key) => body?.[key] !== undefined).map((key) => [key, key === 'title' ? cleanText(body.title) : body[key]]));

  // Full check of a CD (also used for PUT, after merging with the old values). Sends the 400 itself and returns false if invalid.
  // Rules: 1-60 char title, up to 30 distinct known track ids OR up to 12 links (not both, at least one), optional look.
  async function valid(input, res) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 60) {
      invalid(res, { title: 'Give the CD a name of 1 to 60 characters' });
      return false;
    }
    const ids = input.trackIds;
    if (!Array.isArray(ids) || ids.length > 30 || ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
      invalid(res, { trackIds: 'Choose up to 30 different track ids' });
      return false;
    }
    // Links are rewritten to their canonical form, like a room's music link.
    if (!Array.isArray(input.links) || input.links.length > MAX_LINKS) {
      invalid(res, { links: `Put up to ${MAX_LINKS} links on a CD` });
      return false;
    }
    const links = [];
    for (const entry of input.links) {
      try {
        links.push(parseMusicSource(typeof entry === 'string' ? entry : entry?.url));
      } catch (err) {
        invalid(res, { links: err.message });
        return false;
      }
    }
    if (new Set(links.map((l) => l.url)).size !== links.length) {
      invalid(res, { links: 'Each link can be on the CD only once' });
      return false;
    }
    if (!ids.length && !links.length) {
      invalid(res, { trackIds: 'Put at least one track or one link on the CD' });
      return false;
    }
    if (ids.length && links.length) {
      invalid(res, { links: 'A CD holds our tracks or online links, not both' });
      return false;
    }
    input.links = links;
    const look = input.look;
    if (look !== null && look !== undefined && (typeof look !== 'object' || Array.isArray(look)
      || Object.entries(LOOK_RANGES).some(([key, max]) => !Number.isInteger(look[key]) || look[key] < 0 || look[key] > max))) {
      invalid(res, { look: 'The look needs a hue (0-359), a cover (0-3), a disc (0-3) and a lettering (0-4)' });
      return false;
    }
    input.look = look ? Object.fromEntries(Object.keys(LOOK_RANGES).map((key) => [key, look[key]])) : undefined;
    const found = ids.length ? await Track.find({ _id: { $in: ids } }).lean() : [];
    const unknown = ids.filter((id) => !found.some((t) => t._id === id));
    if (unknown.length) {
      invalid(res, { trackIds: `Unknown tracks: ${unknown.join(', ')}` });
      return false;
    }
    return true;
  }

  // Public shape of a CD, with its tracks filled in (tracks that no longer exist are skipped).
  async function publicCd(cd, userId = null) {
    const tracks = await Track.find({ _id: { $in: cd.trackIds } }).lean();
    const byId = new Map(tracks.map((t) => [t._id, t]));
    return {
      code: cd.code, title: cd.title, official: cd.official, trackIds: [...cd.trackIds],
      mine: Boolean(userId && cd.owner && String(cd.owner) === userId), // true when the signed-in caller owns it
      links: (cd.links || []).map((l) => ({ provider: l.provider, url: l.url })),
      look: cd.look ? { hue: cd.look.hue, cover: cd.look.cover, disc: cd.look.disc, font: cd.look.font } : null,
      tracks: cd.trackIds.filter((id) => byId.has(id)).map((id) => publicTrack(byId.get(id))),
      createdAt: cd.createdAt, updatedAt: cd.updatedAt,
    };
  }

  // The list shows official CDs only. Custom CDs are reached by share code.
  // GET /api/cds <- client api.js getCds <- CdRow (the official CDs in the tower)
  router.get('/', async (req, res) => {
    const cds = await Cd.find({ official: true }).sort({ title: 1 }).lean();
    res.json(await Promise.all(cds.map((cd) => publicCd(cd))));
  });
  // GET /api/cds/:code <- client api.js getCd <- CdPage, and RoomScreen when a room has a CD
  router.get('/:code', async (req, res) => {
    const cd = await Cd.findOne({ code: req.params.code });
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    res.json(await publicCd(cd, req.user?.id));
  });
  // POST /api/cds <- client api.js createCd <- MusicPage (CD workshop: Create CD)
  router.post('/', async (req, res) => {
    const input = { links: [], trackIds: [], ...fields(req.body) };
    if (!(await valid(input, res))) return;
    // A safety net for the free database: when it holds this many CDs, no new ones are accepted.
    if ((await Cd.estimatedDocumentCount()) >= maxCds) return res.status(503).json({ error: 'The server is full right now. Please try again later.' });
    const editKey = generateEditKey();
    for (let attempt = 0; attempt < 5; attempt++) {
      const cd = new Cd({ ...input, code: generateCode(), official: false, editKeyHash: hashEditKey(editKey), owner: req.user?.id ?? null });
      try {
        await cd.save();
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
      return res.status(201).json({ cd: await publicCd(cd, req.user?.id), editKey });
    }
    throw new Error('Could not find a free CD code');
  });

  // Runs before requireEditKey: stops edits to official CDs (403).
  async function customOnly(req, res, next) {
    const cd = await Cd.findOne({ code: req.params.code });
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    if (cd.official) return res.status(403).json({ error: 'Official CDs cannot be changed or deleted' });
    next();
  }
  // PUT /api/cds/:code <- client api.js updateCd <- CdPage save (edit key needed)
  router.put('/:code', customOnly, requireEditKey(Cd), async (req, res) => {
    const input = { title: req.doc.title, trackIds: [...req.doc.trackIds], links: (req.doc.links || []).map((l) => ({ url: l.url })), look: req.doc.look ?? null, ...fields(req.body) };
    if (!(await valid(input, res))) return;
    req.doc.set(input);
    await req.doc.save();
    res.json(await publicCd(req.doc, req.user?.id));
  });
  // DELETE /api/cds/:code <- client api.js deleteCd <- CdPage remove (edit key needed)
  router.delete('/:code', customOnly, requireEditKey(Cd), async (req, res) => {
    await Cd.deleteOne({ code: req.doc.code });
    res.status(204).end();
  });
  return router;
}

module.exports = cdsRouter;
