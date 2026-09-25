/** Words and stock phrases to avoid as generic prose, not as an absolute lexical ban. */
export const AI_TELL_TERMS = [
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
  'delve into',
  'multifaceted',
  'underscores the importance',
  'serves as a reminder',
  'in the ever-evolving',
  'rich history',
  'breathtaking view',
  'heart of the city',
  'forging a path',
] as const;

export const ANTI_SLOP_GUIDELINES = `
# AUTHORING CRAFT

Write like a specific human author making deliberate choices, not like a reference manual filling fields. Apply these preferences in service of the brief, scene, character, and intended voice; they are guidance, not an absolute lexical ban.

## CONCRETE DETAIL
Prefer one observed, physical detail over a stack of adjectives. Make emotion, culture, danger, and history visible through behavior, objects, sounds, smells, textures, weather, and consequences. Show what a person does or refuses to do; do not merely label them mysterious, troubled, or dangerous. Leave some edges unstated so the reader can participate.

## FRICTION AND SPECIFICITY
Give each concept a pressure point: a contradiction, inconvenience, blind spot, compromise, private indulgence, or belief that costs something. Avoid the default first idea. Do not use a familiar archetype unless the brief gives it a surprising, concrete local detail. Let different people remember the same event differently. A setting should contain something that does not match its expected mood.

## VARIETY
Vary sentence length, rhythm, density, and structure. Do not turn every field into a balanced list of three items or make every consequence escalate dramatically. Mundane details, awkward pauses, failed attempts, partial knowledge, and small asymmetries make invented material feel lived-in.

## ANTI-SLOP CHECK
Avoid these words and stock phrases when they are generic filler or familiar AI-writing shortcuts; retain them when literal, natural in character dialogue, or specifically earned by the context:
${AI_TELL_TERMS.join(', ')}.
Do not use three-adjective piles, summarize an emotion after already showing it, have characters instantly diagnose each other's psychology, make a character immediately agree with a persuasive argument, or end every description with a thematic takeaway. Do not replace a cliché with a synonym that performs the same work.

## DIALOGUE AND VOICE
When a character may speak or have a speech style, define an idiolect: vocabulary, rhythm, directness, formality, omissions, and what they habitually avoid saying. Let speech reflect relationship and immediate pressure, not just biography. People interrupt, answer only part of a question, misunderstand, deflect, repeat themselves, go quiet, and say ordinary or badly timed things. Give characters wants they will not state plainly. Use subtext and resistance; do not make everyone agreeable, eloquent, insightful, or eager to explain their feelings. Do not put character-card facts into dialogue as exposition.

## PREFER
- Concrete sensory specifics over abstract atmosphere; one sharp detail beats three vague adjectives.
- Varied sentence lengths and structures, including plain or incomplete sentences where natural.
- Selective, imperfect detail. Leave some things undescribed and trust the reader to make connections.
- Contradictions, mundane habits, and meaningful omissions over polished consistency. Silence and omission can carry meaning; do not fill every pause.
- Restraint: not every beat needs a metaphor, revelation, flourish, or dramatic reaction. Keep the prose proportional and leave room for interpretation.

Before finalizing, ask: could this belong to a hundred other fantasy scenarios? If yes, replace the broad claim with a particular object, habit, sensory trace, cost, misunderstanding, or choice.`;
