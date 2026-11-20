const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');
const { publicTrack } = require('./tracks');

function cdsRouter({ Cd, Track }) {
  const router = express.Router();
  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });
  const fields = (body) => Object.fromEntries(['title', 'trackIds'].filter((key) => body?.[key] !== undefined).map((key) => [key, body[key]]));

  async function valid(input, res) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 60) {
      invalid(res, { title: 'Give the CD a name of 1 to 60 characters' });
      return false;
    }
    const ids = input.trackIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 30 || ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
      invalid(res, { trackIds: 'Choose 1 to 30 different track ids' });
      return false;
    }
    const found = await Track.find({ _id: { $in: ids } }).lean();
    const unknown = ids.filter((id) => !found.some((t) => t._id === id));
    if (unknown.length) {
      invalid(res, { trackIds: `Unknown tracks: ${unknown.join(', ')}` });
      return false;
    }
    return true;
  }

  async function publicCd(cd) {
    const tracks = await Track.find({ _id: { $in: cd.trackIds } }).lean();
    const byId = new Map(tracks.map((t) => [t._id, t]));
    return {
      code: cd.code, title: cd.title, official: cd.official, trackIds: [...cd.trackIds],
      tracks: cd.trackIds.filter((id) => byId.has(id)).map((id) => publicTrack(byId.get(id))),
      createdAt: cd.createdAt, updatedAt: cd.updatedAt,
    };
  }

  // Custom CDs are opened by their share code, rather than listed in the public shelf.
  router.get('/', async (req, res) => {
    const cds = await Cd.find({ official: true }).sort({ title: 1 }).lean();
    res.json(await Promise.all(cds.map(publicCd)));
  });
  router.get('/:code', async (req, res) => {
    const cd = await Cd.findOne({ code: req.params.code });
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    res.json(await publicCd(cd));
  });
  router.post('/', async (req, res) => {
    const input = fields(req.body);
    if (!(await valid(input, res))) return;
    const editKey = generateEditKey();
    for (let attempt = 0; attempt < 5; attempt++) {
      const cd = new Cd({ ...input, code: generateCode(), official: false, editKeyHash: hashEditKey(editKey) });
      try {
        await cd.save();
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
      return res.status(201).json({ cd: await publicCd(cd), editKey });
    }
    throw new Error('Could not find a free CD code');
  });

  async function customOnly(req, res, next) {
    const cd = await Cd.findOne({ code: req.params.code });
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    if (cd.official) return res.status(403).json({ error: 'Official CDs cannot be changed or deleted' });
    next();
  }
  router.put('/:code', customOnly, requireEditKey(Cd), async (req, res) => {
    const input = { title: req.doc.title, trackIds: [...req.doc.trackIds], ...fields(req.body) };
    if (!(await valid(input, res))) return;
    req.doc.set(input);
    await req.doc.save();
    res.json(await publicCd(req.doc));
  });
  router.delete('/:code', customOnly, requireEditKey(Cd), async (req, res) => {
    await Cd.deleteOne({ code: req.doc.code });
    res.status(204).end();
  });
  return router;
}

module.exports = cdsRouter;
