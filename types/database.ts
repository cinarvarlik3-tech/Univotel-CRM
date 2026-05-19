export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contact_history: {
        Row: {
          created_at: string
          funnel_status_at_time: string | null
          id: string
          interaction_source: string | null
          interaction_type: string
          lead_uuid: string
          metadata: Json
          notes: string | null
          previous_status: string | null
          salesperson_id: string | null
          status_changed: boolean
        }
        Insert: {
          created_at?: string
          funnel_status_at_time?: string | null
          id?: string
          interaction_source?: string | null
          interaction_type: string
          lead_uuid: string
          metadata?: Json
          notes?: string | null
          previous_status?: string | null
          salesperson_id?: string | null
          status_changed?: boolean
        }
        Update: {
          created_at?: string
          funnel_status_at_time?: string | null
          id?: string
          interaction_source?: string | null
          interaction_type?: string
          lead_uuid?: string
          metadata?: Json
          notes?: string | null
          previous_status?: string | null
          salesperson_id?: string | null
          status_changed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contact_history_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: false
            referencedRelation: "active_leads"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "contact_history_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "contact_history_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "mv_agent_performance"
            referencedColumns: ["salesperson_id"]
          },
          {
            foreignKeyName: "contact_history_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_details: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          dorm_awaiting: string[]
          interested_hotel: string[]
          kvkk_opt_in: boolean | null
          lead_uuid: string
          marketing_opt_in: boolean | null
          move_in: string | null
          nationality: string | null
          parent_name: string | null
          preferred_district: string | null
          rec_hotel: string | null
          room_type: string[]
          student_gender: string | null
          uni_year: string | null
          university: string | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          dorm_awaiting?: string[]
          interested_hotel?: string[]
          kvkk_opt_in?: boolean | null
          lead_uuid: string
          marketing_opt_in?: boolean | null
          move_in?: string | null
          nationality?: string | null
          parent_name?: string | null
          preferred_district?: string | null
          rec_hotel?: string | null
          room_type?: string[]
          student_gender?: string | null
          uni_year?: string | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          dorm_awaiting?: string[]
          interested_hotel?: string[]
          kvkk_opt_in?: boolean | null
          lead_uuid?: string
          marketing_opt_in?: boolean | null
          move_in?: string | null
          nationality?: string | null
          parent_name?: string | null
          preferred_district?: string | null
          rec_hotel?: string | null
          room_type?: string[]
          student_gender?: string | null
          uni_year?: string | null
          university?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_details_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: true
            referencedRelation: "active_leads"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "lead_details_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["uuid"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          funnel_status: string
          is_deleted: boolean
          is_organic: boolean | null
          language: string
          last_contact_at: string | null
          lead_name: string | null
          lead_phone: string
          lead_score: number
          lead_source: string
          loss_reason: string | null
          message_from: string | null
          notes: string | null
          parent_phone: string | null
          persona_type: string | null
          sla_breach_alerted_at: string | null
          sla_deadline: string | null
          sla_status: string
          source_details: Json
          special_state: string | null
          student_stage: string
          updated_at: string
          uuid: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          funnel_status?: string
          is_deleted?: boolean
          is_organic?: boolean | null
          language?: string
          last_contact_at?: string | null
          lead_name?: string | null
          lead_phone: string
          lead_score?: number
          lead_source: string
          loss_reason?: string | null
          message_from?: string | null
          notes?: string | null
          parent_phone?: string | null
          persona_type?: string | null
          sla_breach_alerted_at?: string | null
          sla_deadline?: string | null
          sla_status?: string
          source_details?: Json
          special_state?: string | null
          student_stage?: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          funnel_status?: string
          is_deleted?: boolean
          is_organic?: boolean | null
          language?: string
          last_contact_at?: string | null
          lead_name?: string | null
          lead_phone?: string
          lead_score?: number
          lead_source?: string
          loss_reason?: string | null
          message_from?: string | null
          notes?: string | null
          parent_phone?: string | null
          persona_type?: string | null
          sla_breach_alerted_at?: string | null
          sla_deadline?: string | null
          sla_status?: string
          source_details?: Json
          special_state?: string | null
          student_stage?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_agent_performance"
            referencedColumns: ["salesperson_id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          accepts_non_students: boolean
          address: string | null
          created_at: string
          district: string | null
          google_sheet_id: string | null
          hotel_name: string
          id: string
          serviced_gender: string | null
          serviced_schools: string[]
          status: string
          total_beds: number | null
          updated_at: string
        }
        Insert: {
          accepts_non_students?: boolean
          address?: string | null
          created_at?: string
          district?: string | null
          google_sheet_id?: string | null
          hotel_name: string
          id?: string
          serviced_gender?: string | null
          serviced_schools?: string[]
          status?: string
          total_beds?: number | null
          updated_at?: string
        }
        Update: {
          accepts_non_students?: boolean
          address?: string | null
          created_at?: string
          district?: string | null
          google_sheet_id?: string | null
          hotel_name?: string
          id?: string
          serviced_gender?: string | null
          serviced_schools?: string[]
          status?: string
          total_beds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      salespeople: {
        Row: {
          active_lead_count: number
          assigned_hotels: string[]
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          languages: string[]
          last_login_at: string | null
          lead_count: number
          max_active_leads: number
          phone: string | null
          role: string
          shift_end: string
          shift_start: string
          telegram_chat_id: string | null
        }
        Insert: {
          active_lead_count?: number
          assigned_hotels?: string[]
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          languages?: string[]
          last_login_at?: string | null
          lead_count?: number
          max_active_leads?: number
          phone?: string | null
          role: string
          shift_end?: string
          shift_start?: string
          telegram_chat_id?: string | null
        }
        Update: {
          active_lead_count?: number
          assigned_hotels?: string[]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          languages?: string[]
          last_login_at?: string | null
          lead_count?: number
          max_active_leads?: number
          phone?: string | null
          role?: string
          shift_end?: string
          shift_start?: string
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string
          due_when: string
          id: string
          is_completed: boolean
          is_late: boolean
          lead_uuid: string
          notes: string | null
          task_type: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_when: string
          id?: string
          is_completed?: boolean
          is_late?: boolean
          lead_uuid: string
          notes?: string | null
          task_type: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_when?: string
          id?: string
          is_completed?: boolean
          is_late?: boolean
          lead_uuid?: string
          notes?: string | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_agent_performance"
            referencedColumns: ["salesperson_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: false
            referencedRelation: "active_leads"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "tasks_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["uuid"]
          },
        ]
      }
    }
    Views: {
      active_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          deleted_at: string | null
          funnel_status: string | null
          is_deleted: boolean | null
          is_organic: boolean | null
          language: string | null
          last_contact_at: string | null
          lead_name: string | null
          lead_phone: string | null
          lead_score: number | null
          lead_source: string | null
          loss_reason: string | null
          message_from: string | null
          notes: string | null
          parent_phone: string | null
          persona_type: string | null
          sla_breach_alerted_at: string | null
          sla_deadline: string | null
          sla_status: string | null
          source_details: Json | null
          special_state: string | null
          student_stage: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          funnel_status?: string | null
          is_deleted?: boolean | null
          is_organic?: boolean | null
          language?: string | null
          last_contact_at?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_score?: number | null
          lead_source?: string | null
          loss_reason?: string | null
          message_from?: string | null
          notes?: string | null
          parent_phone?: string | null
          persona_type?: string | null
          sla_breach_alerted_at?: string | null
          sla_deadline?: string | null
          sla_status?: string | null
          source_details?: Json | null
          special_state?: string | null
          student_stage?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          funnel_status?: string | null
          is_deleted?: boolean | null
          is_organic?: boolean | null
          language?: string | null
          last_contact_at?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_score?: number | null
          lead_source?: string | null
          loss_reason?: string | null
          message_from?: string | null
          notes?: string | null
          parent_phone?: string | null
          persona_type?: string | null
          sla_breach_alerted_at?: string | null
          sla_deadline?: string | null
          sla_status?: string | null
          source_details?: Json | null
          special_state?: string | null
          student_stage?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_agent_performance"
            referencedColumns: ["salesperson_id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_details_safe: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          dorm_awaiting: string[] | null
          interested_hotel: string[] | null
          kvkk_opt_in: boolean | null
          lead_uuid: string | null
          marketing_opt_in: boolean | null
          move_in: string | null
          nationality: string | null
          parent_name: string | null
          preferred_district: string | null
          rec_hotel: string | null
          room_type: string[] | null
          student_gender: string | null
          uni_year: string | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          dorm_awaiting?: string[] | null
          interested_hotel?: string[] | null
          kvkk_opt_in?: boolean | null
          lead_uuid?: string | null
          marketing_opt_in?: boolean | null
          move_in?: string | null
          nationality?: never
          parent_name?: string | null
          preferred_district?: string | null
          rec_hotel?: string | null
          room_type?: string[] | null
          student_gender?: never
          uni_year?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          dorm_awaiting?: string[] | null
          interested_hotel?: string[] | null
          kvkk_opt_in?: boolean | null
          lead_uuid?: string | null
          marketing_opt_in?: boolean | null
          move_in?: string | null
          nationality?: never
          parent_name?: string | null
          preferred_district?: string | null
          rec_hotel?: string | null
          room_type?: string[] | null
          student_gender?: never
          uni_year?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_details_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: true
            referencedRelation: "active_leads"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "lead_details_lead_uuid_fkey"
            columns: ["lead_uuid"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["uuid"]
          },
        ]
      }
      mv_agent_performance: {
        Row: {
          assigned_count: number | null
          avg_response_minutes: number | null
          full_name: string | null
          salesperson_id: string | null
          won_count: number | null
        }
        Relationships: []
      }
      mv_funnel_distribution: {
        Row: {
          funnel_status: string | null
          lead_count: number | null
        }
        Relationships: []
      }
      mv_leads_by_source: {
        Row: {
          conversion_rate: number | null
          lead_count: number | null
          lead_source: string | null
          won_count: number | null
        }
        Relationships: []
      }
      mv_sla_breach_rate: {
        Row: {
          breach_count: number | null
          breach_rate: number | null
          lead_source: string | null
          total_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
      increment_active_lead_count: {
        Args: { agent_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_dorm_awaiting: { Args: { arr: string[] }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
