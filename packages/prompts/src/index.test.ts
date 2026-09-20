import { describe, expect, it } from 'vitest';
import {
  ANTI_SLOP_GUIDELINES,
  authoringPromptDefinitions,
  characterAuthoringPrompt,
  locationAuthoringPrompt,
  narratorPrompt,
  playerIntentPrompt,
} from './index.js';

describe('prompt builders', () => {
  it('registers the versioned authoring prompts with craft guidance', () => {
    const rendered = characterAuthoringPrompt.render({ brief: 'A dockworker who lies about one missing bell.', context: '{}', constraints: [] });
    expect(authoringPromptDefinitions).toHaveLength(6);
    expect(authoringPromptDefinitions.every((prompt) => prompt.version === 2)).toBe(true);
    expect(authoringPromptDefinitions.every((prompt) => prompt.render({ brief: 'brief', context: '{}', constraints: [] }).system.includes('CRAFT EXAMPLE'))).toBe(true);
    expect(characterAuthoringPrompt.version).toBe(2);
    expect(locationAuthoringPrompt.version).toBe(2);
    expect(rendered.system).toContain('specific speech style');
    expect(rendered.system).toContain('# NATURALISTIC CHARACTER DIALOGUE');
    expect(rendered.system).toContain('LOCAL PERSPECTIVE');
    expect(rendered.system).toContain('delve');
    expect(rendered.system).toContain('CRAFT EXAMPLE');
    expect(rendered.hash).toHaveLength(64);
    expect(ANTI_SLOP_GUIDELINES).toContain('interrupt');
  });

  it('delimits untrusted content and excludes private canaries from unrelated prompts', () => {
    const rendered = narratorPrompt.render({ observations: 'PUBLIC_EVENT', style: 'brief' });
    expect(rendered.user).toContain('<untrusted-data name="player-observations">');
    expect(rendered.user).not.toContain('NPC_A_SECRET_CANARY_ONLY');
    expect(rendered.hash).toHaveLength(64);
    expect(
      playerIntentPrompt.render({ rawInput: 'I wait', rules: 'No hidden cognition' }).user,
    ).toContain('I wait');
  });
});
