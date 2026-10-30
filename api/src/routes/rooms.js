const express = require('express');
const requireEditKey = require('../middleware/requireEditKey');
const { generateEditKey, hashEditKey } = require('../utils/editKey');
const { generateCode } = require('../utils/shareCode');
const { validateItems } = require('../utils/roomItems');

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
    items: room.items ? room.items.map(({ id, key, x, y, scale, flip }) => ({ id, key, x, y, scale, flip })) : null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

// Picks only the fields a visitor may set. The code and the edit key hash are never among them.
function editableFields(body) {
  const fields = {};
  for (const key of ['name', 'sceneSlug', 'cdCode', 'items']) {
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

  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });

  // Checks the scene name and the items against that scene, and sends a 400 if either is wrong.
  // Returns true when the request may go on. sceneSlug is the scene the room will have after the change.
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

  // null means "back to the default arrangement", which the model stores as no items at all.
  function applyFields(room, { items, ...fields }) {
    room.set(fields);
    if (items !== undefined) room.items = items ?? undefined;
  }

  // Save a new room. The reply contains the edit key, and this is the only time it is shown.
  router.post('/', async (req, res) => {
    const fields = editableFields(req.body ?? {});
    if (!(await sceneAndItemsAreValid(fields, res))) return;

    const editKey = generateEditKey();
    for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt++) {
      const room = new Room({ code: generateCode(), editKeyHash: hashEditKey(editKey) });
      applyFields(room, fields);
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
    const sceneSlug = fields.sceneSlug === undefined ? req.doc.sceneSlug : fields.sceneSlug;
    if (sceneSlug !== req.doc.sceneSlug && fields.items === undefined) fields.items = null; // the old items belong to the old scene
    if (fields.sceneSlug !== undefined || fields.items) {
      if (!(await sceneAndItemsAreValid({ sceneSlug, items: fields.items }, res))) return;
    }

    applyFields(req.doc, fields);
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
