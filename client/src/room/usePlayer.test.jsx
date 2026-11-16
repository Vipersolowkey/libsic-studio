import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayer } from './usePlayer.js';

const cd = { title: 'CD', tracks: [{ title: 'One', src: '/1.mp3' }, { title: 'Two', src: '/2.mp3' }, { title: 'Three', src: '/3.mp3' }] };

// The test browser cannot play sound, so play and pause are replaced by pretend ones.
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('usePlayer', () => {
  it('starts paused on the first track', () => {
    const { result } = renderHook(() => usePlayer(cd));
    expect(result.current).toMatchObject({ index: 0, count: 3, playing: false, track: cd.tracks[0] });
  });

  it('plays and pauses', () => {
    const { result } = renderHook(() => usePlayer(cd));
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('goes to the next and the previous track, and around the ends of the CD', () => {
    const { result } = renderHook(() => usePlayer(cd));
    act(() => result.current.prev());
    expect(result.current.track.title).toBe('Three');
    act(() => result.current.next());
    expect(result.current.track.title).toBe('One');
    act(() => result.current.next());
    expect(result.current.track.title).toBe('Two');
  });

  it('shows paused again when the browser refuses to start the sound', async () => {
    HTMLMediaElement.prototype.play.mockRejectedValue(new Error('not allowed'));
    const { result } = renderHook(() => usePlayer(cd));
    await act(async () => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('remembers the volume in the browser and keeps it between 0 and 1', () => {
    const { result } = renderHook(() => usePlayer(cd));
    act(() => result.current.setVolume(0.3));
    expect(result.current.volume).toBe(0.3);
    expect(renderHook(() => usePlayer(cd)).result.current.volume).toBe(0.3);
    act(() => result.current.setVolume(5));
    expect(result.current.volume).toBe(1);
  });
});
