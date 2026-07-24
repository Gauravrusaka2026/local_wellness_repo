-- The V1 runtime uses the owner-approved ward/category contact matrix. The
-- review-gated governance synchronization pipeline and public comments were
-- never activated, so keeping their tables, triggers, RPCs and Edge boundary
-- only increases the operational surface.

do $prune_preflight$
declare
  has_active_sync_leases boolean := false;
  has_complaint_comments boolean := false;
  has_retired_governance_data boolean := false;
  retired_relation_has_rows boolean := false;
  retired_relation_name text;
  active_contact_count integer := 0;
  approved_contact_count integer := 0;
  active_ward_count integer := 0;
  active_category_count integer := 0;
begin
  if pg_catalog.to_regclass('routing.ward_issue_contacts') is null then
    raise exception using
      errcode = '55000',
      message = 'V1_PRUNE_WARD_CONTACT_MATRIX_REQUIRED',
      hint = 'Apply the V1 ward-routing migrations before pruning deferred subsystems.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'routing.ward_issue_contacts'::regclass
      and attribute.attname = 'email_owner_approved_for_routing'
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) then
    raise exception using
      errcode = '55000',
      message = 'V1_PRUNE_WARD_CONTACT_PROVENANCE_REQUIRED',
      hint = 'Apply the V1 ward-email provenance migration and seed before pruning.';
  end if;

  execute
    'select
       count(*) filter (where is_active),
       count(*) filter (where is_active and email_owner_approved_for_routing),
       count(distinct ward_id) filter (where is_active),
       count(distinct category_id) filter (where is_active)
     from routing.ward_issue_contacts'
  into
    active_contact_count,
    approved_contact_count,
    active_ward_count,
    active_category_count;

  foreach retired_relation_name in array array[
    'governance.source_endpoints',
    'governance.sync_runs',
    'governance.raw_snapshots',
    'governance.sync_run_snapshots',
    'governance.sync_candidates',
    'governance.sync_change_items',
    'governance.sync_review_items',
    'governance.sync_review_events',
    'governance.sync_source_leases',
    'governance.sync_events',
    'governance.source_evidence',
    'governance.contact_channels',
    'governance.contact_channel_versions',
    'governance.sync_scope_targets'
  ]
  loop
    if pg_catalog.to_regclass(retired_relation_name) is not null then
      execute format(
        'select exists (select 1 from %s)',
        retired_relation_name
      )
      into retired_relation_has_rows;

      if retired_relation_has_rows then
        has_retired_governance_data := true;
        exit;
      end if;
    end if;
  end loop;

  if has_retired_governance_data
    and (
      active_contact_count < 312
      or active_contact_count <> approved_contact_count
      or active_ward_count < 26
      or active_category_count < 12
      or active_contact_count <> active_ward_count * active_category_count
    ) then
    raise exception using
      errcode = '55000',
      message = 'V1_PRUNE_WARD_CONTACT_MATRIX_INCOMPLETE',
      detail = format(
        'active=%s approved=%s wards=%s categories=%s',
        active_contact_count,
        approved_contact_count,
        active_ward_count,
        active_category_count
      ),
      hint = 'Load and verify a complete owner-approved ward-by-category matrix before pruning.';
  end if;

  if pg_catalog.to_regclass('complaints.complaint_comments') is not null then
    execute
      'select exists (select 1 from complaints.complaint_comments)'
      into has_complaint_comments;
  end if;

  if has_complaint_comments then
    raise exception using
      errcode = '55000',
      message = 'V1_PRUNE_COMPLAINT_COMMENT_HISTORY_PRESENT',
      hint = 'Preserve and migrate existing comment history before retrying; this migration never deletes it.';
  end if;

  if pg_catalog.to_regclass('governance.sync_source_leases') is not null then
    execute
      'lock table governance.sync_source_leases in access exclusive mode';

    execute
      'select exists (
        select 1
        from governance.sync_source_leases
        where expires_at > current_timestamp
      )'
      into has_active_sync_leases;
  end if;

  if has_active_sync_leases then
    raise exception using
      errcode = '55000',
      message = 'V1_PRUNE_ACTIVE_GOVERNANCE_SYNC_LEASES',
      hint = 'Stop governance synchronization and clear or expire its leases before retrying.';
  end if;
