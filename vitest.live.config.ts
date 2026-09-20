import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    isolate: true,
    testTimeout: 180_000,
    hookTimeout: 180_000,
    include: ['src/**/*.live.test.ts'],
  },
});
