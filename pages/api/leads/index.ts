/**
 * Leads list and manual create API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser, type SessionUser } from '@/lib/auth/get-session-user';
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import {
  applyLeadsListFilters,
  countLeadsListKpis,
  parseLeadsListParams,
  resolveLeadsListSearchUuids,
} from '@/lib/leads/leads-list-query';
import { BUDGET_TIERS } from '@/lib/constants';
import { budgetTierWritePayload } from '@/lib/leads/budget-tier';
import { buildManualSourceDetails } from '@/lib/leads/source-details';
import { buildCursorResponse, parseCursorParams } from '@/lib/query/cursor';
import { createServerSupabase } from '@/lib/supabase/server';

const CreateLeadSchema = z.object({
  lead_name: z.string().optional(),
  lead_phone: z.string().min(1),
  language: z.string().optional(),
  university: z.string().optional(),
  budget_tier: z.enum(BUDGET_TIERS).optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method === 'GET') {
    return handleGet(req, res, session);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, session.userId);
  }

  return sendError(res, 'Method not allowed', 405);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, session: SessionUser) {
  const supabase = createServerSupabase(req, res);
  const { cursor, limit } = parseCursorParams(req.query);

  const parsed = parseLeadsListParams(req.query, session);
  if ('error' in parsed) return sendError(res, parsed.error, 400);

  let searchUuids: string[] | null = null;
  try {
    searchUuids = await resolveLeadsListSearchUuids(supabase, parsed);
  } catch {
    return sendError(res, 'Failed to search leads', 500);
  }

  if (searchUuids !== null && searchUuids.length === 0) {
    return sendSuccess(res, {
      leads: [],
      nextCursor: null,
      totalCount: 0,
      kpiCounts: { breached: 0, onTime: 0 },
    });
  }

  const selectClause = parsed.needsDetailsJoin
    ? '*, lead_details!inner(*), salespeople:assigned_to(full_name, email)'
    : '*, lead_details(*), salespeople:assigned_to(full_name, email)';

  const ascending = parsed.sortDir === 'asc';
  let query = supabase
    .from('leads')
    .select(selectClause)
    .order(parsed.sortField, { ascending, nullsFirst: ascending })
    .limit(limit + 1);

  query = applyLeadsListFilters(query, parsed, searchUuids);

  if (cursor) {
    // For ASC (nulls first), advance forward; for DESC, go backward.
    query = ascending ? query.gt(parsed.sortField, cursor) : query.lt(parsed.sortField, cursor);
  }

  let kpiCounts: { breached: number; onTime: number };
  let totalCount: number;

  try {
    const counts = await countLeadsListKpis(supabase, parsed, searchUuids);
    totalCount = counts.total;
    kpiCounts = { breached: counts.breached, onTime: counts.onTime };
  } catch {
    return sendError(res, 'Failed to count leads', 500);
  }

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch leads', 500);

  const { data: rows, nextCursor } = buildCursorResponse(
    data ?? [],
    limit,
    parsed.sortField as 'created_at',
  );

  return sendSuccess(res, { leads: rows, nextCursor, totalCount, kpiCounts });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const parsed = CreateLeadSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const body = parsed.data;
  const sourceDetails = buildManualSourceDetails(false);

  const result = await createLeadFromWebhook({
    identifierKind: 'phone',
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

  if (body.university || body.budget_tier || body.notes) {
    const detailsPatch: Record<string, unknown> = {
      university: body.university ?? null,
    };
    if (body.budget_tier) {
      Object.assign(detailsPatch, budgetTierWritePayload(body.budget_tier));
    }
    await supabase.from('lead_details').update(detailsPatch).eq('lead_uuid', result.uuid);

    if (body.notes) {
      await supabase.from('leads').update({ notes: body.notes }).eq('uuid', result.uuid);
    }
  }

  return sendSuccess(res, { uuid: result.uuid, assignedTo: result.assignedTo }, 201);
}
