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
      actif_items: {
        Row: {
          declaration_id: string | null
          details: Json | null
          id: string
          justificatif_url: string | null
          libelle: string | null
          pre_rempli: boolean | null
          type_bien: string | null
          valeur_estimee: number | null
        }
        Insert: {
          declaration_id?: string | null
          details?: Json | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          pre_rempli?: boolean | null
          type_bien?: string | null
          valeur_estimee?: number | null
        }
        Update: {
          declaration_id?: string | null
          details?: Json | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          pre_rempli?: boolean | null
          type_bien?: string | null
          valeur_estimee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "actif_items_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string | null
          created_at: string | null
          data_hash: string | null
          declaration_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          data_hash?: string | null
          declaration_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          data_hash?: string | null
          declaration_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      calculation_results: {
        Row: {
          actif_brut: number | null
          actif_imposable: number | null
          actif_net: number | null
          computed_at: string | null
          declaration_id: string | null
          estimation_basse: number | null
          estimation_haute: number | null
          estimation_moyenne: number | null
          id: string
          passif_total: number | null
          rappel_donations: number | null
        }
        Insert: {
          actif_brut?: number | null
          actif_imposable?: number | null
          actif_net?: number | null
          computed_at?: string | null
          declaration_id?: string | null
          estimation_basse?: number | null
          estimation_haute?: number | null
          estimation_moyenne?: number | null
          id?: string
          passif_total?: number | null
          rappel_donations?: number | null
        }
        Update: {
          actif_brut?: number | null
          actif_imposable?: number | null
          actif_net?: number | null
          computed_at?: string | null
          declaration_id?: string | null
          estimation_basse?: number | null
          estimation_haute?: number | null
          estimation_moyenne?: number | null
          id?: string
          passif_total?: number | null
          rappel_donations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calculation_results_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: true
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      declarations: {
        Row: {
          anonymous_token: string | null
          created_at: string | null
          current_step: number | null
          eligibility_answers: Json | null
          eligibility_passed: boolean | null
          id: string
          mode: string | null
          purge_scheduled_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          created_at?: string | null
          current_step?: number | null
          eligibility_answers?: Json | null
          eligibility_passed?: boolean | null
          id?: string
          mode?: string | null
          purge_scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          created_at?: string | null
          current_step?: number | null
          eligibility_answers?: Json | null
          eligibility_passed?: boolean | null
          id?: string
          mode?: string | null
          purge_scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      defunts: {
        Row: {
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          birth_date: string | null
          civilite: string | null
          conjoint_civilite: string | null
          conjoint_date_naissance: string | null
          conjoint_lieu_naissance: string | null
          conjoint_nom_naissance: string | null
          conjoint_nom_usage: string | null
          conjoint_prenoms: string | null
          date_deces_conjoint: string | null
          date_mariage: string | null
          date_pacs: string | null
          death_date: string | null
          death_place: string | null
          declaration_id: string | null
          departement_naissance: string | null
          details: Json | null
          domicile: string | null
          full_name: string | null
          id: string
          lieu_mariage: string | null
          marital_status: string | null
          matrimonial_regime: string | null
          nationality: string | null
          nom_naissance: string | null
          nom_usage: string | null
          pays_naissance: string | null
          pre_rempli_fields: Json
          prenoms: string | null
          profession: string | null
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          birth_date?: string | null
          civilite?: string | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom_naissance?: string | null
          conjoint_nom_usage?: string | null
          conjoint_prenoms?: string | null
          date_deces_conjoint?: string | null
          date_mariage?: string | null
          date_pacs?: string | null
          death_date?: string | null
          death_place?: string | null
          declaration_id?: string | null
          departement_naissance?: string | null
          details?: Json | null
          domicile?: string | null
          full_name?: string | null
          id?: string
          lieu_mariage?: string | null
          marital_status?: string | null
          matrimonial_regime?: string | null
          nationality?: string | null
          nom_naissance?: string | null
          nom_usage?: string | null
          pays_naissance?: string | null
          pre_rempli_fields?: Json
          prenoms?: string | null
          profession?: string | null
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          birth_date?: string | null
          civilite?: string | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom_naissance?: string | null
          conjoint_nom_usage?: string | null
          conjoint_prenoms?: string | null
          date_deces_conjoint?: string | null
          date_mariage?: string | null
          date_pacs?: string | null
          death_date?: string | null
          death_place?: string | null
          declaration_id?: string | null
          departement_naissance?: string | null
          details?: Json | null
          domicile?: string | null
          full_name?: string | null
          id?: string
          lieu_mariage?: string | null
          marital_status?: string | null
          matrimonial_regime?: string | null
          nationality?: string | null
          nom_naissance?: string | null
          nom_usage?: string | null
          pays_naissance?: string | null
          pre_rempli_fields?: Json
          prenoms?: string | null
          profession?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defunts_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: true
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          beneficiaire_name: string | null
          dans_15_ans: boolean | null
          date_donation: string | null
          declaration_id: string | null
          enregistree_fiscalement: boolean | null
          id: string
          montant: number | null
          pre_rempli: boolean | null
          type_donation: string | null
        }
        Insert: {
          beneficiaire_name?: string | null
          dans_15_ans?: boolean | null
          date_donation?: string | null
          declaration_id?: string | null
          enregistree_fiscalement?: boolean | null
          id?: string
          montant?: number | null
          pre_rempli?: boolean | null
          type_donation?: string | null
        }
        Update: {
          beneficiaire_name?: string | null
          dans_15_ans?: boolean | null
          date_donation?: string | null
          declaration_id?: string | null
          enregistree_fiscalement?: boolean | null
          id?: string
          montant?: number | null
          pre_rempli?: boolean | null
          type_donation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      heritiers: {
        Row: {
          birth_date: string | null
          declaration_id: string | null
          email_notification: string | null
          full_name: string | null
          id: string
          lien_parente: string | null
          ordre: number | null
          pre_rempli_fields: Json
          status: string | null
        }
        Insert: {
          birth_date?: string | null
          declaration_id?: string | null
          email_notification?: string | null
          full_name?: string | null
          id?: string
          lien_parente?: string | null
          ordre?: number | null
          pre_rempli_fields?: Json
          status?: string | null
        }
        Update: {
          birth_date?: string | null
          declaration_id?: string | null
          email_notification?: string | null
          full_name?: string | null
          id?: string
          lien_parente?: string | null
          ordre?: number | null
          pre_rempli_fields?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heritiers_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      passif_items: {
        Row: {
          declaration_id: string | null
          details: Json | null
          existait_au_deces: string | null
          id: string
          justificatif_url: string | null
          libelle: string | null
          montant: number | null
          pre_rempli: boolean | null
          type_dette: string | null
        }
        Insert: {
          declaration_id?: string | null
          details?: Json | null
          existait_au_deces?: string | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          montant?: number | null
          pre_rempli?: boolean | null
          type_dette?: string | null
        }
        Update: {
          declaration_id?: string | null
          details?: Json | null
          existait_au_deces?: string | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          montant?: number | null
          pre_rempli?: boolean | null
          type_dette?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passif_items_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_cgu: boolean | null
          accepted_privacy: boolean | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          accepted_cgu?: boolean | null
          accepted_privacy?: boolean | null
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          accepted_cgu?: boolean | null
          accepted_privacy?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          declaration_id: string | null
          deleted_at: string | null
          detected_type: string | null
          doc_type: string | null
          extraction_payload: Json | null
          extraction_status: string | null
          id: string
          storage_path: string | null
          uploaded_at: string | null
        }
        Insert: {
          declaration_id?: string | null
          deleted_at?: string | null
          detected_type?: string | null
          doc_type?: string | null
          extraction_payload?: Json | null
          extraction_status?: string | null
          id?: string
          storage_path?: string | null
          uploaded_at?: string | null
        }
        Update: {
          declaration_id?: string | null
          deleted_at?: string | null
          detected_type?: string | null
          doc_type?: string | null
          extraction_payload?: Json | null
          extraction_status?: string | null
          id?: string
          storage_path?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_declaration: { Args: { token: string }; Returns: string }
      create_anonymous_declaration: {
        Args: { mode_choice: string }
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
