import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLastRoomCode,
  getEditKey,
  getLastRoomCode,
  getMyRooms,
  removeMyRoom,
  saveMyRoom,
  setLastRoomCode,
  updateMyRoom,
} from './myRooms.js';

const room = (code, extra = {}) => ({ code, editKey: `key-${code}`, name: `Room ${code}`, sceneSlug: 'rainy-cafe', ...extra });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('My rooms storage', () => {
  it('starts empty', () => {
    expect(getMyRooms()).toEqual([]);
  });

  it('remembers saved rooms, newest first', () => {
    saveMyRoom(room('a'));
    saveMyRoom(room('b'));
    expect(getMyRooms().map((r) => r.code)).toEqual(['b', 'a']);
  });

  it('saving the same code again replaces it instead of adding a second one', () => {
    saveMyRoom(room('a', { name: 'Old' }));
    saveMyRoom(room('b'));
    saveMyRoom(room('a', { name: 'New' }));
    expect(getMyRooms().map((r) => [r.code, r.name])).toEqual([['a', 'New'], ['b', 'Room b']]);
  });

  it('updateMyRoom changes fields in place', () => {
    saveMyRoom(room('a'));
    saveMyRoom(room('b'));
    updateMyRoom('a', { name: 'Renamed' });
    expect(getMyRooms().map((r) => [r.code, r.name])).toEqual([['b', 'Room b'], ['a', 'Renamed']]);
  });

  it('removes a room', () => {
    saveMyRoom(room('a'));
    saveMyRoom(room('b'));
    removeMyRoom('a');
    expect(getMyRooms().map((r) => r.code)).toEqual(['b']);
  });

  it('finds the edit key of a room, or null when the browser does not have it', () => {
    saveMyRoom(room('a'));
    expect(getEditKey('a')).toBe('key-a');
    expect(getEditKey('zzz')).toBeNull();
  });

  it('remembers and forgets the last room', () => {
    expect(getLastRoomCode()).toBeNull();
    setLastRoomCode('a');
    expect(getLastRoomCode()).toBe('a');
    clearLastRoomCode('other'); // a different room: nothing happens
    expect(getLastRoomCode()).toBe('a');
    clearLastRoomCode('a');
    expect(getLastRoomCode()).toBeNull();
  });

  it('treats damaged data as an empty list', () => {
    localStorage.setItem('libsic:myRooms', '{not json');
    expect(getMyRooms()).toEqual([]);
    localStorage.setItem('libsic:myRooms', '{"a":1}');
    expect(getMyRooms()).toEqual([]);
    localStorage.setItem('libsic:myRooms', '[null, 5, {"code":"ok"}]');
    expect(getMyRooms()).toEqual([{ code: 'ok' }]);
  });

  it('does not crash when the browser blocks storage, and says the save failed', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getMyRooms()).toEqual([]);
    expect(getLastRoomCode()).toBeNull();
    expect(saveMyRoom(room('a'))).toBe(false);
    expect(setLastRoomCode('a')).toBe(false);
  });
});
