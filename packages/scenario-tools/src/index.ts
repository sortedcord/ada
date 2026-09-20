import { z } from 'zod';
import type { ScenarioAggregate, ValidationIssue } from '@ada/domain';
import { validateScenarioAggregate } from '@ada/domain';

export const authoringCollections = [
  'entities',
  'relationships',
  'locations',
  'locationEdges',
  'storyCards',
  'storyCardLinks',
  'plotArcs',
  'plotPoints',
] as const;
export type AuthoringCollection = (typeof authoringCollections)[number];

export const scenarioOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('add'), collection: z.enum(authoringCollections), value: z.unknown() }),
  z.object({ operation: z.literal('replace'), collection: z.enum(authoringCollections), resourceId: z.string().min(1), value: z.unknown() }),
  z.object({ operation: z.literal('remove'), collection: z.enum(authoringCollections), resourceId: z.string().min(1) }),
]);
export type ScenarioOperation = z.infer<typeof scenarioOperationSchema>;

export const proposalStatusSchema = z.enum(['ready', 'edited', 'approved', 'rejected', 'stale', 'applied', 'failed']);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const scenarioProposalSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  revisionId: z.string().min(1),
  baseVersion: z.number().int().positive(),
  toolName: z.string().min(1).max(128),
  summary: z.string().min(1).max(4_000),
  operations: z.array(scenarioOperationSchema).min(1).max(100),
  validation: z.object({
    valid: z.boolean(),
    errors: z.array(z.record(z.unknown())),
    warnings: z.array(z.record(z.unknown())),
  }),
  model: z.string().optional(),
  promptVersion: z.number().int().positive().optional(),
  status: proposalStatusSchema,
});
export type ScenarioProposal = z.infer<typeof scenarioProposalSchema>;

export interface ScenarioToolContext {
  scenarioId: string;
  revisionId: string;
  baseVersion: number;
  aggregate: ScenarioAggregate;
}

function collectionOf(aggregate: ScenarioAggregate, collection: AuthoringCollection): unknown[] {
  return aggregate[collection];
}

export function applyOperationsToAggregate(
  source: ScenarioAggregate,
  operations: readonly ScenarioOperation[],
): ScenarioAggregate {
  const aggregate: ScenarioAggregate = structuredClone(source);
  for (const operation of operations) {
    const collection = collectionOf(aggregate, operation.collection);
    if (operation.operation === 'add') {
      collection.push(structuredClone(operation.value));
    } else if (operation.operation === 'replace') {
      const index = collection.findIndex((item) =>
        typeof item === 'object' && item !== null && 'id' in item && item.id === operation.resourceId,
      );
      if (index < 0) throw new Error(`${operation.collection} resource ${operation.resourceId} not found`);
      collection[index] = structuredClone(operation.value);
    } else {
      const index = collection.findIndex((item) =>
        typeof item === 'object' && item !== null && 'id' in item && item.id === operation.resourceId,
      );
      if (index < 0) throw new Error(`${operation.collection} resource ${operation.resourceId} not found`);
      collection.splice(index, 1);
    }
  }
  return aggregate;
}

export function validateOperations(
  source: ScenarioAggregate,
  operations: readonly ScenarioOperation[],
): { aggregate: ScenarioAggregate; valid: boolean; errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const aggregate = applyOperationsToAggregate(source, operations);
  const result = validateScenarioAggregate(aggregate);
  return { aggregate, ...result };
}

export interface CharacterProposalInput {
  id: string;
  revisionId: string;
  name: string;
  startingLocationId: string;
  publicDescription: string;
  privateDescription?: string;
  personality?: string[];
  goals?: string[];
  fears?: string[];
  secrets?: string[];
  playable?: boolean;
}

export function characterProposal(input: CharacterProposalInput): ScenarioOperation[] {
  return [{
    operation: 'add',
    collection: 'entities',
    value: {
      id: input.id,
      revisionId: input.revisionId,
      name: input.name,
      aliases: [],
      pronouns: 'they/them',
      kind: 'character',
      tags: [],
      publicDescription: input.publicDescription,
      privateDescription: input.privateDescription ?? '',
      history: '',
      historicalEvents: [],
      appearance: '',
      personality: input.personality ?? [],
      speechStyle: '',
      values: [],
      drives: [],
      goals: input.goals ?? [],
      fears: input.fears ?? [],
      desires: [],
      capabilities: [],
      limitations: [],
      secrets: input.secrets ?? [],
      stats: {},
      structuredAttributes: {},
      constraints: [],
      aiMutationPolicy: 'manual_only',
      playable: input.playable ?? false,
      cognitive: true,
      alive: true,
      active: true,
      startingLocationId: input.startingLocationId,
      metadata: { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', version: 1, schemaVersion: 1, attribution: { source: 'player', sourceIds: [] } },
    },
  }];
}
