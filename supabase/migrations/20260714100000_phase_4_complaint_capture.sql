create extension if not exists pg_trgm with schema extensions;

create schema if not exists complaints;
revoke all on schema complaints from public;

alter table routing.issue_categories
  add column location_verification_requirements jsonb not null default jsonb_build_object(
    'maximumAccuracyMeters', 100,
    'maximumAgeSeconds', 300
  ),
  add constraint issue_categories_location_verification_requirements_check check (
    jsonb_typeof(location_verification_requirements) = 'object'
    and location_verification_requirements
      ?& array['maximumAccuracyMeters', 'maximumAgeSeconds']
    and location_verification_requirements
      - array['maximumAccuracyMeters', 'maximumAgeSeconds'] = '{}'::jsonb
    and jsonb_typeof(location_verification_requirements -> 'maximumAccuracyMeters') = 'number'
    and jsonb_typeof(location_verification_requirements -> 'maximumAgeSeconds') = 'number'
    and (location_verification_requirements ->> 'maximumAccuracyMeters')::numeric
      between 1 and 5000
    and (location_verification_requirements ->> 'maximumAgeSeconds')::numeric
      between 1 and 86400
  );

create sequence complaints.complaint_number_sequence;

create table complaints.complaint_drafts (
  id uuid primary key default gen_random_uuid(),
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  creation_idempotency_key_hash text not null,
  creation_request_fingerprint text not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  description text,
  description_language text not null default 'en',
  custom_attributes jsonb not null default '{}'::jsonb,
  selected_location_evidence_id uuid,
  status text not null default 'active',
  revision bigint not null default 1,
  expires_at timestamptz not null default (now() + interval '30 days'),
  discarded_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_drafts_creation_key_unique unique (
    citizen_user_id,
    creation_idempotency_key_hash
  ),
  constraint complaint_drafts_creation_key_check check (
    creation_idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_drafts_creation_fingerprint_check check (
    creation_request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_drafts_description_check check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 5000
    )
  ),
  constraint complaint_drafts_language_check check (
    description_language in ('en', 'hi', 'mr')
  ),
  constraint complaint_drafts_attributes_check check (
    jsonb_typeof(custom_attributes) = 'object'
    and not (
      custom_attributes
        ?| array[
          'authorityId',
          'wardId',
          'departmentId',
          'authorityDepartmentId',
          'officerRoleId',
          'officerAssignmentId',
          'routingRuleId',
          'status'
        ]
    )
  ),
  constraint complaint_drafts_status_check check (
    status in ('active', 'discarded', 'submitted')
  ),
  constraint complaint_drafts_revision_check check (revision >= 1),
  constraint complaint_drafts_expiry_check check (expires_at > created_at),
  constraint complaint_drafts_lifecycle_check check (
    (status = 'active' and discarded_at is null and submitted_at is null)
    or (status = 'discarded' and discarded_at is not null and submitted_at is null)
    or (status = 'submitted' and discarded_at is null and submitted_at is not null)
  )
);

create table complaints.complaint_location_evidence (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  device_id uuid references public.devices (id) on delete restrict,
  evidence_type text not null default 'current_location',
  location extensions.geometry(Point, 4326) not null,
  accuracy_meters double precision not null,
  provider text not null,
  captured_at timestamptz not null,
  device_recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  mock_location_detected boolean,
  spoof_risk_status text not null default 'unknown',
  verification_status text not null default 'pending',
  verification_score numeric(7, 6),
  verification_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint complaint_location_evidence_type_check check (
    evidence_type in ('current_location', 'media_capture')
  ),
  constraint complaint_location_evidence_accuracy_check check (
    accuracy_meters >= 0 and accuracy_meters <= 5000
  ),
  constraint complaint_location_evidence_provider_check check (
    provider in ('gps', 'network', 'fused', 'unknown')
  ),
  constraint complaint_location_evidence_capture_time_check check (
    captured_at <= received_at + interval '2 minutes'
    and device_recorded_at <= received_at + interval '2 minutes'
    and abs(extract(epoch from (captured_at - device_recorded_at))) <= 300
  ),
  constraint complaint_location_evidence_spoof_risk_check check (
    spoof_risk_status in ('unknown', 'low', 'review', 'high', 'blocked')
  ),
  constraint complaint_location_evidence_verification_check check (
    verification_status in (
      'pending',
      'verified',
      'partially_verified',
      'low_accuracy',
      'location_mismatch',
      'suspected_spoofing',
      'unsupported_area',
      'manual_review'
    )
  ),
  constraint complaint_location_evidence_score_check check (
    verification_score is null or verification_score between 0 and 1
  ),
  constraint complaint_location_evidence_verification_shape_check check (
    (verification_status = 'pending' and verification_score is null)
    or (verification_status <> 'pending' and verification_score is not null)
  ),
  constraint complaint_location_evidence_metadata_check check (
    jsonb_typeof(verification_metadata) = 'object'
    and not (
      verification_metadata
        ?| array['description', 'complaintText', 'phone', 'email', 'signedUrl', 'token']
    )
  ),
  constraint complaint_location_evidence_location_check check (
    not extensions.st_isempty(location)
    and extensions.st_srid(location) = 4326
    and extensions.st_x(location) between -180 and 180
    and extensions.st_y(location) between -90 and 90
  )
);

