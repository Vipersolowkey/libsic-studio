import '@testing-library/jest-dom/vitest';

// jsdom leaves HTMLMediaElement.pause unimplemented and logs an error whenever an unmocked <audio> pauses.
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.pause = () => {};
}
