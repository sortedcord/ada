import { rm } from 'node:fs/promises';

await Promise.all(
  ['apps', 'packages'].map(async (root) => {
    const entries = await import('node:fs/promises').then(({ readdir }) =>
      readdir(root, { withFileTypes: true }),
    );
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => rm(`${root}/${entry.name}/dist`, { recursive: true, force: true })),
    );
  }),
);
