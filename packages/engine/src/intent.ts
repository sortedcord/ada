export interface ParsedPlayerIntent {
  rawInput: string;
  meta: boolean;
  action: 'wait' | 'look' | 'save' | 'freeform';
  speech?: string;
  physicalActions: string[];
}
export function parseExplicitPlayerIntent(rawInput: string): ParsedPlayerIntent {
  const raw = rawInput.trim();
  if (raw === '/wait') return { rawInput, meta: false, action: 'wait', physicalActions: ['wait'] };
  if (raw === '/look') return { rawInput, meta: true, action: 'look', physicalActions: [] };
  if (raw === '/save') return { rawInput, meta: true, action: 'save', physicalActions: [] };
  return {
    rawInput,
    meta: false,
    action: 'freeform',
    physicalActions: [],
    ...(raw ? { speech: raw } : {}),
  };
}
