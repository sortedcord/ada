import { createHash } from 'node:crypto';
import type { PromptDefinition } from './index.js';

function renderAuthoring(name: string, contract: string, input: { brief: string; context: string; constraints?: readonly string[] }) {
  const system = `${contract}\nReturn only JSON matching the registered schema for ${name}. Do not apply changes. Do not invent player choices. Preserve canon and visibility scopes.`;
  const user = `${system}\n<untrusted-data name="scenario-context">${input.context}</untrusted-data>\n<untrusted-data name="author-brief">${input.brief}</untrusted-data>\n<untrusted-data name="constraints">${(input.constraints ?? []).join('\n')}</untrusted-data>`;
  return { system, user, hash: createHash('sha256').update(`${system}\n${user}`).digest('hex') };
}

export const characterAuthoringPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-character-authoring', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-character-authoring', 'Create a layered character with public/private descriptions, contradiction, motivations, relationships, discoverable secrets, and at least two interaction hooks.', input),
};
export const locationAuthoringPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-location-authoring', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-location-authoring', 'Create an interactive location with public/private details, sensory identity, access rules, hazards, traversal affordances, and discovery hooks.', input),
};
export const historicalEventAuthoringPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-historical-event-authoring', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-historical-event-authoring', 'Create a causal past event with participants, chronology, consequences, present-day hooks, and scoped knowledge.', input),
};
export const storyCardAuthoringPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-story-card-authoring', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-story-card-authoring', 'Create a story card with canonical truth, player-visible rendering, activation hints, links, and non-widening visibility.', input),
};
export const plotPointAuthoringPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-plot-point-authoring', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-plot-point-authoring', 'Create a non-railroading plot point with evidence-backed preconditions, multiple affordances, failure paths, escalation options, and forbidden outcomes.', input),
};
export const scenarioContinuityPrompt: PromptDefinition<{ brief: string; context: string; constraints?: readonly string[] }> = {
  name: 'scenario-continuity-review', version: 1, privacyClass: 'privileged', maxInputTokens: 24_000,
  render: (input) => renderAuthoring('scenario-continuity-review', 'Review the scenario for orphaned resources, contradictions, inaccessible secrets, weak hooks, duplicate concepts, and epistemic scope violations. Return findings only.', input),
};

export const authoringPromptDefinitions = [characterAuthoringPrompt, locationAuthoringPrompt, historicalEventAuthoringPrompt, storyCardAuthoringPrompt, plotPointAuthoringPrompt, scenarioContinuityPrompt] as const;
