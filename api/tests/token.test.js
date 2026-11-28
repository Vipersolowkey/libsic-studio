const crypto = require('crypto');
const { signToken, verifyToken } = require('../src/utils/token');
const { resolveSecret } = require('../src/utils/secret');

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const ID = 'a'.repeat(24);
const part = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('login tokens', () => {
  it('carries only the account id and its dates', () => {
    const token = signToken(ID, SECRET);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(verifyToken(token, SECRET)).toBe(ID);
  });

  it('lasts 7 days and then stops working', () => {
    const now = Date.now();
    const token = signToken(ID, SECRET, { now });
    expect(verifyToken(token, SECRET, { now: now + 6 * 24 * 3600 * 1000 })).toBe(ID);
    expect(verifyToken(token, SECRET, { now: now + 7 * 24 * 3600 * 1000 + 1000 })).toBeNull();
  });

  it('refuses a token signed with another secret, or changed after signing', () => {
    const token = signToken(ID, SECRET);
    expect(verifyToken(token, 'another-secret-that-is-long-enough-1234')).toBeNull();
    const [h, , s] = token.split('.');
    const forged = `${h}.${part({ sub: 'b'.repeat(24), exp: 9999999999 })}.${s}`;
    expect(verifyToken(forged, SECRET)).toBeNull();
  });

  it('refuses unsigned tokens and other algorithms', () => {
    const body = part({ sub: ID, exp: 9999999999 });
    expect(verifyToken(`${part({ alg: 'none', typ: 'JWT' })}.${body}.`, SECRET)).toBeNull();
    const h = part({ alg: 'HS512', typ: 'JWT' });
    const sig = crypto.createHmac('sha512', SECRET).update(`${h}.${body}`).digest('base64url');
    expect(verifyToken(`${h}.${body}.${sig}`, SECRET)).toBeNull();
  });

  it('refuses garbage and ids that are not database ids', () => {
    for (const bad of [undefined, null, 42, '', 'abc', 'a.b.c', {}]) expect(verifyToken(bad, SECRET)).toBeNull();
    expect(verifyToken(signToken('not-an-id', SECRET), SECRET)).toBeNull();
    expect(verifyToken(signToken({ $gt: '' }, SECRET), SECRET)).toBeNull();
  });
});

describe('the signing secret', () => {
  it('is required, and long enough, on the live server', () => {
    expect(() => resolveSecret(undefined, { NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => resolveSecret('short', { RENDER: 'true' })).toThrow(/JWT_SECRET/);
    expect(resolveSecret(SECRET, { NODE_ENV: 'production' })).toBe(SECRET);
  });

  it('is made up on a laptop, differently every time', () => {
    const a = resolveSecret(undefined, { NODE_ENV: 'test' });
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(resolveSecret(undefined, { NODE_ENV: 'test' })).not.toBe(a);
  });
});
