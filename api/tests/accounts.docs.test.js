process.env.SCRYPT_COST = '1024';
const path = require('path');
const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const Cd = require('../src/models/Cd');
const { fakeSceneModel, fakeTrackModel, installFakeUserStore, installFakeRoomStore, installFakeCdStore } = require('./helpers');

// The account addresses must answer exactly what openapi.yaml says they answer.
const specFile = path.join(__dirname, '..', 'openapi.yaml');
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let spec;
let users;
let rooms;
let cds;
let app;
beforeAll(async () => {
  spec = await SwaggerParser.dereference(specFile);
});
beforeEach(() => {
  users = installFakeUserStore(User);
  rooms = installFakeRoomStore(Room);
  cds = installFakeCdStore(Cd, { official: [] });
  app = createApp({ User, Room, Cd, Track: fakeTrackModel([]), Scene: fakeSceneModel([{ slug: 'loft', name: 'Loft' }]) }, { jwtSecret: 'a-test-secret-that-is-long-enough-1234' });
});
afterEach(() => {
  users.restore();
  rooms.restore();
  cds.restore();
});

function expectDocumented(res, apiPath, method) {
  const documented = spec.paths[apiPath]?.[method]?.responses?.[String(res.status)];
  if (!documented) throw new Error(`${method.toUpperCase()} ${apiPath} answered ${res.status}, which openapi.yaml does not list`);
  const schema = documented.content?.['application/json']?.schema;
  if (!schema) return;
  const validate = ajv.compile(schema);
  if (!validate(res.body)) throw new Error(`${method.toUpperCase()} ${apiPath} ${res.status} does not match the docs: ${ajv.errorsText(validate.errors)}`);
}

describe('the account answers match the documentation', () => {
  it('sign up, sign in, profile and my things', async () => {
    const body = { username: 'tony', password: 'a good password' };
    const up = await request(app).post('/api/auth/register').send(body);
    expectDocumented(up, '/api/auth/register', 'post');
    expectDocumented(await request(app).post('/api/auth/register').send(body), '/api/auth/register', 'post'); // 409
    expectDocumented(await request(app).post('/api/auth/register').send({ username: 'x', password: 'y' }), '/api/auth/register', 'post'); // 400
    const login = await request(app).post('/api/auth/login').send(body);
    expectDocumented(login, '/api/auth/login', 'post');
    expectDocumented(await request(app).post('/api/auth/login').send({ username: 'tony', password: 'wrong password' }), '/api/auth/login', 'post'); // 401

    const auth = { Authorization: `Bearer ${login.body.token}` };
    expectDocumented(await request(app).get('/api/auth/me').set(auth), '/api/auth/me', 'get');
    expectDocumented(await request(app).get('/api/auth/me'), '/api/auth/me', 'get'); // 401
    expectDocumented(await request(app).patch('/api/auth/me').set(auth).send({ displayName: 'Tony', avatarHue: 200 }), '/api/auth/me', 'patch');
    expectDocumented(await request(app).patch('/api/auth/me').set(auth).send({ avatarHue: 999 }), '/api/auth/me', 'patch'); // 400

    const room = await request(app).post('/api/rooms').set(auth).send({ sceneSlug: 'loft', name: 'Mine' });
    expectDocumented(room, '/api/rooms', 'post');
    expect(room.body.room?.mine ?? room.body.mine).toBe(true);
    expectDocumented(await request(app).get(`/api/rooms/${room.body.room?.code ?? room.body.code}`).set(auth), '/api/rooms/{code}', 'get');
    expectDocumented(await request(app).get('/api/me/rooms').set(auth), '/api/me/rooms', 'get');
    expectDocumented(await request(app).get('/api/me/cds').set(auth), '/api/me/cds', 'get');
    expectDocumented(await request(app).get('/api/me/rooms'), '/api/me/rooms', 'get'); // 401
    expectDocumented(await request(app).post('/api/me/claim').set(auth).send({ rooms: [{ code: 'nope1234', editKey: 'x' }], cds: [] }), '/api/me/claim', 'post');
    expectDocumented(await request(app).post('/api/me/claim').set(auth).send([]), '/api/me/claim', 'post'); // 400
  });

  it('the admin addresses refuse a normal account as documented', async () => {
    const up = await request(app).post('/api/auth/register').send({ username: 'tony', password: 'a good password' });
    const auth = { Authorization: `Bearer ${up.body.token}` };
    for (const [p, doc] of [['/api/admin/stats', '/api/admin/stats'], ['/api/admin/rooms', '/api/admin/rooms'], ['/api/admin/cds', '/api/admin/cds'], ['/api/admin/users', '/api/admin/users']]) {
      expectDocumented(await request(app).get(p).set(auth), doc, 'get'); // 403
      expectDocumented(await request(app).get(p), doc, 'get'); // 401
    }
  });

  it('documents every account and admin address', () => {
    const operations = Object.entries(spec.paths).flatMap(([p, methods]) => Object.keys(methods).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).map((m) => `${m.toUpperCase()} ${p}`));
    expect(operations).toEqual(
      expect.arrayContaining([
        'POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me', 'PATCH /api/auth/me',
        'GET /api/me/rooms', 'GET /api/me/cds', 'POST /api/me/claim',
        'GET /api/admin/stats', 'GET /api/admin/rooms', 'DELETE /api/admin/rooms/{code}', 'GET /api/admin/cds', 'DELETE /api/admin/cds/{code}', 'GET /api/admin/users',
      ])
    );
  });
});
