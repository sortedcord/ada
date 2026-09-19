import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './index.js';

describe('API contracts', () => {
  it('requires safe error metadata', () => {
    expect(
      apiErrorSchema.parse({
        code: 'bad_input',
        message: 'Invalid input',
        requestId: 'req_1',
        retryable: false,
      }),
    ).toMatchObject({ code: 'bad_input' });
    expect(() => apiErrorSchema.parse({ code: 'bad_input' })).toThrow();
  });
});
