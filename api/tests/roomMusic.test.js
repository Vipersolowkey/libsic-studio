const request = require('supertest');
const { createApp } = require('../src/app');
const Room = require('../src/models/Room');
const { fakeSceneModel, installFakeRoomStore } = require('./helpers');
const { parseMusicSource } = require('../src/utils/musicSource');
const { resolveMusicLink, soundcloudMetadata } = require('../src/routes/music');

let fake, app;
const source = { provider: 'soundcloud', url: 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024' };
beforeEach(() => {
  fake = installFakeRoomStore(Room);
  app = createApp({ Room, Scene: fakeSceneModel([{ slug: 'night-study' }]) });
});
afterEach(() => { fake.restore(); jest.restoreAllMocks(); });

it('saves an online source, reopens it, then switches back to a CD with the same ownership rules', async () => {
  const created = await request(app).post('/api/rooms').send({ sceneSlug: 'night-study', musicSource: source });
  expect(created.status).toBe(201);
  expect(created.body.room).toMatchObject({ musicSource: source, cdCode: null });
  const url = `/api/rooms/${created.body.room.code}`;
  expect((await request(app).get(url)).body.musicSource).toEqual(source);
  expect((await request(app).put(url).send({ musicSource: null })).status).toBe(401);
  expect((await request(app).put(url).set('x-edit-key', 'wrong').send({ musicSource: null })).status).toBe(403);
  const result = await request(app).put(url).set('x-edit-key', created.body.editKey).send({ cdCode: 'night-study' });
  expect(result.body).toMatchObject({ cdCode: 'night-study', musicSource: null });
  const restored = await request(app).put(url).set('x-edit-key', created.body.editKey).send({ musicSource: source });
  expect(restored.body).toMatchObject({ cdCode: null, musicSource: source });
});

it.each([
  { provider: 'soundcloud', url: 'javascript:alert(1)' },
  { provider: 'soundcloud', url: 'https://soundcloud.com.attacker.test/a/b' },
  { provider: 'spotify', url: source.url },
  { provider: 'audio', url: 'http://localhost/private.mp3' },
  { provider: 'audio', url: 'https://127.0.0.1/private.mp3' },
  { provider: 'audio', url: 'https://user:password@example.com/a.mp3' },
  { provider: 'audio', url: 'https://example.com:8443/a.mp3' },
  { provider: 'unsupported', url: 'https://example.com/a' },
  [], 'not an object',
])('rejects invalid or mismatched room source %j', async (musicSource) => {
  const res = await request(app).post('/api/rooms').send({ sceneSlug: 'night-study', musicSource });
  expect(res.status).toBe(400);
  expect(res.body.details.musicSource).toEqual(expect.any(String));
  expect(fake.store.size).toBe(0);
});

it('rejects ambiguous CD and online source in one write', async () => {
  expect((await request(app).post('/api/rooms').send({ sceneSlug: 'night-study', cdCode: 'abc', musicSource: source })).status).toBe(400);
});

it.each([
  ['https://open.spotify.com/intl-vi/playlist/0CFuMybe6s77w6QQrJjW7d?si=abc', 'spotify', 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d'],
  ['spotify:track:0Lr4kGOYn9l83EjuK6cZFQ', 'spotify', 'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ'],
  ['https://youtu.be/M7lc1UVf-VE?si=abc', 'youtube', 'https://www.youtube.com/watch?v=M7lc1UVf-VE'],
  ['https://music.youtube.com/watch?v=M7lc1UVf-VE&list=PL1234567890', 'youtube', 'https://www.youtube.com/watch?v=M7lc1UVf-VE&list=PL1234567890'],
  ['https://cdn.example.org/song.mp3?token=abc#fragment', 'audio', 'https://cdn.example.org/song.mp3?token=abc'],
  ['https://m.soundcloud.com/forss/flickermood?si=abc', 'soundcloud', 'https://soundcloud.com/forss/flickermood'],
])('canonicalizes %s', (input, provider, url) => {
  expect(parseMusicSource(input)).toEqual({ provider, url });
});

it('recognizes full URLs without fetching them', async () => {
  const fetcher = jest.fn();
  await expect(resolveMusicLink(source.url, fetcher)).resolves.toEqual(source);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await request(app).post('/api/music/resolve').send({ url: source.url })).body).toEqual(source);
});

it('resolves the supported provider shorteners with bounded manual redirects', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce({ status: 302, headers: new Headers({ location: '/next' }) }).mockResolvedValueOnce({ status: 302, headers: new Headers({ location: source.url }) });
  await expect(resolveMusicLink('https://on.soundcloud.com/example', fetcher)).resolves.toEqual(source);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
});

it.each(['http://127.0.0.1/private', 'https://attacker.example.org/file.mp3', 'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ'])('refuses a shortener redirect to %s before requesting it', async (location) => {
  const fetcher = jest.fn().mockResolvedValue({ status: 302, headers: new Headers({ location }) });
  await expect(resolveMusicLink('https://on.soundcloud.com/example', fetcher)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('rejects unknown websites and endless shortener redirects', async () => {
  const fetcher = jest.fn().mockResolvedValue({ status: 302, headers: new Headers({ location: '/again' }) });
  await expect(resolveMusicLink('https://on.soundcloud.com/example', fetcher)).rejects.toThrow(/too many/);
  expect(fetcher).toHaveBeenCalledTimes(4);
  const res = await request(app).post('/api/music/resolve').send({ url: 'https://example.org/page' });
  expect(res.status).toBe(400);
});

it('fills track titles from fixed SoundCloud oEmbed endpoints, preserving credits and caching', async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ title: 'A title by Artist', author_name: 'Artist', html: '<untrusted iframe>' }) });
  await expect(soundcloudMetadata(['1234567'], fetcher)).resolves.toEqual([{ id: '1234567', title: 'A title', artist: 'Artist' }]);
  expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/soundcloud\.com\/oembed\?format=json&url=/);
  await soundcloudMetadata(['1234567'], fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('limits metadata concurrency to four and tolerates unavailable tracks', async () => {
  let running = 0, maximum = 0;
  const fetcher = jest.fn(async () => {
    running++; maximum = Math.max(maximum, running);
    await new Promise((resolve) => setTimeout(resolve, 2));
    running--;
    return { ok: false };
  });
  expect(await soundcloudMetadata(Array.from({ length: 8 }, (_, n) => String(990000 + n)), fetcher)).toEqual([]);
  expect(maximum).toBeLessThanOrEqual(4);
});

it.each([[], ['https://127.0.0.1'], ['123?url=private'], Array(51).fill('123'), null])('rejects invalid metadata ids without fetching %j', async (ids) => {
  const fetcher = jest.fn();
  await expect(soundcloudMetadata(ids, fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  expect((await request(app).post('/api/music/soundcloud/metadata').send({ ids })).status).toBe(400);
});
