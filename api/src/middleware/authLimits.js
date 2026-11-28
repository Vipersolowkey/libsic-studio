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

// The second guard: failed sign-ins for ONE username, counted two ways.
//   per address + username (max, default 5)   the same visitor guessing one account is held back after 5 tries. Only that visitor is
//                                              blocked, so a stranger cannot lock the real owner out of their own account.
//   per username, any address (maxAll, default 30)  a ceiling for guessing from many addresses at once. It is high on purpose: every
//                                              address is already held to a few failures by the login limit above.
// Remembers names only for the window, and forgets old ones when the list grows.
class UsernameThrottle {
  constructor({ max = 5, maxAll = max * 6, windowMs = QUARTER, now = () => Date.now() } = {}) {
    this.max = max;
    this.maxAll = maxAll;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map(); // "username" or "address|username" -> { count, resetAt }
  }

  keys(username, address) {
    return [{ key: `${address}|${username}`, limit: this.max }, { key: username, limit: this.maxAll }];
  }

  blocked(username, address = '') {
    return this.keys(username, address).some(({ key, limit }) => {
      const entry = this.entries.get(key);
      if (!entry) return false;
      if (entry.resetAt <= this.now()) {
        this.entries.delete(key);
        return false;
      }
      return entry.count >= limit;
    });
  }

  fail(username, address = '') {
    const now = this.now();
    if (this.entries.size > 5000) for (const [name, e] of this.entries) if (e.resetAt <= now) this.entries.delete(name);
    for (const { key } of this.keys(username, address)) {
      const entry = this.entries.get(key);
      if (!entry || entry.resetAt <= now) this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      else entry.count += 1;
    }
  }

  clear(username, address = '') {
    for (const { key } of this.keys(username, address)) this.entries.delete(key);
  }
}

module.exports = { authLimits, UsernameThrottle };
