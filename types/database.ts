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
          ad_id: string | null;
          adset_id: string | null;
          call_duration: number | null;
          called_number: string | null;
          campaign_id: string | null;
          channel: string;
          chatwoot_url: string | null;
          click_event: string | null;
          created_at: string;
          external_id: string;
          ga4_enriched: boolean;
          ga4_enriched_at: string | null;
          ga4_fetch_attempts: number;
          ga4_session_id: string | null;
          id: string;
          is_organic: boolean | null;
          landing_page: string | null;
          lead_uuid: string;
          normalization_failed: boolean;
          path_lost_at: string;
          placement: string | null;
          ref_code: string | null;
          referral_domain: string | null;
          session_duration: number | null;
          session_start: string | null;
          source_confidence: string;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          ad_id?: string | null;
          adset_id?: string | null;
          call_duration?: number | null;
          called_number?: string | null;
          campaign_id?: string | null;
          channel: string;
          chatwoot_url?: string | null;
          click_event?: string | null;
          created_at?: string;
          external_id: string;
          ga4_enriched?: boolean;
          ga4_enriched_at?: string | null;
          ga4_fetch_attempts?: number;
          ga4_session_id?: string | null;
          id?: string;
          is_organic?: boolean | null;
          landing_page?: string | null;
          lead_uuid: string;
          normalization_failed?: boolean;
          path_lost_at: string;
          placement?: string | null;
          ref_code?: string | null;
          referral_domain?: string | null;
          session_duration?: number | null;
          session_start?: string | null;
          source_confidence: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          ad_id?: string | null;
          adset_id?: string | null;
          call_duration?: number | null;
          called_number?: string | null;
          campaign_id?: string | null;
          channel?: string;
          chatwoot_url?: string | null;
          click_event?: string | null;
          created_at?: string;
          external_id?: string;
          ga4_enriched?: boolean;
          ga4_enriched_at?: string | null;
          ga4_fetch_attempts?: number;
          ga4_session_id?: string | null;
          id?: string;
          is_organic?: boolean | null;
          landing_page?: string | null;
          lead_uuid?: string;
          normalization_failed?: boolean;
          path_lost_at?: string;
          placement?: string | null;
          ref_code?: string | null;
          referral_domain?: string | null;
          session_duration?: number | null;
          session_start?: string | null;
          source_confidence?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'collected_data_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: true;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
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
          created_at: string;
          display_label: string;
          id: string;
          is_active: boolean;
          last_lead_at: string | null;
          lead_count: number;
          source: string;
          updated_at: string;
          virtual_number: string;
        };
        Insert: {
          created_at?: string;
          display_label: string;
          id?: string;
          is_active?: boolean;
          last_lead_at?: string | null;
          lead_count?: number;
          source: string;
          updated_at?: string;
          virtual_number: string;
        };
        Update: {
          created_at?: string;
          display_label?: string;
          id?: string;
          is_active?: boolean;
          last_lead_at?: string | null;
          lead_count?: number;
          source?: string;
          updated_at?: string;
          virtual_number?: string;
        };
        Relationships: [];
      };
      finance_audit: {
        Row: {
          actor_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string;
          field: string;
          id: string;
          new_value: string | null;
          old_value: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id: string;
          field: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string;
          field?: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
        };
        Relationships: [];
      };
      lead_details: {
        Row: {
          actual_move_in_date: string | null;
          budget_max: number | null;
          budget_tier: string | null;
          campus: string | null;
          created_at: string;
          district_preference: string | null;
          dorm_awaiting: string[];
          interested_hotel: string[];
          interested_property_ids: string[];
          kvkk_opt_in: boolean | null;
          lead_uuid: string;
          marketing_opt_in: boolean | null;
          move_in: string | null;
          nationality: string | null;
          parent_name: string | null;
          placement_note: string | null;
          preferred_district: string | null;
          purchased_room: string | null;
          rec_hotel: Json | null;
          room_category: string | null;
          room_type: string[];
          school_shortname: string | null;
          student_gender: string | null;
          uni_year: string | null;
          university: string | null;
          updated_at: string;
        };
        Insert: {
          actual_move_in_date?: string | null;
          budget_max?: number | null;
          budget_tier?: string | null;
          campus?: string | null;
          created_at?: string;
          district_preference?: string | null;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          interested_property_ids?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          placement_note?: string | null;
          preferred_district?: string | null;
          purchased_room?: string | null;
          rec_hotel?: Json | null;
          room_category?: string | null;
          room_type?: string[];
          school_shortname?: string | null;
          student_gender?: string | null;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          actual_move_in_date?: string | null;
          budget_max?: number | null;
          budget_tier?: string | null;
          campus?: string | null;
          created_at?: string;
          district_preference?: string | null;
          dorm_awaiting?: string[];
          interested_hotel?: string[];
          interested_property_ids?: string[];
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: string | null;
          parent_name?: string | null;
          placement_note?: string | null;
          preferred_district?: string | null;
          purchased_room?: string | null;
          rec_hotel?: Json | null;
          room_category?: string | null;
          room_type?: string[];
          school_shortname?: string | null;
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
          {
            foreignKeyName: 'lead_details_purchased_room_fkey';
            columns: ['purchased_room'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_finance: {
        Row: {
          created_at: string;
          deal_duration: number;
          discount: number;
          id: string;
          lead_id: string;
          monthly_payment: number;
          move_in_month: string | null;
          purchased_room: string;
          vacated_at: string | null;
        };
        Insert: {
          created_at?: string;
          deal_duration?: number;
          discount?: number;
          id?: string;
          lead_id: string;
          monthly_payment: number;
          move_in_month?: string | null;
          purchased_room: string;
          vacated_at?: string | null;
        };
        Update: {
          created_at?: string;
          deal_duration?: number;
          discount?: number;
          id?: string;
          lead_id?: string;
          monthly_payment?: number;
          move_in_month?: string | null;
          purchased_room?: string;
          vacated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_finance_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_finance_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_finance_purchased_room_fkey';
            columns: ['purchased_room'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_messages: {
        Row: {
          chatwoot_conversation_id: number;
          chatwoot_message_id: number;
          content: string | null;
          created_at: string;
          direction: string | null;
          id: string;
          is_private: boolean;
          lead_uuid: string;
          message_type: string;
          notified_at: string | null;
          sender_agent_id: string | null;
          sender_id: number | null;
          sender_name: string | null;
          sender_type: string | null;
          synced_at: string;
        };
        Insert: {
          chatwoot_conversation_id: number;
          chatwoot_message_id: number;
          content?: string | null;
          created_at: string;
          direction?: string | null;
          id?: string;
          is_private?: boolean;
          lead_uuid: string;
          message_type: string;
          notified_at?: string | null;
          sender_agent_id?: string | null;
          sender_id?: number | null;
          sender_name?: string | null;
          sender_type?: string | null;
          synced_at?: string;
        };
        Update: {
          chatwoot_conversation_id?: number;
          chatwoot_message_id?: number;
          content?: string | null;
          created_at?: string;
          direction?: string | null;
          id?: string;
          is_private?: boolean;
          lead_uuid?: string;
          message_type?: string;
          notified_at?: string | null;
          sender_agent_id?: string | null;
          sender_id?: number | null;
          sender_name?: string | null;
          sender_type?: string | null;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_messages_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_messages_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      lead_pins: {
        Row: {
          agent_id: string;
          created_at: string;
          lead_uuid: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          lead_uuid: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          lead_uuid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_pins_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'lead_pins_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_pins_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_pins_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      lead_rooms: {
        Row: {
          created_at: string;
          id: string;
          lead_id: string;
          placed_at: string;
          placed_by: string | null;
          room_id: string;
          vacate_reason: string | null;
          vacated_at: string | null;
          vacated_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lead_id: string;
          placed_at?: string;
          placed_by?: string | null;
          room_id: string;
          vacate_reason?: string | null;
          vacated_at?: string | null;
          vacated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          lead_id?: string;
          placed_at?: string;
          placed_by?: string | null;
          room_id?: string;
          vacate_reason?: string | null;
          vacated_at?: string | null;
          vacated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_rooms_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_rooms_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_rooms_placed_by_fkey';
            columns: ['placed_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'lead_rooms_placed_by_fkey';
            columns: ['placed_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_rooms_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_rooms_vacated_by_fkey';
            columns: ['vacated_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'lead_rooms_vacated_by_fkey';
            columns: ['vacated_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_stage_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          from_status: string | null;
          id: string;
          lead_uuid: string;
          source: string;
          to_status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?: string | null;
          id?: string;
          lead_uuid: string;
          source: string;
          to_status: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?: string | null;
          id?: string;
          lead_uuid?: string;
          source?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_stage_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'lead_stage_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_stage_history_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_stage_history_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
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
          auto_logged_name: string | null;
          chatwoot_contact_id: number | null;
          chatwoot_conversation_id: number | null;
          claimed_at: string | null;
          created_at: string;
          deal_awaiting: boolean;
          deleted_at: string | null;
          display_name: string | null;
          funnel_status: string;
          funnel_status_before_lost: string | null;
          has_moved_in: boolean;
          is_24h_restricted: boolean;
          is_archived: boolean;
          is_deleted: boolean;
          is_organic: boolean | null;
          label_sync_source: string | null;
          label_synced_at: string | null;
          language: string;
          last_contact_at: string | null;
          last_inbound_message_at: string | null;
          lead_name: string | null;
          lead_phone: string;
          lead_score: number;
          lead_source: string;
          loss_reason: string | null;
          message_from: string | null;
          move_in_date_set: boolean;
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
          auto_logged_name?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          claimed_at?: string | null;
          created_at?: string;
          deal_awaiting?: boolean;
          deleted_at?: string | null;
          display_name?: string | null;
          funnel_status?: string;
          funnel_status_before_lost?: string | null;
          has_moved_in?: boolean;
          is_24h_restricted?: boolean;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          last_inbound_message_at?: string | null;
          lead_name?: string | null;
          lead_phone: string;
          lead_score?: number;
          lead_source: string;
          loss_reason?: string | null;
          message_from?: string | null;
          move_in_date_set?: boolean;
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
          auto_logged_name?: string | null;
          chatwoot_contact_id?: number | null;
          chatwoot_conversation_id?: number | null;
          claimed_at?: string | null;
          created_at?: string;
          deal_awaiting?: boolean;
          deleted_at?: string | null;
          display_name?: string | null;
          funnel_status?: string;
          funnel_status_before_lost?: string | null;
          has_moved_in?: boolean;
          is_24h_restricted?: boolean;
          is_archived?: boolean;
          is_deleted?: boolean;
          is_organic?: boolean | null;
          label_sync_source?: string | null;
          label_synced_at?: string | null;
          language?: string;
          last_contact_at?: string | null;
          last_inbound_message_at?: string | null;
          lead_name?: string | null;
          lead_phone?: string;
          lead_score?: number;
          lead_source?: string;
          loss_reason?: string | null;
          message_from?: string | null;
          move_in_date_set?: boolean;
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
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'old_leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
        ];
      };
      partners: {
        Row: {
          commission_percentage: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          commission_percentage?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          commission_percentage?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      pending_notifications: {
        Row: {
          conversation_id: number | null;
          created_at: string;
          flushed_at: string | null;
          id: string;
          is_unclaimed: boolean;
          lead_id: string;
          lead_name: string;
          message_snippet: string;
          recipient_chat_ids: string[];
        };
        Insert: {
          conversation_id?: number | null;
          created_at?: string;
          flushed_at?: string | null;
          id?: string;
          is_unclaimed?: boolean;
          lead_id: string;
          lead_name: string;
          message_snippet: string;
          recipient_chat_ids: string[];
        };
        Update: {
          conversation_id?: number | null;
          created_at?: string;
          flushed_at?: string | null;
          id?: string;
          is_unclaimed?: boolean;
          lead_id?: string;
          lead_name?: string;
          message_snippet?: string;
          recipient_chat_ids?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'pending_notifications_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'pending_notifications_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
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
          is_available: boolean;
          partner_id: string | null;
          serviced_gender: string | null;
          serviced_schools: string[];
          status: string;
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
          is_available?: boolean;
          partner_id?: string | null;
          serviced_gender?: string | null;
          serviced_schools?: string[];
          status?: string;
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
          is_available?: boolean;
          partner_id?: string | null;
          serviced_gender?: string | null;
          serviced_schools?: string[];
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partners';
            referencedColumns: ['id'];
          },
        ];
      };
      property_room_types: {
        Row: {
          amenities: Json;
          created_at: string;
          has_balcony: boolean;
          has_kitchen: boolean;
          has_laundry: boolean;
          housing_type: string;
          id: string;
          is_available: boolean;
          is_duplex: boolean;
          occupant_count: number;
          property_id: string;
          room_category: string;
          room_count: number;
          room_name: string;
          room_price: number;
          room_size: string | null;
          updated_at: string;
        };
        Insert: {
          amenities?: Json;
          created_at?: string;
          has_balcony?: boolean;
          has_kitchen?: boolean;
          has_laundry?: boolean;
          housing_type: string;
          id?: string;
          is_available?: boolean;
          is_duplex?: boolean;
          occupant_count: number;
          property_id: string;
          room_category: string;
          room_count: number;
          room_name: string;
          room_price: number;
          room_size?: string | null;
          updated_at?: string;
        };
        Update: {
          amenities?: Json;
          created_at?: string;
          has_balcony?: boolean;
          has_kitchen?: boolean;
          has_laundry?: boolean;
          housing_type?: string;
          id?: string;
          is_available?: boolean;
          is_duplex?: boolean;
          occupant_count?: number;
          property_id?: string;
          room_category?: string;
          room_count?: number;
          room_name?: string;
          room_price?: number;
          room_size?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_room_types_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      property_rooms: {
        Row: {
          created_at: string;
          current_occupants: number;
          id: string;
          is_available: boolean;
          room_floor: number;
          room_number: string;
          room_type_id: string;
          serviced_gender: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_occupants?: number;
          id?: string;
          is_available?: boolean;
          room_floor: number;
          room_number: string;
          room_type_id: string;
          serviced_gender?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_occupants?: number;
          id?: string;
          is_available?: boolean;
          room_floor?: number;
          room_number?: string;
          room_type_id?: string;
          serviced_gender?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'property_room_types';
            referencedColumns: ['id'];
          },
        ];
      };
      recent_searches: {
        Row: {
          agent_id: string;
          lead_uuid: string;
          searched_at: string;
        };
        Insert: {
          agent_id: string;
          lead_uuid: string;
          searched_at?: string;
        };
        Update: {
          agent_id?: string;
          lead_uuid?: string;
          searched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recent_searches_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'recent_searches_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recent_searches_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'recent_searches_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
        ];
      };
      ref_sessions: {
        Row: {
          created_at: string;
          landing_page: string | null;
          ref_code: string;
          referral_domain: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          created_at?: string;
          landing_page?: string | null;
          ref_code: string;
          referral_domain?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          created_at?: string;
          landing_page?: string | null;
          ref_code?: string;
          referral_domain?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [];
      };
      room_type_prices: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          price: number;
          room_type_id: string;
          valid_from_month: string;
          valid_until_month: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          price: number;
          room_type_id: string;
          valid_from_month: string;
          valid_until_month?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          price?: number;
          room_type_id?: string;
          valid_from_month?: string;
          valid_until_month?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_type_prices_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
      room_types: {
        Row: {
          capacity: number;
          created_at: string;
          default_price: number | null;
          hotel_id: string;
          id: string;
          is_active: boolean;
          name: string;
          size_m2: number | null;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          default_price?: number | null;
          hotel_id: string;
          id: string;
          is_active?: boolean;
          name: string;
          size_m2?: number | null;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          default_price?: number | null;
          hotel_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          size_m2?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_types_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms: {
        Row: {
          created_at: string;
          floor: number;
          id: string;
          property_id: string;
          room_number: string;
          room_position: Database['public']['Enums']['room_position'] | null;
          room_type_id: string;
          size: number | null;
        };
        Insert: {
          created_at?: string;
          floor: number;
          id?: string;
          property_id: string;
          room_number: string;
          room_position?: Database['public']['Enums']['room_position'] | null;
          room_type_id: string;
          size?: number | null;
        };
        Update: {
          created_at?: string;
          floor?: number;
          id?: string;
          property_id?: string;
          room_number?: string;
          room_position?: Database['public']['Enums']['room_position'] | null;
          room_type_id?: string;
          size?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
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
          home_property_id: string | null;
          id: string;
          is_active: boolean;
          languages: string[];
          last_login_at: string | null;
          lead_count: number;
          max_active_leads: number;
          partner_id: string | null;
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
          home_property_id?: string | null;
          id?: string;
          is_active?: boolean;
          languages?: string[];
          last_login_at?: string | null;
          lead_count?: number;
          max_active_leads?: number;
          partner_id?: string | null;
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
          home_property_id?: string | null;
          id?: string;
          is_active?: boolean;
          languages?: string[];
          last_login_at?: string | null;
          lead_count?: number;
          max_active_leads?: number;
          partner_id?: string | null;
          phone?: string | null;
          role?: string;
          shift_end?: string;
          shift_start?: string;
          telegram_chat_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'salespeople_home_property_id_fkey';
            columns: ['home_property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salespeople_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partners';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string;
          auto_task_type: string | null;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          due_when: string;
          id: string;
          is_auto_created: boolean;
          is_cancelled: boolean;
          is_completed: boolean;
          is_late: boolean;
          lead_uuid: string;
          notes: string | null;
          task_type: string;
        };
        Insert: {
          assigned_to: string;
          auto_task_type?: string | null;
          cancel_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          due_when: string;
          id?: string;
          is_auto_created?: boolean;
          is_cancelled?: boolean;
          is_completed?: boolean;
          is_late?: boolean;
          lead_uuid: string;
          notes?: string | null;
          task_type: string;
        };
        Update: {
          assigned_to?: string;
          auto_task_type?: string | null;
          cancel_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          due_when?: string;
          id?: string;
          is_auto_created?: boolean;
          is_cancelled?: boolean;
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
      universities: {
        Row: {
          city: string;
          country: string;
          created_at: string;
          district: string | null;
          id: string;
          is_active: boolean;
          uni_name: string;
          uni_shortname: string;
          updated_at: string;
          yok_code: string | null;
        };
        Insert: {
          city?: string;
          country?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_active?: boolean;
          uni_name: string;
          uni_shortname: string;
          updated_at?: string;
          yok_code?: string | null;
        };
        Update: {
          city?: string;
          country?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_active?: boolean;
          uni_name?: string;
          uni_shortname?: string;
          updated_at?: string;
          yok_code?: string | null;
        };
        Relationships: [];
      };
      visits: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          lead_uuid: string;
          notes: string | null;
          property_id: string;
          scheduled_date: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_uuid: string;
          notes?: string | null;
          property_id: string;
          scheduled_date: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_uuid?: string;
          notes?: string | null;
          property_id?: string;
          scheduled_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visits_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'mv_agent_performance';
            referencedColumns: ['salesperson_id'];
          },
          {
            foreignKeyName: 'visits_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'salespeople';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'visits_lead_uuid_fkey';
            columns: ['lead_uuid'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'visits_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
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
          reason_code: string | null;
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
          reason_code?: string | null;
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
          reason_code?: string | null;
          retry_count?: number;
          source?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      active_finance: {
        Row: {
          created_at: string | null;
          deal_duration: number | null;
          discount: number | null;
          effective_monthly: number | null;
          id: string | null;
          lead_id: string | null;
          lead_revenue: number | null;
          monthly_payment: number | null;
          move_in_month: string | null;
          purchased_room: string | null;
        };
        Insert: {
          created_at?: string | null;
          deal_duration?: number | null;
          discount?: number | null;
          effective_monthly?: never;
          id?: string | null;
          lead_id?: string | null;
          lead_revenue?: never;
          monthly_payment?: number | null;
          move_in_month?: string | null;
          purchased_room?: string | null;
        };
        Update: {
          created_at?: string | null;
          deal_duration?: number | null;
          discount?: number | null;
          effective_monthly?: never;
          id?: string | null;
          lead_id?: string | null;
          lead_revenue?: never;
          monthly_payment?: number | null;
          move_in_month?: string | null;
          purchased_room?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_finance_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'active_leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_finance_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['uuid'];
          },
          {
            foreignKeyName: 'lead_finance_purchased_room_fkey';
            columns: ['purchased_room'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
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
          budget_tier: string | null;
          campus: string | null;
          created_at: string | null;
          district_preference: string | null;
          dorm_awaiting: string[] | null;
          interested_hotel: string[] | null;
          kvkk_opt_in: boolean | null;
          lead_uuid: string | null;
          marketing_opt_in: boolean | null;
          move_in: string | null;
          nationality: string | null;
          parent_name: string | null;
          preferred_district: string | null;
          rec_hotel: Json | null;
          room_category: string | null;
          room_type: string[] | null;
          school_shortname: string | null;
          student_gender: string | null;
          uni_year: string | null;
          university: string | null;
          updated_at: string | null;
        };
        Insert: {
          budget_max?: number | null;
          budget_tier?: string | null;
          campus?: string | null;
          created_at?: string | null;
          district_preference?: string | null;
          dorm_awaiting?: string[] | null;
          interested_hotel?: string[] | null;
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string | null;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: never;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: Json | null;
          room_category?: string | null;
          room_type?: string[] | null;
          school_shortname?: string | null;
          student_gender?: never;
          uni_year?: string | null;
          university?: string | null;
          updated_at?: string | null;
        };
        Update: {
          budget_max?: number | null;
          budget_tier?: string | null;
          campus?: string | null;
          created_at?: string | null;
          district_preference?: string | null;
          dorm_awaiting?: string[] | null;
          interested_hotel?: string[] | null;
          kvkk_opt_in?: boolean | null;
          lead_uuid?: string | null;
          marketing_opt_in?: boolean | null;
          move_in?: string | null;
          nationality?: never;
          parent_name?: string | null;
          preferred_district?: string | null;
          rec_hotel?: Json | null;
          room_category?: string | null;
          room_type?: string[] | null;
          school_shortname?: string | null;
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
      current_partner_id: { Args: never; Returns: string };
      decrement_active_lead_count: {
        Args: { agent_id: string };
        Returns: undefined;
      };
      fms_create_finance_row: {
        Args: {
          p_actor_id: string;
          p_deal_duration: number;
          p_discount: number;
          p_lead_id: string;
          p_move_in_month: string;
          p_purchased_room: string;
        };
        Returns: string;
      };
      fms_price_for_month: {
        Args: { p_move_in_month: string; p_room_type_id: string };
        Returns: number;
      };
      fms_property_roomtype_breakdown: {
        Args: { p_include_kapora?: boolean; p_property_id: string };
        Returns: {
          customer_count: number;
          room_type_id: string;
          room_type_name: string;
          room_type_revenue: number;
        }[];
      };
      fms_record_finance_change: {
        Args: {
          p_actor_id: string;
          p_deal_duration: number;
          p_discount: number;
          p_lead_id: string;
          p_move_in_month: string;
          p_purchased_room: string;
        };
        Returns: string;
      };
      fms_revenue_breakdown: {
        Args: { p_include_kapora?: boolean };
        Returns: {
          customer_count: number;
          partner_id: string;
          partner_name: string;
          property_id: string;
          property_name: string;
          property_revenue: number;
        }[];
      };
      fn_finance_actor: { Args: never; Returns: string };
      get_cron_setting: { Args: { p_key: string }; Returns: string };
      get_loss_reason_breakdown: {
        Args: { date_from: string; date_to: string; p_agent_id?: string };
        Returns: {
          cnt: number;
          loss_reason: string;
          salesperson_id: string;
        }[];
      };
      get_team_panel_metrics: {
        Args: { date_from: string; date_to: string };
        Returns: {
          active_lead_count: number;
          answered_call_count: number;
          call_count: number;
          conv_downpayment_to_signed: number;
          conv_visit_to_downpayment: number;
          conv_yeni_to_downpayment: number;
          conv_yeni_to_signed: number;
          downpayment_count: number;
          full_name: string;
          message_count: number;
          outbound_connect_rate: number;
          salesperson_id: string;
          scheduled_visit_count: number;
          signed_count: number;
          stale_at_yeni_count: number;
        }[];
      };
      get_user_role: { Args: never; Returns: string };
      increment_active_lead_count: {
        Args: { agent_id: string };
        Returns: undefined;
      };
      is_manager_or_superadmin: { Args: never; Returns: boolean };
      is_partner_operator: { Args: never; Returns: boolean };
      is_pms_writer: { Args: never; Returns: boolean };
      is_superadmin: { Args: never; Returns: boolean };
      lead_partner_owner: { Args: { p_lead_uuid: string }; Returns: string };
      property_belongs_to_current_partner: {
        Args: { p_property_id: string };
        Returns: boolean;
      };
      search_archived_leads_ids: {
        Args: { search_term: string };
        Returns: {
          lead_uuid: string;
        }[];
      };
      search_leads_global: {
        Args: { q: string; result_limit?: number };
        Returns: {
          assigned_to: string;
          assignee_name: string;
          display_name: string;
          funnel_status: string;
          is_inactive: boolean;
          last_contact_at: string;
          lead_name: string;
          lead_phone: string;
          message_from: string;
          uuid: string;
        }[];
      };
      search_leads_ids: {
        Args: { search_term: string };
        Returns: {
          lead_uuid: string;
        }[];
      };
      search_old_leads_ids: {
        Args: { search_term: string };
        Returns: {
          lead_uuid: string;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      unaccent: { Args: { '': string }; Returns: string };
      unarchive_single_lead: {
        Args: { manager_uuid?: string; target_uuid: string };
        Returns: undefined;
      };
      validate_dorm_awaiting: { Args: { arr: string[] }; Returns: boolean };
    };
    Enums: {
      room_position: 'corner' | 'middle';
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
    Enums: {
      room_position: ['corner', 'middle'],
    },
  },
} as const;
