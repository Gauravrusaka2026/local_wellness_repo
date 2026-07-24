create index if not exists offices_verified_civic_area_scope_idx
on governance.offices (
  authority_id,
  local_body_id,
  ward_id,
  name,
  reference_source_id
)
where status = 'active'
  and verification_status = 'verified'
  and not is_placeholder;

create or replace function public.resolve_verified_governing_bodies(
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_resolved_at timestamptz default current_timestamp
)
returns table (
  state_id uuid,
  district_id uuid,
  taluka_id uuid,
  local_body_id uuid,
  ward_id uuid,
  match jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    resolved.state_id,
    resolved.district_id,
    resolved.taluka_id,
    resolved.local_body_id,
    resolved.ward_id,
    jsonb_build_object(
      'state', jsonb_build_object(
        'kind', 'state',
        'name', state.name,
        'type', 'state',
        'verificationStatus', state.verification_status,
        'lastVerifiedOn', state.last_verified_on,
        'sourceUrl', state_source.url
      ),
      'district', case
        when district.id is null then null
        else jsonb_build_object(
          'kind', 'district',
          'name', district.name,
          'type', 'district',
          'verificationStatus', district.verification_status,
          'lastVerifiedOn', district.last_verified_on,
          'sourceUrl', district_source.url
        )
      end,
      'taluka', case
        when taluka.id is null then null
        else jsonb_build_object(
          'kind', 'taluka',
          'name', taluka.name,
          'type', 'taluka',
          'verificationStatus', taluka.verification_status,
          'lastVerifiedOn', taluka.last_verified_on,
          'sourceUrl', taluka_source.url
        )
      end,
      'authority', jsonb_build_object(
        'kind', 'authority',
        'name', authority.name,
        'type', authority.authority_type,
        'verificationStatus', authority.verification_status,
        'lastVerifiedOn', authority.last_verified_on,
        'sourceUrl', authority_source.url
      ),
      'localBody', jsonb_build_object(
        'kind', 'local_body',
        'name', local_body.name,
        'type', local_body.body_type,
        'verificationStatus', local_body.verification_status,
        'lastVerifiedOn', local_body.last_verified_on,
        'sourceUrl', local_body_source.url
      ),
      'ward', case
        when ward.id is null then null
        else jsonb_build_object(
          'kind', 'ward',
          'name', ward.name,
          'type', 'ward',
          'verificationStatus', ward.verification_status,
          'lastVerifiedOn', ward.last_verified_on,
          'sourceUrl', ward_source.url
        )
      end,
      'offices', coalesce(
        (
          select jsonb_agg(
            scoped_office.public_office
            order by scoped_office.office_name
          )
          from (
            select
              office.name as office_name,
              jsonb_strip_nulls(
                jsonb_build_object(
                  'name', office.name,
                  'type', office.office_type,
                  'address', nullif(btrim(office.address), ''),
                  'phone', nullif(btrim(office.official_phone), ''),
                  'email', nullif(btrim(office.official_email), ''),
                  'lastVerifiedOn', office.last_verified_on,
                  'sourceUrl', office_source.url
                )
              ) as public_office
            from governance.offices as office
            inner join governance.reference_sources as office_source
              on office_source.id = office.reference_source_id
            where office.authority_id = authority.id
              and (
                office.local_body_id is null
                or office.local_body_id = resolved.local_body_id
              )
              and (
                (
                  resolved.ward_id is not null
                  and office.ward_id = resolved.ward_id
                )
                or (
                  office.ward_id is null
                  and office.local_body_id = resolved.local_body_id
                )
              )
              and office.status = 'active'
              and office.verification_status = 'verified'
              and not office.is_placeholder
              and office.last_verified_on is not null
              and coalesce(
                nullif(btrim(office.address), ''),
                nullif(btrim(office.official_phone), ''),
                nullif(btrim(office.official_email), '')
              ) is not null
              and office_source.status = 'active'
              and office_source.source_type = 'official'
              and office_source.url ~ '^https://'
            order by office.name
            limit 25
          ) as scoped_office
        ),
        '[]'::jsonb
      )
    ) as match
  from routing.resolve_jurisdiction_with_accuracy(
    p_longitude,
    p_latitude,
    p_accuracy_meters,
    p_resolved_at
  ) as resolved
  inner join governance.states as state on state.id = resolved.state_id
  inner join governance.reference_sources as state_source
    on state_source.id = state.reference_source_id
  inner join governance.local_bodies as local_body
    on local_body.id = resolved.local_body_id
  inner join governance.reference_sources as local_body_source
    on local_body_source.id = local_body.reference_source_id
  inner join governance.authorities as authority
    on authority.id = local_body.authority_id
  inner join governance.reference_sources as authority_source
    on authority_source.id = authority.reference_source_id
  inner join governance.jurisdiction_boundary_versions as local_body_boundary
    on local_body_boundary.id = resolved.local_body_boundary_version_id
  inner join governance.reference_sources as local_body_boundary_source
    on local_body_boundary_source.id = local_body_boundary.reference_source_id
  left join governance.districts as district on district.id = resolved.district_id
  left join governance.reference_sources as district_source
    on district_source.id = district.reference_source_id
  left join governance.talukas as taluka on taluka.id = resolved.taluka_id
  left join governance.reference_sources as taluka_source
    on taluka_source.id = taluka.reference_source_id
  left join governance.wards as ward on ward.id = resolved.ward_id
  left join governance.reference_sources as ward_source
    on ward_source.id = ward.reference_source_id
  left join governance.jurisdiction_boundary_versions as state_boundary
    on state_boundary.id = resolved.state_boundary_version_id
  left join governance.reference_sources as state_boundary_source
    on state_boundary_source.id = state_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as district_boundary
    on district_boundary.id = resolved.district_boundary_version_id
  left join governance.reference_sources as district_boundary_source
    on district_boundary_source.id = district_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as taluka_boundary
    on taluka_boundary.id = resolved.taluka_boundary_version_id
  left join governance.reference_sources as taluka_boundary_source
    on taluka_boundary_source.id = taluka_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as ward_boundary
    on ward_boundary.id = resolved.ward_boundary_version_id
  left join governance.reference_sources as ward_boundary_source
    on ward_boundary_source.id = ward_boundary.reference_source_id
  where state.status = 'active'
    and state.verification_status = 'verified'
    and not state.is_placeholder
    and state.is_routing_eligible
    and state_source.status = 'active'
    and state_source.source_type = 'official'
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body_source.status = 'active'
    and local_body_source.source_type = 'official'
    and authority.status = 'active'
    and authority.verification_status = 'verified'
    and not authority.is_placeholder
    and authority.is_routing_eligible
    and authority_source.status = 'active'
    and authority_source.source_type = 'official'
    and local_body_boundary_source.status = 'active'
    and local_body_boundary_source.source_type = 'official'
    and (
      resolved.state_boundary_version_id is null
      or (
        state_boundary_source.status = 'active'
        and state_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.district_id is null
      or (
        district.status = 'active'
        and district.verification_status = 'verified'
        and not district.is_placeholder
        and district.is_routing_eligible
        and district_source.status = 'active'
        and district_source.source_type = 'official'
        and district_boundary_source.status = 'active'
        and district_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.taluka_id is null
      or (
        taluka.status = 'active'
        and taluka.verification_status = 'verified'
        and not taluka.is_placeholder
        and taluka.is_routing_eligible
        and taluka_source.status = 'active'
        and taluka_source.source_type = 'official'
        and taluka_boundary_source.status = 'active'
        and taluka_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.ward_id is null
      or (
        ward.status = 'active'
        and ward.verification_status = 'verified'
        and not ward.is_placeholder
        and ward.is_routing_eligible
        and ward_source.status = 'active'
        and ward_source.source_type = 'official'
        and ward_boundary_source.status = 'active'
        and ward_boundary_source.source_type = 'official'
      )
    )
  order by
    state.name,
    district.name nulls last,
    taluka.name nulls last,
    local_body.name,
    ward.name nulls last,
    resolved.local_body_id,
    resolved.ward_id nulls last;
$$;

revoke all on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) to service_role;

comment on index governance.offices_verified_civic_area_scope_idx is
  'Supports bounded service-role lookup of verified civic-area offices without reading private routing contacts.';

comment on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) is
  'Service-role-only official-source civic-area projection with sanitized verified office contacts and no private routing recipients.';
