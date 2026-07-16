create function governance.resolve_complaint_contact_readiness(
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
  with matching_contacts as (
    select
      case
        when contact.officer_assignment_id = p_officer_assignment_id
          then 'officer_assignment'
        when contact.officer_id = p_officer_id then 'officer'
        when contact.office_id = p_office_id then 'office'
        when contact.authority_department_id = p_authority_department_id
          then 'authority_department'
        when contact.ward_id = p_ward_id then 'ward'
        when contact.local_body_id = p_local_body_id then 'local_body'
        when contact.authority_id = p_authority_id then 'authority'
      end as contact_scope,
      case
        when contact.officer_assignment_id = p_officer_assignment_id then 1
        when contact.officer_id = p_officer_id then 2
        when contact.office_id = p_office_id then 3
        when contact.authority_department_id = p_authority_department_id then 4
        when contact.ward_id = p_ward_id then 5
        when contact.local_body_id = p_local_body_id then 6
        when contact.authority_id = p_authority_id then 7
      end as scope_priority,
      contact.channel_type
    from governance.current_verified_contacts as contact
    where contact.is_complaint_delivery_approved
      and contact.intended_use = 'complaint_intake'
      and (
        (p_officer_assignment_id is not null
          and contact.officer_assignment_id = p_officer_assignment_id)
        or (p_officer_id is not null and contact.officer_id = p_officer_id)
        or (p_office_id is not null and contact.office_id = p_office_id)
        or (
          p_authority_department_id is not null
          and contact.authority_department_id = p_authority_department_id
        )
        or (p_ward_id is not null and contact.ward_id = p_ward_id)
        or (p_local_body_id is not null and contact.local_body_id = p_local_body_id)
        or (p_authority_id is not null and contact.authority_id = p_authority_id)
      )
  ),
  selected_scope as (
    select
      contact_scope,
      scope_priority,
      array_agg(distinct channel_type order by channel_type) as channel_types
    from matching_contacts
    where contact_scope is not null
    group by contact_scope, scope_priority
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
    when selected_scope.contact_scope in ('officer_assignment', 'officer')
      then jsonb_build_object(
        'externalContactStatus', 'verified_officer_contact',
        'contactScope', selected_scope.contact_scope,
        'approvedChannelTypes', to_jsonb(selected_scope.channel_types),
        'automaticOutboundDelivery', false,
        'reason', 'verified_officer_contact_available'
      )
    else jsonb_build_object(
      'externalContactStatus', 'verified_governing_body_contact',
      'contactScope', selected_scope.contact_scope,
      'approvedChannelTypes', to_jsonb(selected_scope.channel_types),
      'automaticOutboundDelivery', false,
      'reason', 'verified_governing_body_contact_available'
    )
  end
  from (select 1) as singleton
  left join selected_scope on true;
$$;

create function complaints.assignment_delivery_readiness(p_assignment_id uuid)
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
  'Reports the most specific manually verified, complaint-delivery-approved contact scope without exposing contact values or performing outbound delivery.';
comment on function complaints.assignment_delivery_readiness(uuid) is
  'Distinguishes verified government-queue routing from optional external official-contact readiness; no outbound delivery is implied.';
