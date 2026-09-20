/* eslint-disable */
import { AdityaGuptaGenerationProvider, type GenerationProvider } from '@ada/ai';
import { and, eq } from 'drizzle-orm';
import type { ServerEnvironment } from '@ada/config';
import type { Database } from '@ada/db';
import {
  aiInvocations,
  appSettings,
  narrativeSegments,
  runs,
  scenarioRevisions,
  turnStageResults,
} from '@ada/db';
import { z } from 'zod';

const dialogueAttributionSchema = z.object({
  quote: z.string().min(1).max(8_192),
  speakerEntityId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const dialogueAttributionBatchSchema = z.object({
  attributions: z.array(dialogueAttributionSchema).max(100),
});

const quoteOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['attributions'],
  properties: {
    attributions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'speakerEntityId', 'confidence'],
        properties: {
          quote: { type: 'string' },
          speakerEntityId: { type: ['string', 'null'] },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

export async function processDialogueAttribution(
  database: Database,
  environment: ServerEnvironment,
  runId: string,
  turnId: string,
  segmentId: string,
  providerOverride?: GenerationProvider,
): Promise<void> {
  const [segment] = await database
    .select()
    .from(narrativeSegments)
    .where(and(eq(narrativeSegments.id, segmentId), eq(narrativeSegments.turnId, turnId)))
    .limit(1);
  if (!segment || !segment.text.trim()) return;

  const existingAttributions = (segment.attribution as Record<string, unknown> | null)?.dialogueAttributions;
  if (Array.isArray(existingAttributions) && existingAttributions.length > 0) return;

  const [run] = await database.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return;
  const [revision] = await database
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, run.scenarioRevisionId))
    .limit(1);
  if (!revision) return;

  let activeModel = environment.GENERATION_DEFAULT_MODEL;
  const [modelSetting] = await database
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, 'active_model'))
    .limit(1);
  if (typeof (modelSetting?.value as { model?: unknown } | undefined)?.model === 'string') {
    activeModel = (modelSetting?.value as { model: string }).model;
  }

  const aggregate = revision.aggregate as {
    entities?: Array<{ id: string; name?: string; publicDescription?: string; playable?: boolean }>;
  };
  const characters = (aggregate.entities ?? []).map((entity) => ({
    id: entity.id,
    name: entity.name ?? entity.id,
    description: entity.publicDescription ?? '',
    playable: Boolean(entity.playable),
  }));
  const [npcStage] = await database
    .select({ validatedOutput: turnStageResults.validatedOutput })
    .from(turnStageResults)
    .where(and(eq(turnStageResults.turnId, turnId), eq(turnStageResults.stage, 'NPC_DECISIONS_GENERATED')))
    .limit(1);
  const candidateSpeech = Array.isArray((npcStage?.validatedOutput as any)?.decisions)
    ? (npcStage?.validatedOutput as any).decisions.map((decision: any) => ({
        speakerEntityId: decision.entityId,
        speech: decision.speech ?? '',
      }))
    : [];

  const input = JSON.stringify({
    narrative: segment.text,
    characters,
    candidateSpeech,
    rules: {
      onlyAttribute: 'exact quoted dialogue found in the narrative',
      quote: 'Return the quote text without surrounding quotation marks.',
      speaker: 'Use a character id only when the narrative provides enough evidence; otherwise use null.',
      uncertainty: 'Never force attribution. Confidence must reflect evidence.',
      candidateEvidence: 'Use candidateSpeech and explicit attribution in the narrative to resolve speakers. Do not invent a speaker merely because a character is present.',
      privacy: 'This is post-processing of player-visible prose. Do not infer or expose private thoughts.',
    },
  });

  const provider =
    providerOverride ??
    new AdityaGuptaGenerationProvider({
      baseUrl: environment.GENERATION_BASE_URL,
      apiKey: environment.GENERATION_API_KEY,
      provider: environment.GENERATION_PROVIDER,
      retries: 1,
    });

  const startedAt = Date.now();
  const generated = await provider.generateObject({
    model: activeModel,
    system:
      'You are a post-processing dialogue attribution service. Identify quoted spoken dialogue in the supplied player-visible narrative and attribute each quote to the most likely visible character. Do not rewrite prose. Return only JSON. Never invent dialogue or private information.',
    input,
    schemaName: 'DialogueAttributionBatch',
    schema: quoteOutputSchema,
    outputTokenLimit: 1_000,
    parse: (value: any) =>
      dialogueAttributionBatchSchema.parse({
        attributions: Array.isArray(value?.attributions)
          ? value.attributions.map((item: any) => ({
              quote: String(item?.quote ?? item?.text ?? ''),
              speakerEntityId:
                typeof item?.speakerEntityId === 'string'
                  ? item.speakerEntityId
                  : typeof item?.speakerId === 'string'
                    ? item.speakerId
                    : null,
              confidence: Number(item?.confidence ?? 0.5),
            }))
          : [],
      }),
  });

  const allowedIds = new Set(characters.map((character) => character.id));
  const exactAttributions = generated.value.attributions.filter(
    (item) =>
      (item.speakerEntityId === null || allowedIds.has(item.speakerEntityId)) &&
      (segment.text.includes(`"${item.quote}"`) || segment.text.includes(`“${item.quote}”`)),
  );

  const currentAttribution = (segment.attribution as Record<string, unknown> | null) ?? {};
  await database
    .update(narrativeSegments)
    .set({
      attribution: {
        ...currentAttribution,
        dialogueAttributions: exactAttributions,
        dialogueAttributionStatus: 'completed',
      },
      updatedAt: new Date(),
    })
    .where(eq(narrativeSegments.id, segmentId));

  await database
    .insert(aiInvocations)
    .values({
      id: `inv:${turnId}:dialogue_attribution`,
      role: 'dialogue_diarizer',
      stage: 'DIALOGUE_ATTRIBUTION',
      provider: environment.GENERATION_PROVIDER,
      modelId: activeModel,
      promptVersionId: 'v1.0',
      principalKind: 'PLAYER_VIEW',
      principalEntityId: run.playerEntityId,
      contextPolicyVersion: 1,
      authorizedDocumentIds: [segmentId, ...characters.map((character) => character.id)],
      inputSnapshot: { narrative: segment.text, characters, rules: 'player-visible dialogue attribution' },
      outputSummary: generated.value,
      usage: generated.usage ?? {},
      latencyMs: Date.now() - startedAt,
      validation: { valid: true, attributionCount: exactAttributions.length },
      retryCount: 0,
      correlationId: turnId,
      attribution: { source: 'system', sourceIds: [segmentId] },
    })
    .onConflictDoNothing();
}
