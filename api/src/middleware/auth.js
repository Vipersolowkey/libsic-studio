// Part of: Accounts: reads the login token and guards the pages that need an account or an admin.
// Uses: token.js, User.js.
// Used by: app.js.
const { verifyToken } = require('../utils/token');

// Three guards, built once with the secret and the User model:
//   optionalAuth  runs on every /api address. A good token for an account that still exists puts { id } in req.user; no token, a bad one,
//                 or one of a deleted account just means "guest".
//   requireAuth   401 unless req.user is set.
//   requireAdmin  401 without a login, 403 unless the account's role is admin. The role is read from the database on every call,
//                 never from the token, so removing someone's admin role takes effect at once.
// The token travels only in the Authorization header ("Bearer <token>"), never in a link, so it cannot end up in a log or a history.
function createAuth({ User, secret }) {
  async function optionalAuth(req, res, next) {
    const header = req.get('authorization') || '';
    const match = /^Bearer (\S+)$/.exec(header);
    const id = match ? verifyToken(match[1], secret) : null;
    // A good token is not enough: the account must still exist. Without this check, an account an admin deleted could keep
    // making rooms (owned by an account that is gone) until its token expires.
    const exists = id ? await User.findById(id).select('_id').lean() : null;
    req.user = exists ? { id } : null;
    next();
  }

  function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Sign in first' });
    next();
  }

  async function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Sign in first' });
    const user = await User.findById(req.user.id).select('role').lean();
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });
    next();
  }

  return { optionalAuth, requireAuth, requireAdmin };
}

module.exports = { createAuth };
