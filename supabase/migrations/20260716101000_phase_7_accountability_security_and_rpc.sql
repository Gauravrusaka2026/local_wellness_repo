alter table complaints.complaint_status_history
  drop constraint complaint_status_history_source_check,
  add constraint complaint_status_history_source_check check (
    event_source in ('citizen_submission', 'citizen_action', 'government_action', 'system')
  );

create function complaints.validate_resolution_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  if exists (
    select 1
    from unnest(new.eligible_reopen_statuses) as value(status)
    where value.status is null
  ) or exists (
    select 1
    from unnest(new.eligible_feedback_statuses) as value(status)
    where value.status is null
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    where value.reason_code is null
  ) or exists (
    select 1
    from unnest(new.eligible_reopen_statuses) as value(status)
    group by value.status
    having count(*) > 1
  ) or exists (
    select 1
    from unnest(new.eligible_feedback_statuses) as value(status)
    group by value.status
    having count(*) > 1
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    where value.reason_code !~ '^[a-z][a-z0-9_]{1,79}$'
       or value.reason_code <> btrim(value.reason_code)
    group by value.reason_code
    having count(*) >= 1
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    group by value.reason_code
    having count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'RESOLUTION_POLICY_CONFIGURATION_INVALID';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.resolution_policy_id is distinct from old.resolution_policy_id
    or new.version is distinct from old.version
    or new.rating_minimum is distinct from old.rating_minimum
    or new.rating_maximum is distinct from old.rating_maximum
    or new.ratings_required is distinct from old.ratings_required
    or new.feedback_window_seconds is distinct from old.feedback_window_seconds
    or new.eligible_feedback_statuses is distinct from old.eligible_feedback_statuses
    or new.reopen_window_seconds is distinct from old.reopen_window_seconds
    or new.eligible_reopen_statuses is distinct from old.eligible_reopen_statuses
    or new.max_reopen_attempts is distinct from old.max_reopen_attempts
    or new.reopen_evidence_required is distinct from old.reopen_evidence_required
    or new.allowed_reopen_reason_codes is distinct from old.allowed_reopen_reason_codes
    or new.repeat_escalation_threshold is distinct from old.repeat_escalation_threshold
    or new.effective_from is distinct from old.effective_from
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and not (
    (
      old.status = 'draft'
      and new.status = 'approved'
      and old.approved_by_user_id is null
      and old.approved_at is null
      and old.effective_to is null
      and new.approved_by_user_id is not null
      and new.approved_at is not null
      and new.effective_to is null
    )
    or (
      old.status = 'approved'
      and new.status = 'superseded'
      and new.effective_to is not null
      and new.effective_to > new.effective_from
      and new.effective_to >= current_timestamp
      and new.approved_by_user_id is not distinct from old.approved_by_user_id
      and new.approved_at is not distinct from old.approved_at
    )
  ) then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger resolution_policy_versions_validate
before insert or update or delete on complaints.resolution_policy_versions
for each row execute function complaints.validate_resolution_policy_version();

create function complaints.current_citizen_action_request_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text;
begin
  configured := current_setting('local_wellness.citizen_action_id', true);
  if configured is null or configured = '' then
    return null;
  end if;
  begin
    return configured::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

create function complaints.validate_citizen_action_request_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or old.state <> 'claimed'
    or new.id is distinct from old.id
    or new.actor_user_id is distinct from old.actor_user_id
    or new.complaint_id is distinct from old.complaint_id
    or new.action_type is distinct from old.action_type
    or new.idempotency_key_hash is distinct from old.idempotency_key_hash
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.request_id is distinct from old.request_id
    or new.expected_workflow_version is distinct from old.expected_workflow_version
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.claimed_at is distinct from old.claimed_at
    or complaints.current_citizen_action_request_id() is distinct from old.id
    or new.state <> 'completed'
    or new.response_payload is null
    or new.completed_at is null then
    raise exception using errcode = '55000', message = 'CITIZEN_ACTION_REQUEST_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger citizen_action_requests_validate_mutation
before update or delete on complaints.citizen_action_requests
for each row execute function complaints.validate_citizen_action_request_mutation();

create or replace function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  government_action_id uuid := complaints.current_action_request_id();
  citizen_action_id uuid := complaints.current_citizen_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if new.id is distinct from old.id
    or new.draft_id is distinct from old.draft_id
    or new.complaint_number is distinct from old.complaint_number
    or new.citizen_user_id is distinct from old.citizen_user_id
    or new.category_id is distinct from old.category_id
    or new.asset_id is distinct from old.asset_id
    or new.description is distinct from old.description
    or new.description_language is distinct from old.description_language
    or new.custom_attributes is distinct from old.custom_attributes
    or new.location_evidence_id is distinct from old.location_evidence_id
    or new.routing_decision_id is distinct from old.routing_decision_id
    or new.visibility is distinct from old.visibility
    or new.submitted_at is distinct from old.submitted_at
    or new.created_at is distinct from old.created_at
    or new.workflow_version <> old.workflow_version + 1
    or new.updated_at < old.updated_at then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if government_action_id is not null and exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = government_action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    return new;
  end if;

  if citizen_action_id is not null and exists (
    select 1
    from complaints.citizen_action_requests as action
    where action.id = citizen_action_id
      and action.complaint_id = old.id
      and action.actor_user_id = old.citizen_user_id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'complaints.complaints records are append-only.';
end;
$$;

create function complaints.validate_reopen_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_citizen_action_request_id();
  mutation_mode text := nullif(
    current_setting('local_wellness.reopen_evidence_mutation', true),
    ''
  );
begin
  if tg_op = 'DELETE'
    or old.upload_status <> 'reserved'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.resolution_id is distinct from old.resolution_id
    or new.uploader_user_id is distinct from old.uploader_user_id
    or new.kind is distinct from old.kind
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.declared_mime_type is distinct from old.declared_mime_type
    or new.declared_byte_size is distinct from old.declared_byte_size
    or new.client_sha256 is distinct from old.client_sha256
    or new.width_pixels is distinct from old.width_pixels
    or new.height_pixels is distinct from old.height_pixels
    or new.duration_milliseconds is distinct from old.duration_milliseconds
    or new.captured_at is distinct from old.captured_at
    or not extensions.st_equals(new.capture_location, old.capture_location)
    or new.capture_accuracy_meters is distinct from old.capture_accuracy_meters
    or new.capture_provider is distinct from old.capture_provider
    or new.location_captured_at is distinct from old.location_captured_at
    or new.location_device_recorded_at is distinct from old.location_device_recorded_at
    or new.mock_location_detected is distinct from old.mock_location_detected
    or new.upload_expires_at is distinct from old.upload_expires_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
  end if;

  if new.upload_status = 'finalized' then
    if action_id is null or not exists (
      select 1
      from complaints.citizen_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.actor_user_id = old.uploader_user_id
        and action.action_type = 'finalize_reopen_evidence'
        and action.state = 'claimed'
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status in ('failed', 'expired') then
    if mutation_mode not in ('fail', 'expire')
      or new.failure_code is null
      or new.failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
    end if;
  else
    raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_reopen_evidence_validate_mutation
before update or delete on complaints.complaint_reopen_evidence
for each row execute function complaints.validate_reopen_evidence_mutation();
create trigger complaint_reopen_evidence_set_updated_at
before update on complaints.complaint_reopen_evidence
for each row execute function private.set_updated_at();
create trigger resolution_policies_append_only
before update or delete on complaints.resolution_policies
for each row execute function complaints.reject_append_only_mutation();

create trigger citizen_action_audit_events_append_only
before update or delete on complaints.citizen_action_audit_events
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_feedback_append_only
before update or delete on complaints.complaint_feedback
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_reopen_requests_append_only
before update or delete on complaints.complaint_reopen_requests
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_reopen_evidence_links_append_only
before update or delete on complaints.complaint_reopen_evidence_links
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_escalation_events_append_only
before update or delete on complaints.complaint_escalation_events
for each row execute function complaints.reject_append_only_mutation();

create function complaints.resolve_resolution_policy_version(
  p_authority_id uuid,
  p_category_id uuid,
  p_at timestamptz default current_timestamp
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_id uuid;
  selected_count integer;
begin
  with eligible as (
    select
      version.id,
      ((policy.authority_id is not null)::integer
        + (policy.category_id is not null)::integer) as specificity
    from complaints.resolution_policies as policy
    inner join complaints.resolution_policy_versions as version
      on version.resolution_policy_id = policy.id
    where version.status in ('approved', 'superseded')
      and version.effective_from <= p_at
      and (version.effective_to is null or version.effective_to > p_at)
      and (policy.authority_id is null or policy.authority_id = p_authority_id)
      and (policy.category_id is null or policy.category_id = p_category_id)
  ), ranked as (
    select eligible.*, max(eligible.specificity) over () as highest_specificity
    from eligible
  )
  select (array_agg(ranked.id order by ranked.id))[1], count(*)::integer
  into selected_id, selected_count
  from ranked
  where ranked.specificity = ranked.highest_specificity;

  if selected_id is null or selected_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  return selected_id;
end;
$$;

insert into complaints.government_status_transition_rules (
  action_type,
  from_status,
  to_status
)
values
  ('submit_resolution', 'acknowledged', 'citizen_verification_pending'),
  ('submit_resolution', 'inspection_completed', 'citizen_verification_pending'),
  ('submit_resolution', 'work_order_created', 'citizen_verification_pending'),
  ('submit_resolution', 'work_in_progress', 'citizen_verification_pending')
on conflict do nothing;

alter function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) rename to perform_government_complaint_action_phase5_impl;

revoke all on function public.perform_government_complaint_action_phase5_impl(
  uuid, uuid, text, bigint, text, text, text, jsonb
) from public, anon, authenticated, service_role;

create function complaints.perform_phase7_resolution_submission(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_payload jsonb
)
returns table (response_payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  resolution_id uuid := gen_random_uuid();
  resolution_version integer;
  evidence_ids uuid[];
  history_id uuid := gen_random_uuid();
  response jsonb;
  location_payload jsonb;
  completion_longitude double precision;
  completion_latitude double precision;
  completion_accuracy double precision;
  completion_provider text;
  location_captured_at timestamptz;
  location_device_recorded_at timestamptz;
  mock_location_detected boolean;
  maximum_location_accuracy double precision;
  maximum_location_age_seconds integer;
  work_reference_id uuid;
  public_message text;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload - array[
      'completionNote', 'resolutionEvidenceIds', 'publicMessage',
      'completionLocation', 'workReferenceId'
    ] <> '{}'::jsonb
    or not (p_payload ?& array[
      'completionNote', 'resolutionEvidenceIds', 'completionLocation'
    ])
    or jsonb_typeof(p_payload -> 'resolutionEvidenceIds') <> 'array'
    or jsonb_array_length(p_payload -> 'resolutionEvidenceIds') not between 1 and 20
    or jsonb_typeof(p_payload -> 'completionLocation') <> 'object' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'submit_resolution'
      or existing_action.request_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    if existing_action.state <> 'completed' then
      raise exception using errcode = '55000', message = 'COMPLAINT_ACTION_IN_PROGRESS';
    end if;

    select current_assignment.* into assignment
    from complaints.complaint_assignments as current_assignment
    where current_assignment.complaint_id = p_complaint_id
      and current_assignment.status = 'active'
      and current_assignment.effective_to is null;
    if not found or not complaints.actor_can_access_assignment(
      p_actor_user_id,
      assignment.id,
      'submit_resolution',
      null,
      operation_at
    ) then
      raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null
  for update;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id,
    assignment.id,
    'submit_resolution',
    null,
    operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  if not exists (
    select 1
    from complaints.government_status_transition_rules as rule
    where rule.action_type = 'submit_resolution'
      and rule.from_status = complaint.current_status
      and rule.to_status = 'citizen_verification_pending'
  ) or exists (
    select 1
    from complaints.complaint_external_dependencies as dependency
    where dependency.complaint_id = complaint.id
      and dependency.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  location_payload := p_payload -> 'completionLocation';
  if location_payload - array[
    'longitude', 'latitude', 'accuracyMeters', 'provider', 'capturedAt',
    'deviceRecordedAt', 'isMockLocation'
  ] <> '{}'::jsonb
    or not (location_payload ?& array[
      'longitude', 'latitude', 'accuracyMeters', 'provider', 'capturedAt',
      'deviceRecordedAt', 'isMockLocation'
    ])
    or jsonb_typeof(location_payload -> 'longitude') <> 'number'
    or jsonb_typeof(location_payload -> 'latitude') <> 'number'
    or jsonb_typeof(location_payload -> 'accuracyMeters') <> 'number'
    or jsonb_typeof(location_payload -> 'provider') <> 'string'
    or jsonb_typeof(location_payload -> 'capturedAt') <> 'string'
    or jsonb_typeof(location_payload -> 'deviceRecordedAt') <> 'string'
    or jsonb_typeof(location_payload -> 'isMockLocation') not in ('boolean', 'null') then
    raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end if;
  begin
    completion_longitude := (location_payload ->> 'longitude')::double precision;
    completion_latitude := (location_payload ->> 'latitude')::double precision;
    completion_accuracy := (location_payload ->> 'accuracyMeters')::double precision;
    completion_provider := location_payload ->> 'provider';
    location_captured_at := (location_payload ->> 'capturedAt')::timestamptz;
    location_device_recorded_at :=
      (location_payload ->> 'deviceRecordedAt')::timestamptz;
    mock_location_detected := (location_payload ->> 'isMockLocation')::boolean;
    work_reference_id := nullif(p_payload ->> 'workReferenceId', '')::uuid;
  exception
    when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end;
  select
    coalesce(
      (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
      100
    ),
    coalesce(
      (category.location_verification_requirements ->> 'maximumAgeSeconds')::integer,
      300
    )
  into maximum_location_accuracy, maximum_location_age_seconds
  from routing.issue_categories as category
  where category.id = complaint.category_id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  if location_captured_at is null
    or location_device_recorded_at is null
    or completion_longitude not between -180 and 180
    or completion_latitude not between -90 and 90
    or completion_accuracy not between 0 and 5000
    or completion_provider not in ('gps', 'network', 'fused', 'unknown')
    or completion_accuracy > maximum_location_accuracy
    or mock_location_detected is true
    or extract(epoch from (operation_at - location_captured_at))
      > maximum_location_age_seconds
    or location_captured_at > operation_at + interval '2 minutes'
    or location_device_recorded_at > operation_at + interval '2 minutes'
    or abs(extract(epoch from (
      location_captured_at - location_device_recorded_at
    ))) > 300 then
    raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end if;

  if work_reference_id is not null and not exists (
    select 1
    from complaints.complaint_work_references as work_reference
    where work_reference.id = work_reference_id
      and work_reference.complaint_id = complaint.id
      and work_reference.assignment_id = assignment.id
  ) then
    raise exception using errcode = '22023', message = 'RESOLUTION_WORK_REFERENCE_INVALID';
  end if;

  begin
    select array_agg(value::uuid order by ordinal)
    into evidence_ids
    from jsonb_array_elements_text(p_payload -> 'resolutionEvidenceIds')
      with ordinality as evidence(value, ordinal);
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
  end;
  if cardinality(evidence_ids) <> (
    select count(distinct evidence_id)::integer
    from unnest(evidence_ids) as evidence_id
  ) then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;

  perform 1
  from complaints.complaint_resolution_evidence as evidence
  where evidence.id = any(evidence_ids)
  for update;
  if (
    select count(*)
    from complaints.complaint_resolution_evidence as evidence
    where evidence.id = any(evidence_ids)
      and evidence.complaint_id = complaint.id
      and evidence.assignment_id = assignment.id
      and evidence.upload_status = 'finalized'
      and evidence.finalized_at is not null
      and not exists (
        select 1
        from complaints.complaint_resolution_evidence_links as link
        where link.evidence_id = evidence.id
      )
  ) <> cardinality(evidence_ids) then
    raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'submit_resolution',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, 'citizen_verification_pending'
  );
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  select coalesce(max(resolution.version), 0) + 1
  into resolution_version
  from complaints.complaint_resolutions as resolution
  where resolution.complaint_id = complaint.id;
  public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');
  insert into complaints.complaint_resolutions (
    id, complaint_id, version, assignment_id, submitted_by_user_id,
    completion_note, public_message, created_at, completed_at,
    completion_location, completion_accuracy_meters, completion_provider,
    location_captured_at, completion_location_device_recorded_at,
    completion_mock_location_detected, completion_distance_to_complaint_meters,
    work_reference_id
  ) values (
    resolution_id, complaint.id, resolution_version, assignment.id,
    p_actor_user_id, btrim(p_payload ->> 'completionNote'), public_message,
    operation_at, operation_at,
    extensions.st_setsrid(
      extensions.st_makepoint(completion_longitude, completion_latitude),
      4326
    )::extensions.geometry(Point, 4326),
    completion_accuracy, completion_provider, location_captured_at,
    location_device_recorded_at, mock_location_detected,
    (
      select extensions.st_distance(
        original_location.location::extensions.geography,
        extensions.st_setsrid(
          extensions.st_makepoint(completion_longitude, completion_latitude),
          4326
        )::extensions.geography
      )
      from complaints.complaint_location_evidence as original_location
      where original_location.id = complaint.location_evidence_id
    ),
    work_reference_id
  );
  insert into complaints.complaint_resolution_evidence_links (
    resolution_id,
    evidence_id,
    role,
    created_at
  )
  select resolution_id, evidence_id, 'after', operation_at
  from unnest(evidence_ids) as evidence_id;

  update complaints.complaints as target
  set
    current_status = 'citizen_verification_pending',
    workflow_version = target.workflow_version + 1,
    updated_at = operation_at
  where target.id = complaint.id;

  insert into complaints.complaint_status_history (
    id, complaint_id, sequence, from_status, to_status, actor_user_id,
    event_source, reason_code, public_message, request_id, occurred_at
  ) values (
    history_id, complaint.id,
    (select coalesce(max(history.sequence), 0) + 1
      from complaints.complaint_status_history as history
      where history.complaint_id = complaint.id),
    complaint.current_status, 'citizen_verification_pending', p_actor_user_id,
    'government_action', 'RESOLUTION_SUBMITTED', public_message,
    p_request_id, operation_at
  );
  insert into complaints.notification_outbox (
    complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
  ) values (
    complaint.id, history_id, 'complaint_status_changed', complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', 'citizen_verification_pending',
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )),
    operation_at
  );

  response := jsonb_build_object(
    'actionId', action_id,
    'complaintId', complaint.id,
    'complaintNumber', complaint.complaint_number,
    'status', 'citizen_verification_pending',
    'workflowVersion', complaint.workflow_version + 1,
    'updatedAt', operation_at,
    'currentAssignment', complaints.assignment_summary(assignment.id)
  );
  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id,
    assignment.id, 'submit_resolution', complaint.current_status,
    'citizen_verification_pending', p_request_id,
    jsonb_build_object('entityId', resolution_id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

create function public.perform_government_complaint_action(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_action_type text,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_payload jsonb default '{}'::jsonb
)
returns table (response_payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_action_type = 'submit_resolution' then
    return query
    select result.response_payload, result.replayed
    from complaints.perform_phase7_resolution_submission(
      p_actor_user_id,
      p_complaint_id,
      p_expected_workflow_version,
      p_idempotency_key_hash,
      p_request_fingerprint,
      p_request_id,
      p_payload
    ) as result;
    return;
  end if;

  return query
  select result.response_payload, result.replayed
  from public.perform_government_complaint_action_phase5_impl(
    p_actor_user_id,
    p_complaint_id,
    p_action_type,
    p_expected_workflow_version,
    p_idempotency_key_hash,
    p_request_fingerprint,
    p_request_id,
    p_payload
  ) as result;
end;
$$;

create function complaints.accountability_resolution_payload(
  p_complaint_id uuid,
  p_resolution_id uuid,
  p_include_completion_note boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', resolution.id,
    'version', resolution.version,
    'publicMessage', resolution.public_message,
    'completedAt', resolution.completed_at,
    'completionLocation', case when resolution.completion_location is null then null
      else jsonb_build_object(
        'latitude', extensions.st_y(resolution.completion_location),
        'longitude', extensions.st_x(resolution.completion_location),
        'accuracyMeters', resolution.completion_accuracy_meters,
        'provider', resolution.completion_provider,
        'capturedAt', resolution.location_captured_at
      ) end,
    'distanceFromComplaintMeters', resolution.completion_distance_to_complaint_meters,
    'workReference', case when resolution.work_reference_id is null then null else (
      select jsonb_build_object(
        'id', work_reference.id,
        'referenceType', work_reference.reference_type,
        'referenceNumber', work_reference.reference_number,
        'description', work_reference.description
      )
      from complaints.complaint_work_references as work_reference
      where work_reference.id = resolution.work_reference_id
        and work_reference.complaint_id = resolution.complaint_id
    ) end,
    'beforeEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', media.id,
        'role', 'before',
        'kind', media.media_kind,
        'mimeType', coalesce(media.observed_mime_type, media.declared_mime_type),
        'byteSize', coalesce(media.observed_byte_size, media.declared_byte_size),
        'capturedAt', media.captured_at,
        'createdAt', media.created_at
      ) order by media.created_at, media.id)
      from complaints.complaint_media as media
      inner join complaints.complaints as source_complaint
        on source_complaint.draft_id = media.draft_id
      where source_complaint.id = resolution.complaint_id
        and media.upload_status = 'finalized'
    ), '[]'::jsonb),
    'afterEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'role', 'after',
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'capturedAt', evidence.captured_at,
        'createdAt', evidence.created_at
      ) order by link.created_at, evidence.id)
      from complaints.complaint_resolution_evidence_links as link
      inner join complaints.complaint_resolution_evidence as evidence
        on evidence.id = link.evidence_id
      where link.resolution_id = resolution.id
        and evidence.upload_status = 'finalized'
    ), '[]'::jsonb),
    'reopenEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'role', 'reopen',
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'capturedAt', evidence.captured_at,
        'createdAt', evidence.created_at
      ) order by link.created_at, evidence.id)
      from complaints.complaint_reopen_requests as reopen_request
      inner join complaints.complaint_reopen_evidence_links as link
        on link.reopen_request_id = reopen_request.id
      inner join complaints.complaint_reopen_evidence as evidence
        on evidence.id = link.evidence_id
      where reopen_request.resolution_id = resolution.id
        and evidence.upload_status = 'finalized'
    ), '[]'::jsonb)
  ) || case when p_include_completion_note
    then jsonb_build_object('completionNote', resolution.completion_note)
    else '{}'::jsonb
  end
  from complaints.complaint_resolutions as resolution
  where resolution.id = p_resolution_id
    and resolution.complaint_id = p_complaint_id;
