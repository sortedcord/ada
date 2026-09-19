import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

export function createLogger(options: {
  service: string;
  environment: string;
  level: NonNullable<LoggerOptions['level']>;
  destination?: DestinationStream;
}): Logger {
  const loggerOptions: LoggerOptions = {
    level: options.level,
    base: { service: options.service, environment: options.environment },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'authorization',
        'cookie',
        '*.authorization',
        '*.cookie',
        'apiKey',
        'api_key',
        'password',
        'secret',
        '*.apiKey',
        '*.api_key',
        '*.password',
        '*.secret',
        'GENERATION_API_KEY',
        'EMBEDDING_API_KEY',
      ],
      censor: '[REDACTED]',
    },
  };
  if (options.environment === 'development') {
    loggerOptions.transport = { target: 'pino-pretty', options: { colorize: true } };
  }
  return pino(loggerOptions, options.destination);
}

export type AppLogger = Logger;
export { noopTelemetry } from './telemetry.js';
export type { Telemetry } from './telemetry.js';
