create function governance.resolve_jurisdiction(
  p_longitude double precision,
  p_latitude double precision,
  p_resolved_at timestamptz default current_timestamp
)
returns table (
  local_body_id uuid,
  ward_id uuid,
  local_body_boundary_version_id uuid,
  ward_boundary_version_id uuid
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_longitude is null
    or p_latitude is null
    or p_resolved_at is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90 then
    raise exception using
      errcode = '22023',
      message = 'JURISDICTION_COORDINATES_INVALID';
  end if;

  return query
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  )
  select
    local_body.id,
    ward_match.ward_id,
    local_body_boundary.id,
    ward_match.boundary_version_id
  from governance.jurisdiction_boundary_versions as local_body_boundary
  inner join governance.local_bodies as local_body
    on local_body.id = local_body_boundary.local_body_id
  inner join governance.authorities as local_body_authority
    on local_body_authority.id = local_body.authority_id
  cross join input_point
  left join lateral (
    select
      ward.id as ward_id,
      ward_boundary.id as boundary_version_id
    from governance.jurisdiction_boundary_versions as ward_boundary
    inner join governance.wards as ward on ward.id = ward_boundary.ward_id
    where ward.local_body_id = local_body.id
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
      and ward_boundary.status = 'active'
      and ward_boundary.verification_status = 'verified'
      and not ward_boundary.is_placeholder
      and ward_boundary.is_routing_eligible
      and ward_boundary.effective_from <= p_resolved_at
      and (
        ward_boundary.effective_to is null
        or ward_boundary.effective_to > p_resolved_at
      )
      and extensions.st_covers(ward_boundary.boundary, input_point.location)
  ) as ward_match on true
  where local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body_authority.status = 'active'
    and local_body_authority.verification_status = 'verified'
    and not local_body_authority.is_placeholder
    and local_body_authority.is_routing_eligible
    and local_body_boundary.status = 'active'
    and local_body_boundary.verification_status = 'verified'
    and not local_body_boundary.is_placeholder
    and local_body_boundary.is_routing_eligible
    and local_body_boundary.effective_from <= p_resolved_at
    and (
      local_body_boundary.effective_to is null
      or local_body_boundary.effective_to > p_resolved_at
    )
    and extensions.st_covers(local_body_boundary.boundary, input_point.location)
  order by local_body.id, ward_match.ward_id nulls last;
end;
$$;

revoke all on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated;

grant execute on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) to service_role;

comment on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) is
  'Resolves all active, verified, routing-eligible local-body and ward boundaries covering a WGS84 coordinate; it does not execute Phase 3 complaint routing.';
