/**
 * Leads list and manual create API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildManualSourceDetails } from '@/lib/leads/source-details';
import { applyEmbeddedFilters } from '@/lib/query/apply-embedded-filters';
import {
  applyFilters,
  parseFilterParams,
  validateFilters,
} from '@/lib/query/filter-builder';
import { buildCursorResponse, parseCursorParams } from '@/lib/query/cursor';
import { requiresLeadDetailsJoin, splitFilters } from '@/lib/query/split-filters';
import { createServerSupabase } from '@/lib/supabase/server';
import { SORTABLE_COLUMNS } from '@/lib/constants';

const CreateLeadSchema = z.object({
  lead_name: z.string().optional(),
  lead_phone: z.string().min(1),
  language: z.string().optional(),
  university: z.string().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, session.userId);
  }

  return sendError(res, 'Method not allowed', 405);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res);
  const { cursor, limit } = parseCursorParams(req.query);
  const allFilters = parseFilterParams(req.query);
  const filterError = validateFilters(allFilters);

  if (filterError) return sendError(res, filterError.error, 400);

  const { leads: leadFilters, leadDetails: detailsFilters } = splitFilters(allFilters);
  const needsDetailsJoin = requiresLeadDetailsJoin(allFilters);

  const sortField =
    typeof req.query.sort === 'string' && SORTABLE_COLUMNS.has(req.query.sort)
      ? req.query.sort
      : 'created_at';

  const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const useFuzzy = req.query.fuzzy === '1' && searchTerm.length > 0;

  const selectClause = needsDetailsJoin
    ? '*, lead_details!inner(*), salespeople:assigned_to(full_name, email)'
    : '*, lead_details(*), salespeople:assigned_to(full_name, email)';

  let query = supabase
    .from('leads')
    .select(selectClause)
    .eq('is_deleted', false)
    .order(sortField, { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt(sortField, cursor);
  }

  if (useFuzzy) {
    const { data: ids, error: rpcError } = await supabase.rpc('search_leads_ids', {
      search_term: searchTerm,
    });

    if (rpcError) return sendError(res, 'Failed to search leads', 500);

    const uuids = (ids ?? []).map((row: { lead_uuid: string }) => row.lead_uuid);

    if (uuids.length === 0) {
      return sendSuccess(res, { leads: [], nextCursor: null });
    }

    query = query.in('uuid', uuids);
  } else if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  query = applyFilters(query, leadFilters);
  query = applyEmbeddedFilters(query, 'lead_details', detailsFilters);

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch leads', 500);

  const { data: rows, nextCursor } = buildCursorResponse(
    data ?? [],
    limit,
    sortField as 'created_at',
  );
  return sendSuccess(res, { leads: rows, nextCursor });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const parsed = CreateLeadSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const body = parsed.data;
  const sourceDetails = buildManualSourceDetails(false);

  const result = await createLeadFromWebhook({
    rawPhone: body.lead_phone,
    leadName: body.lead_name ?? null,
    leadSource: 'manual',
    messageFrom: 'manual',
    language: body.language ?? 'tr',
    sourceDetails,
    interactionSource: 'manual',
    metadata: { created_by: userId },
  });

  if (result.type === 'duplicate') {
    return sendSuccess(res, { duplicate: true, existingUuid: result.existingUuid }, 200);
  }

  const supabase = createServerSupabase(req, res);

  if (body.university || body.budget_min || body.budget_max || body.notes) {
    await supabase
      .from('lead_details')
      .update({
        university: body.university ?? null,
        budget_min: body.budget_min ?? null,
        budget_max: body.budget_max ?? null,
      })
      .eq('lead_uuid', result.uuid);

    if (body.notes) {
      await supabase.from('leads').update({ notes: body.notes }).eq('uuid', result.uuid);
    }
  }

  return sendSuccess(res, { uuid: result.uuid, assignedTo: result.assignedTo }, 201);
}
