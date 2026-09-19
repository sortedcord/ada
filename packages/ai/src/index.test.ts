import { describe, expect, it } from 'vitest';
import {
  AdityaGuptaEmbeddingProvider,
  AdityaGuptaGenerationProvider,
  FakeEmbeddingProvider,
  FakeGenerationProvider,
  ProviderError,
  classifyProviderError,
} from './index.js';

describe('provider gateway', () => {
  it('classifies failures and keeps fake calls deterministic', async () => {
    expect(classifyProviderError(undefined, 429).kind).toBe('rate_limit');
    expect(classifyProviderError(undefined, 413, 'context window exceeded').kind).toBe(
      'context_overflow',
    );
    const provider = new FakeGenerationProvider([{ kind: 'value', value: { ok: true } }]);
    const result = await provider.generateObject({
      model: 'fake-model',
      system: 'system',
      input: 'input',
      schemaName: 'Output',
      schema: {},
      outputTokenLimit: 100,
      parse: (value) => value as { ok: boolean },
    });
    expect(result.value.ok).toBe(true);
    expect(provider.calls).toHaveLength(1);
  });

  it('sends server-side provider headers and validates embedding dimensions', async () => {
    const requests: Request[] = [];
    const fetchImpl: typeof fetch = (input, init) => {
      requests.push(new Request(input, init));
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: 'model-a' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    };
    const generation = new AdityaGuptaGenerationProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'FAKE_KEY',
      fetchImpl,
    });
    await generation.discoverModels();
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer FAKE_KEY');
    expect(requests[0]?.headers.get('x-bf-vk')).toBe('FAKE_KEY');
    const embeddings = new FakeEmbeddingProvider(3);
    expect(await embeddings.embedQuery('abc')).toHaveLength(3);
    const badEmbedding = new AdityaGuptaEmbeddingProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'FAKE_KEY',
      model: 'fake-embedding',
      dimensions: 3,
      fetchImpl: (input, init) => {
        requests.push(new Request(input, init));
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ embedding: [1, 2] }] }), { status: 200 }),
        );
      },
    });
    await expect(badEmbedding.embedQuery('abc')).rejects.toMatchObject({ kind: 'invalid_output' });
    expect(new ProviderError('invalid_output', 'bad').retryable).toBe(false);
  });
});
