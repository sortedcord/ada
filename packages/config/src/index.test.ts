import { describe, expect, it } from 'vitest';
import { loadServerEnvironment, toBrowserRuntimeConfig } from './index.js';

const valid = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  GENERATION_API_KEY: 'fake-generation-key',
  AUTH_SESSION_SECRET: '01234567890123456789012345678901',
};

describe('server configuration', () => {
  it('applies safe defaults and keeps browser config allowlisted', () => {
    const environment = loadServerEnvironment(valid);
    expect(environment.GENERATION_ENABLED).toBe(false);
    expect(toBrowserRuntimeConfig(environment, '0.1.0')).toEqual({
      apiBaseUrl: 'http://127.0.0.1:4173',
      appVersion: '0.1.0',
      debugInspectorsAvailable: false,
    });
    expect(JSON.stringify(toBrowserRuntimeConfig(environment, '0.1.0'))).not.toContain(
      'fake-generation-key',
    );
  });

  it('fails fast for missing critical secrets', () => {
    expect(() => loadServerEnvironment({ ...valid, AUTH_SESSION_SECRET: undefined })).toThrow(
      'AUTH_SESSION_SECRET',
    );
  });
});
