import { describe, expect, it } from 'vitest';
import {
  ANTI_SLOP_GUIDELINES,
  AI_TELL_TERMS,
  authoringPromptDefinitions,
  characterAuthoringPrompt,
  locationAuthoringPrompt,
  narratorPrompt,
  playerIntentPrompt,
} from './index.js';

describe('anti-slop writing guidance', () => {
  it('includes the requested AI-tell words and phrases', () => {
    const requiredTerms = [
      'delve',
      'tapestry',
      'vibrant',
      'journey',
      'landscape',
      'realm',
      'crucial',
      'foster',
      'leverage',
      'harness',
      'embark',
      'testament',
      'beacon',
      'symphony',
      'pinnacle',
      'unveil',
      'groundbreaking',
      'moreover',
      'furthermore',
      "it's important to note",
      "it's worth noting",
      'rich tapestry',
      'bustling city',
      'nestled in',
      'a testament to',
      'sends shivers down',
      'eyes widened',
      'a dance of',
      'in the tapestry of',
      'on the precipice of',
    ];

    expect(AI_TELL_TERMS.length).toBeGreaterThanOrEqual(30);
    for (const term of requiredTerms) expect(AI_TELL_TERMS).toContain(term);
    expect(ANTI_SLOP_GUIDELINES).toContain('guidance, not an absolute lexical ban');
  });

  it('gives actionable pattern warnings and positive style guidance', () => {
    expect(ANTI_SLOP_GUIDELINES).toContain('three-adjective piles');
    expect(ANTI_SLOP_GUIDELINES).toContain('summarize an emotion after already showing it');
    expect(ANTI_SLOP_GUIDELINES).toContain("instantly diagnose each other's psychology");
    expect(ANTI_SLOP_GUIDELINES).toContain('immediately agree with a persuasive argument');
    expect(ANTI_SLOP_GUIDELINES).toContain('thematic takeaway');
    expect(ANTI_SLOP_GUIDELINES).toContain('Concrete sensory specifics');
    expect(ANTI_SLOP_GUIDELINES).toContain('Varied sentence lengths');
    expect(ANTI_SLOP_GUIDELINES).toContain('Leave some things undescribed');
    expect(ANTI_SLOP_GUIDELINES).toContain('Contradictions, mundane habits');
    expect(ANTI_SLOP_GUIDELINES).toContain('Silence and omission');
    expect(ANTI_SLOP_GUIDELINES.length).toBeLessThan(6000);
  });
});

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
