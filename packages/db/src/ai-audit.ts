import type { Database } from './index.js';
import { aiInvocations } from './schema.js';

export async function recordAiInvocation(
  db: Database,
  input: {
    id: string;
    role: string;
    stage: string;
    principalKind?: string;
    principalEntityId?: string;
    provider: string;
    modelId: string;
    promptVersionId: string;
    contextPolicyVersion?: number;
    inputHash?: string;
    inputSnapshot?: unknown;
    outputSummary?: unknown;
    authorizedDocumentIds: readonly string[];
    usage?: unknown;
    latencyMs?: number;
    validation: unknown;
    retryCount: number;
    correlationId: string;
    rawRetention?: boolean;
  },
): Promise<void> {
  await db.insert(aiInvocations).values({
    id: input.id,
    role: input.role,
    stage: input.stage,
    principalKind: input.principalKind,
    principalEntityId: input.principalEntityId,
    provider: input.provider,
    modelId: input.modelId,
    promptVersionId: input.promptVersionId,
    contextPolicyVersion: input.contextPolicyVersion ?? 1,
    inputHash: input.inputHash,
    inputSnapshot: input.inputSnapshot ?? {},
    outputSummary: input.outputSummary ?? {},
    authorizedDocumentIds: input.authorizedDocumentIds,
    usage: input.usage ?? {},
    latencyMs: input.latencyMs,
    validation: input.validation,
    retryCount: input.retryCount,
    correlationId: input.correlationId,
    rawRetention: input.rawRetention ?? false,
    attribution: { source: 'system', sourceIds: input.authorizedDocumentIds },
  });
}
