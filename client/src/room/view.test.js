import { describe, expect, it } from 'vitest';
import { clampZoom, fillZoom, fitWidth, MAX_ZOOM, MIN_ZOOM, panOffset, startZoom } from './view.js';

describe('fitWidth and fillZoom', () => {
  it('a 16:9 window needs no zoom to be filled', () => {
    expect(fitWidth(1600, 900)).toBe(1600);
    expect(fillZoom(1600, 900)).toBeCloseTo(1);
  });

  it('a wide window fits by height, a tall window fits by width', () => {
    expect(fitWidth(2560, 1080)).toBeCloseTo(1920);
    expect(fillZoom(2560, 1080)).toBeCloseTo(2560 / 1920);
    expect(fitWidth(390, 780)).toBe(390);
    expect(fillZoom(390, 780)).toBeCloseTo((780 * 16) / 9 / 390);
  });
});

describe('startZoom', () => {
  it('sits halfway between the whole picture and a filled window', () => {
    expect(startZoom(1600, 900)).toBeCloseTo(1);
    expect(startZoom(1024, 768)).toBeCloseTo(1 + (fillZoom(1024, 768) - 1) / 2);
  });
});

describe('clampZoom', () => {
  it('keeps the zoom between the smallest and the largest', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});

describe('panOffset', () => {
  it('does not move a picture that fits inside the window', () => {
    expect(panOffset({ x: 0, y: 1 }, 1, 1600, 900)).toEqual({ x: 0, y: 0 });
  });

  it('is centred when the mouse is in the middle', () => {
    expect(panOffset({ x: 0.5, y: 0.5 }, 2, 1600, 900)).toEqual({ x: 0, y: 0 });
  });

  it('shows the left edge when the mouse is on the left and the right edge when it is on the right', () => {
    const left = panOffset({ x: 0, y: 0.5 }, 2, 1600, 900);
    const right = panOffset({ x: 1, y: 0.5 }, 2, 1600, 900);
    expect(left.x).toBe(800); // half of the 1600 px that stick out
    expect(right.x).toBe(-800);
  });

  it('only moves the direction in which the picture sticks out', () => {
    // 2560 x 1080: the picture at zoom 1 is 1920 wide, narrower than the window, but as tall as the window.
    const pan = panOffset({ x: 0, y: 0 }, 1.5, 2560, 1080);
    expect(pan.x).toBe(0.5 * (2880 - 2560));
    expect(pan.y).toBeCloseTo(0.5 * (1620 - 1080));
  });
});
