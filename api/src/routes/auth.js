// Part of: Accounts: sign up, sign in, and the person's own profile. Client: api.js register / login / getMe / updateMe.
// Uses: password.js, token.js, userRules.js, authLimits.js.
// Used by: app.js.
const express = require('express');
const { hashPassword, verifyPassword, dummyHash } = require('../utils/password');
const { signToken } = require('../utils/token');
const { normalizeUsername, usernameProblem, passwordProblem, displayNameProblem, cleanText } = require('../utils/userRules');

const DUPLICATE_KEY = 11000; // MongoDB error: unique value already exists
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// What we send back about a person. Listed field by field on purpose: passwordHash and the id can never leak.
function publicUser(user) {
  return { username: user.username, displayName: user.displayName || '', avatarHue: user.avatarHue, role: user.role, createdAt: user.createdAt };
}

// POST /register and /login answer { token, user }. The website keeps the token and sends it as "Authorization: Bearer <token>".
function authRouter({ User }, { secret, throttle, requireAuth }) {
  const router = express.Router();
  const invalid = (res, details) => res.status(400).json({ error: 'Validation failed', details });
  const issue = (user) => ({ token: signToken(user._id, secret), user: publicUser(user) });

  // Both fields must be real text. An object such as {"$gt": ""} would otherwise be understood by the database as a query.
  const credentials = (body) => (isPlainObject(body) && typeof body.username === 'string' && typeof body.password === 'string' ? body : null);

  // POST /api/auth/register <- client api.js register <- LoginPage (Create account)
  router.post('/register', async (req, res) => {
    const body = credentials(req.body);
    if (!body) return invalid(res, { body: 'Send a username and a password as text' });
    const username = normalizeUsername(body.username);
    const details = {};
    const usernameError = usernameProblem(username);
    if (usernameError) details.username = usernameError;
    const passwordError = passwordProblem(body.password, username);
    if (passwordError) details.password = passwordError;
    if (Object.keys(details).length) return invalid(res, details);

    const taken = () => res.status(409).json({ error: 'That username is taken', details: { username: 'That username is taken' } });
    if (await User.findOne({ username }).lean()) return taken();
    // Only these fields are ever read from the request: a "role" sent along is ignored, so nobody can make themselves admin.
    const user = new User({ username, passwordHash: await hashPassword(body.password) });
    try {
      await user.save();
    } catch (err) {
      if (err.code === DUPLICATE_KEY) return taken(); // two people picked the same name at the same moment
      throw err;
    }
    res.status(201).json(issue(user));
  });

  // POST /api/auth/login <- client api.js login <- LoginPage (Sign in)
  // A wrong username and a wrong password give the SAME answer and take the same time, so nobody can find out which names exist.
  router.post('/login', async (req, res) => {
    const body = credentials(req.body);
    if (!body) return invalid(res, { body: 'Send a username and a password as text' });
    const username = normalizeUsername(body.username).slice(0, 64);
    if (throttle.blocked(username, req.ip)) return res.status(429).json({ error: 'Too many failed tries for this username. Please wait a few minutes.' });

    const user = await User.findOne({ username }).select('+passwordHash');
    const ok = await verifyPassword(body.password, user ? user.passwordHash : await dummyHash());
    if (!user || !ok) {
      throttle.fail(username, req.ip);
      return res.status(401).json({ error: 'Wrong username or password' });
    }
    throttle.clear(username, req.ip);
    res.json(issue(user));
  });

  // GET /api/auth/me <- client api.js getMe (the website asks once at start-up whether the saved token is still good)
  router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(401).json({ error: 'Sign in again' });
    res.json(publicUser(user));
  });

  // PATCH /api/auth/me: change the nicer name or the disc colour. Nothing else (role, username, password) can be changed here.
  router.patch('/me', requireAuth, async (req, res) => {
    if (!isPlainObject(req.body)) return invalid(res, { body: 'The request body must be a JSON object' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Sign in again' });
    const details = {};
    if (req.body.displayName !== undefined) {
      const name = cleanText(req.body.displayName);
      const problem = displayNameProblem(name);
      if (problem) details.displayName = problem;
      else user.displayName = name;
    }
    if (req.body.avatarHue !== undefined) {
      const hue = req.body.avatarHue;
      if (!Number.isInteger(hue) || hue < 0 || hue > 359) details.avatarHue = 'Use a whole number from 0 to 359';
      else user.avatarHue = hue;
    }
    if (Object.keys(details).length) return invalid(res, details);
    await user.save();
    res.json(publicUser(user));
  });

  return router;
}

module.exports = { authRouter, publicUser };
