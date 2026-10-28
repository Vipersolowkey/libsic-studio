const path = require('path');
const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { createApp } = require('../src/app');
const Room = require('../src/models/Room');
const seedScenes = require('../src/seed/scenes');
const { fakeSceneModel, installFakeRoomStore } = require('./helpers');

const specFile = path.join(__dirname, '..', 'openapi.yaml');
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let spec; // the openapi.yaml with all $ref links filled in
let fake;
let app;

beforeAll(async () => {
  spec = await SwaggerParser.dereference(specFile);
});
beforeEach(() => {
  fake = installFakeRoomStore(Room);
  app = createApp({ Scene: fakeSceneModel(seedScenes), Room });
});
afterEach(() => fake.restore());

// Fails when `res` is not something the documentation says this address can answer.
function expectDocumented(res, apiPath, method) {
  const documented = spec.paths[apiPath]?.[method]?.responses?.[String(res.status)];
  if (!documented) throw new Error(`${method.toUpperCase()} ${apiPath} answered ${res.status}, which openapi.yaml does not list`);
  const schema = documented.content?.['application/json']?.schema;
  if (!schema) return; // for example 204 has no body
  const validate = ajv.compile(schema);
  if (!validate(res.body)) {
    throw new Error(`${method.toUpperCase()} ${apiPath} ${res.status} does not match the docs: ${ajv.errorsText(validate.errors)}`);
  }
}

describe('openapi.yaml', () => {
  it('is a valid OpenAPI document', async () => {
    await expect(SwaggerParser.validate(specFile)).resolves.toBeDefined();
  });

  it('documents every address of the API', () => {
    const operations = Object.entries(spec.paths).flatMap(([p, methods]) =>
      Object.keys(methods).filter((m) => ['get', 'post', 'put', 'delete'].includes(m)).map((m) => `${m.toUpperCase()} ${p}`)
    );
    expect(operations).toEqual(
      expect.arrayContaining([
        'GET /api/health',
        'GET /api/scenes',
        'GET /api/scenes/{slug}',
        'POST /api/rooms',
        'GET /api/rooms/{code}',
        'PUT /api/rooms/{code}',
        'DELETE /api/rooms/{code}',
      ])
    );
  });

  it('gives every operation a summary', () => {
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete'].includes(method)) expect({ p, method, summary: Boolean(operation.summary) }).toEqual({ p, method, summary: true });
      }
    }
  });
});

describe('the documentation pages', () => {
  it('serves Swagger UI at /api-docs/', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
    expect(res.text).toContain('<title>Libsic Studio API</title>');
  });

  it('serves the raw document as JSON at /openapi.json', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Libsic Studio API');
    expect(Object.keys(res.body.paths)).toContain('/api/rooms/{code}');
  });
});

describe('the real answers match the documentation', () => {
  it('GET /api/health', async () => {
    expectDocumented(await request(app).get('/api/health'), '/api/health', 'get');
  });

  it('GET /api/scenes with the real seed scenes', async () => {
    const res = await request(app).get('/api/scenes');
    expect(res.body).toHaveLength(seedScenes.length);
    expectDocumented(res, '/api/scenes', 'get');
  });

  it('GET /api/scenes/{slug}: found and not found', async () => {
    expectDocumented(await request(app).get('/api/scenes/moon-base'), '/api/scenes/{slug}', 'get');
    expectDocumented(await request(app).get('/api/scenes/nope'), '/api/scenes/{slug}', 'get');
  });

  it('the whole room life: create, open, change, delete', async () => {
    const created = await request(app).post('/api/rooms').send({ name: 'Docs test', sceneSlug: 'rainy-cafe', settings: { effect: 'rain' } });
    expectDocumented(created, '/api/rooms', 'post');
    const { code } = created.body.room;
    const key = created.body.editKey;

    expectDocumented(await request(app).get(`/api/rooms/${code}`), '/api/rooms/{code}', 'get');
    expectDocumented(await request(app).put(`/api/rooms/${code}`).set('x-edit-key', key).send({ name: 'New' }), '/api/rooms/{code}', 'put');
    expectDocumented(await request(app).delete(`/api/rooms/${code}`).set('x-edit-key', key), '/api/rooms/{code}', 'delete');
  });

  it('the error answers of the room addresses', async () => {
    const created = await request(app).post('/api/rooms').send({ sceneSlug: 'rainy-cafe' });
    const { code } = created.body.room;

    expectDocumented(await request(app).post('/api/rooms').send({ sceneSlug: 'atlantis' }), '/api/rooms', 'post');
    expectDocumented(await request(app).get('/api/rooms/nope1234'), '/api/rooms/{code}', 'get');
    expectDocumented(await request(app).put(`/api/rooms/${code}`).send({ name: 'x' }), '/api/rooms/{code}', 'put'); // 401
    expectDocumented(await request(app).put(`/api/rooms/${code}`).set('x-edit-key', 'wrong').send({ name: 'x' }), '/api/rooms/{code}', 'put'); // 403
    expectDocumented(await request(app).put('/api/rooms/nope1234').set('x-edit-key', 'k').send({}), '/api/rooms/{code}', 'put'); // 404
    expectDocumented(await request(app).delete(`/api/rooms/${code}`), '/api/rooms/{code}', 'delete'); // 401
    expectDocumented(await request(app).delete(`/api/rooms/${code}`).set('x-edit-key', 'wrong'), '/api/rooms/{code}', 'delete'); // 403
  });

  it('a database failure is documented as a 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const broken = createApp({ Scene: fakeSceneModel(seedScenes, { fail: true }), Room });
    expectDocumented(await request(broken).get('/api/scenes'), '/api/scenes', 'get');
    console.error.mockRestore();
  });
});
