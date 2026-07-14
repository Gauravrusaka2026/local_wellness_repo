drop trigger complaints_append_only_phase4 on complaints.complaints;
drop trigger complaint_assignments_append_only on complaints.complaint_assignments;

create function complaints.current_action_request_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text;
begin
  configured := current_setting('local_wellness.government_action_id', true);
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

create function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
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

  if action_id is null or not exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  return new;
end;
$$;

create trigger complaints_validate_workflow_mutation
before update or delete on complaints.complaints
for each row execute function complaints.validate_complaint_workflow_mutation();

create function complaints.validate_assignment_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaint_assignments records are versioned and cannot be deleted.';
  end if;

  if tg_op = 'INSERT' then
    if new.assignment_source <> 'routing_decision' and (
      action_id is null or not exists (
        select 1
        from complaints.government_action_requests as action
        where action.id = action_id
          and action.complaint_id = new.complaint_id
          and action.state = 'claimed'
          and action.action_type in ('assign', 'transfer')
      )
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_ASSIGNMENT_MUTATION_DENIED';
    end if;
    return new;
  end if;

  if old.status <> 'active'
    or new.status not in ('superseded', 'cancelled')
    or new.effective_to is null
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.routing_decision_id is distinct from old.routing_decision_id
    or new.authority_id is distinct from old.authority_id
    or new.local_body_id is distinct from old.local_body_id
    or new.ward_id is distinct from old.ward_id
    or new.department_id is distinct from old.department_id
    or new.authority_department_id is distinct from old.authority_department_id
    or new.officer_role_id is distinct from old.officer_role_id
    or new.officer_assignment_id is distinct from old.officer_assignment_id
    or new.asset_type_id is distinct from old.asset_type_id
    or new.asset_id is distinct from old.asset_id
    or new.asset_version_id is distinct from old.asset_version_id
    or new.asset_ownership_version_id is distinct from old.asset_ownership_version_id
    or new.assignment_source is distinct from old.assignment_source
    or new.assigned_at is distinct from old.assigned_at
    or new.created_at is distinct from old.created_at
    or new.version is distinct from old.version
    or new.effective_from is distinct from old.effective_from
    or new.assigned_by_user_id is distinct from old.assigned_by_user_id
    or new.assigned_user_id is distinct from old.assigned_user_id
    or new.supersedes_assignment_id is distinct from old.supersedes_assignment_id
    or new.reason_code is distinct from old.reason_code
    or action_id is null
    or not exists (
      select 1
      from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.state = 'claimed'
        and action.action_type in ('assign', 'transfer')
        and action.actor_user_id = new.ended_by_user_id
    ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_ASSIGNMENT_HISTORY_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger complaint_assignments_validate_version_mutation
before insert or update or delete on complaints.complaint_assignments
for each row execute function complaints.validate_assignment_version_mutation();

create function complaints.validate_terminal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = format(
      '%I.%I records cannot be deleted.', tg_table_schema, tg_table_name
    );
  end if;
  if old.status <> 'scheduled'
    or new.status not in ('completed', 'cancelled')
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.scheduled_for is distinct from old.scheduled_for
    or new.instructions is distinct from old.instructions
    or new.scheduled_by_user_id is distinct from old.scheduled_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'COMPLAINT_INSPECTION_HISTORY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_inspections_validate_terminal_update
before update or delete on complaints.complaint_inspections
for each row execute function complaints.validate_terminal_update();

create function complaints.validate_resolution_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mutation_mode text := nullif(
    current_setting('local_wellness.resolution_evidence_mutation', true),
    ''
  );
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;
  if new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.uploader_user_id is distinct from old.uploader_user_id
    or new.kind is distinct from old.kind
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.declared_mime_type is distinct from old.declared_mime_type
    or new.declared_byte_size is distinct from old.declared_byte_size
    or new.client_sha256 is distinct from old.client_sha256
    or new.captured_at is distinct from old.captured_at
    or new.upload_expires_at is distinct from old.upload_expires_at
    or new.created_at is distinct from old.created_at
    or old.upload_status <> 'reserved' then
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;

  if new.upload_status = 'finalized' then
    if action_id is null or not exists (
      select 1
      from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.action_type = 'finalize_resolution_evidence'
        and action.state = 'claimed'
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status = 'expired' then
    if mutation_mode <> 'expire'
      or new.failure_code <> 'UPLOAD_RESERVATION_EXPIRED'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status = 'failed' then
    if mutation_mode <> 'fail'
      or new.failure_code is null
      or new.failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  else
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_resolution_evidence_validate_mutation
before update or delete on complaints.complaint_resolution_evidence
for each row execute function complaints.validate_resolution_evidence_mutation();

create trigger complaint_resolution_evidence_set_updated_at
before update on complaints.complaint_resolution_evidence
for each row execute function private.set_updated_at();

create trigger complaint_inspections_set_updated_at
before update on complaints.complaint_inspections
for each row execute function private.set_updated_at();

create trigger complaint_external_dependencies_set_updated_at
before update on complaints.complaint_external_dependencies
for each row execute function private.set_updated_at();

create function complaints.validate_external_dependency_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE'
    or old.status <> 'active'
    or new.status <> 'resolved'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.added_by_user_id is distinct from old.added_by_user_id
    or new.dependency_type is distinct from old.dependency_type
    or new.description is distinct from old.description
    or new.expected_by is distinct from old.expected_by
    or new.created_at is distinct from old.created_at
    or action_id is null
    or not exists (
      select 1 from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.actor_user_id = new.resolved_by_user_id
        and action.action_type = 'resolve_external_dependency'
        and action.state = 'claimed'
    ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_EXTERNAL_DEPENDENCY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_external_dependencies_validate_mutation
before update or delete on complaints.complaint_external_dependencies
for each row execute function complaints.validate_external_dependency_mutation();

create trigger government_role_capabilities_set_updated_at
before update on complaints.government_role_capabilities
for each row execute function private.set_updated_at();

create function complaints.validate_government_action_request_mutation()
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
    or new.from_status is distinct from old.from_status
    or new.claimed_at is distinct from old.claimed_at
    or complaints.current_action_request_id() is distinct from old.id
    or not (
      (new.state = 'claimed' and new.response_payload is null and new.completed_at is null)
      or (new.state = 'completed' and new.response_payload is not null and new.completed_at is not null)
    ) then
    raise exception using errcode = '55000', message = 'GOVERNMENT_ACTION_REQUEST_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger government_action_requests_validate_mutation
before update or delete on complaints.government_action_requests
for each row execute function complaints.validate_government_action_request_mutation();

create trigger complaint_internal_notes_append_only
before update or delete on complaints.complaint_internal_notes
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_work_references_append_only
before update or delete on complaints.complaint_work_references
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_resolutions_append_only
before update or delete on complaints.complaint_resolutions
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_resolution_evidence_links_append_only
before update or delete on complaints.complaint_resolution_evidence_links
for each row execute function complaints.reject_append_only_mutation();
create trigger government_action_audit_events_append_only
before update or delete on complaints.government_action_audit_events
for each row execute function complaints.reject_append_only_mutation();
create trigger notification_outbox_append_only
before update or delete on complaints.notification_outbox
for each row execute function complaints.reject_append_only_mutation();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'government_role_capabilities',
    'government_status_transition_rules',
    'government_action_requests',
    'government_action_audit_events',
    'complaint_internal_notes',
    'complaint_inspections',
    'complaint_work_references',
    'complaint_external_dependencies',
    'complaint_resolution_evidence',
    'complaint_resolutions',
    'complaint_resolution_evidence_links',
    'notification_outbox'
  ]
  loop
    execute format('alter table complaints.%I enable row level security', table_name);
    execute format('alter table complaints.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all privileges on all tables in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all sequences in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;

create function complaints.is_verified_assignment_scope(
  p_authority_id uuid,
  p_local_body_id uuid,
  p_ward_id uuid,
  p_department_id uuid,
  p_authority_department_id uuid,
  p_officer_role_id uuid,
  p_officer_assignment_id uuid,
  p_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_verified_governance_authority(p_authority_id)
    and exists (
      select 1 from governance.authorities as authority
      where authority.id = p_authority_id and authority.is_routing_eligible
    )
    and exists (
      select 1 from governance.local_bodies as local_body
      where local_body.id = p_local_body_id
        and local_body.authority_id = p_authority_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
    )
    and (
      p_ward_id is null or exists (
        select 1 from governance.wards as ward
        where ward.id = p_ward_id
          and ward.local_body_id = p_local_body_id
          and ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and ward.is_routing_eligible
      )
    )
    and exists (
      select 1
      from governance.authority_departments as authority_department
      inner join governance.departments as department
        on department.id = authority_department.department_id
      where authority_department.id = p_authority_department_id
        and authority_department.authority_id = p_authority_id
        and authority_department.department_id = p_department_id
        and authority_department.status = 'active'
        and authority_department.verification_status = 'verified'
        and not authority_department.is_placeholder
        and authority_department.is_routing_eligible
        and department.status = 'active'
        and department.verification_status = 'verified'
        and not department.is_placeholder
        and department.is_routing_eligible
    )
    and exists (
      select 1 from governance.officer_roles as officer_role
      where officer_role.id = p_officer_role_id
        and officer_role.status = 'active'
        and officer_role.verification_status = 'verified'
        and not officer_role.is_placeholder
        and officer_role.is_routing_eligible
    )
    and (
      p_officer_assignment_id is null or exists (
        select 1
        from governance.officer_assignments as officer_assignment
        inner join governance.officers as officer on officer.id = officer_assignment.officer_id
        where officer_assignment.id = p_officer_assignment_id
          and officer_assignment.authority_id = p_authority_id
          and officer_assignment.local_body_id = p_local_body_id
          and officer_assignment.ward_id is not distinct from p_ward_id
          and officer_assignment.authority_department_id = p_authority_department_id
          and officer_assignment.officer_role_id = p_officer_role_id
          and officer_assignment.status = 'active'
          and officer_assignment.verification_status = 'verified'
          and not officer_assignment.is_placeholder
          and officer_assignment.effective_from <= p_at
          and (officer_assignment.effective_to is null or officer_assignment.effective_to > p_at)
          and officer.status = 'active'
          and officer.verification_status = 'verified'
          and not officer.is_placeholder
      )
    );
$$;

create function complaints.role_capability_enabled(
  capability complaints.government_role_capabilities,
  capability_name text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case capability_name
    when 'view' then capability.can_view
    when 'acknowledge' then capability.can_acknowledge
    when 'assign' then capability.can_assign
    when 'transfer' then capability.can_transfer
    when 'update_status' then capability.can_update_status
    when 'add_internal_note' then capability.can_add_internal_note
    when 'schedule_inspection' then capability.can_manage_inspection
    when 'complete_inspection' then capability.can_manage_inspection
    when 'add_work_reference' then capability.can_add_work_reference
    when 'add_external_dependency' then capability.can_add_external_dependency
    when 'resolve_external_dependency' then capability.can_add_external_dependency
    when 'upload_resolution_evidence' then capability.can_upload_resolution_evidence
    when 'submit_resolution' then capability.can_submit_resolution
    else false
  end;
$$;

create function complaints.actor_can_access_assignment(
  p_actor_user_id uuid,
  p_assignment_id uuid,
  p_capability text,
  p_scope_role_assignment_id uuid default null,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaint_assignments as assignment
    inner join public.user_roles as user_role on user_role.user_id = p_actor_user_id
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join complaints.government_role_capabilities as capability
      on capability.role_id = role.id
    where assignment.id = p_assignment_id
      and assignment.status = 'active'
      and assignment.effective_to is null
      and profile.status = 'active'
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and complaints.role_capability_enabled(capability, p_capability)
      and (
        p_capability not in ('assign', 'transfer')
        or user_role.scope_type in ('global', 'authority')
      )
      and (
        (role.code = 'platform_admin' and user_role.scope_type = 'global')
        or (
          user_role.authority_id = assignment.authority_id
          and private.is_verified_governance_authority(assignment.authority_id)
          and exists (
            select 1 from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = assignment.authority_id
              and membership.status = 'active'
              and membership.effective_from <= p_at
              and (membership.effective_until is null or membership.effective_until > p_at)
          )
          and (
            (user_role.scope_type = 'authority' and user_role.scope_id = assignment.authority_id)
            or (user_role.scope_type = 'ward' and user_role.scope_id = assignment.ward_id)
            or (
              user_role.scope_type = 'department'
              and user_role.scope_id = assignment.authority_department_id
            )
          )
        )
      )
  );
$$;

create function complaints.assignment_has_current_verified_officer(
  p_assignment_id uuid,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaint_assignments as assignment
    where assignment.id = p_assignment_id
      and assignment.officer_assignment_id is not null
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        p_at
      )
  );
$$;

create function complaints.assignment_summary(p_assignment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', assignment.id,
    'authorityId', assignment.authority_id,
    'authorityName', authority.name,
    'localBodyId', assignment.local_body_id,
    'localBodyName', local_body.name,
    'wardId', assignment.ward_id,
    'wardName', ward.name,
    'departmentId', assignment.department_id,
    'departmentName', department.name,
    'authorityDepartmentId', assignment.authority_department_id,
    'officerRoleId', assignment.officer_role_id,
    'officerRoleName', officer_role.name,
    'officerAssignmentId', officer_assignment.id,
    'officerName', officer.full_name,
    'source', case
      when assignment.assignment_source = 'routing_decision' then 'routing_decision'
      when assignment.assignment_source = 'government_transfer' then 'transfer'
      else 'manual_assignment'
    end,
    'status', assignment.status,
    'assignedAt', assignment.effective_from,
    'endedAt', assignment.effective_to
  )
  from complaints.complaint_assignments as assignment
  inner join governance.authorities as authority on authority.id = assignment.authority_id
  inner join governance.local_bodies as local_body on local_body.id = assignment.local_body_id
  left join governance.wards as ward on ward.id = assignment.ward_id
  inner join governance.departments as department on department.id = assignment.department_id
  inner join governance.officer_roles as officer_role on officer_role.id = assignment.officer_role_id
  left join governance.officer_assignments as officer_assignment
    on officer_assignment.id = assignment.officer_assignment_id
   and (
     assignment.status <> 'active'
     or assignment.effective_to is not null
     or complaints.assignment_has_current_verified_officer(
       assignment.id,
       current_timestamp
     )
   )
  left join governance.officers as officer on officer.id = officer_assignment.officer_id
  where assignment.id = p_assignment_id;
$$;

create function public.list_government_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null,
  p_scope_role_assignment_id uuid default null,
  p_queue text default null,
  p_statuses text[] default null,
  p_category_id uuid default null,
  p_ward_id uuid default null,
  p_authority_department_id uuid default null,
  p_officer_assignment_id uuid default null,
  p_submitted_from timestamptz default null,
  p_submitted_to timestamptz default null,
  p_search text default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null))
    or (p_queue is not null and p_queue not in (
      'new', 'unassigned', 'assigned', 'reopened', 'transferred',
      'awaiting_citizen_verification'
    ))
    or (p_search is not null and (
      btrim(p_search) = '' or char_length(p_search) > 120
    ))
    or (p_submitted_from is not null and p_submitted_to is not null
      and p_submitted_to <= p_submitted_from) then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  return query
  select
    complaint.id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.submitted_at,
    complaint.updated_at,
    complaint.workflow_version,
    complaints.assignment_summary(assignment.id),
    jsonb_build_object(
      'isUnassigned', not complaints.assignment_has_current_verified_officer(
        assignment.id,
        current_timestamp
      ),
      'isReopened', complaint.current_status = 'reopened',
      'isTransferred', complaint.current_status = 'transferred',
      'isAwaitingCitizenVerification',
        complaint.current_status = 'citizen_verification_pending'
    )
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join routing.issue_categories as category on category.id = complaint.category_id
  where complaints.actor_can_access_assignment(
      p_actor_user_id,
      assignment.id,
      'view',
      p_scope_role_assignment_id,
      current_timestamp
    )
    and (p_statuses is null or complaint.current_status = any(p_statuses))
    and (p_category_id is null or complaint.category_id = p_category_id)
    and (p_ward_id is null or assignment.ward_id = p_ward_id)
    and (
      p_authority_department_id is null
      or assignment.authority_department_id = p_authority_department_id
    )
    and (
      p_officer_assignment_id is null
      or (
        assignment.officer_assignment_id = p_officer_assignment_id
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
    )
    and (p_submitted_from is null or complaint.submitted_at >= p_submitted_from)
    and (p_submitted_to is null or complaint.submitted_at < p_submitted_to)
    and (
      p_search is null
      or complaint.complaint_number ilike '%' || btrim(p_search) || '%'
    )
    and (
      p_queue is null
      or (p_queue = 'new' and complaint.current_status = 'submitted')
      or (
        p_queue = 'unassigned'
        and not complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (
        p_queue = 'assigned'
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (p_queue = 'reopened' and complaint.current_status = 'reopened')
      or (p_queue = 'transferred' and complaint.current_status = 'transferred')
      or (
        p_queue = 'awaiting_citizen_verification'
        and complaint.current_status = 'citizen_verification_pending'
      )
    )
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit + 1;
end;
$$;

create function complaints.action_is_state_eligible(
  p_action_type text,
  p_status text,
  p_complaint_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_action_type = 'add_internal_note' then true
    when p_action_type = 'upload_resolution_evidence' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type = 'finalize_resolution_evidence' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type = 'assign' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type in ('acknowledge', 'schedule_inspection') then exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = p_action_type and rule.from_status = p_status
    )
    when p_action_type = 'transfer' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'transfer' and rule.from_status = p_status
      )
      and not exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id
          and inspection.status = 'scheduled'
      )
      and not exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id
          and dependency.status = 'active'
      )
    when p_action_type = 'update_status' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'update_status' and rule.from_status = p_status
      )
      and not exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id
          and inspection.status = 'scheduled'
      )
      and not exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id
          and dependency.status = 'active'
      )
    when p_action_type = 'complete_inspection' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'complete_inspection' and rule.from_status = p_status
      ) and exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id and inspection.status = 'scheduled'
      )
    when p_action_type = 'add_work_reference' then
      p_status in ('work_order_created', 'work_in_progress') or exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'add_work_reference' and rule.from_status = p_status
      )
    when p_action_type = 'add_external_dependency' then
      p_status in ('waiting_for_material', 'waiting_for_external_agency') or exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'add_external_dependency' and rule.from_status = p_status
      )
    when p_action_type = 'resolve_external_dependency' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'resolve_external_dependency' and rule.from_status = p_status
      ) and exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id and dependency.status = 'active'
      )
    when p_action_type = 'submit_resolution' then exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'submit_resolution' and rule.from_status = p_status
    )
    else false
  end;
