alter table complaints.complaints
  add column workflow_version bigint not null default 1,
  add constraint complaints_workflow_version_check check (workflow_version >= 1);

alter table complaints.complaint_assignments
  drop constraint complaint_assignments_complaint_id_key,
  drop constraint complaint_assignments_routing_decision_id_key,
  drop constraint complaint_assignments_source_check,
  drop constraint complaint_assignments_status_check;

alter table complaints.complaint_assignments
  add column version integer not null default 1,
  add column effective_from timestamptz,
  add column effective_to timestamptz,
  add column assigned_by_user_id uuid references auth.users (id) on delete restrict,
  add column ended_by_user_id uuid references auth.users (id) on delete restrict,
  add column assigned_user_id uuid references auth.users (id) on delete restrict,
  add column supersedes_assignment_id uuid
    references complaints.complaint_assignments (id) on delete restrict,
  add column reason_code text;

update complaints.complaint_assignments
set effective_from = assigned_at;

alter table complaints.complaint_assignments
  alter column effective_from set not null,
  alter column effective_from set default current_timestamp,
  add constraint complaint_assignments_version_check check (version >= 1),
  add constraint complaint_assignments_version_unique unique (complaint_id, version),
  add constraint complaint_assignments_supersedes_unique unique (supersedes_assignment_id),
  add constraint complaint_assignments_supersedes_self_check check (
    supersedes_assignment_id is distinct from id
  ),
  add constraint complaint_assignments_source_check check (
    assignment_source in (
      'routing_decision',
      'government_assignment',
      'government_reassignment',
      'government_transfer'
    )
  ),
  add constraint complaint_assignments_status_check check (
    status in ('active', 'superseded', 'cancelled')
  ),
  add constraint complaint_assignments_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  add constraint complaint_assignments_lifecycle_check check (
    (status = 'active' and effective_to is null and ended_by_user_id is null)
    or (status in ('superseded', 'cancelled') and effective_to is not null)
  ),
  add constraint complaint_assignments_reason_check check (
    reason_code is null
    or reason_code ~ '^[a-z][a-z0-9_]{1,79}$'
  );

