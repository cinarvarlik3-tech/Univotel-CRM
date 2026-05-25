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

/** Phase 4 collected_data attribution row. */
export interface CollectedDataRow {
  id: string;
  lead_uuid: string;
  channel: string;
  external_id: string;
  ref_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referral_domain: string | null;
  session_start: string | null;
  session_duration: number | null;
  click_event: string | null;
  ga4_session_id: string | null;
  ad_id: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  placement: string | null;
  called_number: string | null;
  call_duration: number | null;
  chatwoot_url: string | null;
  is_organic: boolean | null;
  normalization_failed: boolean;
  source_confidence: string;
  path_lost_at: string;
  ga4_enriched: boolean;
  ga4_enriched_at: string | null;
  ga4_fetch_attempts: number;
  created_at: string;
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

/** Notification alert types stored in notifications.alert_type. */
export type NotificationAlertType =
  | 'sla_breach'
  | 'task_overdue'
  | 'unassigned_lead'
  | 'webhook_failure'
  | 'campaign_paused'
  | 'campaign_failed';

/** Notification row for manager alert inbox. */
export interface NotificationRow {
  id: string;
  alert_type: NotificationAlertType;
  lead_uuid: string | null;
  task_id: string | null;
  message: string;
  sent_to: string[];
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  leads?: { lead_name: string | null; lead_phone: string } | null;
}

/** Campaign segment filter payload (same shape as lead list filters). */
export interface CampaignSegment {
  filters: Array<{ field: string; operator: string; value: string }>;
}

/** Campaign summary for list/detail views. */
export interface CampaignRow {
  id: string;
  campaign_type: string;
  status: string;
  segment: CampaignSegment;
  language: string | null;
  template_id: string | null;
  template_language: string | null;
  template_variables: Record<string, string>;
  send_delay_ms: number;
  daily_send_count: number;
  paused_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Campaign lead execution row. */
export interface CampaignLeadRow {
  id: string;
  campaign_id: string;
  lead_uuid: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_reason: string | null;
  skipped_reason: string | null;
  wa_message_id: string | null;
  leads?: { lead_name: string | null; lead_phone: string } | null;
}

/** Archived lead row for list and detail views. */
export interface ArchivedLeadRow {
  uuid: string;
  archive_reason: 'won' | 'lost';
  loss_reason: string | null;
  archived_at: string;
  archived_by: string;
  lead_name: string | null;
  lead_phone: string;
  lead_source: string;
  funnel_status: string;
  student_stage: string;
  persona_type?: string | null;
  special_state?: string | null;
  message_from?: string | null;
  is_organic?: boolean | null;
  assigned_to: string | null;
  language: string;
  source_details?: Record<string, unknown>;
  parent_phone?: string | null;
  lead_score?: number;
  created_at: string;
  last_contact_at?: string | null;
  updated_at: string;
  salespeople?: { full_name: string; email: string } | null;
}

/** Old lead row for historical Chatwoot import list. */
export interface OldLeadRow {
  uuid: string;
  lead_name: string | null;
  lead_phone: string;
  lead_source: string;
  message_from: string | null;
  funnel_status: string;
  student_stage: string;
  created_at: string;
  last_contact_at: string | null;
  chatwoot_conversation_id: number | null;
  salespeople?: { full_name: string; email: string } | null;
  old_lead_details?: { university: string | null } | { university: string | null }[] | null;
}

/** Full old_lead_details row from import. */
export interface OldLeadDetailsRow {
  lead_uuid: string;
  university: string | null;
  interested_hotel: string[];
  rec_hotel: string | null;
  room_type: string[];
  budget_min: number | null;
  budget_max: number | null;
  move_in: string | null;
  dorm_awaiting: string[];
  uni_year: string | null;
  parent_name: string | null;
  kvkk_opt_in: boolean | null;
  marketing_opt_in: boolean | null;
  student_gender: string | null;
  nationality: string | null;
  preferred_district: string | null;
  created_at: string;
  updated_at: string;
}

/** Old lead with full detail fields for sidebar panel. */
export interface OldLeadDetailRow extends OldLeadRow {
  updated_at: string;
  language: string;
  lead_score: number;
  chatwoot_contact_id: number | null;
  source_details: Record<string, unknown> | null;
  old_lead_details?: OldLeadDetailsRow | OldLeadDetailsRow[] | null;
}

/** Chat message row for lead / old lead conversation UI. */
export interface ChatMessageRow {
  id: string;
  messageType: 'incoming' | 'outgoing' | 'activity';
  content: string | null;
  senderType: 'contact' | 'user' | 'system' | null;
  senderName: string | null;
  createdAt: string;
  chatwootConversationId: number;
}

/** @deprecated Use ChatMessageRow */
export type OldLeadMessageRow = ChatMessageRow;

/** Archive analytics summary payload. */
export interface ArchiveSummaryPayload {
  totals: { won: number; lost: number; total: number };
  bySource: Array<{
    lead_source: string | null;
    won_count: number | null;
    lost_count: number | null;
    conversion_rate: number | null;
  }>;
  byAgent: Array<{
    salesperson_id: string | null;
    full_name: string | null;
    won_count: number | null;
    lost_count: number | null;
    conversion_rate: number | null;
  }>;
}

/** Analytics materialized view aggregates. */
export interface AnalyticsPayload {
  leadsBySource: Array<{
    lead_source: string | null;
    lead_count: number | null;
    active_count?: number | null;
    won_count: number | null;
    lost_count?: number | null;
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
    lost_count?: number | null;
    conversion_rate?: number | null;
    avg_response_minutes: number | null;
  }>;
  slaBreachRate: Array<{
    lead_source: string | null;
    breach_count: number | null;
    total_count: number | null;
    breach_rate: number | null;
  }>;
}
