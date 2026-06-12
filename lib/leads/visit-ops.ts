/**
 * Visit scheduling and resolution — service-client operations for the visits table.
 * The visits table is not yet surfaced via RLS views, so these operations use the
 * service client. All authorization checks happen in the calling API handler.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { cancelAutoTasksForLead, createAutoTasksForStage } from '@/lib/tasks/auto-tasks';
import { writeStageHistory } from '@/lib/leads/write-stage-history';

const PRE_VISIT_STAGES = new Set([
  'yeni',
  'bilgi-verildi',
  'aranacak',
  'arandi',
  'arandi-acmadi',
  'bizi-aradi-konustuk',
]);

/**
 * Inserts a visit row and, when the lead is in a pre-visit stage, advances the
 * funnel to 'ziyaret', writes a contact_history entry, and resets auto-tasks.
 */
export async function scheduleVisit(opts: {
  leadUuid: string;
  propertyId: string | null | undefined;
  scheduledDate: string;
  notes: string | null | undefined;
  scheduledBy: string;
  leadFunnelStatus: string;
  leadAssignedTo: string | null;
}): Promise<Record<string, unknown>> {
  const client = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visit, error: visitError } = await (client as any)
    .from('visits')
    .insert({
      lead_uuid: opts.leadUuid,
      property_id: opts.propertyId ?? null,
      scheduled_date: opts.scheduledDate,
      notes: opts.notes ?? null,
      created_by: opts.scheduledBy,
      status: 'scheduled',
    })
    .select('*')
    .maybeSingle();

  if (visitError) throw new Error(`Failed to create visit: ${visitError.message}`);

  const shouldAdvance = PRE_VISIT_STAGES.has(opts.leadFunnelStatus);
  if (shouldAdvance) {
    await client.from('leads').update({ funnel_status: 'ziyaret' }).eq('uuid', opts.leadUuid);
    await writeStageHistory({
      leadUuid: opts.leadUuid,
      fromStatus: opts.leadFunnelStatus,
      toStatus: 'ziyaret',
      changedBy: opts.scheduledBy,
      source: 'manual',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).from('contact_history').insert({
      lead_uuid: opts.leadUuid,
      interaction_type: 'status_change',
      interaction_source: 'manual',
      funnel_status_at_time: 'ziyaret',
      previous_status: opts.leadFunnelStatus,
      status_changed: true,
      salesperson_id: opts.scheduledBy,
      notes: 'Visit scheduled — auto-advanced to ziyaret',
    });

    await cancelAutoTasksForLead(opts.leadUuid);
    void createAutoTasksForStage(opts.leadUuid, 'ziyaret', opts.leadAssignedTo);
  }

  return visit as Record<string, unknown>;
}

/**
 * Updates a visit to attended/failed and, when the lead is still in 'ziyaret',
 * advances to ziyaret-etti or ziyaret-etmedi and resets auto-tasks.
 */
export async function resolveVisit(opts: {
  visitId: string;
  visitLeadUuid: string;
  status: 'attended' | 'failed';
  notes: string | undefined;
  resolvedBy: string;
  leadFunnelStatus: string;
  leadAssignedTo: string | null;
}): Promise<Record<string, unknown>> {
  const client = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (client as any)
    .from('visits')
    .update({ status: opts.status, notes: opts.notes })
    .eq('id', opts.visitId)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(`Failed to update visit: ${error.message}`);
  if (!updated) throw new Error('Visit not found after update');

  if (opts.leadFunnelStatus === 'ziyaret') {
    const nextStatus = opts.status === 'attended' ? 'ziyaret-etti' : 'ziyaret-etmedi';

    await client.from('leads').update({ funnel_status: nextStatus }).eq('uuid', opts.visitLeadUuid);
    await writeStageHistory({
      leadUuid: opts.visitLeadUuid,
      fromStatus: opts.leadFunnelStatus,
      toStatus: nextStatus,
      changedBy: opts.resolvedBy,
      source: 'manual',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).from('contact_history').insert({
      lead_uuid: opts.visitLeadUuid,
      interaction_type: 'status_change',
      interaction_source: 'manual',
      funnel_status_at_time: nextStatus,
      previous_status: opts.leadFunnelStatus,
      status_changed: true,
      salesperson_id: opts.resolvedBy,
      notes: `Visit marked ${opts.status} — advanced to ${nextStatus}`,
    });

    await cancelAutoTasksForLead(opts.visitLeadUuid);
    void createAutoTasksForStage(opts.visitLeadUuid, nextStatus, opts.leadAssignedTo);
  }

  return updated as Record<string, unknown>;
}

/**
 * Updates only a visit's scheduled date (drag-to-reschedule).
 * Authorization is enforced by the calling API handler. Does not touch the
 * lead's funnel status — rescheduling is a calendar move, not a stage change.
 * @param opts - visitId and the new ISO scheduled date.
 * @returns The updated visit row.
 */
export async function rescheduleVisit(opts: {
  visitId: string;
  scheduledDate: string;
}): Promise<Record<string, unknown>> {
  const client = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (client as any)
    .from('visits')
    .update({ scheduled_date: opts.scheduledDate })
    .eq('id', opts.visitId)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(`Failed to reschedule visit: ${error.message}`);
  if (!updated) throw new Error('Visit not found after reschedule');

  return updated as Record<string, unknown>;
}

/**
 * Returns visits with joined lead info, scoped by filters.
 * When isManager=false and no status filter, results are restricted to leads
 * assigned to assignedToUserId.
 */
export async function listVisits(opts: {
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  isManager: boolean;
  assignedToUserId?: string;
}): Promise<{ data: unknown[] | null; error: { message: string } | null }> {
  const client = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('visits')
    .select(
      '*, leads(uuid, lead_name, lead_phone, funnel_status, assigned_to, lead_details(room_type))',
    )
    .order('scheduled_date', { ascending: true });

  if (opts.propertyId) query = query.eq('property_id', opts.propertyId);
  if (opts.dateFrom) query = query.gte('scheduled_date', opts.dateFrom);
  if (opts.dateTo) query = query.lte('scheduled_date', opts.dateTo);

  if (opts.status) {
    query = query.eq('status', opts.status);
  } else if (!opts.isManager && opts.assignedToUserId) {
    const { data: myLeadUuids } = await client
      .from('leads')
      .select('uuid')
      .eq('assigned_to', opts.assignedToUserId)
      .eq('is_archived', false)
      .eq('is_deleted', false);

    if (!myLeadUuids || myLeadUuids.length === 0) return { data: [], error: null };
    query = query.in(
      'lead_uuid',
      myLeadUuids.map((l: { uuid: string }) => l.uuid),
    );
  }

  return query;
}
