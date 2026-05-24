export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      archived_contact_history: {
        Row: {
          created_at: string;
          funnel_status_at_time: string | null;
          id: string;
          interaction_source: string | null;
          interaction_type: string;
          lead_uuid: string;
          metadata: Json;
          notes: string | null;
          previous_status: string | null;
          salesperson_id: string | null;
          status_changed: boolean;
        };
        Insert: {
          created_at: string;
          funnel_status_at_time?: string | null;
          id: string;
          interaction_source?: string | null;
          interaction_type: string;
          lead_uuid: string;
          metadata?: Json;
          notes?: string | null;
          previous_status?: string | null;
          salesperson_id?: string | null;
          status_changed?: boolean;
        };
        Update: {
          created_at?: string;
          funnel_status_at_time?: string | null;
          id?: string;
          interaction_source?: string | null;
          interaction_type?: string;
          lead_uuid?: string;
          metadata?: Json;
          notes?: string | null;
          previous_status?: string | null;
          salesperson_id?: string | null;
          status_changed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'archived_contact_history_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'archived_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'archived_contact_history_salesperson_id_fkey';
            columns: ['salesperson_id'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'archived_contact_history_salesperson_id_fkey';
            columns: ['salesperson_id'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      archived_leads: {
        Row: {
          archive_reason: string;
          archived_at: string;
          archived_by: string;
          assigned_to: string | null;
          created_at: string;
          funnel_status: string;
          is_organic: boolean | null;
          language: string;
          last_contact_at: string | null;
          lead_name: string | null;
          lead_phone: string;
          lead_score: number;
          lead_source: string;
          loss_reason: string | null;
          message_from: string | null;
          parent_phone: string | null;
          persona_type: string | null;
          source_details: Json;
          special_state: string | null;
          student_stage: string;
          updated_at: string;
          uuid: string;
        };
        Insert: {
          archive_reason: string;
          archived_at?: string;
          archived_by: string;
          assigned_to?: string | null;
          created_at: string;
          funnel_status: string;
          is_organic?: boolean | null;
          language: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone: string;
          lead_score?: number;
          lead_source: string;
          loss_reason?: string | null;
          message_from?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          source_details?: Json;
          special_state?: string | null;
          student_stage: string;
          updated_at: string;
          uuid: string;
        };
        Update: {
          archive_reason?: string;
          archived_at?: string;
          archived_by?: string;
          assigned_to?: string | null;
          created_at?: string;
          funnel_status?: string;
          is_organic?: boolean | null;
          language?: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string;
          lead_score?: number;
          lead_source?: string;
          loss_reason?: string | null;
          message_from?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          source_details?: Json;
          special_state?: string | null;
          student_stage?: string;
          updated_at?: string;
          uuid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'archived_leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'archived_leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      campaign_leads: {
        Row: {
          campaign_id: string;
          created_at: string;
          delivered_at: string | null;
          failed_reason: string | null;
          id: string;
          lead_uuid: string;
          read_at: string | null;
          retry_count: number;
          scheduled_at: string | null;
          sent_at: string | null;
          skipped_reason: string | null;
          status: string;
          wa_message_id: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          delivered_at?: string | null;
          failed_reason?: string | null;
          id?: string;
          lead_uuid: string;
          read_at?: string | null;
          retry_count?: number;
          scheduled_at?: string | null;
          sent_at?: string | null;
          skipped_reason?: string | null;
          status?: string;
          wa_message_id?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          delivered_at?: string | null;
          failed_reason?: string | null;
          id?: string;
          lead_uuid?: string;
          read_at?: string | null;
          retry_count?: number;
          scheduled_at?: string | null;
          sent_at?: string | null;
          skipped_reason?: string | null;
          status?: string;
          wa_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'campaign_leads_campaign_id_fkey';
            columns: ['campaign_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_leads_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'campaign_leads_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      campaigns: {
        Row: {
          campaign_type: string;
          created_at: string;
          created_by: string | null;
          daily_send_count: number;
          id: string;
          language: string | null;
          paused_at: string | null;
          segment: Json;
          send_delay_ms: number;
          status: string;
          template_id: string | null;
          template_language: string | null;
          template_variables: Json;
          updated_at: string;
        };
        Insert: {
          campaign_type?: string;
          created_at?: string;
          created_by?: string | null;
          daily_send_count?: number;
          id?: string;
          language?: string | null;
          paused_at?: string | null;
          segment?: Json;
          send_delay_ms?: number;
          status?: string;
          template_id?: string | null;
          template_language?: string | null;
          template_variables?: Json;
          updated_at?: string;
        };
        Update: {
          campaign_type?: string;
          created_at?: string;
          created_by?: string | null;
          daily_send_count?: number;
          id?: string;
          language?: string | null;
          paused_at?: string | null;
          segment?: Json;
          send_delay_ms?: number;
          status?: string;
          template_id?: string | null;
          template_language?: string | null;
          template_variables?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'campaigns_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'campaigns_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      chatwoot_sync_log: {
        Row: {
          created_at: string;
          direction: string;
          error_message: string | null;
          id: string;
          lead_uuid: string | null;
          operation: string;
          payload: Json | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          direction: string;
          error_message?: string | null;
          id?: string;
          lead_uuid?: string | null;
          operation: string;
          payload?: Json | null;
          status: string;
        };
        Update: {
          created_at?: string;
          direction?: string;
          error_message?: string | null;
          id?: string;
          lead_uuid?: string | null;
          operation?: string;
          payload?: Json | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chatwoot_sync_log_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'chatwoot_sync_log_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      collected_data: {
        Row: {
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
        };
        Insert: {
          id?: string;
          lead_uuid: string;
          channel: string;
          external_id: string;
          ref_code?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          landing_page?: string | null;
          referral_domain?: string | null;
          session_start?: string | null;
          session_duration?: number | null;
          click_event?: string | null;
          ga4_session_id?: string | null;
          ad_id?: string | null;
          campaign_id?: string | null;
          adset_id?: string | null;
          placement?: string | null;
          called_number?: string | null;
          call_duration?: number | null;
          chatwoot_url?: string | null;
          is_organic?: boolean | null;
          normalization_failed?: boolean;
          source_confidence: string;
          path_lost_at: string;
          ga4_enriched?: boolean;
          ga4_enriched_at?: string | null;
          ga4_fetch_attempts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_uuid?: string;
          channel?: string;
          external_id?: string;
          ref_code?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          landing_page?: string | null;
          referral_domain?: string | null;
          session_start?: string | null;
          session_duration?: number | null;
          click_event?: string | null;
          ga4_session_id?: string | null;
          ad_id?: string | null;
          campaign_id?: string | null;
          adset_id?: string | null;
          placement?: string | null;
          called_number?: string | null;
          call_duration?: number | null;
          chatwoot_url?: string | null;
          is_organic?: boolean | null;
          normalization_failed?: boolean;
          source_confidence?: string;
          path_lost_at?: string;
          ga4_enriched?: boolean;
          ga4_enriched_at?: string | null;
          ga4_fetch_attempts?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collected_data_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      contact_history: {
        Row: {
          created_at: string;
          funnel_status_at_time: string | null;
          id: string;
          interaction_source: string | null;
          interaction_type: string;
          lead_uuid: string;
          metadata: Json;
          notes: string | null;
          previous_status: string | null;
          salesperson_id: string | null;
          status_changed: boolean;
        };
        Insert: {
          created_at?: string;
          funnel_status_at_time?: string | null;
          id?: string;
          interaction_source?: string | null;
          interaction_type: string;
          lead_uuid: string;
          metadata?: Json;
          notes?: string | null;
          previous_status?: string | null;
          salesperson_id?: string | null;
          status_changed?: boolean;
        };
        Update: {
          created_at?: string;
          funnel_status_at_time?: string | null;
          id?: string;
          interaction_source?: string | null;
          interaction_type?: string;
          lead_uuid?: string;
          metadata?: Json;
          notes?: string | null;
          previous_status?: string | null;
          salesperson_id?: string | null;
          status_changed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_history_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'contact_history_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'contact_history_salesperson_id_fkey';
            columns: ['salesperson_id'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'contact_history_salesperson_id_fkey';
            columns: ['salesperson_id'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      cron_settings: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      dni_numbers: {
        Row: {
          id: string;
          virtual_number: string;
          source: string;
          display_label: string;
          is_active: boolean;
          lead_count: number;
          last_lead_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          virtual_number: string;
          source: string;
          display_label: string;
          is_active?: boolean;
          lead_count?: number;
          last_lead_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          virtual_number?: string;
          source?: string;
          display_label?: string;
          is_active?: boolean;
          lead_count?: number;
          last_lead_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_details: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          created_at: string;
          dorm_awaiting: string[];
          interested_hotel: string[];
          kvkk_opt_in: boolean | null;
          lead_uuid: string;
          marketing_opt_in: boolean | null;
          move_in: string | null;
          nationality: string | null;
          parent_name: string | null;
          preferred_district: string | null;
          rec_hotel: string | null;
          room_type: string[];
          student_gender: string | null;
          uni_year: string | null;
          university: string | null;
          updated_at: string;
        };
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[];
          student_gender?: string | null;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[];
          student_gender?: string | null;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_details_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_details_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      leads: {
        Row: {
          archived_at: string | null;
          assigned_to: string | null;
          assignee_sync_source: string | null;
          assignee_synced_at: string | null;
          chatwoot_contact_id: number | null;
          chatwoot_conversation_id: number | null;
          created_at: string;
          deleted_at: string | null;
          funnel_status: string;
          is_archived: boolean;
          is_deleted: boolean;
          is_organic: boolean | null;
          label_sync_source: string | null;
          label_synced_at: string | null;
          language: string;
          last_contact_at: string | null;
          lead_name: string | null;
          lead_phone: string;
          lead_score: number;
          lead_source: string;
          loss_reason: string | null;
          message_from: string | null;
          notes: string | null;
          parent_phone: string | null;
          persona_type: string | null;
          sla_breach_alerted_at: string | null;
          sla_deadline: string | null;
          sla_status: string;
          source_details: Json;
          special_state: string | null;
          student_stage: string;
          updated_at: string;
          uuid: string;
        };
        Insert: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          funnel_status?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone: string;
          lead_score?: number;
          lead_source: string;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string;
          source_details?: Json;
          special_state?: string | null;
          student_stage?: string;
          updated_at?: string;
          uuid?: string;
        };
        Update: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          funnel_status?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string;
          lead_score?: number;
          lead_source?: string;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string;
          source_details?: Json;
          special_state?: string | null;
          student_stage?: string;
          updated_at?: string;
          uuid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          alert_type: string;
          created_at: string;
          id: string;
          is_resolved: boolean;
          lead_uuid: string | null;
          message: string;
          resolved_at: string | null;
          resolved_by: string | null;
          sent_to: string[];
          task_id: string | null;
        };
        Insert: {
          alert_type: string;
          created_at?: string;
          id?: string;
          is_resolved?: boolean;
          lead_uuid?: string | null;
          message: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sent_to?: string[];
          task_id?: string | null;
        };
        Update: {
          alert_type?: string;
          created_at?: string;
          id?: string;
          is_resolved?: boolean;
          lead_uuid?: string | null;
          message?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sent_to?: string[];
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'notifications_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'notifications_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'notifications_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      old_lead_details: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          created_at: string;
          dorm_awaiting: string[];
          interested_hotel: string[];
          kvkk_opt_in: boolean | null;
          lead_uuid: string;
          marketing_opt_in: boolean | null;
          move_in: string | null;
          nationality: string | null;
          parent_name: string | null;
          preferred_district: string | null;
          rec_hotel: string | null;
          room_type: string[];
          student_gender: string | null;
          uni_year: string | null;
          university: string | null;
          updated_at: string;
        };
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[];
          student_gender?: string | null;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[];
          student_gender?: string | null;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'old_lead_details_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'old_leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      old_lead_messages: {
        Row: {
          chatwoot_conversation_id: number;
          chatwoot_message_id: number;
          content: string | null;
          created_at: string;
          id: string;
          imported_at: string;
          is_private: boolean;
          lead_uuid: string;
          message_type: string;
          sender_id: number | null;
          sender_name: string | null;
          sender_type: string | null;
        };
        Insert: {
          chatwoot_conversation_id: number;
          chatwoot_message_id: number;
          content?: string | null;
          created_at: string;
          id?: string;
          imported_at?: string;
          is_private?: boolean;
          lead_uuid: string;
          message_type: string;
          sender_id?: number | null;
          sender_name?: string | null;
          sender_type?: string | null;
        };
        Update: {
          chatwoot_conversation_id?: number;
          chatwoot_message_id?: number;
          content?: string | null;
          created_at?: string;
          id?: string;
          imported_at?: string;
          is_private?: boolean;
          lead_uuid?: string;
          message_type?: string;
          sender_id?: number | null;
          sender_name?: string | null;
          sender_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'old_lead_messages_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'old_leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      old_leads: {
        Row: {
          archived_at: string | null;
          assigned_to: string | null;
          assignee_sync_source: string | null;
          assignee_synced_at: string | null;
          chatwoot_contact_id: number | null;
          chatwoot_conversation_id: number | null;
          created_at: string;
          deleted_at: string | null;
          funnel_status: string;
          is_archived: boolean;
          is_deleted: boolean;
          is_organic: boolean | null;
          label_sync_source: string | null;
          label_synced_at: string | null;
          language: string;
          last_contact_at: string | null;
          lead_name: string | null;
          lead_phone: string;
          lead_score: number;
          lead_source: string;
          loss_reason: string | null;
          message_from: string | null;
          notes: string | null;
          parent_phone: string | null;
          persona_type: string | null;
          sla_breach_alerted_at: string | null;
          sla_deadline: string | null;
          sla_status: string;
          source_details: Json;
          special_state: string | null;
          student_stage: string;
          updated_at: string;
          uuid: string;
        };
        Insert: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          funnel_status?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone: string;
          lead_score?: number;
          lead_source: string;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string;
          source_details?: Json;
          special_state?: string | null;
          student_stage?: string;
          updated_at?: string;
          uuid?: string;
        };
        Update: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          funnel_status?: string;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string;
          lead_score?: number;
          lead_source?: string;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string;
          source_details?: Json;
          special_state?: string | null;
          student_stage?: string;
          updated_at?: string;
          uuid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'old_leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      properties: {
        Row: {
          accepts_non_students: boolean;
          address: string | null;
          created_at: string;
          district: string | null;
          google_sheet_id: string | null;
          hotel_name: string;
          id: string;
          serviced_gender: string | null;
          serviced_schools: string[];
          status: string;
          total_beds: number | null;
          updated_at: string;
        };
        Insert: {
          accepts_non_students?: boolean;
          address?: string | null;
          created_at?: string;
          district?: string | null;
          google_sheet_id?: string | null;
          hotel_name: string;
          id?: string;
          serviced_gender?: string | null;
          serviced_schools?: string[];
          status?: string;
          total_beds?: number | null;
          updated_at?: string;
        };
        Update: {
          accepts_non_students?: boolean;
          address?: string | null;
          created_at?: string;
          district?: string | null;
          google_sheet_id?: string | null;
          hotel_name?: string;
          id?: string;
          serviced_gender?: string | null;
          serviced_schools?: string[];
          status?: string;
          total_beds?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ref_sessions: {
        Row: {
          ref_code: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          landing_page: string | null;
          referral_domain: string | null;
          created_at: string;
        };
        Insert: {
          ref_code: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          landing_page?: string | null;
          referral_domain?: string | null;
          created_at?: string;
        };
        Update: {
          ref_code?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          landing_page?: string | null;
          referral_domain?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      salespeople: {
        Row: {
          active_lead_count: number;
          assigned_hotels: string[];
          chatwoot_agent_email: string | null;
          chatwoot_user_id: number | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          languages: string[];
          last_login_at: string | null;
          lead_count: number;
          max_active_leads: number;
          phone: string | null;
          role: string;
          shift_end: string;
          shift_start: string;
          telegram_chat_id: string | null;
        };
        Insert: {
          active_lead_count?: number;
          assigned_hotels?: string[];
          chatwoot_agent_email?: string | null;
          chatwoot_user_id?: number | null;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          is_active?: boolean;
          languages?: string[];
          last_login_at?: string | null;
          lead_count?: number;
          max_active_leads?: number;
          phone?: string | null;
          role: string;
          shift_end?: string;
          shift_start?: string;
          telegram_chat_id?: string | null;
        };
        Update: {
          active_lead_count?: number;
          assigned_hotels?: string[];
          chatwoot_agent_email?: string | null;
          chatwoot_user_id?: number | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          languages?: string[];
          last_login_at?: string | null;
          lead_count?: number;
          max_active_leads?: number;
          phone?: string | null;
          role?: string;
          shift_end?: string;
          shift_start?: string;
          telegram_chat_id?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          due_when: string;
          id: string;
          is_completed: boolean;
          is_late: boolean;
          lead_uuid: string;
          notes: string | null;
          task_type: string;
        };
        Insert: {
          assigned_to: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          due_when: string;
          id?: string;
          is_completed?: boolean;
          is_late?: boolean;
          lead_uuid: string;
          notes?: string | null;
          task_type: string;
        };
        Update: {
          assigned_to?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          due_when?: string;
          id?: string;
          is_completed?: boolean;
          is_late?: boolean;
          lead_uuid?: string;
          notes?: string | null;
          task_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'tasks_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'tasks_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      webhook_logs: {
        Row: {
          created_at: string;
          error_message: string | null;
          event_type: string;
          id: string;
          idempotency_key: string;
          payload: Json;
          processed_at: string | null;
          retry_count: number;
          source: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          event_type: string;
          id?: string;
          idempotency_key: string;
          payload: Json;
          processed_at?: string | null;
          retry_count?: number;
          source: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          payload?: Json;
          processed_at?: string | null;
          retry_count?: number;
          source?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      active_leads: {
        Row: {
          archived_at: string | null;
          assigned_to: string | null;
          assignee_sync_source: string | null;
          assignee_synced_at: string | null;
          chatwoot_contact_id: number | null;
          chatwoot_conversation_id: number | null;
          created_at: string | null;
          deleted_at: string | null;
          funnel_status: string | null;
          is_archived: boolean | null;
          is_deleted: boolean | null;
          is_organic: boolean | null;
          label_sync_source: string | null;
          label_synced_at: string | null;
          language: string | null;
          last_contact_at: string | null;
          lead_name: string | null;
          lead_phone: string | null;
          lead_score: number | null;
          lead_source: string | null;
          loss_reason: string | null;
          message_from: string | null;
          notes: string | null;
          parent_phone: string | null;
          persona_type: string | null;
          sla_breach_alerted_at: string | null;
          sla_deadline: string | null;
          sla_status: string | null;
          source_details: Json | null;
          special_state: string | null;
          student_stage: string | null;
          updated_at: string | null;
          uuid: string | null;
        };
        Insert: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          funnel_status?: string | null;
          is_archived?: boolean | null;
          is_deleted?: boolean | null;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string | null;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string | null;
          lead_score?: number | null;
          lead_source?: string | null;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string | null;
          source_details?: Json | null;
          special_state?: string | null;
          student_stage?: string | null;
          updated_at?: string | null;
          uuid?: string | null;
        };
        Update: {
          archived_at?: string | null;
          assigned_to?: string | null;
          assignee_sync_source?: string | null;
          assignee_synced_at?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          funnel_status?: string | null;
          is_archived?: boolean | null;
          is_deleted?: boolean | null;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string | null;
          last_contact_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string | null;
          lead_score?: number | null;
          lead_source?: string | null;
          loss_reason?: string | null;
          message_from?: string | null;
          notes?: string | null;
          parent_phone?: string | null;
          persona_type?: string | null;
          sla_breach_alerted_at?: string | null;
          sla_deadline?: string | null;
          sla_status?: string | null;
          source_details?: Json | null;
          special_state?: string | null;
          student_stage?: string | null;
          updated_at?: string | null;
          uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_details_safe: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          created_at: string | null;
          dorm_awaiting: string[] | null;
          interested_hotel: string[] | null;
          kvkk_opt_in: boolean | null;
          lead_uuid: string | null;
          marketing_opt_in: boolean | null;
          move_in: string | null;
          nationality: string | null;
          parent_name: string | null;
          preferred_district: string | null;
          rec_hotel: string | null;
          room_type: string[] | null;
          student_gender: string | null;
          uni_year: string | null;
          university: string | null;
          updated_at: string | null;
        };
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string | null;
          dorm_awaiting?: string[] | null;
          interested_hotel?: string[] | null;
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string | null;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: never;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[] | null;
          student_gender?: never;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string | null;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string | null;
          dorm_awaiting?: string[] | null;
          interested_hotel?: string[] | null;
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string | null;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: never;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: string | null;
          room_type?: string[] | null;
          student_gender?: never;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_details_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_details_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      mv_agent_performance: {
        Row: {
          assigned_count: number | null;
          avg_response_minutes: number | null;
          conversion_rate: number | null;
          full_name: string | null;
          lost_count: number | null;
          salesperson_id: string | null;
          won_count: number | null;
        };
        Relationships: [];
      };
      mv_funnel_distribution: {
        Row: {
          funnel_status: string | null;
          lead_count: number | null;
        };
        Relationships: [];
      };
      mv_leads_by_source: {
        Row: {
          active_count: number | null;
          conversion_rate: number | null;
          lead_count: number | null;
          lead_source: string | null;
          lost_count: number | null;
          won_count: number | null;
        };
        Relationships: [];
      };
      mv_sla_breach_rate: {
        Row: {
          breach_count: number | null;
          breach_rate: number | null;
          lead_source: string | null;
          total_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      archive_single_lead: {
        Args: {
          archived_by_param: string;
          manual_archive_reason?: string;
          manual_loss_reason?: string;
          target_uuid: string;
        };
        Returns: undefined;
      };
      decrement_active_lead_count: {
        Args: { agent_id: string };
        Returns: undefined;
      };
      get_cron_setting: { Args: { p_key: string }; Returns: string };
      get_user_role: { Args: never; Returns: string };
      is_manager_or_superadmin: { Args: never; Returns: boolean };
      is_superadmin: { Args: never; Returns: boolean };
      increment_active_lead_count: {
        Args: { agent_id: string };
        Returns: undefined;
      };
      search_archived_leads_ids: {
        Args: { search_term: string };
        Returns: {
          lead_uuid: string;
        }[];
      };
      search_leads_ids: {
        Args: { search_term: string };
        Returns: {
          lead_uuid: string;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      unarchive_single_lead: {
        Args: { manager_uuid: string; target_uuid: string };
        Returns: undefined;
      };
      validate_dorm_awaiting: { Args: { arr: string[] }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
