// Part of: Saved rooms: save, open, change, delete. Client: api.js getRoom / createRoom / updateRoom / deleteRoom
//   (RoomScreen, SaveBar).
// Uses: editKey.js, musicSource.js, requireEditKey.js, roomItems.js, shareCode.js.
// Used by: app.js.
const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');
const { validateItems } = require('../utils/roomItems');
const { validateMusicFields } = require('../utils/musicSource');
const { cleanText } = require('../utils/cleanText');

const MAX_CODE_TRIES = 5;
const DUPLICATE_KEY = 11000; // MongoDB error: unique value already exists

// What we send back about a room. Listed field by field on purpose: editKeyHash (or any future field) can never leak.
function publicRoom(room, userId = null) {
  return {
    code: room.code,
    name: room.name,
    sceneSlug: room.sceneSlug,
    cdCode: room.cdCode,
    musicSource: room.musicSource ? { provider: room.musicSource.provider, url: room.musicSource.url } : null,
    settings: {
      effect: room.settings.effect,
      lightOn: room.settings.lightOn,
      curtainsClosed: room.settings.curtainsClosed,
      volume: room.settings.volume,
    },
    items: room.items ? room.items.map(({ id, key, x, y, scale, flip }) => ({ id, key, x, y, scale, flip })) : null,
    mine: Boolean(userId && room.owner && String(room.owner) === userId), // true when the signed-in caller owns it. Owner ids themselves are never sent.
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Whitelist of fields a visitor may set. code and editKeyHash are never among them. Settings are flattened to "settings.x" so a PUT changes only what it sends.
function editableFields(body) {
  if (!isPlainObject(body)) return {};
  const fields = {};
  for (const key of ['name', 'sceneSlug', 'cdCode', 'musicSource', 'items']) {
    if (body[key] !== undefined) fields[key] = key === 'name' ? cleanText(body.name) : body[key];
  }
  if (isPlainObject(body.settings)) {
    for (const key of ['effect', 'lightOn', 'curtainsClosed', 'volume']) {
      if (body.settings[key] !== undefined) fields[`settings.${key}`] = body.settings[key];
    }
  }
  return fields;
}

// POST /api/rooms (create, returns the edit key once), GET /:code (public), PUT /:code and DELETE /:code (need the x-edit-key header, or a login as the owner).
function roomsRouter({ Room, Scene }, { maxRooms = Infinity } = {}) {
  const router = express.Router();

  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });

  // Checks the scene exists and the items fit that scene. Sends the 400 itself and returns false if not.
  // sceneSlug = the scene the room will have AFTER the change.
  async function sceneAndItemsAreValid({ sceneSlug, items }, res) {
    if (sceneSlug === undefined) return true; // a new room without a scene fails the model's own check
    const scene = typeof sceneSlug === 'string' ? await Scene.findOne({ slug: sceneSlug }).lean() : null;
    if (!scene) {
      invalid(res, { sceneSlug: `Unknown scene "${sceneSlug}"` });
      return false;
    }
    const details = items === undefined || items === null ? null : validateItems(items, scene);
    if (details) invalid(res, details);
    return !details;
  }

  // items: null = back to the scene's default arrangement (stored as no items at all).
  function applyFields(room, { items, ...fields }) {
    room.set(fields);
    if (items !== undefined) room.items = items ?? undefined;
  }

  // Create a room. The reply holds the edit key: this is the only time it is shown.
  // POST /api/rooms <- client api.js createRoom <- RoomScreen saveNew (SaveBar: Save room / Save my own copy)
  router.post('/', async (req, res) => {
    if (req.body !== undefined && !isPlainObject(req.body)) return invalid(res, { body: 'The request body must be a JSON object' });
    const fields = editableFields(req.body ?? {});
    const musicError = validateMusicFields(fields);
    if (musicError) return invalid(res, { musicSource: musicError });
    if (!(await sceneAndItemsAreValid(fields, res))) return;
    // A safety net for the free database: when it holds this many rooms, no new ones are accepted.
    if ((await Room.estimatedDocumentCount()) >= maxRooms) return res.status(503).json({ error: 'The server is full right now. Please try again later.' });

    const editKey = generateEditKey();
    for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt++) {
      const room = new Room({ code: generateCode(), editKeyHash: hashEditKey(editKey), owner: req.user?.id ?? null }); // signed in: the room belongs to the account at once
      applyFields(room, fields);
      try {
        await room.save();
      } catch (err) {
        if (err.code === DUPLICATE_KEY) continue; // share code already taken: try another
        throw err;
      }
      return res.status(201).json({ room: publicRoom(room, req.user?.id), editKey });
    }
    throw new Error('Could not find a free room code');
  });

  // Public: anyone with the code can open a room.
  // GET /api/rooms/:code <- client api.js getRoom <- RoomScreen load (page /r/:code)
  router.get('/:code', async (req, res) => {
    const room = await Room.findOne({ code: req.params.code }).lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(publicRoom(room, req.user?.id));
  });

  // Partial update: send only what changes. Picking a CD clears the online music source (and the reverse).
  // Changing scene without sending items resets items, because old items belong to the old scene.
  // PUT /api/rooms/:code <- client api.js updateRoom <- RoomScreen persistChanges (SaveBar: Save changes, Copy link)
  router.put('/:code', requireEditKey(Room), async (req, res) => {
    if (req.body !== undefined && !isPlainObject(req.body)) return invalid(res, { body: 'The request body must be a JSON object' });
    const fields = editableFields(req.body ?? {});
    const musicError = validateMusicFields(fields);
    if (musicError) return invalid(res, { musicSource: musicError });
    if (fields.cdCode && fields.musicSource === undefined) fields.musicSource = null;
    const sceneSlug = fields.sceneSlug === undefined ? req.doc.sceneSlug : fields.sceneSlug;
    if (sceneSlug !== req.doc.sceneSlug && fields.items === undefined) fields.items = null; // the old items belong to the old scene
    if (fields.sceneSlug !== undefined || fields.items !== undefined) {
      if (!(await sceneAndItemsAreValid({ sceneSlug, items: fields.items }, res))) return;
    }

    applyFields(req.doc, fields);
    await req.doc.save();
    res.json(publicRoom(req.doc, req.user?.id));
  });

  // DELETE /api/rooms/:code <- client api.js deleteRoom <- RoomScreen removeRoom (SaveBar: Delete room)
  router.delete('/:code', requireEditKey(Room), async (req, res) => {
    await Room.deleteOne({ code: req.doc.code });
    res.status(204).end();
  });

  return router;
}

module.exports = roomsRouter;
