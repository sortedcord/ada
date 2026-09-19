import { describe, expect, it } from 'vitest';
import { AdityaGuptaGenerationProvider } from './index.js';

describe('opt-in live provider contract', () => {
  it('is budget-gated and safely inert without explicit opt-in', async () => {
    if (process.env.LIVE_PROVIDER_TEST !== 'true') {
      expect(true).toBe(true);
      return;
    }
    const apiKey = process.env.GENERATION_API_KEY;
    if (!apiKey) throw new Error('LIVE_PROVIDER_TEST=true requires GENERATION_API_KEY');
    const provider = new AdityaGuptaGenerationProvider({
      baseUrl: process.env.GENERATION_BASE_URL ?? 'https://ai.adityagupta.dev/v1',
      apiKey,
      retries: 0,
    });
    const models = await provider.discoverModels();
    expect(models.length).toBeGreaterThan(0);
  }, 30_000);
});
