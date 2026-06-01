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
      download_events: {
        Row: {
          created_at: string
          game_id: string
          game_title: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          game_title?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          game_title?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_reviews: {
        Row: {
          created_at: string
          game_id: string
          id: string
          rating: number
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          rating: number
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          rating?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          developer: string | null
          download_url: string | null
          featured: boolean
          genre: string | null
          id: string
          image_url: string | null
          is_free: boolean
          min_cpu: string | null
          min_gpu: string | null
          min_os: string | null
          min_ram: string | null
          min_storage: string | null
          mode: string
          price: number
          publisher: string | null
          release_date: string | null
          screenshots: string[]
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          developer?: string | null
          download_url?: string | null
          featured?: boolean
          genre?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          min_cpu?: string | null
          min_gpu?: string | null
          min_os?: string | null
          min_ram?: string | null
          min_storage?: string | null
          mode?: string
          price?: number
          publisher?: string | null
          release_date?: string | null
          screenshots?: string[]
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          developer?: string | null
          download_url?: string | null
          featured?: boolean
          genre?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          min_cpu?: string | null
          min_gpu?: string | null
          min_os?: string | null
          min_ram?: string | null
          min_storage?: string | null
          mode?: string
          price?: number
          publisher?: string | null
          release_date?: string | null
          screenshots?: string[]
          title?: string
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_streaks: {
        Row: {
          current_streak: number
          last_milestone_shown: number
          last_visit_date: string
          total_visits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_milestone_shown?: number
          last_visit_date?: string
          total_visits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_milestone_shown?: number
          last_visit_date?: string
          total_visits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone_e164: string | null
          phone_verified: boolean
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          created_at: string
          error: string | null
          game_id: string | null
          game_title: string
          id: string
          phone_e164: string
          send_at: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          game_id?: string | null
          game_title: string
          id?: string
          phone_e164: string
          send_at: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          game_id?: string | null
          game_title?: string
          id?: string
          phone_e164?: string
          send_at?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_library: {
        Row: {
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_library_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
