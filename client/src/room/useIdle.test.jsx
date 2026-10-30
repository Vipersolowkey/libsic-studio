import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useIdle } from './useIdle.js';

function Probe() {
  return <p>{useIdle(4000) ? 'idle' : 'active'}</p>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useIdle', () => {
  it('becomes idle after the delay and wakes up when the mouse moves', () => {
    render(<Probe />);
    expect(screen.getByText('active')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText('idle')).toBeInTheDocument();

    act(() => {
      fireEvent.pointerMove(window);
    });
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('starts the delay again after each movement', () => {
    render(<Probe />);
    act(() => vi.advanceTimersByTime(3000));
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('active')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});
