const { keyMatches } = require('../utils/editKey');

// Protects PUT and DELETE addresses like /api/rooms/:code. Works for any model that has a
// "code" and an "editKeyHash" (rooms now, CDs later). Use it like this:
//   router.put('/:code', requireEditKey(Room), handler)
// The visitor sends the secret in the x-edit-key header. If everything is right, the
// document is available to the handler as req.doc.
//   404 = no such room, 401 = no key sent, 403 = wrong key
function requireEditKey(Model) {
  return async (req, res, next) => {
    const doc = await Model.findOne({ code: req.params.code }).select('+editKeyHash');
    if (!doc) return res.status(404).json({ error: `${Model.modelName} not found` });

    const key = req.get('x-edit-key');
    if (!key) return res.status(401).json({ error: 'Send the edit key in the x-edit-key header' });
    if (!keyMatches(key, doc.editKeyHash)) return res.status(403).json({ error: 'Wrong edit key' });

    req.doc = doc;
    next();
  };
}

module.exports = requireEditKey;
