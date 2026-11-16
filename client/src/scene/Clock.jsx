import { useEffect, useState } from 'react';

// A red seven-segment clock face. It sits on the digit window of the clock in the picture
// and shows the real time of the visitor's computer.
//   segments of one digit: a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle
const SEGMENTS = {
  0: 'abcdef',
  1: 'bc',
  2: 'abdeg',
  3: 'abcdg',
  4: 'bcfg',
  5: 'acdfg',
  6: 'acdefg',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

// Each segment as a polygon inside a 10 x 18 digit box.
const SHAPES = {
  a: '1.6,0.8 8.4,0.8 7.2,2.4 2.8,2.4',
  b: '8.6,1 9.4,1.8 9.4,8.2 8.2,9 7.6,8 7.6,2.6',
  c: '8.2,9 9.4,9.8 9.4,16.2 8.6,17 7.6,15.4 7.6,10',
  d: '1.6,17.2 2.8,15.6 7.2,15.6 8.4,17.2',
  e: '0.6,9.8 1.8,9 2.4,10 2.4,15.4 1.4,17 0.6,16.2',
  f: '0.6,1.8 1.4,1 2.4,2.6 2.4,8 1.8,9 0.6,8.2',
  g: '1.8,9 2.8,8 7.2,8 8.2,9 7.2,10 2.8,10',
};

const DIGIT_WIDTH = 12;

// The time as four digits ("12:45" gives [1, 2, 4, 5]).
export function clockDigits(date) {
  const text = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  return [...text].map(Number);
}

function Digit({ value, x }) {
  const lit = SEGMENTS[value];
  return (
    <g transform={`translate(${x} 0)`}>
      {Object.entries(SHAPES).map(([name, points]) => (
        <polygon key={name} points={points} className={lit.includes(name) ? 'seg on' : 'seg'} />
      ))}
    </g>
  );
}

// `now` is only for tests; the real clock reads the time itself and updates every few seconds.
export default function Clock({ now }) {
  const [time, setTime] = useState(() => now ?? new Date());
  useEffect(() => {
    if (now) return undefined;
    const id = setInterval(() => setTime(new Date()), 5000);
    return () => clearInterval(id);
  }, [now]);

  const digits = clockDigits(now ?? time);
  const xs = [0, DIGIT_WIDTH, 2 * DIGIT_WIDTH + 5, 3 * DIGIT_WIDTH + 5];
  return (
    <svg className="clock-face" viewBox="0 0 53 18" preserveAspectRatio="none" role="img" aria-label="Clock" data-testid="clock">
      {digits.map((value, i) => (
        <Digit key={i} value={value} x={xs[i]} />
      ))}
      <g className="colon">
        <circle cx="26.5" cy="6" r="1.1" className="seg on" />
        <circle cx="26.5" cy="12" r="1.1" className="seg on" />
      </g>
    </svg>
  );
}