create unique index complaint_assignments_one_active_idx
  on complaints.complaint_assignments (complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_history_idx
  on complaints.complaint_assignments (complaint_id, version desc);

create index complaint_assignments_active_authority_queue_idx
  on complaints.complaint_assignments (authority_id, complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_active_ward_queue_idx
  on complaints.complaint_assignments (ward_id, complaint_id)
  where status = 'active' and effective_to is null and ward_id is not null;

create index complaint_assignments_active_department_queue_idx
  on complaints.complaint_assignments (authority_department_id, complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_active_officer_queue_idx
  on complaints.complaint_assignments (officer_assignment_id, complaint_id)
  where status = 'active' and effective_to is null and officer_assignment_id is not null;

create table complaints.government_role_capabilities (
  role_id uuid primary key references public.roles (id) on delete restrict,
  can_view boolean not null default false,
  can_acknowledge boolean not null default false,
  can_assign boolean not null default false,
  can_transfer boolean not null default false,
  can_update_status boolean not null default false,
  can_add_internal_note boolean not null default false,
  can_manage_inspection boolean not null default false,
  can_add_work_reference boolean not null default false,
  can_add_external_dependency boolean not null default false,
  can_upload_resolution_evidence boolean not null default false,
  can_submit_resolution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into complaints.government_role_capabilities (
  role_id,
  can_view,
  can_acknowledge,
  can_assign,
  can_transfer,
  can_update_status,
  can_add_internal_note,
  can_manage_inspection,
  can_add_work_reference,
  can_add_external_dependency,
  can_upload_resolution_evidence,
  can_submit_resolution
)
select
  role.id,
  true,
  role.code <> 'moderator',
  role.code in ('platform_admin', 'municipal_admin', 'government_operator'),
  role.code in ('platform_admin', 'municipal_admin', 'government_operator'),
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator'
from public.roles as role
where role.code in (
  'platform_admin',
  'municipal_admin',
  'government_operator',
  'ward_officer',
  'department_officer',
  'moderator'
);

create table complaints.government_status_transition_rules (
  action_type text not null,
  from_status text not null,
  to_status text not null,
  created_at timestamptz not null default now(),
  primary key (action_type, from_status, to_status),
  constraint government_status_transition_action_check check (
    action_type in (
      'acknowledge',
      'assign',
      'transfer',
      'update_status',
      'schedule_inspection',
      'complete_inspection',
      'add_work_reference',
      'add_external_dependency',
      'resolve_external_dependency',
      'submit_resolution'
    )
  ),
  constraint government_status_transition_from_check check (
    from_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
      'acknowledged', 'inspection_scheduled', 'inspection_completed',
      'work_order_created', 'work_in_progress', 'resolution_submitted',
      'citizen_verification_pending', 'resolved', 'closed', 'transferred',
      'waiting_for_material', 'waiting_for_external_agency', 'reopened',
      'rejected', 'cancelled', 'escalated'
    )
  ),
  constraint government_status_transition_to_check check (
    to_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
      'acknowledged', 'inspection_scheduled', 'inspection_completed',
      'work_order_created', 'work_in_progress', 'resolution_submitted',
      'citizen_verification_pending', 'resolved', 'closed', 'transferred',
      'waiting_for_material', 'waiting_for_external_agency', 'reopened',
      'rejected', 'cancelled', 'escalated'
    )
  )
);

insert into complaints.government_status_transition_rules (
  action_type,
  from_status,
  to_status
)
values
  ('acknowledge', 'submitted', 'acknowledged'),
  ('acknowledge', 'assigned', 'acknowledged'),
  ('acknowledge', 'transferred', 'acknowledged'),
  ('acknowledge', 'reopened', 'acknowledged'),
  ('acknowledge', 'escalated', 'acknowledged'),
  ('assign', 'submitted', 'assigned'),
  ('assign', 'transferred', 'assigned'),
  ('assign', 'reopened', 'assigned'),
  ('assign', 'escalated', 'assigned'),
  ('transfer', 'submitted', 'transferred'),
  ('transfer', 'assigned', 'transferred'),
  ('transfer', 'acknowledged', 'transferred'),
  ('transfer', 'inspection_scheduled', 'transferred'),
  ('transfer', 'inspection_completed', 'transferred'),
  ('transfer', 'work_order_created', 'transferred'),
  ('transfer', 'work_in_progress', 'transferred'),
  ('transfer', 'waiting_for_material', 'transferred'),
  ('transfer', 'waiting_for_external_agency', 'transferred'),
  ('transfer', 'reopened', 'transferred'),
  ('transfer', 'escalated', 'transferred'),
  ('schedule_inspection', 'assigned', 'inspection_scheduled'),
  ('schedule_inspection', 'acknowledged', 'inspection_scheduled'),
  ('schedule_inspection', 'reopened', 'inspection_scheduled'),
  ('complete_inspection', 'inspection_scheduled', 'inspection_completed'),
  ('add_work_reference', 'acknowledged', 'work_order_created'),
  ('add_work_reference', 'inspection_completed', 'work_order_created'),
  ('add_external_dependency', 'acknowledged', 'waiting_for_external_agency'),
  ('add_external_dependency', 'inspection_completed', 'waiting_for_external_agency'),
  ('add_external_dependency', 'work_order_created', 'waiting_for_external_agency'),
  ('add_external_dependency', 'work_in_progress', 'waiting_for_external_agency'),
  ('add_external_dependency', 'acknowledged', 'waiting_for_material'),
  ('add_external_dependency', 'inspection_completed', 'waiting_for_material'),
  ('add_external_dependency', 'work_order_created', 'waiting_for_material'),
  ('add_external_dependency', 'work_in_progress', 'waiting_for_material'),
  ('resolve_external_dependency', 'waiting_for_material', 'work_in_progress'),
  ('resolve_external_dependency', 'waiting_for_external_agency', 'work_in_progress'),
  ('update_status', 'acknowledged', 'work_in_progress'),
  ('update_status', 'inspection_completed', 'work_in_progress'),
  ('update_status', 'work_order_created', 'work_in_progress'),
  ('update_status', 'waiting_for_material', 'work_in_progress'),
  ('update_status', 'waiting_for_external_agency', 'work_in_progress'),
  ('update_status', 'acknowledged', 'escalated'),
  ('update_status', 'inspection_scheduled', 'escalated'),
  ('update_status', 'inspection_completed', 'escalated'),
  ('update_status', 'work_order_created', 'escalated'),
  ('update_status', 'work_in_progress', 'escalated'),
  ('update_status', 'waiting_for_material', 'escalated'),
  ('update_status', 'waiting_for_external_agency', 'escalated'),
  ('update_status', 'escalated', 'acknowledged'),
  ('submit_resolution', 'acknowledged', 'resolution_submitted'),
  ('submit_resolution', 'inspection_completed', 'resolution_submitted'),
  ('submit_resolution', 'work_order_created', 'resolution_submitted'),
  ('submit_resolution', 'work_in_progress', 'resolution_submitted');

create table complaints.government_action_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  action_type text not null,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  request_id text not null,
  state text not null default 'claimed',
  from_status text,
  to_status text,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint government_action_requests_actor_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint government_action_requests_action_check check (
    action_type in (
      'acknowledge',
      'assign',
      'transfer',
      'update_status',
      'add_internal_note',
      'schedule_inspection',
      'complete_inspection',
      'add_work_reference',
      'add_external_dependency',
      'resolve_external_dependency',
      'upload_resolution_evidence',
      'finalize_resolution_evidence',
      'submit_resolution'
    )
  ),
  constraint government_action_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint government_action_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint government_action_requests_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint government_action_requests_state_check check (
    state in ('claimed', 'completed')
  ),
  constraint government_action_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint government_action_requests_completion_check check (
    (state = 'claimed' and response_payload is null and completed_at is null)
    or (state = 'completed' and response_payload is not null and completed_at is not null)
  )
);

create table complaints.government_action_audit_events (
  id uuid primary key default gen_random_uuid(),
  action_request_id uuid not null unique
    references complaints.government_action_requests (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  assignment_id uuid references complaints.complaint_assignments (id) on delete restrict,
  action_type text not null,
  from_status text,
  to_status text,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint government_action_audit_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'phone', 'email',
        'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create table complaints.complaint_internal_notes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint complaint_internal_notes_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  )
);

create table complaints.complaint_inspections (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  status text not null default 'scheduled',
  scheduled_for timestamptz not null,
  instructions text,
  scheduled_by_user_id uuid not null references auth.users (id) on delete restrict,
  outcome text,
  summary text,
  completed_by_user_id uuid references auth.users (id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_inspections_status_check check (
    status in ('scheduled', 'completed', 'cancelled')
  ),
  constraint complaint_inspections_instructions_check check (
    instructions is null
    or (instructions = btrim(instructions) and char_length(instructions) between 1 and 2000)
  ),
  constraint complaint_inspections_outcome_check check (
    outcome is null
    or outcome in (
      'confirmed', 'not_found', 'partially_confirmed', 'access_blocked',
      'external_dependency'
    )
  ),
  constraint complaint_inspections_summary_check check (
    summary is null
    or (summary = btrim(summary) and char_length(summary) between 1 and 4000)
  ),
  constraint complaint_inspections_completion_check check (
    (status = 'scheduled' and outcome is null and summary is null
      and completed_by_user_id is null and completed_at is null)
    or (status = 'completed' and outcome is not null and summary is not null
      and completed_by_user_id is not null and completed_at is not null)
    or status = 'cancelled'
  )
);

create unique index complaint_inspections_one_scheduled_idx
  on complaints.complaint_inspections (complaint_id)
  where status = 'scheduled';

create table complaints.complaint_work_references (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  added_by_user_id uuid not null references auth.users (id) on delete restrict,
  reference_type text not null,
  reference_number text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint complaint_work_references_type_check check (
    reference_type = btrim(reference_type)
    and reference_type ~ '^[A-Za-z][A-Za-z0-9 _.-]{0,79}$'
  ),
  constraint complaint_work_references_number_check check (
    reference_number = btrim(reference_number)
    and char_length(reference_number) between 1 and 160
  ),
  constraint complaint_work_references_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 2000)
  ),
  constraint complaint_work_references_unique unique (
    complaint_id,
    reference_type,
    reference_number
  )
);

create table complaints.complaint_external_dependencies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  added_by_user_id uuid not null references auth.users (id) on delete restrict,
  dependency_type text not null,
  description text not null,
  expected_by timestamptz,
  status text not null default 'active',
  resolution_summary text,
  resolved_by_user_id uuid references auth.users (id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_external_dependencies_type_check check (
    dependency_type in ('material', 'external_agency', 'permit', 'utility', 'other')
  ),
  constraint complaint_external_dependencies_description_check check (
    description = btrim(description) and char_length(description) between 1 and 4000
  ),
  constraint complaint_external_dependencies_status_check check (
    status in ('active', 'resolved', 'cancelled')
  ),
  constraint complaint_external_dependencies_resolution_summary_check check (
    resolution_summary is null
    or (resolution_summary = btrim(resolution_summary)
      and char_length(resolution_summary) between 1 and 2000)
  ),
  constraint complaint_external_dependencies_resolution_check check (
    (status = 'active' and resolution_summary is null
      and resolved_by_user_id is null and resolved_at is null)
    or (status in ('resolved', 'cancelled') and resolved_at is not null)
  )
);

create table complaints.complaint_resolution_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null,
  bucket_id text not null default 'resolution-evidence-private',
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  captured_at timestamptz,
  upload_status text not null default 'reserved',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_resolution_evidence_object_unique unique (bucket_id, object_path),
  constraint complaint_resolution_evidence_kind_check check (kind in ('photo', 'video')),
  constraint complaint_resolution_evidence_bucket_check check (
    bucket_id = 'resolution-evidence-private'
  ),
  constraint complaint_resolution_evidence_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/original$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_resolution_evidence_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_resolution_evidence_observed_mime_check check (
    observed_mime_type is null
    or observed_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_resolution_evidence_size_check check (
    declared_byte_size between 1 and 52428800
    and (observed_byte_size is null or observed_byte_size between 1 and 52428800)
  ),
  constraint complaint_resolution_evidence_hash_check check (
    client_sha256 ~ '^[0-9a-f]{64}$'
    and (verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$')
  ),
  constraint complaint_resolution_evidence_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_resolution_evidence_expiry_check check (
    upload_expires_at > created_at
  ),
  constraint complaint_resolution_evidence_finalize_check check (
    (upload_status = 'finalized' and observed_mime_type is not null
      and observed_byte_size is not null and verified_sha256 is not null
      and finalized_at is not null and failure_code is null)
    or (upload_status <> 'finalized' and finalized_at is null and verified_sha256 is null)
  )
);

create table complaints.complaint_resolutions (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  version integer not null,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users (id) on delete restrict,
  completion_note text not null,
  public_message text,
  created_at timestamptz not null default now(),
  constraint complaint_resolutions_version_unique unique (complaint_id, version),
  constraint complaint_resolutions_version_check check (version >= 1),
  constraint complaint_resolutions_note_check check (
    completion_note = btrim(completion_note)
    and char_length(completion_note) between 1 and 4000
  ),
  constraint complaint_resolutions_public_message_check check (
    public_message is null
    or (public_message = btrim(public_message) and char_length(public_message) between 1 and 1000)
  )
);

create table complaints.complaint_resolution_evidence_links (
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  evidence_id uuid not null
    references complaints.complaint_resolution_evidence (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (resolution_id, evidence_id),
  constraint complaint_resolution_evidence_links_evidence_unique unique (evidence_id)
);

create table complaints.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  status_history_id uuid not null unique
    references complaints.complaint_status_history (id) on delete restrict,
  event_type text not null default 'complaint_status_changed',
  aggregate_type text not null default 'complaint',
  aggregate_id uuid not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint notification_outbox_event_type_check check (
    event_type = 'complaint_status_changed'
  ),
  constraint notification_outbox_aggregate_check check (
    aggregate_type = 'complaint' and aggregate_id = complaint_id
  ),
  constraint notification_outbox_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'status', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'status', 'authorityId', 'wardId',
      'authorityDepartmentId', 'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'citizenUserId',
        'phone', 'email', 'objectPath', 'signedUrl', 'token'
      ]
    )
  )
);

