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
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'lib/webhooks/**',
      'lib/leads/create-lead.ts',
      'lib/leads/deduplicate.ts',
      'lib/leads/assign.ts',
      'lib/jobs/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase/service',
              message:
                'Service role client may only be imported from lib/webhooks/, lib/leads/, and lib/jobs/.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
