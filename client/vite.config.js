// Part of: Build and test setup.
// Vite (dev server + build) and Vitest (tests run in jsdom, a fake browser; test/setup.js runs first).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    testTimeout: 20000, // slow computers (and the first run) need more than the default 5 seconds for tests that type a lot
  },
});
