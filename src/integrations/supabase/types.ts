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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      crawl_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          signals_created: number | null
          sources_count: number | null
          started_at: string
          status: string | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          signals_created?: number | null
          sources_count?: number | null
          started_at?: string
          status?: string | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          signals_created?: number | null
          sources_count?: number | null
          started_at?: string
          status?: string | null
        }
        Relationships: []
      }
      geo_checks: {
        Row: {
          brand: string
          created_at: string
          id: string
          overall: number
          results: Json
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          overall?: number
          results: Json
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          overall?: number
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          features_ar: string[]
          features_en: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          name_ar: string
          name_en: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          currency?: string
          features_ar?: string[]
          features_en?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_ar: string
          name_en: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          currency?: string
          features_ar?: string[]
          features_en?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_ar?: string
          name_en?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_seen_at: string | null
          plan_slug: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_seen_at?: string | null
          plan_slug?: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          plan_slug?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          category: string | null
          created_at: string
          event_date: string | null
          id: string
          kind: string
          lead_time_hours: number
          map_url: string | null
          momentum: string
          pulse_score: number
          region: string
          register_url: string | null
          source_id: string | null
          source_name: string | null
          source_url: string | null
          status: string
          summary: string | null
          title: string
          why_rising: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          kind?: string
          lead_time_hours?: number
          map_url?: string | null
          momentum?: string
          pulse_score?: number
          region?: string
          register_url?: string | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          title: string
          why_rising?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          kind?: string
          lead_time_hours?: number
          map_url?: string | null
          momentum?: string
          pulse_score?: number
          region?: string
          register_url?: string | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          title?: string
          why_rising?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          last_crawled_at: string | null
          last_status: string | null
          name: string
          region: string
          trust_score: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_crawled_at?: string | null
          last_status?: string | null
          name: string
          region?: string
          trust_score?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_crawled_at?: string | null
          last_status?: string | null
          name?: string
          region?: string
          trust_score?: number
          url?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          meta: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          meta?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          meta?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_full: { Args: { _user_id: string }; Returns: boolean }
      get_teaser_signals: {
        Args: { _region?: string }
        Returns: {
          category: string
          created_at: string
          id: string
          kind: string
          momentum: string
          pulse_score: number
          region: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "editor" | "subscriber" | "guest"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "editor", "subscriber", "guest"],
    },
  },
} as const
