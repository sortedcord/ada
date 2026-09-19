import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  apiErrorSchema,
  conflictResponseSchema,
  healthResponseSchema,
  listQuerySchema,
  scenarioExportSchema,
  sseEventSchema,
} from './api.js';

const schemas = {
  apiError: apiErrorSchema,
  conflictResponse: conflictResponseSchema,
  healthResponse: healthResponseSchema,
  listQuery: listQuerySchema,
  scenarioExport: scenarioExportSchema,
  sseEvent: sseEventSchema,
};
const output = resolve(process.cwd(), 'generated/contracts.schema.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', schemas: Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, zodToJsonSchema(schema, name)])) }, null, 2)}\n`,
);
process.stdout.write(`wrote ${output}\n`);
