import { createHash } from 'node:crypto';
import type { PromptDefinition } from './index.js';
import { NATURALISTIC_DIALOGUE_GUIDELINES } from './naturalistic-dialogue.js';

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function delimit(label: string, value: string): string {
  return `\n<untrusted-data name="${label}">\n${value}\n</untrusted-data>\n`;
}
function genericPrompt(
  name: string,
  privacyClass: PromptDefinition<unknown>['privacyClass'],
  contract: string,
): PromptDefinition<{ context: string; task: string }> {
  return {
    name,
    version: 1,
    privacyClass,
    maxInputTokens: 24_000,
    render: (input) => {
      const system = `${contract}\nReturn only the registered structured output for ${name}.`;
      const user = `${system}\nContext:${delimit('authorized-context', input.context)}Task:${delimit('task', input.task)}`;
      return { system, user, hash: stableHash(`${system}\n${user}`) };
    },
  };
}

export interface PlayerIntentInput {
  rawInput: string;
  rules: string;
}
export const playerIntentPrompt: PromptDefinition<PlayerIntentInput> = {
  name: 'player-intent',
  version: 1,
  privacyClass: 'player',
  maxInputTokens: 8_000,
  render: (input) => {
    const system =
      'Extract attempted player intent. Never invent player thoughts, motivations, hidden goals, or autonomous decisions.';
    const user = `${system}\nRules:${delimit('rules', input.rules)}Raw player input:${delimit('player-input', input.rawInput)}`;
    return { system, user, hash: stableHash(`${system}\n${user}`) };
  },
};
export interface NarratorInput {
  observations: string;
  style: string;
}
export const narratorPrompt: PromptDefinition<NarratorInput> = {
  name: 'narrator',
  version: 1,
  privacyClass: 'player',
  maxInputTokens: 24_000,
  render: (input) => {
    const system =
      'Render only player-observable events. Never output private NPC thoughts or provider reasoning.';
    const user = `${system}\nStyle:${delimit('style', input.style)}Observations:${delimit('player-observations', input.observations)}`;
    return { system, user, hash: stableHash(`${system}\n${user}`) };
  },
};

export const architectPrompt = genericPrompt(
  'architect',
  'privileged',
  'Plan pacing and opportunities; do not mutate canon or dictate player choices.',
);
export const npcDecisionPrompt = genericPrompt(
  'npc-decision',
  'entity-private',
  "Use only this NPC owner's authorized context. No player thoughts or hidden provider reasoning.",
);
export const resolverPrompt = genericPrompt(
  'resolver',
  'privileged',
  'Propose structured canonical events and allowlisted patches; preserve attempted intent.',
);
export const observationPrompt = genericPrompt(
  'observation-interpretation',
  'entity-private',
  'Interpret only deterministic eligible observations; never add recipients.',
);
export const memoryCuratorPrompt = genericPrompt(
  'memory-curator',
  'entity-private',
  'Curate only owner-scoped evidence and preserve uncertainty/evidence IDs.',
);
export const storyCardMutatorPrompt = genericPrompt(
  'story-card-mutator',
  'privileged',
  'Propose only source-evidenced allowlisted card patches without widening scope.',
);
export const consistencyCriticPrompt = genericPrompt(
  'consistency-critic',
  'privileged',
  'Critique contradictions and policy violations; do not apply mutations.',
);

export const npcPrincipalDecisionPrompt: PromptDefinition<{
  principalEntityId: string;
  contextJson: string;
}> = {
  name: 'npc-principal-decision',
  version: 2,
  privacyClass: 'entity-private',
  maxInputTokens: 16_000,
  render: (input) => {
    const system =
      `You simulate the cognition, private thoughts, and reaction of ONE specific NPC in an interactive narrative.\n` +
      `You are simulating: ${input.principalEntityId}.\n\n` +
      `${NATURALISTIC_DIALOGUE_GUIDELINES}\n\n` +
      `CRITICAL PRINCIPAL INVARIANTS:\n` +
      `1. You control ONLY ${input.principalEntityId}. Never speak, think, decide, or act for any other entity.\n` +
      `2. Never control, invent thoughts for, or dictate actions for the player entity.\n` +
      `3. Use only the owner-scoped observations, memories, and beliefs provided in the input payload.\n` +
      `4. Output must be a JSON object with this exact schema:\n` +
      `{\n` +
      `  "entityId": "${input.principalEntityId}",\n` +
      `  "attention": "unaware" | "noticed" | "focused",\n` +
      `  "reaction": "none" | "think_only" | "speak" | "act" | "speak_and_act",\n` +
      `  "speech": "<spoken dialogue out loud>",\n` +
      `  "attemptedActions": [],\n` +
      `  "generatedThoughts": [\n` +
      `    {"text": "<private inner thought>", "persistence": "ephemeral", "salience": 0.8, "urgency": 0.5}\n` +
      `  ],\n` +
      `  "beliefProposals": [],\n` +
      `  "goalUpdates": [],\n` +
      `  "perceivedEvidenceIds": []\n` +
      `}`;
    const user = `${system}\nAuthorized Context for ${input.principalEntityId}:${delimit('authorized-npc-context', input.contextJson)}`;
    return { system, user, hash: stableHash(`${system}\n${user}`) };
  },
};

export const registeredPromptDefinitions = [
  playerIntentPrompt,
  architectPrompt,
  npcDecisionPrompt,
  npcPrincipalDecisionPrompt,
  resolverPrompt,
  observationPrompt,
  narratorPrompt,
  memoryCuratorPrompt,
  storyCardMutatorPrompt,
  consistencyCriticPrompt,
] as const;
