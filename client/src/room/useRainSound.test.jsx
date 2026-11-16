import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ALONE_BOOST, RAIN_LEVEL, useRainSound } from './useRainSound.js';

function Probe({ on, volume = 0.7, playing = false }) {
  useRainSound(on, volume, playing);
  return null;
}

// A tiny stand-in for the browser's audio, which jsdom does not have.
function fakeAudio() {
  const gain = { value: 0, setTargetAtTime: vi.fn() }; // the master volume: the first gain the rain makes
  let made = false;
  const node = () => ({ connect: (n) => n, start: vi.fn(), buffer: null, loop: false, frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } });
  const ctx = {
    state: 'running',
    sampleRate: 8000,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createBuffer: (c, length) => ({ getChannelData: () => new Float32Array(length) }),
    createGain: () => {
      const own = made ? { value: 0, setTargetAtTime: vi.fn() } : gain;
      made = true;
      return { connect: (n) => n, gain: own };
    },
    createBufferSource: node,
    createBiquadFilter: node,
  };
  window.AudioContext = vi.fn(function () { return ctx; });
  return { ctx, gain };
}

afterEach(() => {
  delete window.AudioContext;
  vi.restoreAllMocks();
});

describe('useRainSound', () => {
  it('does nothing without browser sound support', () => {
    expect(() => render(<Probe on />)).not.toThrow();
  });

  it('stays silent while the rain is off', () => {
    fakeAudio();
    render(<Probe on={false} />);
    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  it('fades the rain in at a fraction of the music volume, and out again', () => {
    const { gain } = fakeAudio();
    const view = render(<Probe on volume={0.5} playing />);
    expect(gain.setTargetAtTime).toHaveBeenCalledWith(RAIN_LEVEL * 0.5, 0, expect.any(Number));
    view.rerender(<Probe on={false} volume={0.5} />);
    expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, expect.any(Number));
  });

  it('is louder when no music plays and steps back when music starts', () => {
    const { gain } = fakeAudio();
    const view = render(<Probe on volume={0.5} playing={false} />);
    expect(gain.setTargetAtTime).toHaveBeenCalledWith(RAIN_LEVEL * 0.5 * ALONE_BOOST, 0, expect.any(Number));
    view.rerender(<Probe on volume={0.5} playing />);
    expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(RAIN_LEVEL * 0.5, 0, expect.any(Number));
  });
});
