/**
 * Type generation script wrapper.
 * Loads env from .env.local / .env, then runs the project-local Supabase CLI
 * to regenerate types/database.ts from the live remote schema.
 */
import { execFileSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

/** Loads .env then .env.local (.env.local wins on conflicts). */
function loadEnvFiles(): void {
  const root = process.cwd();
  config({ path: resolve(root, '.env') });
  config({ path: resolve(root, '.env.local'), override: true });
}

/**
 * Resolves Supabase project ref from env or NEXT_PUBLIC_SUPABASE_URL.
 * @returns Project ID string or null if not found.
 */
function resolveProjectId(): string | null {
  if (process.env.SUPABASE_PROJECT_ID) {
    return process.env.SUPABASE_PROJECT_ID;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const hostname = new URL(url).hostname;
    const ref = hostname.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Returns path to the project-local Supabase CLI binary.
 * @returns Absolute path to supabase executable.
 */
function resolveSupabaseCli(): string {
  const bin = resolve(process.cwd(), 'node_modules', '.bin', 'supabase');
  if (!existsSync(bin)) {
    console.error('Supabase CLI not found. Run: pnpm install');
    process.exit(1);
  }
  return bin;
}

loadEnvFiles();

const projectId = resolveProjectId();

if (!projectId) {
  console.error(
    'Could not resolve Supabase project ID.\n' +
      'Set SUPABASE_PROJECT_ID in .env.local, or set NEXT_PUBLIC_SUPABASE_URL.',
  );
  process.exit(1);
}

const supabaseCli = resolveSupabaseCli();
const outPath = resolve(process.cwd(), 'types', 'database.ts');

try {
  const output = execFileSync(
    supabaseCli,
    ['gen', 'types', 'typescript', '--project-id', projectId],
    { encoding: 'utf8' },
  );
  writeFileSync(outPath, output);
  console.log(`Types generated successfully → ${outPath}`);
} catch {
  console.error(
    'Failed to generate types. Ensure you are logged in:\n' +
      '  pnpm exec supabase login\n' +
      'Then retry:\n' +
      '  pnpm gen:types',
  );
  process.exit(1);
}
