export type ProviderErrorKind =
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'transport'
  | 'server'
  | 'context_overflow'
  | 'invalid_output'
  | 'refusal'
  | 'cancelled'
  | 'unknown';
export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly status?: number,
    readonly retryAfterMs?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ProviderError';
  }
  get retryable(): boolean {
    return (
      this.kind === 'rate_limit' ||
      this.kind === 'timeout' ||
      this.kind === 'transport' ||
      this.kind === 'server' ||
      this.kind === 'context_overflow'
    );
  }
}
export function classifyProviderError(error: unknown, status?: number, body = ''): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof DOMException && error.name === 'AbortError')
    return new ProviderError('cancelled', 'Provider request cancelled', status, undefined, {
      cause: error,
    });
  if (status === 401 || status === 403)
    return new ProviderError('authentication', 'Provider authentication failed', status);
  if (status === 429)
    return new ProviderError('rate_limit', 'Provider rate limit exceeded', status);
  if (status !== undefined && status >= 500)
    return new ProviderError('server', 'Provider server error', status);
  if (status === 413 || /maximum context length|context window|context_overflow/i.test(body))
    return new ProviderError('context_overflow', 'Provider context limit exceeded', status);
  if (/refus/i.test(body))
    return new ProviderError('refusal', 'Provider refused the request', status);
  if (error instanceof TypeError)
    return new ProviderError('transport', 'Provider transport failed', status, undefined, {
      cause: error,
    });
  return new ProviderError(
    'unknown',
    error instanceof Error ? error.message : 'Unknown provider error',
    status,
  );
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: { retries: number; signal?: AbortSignal; baseDelayMs?: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    if (options.signal?.aborted) throw new ProviderError('cancelled', 'Provider request cancelled');
    try {
      return await operation(attempt);
    } catch (error) {
      const normalized = classifyProviderError(error);
      lastError = normalized;
      if (!normalized.retryable || attempt === options.retries) throw normalized;
      const delay = (options.baseDelayMs ?? 250) * 2 ** attempt + Math.floor(Math.random() * 100);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        options.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new ProviderError('cancelled', 'Provider request cancelled'));
          },
          { once: true },
        );
      });
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError('unknown', 'Retry failed');
}
