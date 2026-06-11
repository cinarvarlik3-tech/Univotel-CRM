/**
 * Lead assignment algorithm for routing new leads to available salespeople.
 */
import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/service';
import { toZonedTime } from 'date-fns-tz';

/** Salesperson row subset used for assignment decisions. */
interface SalespersonCandidate {
  id: string;
  active_lead_count: number;
  lead_count: number;
  max_active_leads: number;
  languages: string[];
  assigned_hotels: string[];
  shift_start: string;
  shift_end: string;
}

/** Assignment result with assigned salesperson UUID or null. */
export interface AssignmentResult {
  assignedTo: string | null;
}

/**
 * Checks if current Istanbul time falls within agent shift window.
 * @param shiftStart - Shift start time string (HH:mm:ss).
 * @param shiftEnd - Shift end time string (HH:mm:ss).
 * @param now - Current date for evaluation.
 * @returns True if within shift hours.
 */
function isWithinShift(shiftStart: string, shiftEnd: string, now: Date): boolean {
  const istanbulNow = toZonedTime(now, ISTANBUL_TIMEZONE);
  const currentMinutes = istanbulNow.getHours() * 60 + istanbulNow.getMinutes();

  const [startH, startM] = shiftStart.split(':').map(Number);
  const [endH, endM] = shiftEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

/**
 * Assigns a lead to the best available salesperson.
 *
 * @deprecated Assignment replaced by Lead Hub self-service (Major Update). All new leads go to
 *   assigned_to = NULL. Salespeople claim leads via POST /api/leads/[id]/claim. This function is
 *   kept for potential future manager-reassignment flows and must not be re-wired to lead creation.
 *
 * @param params - Assignment parameters including language and hotel preference.
 * @returns Assigned salesperson UUID or null if pool is empty.
 */
export async function assignLead(params: {
  language?: string;
  preferredHotelId?: string;
}): Promise<AssignmentResult> {
  const client = createServiceClient();
  const now = new Date();

  const { data: candidates, error } = await client
    .from('salespeople')
    .select(
      'id, active_lead_count, lead_count, max_active_leads, languages, assigned_hotels, shift_start, shift_end',
    )
    .eq('is_active', true)
    .eq('role', 'salesperson');

  if (error) {
    throw new Error(`Assignment query failed: ${error.message}`);
  }

  let pool: SalespersonCandidate[] = (candidates ?? []).filter(
    (agent) =>
      agent.active_lead_count < agent.max_active_leads &&
      isWithinShift(agent.shift_start, agent.shift_end, now),
  ) as SalespersonCandidate[];

  if (params.language) {
    const languageMatches = pool.filter((agent) => agent.languages.includes(params.language!));
    if (languageMatches.length > 0) {
      pool = languageMatches;
    }
  }

  if (params.preferredHotelId) {
    const hotelMatches = pool.filter((agent) =>
      agent.assigned_hotels.includes(params.preferredHotelId!),
    );
    if (hotelMatches.length > 0) {
      pool = hotelMatches;
    }
  }

  if (pool.length === 0) {
    return { assignedTo: null };
  }

  pool.sort((a, b) => {
    if (a.active_lead_count !== b.active_lead_count) {
      return a.active_lead_count - b.active_lead_count;
    }
    return a.lead_count - b.lead_count;
  });

  const minActiveCount = pool[0].active_lead_count;
  const minLeadCount = pool[0].lead_count;
  const tied = pool.filter(
    (a) => a.active_lead_count === minActiveCount && a.lead_count === minLeadCount,
  );

  const selected = tied[Math.floor(Math.random() * tied.length)];
  return { assignedTo: selected.id };
}

/**
 * Increments active and lifetime lead counters for an assigned salesperson.
 * @param salespersonId - UUID of the assigned salesperson.
 */
export async function incrementActiveLeadCount(salespersonId: string): Promise<void> {
  const client = createServiceClient();

  const { error } = await client.rpc('increment_active_lead_count', {
    agent_id: salespersonId,
  });

  if (error) {
    throw new Error(`Failed to increment active lead count: ${error.message}`);
  }
}

/**
 * Decrements active lead counter when a lead is reassigned away from an agent.
 * @param salespersonId - UUID of the previous assignee.
 */
export async function decrementActiveLeadCount(salespersonId: string): Promise<void> {
  const client = createServiceClient();

  const { error } = await client.rpc('decrement_active_lead_count', {
    agent_id: salespersonId,
  });

  if (error) {
    throw new Error(`Failed to decrement active lead count: ${error.message}`);
  }
}
