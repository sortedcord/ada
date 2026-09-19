import { z } from 'zod';
import { paginationSchema } from '@ada/domain';

export const apiErrorSchema = z.object({
  code: z.string().min(1).max(100),
  message: z.string().min(1).max(2_000),
  issues: z
    .array(z.object({ path: z.string().max(500), message: z.string().max(1_000) }))
    .max(100)
    .default([]),
  requestId: z.string().min(1).max(128),
  retryable: z.boolean(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unavailable']),
  service: z.string().min(1).max(100),
  version: z.string().min(1).max(100),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const listQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  tag: z.string().max(64).optional(),
  status: z.string().max(64).optional(),
});
export const optimisticMutationSchema = z.object({ expectedVersion: z.number().int().positive() });
export const conflictResponseSchema = z.object({
  code: z.literal('conflict'),
  message: z.string(),
  requestId: z.string(),
  retryable: z.literal(false),
  currentVersion: z.number().int().positive(),
});
export const scenarioExportManifestSchema = z.object({
  kind: z.literal('scenario'),
  schemaVersion: z.literal('scenario.v1'),
  scenarioId: z.string().min(1),
  revision: z.number().int().positive(),
  exportedAt: z.string().datetime().optional(),
  contentChecksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export const scenarioExportSchema = scenarioExportManifestSchema.extend({
  aggregate: z.record(z.unknown()),
});

export const sseEventSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum([
    'turn.accepted',
    'turn.stage_changed',
    'turn.narration_started',
    'turn.narration_delta',
    'turn.narration_completed',
    'turn.background_status',
    'turn.completed',
    'turn.failed',
    'turn.cancelled',
    'heartbeat',
  ]),
  data: z.record(z.unknown()),
});
