export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      auth_audit_events: {
        Row: {
          actor_user_id: string | null;
          authority_id: string | null;
          device_id: string | null;
          event_type: string;
          id: string;
          ip_address: unknown;
          metadata: Json;
          occurred_at: string;
          outcome: string;
          request_id: string | null;
          subject_user_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          authority_id?: string | null;
          device_id?: string | null;
          event_type: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          occurred_at?: string;
          outcome: string;
          request_id?: string | null;
          subject_user_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          authority_id?: string | null;
          device_id?: string | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          occurred_at?: string;
          outcome?: string;
          request_id?: string | null;
          subject_user_id?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      authority_memberships: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          authority_id: string;
          created_at: string;
          effective_from: string;
          effective_until: string | null;
          id: string;
          invitation_email: string;
          invited_by: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          authority_id: string;
          created_at?: string;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          invitation_email: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          authority_id?: string;
          created_at?: string;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          invitation_email?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_identifier_hash: string;
          id: string;
          is_active: boolean;
          last_seen_at: string;
          platform: string;
          push_token: string | null;
          revoked_at: string | null;
          risk_status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_identifier_hash: string;
          id?: string;
          last_seen_at?: string;
          platform: string;
          push_token?: string | null;
          revoked_at?: string | null;
          risk_status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_identifier_hash?: string;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          push_token?: string | null;
          revoked_at?: string | null;
          risk_status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          onboarding_completed_at: string | null;
          phone: string | null;
          preferred_language: string;
          status: string;
          trust_score: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          onboarding_completed_at?: string | null;
          phone?: string | null;
          preferred_language?: string;
          status?: string;
          trust_score?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          onboarding_completed_at?: string | null;
          phone?: string | null;
          preferred_language?: string;
          status?: string;
          trust_score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_government: boolean;
          is_privileged: boolean;
          is_system: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_government?: boolean;
          is_privileged?: boolean;
          is_system?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_government?: boolean;
          is_privileged?: boolean;
          is_system?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          authority_id: string | null;
          created_at: string;
          effective_from: string;
          effective_until: string | null;
          granted_by: string | null;
          id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role_id: string;
          scope_id: string | null;
          scope_type: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          authority_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_until?: string | null;
          granted_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id: string;
          scope_id?: string | null;
          scope_type: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          authority_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_until?: string | null;
          granted_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id?: string;
          scope_id?: string | null;
          scope_type?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      bootstrap_platform_administrator: {
        Args: { target_user_id: string };
        Returns: string;
      };
      provision_government_invitation: {
        Args: {
          actor_user_id: string;
          authority_id: string;
          effective_from: string;
          effective_until: string | null;
          invitation_email: string;
          invited_user_id: string;
          role_id: string;
          scope_id: string;
          scope_type: string;
        };
        Returns: {
          membership_id: string;
          role_assignment_id: string;
        }[];
      };
      register_device: {
        Args: {
          p_app_version?: string | null;
          p_device_identifier_hash: string;
          p_ip_address?: unknown;
          p_last_seen_at: string;
          p_platform: string;
          p_push_token?: string | null;
          p_push_token_supplied?: boolean;
          p_request_id?: string | null;
          p_user_agent?: string | null;
          p_user_id: string;
        };
        Returns: {
          app_version: string | null;
          created_at: string;
          device_identifier_hash: string;
          id: string;
          is_active: boolean;
          last_seen_at: string;
          platform: string;
          push_token: string | null;
          revoked_at: string | null;
          risk_status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'devices';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_device: {
        Args: {
          p_device_id: string;
          p_ip_address?: unknown;
          p_request_id?: string | null;
          p_revoked_at: string;
          p_user_agent?: string | null;
          p_user_id: string;
        };
        Returns: {
          app_version: string | null;
          created_at: string;
          device_identifier_hash: string;
          id: string;
          is_active: boolean;
          last_seen_at: string;
          platform: string;
          push_token: string | null;
          revoked_at: string | null;
          risk_status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'devices';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
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
