import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetCd, getMyCds, rememberCd } from './myCds.js';

beforeEach(() => localStorage.clear());

describe('my CDs (kept in this browser, with their edit keys)', () => {
  it('remembers a saved CD and puts the newest first', () => {
    rememberCd({ code: 'aaaa1111', title: 'First', editKey: 'k1' });
    rememberCd({ code: 'bbbb2222', title: 'Second', editKey: 'k2' });
    expect(getMyCds().map((c) => c.code)).toEqual(['bbbb2222', 'aaaa1111']);
  });

  it('keeps one entry per code and updates its title and edit key', () => {
    rememberCd({ code: 'aaaa1111', title: 'Old', editKey: 'k1' });
    rememberCd({ code: 'aaaa1111', title: 'New', editKey: 'k2' });
    expect(getMyCds()).toEqual([{ code: 'aaaa1111', title: 'New', editKey: 'k2' }]);
  });

  it('forgets a CD without touching the others', () => {
    rememberCd({ code: 'aaaa1111', title: 'A', editKey: 'k1' });
    rememberCd({ code: 'bbbb2222', title: 'B', editKey: 'k2' });
    forgetCd('aaaa1111');
    expect(getMyCds().map((c) => c.code)).toEqual(['bbbb2222']);
  });

  it('ignores junk in storage', () => {
    localStorage.setItem('libsic:myCds', JSON.stringify([{ code: '../etc', editKey: 'x' }, { code: 'ok', editKey: 5 }, null, { code: 'fine', editKey: 'k' }]));
    expect(getMyCds()).toEqual([{ code: 'fine', editKey: 'k' }]);
    localStorage.setItem('libsic:myCds', 'not json');
    expect(getMyCds()).toEqual([]);
  });

  it('tells the caller when the browser would not store the CD, and never throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(rememberCd({ code: 'aaaa1111', editKey: 'k' })).toBe(false);
    expect(() => forgetCd('aaaa1111')).not.toThrow();
    vi.restoreAllMocks();
  });
});
