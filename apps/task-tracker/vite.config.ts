import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve(new URL('../../LUNA_IMPLEMENTATION_TASKS.md', import.meta.url).pathname);
function checklistApi(): Plugin {
  return {
    name: 'luna-checklist-readonly-api',
    configureServer(server) {
      server.middlewares.use('/api/tasks', async (_request, response) => {
        try {
          const markdown = await readFile(sourcePath, 'utf8');
          let phase = 'Other';
          const tasks = markdown.split(/\r?\n/).flatMap((line, index) => {
            const heading = line.match(/^#\s+(Phase\s+\d+\s+—\s+.+)$/i);
            if (heading?.[1]) phase = heading[1];
            const checkbox = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)$/);
            if (!checkbox?.[2] || phase === 'Other') return [];
            const text = checkbox[2].trim();
            const id = text.match(/\*\*(P\d+-\d+)\s+—\s+(.+?)\*\*/) ?? text.match(/\b(P\d+-\d+)\b/);
            return [{ id: id?.[1] ?? `line-${index + 1}`, title: id?.[2] ?? text.replace(/\*\*/g, ''), checked: checkbox[1]?.toLowerCase() === 'x', phase, line: index + 1, kind: id ? 'task' : phase === 'Other' ? 'protocol' : 'gate' }];
          });
          const body = JSON.stringify({ source: 'LUNA_IMPLEMENTATION_TASKS.md', readonly: true, fetchedAt: new Date().toISOString(), checksum: createHash('sha256').update(markdown).digest('hex'), total: tasks.length, completed: tasks.filter((task) => task.checked).length, tasks });
          response.setHeader('content-type', 'application/json');
          response.setHeader('cache-control', 'no-store');
          response.end(body);
        } catch {
          response.statusCode = 500;
          response.end(JSON.stringify({ message: 'Unable to read the readonly checklist' }));
        }
      });
    },
  };
}

export default defineConfig({
  server: { host: '0.0.0.0', port: 43927, strictPort: true },
  preview: { host: '0.0.0.0', port: 43927, strictPort: true },
  plugins: [react(), checklistApi()],
});
