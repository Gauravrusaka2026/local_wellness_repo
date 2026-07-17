create function public.list_government_invitation_options(
  p_authority_ids uuid[] default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible_authorities as materialized (
    select
      authority.id,
      authority.code,
      authority.name,
      authority.authority_type,
      authority.is_routing_eligible
    from governance.authorities as authority
    where authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and (
        p_authority_ids is null
        or authority.id = any(p_authority_ids)
      )
  ),
  options as (
    select
      'authority'::text as option_type,
      authority.id,
      authority.id as authority_id,
      authority.code,
      authority.name,
      authority.authority_type,
      authority.is_routing_eligible
    from eligible_authorities as authority

    union all

    select
      'ward'::text as option_type,
      ward.id,
      authority.id as authority_id,
      coalesce(ward.source_ward_code, ward.ward_number, ward.name) as code,
      ward.name,
      null::text as authority_type,
      ward.is_routing_eligible
    from eligible_authorities as authority
    inner join governance.local_bodies as local_body
      on local_body.authority_id = authority.id
     and local_body.status = 'active'
     and local_body.verification_status = 'verified'
     and not local_body.is_placeholder
     and local_body.is_routing_eligible
    inner join governance.wards as ward
      on ward.local_body_id = local_body.id
     and ward.status = 'active'
     and ward.verification_status = 'verified'
     and not ward.is_placeholder
     and ward.is_routing_eligible

    union all

    select
      'department'::text as option_type,
      authority_department.id,
      authority.id as authority_id,
      department.code,
      coalesce(authority_department.local_name, department.name) as name,
      null::text as authority_type,
      authority_department.is_routing_eligible
    from eligible_authorities as authority
    inner join governance.authority_departments as authority_department
      on authority_department.authority_id = authority.id
     and authority_department.status = 'active'
     and authority_department.verification_status = 'verified'
     and not authority_department.is_placeholder
     and authority_department.is_routing_eligible
    inner join governance.departments as department
      on department.id = authority_department.department_id
     and department.status = 'active'
     and department.verification_status = 'verified'
     and not department.is_placeholder
     and department.is_routing_eligible
  )
  select jsonb_build_object(
    'authorities', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityType', option.authority_type,
          'code', option.code,
          'id', option.id,
          'name', option.name
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'authority'),
      '[]'::jsonb
    ),
    'departments', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityId', option.authority_id,
          'code', option.code,
          'id', option.id,
          'name', option.name,
          'type', option.option_type
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'department'),
      '[]'::jsonb
    ),
    'wards', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityId', option.authority_id,
          'code', option.code,
          'id', option.id,
          'name', option.name,
          'type', option.option_type
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'ward'),
      '[]'::jsonb
    )
  )
  from options as option;
$$;

revoke all on function public.list_government_invitation_options(uuid[])
  from public, anon, authenticated;
grant execute on function public.list_government_invitation_options(uuid[])
  to service_role;

comment on function public.list_government_invitation_options(uuid[]) is
  'Lists active verified non-placeholder routable authority, ward, and authority-department labels for server-authorized government invitations.';
