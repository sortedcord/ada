import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    isolate: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
