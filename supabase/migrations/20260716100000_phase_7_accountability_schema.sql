alter table complaints.complaint_work_references
  add constraint complaint_work_references_id_complaint_unique unique (id, complaint_id);

alter table complaints.complaint_resolutions
  add column completed_at timestamptz,
  add column completion_location extensions.geometry(Point, 4326),
  add column completion_accuracy_meters double precision,
  add column completion_provider text,
  add column location_captured_at timestamptz,
  add column completion_location_device_recorded_at timestamptz,
  add column completion_mock_location_detected boolean,
  add column completion_distance_to_complaint_meters double precision,
  add column work_reference_id uuid,
  add constraint complaint_resolutions_id_complaint_unique unique (id, complaint_id),
  add constraint complaint_resolutions_work_reference_fkey
    foreign key (work_reference_id, complaint_id)
    references complaints.complaint_work_references (id, complaint_id) on delete restrict,
  add constraint complaint_resolutions_completion_accuracy_check check (
    completion_accuracy_meters is null
    or completion_accuracy_meters between 0 and 5000
  ),
  add constraint complaint_resolutions_completion_provider_check check (
    completion_provider is null
    or completion_provider in ('gps', 'network', 'fused', 'unknown')
  ),
  add constraint complaint_resolutions_completion_distance_check check (
    completion_distance_to_complaint_meters is null
    or completion_distance_to_complaint_meters between 0 and 100000
  ),
  add constraint complaint_resolutions_completion_location_check check (
    completion_location is null
    or (
      not extensions.st_isempty(completion_location)
      and extensions.st_srid(completion_location) = 4326
      and extensions.st_x(completion_location) between -180 and 180
      and extensions.st_y(completion_location) between -90 and 90
    )
  ),
  add constraint complaint_resolutions_completion_shape_check check (
    (
      completed_at is null
      and completion_location is null
      and completion_accuracy_meters is null
      and completion_provider is null
      and location_captured_at is null
      and completion_location_device_recorded_at is null
      and completion_mock_location_detected is null
      and completion_distance_to_complaint_meters is null
      and work_reference_id is null
    )
    or (
      completed_at is not null
      and completion_location is not null
      and completion_accuracy_meters is not null
      and completion_provider is not null
      and location_captured_at is not null
      and completion_location_device_recorded_at is not null
      and completion_distance_to_complaint_meters is not null
      and location_captured_at <= completed_at + interval '2 minutes'
      and completion_location_device_recorded_at <= completed_at + interval '2 minutes'
      and abs(extract(epoch from (
        location_captured_at - completion_location_device_recorded_at
      ))) <= 300
    )
  );

alter table complaints.complaint_resolution_evidence_links
  add column role text not null default 'after',
  add constraint complaint_resolution_evidence_links_role_check check (role = 'after');

create table complaints.resolution_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  authority_id uuid references governance.authorities (id) on delete restrict,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resolution_policies_code_unique unique (code),
  constraint resolution_policies_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint resolution_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create unique index resolution_policies_global_scope_idx
  on complaints.resolution_policies ((true))
  where authority_id is null and category_id is null;
create unique index resolution_policies_authority_scope_idx
  on complaints.resolution_policies (authority_id)
  where authority_id is not null and category_id is null;
create unique index resolution_policies_category_scope_idx
  on complaints.resolution_policies (category_id)
  where authority_id is null and category_id is not null;
create unique index resolution_policies_authority_category_scope_idx
  on complaints.resolution_policies (authority_id, category_id)
  where authority_id is not null and category_id is not null;

