create or replace function complaints.actor_can_review_publication(
  p_actor_user_id uuid,
  p_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_authority_id is not null
    and private.user_has_active_role(
      p_actor_user_id,
      'platform_admin',
      'global',
      null
    );
$$;

create or replace function complaints.validate_public_visibility_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_authority_id uuid;
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID';
  end if;

  if cardinality(new.allowed_complaint_statuses) not between 1 and 22
    or array_position(new.allowed_complaint_statuses, null) is not null
    or cardinality(new.allowed_complaint_statuses) <> (
      select count(distinct status_name)
      from unnest(new.allowed_complaint_statuses) as status_name
    )
    or exists (
      select 1
      from unnest(new.allowed_complaint_statuses) as status_name
      where status_name not in (
        'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
        'acknowledged', 'inspection_scheduled', 'inspection_completed',
        'work_order_created', 'work_in_progress', 'resolution_submitted',
        'citizen_verification_pending', 'resolved', 'closed', 'transferred',
        'waiting_for_material', 'waiting_for_external_agency', 'reopened',
        'rejected', 'cancelled', 'escalated'
      )
    ) then
    raise exception using
      errcode = '23514',
      message = 'PUBLIC_VISIBILITY_POLICY_CONFIGURATION_INVALID';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.public_visibility_policy_id is distinct from old.public_visibility_policy_id
      or new.version is distinct from old.version
      or new.allowed_complaint_statuses is distinct from old.allowed_complaint_statuses
      or new.minimum_hotspot_complaint_count
        is distinct from old.minimum_hotspot_complaint_count
      or new.effective_from is distinct from old.effective_from
      or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '55000',
        message = 'PUBLIC_VISIBILITY_POLICY_VERSION_IMMUTABLE';
    end if;

    if old.status = 'draft' and new.status = 'approved' then
      if old.approved_by_user_id is not null
        or old.approved_at is not null
        or old.effective_to is not null
        or new.approved_by_user_id is null
        or new.approved_at is null
        or new.effective_to is not null then
        raise exception using
          errcode = '55000',
          message = 'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID';
      end if;
    elsif old.status = 'approved' and new.status = 'superseded' then
      if new.approved_by_user_id is distinct from old.approved_by_user_id
        or new.approved_at is distinct from old.approved_at
        or new.effective_to is null
        or new.effective_to < clock_timestamp() then
        raise exception using
          errcode = '55000',
          message = 'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID';
      end if;
    else
      raise exception using
        errcode = '55000',
        message = 'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID';
    end if;
  end if;

  if new.status = 'approved' then
    if not exists (
      select 1
      from complaints.public_visibility_category_rules as category_rule
      where category_rule.public_visibility_policy_version_id = new.id
    ) then
      raise exception using
        errcode = '23514',
        message = 'PUBLIC_VISIBILITY_POLICY_CATEGORY_RULE_REQUIRED';
    end if;

    select local_body.authority_id into policy_authority_id
    from complaints.public_visibility_policies as policy
    inner join governance.local_bodies as local_body
      on local_body.id = policy.local_body_id
    inner join governance.authorities as authority
      on authority.id = local_body.authority_id
    inner join governance.reference_sources as local_body_source
      on local_body_source.id = local_body.reference_source_id
    inner join governance.reference_sources as authority_source
      on authority_source.id = authority.reference_source_id
    where policy.id = new.public_visibility_policy_id
      and local_body.lgd_code is not null
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and local_body_source.source_type = 'official'
      and authority_source.source_type = 'official';

    if policy_authority_id is null
      or not complaints.actor_can_review_publication(
        new.approved_by_user_id,
        policy_authority_id
      ) then
      raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
    end if;
  end if;

  return new;
end;
$$;

create function complaints.validate_public_transparency_query(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_category_codes text[],
  p_statuses text[],
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_zoom integer,
  p_limit integer,
  p_maximum_limit integer
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_west is null
    or p_south is null
    or p_east is null
    or p_north is null
    or not (p_west between -180 and 180)
    or not (p_east between -180 and 180)
    or not (p_south between -90 and 90)
    or not (p_north between -90 and 90)
    or p_east <= p_west
    or p_north <= p_south
    or p_east - p_west > 2
    or p_north - p_south > 2
    or p_zoom not between 0 and 22
    or p_limit not between 1 and p_maximum_limit
    or p_maximum_limit not between 1 and 201 then
    raise exception using
      errcode = '22023',
      message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
  end if;

  if p_category_codes is not null and (
    cardinality(p_category_codes) not between 1 and 20
    or array_position(p_category_codes, null) is not null
    or cardinality(p_category_codes) <> (
      select count(distinct category_code)
      from unnest(p_category_codes) as category_code
    )
    or exists (
      select 1
      from unnest(p_category_codes) as category_code
      where category_code !~ '^[a-z][a-z0-9_]{1,79}$'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
  end if;

  if p_statuses is not null and (
    cardinality(p_statuses) not between 1 and 4
    or array_position(p_statuses, null) is not null
    or cardinality(p_statuses) <> (
      select count(distinct public_status)
      from unnest(p_statuses) as public_status
    )
    or exists (
      select 1
      from unnest(p_statuses) as public_status
      where public_status not in ('reported', 'in_progress', 'resolved', 'closed')
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
  end if;

  if p_date_from is not null
    and p_date_to is not null
    and (
      p_date_to < p_date_from
      or p_date_to - p_date_from > interval '366 days'
    ) then
    raise exception using
      errcode = '22023',
      message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
  end if;
end;
$$;

create function complaints.current_public_complaint_projections(
  p_at timestamptz default current_timestamp
)
returns setof complaints.complaint_publication_projections
language sql
stable
security definer
set search_path = ''
as $$
  select projection.*
  from complaints.complaint_publication_projections as projection
  inner join complaints.public_visibility_policy_versions as policy_version
    on policy_version.id = projection.public_visibility_policy_version_id
  inner join complaints.public_visibility_category_rules as category_rule
    on category_rule.id = projection.public_visibility_category_rule_id
    and category_rule.public_visibility_policy_version_id = policy_version.id
    and category_rule.category_id = projection.category_id
  inner join routing.issue_categories as category on category.id = projection.category_id
  inner join governance.local_bodies as local_body on local_body.id = projection.local_body_id
  inner join governance.authorities as authority on authority.id = local_body.authority_id
  inner join governance.wards as ward
    on ward.id = projection.ward_id
    and ward.local_body_id = local_body.id
  inner join governance.jurisdiction_boundary_versions as boundary
    on boundary.id = projection.ward_boundary_version_id
    and boundary.ward_id = ward.id
  inner join governance.reference_sources as category_source
    on category_source.id = category.reference_source_id
  inner join governance.reference_sources as authority_source
    on authority_source.id = authority.reference_source_id
  inner join governance.reference_sources as local_body_source
    on local_body_source.id = local_body.reference_source_id
  inner join governance.reference_sources as ward_source
    on ward_source.id = ward.reference_source_id
  inner join governance.reference_sources as boundary_source
    on boundary_source.id = boundary.reference_source_id
  where p_at is not null
    and projection.publication_state = 'published'
    and projection.event_at <= p_at
    and not exists (
      select 1
      from complaints.complaint_publication_projections as newer
      where newer.complaint_id = projection.complaint_id
        and newer.version > projection.version
        and newer.event_at <= p_at
    )
    and policy_version.status in ('approved', 'superseded')
    and policy_version.effective_from <= p_at
    and (policy_version.effective_to is null or policy_version.effective_to > p_at)
    and category_rule.publication_allowed
    and category.status = 'active'
    and category.verification_status = 'verified'
    and not category.is_placeholder
    and category.is_routing_eligible
    and authority.status = 'active'
    and authority.verification_status = 'verified'
    and not authority.is_placeholder
    and authority.is_routing_eligible
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body.lgd_code is not null
    and ward.status = 'active'
    and ward.verification_status = 'verified'
    and not ward.is_placeholder
    and ward.is_routing_eligible
    and coalesce(ward.lgd_code, ward.source_ward_code) is not null
    and boundary.status = 'active'
    and boundary.verification_status = 'verified'
    and not boundary.is_placeholder
    and boundary.is_routing_eligible
    and boundary.effective_from <= p_at
    and (boundary.effective_to is null or boundary.effective_to > p_at)
    and category_source.source_type = 'official'
    and authority_source.source_type = 'official'
    and local_body_source.source_type = 'official'
    and ward_source.source_type = 'official'
    and boundary_source.source_type = 'official';
$$;

create function complaints.public_complaint_projection_payload(
  p_projection complaints.complaint_publication_projections,
  p_include_summary boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'publicId', p_projection.public_id,
    'title', p_projection.public_title,
    'category', jsonb_build_object(
      'code', category.code,
      'name', p_projection.category_name
    ),
    'status', p_projection.public_status,
    'location', jsonb_build_object(
      'latitude', extensions.st_y(p_projection.approximate_location),
      'longitude', extensions.st_x(p_projection.approximate_location),
      'precisionMeters', p_projection.location_precision_meters
    ),
    'localBody', jsonb_build_object(
      'code', local_body.lgd_code,
      'name', local_body.name
    ),
    'ward', jsonb_build_object(
      'code', coalesce(ward.lgd_code, ward.source_ward_code),
      'name', ward.name,
      'wardNumber', ward.ward_number
    ),
    'submittedAt', p_projection.submitted_at,
    'updatedAt', p_projection.source_updated_at,
    'publishedAt', p_projection.published_at
  ) || case
    when p_include_summary then jsonb_build_object('summary', p_projection.public_summary)
    else '{}'::jsonb
  end
  from routing.issue_categories as category
  cross join governance.local_bodies as local_body
  inner join governance.wards as ward
    on ward.id = p_projection.ward_id
    and ward.local_body_id = local_body.id
  where category.id = p_projection.category_id
    and local_body.id = p_projection.local_body_id;
$$;

create function public.list_public_complaint_projections(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_category_codes text[],
  p_statuses text[],
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_zoom integer,
  p_limit integer,
  p_cursor text
)
returns table (projection jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cursor_id uuid;
begin
  perform complaints.validate_public_transparency_query(
    p_west, p_south, p_east, p_north, p_category_codes, p_statuses,
    p_date_from, p_date_to, p_zoom, p_limit, 201
  );

  if p_cursor is not null then
    begin
      cursor_id := p_cursor::uuid;
    exception when invalid_text_representation then
      raise exception using
        errcode = '22023',
        message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
    end;
  end if;

  return query
  select complaints.public_complaint_projection_payload(candidate, false)
  from complaints.current_public_complaint_projections(statement_timestamp()) as candidate
  where (
      p_category_codes is null
      or exists (
        select 1
        from routing.issue_categories as category
        where category.id = candidate.category_id
          and category.code = any(p_category_codes)
      )
    )
    and (p_statuses is null or candidate.public_status = any(p_statuses))
    and (p_date_from is null or candidate.submitted_at >= p_date_from)
    and (p_date_to is null or candidate.submitted_at <= p_date_to)
    and (cursor_id is null or candidate.public_id > cursor_id)
    and extensions.st_intersects(
      candidate.approximate_location,
      extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    )
  order by candidate.public_id
  limit p_limit;
end;
$$;

create function public.get_public_complaint_projection(p_public_id uuid)
returns table (projection jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select candidate
    from complaints.current_public_complaint_projections(statement_timestamp()) as candidate
    where p_public_id is not null and candidate.public_id = p_public_id
  )
  select complaints.public_complaint_projection_payload(eligible.candidate, true)
  from eligible
  where (select count(*) from eligible) = 1
  limit 1;
$$;

create function public.list_public_complaint_hotspots(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_category_codes text[],
  p_statuses text[],
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_zoom integer,
  p_limit integer
)
returns table (hotspot jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  grid_size_degrees double precision;
begin
  perform complaints.validate_public_transparency_query(
    p_west, p_south, p_east, p_north, p_category_codes, p_statuses,
    p_date_from, p_date_to, p_zoom, p_limit, 200
  );

  grid_size_degrees := case
    when p_zoom <= 7 then 1.0
    when p_zoom <= 10 then 0.25
    when p_zoom <= 13 then 0.05
    when p_zoom <= 16 then 0.01
    else 0.002
  end;

  return query
  with eligible as (
    select
      candidate.*,
      policy_version.minimum_hotspot_complaint_count,
      extensions.st_snaptogrid(candidate.approximate_location, grid_size_degrees)
        as grid_location
    from complaints.current_public_complaint_projections(statement_timestamp()) as candidate
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = candidate.public_visibility_policy_version_id
    where (
        p_category_codes is null
        or exists (
          select 1
          from routing.issue_categories as category
          where category.id = candidate.category_id
            and category.code = any(p_category_codes)
        )
      )
      and (p_statuses is null or candidate.public_status = any(p_statuses))
      and (p_date_from is null or candidate.submitted_at >= p_date_from)
      and (p_date_to is null or candidate.submitted_at <= p_date_to)
      and extensions.st_intersects(
        candidate.approximate_location,
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      )
  ), grouped as (
    select
      extensions.st_x(eligible.grid_location) as longitude,
      extensions.st_y(eligible.grid_location) as latitude,
      greatest(
        max(eligible.location_precision_meters),
        ceil(grid_size_degrees * 111320 * sqrt(2) / 2)::integer
      ) as radius_meters,
      count(*)::integer as complaint_count,
      count(distinct eligible.category_id)::integer as category_count,
      min(eligible.submitted_at) as from_at,
      max(eligible.submitted_at) as to_at,
      max(eligible.minimum_hotspot_complaint_count)::integer as minimum_count
    from eligible
    group by eligible.grid_location
  )
  select jsonb_build_object(
    'id', format(
      'hotspot:%s:%s:%s',
      p_zoom,
      round(grouped.longitude / grid_size_degrees)::bigint,
      round(grouped.latitude / grid_size_degrees)::bigint
    ),
    'location', jsonb_build_object(
      'latitude', grouped.latitude,
      'longitude', grouped.longitude,
      'precisionMeters', least(grouped.radius_meters, 200000)
    ),
    'radiusMeters', least(grouped.radius_meters, 200000),
    'complaintCount', grouped.complaint_count,
    'categoryCount', grouped.category_count,
    'from', grouped.from_at,
    'to', grouped.to_at
  )
  from grouped
  where grouped.complaint_count >= grouped.minimum_count
  order by grouped.complaint_count desc, grouped.longitude, grouped.latitude
  limit p_limit;
end;
$$;

create function public.list_public_ward_boundaries(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer
)
returns table (ward_boundary jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform complaints.validate_public_transparency_query(
    p_west, p_south, p_east, p_north, null, null, null, null, 0, p_limit, 200
  );

  return query
  with eligible as (
    select
      candidate.ward_id,
      candidate.ward_boundary_version_id,
      candidate.public_visibility_policy_version_id
    from complaints.current_public_complaint_projections(statement_timestamp()) as candidate
  ), grouped as (
    select
      coalesce(ward.lgd_code, ward.source_ward_code) as ward_code,
      ward.name,
      ward.ward_number,
      local_body.lgd_code as local_body_code,
      local_body.name as local_body_name,
      boundary.version as boundary_version,
      boundary.boundary,
      count(*)::integer as complaint_count,
      max(policy_version.minimum_hotspot_complaint_count)::integer as minimum_count
    from eligible
    inner join governance.wards as ward on ward.id = eligible.ward_id
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.id = eligible.ward_boundary_version_id
      and boundary.ward_id = ward.id
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = eligible.public_visibility_policy_version_id
    where extensions.st_intersects(
      boundary.boundary,
      extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    )
    group by
      ward.id,
      ward.lgd_code,
      ward.source_ward_code,
      ward.name,
      ward.ward_number,
      local_body.id,
      local_body.lgd_code,
      local_body.name,
      boundary.id,
      boundary.version,
      boundary.boundary
  )
  select jsonb_build_object(
    'code', grouped.ward_code,
    'name', grouped.name,
    'wardNumber', grouped.ward_number,
    'localBodyCode', grouped.local_body_code,
    'localBodyName', grouped.local_body_name,
    'boundaryVersion', grouped.boundary_version,
    'boundary', extensions.st_asgeojson(grouped.boundary)::jsonb,
    'complaintCount', grouped.complaint_count
  )
  from grouped
  where grouped.complaint_count >= grouped.minimum_count
  order by grouped.ward_code
  limit p_limit;
end;
$$;

create function public.review_and_publish_complaint_projection(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_public_title text,
  p_public_summary text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  existing_review complaints.complaint_publication_reviews%rowtype;
  existing_projection complaints.complaint_publication_projections%rowtype;
  prior_projection complaints.complaint_publication_projections%rowtype;
  created_projection complaints.complaint_publication_projections%rowtype;
  selected_policy_version_id uuid;
  selected_category_rule_id uuid;
  selected_count integer;
  selected_boundary governance.jurisdiction_boundary_versions%rowtype;
  selected_category_name text;
  review_id uuid;
  operation_at timestamptz := clock_timestamp();
  approximate_location extensions.geometry(Point, 4326);
  location_precision_meters integer;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_public_title is null
    or p_public_title <> btrim(p_public_title)
    or char_length(p_public_title) not between 1 and 160
    or p_public_summary is null
    or p_public_summary <> btrim(p_public_summary)
    or char_length(p_public_summary) not between 1 and 2000
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'PUBLICATION_REVIEW_INVALID';
  end if;

  select review.* into existing_review
  from complaints.complaint_publication_reviews as review
  where review.reviewer_user_id = p_actor_user_id
    and review.request_id = p_request_id;

  if existing_review.id is not null then
    select candidate.* into existing_projection
    from complaints.complaint_publication_projections as candidate
    where candidate.review_id = existing_review.id;

    if existing_review.decision <> 'published'
      or existing_review.complaint_id <> p_complaint_id
      or existing_review.public_title <> p_public_title
      or existing_review.public_summary <> p_public_summary
      or existing_projection.id is null then
      raise exception using
        errcode = '23505',
        message = 'PUBLICATION_REVIEW_IDEMPOTENCY_CONFLICT';
    end if;

    if not exists (
      select 1
      from governance.local_bodies as local_body
      where local_body.id = existing_projection.local_body_id
        and complaints.actor_can_review_publication(
          p_actor_user_id,
          local_body.authority_id
        )
    ) then
      raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
    end if;

    return jsonb_build_object(
      'publicId', existing_projection.public_id,
      'version', existing_projection.version,
      'state', existing_projection.publication_state,
      'publishedAt', existing_projection.published_at
    );
  end if;

  select candidate.* into source_complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
  for update;
  if source_complaint.id is null then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  select candidate.* into assignment
  from complaints.complaint_assignments as candidate
  where candidate.complaint_id = source_complaint.id
    and candidate.status = 'active'
    and candidate.effective_to is null;

  if assignment.id is null
    or assignment.ward_id is null
    or not complaints.actor_can_review_publication(
      p_actor_user_id,
      assignment.authority_id
    ) then
    raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
  end if;

  if not exists (
    select 1
    from governance.local_bodies as local_body
    inner join governance.wards as ward
      on ward.id = assignment.ward_id
      and ward.local_body_id = local_body.id
    where local_body.id = assignment.local_body_id
      and local_body.lgd_code is not null
      and coalesce(ward.lgd_code, ward.source_ward_code) is not null
  ) then
    raise exception using errcode = '55000', message = 'PUBLICATION_SOURCE_UNAVAILABLE';
  end if;

  if not complaints.is_verified_assignment_scope(
    assignment.authority_id,
    assignment.local_body_id,
    assignment.ward_id,
    assignment.department_id,
    assignment.authority_department_id,
    assignment.officer_role_id,
    assignment.officer_assignment_id,
    operation_at
  ) then
    raise exception using errcode = '55000', message = 'PUBLICATION_SOURCE_UNAVAILABLE';
  end if;

  select
    (array_agg(policy_version.id order by policy_version.id))[1],
    (array_agg(category_rule.id order by policy_version.id))[1],
    count(*)::integer
  into selected_policy_version_id, selected_category_rule_id, selected_count
  from complaints.public_visibility_policies as policy
  inner join complaints.public_visibility_policy_versions as policy_version
    on policy_version.public_visibility_policy_id = policy.id
  inner join complaints.public_visibility_category_rules as category_rule
    on category_rule.public_visibility_policy_version_id = policy_version.id
    and category_rule.category_id = source_complaint.category_id
  where policy.local_body_id = assignment.local_body_id
    and policy_version.status = 'approved'
    and policy_version.effective_from <= operation_at
    and (policy_version.effective_to is null or policy_version.effective_to > operation_at)
    and source_complaint.current_status = any(policy_version.allowed_complaint_statuses)
    and category_rule.publication_allowed;

  if selected_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC_VISIBILITY_POLICY_UNAVAILABLE';
  end if;

  select boundary.* into selected_boundary
  from governance.jurisdiction_boundary_versions as boundary
  inner join governance.reference_sources as source
    on source.id = boundary.reference_source_id
  where boundary.ward_id = assignment.ward_id
    and boundary.status = 'active'
    and boundary.verification_status = 'verified'
    and not boundary.is_placeholder
    and boundary.is_routing_eligible
    and boundary.effective_from <= operation_at
    and (boundary.effective_to is null or boundary.effective_to > operation_at)
    and source.source_type = 'official';

  if selected_boundary.id is null then
    raise exception using
      errcode = '55000',
      message = 'COMPLAINT_PUBLICATION_WARD_BOUNDARY_UNAVAILABLE';
  end if;

  select category.name into selected_category_name
  from routing.issue_categories as category
  inner join governance.reference_sources as source
    on source.id = category.reference_source_id
  where category.id = source_complaint.category_id
    and category.status = 'active'
    and category.verification_status = 'verified'
    and not category.is_placeholder
    and category.is_routing_eligible
    and source.source_type = 'official';
  if selected_category_name is null then
    raise exception using errcode = '55000', message = 'PUBLICATION_SOURCE_UNAVAILABLE';
  end if;

  approximate_location := extensions.st_centroid(selected_boundary.boundary);
  location_precision_meters := ceil(greatest(
    1,
    extensions.st_maxdistance(
      extensions.st_transform(selected_boundary.boundary, 3857),
      extensions.st_transform(approximate_location, 3857)
    )
  ))::integer;

  if location_precision_meters > 200000 then
    raise exception using
      errcode = '55000',
      message = 'COMPLAINT_PUBLICATION_WARD_BOUNDARY_UNAVAILABLE';
  end if;

  insert into complaints.complaint_publication_reviews (
    complaint_id,
    public_visibility_policy_version_id,
    public_visibility_category_rule_id,
    reviewer_user_id,
    decision,
    public_title,
    public_summary,
    request_id,
    reviewed_at
  ) values (
    source_complaint.id,
    selected_policy_version_id,
    selected_category_rule_id,
    p_actor_user_id,
    'published',
    p_public_title,
    p_public_summary,
    p_request_id,
    operation_at
  ) returning id into review_id;

  select candidate.* into prior_projection
  from complaints.complaint_publication_projections as candidate
  where candidate.complaint_id = source_complaint.id
  order by candidate.version desc
  limit 1;

  insert into complaints.complaint_publication_projections (
    public_id,
    complaint_id,
    version,
    review_id,
    public_visibility_policy_version_id,
    public_visibility_category_rule_id,
    category_id,
    category_name,
    local_body_id,
    ward_id,
    ward_boundary_version_id,
    approximate_location,
    location_precision_meters,
    public_title,
    public_summary,
    public_status,
    publication_state,
    submitted_at,
    source_updated_at,
    published_at,
    event_at
  ) values (
    coalesce(prior_projection.public_id, gen_random_uuid()),
    source_complaint.id,
    coalesce(prior_projection.version, 0) + 1,
    review_id,
    selected_policy_version_id,
    selected_category_rule_id,
    source_complaint.category_id,
    selected_category_name,
    assignment.local_body_id,
    assignment.ward_id,
    selected_boundary.id,
    approximate_location,
    location_precision_meters,
    p_public_title,
    p_public_summary,
    complaints.map_public_complaint_status(source_complaint.current_status),
    'published',
    source_complaint.submitted_at,
    source_complaint.updated_at,
    operation_at,
    operation_at
  ) returning * into created_projection;

  return jsonb_build_object(
    'publicId', created_projection.public_id,
    'version', created_projection.version,
    'state', created_projection.publication_state,
    'publishedAt', created_projection.published_at
  );
end;
$$;

create function public.withdraw_public_complaint_projection(
  p_actor_user_id uuid,
  p_public_id uuid,
  p_reason_code text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_review complaints.complaint_publication_reviews%rowtype;
  existing_projection complaints.complaint_publication_projections%rowtype;
  prior_projection complaints.complaint_publication_projections%rowtype;
  created_projection complaints.complaint_publication_projections%rowtype;
  review_id uuid;
  complaint_owner_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null
    or p_public_id is null
    or p_reason_code is null
    or p_reason_code !~ '^[A-Z][A-Z0-9_]{1,79}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'PUBLICATION_REVIEW_INVALID';
  end if;

  select review.* into existing_review
  from complaints.complaint_publication_reviews as review
  where review.reviewer_user_id = p_actor_user_id
    and review.request_id = p_request_id;

  if existing_review.id is not null then
    select candidate.* into existing_projection
    from complaints.complaint_publication_projections as candidate
    where candidate.review_id = existing_review.id;

    if existing_review.decision <> 'withdrawn'
      or existing_review.reason_code <> p_reason_code
      or existing_projection.public_id <> p_public_id
      or existing_projection.publication_state <> 'withdrawn' then
      raise exception using
        errcode = '23505',
        message = 'PUBLICATION_REVIEW_IDEMPOTENCY_CONFLICT';
    end if;

    if not exists (
      select 1
      from governance.local_bodies as local_body
      where local_body.id = existing_projection.local_body_id
        and complaints.actor_can_review_publication(
          p_actor_user_id,
          local_body.authority_id
        )
    ) then
      raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
    end if;

    return jsonb_build_object(
      'publicId', existing_projection.public_id,
      'version', existing_projection.version,
      'state', existing_projection.publication_state,
      'withdrawnAt', existing_projection.event_at
    );
  end if;

  select count(distinct candidate.complaint_id)::integer
  into complaint_owner_count
  from complaints.complaint_publication_projections as candidate
  where candidate.public_id = p_public_id;
  if complaint_owner_count <> 1 then
    raise exception using errcode = 'P0002', message = 'PUBLIC_COMPLAINT_NOT_PUBLISHED';
  end if;

  select candidate.* into prior_projection
  from complaints.complaint_publication_projections as candidate
  where candidate.public_id = p_public_id
  order by candidate.version desc
  limit 1;

  perform 1
  from complaints.complaints as source_complaint
  where source_complaint.id = prior_projection.complaint_id
  for update;

  select candidate.* into prior_projection
  from complaints.complaint_publication_projections as candidate
  where candidate.public_id = p_public_id
  order by candidate.version desc
  limit 1;

  if prior_projection.id is null or prior_projection.publication_state <> 'published' then
    raise exception using errcode = 'P0002', message = 'PUBLIC_COMPLAINT_NOT_PUBLISHED';
  end if;

  if not exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = prior_projection.local_body_id
      and complaints.actor_can_review_publication(
        p_actor_user_id,
        local_body.authority_id
      )
  ) then
    raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
  end if;

  insert into complaints.complaint_publication_reviews (
    complaint_id,
    public_visibility_policy_version_id,
    public_visibility_category_rule_id,
    reviewer_user_id,
    decision,
    reason_code,
    request_id,
    reviewed_at
  ) values (
    prior_projection.complaint_id,
    prior_projection.public_visibility_policy_version_id,
    prior_projection.public_visibility_category_rule_id,
    p_actor_user_id,
    'withdrawn',
    p_reason_code,
    p_request_id,
    operation_at
  ) returning id into review_id;

  insert into complaints.complaint_publication_projections (
    public_id,
    complaint_id,
    version,
    review_id,
    public_visibility_policy_version_id,
    public_visibility_category_rule_id,
    category_id,
    category_name,
    local_body_id,
    ward_id,
    ward_boundary_version_id,
    approximate_location,
    location_precision_meters,
    public_title,
    public_summary,
    public_status,
    publication_state,
    submitted_at,
    source_updated_at,
    published_at,
    event_at
  ) values (
    prior_projection.public_id,
    prior_projection.complaint_id,
    prior_projection.version + 1,
    review_id,
    prior_projection.public_visibility_policy_version_id,
    prior_projection.public_visibility_category_rule_id,
    prior_projection.category_id,
    prior_projection.category_name,
    prior_projection.local_body_id,
    prior_projection.ward_id,
    prior_projection.ward_boundary_version_id,
    prior_projection.approximate_location,
    prior_projection.location_precision_meters,
    prior_projection.public_title,
    prior_projection.public_summary,
    prior_projection.public_status,
    'withdrawn',
    prior_projection.submitted_at,
    prior_projection.source_updated_at,
    prior_projection.published_at,
    operation_at
  ) returning * into created_projection;

  return jsonb_build_object(
    'publicId', created_projection.public_id,
    'version', created_projection.version,
    'state', created_projection.publication_state,
    'withdrawnAt', created_projection.event_at
  );
end;
$$;

alter table complaints.public_visibility_policies enable row level security;
alter table complaints.public_visibility_policies force row level security;
alter table complaints.public_visibility_policy_versions enable row level security;
alter table complaints.public_visibility_policy_versions force row level security;
alter table complaints.public_visibility_category_rules enable row level security;
alter table complaints.public_visibility_category_rules force row level security;
alter table complaints.complaint_publication_reviews enable row level security;
alter table complaints.complaint_publication_reviews force row level security;
alter table complaints.complaint_publication_projections enable row level security;
alter table complaints.complaint_publication_projections force row level security;
alter table complaints.complaint_duplicate_group_versions enable row level security;
alter table complaints.complaint_duplicate_group_versions force row level security;
alter table complaints.complaint_duplicate_group_members enable row level security;
alter table complaints.complaint_duplicate_group_members force row level security;
alter table complaints.public_media_derivatives enable row level security;
alter table complaints.public_media_derivatives force row level security;

revoke all on table
  complaints.public_visibility_policies,
  complaints.public_visibility_policy_versions,
  complaints.public_visibility_category_rules,
  complaints.complaint_publication_reviews,
  complaints.complaint_publication_projections,
  complaints.complaint_duplicate_group_versions,
  complaints.complaint_duplicate_group_members,
  complaints.public_media_derivatives
from public, anon, authenticated, service_role;

revoke all on function complaints.map_public_complaint_status(text)
  from public, anon, authenticated, service_role;
revoke all on function complaints.actor_can_review_publication(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_public_visibility_policy_version()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_public_visibility_category_rule()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_complaint_publication_review()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_complaint_publication_projection()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_public_media_derivative_scope()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_public_transparency_query(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function complaints.current_public_complaint_projections(timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function complaints.public_complaint_projection_payload(
  complaints.complaint_publication_projections,
  boolean
) from public, anon, authenticated, service_role;

revoke all on function public.list_public_complaint_projections(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text
) from public, anon, authenticated;
revoke all on function public.get_public_complaint_projection(uuid)
  from public, anon, authenticated;
revoke all on function public.list_public_complaint_hotspots(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer
) from public, anon, authenticated;
revoke all on function public.list_public_ward_boundaries(
  double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;
revoke all on function public.review_and_publish_complaint_projection(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function public.withdraw_public_complaint_projection(
  uuid, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.list_public_complaint_projections(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text
) to service_role;
grant execute on function public.get_public_complaint_projection(uuid)
  to service_role;
grant execute on function public.list_public_complaint_hotspots(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer
) to service_role;
grant execute on function public.list_public_ward_boundaries(
  double precision, double precision, double precision, double precision, integer
) to service_role;
grant execute on function public.review_and_publish_complaint_projection(
  uuid, uuid, text, text, text
) to service_role;
grant execute on function public.withdraw_public_complaint_projection(
  uuid, uuid, text, text
) to service_role;

comment on function public.list_public_complaint_projections(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text
) is 'Returns bounded, reviewed, current public complaint projections without private source fields.';
comment on function public.get_public_complaint_projection(uuid) is
  'Returns one current reviewed public complaint projection or no row.';
comment on function public.list_public_complaint_hotspots(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer
) is 'Returns policy-thresholded clusters derived only from current public projections.';
comment on function public.list_public_ward_boundaries(
  double precision, double precision, double precision, double precision, integer
) is 'Returns verified current ward geometry only when enough reviewed public projections exist.';
comment on function public.review_and_publish_complaint_projection(
  uuid, uuid, text, text, text
) is 'Atomically reviews and publishes an allowlisted ward-derived projection as a platform administrator.';
comment on function public.withdraw_public_complaint_projection(
  uuid, uuid, text, text
) is 'Appends an attributed withdrawal version without deleting publication history.';
