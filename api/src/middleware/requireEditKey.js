// Part of: Security: the ownership check in front of every change to a room or CD (edit key, or the signed-in owner).
// Uses: editKey.js.
// Used by: cds.js, rooms.js.
const { keyMatches } = require('../utils/editKey');

// Guards PUT/DELETE on /:code for any model with "code" + "editKeyHash" (rooms, CDs):
//   router.put('/:code', requireEditKey(Room), handler)
// Two ways in, either is enough: the signed-in account that owns the document (req.user is set by the login token), or the secret
// in the x-edit-key header. On success the document is in req.doc.
// 404 = no such document, 401 = no key sent, 403 = wrong key.
function requireEditKey(Model) {
  return async (req, res, next) => {
    const doc = await Model.findOne({ code: req.params.code }).select('+editKeyHash');
    if (!doc) return res.status(404).json({ error: `${Model.modelName} not found` });

    if (req.user && doc.owner && String(doc.owner) === req.user.id) {
      req.doc = doc;
      return next();
    }

    const key = req.get('x-edit-key');
    if (!key) return res.status(401).json({ error: 'Send the edit key in the x-edit-key header' });
    if (!keyMatches(key, doc.editKeyHash)) return res.status(403).json({ error: 'Wrong edit key' });

    req.doc = doc;
    next();
  };
}

module.exports = requireEditKey;
