/**
 * Archived leads list API route — manager-only, cursor pagination.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { ARCHIVED_FILTERABLE_COLUMNS } from '@/lib/constants';
import { buildCursorResponse, parseCursorParams } from '@/lib/query/cursor';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);
  const { cursor, limit } = parseCursorParams(req.query);

  const archiveReason =
    typeof req.query.archive_reason === 'string' ? req.query.archive_reason : undefined;
  const leadSource = typeof req.query.lead_source === 'string' ? req.query.lead_source : undefined;
  const assignedTo = typeof req.query.assigned_to === 'string' ? req.query.assigned_to : undefined;
  const archivedFrom =
    typeof req.query.archived_from === 'string' ? req.query.archived_from : undefined;
  const archivedTo = typeof req.query.archived_to === 'string' ? req.query.archived_to : undefined;
  const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const useFuzzy = req.query.fuzzy === '1' && searchTerm.length > 0;

  let query = supabase
    .from('archived_leads')
    .select('*, salespeople:assigned_to(full_name, email)')
    .order('archived_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('archived_at', cursor);
  }

  if (archiveReason && ARCHIVED_FILTERABLE_COLUMNS.has('archive_reason')) {
    query = query.eq('archive_reason', archiveReason);
  }
  if (leadSource) {
    query = query.eq('lead_source', leadSource);
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }
  if (archivedFrom) {
    query = query.gte('archived_at', `${archivedFrom}T00:00:00Z`);
  }
  if (archivedTo) {
    query = query.lte('archived_at', `${archivedTo}T23:59:59Z`);
  }

  if (useFuzzy) {
    const { data: ids, error: rpcError } = await supabase.rpc('search_archived_leads_ids', {
      search_term: searchTerm,
    });

    if (rpcError) return sendError(res, 'Failed to search archived leads', 500);

    const uuids = (ids ?? []).map((row: { lead_uuid: string }) => row.lead_uuid);
    if (uuids.length === 0) {
      return sendSuccess(res, { archivedLeads: [], nextCursor: null });
    }

    query = query.in('uuid', uuids);
  } else if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) return sendError(res, 'Failed to fetch archived leads', 500);

  const { data: rows, nextCursor } = buildCursorResponse(
    (data ?? []) as Record<string, unknown>[],
    limit,
    'archived_at',
  );

  return sendSuccess(res, { archivedLeads: rows, nextCursor });
}
