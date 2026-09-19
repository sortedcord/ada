import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './index.js';

describe('logger redaction', () => {
  it('redacts credential-like fields before serialization', () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = createLogger({
      service: 'test',
      environment: 'test',
      level: 'info',
      destination,
    });
    logger.info(
      { authorization: 'Bearer FAKE_KEY', apiKey: 'FAKE_API_KEY', safe: 'visible' },
      'test',
    );
    const output = lines.join('');
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('FAKE_KEY');
    expect(output).not.toContain('FAKE_API_KEY');
    expect(output).toContain('visible');
  });
});
