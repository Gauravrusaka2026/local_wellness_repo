do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'issue_domains',
    'issue_categories',
    'category_aliases',
    'asset_types',
    'category_asset_types',
    'assets',
    'asset_versions',
    'asset_ownership_versions',
    'confidence_policies',
    'confidence_policy_versions',
    'duplicate_detection_policies',
    'duplicate_detection_policy_versions',
    'route_rules',
    'route_rule_versions',
    'routing_decisions'
  ]
  loop
    execute format('alter table routing.%I enable row level security', table_name);
    execute format('alter table routing.%I force row level security', table_name);
  end loop;

  foreach table_name in array array[
    'source_endpoints',
    'sync_runs',
    'raw_snapshots',
    'sync_run_snapshots',
    'sync_candidates',
    'sync_change_items',
    'sync_review_items',
    'sync_review_events'
  ]
  loop
    execute format('alter table governance.%I enable row level security', table_name);
    execute format('alter table governance.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all privileges on schema routing from public, anon, authenticated, service_role;
revoke all privileges on all tables in schema routing from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema routing from public, anon, authenticated, service_role;

grant usage on schema routing to service_role;
grant select, insert, update on all tables in schema routing to service_role;

revoke all on governance.source_endpoints from public, anon, authenticated, service_role;
revoke all on governance.sync_runs from public, anon, authenticated, service_role;
revoke all on governance.raw_snapshots from public, anon, authenticated, service_role;
revoke all on governance.sync_run_snapshots from public, anon, authenticated, service_role;
revoke all on governance.sync_candidates from public, anon, authenticated, service_role;
revoke all on governance.sync_change_items from public, anon, authenticated, service_role;
revoke all on governance.sync_review_items from public, anon, authenticated, service_role;
revoke all on governance.sync_review_events from public, anon, authenticated, service_role;

grant select, insert, update on governance.source_endpoints to service_role;
grant select, insert, update on governance.sync_runs to service_role;
grant select, insert on governance.raw_snapshots to service_role;
grant select, insert on governance.sync_run_snapshots to service_role;
grant select, insert, update on governance.sync_candidates to service_role;
grant select, insert, update on governance.sync_change_items to service_role;
grant select, insert, update on governance.sync_review_items to service_role;
grant select, insert on governance.sync_review_events to service_role;

alter default privileges in schema routing revoke all on tables from public, anon, authenticated;
alter default privileges in schema routing revoke all on functions from public, anon, authenticated;

create index jurisdiction_boundary_versions_geography_gix
  on governance.jurisdiction_boundary_versions
  using gist ((boundary::extensions.geography));

create function routing.resolve_jurisdiction_with_accuracy(
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
  state_boundary_version_id uuid,
  district_boundary_version_id uuid,
  taluka_boundary_version_id uuid,
  local_body_boundary_version_id uuid,
  ward_boundary_version_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_longitude is null
    or p_latitude is null
    or p_accuracy_meters is null
    or p_resolved_at is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90
    or p_accuracy_meters < 0
    or p_accuracy_meters > 5000 then
    raise exception using errcode = '22023', message = 'JURISDICTION_EVIDENCE_INVALID';
  end if;

  return query
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  ),
  exact_local_bodies as (
    select distinct
      exact.local_body_id,
      exact.local_body_boundary_version_id
    from governance.resolve_jurisdiction(
      p_longitude,
      p_latitude,
      p_resolved_at
    ) as exact
  ),
  nearby_local_bodies as (
    select
      local_body.id as local_body_id,
      local_body_boundary.id as local_body_boundary_version_id
    from governance.jurisdiction_boundary_versions as local_body_boundary
    inner join governance.local_bodies as local_body
      on local_body.id = local_body_boundary.local_body_id
    inner join governance.authorities as authority
      on authority.id = local_body.authority_id
    cross join input_point
    where local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and local_body_boundary.status = 'active'
      and local_body_boundary.verification_status = 'verified'
      and not local_body_boundary.is_placeholder
      and local_body_boundary.is_routing_eligible
      and local_body_boundary.effective_from <= p_resolved_at
      and (
        local_body_boundary.effective_to is null
        or local_body_boundary.effective_to > p_resolved_at
      )
      and extensions.st_dwithin(
        local_body_boundary.boundary::extensions.geography,
        input_point.location::extensions.geography,
        p_accuracy_meters
      )
  ),
  local_body_matches as (
    select * from exact_local_bodies
    union
    select * from nearby_local_bodies
  ),
  jurisdiction_context as (
    select
      state.id as state_id,
      district_match.district_id,
      taluka_match.taluka_id,
      local_body_match.local_body_id,
      state_boundary.id as state_boundary_version_id,
      district_match.district_boundary_version_id,
      taluka_match.taluka_boundary_version_id,
      local_body_match.local_body_boundary_version_id
    from local_body_matches as local_body_match
    inner join governance.local_bodies as local_body
      on local_body.id = local_body_match.local_body_id
    inner join governance.states as state on state.id = local_body.state_id
    inner join governance.authorities as state_authority on state_authority.id = state.authority_id
    cross join input_point
    left join lateral (
      select boundary.*
      from governance.jurisdiction_boundary_versions as boundary
      where boundary.state_id = state.id
        and boundary.status = 'active'
        and boundary.verification_status = 'verified'
        and not boundary.is_placeholder
        and boundary.is_routing_eligible
        and boundary.effective_from <= p_resolved_at
        and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
        and extensions.st_dwithin(
          boundary.boundary::extensions.geography,
          input_point.location::extensions.geography,
          p_accuracy_meters
        )
      order by boundary.id
    ) as state_boundary on true
    left join lateral (
      select
        district.id as district_id,
        district_boundary.id as district_boundary_version_id
      from governance.local_body_districts as local_body_district
      inner join governance.districts as district
        on district.id = local_body_district.district_id
        and district.state_id = state.id
      inner join governance.authorities as district_authority
        on district_authority.id = district.authority_id
      inner join governance.jurisdiction_boundary_versions as district_boundary
        on district_boundary.district_id = district.id
      where local_body_district.local_body_id = local_body.id
        and district.status = 'active'
        and district.verification_status = 'verified'
        and not district.is_placeholder
        and district.is_routing_eligible
        and district_authority.status = 'active'
        and district_authority.verification_status = 'verified'
        and not district_authority.is_placeholder
        and district_authority.is_routing_eligible
        and district_boundary.status = 'active'
        and district_boundary.verification_status = 'verified'
        and not district_boundary.is_placeholder
        and district_boundary.is_routing_eligible
        and district_boundary.effective_from <= p_resolved_at
        and (
          district_boundary.effective_to is null
          or district_boundary.effective_to > p_resolved_at
        )
        and extensions.st_dwithin(
          district_boundary.boundary::extensions.geography,
          input_point.location::extensions.geography,
          p_accuracy_meters
        )
      order by district.id, district_boundary.id
    ) as district_match on true
    left join lateral (
      select
        taluka.id as taluka_id,
        taluka_boundary.id as taluka_boundary_version_id
      from governance.talukas as taluka
      inner join governance.jurisdiction_boundary_versions as taluka_boundary
        on taluka_boundary.taluka_id = taluka.id
      where taluka.district_id = district_match.district_id
        and taluka.status = 'active'
        and taluka.verification_status = 'verified'
        and not taluka.is_placeholder
        and taluka.is_routing_eligible
        and taluka_boundary.status = 'active'
        and taluka_boundary.verification_status = 'verified'
        and not taluka_boundary.is_placeholder
        and taluka_boundary.is_routing_eligible
        and taluka_boundary.effective_from <= p_resolved_at
        and (
          taluka_boundary.effective_to is null
          or taluka_boundary.effective_to > p_resolved_at
        )
        and extensions.st_dwithin(
          taluka_boundary.boundary::extensions.geography,
          input_point.location::extensions.geography,
          p_accuracy_meters
        )
      order by taluka.id, taluka_boundary.id
    ) as taluka_match on true
    where state.status = 'active'
      and state.verification_status = 'verified'
      and not state.is_placeholder
      and state.is_routing_eligible
      and state_authority.status = 'active'
      and state_authority.verification_status = 'verified'
      and not state_authority.is_placeholder
      and state_authority.is_routing_eligible
  )
  select
    jurisdiction_context.state_id,
    jurisdiction_context.district_id,
    jurisdiction_context.taluka_id,
    jurisdiction_context.local_body_id,
    ward_match.ward_id,
    jurisdiction_context.state_boundary_version_id,
    jurisdiction_context.district_boundary_version_id,
    jurisdiction_context.taluka_boundary_version_id,
    jurisdiction_context.local_body_boundary_version_id,
    ward_match.ward_boundary_version_id
  from jurisdiction_context
  cross join input_point
  left join lateral (
    select
      ward.id as ward_id,
      ward_boundary.id as ward_boundary_version_id
    from governance.jurisdiction_boundary_versions as ward_boundary
    inner join governance.wards as ward on ward.id = ward_boundary.ward_id
    where ward.local_body_id = jurisdiction_context.local_body_id
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
      and ward_boundary.status = 'active'
      and ward_boundary.verification_status = 'verified'
      and not ward_boundary.is_placeholder
      and ward_boundary.is_routing_eligible
      and ward_boundary.effective_from <= p_resolved_at
      and (ward_boundary.effective_to is null or ward_boundary.effective_to > p_resolved_at)
      and extensions.st_dwithin(
        ward_boundary.boundary::extensions.geography,
        input_point.location::extensions.geography,
        p_accuracy_meters
      )
    order by ward.id, ward_boundary.id
  ) as ward_match on true
  order by
    jurisdiction_context.state_id,
    jurisdiction_context.district_id nulls last,
    jurisdiction_context.taluka_id nulls last,
    jurisdiction_context.local_body_id,
    ward_match.ward_id nulls last;
end;
$$;

revoke all on function routing.resolve_jurisdiction_with_accuracy(
  double precision,
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated, service_role;

create function public.list_routing_categories(
  p_include_non_routable boolean default false
)
returns table (
  category_id uuid,
  domain_code text,
  category_code text,
  category_name text,
  description text,
  parent_category_id uuid,
  classification_level text,
  default_severity text,
  requires_asset boolean,
  requires_location boolean,
  location_requirement text,
  is_emergency boolean,
  minimum_media_count smallint,
  maximum_media_count smallint,
  required_attributes text[],
  media_requirements jsonb,
  verification_status text,
  is_placeholder boolean,
  is_routing_eligible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    category.id,
    domain.code,
    category.code,
    category.name,
    category.description,
    category.parent_category_id,
    category.classification_level,
    category.default_severity,
    category.requires_asset,
    category.requires_location,
    category.location_requirement,
    category.is_emergency,
    category.minimum_media_count,
    category.maximum_media_count,
    category.required_attributes,
    category.media_requirements,
    category.verification_status,
    category.is_placeholder,
    category.is_routing_eligible
  from routing.issue_categories as category
  inner join routing.issue_domains as domain on domain.id = category.domain_id
  where p_include_non_routable
    or (
      category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
    )
  order by domain.code, category.code;
$$;

create function public.resolve_jurisdiction_context(
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
  state_boundary_version_id uuid,
  district_boundary_version_id uuid,
  taluka_boundary_version_id uuid,
  local_body_boundary_version_id uuid,
  ward_boundary_version_id uuid,
  evidence_metadata jsonb
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
    resolved.state_boundary_version_id,
    resolved.district_boundary_version_id,
    resolved.taluka_boundary_version_id,
    resolved.local_body_boundary_version_id,
    resolved.ward_boundary_version_id,
    jsonb_build_object(
      'evidence',
      jsonb_build_array(
        jsonb_build_object(
          'entityType', 'state',
          'entityId', state.id,
          'versionId', null,
          'verificationStatus', state.verification_status,
          'isActive', state.status = 'active',
          'isPlaceholder', state.is_placeholder,
          'isRoutingEligible', state.is_routing_eligible
        )
      )
      || case
        when state_boundary.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', state_boundary.id,
            'versionId', state_boundary.id,
            'verificationStatus', state_boundary.verification_status,
            'isActive', state_boundary.status = 'active',
            'isPlaceholder', state_boundary.is_placeholder,
            'isRoutingEligible', state_boundary.is_routing_eligible
          )
        )
      end
      || case
        when district.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'district',
            'entityId', district.id,
            'versionId', null,
            'verificationStatus', district.verification_status,
            'isActive', district.status = 'active',
            'isPlaceholder', district.is_placeholder,
            'isRoutingEligible', district.is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', district_boundary.id,
            'versionId', district_boundary.id,
            'verificationStatus', district_boundary.verification_status,
            'isActive', district_boundary.status = 'active',
            'isPlaceholder', district_boundary.is_placeholder,
            'isRoutingEligible', district_boundary.is_routing_eligible
          )
        )
      end
      || case
        when taluka.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'taluka',
            'entityId', taluka.id,
            'versionId', null,
            'verificationStatus', taluka.verification_status,
            'isActive', taluka.status = 'active',
            'isPlaceholder', taluka.is_placeholder,
            'isRoutingEligible', taluka.is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', taluka_boundary.id,
            'versionId', taluka_boundary.id,
            'verificationStatus', taluka_boundary.verification_status,
            'isActive', taluka_boundary.status = 'active',
            'isPlaceholder', taluka_boundary.is_placeholder,
            'isRoutingEligible', taluka_boundary.is_routing_eligible
          )
        )
      end
      || jsonb_build_array(
        jsonb_build_object(
          'entityType', 'local_body',
          'entityId', local_body.id,
          'versionId', null,
          'verificationStatus', local_body.verification_status,
          'isActive', local_body.status = 'active',
          'isPlaceholder', local_body.is_placeholder,
          'isRoutingEligible', local_body.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'jurisdiction_boundary',
          'entityId', local_body_boundary.id,
          'versionId', local_body_boundary.id,
          'verificationStatus', local_body_boundary.verification_status,
          'isActive', local_body_boundary.status = 'active',
          'isPlaceholder', local_body_boundary.is_placeholder,
          'isRoutingEligible', local_body_boundary.is_routing_eligible
        )
      )
      || case
        when ward.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'ward',
            'entityId', ward.id,
            'versionId', null,
            'verificationStatus', ward.verification_status,
            'isActive', ward.status = 'active',
            'isPlaceholder', ward.is_placeholder,
            'isRoutingEligible', ward.is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', ward_boundary.id,
            'versionId', ward_boundary.id,
            'verificationStatus', ward_boundary.verification_status,
            'isActive', ward_boundary.status = 'active',
            'isPlaceholder', ward_boundary.is_placeholder,
            'isRoutingEligible', ward_boundary.is_routing_eligible
          )
        )
      end
    )
  from routing.resolve_jurisdiction_with_accuracy(
    p_longitude,
    p_latitude,
    p_accuracy_meters,
    p_resolved_at
  ) as resolved
  inner join governance.states as state on state.id = resolved.state_id
  left join governance.jurisdiction_boundary_versions as state_boundary
    on state_boundary.id = resolved.state_boundary_version_id
  left join governance.districts as district on district.id = resolved.district_id
  left join governance.jurisdiction_boundary_versions as district_boundary
    on district_boundary.id = resolved.district_boundary_version_id
  left join governance.talukas as taluka on taluka.id = resolved.taluka_id
  left join governance.jurisdiction_boundary_versions as taluka_boundary
    on taluka_boundary.id = resolved.taluka_boundary_version_id
  inner join governance.local_bodies as local_body on local_body.id = resolved.local_body_id
  inner join governance.jurisdiction_boundary_versions as local_body_boundary
    on local_body_boundary.id = resolved.local_body_boundary_version_id
  left join governance.wards as ward on ward.id = resolved.ward_id
  left join governance.jurisdiction_boundary_versions as ward_boundary
    on ward_boundary.id = resolved.ward_boundary_version_id;
