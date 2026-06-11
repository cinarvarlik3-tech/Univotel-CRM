/**
 * ESLint configuration with service client import restriction.
 */
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.wrangler/**',
      'dist/**',
      'node_modules/**',
      'import-old-leads-skipped.json',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'lib/webhooks/**',
      'lib/leads/**',
      'lib/jobs/**',
      'lib/campaigns/**',
      'lib/chatwoot/**',
      'lib/attribution/**',
      'lib/dni/**',
      'lib/ga4/**',
      'lib/ref/**',
      'lib/tasks/**',
      'lib/my-day/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase/service',
              message:
                'Service role client may only be imported from lib/webhooks/, lib/leads/, lib/jobs/, lib/attribution/, lib/dni/, lib/ga4/, and lib/ref/.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
