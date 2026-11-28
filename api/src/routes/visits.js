const crypto = require('crypto');
const express = require('express');

const PAGES = ['home', 'new', 'room', 'cd', 'music', 'other', 'scene'];
const DUPLICATE_KEY = 11000;
const today = () => new Date().toISOString().slice(0, 10);

// Counting visits without cookies, accounts or stored addresses.
//   POST /api/visits  { page, scene? }   the website calls it when a page opens (the visitor sees nothing)
//   GET  /api/stats?days=7                the totals, only for whoever knows STATS_TOKEN
// The visitor mark is a hash that changes every day, so nobody can be followed from one day to the next.
function visitsRouter({ Scene, DailyStat, DailyVisitor }, { statsToken = process.env.STATS_TOKEN, salt = process.env.STATS_SALT || crypto.randomBytes(16).toString('hex'), now = today } = {}) {
  const router = express.Router();

  const markOf = (req, day) => crypto.createHash('sha256').update(`${salt}|${day}|${req.ip}|${req.get('user-agent') || ''}`).digest('hex');

  router.post('/visits', async (req, res) => {
    // "Do Not Track" and "Global Privacy Control" are respected: nothing is counted.
    if (req.get('dnt') === '1' || req.get('sec-gpc') === '1') return res.status(204).end();
    const { page, scene } = req.body ?? {};
    if (!PAGES.includes(page)) return res.status(400).json({ error: 'Validation failed', details: { page: `Use one of: ${PAGES.join(', ')}` } });

    // Only scenes that really exist are counted, so nobody can fill the database with made-up names.
    const sceneSlug = page === 'scene' && typeof scene === 'string' && scene.length <= 60 && (await Scene.exists({ slug: scene })) ? scene : '';
    if (page === 'scene' && !sceneSlug) return res.status(204).end();

    const day = now();
    await DailyStat.updateOne({ day, page, scene: sceneSlug }, { $inc: { views: 1 } }, { upsert: true });
    try {
      await DailyVisitor.create({ day, mark: markOf(req, day) });
      await DailyStat.updateOne({ day, page: '_all', scene: '' }, { $inc: { visitors: 1 } }, { upsert: true });
    } catch (err) {
      if (err.code !== DUPLICATE_KEY) throw err; // already counted today
    }
    res.status(204).end();
  });

  router.get('/stats', async (req, res) => {
    if (!statsToken) return res.status(404).json({ error: 'Not found' }); // switched off until a token is set
    const sent = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1] || '';
    const a = crypto.createHash('sha256').update(sent).digest();
    const b = crypto.createHash('sha256').update(statsToken).digest();
    if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Send the stats token as "Authorization: Bearer <token>"' });

    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const rows = await DailyStat.find({ day: { $gte: since } }).sort({ day: -1 }).lean();
    const byDay = new Map();
    for (const row of rows) {
      const entry = byDay.get(row.day) || { day: row.day, visitors: 0, pages: {}, scenes: {} };
      if (row.page === '_all') entry.visitors = row.visitors;
      else if (row.page === 'scene') entry.scenes[row.scene] = row.views;
      else entry.pages[row.page] = row.views;
      byDay.set(row.day, entry);
    }
    res.json({ days: [...byDay.values()] });
  });

  return router;
}

module.exports = visitsRouter;
