create function public.discover_routing_assets(
  p_category_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_resolved_at timestamptz default current_timestamp,
  p_limit integer default 25
)
returns table (
  asset_id uuid,
  display_name text,
  asset_type_name text,
  distance_meters double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_category_id is null
    or p_longitude is null
    or p_latitude is null
    or p_accuracy_meters is null
    or p_resolved_at is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90
    or p_accuracy_meters < 0
    or p_accuracy_meters > 5000
    or p_limit is null
    or p_limit < 1
    or p_limit > 50 then
    raise exception using errcode = '22023', message = 'ROUTING_ASSET_DISCOVERY_INPUT_INVALID';
  end if;

  return query
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  ),
  jurisdiction_candidates as materialized (
    select *
    from routing.resolve_jurisdiction_with_accuracy(
      p_longitude,
      p_latitude,
      p_accuracy_meters,
      p_resolved_at
    )
  ),
  resolved_jurisdiction as (
    select jurisdiction.*
    from jurisdiction_candidates as jurisdiction
    where (select count(*) from jurisdiction_candidates) = 1
  ),
  eligible_asset_types as (
    select
      asset_type.id,
      asset_type.name,
      asset_type.matching_distance_meters,
      category_asset_type.match_priority
    from routing.issue_categories as category
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    inner join routing.category_asset_types as category_asset_type
      on category_asset_type.category_id = category.id
    inner join routing.asset_types as asset_type
      on asset_type.id = category_asset_type.asset_type_id
    where category.id = p_category_id
      and category.requires_asset
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
      and category_asset_type.requirement = 'required'
      and category_asset_type.status = 'active'
      and category_asset_type.verification_status = 'verified'
      and not category_asset_type.is_placeholder
      and category_asset_type.is_routing_eligible
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
  )
  select
    asset.id,
    coalesce(asset.display_name, asset_type.name),
    asset_type.name,
    extensions.st_distance(
      asset_version.location::extensions.geography,
      input_point.location::extensions.geography
    ) as measured_distance_meters
  from resolved_jurisdiction as jurisdiction
  cross join input_point
  inner join eligible_asset_types as asset_type on true
  inner join routing.assets as asset
    on asset.asset_type_id = asset_type.id
    and asset.status = 'active'
    and asset.verification_status = 'verified'
    and not asset.is_placeholder
    and asset.is_routing_eligible
  inner join routing.asset_versions as asset_version
    on asset_version.asset_id = asset.id
    and asset_version.status = 'active'
    and asset_version.verification_status = 'verified'
    and not asset_version.is_placeholder
    and asset_version.is_routing_eligible
    and asset_version.effective_from <= p_resolved_at
    and (asset_version.effective_to is null or asset_version.effective_to > p_resolved_at)
    and (asset_version.district_id is null or asset_version.district_id = jurisdiction.district_id)
    and (asset_version.local_body_id is null or asset_version.local_body_id = jurisdiction.local_body_id)
    and (asset_version.ward_id is null or asset_version.ward_id = jurisdiction.ward_id)
  where extensions.st_dwithin(
      asset_version.location::extensions.geography,
      input_point.location::extensions.geography,
      greatest(asset_type.matching_distance_meters, p_accuracy_meters)
    )
    and exists (
      select 1
      from routing.asset_ownership_versions as ownership
      inner join governance.authorities as owner_authority
        on owner_authority.id = ownership.owner_authority_id
      where ownership.asset_id = asset.id
        and ownership.status = 'active'
        and ownership.verification_status = 'verified'
        and not ownership.is_placeholder
        and ownership.is_routing_eligible
        and ownership.effective_from <= p_resolved_at
        and (ownership.effective_to is null or ownership.effective_to > p_resolved_at)
        and owner_authority.status = 'active'
        and owner_authority.verification_status = 'verified'
        and not owner_authority.is_placeholder
        and owner_authority.is_routing_eligible
        and private.is_verified_governance_authority(owner_authority.id)
        and (
          ownership.authority_department_id is null
          or exists (
            select 1
            from governance.authority_departments as authority_department
            inner join governance.departments as department
              on department.id = authority_department.department_id
            where authority_department.id = ownership.authority_department_id
              and authority_department.authority_id = owner_authority.id
              and authority_department.status = 'active'
              and authority_department.verification_status = 'verified'
              and not authority_department.is_placeholder
              and authority_department.is_routing_eligible
              and department.status = 'active'
              and department.verification_status = 'verified'
              and not department.is_placeholder
              and department.is_routing_eligible
          )
        )
        and (
          ownership.office_id is null
          or exists (
            select 1
            from governance.offices as office
            where office.id = ownership.office_id
              and office.authority_id = owner_authority.id
              and (office.district_id is null or office.district_id = jurisdiction.district_id)
              and (office.taluka_id is null or office.taluka_id = jurisdiction.taluka_id)
              and (office.local_body_id is null or office.local_body_id = jurisdiction.local_body_id)
              and (office.ward_id is null or office.ward_id = jurisdiction.ward_id)
              and office.status = 'active'
              and office.verification_status = 'verified'
              and not office.is_placeholder
              and office.is_routing_eligible
          )
        )
        and (
          ownership.officer_role_id is null
          or exists (
            select 1
            from governance.officer_roles as officer_role
            where officer_role.id = ownership.officer_role_id
              and officer_role.status = 'active'
              and officer_role.verification_status = 'verified'
              and not officer_role.is_placeholder
              and officer_role.is_routing_eligible
          )
        )
    )
  order by asset_type.match_priority, measured_distance_meters, asset.id
  limit p_limit;
end;
$$;

revoke all on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) from public, anon, authenticated, service_role;

grant execute on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) to service_role;

comment on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) is
  'Service-only PostGIS asset picker. Returns sanitized nearby options only when category, jurisdiction, asset, version, and ownership evidence are current, verified, non-placeholder, and routing-eligible.';
