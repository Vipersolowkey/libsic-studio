const { rateLimit } = require('express-rate-limit');

// Stricter limits for the addresses that save something, on top of the general limit in app.js.
// They exist to stop spam: a script filling the database with rooms, or using our server to look up music links.
// The counters live in the server's memory (one counter per visitor address), which is fine for a single server.
const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const base = { standardHeaders: false, legacyHeaders: false };

// "Writes" are saves and deletes (POST, PUT, DELETE) in one minute. "Creates" are new rooms or CDs in ten minutes.
function writeLimits({ writesPerMinute, createsPerTenMinutes }) {
  const writes = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: writesPerMinute,
    skip: (req) => READ_METHODS.includes(req.method),
    message: { error: 'You are saving too fast. Please wait a minute and try again.' },
  });
  const creates = rateLimit({
    ...base,
    windowMs: 10 * 60 * 1000,
    limit: createsPerTenMinutes,
    skip: (req) => req.method !== 'POST',
    message: { error: 'Too many new rooms or CDs from this connection. Please try again in a few minutes.' },
  });
  return { writes, creates };
}

// The visit counter is called on every page change, so it gets its own, roomier limit.
function visitLimit(visitsPerMinute) {
  return rateLimit({ ...base, windowMs: 60 * 1000, limit: visitsPerMinute, message: { error: 'Too many requests. Please wait a minute and try again.' } });
}

module.exports = { writeLimits, visitLimit };