end;
$prune_preflight$;

-- Replace the only retained SQL dependency on the versioned-contact view
-- before removing that view. This keeps unexpected hosted-only dependencies
-- visible: the subsequent RESTRICT drops abort instead of deleting them.
create or replace function governance.resolve_complaint_contact_readiness(
  p_authority_id uuid,
  p_local_body_id uuid,
  p_ward_id uuid,
  p_authority_department_id uuid,
  p_office_id uuid,
  p_officer_id uuid,
  p_officer_assignment_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with selected_scope as (
    select 'ward'::text as contact_scope, 1 as scope_priority
    where p_ward_id is not null
      and exists (
        select 1
        from routing.ward_issue_contacts as contact
        where contact.ward_id = p_ward_id
          and contact.is_active
      )

    union all

    select 'local_body'::text, 2
    where p_local_body_id is not null
      and exists (
        select 1
        from routing.ward_issue_contacts as contact
        inner join governance.wards as ward on ward.id = contact.ward_id
        where ward.local_body_id = p_local_body_id
          and contact.is_active
      )

    union all

    select 'authority'::text, 3
    where p_authority_id is not null
      and exists (
        select 1
        from routing.ward_issue_contacts as contact
        inner join governance.wards as ward on ward.id = contact.ward_id
        inner join governance.local_bodies as local_body
          on local_body.id = ward.local_body_id
        where local_body.authority_id = p_authority_id
          and contact.is_active
      )

    order by scope_priority
    limit 1
  )
  select case
    when selected_scope.contact_scope is null then jsonb_build_object(
      'externalContactStatus', 'not_available',
      'contactScope', null,
      'approvedChannelTypes', '[]'::jsonb,
      'automaticOutboundDelivery', false,
      'reason', 'verified_queue_no_approved_external_contact'
    )
    else jsonb_build_object(
      'externalContactStatus', 'verified_governing_body_contact',
      'contactScope', selected_scope.contact_scope,
      'approvedChannelTypes', '["email","phone","whatsapp"]'::jsonb,
      'automaticOutboundDelivery', false,
      'reason', 'verified_governing_body_contact_available'
    )
  end
  from (select 1) as singleton
  left join selected_scope on true;
$$;

-- These Storage guards query raw_snapshots on every matching object mutation.
-- Remove them before the snapshot registry is dropped.
drop trigger if exists governance_snapshot_objects_guard_update on storage.objects;
drop trigger if exists governance_snapshot_objects_guard_delete on storage.objects;
drop function if exists governance.guard_referenced_snapshot_object();

-- The versioned contact pipeline made the original contact columns immutable.
-- Once that deferred pipeline is removed, those guards would point operators
-- at a table that no longer exists.
drop trigger if exists offices_reject_legacy_contact_update on governance.offices;
drop trigger if exists officers_reject_legacy_contact_update on governance.officers;
drop trigger if exists utilities_reject_legacy_contact_update on governance.utilities;
drop trigger if exists emergency_contacts_reject_legacy_contact_update
  on governance.emergency_contacts;
drop function if exists governance.reject_legacy_contact_update();

drop view if exists governance.current_verified_contacts;

drop table if exists complaints.complaint_comments;

drop table if exists governance.contact_channel_versions;
drop table if exists governance.contact_channels;
drop table if exists governance.source_evidence;
drop table if exists governance.sync_events;
drop table if exists governance.sync_source_leases;
drop table if exists governance.sync_scope_targets;
drop table if exists governance.sync_review_events;
drop table if exists governance.sync_review_items;
drop table if exists governance.sync_change_items;
drop table if exists governance.sync_candidates;
drop table if exists governance.sync_run_snapshots;
drop table if exists governance.raw_snapshots;
drop table if exists governance.sync_runs;
drop table if exists governance.source_endpoints;

-- PL/pgSQL dependencies are not always recorded from function bodies. Remove
-- the retired service surface explicitly so no deployed caller can recreate
-- work against a missing subsystem.
drop function if exists public.claim_due_governance_sync_sources(text, integer, integer);
drop function if exists public.heartbeat_governance_sync_lease(uuid, uuid, integer);
drop function if exists public.record_governance_sync_snapshot(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  smallint
);
drop function if exists public.fail_governance_sync_run(uuid, uuid, uuid, text, text);
drop function if exists private.enforce_governance_sync_scope_target();

drop function if exists governance.set_source_endpoint_contract_hash();
drop function if exists governance.validate_source_endpoint();
drop function if exists governance.guard_sync_run_update();
drop function if exists governance.validate_sync_run_insert();
drop function if exists governance.validate_raw_snapshot_scope();
drop function if exists governance.validate_sync_run_snapshot();
drop function if exists governance.guard_sync_candidate_update();
drop function if exists governance.validate_sync_candidate_scope();
drop function if exists governance.guard_sync_change_update();
drop function if exists governance.validate_sync_change_insert();
drop function if exists governance.guard_sync_review_update();
drop function if exists governance.validate_sync_review_insert();
drop function if exists governance.validate_source_evidence_scope();
drop function if exists governance.validate_contact_channel_version();
drop function if exists governance.guard_contact_channel_update();
drop function if exists governance.guard_contact_channel_version_update();

create or replace function complaints.assignment_delivery_readiness(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target complaints.complaint_assignments%rowtype;
  current_officer_id uuid;
  current_office_id uuid;
  current_officer_assignment_id uuid;
begin
  select assignment.* into target
  from complaints.complaint_assignments as assignment
  where assignment.id = p_assignment_id;

  if not found or not complaints.is_verified_assignment_scope(
    target.authority_id,
    target.local_body_id,
    target.ward_id,
    target.department_id,
    target.authority_department_id,
    target.officer_role_id,
    null,
    current_timestamp
  ) then
    return jsonb_build_object(
      'governmentQueueStatus', 'unavailable',
      'externalContactStatus', 'not_available',
      'contactScope', null,
      'approvedChannelTypes', '[]'::jsonb,
      'automaticOutboundDelivery', false,
      'reason', 'verified_assignment_scope_unavailable'
    );
  end if;

  if complaints.assignment_has_current_verified_officer(target.id, current_timestamp) then
    select
      officer_assignment.id,
      officer_assignment.officer_id,
      officer_assignment.office_id
    into
      current_officer_assignment_id,
      current_officer_id,
      current_office_id
    from governance.officer_assignments as officer_assignment
    where officer_assignment.id = target.officer_assignment_id;
  end if;

  return jsonb_build_object('governmentQueueStatus', 'verified_scope')
    || governance.resolve_complaint_contact_readiness(
      target.authority_id,
      target.local_body_id,
      target.ward_id,
      target.authority_department_id,
      current_office_id,
      current_officer_id,
      current_officer_assignment_id
    );
end;
$$;

create or replace function complaints.assignment_summary(p_assignment_id uuid)
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
    'endedAt', assignment.effective_to,
    'deliveryReadiness', complaints.assignment_delivery_readiness(assignment.id)
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

revoke all on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) from public, anon, authenticated;
revoke all on function complaints.assignment_delivery_readiness(uuid)
  from public, anon, authenticated;

grant execute on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) to service_role;
grant execute on function complaints.assignment_delivery_readiness(uuid)
  to service_role;

comment on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) is
  'Reports V1 governing-body contact readiness from the private active ward/category matrix without exposing contact values.';
comment on function complaints.assignment_delivery_readiness(uuid) is
  'Reports verified government-queue scope and V1 ward-contact readiness without exposing recipient values.';

-- An adaptive master-bundle marker lets already-pruned databases skip the
-- historical synchronization migrations on subsequent SQL Editor runs.
create or replace function private.v1_deferred_subsystems_pruned()
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select true;
$$;

revoke all on function private.v1_deferred_subsystems_pruned()
  from public, anon, authenticated, service_role;

comment on function private.v1_deferred_subsystems_pruned() is
  'Adaptive migration marker: the unused governance-sync/contact and public-comment tables were physically removed for V1.';
