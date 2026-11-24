const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');
const { publicTrack } = require('./tracks');
const { parseMusicSource } = require('../utils/musicSource');

const MAX_LINKS = 12;
const LOOK_RANGES = { hue: 359, cover: 3, disc: 3, font: 4 };

function cdsRouter({ Cd, Track }) {
  const router = express.Router();
  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });
  const fields = (body) => Object.fromEntries(['title', 'trackIds', 'links', 'look'].filter((key) => body?.[key] !== undefined).map((key) => [key, body[key]]));

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
    // Links are checked and written in their canonical form, the same way a room's music link is.
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

  async function publicCd(cd) {
    const tracks = await Track.find({ _id: { $in: cd.trackIds } }).lean();
    const byId = new Map(tracks.map((t) => [t._id, t]));
    return {
      code: cd.code, title: cd.title, official: cd.official, trackIds: [...cd.trackIds],
      links: (cd.links || []).map((l) => ({ provider: l.provider, url: l.url })),
      look: cd.look ? { hue: cd.look.hue, cover: cd.look.cover, disc: cd.look.disc, font: cd.look.font } : null,
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
    const input = { links: [], trackIds: [], ...fields(req.body) };
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
    const input = { title: req.doc.title, trackIds: [...req.doc.trackIds], links: (req.doc.links || []).map((l) => ({ url: l.url })), look: req.doc.look ?? null, ...fields(req.body) };
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