$$;

create function public.get_government_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb,
  description text,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_verification_status text,
  location_verification_score numeric,
  routing_summary jsonb,
  media jsonb,
  assignment_history jsonb,
  timeline jsonb,
  internal_notes jsonb,
  inspections jsonb,
  work_references jsonb,
  external_dependencies jsonb,
  resolution_evidence jsonb,
  allowed_actions text[],
  allowed_status_transitions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.submitted_at,
    complaint.updated_at,
    complaint.workflow_version,
    complaints.assignment_summary(assignment.id),
    jsonb_build_object(
      'isUnassigned', not complaints.assignment_has_current_verified_officer(
        assignment.id,
        current_timestamp
      ),
      'isReopened', complaint.current_status = 'reopened',
      'isTransferred', complaint.current_status = 'transferred',
      'isAwaitingCitizenVerification',
        complaint.current_status = 'citizen_verification_pending'
    ),
    complaint.description,
    extensions.st_x(location.location),
    extensions.st_y(location.location),
    location.accuracy_meters,
    location.provider,
    location.captured_at,
    location.verification_status,
    location.verification_score,
    jsonb_build_object(
      'decisionStatus', routing_decision.decision_status,
      'confidenceScore', routing_decision.confidence_score,
      'explanationCode', routing_decision.explanation_codes[1],
      'fallbackUsed', routing_decision.fallback_depth > 0,
      'fallbackDepth', routing_decision.fallback_depth,
      'resolvedAt', routing_decision.resolved_at
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', complaint_media.id,
        'kind', complaint_media.media_kind,
        'mimeType', coalesce(complaint_media.observed_mime_type, complaint_media.declared_mime_type),
        'byteSize', coalesce(complaint_media.observed_byte_size, complaint_media.declared_byte_size),
        'capturedAt', complaint_media.captured_at,
        'widthPixels', complaint_media.width_pixels,
        'heightPixels', complaint_media.height_pixels,
        'durationMilliseconds', case when complaint_media.duration_seconds is null then null
          else round(complaint_media.duration_seconds * 1000)::bigint end,
        'processingStatus', complaint_media.processing_status,
        'moderationStatus', complaint_media.moderation_status
      ) order by complaint_media.created_at, complaint_media.id)
      from complaints.complaint_media as complaint_media
      where complaint_media.draft_id = complaint.draft_id
        and complaint_media.upload_status = 'finalized'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(complaints.assignment_summary(history.id)
        order by history.version, history.id)
      from complaints.complaint_assignments as history
      where history.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'sequence', event.sequence,
        'fromStatus', event.from_status,
        'toStatus', event.to_status,
        'reasonCode', event.reason_code,
        'publicMessage', event.public_message,
        'occurredAt', event.occurred_at
      ) order by event.sequence)
      from complaints.complaint_status_history as event
      where event.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.id,
        'body', note.body,
        'authorDisplayName', author.display_name,
        'createdAt', note.created_at
      ) order by note.created_at, note.id)
      from complaints.complaint_internal_notes as note
      left join public.profiles as author on author.id = note.author_user_id
      where note.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', inspection.id,
        'status', inspection.status,
        'scheduledFor', inspection.scheduled_for,
        'instructions', inspection.instructions,
        'outcome', inspection.outcome,
        'summary', inspection.summary,
        'completedAt', inspection.completed_at,
        'createdAt', inspection.created_at
      ) order by inspection.created_at, inspection.id)
      from complaints.complaint_inspections as inspection
      where inspection.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', work.id,
        'referenceType', work.reference_type,
        'referenceNumber', work.reference_number,
        'description', work.description,
        'createdAt', work.created_at
      ) order by work.created_at, work.id)
      from complaints.complaint_work_references as work
      where work.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dependency.id,
        'dependencyType', dependency.dependency_type,
        'description', dependency.description,
        'expectedBy', dependency.expected_by,
        'status', dependency.status,
        'resolutionSummary', dependency.resolution_summary,
        'resolvedAt', dependency.resolved_at,
        'createdAt', dependency.created_at
      ) order by dependency.created_at, dependency.id)
      from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'uploadStatus', evidence.upload_status,
        'availableForResolution',
          evidence.upload_status = 'finalized'
          and evidence.assignment_id = assignment.id
          and not exists (
            select 1
            from complaints.complaint_resolution_evidence_links as used_evidence
            where used_evidence.evidence_id = evidence.id
          ),
        'capturedAt', evidence.captured_at,
        'finalizedAt', evidence.finalized_at,
        'createdAt', evidence.created_at
      ) order by evidence.created_at, evidence.id)
      from complaints.complaint_resolution_evidence as evidence
      where evidence.complaint_id = complaint.id
    ), '[]'::jsonb),
    array(
      select action_name
      from unnest(array[
        'acknowledge', 'assign', 'transfer', 'update_status', 'add_internal_note',
        'schedule_inspection', 'complete_inspection', 'add_work_reference',
        'add_external_dependency', 'resolve_external_dependency',
        'upload_resolution_evidence', 'submit_resolution'
      ]::text[]) as action_name
      where complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, action_name,
        p_scope_role_assignment_id, current_timestamp
      )
        and complaints.action_is_state_eligible(
          action_name,
          complaint.current_status,
          complaint.id
        )
        and (
          action_name = 'add_internal_note'
          or (
            action_name = 'upload_resolution_evidence'
            and complaint.current_status not in (
              'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
              'rejected', 'cancelled'
            )
          )
          or (
            action_name in ('acknowledge', 'transfer', 'schedule_inspection')
            and exists (
              select 1
              from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = action_name
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'assign'
            and complaint.current_status not in (
              'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
              'rejected', 'cancelled'
            )
          )
          or (
            action_name = 'update_status'
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'update_status'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'complete_inspection'
            and exists (
              select 1 from complaints.complaint_inspections as pending_inspection
              where pending_inspection.complaint_id = complaint.id
                and pending_inspection.status = 'scheduled'
            )
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'complete_inspection'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'add_work_reference'
            and (
              complaint.current_status in ('work_order_created', 'work_in_progress')
              or exists (
                select 1 from complaints.government_status_transition_rules as action_rule
                where action_rule.action_type = 'add_work_reference'
                  and action_rule.from_status = complaint.current_status
              )
            )
          )
          or (
            action_name = 'add_external_dependency'
            and (
              complaint.current_status in ('waiting_for_material', 'waiting_for_external_agency')
              or exists (
                select 1 from complaints.government_status_transition_rules as action_rule
                where action_rule.action_type = 'add_external_dependency'
                  and action_rule.from_status = complaint.current_status
              )
            )
          )
          or (
            action_name = 'resolve_external_dependency'
            and exists (
              select 1 from complaints.complaint_external_dependencies as open_dependency
              where open_dependency.complaint_id = complaint.id
                and open_dependency.status = 'active'
            )
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'resolve_external_dependency'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'submit_resolution'
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'submit_resolution'
                and action_rule.from_status = complaint.current_status
            )
            and exists (
              select 1 from complaints.complaint_resolution_evidence as ready_evidence
              where ready_evidence.complaint_id = complaint.id
                and ready_evidence.assignment_id = assignment.id
                and ready_evidence.upload_status = 'finalized'
                and not exists (
                  select 1 from complaints.complaint_resolution_evidence_links as used_evidence
                  where used_evidence.evidence_id = ready_evidence.id
                )
            )
            and not exists (
              select 1 from complaints.complaint_external_dependencies as open_dependency
              where open_dependency.complaint_id = complaint.id
                and open_dependency.status = 'active'
            )
          )
        )
      order by action_name
    ),
    array(
      select distinct rule.to_status
      from complaints.government_status_transition_rules as rule
      where rule.action_type = 'update_status'
        and rule.from_status = complaint.current_status
        and complaints.action_is_state_eligible(
          'update_status',
          complaint.current_status,
          complaint.id
        )
      order by rule.to_status
    )
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join routing.issue_categories as category on category.id = complaint.category_id
  inner join complaints.complaint_location_evidence as location
    on location.id = complaint.location_evidence_id
  inner join routing.routing_decisions as routing_decision
    on routing_decision.id = complaint.routing_decision_id
  where complaint.id = p_complaint_id
    and complaints.actor_can_access_assignment(
      p_actor_user_id, assignment.id, 'view',
      p_scope_role_assignment_id, current_timestamp
    );
