import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Clock, { clockDigits } from './Clock.jsx';

describe('clockDigits', () => {
  it('gives the hours and minutes as four digits', () => {
    expect(clockDigits(new Date(2026, 9, 28, 12, 45))).toEqual([1, 2, 4, 5]);
  });

  it('pads with zeros', () => {
    expect(clockDigits(new Date(2026, 9, 28, 4, 5))).toEqual([0, 4, 0, 5]);
  });
});

describe('Clock', () => {
  it('lights the segments of each digit', () => {
    const { container } = render(<Clock now={new Date(2026, 9, 28, 10, 8)} />);
    // 1 (2 segments) + 0 (6) + 0 (6) + 8 (7) = 21 segments, plus the two dots of the colon
    expect(container.querySelectorAll('polygon.on')).toHaveLength(21);
    expect(container.querySelectorAll('circle.on')).toHaveLength(2);
  });
});