$$;

create function public.get_citizen_resolution_context(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (resolution_context jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy_version complaints.resolution_policy_versions%rowtype;
  reopen_count integer := 0;
  policy_payload jsonb := null;
  policy_unavailable_reason text := null;
  feedback_allowed boolean := false;
  reopen_allowed boolean := false;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;

  if resolution.id is not null then
    select historical_assignment.* into resolution_assignment
    from complaints.complaint_assignments as historical_assignment
    where historical_assignment.id = resolution.assignment_id
      and historical_assignment.complaint_id = complaint.id;
  end if;

  if resolution.id is null then
    policy_unavailable_reason := 'No completed resolution is available for review.';
  elsif resolution.completed_at is null then
    policy_unavailable_reason := 'The latest resolution is not ready for citizen review.';
  else
    select count(*)::integer into reopen_count
    from complaints.complaint_reopen_requests as reopen_request
    where reopen_request.complaint_id = complaint.id;

    if resolution_assignment.id is null then
      policy_unavailable_reason := 'No resolution assignment is available for this complaint.';
    else
      begin
        select version.* into policy_version
        from complaints.resolution_policy_versions as version
        where version.id = complaints.resolve_resolution_policy_version(
          resolution_assignment.authority_id,
          complaint.category_id,
          resolution.completed_at
        );

        feedback_allowed := complaint.current_status = any(policy_version.eligible_feedback_statuses)
          and current_timestamp <= resolution.completed_at
            + make_interval(secs => policy_version.feedback_window_seconds)
          and not exists (
            select 1
            from complaints.complaint_feedback as feedback
            where feedback.resolution_id = resolution.id
              and feedback.citizen_user_id = p_actor_user_id
          );
        reopen_allowed := complaint.current_status = any(policy_version.eligible_reopen_statuses)
          and current_timestamp <= resolution.completed_at
            + make_interval(secs => policy_version.reopen_window_seconds)
          and reopen_count < policy_version.max_reopen_attempts
          and not exists (
            select 1
            from complaints.complaint_reopen_requests as reopen_request
            where reopen_request.resolution_id = resolution.id
          );
        policy_payload := jsonb_build_object(
          'id', policy_version.id,
          'version', policy_version.version,
          'outcomeOptions', jsonb_build_array(
            jsonb_build_object('code', 'resolved', 'label', 'Resolved'),
            jsonb_build_object('code', 'partially_resolved', 'label', 'Partially resolved'),
            jsonb_build_object('code', 'not_resolved', 'label', 'Not resolved'),
            jsonb_build_object('code', 'temporary_fix', 'label', 'Temporary fix'),
            jsonb_build_object('code', 'wrong_location', 'label', 'Wrong location')
          ),
          'reopenReasonOptions', coalesce((
            select jsonb_agg(jsonb_build_object(
              'code', reason.code,
              'label', initcap(replace(reason.code, '_', ' '))
            ) order by reason.ordinal)
            from unnest(policy_version.allowed_reopen_reason_codes)
              with ordinality as reason(code, ordinal)
          ), '[]'::jsonb),
          'ratingMinimum', policy_version.rating_minimum,
          'ratingMaximum', policy_version.rating_maximum,
          'ratingsRequired', policy_version.ratings_required,
          'ratingLabels', jsonb_build_object(
            'satisfaction', 'Satisfaction',
            'speed', 'Resolution speed',
            'quality', 'Resolution quality',
            'communication', 'Communication'
          ),
          'reopenDeadline', resolution.completed_at
            + make_interval(secs => policy_version.reopen_window_seconds),
          'reopenAttemptsRemaining', greatest(
            policy_version.max_reopen_attempts - reopen_count,
            0
          ),
          'reopenEvidenceRequired', policy_version.reopen_evidence_required,
          'feedbackAllowed', feedback_allowed,
          'reopenAllowed', reopen_allowed,
          'reopenEvidenceUploadAllowed', reopen_allowed,
          'unavailableReason', null
        );
      exception when sqlstate '55000' then
        policy_unavailable_reason :=
          'No unambiguous approved resolution policy is available for this complaint.';
      end;
    end if;
  end if;

  return query select jsonb_build_object(
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version,
    'status', complaint.current_status,
    'latestResolution', case when resolution.id is null then null
      else complaints.accountability_resolution_payload(
        complaint.id,
        resolution.id,
        false
      ) end,
    'policy', policy_payload,
    'policyUnavailableReason', policy_unavailable_reason,
    'availableReopenEvidence', case when resolution.id is null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', evidence.id,
          'kind', evidence.kind,
          'mimeType', evidence.observed_mime_type,
          'byteSize', evidence.observed_byte_size,
          'uploadStatus', evidence.upload_status,
          'capturedAt', evidence.captured_at,
          'captureLocation', jsonb_build_object(
            'latitude', extensions.st_y(evidence.capture_location),
            'longitude', extensions.st_x(evidence.capture_location),
            'accuracyMeters', evidence.capture_accuracy_meters,
            'provider', evidence.capture_provider,
            'capturedAt', evidence.location_captured_at
          ),
          'finalizedAt', evidence.finalized_at,
          'createdAt', evidence.created_at
        ) order by evidence.created_at, evidence.id)
        from complaints.complaint_reopen_evidence as evidence
        where evidence.complaint_id = complaint.id
          and evidence.resolution_id = resolution.id
          and evidence.uploader_user_id = p_actor_user_id
          and evidence.upload_status = 'finalized'
          and not exists (
            select 1
            from complaints.complaint_reopen_evidence_links as link
            where link.evidence_id = evidence.id
          )
      ), '[]'::jsonb) end,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', feedback.id,
        'resolutionId', feedback.resolution_id,
        'outcome', feedback.outcome,
        'ratings', case when feedback.satisfaction_rating is null then null
          else jsonb_build_object(
            'satisfaction', feedback.satisfaction_rating,
            'speed', feedback.speed_rating,
            'quality', feedback.quality_rating,
            'communication', feedback.communication_rating
          ) end,
        'comment', feedback.comment,
        'submittedAt', feedback.created_at
      ) order by feedback.created_at, feedback.id)
      from complaints.complaint_feedback as feedback
      where feedback.complaint_id = complaint.id
        and feedback.citizen_user_id = p_actor_user_id
    ), '[]'::jsonb),
    'reopenRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reopen_request.id,
        'resolutionId', reopen_request.resolution_id,
        'attemptNumber', reopen_request.attempt_number,
        'reasonCode', reopen_request.reason_code,
        'explanation', reopen_request.reason_detail,
        'evidenceIds', coalesce((
          select jsonb_agg(link.evidence_id order by link.created_at, link.evidence_id)
          from complaints.complaint_reopen_evidence_links as link
          where link.reopen_request_id = reopen_request.id
        ), '[]'::jsonb),
        'resultingStatus', reopen_request.outcome_status,
        'requestedAt', reopen_request.requested_at
      ) order by reopen_request.attempt_number)
      from complaints.complaint_reopen_requests as reopen_request
      where reopen_request.complaint_id = complaint.id
        and reopen_request.citizen_user_id = p_actor_user_id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', escalation.id,
        'level', escalation.observed_reopen_count,
        'reasonCode', escalation.escalation_type,
        'occurredAt', escalation.occurred_at
      ) order by escalation.occurred_at, escalation.id)
      from complaints.complaint_escalation_events as escalation
      where escalation.complaint_id = complaint.id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_government_complaint_accountability(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid
)
returns table (accountability jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id,
    assignment.id,
    'view',
    p_scope_role_assignment_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  return query select jsonb_build_object(
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version,
    'resolutionHistory', coalesce((
      select jsonb_agg(
        complaints.accountability_resolution_payload(
          complaint.id,
          resolution.id,
          true
        ) order by resolution.version
      )
      from complaints.complaint_resolutions as resolution
      where resolution.complaint_id = complaint.id
    ), '[]'::jsonb),
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', feedback.id,
        'resolutionId', feedback.resolution_id,
        'outcome', feedback.outcome,
        'ratings', case when feedback.satisfaction_rating is null then null
          else jsonb_build_object(
            'satisfaction', feedback.satisfaction_rating,
            'speed', feedback.speed_rating,
            'quality', feedback.quality_rating,
            'communication', feedback.communication_rating
          ) end,
        'comment', feedback.comment,
        'submittedAt', feedback.created_at
      ) order by feedback.created_at, feedback.id)
      from complaints.complaint_feedback as feedback
      where feedback.complaint_id = complaint.id
    ), '[]'::jsonb),
    'reopenRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reopen_request.id,
        'resolutionId', reopen_request.resolution_id,
        'attemptNumber', reopen_request.attempt_number,
        'reasonCode', reopen_request.reason_code,
        'explanation', reopen_request.reason_detail,
        'evidenceIds', coalesce((
          select jsonb_agg(link.evidence_id order by link.created_at, link.evidence_id)
          from complaints.complaint_reopen_evidence_links as link
          where link.reopen_request_id = reopen_request.id
        ), '[]'::jsonb),
        'resultingStatus', reopen_request.outcome_status,
        'requestedAt', reopen_request.requested_at
      ) order by reopen_request.attempt_number)
      from complaints.complaint_reopen_requests as reopen_request
      where reopen_request.complaint_id = complaint.id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', escalation.id,
        'level', escalation.observed_reopen_count,
        'reasonCode', escalation.escalation_type,
        'occurredAt', escalation.occurred_at
      ) order by escalation.occurred_at, escalation.id)
      from complaints.complaint_escalation_events as escalation
      where escalation.complaint_id = complaint.id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_citizen_complaint_evidence_object(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_purpose text
)
returns table (
  evidence_id uuid,
  evidence_role text,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_expires_at timestamptz,
  upload_status text,
  workflow_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select located.*
  from (
    select
      media.id,
      'before'::text,
      media.bucket_id,
      media.object_path,
      media.declared_mime_type,
      media.declared_byte_size,
      media.client_sha256,
      media.observed_mime_type,
      media.observed_byte_size,
      media.upload_expires_at,
      media.upload_status,
      complaint.workflow_version
    from complaints.complaint_media as media
    inner join complaints.complaints as complaint on complaint.draft_id = media.draft_id
    where p_purpose = 'view'
      and media.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and media.upload_status = 'finalized'

    union all

    select
      evidence.id,
      'after'::text,
      evidence.bucket_id,
      evidence.object_path,
      evidence.declared_mime_type,
      evidence.declared_byte_size,
      evidence.client_sha256,
      evidence.observed_mime_type,
      evidence.observed_byte_size,
      evidence.upload_expires_at,
      evidence.upload_status,
      complaint.workflow_version
    from complaints.complaint_resolution_evidence as evidence
    inner join complaints.complaint_resolution_evidence_links as link
      on link.evidence_id = evidence.id
    inner join complaints.complaint_resolutions as resolution
      on resolution.id = link.resolution_id
    inner join complaints.complaints as complaint on complaint.id = resolution.complaint_id
    where p_purpose = 'view'
      and evidence.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and evidence.upload_status = 'finalized'

    union all

    select
      evidence.id,
      'reopen'::text,
      evidence.bucket_id,
      evidence.object_path,
      evidence.declared_mime_type,
      evidence.declared_byte_size,
      evidence.client_sha256,
      evidence.observed_mime_type,
      evidence.observed_byte_size,
      evidence.upload_expires_at,
      evidence.upload_status,
      complaint.workflow_version
    from complaints.complaint_reopen_evidence as evidence
    inner join complaints.complaints as complaint on complaint.id = evidence.complaint_id
    where evidence.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and evidence.uploader_user_id = p_actor_user_id
      and (
        (p_purpose = 'view' and evidence.upload_status = 'finalized')
        or (
          p_purpose = 'finalize'
          and (
            evidence.upload_status = 'finalized'
            or (
              evidence.upload_status = 'reserved'
            )
          )
        )
      )
  ) as located;
$$;

create function public.reserve_citizen_reopen_evidence(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_kind text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text,
  p_captured_at timestamptz,
  p_width_pixels integer,
  p_height_pixels integer,
  p_duration_milliseconds bigint,
  p_location_longitude double precision,
  p_location_latitude double precision,
  p_location_accuracy_meters double precision,
  p_location_provider text,
  p_location_captured_at timestamptz,
  p_location_device_recorded_at timestamptz,
  p_location_mock_detected boolean
)
returns table (
  evidence_id uuid,
  bucket_id text,
  object_path text,
  kind text,
  declared_mime_type text,
  declared_byte_size bigint,
  upload_status text,
  upload_expires_at timestamptz,
  captured_at timestamptz,
  location_longitude double precision,
  location_latitude double precision,
  location_accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  created_at timestamptz,
  workflow_version bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  evidence complaints.complaint_reopen_evidence%rowtype;
  action_id uuid := gen_random_uuid();
  next_evidence_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  response jsonb;
  normalized_mime text := lower(btrim(p_mime_type));
  maximum_location_accuracy double precision;
  maximum_location_age_seconds integer;
  location_field_count integer := num_nonnulls(
    p_location_longitude,
    p_location_latitude,
    p_location_accuracy_meters,
    p_location_provider,
    p_location_captured_at,
    p_location_device_recorded_at
  );
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_kind not in ('photo', 'video')
    or normalized_mime not in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
    or (p_kind = 'photo' and normalized_mime not like 'image/%')
    or (p_kind = 'video' and normalized_mime not like 'video/%')
    or p_byte_size not between 1 and 52428800
    or p_sha256 !~ '^[0-9a-f]{64}$'
    or p_captured_at is null
    or p_captured_at > operation_at + interval '2 minutes'
    or ((p_width_pixels is null) <> (p_height_pixels is null))
    or (p_width_pixels is not null and (
      p_width_pixels not between 1 and 20000
      or p_height_pixels not between 1 and 20000
    ))
    or (p_kind = 'photo' and p_duration_milliseconds is not null)
    or (p_kind = 'video' and (
      p_duration_milliseconds is null
      or p_duration_milliseconds not between 1 and 600000
    ))
    or location_field_count <> 6 then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  if (
    p_location_longitude not between -180 and 180
    or p_location_latitude not between -90 and 90
    or p_location_accuracy_meters not between 0 and 5000
    or p_location_provider not in ('gps', 'network', 'fused', 'unknown')
    or p_location_captured_at > operation_at + interval '2 minutes'
    or p_location_device_recorded_at > operation_at + interval '2 minutes'
    or abs(extract(epoch from (
      p_location_captured_at - p_location_device_recorded_at
    ))) > 300
  ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'reserve_reopen_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_reopen_evidence as stored
    where stored.id = (existing_action.response_payload ->> 'evidenceId')::uuid
      and stored.uploader_user_id = p_actor_user_id;
    if not found or evidence.upload_status <> 'reserved' then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
    end if;
    if evidence.upload_expires_at <= operation_at then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED';
    end if;
    return query select
      evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
      evidence.declared_mime_type, evidence.declared_byte_size,
      evidence.upload_status, evidence.upload_expires_at, evidence.captured_at,
      extensions.st_x(evidence.capture_location),
      extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
      evidence.capture_provider, evidence.location_captured_at, evidence.created_at,
      existing_action.expected_workflow_version, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select
    coalesce(
      (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
      100
    ),
    coalesce(
      (category.location_verification_requirements ->> 'maximumAgeSeconds')::integer,
      300
    )
  into maximum_location_accuracy, maximum_location_age_seconds
  from routing.issue_categories as category
  where category.id = complaint.category_id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  if p_location_mock_detected is true
    or p_location_accuracy_meters > maximum_location_accuracy
    or extract(epoch from (operation_at - p_location_captured_at))
      > maximum_location_age_seconds then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null or resolution.completed_at is null
    or exists (
      select 1 from complaints.complaint_reopen_requests as request
      where request.resolution_id = resolution.id
    ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  if complaint.current_status <> all(policy.eligible_reopen_statuses) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  if operation_at > resolution.completed_at
      + make_interval(secs => policy.reopen_window_seconds) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_DEADLINE_EXPIRED';
  end if;
  if (select count(*) from complaints.complaint_reopen_requests as request
      where request.complaint_id = complaint.id) >= policy.max_reopen_attempts then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_ATTEMPTS_EXHAUSTED';
  end if;
  if (select count(*) from complaints.complaint_reopen_evidence as existing
      where existing.complaint_id = complaint.id
        and existing.resolution_id = resolution.id
        and existing.uploader_user_id = p_actor_user_id
        and (
          existing.upload_status = 'finalized'
          or (
            existing.upload_status = 'reserved'
            and existing.upload_expires_at > operation_at
          )
        )
        and not exists (
          select 1 from complaints.complaint_reopen_evidence_links as link
          where link.evidence_id = existing.id
        )) >= 20 then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_LIMIT_REACHED';
  end if;

  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'reserve_reopen_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, complaint.current_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);

  insert into complaints.complaint_reopen_evidence (
    id, complaint_id, resolution_id, uploader_user_id, kind, object_path,
    declared_mime_type, declared_byte_size, client_sha256,
    width_pixels, height_pixels, duration_milliseconds, captured_at,
    capture_location, capture_accuracy_meters, capture_provider,
    location_captured_at, location_device_recorded_at, mock_location_detected,
    upload_expires_at, created_at, updated_at
  ) values (
    next_evidence_id, complaint.id, resolution.id, p_actor_user_id, p_kind,
    format('%s/%s/reopen', complaint.id, next_evidence_id),
    normalized_mime, p_byte_size, p_sha256,
    p_width_pixels, p_height_pixels, p_duration_milliseconds, p_captured_at,
    extensions.st_setsrid(
      extensions.st_makepoint(p_location_longitude, p_location_latitude),
      4326
    )::extensions.geometry(Point, 4326),
    p_location_accuracy_meters, p_location_provider, p_location_captured_at,
    p_location_device_recorded_at, p_location_mock_detected,
    operation_at + interval '15 minutes', operation_at, operation_at
  ) returning * into evidence;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'resolutionId', resolution.id,
    'workflowVersion', complaint.workflow_version
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'reserve_reopen_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
    evidence.declared_mime_type, evidence.declared_byte_size,
    evidence.upload_status, evidence.upload_expires_at, evidence.captured_at,
    extensions.st_x(evidence.capture_location),
    extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
    evidence.capture_provider, evidence.location_captured_at, evidence.created_at,
    complaint.workflow_version, false;
end;
$$;

create function public.finalize_citizen_reopen_evidence(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_observed_mime_type text,
  p_observed_byte_size bigint,
  p_verified_sha256 text
)
returns table (
  evidence_id uuid,
  kind text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_status text,
  captured_at timestamptz,
  location_longitude double precision,
  location_latitude double precision,
  location_accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz,
  workflow_version bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  evidence complaints.complaint_reopen_evidence%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  normalized_mime text := lower(btrim(p_observed_mime_type));
  response jsonb;
begin
  if p_actor_user_id is null or p_complaint_id is null or p_evidence_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_observed_byte_size not between 1 and 52428800
    or p_verified_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'finalize_reopen_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_reopen_evidence as stored
    where stored.id = p_evidence_id and stored.uploader_user_id = p_actor_user_id;
    return query select
      evidence.id, evidence.kind, evidence.observed_mime_type,
      evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
      extensions.st_x(evidence.capture_location),
      extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
      evidence.capture_provider, evidence.location_captured_at,
      evidence.finalized_at, evidence.created_at,
      existing_action.expected_workflow_version, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select stored.* into evidence
  from complaints.complaint_reopen_evidence as stored
  where stored.id = p_evidence_id
    and stored.complaint_id = complaint.id
    and stored.uploader_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_EVIDENCE_NOT_FOUND';
  end if;
  if evidence.upload_status <> 'reserved' then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
  end if;
  if evidence.upload_expires_at <= operation_at then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED';
  end if;
  if evidence.declared_mime_type <> normalized_mime
    or evidence.declared_byte_size <> p_observed_byte_size
    or evidence.client_sha256 <> p_verified_sha256 then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH';
  end if;

  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'finalize_reopen_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, complaint.current_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);
  update complaints.complaint_reopen_evidence as target
  set
    observed_mime_type = normalized_mime,
    observed_byte_size = p_observed_byte_size,
    verified_sha256 = p_verified_sha256,
    upload_status = 'finalized',
    finalized_at = operation_at,
    updated_at = operation_at
  where target.id = evidence.id
  returning * into evidence;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, evidence.resolution_id, assignment.id,
    'finalize_reopen_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.kind, evidence.observed_mime_type,
    evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
    extensions.st_x(evidence.capture_location),
    extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
    evidence.capture_provider, evidence.location_captured_at,
    evidence.finalized_at, evidence.created_at, complaint.workflow_version, false;
end;
$$;

create function public.fail_citizen_reopen_evidence(
  p_evidence_id uuid,
  p_failure_code text
)
returns table (evidence_id uuid, upload_status text, failure_code text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_evidence_id is null
    or p_failure_code is null
    or p_failure_code not in (
      'CONTENT_TYPE_MISMATCH',
      'OBJECT_INTEGRITY_MISMATCH'
    ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  perform set_config('local_wellness.reopen_evidence_mutation', 'fail', true);
  return query
  update complaints.complaint_reopen_evidence as evidence
  set upload_status = 'failed', failure_code = p_failure_code, updated_at = clock_timestamp()
  where evidence.id = p_evidence_id and evidence.upload_status = 'reserved'
  returning evidence.id, evidence.upload_status, evidence.failure_code;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_EVIDENCE_NOT_FOUND';
  end if;
end;
$$;

create function public.expire_citizen_reopen_evidence_reservations(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_REOPEN_EVIDENCE_CLEANUP_LIMIT_INVALID';
  end if;

  perform set_config('local_wellness.reopen_evidence_mutation', 'expire', true);
  with expiring as (
    select evidence.id
    from complaints.complaint_reopen_evidence as evidence
    where evidence.upload_status = 'reserved'
      and evidence.upload_expires_at <= operation_at
    order by evidence.upload_expires_at, evidence.id
    for update skip locked
    limit p_limit
  )
  update complaints.complaint_reopen_evidence as evidence
  set upload_status = 'expired',
      failure_code = 'UPLOAD_RESERVATION_EXPIRED',
      updated_at = operation_at
  from expiring
  where evidence.id = expiring.id;
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create function public.submit_complaint_feedback(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_resolution_id uuid,
  p_outcome text,
  p_satisfaction_rating smallint,
  p_speed_rating smallint,
  p_quality_rating smallint,
  p_communication_rating smallint,
  p_comment text,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text
)
returns table (result jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  feedback_id uuid := gen_random_uuid();
  history_id uuid;
  operation_at timestamptz := clock_timestamp();
  next_status text;
  next_workflow_version bigint;
  response jsonb;
  feedback_payload jsonb;
  rating_count integer := num_nonnulls(
    p_satisfaction_rating,
    p_speed_rating,
    p_quality_rating,
    p_communication_rating
  );
begin
  if p_actor_user_id is null or p_complaint_id is null or p_resolution_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_outcome is null or p_outcome not in (
      'resolved', 'partially_resolved', 'not_resolved',
      'temporary_fix', 'wrong_location'
    )
    or rating_count not in (0, 4)
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or (p_comment is not null and (
      p_comment <> btrim(p_comment) or char_length(p_comment) not between 1 and 2000
    )) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'submit_feedback'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_FEEDBACK_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null
    or resolution.id <> p_resolution_id
    or resolution.completed_at is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_RESOLUTION_MISMATCH';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  if exists (
    select 1
    from complaints.complaint_feedback as feedback
    where feedback.resolution_id = resolution.id
      and feedback.citizen_user_id = p_actor_user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_FEEDBACK_ALREADY_SUBMITTED';
  end if;
  if complaint.current_status <> all(policy.eligible_feedback_statuses)
    or operation_at > resolution.completed_at
      + make_interval(secs => policy.feedback_window_seconds)
    or (policy.ratings_required and rating_count <> 4)
    or (rating_count = 4 and (
      p_satisfaction_rating not between policy.rating_minimum and policy.rating_maximum
      or p_speed_rating not between policy.rating_minimum and policy.rating_maximum
      or p_quality_rating not between policy.rating_minimum and policy.rating_maximum
      or p_communication_rating not between policy.rating_minimum and policy.rating_maximum
    )) then
    raise exception using errcode = '23514', message = 'COMPLAINT_FEEDBACK_NOT_ALLOWED';
  end if;

  next_status := case
    when p_outcome = 'resolved'
      and complaint.current_status in (
        'resolution_submitted',
        'citizen_verification_pending'
      ) then 'resolved'
    else complaint.current_status
  end;
  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'submit_feedback',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, next_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);

  insert into complaints.complaint_feedback (
    id, complaint_id, resolution_id, citizen_user_id,
    resolution_policy_version_id, action_request_id, outcome,
    satisfaction_rating, speed_rating, quality_rating, communication_rating,
    comment, created_at
  ) values (
    feedback_id, complaint.id, resolution.id, p_actor_user_id,
    policy.id, action_id, p_outcome,
    p_satisfaction_rating, p_speed_rating, p_quality_rating,
    p_communication_rating, p_comment, operation_at
  );

  next_workflow_version := complaint.workflow_version;
  if next_status <> complaint.current_status then
    next_workflow_version := complaint.workflow_version + 1;
    update complaints.complaints as target
    set current_status = next_status,
        workflow_version = target.workflow_version + 1,
        updated_at = operation_at
    where target.id = complaint.id;
    history_id := gen_random_uuid();
    insert into complaints.complaint_status_history (
      id, complaint_id, sequence, from_status, to_status, actor_user_id,
      event_source, reason_code, request_id, occurred_at
    ) values (
      history_id, complaint.id,
      (select coalesce(max(history.sequence), 0) + 1
        from complaints.complaint_status_history as history
        where history.complaint_id = complaint.id),
      complaint.current_status, next_status, p_actor_user_id,
      'citizen_action', 'RESOLUTION_CONFIRMED', p_request_id, operation_at
    );
    insert into complaints.notification_outbox (
      complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
    ) values (
      complaint.id, history_id, 'complaint_status_changed', complaint.id,
      jsonb_strip_nulls(jsonb_build_object(
        'complaintId', complaint.id,
        'complaintNumber', complaint.complaint_number,
        'status', next_status,
        'authorityId', assignment.authority_id,
        'wardId', assignment.ward_id,
        'authorityDepartmentId', assignment.authority_department_id,
        'occurredAt', operation_at
      )), operation_at
    );
  end if;

  feedback_payload := jsonb_build_object(
    'id', feedback_id,
    'resolutionId', resolution.id,
    'outcome', p_outcome,
    'ratings', case when rating_count = 0 then null else jsonb_build_object(
      'satisfaction', p_satisfaction_rating,
      'speed', p_speed_rating,
      'quality', p_quality_rating,
      'communication', p_communication_rating
    ) end,
    'comment', p_comment,
    'submittedAt', operation_at
  );
  response := jsonb_build_object(
    'complaintId', complaint.id,
    'status', next_status,
    'workflowVersion', next_workflow_version,
    'updatedAt', case when next_status = complaint.current_status
      then complaint.updated_at else operation_at end,
    'feedback', feedback_payload
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'submit_feedback', complaint.current_status, next_status, p_request_id,
    jsonb_build_object('entityId', feedback_id, 'outcome', p_outcome), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

create function public.reopen_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_resolution_id uuid,
  p_reason_code text,
  p_explanation text,
  p_evidence_ids uuid[],
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text
)
returns table (result jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  reopen_request_id uuid := gen_random_uuid();
  escalation_id uuid;
  history_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  attempt_number integer;
  next_status text;
  response jsonb;
  request_payload jsonb;
  escalation_payload jsonb := null;
  normalized_evidence_ids uuid[] := coalesce(p_evidence_ids, '{}'::uuid[]);
begin
  if p_actor_user_id is null or p_complaint_id is null or p_resolution_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_reason_code is null
    or p_reason_code <> btrim(p_reason_code)
    or p_reason_code !~ '^[a-z][a-z0-9_]{1,79}$'
    or p_explanation is null
    or (
      p_explanation <> btrim(p_explanation)
      or char_length(p_explanation) not between 1 and 4000
    )
    or cardinality(normalized_evidence_ids) > 20
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  if cardinality(normalized_evidence_ids) <> (
    select count(distinct evidence_id)::integer
    from unnest(normalized_evidence_ids) as evidence_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'reopen'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null or resolution.id <> p_resolution_id
    or resolution.completed_at is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_RESOLUTION_MISMATCH';
  end if;
  if exists (
      select 1 from complaints.complaint_reopen_requests as request
      where request.resolution_id = resolution.id
    ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  select count(*)::integer + 1 into attempt_number
  from complaints.complaint_reopen_requests as request
  where request.complaint_id = complaint.id;
  if complaint.current_status <> all(policy.eligible_reopen_statuses) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  if operation_at > resolution.completed_at
      + make_interval(secs => policy.reopen_window_seconds) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_DEADLINE_EXPIRED';
  end if;
  if attempt_number > policy.max_reopen_attempts then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_ATTEMPTS_EXHAUSTED';
  end if;
  if not coalesce(p_reason_code = any(policy.allowed_reopen_reason_codes), false) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_REASON_INVALID';
  end if;
  if policy.reopen_evidence_required and cardinality(normalized_evidence_ids) = 0 then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_EVIDENCE_REQUIRED';
  end if;

  perform 1
  from complaints.complaint_reopen_evidence as evidence
  where evidence.id = any(normalized_evidence_ids)
  for update;
  if cardinality(normalized_evidence_ids) > 0 and (
    select count(*)
    from complaints.complaint_reopen_evidence as evidence
    where evidence.id = any(normalized_evidence_ids)
      and evidence.complaint_id = complaint.id
      and evidence.resolution_id = resolution.id
      and evidence.uploader_user_id = p_actor_user_id
      and evidence.upload_status = 'finalized'
      and evidence.finalized_at is not null
      and not exists (
        select 1
        from complaints.complaint_reopen_evidence_links as link
        where link.evidence_id = evidence.id
      )
  ) <> cardinality(normalized_evidence_ids) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
  end if;

  next_status := case when attempt_number >= policy.repeat_escalation_threshold
    then 'escalated' else 'reopened' end;
  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'reopen',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, next_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);
  insert into complaints.complaint_reopen_requests (
    id, complaint_id, resolution_id, citizen_user_id,
    resolution_policy_version_id, action_request_id, attempt_number,
    reason_code, reason_detail, window_closes_at, outcome_status, requested_at
  ) values (
    reopen_request_id, complaint.id, resolution.id, p_actor_user_id,
    policy.id, action_id, attempt_number, p_reason_code, p_explanation,
    resolution.completed_at + make_interval(secs => policy.reopen_window_seconds),
    next_status, operation_at
  );
  insert into complaints.complaint_reopen_evidence_links (
    reopen_request_id,
    evidence_id,
    complaint_id,
    resolution_id,
    created_at
  )
  select reopen_request_id, evidence_id, complaint.id, resolution.id, operation_at
  from unnest(normalized_evidence_ids) as evidence_id;

  if next_status = 'escalated' then
    escalation_id := gen_random_uuid();
    insert into complaints.complaint_escalation_events (
      id, complaint_id, reopen_request_id, resolution_policy_version_id,
      assignment_id, escalation_type, observed_reopen_count,
      threshold_reopen_count, occurred_at
    ) values (
      escalation_id, complaint.id, reopen_request_id, policy.id, assignment.id,
      'repeated_reopen', attempt_number, policy.repeat_escalation_threshold,
      operation_at
    );
    escalation_payload := jsonb_build_object(
      'id', escalation_id,
      'level', attempt_number,
      'reasonCode', 'repeated_reopen',
      'occurredAt', operation_at
    );
  end if;

  update complaints.complaints as target
  set current_status = next_status,
      workflow_version = target.workflow_version + 1,
      updated_at = operation_at
  where target.id = complaint.id;
  insert into complaints.complaint_status_history (
    id, complaint_id, sequence, from_status, to_status, actor_user_id,
    event_source, reason_code, request_id, occurred_at
  ) values (
    history_id, complaint.id,
    (select coalesce(max(history.sequence), 0) + 1
      from complaints.complaint_status_history as history
      where history.complaint_id = complaint.id),
    complaint.current_status, next_status, p_actor_user_id, 'citizen_action',
    case when next_status = 'escalated'
      then 'REPEATED_REOPEN_ESCALATED' else 'COMPLAINT_REOPENED' end,
    p_request_id, operation_at
  );
  insert into complaints.notification_outbox (
    complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
  ) values (
    complaint.id, history_id, 'complaint_status_changed', complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', next_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )), operation_at
  );

  request_payload := jsonb_build_object(
    'id', reopen_request_id,
    'resolutionId', resolution.id,
    'attemptNumber', attempt_number,
    'reasonCode', p_reason_code,
    'explanation', p_explanation,
    'evidenceIds', to_jsonb(normalized_evidence_ids),
    'resultingStatus', next_status,
    'requestedAt', operation_at
  );
  response := jsonb_build_object(
    'complaintId', complaint.id,
    'status', next_status,
    'workflowVersion', complaint.workflow_version + 1,
    'updatedAt', operation_at,
    'reopenRequest', request_payload,
    'escalation', escalation_payload
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'reopen', complaint.current_status, next_status, p_request_id,
    jsonb_build_object(
      'entityId', reopen_request_id,
      'attemptNumber', attempt_number,
      'escalated', next_status = 'escalated'
    ), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

alter table complaints.resolution_policies enable row level security;
alter table complaints.resolution_policies force row level security;
alter table complaints.resolution_policy_versions enable row level security;
alter table complaints.resolution_policy_versions force row level security;
alter table complaints.citizen_action_requests enable row level security;
alter table complaints.citizen_action_requests force row level security;
alter table complaints.citizen_action_audit_events enable row level security;
alter table complaints.citizen_action_audit_events force row level security;
alter table complaints.complaint_feedback enable row level security;
alter table complaints.complaint_feedback force row level security;
alter table complaints.complaint_reopen_evidence enable row level security;
alter table complaints.complaint_reopen_evidence force row level security;
alter table complaints.complaint_reopen_requests enable row level security;
alter table complaints.complaint_reopen_requests force row level security;
alter table complaints.complaint_reopen_evidence_links enable row level security;
alter table complaints.complaint_reopen_evidence_links force row level security;
alter table complaints.complaint_escalation_events enable row level security;
alter table complaints.complaint_escalation_events force row level security;

revoke all on table
  complaints.resolution_policies,
  complaints.resolution_policy_versions,
  complaints.citizen_action_requests,
  complaints.citizen_action_audit_events,
  complaints.complaint_feedback,
  complaints.complaint_reopen_evidence,
  complaints.complaint_reopen_requests,
  complaints.complaint_reopen_evidence_links,
  complaints.complaint_escalation_events
from public, anon, authenticated, service_role;

revoke all on function complaints.validate_resolution_policy_version()
  from public, anon, authenticated, service_role;
revoke all on function complaints.current_citizen_action_request_id()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_citizen_action_request_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_complaint_workflow_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_reopen_evidence_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.resolve_resolution_policy_version(
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function complaints.perform_phase7_resolution_submission(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated, service_role;
revoke all on function complaints.accountability_resolution_payload(
  uuid,
  uuid,
  boolean
) from public, anon, authenticated, service_role;

revoke all on function public.perform_government_complaint_action(
  uuid,
  uuid,
  text,
  bigint,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;
revoke all on function public.get_citizen_resolution_context(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_government_complaint_accountability(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_citizen_complaint_evidence_object(
  uuid,
  uuid,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.reserve_citizen_reopen_evidence(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  timestamptz,
  integer,
  integer,
  bigint,
  double precision,
  double precision,
  double precision,
  text,
  timestamptz,
  timestamptz,
  boolean
) from public, anon, authenticated;
revoke all on function public.finalize_citizen_reopen_evidence(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  text
) from public, anon, authenticated;
revoke all on function public.fail_citizen_reopen_evidence(uuid, text)
  from public, anon, authenticated;
revoke all on function public.expire_citizen_reopen_evidence_reservations(integer)
  from public, anon, authenticated;
revoke all on function public.submit_complaint_feedback(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.reopen_complaint(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  text,
  uuid[],
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.perform_government_complaint_action(
  uuid,
  uuid,
  text,
  bigint,
  text,
  text,
  text,
  jsonb
) to service_role;
grant execute on function public.get_citizen_resolution_context(uuid, uuid)
  to service_role;
grant execute on function public.get_government_complaint_accountability(uuid, uuid, uuid)
  to service_role;
grant execute on function public.get_citizen_complaint_evidence_object(
  uuid,
  uuid,
  uuid,
  text
) to service_role;
grant execute on function public.reserve_citizen_reopen_evidence(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  timestamptz,
  integer,
  integer,
  bigint,
  double precision,
  double precision,
  double precision,
  text,
  timestamptz,
  timestamptz,
  boolean
) to service_role;
grant execute on function public.finalize_citizen_reopen_evidence(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  text
) to service_role;
grant execute on function public.fail_citizen_reopen_evidence(uuid, text)
  to service_role;
grant execute on function public.expire_citizen_reopen_evidence_reservations(integer)
  to service_role;
grant execute on function public.submit_complaint_feedback(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.reopen_complaint(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  text,
  uuid[],
  text,
  text,
  text
) to service_role;

comment on function public.get_citizen_resolution_context(uuid, uuid) is
  'Returns the owning citizen accountability history and fail-closed effective review policy.';
comment on function public.get_government_complaint_accountability(uuid, uuid, uuid) is
  'Returns resolution, feedback, reopening, and escalation history after assignment-scope authorization.';
comment on function public.get_citizen_complaint_evidence_object(uuid, uuid, uuid, text) is
  'Locates private before, after, or reopen evidence for an owning citizen and explicit purpose.';
comment on function public.expire_citizen_reopen_evidence_reservations(integer) is
  'Expires bounded, abandoned citizen reopen evidence upload reservations using skip-locked cleanup.';
comment on function public.submit_complaint_feedback(
  uuid, uuid, bigint, uuid, text, smallint, smallint, smallint, smallint,
  text, text, text, text
) is
  'Records one policy-bound citizen review with exact replay and an atomic positive confirmation transition.';
comment on function public.reopen_complaint(
  uuid, uuid, bigint, uuid, text, text, uuid[], text, text, text
) is
  'Records a policy-bound reopen request and atomically escalates repeated unresolved resolutions.';
