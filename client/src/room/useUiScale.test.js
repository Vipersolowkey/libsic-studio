import { describe, expect, it } from 'vitest';
import { uiScaleFor } from './useUiScale.js';

describe('uiScaleFor', () => {
  it('keeps the normal size on a small window and never goes below 1', () => {
    expect(uiScaleFor(1024, 700)).toBe(1);
    expect(uiScaleFor(360, 640)).toBe(1);
  });
  it('grows with a big window, in steps of 0.05', () => {
    expect(uiScaleFor(1920, 1080)).toBe(1.4);
    expect(uiScaleFor(2000, 1306)).toBe(1.55);
  });
  it('stops at 1.7, and is held back by a low window', () => {
    expect(uiScaleFor(3840, 2160)).toBe(1.7);
    expect(uiScaleFor(2400, 800)).toBe(1.05);
  });
});
