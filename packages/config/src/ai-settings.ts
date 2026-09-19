import { z } from 'zod';

export const modelRoleSchema = z.enum([
  'architect',
  'npc',
  'resolver',
  'narrator',
  'memory',
  'mutation',
  'critic',
]);
export const roleSettingsSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  outputTokens: z.number().int().min(64).max(32_000),
  timeoutMs: z.number().int().min(1_000).max(300_000),
  retries: z.number().int().min(0).max(5),
  reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).default('none'),
  promptBudget: z.number().int().min(256).max(1_000_000),
  parallel: z.boolean(),
});
export const roleSettingsMapSchema = z.record(modelRoleSchema, roleSettingsSchema);
export type RoleSettingsMap = z.infer<typeof roleSettingsMapSchema>;
export const embeddingSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  baseUrl: z.string(),
  apiKeyConfigured: z.boolean(),
  model: z.string(),
  dimensions: z.number().int().positive(),
  distance: z.enum(['cosine', 'l2', 'inner_product']),
  batchSize: z.number().int().min(1).max(256),
});
