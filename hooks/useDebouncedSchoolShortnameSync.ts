/**
 * Debounced sync of lead_details.school_shortname from universities table lookup.
 */
import { useEffect, useRef } from 'react';
import { lookupSchoolShortname } from '@/lib/leads/lookup-school-shortname';
import type { LeadDetailRow, UniversityRow } from '@/types/domain';

const SYNC_DELAY_MS = 2000;

interface UseDebouncedSchoolShortnameSyncOptions {
  leadId: string;
  university: string | null | undefined;
  schoolShortname: string | null | undefined;
  universities: UniversityRow[];
  onDetailsSaved: (data: LeadDetailRow) => void;
}

/**
 * When university changes, waits 2s then PATCHes school_shortname from the universities table.
 */
export function useDebouncedSchoolShortnameSync({
  leadId,
  university,
  schoolShortname,
  universities,
  onDetailsSaved,
}: UseDebouncedSchoolShortnameSyncOptions): void {
  const onDetailsSavedRef = useRef(onDetailsSaved);
  const schoolShortnameRef = useRef(schoolShortname);

  useEffect(() => {
    onDetailsSavedRef.current = onDetailsSaved;
  }, [onDetailsSaved]);

  useEffect(() => {
    schoolShortnameRef.current = schoolShortname;
  }, [schoolShortname]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const nextShortname = lookupSchoolShortname(university, universities);
      const current = schoolShortnameRef.current ?? null;

      if (nextShortname === current) return;
      if (!nextShortname && !current) return;

      try {
        const res = await fetch(`/api/lead-details/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_shortname: nextShortname }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        onDetailsSavedRef.current(json.data as LeadDetailRow);
      } catch {
        // Silent — user can retry by changing university again.
      }
    }, SYNC_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [leadId, university, universities]);
}
