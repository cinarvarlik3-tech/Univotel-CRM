/**
 * API request and response type definitions for all /api/ routes.
 */
import type { AnalyticsPayload } from '@/types/domain';

/** Standard successful API response envelope. */
export interface ApiSuccess<T> {
  data: T;
}

/** Standard error API response envelope. */
export interface ApiError {
  error: string;
  fields?: Record<string, string[]>;
}

/** Manual lead creation request body. */
export interface CreateLeadRequest {
  lead_name?: string;
  lead_phone: string;
  language?: string;
  university?: string;
  budget_tier?: string;
  notes?: string;
}

/** Lead update request body. */
export interface UpdateLeadRequest {
  funnel_status?: string;
  student_stage?: string;
  persona_type?: string | null;
  special_state?: string | null;
  assigned_to?: string | null;
  notes?: string;
  loss_reason?: string;
  parent_phone?: string | null;
  language?: string;
  lead_score?: number;
}

/** Lead details update request body. */
export interface UpdateLeadDetailsRequest {
  university?: string | null;
  budget_tier?: string | null;
  move_in?: string | null;
  uni_year?: string | null;
  parent_name?: string | null;
  preferred_district?: string | null;
  student_gender?: string | null;
  nationality?: string | null;
  interested_hotel?: string[];
  room_type?: string[];
  dorm_awaiting?: string[];
  kvkk_opt_in?: boolean | null;
  marketing_opt_in?: boolean | null;
}

/** Contact history append request body. */
export interface CreateContactHistoryRequest {
  notes: string;
  interaction_type?: string;
}

/** Task creation request body. */
export interface CreateTaskRequest {
  lead_uuid: string;
  task_type: string;
  due_when: string;
  notes?: string;
  assigned_to?: string;
}

/** Task update request body. */
export interface UpdateTaskRequest {
  is_completed?: boolean;
  notes?: string;
}

/** Lead list query parameters. */
export interface LeadListQuery {
  cursor?: string;
  limit?: number;
  sort?: string;
  search?: string;
  fuzzy?: boolean;
  filters?: Record<string, string>;
}

/** Analytics API response payload. */
export type AnalyticsResponse = AnalyticsPayload;

/** Manual archive request body. */
export interface ArchiveLeadRequest {
  archive_reason: 'won' | 'lost';
  loss_reason?: string;
}

/** Archived lead list response. */
export interface ArchivedLeadListResponse {
  archivedLeads: import('@/types/domain').ArchivedLeadRow[];
  nextCursor: string | null;
}

/** Archived lead detail response. */
export interface ArchivedLeadDetailResponse {
  lead: import('@/types/domain').ArchivedLeadRow;
  contactHistory: import('@/types/domain').ContactHistoryEntry[];
  leadDetails: import('@/types/domain').LeadDetailRow | null;
}

/** Unarchive response. */
export interface UnarchiveLeadResponse {
  uuid: string;
}
