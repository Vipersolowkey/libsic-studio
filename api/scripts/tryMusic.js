// Run against a local/dev API: API_URL=http://localhost:4000 npm run try:music
// Creates its own temporary CD and room, checks them, then deletes only those records.
const assert = require('node:assert/strict');
const base = process.env.API_URL || 'http://localhost:4000';
let checks = 0;
async function call(path, status, options = {}) {
  const res = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = res.status === 204 ? null : await res.json();
  assert.equal(res.status, status, `${options.method || 'GET'} ${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
async function main() {
  const tracks = await call('/api/tracks', 200);
  assert.equal(tracks.length, 12);
  const cds = await call('/api/cds', 200);
  assert.equal(cds.length, 3);
  assert.ok(cds.every((cd) => cd.official));
  const ordered = [tracks[2].id, tracks[0].id];
  let created, room;
  try {
    created = await call('/api/cds', 201, { method: 'POST', body: { title: 'Music smoke test', trackIds: ordered } });
    const url = `/api/cds/${created.cd.code}`;
    const auth = { 'x-edit-key': created.editKey };
    assert.deepEqual((await call(url, 200)).tracks.map((t) => t.id), ordered);
    assert.ok(!JSON.stringify(await call(url, 200)).includes(created.editKey));
    await call(url, 401, { method: 'PUT', body: { title: 'Unauthorized' } });
    await call(url, 403, { method: 'DELETE', headers: { 'x-edit-key': 'wrong' } });
    await call('/api/cds', 400, { method: 'POST', body: { title: 'Empty', trackIds: [] } });
    await call('/api/cds', 400, { method: 'POST', body: { title: 'Unknown', trackIds: ['not-a-track'] } });
    await call(`/api/cds/${cds[0].code}`, 403, { method: 'DELETE', headers: auth });
    const updated = await call(url, 200, { method: 'PUT', headers: auth, body: { title: 'Changed', trackIds: [tracks[0].id] } });
    assert.equal(updated.title, 'Changed');
    const scenes = await call('/api/scenes', 200);
    room = await call('/api/rooms', 201, { method: 'POST', body: { name: 'Music smoke room', sceneSlug: scenes[0].slug, cdCode: created.cd.code } });
    assert.equal((await call(`/api/rooms/${room.room.code}`, 200)).cdCode, created.cd.code);
    const roomUrl = `/api/rooms/${room.room.code}`;
    const roomAuth = { 'x-edit-key': room.editKey };
    for (const link of [
      'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024',
      'https://open.spotify.com/playlist/6zCID88oNjNv9zx6puDHKj',
      'https://youtu.be/M7lc1UVf-VE',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    ]) {
      const source = await call('/api/music/resolve', 200, { method: 'POST', body: { url: link } });
      const changed = await call(roomUrl, 200, { method: 'PUT', headers: roomAuth, body: { musicSource: source } });
      assert.equal(changed.cdCode, null);
      assert.deepEqual((await call(roomUrl, 200)).musicSource, source);
    }
    await call(roomUrl, 401, { method: 'PUT', body: { musicSource: null } });
    const cdAgain = await call(roomUrl, 200, { method: 'PUT', headers: roomAuth, body: { cdCode: created.cd.code } });
    assert.equal(cdAgain.musicSource, null);
    await call('/api/music/resolve', 400, { method: 'POST', body: { url: 'https://example.org/page' } });
    const spec = await call('/openapi.json', 200);
    assert.ok(spec.paths['/api/cds/{code}'].put);
    assert.ok(spec.components.schemas.Track);
    assert.ok(spec.paths['/api/music/resolve'].post);
    assert.ok(spec.paths['/api/music/soundcloud/metadata'].post);
    assert.ok(spec.components.schemas.MusicSource);
  } finally {
    if (room) await call(`/api/rooms/${room.room.code}`, 204, { method: 'DELETE', headers: { 'x-edit-key': room.editKey } });
    if (created) {
      await call(`/api/cds/${created.cd.code}`, 204, { method: 'DELETE', headers: { 'x-edit-key': created.editKey } });
      await call(`/api/cds/${created.cd.code}`, 404);
    }
  }
  console.log(`Music smoke passed: ${checks} HTTP checks against ${base}`);
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