$$;

create function public.list_government_assignment_options(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (
  complaint_id uuid,
  workflow_version bigint,
  options jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id,
    complaint.workflow_version,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'officerAssignmentId', officer_assignment.id,
        'authorityDepartmentId', officer_assignment.authority_department_id,
        'departmentId', authority_department.department_id,
        'departmentName', department.name,
        'wardId', officer_assignment.ward_id,
        'wardName', ward.name,
        'officerRoleId', officer_assignment.officer_role_id,
        'officerRoleName', officer_role.name,
        'officerName', officer.full_name,
        'allowedActions', case
          when officer_assignment.ward_id is not distinct from assignment.ward_id
            and authority_department.department_id = assignment.department_id
            and officer_assignment.authority_department_id = assignment.authority_department_id
            and officer_assignment.officer_role_id = assignment.officer_role_id
          then jsonb_build_array('assign')
          else jsonb_build_array('transfer')
        end
      ) order by department.name, officer_role.name, officer.full_name, officer_assignment.id)
      from governance.officer_assignments as officer_assignment
      inner join governance.authority_departments as authority_department
        on authority_department.id = officer_assignment.authority_department_id
      inner join governance.departments as department
        on department.id = authority_department.department_id
      inner join governance.officer_roles as officer_role
        on officer_role.id = officer_assignment.officer_role_id
      inner join governance.officers as officer on officer.id = officer_assignment.officer_id
      left join governance.wards as ward on ward.id = officer_assignment.ward_id
      where officer_assignment.authority_id = assignment.authority_id
        and officer_assignment.local_body_id = assignment.local_body_id
        and officer_assignment.id is distinct from assignment.officer_assignment_id
        and officer_assignment.status = 'active'
        and officer_assignment.verification_status = 'verified'
        and not officer_assignment.is_placeholder
        and officer_assignment.effective_from <= current_timestamp
        and (
          officer_assignment.effective_to is null
          or officer_assignment.effective_to > current_timestamp
        )
        and complaints.is_verified_assignment_scope(
          officer_assignment.authority_id,
          officer_assignment.local_body_id,
          officer_assignment.ward_id,
          authority_department.department_id,
          officer_assignment.authority_department_id,
          officer_assignment.officer_role_id,
          officer_assignment.id,
          current_timestamp
        )
    ), '[]'::jsonb)
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where complaint.id = p_complaint_id
    and (
      complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, 'assign',
        p_scope_role_assignment_id, current_timestamp
      )
      or complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, 'transfer',
        p_scope_role_assignment_id, current_timestamp
      )
    );
