import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    isolate: true,
    testTimeout: 10_000,
    coverage: { provider: 'v8', reporter: ['text', 'json', 'html'], reportsDirectory: 'coverage' },
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/*.integration.test.ts', '**/*.live.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
