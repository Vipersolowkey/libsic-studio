// Part of: Admin: a small set of addresses for the admin page (/admin): numbers, and removing spam rooms and CDs.
// Used by: app.js.
const express = require('express');

const PAGE_SIZE = 20;
const SHARE_CODE = /^[A-Za-z0-9_-]{1,64}$/;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const day = 24 * 60 * 60 * 1000;

// Every address here sits behind requireAdmin (applied in app.js): 401 without a login, 403 for a normal account.
// An admin can look and delete, never edit somebody else's room. Each delete is written to the server log.
function adminRouter({ Room, Cd, User }) {
  const router = express.Router();

  // The page number from ?page=, at least 1. The search text from ?q=, cut to 60 characters and used as plain text (never as a pattern).
  const pageOf = (req) => Math.max(1, Math.min(1000, parseInt(req.query.page, 10) || 1));
  const searchOf = (req) => (typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '');

  // GET /api/admin/stats: totals taken from our own database.
  router.get('/stats', async (req, res) => {
    const since = new Date(Date.now() - 7 * day);
    const [accounts, rooms, roomsThisWeek, customCds, officialCds, perScene] = await Promise.all([
      User.countDocuments({}),
      Room.countDocuments({}),
      Room.countDocuments({ createdAt: { $gte: since } }),
      Cd.countDocuments({ official: false }),
      Cd.countDocuments({ official: true }),
      Room.aggregate([{ $group: { _id: '$sceneSlug', rooms: { $sum: 1 } } }, { $sort: { rooms: -1 } }]),
    ]);
    res.json({ accounts, rooms, roomsThisWeek, customCds, officialCds, roomsPerScene: perScene.map((s) => ({ sceneSlug: s._id, rooms: s.rooms })) });
  });

  // GET /api/admin/rooms?q=&page=
  router.get('/rooms', async (req, res) => {
    const q = searchOf(req);
    const page = pageOf(req);
    const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { code: new RegExp(`^${escapeRegex(q)}`, 'i') }] } : {};
    const [total, rooms] = await Promise.all([
      Room.countDocuments(filter),
      Room.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    ]);
    const ownerIds = [...new Set(rooms.filter((r) => r.owner).map((r) => String(r.owner)))];
    const owners = ownerIds.length ? await User.find({ _id: { $in: ownerIds } }).select('username').lean() : [];
    const nameOf = new Map(owners.map((u) => [String(u._id), u.username]));
    res.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rooms.map((r) => ({ code: r.code, name: r.name, sceneSlug: r.sceneSlug, owner: r.owner ? nameOf.get(String(r.owner)) ?? null : null, updatedAt: r.updatedAt })),
    });
  });

  // DELETE /api/admin/rooms/:code
  router.delete('/rooms/:code', async (req, res) => {
    if (!SHARE_CODE.test(req.params.code)) return res.status(404).json({ error: 'Room not found' });
    const { deletedCount } = await Room.deleteOne({ code: req.params.code });
    if (!deletedCount) return res.status(404).json({ error: 'Room not found' });
    console.log(`admin ${req.user.id} deleted room ${req.params.code}`);
    res.status(204).end();
  });

  // GET /api/admin/cds?q=&page= : custom CDs only (the official ones are ours).
  router.get('/cds', async (req, res) => {
    const q = searchOf(req);
    const page = pageOf(req);
    const filter = { official: false, ...(q ? { $or: [{ title: new RegExp(escapeRegex(q), 'i') }, { code: new RegExp(`^${escapeRegex(q)}`, 'i') }] } : {}) };
    const [total, cds] = await Promise.all([
      Cd.countDocuments(filter),
      Cd.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    ]);
    res.json({ total, page, pageSize: PAGE_SIZE, items: cds.map((c) => ({ code: c.code, title: c.title, owned: Boolean(c.owner), updatedAt: c.updatedAt })) });
  });

  // DELETE /api/admin/cds/:code : official CDs cannot be deleted.
  router.delete('/cds/:code', async (req, res) => {
    if (!SHARE_CODE.test(req.params.code)) return res.status(404).json({ error: 'CD not found' });
    const { deletedCount } = await Cd.deleteOne({ code: req.params.code, official: false });
    if (!deletedCount) return res.status(404).json({ error: 'CD not found' });
    console.log(`admin ${req.user.id} deleted CD ${req.params.code}`);
    res.status(204).end();
  });

  // GET /api/admin/users?page= : accounts with how many rooms each has. Never any password data.
  router.get('/users', async (req, res) => {
    const page = pageOf(req);
    const [total, users] = await Promise.all([User.countDocuments({}), User.find({}).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
    const ids = users.map((u) => u._id);
    const counts = ids.length ? await Room.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', rooms: { $sum: 1 } } }]) : [];
    const roomsOf = new Map(counts.map((c) => [String(c._id), c.rooms]));
    res.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      items: users.map((u) => ({ username: u.username, displayName: u.displayName || '', role: u.role, createdAt: u.createdAt, rooms: roomsOf.get(String(u._id)) ?? 0 })),
    });
  });

  return router;
}

module.exports = adminRouter;