$$;

create function public.get_government_resolution_evidence_object(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_scope_role_assignment_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  evidence_id uuid,
  complaint_id uuid,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_status text,
  upload_expires_at timestamptz,
  workflow_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    evidence.id,
    evidence.complaint_id,
    evidence.bucket_id,
    evidence.object_path,
    evidence.declared_mime_type,
    evidence.declared_byte_size,
    evidence.client_sha256,
    evidence.observed_mime_type,
    evidence.observed_byte_size,
    evidence.upload_status,
    evidence.upload_expires_at,
    complaint.workflow_version
  from complaints.complaint_resolution_evidence as evidence
  inner join complaints.complaints as complaint
    on complaint.id = evidence.complaint_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = evidence.complaint_id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where evidence.id = p_evidence_id
    and evidence.complaint_id = p_complaint_id
    and p_purpose in ('view', 'finalize')
    and (p_purpose = 'view' or evidence.assignment_id = assignment.id)
    and complaints.actor_can_access_assignment(
      p_actor_user_id, assignment.id,
      case when p_purpose = 'finalize' then 'upload_resolution_evidence' else 'view' end,
      p_scope_role_assignment_id, current_timestamp
    );
$$;

create function complaints.action_capability(p_action_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_action_type
    when 'acknowledge' then 'acknowledge'
    when 'assign' then 'assign'
    when 'transfer' then 'transfer'
    when 'update_status' then 'update_status'
    when 'add_internal_note' then 'add_internal_note'
    when 'schedule_inspection' then 'schedule_inspection'
    when 'complete_inspection' then 'complete_inspection'
    when 'add_work_reference' then 'add_work_reference'
    when 'add_external_dependency' then 'add_external_dependency'
    when 'resolve_external_dependency' then 'add_external_dependency'
    when 'upload_resolution_evidence' then 'upload_resolution_evidence'
    when 'finalize_resolution_evidence' then 'upload_resolution_evidence'
    when 'submit_resolution' then 'submit_resolution'
    else null
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
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  capability_name text := complaints.action_capability(p_action_type);
  next_status text;
  reason_code text;
  public_message text;
  entity_id uuid;
  next_assignment_id uuid;
  target record;
  scheduled_inspection complaints.complaint_inspections%rowtype;
  dependency complaints.complaint_external_dependencies%rowtype;
  resolution_id uuid;
  evidence_ids uuid[];
  history_id uuid;
  response jsonb;
  scheduled_for timestamptz;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or capability_name is null
    or p_action_type in ('upload_resolution_evidence', 'finalize_resolution_evidence')
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
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
      p_actor_user_id, assignment.id, capability_name, null, operation_at
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
    p_actor_user_id, assignment.id, capability_name, null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;

  if not complaints.action_is_state_eligible(
    p_action_type, complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, p_action_type, p_idempotency_key_hash,
    p_request_fingerprint, p_request_id, complaint.current_status, complaint.current_status
  )
  on conflict (actor_user_id, idempotency_key_hash) do nothing;

  if not found then
    select action.* into existing_action
    from complaints.government_action_requests as action
    where action.actor_user_id = p_actor_user_id
      and action.idempotency_key_hash = p_idempotency_key_hash;
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  perform set_config('local_wellness.government_action_id', action_id::text, true);
  next_status := complaint.current_status;

  if p_action_type = 'acknowledge' then
    if p_payload - array['publicMessage'] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    next_status := 'acknowledged';
    reason_code := 'COMPLAINT_ACKNOWLEDGED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');

  elsif p_action_type in ('assign', 'transfer') then
    if p_payload - array['officerAssignmentId', 'reason', 'note'] <> '{}'::jsonb
      or not (p_payload ?& array['officerAssignmentId', 'reason']) then
      raise exception using errcode = '22023', message = 'OFFICER_ASSIGNMENT_REQUIRED';
    end if;

    begin
      select
        officer_assignment.id,
        officer_assignment.authority_id,
        officer_assignment.local_body_id,
        officer_assignment.ward_id,
        authority_department.department_id,
        officer_assignment.authority_department_id,
        officer_assignment.officer_role_id,
        null::uuid as assigned_user_id
      into target
      from governance.officer_assignments as officer_assignment
      inner join governance.authority_departments as authority_department
        on authority_department.id = officer_assignment.authority_department_id
      inner join governance.officers as officer on officer.id = officer_assignment.officer_id
      where officer_assignment.id = (p_payload ->> 'officerAssignmentId')::uuid
        and officer_assignment.authority_id = assignment.authority_id
        and officer_assignment.local_body_id = assignment.local_body_id
        and complaints.is_verified_assignment_scope(
          officer_assignment.authority_id,
          officer_assignment.local_body_id,
          officer_assignment.ward_id,
          authority_department.department_id,
          officer_assignment.authority_department_id,
          officer_assignment.officer_role_id,
          officer_assignment.id,
          operation_at
        );
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'OFFICER_ASSIGNMENT_INVALID';
    end;

    if target.id is null
      or target.id is not distinct from assignment.officer_assignment_id
      or (p_action_type = 'assign' and (
        target.ward_id is distinct from assignment.ward_id
        or target.department_id <> assignment.department_id
        or target.authority_department_id <> assignment.authority_department_id
        or target.officer_role_id <> assignment.officer_role_id
      ))
      or (p_action_type = 'transfer'
        and target.ward_id is not distinct from assignment.ward_id
        and target.department_id = assignment.department_id
        and target.authority_department_id = assignment.authority_department_id
        and target.officer_role_id = assignment.officer_role_id)
      or (
        p_action_type = 'assign'
        and p_payload ->> 'reason' not in (
          'initial_assignment', 'workload_balance', 'officer_unavailable',
          'specialist_required', 'routing_correction'
        )
      )
      or (
        p_action_type = 'transfer'
        and p_payload ->> 'reason' not in (
          'incorrect_department', 'specialist_required', 'routing_correction',
          'operational_transfer'
        )
      ) then
      raise exception using errcode = '23514', message = 'OFFICER_ASSIGNMENT_INVALID';
    end if;

    update complaints.complaint_assignments as current_assignment
    set
      status = 'superseded',
      effective_to = operation_at,
      ended_by_user_id = p_actor_user_id
    where current_assignment.id = assignment.id;

    next_assignment_id := gen_random_uuid();
    insert into complaints.complaint_assignments (
      id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
      department_id, authority_department_id, officer_role_id, officer_assignment_id,
      asset_type_id, asset_id, asset_version_id, asset_ownership_version_id,
      assignment_source, status, assigned_at, version, effective_from,
      assigned_by_user_id, assigned_user_id, supersedes_assignment_id, reason_code
    ) values (
      next_assignment_id, complaint.id, assignment.routing_decision_id,
      target.authority_id, target.local_body_id, target.ward_id,
      target.department_id, target.authority_department_id, target.officer_role_id, target.id,
      assignment.asset_type_id, assignment.asset_id, assignment.asset_version_id,
      assignment.asset_ownership_version_id,
      case when p_action_type = 'transfer' then 'government_transfer'
        when assignment.officer_assignment_id is null then 'government_assignment'
        else 'government_reassignment' end,
      'active', operation_at, assignment.version + 1, operation_at,
      p_actor_user_id, target.assigned_user_id, assignment.id, p_payload ->> 'reason'
    );
    select created_assignment.* into assignment
    from complaints.complaint_assignments as created_assignment
    where created_assignment.id = next_assignment_id;
    entity_id := next_assignment_id;
    if p_action_type = 'transfer' and complaint.current_status <> 'transferred' then
      next_status := 'transferred';
      reason_code := 'COMPLAINT_TRANSFERRED';
    elsif p_action_type = 'assign' and exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'assign'
        and rule.from_status = complaint.current_status
        and rule.to_status = 'assigned'
    ) then
      next_status := 'assigned';
      reason_code := 'COMPLAINT_ASSIGNED';
    end if;
    if nullif(btrim(p_payload ->> 'note'), '') is not null then
      insert into complaints.complaint_internal_notes (
        complaint_id, assignment_id, author_user_id, body
      ) values (
        complaint.id, next_assignment_id, p_actor_user_id, btrim(p_payload ->> 'note')
      );
    end if;

  elsif p_action_type = 'update_status' then
    if p_payload - array['status', 'publicMessage'] <> '{}'::jsonb
      or not (p_payload ? 'status') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    next_status := p_payload ->> 'status';
    if next_status = complaint.current_status then
      raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
    end if;
    if exists (
      select 1 from complaints.complaint_inspections as active_inspection
      where active_inspection.complaint_id = complaint.id
        and active_inspection.status = 'scheduled'
    ) or exists (
      select 1 from complaints.complaint_external_dependencies as active_dependency
      where active_dependency.complaint_id = complaint.id
        and active_dependency.status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
    end if;
    reason_code := 'GOVERNMENT_STATUS_UPDATED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');

  elsif p_action_type = 'add_internal_note' then
    if p_payload - array['body'] <> '{}'::jsonb or not (p_payload ? 'body') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    insert into complaints.complaint_internal_notes (
      id, complaint_id, assignment_id, author_user_id, body
    ) values (
      entity_id, complaint.id, assignment.id, p_actor_user_id, btrim(p_payload ->> 'body')
    );

  elsif p_action_type = 'schedule_inspection' then
    if p_payload - array['scheduledFor', 'instructions'] <> '{}'::jsonb
      or not (p_payload ? 'scheduledFor') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      scheduled_for := (p_payload ->> 'scheduledFor')::timestamptz;
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if scheduled_for <= operation_at then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    begin
      insert into complaints.complaint_inspections (
        id, complaint_id, assignment_id, scheduled_for, instructions,
        scheduled_by_user_id
      ) values (
        entity_id, complaint.id, assignment.id,
        scheduled_for,
        nullif(btrim(p_payload ->> 'instructions'), ''), p_actor_user_id
      );
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    next_status := 'inspection_scheduled';
    reason_code := 'INSPECTION_SCHEDULED';

  elsif p_action_type = 'complete_inspection' then
    if p_payload - array['inspectionId', 'outcome', 'summary'] <> '{}'::jsonb
      or not (p_payload ?& array['inspectionId', 'outcome', 'summary'])
      or p_payload ->> 'outcome' not in (
        'confirmed', 'not_found', 'partially_confirmed', 'access_blocked',
        'external_dependency'
      ) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      select inspection.* into scheduled_inspection
      from complaints.complaint_inspections as inspection
      where inspection.id = (p_payload ->> 'inspectionId')::uuid
        and inspection.complaint_id = complaint.id
        and inspection.status = 'scheduled'
      for update;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if not found then
      raise exception using errcode = 'P0002', message = 'COMPLAINT_INSPECTION_NOT_FOUND';
    end if;
    update complaints.complaint_inspections as inspection
    set
      status = 'completed',
      outcome = p_payload ->> 'outcome',
      summary = btrim(p_payload ->> 'summary'),
      completed_by_user_id = p_actor_user_id,
      completed_at = operation_at
    where inspection.id = scheduled_inspection.id;
    entity_id := scheduled_inspection.id;
    next_status := 'inspection_completed';
    reason_code := 'INSPECTION_COMPLETED';

  elsif p_action_type = 'add_work_reference' then
    if p_payload - array['referenceType', 'referenceNumber', 'description'] <> '{}'::jsonb
      or not (p_payload ?& array['referenceType', 'referenceNumber']) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    insert into complaints.complaint_work_references (
      id, complaint_id, assignment_id, added_by_user_id,
      reference_type, reference_number, description
    ) values (
      entity_id, complaint.id, assignment.id, p_actor_user_id,
      btrim(p_payload ->> 'referenceType'), btrim(p_payload ->> 'referenceNumber'),
      nullif(btrim(p_payload ->> 'description'), '')
    );
    if exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'add_work_reference'
        and rule.from_status = complaint.current_status
        and rule.to_status = 'work_order_created'
    ) then
      next_status := 'work_order_created';
      reason_code := 'WORK_REFERENCE_ADDED';
    end if;

  elsif p_action_type = 'add_external_dependency' then
    if p_payload - array['dependencyType', 'description', 'expectedBy'] <> '{}'::jsonb
      or not (p_payload ?& array['dependencyType', 'description'])
      or p_payload ->> 'dependencyType' not in (
        'material', 'external_agency', 'permit', 'utility', 'other'
      ) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    begin
      insert into complaints.complaint_external_dependencies (
        id, complaint_id, assignment_id, added_by_user_id,
        dependency_type, description, expected_by
      ) values (
        entity_id, complaint.id, assignment.id, p_actor_user_id,
        p_payload ->> 'dependencyType', btrim(p_payload ->> 'description'),
        case when nullif(p_payload ->> 'expectedBy', '') is null then null
          else (p_payload ->> 'expectedBy')::timestamptz end
      );
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if complaint.current_status in ('waiting_for_material', 'waiting_for_external_agency') then
      next_status := complaint.current_status;
    else
      next_status := case when p_payload ->> 'dependencyType' = 'material'
        then 'waiting_for_material' else 'waiting_for_external_agency' end;
    end if;
    reason_code := 'EXTERNAL_DEPENDENCY_ADDED';

  elsif p_action_type = 'resolve_external_dependency' then
    if p_payload - array['dependencyId', 'resolutionSummary'] <> '{}'::jsonb
      or not (p_payload ? 'dependencyId') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      select candidate.* into dependency
      from complaints.complaint_external_dependencies as candidate
      where candidate.id = (p_payload ->> 'dependencyId')::uuid
        and candidate.complaint_id = complaint.id
        and candidate.status = 'active'
      for update;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if not found then
      raise exception using errcode = 'P0002', message = 'COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND';
    end if;
    update complaints.complaint_external_dependencies as target_dependency
    set status = 'resolved',
        resolution_summary = nullif(btrim(p_payload ->> 'resolutionSummary'), ''),
        resolved_by_user_id = p_actor_user_id,
        resolved_at = operation_at
    where target_dependency.id = dependency.id;
    entity_id := dependency.id;
    if exists (
      select 1 from complaints.complaint_external_dependencies as remaining_dependency
      where remaining_dependency.complaint_id = complaint.id
        and remaining_dependency.status = 'active'
    ) then
      next_status := complaint.current_status;
    else
      next_status := 'work_in_progress';
      reason_code := 'EXTERNAL_DEPENDENCY_RESOLVED';
    end if;

  elsif p_action_type = 'submit_resolution' then
    if p_payload - array['completionNote', 'resolutionEvidenceIds', 'publicMessage'] <> '{}'::jsonb
      or not (p_payload ?& array['completionNote', 'resolutionEvidenceIds'])
      or jsonb_typeof(p_payload -> 'resolutionEvidenceIds') <> 'array'
      or jsonb_array_length(p_payload -> 'resolutionEvidenceIds') not between 1 and 20 then
      raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
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
      select count(distinct evidence_id)::integer from unnest(evidence_ids) as evidence_id
    ) then
      raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    perform 1
    from complaints.complaint_resolution_evidence as evidence
    where evidence.id = any(evidence_ids)
    for update;
    if (
      select count(*) from complaints.complaint_resolution_evidence as evidence
      where evidence.id = any(evidence_ids)
        and evidence.complaint_id = complaint.id
        and evidence.assignment_id = assignment.id
        and evidence.upload_status = 'finalized'
        and evidence.finalized_at is not null
        and not exists (
          select 1 from complaints.complaint_resolution_evidence_links as link
          where link.evidence_id = evidence.id
        )
    ) <> cardinality(evidence_ids)
      or exists (
        select 1 from complaints.complaint_external_dependencies as open_dependency
        where open_dependency.complaint_id = complaint.id
          and open_dependency.status = 'active'
      ) then
      raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    resolution_id := gen_random_uuid();
    insert into complaints.complaint_resolutions (
      id, complaint_id, version, assignment_id, submitted_by_user_id,
      completion_note, public_message
    ) values (
      resolution_id, complaint.id,
      coalesce((select max(resolution.version) + 1
        from complaints.complaint_resolutions as resolution
        where resolution.complaint_id = complaint.id), 1),
      assignment.id, p_actor_user_id, btrim(p_payload ->> 'completionNote'),
      nullif(btrim(p_payload ->> 'publicMessage'), '')
    );
    insert into complaints.complaint_resolution_evidence_links (resolution_id, evidence_id)
    select resolution_id, evidence_id from unnest(evidence_ids) as evidence_id;
    entity_id := resolution_id;
    next_status := 'resolution_submitted';
    reason_code := 'RESOLUTION_SUBMITTED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');
  end if;

  if next_status <> complaint.current_status and not exists (
    select 1 from complaints.government_status_transition_rules as rule
    where rule.action_type = p_action_type
      and rule.from_status = complaint.current_status
      and rule.to_status = next_status
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update complaints.government_action_requests as action
  set to_status = next_status
  where action.id = action_id;

  update complaints.complaints as target_complaint
  set
    current_status = next_status,
    workflow_version = target_complaint.workflow_version + 1,
    updated_at = operation_at
  where target_complaint.id = complaint.id;

  if next_status <> complaint.current_status then
    history_id := gen_random_uuid();
    insert into complaints.complaint_status_history (
      id, complaint_id, sequence, from_status, to_status, actor_user_id,
      event_source, reason_code, public_message, request_id, occurred_at
    ) values (
      history_id, complaint.id,
      (select coalesce(max(history.sequence), 0) + 1
        from complaints.complaint_status_history as history
        where history.complaint_id = complaint.id),
      complaint.current_status, next_status, p_actor_user_id,
      'government_action', reason_code, public_message, p_request_id, operation_at
    );
    insert into complaints.notification_outbox (
      complaint_id, status_history_id, aggregate_id, payload, occurred_at
    ) values (
      complaint.id, history_id, complaint.id,
      jsonb_strip_nulls(jsonb_build_object(
        'complaintId', complaint.id,
        'complaintNumber', complaint.complaint_number,
        'status', next_status,
        'authorityId', assignment.authority_id,
        'wardId', assignment.ward_id,
        'authorityDepartmentId', assignment.authority_department_id,
        'occurredAt', operation_at
      )),
      operation_at
    );
  end if;

  response := jsonb_build_object(
    'actionId', action_id,
    'complaintId', complaint.id,
    'complaintNumber', complaint.complaint_number,
    'status', next_status,
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
    assignment.id, p_action_type, complaint.current_status, next_status, p_request_id,
    jsonb_strip_nulls(jsonb_build_object('entityId', entity_id)), operation_at
  );

  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

create function public.reserve_government_resolution_evidence(
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
  p_captured_at timestamptz default null
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
  evidence complaints.complaint_resolution_evidence%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  next_evidence_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  response jsonb;
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
    or p_kind is null
    or p_kind not in ('photo', 'video')
    or p_mime_type is null
    or lower(btrim(p_mime_type)) not in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
    or (p_kind = 'photo' and lower(btrim(p_mime_type)) not like 'image/%')
    or (p_kind = 'video' and lower(btrim(p_mime_type)) not like 'video/%')
    or p_byte_size is null
    or p_byte_size not between 1 and 52428800
    or p_sha256 is null
    or p_sha256 !~ '^[0-9a-f]{64}$'
    or p_captured_at > operation_at + interval '2 minutes' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
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
    p_actor_user_id, assignment.id, 'upload_resolution_evidence', null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> complaint.id
      or existing_action.action_type <> 'upload_resolution_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_resolution_evidence as stored
    where stored.id = (existing_action.response_payload ->> 'evidenceId')::uuid
      and stored.assignment_id = assignment.id;
    if evidence.id is null then
      raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
    end if;
    -- A replay preserves the original immutable reservation. It must never make an
    -- expired object path appear eligible for a newly minted upload token.
    if evidence.upload_status = 'expired'
      or (evidence.upload_status = 'reserved' and evidence.upload_expires_at <= operation_at) then
      raise exception using
        errcode = '55000',
        message = 'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED';
    end if;
    if evidence.upload_status <> 'reserved' then
      raise exception using
        errcode = '55000',
        message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    return query select
      evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
      evidence.declared_mime_type, evidence.declared_byte_size, evidence.upload_status,
      evidence.upload_expires_at, evidence.created_at,
      (existing_action.response_payload ->> 'workflowVersion')::bigint, true;
    return;
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;

  if not complaints.action_is_state_eligible(
    'upload_resolution_evidence', complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  -- The complaint row lock serializes reservations for one complaint. Only usable,
  -- unlinked evidence consumes the bounded upload allowance.
  if (
    select count(*)
    from complaints.complaint_resolution_evidence as active_evidence
    where active_evidence.complaint_id = complaint.id
      and active_evidence.assignment_id = assignment.id
      and (
        (
          active_evidence.upload_status = 'reserved'
          and active_evidence.upload_expires_at > operation_at
        )
        or active_evidence.upload_status = 'finalized'
      )
      and not exists (
        select 1
        from complaints.complaint_resolution_evidence_links as evidence_link
        where evidence_link.evidence_id = active_evidence.id
      )
  ) >= 20 then
    raise exception using
      errcode = '23514',
      message = 'RESOLUTION_EVIDENCE_LIMIT_REACHED';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'upload_resolution_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, complaint.current_status
  ) on conflict (actor_user_id, idempotency_key_hash) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
  end if;
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  insert into complaints.complaint_resolution_evidence (
    id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
    declared_mime_type, declared_byte_size, client_sha256, captured_at,
    upload_expires_at
  ) values (
    next_evidence_id, complaint.id, assignment.id, p_actor_user_id, p_kind,
    format('%s/%s/original', complaint.id, next_evidence_id),
    lower(btrim(p_mime_type)), p_byte_size, p_sha256, p_captured_at,
    operation_at + interval '15 minutes'
  ) returning * into evidence;

  update complaints.complaints as target
  set workflow_version = target.workflow_version + 1, updated_at = operation_at
  where target.id = complaint.id;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'bucket', evidence.bucket_id,
    'objectPath', evidence.object_path,
    'kind', evidence.kind,
    'mimeType', evidence.declared_mime_type,
    'byteSize', evidence.declared_byte_size,
    'uploadStatus', evidence.upload_status,
    'expiresAt', evidence.upload_expires_at,
    'createdAt', evidence.created_at,
    'workflowVersion', complaint.workflow_version + 1
  );
  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id, assignment_id,
    action_type, from_status, to_status, request_id, metadata, occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id, assignment.id,
    'upload_resolution_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
    evidence.declared_mime_type, evidence.declared_byte_size, evidence.upload_status,
    evidence.upload_expires_at, evidence.created_at, complaint.workflow_version + 1, false;
end;
$$;

create function public.finalize_government_resolution_evidence(
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
  evidence complaints.complaint_resolution_evidence%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  normalized_mime text := lower(btrim(p_observed_mime_type));
  response jsonb;
begin
  if p_actor_user_id is null or p_complaint_id is null or p_evidence_id is null
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_observed_mime_type is null
    or normalized_mime is null
    or p_observed_byte_size is null
    or p_observed_byte_size not between 1 and 52428800
    or p_verified_sha256 is null
    or p_verified_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;
  select candidate.* into complaint
  from complaints.complaints as candidate where candidate.id = p_complaint_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active' and current_assignment.effective_to is null
  for update;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment.id, 'upload_resolution_evidence', null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> complaint.id
      or existing_action.action_type <> 'finalize_resolution_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence from complaints.complaint_resolution_evidence as stored
    where stored.id = p_evidence_id
      and stored.complaint_id = complaint.id
      and stored.assignment_id = assignment.id;
    if evidence.id is null then
      raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    return query select evidence.id, evidence.kind, evidence.observed_mime_type,
      evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
      evidence.finalized_at, evidence.created_at,
      (existing_action.response_payload ->> 'workflowVersion')::bigint, true;
    return;
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  if not complaints.action_is_state_eligible(
    'finalize_resolution_evidence', complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;
  select stored.* into evidence
  from complaints.complaint_resolution_evidence as stored
  where stored.id = p_evidence_id
    and stored.complaint_id = complaint.id
    and stored.assignment_id = assignment.id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
  end if;
  if evidence.upload_status <> 'reserved' or evidence.upload_expires_at <= operation_at then
    raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;
  if evidence.declared_mime_type <> normalized_mime
    or evidence.declared_byte_size <> p_observed_byte_size
    or evidence.client_sha256 <> p_verified_sha256 then
    raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'finalize_resolution_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, complaint.current_status
  ) on conflict (actor_user_id, idempotency_key_hash) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
  end if;
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  update complaints.complaint_resolution_evidence as target
  set observed_mime_type = normalized_mime,
      observed_byte_size = p_observed_byte_size,
      verified_sha256 = p_verified_sha256,
      upload_status = 'finalized',
      finalized_at = operation_at,
      failure_code = null
  where target.id = evidence.id
  returning * into evidence;
  update complaints.complaints as target
  set workflow_version = target.workflow_version + 1, updated_at = operation_at
  where target.id = complaint.id;

  response := jsonb_build_object(
    'evidenceId', evidence.id, 'complaintId', complaint.id, 'kind', evidence.kind,
    'mimeType', evidence.observed_mime_type, 'byteSize', evidence.observed_byte_size,
    'uploadStatus', evidence.upload_status, 'capturedAt', evidence.captured_at,
    'finalizedAt', evidence.finalized_at, 'createdAt', evidence.created_at,
    'workflowVersion', complaint.workflow_version + 1
  );
  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id, assignment_id,
    action_type, from_status, to_status, request_id, metadata, occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id, assignment.id,
    'finalize_resolution_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select evidence.id, evidence.kind, evidence.observed_mime_type,
    evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
    evidence.finalized_at, evidence.created_at, complaint.workflow_version + 1, false;
end;
$$;

create function public.expire_government_resolution_evidence(
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
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_CLEANUP_LIMIT_INVALID';
  end if;

  perform set_config(
    'local_wellness.resolution_evidence_mutation',
    'expire',
    true
  );
  with expiring as (
    select evidence.id
    from complaints.complaint_resolution_evidence as evidence
    where evidence.upload_status = 'reserved'
      and evidence.upload_expires_at <= operation_at
    order by evidence.upload_expires_at, evidence.id
    for update skip locked
    limit p_limit
  )
  update complaints.complaint_resolution_evidence as evidence
  set upload_status = 'expired',
      failure_code = 'UPLOAD_RESERVATION_EXPIRED'
  from expiring
  where evidence.id = expiring.id;
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create function public.fail_government_resolution_evidence(
  p_evidence_id uuid,
  p_failure_code text
)
returns table (
  evidence_id uuid,
  upload_status text,
  failure_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_failure_code text := upper(btrim(p_failure_code));
begin
  if p_evidence_id is null
    or p_failure_code is null
    or normalized_failure_code is null
    or normalized_failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
    or normalized_failure_code = 'UPLOAD_RESERVATION_EXPIRED' then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_FAILURE_CODE_INVALID';
  end if;

  perform set_config(
    'local_wellness.resolution_evidence_mutation',
    'fail',
    true
  );
  return query
  update complaints.complaint_resolution_evidence as evidence
  set upload_status = 'failed',
      failure_code = normalized_failure_code
  where evidence.id = p_evidence_id
    and evidence.upload_status = 'reserved'
  returning evidence.id, evidence.upload_status, evidence.failure_code;

  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;
end;
$$;

create or replace function public.list_owned_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMPLAINT_LIST_CURSOR_INVALID';
  end if;
  return query
  select
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id, category.name, complaint.current_status,
    complaint.visibility, complaint.submitted_at, complaint.updated_at,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join routing.issue_categories as category on category.id = complaint.category_id
  where complaint.citizen_user_id = p_actor_user_id
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_owned_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  asset_id uuid,
  description text,
  description_language text,
  custom_attributes jsonb,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  location_evidence_id uuid,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_device_recorded_at timestamptz,
  mock_location_detected boolean,
  location_verification_status text,
  location_verification_score numeric,
  routing_decision_id uuid,
  routing_request_id text,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  authority_department_id uuid,
  officer_role_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id, category.name, complaint.asset_id, complaint.description,
    complaint.description_language, complaint.custom_attributes,
    complaint.current_status, complaint.visibility, complaint.submitted_at,
    complaint.updated_at, evidence.id, extensions.st_x(evidence.location),
    extensions.st_y(evidence.location), evidence.accuracy_meters, evidence.provider,
    evidence.captured_at, evidence.device_recorded_at, evidence.mock_location_detected,
    evidence.verification_status, evidence.verification_score,
    complaint.routing_decision_id, submission.routing_request_id, assignment.id,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id, assignment.authority_department_id,
    assignment.officer_role_id
  from complaints.complaints as complaint
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  inner join routing.issue_categories as category on category.id = complaint.category_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join complaints.complaint_submission_requests as submission
    on submission.complaint_id = complaint.id
  where complaint.id = p_complaint_id
    and complaint.citizen_user_id = p_actor_user_id;
$$;

alter function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  rename to submit_complaint_phase4_impl;

create function public.submit_complaint(
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
  from public.submit_complaint_phase4_impl(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id,
    p_acknowledged_duplicate_suggestion_ids,
    p_emergency_disclaimer_acknowledged
  ) as implementation;
end;
$$;

revoke all on function public.submit_complaint_phase4_impl(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated, service_role;

revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;

revoke all on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.get_government_complaint(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_government_assignment_options(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_government_resolution_evidence_object(
  uuid, uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.reserve_government_resolution_evidence(
  uuid, uuid, bigint, text, text, text, text, text, bigint, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.finalize_government_resolution_evidence(
  uuid, uuid, uuid, bigint, text, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.expire_government_resolution_evidence(integer)
  from public, anon, authenticated;
revoke all on function public.fail_government_resolution_evidence(uuid, text)
  from public, anon, authenticated;
revoke all on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;

grant execute on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) to service_role;
grant execute on function public.get_government_complaint(uuid, uuid, uuid)
  to service_role;
grant execute on function public.list_government_assignment_options(uuid, uuid, uuid)
  to service_role;
grant execute on function public.get_government_resolution_evidence_object(
  uuid, uuid, uuid, uuid, text
) to service_role;
grant execute on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) to service_role;
grant execute on function public.reserve_government_resolution_evidence(
  uuid, uuid, bigint, text, text, text, text, text, bigint, text, timestamptz
) to service_role;
grant execute on function public.finalize_government_resolution_evidence(
  uuid, uuid, uuid, bigint, text, text, text, text, bigint, text
) to service_role;
grant execute on function public.expire_government_resolution_evidence(integer)
  to service_role;
grant execute on function public.fail_government_resolution_evidence(uuid, text)
  to service_role;
grant execute on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  to service_role;

comment on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) is 'Service-only, scope-authorized and exactly replayable Phase 5 government workflow mutation.';
comment on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) is 'Service-only access-scoped queue with keyset pagination and no location coordinates.';
comment on function public.expire_government_resolution_evidence(integer)
  is 'Service-only bounded cleanup for immutable upload reservations whose upload window has elapsed.';
comment on function public.fail_government_resolution_evidence(uuid, text)
  is 'Service-only guarded transition from a reserved evidence upload to a terminal technical failure.';
