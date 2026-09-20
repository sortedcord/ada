import { registeredPromptDefinitions } from './builders.js';
import { authoringPromptDefinitions } from './authoring.js';

export interface PromptDefinition<TInput> {
  readonly name: string;
  readonly version: number;
  readonly privacyClass: 'public' | 'player' | 'entity-private' | 'privileged';
  readonly maxInputTokens: number;
  render(input: TInput): { readonly system: string; readonly user: string; readonly hash: string };
}

export const promptRegistry = new Map<string, PromptDefinition<unknown>>();

export function registerPrompt<TInput>(definition: PromptDefinition<TInput>): void {
  const key = `${definition.name}@${definition.version}`;
  if (promptRegistry.has(key)) throw new Error(`Prompt already registered: ${key}`);
  promptRegistry.set(key, definition);
}

export * from './builders.js';
export * from './naturalistic-dialogue.js';
export * from './authoring.js';

for (const definition of [...registeredPromptDefinitions, ...authoringPromptDefinitions]) {
  const key = `${definition.name}@${definition.version}`;
  if (!promptRegistry.has(key)) promptRegistry.set(key, definition);
}
