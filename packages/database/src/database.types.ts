export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  complaints: {
    Tables: {
      citizen_action_audit_events: {
        Row: {
          action_request_id: string;
          action_type: string;
          actor_user_id: string;
          assignment_id: string | null;
          complaint_id: string;
          from_status: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          request_id: string;
          resolution_id: string | null;
          to_status: string;
        };
        Insert: {
          action_request_id: string;
          action_type: string;
          actor_user_id: string;
          assignment_id?: string | null;
          complaint_id: string;
          from_status: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id: string;
          resolution_id?: string | null;
          to_status: string;
        };
        Update: {
          action_request_id?: string;
          action_type?: string;
          actor_user_id?: string;
          assignment_id?: string | null;
          complaint_id?: string;
          from_status?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id?: string;
          resolution_id?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'citizen_action_audit_events_action_request_id_fkey';
            columns: ['action_request_id'];
            isOneToOne: true;
            referencedRelation: 'citizen_action_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'citizen_action_audit_events_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'citizen_action_audit_events_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'citizen_action_audit_events_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
        ];
      };
      citizen_action_requests: {
        Row: {
          action_type: string;
          actor_user_id: string;
          claimed_at: string;
          complaint_id: string;
          completed_at: string | null;
          expected_workflow_version: number;
          from_status: string;
          id: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          request_id: string;
          response_payload: Json | null;
          state: string;
          to_status: string;
        };
        Insert: {
          action_type: string;
          actor_user_id: string;
          claimed_at?: string;
          complaint_id: string;
          completed_at?: string | null;
          expected_workflow_version: number;
          from_status: string;
          id?: string;
          idempotency_key_hash: string;
          request_fingerprint: string;
          request_id: string;
          response_payload?: Json | null;
          state?: string;
          to_status: string;
        };
        Update: {
          action_type?: string;
          actor_user_id?: string;
          claimed_at?: string;
          complaint_id?: string;
          completed_at?: string | null;
          expected_workflow_version?: number;
          from_status?: string;
          id?: string;
          idempotency_key_hash?: string;
          request_fingerprint?: string;
          request_id?: string;
          response_payload?: Json | null;
          state?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'citizen_action_requests_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
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
      complaint_comments: {
        Row: {
          author_user_id: string;
          body: string;
          client_message_id: string;
          complaint_id: string;
          created_at: string;
          id: string;
          moderation_status: string;
          visibility: string;
        };
        Insert: {
          author_user_id: string;
          body: string;
          client_message_id: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          moderation_status?: string;
          visibility?: string;
        };
        Update: {
          author_user_id?: string;
          body?: string;
          client_message_id?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          moderation_status?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_comments_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
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
      complaint_duplicate_group_members: {
        Row: {
          complaint_id: string;
          created_at: string;
          duplicate_group_version_id: string;
          id: string;
          is_canonical: boolean;
          member_order: number;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          duplicate_group_version_id: string;
          id?: string;
          is_canonical?: boolean;
          member_order: number;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          duplicate_group_version_id?: string;
          id?: string;
          is_canonical?: boolean;
          member_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_duplicate_group_membe_duplicate_group_version_id_fkey';
            columns: ['duplicate_group_version_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_duplicate_group_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_duplicate_group_members_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_duplicate_group_versions: {
        Row: {
          canonical_complaint_id: string | null;
          created_at: string;
          group_id: string;
          id: string;
          request_id: string;
          reviewed_at: string;
          reviewed_by_user_id: string;
          state: string;
          version: number;
        };
        Insert: {
          canonical_complaint_id?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          request_id: string;
          reviewed_at?: string;
          reviewed_by_user_id: string;
          state: string;
          version: number;
        };
        Update: {
          canonical_complaint_id?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          request_id?: string;
          reviewed_at?: string;
          reviewed_by_user_id?: string;
          state?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_duplicate_group_versions_canonical_complaint_id_fkey';
            columns: ['canonical_complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_escalation_events: {
        Row: {
          assignment_id: string;
          complaint_id: string;
          escalation_type: string;
          id: string;
          observed_reopen_count: number;
          occurred_at: string;
          reopen_request_id: string;
          resolution_policy_version_id: string;
          threshold_reopen_count: number;
        };
        Insert: {
          assignment_id: string;
          complaint_id: string;
          escalation_type: string;
          id?: string;
          observed_reopen_count: number;
          occurred_at?: string;
          reopen_request_id: string;
          resolution_policy_version_id: string;
          threshold_reopen_count: number;
        };
        Update: {
          assignment_id?: string;
          complaint_id?: string;
          escalation_type?: string;
          id?: string;
          observed_reopen_count?: number;
          occurred_at?: string;
          reopen_request_id?: string;
          resolution_policy_version_id?: string;
          threshold_reopen_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_escalation_events_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_escalation_events_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_escalation_events_reopen_request_id_fkey';
            columns: ['reopen_request_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_reopen_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_escalation_events_resolution_policy_version_id_fkey';
            columns: ['resolution_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'resolution_policy_versions';
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
      complaint_feedback: {
        Row: {
          action_request_id: string;
          citizen_user_id: string;
          comment: string | null;
          communication_rating: number | null;
          complaint_id: string;
          created_at: string;
          id: string;
          outcome: string;
          quality_rating: number | null;
          resolution_id: string;
          resolution_policy_version_id: string;
          satisfaction_rating: number | null;
          speed_rating: number | null;
        };
        Insert: {
          action_request_id: string;
          citizen_user_id: string;
          comment?: string | null;
          communication_rating?: number | null;
          complaint_id: string;
          created_at?: string;
          id?: string;
          outcome: string;
          quality_rating?: number | null;
          resolution_id: string;
          resolution_policy_version_id: string;
          satisfaction_rating?: number | null;
          speed_rating?: number | null;
        };
        Update: {
          action_request_id?: string;
          citizen_user_id?: string;
          comment?: string | null;
          communication_rating?: number | null;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          outcome?: string;
          quality_rating?: number | null;
          resolution_id?: string;
          resolution_policy_version_id?: string;
          satisfaction_rating?: number | null;
          speed_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_feedback_action_request_id_fkey';
            columns: ['action_request_id'];
            isOneToOne: true;
            referencedRelation: 'citizen_action_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_feedback_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_feedback_resolution_complaint_fkey';
            columns: ['resolution_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'complaint_feedback_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_feedback_resolution_policy_version_id_fkey';
            columns: ['resolution_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'resolution_policy_versions';
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
      complaint_publication_projections: {
        Row: {
          approximate_location: unknown;
          category_id: string;
          category_name: string;
          complaint_id: string;
          created_at: string;
          event_at: string;
          id: string;
          local_body_id: string;
          location_precision_meters: number;
          public_id: string;
          public_status: string;
          public_summary: string;
          public_title: string;
          public_visibility_category_rule_id: string;
          public_visibility_policy_version_id: string;
          publication_state: string;
          published_at: string;
          review_id: string;
          source_updated_at: string;
          submitted_at: string;
          version: number;
          ward_boundary_version_id: string;
          ward_id: string;
        };
        Insert: {
          approximate_location: unknown;
          category_id: string;
          category_name: string;
          complaint_id: string;
          created_at?: string;
          event_at?: string;
          id?: string;
          local_body_id: string;
          location_precision_meters: number;
          public_id: string;
          public_status: string;
          public_summary: string;
          public_title: string;
          public_visibility_category_rule_id: string;
          public_visibility_policy_version_id: string;
          publication_state: string;
          published_at: string;
          review_id: string;
          source_updated_at: string;
          submitted_at: string;
          version: number;
          ward_boundary_version_id: string;
          ward_id: string;
        };
        Update: {
          approximate_location?: unknown;
          category_id?: string;
          category_name?: string;
          complaint_id?: string;
          created_at?: string;
          event_at?: string;
          id?: string;
          local_body_id?: string;
          location_precision_meters?: number;
          public_id?: string;
          public_status?: string;
          public_summary?: string;
          public_title?: string;
          public_visibility_category_rule_id?: string;
          public_visibility_policy_version_id?: string;
          publication_state?: string;
          published_at?: string;
          review_id?: string;
          source_updated_at?: string;
          submitted_at?: string;
          version?: number;
          ward_boundary_version_id?: string;
          ward_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_publication_project_public_visibility_category_r_fkey';
            columns: ['public_visibility_category_rule_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_category_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_publication_project_public_visibility_policy_ver_fkey';
            columns: ['public_visibility_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_policy_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_publication_projections_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_publication_projections_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_publication_reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_publication_reviews: {
        Row: {
          complaint_id: string;
          created_at: string;
          decision: string;
          id: string;
          public_summary: string | null;
          public_title: string | null;
          public_visibility_category_rule_id: string;
          public_visibility_policy_version_id: string;
          reason_code: string | null;
          request_id: string;
          reviewed_at: string;
          reviewer_user_id: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          decision: string;
          id?: string;
          public_summary?: string | null;
          public_title?: string | null;
          public_visibility_category_rule_id: string;
          public_visibility_policy_version_id: string;
          reason_code?: string | null;
          request_id: string;
          reviewed_at?: string;
          reviewer_user_id: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          decision?: string;
          id?: string;
          public_summary?: string | null;
          public_title?: string | null;
          public_visibility_category_rule_id?: string;
          public_visibility_policy_version_id?: string;
          reason_code?: string | null;
          request_id?: string;
          reviewed_at?: string;
          reviewer_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_publication_reviews_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_publication_reviews_public_visibility_category_r_fkey';
            columns: ['public_visibility_category_rule_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_category_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_publication_reviews_public_visibility_policy_ver_fkey';
            columns: ['public_visibility_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_reopen_evidence: {
        Row: {
          bucket_id: string;
          capture_accuracy_meters: number;
          capture_location: unknown;
          capture_provider: string;
          captured_at: string;
          client_sha256: string;
          complaint_id: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          duration_milliseconds: number | null;
          failure_code: string | null;
          finalized_at: string | null;
          height_pixels: number | null;
          id: string;
          kind: string;
          location_captured_at: string;
          location_device_recorded_at: string;
          mock_location_detected: boolean | null;
          object_path: string;
          observed_byte_size: number | null;
          observed_mime_type: string | null;
          resolution_id: string;
          updated_at: string;
          upload_expires_at: string;
          upload_status: string;
          uploader_user_id: string;
          verified_sha256: string | null;
          width_pixels: number | null;
        };
        Insert: {
          bucket_id?: string;
          capture_accuracy_meters: number;
          capture_location: unknown;
          capture_provider: string;
          captured_at: string;
          client_sha256: string;
          complaint_id: string;
          created_at?: string;
          declared_byte_size: number;
          declared_mime_type: string;
          duration_milliseconds?: number | null;
          failure_code?: string | null;
          finalized_at?: string | null;
          height_pixels?: number | null;
          id?: string;
          kind: string;
          location_captured_at: string;
          location_device_recorded_at: string;
          mock_location_detected?: boolean | null;
          object_path: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          resolution_id: string;
          updated_at?: string;
          upload_expires_at: string;
          upload_status?: string;
          uploader_user_id: string;
          verified_sha256?: string | null;
          width_pixels?: number | null;
        };
        Update: {
          bucket_id?: string;
          capture_accuracy_meters?: number;
          capture_location?: unknown;
          capture_provider?: string;
          captured_at?: string;
          client_sha256?: string;
          complaint_id?: string;
          created_at?: string;
          declared_byte_size?: number;
          declared_mime_type?: string;
          duration_milliseconds?: number | null;
          failure_code?: string | null;
          finalized_at?: string | null;
          height_pixels?: number | null;
          id?: string;
          kind?: string;
          location_captured_at?: string;
          location_device_recorded_at?: string;
          mock_location_detected?: boolean | null;
          object_path?: string;
          observed_byte_size?: number | null;
          observed_mime_type?: string | null;
          resolution_id?: string;
          updated_at?: string;
          upload_expires_at?: string;
          upload_status?: string;
          uploader_user_id?: string;
          verified_sha256?: string | null;
          width_pixels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_reopen_evidence_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_resolution_complaint_fkey';
            columns: ['resolution_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_reopen_evidence_links: {
        Row: {
          complaint_id: string;
          created_at: string;
          evidence_id: string;
          reopen_request_id: string;
          resolution_id: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          evidence_id: string;
          reopen_request_id: string;
          resolution_id: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          evidence_id?: string;
          reopen_request_id?: string;
          resolution_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_reopen_evidence_links_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_links_evidence_id_fkey';
            columns: ['evidence_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_reopen_evidence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_links_evidence_scope_fkey';
            columns: ['evidence_id', 'complaint_id', 'resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_reopen_evidence';
            referencedColumns: ['id', 'complaint_id', 'resolution_id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_links_reopen_request_id_fkey';
            columns: ['reopen_request_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_reopen_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_links_request_scope_fkey';
            columns: ['reopen_request_id', 'complaint_id', 'resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_reopen_requests';
            referencedColumns: ['id', 'complaint_id', 'resolution_id'];
          },
          {
            foreignKeyName: 'complaint_reopen_evidence_links_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_reopen_requests: {
        Row: {
          action_request_id: string;
          attempt_number: number;
          citizen_user_id: string;
          complaint_id: string;
          id: string;
          outcome_status: string;
          reason_code: string;
          reason_detail: string;
          requested_at: string;
          resolution_id: string;
          resolution_policy_version_id: string;
          window_closes_at: string;
        };
        Insert: {
          action_request_id: string;
          attempt_number: number;
          citizen_user_id: string;
          complaint_id: string;
          id?: string;
          outcome_status: string;
          reason_code: string;
          reason_detail: string;
          requested_at?: string;
          resolution_id: string;
          resolution_policy_version_id: string;
          window_closes_at: string;
        };
        Update: {
          action_request_id?: string;
          attempt_number?: number;
          citizen_user_id?: string;
          complaint_id?: string;
          id?: string;
          outcome_status?: string;
          reason_code?: string;
          reason_detail?: string;
          requested_at?: string;
          resolution_id?: string;
          resolution_policy_version_id?: string;
          window_closes_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_reopen_requests_action_request_id_fkey';
            columns: ['action_request_id'];
            isOneToOne: true;
            referencedRelation: 'citizen_action_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_requests_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_requests_resolution_complaint_fkey';
            columns: ['resolution_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'complaint_reopen_requests_resolution_id_fkey';
            columns: ['resolution_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_resolutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_reopen_requests_resolution_policy_version_id_fkey';
            columns: ['resolution_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'resolution_policy_versions';
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
          role: string;
        };
        Insert: {
          created_at?: string;
          evidence_id: string;
          resolution_id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          evidence_id?: string;
          resolution_id?: string;
          role?: string;
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
          completed_at: string | null;
          completion_accuracy_meters: number | null;
          completion_distance_to_complaint_meters: number | null;
          completion_location: unknown;
          completion_location_device_recorded_at: string | null;
          completion_mock_location_detected: boolean | null;
          completion_note: string;
          completion_provider: string | null;
          created_at: string;
          id: string;
          location_captured_at: string | null;
          public_message: string | null;
          submitted_by_user_id: string;
          version: number;
          work_reference_id: string | null;
        };
        Insert: {
          assignment_id: string;
          complaint_id: string;
          completed_at?: string | null;
          completion_accuracy_meters?: number | null;
          completion_distance_to_complaint_meters?: number | null;
          completion_location?: unknown;
          completion_location_device_recorded_at?: string | null;
          completion_mock_location_detected?: boolean | null;
          completion_note: string;
          completion_provider?: string | null;
          created_at?: string;
          id?: string;
          location_captured_at?: string | null;
          public_message?: string | null;
          submitted_by_user_id: string;
          version: number;
          work_reference_id?: string | null;
        };
        Update: {
          assignment_id?: string;
          complaint_id?: string;
          completed_at?: string | null;
          completion_accuracy_meters?: number | null;
          completion_distance_to_complaint_meters?: number | null;
          completion_location?: unknown;
          completion_location_device_recorded_at?: string | null;
          completion_mock_location_detected?: boolean | null;
          completion_note?: string;
          completion_provider?: string | null;
          created_at?: string;
          id?: string;
          location_captured_at?: string | null;
          public_message?: string | null;
          submitted_by_user_id?: string;
          version?: number;
          work_reference_id?: string | null;
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
          {
            foreignKeyName: 'complaint_resolutions_work_reference_fkey';
            columns: ['work_reference_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_work_references';
            referencedColumns: ['id', 'complaint_id'];
          },
        ];
      };
      complaint_sla_bindings: {
        Row: {
          assignment_id: string;
          candidate_count: number;
          complaint_id: string;
          created_at: string;
          cycle: number;
          evaluated_at: string;
          id: string;
          policy_version_id: string | null;
          reason_code: string;
          status: string;
        };
        Insert: {
          assignment_id: string;
          candidate_count: number;
          complaint_id: string;
          created_at?: string;
          cycle?: number;
          evaluated_at: string;
          id?: string;
          policy_version_id?: string | null;
          reason_code: string;
          status: string;
        };
        Update: {
          assignment_id?: string;
          candidate_count?: number;
          complaint_id?: string;
          created_at?: string;
          cycle?: number;
          evaluated_at?: string;
          id?: string;
          policy_version_id?: string | null;
          reason_code?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_sla_bindings_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_bindings_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_bindings_policy_version_id_fkey';
            columns: ['policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_sla_clocks: {
        Row: {
          assignment_id: string;
          binding_id: string;
          breached_at: string | null;
          calendar_version_id: string;
          category_override_id: string | null;
          complaint_id: string;
          completed_at: string | null;
          completion_status_history_id: string | null;
          created_at: string;
          cycle: number;
          external_dependency_segment: boolean;
          id: string;
          milestone: string;
          paused_at: string | null;
          policy_version_id: string;
          started_at: string;
          state: string;
          target_at: string;
          target_business_minutes: number;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          binding_id: string;
          breached_at?: string | null;
          calendar_version_id: string;
          category_override_id?: string | null;
          complaint_id: string;
          completed_at?: string | null;
          completion_status_history_id?: string | null;
          created_at?: string;
          cycle?: number;
          external_dependency_segment?: boolean;
          id?: string;
          milestone: string;
          paused_at?: string | null;
          policy_version_id: string;
          started_at: string;
          state?: string;
          target_at: string;
          target_business_minutes: number;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          binding_id?: string;
          breached_at?: string | null;
          calendar_version_id?: string;
          category_override_id?: string | null;
          complaint_id?: string;
          completed_at?: string | null;
          completion_status_history_id?: string | null;
          created_at?: string;
          cycle?: number;
          external_dependency_segment?: boolean;
          id?: string;
          milestone?: string;
          paused_at?: string | null;
          policy_version_id?: string;
          started_at?: string;
          state?: string;
          target_at?: string;
          target_business_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_sla_clocks_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_binding_id_fkey';
            columns: ['binding_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_sla_bindings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_calendar_version_id_fkey';
            columns: ['calendar_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_calendar_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_category_override_id_fkey';
            columns: ['category_override_id'];
            isOneToOne: false;
            referencedRelation: 'sla_category_overrides';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_completion_status_history_id_fkey';
            columns: ['completion_status_history_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_status_history';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_clocks_policy_version_id_fkey';
            columns: ['policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_sla_deadline_history: {
        Row: {
          clock_id: string;
          id: string;
          occurred_at: string;
          prior_target_at: string | null;
          reason_code: string;
          sequence: number;
          source_external_dependency_id: string | null;
          target_at: string;
        };
        Insert: {
          clock_id: string;
          id?: string;
          occurred_at?: string;
          prior_target_at?: string | null;
          reason_code: string;
          sequence: number;
          source_external_dependency_id?: string | null;
          target_at: string;
        };
        Update: {
          clock_id?: string;
          id?: string;
          occurred_at?: string;
          prior_target_at?: string | null;
          reason_code?: string;
          sequence?: number;
          source_external_dependency_id?: string | null;
          target_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_sla_deadline_histor_source_external_dependency_i_fkey';
            columns: ['source_external_dependency_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_external_dependencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_deadline_history_clock_id_fkey';
            columns: ['clock_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_sla_clocks';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_sla_escalation_events: {
        Row: {
          action_type: string;
          assignment_id: string;
          clock_id: string;
          complaint_id: string;
          escalation_job_id: string;
          escalation_level: number;
          escalation_rule_version_id: string;
          id: string;
          metadata: Json;
          milestone: string;
          occurred_at: string;
          prior_status: string;
          resulting_status: string;
        };
        Insert: {
          action_type: string;
          assignment_id: string;
          clock_id: string;
          complaint_id: string;
          escalation_job_id: string;
          escalation_level: number;
          escalation_rule_version_id: string;
          id?: string;
          metadata?: Json;
          milestone: string;
          occurred_at?: string;
          prior_status: string;
          resulting_status: string;
        };
        Update: {
          action_type?: string;
          assignment_id?: string;
          clock_id?: string;
          complaint_id?: string;
          escalation_job_id?: string;
          escalation_level?: number;
          escalation_rule_version_id?: string;
          id?: string;
          metadata?: Json;
          milestone?: string;
          occurred_at?: string;
          prior_status?: string;
          resulting_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_sla_escalation_events_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_escalation_events_clock_id_fkey';
            columns: ['clock_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_sla_clocks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_escalation_events_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_escalation_events_escalation_job_id_fkey';
            columns: ['escalation_job_id'];
            isOneToOne: true;
            referencedRelation: 'sla_escalation_jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_escalation_events_escalation_rule_version_id_fkey';
            columns: ['escalation_rule_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_escalation_rule_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      complaint_sla_pause_intervals: {
        Row: {
          clock_id: string;
          created_at: string;
          external_dependency_id: string;
          id: string;
          paused_at: string;
          paused_business_minutes: number | null;
          resumed_at: string | null;
        };
        Insert: {
          clock_id: string;
          created_at?: string;
          external_dependency_id: string;
          id?: string;
          paused_at: string;
          paused_business_minutes?: number | null;
          resumed_at?: string | null;
        };
        Update: {
          clock_id?: string;
          created_at?: string;
          external_dependency_id?: string;
          id?: string;
          paused_at?: string;
          paused_business_minutes?: number | null;
          resumed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'complaint_sla_pause_intervals_clock_id_fkey';
            columns: ['clock_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_sla_clocks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'complaint_sla_pause_intervals_external_dependency_id_fkey';
            columns: ['external_dependency_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_external_dependencies';
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
      conversation_rooms: {
        Row: {
          closed_at: string | null;
          complaint_id: string;
          created_at: string;
          id: string;
          status: string;
          visibility: string;
        };
        Insert: {
          closed_at?: string | null;
          complaint_id: string;
          created_at?: string;
          id?: string;
          status?: string;
          visibility?: string;
        };
        Update: {
          closed_at?: string | null;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          status?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_rooms_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: true;
            referencedRelation: 'complaints';
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
      kpi_calculation_runs: {
        Row: {
          attempt_count: number;
          authority_id: string;
          calculated_at: string | null;
          created_at: string;
          id: string;
          last_failure_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          next_attempt_at: string;
          request_fingerprint: string;
          requested_by_user_id: string | null;
          source_cutoff_at: string;
          state: string;
          updated_at: string;
          window_ended_at: string;
          window_started_at: string;
          worker_id: string | null;
        };
        Insert: {
          attempt_count?: number;
          authority_id: string;
          calculated_at?: string | null;
          created_at?: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at?: string;
          request_fingerprint: string;
          requested_by_user_id?: string | null;
          source_cutoff_at: string;
          state?: string;
          updated_at?: string;
          window_ended_at: string;
          window_started_at: string;
          worker_id?: string | null;
        };
        Update: {
          attempt_count?: number;
          authority_id?: string;
          calculated_at?: string | null;
          created_at?: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at?: string;
          request_fingerprint?: string;
          requested_by_user_id?: string | null;
          source_cutoff_at?: string;
          state?: string;
          updated_at?: string;
          window_ended_at?: string;
          window_started_at?: string;
          worker_id?: string | null;
        };
        Relationships: [];
      };
      kpi_definition_versions: {
        Row: {
          algorithm_version: string;
          created_at: string;
          definition_id: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          implementation_hash: string;
          version: number;
        };
        Insert: {
          algorithm_version: string;
          created_at?: string;
          definition_id: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          implementation_hash: string;
          version: number;
        };
        Update: {
          algorithm_version?: string;
          created_at?: string;
          definition_id?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          implementation_hash?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'kpi_definition_versions_definition_id_fkey';
            columns: ['definition_id'];
            isOneToOne: false;
            referencedRelation: 'kpi_definitions';
            referencedColumns: ['id'];
          },
        ];
      };
      kpi_definitions: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          unit: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          unit: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          unit?: string;
        };
        Relationships: [];
      };
      kpi_snapshots: {
        Row: {
          authority_department_id: string | null;
          authority_id: string;
          calculation_run_id: string;
          created_at: string;
          definition_version_id: string;
          denominator: number;
          exclusions: Json;
          id: string;
          local_body_id: string;
          numerator: number;
          sample_size: number;
          scope_type: string;
          segment: string;
          value: number | null;
          ward_id: string | null;
        };
        Insert: {
          authority_department_id?: string | null;
          authority_id: string;
          calculation_run_id: string;
          created_at?: string;
          definition_version_id: string;
          denominator: number;
          exclusions?: Json;
          id?: string;
          local_body_id: string;
          numerator: number;
          sample_size: number;
          scope_type: string;
          segment: string;
          value?: number | null;
          ward_id?: string | null;
        };
        Update: {
          authority_department_id?: string | null;
          authority_id?: string;
          calculation_run_id?: string;
          created_at?: string;
          definition_version_id?: string;
          denominator?: number;
          exclusions?: Json;
          id?: string;
          local_body_id?: string;
          numerator?: number;
          sample_size?: number;
          scope_type?: string;
          segment?: string;
          value?: number | null;
          ward_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'kpi_snapshots_calculation_run_id_fkey';
            columns: ['calculation_run_id'];
            isOneToOne: false;
            referencedRelation: 'kpi_calculation_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kpi_snapshots_definition_version_id_fkey';
            columns: ['definition_version_id'];
            isOneToOne: false;
            referencedRelation: 'kpi_definition_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      message_receipts: {
        Row: {
          complaint_id: string;
          created_at: string;
          event_id: string;
          id: string;
          read_at: string;
          read_through_created_at: string;
          read_through_message_id: string;
          request_id: string;
          room_id: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          read_at?: string;
          read_through_created_at: string;
          read_through_message_id: string;
          request_id: string;
          room_id: string;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          read_at?: string;
          read_through_created_at?: string;
          read_through_message_id?: string;
          request_id?: string;
          room_id?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'message_receipts_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_receipts_message_complaint_fkey';
            columns: ['read_through_message_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'message_receipts_read_through_message_id_fkey';
            columns: ['read_through_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_receipts_room_complaint_fkey';
            columns: ['room_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'conversation_rooms';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'message_receipts_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'conversation_rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          client_message_id: string;
          complaint_id: string;
          created_at: string;
          id: string;
          request_fingerprint: string;
          request_id: string;
          room_id: string;
          sender_user_id: string;
        };
        Insert: {
          body: string;
          client_message_id: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          request_fingerprint: string;
          request_id: string;
          room_id: string;
          sender_user_id: string;
        };
        Update: {
          body?: string;
          client_message_id?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          request_fingerprint?: string;
          request_id?: string;
          room_id?: string;
          sender_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_room_complaint_fkey';
            columns: ['room_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'conversation_rooms';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'conversation_rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          attempt_count: number;
          channel: string;
          created_at: string;
          delivered_at: string | null;
          destination_key: string;
          device_id: string | null;
          event_name: string;
          id: string;
          last_failure_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          leased_by: string | null;
          next_attempt_at: string;
          notification_id: string;
          state: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          channel: string;
          created_at?: string;
          delivered_at?: string | null;
          destination_key: string;
          device_id?: string | null;
          event_name: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          leased_by?: string | null;
          next_attempt_at?: string;
          notification_id: string;
          state?: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          channel?: string;
          created_at?: string;
          delivered_at?: string | null;
          destination_key?: string;
          device_id?: string | null;
          event_name?: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          leased_by?: string | null;
          next_attempt_at?: string;
          notification_id?: string;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_delivery_attempts: {
        Row: {
          attempt_number: number;
          claim_token: string;
          delivered_socket_count: number | null;
          delivery_id: string;
          event_type: string;
          failure_code: string | null;
          id: string;
          occurred_at: string;
          worker_id: string;
        };
        Insert: {
          attempt_number: number;
          claim_token: string;
          delivered_socket_count?: number | null;
          delivery_id: string;
          event_type: string;
          failure_code?: string | null;
          id?: string;
          occurred_at?: string;
          worker_id: string;
        };
        Update: {
          attempt_number?: number;
          claim_token?: string;
          delivered_socket_count?: number | null;
          delivery_id?: string;
          event_type?: string;
          failure_code?: string | null;
          id?: string;
          occurred_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_delivery_attempts_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'notification_deliveries';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_outbox: {
        Row: {
          aggregate_id: string;
          aggregate_type: string;
          assignment_id: string | null;
          complaint_id: string;
          created_at: string;
          event_type: string;
          id: string;
          message_id: string | null;
          occurred_at: string;
          payload: Json;
          status_history_id: string | null;
        };
        Insert: {
          aggregate_id: string;
          aggregate_type?: string;
          assignment_id?: string | null;
          complaint_id: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          message_id?: string | null;
          occurred_at: string;
          payload: Json;
          status_history_id?: string | null;
        };
        Update: {
          aggregate_id?: string;
          aggregate_type?: string;
          assignment_id?: string | null;
          complaint_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          message_id?: string | null;
          occurred_at?: string;
          payload?: Json;
          status_history_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: true;
            referencedRelation: 'complaint_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: true;
            referencedRelation: 'messages';
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
      notification_outbox_jobs: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          last_failure_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          next_attempt_at: string;
          outbox_id: string;
          state: string;
          updated_at: string;
          worker_id: string | null;
        };
        Insert: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at?: string;
          outbox_id: string;
          state?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at?: string;
          outbox_id?: string;
          state?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_jobs_outbox_id_fkey';
            columns: ['outbox_id'];
            isOneToOne: true;
            referencedRelation: 'notification_outbox';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          complaint_id: string;
          created_at: string;
          event_type: string;
          id: string;
          outbox_id: string;
          payload: Json;
          read_at: string | null;
          recipient_user_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          complaint_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          outbox_id: string;
          payload: Json;
          read_at?: string | null;
          recipient_user_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          complaint_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          outbox_id?: string;
          payload?: Json;
          read_at?: string | null;
          recipient_user_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_outbox_complaint_fkey';
            columns: ['outbox_id', 'complaint_id'];
            isOneToOne: false;
            referencedRelation: 'notification_outbox';
            referencedColumns: ['id', 'complaint_id'];
          },
          {
            foreignKeyName: 'notifications_outbox_id_fkey';
            columns: ['outbox_id'];
            isOneToOne: false;
            referencedRelation: 'notification_outbox';
            referencedColumns: ['id'];
          },
        ];
      };
      public_media_derivatives: {
        Row: {
          bucket_id: string | null;
          byte_size: number | null;
          complaint_id: string;
          complaint_media_id: string | null;
          created_at: string;
          derivative_kind: string;
          id: string;
          mime_type: string | null;
          moderation_status: string;
          object_path: string | null;
          processing_status: string;
          publication_status: string;
          reopen_evidence_id: string | null;
          resolution_evidence_id: string | null;
          verified_sha256: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          byte_size?: number | null;
          complaint_id: string;
          complaint_media_id?: string | null;
          created_at?: string;
          derivative_kind: string;
          id?: string;
          mime_type?: string | null;
          moderation_status?: string;
          object_path?: string | null;
          processing_status?: string;
          publication_status?: string;
          reopen_evidence_id?: string | null;
          resolution_evidence_id?: string | null;
          verified_sha256?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          byte_size?: number | null;
          complaint_id?: string;
          complaint_media_id?: string | null;
          created_at?: string;
          derivative_kind?: string;
          id?: string;
          mime_type?: string | null;
          moderation_status?: string;
          object_path?: string | null;
          processing_status?: string;
          publication_status?: string;
          reopen_evidence_id?: string | null;
          resolution_evidence_id?: string | null;
          verified_sha256?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_media_derivatives_complaint_id_fkey';
            columns: ['complaint_id'];
            isOneToOne: false;
            referencedRelation: 'complaints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_media_derivatives_complaint_media_id_fkey';
            columns: ['complaint_media_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_media_derivatives_reopen_evidence_id_fkey';
            columns: ['reopen_evidence_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_reopen_evidence';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_media_derivatives_resolution_evidence_id_fkey';
            columns: ['resolution_evidence_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_resolution_evidence';
            referencedColumns: ['id'];
          },
        ];
      };
      public_visibility_category_rules: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          processed_media_allowed: boolean;
          public_visibility_policy_version_id: string;
          publication_allowed: boolean;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          processed_media_allowed?: boolean;
          public_visibility_policy_version_id: string;
          publication_allowed?: boolean;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          processed_media_allowed?: boolean;
          public_visibility_policy_version_id?: string;
          publication_allowed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'public_visibility_category_ru_public_visibility_policy_ver_fkey';
            columns: ['public_visibility_policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      public_visibility_policies: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          local_body_id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          local_body_id: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          local_body_id?: string;
          name?: string;
        };
        Relationships: [];
      };
      public_visibility_policy_versions: {
        Row: {
          allowed_complaint_statuses: string[];
          approved_at: string | null;
          approved_by_user_id: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          minimum_hotspot_complaint_count: number;
          public_visibility_policy_id: string;
          status: string;
          version: number;
        };
        Insert: {
          allowed_complaint_statuses: string[];
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          minimum_hotspot_complaint_count?: number;
          public_visibility_policy_id: string;
          status?: string;
          version: number;
        };
        Update: {
          allowed_complaint_statuses?: string[];
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          minimum_hotspot_complaint_count?: number;
          public_visibility_policy_id?: string;
          status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'public_visibility_policy_versi_public_visibility_policy_id_fkey';
            columns: ['public_visibility_policy_id'];
            isOneToOne: false;
            referencedRelation: 'public_visibility_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      resolution_policies: {
        Row: {
          authority_id: string | null;
          category_id: string | null;
          code: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          authority_id?: string | null;
          category_id?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          authority_id?: string | null;
          category_id?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resolution_policy_versions: {
        Row: {
          allowed_reopen_reason_codes: string[];
          approved_at: string | null;
          approved_by_user_id: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          eligible_feedback_statuses: string[];
          eligible_reopen_statuses: string[];
          feedback_window_seconds: number;
          id: string;
          max_reopen_attempts: number;
          rating_maximum: number;
          rating_minimum: number;
          ratings_required: boolean;
          reopen_evidence_required: boolean;
          reopen_window_seconds: number;
          repeat_escalation_threshold: number;
          resolution_policy_id: string;
          status: string;
          version: number;
        };
        Insert: {
          allowed_reopen_reason_codes: string[];
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          eligible_feedback_statuses: string[];
          eligible_reopen_statuses: string[];
          feedback_window_seconds: number;
          id?: string;
          max_reopen_attempts: number;
          rating_maximum: number;
          rating_minimum: number;
          ratings_required?: boolean;
          reopen_evidence_required?: boolean;
          reopen_window_seconds: number;
          repeat_escalation_threshold: number;
          resolution_policy_id: string;
          status?: string;
          version: number;
        };
        Update: {
          allowed_reopen_reason_codes?: string[];
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          eligible_feedback_statuses?: string[];
          eligible_reopen_statuses?: string[];
          feedback_window_seconds?: number;
          id?: string;
          max_reopen_attempts?: number;
          rating_maximum?: number;
          rating_minimum?: number;
          ratings_required?: boolean;
          reopen_evidence_required?: boolean;
          reopen_window_seconds?: number;
          repeat_escalation_threshold?: number;
          resolution_policy_id?: string;
          status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'resolution_policy_versions_resolution_policy_id_fkey';
            columns: ['resolution_policy_id'];
            isOneToOne: false;
            referencedRelation: 'resolution_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      room_members: {
        Row: {
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          member_type: string;
          membership_source: string;
          role_assignment_id: string | null;
          room_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          member_type: string;
          membership_source: string;
          role_assignment_id?: string | null;
          room_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          member_type?: string;
          membership_source?: string;
          role_assignment_id?: string | null;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'conversation_rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_calendar_exceptions: {
        Row: {
          calendar_version_id: string;
          closes_at: string | null;
          created_at: string;
          exception_date: string;
          id: string;
          is_working_day: boolean;
          label: string;
          opens_at: string | null;
        };
        Insert: {
          calendar_version_id: string;
          closes_at?: string | null;
          created_at?: string;
          exception_date: string;
          id?: string;
          is_working_day: boolean;
          label: string;
          opens_at?: string | null;
        };
        Update: {
          calendar_version_id?: string;
          closes_at?: string | null;
          created_at?: string;
          exception_date?: string;
          id?: string;
          is_working_day?: boolean;
          label?: string;
          opens_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_calendar_exceptions_calendar_version_id_fkey';
            columns: ['calendar_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_calendar_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_calendar_versions: {
        Row: {
          approved_at: string | null;
          approved_by_user_id: string | null;
          calendar_id: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          source_url: string | null;
          status: string;
          timezone_name: string;
          verification_status: string;
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          calendar_id: string;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          source_url?: string | null;
          status?: string;
          timezone_name: string;
          verification_status?: string;
          version: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          calendar_id?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          source_url?: string | null;
          status?: string;
          timezone_name?: string;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_calendar_versions_calendar_id_fkey';
            columns: ['calendar_id'];
            isOneToOne: false;
            referencedRelation: 'sla_calendars';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_calendar_working_periods: {
        Row: {
          calendar_version_id: string;
          closes_at: string;
          created_at: string;
          id: string;
          iso_weekday: number;
          opens_at: string;
          period_sequence: number;
        };
        Insert: {
          calendar_version_id: string;
          closes_at: string;
          created_at?: string;
          id?: string;
          iso_weekday: number;
          opens_at: string;
          period_sequence?: number;
        };
        Update: {
          calendar_version_id?: string;
          closes_at?: string;
          created_at?: string;
          id?: string;
          iso_weekday?: number;
          opens_at?: string;
          period_sequence?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_calendar_working_periods_calendar_version_id_fkey';
            columns: ['calendar_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_calendar_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_calendars: {
        Row: {
          authority_id: string;
          code: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          authority_id: string;
          code: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          authority_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      sla_category_overrides: {
        Row: {
          acknowledgement_business_minutes: number | null;
          category_id: string;
          created_at: string;
          id: string;
          inspection_business_minutes: number | null;
          policy_version_id: string;
          resolution_business_minutes: number | null;
        };
        Insert: {
          acknowledgement_business_minutes?: number | null;
          category_id: string;
          created_at?: string;
          id?: string;
          inspection_business_minutes?: number | null;
          policy_version_id: string;
          resolution_business_minutes?: number | null;
        };
        Update: {
          acknowledgement_business_minutes?: number | null;
          category_id?: string;
          created_at?: string;
          id?: string;
          inspection_business_minutes?: number | null;
          policy_version_id?: string;
          resolution_business_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_category_overrides_policy_version_id_fkey';
            columns: ['policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_escalation_jobs: {
        Row: {
          attempt_count: number;
          clock_id: string;
          completed_at: string | null;
          created_at: string;
          due_at: string;
          escalation_rule_version_id: string;
          id: string;
          last_failure_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          next_attempt_at: string;
          state: string;
          updated_at: string;
          worker_id: string | null;
        };
        Insert: {
          attempt_count?: number;
          clock_id: string;
          completed_at?: string | null;
          created_at?: string;
          due_at: string;
          escalation_rule_version_id: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at: string;
          state?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Update: {
          attempt_count?: number;
          clock_id?: string;
          completed_at?: string | null;
          created_at?: string;
          due_at?: string;
          escalation_rule_version_id?: string;
          id?: string;
          last_failure_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          next_attempt_at?: string;
          state?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_escalation_jobs_clock_id_fkey';
            columns: ['clock_id'];
            isOneToOne: false;
            referencedRelation: 'complaint_sla_clocks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sla_escalation_jobs_escalation_rule_version_id_fkey';
            columns: ['escalation_rule_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_escalation_rule_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_escalation_rule_versions: {
        Row: {
          action_type: string;
          approved_at: string | null;
          approved_by_user_id: string | null;
          business_minutes_after_target: number;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          escalation_level: number;
          escalation_rule_id: string;
          id: string;
          milestone: string;
          policy_version_id: string;
          source_url: string | null;
          status: string;
          target_officer_role_id: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          action_type: string;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          business_minutes_after_target?: number;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          escalation_level: number;
          escalation_rule_id: string;
          id?: string;
          milestone: string;
          policy_version_id: string;
          source_url?: string | null;
          status?: string;
          target_officer_role_id?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          action_type?: string;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          business_minutes_after_target?: number;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          escalation_level?: number;
          escalation_rule_id?: string;
          id?: string;
          milestone?: string;
          policy_version_id?: string;
          source_url?: string | null;
          status?: string;
          target_officer_role_id?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_escalation_rule_versions_escalation_rule_id_fkey';
            columns: ['escalation_rule_id'];
            isOneToOne: false;
            referencedRelation: 'sla_escalation_rules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sla_escalation_rule_versions_policy_version_id_fkey';
            columns: ['policy_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policy_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_escalation_rules: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          policy_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          policy_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          policy_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_escalation_rules_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_policies: {
        Row: {
          authority_id: string;
          code: string;
          created_at: string;
          id: string;
          local_body_id: string | null;
          name: string;
        };
        Insert: {
          authority_id: string;
          code: string;
          created_at?: string;
          id?: string;
          local_body_id?: string | null;
          name: string;
        };
        Update: {
          authority_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          local_body_id?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      sla_policy_versions: {
        Row: {
          acknowledgement_business_minutes: number;
          approved_at: string | null;
          approved_by_user_id: string | null;
          calendar_version_id: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          inspection_business_minutes: number | null;
          pause_for_external_dependencies: boolean;
          policy_id: string;
          resolution_business_minutes: number;
          resolution_completion_status: string;
          source_url: string | null;
          status: string;
          verification_status: string;
          version: number;
        };
        Insert: {
          acknowledgement_business_minutes: number;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          calendar_version_id: string;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          inspection_business_minutes?: number | null;
          pause_for_external_dependencies?: boolean;
          policy_id: string;
          resolution_business_minutes: number;
          resolution_completion_status: string;
          source_url?: string | null;
          status?: string;
          verification_status?: string;
          version: number;
        };
        Update: {
          acknowledgement_business_minutes?: number;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          calendar_version_id?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          inspection_business_minutes?: number | null;
          pause_for_external_dependencies?: boolean;
          policy_id?: string;
          resolution_business_minutes?: number;
          resolution_completion_status?: string;
          source_url?: string | null;
          status?: string;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sla_policy_versions_calendar_version_id_fkey';
            columns: ['calendar_version_id'];
            isOneToOne: false;
            referencedRelation: 'sla_calendar_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sla_policy_versions_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policies';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accountability_resolution_payload: {
        Args: {
          p_complaint_id: string;
          p_include_completion_note: boolean;
          p_resolution_id: string;
        };
        Returns: Json;
      };
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
      actor_can_communicate: {
        Args: { p_actor_user_id: string; p_at?: string; p_complaint_id: string };
        Returns: boolean;
      };
      actor_can_review_publication: {
        Args: { p_actor_user_id: string; p_authority_id: string };
        Returns: boolean;
      };
      actor_is_platform_admin: {
        Args: { p_actor_user_id: string; p_at?: string };
        Returns: boolean;
      };
      add_sla_business_minutes: {
        Args: {
          p_business_minutes: number;
          p_calendar_version_id: string;
          p_started_at: string;
        };
        Returns: string;
      };
      assignment_delivery_readiness: {
        Args: { p_assignment_id: string };
        Returns: Json;
      };
      assignment_has_current_verified_officer: {
        Args: { p_assignment_id: string; p_at?: string };
        Returns: boolean;
      };
      assignment_summary: { Args: { p_assignment_id: string }; Returns: Json };
      complaint_matches_kpi_scope: {
        Args: {
          p_authority_id: string;
          p_complaint_id: string;
          p_scope_id: string;
          p_scope_type: string;
          p_source_cutoff_at: string;
        };
        Returns: boolean;
      };
      complaint_matches_kpi_segment: {
        Args: {
          p_complaint_id: string;
          p_segment: string;
          p_source_cutoff_at: string;
        };
        Returns: boolean;
      };
      complaint_status_at: {
        Args: { p_complaint_id: string; p_source_cutoff_at: string };
        Returns: string;
      };
      current_action_request_id: { Args: never; Returns: string };
      current_citizen_action_request_id: { Args: never; Returns: string };
      current_public_complaint_projections: {
        Args: { p_at?: string };
        Returns: {
          approximate_location: unknown;
          category_id: string;
          category_name: string;
          complaint_id: string;
          created_at: string;
          event_at: string;
          id: string;
          local_body_id: string;
          location_precision_meters: number;
          public_id: string;
          public_status: string;
          public_summary: string;
          public_title: string;
          public_visibility_category_rule_id: string;
          public_visibility_policy_version_id: string;
          publication_state: string;
          published_at: string;
          review_id: string;
          source_updated_at: string;
          submitted_at: string;
          version: number;
          ward_boundary_version_id: string;
          ward_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'complaint_publication_projections';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      current_sla_escalation_job_id: { Args: never; Returns: string };
      initialize_complaint_sla: {
        Args: {
          p_assignment_id: string;
          p_complaint_id: string;
          p_cycle?: number;
          p_started_at: string;
        };
        Returns: string;
      };
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
      map_public_complaint_status: {
        Args: { p_status: string };
        Returns: string;
      };
      perform_phase7_resolution_submission: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_expected_workflow_version: number;
          p_idempotency_key_hash: string;
          p_payload: Json;
          p_request_fingerprint: string;
          p_request_id: string;
        };
        Returns: {
          replayed: boolean;
          response_payload: Json;
        }[];
      };
      public_complaint_projection_payload: {
        Args: {
          p_include_summary?: boolean;
          p_projection: Database['complaints']['Tables']['complaint_publication_projections']['Row'];
        };
        Returns: Json;
      };
      public_duplicate_group_payload: {
        Args: { p_at?: string; p_complaint_id: string };
        Returns: Json;
      };
      resolve_resolution_policy_version: {
        Args: { p_at?: string; p_authority_id: string; p_category_id: string };
        Returns: string;
      };
      resume_sla_clock: {
        Args: { p_clock_id: string; p_resumed_at: string };
        Returns: string;
      };
      role_capability_enabled: {
        Args: {
          capability: Database['complaints']['Tables']['government_role_capabilities']['Row'];
          capability_name: string;
        };
        Returns: boolean;
      };
      sla_business_minutes_between: {
        Args: {
          p_calendar_version_id: string;
          p_ended_at: string;
          p_started_at: string;
        };
        Returns: number;
      };
      validate_public_transparency_query: {
        Args: {
          p_category_codes: string[];
          p_date_from: string;
          p_date_to: string;
          p_east: number;
          p_limit: number;
          p_maximum_limit: number;
          p_north: number;
          p_south: number;
          p_statuses: string[];
          p_west: number;
          p_zoom: number;
        };
        Returns: undefined;
      };
      validate_sla_calendar_configuration: {
        Args: { p_calendar_version_id: string };
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
      ward_administrative_zone_membership_versions: {
        Row: {
          administrative_zone_id: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          operational_ward_id: string;
          reference_source_id: string | null;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          administrative_zone_id: string;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          operational_ward_id: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          administrative_zone_id?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          operational_ward_id?: string;
          reference_source_id?: string | null;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ward_administrative_zone_membership_administrative_zone_id_fkey';
            columns: ['administrative_zone_id'];
            isOneToOne: false;
            referencedRelation: 'administrative_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_administrative_zone_membership_ve_operational_ward_id_fkey';
            columns: ['operational_ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_administrative_zone_membership_ve_reference_source_id_fkey';
            columns: ['reference_source_id'];
            isOneToOne: false;
            referencedRelation: 'reference_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_administrative_zone_membership_versi_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
        ];
      };
      ward_boundary_crosswalk_versions: {
        Row: {
          auto_route_allowed: boolean;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          import_record_id: string | null;
          is_placeholder: boolean;
          is_routing_eligible: boolean;
          last_verified_on: string | null;
          notes: string | null;
          official_boundary_version_id: string;
          operational_ward_id: string;
          reference_source_id: string | null;
          relationship_type: string;
          routing_instruction: string;
          status: string;
          updated_at: string;
          verification_notes: string | null;
          verification_status: string;
          version: number;
        };
        Insert: {
          auto_route_allowed?: boolean;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          notes?: string | null;
          official_boundary_version_id: string;
          operational_ward_id: string;
          reference_source_id?: string | null;
          relationship_type: string;
          routing_instruction: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version: number;
        };
        Update: {
          auto_route_allowed?: boolean;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          import_record_id?: string | null;
          is_placeholder?: boolean;
          is_routing_eligible?: boolean;
          last_verified_on?: string | null;
          notes?: string | null;
          official_boundary_version_id?: string;
          operational_ward_id?: string;
          reference_source_id?: string | null;
          relationship_type?: string;
          routing_instruction?: string;
          status?: string;
          updated_at?: string;
          verification_notes?: string | null;
          verification_status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ward_boundary_crosswalk_versi_official_boundary_version_id_fkey';
            columns: ['official_boundary_version_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdiction_boundary_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_boundary_crosswalk_versions_import_record_id_fkey';
            columns: ['import_record_id'];
            isOneToOne: false;
            referencedRelation: 'import_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_boundary_crosswalk_versions_operational_ward_id_fkey';
            columns: ['operational_ward_id'];
            isOneToOne: false;
            referencedRelation: 'wards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ward_boundary_crosswalk_versions_reference_source_id_fkey';
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
      resolve_complaint_contact_readiness: {
        Args: {
          p_authority_department_id: string;
          p_authority_id: string;
          p_local_body_id: string;
          p_office_id: string;
          p_officer_assignment_id: string;
          p_officer_id: string;
          p_ward_id: string;
        };
        Returns: Json;
      };
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
          avatar_object_path: string | null;
          avatar_updated_at: string | null;
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
          avatar_object_path?: string | null;
          avatar_updated_at?: string | null;
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
          avatar_object_path?: string | null;
          avatar_updated_at?: string | null;
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
      api_readiness_check: { Args: never; Returns: boolean };
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
      authorize_realtime_room: {
        Args: {
          p_actor_user_id: string;
          p_resource_id: string;
          p_room_type: string;
        };
        Returns: {
          actor_type: string;
          authorized: boolean;
        }[];
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
      claim_kpi_calculation_runs: {
        Args: {
          p_lease_seconds?: number;
          p_limit?: number;
          p_worker_id: string;
        };
        Returns: {
          lease_token: string;
          run_id: string;
        }[];
      };
      claim_notification_outbox: {
        Args: {
          p_lease_seconds?: number;
          p_limit?: number;
          p_worker_id: string;
        };
        Returns: {
          lease_token: string;
          outbox_id: string;
        }[];
      };
      claim_realtime_deliveries: {
        Args: {
          p_batch_size?: number;
          p_instance_id: string;
          p_lease_seconds?: number;
        };
        Returns: {
          attempt_count: number;
          claim_token: string;
          complaint_id: string;
          delivery_id: string;
          event_id: string;
          event_name: string;
          payload: Json;
          recipient_user_id: string;
        }[];
      };
      claim_sla_escalation_jobs: {
        Args: {
          p_lease_seconds?: number;
          p_limit?: number;
          p_worker_id: string;
        };
        Returns: {
          job_id: string;
          lease_token: string;
        }[];
      };
      complete_notification_delivery: {
        Args: {
          p_claim_token: string;
          p_delivered_socket_count: number;
          p_delivery_id: string;
          p_instance_id: string;
        };
        Returns: undefined;
      };
      consume_api_rate_limit: {
        Args: {
          p_limit: number;
          p_scope: string;
          p_subject_sha256: string;
          p_window_seconds: number;
        };
        Returns: Json;
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
      create_complaint_message: {
        Args: {
          p_actor_user_id: string;
          p_body: string;
          p_client_message_id: string;
          p_complaint_id: string;
          p_request_id?: string;
        };
        Returns: {
          replayed: boolean;
          response_payload: Json;
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
      enqueue_kpi_calculation_run: {
        Args: {
          p_actor_user_id: string;
          p_authority_id: string;
          p_source_cutoff_at: string;
          p_window_ended_at: string;
          p_window_started_at: string;
        };
        Returns: string;
      };
      execute_sla_escalation_job: {
        Args: { p_job_id: string; p_lease_token: string };
        Returns: {
          escalation_event_id: string;
          outcome: string;
          replayed: boolean;
        }[];
      };
      expire_citizen_reopen_evidence_reservations: {
        Args: { p_limit?: number };
        Returns: number;
      };
      expire_government_resolution_evidence: {
        Args: { p_limit?: number };
        Returns: number;
      };
      fail_citizen_reopen_evidence: {
        Args: { p_evidence_id: string; p_failure_code: string };
        Returns: {
          evidence_id: string;
          failure_code: string;
          upload_status: string;
        }[];
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
      fail_kpi_calculation_run: {
        Args: { p_error_code: string; p_lease_token: string; p_run_id: string };
        Returns: {
          next_attempt_at: string;
          status: string;
        }[];
      };
      fail_notification_delivery: {
        Args: {
          p_claim_token: string;
          p_delivery_id: string;
          p_failure_code: string;
          p_instance_id: string;
        };
        Returns: undefined;
      };
      fail_notification_outbox: {
        Args: {
          p_error_code: string;
          p_lease_token: string;
          p_outbox_id: string;
        };
        Returns: {
          next_attempt_at: string;
          status: string;
        }[];
      };
      fail_sla_escalation_job: {
        Args: { p_error_code: string; p_job_id: string; p_lease_token: string };
        Returns: {
          next_attempt_at: string;
          status: string;
        }[];
      };
      finalize_citizen_reopen_evidence: {
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
          location_accuracy_meters: number;
          location_captured_at: string;
          location_latitude: number;
          location_longitude: number;
          location_provider: string;
          observed_byte_size: number;
          observed_mime_type: string;
          replayed: boolean;
          upload_status: string;
          workflow_version: number;
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
      get_citizen_complaint_evidence_object: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_evidence_id: string;
          p_purpose: string;
        };
        Returns: {
          bucket_id: string;
          client_sha256: string;
          declared_byte_size: number;
          declared_mime_type: string;
          evidence_id: string;
          evidence_role: string;
          object_path: string;
          observed_byte_size: number;
          observed_mime_type: string;
          upload_expires_at: string;
          upload_status: string;
          workflow_version: number;
        }[];
      };
      get_citizen_resolution_context: {
        Args: { p_actor_user_id: string; p_complaint_id: string };
        Returns: {
          resolution_context: Json;
        }[];
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
      get_government_complaint_accountability: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_scope_role_assignment_id: string;
        };
        Returns: {
          accountability: Json;
        }[];
      };
      get_government_complaint_sla: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_scope_role_assignment_id?: string;
        };
        Returns: {
          payload: Json;
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
      get_public_complaint_projection: {
        Args: { p_public_id: string };
        Returns: {
          projection: Json;
        }[];
      };
      get_realtime_account: {
        Args: { p_actor_user_id: string };
        Returns: {
          is_active: boolean;
          user_id: string;
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
      list_complaint_messages: {
        Args: {
          p_actor_user_id: string;
          p_before_created_at?: string;
          p_before_id?: string;
          p_complaint_id: string;
          p_limit?: number;
        };
        Returns: {
          response_payload: Json;
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
      list_government_invitation_options: {
        Args: { p_authority_ids?: string[] };
        Returns: Json;
      };
      list_government_kpi_snapshots: {
        Args: {
          p_actor_user_id: string;
          p_authority_id?: string;
          p_metric_codes?: string[];
          p_scope_id?: string;
          p_scope_role_assignment_id?: string;
          p_scope_type?: string;
          p_segment?: string;
        };
        Returns: {
          payload: Json;
        }[];
      };
      list_notifications: {
        Args: {
          p_actor_user_id: string;
          p_before_created_at?: string;
          p_before_id?: string;
          p_limit?: number;
        };
        Returns: {
          response_payload: Json;
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
      list_public_complaint_hotspots: {
        Args: {
          p_category_codes: string[];
          p_date_from: string;
          p_date_to: string;
          p_east: number;
          p_limit: number;
          p_north: number;
          p_south: number;
          p_statuses: string[];
          p_west: number;
          p_zoom: number;
        };
        Returns: {
          hotspot: Json;
        }[];
      };
      list_public_complaint_projections: {
        Args: {
          p_category_codes: string[];
          p_cursor: string;
          p_date_from: string;
          p_date_to: string;
          p_east: number;
          p_limit: number;
          p_north: number;
          p_south: number;
          p_statuses: string[];
          p_west: number;
          p_zoom: number;
        };
        Returns: {
          projection: Json;
        }[];
      };
      list_public_ward_boundaries: {
        Args: {
          p_east: number;
          p_limit: number;
          p_north: number;
          p_south: number;
          p_west: number;
        };
        Returns: {
          ward_boundary: Json;
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
      mark_complaint_message_read: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_read_through_created_at: string;
          p_read_through_message_id: string;
          p_request_id?: string;
        };
        Returns: Json;
      };
      mark_notification_read: {
        Args: { p_actor_user_id: string; p_notification_id: string };
        Returns: Json;
      };
      materialize_kpi_calculation_run: {
        Args: { p_lease_token: string; p_run_id: string };
        Returns: {
          replayed: boolean;
          snapshot_count: number;
        }[];
      };
      materialize_notification_outbox: {
        Args: { p_lease_token: string; p_outbox_id: string };
        Returns: {
          notification_count: number;
          replayed: boolean;
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
      perform_government_complaint_action_phase5_impl: {
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
      publish_sla_calendar_version: {
        Args: { p_actor_user_id: string; p_calendar_version_id: string };
        Returns: string;
      };
      publish_sla_escalation_rule_version: {
        Args: { p_actor_user_id: string; p_escalation_rule_version_id: string };
        Returns: string;
      };
      publish_sla_policy_version: {
        Args: { p_actor_user_id: string; p_policy_version_id: string };
        Returns: string;
      };
      purge_expired_api_rate_limits: {
        Args: { p_max_rows?: number };
        Returns: number;
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
      reopen_complaint: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_evidence_ids: string[];
          p_expected_workflow_version: number;
          p_explanation: string;
          p_idempotency_key_hash: string;
          p_reason_code: string;
          p_request_fingerprint: string;
          p_request_id: string;
          p_resolution_id: string;
        };
        Returns: {
          replayed: boolean;
          result: Json;
        }[];
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
      reserve_citizen_reopen_evidence: {
        Args: {
          p_actor_user_id: string;
          p_byte_size: number;
          p_captured_at: string;
          p_complaint_id: string;
          p_duration_milliseconds: number;
          p_expected_workflow_version: number;
          p_height_pixels: number;
          p_idempotency_key_hash: string;
          p_kind: string;
          p_location_accuracy_meters: number;
          p_location_captured_at: string;
          p_location_device_recorded_at: string;
          p_location_latitude: number;
          p_location_longitude: number;
          p_location_mock_detected: boolean;
          p_location_provider: string;
          p_mime_type: string;
          p_request_fingerprint: string;
          p_request_id: string;
          p_sha256: string;
          p_width_pixels: number;
        };
        Returns: {
          bucket_id: string;
          captured_at: string;
          created_at: string;
          declared_byte_size: number;
          declared_mime_type: string;
          evidence_id: string;
          kind: string;
          location_accuracy_meters: number;
          location_captured_at: string;
          location_latitude: number;
          location_longitude: number;
          location_provider: string;
          object_path: string;
          replayed: boolean;
          upload_expires_at: string;
          upload_status: string;
          workflow_version: number;
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
      resolve_verified_governing_bodies: {
        Args: {
          p_accuracy_meters: number;
          p_latitude: number;
          p_longitude: number;
          p_resolved_at?: string;
        };
        Returns: {
          district_id: string;
          local_body_id: string;
          match: Json;
          state_id: string;
          taluka_id: string;
          ward_id: string;
        }[];
      };
      review_and_publish_complaint_projection: {
        Args: {
          p_actor_user_id: string;
          p_complaint_id: string;
          p_public_summary: string;
          p_public_title: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      review_public_duplicate_group: {
        Args: {
          p_actor_user_id: string;
          p_canonical_public_id: string;
          p_public_ids: string[];
          p_request_id: string;
        };
        Returns: Json;
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
      schedule_kpi_calculation_runs: {
        Args: {
          p_source_cutoff_at: string;
          p_window_ended_at: string;
          p_window_started_at: string;
        };
        Returns: {
          authority_id: string;
          run_id: string;
        }[];
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
      submit_complaint_feedback: {
        Args: {
          p_actor_user_id: string;
          p_comment: string;
          p_communication_rating: number;
          p_complaint_id: string;
          p_expected_workflow_version: number;
          p_idempotency_key_hash: string;
          p_outcome: string;
          p_quality_rating: number;
          p_request_fingerprint: string;
          p_request_id: string;
          p_resolution_id: string;
          p_satisfaction_rating: number;
          p_speed_rating: number;
        };
        Returns: {
          replayed: boolean;
          result: Json;
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
      user_has_verified_phone_mfa: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      user_requires_privileged_mfa: {
        Args: { p_at?: string; p_user_id: string };
        Returns: boolean;
      };
      withdraw_public_complaint_projection: {
        Args: {
          p_actor_user_id: string;
          p_public_id: string;
          p_reason_code: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      withdraw_public_duplicate_group: {
        Args: {
          p_actor_user_id: string;
          p_canonical_public_id: string;
          p_request_id: string;
        };
        Returns: Json;
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
