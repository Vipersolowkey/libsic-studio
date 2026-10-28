const { generateEditKey, hashEditKey, keyMatches } = require('../src/utils/editKey');

describe('edit key helpers', () => {
  it('makes long keys that are different every time', () => {
    const keys = new Set(Array.from({ length: 200 }, generateEditKey));
    expect(keys.size).toBe(200);
    for (const key of keys) expect(key).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('hashes a key to something that is not the key, and always the same', () => {
    const hash = hashEditKey('secret');
    expect(hash).not.toContain('secret');
    expect(hash).toBe(hashEditKey('secret'));
    expect(hash).not.toBe(hashEditKey('Secret'));
  });

  it('keyMatches is true only for the key the hash was made from', () => {
    const hash = hashEditKey('secret');
    expect(keyMatches('secret', hash)).toBe(true);
    expect(keyMatches('secreT', hash)).toBe(false);
  });

  it('keyMatches is false (and does not crash) for missing or odd input', () => {
    const hash = hashEditKey('secret');
    expect(keyMatches(undefined, hash)).toBe(false);
    expect(keyMatches('', hash)).toBe(false);
    expect(keyMatches('secret', undefined)).toBe(false);
    expect(keyMatches('secret', 'short')).toBe(false);
    expect(keyMatches(['secret'], hash)).toBe(false);
  });
});
