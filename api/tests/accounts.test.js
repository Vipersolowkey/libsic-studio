process.env.SCRYPT_COST = '1024';
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');
const { installFakeUserStore } = require('./helpers');

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const PASSWORD = 'a good password';

let users;
let app;
function setup(options = {}) {
  users = installFakeUserStore(User);
  app = createApp({ User, Scene: {} }, { jwtSecret: SECRET, ...options });
}
beforeEach(() => setup());
afterEach(() => users.restore());

const signUp = (body = { username: 'tony', password: PASSWORD }) => request(app).post('/api/auth/register').send(body);
const signIn = (body) => request(app).post('/api/auth/login').send(body);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/auth/register', () => {
  it('makes an account and signs the person in', async () => {
    const res = await signUp();
    expect(res.status).toBe(201);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(Object.keys(res.body.user).sort()).toEqual(['avatarHue', 'createdAt', 'displayName', 'role', 'username']);
    expect(res.body.user).toMatchObject({ username: 'tony', displayName: '', avatarHue: 38, role: 'user' });
    expect(users.store.get('tony').passwordHash).toMatch(/^scrypt\$/);
  });

  it('trims the username and ignores its case', async () => {
    const res = await signUp({ username: '  ToNy_1 ', password: PASSWORD });
    expect(res.body.user.username).toBe('tony_1');
  });

  it.each(['ab', 'a'.repeat(21), 'has space', 'bad!name', 'name-with-dash', '<script>alert(1)</script>', 'admin', 'Root', 'Support'])(
    'refuses the username %j',
    async (username) => {
      const res = await signUp({ username, password: PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.details.username).toEqual(expect.any(String));
      expect(users.store.size).toBe(0);
    }
  );

  it.each([['short', 'tony'], ['password', 'tony'], ['x'.repeat(129), 'tony'], ['tonytony', 'tonytony']])('refuses the password %j', async (password, username) => {
    const res = await signUp({ username, password });
    expect(res.status).toBe(400);
    expect(res.body.details.password).toEqual(expect.any(String));
  });

  it('refuses values that are not text, such as database query tricks', async () => {
    for (const body of [
      { username: { $gt: '' }, password: PASSWORD },
      { username: 'tony', password: { $ne: null } },
      { username: ['tony'], password: PASSWORD },
      { username: 'tony' },
      [],
    ]) {
      const res = await signUp(body);
      expect(res.status).toBe(400);
    }
    expect(users.store.size).toBe(0);
  });

  it('ignores a role sent along, so nobody can make themselves admin', async () => {
    const res = await signUp({ username: 'sneaky', password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    expect(users.store.get('sneaky').role).toBe('user');
  });

  it('says so when a username is taken, in any letter case', async () => {
    await signUp();
    const again = await signUp({ username: 'TONY', password: 'another password' });
    expect(again.status).toBe(409);
    expect(again.body.details.username).toEqual(expect.any(String));
  });

  it('limits new accounts from one connection', async () => {
    setup({ registersPerQuarter: 2 });
    await signUp({ username: 'one', password: PASSWORD });
    await signUp({ username: 'two', password: PASSWORD });
    const third = await signUp({ username: 'three', password: PASSWORD });
    expect(third.status).toBe(429);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => signUp());

  it('signs in with the right password, whatever the letter case of the name', async () => {
    const res = await signIn({ username: 'TONY', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('tony');
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('gives the same answer for a wrong password and an unknown username', async () => {
    const wrong = await signIn({ username: 'tony', password: 'not the password' });
    const unknown = await signIn({ username: 'nobody', password: 'not the password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('refuses values that are not text', async () => {
    expect((await signIn({ username: { $gt: '' }, password: { $gt: '' } })).status).toBe(400);
    expect((await signIn({ username: 'tony', password: { $ne: 'x' } })).status).toBe(400);
  });

  it('blocks one username after 5 failed tries, even with the right password, but not other usernames', async () => {
    for (let i = 0; i < 5; i += 1) expect((await signIn({ username: 'tony', password: `wrong ${i}` })).status).toBe(401);
    expect((await signIn({ username: 'tony', password: PASSWORD })).status).toBe(429);
    await signUp({ username: 'maya', password: PASSWORD });
    expect((await signIn({ username: 'maya', password: PASSWORD })).status).toBe(200);
  });

  it('counts only failed sign-ins against a connection', async () => {
    setup({ loginFailuresPerQuarter: 3, usernameFailures: 100 });
    await signUp();
    for (let i = 0; i < 6; i += 1) expect((await signIn({ username: 'tony', password: PASSWORD })).status).toBe(200);
    for (let i = 0; i < 3; i += 1) expect((await signIn({ username: 'tony', password: 'wrong' })).status).toBe(401);
    expect((await signIn({ username: 'tony', password: 'wrong' })).status).toBe(429);
  });
});

describe('GET and PATCH /api/auth/me', () => {
  let token;
  beforeEach(async () => {
    token = (await signUp()).body.token;
  });

  it('needs a good token in the Authorization header', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Token ${token}`)).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(bearer(`${token}x`))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(bearer(signToken('c'.repeat(24), SECRET, { now: 1000 })))).status).toBe(401); // expired long ago
    expect((await request(app).get('/api/auth/me').set(bearer(signToken('c'.repeat(24), SECRET)))).status).toBe(401); // account no longer exists
  });

  it('returns the profile', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('tony');
  });

  it('changes only the display name and the disc colour', async () => {
    const res = await request(app).patch('/api/auth/me').set(bearer(token)).send({ displayName: '  Tony​  the   Great ', avatarHue: 200, role: 'admin', username: 'hacker' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'tony', displayName: 'Tony the Great', avatarHue: 200, role: 'user' });
    expect(users.store.get('tony').role).toBe('user');
  });

  it('refuses a bad colour or a long name', async () => {
    expect((await request(app).patch('/api/auth/me').set(bearer(token)).send({ avatarHue: 400 })).status).toBe(400);
    expect((await request(app).patch('/api/auth/me').set(bearer(token)).send({ avatarHue: 'red' })).status).toBe(400);
    expect((await request(app).patch('/api/auth/me').set(bearer(token)).send({ displayName: 'x'.repeat(31) })).status).toBe(400);
    expect((await request(app).patch('/api/auth/me').send({ displayName: 'x' })).status).toBe(401);
  });
});
