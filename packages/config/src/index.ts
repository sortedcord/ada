import { z } from 'zod';
export * from './ai-settings.js';
export * from './role-validation.js';

const booleanFromEnv = z.enum(['true', 'false']).transform((value) => value === 'true');

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  REQUEST_ID_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+$/i)
    .default('x-request-id'),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
  REDIS_URL: z.string().url().or(z.string().startsWith('redis://')),
  GENERATION_ENABLED: booleanFromEnv.default('false'),
  GENERATION_PROVIDER: z.string().min(1),
  GENERATION_BASE_URL: z.string().url(),
  GENERATION_API_KEY: z.string().min(1),
  GENERATION_API: z.enum(['chat-completions']).default('chat-completions'),
  GENERATION_MODELS_REFRESH_SECONDS: z.coerce.number().int().positive().default(3600),
  GENERATION_DEFAULT_MODEL: z.string().min(1),
  GENERATION_MAX_RESPONSE_LENGTH: z.coerce.number().int().min(20).max(4000).default(150),
  EMBEDDING_ENABLED: booleanFromEnv.default('false'),
  EMBEDDING_PROVIDER: z.string().default(''),
  EMBEDDING_BASE_URL: z.string().url().or(z.literal('')).default(''),
  EMBEDDING_API_KEY: z.string().default(''),
  EMBEDDING_MODEL: z.string().default(''),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  EMBEDDING_DISTANCE: z.enum(['cosine', 'l2', 'inner_product']).default('cosine'),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(256).default(64),
  REMOTE_ACCESS_ENABLED: booleanFromEnv.default('false'),
  AUTH_SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url().default('http://127.0.0.1:4173'),
  DEBUG_INSPECTORS_ENABLED: booleanFromEnv.default('false'),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function loadServerEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server configuration: ${details}`);
  }
  if (result.data.REMOTE_ACCESS_ENABLED && !result.data.DEBUG_INSPECTORS_ENABLED) {
    // Debug access remains disabled unless explicitly enabled; this is safe and intentional.
  }
  return result.data;
}

export const browserRuntimeConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  appVersion: z.string().min(1),
  debugInspectorsAvailable: z.boolean(),
});

export type BrowserRuntimeConfig = z.infer<typeof browserRuntimeConfigSchema>;

export function toBrowserRuntimeConfig(
  environment: Pick<ServerEnvironment, 'CORS_ORIGIN' | 'DEBUG_INSPECTORS_ENABLED'>,
  appVersion: string,
): BrowserRuntimeConfig {
  return {
    apiBaseUrl: environment.CORS_ORIGIN,
    appVersion,
    debugInspectorsAvailable: environment.DEBUG_INSPECTORS_ENABLED,
  };
}
