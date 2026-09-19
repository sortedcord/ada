import { describe, expect, it } from 'vitest';
import { narratorPrompt, playerIntentPrompt } from './index.js';

describe('prompt builders', () => {
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
