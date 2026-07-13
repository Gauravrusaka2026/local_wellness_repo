export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  governance: {
    Tables: {
      administrative_units: {
        Row: {
          created_at: string;
          district_id: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          lgd_code: string | null;
          local_body_id: string | null;
          name: string;
          parent_unit_id: string | null;
          reference_source_id: string | null;
          state_id: string;
          status: string;
          taluka_id: string | null;
          unit_type: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          local_body_id?: string | null;
          name: string;
          parent_unit_id?: string | null;
          reference_source_id?: string | null;
          state_id: string;
          status?: string;
          taluka_id?: string | null;
          unit_type: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          local_body_id?: string | null;
          name?: string;
          parent_unit_id?: string | null;
          reference_source_id?: string | null;
          state_id?: string;
          status?: string;
          taluka_id?: string | null;
          unit_type?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'administrative_units_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_parent_unit_id_fkey';
            columns: ['parent_unit_id'];
            isOneToOne: false;
            referencedRelation: 'administrative_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_state_id_fkey';
            columns: ['state_id'];
            isOneToOne: false;
            referencedRelation: 'states';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administrative_units_taluka_id_fkey';
            columns: ['taluka_id'];
            isOneToOne: false;
            referencedRelation: 'talukas';
            referencedColumns: ['id'];
          },
        ];
      };
      authorities: {
        Row: {
          authority_type: string;
          code: string;
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          parent_authority_id: string | null;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_type: string;
          code: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          parent_authority_id?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_type?: string;
          code?: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          parent_authority_id?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'authorities_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'authorities_parent_authority_id_fkey';
            columns: ['parent_authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'authorities_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      authority_departments: {
        Row: {
          authority_id: string;
          created_at: string;
          department_id: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          local_name: string | null;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_id: string;
          created_at?: string;
          department_id: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_name?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_id?: string;
          created_at?: string;
          department_id?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_name?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'authority_departments_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'authority_departments_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'authority_departments_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'authority_departments_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_routing_references: {
        Row: {
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          escalation_1_label: string | null;
          escalation_2_label: string | null;
          first_recipient_role_id: string | null;
          first_recipient_role_label: string;
          id: string;
          import_record_id: string | null;
          is_emergency: boolean;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          issue_name: string;
          last_verified_on: string | null;
          normalization_notes: string | null;
          normalization_status: string;
          ownership_condition: string | null;
          primary_department_id: string | null;
          primary_department_label: string;
          priority_or_emergency: string | null;
          reference_source_id: string | null;
          routing_logic: string;
          rule_code: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          escalation_1_label?: string | null;
          escalation_2_label?: string | null;
          first_recipient_role_id?: string | null;
          first_recipient_role_label: string;
          id?: string;
          import_record_id?: string | null;
          is_emergency?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          issue_name: string;
          last_verified_on?: string | null;
          normalization_notes?: string | null;
          normalization_status?: string;
          ownership_condition?: string | null;
          primary_department_id?: string | null;
          primary_department_label: string;
          priority_or_emergency?: string | null;
          reference_source_id?: string | null;
          routing_logic: string;
          rule_code: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          escalation_1_label?: string | null;
          escalation_2_label?: string | null;
          first_recipient_role_id?: string | null;
          first_recipient_role_label?: string;
          id?: string;
          import_record_id?: string | null;
          is_emergency?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          issue_name?: string;
          last_verified_on?: string | null;
          normalization_notes?: string | null;
          normalization_status?: string;
          ownership_condition?: string | null;
          primary_department_id?: string | null;
          primary_department_label?: string;
          priority_or_emergency?: string | null;
          reference_source_id?: string | null;
          routing_logic?: string;
          rule_code?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_routing_references_first_recipient_role_id_fkey';
            columns: ['first_recipient_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_routing_references_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_routing_references_primary_department_id_fkey';
            columns: ['primary_department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_routing_references_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      departments: {
        Row: {
          applicable_body_types: string[];
          code: string;
          complaint_types: string[];
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          priority_guidance: string | null;
          reference_source_id: string | null;
          required_data: string[];
          status: string;
          typical_coverage: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          applicable_body_types?: string[];
          code: string;
          complaint_types?: string[];
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          priority_guidance?: string | null;
          reference_source_id?: string | null;
          required_data?: string[];
          status?: string;
          typical_coverage?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          applicable_body_types?: string[];
          code?: string;
          complaint_types?: string[];
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          priority_guidance?: string | null;
          reference_source_id?: string | null;
          required_data?: string[];
          status?: string;
          typical_coverage?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'departments_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'departments_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      districts: {
        Row: {
          authority_id: string;
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          lgd_code: string | null;
          name: string;
          reference_source_id: string | null;
          revenue_division_name: string | null;
          state_id: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_id: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name: string;
          reference_source_id?: string | null;
          revenue_division_name?: string | null;
          state_id: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_id?: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name?: string;
          reference_source_id?: string | null;
          revenue_division_name?: string | null;
          state_id?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'districts_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: true;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'districts_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'districts_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'districts_state_id_fkey';
            columns: ['state_id'];
            isOneToOne: false;
            referencedRelation: 'states';
            referencedColumns: ['id'];
          },
        ];
      };
      emergency_contacts: {
        Row: {
          action: string | null;
          authority_id: string | null;
          availability: string | null;
          contact_type: string;
          contact_value: string | null;
          created_at: string;
          district_id: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          issue_type: string;
          jurisdiction_description: string;
          last_verified_on: string | null;
          local_body_id: string | null;
          reference_source_id: string | null;
          service_name: string;
          state_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          action?: string | null;
          authority_id?: string | null;
          availability?: string | null;
          contact_type: string;
          contact_value?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          issue_type: string;
          jurisdiction_description: string;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          reference_source_id?: string | null;
          service_name: string;
          state_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          action?: string | null;
          authority_id?: string | null;
          availability?: string | null;
          contact_type?: string;
          contact_value?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          issue_type?: string;
          jurisdiction_description?: string;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          reference_source_id?: string | null;
          service_name?: string;
          state_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emergency_contacts_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_contacts_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_contacts_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_contacts_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_contacts_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_contacts_state_id_fkey';
            columns: ['state_id'];
            isOneToOne: false;
            referencedRelation: 'states';
            referencedColumns: ['id'];
          },
        ];
      };
      import_batches: {
        Row: {
          canonical_root: string;
          completed_at: string | null;
          created_at: string;
          dataset_key: string;
          dataset_version: string;
          generated_seed_sha256: string | null;
          id: string;
          manifest_sha256: string;
          started_at: string;
          status: string;
          validation_summary: Json;
          workbook_sha256: string;
        };
        Insert: {
          canonical_root: string;
          completed_at?: string | null;
          created_at?: string;
          dataset_key: string;
          dataset_version: string;
          generated_seed_sha256?: string | null;
          id?: string;
          manifest_sha256: string;
          started_at?: string;
          status?: string;
          validation_summary?: Json;
          workbook_sha256: string;
        };
        Update: {
          canonical_root?: string;
          completed_at?: string | null;
          created_at?: string;
          dataset_key?: string;
          dataset_version?: string;
          generated_seed_sha256?: string | null;
          id?: string;
          manifest_sha256?: string;
          started_at?: string;
          status?: string;
          validation_summary?: Json;
          workbook_sha256?: string;
        };
        Relationships: [];
      };
      import_files: {
        Row: {
          accepted_row_count: number;
          created_at: string;
          file_name: string;
          id: string;
          import_batch_id: string;
          rejected_row_count: number;
          sha256: string;
          source_row_count: number;
          validation_summary: Json;
          warning_count: number;
        };
        Insert: {
          accepted_row_count?: number;
          created_at?: string;
          file_name: string;
          id?: string;
          import_batch_id: string;
          rejected_row_count?: number;
          sha256: string;
          source_row_count: number;
          validation_summary?: Json;
          warning_count?: number;
        };
        Update: {
          accepted_row_count?: number;
          created_at?: string;
          file_name?: string;
          id?: string;
          import_batch_id?: string;
          rejected_row_count?: number;
          sha256?: string;
          source_row_count?: number;
          validation_summary?: Json;
          warning_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'import_files_import_batch_id_fkey';
            columns: ['import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'import_batches';
            referencedColumns: ['id'];
          },
        ];
      };
      import_records: {
        Row: {
          created_at: string;
          id: string;
          import_file_id: string;
          is_placeholder: boolean;
          normalization_disposition: string;
          normalized_record_id: string | null;
          normalized_table: string | null;
          raw_payload: Json;
          record_sha256: string;
          row_number: number;
          source_key: string | null;
          validation_messages: Json;
          validation_status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          import_file_id: string;
          is_placeholder?: boolean;
          normalization_disposition: string;
          normalized_record_id?: string | null;
          normalized_table?: string | null;
          raw_payload: Json;
          record_sha256: string;
          row_number: number;
          source_key?: string | null;
          validation_messages?: Json;
          validation_status: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          import_file_id?: string;
          is_placeholder?: boolean;
          normalization_disposition?: string;
          normalized_record_id?: string | null;
          normalized_table?: string | null;
          raw_payload?: Json;
          record_sha256?: string;
          row_number?: number;
          source_key?: string | null;
          validation_messages?: Json;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'import_records_import_file_id_fkey';
            columns: ['import_file_id'];
            isOneToOne: false;
            referencedRelation: 'import_files';
            referencedColumns: ['id'];
          },
        ];
      };
      jurisdiction_boundary_versions: {
        Row: {
          boundary: unknown;
          created_at: string;
          district_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          local_body_id: string | null;
          reference_source_id: string | null;
          state_id: string | null;
          status: string;
          taluka_id: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
          ward_id: string | null;
        };
        Insert: {
          boundary: unknown;
          created_at?: string;
          district_id?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          reference_source_id?: string | null;
          state_id?: string | null;
          status?: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
          ward_id?: string | null;
        };
        Update: {
          boundary?: unknown;
          created_at?: string;
          district_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          reference_source_id?: string | null;
          state_id?: string | null;
          status?: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jurisdiction_boundary_versions_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_state_id_fkey';
            columns: ['state_id'];
            isOneToOne: false;
            referencedRelation: 'states';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_taluka_id_fkey';
            columns: ['taluka_id'];
            isOneToOne: false;
            referencedRelation: 'talukas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jurisdiction_boundary_versions_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
        ];
      };
      local_bodies: {
        Row: {
          authority_id: string;
          body_type: string;
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          lgd_code: string | null;
          name: string;
          reference_source_id: string | null;
          state_id: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_id: string;
          body_type: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name: string;
          reference_source_id?: string | null;
          state_id: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_id?: string;
          body_type?: string;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name?: string;
          reference_source_id?: string | null;
          state_id?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'local_bodies_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: true;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_bodies_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_bodies_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_bodies_state_id_fkey';
            columns: ['state_id'];
            isOneToOne: false;
            referencedRelation: 'states';
            referencedColumns: ['id'];
          },
        ];
      };
      local_body_districts: {
        Row: {
          created_at: string;
          district_id: string;
          import_record_id: string | null;
          is_primary: boolean;
          local_body_id: string;
          reference_source_id: string | null;
        };
        Insert: {
          created_at?: string;
          district_id: string;
          import_record_id?: string | null;
          is_primary?: boolean;
          local_body_id: string;
          reference_source_id?: string | null;
        };
        Update: {
          created_at?: string;
          district_id?: string;
          import_record_id?: string | null;
          is_primary?: boolean;
          local_body_id?: string;
          reference_source_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'local_body_districts_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_body_districts_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_body_districts_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'local_body_districts_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      officer_assignments: {
        Row: {
          assignment_key: string;
          authority_department_id: string | null;
          authority_id: string;
          coverage: string | null;
          created_at: string;
          district_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          last_verified_on: string | null;
          local_body_id: string | null;
          office_id: string | null;
          officer_id: string | null;
          officer_role_id: string;
          reference_source_id: string | null;
          responsibility: string | null;
          status: string;
          taluka_id: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
          ward_id: string | null;
        };
        Insert: {
          assignment_key: string;
          authority_department_id?: string | null;
          authority_id: string;
          coverage?: string | null;
          created_at?: string;
          district_id?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          office_id?: string | null;
          officer_id?: string | null;
          officer_role_id: string;
          reference_source_id?: string | null;
          responsibility?: string | null;
          status: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
          ward_id?: string | null;
        };
        Update: {
          assignment_key?: string;
          authority_department_id?: string | null;
          authority_id?: string;
          coverage?: string | null;
          created_at?: string;
          district_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          office_id?: string | null;
          officer_id?: string | null;
          officer_role_id?: string;
          reference_source_id?: string | null;
          responsibility?: string | null;
          status?: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'officer_assignments_authority_department_id_fkey';
            columns: ['authority_department_id'];
            isOneToOne: false;
            referencedRelation: 'authority_departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_office_id_fkey';
            columns: ['office_id'];
            isOneToOne: false;
            referencedRelation: 'offices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_officer_id_fkey';
            columns: ['officer_id'];
            isOneToOne: false;
            referencedRelation: 'officers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_officer_role_id_fkey';
            columns: ['officer_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_taluka_id_fkey';
            columns: ['taluka_id'];
            isOneToOne: false;
            referencedRelation: 'talukas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_assignments_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
        ];
      };
      officer_roles: {
        Row: {
          code: string;
          core_responsibility: string | null;
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          people_or_units_under_role: string | null;
          reference_source_id: string | null;
          reports_to_description: string | null;
          reports_to_role_id: string | null;
          status: string;
          typical_coverage: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          code: string;
          core_responsibility?: string | null;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          people_or_units_under_role?: string | null;
          reference_source_id?: string | null;
          reports_to_description?: string | null;
          reports_to_role_id?: string | null;
          status?: string;
          typical_coverage?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          code?: string;
          core_responsibility?: string | null;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          people_or_units_under_role?: string | null;
          reference_source_id?: string | null;
          reports_to_description?: string | null;
          reports_to_role_id?: string | null;
          status?: string;
          typical_coverage?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'officer_roles_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_roles_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officer_roles_reports_to_role_id_fkey';
            columns: ['reports_to_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
        ];
      };
      officers: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          last_verified_on: string | null;
          official_email: string | null;
          official_phone: string | null;
          profile_id: string | null;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          last_verified_on?: string | null;
          official_email?: string | null;
          official_phone?: string | null;
          profile_id?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          last_verified_on?: string | null;
          official_email?: string | null;
          official_phone?: string | null;
          profile_id?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'officers_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'officers_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      offices: {
        Row: {
          address: string | null;
          authority_department_id: string | null;
          authority_id: string;
          coverage: string | null;
          created_at: string;
          district_id: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          jurisdiction_description: string | null;
          last_verified_on: string | null;
          level: string | null;
          local_body_id: string | null;
          name: string;
          office_type: string;
          official_email: string | null;
          official_phone: string | null;
          reference_source_id: string | null;
          status: string;
          taluka_id: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          ward_id: string | null;
        };
        Insert: {
          address?: string | null;
          authority_department_id?: string | null;
          authority_id: string;
          coverage?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          jurisdiction_description?: string | null;
          last_verified_on?: string | null;
          level?: string | null;
          local_body_id?: string | null;
          name: string;
          office_type: string;
          official_email?: string | null;
          official_phone?: string | null;
          reference_source_id?: string | null;
          status?: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          ward_id?: string | null;
        };
        Update: {
          address?: string | null;
          authority_department_id?: string | null;
          authority_id?: string;
          coverage?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          jurisdiction_description?: string | null;
          last_verified_on?: string | null;
          level?: string | null;
          local_body_id?: string | null;
          name?: string;
          office_type?: string;
          official_email?: string | null;
          official_phone?: string | null;
          reference_source_id?: string | null;
          status?: string;
          taluka_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'offices_authority_department_id_fkey';
            columns: ['authority_department_id'];
            isOneToOne: false;
            referencedRelation: 'authority_departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_taluka_id_fkey';
            columns: ['taluka_id'];
            isOneToOne: false;
            referencedRelation: 'talukas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offices_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
        ];
      };
      reference_sources: {
        Row: {
          created_at: string;
          id: string;
          last_checked_on: string | null;
          purpose: string | null;
          source_type: string;
          status: string;
          title: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_checked_on?: string | null;
          purpose?: string | null;
          source_type?: string;
          status?: string;
          title: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_checked_on?: string | null;
          purpose?: string | null;
          source_type?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      states: {
        Row: {
          authority_id: string;
          capital: string | null;
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          iso_code: string;
          last_verified_on: string | null;
          lgd_code: string | null;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_id: string;
          capital?: string | null;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          iso_code: string;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_id?: string;
          capital?: string | null;
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          iso_code?: string;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'states_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: true;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'states_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'states_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      talukas: {
        Row: {
          created_at: string;
          district_id: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          lgd_code: string | null;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          district_id: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          created_at?: string;
          district_id?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'talukas_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'talukas_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'talukas_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      utilities: {
        Row: {
          authority_id: string;
          complaint_types: string[];
          created_at: string;
          escalation_role_id: string | null;
          function_description: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          jurisdiction_description: string | null;
          last_verified_on: string | null;
          local_office_description: string | null;
          name: string;
          reference_source_id: string | null;
          reporting_channel: string | null;
          routing_notes: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          authority_id: string;
          complaint_types?: string[];
          created_at?: string;
          escalation_role_id?: string | null;
          function_description: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          jurisdiction_description?: string | null;
          last_verified_on?: string | null;
          local_office_description?: string | null;
          name: string;
          reference_source_id?: string | null;
          reporting_channel?: string | null;
          routing_notes?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          authority_id?: string;
          complaint_types?: string[];
          created_at?: string;
          escalation_role_id?: string | null;
          function_description?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          jurisdiction_description?: string | null;
          last_verified_on?: string | null;
          local_office_description?: string | null;
          name?: string;
          reference_source_id?: string | null;
          reporting_channel?: string | null;
          routing_notes?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'utilities_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: true;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'utilities_escalation_role_id_fkey';
            columns: ['escalation_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'utilities_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'utilities_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      wards: {
        Row: {
          created_at: string;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          lgd_code: string | null;
          local_body_id: string;
          name: string;
          reference_source_id: string | null;
          source_ward_code: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          ward_number: string | null;
          zone_name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          local_body_id: string;
          name: string;
          reference_source_id?: string | null;
          source_ward_code?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          ward_number?: string | null;
          zone_name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          lgd_code?: string | null;
          local_body_id?: string;
          name?: string;
          reference_source_id?: string | null;
          source_ward_code?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          ward_number?: string | null;
          zone_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wards_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wards_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wards_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      resolve_jurisdiction: {
        Args: {
          p_latitude: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          local_body_boundary_version_id: string;
          local_body_id: string;
          ward_boundary_version_id: string;
          ward_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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
          is_active?: boolean;
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
          is_active?: boolean;
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
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bootstrap_platform_administrator: {
        Args: { target_user_id: string };
        Returns: string;
      };
      get_active_authority_memberships: {
        Args: { p_at: string; p_user_id: string };
        Returns: {
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
        }[];
        SetofOptions: {
          from: '*';
          to: 'authority_memberships';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_active_user_roles: {
        Args: { p_at: string; p_user_id: string };
        Returns: {
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
        }[];
        SetofOptions: {
          from: '*';
          to: 'user_roles';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      provision_government_invitation: {
        Args: {
          actor_user_id: string;
          authority_id: string;
          effective_from: string;
          effective_until: string;
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
          p_app_version?: string;
          p_device_identifier_hash: string;
          p_ip_address?: unknown;
          p_last_seen_at: string;
          p_platform: string;
          p_push_token?: string;
          p_push_token_supplied?: boolean;
          p_request_id?: string;
          p_user_agent?: string;
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
          p_request_id?: string;
          p_revoked_at: string;
          p_user_agent?: string;
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
    Enums: {
      [_ in never]: never;
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
  governance: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