create index complaints_government_queue_idx
  on complaints.complaints (current_status, submitted_at desc, id desc);
create index complaints_government_category_queue_idx
  on complaints.complaints (category_id, submitted_at desc, id desc);
create index complaints_government_number_trgm_idx
  on complaints.complaints using gin (complaint_number extensions.gin_trgm_ops);
create index complaint_internal_notes_timeline_idx
  on complaints.complaint_internal_notes (complaint_id, created_at, id);
create index complaint_inspections_timeline_idx
  on complaints.complaint_inspections (complaint_id, created_at, id);
create index complaint_work_references_timeline_idx
  on complaints.complaint_work_references (complaint_id, created_at, id);
create index complaint_external_dependencies_timeline_idx
  on complaints.complaint_external_dependencies (complaint_id, created_at, id);
create index complaint_resolution_evidence_timeline_idx
  on complaints.complaint_resolution_evidence (complaint_id, created_at, id);
create index complaint_resolution_evidence_expiry_idx
  on complaints.complaint_resolution_evidence (upload_expires_at)
  where upload_status = 'reserved';
create index government_action_audit_complaint_time_idx
  on complaints.government_action_audit_events (complaint_id, occurred_at desc, id);
create index notification_outbox_created_idx
  on complaints.notification_outbox (created_at, id);

comment on table complaints.government_role_capabilities is
  'Least-privilege Phase 5 capability matrix; moderators are read-only.';
comment on table complaints.government_status_transition_rules is
  'Fail-closed Phase 5 government workflow transition graph.';
comment on table complaints.government_action_requests is
  'Durable exact-replay ledger for government complaint mutations.';
comment on table complaints.government_action_audit_events is
  'Append-only, data-minimized audit trail for successful government actions.';
comment on table complaints.notification_outbox is
  'Private data-minimized domain-event outbox; Phase 5 provides no delivery behavior.';
