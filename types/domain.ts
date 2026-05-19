/**
 * Enriched domain types used in UI components.
 * Extends database types with joins and computed display fields.
 */
import type { SourceDetails } from '@/lib/leads/source-details';

/** Lead row for list and detail views. */
export interface LeadRow {
  uuid: string;
  lead_name: string | null;
  lead_phone: string;
  lead_source: string;
  funnel_status: string;
  sla_status: string;
  assigned_to: string | null;
  created_at: string;
  notes: string | null;
  language: string;
  student_stage: string;
  persona_type?: string | null;
  special_state?: string | null;
  message_from?: string | null;
  sla_deadline?: string | null;
  loss_reason?: string | null;
  lead_score?: number;
  parent_phone?: string | null;
  is_organic?: boolean | null;
  source_details?: SourceDetails | Record<string, unknown>;
  assignee_name?: string | null;
  salespeople?: { full_name: string; email: string } | null;
  updated_at?: string;
}

/** Lead details profile fields editable via API. */
export interface LeadDetailRow {
  lead_uuid: string;
  university: string | null;
  budget_min: number | null;
  budget_max: number | null;
  move_in: string | null;
  uni_year: string | null;
  parent_name: string | null;
  preferred_district: string | null;
  student_gender: string | null;
  nationality: string | null;
  interested_hotel?: string[];
  room_type?: string[];
  dorm_awaiting?: string[];
  kvkk_opt_in?: boolean | null;
  marketing_opt_in?: boolean | null;
  rec_hotel?: string | null;
  updated_at?: string;
}

/** Lead with joined details and assignee. */
export interface LeadWithDetails extends LeadRow {
  lead_details?: LeadDetailRow | Record<string, unknown> | null;
}

/** Salesperson option for dropdowns. */
export interface SalespersonOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

/** Salesperson summary for display. */
export interface SalespersonSummary {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

/** Contact history entry for timeline display. */
export interface ContactHistoryEntry {
  id: string;
  interaction_type: string;
  interaction_source: string | null;
  notes: string | null;
  created_at: string;
  funnel_status_at_time: string | null;
  previous_status: string | null;
  status_changed: boolean;
  metadata?: Record<string, unknown> | null;
}

/** Task row for task list view. */
export interface TaskRow {
  id: string;
  lead_uuid: string;
  assigned_to: string;
  task_type: string;
  due_when: string;
  is_completed: boolean;
  is_late: boolean;
  notes: string | null;
  created_at: string;
}

/** Property row for inventory list. */
export interface PropertyRow {
  id: string;
  hotel_name: string;
  address: string | null;
  district: string | null;
  serviced_gender: string | null;
  serviced_schools: string[];
  total_beds: number | null;
  status: string;
  accepts_non_students?: boolean;
  google_sheet_id?: string | null;
}

/** Analytics materialized view aggregates. */
export interface AnalyticsPayload {
  leadsBySource: Array<{
    lead_source: string | null;
    lead_count: number | null;
    won_count: number | null;
    conversion_rate: number | null;
  }>;
  funnelDistribution: Array<{
    funnel_status: string | null;
    lead_count: number | null;
  }>;
  agentPerformance: Array<{
    salesperson_id: string | null;
    full_name: string | null;
    assigned_count: number | null;
    won_count: number | null;
    avg_response_minutes: number | null;
  }>;
  slaBreachRate: Array<{
    lead_source: string | null;
    breach_count: number | null;
    total_count: number | null;
    breach_rate: number | null;
  }>;
}
