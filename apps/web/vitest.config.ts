import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Playwright E2E specs (e2e/**) are picked up by `playwright test`, not by
    // vitest. Exclude them here so unit-test runs don't try to load `@playwright/test`.
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**', '.next/**'],
  },
});
