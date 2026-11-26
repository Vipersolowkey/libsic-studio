import { describe, expect, it, vi } from 'vitest';
import { initMonitoring, scrub } from './monitoring.js';

describe('error monitoring', () => {
  it('loads nothing without a DSN', async () => {
    const load = vi.fn();
    expect(await initMonitoring({}, load)).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('starts Sentry with no personal data when a DSN is set', async () => {
    const init = vi.fn();
    expect(await initMonitoring({ VITE_SENTRY_DSN: 'https://key@example.ingest.sentry.io/1', MODE: 'production' }, async () => ({ init }))).toBe(true);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false, tracesSampleRate: 0, environment: 'production', beforeSend: scrub }));
  });

  it('survives a blocked Sentry script', async () => {
    expect(await initMonitoring({ VITE_SENTRY_DSN: 'https://key@example.ingest.sentry.io/1' }, async () => { throw new Error('blocked'); })).toBe(false);
  });

  it('strips headers, cookies, bodies, the query string and the user from every report', () => {
    const event = { message: 'boom', user: { id: 1 }, request: { url: 'https://libsic.id.vn/', headers: { Authorization: 'Bearer abc' }, cookies: { a: 'b' }, data: { password: 'p' }, query_string: 'token=1' } };
    expect(scrub(event)).toEqual({ message: 'boom', request: { url: 'https://libsic.id.vn/' } });
    expect(scrub({ message: 'plain' })).toEqual({ message: 'plain' });
  });
});
