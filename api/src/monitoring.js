// Error monitoring with Sentry (https://sentry.io). It is switched on only when the SENTRY_DSN setting exists,
// so without it (for example on a laptop or in the tests) nothing is sent anywhere.
// Only unexpected server errors are reported, never the visitor's mistakes (those answer 400, 401, 403 or 404).
let sentry = null;

// Removes everything that could carry a secret from a report before it leaves the server: request headers (the edit key,
// and later a login token in Authorization), cookies, the request body (passwords at login) and the query string.
function scrub(event) {
  if (event.request) {
    for (const part of ['headers', 'cookies', 'data', 'query_string']) delete event.request[part];
  }
  delete event.user;
  return event;
}

// Starts monitoring. Returns true when it is on.
function initMonitoring(env = process.env) {
  if (!env.SENTRY_DSN) return false;
  sentry = require('@sentry/node');
  sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'production',
    sendDefaultPii: false, // no visitor addresses or request headers (the edit key travels in a header)
    tracesSampleRate: 0, // errors only, no speed measurements
    beforeSend: scrub,
  });
  return true;
}

// Reports one error. "where" is a short text such as "POST /api/rooms". It does nothing when monitoring is off.
function reportError(error, where) {
  if (!sentry) return;
  sentry.captureException(error, { tags: { where } });
}

// Sends what is still waiting before the program stops (used when the server cannot start).
async function flushMonitoring() {
  if (sentry) await sentry.flush(2000).catch(() => {});
}

module.exports = { initMonitoring, reportError, flushMonitoring, scrub };
