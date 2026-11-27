// Part of: Admin: a small set of addresses for the admin page (/admin): numbers, and removing spam rooms and CDs.
// Used by: app.js.
const crypto = require('crypto');
const express = require('express');
const { parseMusicSource } = require('../utils/musicSource');
const { cleanText } = require('../utils/cleanText');

const PAGE_SIZE = 20;
const SHARE_CODE = /^[A-Za-z0-9_-]{1,64}$/;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const day = 24 * 60 * 60 * 1000;

// Every address here sits behind requireAdmin (applied in app.js): 401 without a login, 403 for a normal account.
// What an admin may do (what people make is private to them):
//   - accounts: look, and delete one (its rooms and CDs go with it). The username must be typed again to confirm.
//   - rooms and CDs that belong to an account: look only. To remove them the admin deletes the account.
//   - rooms and CDs made by guests (no account): delete, because nobody could ever remove them otherwise.
//   - the studio's own music (the official CDs): add and remove tracks.
// Each delete is written to the server log.
function adminRouter({ Room, Cd, User, Track }) {
  const router = express.Router();

  // The page number from ?page=, at least 1. The search text from ?q=, cut to 60 characters and used as plain text (never as a pattern).
  const pageOf = (req) => Math.max(1, Math.min(1000, parseInt(req.query.page, 10) || 1));
  const searchOf = (req) => (typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '');
  // Scene slugs from ?scenes=a,b (at most 10, letters, digits and dashes only). The page sends the scenes whose NAME contains what was typed
  // ("clam" finds Clam Cove, which a room stores as its slug), so a part of a scene name finds its rooms too.
  const scenesOf = (req) => (typeof req.query.scenes === 'string' ? req.query.scenes.split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,60}$/i.test(s)).slice(0, 10) : []);

  // GET /api/admin/stats: totals taken from our own database.
  router.get('/stats', async (req, res) => {
    const since = new Date(Date.now() - 7 * day);
    const [accounts, accountsThisWeek, rooms, roomsThisWeek, customCds, officialCds, perScene] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: since } }),
      Room.countDocuments({}),
      Room.countDocuments({ createdAt: { $gte: since } }),
      Cd.countDocuments({ official: false }),
      Cd.countDocuments({ official: true }),
      Room.aggregate([{ $group: { _id: '$sceneSlug', rooms: { $sum: 1 } } }, { $sort: { rooms: -1 } }]),
    ]);
    res.json({ accounts, accountsThisWeek, rooms, roomsThisWeek, customCds, officialCds, roomsPerScene: perScene.map((s) => ({ sceneSlug: s._id, rooms: s.rooms })) });
  });

  // GET /api/admin/rooms?q=&scenes=&page= : q is looked for anywhere in the room name, the scene slug and the owner's username, and at the start of the share code.
  // scenes (slugs) adds the rooms of those scenes.
  router.get('/rooms', async (req, res) => {
    const q = searchOf(req);
    const page = pageOf(req);
    let filter = {};
    if (q) {
      const text = new RegExp(escapeRegex(q), 'i');
      const owners = await User.find({ username: text }).select('_id').limit(50).lean();
      filter = {
        $or: [
          { name: text },
          { code: new RegExp(`^${escapeRegex(q)}`, 'i') },
          { sceneSlug: text },
          ...(scenesOf(req).length ? [{ sceneSlug: { $in: scenesOf(req) } }] : []),
          ...(owners.length ? [{ owner: { $in: owners.map((u) => u._id) } }] : []),
        ],
      };
    }
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

  // DELETE /api/admin/rooms/:code : only a guest's room (no owner). A room that belongs to an account answers 403.
  router.delete('/rooms/:code', async (req, res) => {
    if (!SHARE_CODE.test(req.params.code)) return res.status(404).json({ error: 'Room not found' });
    const room = await Room.findOne({ code: req.params.code }).select('owner').lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.owner) return res.status(403).json({ error: 'This room belongs to an account. Delete the account to remove it.' });
    const { deletedCount } = await Room.deleteOne({ code: req.params.code, owner: null });
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

  // DELETE /api/admin/cds/:code : only a guest's CD. Official CDs and CDs that belong to an account cannot be deleted here.
  router.delete('/cds/:code', async (req, res) => {
    if (!SHARE_CODE.test(req.params.code)) return res.status(404).json({ error: 'CD not found' });
    const cd = await Cd.findOne({ code: req.params.code, official: false }).select('owner').lean();
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    if (cd.owner) return res.status(403).json({ error: 'This CD belongs to an account. Delete the account to remove it.' });
    const { deletedCount } = await Cd.deleteOne({ code: req.params.code, official: false, owner: null });
    if (!deletedCount) return res.status(404).json({ error: 'CD not found' });
    console.log(`admin ${req.user.id} deleted CD ${req.params.code}`);
    res.status(204).end();
  });

  // GET /api/admin/users?q=&page= : accounts with how many rooms each has. q is looked for in the username and the display name. Never any password data.
  router.get('/users', async (req, res) => {
    const q = searchOf(req);
    const page = pageOf(req);
    const text = q ? new RegExp(escapeRegex(q), 'i') : null;
    const filter = text ? { $or: [{ username: text }, { displayName: text }] } : {};
    const [total, users] = await Promise.all([User.countDocuments(filter), User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
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

  // DELETE /api/admin/users/:username?confirm=<the same username> : deletes the account with all its rooms and CDs.
  // Refused for yourself and for other admins. Returns how many rooms and CDs went with it.
  router.delete('/users/:username', async (req, res) => {
    const username = String(req.params.username).toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(404).json({ error: 'Account not found' });
    const person = await User.findOne({ username }).select('role').lean();
    if (!person) return res.status(404).json({ error: 'Account not found' });
    if (String(person._id) === String(req.user.id)) return res.status(403).json({ error: 'You cannot delete your own account here' });
    if (person.role === 'admin') return res.status(403).json({ error: 'An admin account cannot be deleted here' });
    if (String(req.query.confirm ?? '').toLowerCase() !== username) return res.status(400).json({ error: 'Type the username to confirm' });
    const [rooms, cds] = await Promise.all([Room.deleteMany({ owner: person._id }), Cd.deleteMany({ owner: person._id, official: false })]);
    await User.deleteOne({ _id: person._id, role: 'user' });
    console.log(`admin ${req.user.id} deleted account ${person._id} (${rooms.deletedCount} rooms, ${cds.deletedCount} CDs)`);
    res.json({ deletedRooms: rooms.deletedCount, deletedCds: cds.deletedCount });
  });

  // ----- The studio's own music: the official CDs and their tracks ----- //
  const MAX_TRACKS = 30;
  const shownTrack = (t) => ({ id: t._id, title: t.title, artist: t.artist, duration: t.duration });

  // GET /api/admin/music : every official CD with its tracks in play order.
  router.get('/music', async (req, res) => {
    const cds = await Cd.find({ official: true }).sort({ title: 1 }).lean();
    const ids = [...new Set(cds.flatMap((c) => c.trackIds))];
    const tracks = ids.length ? await Track.find({ _id: { $in: ids } }).lean() : [];
    const byId = new Map(tracks.map((t) => [t._id, t]));
    res.json({ cds: cds.map((c) => ({ code: c.code, title: c.title, tracks: c.trackIds.map((id) => byId.get(id)).filter(Boolean).map(shownTrack) })) });
  });

  // POST /api/admin/music/:code/tracks { title, artist, url, duration } : adds a track at the end of an official CD.
  // url is the https link of an audio file (mp3 m4a ogg wav aac); duration is in seconds.
  router.post('/music/:code/tracks', async (req, res) => {
    const bad = (details) => res.status(400).json({ error: 'Validation failed', details });
    if (!SHARE_CODE.test(req.params.code)) return res.status(404).json({ error: 'CD not found' });
    const cd = await Cd.findOne({ code: req.params.code, official: true }).lean();
    if (!cd) return res.status(404).json({ error: 'CD not found' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const title = cleanText(body.title);
    const artist = cleanText(body.artist);
    if (typeof title !== 'string' || !title || title.length > 80) return bad({ title: 'Give the track a title of 1 to 80 characters' });
    if (typeof artist !== 'string' || !artist || artist.length > 60) return bad({ artist: 'Give the artist a name of 1 to 60 characters' });
    const seconds = Number(body.duration);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 6 * 60 * 60) return bad({ duration: 'Give the length in seconds (1 to 21600)' });
    let source;
    try {
      source = parseMusicSource(body.url);
    } catch (err) {
      return bad({ url: err.message });
    }
    if (source.provider !== 'audio') return bad({ url: 'Use the https link of an audio file (mp3, m4a, ogg, wav or aac)' });
    if (cd.trackIds.length >= MAX_TRACKS) return bad({ trackIds: `A CD holds up to ${MAX_TRACKS} tracks` });
    const id = `added-${crypto.randomBytes(5).toString('hex')}`;
    const track = await Track.create({ _id: id, title, artist, src: source.url, duration: seconds, license: 'Added by an admin' });
    await Cd.updateOne({ code: cd.code, official: true }, { $push: { trackIds: id } });
    console.log(`admin ${req.user.id} added track ${id} to CD ${cd.code}`);
    res.status(201).json(shownTrack(track));
  });

  // DELETE /api/admin/music/:code/tracks/:id : takes a track off an official CD (the last track stays). The track itself is
  // deleted too unless another CD still uses it.
  router.delete('/music/:code/tracks/:id', async (req, res) => {
    if (!SHARE_CODE.test(req.params.code) || !SHARE_CODE.test(req.params.id)) return res.status(404).json({ error: 'Track not found' });
    const cd = await Cd.findOne({ code: req.params.code, official: true }).lean();
    if (!cd || !cd.trackIds.includes(req.params.id)) return res.status(404).json({ error: 'Track not found' });
    if (cd.trackIds.length <= 1) return res.status(400).json({ error: 'A CD needs at least one track' });
    await Cd.updateOne({ code: cd.code, official: true }, { $pull: { trackIds: req.params.id } });
    if (!(await Cd.countDocuments({ trackIds: req.params.id }))) await Track.deleteOne({ _id: req.params.id });
    console.log(`admin ${req.user.id} removed track ${req.params.id} from CD ${cd.code}`);
    res.status(204).end();
  });

  return router;
}

module.exports = adminRouter;
