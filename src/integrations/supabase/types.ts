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
      file_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          organization_id: string
          processed_at: string | null
          processed_records: number | null
          processing_status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          organization_id: string
          processed_at?: string | null
          processed_records?: number | null
          processing_status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          processed_records?: number | null
          processing_status?: string | null
        }
        Relationships: [
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
          created_at: string
          family: string | null
          id: string
          name: string
          organization_id: string
          subfamily: string | null
          updated_at: string
          yield_rate: number | null
        }
        Insert: {
          allergens?: Json | null
          created_at?: string
          family?: string | null
          id?: string
          name: string
          organization_id: string
          subfamily?: string | null
          updated_at?: string
          yield_rate?: number | null
        }
        Update: {
          allergens?: Json | null
          created_at?: string
          family?: string | null
          id?: string
          name?: string
          organization_id?: string
          subfamily?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      component_type: "ingredient" | "recipe"
      recipe_status: "draft" | "active" | "archived"
      recipe_type: "PREP" | "PLATE"
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
    },
  },
} as const