$$;

create function public.resolve_routing_policy_context(
  p_category_id uuid,
  p_local_body_id uuid,
  p_ward_id uuid default null,
  p_resolved_at timestamptz default current_timestamp
)
returns table (
  confidence_policy_id uuid,
  confidence_policy_version_id uuid,
  confidence_policy_version integer,
  confidence_weights jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    policy.id,
    policy_version.id,
    policy_version.version,
    jsonb_build_object(
      'automaticThreshold', policy_version.automatic_threshold,
      'manualReviewThreshold', policy_version.manual_review_threshold,
      'ambiguityDelta', policy_version.ambiguity_delta,
      'fallbackPenaltyPerLevel', policy_version.fallback_penalty_per_level,
      'factors', policy_version.factors
    )
  from routing.issue_categories as category
  inner join routing.issue_domains as domain on domain.id = category.domain_id
  inner join governance.local_bodies as local_body on local_body.id = p_local_body_id
  inner join governance.authorities as local_body_authority
    on local_body_authority.id = local_body.authority_id
  left join governance.wards as ward
    on ward.id = p_ward_id
    and ward.local_body_id = local_body.id
  inner join routing.route_rules as route_rule on route_rule.category_id = category.id
  inner join routing.route_rule_versions as rule_version
    on rule_version.route_rule_id = route_rule.id
  inner join routing.confidence_policy_versions as policy_version
    on policy_version.id = rule_version.confidence_policy_version_id
  inner join routing.confidence_policies as policy
    on policy.id = policy_version.confidence_policy_id
  where category.id = p_category_id
    and (p_ward_id is null or ward.id is not null)
    and category.status = 'active'
    and category.verification_status = 'verified'
    and not category.is_placeholder
    and category.is_routing_eligible
    and domain.status = 'active'
    and domain.verification_status = 'verified'
    and not domain.is_placeholder
    and domain.is_routing_eligible
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body_authority.status = 'active'
    and local_body_authority.verification_status = 'verified'
    and not local_body_authority.is_placeholder
    and local_body_authority.is_routing_eligible
    and route_rule.status = 'active'
    and route_rule.verification_status = 'verified'
    and not route_rule.is_placeholder
    and route_rule.is_routing_eligible
    and rule_version.status = 'active'
    and rule_version.verification_status = 'verified'
    and not rule_version.is_placeholder
    and rule_version.is_routing_eligible
    and rule_version.effective_from <= p_resolved_at
    and (rule_version.effective_to is null or rule_version.effective_to > p_resolved_at)
    and (rule_version.scope_authority_id is null
      or rule_version.scope_authority_id = local_body.authority_id)
    and (rule_version.scope_local_body_id is null
      or rule_version.scope_local_body_id = local_body.id)
    and (rule_version.scope_ward_id is null or rule_version.scope_ward_id = ward.id)
    and policy_version.status = 'active'
    and policy_version.verification_status = 'verified'
    and not policy_version.is_placeholder
    and policy_version.is_routing_eligible
    and policy_version.effective_from <= p_resolved_at
    and (policy_version.effective_to is null or policy_version.effective_to > p_resolved_at)
    and (policy_version.category_id is null or policy_version.category_id = category.id)
    and policy.status = 'active'
    and policy.verification_status = 'verified'
    and not policy.is_placeholder
    and policy.is_routing_eligible
  order by policy.id, policy_version.id;
$$;

create function public.resolve_routing_candidates(
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_category_id uuid,
  p_asset_id uuid default null,
  p_resolved_at timestamptz default current_timestamp
)
returns table (
  candidate_id text,
  category_id uuid,
  category_code text,
  state_id uuid,
  district_id uuid,
  taluka_id uuid,
  local_body_id uuid,
  ward_id uuid,
  state_boundary_version_id uuid,
  district_boundary_version_id uuid,
  taluka_boundary_version_id uuid,
  local_body_boundary_version_id uuid,
  ward_boundary_version_id uuid,
  asset_type_id uuid,
  asset_id uuid,
  asset_version_id uuid,
  asset_ownership_version_id uuid,
  target_authority_id uuid,
  department_id uuid,
  authority_department_id uuid,
  officer_role_id uuid,
  officer_assignment_id uuid,
  route_rule_id uuid,
  route_rule_version_id uuid,
  routing_rule_code text,
  confidence_policy_id uuid,
  confidence_policy_version_id uuid,
  confidence_policy_version integer,
  confidence_weights jsonb,
  fallback_depth smallint,
  fallback_path uuid[],
  priority integer,
  asset_match_distance_meters double precision,
  explanation_metadata jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  ),
  eligible_category as (
    select category.*
    from routing.issue_categories as category
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    where category.id = p_category_id
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
  ),
  jurisdiction as (
    select *
    from routing.resolve_jurisdiction_with_accuracy(
      p_longitude,
      p_latitude,
      p_accuracy_meters,
      p_resolved_at
    )
  )
  select
    'candidate:' || md5(concat_ws(
      ':',
      rule_version.id::text,
      jurisdiction.state_id::text,
      coalesce(jurisdiction.district_id::text, '-'),
      coalesce(jurisdiction.taluka_id::text, '-'),
      jurisdiction.local_body_id::text,
      coalesce(jurisdiction.ward_id::text, '-'),
      coalesce(asset_match.asset_id::text, '-'),
      coalesce(asset_match.asset_ownership_version_id::text, '-'),
      coalesce(assignment.id::text, '-')
    )),
    category.id,
    category.code,
    jurisdiction.state_id,
    jurisdiction.district_id,
    jurisdiction.taluka_id,
    jurisdiction.local_body_id,
    jurisdiction.ward_id,
    jurisdiction.state_boundary_version_id,
    jurisdiction.district_boundary_version_id,
    jurisdiction.taluka_boundary_version_id,
    jurisdiction.local_body_boundary_version_id,
    jurisdiction.ward_boundary_version_id,
    asset_match.asset_type_id,
    asset_match.asset_id,
    asset_match.asset_version_id,
    asset_match.asset_ownership_version_id,
    target.target_authority_id,
    department.id,
    authority_department.id,
    officer_role.id,
    assignment.id,
    route_rule.id,
    rule_version.id,
    route_rule.rule_code,
    confidence_policy.id,
    policy_version.id,
    policy_version.version,
    jsonb_build_object(
      'automaticThreshold', policy_version.automatic_threshold,
      'manualReviewThreshold', policy_version.manual_review_threshold,
      'ambiguityDelta', policy_version.ambiguity_delta,
      'fallbackPenaltyPerLevel', policy_version.fallback_penalty_per_level,
      'factors', policy_version.factors
    ),
    rule_version.fallback_depth,
    rule_version.fallback_path,
    rule_version.priority,
    asset_match.distance_meters,
    jsonb_build_object(
      'explanationCode', rule_version.explanation_code,
      'evidence',
      jsonb_build_array(
        jsonb_build_object(
          'entityType', 'state',
          'entityId', state.id,
          'versionId', null,
          'verificationStatus', state.verification_status,
          'isActive', state.status = 'active',
          'isPlaceholder', state.is_placeholder,
          'isRoutingEligible', state.is_routing_eligible
        )
      )
      || case
        when state_boundary.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', state_boundary.id,
            'versionId', state_boundary.id,
            'verificationStatus', state_boundary.verification_status,
            'isActive', state_boundary.status = 'active',
            'isPlaceholder', state_boundary.is_placeholder,
            'isRoutingEligible', state_boundary.is_routing_eligible
          )
        )
      end
      || case
        when district.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'district',
            'entityId', district.id,
            'versionId', null,
            'verificationStatus', district.verification_status,
            'isActive', district.status = 'active',
            'isPlaceholder', district.is_placeholder,
            'isRoutingEligible', district.is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', district_boundary.id,
            'versionId', district_boundary.id,
            'verificationStatus', district_boundary.verification_status,
            'isActive', district_boundary.status = 'active',
            'isPlaceholder', district_boundary.is_placeholder,
            'isRoutingEligible', district_boundary.is_routing_eligible
          )
        )
      end
      || case
        when taluka.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'taluka',
            'entityId', taluka.id,
            'versionId', null,
            'verificationStatus', taluka.verification_status,
            'isActive', taluka.status = 'active',
            'isPlaceholder', taluka.is_placeholder,
            'isRoutingEligible', taluka.is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'jurisdiction_boundary',
            'entityId', taluka_boundary.id,
            'versionId', taluka_boundary.id,
            'verificationStatus', taluka_boundary.verification_status,
            'isActive', taluka_boundary.status = 'active',
            'isPlaceholder', taluka_boundary.is_placeholder,
            'isRoutingEligible', taluka_boundary.is_routing_eligible
          )
        )
      end
      || jsonb_build_array(
        jsonb_build_object(
          'entityType', 'authority',
          'entityId', target_authority.id,
          'versionId', null,
          'verificationStatus', target_authority.verification_status,
          'isActive', target_authority.status = 'active',
          'isPlaceholder', target_authority.is_placeholder,
          'isRoutingEligible', target_authority.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'local_body',
          'entityId', local_body.id,
          'versionId', null,
          'verificationStatus', local_body.verification_status,
          'isActive', local_body.status = 'active',
          'isPlaceholder', local_body.is_placeholder,
          'isRoutingEligible', local_body.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'category',
          'entityId', category.id,
          'versionId', null,
          'verificationStatus', category.verification_status,
          'isActive', category.status = 'active',
          'isPlaceholder', category.is_placeholder,
          'isRoutingEligible', category.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'department',
          'entityId', department.id,
          'versionId', null,
          'verificationStatus', department.verification_status,
          'isActive', department.status = 'active',
          'isPlaceholder', department.is_placeholder,
          'isRoutingEligible', department.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'authority_department',
          'entityId', authority_department.id,
          'versionId', null,
          'verificationStatus', authority_department.verification_status,
          'isActive', authority_department.status = 'active',
          'isPlaceholder', authority_department.is_placeholder,
          'isRoutingEligible', authority_department.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'officer_role',
          'entityId', officer_role.id,
          'versionId', null,
          'verificationStatus', officer_role.verification_status,
          'isActive', officer_role.status = 'active',
          'isPlaceholder', officer_role.is_placeholder,
          'isRoutingEligible', officer_role.is_routing_eligible
        ),
        jsonb_build_object(
          'entityType', 'routing_rule',
          'entityId', route_rule.id,
          'versionId', rule_version.id,
          'verificationStatus', rule_version.verification_status,
          'isActive', route_rule.status = 'active' and rule_version.status = 'active',
          'isPlaceholder', route_rule.is_placeholder or rule_version.is_placeholder,
          'isRoutingEligible', route_rule.is_routing_eligible and rule_version.is_routing_eligible
        )
      )
      || case
        when jurisdiction.ward_id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'ward',
            'entityId', ward.id,
            'versionId', null,
            'verificationStatus', ward.verification_status,
            'isActive', ward.status = 'active',
            'isPlaceholder', ward.is_placeholder,
            'isRoutingEligible', ward.is_routing_eligible
          )
        )
      end
      || case
        when asset_match.asset_id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'asset_type',
            'entityId', asset_match.asset_type_id,
            'versionId', null,
            'verificationStatus', asset_match.asset_type_verification_status,
            'isActive', asset_match.asset_type_is_active,
            'isPlaceholder', asset_match.asset_type_is_placeholder,
            'isRoutingEligible', asset_match.asset_type_is_routing_eligible
          ),
          jsonb_build_object(
            'entityType', 'asset',
            'entityId', asset_match.asset_id,
            'versionId', asset_match.asset_version_id,
            'verificationStatus', asset_match.asset_version_verification_status,
            'isActive', asset_match.asset_is_active and asset_match.asset_version_is_active,
            'isPlaceholder', asset_match.asset_is_placeholder or asset_match.asset_version_is_placeholder,
            'isRoutingEligible',
              asset_match.asset_is_routing_eligible and asset_match.asset_version_is_routing_eligible
          )
        )
      end
      || case
        when asset_match.asset_ownership_version_id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'asset_ownership',
            'entityId', asset_match.asset_ownership_version_id,
            'versionId', asset_match.asset_ownership_version_id,
            'verificationStatus', asset_match.ownership_verification_status,
            'isActive', asset_match.ownership_is_active,
            'isPlaceholder', asset_match.ownership_is_placeholder,
            'isRoutingEligible', asset_match.ownership_is_routing_eligible
          )
        )
      end
      || case
        when assignment.id is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'entityType', 'officer_assignment',
            'entityId', assignment.id,
            'versionId', assignment.id,
            'verificationStatus', assignment.verification_status,
            'isActive', assignment.status = 'active',
            'isPlaceholder', assignment.is_placeholder,
            'isRoutingEligible', true
          )
        )
      end,
      'confidenceSignals',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'code', factor.value ->> 'code',
            'matched', (factor.value ->> 'code') = any(rule_version.confidence_factor_codes),
            'explanation', rule_version.explanation_code
          )
          order by factor.ordinality
        )
        from jsonb_array_elements(policy_version.factors) with ordinality as factor(value, ordinality)
      ), '[]'::jsonb),
      'jurisdictionBoundaryVersionIds', jsonb_build_array(
        jurisdiction.state_boundary_version_id,
        jurisdiction.district_boundary_version_id,
        jurisdiction.taluka_boundary_version_id,
        jurisdiction.local_body_boundary_version_id,
        jurisdiction.ward_boundary_version_id
      ),
      'sourceReferenceId', rule_version.reference_source_id
    )
  from eligible_category as category
  inner join routing.route_rules as route_rule
    on route_rule.category_id = category.id
    and route_rule.status = 'active'
    and route_rule.verification_status = 'verified'
    and not route_rule.is_placeholder
    and route_rule.is_routing_eligible
  inner join routing.route_rule_versions as rule_version
    on rule_version.route_rule_id = route_rule.id
    and rule_version.status = 'active'
    and rule_version.verification_status = 'verified'
    and not rule_version.is_placeholder
    and rule_version.is_routing_eligible
    and rule_version.effective_from <= p_resolved_at
    and (rule_version.effective_to is null or rule_version.effective_to > p_resolved_at)
  cross join jurisdiction
  inner join governance.states as state
    on state.id = jurisdiction.state_id
    and state.status = 'active'
    and state.verification_status = 'verified'
    and not state.is_placeholder
    and state.is_routing_eligible
  left join governance.jurisdiction_boundary_versions as state_boundary
    on state_boundary.id = jurisdiction.state_boundary_version_id
  left join governance.districts as district
    on district.id = jurisdiction.district_id
    and district.state_id = state.id
  left join governance.jurisdiction_boundary_versions as district_boundary
    on district_boundary.id = jurisdiction.district_boundary_version_id
  left join governance.talukas as taluka
    on taluka.id = jurisdiction.taluka_id
    and taluka.district_id = district.id
  left join governance.jurisdiction_boundary_versions as taluka_boundary
    on taluka_boundary.id = jurisdiction.taluka_boundary_version_id
  inner join governance.local_bodies as local_body
    on local_body.id = jurisdiction.local_body_id
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
  inner join governance.authorities as local_body_authority
    on local_body_authority.id = local_body.authority_id
    and local_body_authority.status = 'active'
    and local_body_authority.verification_status = 'verified'
    and not local_body_authority.is_placeholder
    and local_body_authority.is_routing_eligible
  left join governance.wards as ward
    on ward.id = jurisdiction.ward_id
    and ward.status = 'active'
    and ward.verification_status = 'verified'
    and not ward.is_placeholder
    and ward.is_routing_eligible
  left join lateral (
    select
      asset_type.id as asset_type_id,
      asset_type.verification_status as asset_type_verification_status,
      asset_type.status = 'active' as asset_type_is_active,
      asset_type.is_placeholder as asset_type_is_placeholder,
      asset_type.is_routing_eligible as asset_type_is_routing_eligible,
      asset.id as asset_id,
      asset.status = 'active' as asset_is_active,
      asset.is_placeholder as asset_is_placeholder,
      asset.is_routing_eligible as asset_is_routing_eligible,
      asset_version.id as asset_version_id,
      asset_version.verification_status as asset_version_verification_status,
      asset_version.status = 'active' as asset_version_is_active,
      asset_version.is_placeholder as asset_version_is_placeholder,
      asset_version.is_routing_eligible as asset_version_is_routing_eligible,
      ownership.id as asset_ownership_version_id,
      ownership.owner_authority_id,
      ownership.authority_department_id as owner_authority_department_id,
      ownership.office_id as owner_office_id,
      ownership.officer_role_id as owner_officer_role_id,
      ownership.verification_status as ownership_verification_status,
      ownership.status = 'active' as ownership_is_active,
      ownership.is_placeholder as ownership_is_placeholder,
      ownership.is_routing_eligible as ownership_is_routing_eligible,
      extensions.st_distance(
        asset_version.location::extensions.geography,
        input_point.location::extensions.geography
      ) as distance_meters
    from routing.category_asset_types as category_asset_type
    inner join routing.asset_types as asset_type
      on asset_type.id = category_asset_type.asset_type_id
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
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
    cross join input_point
    left join routing.asset_ownership_versions as ownership
      on ownership.asset_id = asset.id
      and ownership.status = 'active'
      and ownership.verification_status = 'verified'
      and not ownership.is_placeholder
      and ownership.is_routing_eligible
      and ownership.effective_from <= p_resolved_at
      and (ownership.effective_to is null or ownership.effective_to > p_resolved_at)
      and private.is_verified_governance_authority(ownership.owner_authority_id)
    where category_asset_type.category_id = category.id
      and category_asset_type.status = 'active'
      and category_asset_type.verification_status = 'verified'
      and not category_asset_type.is_placeholder
      and category_asset_type.is_routing_eligible
      and (rule_version.asset_type_id is null or asset_type.id = rule_version.asset_type_id)
      and (rule_version.asset_id is null or asset.id = rule_version.asset_id)
      and (p_asset_id is null or asset.id = p_asset_id)
      and extensions.st_dwithin(
        asset_version.location::extensions.geography,
        input_point.location::extensions.geography,
        greatest(asset_type.matching_distance_meters, p_accuracy_meters)
      )
      and (asset_version.district_id is null or asset_version.district_id = jurisdiction.district_id)
      and (asset_version.local_body_id is null or asset_version.local_body_id = jurisdiction.local_body_id)
      and (asset_version.ward_id is null or asset_version.ward_id = jurisdiction.ward_id)
    order by category_asset_type.match_priority, distance_meters, asset.id, ownership.id
    limit 100
  ) as asset_match
    on rule_version.asset_requirement <> 'none'
      or rule_version.asset_type_id is not null
      or rule_version.asset_id is not null
      or p_asset_id is not null
  cross join lateral (
    select
      coalesce(
        asset_match.owner_authority_id,
        rule_version.target_authority_id,
        local_body.authority_id
      ) as target_authority_id,
      asset_match.owner_authority_department_id as target_authority_department_id,
      coalesce(
        (
          select owner_authority_department.department_id
          from governance.authority_departments as owner_authority_department
          where owner_authority_department.id = asset_match.owner_authority_department_id
        ),
        rule_version.target_department_id
      ) as target_department_id,
      coalesce(
        asset_match.owner_officer_role_id,
        rule_version.target_officer_role_id
      ) as target_officer_role_id,
      coalesce(asset_match.owner_office_id, rule_version.target_office_id) as target_office_id
  ) as target
  inner join governance.authorities as target_authority
    on target_authority.id = target.target_authority_id
    and target_authority.status = 'active'
    and target_authority.verification_status = 'verified'
    and not target_authority.is_placeholder
    and target_authority.is_routing_eligible
    and private.is_verified_governance_authority(target_authority.id)
  inner join governance.departments as department
    on department.id = target.target_department_id
    and department.status = 'active'
    and department.verification_status = 'verified'
    and not department.is_placeholder
    and department.is_routing_eligible
  inner join governance.authority_departments as authority_department
    on authority_department.authority_id = target.target_authority_id
    and authority_department.department_id = department.id
    and (
      target.target_authority_department_id is null
      or authority_department.id = target.target_authority_department_id
    )
    and authority_department.status = 'active'
    and authority_department.verification_status = 'verified'
    and not authority_department.is_placeholder
    and authority_department.is_routing_eligible
  inner join governance.officer_roles as officer_role
    on officer_role.id = target.target_officer_role_id
    and officer_role.status = 'active'
    and officer_role.verification_status = 'verified'
    and not officer_role.is_placeholder
    and officer_role.is_routing_eligible
  inner join routing.confidence_policy_versions as policy_version
    on policy_version.id = rule_version.confidence_policy_version_id
    and policy_version.status = 'active'
    and policy_version.verification_status = 'verified'
    and not policy_version.is_placeholder
    and policy_version.is_routing_eligible
    and policy_version.effective_from <= p_resolved_at
    and (policy_version.effective_to is null or policy_version.effective_to > p_resolved_at)
    and (policy_version.category_id is null or policy_version.category_id = category.id)
  inner join routing.confidence_policies as confidence_policy
    on confidence_policy.id = policy_version.confidence_policy_id
    and confidence_policy.status = 'active'
    and confidence_policy.verification_status = 'verified'
    and not confidence_policy.is_placeholder
    and confidence_policy.is_routing_eligible
  left join lateral (
    select officer_assignment.*
    from governance.officer_assignments as officer_assignment
    inner join governance.officers as officer on officer.id = officer_assignment.officer_id
    where officer_assignment.authority_id = target.target_authority_id
      and officer_assignment.officer_role_id = officer_role.id
      and officer_assignment.status = 'active'
      and officer_assignment.verification_status = 'verified'
      and not officer_assignment.is_placeholder
      and officer_assignment.effective_from <= p_resolved_at
      and (
        officer_assignment.effective_to is null
        or officer_assignment.effective_to > p_resolved_at
      )
      and (
        officer_assignment.authority_department_id is null
        or officer_assignment.authority_department_id = authority_department.id
      )
      and (
        target.target_office_id is null
        or officer_assignment.office_id = target.target_office_id
      )
      and (
        officer_assignment.local_body_id is null
        or officer_assignment.local_body_id = jurisdiction.local_body_id
      )
      and (
        officer_assignment.district_id is null
        or officer_assignment.district_id = jurisdiction.district_id
      )
      and (
        officer_assignment.taluka_id is null
        or officer_assignment.taluka_id = jurisdiction.taluka_id
      )
      and (officer_assignment.ward_id is null or officer_assignment.ward_id = jurisdiction.ward_id)
      and officer.status = 'active'
      and officer.verification_status = 'verified'
      and not officer.is_placeholder
  ) as assignment on true
  where (rule_version.scope_authority_id is null
      or rule_version.scope_authority_id = local_body.authority_id)
    and (rule_version.scope_local_body_id is null
      or rule_version.scope_local_body_id = jurisdiction.local_body_id)
    and (rule_version.scope_ward_id is null or rule_version.scope_ward_id = jurisdiction.ward_id)
    and (rule_version.asset_requirement <> 'required' or asset_match.asset_id is not null)
    and (p_asset_id is null or asset_match.asset_id is not null)
    and (not rule_version.requires_asset_owner
      or asset_match.asset_ownership_version_id is not null)
    and (
      target.target_office_id is null
      or exists (
        select 1
        from governance.offices as office
        where office.id = target.target_office_id
          and office.authority_id = target.target_authority_id
          and (
            office.authority_department_id is null
            or office.authority_department_id = authority_department.id
          )
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
  order by
    rule_version.fallback_depth,
    rule_version.priority,
    asset_match.distance_meters nulls last,
    rule_version.id,
    asset_match.asset_id,
    assignment.id
  limit 100;
$$;

create function public.record_routing_decision(
  p_actor_user_id uuid,
  p_request_id text,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz,
  p_resolved_at timestamptz,
  p_category_id uuid,
  p_decision_status text,
  p_confidence_score numeric default null,
  p_state_id uuid default null,
  p_district_id uuid default null,
  p_taluka_id uuid default null,
  p_local_body_id uuid default null,
  p_ward_id uuid default null,
  p_state_boundary_version_id uuid default null,
  p_district_boundary_version_id uuid default null,
  p_taluka_boundary_version_id uuid default null,
  p_local_body_boundary_version_id uuid default null,
  p_ward_boundary_version_id uuid default null,
  p_asset_type_id uuid default null,
  p_asset_id uuid default null,
  p_asset_version_id uuid default null,
  p_asset_match_distance_meters double precision default null,
  p_asset_ownership_version_id uuid default null,
  p_target_authority_id uuid default null,
  p_department_id uuid default null,
  p_authority_department_id uuid default null,
  p_officer_role_id uuid default null,
  p_officer_assignment_id uuid default null,
  p_route_rule_id uuid default null,
  p_route_rule_version_id uuid default null,
  p_confidence_policy_version_id uuid default null,
  p_fallback_depth smallint default 0,
  p_explanation_codes text[] default '{}'::text[],
  p_explanation_metadata jsonb default '{}'::jsonb,
  p_ambiguity_count smallint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing routing.routing_decisions%rowtype;
  inserted_id uuid;
  input_location extensions.geometry(Point, 4326);
begin
  if p_longitude is null
    or p_latitude is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90
    or p_accuracy_meters is null
    or p_accuracy_meters < 0
    or p_accuracy_meters > 5000 then
    raise exception using errcode = '22023', message = 'ROUTING_COORDINATES_INVALID';
  end if;

  input_location := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),
    4326
  )::extensions.geometry(Point, 4326);

  select decision.* into existing
  from routing.routing_decisions as decision
  where decision.actor_user_id = p_actor_user_id
    and decision.request_id = p_request_id;

  if found then
    if existing.category_id = p_category_id
      and extensions.st_equals(existing.input_location, input_location)
      and existing.accuracy_meters = p_accuracy_meters
      and existing.captured_at = p_captured_at
      and existing.resolved_at = p_resolved_at
      and existing.decision_status = p_decision_status
      and existing.confidence_score is not distinct from p_confidence_score
      and existing.state_id is not distinct from p_state_id
      and existing.district_id is not distinct from p_district_id
      and existing.taluka_id is not distinct from p_taluka_id
      and existing.local_body_id is not distinct from p_local_body_id
      and existing.ward_id is not distinct from p_ward_id
      and existing.state_boundary_version_id is not distinct from p_state_boundary_version_id
      and existing.district_boundary_version_id is not distinct from p_district_boundary_version_id
      and existing.taluka_boundary_version_id is not distinct from p_taluka_boundary_version_id
      and existing.local_body_boundary_version_id
        is not distinct from p_local_body_boundary_version_id
      and existing.ward_boundary_version_id is not distinct from p_ward_boundary_version_id
      and existing.asset_type_id is not distinct from p_asset_type_id
      and existing.asset_id is not distinct from p_asset_id
      and existing.asset_version_id is not distinct from p_asset_version_id
      and existing.asset_match_distance_meters
        is not distinct from p_asset_match_distance_meters
      and existing.asset_ownership_version_id is not distinct from p_asset_ownership_version_id
      and existing.target_authority_id is not distinct from p_target_authority_id
      and existing.department_id is not distinct from p_department_id
      and existing.authority_department_id is not distinct from p_authority_department_id
      and existing.officer_role_id is not distinct from p_officer_role_id
      and existing.officer_assignment_id is not distinct from p_officer_assignment_id
      and existing.route_rule_id is not distinct from p_route_rule_id
      and existing.route_rule_version_id is not distinct from p_route_rule_version_id
      and existing.confidence_policy_version_id is not distinct from p_confidence_policy_version_id
      and existing.fallback_depth = p_fallback_depth
      and existing.explanation_codes = p_explanation_codes
      and existing.explanation_metadata = p_explanation_metadata
      and existing.ambiguity_count = p_ambiguity_count then
      return existing.id;
    end if;

    raise exception using errcode = '23505', message = 'ROUTING_DECISION_IDEMPOTENCY_CONFLICT';
  end if;

  insert into routing.routing_decisions (
    actor_user_id,
    request_id,
    category_id,
    input_location,
    accuracy_meters,
    captured_at,
    resolved_at,
    decision_status,
    confidence_score,
    state_id,
    district_id,
    taluka_id,
    local_body_id,
    ward_id,
    state_boundary_version_id,
    district_boundary_version_id,
    taluka_boundary_version_id,
    local_body_boundary_version_id,
    ward_boundary_version_id,
    asset_type_id,
    asset_id,
    asset_version_id,
    asset_match_distance_meters,
    asset_ownership_version_id,
    target_authority_id,
    department_id,
    authority_department_id,
    officer_role_id,
    officer_assignment_id,
    route_rule_id,
    route_rule_version_id,
    confidence_policy_version_id,
    fallback_depth,
    explanation_codes,
    explanation_metadata,
    ambiguity_count
  )
  values (
    p_actor_user_id,
    p_request_id,
    p_category_id,
    input_location,
    p_accuracy_meters,
    p_captured_at,
    p_resolved_at,
    p_decision_status,
    p_confidence_score,
    p_state_id,
    p_district_id,
    p_taluka_id,
    p_local_body_id,
    p_ward_id,
    p_state_boundary_version_id,
    p_district_boundary_version_id,
    p_taluka_boundary_version_id,
    p_local_body_boundary_version_id,
    p_ward_boundary_version_id,
    p_asset_type_id,
    p_asset_id,
    p_asset_version_id,
    p_asset_match_distance_meters,
    p_asset_ownership_version_id,
    p_target_authority_id,
    p_department_id,
    p_authority_department_id,
    p_officer_role_id,
    p_officer_assignment_id,
    p_route_rule_id,
    p_route_rule_version_id,
    p_confidence_policy_version_id,
    p_fallback_depth,
    p_explanation_codes,
    p_explanation_metadata,
    p_ambiguity_count
  )
  returning id into inserted_id;

  return inserted_id;
exception
  when unique_violation then
    select decision.* into existing
    from routing.routing_decisions as decision
    where decision.actor_user_id = p_actor_user_id
      and decision.request_id = p_request_id;
    if found
      and existing.category_id = p_category_id
      and extensions.st_equals(existing.input_location, input_location)
      and existing.accuracy_meters = p_accuracy_meters
      and existing.captured_at = p_captured_at
      and existing.resolved_at = p_resolved_at
      and existing.decision_status = p_decision_status
      and existing.confidence_score is not distinct from p_confidence_score
      and existing.state_id is not distinct from p_state_id
      and existing.district_id is not distinct from p_district_id
      and existing.taluka_id is not distinct from p_taluka_id
      and existing.local_body_id is not distinct from p_local_body_id
      and existing.ward_id is not distinct from p_ward_id
      and existing.state_boundary_version_id is not distinct from p_state_boundary_version_id
      and existing.district_boundary_version_id is not distinct from p_district_boundary_version_id
      and existing.taluka_boundary_version_id is not distinct from p_taluka_boundary_version_id
      and existing.local_body_boundary_version_id
        is not distinct from p_local_body_boundary_version_id
      and existing.ward_boundary_version_id is not distinct from p_ward_boundary_version_id
      and existing.asset_type_id is not distinct from p_asset_type_id
      and existing.asset_id is not distinct from p_asset_id
      and existing.asset_version_id is not distinct from p_asset_version_id
      and existing.asset_match_distance_meters
        is not distinct from p_asset_match_distance_meters
      and existing.asset_ownership_version_id is not distinct from p_asset_ownership_version_id
      and existing.target_authority_id is not distinct from p_target_authority_id
      and existing.department_id is not distinct from p_department_id
      and existing.authority_department_id is not distinct from p_authority_department_id
      and existing.officer_role_id is not distinct from p_officer_role_id
      and existing.officer_assignment_id is not distinct from p_officer_assignment_id
      and existing.route_rule_id is not distinct from p_route_rule_id
      and existing.route_rule_version_id is not distinct from p_route_rule_version_id
      and existing.confidence_policy_version_id is not distinct from p_confidence_policy_version_id
      and existing.fallback_depth = p_fallback_depth
      and existing.explanation_codes = p_explanation_codes
      and existing.explanation_metadata = p_explanation_metadata
      and existing.ambiguity_count = p_ambiguity_count then
      return existing.id;
    end if;
    raise exception using errcode = '23505', message = 'ROUTING_DECISION_IDEMPOTENCY_CONFLICT';
end;
$$;

revoke all on function public.list_routing_categories(boolean)
  from public, anon, authenticated;
revoke all on function public.resolve_jurisdiction_context(
  double precision,
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated;
revoke all on function public.resolve_routing_policy_context(
  uuid,
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated;
revoke all on function public.resolve_routing_candidates(
  double precision,
  double precision,
  double precision,
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated;
revoke all on function public.record_routing_decision(
  uuid,
  text,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz,
  uuid,
  text,
  numeric,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  double precision,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  smallint,
  text[],
  jsonb,
  smallint
) from public, anon, authenticated;

grant execute on function public.list_routing_categories(boolean) to service_role;
grant execute on function public.resolve_jurisdiction_context(
  double precision,
  double precision,
  double precision,
  timestamptz
) to service_role;
grant execute on function public.resolve_routing_policy_context(
  uuid,
  uuid,
  uuid,
  timestamptz
) to service_role;
grant execute on function public.resolve_routing_candidates(
  double precision,
  double precision,
  double precision,
  uuid,
  uuid,
  timestamptz
) to service_role;
grant execute on function public.record_routing_decision(
  uuid,
  text,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz,
  uuid,
  text,
  numeric,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  double precision,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  smallint,
  text[],
  jsonb,
  smallint
) to service_role;

comment on function public.list_routing_categories(boolean) is
  'Service-only category catalog. Non-routable engineering records require an explicit opt-in.';
comment on function public.resolve_jurisdiction_context(double precision, double precision, double precision, timestamptz) is
  'Service-only PostGIS jurisdiction resolution with versioned, non-placeholder evidence metadata.';
comment on function public.resolve_routing_policy_context(uuid, uuid, uuid, timestamptz) is
  'Service-only policy lookup independent of asset matching; callers must fail closed unless exactly one version is returned.';
comment on function public.resolve_routing_candidates(double precision, double precision, double precision, uuid, uuid, timestamptz) is
  'Service-only, fully data-driven routing candidate query. It never returns unverified, placeholder, inactive, expired, or non-routable records.';
comment on function public.record_routing_decision(
  uuid,
  text,
  double precision,
  double precision,
  double precision,
  timestamptz,
  timestamptz,
  uuid,
  text,
  numeric,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  double precision,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  smallint,
  text[],
  jsonb,
  smallint
) is
  'Idempotently appends a privacy-restricted routing decision audit keyed by actor and request ID.';
