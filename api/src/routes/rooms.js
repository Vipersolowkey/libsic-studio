const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');

const MAX_CODE_TRIES = 5;
const DUPLICATE_KEY = 11000; // MongoDB's error number for "this unique value already exists"

// What we send back about a room. It is written out field by field so that the edit key hash
// (or any field added to the model later) can never leak by accident.
function publicRoom(room) {
  return {
    code: room.code,
    name: room.name,
    sceneSlug: room.sceneSlug,
    cdCode: room.cdCode,
    settings: { effect: room.settings.effect, lightOn: room.settings.lightOn, volume: room.settings.volume },
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

// Picks only the fields a visitor may set. The code and the edit key hash are never among them.
function editableFields(body) {
  const fields = {};
  for (const key of ['name', 'sceneSlug', 'cdCode']) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.settings && typeof body.settings === 'object') {
    for (const key of ['effect', 'lightOn', 'volume']) {
      if (body.settings[key] !== undefined) fields[`settings.${key}`] = body.settings[key];
    }
  }
  return fields;
}

function roomsRouter({ Room, Scene }) {
  const router = express.Router();

  // Sends a 400 and returns true when the scene name does not exist.
  async function unknownScene(sceneSlug, res) {
    if (sceneSlug === undefined) return false;
    if (typeof sceneSlug === 'string' && (await Scene.exists({ slug: sceneSlug }))) return false;
    res.status(400).json({ error: 'Validation failed', details: { sceneSlug: `Unknown scene "${sceneSlug}"` } });
    return true;
  }

  // Save a new room. The reply contains the edit key, and this is the only time it is shown.
  router.post('/', async (req, res) => {
    const fields = editableFields(req.body ?? {});
    if (await unknownScene(fields.sceneSlug, res)) return;

    const editKey = generateEditKey();
    for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt++) {
      const room = new Room({ code: generateCode(), editKeyHash: hashEditKey(editKey) });
      room.set(fields);
      try {
        await room.save();
      } catch (err) {
        if (err.code === DUPLICATE_KEY) continue; // that code is taken, so try another one
        throw err;
      }
      return res.status(201).json({ room: publicRoom(room), editKey });
    }
    throw new Error('Could not find a free room code');
  });

  // Anyone with the code can open a room.
  router.get('/:code', async (req, res) => {
    const room = await Room.findOne({ code: req.params.code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(publicRoom(room));
  });

  // Change a room. Send only the fields you want to change.
  router.put('/:code', requireEditKey(Room), async (req, res) => {
    const fields = editableFields(req.body ?? {});
    if (await unknownScene(fields.sceneSlug, res)) return;

    req.doc.set(fields);
    await req.doc.save();
    res.json(publicRoom(req.doc));
  });

  router.delete('/:code', requireEditKey(Room), async (req, res) => {
    await Room.deleteOne({ code: req.doc.code });
    res.status(204).end();
  });

  return router;
}

module.exports = roomsRouter;
