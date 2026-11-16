import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HoloPlayer, { clockLines, formatTime } from './HoloPlayer.jsx';

const player = (extra = {}) => ({
  cd: { title: 'Test CD' },
  track: { title: 'Lamp Light' },
  index: 0,
  count: 3,
  playing: false,
  time: 0,
  duration: 0,
  volume: 0.7,
  toggle: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  ...extra,
});
const tuesday = new Date(2026, 10, 10, 16, 19);

describe('formatTime', () => {
  it('writes seconds as minutes and seconds', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65.9)).toBe('01:05');
    expect(formatTime(NaN)).toBe('00:00');
  });
});

describe('clockLines', () => {
  it('gives the day, the date and the time', () => {
    expect(clockLines(tuesday)).toEqual({ day: 'Tuesday', date: '10 November, 2026.', time: '16:19' });
  });
});

describe('HoloPlayer', () => {
  it('is a clock until music is started', () => {
    render(<HoloPlayer player={player()} now={tuesday} />);
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('10 November, 2026.')).toBeInTheDocument();
    expect(screen.getByText('16:19')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('shows the track, the CD and the time left while music plays, and keeps the title when paused', () => {
    const { rerender } = render(<HoloPlayer player={player({ playing: true, time: 12, duration: 51 })} now={tuesday} />);
    expect(screen.getByText('Lamp Light')).toBeInTheDocument();
    expect(screen.getByText('Test CD · 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('00:12')).toBeInTheDocument();
    expect(screen.getByText('-00:39')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    rerender(<HoloPlayer player={player({ time: 12, duration: 51 })} now={tuesday} />);
    expect(screen.getByText('Lamp Light')).toBeInTheDocument();
  });

  it('passes the button presses on to the player', async () => {
    const p = player({ duration: 51 });
    render(<HoloPlayer player={p} now={tuesday} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next track' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(p.toggle).toHaveBeenCalledTimes(1);
    expect(p.next).toHaveBeenCalledTimes(1);
    expect(p.prev).toHaveBeenCalledTimes(1);
  });
});
