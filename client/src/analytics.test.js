import { describe, expect, it, vi } from 'vitest';
import { pageKind, sendVisit, trackPage, trackScene } from './analytics.js';

const on = (extra = {}) => ({ enabled: true, fetcher: vi.fn(() => Promise.resolve({})), nav: {}, ...extra });

describe('pageKind', () => {
  it.each([
    ['/', 'home'],
    ['/new', 'new'],
    ['/r/k4m9x2qa', 'room'],
    ['/cd/abcd1234', 'cd'],
    ['/music', 'music'],
    ['/whatever', 'other'],
  ])('%s is a %s page', (path, kind) => expect(pageKind(path)).toBe(kind));
});

describe('visit counting', () => {
  it('sends the kind of page and never the address or a room code', () => {
    const options = on();
    expect(trackPage('/r/k4m9x2qa', options)).toBe(true);

    const [url, request] = options.fetcher.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/visits');
    expect(request.method).toBe('POST');
    expect(request.body).toBe('{"page":"room"}');
    expect(request.body).not.toContain('k4m9x2qa');
  });

  it('sends the slug of a scene that is shown', () => {
    const options = on();
    trackScene('night-study', options);
    expect(JSON.parse(options.fetcher.mock.calls[0][1].body)).toEqual({ page: 'scene', scene: 'night-study' });
  });

  it('sends nothing when the visitor says Do Not Track or Global Privacy Control', () => {
    const dnt = on({ nav: { doNotTrack: '1' } });
    const gpc = on({ nav: { globalPrivacyControl: true } });
    expect(sendVisit({ page: 'home' }, dnt)).toBe(false);
    expect(sendVisit({ page: 'home' }, gpc)).toBe(false);
    expect(dnt.fetcher).not.toHaveBeenCalled();
    expect(gpc.fetcher).not.toHaveBeenCalled();
  });

  it('is off while testing, so other tests see no extra requests', () => {
    expect(sendVisit({ page: 'home' }, { fetcher: vi.fn() })).toBe(false);
  });

  it('never throws or breaks the page when the request fails', async () => {
    expect(sendVisit({ page: 'home' }, on({ fetcher: vi.fn(() => Promise.reject(new Error('offline'))) }))).toBe(true);
    expect(sendVisit({ page: 'home' }, on({ fetcher: vi.fn(() => { throw new Error('blocked'); }) }))).toBe(false);
    await Promise.resolve();
  });
});
