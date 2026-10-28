const { generateCode } = require('../src/utils/shareCode');

describe('generateCode', () => {
  it('makes an 8 character code by default', () => {
    expect(generateCode()).toHaveLength(8);
  });

  it('can make a code of another length', () => {
    expect(generateCode(12)).toHaveLength(12);
  });

  it('only uses lowercase letters and digits that are easy to tell apart', () => {
    for (let i = 0; i < 300; i++) expect(generateCode()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
  });

  it('does not repeat in a thousand tries', () => {
    expect(new Set(Array.from({ length: 1000 }, () => generateCode())).size).toBe(1000);
  });
});
