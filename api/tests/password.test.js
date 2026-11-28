process.env.SCRYPT_COST = '1024'; // a cheap setting so the tests run fast; real servers use the default
const { hashPassword, verifyPassword } = require('../src/utils/password');

describe('passwords', () => {
  it('stores a scrambled hash, never the password, and salts every hash differently', async () => {
    const a = await hashPassword('my secret pass');
    const b = await hashPassword('my secret pass');
    expect(a).toMatch(/^scrypt\$1024\$8\$1\$/);
    expect(a).not.toContain('my secret pass');
    expect(a).not.toBe(b);
  });

  it('accepts the right password and refuses a wrong one', async () => {
    const hash = await hashPassword('my secret pass');
    await expect(verifyPassword('my secret pass', hash)).resolves.toBe(true);
    await expect(verifyPassword('my secret pasS', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('refuses anything that is not a proper hash or password', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', undefined)).resolves.toBe(false);
    await expect(verifyPassword({ $gt: '' }, await hashPassword('x'))).resolves.toBe(false);
  });

  it('keeps checking old hashes after the cost setting changes', async () => {
    const hash = await hashPassword('my secret pass'); // made at cost 1024
    process.env.SCRYPT_COST = '2048';
    await expect(verifyPassword('my secret pass', hash)).resolves.toBe(true);
    process.env.SCRYPT_COST = '1024';
  });
});