alter table complaints.complaint_drafts
  add constraint complaint_drafts_selected_location_fkey
  foreign key (selected_location_evidence_id)
  references complaints.complaint_location_evidence (id)
  on delete restrict;

create table complaints.complaint_media (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  client_media_id uuid not null,
  media_kind text not null,
  capture_source text not null,
  bucket_id text not null,
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  capture_location_evidence_id uuid
    references complaints.complaint_location_evidence (id) on delete restrict,
  captured_at timestamptz,
  width_pixels integer,
  height_pixels integer,
  duration_seconds numeric(10, 3),
  distance_to_complaint_meters double precision,
  upload_status text not null default 'reserved',
  processing_status text not null default 'pending',
  moderation_status text not null default 'pending',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_media_client_unique unique (draft_id, client_media_id),
  constraint complaint_media_object_unique unique (bucket_id, object_path),
  constraint complaint_media_kind_check check (media_kind in ('photo', 'video', 'voice')),
  constraint complaint_media_capture_source_check check (
    capture_source in ('live_camera', 'live_video', 'live_microphone')
  ),
  constraint complaint_media_kind_source_check check (
    (media_kind = 'photo' and capture_source = 'live_camera')
    or (media_kind = 'video' and capture_source = 'live_video')
    or (media_kind = 'voice' and capture_source = 'live_microphone')
  ),
  constraint complaint_media_bucket_check check (
    (media_kind in ('photo', 'video') and bucket_id = 'complaint-originals-private')
    or (media_kind = 'voice' and bucket_id = 'voice-recordings-private')
  ),
  constraint complaint_media_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/original$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_media_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
  ),
  constraint complaint_media_observed_mime_check check (
    observed_mime_type is null
    or (
      observed_mime_type = lower(btrim(observed_mime_type))
      and observed_mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
    )
  ),
  constraint complaint_media_declared_size_check check (
    declared_byte_size between 1 and 52428800
  ),
  constraint complaint_media_observed_size_check check (
    observed_byte_size is null or observed_byte_size between 1 and 52428800
  ),
  constraint complaint_media_client_sha_check check (client_sha256 ~ '^[0-9a-f]{64}$'),
  constraint complaint_media_verified_sha_check check (
    verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_media_distance_check check (
    distance_to_complaint_meters is null or distance_to_complaint_meters >= 0
  ),
  constraint complaint_media_dimensions_check check (
    (width_pixels is null and height_pixels is null)
    or (
      width_pixels between 1 and 32768
      and height_pixels between 1 and 32768
      and media_kind in ('photo', 'video')
    )
  ),
  constraint complaint_media_duration_check check (
    duration_seconds is null
    or (duration_seconds > 0 and duration_seconds <= 600 and media_kind in ('video', 'voice'))
  ),
  constraint complaint_media_upload_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_media_processing_status_check check (
    processing_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint complaint_media_moderation_status_check check (
    moderation_status in ('pending', 'review_required', 'approved', 'rejected')
  ),
  constraint complaint_media_expiry_check check (upload_expires_at > created_at),
  constraint complaint_media_finalize_shape_check check (
    (
      upload_status = 'finalized'
      and observed_mime_type is not null
      and observed_byte_size is not null
      and verified_sha256 is not null
      and finalized_at is not null
      and failure_code is null
    )
    or (
      upload_status <> 'finalized'
      and finalized_at is null
      and verified_sha256 is null
    )
  ),
  constraint complaint_media_failure_code_check check (
    failure_code is null
    or (
      failure_code = btrim(failure_code)
      and failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
    )
  )
);

create table complaints.complaints (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique
    references complaints.complaint_drafts (id) on delete restrict,
  complaint_number text not null unique,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  description text not null,
  description_language text not null,
  custom_attributes jsonb not null,
  location_evidence_id uuid not null unique
    references complaints.complaint_location_evidence (id) on delete restrict,
  routing_decision_id uuid not null unique
    references routing.routing_decisions (id) on delete restrict,
  current_status text not null default 'submitted',
  visibility text not null default 'private',
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaints_number_check check (
    complaint_number ~ '^LW-[0-9]{8}-[0-9]{8,}$'
  ),
  constraint complaints_description_check check (
    description = btrim(description) and char_length(description) between 1 and 5000
  ),
  constraint complaints_language_check check (description_language in ('en', 'hi', 'mr')),
  constraint complaints_attributes_check check (jsonb_typeof(custom_attributes) = 'object'),
  constraint complaints_status_check check (
    current_status in (
      'submitted',
      'validation_pending',
      'validated',
      'routing_pending',
      'assigned',
      'acknowledged',
      'inspection_scheduled',
      'inspection_completed',
      'work_order_created',
      'work_in_progress',
      'resolution_submitted',
      'citizen_verification_pending',
      'resolved',
      'closed',
      'transferred',
      'waiting_for_material',
      'waiting_for_external_agency',
      'reopened',
      'rejected',
      'cancelled',
      'escalated'
    )
  ),
  constraint complaints_phase4_visibility_check check (visibility = 'private'),
  constraint complaints_submission_time_check check (submitted_at >= created_at - interval '1 second')
);

create table complaints.complaint_assignments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique
    references complaints.complaints (id) on delete restrict,
  routing_decision_id uuid not null unique
    references routing.routing_decisions (id) on delete restrict,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  department_id uuid not null references governance.departments (id) on delete restrict,
  authority_department_id uuid not null
    references governance.authority_departments (id) on delete restrict,
  officer_role_id uuid not null references governance.officer_roles (id) on delete restrict,
  officer_assignment_id uuid references governance.officer_assignments (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  asset_version_id uuid references routing.asset_versions (id) on delete restrict,
  asset_ownership_version_id uuid
    references routing.asset_ownership_versions (id) on delete restrict,
  assignment_source text not null default 'routing_decision',
  status text not null default 'active',
  assigned_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint complaint_assignments_source_check check (
    assignment_source = 'routing_decision'
  ),
  constraint complaint_assignments_status_check check (status = 'active'),
  constraint complaint_assignments_asset_shape_check check (
    (asset_id is null and asset_version_id is null and asset_ownership_version_id is null)
    or (asset_id is not null and asset_type_id is not null and asset_version_id is not null)
  )
);

create table complaints.complaint_status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  sequence integer not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users (id) on delete restrict,
  event_source text not null,
  reason_code text not null,
  public_message text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint complaint_status_history_sequence_unique unique (complaint_id, sequence),
  constraint complaint_status_history_sequence_check check (sequence >= 1),
  constraint complaint_status_history_source_check check (
    event_source in ('citizen_submission', 'government_action', 'system')
  ),
  constraint complaint_status_history_reason_check check (
    reason_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint complaint_status_history_message_check check (
    public_message is null
    or (
      public_message = btrim(public_message)
      and char_length(public_message) between 1 and 1000
    )
  ),
  constraint complaint_status_history_request_check check (
    request_id is null
    or (
      request_id = btrim(request_id)
      and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    )
  ),
  constraint complaint_status_history_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array['exactLocation', 'description', 'phone', 'email', 'signedUrl', 'token']
    )
  )
);

