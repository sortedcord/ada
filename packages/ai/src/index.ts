import { classifyProviderError, ProviderError, withRetry } from './errors.js';

export type { ProviderErrorKind } from './errors.js';
export { ProviderError, classifyProviderError, withRetry } from './errors.js';

export interface ModelDescriptor {
  readonly provider: string;
  readonly id: string;
  readonly contextWindow?: number | undefined;
  readonly outputLimit?: number | undefined;
  readonly supportsJsonSchema: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsEmbeddings?: boolean;
  readonly compatibility?: Readonly<Record<string, boolean | string>>;
}

export interface StructuredGenerationRequest<T> {
  readonly model: string;
  readonly system: string;
  readonly input: string;
  readonly schemaName: string;
  readonly schema: unknown;
  readonly signal?: AbortSignal | undefined;
  readonly outputTokenLimit: number;
  readonly parse: (value: unknown) => T;
}
export interface TextGenerationRequest {
  readonly model: string;
  readonly system: string;
  readonly input: string;
  readonly signal?: AbortSignal | undefined;
  readonly outputTokenLimit: number;
}
export interface GenerationEvent {
  readonly type: 'delta' | 'completed' | 'usage' | 'refusal' | 'error';
  readonly text?: string;
  readonly usage?: { inputTokens?: number; outputTokens?: number };
  readonly error?: ProviderError;
}
export interface GenerationResult<T> {
  readonly value: T;
  readonly model: string;
  readonly usage?: { readonly inputTokens?: number; readonly outputTokens?: number } | undefined;
  readonly requestId?: string | undefined;
}

export interface GenerationProvider {
  discoverModels(signal?: AbortSignal): Promise<readonly ModelDescriptor[]>;
  generateObject<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>>;
  streamText(request: TextGenerationRequest): AsyncIterable<GenerationEvent>;
}

