/**
 * Chokepoint audit: no file outside the allowed set may write funnel_status
 * to the DB directly without also calling writeStageHistory.
 *
 * Allowed direct writers (they call writeStageHistory themselves):
 *   - lib/leads/update-lead.ts         (primary chokepoint)
 *   - lib/leads/visit-ops.ts           (visit schedule/resolve — calls writeStageHistory)
 *   - lib/leads/write-stage-history.ts (history writer itself — no DB funnel_status write)
 *
 * Any other file containing  .update({ funnel_status  is a violation.
 */
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');

const ALLOWED_FILES = new Set(['lib/leads/update-lead.ts', 'lib/leads/visit-ops.ts']);

describe('funnel_status chokepoint', () => {
  it('no file outside the allowed set directly updates funnel_status in the DB', () => {
    // Grep for the pattern: .update(... funnel_status ... within lib/ and pages/
    let output = '';
    try {
      output = execSync(
        `grep -rn "funnel_status" --include="*.ts" --include="*.tsx" "${ROOT}/lib" "${ROOT}/pages"`,
        { encoding: 'utf8' },
      );
    } catch {
      // grep exits non-zero when nothing found — that's fine.
      output = '';
    }

    const violations: string[] = [];

    for (const line of output.split('\n')) {
      if (!line.trim()) continue;

      // Only care about lines that look like a DB update write.
      if (!line.includes('.update(') && !line.includes('.update({')) continue;
      if (!line.includes('funnel_status')) continue;

      // Extract relative path.
      const absPath = line.split(':')[0];
      const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');

      if (!ALLOWED_FILES.has(rel)) {
        violations.push(rel + ': ' + line.trim());
      }
    }

    expect(violations).toEqual([]);
  });

  it('allowed writers (update-lead.ts and visit-ops.ts) call writeStageHistory', () => {
    const updateLead = execSync(`grep -c "writeStageHistory" "${ROOT}/lib/leads/update-lead.ts"`, {
      encoding: 'utf8',
    }).trim();

    const visitOps = execSync(`grep -c "writeStageHistory" "${ROOT}/lib/leads/visit-ops.ts"`, {
      encoding: 'utf8',
    }).trim();

    expect(Number(updateLead)).toBeGreaterThan(0);
    expect(Number(visitOps)).toBeGreaterThan(0);
  });
});