create table complaints.complaint_submission_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  routing_request_id text not null unique,
  state text not null default 'claimed',
  routing_decision_id uuid references routing.routing_decisions (id) on delete restrict,
  complaint_id uuid references complaints.complaints (id) on delete restrict,
  acknowledged_duplicate_suggestion_ids uuid[] not null default '{}'::uuid[],
  emergency_disclaimer_acknowledged boolean not null default false,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint complaint_submission_requests_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint complaint_submission_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_submission_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_submission_requests_routing_request_check check (
    routing_request_id ~ '^complaint-submit:[0-9a-f-]{36}$'
  ),
  constraint complaint_submission_requests_state_check check (
    state in ('claimed', 'completed')
  ),
  constraint complaint_submission_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint complaint_submission_requests_acknowledgements_check check (
    cardinality(acknowledged_duplicate_suggestion_ids) <= 100
  ),
  constraint complaint_submission_requests_completion_check check (
    (
      state = 'claimed'
      and routing_decision_id is null
      and complaint_id is null
      and cardinality(acknowledged_duplicate_suggestion_ids) = 0
      and not emergency_disclaimer_acknowledged
      and response_payload is null
      and completed_at is null
    )
    or (
      state = 'completed'
      and routing_decision_id is not null
      and complaint_id is not null
      and response_payload is not null
      and completed_at is not null
    )
  )
);

