import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'vite.config.ts'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  promise.configs['flat/recommended'],
  {
    plugins: { import: importPlugin },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      'no-console': 'warn',
    },
  },
  {
    files: ['packages/domain/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'fastify',
                'react',
                'drizzle-orm',
                'bullmq',
                'redis',
                'ioredis',
                'openai',
                'node:*',
              ],
              message: 'The domain package must remain framework and infrastructure independent.',
            },
          ],
        },
      ],
    },
  },
);
