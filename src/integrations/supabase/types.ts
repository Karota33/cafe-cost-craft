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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          break_duration: number | null
          created_at: string
          created_by: string | null
          date: string
          department_id: string | null
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          start_time: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          department_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          department_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_records: number | null
          failed_records: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          ocr_processing_id: string | null
          organization_id: string
          processed_at: string | null
          processed_records: number | null
          processing_status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_records?: number | null
          failed_records?: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          ocr_processing_id?: string | null
          organization_id: string
          processed_at?: string | null
          processed_records?: number | null
          processing_status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_records?: number | null
          failed_records?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          ocr_processing_id?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_records?: number | null
          processing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_ocr_processing_id_fkey"
            columns: ["ocr_processing_id"]
            isOneToOne: false
            referencedRelation: "ocr_processing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          allergens: Json | null
          area: string | null
          avg_price: number | null
          category: string | null
          created_at: string
          family: string | null
          id: string
          last_price_update: string | null
          name: string
          organization_id: string
          subfamily: string | null
          supplier_count: number | null
          unit_base: string | null
          updated_at: string
          yield_rate: number | null
        }
        Insert: {
          allergens?: Json | null
          area?: string | null
          avg_price?: number | null
          category?: string | null
          created_at?: string
          family?: string | null
          id?: string
          last_price_update?: string | null
          name: string
          organization_id: string
          subfamily?: string | null
          supplier_count?: number | null
          unit_base?: string | null
          updated_at?: string
          yield_rate?: number | null
        }
        Update: {
          allergens?: Json | null
          area?: string | null
          avg_price?: number | null
          category?: string | null
          created_at?: string
          family?: string | null
          id?: string
          last_price_update?: string | null
          name?: string
          organization_id?: string
          subfamily?: string | null
          supplier_count?: number | null
          unit_base?: string | null
          updated_at?: string
          yield_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_processing: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          organization_id: string
          processing_status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          organization_id: string
          processing_status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string
          processing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_processing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          igic_default: number | null
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          igic_default?: number | null
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          igic_default?: number | null
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          id: string
          ingredient_id: string
          is_active: boolean | null
          last_triggered: string | null
          organization_id: string
          threshold_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          ingredient_id: string
          is_active?: boolean | null
          last_triggered?: string | null
          organization_id: string
          threshold_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          organization_id?: string
          threshold_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_lines: {
        Row: {
          component_recipe_id: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          id: string
          ingredient_id: string | null
          loss_pct: number | null
          quantity: number
          recipe_id: string
          step_order: number
          unit: string
        }
        Insert: {
          component_recipe_id?: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          ingredient_id?: string | null
          loss_pct?: number | null
          quantity: number
          recipe_id: string
          step_order: number
          unit: string
        }
        Update: {
          component_recipe_id?: string | null
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          ingredient_id?: string | null
          loss_pct?: number | null
          quantity?: number
          recipe_id?: string
          step_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_lines_component_recipe_id_fkey"
            columns: ["component_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_lines_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          process_description: string | null
          servings: number | null
          status: Database["public"]["Enums"]["recipe_status"] | null
          target_batch_qty: number
          target_batch_unit: string
          type: Database["public"]["Enums"]["recipe_type"]
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          process_description?: string | null
          servings?: number | null
          status?: Database["public"]["Enums"]["recipe_status"] | null
          target_batch_qty: number
          target_batch_unit: string
          type: Database["public"]["Enums"]["recipe_type"]
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          process_description?: string | null
          servings?: number | null
          status?: Database["public"]["Enums"]["recipe_status"] | null
          target_batch_qty?: number
          target_batch_unit?: string
          type?: Database["public"]["Enums"]["recipe_type"]
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_prices: {
        Row: {
          created_at: string
          discount_pct: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          pack_description: string
          pack_net_qty: number
          pack_price: number
          pack_unit: string
          supplier_product_id: string
          tax_pct: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          pack_description: string
          pack_net_qty: number
          pack_price: number
          pack_unit: string
          supplier_product_id: string
          tax_pct?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          pack_description?: string
          pack_net_qty?: number
          pack_price?: number
          pack_unit?: string
          supplier_product_id?: string
          tax_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_prices_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          area: string
          created_at: string
          family: string | null
          id: string
          ingredient_id: string
          subfamily: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          family?: string | null
          id?: string
          ingredient_id: string
          subfamily?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          family?: string | null
          id?: string
          ingredient_id?: string
          subfamily?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          lead_time_days: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_end: string | null
          break_start: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          total_hours: number | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          total_hours?: number | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          total_hours?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_org_with_owner: {
        Args: { p_igic?: number; p_name: string; p_timezone?: string }
        Returns: {
          created_at: string
          id: string
          igic_default: number | null
          name: string
          timezone: string | null
          updated_at: string
        }
      }
    }
    Enums: {
      component_type: "ingredient" | "recipe"
      recipe_status: "draft" | "active" | "archived"
      recipe_type: "PREP" | "PLATE"
      user_role:
        | "owner"
        | "admin"
        | "manager"
        | "kitchen_staff"
        | "hall_staff"
        | "hr_manager"
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
    Enums: {
      component_type: ["ingredient", "recipe"],
      recipe_status: ["draft", "active", "archived"],
      recipe_type: ["PREP", "PLATE"],
      user_role: [
        "owner",
        "admin",
        "manager",
        "kitchen_staff",
        "hall_staff",
        "hr_manager",
      ],
    },
  },
} as const
