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
      appointments: {
        Row: {
          address: string | null
          appointment_date: string
          appointment_time: string | null
          completed: boolean
          created_at: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          appointment_date: string
          appointment_time?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          appointment_date?: string
          appointment_time?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_favorite: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_focus: {
        Row: {
          created_at: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          cap1_available: number
          cap1_owed: number
          cash_balance: number
          chase_balance: number
          created_at: string
          id: string
          snap_balance: number
          snapshot_date: string
          user_id: string
        }
        Insert: {
          cap1_available: number
          cap1_owed: number
          cash_balance: number
          chase_balance: number
          created_at?: string
          id?: string
          snap_balance: number
          snapshot_date?: string
          user_id: string
        }
        Update: {
          cap1_available?: number
          cap1_owed?: number
          cash_balance?: number
          chase_balance?: number
          created_at?: string
          id?: string
          snap_balance?: number
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          last_paid_ym: string | null
          name: string
          notes: string | null
          pay_day: number
          pay_method: string
          sort_order: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          last_paid_ym?: string | null
          name: string
          notes?: string | null
          pay_day?: number
          pay_method?: string
          sort_order?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          last_paid_ym?: string | null
          name?: string
          notes?: string | null
          pay_day?: number
          pay_method?: string
          sort_order?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          adjust_account: string | null
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          merchant: string | null
          notes: string | null
          payment_method: string
          tx_date: string
          user_id: string
        }
        Insert: {
          adjust_account?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          payment_method: string
          tx_date?: string
          user_id: string
        }
        Update: {
          adjust_account?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          payment_method?: string
          tx_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          cap1_due_day: number
          cap1_limit: number
          cap1_min_payment: number
          cap1_owed: number
          cash_balance: number
          chase_balance: number
          created_at: string
          seeded: boolean
          snap_balance: number
          snap_deposit_amount: number
          snap_deposit_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cap1_due_day?: number
          cap1_limit?: number
          cap1_min_payment?: number
          cap1_owed?: number
          cash_balance?: number
          chase_balance?: number
          created_at?: string
          seeded?: boolean
          snap_balance?: number
          snap_deposit_amount?: number
          snap_deposit_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cap1_due_day?: number
          cap1_limit?: number
          cap1_min_payment?: number
          cap1_owed?: number
          cash_balance?: number
          chase_balance?: number
          created_at?: string
          seeded?: boolean
          snap_balance?: number
          snap_deposit_amount?: number
          snap_deposit_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
