// Error monitoring with Sentry. It is switched on only when the site is built with VITE_SENTRY_DSN, and the Sentry
// code is then loaded in the background, so visitors without it (and the tests) download nothing extra.
// No personal data is sent: no cookies, no addresses, and no recordings of the screen.
// Removes everything that could carry a secret from a report before it leaves the browser: request headers (a login
// token in Authorization), cookies, request bodies (passwords at login), the query string and the user record.
export function scrub(event) {
  if (event.request) {
    for (const part of ['headers', 'cookies', 'data', 'query_string']) delete event.request[part];
  }
  delete event.user;
  return event;
}

export async function initMonitoring(env = import.meta.env, load = () => import('@sentry/browser')) {
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) return false;
  try {
    const Sentry = await load();
    Sentry.init({
      dsn,
      environment: env.MODE || 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0, // errors only
      beforeSend: scrub,
    });
    return true;
  } catch {
    return false; // a blocked script (ad blocker) must never break the site
  }
}
