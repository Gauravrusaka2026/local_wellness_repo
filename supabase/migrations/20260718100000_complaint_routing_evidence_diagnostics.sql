create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_equals(decision.input_location, evidence.location) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is distinct from evidence.accuracy_meters then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is distinct from evidence.captured_at then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

comment on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid) is
  'Internal exact comparison of a claimed complaint draft location and its recorded routing decision. Empty results defer prerequisite validation to the canonical completion implementation.';

create or replace function complaints.complete_complaint_submission_v2(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid,
  p_acknowledged_duplicate_suggestion_ids uuid[] default '{}'::uuid[],
  p_emergency_disclaimer_acknowledged boolean default false
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  status text,
  submitted_at timestamptz,
  routing_decision_id uuid,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  officer_role_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  category routing.issue_categories%rowtype;
  created_complaint_id uuid := gen_random_uuid();
  created_assignment_id uuid := gen_random_uuid();
  created_number text;
  operation_at timestamptz := current_timestamp;
  finalized_media_count integer;
  maximum_media_distance double precision;
  media_record record;
  media_distance double precision;
  latest_duplicate_run_id uuid;
  routing_evidence_mismatches text[];
begin
  select submission.* into request
  from complaints.complaint_submission_requests as submission
  where submission.id = p_submission_request_id
    and submission.actor_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_SUBMISSION_NOT_FOUND';
  end if;

  if request.state = 'completed' then
    return query
    select
      complaint.id,
      complaint.draft_id,
      complaint.complaint_number,
      complaint.current_status,
      complaint.submitted_at,
      complaint.routing_decision_id,
      assignment.id,
      assignment.authority_id,
      assignment.local_body_id,
      assignment.ward_id,
      assignment.department_id,
      assignment.officer_role_id,
      true
    from complaints.complaints as complaint
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
    where complaint.id = request.complaint_id;
    return;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = request.draft_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;

  if not found
    or draft.status <> 'active'
    or draft.expires_at <= operation_at
    or draft.category_id is null
    or draft.description is null
    or draft.selected_location_evidence_id is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_DRAFT_NOT_SUBMITTABLE';
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found
    or evidence.verification_status not in ('verified', 'partially_verified')
    or evidence.spoof_risk_status in ('high', 'blocked')
    or evidence.mock_location_detected is true then
    raise exception using errcode = '23514', message = 'COMPLAINT_LOCATION_NOT_VERIFIED';
  end if;

  select issue.* into category
  from routing.issue_categories as issue
  inner join routing.issue_domains as domain on domain.id = issue.domain_id
  where issue.id = draft.category_id
    and issue.status = 'active'
    and issue.verification_status = 'verified'
    and not issue.is_placeholder
    and issue.is_routing_eligible
    and domain.status = 'active'
    and domain.verification_status = 'verified'
    and not domain.is_placeholder
    and domain.is_routing_eligible;

  if not found then
    raise exception using errcode = '23514', message = 'COMPLAINT_CATEGORY_NOT_ROUTABLE';
  end if;
  if category.is_emergency and not p_emergency_disclaimer_acknowledged then
    raise exception using errcode = '23514', message = 'COMPLAINT_EMERGENCY_DISCLAIMER_REQUIRED';
  end if;
  if category.requires_asset and draft.asset_id is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_ASSET_REQUIRED';
  end if;
  if cardinality(category.required_attributes) > 0
    and not (draft.custom_attributes ?& category.required_attributes) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REQUIRED_ATTRIBUTES_MISSING';
  end if;

  if cardinality(p_acknowledged_duplicate_suggestion_ids) <> (
    select count(distinct suggestion_id)
    from unnest(p_acknowledged_duplicate_suggestion_ids) as suggestion_id
  ) then
    raise exception using errcode = '22023', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_INVALID';
  end if;

  select run.id into latest_duplicate_run_id
  from complaints.duplicate_check_runs as run
  inner join routing.duplicate_detection_policy_versions as policy
    on policy.id = run.duplicate_policy_version_id
  inner join routing.duplicate_detection_policies as policy_identity
    on policy_identity.id = policy.duplicate_detection_policy_id
  where run.draft_id = draft.id
    and run.actor_user_id = p_actor_user_id
    and policy.status = 'active'
    and policy.verification_status = 'verified'
    and not policy.is_placeholder
    and policy.is_routing_eligible
    and policy.effective_from <= operation_at
    and (policy.effective_to is null or policy.effective_to > operation_at)
    and policy_identity.status = 'active'
    and policy_identity.verification_status = 'verified'
    and not policy_identity.is_placeholder
    and policy_identity.is_routing_eligible
  order by run.checked_at desc, run.id desc
  limit 1;

  if latest_duplicate_run_id is null then
    if cardinality(p_acknowledged_duplicate_suggestion_ids) <> 0 then
      raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_INVALID';
    end if;
  elsif exists (
    select 1
    from complaints.duplicate_check_matches as match
    where match.duplicate_check_run_id = latest_duplicate_run_id
      and not (match.candidate_complaint_id = any(p_acknowledged_duplicate_suggestion_ids))
  ) or exists (
    select 1
    from unnest(p_acknowledged_duplicate_suggestion_ids) as suggestion_id
    where not exists (
      select 1
      from complaints.duplicate_check_matches as match
      where match.duplicate_check_run_id = latest_duplicate_run_id
        and match.candidate_complaint_id = suggestion_id
    )
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED';
  end if;

  routing_evidence_mismatches := complaints.complaint_routing_evidence_mismatches(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id
  );

  if cardinality(routing_evidence_mismatches) > 0 then
    raise exception using
      errcode = '23514',
      message = routing_evidence_mismatches[1],
      detail = array_to_string(routing_evidence_mismatches, ',');
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id
    and route.actor_user_id = p_actor_user_id
    and route.request_id = request.routing_request_id
  for share;

  select count(*)::integer into finalized_media_count
  from complaints.complaint_media as media
  where media.draft_id = draft.id
    and media.media_kind in ('photo', 'video')
    and media.upload_status = 'finalized';

  if finalized_media_count < category.minimum_media_count
    or finalized_media_count > category.maximum_media_count then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_COUNT_INVALID';
  end if;
  if exists (
    select 1
    from complaints.complaint_media as media
    where media.draft_id = draft.id
      and media.upload_status not in ('finalized', 'expired')
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_NOT_READY';
  end if;

  if jsonb_typeof(category.media_requirements -> 'maximumCaptureDistanceMeters') = 'number' then
    maximum_media_distance := (category.media_requirements ->> 'maximumCaptureDistanceMeters')::double precision;
  end if;

  for media_record in
    select media.id, location.location
    from complaints.complaint_media as media
    left join complaints.complaint_location_evidence as location
      on location.id = media.capture_location_evidence_id
    where media.draft_id = draft.id and media.upload_status = 'finalized'
  loop
    if media_record.location is not null then
      media_distance := extensions.st_distance(
        media_record.location::extensions.geography,
        evidence.location::extensions.geography
      );
      if maximum_media_distance is not null and media_distance > maximum_media_distance then
        raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_LOCATION_MISMATCH';
      end if;
      update complaints.complaint_media as media
      set distance_to_complaint_meters = media_distance
      where media.id = media_record.id;
    end if;
  end loop;

  created_number := format(
    'LW-%s-%s',
    to_char(operation_at at time zone 'UTC', 'YYYYMMDD'),
    lpad(nextval('complaints.complaint_number_sequence'::regclass)::text, 8, '0')
  );

  insert into complaints.complaints (
    id,
    draft_id,
    complaint_number,
    citizen_user_id,
    category_id,
    asset_id,
    description,
    description_language,
    custom_attributes,
    location_evidence_id,
    routing_decision_id,
    current_status,
    visibility,
    submitted_at,
    created_at,
    updated_at
  )
  values (
    created_complaint_id,
    draft.id,
    created_number,
    p_actor_user_id,
    draft.category_id,
    draft.asset_id,
    draft.description,
    draft.description_language,
    draft.custom_attributes,
    evidence.id,
    decision.id,
    'submitted',
    'private',
    operation_at,
    operation_at,
    operation_at
  );

  insert into complaints.complaint_assignments (
    id,
    complaint_id,
    routing_decision_id,
    authority_id,
    local_body_id,
    ward_id,
    department_id,
    authority_department_id,
    officer_role_id,
    officer_assignment_id,
    asset_type_id,
    asset_id,
    asset_version_id,
    asset_ownership_version_id,
    assigned_at
  )
  values (
    created_assignment_id,
    created_complaint_id,
    decision.id,
    decision.target_authority_id,
    decision.local_body_id,
    decision.ward_id,
    decision.department_id,
    decision.authority_department_id,
    decision.officer_role_id,
    decision.officer_assignment_id,
    decision.asset_type_id,
    decision.asset_id,
    decision.asset_version_id,
    decision.asset_ownership_version_id,
    operation_at
  );

  insert into complaints.complaint_status_history (
    complaint_id,
    sequence,
    from_status,
    to_status,
    actor_user_id,
    event_source,
    reason_code,
    public_message,
    request_id,
    occurred_at
  )
  values (
    created_complaint_id,
    1,
    'draft',
    'submitted',
    p_actor_user_id,
    'citizen_submission',
    'COMPLAINT_SUBMITTED',
    'Complaint submitted successfully.',
    request.routing_request_id,
    operation_at
  );

  update complaints.complaint_drafts as source
  set
    status = 'submitted',
    submitted_at = operation_at,
    revision = source.revision + 1
  where source.id = draft.id;

  update complaints.complaint_submission_requests as submission
  set
    state = 'completed',
    routing_decision_id = decision.id,
    complaint_id = created_complaint_id,
    acknowledged_duplicate_suggestion_ids = p_acknowledged_duplicate_suggestion_ids,
    emergency_disclaimer_acknowledged = p_emergency_disclaimer_acknowledged,
    response_payload = jsonb_build_object(
      'complaintId', created_complaint_id,
      'draftId', draft.id,
      'complaintNumber', created_number,
      'status', 'submitted',
      'submittedAt', operation_at,
      'routingDecisionId', decision.id,
      'assignmentId', created_assignment_id,
      'authorityId', decision.target_authority_id,
      'localBodyId', decision.local_body_id,
      'wardId', decision.ward_id,
      'departmentId', decision.department_id,
      'officerRoleId', decision.officer_role_id
    ),
    completed_at = operation_at
  where submission.id = request.id;

  return query select
    created_complaint_id,
    draft.id,
    created_number,
    'submitted'::text,
    operation_at,
    decision.id,
    created_assignment_id,
    decision.target_authority_id,
    decision.local_body_id,
    decision.ward_id,
    decision.department_id,
    decision.officer_role_id,
    false;
end;
$$;

revoke all on function complaints.complete_complaint_submission_v2(
  uuid, uuid, uuid, uuid[], boolean
) from public, anon, authenticated, service_role;

comment on function complaints.complete_complaint_submission_v2(
  uuid, uuid, uuid, uuid[], boolean
) is
  'Internal canonical Phase 4 complaint completion implementation with validation-ordered granular routing-evidence checks; direct execution is denied.';

create or replace function public.submit_complaint(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid,
  p_acknowledged_duplicate_suggestion_ids uuid[] default '{}'::uuid[],
  p_emergency_disclaimer_acknowledged boolean default false
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  status text,
  submitted_at timestamptz,
  routing_decision_id uuid,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  officer_role_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_complaint_id uuid;
begin
  select request.complaint_id into completed_complaint_id
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id
    and request.state = 'completed';

  if found then
    return query
    select
      complaint.id, complaint.draft_id, complaint.complaint_number,
      complaint.current_status, complaint.submitted_at, complaint.routing_decision_id,
      assignment.id, assignment.authority_id, assignment.local_body_id,
      assignment.ward_id, assignment.department_id, assignment.officer_role_id, true
    from complaints.complaints as complaint
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
     and assignment.status = 'active'
     and assignment.effective_to is null
    where complaint.id = completed_complaint_id;
    return;
  end if;

  return query
  select implementation.*
  from complaints.complete_complaint_submission_v2(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id,
    p_acknowledged_duplicate_suggestion_ids,
    p_emergency_disclaimer_acknowledged
  ) as implementation;
end;
$$;

revoke all on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;
grant execute on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  to service_role;

comment on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean) is
  'Service-only atomic complaint submission wrapper with completed-request replay and canonical forward-repair delegation.';
