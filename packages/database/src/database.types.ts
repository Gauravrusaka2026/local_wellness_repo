export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  complaints: {
    Tables: {
      complaint_assignments: {
        Row: {
          asset_id: string | null;
          asset_ownership_version_id: string | null;
          asset_type_id: string | null;
          asset_version_id: string | null;
          assigned_at: string;
          assigned_by_user_id: string | null;
          assigned_user_id: string | null;
          assignment_source: string;
          authority_department_id: string;
          authority_id: string;
          complaint_id: string;
          created_at: string;
          department_id: string;
          effective_from: string;
          effective_to: string | null;
          ended_by_user_id: string | null;
          id: string;
          local_body_id: string;
          officer_assignment_id: string | null;
          officer_role_id: string;
          reason_code: string | null;
          routing_decision_id: string;
          status: string;
          supersedes_assignment_id: string | null;
          version: number;
          ward_id: string | null;
        };
        Insert: {
          asset_id?: string | null;
          asset_ownership_version_id?: string | null;
          asset_type_id?: string | null;
          asset_version_id?: string | null;
          assigned_at: string;
          assigned_by_user_id?: string | null;
          assigned_user_id?: string | null;
          assignment_source?: string;
          authority_department_id: string;
          authority_id: string;
          complaint_id: string;
          created_at?: string;
          department_id: string;
          effective_from?: string;
          effective_to?: string | null;
          ended_by_user_id?: string | null;
          id?: string;
          local_body_id: string;
          officer_assignment_id?: string | null;
          officer_role_id: string;
          reason_code?: string | null;
          routing_decision_id: string;
          status?: string;
          supersedes_assignment_id?: string | null;
          version?: number;
          ward_id?: string | null;
        };
        Update: {
          asset_id?: string | null;
          asset_ownership_version_id?: string | null;
          asset_type_id?: string | null;
          asset_version_id?: string | null;
          assigned_at?: string;
          assigned_by_user_id?: string | null;
          assigned_user_id?: string | null;
          assignment_source?: string;
          authority_department_id?: string;
          authority_id?: string;
          complaint_id?: string;
          created_at?: string;
          department_id?: string;
          effective_from?: string;
          effective_to?: string | null;
          ended_by_user_id?: string | null;
          id?: string;
          local_body_id?: string;
          officer_assignment_id?: string | null;
          officer_role_id?: string;
          reason_code?: string | null;
          routing_decision_id?: string;
          status?: string;
          supersedes_assignment_id?: string | null;
          version?: number;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_assignments_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_assignments_supersedes_assignment_id_fkey';
            columns: ['supersedes_assignment_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_drafts: {
        Row: {
          asset_id: string | null;
          category_id: string | null;
          citizen_user_id: string;
          created_at: string;
          creation_idempotency_key_hash: string;
          creation_request_fingerprint: string;
          custom_attributes: Json;
          description: string | null;
          description_language: string;
          discarded_at: string | null;
          expires_at: string;
          id: string;
          revision: number;
          selected_location_evidence_id: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          asset_id?: string | null;
          category_id?: string | null;
          citizen_user_id: string;
          created_at?: string;
          creation_idempotency_key_hash: string;
          creation_request_fingerprint: string;
          custom_attributes?: Json;
          description?: string | null;
          description_language?: string;
          discarded_at?: string | null;
          expires_at?: string;
          id?: string;
          revision?: number;
          selected_location_evidence_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          asset_id?: string | null;
          category_id?: string | null;
          citizen_user_id?: string;
          created_at?: string;
          creation_idempotency_key_hash?: string;
          creation_request_fingerprint?: string;
          custom_attributes?: Json;
          description?: string | null;
          description_language?: string;
          discarded_at?: string | null;
          expires_at?: string;
          id?: string;
          revision?: number;
          selected_location_evidence_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_drafts_selected_location_fkey';
            columns: ['selected_location_evidence_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_location_evidence';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_external_dependencies: {
        Row: {
          added_by_user_id: string;
          assignment_id: string;
          complaint_id: string;
          created_at: string;
          dependency_type: string;
          description: string;
          expected_by: string | null;
          id: string;
          resolution_summary: string | null;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          added_by_user_id: string;
          assignment_id: string;
          complaint_id: string;
          created_at?: string;
          dependency_type: string;
          description: string;
          expected_by?: string | null;
          id?: string;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          added_by_user_id?: string;
          assignment_id?: string;
          complaint_id?: string;
          created_at?: string;
          dependency_type?: string;
          description?: string;
          expected_by?: string | null;
          id?: string;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_external_dependencies_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_external_dependencies_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_inspections: {
        Row: {
          assignment_id: string;
          complaint_id: string;
          completed_at: string | null;
          completed_by_user_id: string | null;
          created_at: string;
          id: string;
          instructions: string | null;
          outcome: string | null;
          scheduled_by_user_id: string;
          scheduled_for: string;
          status: string;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          complaint_id: string;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          outcome?: string | null;
          scheduled_by_user_id: string;
          scheduled_for: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          complaint_id?: string;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          outcome?: string | null;
          scheduled_by_user_id?: string;
          scheduled_for?: string;
          status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_inspections_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_inspections_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_internal_notes: {
        Row: {
          assignment_id: string;
          author_user_id: string;
          body: string;
          complaint_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          assignment_id: string;
          author_user_id: string;
          body: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          assignment_id?: string;
          author_user_id?: string;
          body?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_internal_notes_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_internal_notes_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_location_evidence: {
        Row: {
          accuracy_meters: number;
          actor_user_id: string;
          captured_at: string;
          created_at: string;
          device_id: string | null;
          device_recorded_at: string;
          draft_id: string;
          evidence_type: string;
          id: string;
          location: unknown;
          mock_location_detected: boolean | null;
          provider: string;
          received_at: string;
          spoof_risk_status: string;
          verification_metadata: Json;
          verification_score: number | null;
          verification_status: string;
        };
        Insert: {
          accuracy_meters: number;
          actor_user_id: string;
          captured_at: string;
          created_at?: string;
          device_id?: string | null;
          device_recorded_at: string;
          draft_id: string;
          evidence_type?: string;
          id?: string;
          location: unknown;
          mock_location_detected?: boolean | null;
          provider: string;
          received_at?: string;
          spoof_risk_status?: string;
          verification_metadata?: Json;
          verification_score?: number | null;
          verification_status?: string;
        };
        Update: {
          accuracy_meters?: number;
          actor_user_id?: string;
          captured_at?: string;
          created_at?: string;
          device_id?: string | null;
          device_recorded_at?: string;
          draft_id?: string;
          evidence_type?: string;
          id?: string;
          location?: unknown;
          mock_location_detected?: boolean | null;
          provider?: string;
          received_at?: string;
          spoof_risk_status?: string;
          verification_metadata?: Json;
          verification_score?: number | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_location_evidence_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_media: {
        Row: {
          bucket_id: string;
          capture_location_evidence_id: string | null;
          capture_source: string;
          captured_at: string | null;
          client_media_id: string;
          client_sha256: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          distance_to_complaint_meters: number | null;
          draft_id: string;
          duration_seconds: number | null;
          failure_code: string | null;
          finalized_at: string | null;
          height_pixels: number | null;
          id: string;
          media_kind: string;
          moderation_status: string;
          object_path: string;
          observed_byte_size: number | null;
          observed_mime_type: string | null;
          processing_status: string;
          updated_at: string;
          upload_expires_at: string;
          upload_status: string;
          uploader_user_id: string;
          verified_sha256: string | null;
          width_pixels: number | null;
        };
        Insert: {
          bucket_id: string;
          capture_location_evidence_id?: string | null;
          capture_source: string;
          captured_at?: string | null;
          client_media_id: string;
          client_sha256: string;
          created_at?: string;
          declared_byte_size: number;
          declared_mime_type: string;
          distance_to_complaint_meters?: number | null;
          draft_id: string;
          duration_seconds?: number | null;
          failure_code?: string | null;
          finalized_at?: string | null;
          height_pixels?: number | null;
          id?: string;
          media_kind: string;
          moderation_status?: string;
          object_path: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          processing_status?: string;
          updated_at?: string;
          upload_expires_at: string;
          upload_status?: string;
          uploader_user_id: string;
          verified_sha256?: string | null;
          width_pixels?: number | null;
        };
        Update: {
          bucket_id?: string;
          capture_location_evidence_id?: string | null;
          capture_source?: string;
          captured_at?: string | null;
          client_media_id?: string;
          client_sha256?: string;
          created_at?: string;
          declared_byte_size?: number;
          declared_mime_type?: string;
          distance_to_complaint_meters?: number | null;
          draft_id?: string;
          duration_seconds?: number | null;
          failure_code?: string | null;
          finalized_at?: string | null;
          height_pixels?: number | null;
          id?: string;
          media_kind?: string;
          moderation_status?: string;
          object_path?: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          processing_status?: string;
          updated_at?: string;
          upload_expires_at?: string;
          upload_status?: string;
          uploader_user_id?: string;
          verified_sha256?: string | null;
          width_pixels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_media_capture_location_evidence_id_fkey';
            columns: ['capture_location_evidence_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_location_evidence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_media_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_resolution_evidence: {
        Row: {
          assignment_id: string;
          bucket_id: string;
          captured_at: string | null;
          client_sha256: string;
          complaint_id: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          failure_code: string | null;
          finalized_at: string | null;
          id: string;
          kind: string;
          object_path: string;
          observed_byte_size: number | null;
          observed_mime_type: string | null;
          updated_at: string;
          upload_expires_at: string;
          upload_status: string;
          uploader_user_id: string;
          verified_sha256: string | null;
        };
        Insert: {
          assignment_id: string;
          bucket_id?: string;
          captured_at?: string | null;
          client_sha256: string;
          complaint_id: string;
          created_at?: string;
          declared_byte_size: number;
          declared_mime_type: string;
          failure_code?: string | null;
          finalized_at?: string | null;
          id?: string;
          kind: string;
          object_path: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          updated_at?: string;
          upload_expires_at: string;
          upload_status?: string;
          uploader_user_id: string;
          verified_sha256?: string | null;
        };
        Update: {
          assignment_id?: string;
          bucket_id?: string;
          captured_at?: string | null;
          client_sha256?: string;
          complaint_id?: string;
          created_at?: string;
          declared_byte_size?: number;
          declared_mime_type?: string;
          failure_code?: string | null;
          finalized_at?: string | null;
          id?: string;
          kind?: string;
          object_path?: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          updated_at?: string;
          upload_expires_at?: string;
          upload_status?: string;
          uploader_user_id?: string;
          verified_sha256?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_resolution_evidence_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_resolution_evidence_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_resolution_evidence_links: {
        Row: {
          created_at: string;
          evidence_id: string;
          resolution_id: string;
        };
        Insert: {
          created_at?: string;
          evidence_id: string;
          resolution_id: string;
        };
        Update: {
          created_at?: string;
          evidence_id?: string;
          resolution_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_resolution_evidence_links_evidence_id_fkey';
            columns: ['evidence_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_resolution_evidence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_resolution_evidence_links_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_resolutions: {
        Row: {
          assignment_id: string;
          complaint_id: string;
          completion_note: string;
          created_at: string;
          id: string;
          public_message: string | null;
          submitted_by_user_id: string;
          version: number;
        };
        Insert: {
          assignment_id: string;
          complaint_id: string;
          completion_note: string;
          created_at?: string;
          id?: string;
          public_message?: string | null;
          submitted_by_user_id: string;
          version: number;
        };
        Update: {
          assignment_id?: string;
          complaint_id?: string;
          completion_note?: string;
          created_at?: string;
          id?: string;
          public_message?: string | null;
          submitted_by_user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_resolutions_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_resolutions_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_status_history: {
        Row: {
          actor_user_id: string | null;
          complaint_id: string;
          event_source: string;
          from_status: string | null;
          id: string;
          metadata: Json;
          occurred_at: string;
          public_message: string | null;
          reason_code: string;
          request_id: string | null;
          sequence: number;
          to_status: string;
        };
        Insert: {
          actor_user_id?: string | null;
          complaint_id: string;
          event_source: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          public_message?: string | null;
          reason_code: string;
          request_id?: string | null;
          sequence: number;
          to_status: string;
        };
        Update: {
          actor_user_id?: string | null;
          complaint_id?: string;
          event_source?: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          public_message?: string | null;
          reason_code?: string;
          request_id?: string | null;
          sequence?: number;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_status_history_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_submission_requests: {
        Row: {
          acknowledged_duplicate_suggestion_ids: string[];
          actor_user_id: string;
          claimed_at: string;
          complaint_id: string | null;
          completed_at: string | null;
          created_at: string;
          draft_id: string;
          emergency_disclaimer_acknowledged: boolean;
          id: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          response_payload: Json | null;
          routing_decision_id: string | null;
          routing_request_id: string;
          state: string;
        };
        Insert: {
          acknowledged_duplicate_suggestion_ids?: string[];
          actor_user_id: string;
          claimed_at?: string;
          complaint_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          draft_id: string;
          emergency_disclaimer_acknowledged?: boolean;
          id?: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          response_payload?: Json | null;
          routing_decision_id?: string | null;
          routing_request_id: string;
          state?: string;
        };
        Update: {
          acknowledged_duplicate_suggestion_ids?: string[];
          actor_user_id?: string;
          claimed_at?: string;
          complaint_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          draft_id?: string;
          emergency_disclaimer_acknowledged?: boolean;
          id?: string;
          idempotency_key_hash?: string;
          request_fingerprint?: string;
          response_payload?: Json | null;
          routing_decision_id?: string | null;
          routing_request_id?: string;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_submission_requests_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_submission_requests_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_work_references: {
        Row: {
          added_by_user_id: string;
          assignment_id: string;
          complaint_id: string;
          created_at: string;
          description: string | null;
          id: string;
          reference_number: string;
          reference_type: string;
        };
        Insert: {
          added_by_user_id: string;
          assignment_id: string;
          complaint_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          reference_number: string;
          reference_type: string;
        };
        Update: {
          added_by_user_id?: string;
          assignment_id?: string;
          complaint_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          reference_number?: string;
          reference_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_work_references_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_work_references_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaints: {
        Row: {
          asset_id: string | null;
          category_id: string;
          citizen_user_id: string;
          complaint_number: string;
          created_at: string;
          current_status: string;
          custom_attributes: Json;
          description: string;
          description_language: string;
          draft_id: string;
          id: string;
          location_evidence_id: string;
          routing_decision_id: string;
          submitted_at: string;
          updated_at: string;
          visibility: string;
          workflow_version: number;
        };
        Insert: {
          asset_id?: string | null;
          category_id: string;
          citizen_user_id: string;
          complaint_number: string;
          created_at?: string;
          current_status?: string;
          custom_attributes: Json;
          description: string;
          description_language: string;
          draft_id: string;
          id?: string;
          location_evidence_id: string;
          routing_decision_id: string;
          submitted_at: string;
          updated_at?: string;
          visibility?: string;
          workflow_version?: number;
        };
        Update: {
          asset_id?: string | null;
          category_id?: string;
          citizen_user_id?: string;
          complaint_number?: string;
          created_at?: string;
          current_status?: string;
          custom_attributes?: Json;
          description?: string;
          description_language?: string;
          draft_id?: string;
          id?: string;
          location_evidence_id?: string;
          routing_decision_id?: string;
          submitted_at?: string;
          updated_at?: string;
          visibility?: string;
          workflow_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaints_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_drafts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaints_location_evidence_id_fkey';
            columns: ['location_evidence_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_location_evidence';
            referencedColumns: ['id'];
          },
        ];
      };
      duplicate_check_matches: {
        Row: {
          age_seconds: number;
          candidate_complaint_id: string;
          created_at: string;
          distance_meters: number;
          duplicate_check_run_id: string;
          factor_summary: Json;
          id: string;
          score: number;
        };
        Insert: {
          age_seconds: number;
          candidate_complaint_id: string;
          created_at?: string;
          distance_meters: number;
          duplicate_check_run_id: string;
          factor_summary: Json;
          id?: string;
          score: number;
        };
        Update: {
          age_seconds?: number;
          candidate_complaint_id?: string;
          created_at?: string;
          distance_meters?: number;
          duplicate_check_run_id?: string;
          factor_summary?: Json;
          id?: string;
          score?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'duplicate_check_matches_candidate_complaint_id_fkey';
            columns: ['candidate_complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'duplicate_check_matches_duplicate_check_run_id_fkey';
            columns: ['duplicate_check_run_id'];
            isOneToOne: false;
            referencedRelation: 'duplicate_check_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      duplicate_check_runs: {
        Row: {
          actor_user_id: string;
          candidate_count: number;
          checked_at: string;
          created_at: string;
          draft_id: string;
          duplicate_policy_version_id: string;
          id: string;
          request_id: string;
          result_fingerprint: string;
        };
        Insert: {
          actor_user_id: string;
          candidate_count: number;
          checked_at: string;
          created_at?: string;
          draft_id: string;
          duplicate_policy_version_id: string;
          id?: string;
          request_id: string;
          result_fingerprint: string;
        };
        Update: {
          actor_user_id?: string;
          candidate_count?: number;
          checked_at?: string;
          created_at?: string;
          draft_id?: string;
          duplicate_policy_version_id?: string;
          id?: string;
          request_id?: string;
          result_fingerprint?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'duplicate_check_runs_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      government_action_audit_events: {
        Row: {
          action_request_id: string;
          action_type: string;
          actor_user_id: string;
          assignment_id: string | null;
          authority_id: string;
          complaint_id: string;
          from_status: string | null;
          id: string;
          metadata: Json;
          occurred_at: string;
          request_id: string;
          to_status: string | null;
        };
        Insert: {
          action_request_id: string;
          action_type: string;
          actor_user_id: string;
          assignment_id?: string | null;
          authority_id: string;
          complaint_id: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id: string;
          to_status?: string | null;
        };
        Update: {
          action_request_id?: string;
          action_type?: string;
          actor_user_id?: string;
          assignment_id?: string | null;
          authority_id?: string;
          complaint_id?: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id?: string;
          to_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'government_action_audit_events_action_request_id_fkey';
            columns: ['action_request_id'];
            isOneToOne: true;
            referencedRelation: 'government_action_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'government_action_audit_events_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'government_action_audit_events_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      government_action_requests: {
        Row: {
          action_type: string;
          actor_user_id: string;
          claimed_at: string;
          complaint_id: string;
          completed_at: string | null;
          from_status: string | null;
          id: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          request_id: string;
          response_payload: Json | null;
          state: string;
          to_status: string | null;
        };
        Insert: {
          action_type: string;
          actor_user_id: string;
          claimed_at?: string;
          complaint_id: string;
          completed_at?: string | null;
          from_status?: string | null;
          id?: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          request_id: string;
          response_payload?: Json | null;
          state?: string;
          to_status?: string | null;
        };
        Update: {
          action_type?: string;
          actor_user_id?: string;
          claimed_at?: string;
          complaint_id?: string;
          completed_at?: string | null;
          from_status?: string | null;
          id?: string;
          idempotency_key_hash?: string;
          request_fingerprint?: string;
          request_id?: string;
          response_payload?: Json | null;
          state?: string;
          to_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'government_action_requests_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      government_role_capabilities: {
        Row: {
          can_acknowledge: boolean;
          can_add_external_dependency: boolean;
          can_add_internal_note: boolean;
          can_add_work_reference: boolean;
          can_assign: boolean;
          can_manage_inspection: boolean;
          can_submit_resolution: boolean;
          can_transfer: boolean;
          can_update_status: boolean;
          can_upload_resolution_evidence: boolean;
          can_view: boolean;
          created_at: string;
          role_id: string;
          updated_at: string;
        };
        Insert: {
          can_acknowledge?: boolean;
          can_add_external_dependency?: boolean;
          can_add_internal_note?: boolean;
          can_add_work_reference?: boolean;
          can_assign?: boolean;
          can_manage_inspection?: boolean;
          can_submit_resolution?: boolean;
          can_transfer?: boolean;
          can_update_status?: boolean;
          can_upload_resolution_evidence?: boolean;
          can_view?: boolean;
          created_at?: string;
          role_id: string;
          updated_at?: string;
        };
        Update: {
          can_acknowledge?: boolean;
          can_add_external_dependency?: boolean;
          can_add_internal_note?: boolean;
          can_add_work_reference?: boolean;
          can_assign?: boolean;
          can_manage_inspection?: boolean;
          can_submit_resolution?: boolean;
          can_transfer?: boolean;
          can_update_status?: boolean;
          can_upload_resolution_evidence?: boolean;
          can_view?: boolean;
          created_at?: string;
          role_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      government_status_transition_rules: {
        Row: {
          action_type: string;
          created_at: string;
          from_status: string;
          to_status: string;
        };
        Insert: {
          action_type: string;
          created_at?: string;
          from_status: string;
          to_status: string;
        };
        Update: {
          action_type?: string;
          created_at?: string;
          from_status?: string;
          to_status?: string;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          aggregate_id: string;
          aggregate_type: string;
          complaint_id: string;
          created_at: string;
          event_type: string;
          id: string;
          occurred_at: string;
          payload: Json;
          status_history_id: string;
        };
        Insert: {
          aggregate_id: string;
          aggregate_type?: string;
          complaint_id: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          occurred_at: string;
          payload: Json;
          status_history_id: string;
        };
        Update: {
          aggregate_id?: string;
          aggregate_type?: string;
          complaint_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          payload?: Json;
          status_history_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_status_history_id_fkey';
            columns: ['status_history_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_status_history';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      action_capability: { Args: { p_action_type: string }; Returns: string };
      action_is_state_eligible: {
        Args: {
          p_action_type: string;
          p_complaint_id: string;
          p_status: string;
        };
        Returns: boolean;
      };
      actor_can_access_assignment: {
        Args: {
          p_actor_user_id: string;
          p_assignment_id: string;
          p_at?: string;
          p_capability: string;
          p_scope_role_assignment_id?: string;
        };
        Returns: boolean;
      };
      assignment_has_current_verified_officer: {
        Args: { p_assignment_id: string; p_at?: string };
        Returns: boolean;
      };
      assignment_summary: { Args: { p_assignment_id: string }; Returns: Json };
      current_action_request_id: { Args: never; Returns: string };
      is_verified_assignment_scope: {
        Args: {
          p_at: string;
          p_authority_department_id: string;
          p_authority_id: string;
          p_department_id: string;
          p_local_body_id: string;
          p_officer_assignment_id: string;
          p_officer_role_id: string;
          p_ward_id: string;
        };
        Returns: boolean;
      };
      role_capability_enabled: {
        Args: {
          capability: Database['complaints']['Tables']['government_role_capabilities']['Row'];
          capability_name: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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
      contact_channel_versions: {
        Row: {
          contact_channel_id: string;
          contact_value: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_complaint_delivery_approved: boolean;
          is_placeholder: boolean;
          last_verified: string | null;
          normalized_value: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_endpoint_id: string;
          source_evidence_id: string | null;
          source_record_locator: string;
          source_snapshot_id: string;
          source_url: string;
          status: string;
          sync_review_item_id: string | null;
          updated_at: string;
          verification_status: string;
          version: number;
        };
        Insert: {
          contact_channel_id: string;
          contact_value: string;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          is_complaint_delivery_approved?: boolean;
          is_placeholder?: boolean;
          last_verified?: string | null;
          normalized_value: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_endpoint_id: string;
          source_evidence_id?: string | null;
          source_record_locator: string;
          source_snapshot_id: string;
          source_url: string;
          status?: string;
          sync_review_item_id?: string | null;
          updated_at?: string;
          verification_status?: string;
          version: number;
        };
        Update: {
          contact_channel_id?: string;
          contact_value?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_complaint_delivery_approved?: boolean;
          is_placeholder?: boolean;
          last_verified?: string | null;
          normalized_value?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_endpoint_id?: string;
          source_evidence_id?: string | null;
          source_record_locator?: string;
          source_snapshot_id?: string;
          source_url?: string;
          status?: string;
          sync_review_item_id?: string | null;
          updated_at?: string;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_channel_versions_contact_channel_id_fkey';
            columns: ['contact_channel_id'];
            isOneToOne: false;
            referencedRelation: 'contact_channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channel_versions_contact_channel_id_fkey';
            columns: ['contact_channel_id'];
            isOneToOne: false;
            referencedRelation: 'current_verified_contacts';
            referencedColumns: ['contact_channel_id'];
          },
          {
            foreignKeyName: 'contact_channel_versions_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: false;
            referencedRelation: 'source_endpoints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channel_versions_source_evidence_id_fkey';
            columns: ['source_evidence_id'];
            isOneToOne: false;
            referencedRelation: 'source_evidence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channel_versions_source_snapshot_id_fkey';
            columns: ['source_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channel_versions_sync_review_item_id_fkey';
            columns: ['sync_review_item_id'];
            isOneToOne: false;
            referencedRelation: 'sync_review_items';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_channels: {
        Row: {
          authority_department_id: string | null;
          authority_id: string | null;
          channel_key: string;
          channel_type: string;
          created_at: string;
          emergency_contact_id: string | null;
          id: string;
          intended_use: string;
          is_placeholder: boolean;
          local_body_id: string | null;
          office_id: string | null;
          officer_assignment_id: string | null;
          officer_id: string | null;
          officer_role_id: string | null;
          purpose: string | null;
          status: string;
          updated_at: string;
          utility_id: string | null;
          visibility: string;
          ward_id: string | null;
        };
        Insert: {
          authority_department_id?: string | null;
          authority_id?: string | null;
          channel_key: string;
          channel_type: string;
          created_at?: string;
          emergency_contact_id?: string | null;
          id?: string;
          intended_use?: string;
          is_placeholder?: boolean;
          local_body_id?: string | null;
          office_id?: string | null;
          officer_assignment_id?: string | null;
          officer_id?: string | null;
          officer_role_id?: string | null;
          purpose?: string | null;
          status?: string;
          updated_at?: string;
          utility_id?: string | null;
          visibility?: string;
          ward_id?: string | null;
        };
        Update: {
          authority_department_id?: string | null;
          authority_id?: string | null;
          channel_key?: string;
          channel_type?: string;
          created_at?: string;
          emergency_contact_id?: string | null;
          id?: string;
          intended_use?: string;
          is_placeholder?: boolean;
          local_body_id?: string | null;
          office_id?: string | null;
          officer_assignment_id?: string | null;
          officer_id?: string | null;
          officer_role_id?: string | null;
          purpose?: string | null;
          status?: string;
          updated_at?: string;
          utility_id?: string | null;
          visibility?: string;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_channels_authority_department_id_fkey';
            columns: ['authority_department_id'];
            isOneToOne: false;
            referencedRelation: 'authority_departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_emergency_contact_id_fkey';
            columns: ['emergency_contact_id'];
            isOneToOne: false;
            referencedRelation: 'emergency_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_office_id_fkey';
            columns: ['office_id'];
            isOneToOne: false;
            referencedRelation: 'offices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_assignment_id_fkey';
            columns: ['officer_assignment_id'];
            isOneToOne: false;
            referencedRelation: 'officer_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_id_fkey';
            columns: ['officer_id'];
            isOneToOne: false;
            referencedRelation: 'officers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_role_id_fkey';
            columns: ['officer_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_utility_id_fkey';
            columns: ['utility_id'];
            isOneToOne: false;
            referencedRelation: 'utilities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
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
      raw_snapshots: {
        Row: {
          byte_size: number;
          created_at: string;
          etag: string | null;
          first_sync_run_id: string;
          http_status: number | null;
          id: string;
          media_type: string;
          previous_snapshot_id: string | null;
          retrieval_metadata: Json;
          retrieved_at: string;
          sha256: string;
          source_endpoint_id: string;
          source_last_modified_at: string | null;
          storage_bucket: string;
          storage_object_path: string;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          etag?: string | null;
          first_sync_run_id: string;
          http_status?: number | null;
          id?: string;
          media_type: string;
          previous_snapshot_id?: string | null;
          retrieval_metadata?: Json;
          retrieved_at: string;
          sha256: string;
          source_endpoint_id: string;
          source_last_modified_at?: string | null;
          storage_bucket?: string;
          storage_object_path: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          etag?: string | null;
          first_sync_run_id?: string;
          http_status?: number | null;
          id?: string;
          media_type?: string;
          previous_snapshot_id?: string | null;
          retrieval_metadata?: Json;
          retrieved_at?: string;
          sha256?: string;
          source_endpoint_id?: string;
          source_last_modified_at?: string | null;
          storage_bucket?: string;
          storage_object_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'raw_snapshots_first_sync_run_id_fkey';
            columns: ['first_sync_run_id'];
            isOneToOne: true;
            referencedRelation: 'sync_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'raw_snapshots_previous_snapshot_id_fkey';
            columns: ['previous_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'raw_snapshots_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: false;
            referencedRelation: 'source_endpoints';
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
      source_endpoints: {
        Row: {
          allowed_hosts: string[];
          approved_at: string | null;
          approved_by: string | null;
          approved_contract_sha256: string | null;
          authority_id: string | null;
          consecutive_failure_count: number;
          created_at: string;
          dataset_kind: string;
          disabled_until: string | null;
          endpoint_url: string | null;
          expected_media_types: string[];
          fetch_timeout_seconds: number;
          id: string;
          import_batch_id: string | null;
          is_placeholder: boolean;
          last_attempted_at: string | null;
          last_failed_at: string | null;
          last_failure_code: string | null;
          last_succeeded_at: string | null;
          last_verified_on: string | null;
          max_response_bytes: number;
          next_sync_at: string | null;
          parser_contract_version: string;
          parser_key: string;
          reference_source_id: string | null;
          refresh_interval: string | null;
          repository_path: string | null;
          retrieval_format: string;
          retrieval_method: string;
          secret_reference: string | null;
          source_contract_sha256: string;
          source_key: string;
          source_kind: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          allowed_hosts?: string[];
          approved_at?: string | null;
          approved_by?: string | null;
          approved_contract_sha256?: string | null;
          authority_id?: string | null;
          consecutive_failure_count?: number;
          created_at?: string;
          dataset_kind: string;
          disabled_until?: string | null;
          endpoint_url?: string | null;
          expected_media_types?: string[];
          fetch_timeout_seconds?: number;
          id?: string;
          import_batch_id?: string | null;
          is_placeholder?: boolean;
          last_attempted_at?: string | null;
          last_failed_at?: string | null;
          last_failure_code?: string | null;
          last_succeeded_at?: string | null;
          last_verified_on?: string | null;
          max_response_bytes?: number;
          next_sync_at?: string | null;
          parser_contract_version: string;
          parser_key: string;
          reference_source_id?: string | null;
          refresh_interval?: string | null;
          repository_path?: string | null;
          retrieval_format: string;
          retrieval_method: string;
          secret_reference?: string | null;
          source_contract_sha256: string;
          source_key: string;
          source_kind: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          allowed_hosts?: string[];
          approved_at?: string | null;
          approved_by?: string | null;
          approved_contract_sha256?: string | null;
          authority_id?: string | null;
          consecutive_failure_count?: number;
          created_at?: string;
          dataset_kind?: string;
          disabled_until?: string | null;
          endpoint_url?: string | null;
          expected_media_types?: string[];
          fetch_timeout_seconds?: number;
          id?: string;
          import_batch_id?: string | null;
          is_placeholder?: boolean;
          last_attempted_at?: string | null;
          last_failed_at?: string | null;
          last_failure_code?: string | null;
          last_succeeded_at?: string | null;
          last_verified_on?: string | null;
          max_response_bytes?: number;
          next_sync_at?: string | null;
          parser_contract_version?: string;
          parser_key?: string;
          reference_source_id?: string | null;
          refresh_interval?: string | null;
          repository_path?: string | null;
          retrieval_format?: string;
          retrieval_method?: string;
          secret_reference?: string | null;
          source_contract_sha256?: string;
          source_key?: string;
          source_kind?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'source_endpoints_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'source_endpoints_import_batch_id_fkey';
            columns: ['import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'import_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'source_endpoints_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      source_evidence: {
        Row: {
          created_at: string;
          evidence_kind: string;
          evidence_metadata: Json;
          extracted_value_sha256: string | null;
          id: string;
          raw_snapshot_id: string;
          source_endpoint_id: string;
          source_field_path: string | null;
          source_record_locator: string;
          sync_candidate_id: string | null;
        };
        Insert: {
          created_at?: string;
          evidence_kind: string;
          evidence_metadata?: Json;
          extracted_value_sha256?: string | null;
          id?: string;
          raw_snapshot_id: string;
          source_endpoint_id: string;
          source_field_path?: string | null;
          source_record_locator: string;
          sync_candidate_id?: string | null;
        };
        Update: {
          created_at?: string;
          evidence_kind?: string;
          evidence_metadata?: Json;
          extracted_value_sha256?: string | null;
          id?: string;
          raw_snapshot_id?: string;
          source_endpoint_id?: string;
          source_field_path?: string | null;
          source_record_locator?: string;
          sync_candidate_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'source_evidence_raw_snapshot_id_fkey';
            columns: ['raw_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'source_evidence_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: false;
            referencedRelation: 'source_endpoints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'source_evidence_sync_candidate_id_fkey';
            columns: ['sync_candidate_id'];
            isOneToOne: false;
            referencedRelation: 'sync_candidates';
            referencedColumns: ['id'];
          },
        ];
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
      sync_candidates: {
        Row: {
          alternative_target_record_ids: string[];
          created_at: string;
          entity_type: string;
          id: string;
          is_placeholder: boolean;
          match_confidence: number;
          match_evidence: Json;
          match_method: string;
          match_status: string;
          matched_record_id: string | null;
          matched_table: string | null;
          normalized_payload: Json | null;
          raw_payload: Json;
          raw_snapshot_id: string;
          source_record_key: string;
          source_record_locator: string;
          source_record_sha256: string;
          sync_run_id: string;
          updated_at: string;
          validation_messages: Json;
          validation_status: string;
        };
        Insert: {
          alternative_target_record_ids?: string[];
          created_at?: string;
          entity_type: string;
          id?: string;
          is_placeholder?: boolean;
          match_confidence?: number;
          match_evidence?: Json;
          match_method?: string;
          match_status?: string;
          matched_record_id?: string | null;
          matched_table?: string | null;
          normalized_payload?: Json | null;
          raw_payload: Json;
          raw_snapshot_id: string;
          source_record_key: string;
          source_record_locator: string;
          source_record_sha256: string;
          sync_run_id: string;
          updated_at?: string;
          validation_messages?: Json;
          validation_status?: string;
        };
        Update: {
          alternative_target_record_ids?: string[];
          created_at?: string;
          entity_type?: string;
          id?: string;
          is_placeholder?: boolean;
          match_confidence?: number;
          match_evidence?: Json;
          match_method?: string;
          match_status?: string;
          matched_record_id?: string | null;
          matched_table?: string | null;
          normalized_payload?: Json | null;
          raw_payload?: Json;
          raw_snapshot_id?: string;
          source_record_key?: string;
          source_record_locator?: string;
          source_record_sha256?: string;
          sync_run_id?: string;
          updated_at?: string;
          validation_messages?: Json;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_candidates_raw_snapshot_id_fkey';
            columns: ['raw_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_candidates_sync_run_id_fkey';
            columns: ['sync_run_id'];
            isOneToOne: false;
            referencedRelation: 'sync_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_change_items: {
        Row: {
          applied_at: string | null;
          applied_by: string | null;
          change_kind: string;
          created_at: string;
          detection_status: string;
          disposition: string;
          failure_code: string | null;
          failure_detail: string | null;
          id: string;
          proposed_changes: Json;
          requested_routing_eligibility: boolean;
          requested_verification_status: string;
          status: string;
          sync_candidate_id: string;
          target_record_id: string | null;
          target_table: string | null;
          updated_at: string;
        };
        Insert: {
          applied_at?: string | null;
          applied_by?: string | null;
          change_kind: string;
          created_at?: string;
          detection_status: string;
          disposition?: string;
          failure_code?: string | null;
          failure_detail?: string | null;
          id?: string;
          proposed_changes?: Json;
          requested_routing_eligibility?: boolean;
          requested_verification_status?: string;
          status?: string;
          sync_candidate_id: string;
          target_record_id?: string | null;
          target_table?: string | null;
          updated_at?: string;
        };
        Update: {
          applied_at?: string | null;
          applied_by?: string | null;
          change_kind?: string;
          created_at?: string;
          detection_status?: string;
          disposition?: string;
          failure_code?: string | null;
          failure_detail?: string | null;
          id?: string;
          proposed_changes?: Json;
          requested_routing_eligibility?: boolean;
          requested_verification_status?: string;
          status?: string;
          sync_candidate_id?: string;
          target_record_id?: string | null;
          target_table?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_change_items_sync_candidate_id_fkey';
            columns: ['sync_candidate_id'];
            isOneToOne: true;
            referencedRelation: 'sync_candidates';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_events: {
        Row: {
          created_at: string;
          event_detail: Json;
          event_type: string;
          id: string;
          occurred_at: string;
          severity: string;
          source_endpoint_id: string;
          sync_run_id: string;
        };
        Insert: {
          created_at?: string;
          event_detail?: Json;
          event_type: string;
          id?: string;
          occurred_at?: string;
          severity?: string;
          source_endpoint_id: string;
          sync_run_id: string;
        };
        Update: {
          created_at?: string;
          event_detail?: Json;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          severity?: string;
          source_endpoint_id?: string;
          sync_run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_events_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: false;
            referencedRelation: 'source_endpoints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_events_sync_run_id_fkey';
            columns: ['sync_run_id'];
            isOneToOne: false;
            referencedRelation: 'sync_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_review_events: {
        Row: {
          action: string;
          actor_user_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          occurred_at: string;
          routing_eligibility_decision: string | null;
          sync_review_item_id: string;
          verification_decision: string | null;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          occurred_at?: string;
          routing_eligibility_decision?: string | null;
          sync_review_item_id: string;
          verification_decision?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          occurred_at?: string;
          routing_eligibility_decision?: string | null;
          sync_review_item_id?: string;
          verification_decision?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_review_events_sync_review_item_id_fkey';
            columns: ['sync_review_item_id'];
            isOneToOne: false;
            referencedRelation: 'sync_review_items';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_review_items: {
        Row: {
          created_at: string;
          id: string;
          requested_at: string;
          review_reason: string;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_notes: string | null;
          sync_change_item_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          requested_at?: string;
          review_reason: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          sync_change_item_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          requested_at?: string;
          review_reason?: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          sync_change_item_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_review_items_sync_change_item_id_fkey';
            columns: ['sync_change_item_id'];
            isOneToOne: true;
            referencedRelation: 'sync_change_items';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_run_snapshots: {
        Row: {
          is_duplicate_content: boolean;
          linked_at: string;
          raw_snapshot_id: string;
          sync_run_id: string;
        };
        Insert: {
          is_duplicate_content?: boolean;
          linked_at?: string;
          raw_snapshot_id: string;
          sync_run_id: string;
        };
        Update: {
          is_duplicate_content?: boolean;
          linked_at?: string;
          raw_snapshot_id?: string;
          sync_run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_run_snapshots_raw_snapshot_id_fkey';
            columns: ['raw_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_run_snapshots_sync_run_id_fkey';
            columns: ['sync_run_id'];
            isOneToOne: true;
            referencedRelation: 'sync_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_runs: {
        Row: {
          changes_detected: number;
          completed_at: string | null;
          created_at: string;
          error_code: string | null;
          error_detail: string | null;
          id: string;
          records_discovered: number;
          records_rejected: number;
          records_valid: number;
          reviews_required: number;
          source_contract_snapshot: Json;
          source_endpoint_id: string;
          started_at: string | null;
          status: string;
          trigger_kind: string;
          updated_at: string;
        };
        Insert: {
          changes_detected?: number;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          records_discovered?: number;
          records_rejected?: number;
          records_valid?: number;
          reviews_required?: number;
          source_contract_snapshot: Json;
          source_endpoint_id: string;
          started_at?: string | null;
          status?: string;
          trigger_kind: string;
          updated_at?: string;
        };
        Update: {
          changes_detected?: number;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          records_discovered?: number;
          records_rejected?: number;
          records_valid?: number;
          reviews_required?: number;
          source_contract_snapshot?: Json;
          source_endpoint_id?: string;
          started_at?: string | null;
          status?: string;
          trigger_kind?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_runs_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: false;
            referencedRelation: 'source_endpoints';
            referencedColumns: ['id'];
          },
        ];
      };
      sync_scope_targets: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          authority_id: string;
          created_at: string;
          id: string;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          local_body_id: string | null;
          scope_group_key: string;
          scope_key: string;
          selection_notes: string | null;
          selection_rank: number | null;
          status: string;
          target_kind: string;
          updated_at: string;
          verification_status: string;
          ward_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          authority_id: string;
          created_at?: string;
          id?: string;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          scope_group_key: string;
          scope_key: string;
          selection_notes?: string | null;
          selection_rank?: number | null;
          status?: string;
          target_kind: string;
          updated_at?: string;
          verification_status?: string;
          ward_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          authority_id?: string;
          created_at?: string;
          id?: string;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          scope_group_key?: string;
          scope_key?: string;
          selection_notes?: string | null;
          selection_rank?: number | null;
          status?: string;
          target_kind?: string;
          updated_at?: string;
          verification_status?: string;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_scope_targets_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_scope_targets_local_body_authority_fkey';
            columns: ['local_body_id', 'authority_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id', 'authority_id'];
          },
          {
            foreignKeyName: 'sync_scope_targets_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_scope_targets_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_scope_targets_ward_local_body_fkey';
            columns: ['ward_id', 'local_body_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id', 'local_body_id'];
          },
        ];
      };
      sync_source_leases: {
        Row: {
          acquired_at: string;
          created_at: string;
          expires_at: string;
          heartbeat_at: string;
          lease_token: string;
          source_endpoint_id: string;
          sync_run_id: string;
          worker_id: string;
        };
        Insert: {
          acquired_at: string;
          created_at?: string;
          expires_at: string;
          heartbeat_at: string;
          lease_token: string;
          source_endpoint_id: string;
          sync_run_id: string;
          worker_id: string;
        };
        Update: {
          acquired_at?: string;
          created_at?: string;
          expires_at?: string;
          heartbeat_at?: string;
          lease_token?: string;
          source_endpoint_id?: string;
          sync_run_id?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sync_source_leases_source_endpoint_id_fkey';
            columns: ['source_endpoint_id'];
            isOneToOne: true;
            referencedRelation: 'source_endpoints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sync_source_leases_sync_run_id_fkey';
            columns: ['sync_run_id'];
            isOneToOne: true;
            referencedRelation: 'sync_runs';
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
      current_verified_contacts: {
        Row: {
          authority_department_id: string | null;
          authority_id: string | null;
          channel_key: string | null;
          channel_type: string | null;
          contact_channel_id: string | null;
          contact_channel_version_id: string | null;
          contact_value: string | null;
          effective_from: string | null;
          effective_to: string | null;
          emergency_contact_id: string | null;
          intended_use: string | null;
          is_complaint_delivery_approved: boolean | null;
          last_verified: string | null;
          local_body_id: string | null;
          normalized_value: string | null;
          office_id: string | null;
          officer_assignment_id: string | null;
          officer_id: string | null;
          officer_role_id: string | null;
          purpose: string | null;
          source_snapshot_id: string | null;
          source_url: string | null;
          utility_id: string | null;
          version: number | null;
          visibility: string | null;
          ward_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_channel_versions_source_snapshot_id_fkey';
            columns: ['source_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'raw_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_authority_department_id_fkey';
            columns: ['authority_department_id'];
            isOneToOne: false;
            referencedRelation: 'authority_departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_authority_id_fkey';
            columns: ['authority_id'];
            isOneToOne: false;
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_emergency_contact_id_fkey';
            columns: ['emergency_contact_id'];
            isOneToOne: false;
            referencedRelation: 'emergency_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_local_body_id_fkey';
            columns: ['local_body_id'];
            isOneToOne: false;
            referencedRelation: 'local_bodies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_office_id_fkey';
            columns: ['office_id'];
            isOneToOne: false;
            referencedRelation: 'offices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_assignment_id_fkey';
            columns: ['officer_assignment_id'];
            isOneToOne: false;
            referencedRelation: 'officer_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_id_fkey';
            columns: ['officer_id'];
            isOneToOne: false;
            referencedRelation: 'officers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_officer_role_id_fkey';
            columns: ['officer_role_id'];
            isOneToOne: false;
            referencedRelation: 'officer_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_utility_id_fkey';
            columns: ['utility_id'];
            isOneToOne: false;
            referencedRelation: 'utilities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_channels_ward_id_fkey';
            columns: ['ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
        ];
      };
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
      append_complaint_location_evidence: {
        Args: {
          p_accuracy_meters: number;
          p_actor_user_id: string;
          p_captured_at: string;
          p_device_id: string;
          p_device_recorded_at: string;
          p_draft_id: string;
          p_evidence_type: string;
          p_latitude: number;
          p_longitude: number;
          p_mock_location_detected: boolean;
          p_provider: string;
          p_verification_metadata?: Json;
        };
        Returns: string;
      };
      bootstrap_platform_administrator: {
        Args: { target_user_id: string };
        Returns: string;
      };
      claim_complaint_submission: {
        Args: {
          p_actor_user_id: string;
          p_draft_id: string;
          p_idempotency_key_hash: string;
          p_request_fingerprint: string;
        };
        Returns: {
          complaint_id: string;
          replayed: boolean;
          response_payload: Json;
          routing_request_id: string;
          state: string;
          submission_request_id: string;
        }[];
      };
      claim_due_governance_sync_sources: {
        Args: {
          p_lease_seconds?: number;
          p_limit?: number;
          p_worker_id: string;
        };
        Returns: {
          allowed_hosts: string[];
          endpoint_url: string;
          etag: string;
          expected_media_types: string[];
          fetch_timeout_seconds: number;
          last_modified: string;
          lease_token: string;
          max_response_bytes: number;
          run_id: string;
          source_endpoint_id: string;
          source_key: string;
        }[];
      };
      create_complaint_draft: {
        Args: {
          p_actor_user_id: string;
          p_asset_id?: string;
          p_category_id?: string;
          p_custom_attributes?: Json;
          p_description?: string;
          p_description_language?: string;
          p_idempotency_key_hash: string;
          p_request_fingerprint: string;
        };
        Returns: {
          created_at: string;
          draft_id: string;
          replayed: boolean;
          revision: number;
          status: string;
        }[];
      };
      discard_complaint_draft: {
        Args: {
          p_actor_user_id: string;
          p_draft_id: string;
          p_expected_revision: number;
        };
        Returns: {
          discarded_at: string;
          draft_id: string;
          revision: number;
          status: string;
        }[];
      };
      discover_routing_assets: {
        Args: {
          p_accuracy_meters: number;
          p_category_id: string;
          p_latitude: number;
          p_limit?: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          asset_id: string;
          asset_type_name: string;
          display_name: string;
          distance_meters: number;
        }[];
      };
      expire_government_resolution_evidence: {
        Args: { p_limit?: number };
        Returns: number;
      };
      fail_governance_sync_run: {
        Args: {
          p_error_code: string;
          p_error_detail: string;
          p_lease_token: string;
          p_run_id: string;
          p_source_endpoint_id: string;
        };
        Returns: undefined;
      };
      fail_government_resolution_evidence: {
        Args: { p_evidence_id: string; p_failure_code: string };
        Returns: {
          evidence_id: string;
          failure_code: string;
          upload_status: string;
        }[];
      };
      finalize_complaint_media: {
        Args: {
          p_actor_user_id: string;
          p_media_id: string;
          p_observed_byte_size: number;
          p_observed_mime_type: string;
          p_verified_sha256: string;
        };
        Returns: {
          finalized_at: string;
          media_id: string;
          moderation_status: string;
          processing_status: string;
          replayed: boolean;
          upload_status: string;
        }[];
      };
      finalize_government_resolution_evidence: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_evidence_id: string;
          p_expected_workflow_version: number;
          p_idempotency_key_hash: string;
          p_observed_byte_size: number;
          p_observed_mime_type: string;
          p_request_fingerprint: string;
          p_request_id: string;
          p_verified_sha256: string;
        };
        Returns: {
          captured_at: string;
          created_at: string;
          evidence_id: string;
          finalized_at: string;
          kind: string;
          observed_byte_size: number;
          observed_mime_type: string;
          replayed: boolean;
          upload_status: string;
          workflow_version: number;
        }[];
      };
      find_complaint_duplicate_candidates: {
        Args: {
          p_actor_user_id: string;
          p_checked_at?: string;
          p_draft_id: string;
          p_duplicate_policy_version_id: string;
        };
        Returns: {
          age_seconds: number;
          asset_id: string;
          candidate_complaint_id: string;
          candidate_submitted_at: string;
          category_id: string;
          category_name: string;
          complaint_number: string;
          description_similarity: number;
          distance_meters: number;
          matching_media_hashes: number;
          maximum_age_seconds: number;
          maximum_distance_meters: number;
          maximum_results: number;
          minimum_score: number;
          policy_id: string;
          policy_version: number;
          policy_version_id: string;
          public_status: string;
          weights: Json;
        }[];
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
      get_complaint_draft: {
        Args: { p_actor_user_id: string; p_draft_id: string };
        Returns: {
          asset_id: string;
          category_id: string;
          created_at: string;
          custom_attributes: Json;
          description: string;
          description_language: string;
          draft_id: string;
          expires_at: string;
          revision: number;
          selected_location_evidence_id: string;
          status: string;
          updated_at: string;
        }[];
      };
      get_complaint_duplicate_check: {
        Args: { p_actor_user_id: string; p_duplicate_check_run_id: string };
        Returns: {
          age_seconds: number;
          candidate_complaint_id: string;
          candidate_count: number;
          candidate_submitted_at: string;
          category_id: string;
          category_name: string;
          checked_at: string;
          complaint_number: string;
          distance_meters: number;
          duplicate_check_run_id: string;
          factor_summary: Json;
          maximum_age_seconds: number;
          maximum_distance_meters: number;
          maximum_results: number;
          minimum_score: number;
          policy_id: string;
          policy_version: number;
          policy_version_id: string;
          public_status: string;
          score: number;
          weights: Json;
        }[];
      };
      get_complaint_media_intent: {
        Args: { p_actor_user_id: string; p_media_id: string };
        Returns: {
          bucket_id: string;
          client_sha256: string;
          declared_byte_size: number;
          declared_mime_type: string;
          draft_id: string;
          duration_seconds: number;
          finalized_at: string;
          height_pixels: number;
          media_id: string;
          object_path: string;
          upload_expires_at: string;
          upload_status: string;
          width_pixels: number;
        }[];
      };
      get_complaint_timeline: {
        Args: { p_actor_user_id: string; p_complaint_id: string };
        Returns: {
          event_id: string;
          from_status: string;
          occurred_at: string;
          public_message: string;
          reason_code: string;
          sequence: number;
          to_status: string;
        }[];
      };
      get_government_complaint: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_scope_role_assignment_id?: string;
        };
        Returns: {
          accuracy_meters: number;
          allowed_actions: string[];
          allowed_status_transitions: string[];
          assignment_history: Json;
          category_id: string;
          category_name: string;
          complaint_id: string;
          complaint_number: string;
          current_assignment: Json;
          description: string;
          external_dependencies: Json;
          inspections: Json;
          internal_notes: Json;
          latitude: number;
          location_captured_at: string;
          location_provider: string;
          location_verification_score: number;
          location_verification_status: string;
          longitude: number;
          media: Json;
          queue_flags: Json;
          resolution_evidence: Json;
          routing_summary: Json;
          status: string;
          submitted_at: string;
          timeline: Json;
          updated_at: string;
          work_references: Json;
          workflow_version: number;
        }[];
      };
      get_government_resolution_evidence_object: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_evidence_id: string;
          p_purpose?: string;
          p_scope_role_assignment_id?: string;
        };
        Returns: {
          bucket_id: string;
          client_sha256: string;
          complaint_id: string;
          declared_byte_size: number;
          declared_mime_type: string;
          evidence_id: string;
          object_path: string;
          observed_byte_size: number;
          observed_mime_type: string;
          upload_expires_at: string;
          upload_status: string;
          workflow_version: number;
        }[];
      };
      get_owned_complaint: {
        Args: { p_actor_user_id: string; p_complaint_id: string };
        Returns: {
          accuracy_meters: number;
          asset_id: string;
          assignment_id: string;
          authority_department_id: string;
          authority_id: string;
          category_id: string;
          category_name: string;
          complaint_id: string;
          complaint_number: string;
          custom_attributes: Json;
          department_id: string;
          description: string;
          description_language: string;
          draft_id: string;
          latitude: number;
          local_body_id: string;
          location_captured_at: string;
          location_device_recorded_at: string;
          location_evidence_id: string;
          location_provider: string;
          location_verification_score: number;
          location_verification_status: string;
          longitude: number;
          mock_location_detected: boolean;
          officer_role_id: string;
          routing_decision_id: string;
          routing_request_id: string;
          status: string;
          submitted_at: string;
          updated_at: string;
          visibility: string;
          ward_id: string;
        }[];
      };
      get_routing_decision_replay: {
        Args: { p_actor_user_id: string; p_request_id: string };
        Returns: {
          accuracy_meters: number;
          ambiguity_count: number;
          asset_id: string;
          asset_match_distance_meters: number;
          asset_ownership_version_id: string;
          asset_type_id: string;
          asset_version_id: string;
          authority_department_id: string;
          captured_at: string;
          category_id: string;
          confidence_policy_version_id: string;
          confidence_score: number;
          decision_status: string;
          department_id: string;
          district_boundary_version_id: string;
          district_id: string;
          explanation_codes: string[];
          explanation_metadata: Json;
          fallback_depth: number;
          latitude: number;
          local_body_boundary_version_id: string;
          local_body_id: string;
          longitude: number;
          officer_assignment_id: string;
          officer_role_id: string;
          request_id: string;
          resolved_at: string;
          route_rule_id: string;
          route_rule_version_id: string;
          routing_decision_id: string;
          state_boundary_version_id: string;
          state_id: string;
          taluka_boundary_version_id: string;
          taluka_id: string;
          target_authority_id: string;
          ward_boundary_version_id: string;
          ward_id: string;
        }[];
      };
      heartbeat_governance_sync_lease: {
        Args: {
          p_extend_seconds?: number;
          p_lease_token: string;
          p_run_id: string;
        };
        Returns: string;
      };
      list_complaint_location_evidence: {
        Args: { p_actor_user_id: string; p_draft_id: string };
        Returns: {
          accuracy_meters: number;
          captured_at: string;
          created_at: string;
          device_recorded_at: string;
          evidence_type: string;
          latitude: number;
          location_evidence_id: string;
          longitude: number;
          mock_location_detected: boolean;
          provider: string;
          received_at: string;
          spoof_risk_status: string;
          verification_score: number;
          verification_status: string;
        }[];
      };
      list_complaint_media: {
        Args: { p_actor_user_id: string; p_draft_id: string };
        Returns: {
          bucket_id: string;
          capture_location_evidence_id: string;
          capture_source: string;
          captured_at: string;
          client_media_id: string;
          client_sha256: string;
          complaint_id: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          distance_to_complaint_meters: number;
          draft_id: string;
          duration_seconds: number;
          finalized_at: string;
          height_pixels: number;
          media_id: string;
          media_kind: string;
          moderation_status: string;
          object_path: string;
          processing_status: string;
          updated_at: string;
          upload_expires_at: string;
          upload_status: string;
          width_pixels: number;
        }[];
      };
      list_government_assignment_options: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_scope_role_assignment_id?: string;
        };
        Returns: {
          complaint_id: string;
          options: Json;
          workflow_version: number;
        }[];
      };
      list_government_complaints: {
        Args: {
          p_actor_user_id: string;
          p_authority_department_id?: string;
          p_before_id?: string;
          p_before_submitted_at?: string;
          p_category_id?: string;
          p_limit?: number;
          p_officer_assignment_id?: string;
          p_queue?: string;
          p_scope_role_assignment_id?: string;
          p_search?: string;
          p_statuses?: string[];
          p_submitted_from?: string;
          p_submitted_to?: string;
          p_ward_id?: string;
        };
        Returns: {
          category_id: string;
          category_name: string;
          complaint_id: string;
          complaint_number: string;
          current_assignment: Json;
          queue_flags: Json;
          status: string;
          submitted_at: string;
          updated_at: string;
          workflow_version: number;
        }[];
      };
      list_owned_complaints: {
        Args: {
          p_actor_user_id: string;
          p_before_id?: string;
          p_before_submitted_at?: string;
          p_limit?: number;
        };
        Returns: {
          authority_id: string;
          category_id: string;
          category_name: string;
          complaint_id: string;
          complaint_number: string;
          department_id: string;
          draft_id: string;
          local_body_id: string;
          status: string;
          submitted_at: string;
          updated_at: string;
          visibility: string;
          ward_id: string;
        }[];
      };
      list_routing_categories: {
        Args: { p_include_non_routable?: boolean };
        Returns: {
          category_code: string;
          category_id: string;
          category_name: string;
          classification_level: string;
          default_severity: string;
          description: string;
          domain_code: string;
          is_emergency: boolean;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          location_requirement: string;
          maximum_media_count: number;
          media_requirements: Json;
          minimum_media_count: number;
          parent_category_id: string;
          required_attributes: string[];
          requires_asset: boolean;
          requires_location: boolean;
          verification_status: string;
        }[];
      };
      perform_government_complaint_action: {
        Args: {
          p_action_type: string;
          p_actor_user_id: string;
          p_complaint_id: string;
          p_expected_workflow_version: number;
          p_idempotency_key_hash: string;
          p_payload?: Json;
          p_request_fingerprint: string;
          p_request_id: string;
        };
        Returns: {
          replayed: boolean;
          response_payload: Json;
        }[];
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
      record_complaint_duplicate_check: {
        Args: {
          p_actor_user_id: string;
          p_checked_at: string;
          p_draft_id: string;
          p_duplicate_policy_version_id: string;
          p_matches: Json;
          p_request_id: string;
          p_result_fingerprint: string;
        };
        Returns: string;
      };
      record_governance_sync_snapshot: {
        Args: {
          p_byte_size: number;
          p_etag: string;
          p_http_status: number;
          p_last_modified: string;
          p_lease_token: string;
          p_media_type: string;
          p_retrieved_at: string;
          p_run_id: string;
          p_sha256: string;
          p_source_endpoint_id: string;
          p_storage_bucket: string;
          p_storage_object_path: string;
        };
        Returns: {
          duplicate_content: boolean;
          raw_snapshot_id: string;
          unchanged_response: boolean;
        }[];
      };
      record_routing_decision: {
        Args: {
          p_accuracy_meters: number;
          p_actor_user_id: string;
          p_ambiguity_count?: number;
          p_asset_id?: string;
          p_asset_match_distance_meters?: number;
          p_asset_ownership_version_id?: string;
          p_asset_type_id?: string;
          p_asset_version_id?: string;
          p_authority_department_id?: string;
          p_captured_at: string;
          p_category_id: string;
          p_confidence_policy_version_id?: string;
          p_confidence_score?: number;
          p_decision_status: string;
          p_department_id?: string;
          p_district_boundary_version_id?: string;
          p_district_id?: string;
          p_explanation_codes?: string[];
          p_explanation_metadata?: Json;
          p_fallback_depth?: number;
          p_latitude: number;
          p_local_body_boundary_version_id?: string;
          p_local_body_id?: string;
          p_longitude: number;
          p_officer_assignment_id?: string;
          p_officer_role_id?: string;
          p_request_id: string;
          p_resolved_at: string;
          p_route_rule_id?: string;
          p_route_rule_version_id?: string;
          p_state_boundary_version_id?: string;
          p_state_id?: string;
          p_taluka_boundary_version_id?: string;
          p_taluka_id?: string;
          p_target_authority_id?: string;
          p_ward_boundary_version_id?: string;
          p_ward_id?: string;
        };
        Returns: string;
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
      report_routing_confidence_policy_conflicts: {
        Args: never;
        Returns: {
          category_id: string;
          conflict_effective_from: string;
          conflict_effective_to: string;
          left_asset_id: string;
          left_asset_type_id: string;
          left_confidence_policy_version_id: string;
          left_route_rule_id: string;
          left_route_rule_version_id: string;
          left_rule_code: string;
          left_scope_authority_id: string;
          left_scope_local_body_id: string;
          left_scope_ward_id: string;
          right_asset_id: string;
          right_asset_type_id: string;
          right_confidence_policy_version_id: string;
          right_route_rule_id: string;
          right_route_rule_version_id: string;
          right_rule_code: string;
          right_scope_authority_id: string;
          right_scope_local_body_id: string;
          right_scope_ward_id: string;
        }[];
      };
      reserve_complaint_media: {
        Args: {
          p_actor_user_id: string;
          p_capture_location_evidence_id?: string;
          p_capture_source: string;
          p_captured_at?: string;
          p_client_media_id: string;
          p_client_sha256: string;
          p_declared_byte_size: number;
          p_declared_mime_type: string;
          p_draft_id: string;
          p_duration_seconds?: number;
          p_height_pixels?: number;
          p_media_kind: string;
          p_width_pixels?: number;
        };
        Returns: {
          bucket_id: string;
          media_id: string;
          object_path: string;
          replayed: boolean;
          upload_expires_at: string;
          upload_status: string;
        }[];
      };
      reserve_government_resolution_evidence: {
        Args: {
          p_actor_user_id: string;
          p_byte_size: number;
          p_captured_at?: string;
          p_complaint_id: string;
          p_expected_workflow_version: number;
          p_idempotency_key_hash: string;
          p_kind: string;
          p_mime_type: string;
          p_request_fingerprint: string;
          p_request_id: string;
          p_sha256: string;
        };
        Returns: {
          bucket_id: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          evidence_id: string;
          kind: string;
          object_path: string;
          replayed: boolean;
          upload_expires_at: string;
          upload_status: string;
          workflow_version: number;
        }[];
      };
      resolve_jurisdiction_context: {
        Args: {
          p_accuracy_meters: number;
          p_latitude: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          district_boundary_version_id: string;
          district_id: string;
          evidence_metadata: Json;
          local_body_boundary_version_id: string;
          local_body_id: string;
          state_boundary_version_id: string;
          state_id: string;
          taluka_boundary_version_id: string;
          taluka_id: string;
          ward_boundary_version_id: string;
          ward_id: string;
        }[];
      };
      resolve_routing_candidates: {
        Args: {
          p_accuracy_meters: number;
          p_asset_id?: string;
          p_category_id: string;
          p_latitude: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          asset_id: string;
          asset_match_distance_meters: number;
          asset_ownership_version_id: string;
          asset_type_id: string;
          asset_version_id: string;
          authority_department_id: string;
          candidate_id: string;
          category_code: string;
          category_id: string;
          confidence_policy_id: string;
          confidence_policy_version: number;
          confidence_policy_version_id: string;
          confidence_weights: Json;
          department_id: string;
          district_boundary_version_id: string;
          district_id: string;
          explanation_metadata: Json;
          fallback_depth: number;
          fallback_path: string[];
          local_body_boundary_version_id: string;
          local_body_id: string;
          officer_assignment_id: string;
          officer_role_id: string;
          priority: number;
          route_rule_id: string;
          route_rule_version_id: string;
          routing_rule_code: string;
          state_boundary_version_id: string;
          state_id: string;
          taluka_boundary_version_id: string;
          taluka_id: string;
          target_authority_id: string;
          ward_boundary_version_id: string;
          ward_id: string;
        }[];
      };
      resolve_routing_policy_context: {
        Args: {
          p_category_id: string;
          p_local_body_id: string;
          p_resolved_at?: string;
          p_ward_id?: string;
        };
        Returns: {
          confidence_policy_id: string;
          confidence_policy_version: number;
          confidence_policy_version_id: string;
          confidence_weights: Json;
        }[];
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
      submit_complaint: {
        Args: {
          p_acknowledged_duplicate_suggestion_ids?: string[];
          p_actor_user_id: string;
          p_emergency_disclaimer_acknowledged?: boolean;
          p_routing_decision_id: string;
          p_submission_request_id: string;
        };
        Returns: {
          assignment_id: string;
          authority_id: string;
          complaint_id: string;
          complaint_number: string;
          department_id: string;
          draft_id: string;
          local_body_id: string;
          officer_role_id: string;
          replayed: boolean;
          routing_decision_id: string;
          status: string;
          submitted_at: string;
          ward_id: string;
        }[];
      };
      submit_complaint_phase4_impl: {
        Args: {
          p_acknowledged_duplicate_suggestion_ids?: string[];
          p_actor_user_id: string;
          p_emergency_disclaimer_acknowledged?: boolean;
          p_routing_decision_id: string;
          p_submission_request_id: string;
        };
        Returns: {
          assignment_id: string;
          authority_id: string;
          complaint_id: string;
          complaint_number: string;
          department_id: string;
          draft_id: string;
          local_body_id: string;
          officer_role_id: string;
          replayed: boolean;
          routing_decision_id: string;
          status: string;
          submitted_at: string;
          ward_id: string;
        }[];
      };
      update_complaint_draft: {
        Args: {
          p_actor_user_id: string;
          p_asset_id: string;
          p_category_id: string;
          p_custom_attributes: Json;
          p_description: string;
          p_description_language: string;
          p_draft_id: string;
          p_expected_revision: number;
          p_selected_location_evidence_id: string;
        };
        Returns: {
          draft_id: string;
          revision: number;
          status: string;
          updated_at: string;
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
  routing: {
    Tables: {
      asset_ownership_versions: {
        Row: {
          asset_id: string;
          authority_department_id: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          office_id: string | null;
          officer_role_id: string | null;
          owner_authority_id: string;
          ownership_key: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          asset_id: string;
          authority_department_id?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          office_id?: string | null;
          officer_role_id?: string | null;
          owner_authority_id: string;
          ownership_key: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          asset_id?: string;
          authority_department_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          office_id?: string | null;
          officer_role_id?: string | null;
          owner_authority_id?: string;
          ownership_key?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_ownership_versions_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_types: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          identifier_required: boolean;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          matching_distance_meters: number;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          identifier_required?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          matching_distance_meters?: number;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          identifier_required?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          matching_distance_meters?: number;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [];
      };
      asset_versions: {
        Row: {
          asset_id: string;
          attributes: Json;
          created_at: string;
          district_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          local_body_id: string | null;
          location: unknown;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
          ward_id: string | null;
        };
        Insert: {
          asset_id: string;
          attributes?: Json;
          created_at?: string;
          district_id?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          location: unknown;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
          ward_id?: string | null;
        };
        Update: {
          asset_id?: string;
          attributes?: Json;
          created_at?: string;
          district_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          local_body_id?: string | null;
          location?: unknown;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_versions_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          asset_key: string;
          asset_type_id: string;
          created_at: string;
          display_name: string | null;
          external_identifier: string | null;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          asset_key: string;
          asset_type_id: string;
          created_at?: string;
          display_name?: string | null;
          external_identifier?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          asset_key?: string;
          asset_type_id?: string;
          created_at?: string;
          display_name?: string | null;
          external_identifier?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_asset_type_id_fkey';
            columns: ['asset_type_id'];
            isOneToOne: false;
            referencedRelation: 'asset_types';
            referencedColumns: ['id'];
          },
        ];
      };
      category_aliases: {
        Row: {
          alias: string;
          alias_key: string;
          category_id: string;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          reference_source_id: string | null;
          source_routing_reference_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          alias: string;
          alias_key: string;
          category_id: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          reference_source_id?: string | null;
          source_routing_reference_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          alias?: string;
          alias_key?: string;
          category_id?: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          reference_source_id?: string | null;
          source_routing_reference_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_aliases_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      category_asset_types: {
        Row: {
          asset_type_id: string;
          category_id: string;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          match_priority: number;
          reference_source_id: string | null;
          requirement: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          asset_type_id: string;
          category_id: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          match_priority?: number;
          reference_source_id?: string | null;
          requirement?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          asset_type_id?: string;
          category_id?: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          match_priority?: number;
          reference_source_id?: string | null;
          requirement?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_asset_types_asset_type_id_fkey';
            columns: ['asset_type_id'];
            isOneToOne: false;
            referencedRelation: 'asset_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'category_asset_types_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      confidence_policies: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [];
      };
      confidence_policy_versions: {
        Row: {
          ambiguity_delta: number;
          automatic_threshold: number;
          category_id: string | null;
          confidence_policy_id: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          factors: Json;
          fallback_penalty_per_level: number;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          manual_review_threshold: number;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          ambiguity_delta: number;
          automatic_threshold: number;
          category_id?: string | null;
          confidence_policy_id: string;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          factors: Json;
          fallback_penalty_per_level: number;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          manual_review_threshold: number;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          ambiguity_delta?: number;
          automatic_threshold?: number;
          category_id?: string | null;
          confidence_policy_id?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          factors?: Json;
          fallback_penalty_per_level?: number;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          manual_review_threshold?: number;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'confidence_policy_versions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'confidence_policy_versions_confidence_policy_id_fkey';
            columns: ['confidence_policy_id'];
            isOneToOne: false;
            referencedRelation: 'confidence_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      duplicate_detection_policies: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [];
      };
      duplicate_detection_policy_versions: {
        Row: {
          category_id: string | null;
          created_at: string;
          duplicate_detection_policy_id: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          maximum_age_seconds: number;
          maximum_distance_meters: number;
          maximum_results: number;
          minimum_score: number;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
          weights: Json;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          duplicate_detection_policy_id: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          maximum_age_seconds: number;
          maximum_distance_meters: number;
          maximum_results: number;
          minimum_score: number;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
          weights: Json;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          duplicate_detection_policy_id?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          maximum_age_seconds?: number;
          maximum_distance_meters?: number;
          maximum_results?: number;
          minimum_score?: number;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
          weights?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'duplicate_detection_policy_ve_duplicate_detection_policy_i_fkey';
            columns: ['duplicate_detection_policy_id'];
            isOneToOne: false;
            referencedRelation: 'duplicate_detection_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'duplicate_detection_policy_versions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      issue_categories: {
        Row: {
          classification_level: string;
          code: string;
          created_at: string;
          default_severity: string;
          description: string | null;
          domain_id: string;
          id: string;
          is_emergency: boolean;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          location_requirement: string;
          location_verification_requirements: Json;
          maximum_media_count: number;
          media_requirements: Json;
          minimum_media_count: number;
          name: string;
          parent_category_id: string | null;
          reference_source_id: string | null;
          required_attributes: string[];
          requires_asset: boolean;
          requires_location: boolean;
          source_routing_reference_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          classification_level?: string;
          code: string;
          created_at?: string;
          default_severity?: string;
          description?: string | null;
          domain_id: string;
          id?: string;
          is_emergency?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          location_requirement?: string;
          location_verification_requirements?: Json;
          maximum_media_count?: number;
          media_requirements?: Json;
          minimum_media_count?: number;
          name: string;
          parent_category_id?: string | null;
          reference_source_id?: string | null;
          required_attributes?: string[];
          requires_asset?: boolean;
          requires_location?: boolean;
          source_routing_reference_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          classification_level?: string;
          code?: string;
          created_at?: string;
          default_severity?: string;
          description?: string | null;
          domain_id?: string;
          id?: string;
          is_emergency?: boolean;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          location_requirement?: string;
          location_verification_requirements?: Json;
          maximum_media_count?: number;
          media_requirements?: Json;
          minimum_media_count?: number;
          name?: string;
          parent_category_id?: string | null;
          reference_source_id?: string | null;
          required_attributes?: string[];
          requires_asset?: boolean;
          requires_location?: boolean;
          source_routing_reference_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'issue_categories_domain_id_fkey';
            columns: ['domain_id'];
            isOneToOne: false;
            referencedRelation: 'issue_domains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issue_categories_parent_category_id_fkey';
            columns: ['parent_category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      issue_domains: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [];
      };
      route_rule_versions: {
        Row: {
          asset_id: string | null;
          asset_requirement: string;
          asset_type_id: string | null;
          confidence_factor_codes: string[];
          confidence_policy_version_id: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          explanation_code: string;
          fallback_depth: number;
          fallback_path: string[];
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          priority: number;
          reference_source_id: string | null;
          requires_asset_owner: boolean;
          route_rule_id: string;
          routing_notes: string | null;
          scope_authority_id: string | null;
          scope_local_body_id: string | null;
          scope_ward_id: string | null;
          source_routing_reference_id: string | null;
          status: string;
          target_authority_id: string | null;
          target_department_id: string | null;
          target_office_id: string | null;
          target_officer_role_id: string | null;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          asset_id?: string | null;
          asset_requirement?: string;
          asset_type_id?: string | null;
          confidence_factor_codes?: string[];
          confidence_policy_version_id?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          explanation_code: string;
          fallback_depth?: number;
          fallback_path?: string[];
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          priority?: number;
          reference_source_id?: string | null;
          requires_asset_owner?: boolean;
          route_rule_id: string;
          routing_notes?: string | null;
          scope_authority_id?: string | null;
          scope_local_body_id?: string | null;
          scope_ward_id?: string | null;
          source_routing_reference_id?: string | null;
          status?: string;
          target_authority_id?: string | null;
          target_department_id?: string | null;
          target_office_id?: string | null;
          target_officer_role_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          asset_id?: string | null;
          asset_requirement?: string;
          asset_type_id?: string | null;
          confidence_factor_codes?: string[];
          confidence_policy_version_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          explanation_code?: string;
          fallback_depth?: number;
          fallback_path?: string[];
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          priority?: number;
          reference_source_id?: string | null;
          requires_asset_owner?: boolean;
          route_rule_id?: string;
          routing_notes?: string | null;
          scope_authority_id?: string | null;
          scope_local_body_id?: string | null;
          scope_ward_id?: string | null;
          source_routing_reference_id?: string | null;
          status?: string;
          target_authority_id?: string | null;
          target_department_id?: string | null;
          target_office_id?: string | null;
          target_officer_role_id?: string | null;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'route_rule_versions_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_rule_versions_asset_type_id_fkey';
            columns: ['asset_type_id'];
            isOneToOne: false;
            referencedRelation: 'asset_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_rule_versions_confidence_policy_version_id_fkey';
            columns: ['confidence_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'confidence_policy_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_rule_versions_route_rule_id_fkey';
            columns: ['route_rule_id'];
            isOneToOne: false;
            referencedRelation: 'route_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      route_rules: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          name: string;
          reference_source_id: string | null;
          rule_code: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name: string;
          reference_source_id?: string | null;
          rule_code: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          name?: string;
          reference_source_id?: string | null;
          rule_code?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_rules_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      routing_decisions: {
        Row: {
          accuracy_meters: number;
          actor_user_id: string;
          ambiguity_count: number;
          asset_id: string | null;
          asset_match_distance_meters: number | null;
          asset_ownership_version_id: string | null;
          asset_type_id: string | null;
          asset_version_id: string | null;
          authority_department_id: string | null;
          captured_at: string;
          category_id: string;
          confidence_policy_version_id: string | null;
          confidence_score: number | null;
          created_at: string;
          decision_status: string;
          department_id: string | null;
          district_boundary_version_id: string | null;
          district_id: string | null;
          explanation_codes: string[];
          explanation_metadata: Json;
          fallback_depth: number;
          id: string;
          input_location: unknown;
          local_body_boundary_version_id: string | null;
          local_body_id: string | null;
          officer_assignment_id: string | null;
          officer_role_id: string | null;
          request_id: string;
          resolved_at: string;
          route_rule_id: string | null;
          route_rule_version_id: string | null;
          state_boundary_version_id: string | null;
          state_id: string | null;
          taluka_boundary_version_id: string | null;
          taluka_id: string | null;
          target_authority_id: string | null;
          ward_boundary_version_id: string | null;
          ward_id: string | null;
        };
        Insert: {
          accuracy_meters: number;
          actor_user_id: string;
          ambiguity_count?: number;
          asset_id?: string | null;
          asset_match_distance_meters?: number | null;
          asset_ownership_version_id?: string | null;
          asset_type_id?: string | null;
          asset_version_id?: string | null;
          authority_department_id?: string | null;
          captured_at: string;
          category_id: string;
          confidence_policy_version_id?: string | null;
          confidence_score?: number | null;
          created_at?: string;
          decision_status: string;
          department_id?: string | null;
          district_boundary_version_id?: string | null;
          district_id?: string | null;
          explanation_codes?: string[];
          explanation_metadata?: Json;
          fallback_depth?: number;
          id?: string;
          input_location: unknown;
          local_body_boundary_version_id?: string | null;
          local_body_id?: string | null;
          officer_assignment_id?: string | null;
          officer_role_id?: string | null;
          request_id: string;
          resolved_at: string;
          route_rule_id?: string | null;
          route_rule_version_id?: string | null;
          state_boundary_version_id?: string | null;
          state_id?: string | null;
          taluka_boundary_version_id?: string | null;
          taluka_id?: string | null;
          target_authority_id?: string | null;
          ward_boundary_version_id?: string | null;
          ward_id?: string | null;
        };
        Update: {
          accuracy_meters?: number;
          actor_user_id?: string;
          ambiguity_count?: number;
          asset_id?: string | null;
          asset_match_distance_meters?: number | null;
          asset_ownership_version_id?: string | null;
          asset_type_id?: string | null;
          asset_version_id?: string | null;
          authority_department_id?: string | null;
          captured_at?: string;
          category_id?: string;
          confidence_policy_version_id?: string | null;
          confidence_score?: number | null;
          created_at?: string;
          decision_status?: string;
          department_id?: string | null;
          district_boundary_version_id?: string | null;
          district_id?: string | null;
          explanation_codes?: string[];
          explanation_metadata?: Json;
          fallback_depth?: number;
          id?: string;
          input_location?: unknown;
          local_body_boundary_version_id?: string | null;
          local_body_id?: string | null;
          officer_assignment_id?: string | null;
          officer_role_id?: string | null;
          request_id?: string;
          resolved_at?: string;
          route_rule_id?: string | null;
          route_rule_version_id?: string | null;
          state_boundary_version_id?: string | null;
          state_id?: string | null;
          taluka_boundary_version_id?: string | null;
          taluka_id?: string | null;
          target_authority_id?: string | null;
          ward_boundary_version_id?: string | null;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routing_decisions_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_asset_ownership_version_id_fkey';
            columns: ['asset_ownership_version_id'];
            isOneToOne: false;
            referencedRelation: 'asset_ownership_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_asset_type_id_fkey';
            columns: ['asset_type_id'];
            isOneToOne: false;
            referencedRelation: 'asset_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_asset_version_id_fkey';
            columns: ['asset_version_id'];
            isOneToOne: false;
            referencedRelation: 'asset_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'issue_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_confidence_policy_version_id_fkey';
            columns: ['confidence_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'confidence_policy_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_route_rule_id_fkey';
            columns: ['route_rule_id'];
            isOneToOne: false;
            referencedRelation: 'route_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routing_decisions_route_rule_version_id_fkey';
            columns: ['route_rule_version_id'];
            isOneToOne: false;
            referencedRelation: 'route_rule_versions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      resolve_jurisdiction_with_accuracy: {
        Args: {
          p_accuracy_meters: number;
          p_latitude: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          district_boundary_version_id: string;
          district_id: string;
          local_body_boundary_version_id: string;
          local_body_id: string;
          state_boundary_version_id: string;
          state_id: string;
          taluka_boundary_version_id: string;
          taluka_id: string;
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
  complaints: {
    Enums: {},
  },
  governance: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  routing: {
    Enums: {},
  },
} as const;
