/**
 * Vitest configuration for integration tests.
 * Requires a live Supabase project — reads credentials from .env.local.
 * Run with: pnpm test:integration
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/integration/**/*.test.ts'],
    setupFiles: ['./vitest.integration.setup.ts'],
    // Integration tests are slow — give each test file 60 s.
    testTimeout: 60_000,
    // Run sequentially to keep cleanup predictable.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
