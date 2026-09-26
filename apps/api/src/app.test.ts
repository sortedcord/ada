import { describe, expect, it } from 'vitest';
import type { ServerEnvironment } from '@ada/config';
import { buildApp } from './app.js';

const environment = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  HOST: '127.0.0.1',
  API_PORT: 3000,
  REQUEST_ID_HEADER: 'x-request-id',
  DATABASE_URL: 'postgres://user:password@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  GENERATION_ENABLED: false,
  GENERATION_PROVIDER: 'test',
  GENERATION_BASE_URL: 'https://example.com/v1',
  GENERATION_API_KEY: 'fake-generation-key',
  GENERATION_API: 'chat-completions',
  GENERATION_MODELS_REFRESH_SECONDS: 3600,
  GENERATION_DEFAULT_MODEL: 'fake-model',
  GENERATION_MAX_RESPONSE_LENGTH: 150,
  EMBEDDING_ENABLED: false,
  EMBEDDING_PROVIDER: '',
  EMBEDDING_BASE_URL: '',
  EMBEDDING_API_KEY: '',
  EMBEDDING_MODEL: '',
  EMBEDDING_DIMENSIONS: 1536,
  EMBEDDING_DISTANCE: 'cosine',
  EMBEDDING_BATCH_SIZE: 64,
  REMOTE_ACCESS_ENABLED: false,
  AUTH_SESSION_SECRET: '01234567890123456789012345678901',
  CORS_ORIGIN: 'http://127.0.0.1:4173',
  DEBUG_INSPECTORS_ENABLED: false,
} satisfies ServerEnvironment;

describe('API foundation', () => {
  it('serves liveness and a request correlation id', async () => {
    const app = buildApp(environment);
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.json()).toMatchObject({ status: 'ok', service: 'api' });
    await app.close();
  });

  it('publishes an OpenAPI document and safe system info', async () => {
    const app = buildApp(environment);
    const openapi = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    expect(openapi.statusCode).toBe(200);
    expect(openapi.body).toContain('"openapi":"3.1.0"');
    expect(openapi.body).toContain('"paths"');
    const info = await app.inject({ method: 'GET', url: '/api/v1/system/info' });
    expect(info.json()).not.toHaveProperty('GENERATION_API_KEY');
    await app.close();
  });

  it('reports dependency readiness without exposing dependency details', async () => {
    const app = buildApp(environment, () => Promise.resolve(false));
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable', service: 'api', version: '0.1.0' });
    await app.close();
  });
});