create table complaints.duplicate_check_runs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  duplicate_policy_version_id uuid not null
    references routing.duplicate_detection_policy_versions (id) on delete restrict,
  request_id text not null,
  result_fingerprint text not null,
  candidate_count smallint not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint duplicate_check_runs_request_unique unique (actor_user_id, request_id),
  constraint duplicate_check_runs_request_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint duplicate_check_runs_fingerprint_check check (
    result_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint duplicate_check_runs_count_check check (candidate_count between 0 and 100)
);

create table complaints.duplicate_check_matches (
  id uuid primary key default gen_random_uuid(),
  duplicate_check_run_id uuid not null
    references complaints.duplicate_check_runs (id) on delete restrict,
  candidate_complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  score numeric(7, 6) not null,
  distance_meters double precision not null,
  age_seconds integer not null,
  factor_summary jsonb not null,
  created_at timestamptz not null default now(),
  constraint duplicate_check_matches_candidate_unique unique (
    duplicate_check_run_id,
    candidate_complaint_id
  ),
  constraint duplicate_check_matches_score_check check (score between 0 and 1),
  constraint duplicate_check_matches_distance_check check (distance_meters >= 0),
  constraint duplicate_check_matches_age_check check (age_seconds >= 0),
  constraint duplicate_check_matches_factor_check check (
    jsonb_typeof(factor_summary) = 'object'
    and not (
      factor_summary
        ?| array['description', 'exactLocation', 'mediaHashes', 'phone', 'email']
    )
  )
);

create index complaint_drafts_owner_status_updated_idx
  on complaints.complaint_drafts (citizen_user_id, status, updated_at desc);
create index complaint_drafts_expiry_idx
  on complaints.complaint_drafts (expires_at)
  where status = 'active';
create index complaint_location_evidence_draft_time_idx
  on complaints.complaint_location_evidence (draft_id, captured_at desc);
create index complaint_location_evidence_geography_gix
  on complaints.complaint_location_evidence
  using gist ((location::extensions.geography));
create index complaint_media_draft_status_idx
  on complaints.complaint_media (draft_id, upload_status, created_at);
create index complaint_media_expiry_idx
  on complaints.complaint_media (upload_expires_at)
  where upload_status = 'reserved';
create index complaint_media_verified_sha_idx
  on complaints.complaint_media (verified_sha256)
  where verified_sha256 is not null;
create index complaints_owner_submitted_idx
  on complaints.complaints (citizen_user_id, submitted_at desc, id);
create index complaints_category_submitted_idx
  on complaints.complaints (category_id, submitted_at desc);
create index complaints_status_submitted_idx
  on complaints.complaints (current_status, submitted_at desc);
create index complaint_assignments_authority_idx
  on complaints.complaint_assignments (authority_id, status, assigned_at desc);
create index complaint_assignments_ward_idx
  on complaints.complaint_assignments (ward_id, status, assigned_at desc)
  where ward_id is not null;
create index complaint_assignments_department_idx
  on complaints.complaint_assignments (authority_department_id, status, assigned_at desc);
create index complaint_status_history_timeline_idx
  on complaints.complaint_status_history (complaint_id, sequence);
create index complaint_submission_requests_draft_idx
  on complaints.complaint_submission_requests (draft_id, state, created_at desc);
create index duplicate_check_runs_draft_idx
  on complaints.duplicate_check_runs (draft_id, checked_at desc);
create index duplicate_check_matches_candidate_idx
  on complaints.duplicate_check_matches (candidate_complaint_id, created_at desc);

comment on schema complaints is
  'Private Phase 4 complaint capture state. Clients use authenticated NestJS endpoints, not direct table access.';
comment on table complaints.complaint_drafts is
  'Durable resumable citizen drafts; discard is a retained state transition rather than deletion.';
comment on table complaints.complaint_location_evidence is
  'Append-only exact device and media capture location evidence.';
comment on table complaints.complaint_media is
  'Private signed-upload intent and verified finalization metadata; signed tokens are never stored.';
comment on table complaints.complaints is
  'Submitted private complaints bound to immutable routing and exact location evidence.';
comment on table complaints.complaint_assignments is
  'Initial server-derived assignment copied from the stored routed decision.';
comment on table complaints.complaint_status_history is
  'Append-only official complaint lifecycle history.';
comment on table complaints.complaint_submission_requests is
  'Durable exact-replay idempotency ledger for complaint submission.';
comment on table complaints.duplicate_check_runs is
  'Append-only advisory duplicate evaluation runs using a versioned routing policy.';
comment on table complaints.duplicate_check_matches is
  'Privacy-restricted scored candidates retained for duplicate-evaluation audit.';
