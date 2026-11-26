// Part of: Accounts: limits on sign-up and sign-in, stricter than the general limit in app.js.
// Used by: app.js, auth.js (routes).
const { rateLimit } = require('express-rate-limit');

const QUARTER = 15 * 60 * 1000;
const base = { standardHeaders: false, legacyHeaders: false, windowMs: QUARTER };

// Two limits per visitor address, counted in the server's memory:
//   register  new accounts per 15 minutes. Roomy on purpose, because a whole audience at a show shares one internet address.
//   login     only FAILED sign-ins count (a good one is not held against the visitor), 10 per 15 minutes.
function authLimits({ registersPerQuarter = 30, loginFailuresPerQuarter = 10 } = {}) {
  return {
    register: rateLimit({ ...base, limit: registersPerQuarter, message: { error: 'Too many new accounts from this connection. Please try again in a few minutes.' } }),
    login: rateLimit({ ...base, limit: loginFailuresPerQuarter, skipSuccessfulRequests: true, message: { error: 'Too many failed sign-ins from this connection. Please wait a few minutes.' } }),
  };
}

// The second guard: failed sign-ins for ONE username (from any address), so an attacker cannot rotate addresses to guess one account.
// Remembers names only for the window, and forgets old ones when the list grows.
class UsernameThrottle {
  constructor({ max = 5, windowMs = QUARTER, now = () => Date.now() } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map(); // username -> { count, resetAt }
  }

  blocked(username) {
    const entry = this.entries.get(username);
    if (!entry) return false;
    if (entry.resetAt <= this.now()) {
      this.entries.delete(username);
      return false;
    }
    return entry.count >= this.max;
  }

  fail(username) {
    const now = this.now();
    if (this.entries.size > 5000) for (const [name, e] of this.entries) if (e.resetAt <= now) this.entries.delete(name);
    const entry = this.entries.get(username);
    if (!entry || entry.resetAt <= now) this.entries.set(username, { count: 1, resetAt: now + this.windowMs });
    else entry.count += 1;
  }

  clear(username) {
    this.entries.delete(username);
  }
}

module.exports = { authLimits, UsernameThrottle };