export interface EmbeddingModelDescriptor {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;
  readonly distance: 'cosine' | 'l2' | 'inner_product';
}
export interface EmbeddingProvider {
  describeModel(): Promise<EmbeddingModelDescriptor>;
  embedDocuments(
    texts: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly (readonly number[])[]>;
  embedQuery(text: string, signal?: AbortSignal): Promise<readonly number[]>;
}

export interface AdityaProviderOptions {
  provider?: string;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs = 120_000): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function parseOutput(response: Record<string, unknown>): {
  text: string;
  requestId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
} {
  const outputText = typeof response.output_text === 'string' ? response.output_text : undefined;
  const output = Array.isArray(response.output) ? response.output : [];
  const parts = output.flatMap((item) =>
    typeof item === 'object' &&
    item !== null &&
    Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [],
  );
  const text =
    outputText ??
    parts
      .map((part) =>
        typeof part === 'object' &&
        part !== null &&
        typeof (part as Record<string, unknown>).text === 'string'
          ? (part as Record<string, unknown>).text
          : '',
      )
      .join('');
  const usage =
    typeof response.usage === 'object' && response.usage !== null
      ? (response.usage as Record<string, unknown>)
      : undefined;
  const result: {
    text: string;
    requestId?: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  } = { text };
  if (typeof response.id === 'string') result.requestId = response.id;
  if (usage) {
    result.usage = {};
    if (typeof usage.input_tokens === 'number') result.usage.inputTokens = usage.input_tokens;
    if (typeof usage.output_tokens === 'number') result.usage.outputTokens = usage.output_tokens;
  }
  return result;
}

export class AdityaGuptaGenerationProvider implements GenerationProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly provider: string;
  constructor(private readonly options: AdityaProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.provider = options.provider ?? 'aditya-gupta';
  }
  async discoverModels(signal?: AbortSignal): Promise<readonly ModelDescriptor[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`, {
      headers: this.headers(),
      signal: requestSignal(signal, this.options.timeoutMs),
    });
    if (!response.ok) throw await this.httpError(response);
    const body = (await response.json()) as { data?: unknown[] };
    return (body.data ?? []).flatMap((item): ModelDescriptor[] => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as Record<string, unknown>).id !== 'string'
      )
        return [];
      const value = item as Record<string, unknown>;
      const descriptor: {
        provider: string;
        id: string;
        supportsJsonSchema: boolean;
        supportsStreaming: boolean;
        contextWindow?: number;
        outputLimit?: number;
      } = {
        provider: this.provider,
        id: value.id as string,
        supportsJsonSchema: true,
        supportsStreaming: true,
      };
      if (typeof value.context_window === 'number') descriptor.contextWindow = value.context_window;
      if (typeof value.max_output_tokens === 'number')
        descriptor.outputLimit = value.max_output_tokens;
      return [descriptor];
    });
  }
  async generateObject<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>> {
    return withRetry(
      async () => {
        const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { ...this.headers(), 'content-type': 'application/json' },
          signal: requestSignal(request.signal, this.options.timeoutMs),
          body: JSON.stringify({
            model: request.model,
            messages: [
              {
                role: 'system',
                content: `${request.system}\nIMPORTANT: You must respond with valid JSON matching the schema for ${request.schemaName}. Return ONLY the JSON object.`,
              },
              { role: 'user', content: request.input },
            ],
            max_tokens: request.outputTokenLimit,
            response_format: { type: 'json_object' },
          }),
        });
        if (!response.ok) throw await this.httpError(response);
        const data = (await response.json()) as {
          id?: string;
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text)
          throw new ProviderError('invalid_output', 'Provider returned empty chat completion output');
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const toParse = jsonMatch ? jsonMatch[0] : text;
          return {
            value: request.parse(JSON.parse(toParse)),
            model: request.model,
            ...(typeof data.usage?.prompt_tokens === 'number' &&
            typeof data.usage?.completion_tokens === 'number'
              ? {
                  usage: {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens,
                  },
                }
              : {}),
            ...(data.id ? { requestId: data.id } : {}),
          };
        } catch (error) {
          throw new ProviderError(
            'invalid_output',
            `Provider returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
            undefined,
            undefined,
            { cause: error },
          );
        }
      },
      request.signal
        ? { retries: this.options.retries ?? 2, signal: request.signal }
        : { retries: this.options.retries ?? 2 },
    );
  }
  async *streamText(request: TextGenerationRequest): AsyncIterable<GenerationEvent> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      signal: requestSignal(request.signal, this.options.timeoutMs),
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.input },
        ],
        max_tokens: request.outputTokenLimit,
        stream: true,
      }),
    });
    if (!response.ok) throw await this.httpError(response);
    if (!response.body) throw new ProviderError('transport', 'Provider returned no stream body');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        buffer += next.value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            yield { type: 'completed' };
            return;
          }
          try {
            const event = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = event.choices?.[0]?.delta?.content;
            if (delta) yield { type: 'delta', text: delta };
          } catch (error) {
            yield {
              type: 'error',
              error: new ProviderError(
                'invalid_output',
                'Invalid streaming event',
                undefined,
                undefined,
                { cause: error },
              ),
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.options.apiKey}`, 'x-bf-vk': this.options.apiKey };
  }
  private async httpError(response: Response): Promise<ProviderError> {
    const body = await response.text().catch(() => '');
    return classifyProviderError(undefined, response.status, body);
  }
}

export { FakeEmbeddingProvider, FakeGenerationProvider } from './fake.js';

export class AdityaGuptaEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly options: AdityaProviderOptions & {
      model: string;
      dimensions: number;
      distance?: EmbeddingModelDescriptor['distance'];
      batchSize?: number;
    },
  ) {}
  describeModel(): Promise<EmbeddingModelDescriptor> {
    return Promise.resolve({
      provider: this.options.provider ?? 'aditya-gupta',
      model: this.options.model,
      dimensions: this.options.dimensions,
      distance: this.options.distance ?? 'cosine',
    });
  }
  async embedDocuments(
    texts: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly (readonly number[])[]> {
    const output: number[][] = [];
    const batchSize = this.options.batchSize ?? 64;
    for (let index = 0; index < texts.length; index += batchSize)
      output.push(...(await this.embedBatch(texts.slice(index, index + batchSize), signal)));
    return output;
  }
  async embedQuery(text: string, signal?: AbortSignal): Promise<readonly number[]> {
    const [embedding] = await this.embedBatch([text], signal);
    if (!embedding)
      throw new ProviderError('invalid_output', 'Embedding provider returned no vector');
    return embedding;
  }
  private async embedBatch(texts: readonly string[], signal?: AbortSignal): Promise<number[][]> {
    const response = await (this.options.fetchImpl ?? fetch)(
      `${this.options.baseUrl.replace(/\/$/, '')}/embeddings`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          'x-bf-vk': this.options.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: this.options.model, input: texts }),
        signal: requestSignal(signal, this.options.timeoutMs),
      },
    );
    if (!response.ok)
      throw classifyProviderError(undefined, response.status, await response.text());
    const body = (await response.json()) as { data?: Array<{ embedding?: unknown }> };
    const vectors = (body.data ?? []).map((row) => row.embedding);
    if (
      vectors.length !== texts.length ||
      vectors.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== this.options.dimensions ||
          row.some((value) => typeof value !== 'number' || !Number.isFinite(value)),
      )
    )
      throw new ProviderError('invalid_output', 'Embedding dimensions or values are invalid');
    return vectors as number[][];
  }
}
