import type { ModelDescriptor } from '@ada/ai';
import type { RoleSettingsMap } from './ai-settings.js';

export function validateRoleSelection(
  settings: RoleSettingsMap,
  catalog: readonly ModelDescriptor[],
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (const [role, selected] of Object.entries(settings)) {
    const model = catalog.find(
      (candidate) => candidate.provider === selected.provider && candidate.id === selected.model,
    );
    if (!model) {
      warnings.push(`${role}: selected model is not in the current catalog`);
      continue;
    }
    if (!model.supportsJsonSchema)
      warnings.push(`${role}: model does not support strict structured output`);
    if (role === 'narrator' && !model.supportsStreaming)
      warnings.push('narrator: model does not support streaming');
    if (
      model.contextWindow !== undefined &&
      selected.promptBudget + selected.outputTokens > model.contextWindow
    )
      warnings.push(`${role}: configured budget exceeds context window`);
  }
  return { valid: warnings.length === 0, warnings };
}
