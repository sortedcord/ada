import type {
  EmbeddingProvider,
  GenerationEvent,
  GenerationProvider,
  GenerationResult,
  ModelDescriptor,
  StructuredGenerationRequest,
} from './index.js';

export type FakeGenerationAction =
  | { kind: 'value'; value: unknown }
  | { kind: 'error'; error: Error }
  | { kind: 'delay'; milliseconds: number }
  | { kind: 'stream'; events: readonly GenerationEvent[] };
export class FakeGenerationProvider implements GenerationProvider {
  readonly calls: StructuredGenerationRequest<unknown>[] = [];
  constructor(private readonly actions: FakeGenerationAction[] = []) {}
  discoverModels(): Promise<readonly ModelDescriptor[]> {
    return Promise.resolve([
      {
        provider: 'fake',
        id: 'fake-model',
        contextWindow: 32_000,
        outputLimit: 4_000,
        supportsJsonSchema: true,
        supportsStreaming: true,
      },
    ]);
  }
  async generateObject<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>> {
    this.calls.push(request);
    const action = this.actions.shift() ?? ({ kind: 'value', value: {} } as const);
    if (action.kind === 'delay')
      await new Promise((resolve) => setTimeout(resolve, action.milliseconds));
    if (action.kind === 'error') throw action.error;
    if (action.kind === 'value')
      return {
        value: request.parse(action.value),
        model: request.model,
        requestId: `fake-${this.calls.length}`,
      };
    throw new Error('Fake stream action cannot satisfy structured generation');
  }
  async *streamText(): AsyncIterable<GenerationEvent> {
    const action = this.actions.shift() ?? {
      kind: 'stream',
      events: [{ type: 'completed' as const }],
    };
    if (action.kind === 'error') throw action.error;
    if (action.kind === 'delay')
      await new Promise((resolve) => setTimeout(resolve, action.milliseconds));
    if (action.kind === 'stream') for (const event of action.events) yield event;
  }
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly dimensions = 8) {}
  describeModel() {
    return Promise.resolve({
      provider: 'fake',
      model: 'fake-embedding',
      dimensions: this.dimensions,
      distance: 'cosine' as const,
    });
  }
  embedDocuments(texts: readonly string[]) {
    return Promise.resolve(texts.map((text) => this.vector(text)));
  }
  embedQuery(text: string) {
    return Promise.resolve(this.vector(text));
  }
  private vector(text: string): number[] {
    const vector = Array.from(
      { length: this.dimensions },
      (_, index) => ((text.charCodeAt(index % Math.max(1, text.length)) || 0) % 97) / 97,
    );
    return vector;
  }
}
