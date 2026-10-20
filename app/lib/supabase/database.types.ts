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
      application_documents: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          kind: string
          listing_id: number
          mime_type: string
          name: string
          path: string
          size: number
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          kind: string
          listing_id: number
          mime_type: string
          name: string
          path: string
          size: number
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          listing_id?: number
          mime_type?: string
          name?: string
          path?: string
          size?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          duration: number
          id: string
          listing_id: number
          offer: number
          owner_note: string
          payment: Json | null
          proposal: string
          seeker_id: string
          start_date: string
          status: string
          tenant_json: string
          updated_at: string
        }
        Insert: {
          created_at: string
          duration: number
          id?: string
          listing_id: number
          offer: number
          owner_note?: string
          payment?: Json | null
          proposal: string
          seeker_id: string
          start_date: string
          status: string
          tenant_json: string
          updated_at: string
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          listing_id?: number
          offer?: number
          owner_note?: string
          payment?: Json | null
          proposal?: string
          seeker_id?: string
          start_date?: string
          status?: string
          tenant_json?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          listing_id: number
          user_id: string
        }
        Insert: {
          listing_id: number
          user_id: string
        }
        Update: {
          listing_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_analyses: {
        Row: {
          analyzed_at: string
          input_fingerprint: string
          listing_id: number
          model_version: string
          result_json: string
        }
        Insert: {
          analyzed_at: string
          input_fingerprint: string
          listing_id: number
          model_version: string
          result_json: string
        }
        Update: {
          analyzed_at?: string
          input_fingerprint?: string
          listing_id?: number
          model_version?: string
          result_json?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_analyses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          area: number
          created_at: string
          demo_json: string | null
          description: string
          facilities: string
          id: number
          image: string
          latitude: number
          longitude: number
          name: string
          owner_id: string | null
          price: number
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          area: number
          created_at?: string
          demo_json?: string | null
          description?: string
          facilities?: string
          id?: number
          image: string
          latitude: number
          longitude: number
          name: string
          owner_id?: string | null
          price: number
          status: string
          updated_at?: string
        }
        Update: {
          address?: string
          area?: number
          created_at?: string
          demo_json?: string | null
          description?: string
          facilities?: string
          id?: number
          image?: string
          latitude?: number
          longitude?: number
          name?: string
          owner_id?: string | null
          price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: number
          listing_id: number
          seeker_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: number
          listing_id: number
          seeker_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: number
          listing_id?: number
          seeker_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          date: string
          id: string
          listing_id: number
          note: string
          owner_note: string
          seeker_id: string
          status: string
          time: string
          updated_at: string
          visitors: number
        }
        Insert: {
          created_at: string
          date: string
          id?: string
          listing_id: number
          note: string
          owner_note?: string
          seeker_id: string
          status: string
          time: string
          updated_at: string
          visitors: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          listing_id?: number
          note?: string
          owner_note?: string
          seeker_id?: string
          status?: string
          time?: string
          updated_at?: string
          visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "surveys_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          id: string
          role: string
        }
        Insert: {
          email: string
          id: string
          role: string
        }
        Update: {
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      wizard_drafts: {
        Row: {
          data: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: string
          updated_at: string
          user_id: string
        }
        Update: {
          data?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wizard_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_simulated_payment: {
        Args: { p_application: string; p_method: string }
        Returns: Json
      }
      decide_request: {
        Args: { p_id: string; p_kind: string; p_note: string; p_status: string }
        Returns: undefined
      }
      save_listing: {
        Args: { p_analysis: Json; p_id: number; p_listing: Json }
        Returns: number
      }
      set_rental_status: {
        Args: { p_listing: number; p_status: string }
        Returns: undefined
      }
      submit_application: {
        Args: { p_application: Json; p_document_ids?: string[] }
        Returns: string
      }
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
    Enums: {},
  },
} as const
