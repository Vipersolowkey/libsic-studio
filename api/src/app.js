// Part of: API core: builds the server and mounts every route.
// Uses: Cd.js, Room.js, Scene.js, Track.js, User.js, admin.js, auth.js, cds.js, me.js, music.js, rooms.js, scenes.js, tracks.js.
// Used by: server.js.
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const scenesRouter = require('./routes/scenes');
const roomsRouter = require('./routes/rooms');
const { tracksRouter } = require('./routes/tracks');
const cdsRouter = require('./routes/cds');
const { musicRouter } = require('./routes/music');
const visitsRouter = require('./routes/visits');
const { authRouter } = require('./routes/auth');
const meRouter = require('./routes/me');
const adminRouter = require('./routes/admin');
const { createAuth } = require('./middleware/auth');
const { authLimits, UsernameThrottle } = require('./middleware/authLimits');
const { resolveSecret } = require('./utils/secret');
const { writeLimits, visitLimit } = require('./middleware/writeLimits');
const { reportError } = require('./monitoring');
const statsPage = require('./statsPage');

// Express app: middleware order matters here (security, limit, JSON body, routes, 404, error handler).
// openapi.yaml is the API documentation; read once at start-up and served at /api-docs.
const apiSpec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));

// Builds the app but does not listen (server.js does), so tests can call it without a port.
// models: tests pass fake models instead of the real database ones. The real server passes nothing.
// options (each can also be set with an environment variable on the host):
//   requestsPerMinute     all requests of one visitor per minute        (REQUESTS_PER_MINUTE, 300)
//   writesPerMinute       saves and deletes of one visitor per minute   (WRITES_PER_MINUTE, 40)
//   createsPerTenMinutes  new rooms or CDs of one visitor in 10 minutes (CREATES_PER_10_MIN, 60)
//   maxRooms, maxCds      most rooms / custom CDs the database may hold (MAX_ROOMS, MAX_CDS, 50000 each)
//   jwtSecret             the secret that signs login tokens (JWT_SECRET, at least 32 characters; required on the live server)
//   registersPerQuarter   new accounts per visitor in 15 minutes   (REGISTERS_PER_15_MIN, 30)
//   loginFailuresPerQuarter  failed sign-ins per visitor in 15 minutes (LOGIN_FAILURES_PER_15_MIN, 10)
//   usernameFailures      failed sign-ins for one username in 15 minutes (5)
// The creation limit is roomy on purpose: many people at one event share one internet address.
const number = (value, fallback) => Number(value) || fallback;
function createApp(models = {}, options = {}) {
  const {
    requestsPerMinute = number(process.env.REQUESTS_PER_MINUTE, 300),
    writesPerMinute = number(process.env.WRITES_PER_MINUTE, 40),
    createsPerTenMinutes = number(process.env.CREATES_PER_10_MIN, 60),
    maxRooms = number(process.env.MAX_ROOMS, 50000),
    maxCds = number(process.env.MAX_CDS, 50000),
    jwtSecret = process.env.JWT_SECRET,
    registersPerQuarter = number(process.env.REGISTERS_PER_15_MIN, 30),
    loginFailuresPerQuarter = number(process.env.LOGIN_FAILURES_PER_15_MIN, 10),
    usernameFailures = 5,
    stats = {},
  } = options;
  const Scene = models.Scene || require('./models/Scene');
  const Room = models.Room || require('./models/Room');
  const Track = models.Track || require('./models/Track');
  const Cd = models.Cd || require('./models/Cd');
  const DailyStat = models.DailyStat || require('./models/DailyStat');
  const DailyVisitor = models.DailyVisitor || require('./models/DailyVisitor');
  const User = models.User || require('./models/User');
  const secret = resolveSecret(jwtSecret); // throws on the live server when JWT_SECRET is missing, so the API refuses to start
  const auth = createAuth({ User, secret });
  const app = express();

  // On a host such as Render we sit behind a proxy. Trust one hop so the rate limit sees the visitor's address, not the proxy's.
  app.set('trust proxy', 1);

  // Safety headers on every answer. Two helmet defaults are changed on purpose:
  // content policy is off (Swagger UI needs inline scripts), and cross-origin reads are allowed (the React site is on another address).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors()); // lets the React site call this API from another address
  app.use(compression()); // gzip: a scene is long text and shrinks several times

  // Used by the host (Render) to check the API is alive.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Online docs: /api-docs is a page where each endpoint can be tried; /openapi.json is the raw spec.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec, { customSiteTitle: 'Libsic Studio API' }));
  app.get('/openapi.json', (req, res) => res.json(apiSpec));

  // Too many requests in a minute -> 429. Normal use is a handful per visit, so this only stops scripts.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: requestsPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please wait a minute and try again.' },
    })
  );

  // Saving is limited more strictly than reading (see middleware/writeLimits.js), before the body is even read.
  const { writes, creates } = writeLimits({ writesPerMinute, createsPerTenMinutes });
  app.use(['/api/rooms', '/api/cds'], writes, creates);
  app.use('/api/music', writes); // these look music links up on other websites, so they count as writes too
  app.use('/api/visits', visitLimit(60));
  // Sign-up and sign-in have their own, stricter limits (see middleware/authLimits.js). Claiming and the admin deletes count as writes.
  const limits = authLimits({ registersPerQuarter, loginFailuresPerQuarter });
  const throttle = new UsernameThrottle({ max: usernameFailures });
  app.use('/api/auth/register', limits.register);
  app.use('/api/auth/login', limits.login);
  app.use(['/api/me', '/api/admin'], writes);

  // JSON bodies are capped at 32 KB (a decorated room is a few KB). Bigger -> 413 (see the error handler).
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', auth.optionalAuth); // reads the login token, if any: req.user = { id } or null (a guest)

  // WHICH PART OF THE WEBSITE USES WHICH ADDRESSES (client calls are in client/src/api.js):
  //   /api/scenes -> room picker and loading a room    /api/rooms -> Save bar, My rooms, opening /r/:code
  //   /api/tracks, /api/cds -> CD tower, CD workshop, CD page    /api/music -> pasting online links (CD tower slip, workshop, SoundCloud player)
  app.use('/api/scenes', scenesRouter(Scene));
  app.use('/api/rooms', roomsRouter({ Room, Scene }, { maxRooms }));
  app.use('/api/tracks', tracksRouter(Track));
  app.use('/api/cds', cdsRouter({ Cd, Track }, { maxCds }));
  app.use('/api/music', musicRouter());
  app.use('/api/auth', authRouter({ User }, { secret, throttle, requireAuth: auth.requireAuth })); // sign up, sign in, my profile
  app.use('/api/me', auth.requireAuth, meRouter({ Room, Cd })); // my rooms and CDs on any device, claiming old ones
  app.use('/api/admin', auth.requireAdmin, adminRouter({ Room, Cd, User, Track })); // admin only
  app.use('/api', visitsRouter({ Scene, DailyStat, DailyVisitor }, stats)); // POST /api/visits (anonymous page counter) and GET /api/stats (owner only)
  app.get('/stats', (req, res) => res.type('html').send(statsPage)); // the small page that shows the visit totals

  // Unknown /api address -> 404 JSON.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Last stop for errors: always JSON, never leak internals. Mongoose ValidationError -> 400 with a per-field "details" object.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'The request body is too large' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'The request body is not valid JSON' });
    }
    if (err instanceof URIError) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (err.name === 'ValidationError') {
      const details = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error(err);
    reportError(err, `${req.method} ${req.path}`); // to Sentry, when it is switched on
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}

module.exports = { createApp };