create table complaints.resolution_policy_versions (
  id uuid primary key default gen_random_uuid(),
  resolution_policy_id uuid not null
    references complaints.resolution_policies (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  rating_minimum smallint not null,
  rating_maximum smallint not null,
  ratings_required boolean not null default true,
  feedback_window_seconds integer not null,
  eligible_feedback_statuses text[] not null,
  reopen_window_seconds integer not null,
  eligible_reopen_statuses text[] not null,
  max_reopen_attempts smallint not null,
  reopen_evidence_required boolean not null default false,
  allowed_reopen_reason_codes text[] not null,
  repeat_escalation_threshold smallint not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint resolution_policy_versions_policy_version_unique unique (
    resolution_policy_id,
    version
  ),
  constraint resolution_policy_versions_version_check check (version >= 1),
  constraint resolution_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint resolution_policy_versions_rating_range_check check (
    rating_minimum between 1 and 10
    and rating_maximum between rating_minimum and 10
  ),
  constraint resolution_policy_versions_window_check check (
    feedback_window_seconds between 60 and 31536000
    and reopen_window_seconds between 60 and 31536000
  ),
  constraint resolution_policy_versions_statuses_check check (
    cardinality(eligible_feedback_statuses) between 1 and 4
    and eligible_feedback_statuses <@ array[
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed'
    ]::text[]
    and
    cardinality(eligible_reopen_statuses) between 1 and 6
    and eligible_reopen_statuses <@ array[
      'resolution_submitted', 'citizen_verification_pending', 'resolved',
      'closed', 'reopened', 'escalated'
    ]::text[]
  ),
  constraint resolution_policy_versions_attempt_check check (
    max_reopen_attempts between 1 and 20
    and repeat_escalation_threshold between 2 and max_reopen_attempts
  ),
  constraint resolution_policy_versions_reason_check check (
    cardinality(allowed_reopen_reason_codes) between 1 and 20
  ),
  constraint resolution_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint resolution_policy_versions_approval_check check (
    (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
      and effective_to is null
    )
    or (
      status = 'approved'
      and approved_by_user_id is not null
      and approved_at is not null
      and approved_at >= created_at
      and approved_at <= effective_from
    )
    or (
      status = 'superseded'
      and approved_by_user_id is not null
      and approved_at is not null
      and approved_at >= created_at
      and approved_at <= effective_from
      and effective_to is not null
    )
  )
);

alter table complaints.resolution_policy_versions
  add constraint resolution_policy_versions_no_effective_overlap
  exclude using gist (
    resolution_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index resolution_policy_versions_one_current_idx
  on complaints.resolution_policy_versions (resolution_policy_id)
  where status = 'approved' and effective_to is null;
create index resolution_policy_versions_effective_idx
  on complaints.resolution_policy_versions (
    resolution_policy_id,
    status,
    effective_from,
    effective_to
  );

create table complaints.citizen_action_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  action_type text not null,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  request_id text not null,
  expected_workflow_version bigint not null,
  state text not null default 'claimed',
  from_status text not null,
  to_status text not null,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint citizen_action_requests_actor_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint citizen_action_requests_action_check check (
    action_type in (
      'reserve_reopen_evidence',
      'finalize_reopen_evidence',
      'submit_feedback',
      'reopen'
    )
  ),
  constraint citizen_action_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint citizen_action_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint citizen_action_requests_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint citizen_action_requests_workflow_version_check check (
    expected_workflow_version >= 1
  ),
  constraint citizen_action_requests_state_check check (state in ('claimed', 'completed')),
  constraint citizen_action_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint citizen_action_requests_completion_check check (
    (state = 'claimed' and response_payload is null and completed_at is null)
    or (state = 'completed' and response_payload is not null and completed_at is not null)
  )
);

create table complaints.citizen_action_audit_events (
  id uuid primary key default gen_random_uuid(),
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_id uuid references complaints.complaint_resolutions (id) on delete restrict,
  assignment_id uuid references complaints.complaint_assignments (id) on delete restrict,
  action_type text not null,
  from_status text not null,
  to_status text not null,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint citizen_action_audit_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'comment', 'reasonDetail', 'exactLocation', 'latitude', 'longitude',
        'phone', 'email', 'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create table complaints.complaint_feedback (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  outcome text not null,
  satisfaction_rating smallint,
  speed_rating smallint,
  quality_rating smallint,
  communication_rating smallint,
  comment text,
  created_at timestamptz not null default now(),
  constraint complaint_feedback_resolution_citizen_unique unique (
    resolution_id,
    citizen_user_id
  ),
  constraint complaint_feedback_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_feedback_outcome_check check (
    outcome in (
      'resolved', 'partially_resolved', 'not_resolved',
      'temporary_fix', 'wrong_location'
    )
  ),
  constraint complaint_feedback_rating_check check (
    (satisfaction_rating is null or satisfaction_rating between 1 and 10)
    and (speed_rating is null or speed_rating between 1 and 10)
    and (quality_rating is null or quality_rating between 1 and 10)
    and (communication_rating is null or communication_rating between 1 and 10)
  ),
  constraint complaint_feedback_rating_shape_check check (
    num_nonnulls(
      satisfaction_rating,
      speed_rating,
      quality_rating,
      communication_rating
    ) in (0, 4)
  ),
  constraint complaint_feedback_comment_check check (
    comment is null
    or (comment = btrim(comment) and char_length(comment) between 1 and 2000)
  )
);

create table complaints.complaint_reopen_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null,
  bucket_id text not null default 'complaint-originals-private',
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  width_pixels integer,
  height_pixels integer,
  duration_milliseconds bigint,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  captured_at timestamptz not null,
  capture_location extensions.geometry(Point, 4326) not null,
  capture_accuracy_meters double precision not null,
  capture_provider text not null,
  location_captured_at timestamptz not null,
  location_device_recorded_at timestamptz not null,
  mock_location_detected boolean,
  upload_status text not null default 'reserved',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_reopen_evidence_object_unique unique (bucket_id, object_path),
  constraint complaint_reopen_evidence_id_scope_unique unique (
    id,
    complaint_id,
    resolution_id
  ),
  constraint complaint_reopen_evidence_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_reopen_evidence_kind_check check (kind in ('photo', 'video')),
  constraint complaint_reopen_evidence_bucket_check check (
    bucket_id = 'complaint-originals-private'
  ),
  constraint complaint_reopen_evidence_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/reopen$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_reopen_evidence_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_reopen_evidence_observed_mime_check check (
    observed_mime_type is null
    or observed_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_reopen_evidence_size_check check (
    declared_byte_size between 1 and 52428800
    and (observed_byte_size is null or observed_byte_size between 1 and 52428800)
  ),
  constraint complaint_reopen_evidence_dimensions_check check (
    (width_pixels is null and height_pixels is null)
    or (
      width_pixels between 1 and 20000
      and height_pixels between 1 and 20000
    )
  ),
  constraint complaint_reopen_evidence_duration_check check (
    duration_milliseconds is null
    or (duration_milliseconds between 1 and 600000 and kind = 'video')
  ),
  constraint complaint_reopen_evidence_hash_check check (
    client_sha256 ~ '^[0-9a-f]{64}$'
    and (verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$')
  ),
  constraint complaint_reopen_evidence_location_accuracy_check check (
    capture_accuracy_meters is null or capture_accuracy_meters between 0 and 5000
  ),
  constraint complaint_reopen_evidence_location_provider_check check (
    capture_provider is null
    or capture_provider in ('gps', 'network', 'fused', 'unknown')
  ),
  constraint complaint_reopen_evidence_location_check check (
    capture_location is null
    or (
      not extensions.st_isempty(capture_location)
      and extensions.st_srid(capture_location) = 4326
      and extensions.st_x(capture_location) between -180 and 180
      and extensions.st_y(capture_location) between -90 and 90
    )
  ),
  constraint complaint_reopen_evidence_location_shape_check check (
    location_captured_at <= created_at + interval '2 minutes'
    and location_device_recorded_at <= created_at + interval '2 minutes'
    and abs(extract(epoch from (
      location_captured_at - location_device_recorded_at
    ))) <= 300
  ),
  constraint complaint_reopen_evidence_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_reopen_evidence_expiry_check check (upload_expires_at > created_at),
  constraint complaint_reopen_evidence_finalize_check check (
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
  )
);

create table complaints.complaint_reopen_requests (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null unique
    references complaints.complaint_resolutions (id) on delete restrict,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  attempt_number smallint not null,
  reason_code text not null,
  reason_detail text not null,
  window_closes_at timestamptz not null,
  outcome_status text not null,
  requested_at timestamptz not null default now(),
  constraint complaint_reopen_requests_attempt_unique unique (complaint_id, attempt_number),
  constraint complaint_reopen_requests_id_scope_unique unique (
    id,
    complaint_id,
    resolution_id
  ),
  constraint complaint_reopen_requests_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_reopen_requests_attempt_check check (attempt_number between 1 and 20),
  constraint complaint_reopen_requests_reason_check check (
    reason_code = btrim(reason_code)
    and reason_code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint complaint_reopen_requests_detail_check check (
    reason_detail = btrim(reason_detail)
    and char_length(reason_detail) between 1 and 4000
  ),
  constraint complaint_reopen_requests_outcome_check check (
    outcome_status in ('reopened', 'escalated')
  ),
  constraint complaint_reopen_requests_window_check check (requested_at <= window_closes_at)
);

create table complaints.complaint_reopen_evidence_links (
  reopen_request_id uuid not null
    references complaints.complaint_reopen_requests (id) on delete restrict,
  evidence_id uuid not null unique
    references complaints.complaint_reopen_evidence (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null
    references complaints.complaint_resolutions (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (reopen_request_id, evidence_id),
  constraint complaint_reopen_evidence_links_request_scope_fkey foreign key (
    reopen_request_id,
    complaint_id,
    resolution_id
  ) references complaints.complaint_reopen_requests (
    id,
    complaint_id,
    resolution_id
  ) on delete restrict,
  constraint complaint_reopen_evidence_links_evidence_scope_fkey foreign key (
    evidence_id,
    complaint_id,
    resolution_id
  ) references complaints.complaint_reopen_evidence (
    id,
    complaint_id,
    resolution_id
  ) on delete restrict
);

create table complaints.complaint_escalation_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  reopen_request_id uuid not null unique
    references complaints.complaint_reopen_requests (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  escalation_type text not null,
  observed_reopen_count smallint not null,
  threshold_reopen_count smallint not null,
  occurred_at timestamptz not null default now(),
  constraint complaint_escalation_events_type_check check (
    escalation_type = 'repeated_reopen'
  ),
  constraint complaint_escalation_events_count_check check (
    threshold_reopen_count >= 2
    and observed_reopen_count >= threshold_reopen_count
  )
);

create index citizen_action_requests_complaint_time_idx
  on complaints.citizen_action_requests (complaint_id, claimed_at desc, id);
create index citizen_action_audit_complaint_time_idx
  on complaints.citizen_action_audit_events (complaint_id, occurred_at desc, id);
create index complaint_feedback_complaint_time_idx
  on complaints.complaint_feedback (complaint_id, created_at desc, id);
create index complaint_reopen_evidence_complaint_time_idx
  on complaints.complaint_reopen_evidence (complaint_id, created_at, id);
create index complaint_reopen_evidence_expiry_idx
  on complaints.complaint_reopen_evidence (upload_expires_at)
  where upload_status = 'reserved';
create index complaint_reopen_requests_complaint_attempt_idx
  on complaints.complaint_reopen_requests (complaint_id, attempt_number desc);
create index complaint_escalation_events_complaint_time_idx
  on complaints.complaint_escalation_events (complaint_id, occurred_at desc, id);
create index complaint_resolutions_completion_location_gix
  on complaints.complaint_resolutions using gist (completion_location)
  where completion_location is not null;

comment on table complaints.resolution_policies is
  'Stable, scope-aware identity for versioned citizen feedback and reopening policy.';
comment on table complaints.resolution_policy_versions is
  'Effective-dated approved policy snapshots. No Phase 7 production policy is seeded.';
comment on table complaints.citizen_action_requests is
  'Durable exact-replay ledger for citizen feedback, reopen, and follow-up evidence mutations.';
comment on table complaints.citizen_action_audit_events is
  'Append-only, data-minimized audit evidence for successful citizen accountability actions.';
comment on table complaints.complaint_feedback is
  'Immutable citizen feedback linked to one exact completed resolution and policy version.';
comment on table complaints.complaint_reopen_evidence is
  'Private integrity-checked citizen follow-up evidence reserved before a reopen request.';
comment on table complaints.complaint_reopen_requests is
  'Accepted, policy-bound citizen reopen requests; denied attempts leave no partial record.';
comment on table complaints.complaint_escalation_events is
  'Append-only repeated-reopen escalation evidence with policy and assignment snapshots.';
