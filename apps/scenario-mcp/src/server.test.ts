import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number;
  result?: {
    protocolVersion?: string;
    serverInfo?: { name?: string; version?: string };
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: { properties?: Record<string, unknown> };
    }>;
  };
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsxBinary = resolve(packageRoot, 'node_modules', '.bin', 'tsx');

function waitForResponse(lines: Interface): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for MCP response')),
      5_000,
    );
    lines.once('line', (line) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(line) as JsonRpcResponse);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid JSON-RPC response'));
      }
    });
  });
}

async function request(
  child: ChildProcessWithoutNullStreams,
  lines: Interface,
  payload: Record<string, unknown>,
): Promise<JsonRpcResponse> {
  const response = waitForResponse(lines);
  child.stdin.write(`${JSON.stringify(payload)}\n`);
  return response;
}

describe('Scenario MCP server', () => {
  it('completes the JSON-RPC handshake and exposes concise creative brief guidance', async () => {
    const child = spawn(tsxBinary, ['src/server.ts'], {
      cwd: packageRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });

    try {
      const initialized = await request(child, lines, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'scenario-mcp-test', version: '1.0.0' },
        },
      });
      expect(initialized).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'ada-scenario-authoring' },
        },
      });

      const listed = await request(child, lines, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      });
      expect(listed.jsonrpc).toBe('2.0');
      expect(listed.id).toBe(2);
      const tools = listed.result?.tools;
      expect(tools).toHaveLength(8);
      expect(new Set(tools?.map((tool) => tool.name))).toEqual(
        new Set([
          'scenario_get',
          'scenario_validate',
          'scenario_propose',
          'scenario_chat',
          'scenario_continuity_review',
          'scenario_authoring_review',
          'scenario_list_proposals',
          'scenario_apply_proposal',
        ]),
      );
      expect(tools?.every((tool) => tool.description.length >= 140)).toBe(true);
      expect(tools?.every((tool) => tool.description.length < 800)).toBe(true);

      const byName = new Map(tools?.map((tool) => [tool.name, tool]));
      const propose = byName.get('scenario_propose');
      const chat = byName.get('scenario_chat');
      const validate = byName.get('scenario_validate');
      const structuralReview = byName.get('scenario_continuity_review');
      const authoringReview = byName.get('scenario_authoring_review');

      expect(byName.get('scenario_get')?.description).toContain('extends canon');
      expect(validate?.description).toContain('generic or clichéd content');
      expect(propose?.description).toContain('Bad brief');
      expect(propose?.description).toContain('Better brief');
      expect(propose?.description).toContain('perfume seller');
      expect(chat?.description).toContain('what they avoid discussing');
      expect(chat?.description).toContain('public reputation');
      expect(structuralReview?.description).toContain('generic or clichéd content warnings');
      expect(authoringReview?.description).toContain('cliché content');
      expect(byName.get('scenario_list_proposals')?.description).toContain('concrete trade-offs');
      expect(byName.get('scenario_apply_proposal')?.description).toContain('visibility scope');

      const chatKind = chat?.inputSchema.properties?.kind as
        { enum?: string[]; description?: string } | undefined;
      expect(chatKind?.enum).toEqual([
        'scenario',
        'character',
        'location',
        'historical_event',
        'story_card',
        'plot_point',
      ]);
      expect(chatKind?.description).toContain('scenario_authoring_review');

      const kind = propose?.inputSchema.properties?.kind as
        { oneOf?: Array<{ const?: string; description?: string }> } | undefined;
      expect(kind?.oneOf).toHaveLength(5);
      expect(kind?.oneOf?.every((option) => option.description?.length)).toBe(true);
    } finally {
      lines.close();
      child.kill();
    }
  }, 10_000);
});
