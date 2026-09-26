import { describe, expect, it } from 'vitest';
import {
  ANTI_SLOP_GUIDELINES,
  AI_TELL_TERMS,
  authoringPromptDefinitions,
  characterAuthoringPrompt,
  CURRENT_AUTHORING_PROMPT_VERSION,
  currentAuthoringPromptDefinitions,
  LEGACY_AUTHORING_PROMPT_VERSION,
  scenarioAuthoringChatPrompt,
  legacyAuthoringPromptDefinitions,
  locationAuthoringPrompt,
  narratorPrompt,
  playerIntentPrompt,
  promptRegistry,
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

describe('authoring prompt contracts', () => {
  const input = {
    brief: 'A dockworker who lies about one missing bell.',
    context: '{}',
    constraints: [],
  };

  it('keeps v2 available for auditability, registers chat, and makes v3 current', () => {
    expect(LEGACY_AUTHORING_PROMPT_VERSION).toBe(2);
    expect(CURRENT_AUTHORING_PROMPT_VERSION).toBe(3);
    expect(legacyAuthoringPromptDefinitions).toHaveLength(6);
    expect(currentAuthoringPromptDefinitions).toHaveLength(6);
    expect(authoringPromptDefinitions).toHaveLength(13);
    expect(scenarioAuthoringChatPrompt.name).toBe('scenario-authoring-chat');
    expect(scenarioAuthoringChatPrompt.version).toBe(1);
    expect(scenarioAuthoringChatPrompt.render(input).system).toContain('Ask specific questions');
    expect(legacyAuthoringPromptDefinitions.every((prompt) => prompt.version === 2)).toBe(true);
    expect(currentAuthoringPromptDefinitions.every((prompt) => prompt.version === 3)).toBe(true);

    for (const prompt of currentAuthoringPromptDefinitions) {
      expect(promptRegistry.has(`${prompt.name}@2`)).toBe(true);
      expect(promptRegistry.has(`${prompt.name}@3`)).toBe(true);
      const rendered = prompt.render(input);
      expect(rendered.system).toContain('ANTI-SLOP CHECK');
      expect(rendered.system).toContain('forging a path');
      // Count the full request, including the repeated system prompt in `user`.
      expect(Math.ceil(rendered.user.length / 4)).toBeLessThan(prompt.maxInputTokens);
    }

    for (const prompt of legacyAuthoringPromptDefinitions) {
      expect(promptRegistry.has(`${prompt.name}@2`)).toBe(true);
      const rendered = prompt.render(input);
      expect(rendered.system).toContain('ANTI-SLOP CHECK');
      expect(rendered.system).not.toContain('forging a path');
      expect(rendered.system).not.toContain('not an absolute lexical ban');
      expect(Math.ceil(rendered.user.length / 4)).toBeLessThan(prompt.maxInputTokens);
    }
  });

  it('makes each current contract enforce its domain-specific creative constraints', () => {
    const systems = Object.fromEntries(
      currentAuthoringPromptDefinitions.map((prompt) => [prompt.name, prompt.render(input).system]),
    );
    const character = systems['scenario-character-authoring'] ?? '';
    const location = systems['scenario-location-authoring'] ?? '';
    const historicalEvent = systems['scenario-historical-event-authoring'] ?? '';
    const storyCard = systems['scenario-story-card-authoring'] ?? '';
    const plotPoint = systems['scenario-plot-point-authoring'] ?? '';

    expect(character).toContain('internal contradiction');
    expect(character).toContain('vocabulary level');
    expect(character).toContain('verbal tic');
    expect(character).toContain('mysterious stranger');
    expect(character).toContain('grizzled veteran');
    expect(character).toContain('mundane or unglamorous detail');
    expect(character).toContain('genuinely change the player’s interpretation');

    expect(location).toContain('at least three distinct senses');
    expect(location).toContain('does not fit the expected atmosphere');
    expect(location).toContain('hazards be inferred');
    expect(location).toContain('specific time of day');
    expect(location).toContain('“eerie,” “foreboding,” or “ancient”');

    expect(historicalEvent).toContain('at least two conflicting accounts');
    expect(historicalEvent).toContain('Name the groups');
    expect(historicalEvent).toContain('physical evidence');
    expect(historicalEvent).toContain('omniscient');

    expect(storyCard).toContain('Activation hints must arise from observable character behavior');
    expect(storyCard).toContain('missed, delayed, or mistaken reading');
    expect(storyCard).toContain('most obvious clichéd interpretation');
    expect(storyCard).toContain('failure as narratively interesting as success');
    expect(storyCard).toContain('do not invent schema fields');
    expect(storyCard).toContain('chosen-one or prophecy');
    expect(plotPoint).toContain('failure as narratively interesting as success');
    expect(plotPoint).toContain(
      'Forbidden outcomes must include the most obvious or clichéd resolution',
    );
    expect(plotPoint).toContain('chosen-one or prophecy');
  });

  it('retains naturalistic dialogue guidance for characters', () => {
    const rendered = characterAuthoringPrompt.render(input);
    expect(characterAuthoringPrompt.version).toBe(CURRENT_AUTHORING_PROMPT_VERSION);
    expect(locationAuthoringPrompt.version).toBe(CURRENT_AUTHORING_PROMPT_VERSION);
    expect(rendered.system).toContain('# NATURALISTIC CHARACTER DIALOGUE');
    expect(rendered.system).toContain('LOCAL PERSPECTIVE');
    expect(rendered.system).toContain('CRAFT EXAMPLE');
    expect(rendered.hash).toHaveLength(64);
  });
});

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
