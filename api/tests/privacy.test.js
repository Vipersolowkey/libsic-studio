process.env.SCRYPT_COST = '1024';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const Cd = require('../src/models/Cd');
const { scrub } = require('../src/monitoring');
const { fakeSceneModel, fakeTrackModel, installFakeUserStore, installFakeRoomStore, installFakeCdStore } = require('./helpers');

// Tests named "privacy:" prove that no password, key or personal detail leaks. Run only them with:  npx jest privacy
const SECRET = 'a-test-secret-that-is-long-enough-1234';
const PASSWORD = 'my very private password';

let users;
let rooms;
let cds;
let app;
beforeEach(() => {
  users = installFakeUserStore(User);
  rooms = installFakeRoomStore(Room);
  cds = installFakeCdStore(Cd);
  app = createApp({ User, Room, Cd, Track: fakeTrackModel([{ _id: 't1', title: 'S', artist: 'A', src: '/a.mp3', duration: 1, license: 'CC0' }]), Scene: fakeSceneModel([{ slug: 'loft', name: 'Loft' }]) }, { jwtSecret: SECRET });
});
afterEach(() => {
  users.restore();
  rooms.restore();
  cds.restore();
});

// Runs a whole visit and returns the raw text of every answer, so each can be searched for secrets.
async function visit() {
  const answers = [];
  const keep = (res) => (answers.push(res.text ?? ''), res);
  const reg = keep(await request(app).post('/api/auth/register').send({ username: 'tony', password: PASSWORD }));
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  keep(await request(app).post('/api/auth/login').send({ username: 'tony', password: PASSWORD }));
  keep(await request(app).post('/api/auth/login').send({ username: 'tony', password: 'wrong wrong' }));
  keep(await request(app).get('/api/auth/me').set(auth));
  keep(await request(app).patch('/api/auth/me').set(auth).send({ displayName: 'Tony' }));
  const made = keep(await request(app).post('/api/rooms').set(auth).send({ sceneSlug: 'loft' }));
  const code = made.body.room.code;
  keep(await request(app).get(`/api/rooms/${code}`).set(auth));
  keep(await request(app).get(`/api/rooms/${code}`));
  keep(await request(app).put(`/api/rooms/${code}`).set(auth).send({ name: 'Renamed' }));
  keep(await request(app).post('/api/cds').set(auth).send({ title: 'Mix', trackIds: ['t1'] }));
  keep(await request(app).get('/api/me/rooms').set(auth));
  keep(await request(app).get('/api/me/cds').set(auth));
  keep(await request(app).post('/api/me/claim').set(auth).send({ rooms: [{ code, editKey: 'x' }] }));
  return { answers, userId: String(users.store.get('tony')._id), editKeyHash: rooms.store.get(code).editKeyHash, passwordHash: users.store.get('tony').passwordHash };
}

describe('privacy: nothing secret is ever sent back', () => {
  it('privacy: no answer holds the password, a hash, or the account id', async () => {
    const { answers, userId, editKeyHash, passwordHash } = await visit();
    const all = answers.join('\n');
    expect(answers.length).toBeGreaterThan(10);
    for (const secret of [PASSWORD, passwordHash, editKeyHash, userId, 'passwordHash', 'editKeyHash']) expect(all).not.toContain(secret);
  });

  it('privacy: the account is described with a short fixed list of fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'tony', password: PASSWORD });
    expect(Object.keys(res.body.user).sort()).toEqual(['avatarHue', 'createdAt', 'displayName', 'role', 'username']);
  });

  it('privacy: the token only works in the Authorization header, never in the address', async () => {
    const reg = await request(app).post('/api/auth/register').send({ username: 'tony', password: PASSWORD });
    const me = await request(app).get(`/api/auth/me?token=${reg.body.token}&access_token=${reg.body.token}`);
    expect(me.status).toBe(401);
  });

  it('privacy: a server fault answers with a fixed message that names no one', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    User.findOne = () => {
      throw new Error(`database exploded for tony with ${PASSWORD}`);
    };
    const res = await request(app).post('/api/auth/login').send({ username: 'tony', password: PASSWORD });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong on the server' });
    console.error.mockRestore();
  });

  it('privacy: error reports are stripped of headers, bodies, cookies and the user', () => {
    const event = scrub({ request: { headers: { authorization: 'Bearer abc', 'x-edit-key': 'k' }, data: { password: PASSWORD }, cookies: 'c=1', query_string: 'token=abc' }, user: { id: '1', ip_address: '1.2.3.4' }, message: 'boom' });
    expect(JSON.stringify(event)).not.toMatch(/abc|password|1\.2\.3\.4|"k"/i);
    expect(event.message).toBe('boom');
  });
});

describe('privacy: nobody can guess which usernames exist', () => {
  it('privacy: unknown names and wrong passwords answer identically', async () => {
    await request(app).post('/api/auth/register').send({ username: 'tony', password: PASSWORD });
    const known = await request(app).post('/api/auth/login').send({ username: 'tony', password: 'wrong wrong' });
    const unknown = await request(app).post('/api/auth/login').send({ username: 'ghost', password: 'wrong wrong' });
    expect([known.status, known.body]).toEqual([unknown.status, unknown.body]);
  });

  it('privacy: a public room page shows no owner and never lists accounts', async () => {
    const reg = await request(app).post('/api/auth/register').send({ username: 'tony', password: PASSWORD });
    const made = await request(app).post('/api/rooms').set({ Authorization: `Bearer ${reg.body.token}` }).send({ sceneSlug: 'loft' });
    const page = await request(app).get(`/api/rooms/${made.body.room.code}`);
    expect(page.text).not.toMatch(/tony|owner/i);
  });
});

describe('privacy: the code itself stays clean', () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');

  it('privacy: sign-in code never writes to a log', () => {
    for (const file of ['routes/auth.js', 'routes/me.js', 'middleware/auth.js', 'middleware/authLimits.js', 'utils/password.js', 'utils/token.js']) {
      expect(read(file)).not.toMatch(/console\.(log|info|warn|error|debug)/);
    }
  });

  it('privacy: the only admin log lines say which admin did what to which code or id, nothing more', () => {
    const lines = read('routes/admin.js').split('\n').filter((l) => /console\./.test(l));
    expect(lines).toHaveLength(5); // room, CD, account, track added, track removed
    for (const line of lines) expect(line).not.toMatch(/password|token|hash|editKey|username/i);
  });
});
