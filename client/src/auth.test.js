import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNED_OUT_EVENT, clearSession, getCachedUser, getToken, saveSession } from './auth.js';

const session = { token: 'a.b.c', user: { username: 'tony', displayName: 'Tony', avatarHue: 200, role: 'user', createdAt: '2026-11-01T00:00:00Z' } };

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the saved login', () => {
  it('keeps the token and a small copy of the profile', () => {
    saveSession(session);
    expect(getToken()).toBe('a.b.c');
    expect(getCachedUser()).toEqual({ username: 'tony', displayName: 'Tony', avatarHue: 200, role: 'user' });
  });

  it('never keeps the password, the id or dates', () => {
    saveSession({ token: 'a.b.c', user: { ...session.user, password: 'secret words', _id: 'x'.repeat(24), passwordHash: 'h' } });
    const everything = JSON.stringify({ ...localStorage });
    expect(everything).not.toContain('secret words');
    expect(everything).not.toContain('passwordHash');
    expect(everything).not.toContain('xxxxxxxx');
    expect(everything).not.toContain('createdAt');
  });

  it('signing out forgets both, and tells the page', () => {
    saveSession(session);
    const heard = vi.fn();
    window.addEventListener(SIGNED_OUT_EVENT, heard);
    clearSession();
    window.removeEventListener(SIGNED_OUT_EVENT, heard);
    expect(getToken()).toBeNull();
    expect(getCachedUser()).toBeNull();
    expect(localStorage.getItem('libsic:token')).toBeNull();
    expect(localStorage.getItem('libsic:user')).toBeNull();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('does not count a profile copy that has no token with it', () => {
    localStorage.setItem('libsic:user', JSON.stringify(session.user));
    expect(getCachedUser()).toBeNull();
  });

  it('ignores a damaged profile copy, and cannot be made an admin by editing it into something odd', () => {
    localStorage.setItem('libsic:token', 'a.b.c');
    localStorage.setItem('libsic:user', '{not json');
    expect(getCachedUser()).toBeNull();
    localStorage.setItem('libsic:user', JSON.stringify({ username: 'x', role: ['admin'], avatarHue: 'red' }));
    expect(getCachedUser()).toEqual({ username: 'x', displayName: '', avatarHue: 38, role: 'user' });
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getToken()).toBeNull();
    expect(getCachedUser()).toBeNull();
    expect(() => saveSession(session)).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });
});
