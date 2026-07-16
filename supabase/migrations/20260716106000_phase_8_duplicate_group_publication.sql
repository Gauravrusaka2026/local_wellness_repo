create function complaints.public_duplicate_group_payload(
  p_complaint_id uuid,
  p_at timestamptz default current_timestamp
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with latest_versions as (
    select distinct on (version.group_id) version.*
    from complaints.complaint_duplicate_group_versions as version
    where version.reviewed_at <= p_at
    order by version.group_id, version.version desc
  ), matching as (
    select version.*
    from latest_versions as version
    inner join complaints.complaint_duplicate_group_members as member
      on member.duplicate_group_version_id = version.id
    where version.state = 'confirmed' and member.complaint_id = p_complaint_id
  ), eligible as (
    select matching.*
    from matching
    where (
      select count(*)
      from complaints.complaint_duplicate_group_members as member
      where member.duplicate_group_version_id = matching.id
    ) = (
      select count(*)
      from complaints.complaint_duplicate_group_members as member
      inner join complaints.current_public_complaint_projections(p_at) as projection
        on projection.complaint_id = member.complaint_id
      where member.duplicate_group_version_id = matching.id
    )
      and exists (
        select 1
        from complaints.current_public_complaint_projections(p_at) as canonical
        where canonical.complaint_id = matching.canonical_complaint_id
      )
  ), exact_group as (
    select eligible.* from eligible where (select count(*) from eligible) = 1
  ), members as (
    select
      projection.public_id,
      member.is_canonical,
      exact_group.canonical_complaint_id
    from exact_group
    inner join complaints.complaint_duplicate_group_members as member
      on member.duplicate_group_version_id = exact_group.id
    inner join complaints.current_public_complaint_projections(p_at) as projection
      on projection.complaint_id = member.complaint_id
  )
  select jsonb_build_object(
    'canonicalPublicId',
      (min(members.public_id::text) filter (where members.is_canonical))::uuid,
    'relatedPublicIds', coalesce(
      jsonb_agg(members.public_id order by members.public_id)
        filter (where members.public_id <> current_projection.public_id),
      '[]'::jsonb
    ),
    'totalCount', count(*)::integer
  )
  from members
  cross join complaints.current_public_complaint_projections(p_at) as current_projection
  where current_projection.complaint_id = p_complaint_id
  group by current_projection.public_id
  having count(*) between 2 and 100;
$$;

create or replace function public.get_public_complaint_projection(p_public_id uuid)
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
    || jsonb_build_object(
      'duplicateGroup', complaints.public_duplicate_group_payload(
        (eligible.candidate).complaint_id,
        statement_timestamp()
      )
    )
  from eligible
  where (select count(*) from eligible) = 1
  limit 1;
$$;

create function public.review_public_duplicate_group(
  p_actor_user_id uuid,
  p_public_ids uuid[],
  p_canonical_public_id uuid,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
  canonical_complaint_id uuid;
  authority_id uuid;
  local_body_count integer;
  category_count integer;
  resolved_count integer;
  group_version complaints.complaint_duplicate_group_versions%rowtype;
  existing complaints.complaint_duplicate_group_versions%rowtype;
  replay_public_ids uuid[];
begin
  if p_actor_user_id is null or p_canonical_public_id is null
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or cardinality(p_public_ids) not between 2 and 100
    or array_position(p_public_ids, null) is not null
    or cardinality(p_public_ids) <> (
      select count(distinct input.public_id)
      from unnest(p_public_ids) as input(public_id)
    )
    or not p_canonical_public_id = any(p_public_ids) then
    raise exception using errcode = '22023', message = 'PUBLIC_DUPLICATE_REVIEW_INVALID';
  end if;

  select candidate.* into existing
  from complaints.complaint_duplicate_group_versions as candidate
  where candidate.reviewed_by_user_id = p_actor_user_id
    and candidate.request_id = p_request_id;
  if existing.id is not null then
    select array_agg(distinct projection.public_id order by projection.public_id)
    into replay_public_ids
    from complaints.complaint_duplicate_group_members as member
    inner join complaints.complaint_publication_projections as projection
      on projection.complaint_id = member.complaint_id
    where member.duplicate_group_version_id = existing.id
    group by member.duplicate_group_version_id;
    if existing.state <> 'confirmed'
      or replay_public_ids is distinct from (
        select array_agg(input.public_id order by input.public_id)
        from unnest(p_public_ids) as input(public_id)
      )
      or not exists (
        select 1
        from complaints.complaint_publication_projections as projection
        where projection.complaint_id = existing.canonical_complaint_id
          and projection.public_id = p_canonical_public_id
      ) then
      raise exception using errcode = '23505', message = 'PUBLIC_DUPLICATE_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'canonicalPublicId', p_canonical_public_id,
      'relatedPublicIds', to_jsonb(array_remove(replay_public_ids, p_canonical_public_id)),
      'totalCount', cardinality(replay_public_ids)
    );
  end if;

  with resolved as (
    select projection.*
    from complaints.current_public_complaint_projections(operation_at) as projection
    where projection.public_id = any(p_public_ids)
  )
  select
    count(*)::integer,
    count(distinct resolved.local_body_id)::integer,
    count(distinct resolved.category_id)::integer,
    (min(resolved.complaint_id::text)
      filter (where resolved.public_id = p_canonical_public_id))::uuid,
    min(local_body.authority_id::text)::uuid
  into resolved_count, local_body_count, category_count, canonical_complaint_id, authority_id
  from resolved
  inner join governance.local_bodies as local_body on local_body.id = resolved.local_body_id;

  if resolved_count <> cardinality(p_public_ids)
    or local_body_count <> 1 or category_count <> 1
    or canonical_complaint_id is null
    or not complaints.actor_can_review_publication(p_actor_user_id, authority_id) then
    raise exception using errcode = '42501', message = 'PUBLIC_DUPLICATE_REVIEW_FORBIDDEN';
  end if;

  if exists (
    with latest as (
      select distinct on (version.group_id) version.*
      from complaints.complaint_duplicate_group_versions as version
      order by version.group_id, version.version desc
    )
    select 1
    from latest
    inner join complaints.complaint_duplicate_group_members as member
      on member.duplicate_group_version_id = latest.id
    inner join complaints.current_public_complaint_projections(operation_at) as projection
      on projection.complaint_id = member.complaint_id
    where latest.state = 'confirmed' and projection.public_id = any(p_public_ids)
  ) then
    raise exception using errcode = '55000', message = 'PUBLIC_DUPLICATE_MEMBERSHIP_CONFLICT';
  end if;

  insert into complaints.complaint_duplicate_group_versions (
    group_id, version, state, canonical_complaint_id,
    reviewed_by_user_id, request_id, reviewed_at
  ) values (
    gen_random_uuid(), 1, 'confirmed', canonical_complaint_id,
    p_actor_user_id, p_request_id, operation_at
  ) returning * into group_version;

  insert into complaints.complaint_duplicate_group_members (
    duplicate_group_version_id, complaint_id, member_order, is_canonical
  )
  select
    group_version.id,
    projection.complaint_id,
    row_number() over (order by projection.public_id)::smallint,
    projection.public_id = p_canonical_public_id
  from complaints.current_public_complaint_projections(operation_at) as projection
  where projection.public_id = any(p_public_ids)
  order by projection.public_id;

  return jsonb_build_object(
    'canonicalPublicId', p_canonical_public_id,
    'relatedPublicIds', to_jsonb((
      select array_agg(input.public_id order by input.public_id)
      from unnest(p_public_ids) as input(public_id)
      where input.public_id <> p_canonical_public_id
    )),
    'totalCount', cardinality(p_public_ids)
  );
end;
$$;

create function public.withdraw_public_duplicate_group(
  p_actor_user_id uuid,
  p_canonical_public_id uuid,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
  current_group complaints.complaint_duplicate_group_versions%rowtype;
  existing complaints.complaint_duplicate_group_versions%rowtype;
  authority_id uuid;
begin
  if p_actor_user_id is null or p_canonical_public_id is null
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'PUBLIC_DUPLICATE_REVIEW_INVALID';
  end if;
  select candidate.* into existing
  from complaints.complaint_duplicate_group_versions as candidate
  where candidate.reviewed_by_user_id = p_actor_user_id
    and candidate.request_id = p_request_id;
  if existing.id is not null then
    if existing.state <> 'withdrawn' then
      raise exception using errcode = '23505', message = 'PUBLIC_DUPLICATE_IDEMPOTENCY_CONFLICT';
    end if;
    if not exists (
      select 1
      from complaints.complaint_duplicate_group_versions as confirmed
      where confirmed.group_id = existing.group_id
        and confirmed.version < existing.version
        and confirmed.state = 'confirmed'
        and exists (
          select 1
          from complaints.complaint_publication_projections as projection
          where projection.complaint_id = confirmed.canonical_complaint_id
            and projection.public_id = p_canonical_public_id
        )
    ) then
      raise exception using errcode = '23505', message = 'PUBLIC_DUPLICATE_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'canonicalPublicId', p_canonical_public_id,
      'state', 'withdrawn',
      'withdrawnAt', existing.reviewed_at
    );
  end if;

  with latest as (
    select distinct on (version.group_id) version.*
    from complaints.complaint_duplicate_group_versions as version
    order by version.group_id, version.version desc
  )
  select latest.* into current_group
  from latest
  where latest.state = 'confirmed'
    and exists (
      select 1
      from complaints.complaint_publication_projections as projection
      where projection.complaint_id = latest.canonical_complaint_id
        and projection.public_id = p_canonical_public_id
    );
  if current_group.id is null then
    raise exception using errcode = 'P0002', message = 'PUBLIC_DUPLICATE_GROUP_NOT_FOUND';
  end if;
  select local_body.authority_id into authority_id
  from complaints.complaint_publication_projections as projection
  inner join governance.local_bodies as local_body on local_body.id = projection.local_body_id
  where projection.complaint_id = current_group.canonical_complaint_id
  order by projection.version desc limit 1;
  if not complaints.actor_can_review_publication(p_actor_user_id, authority_id) then
    raise exception using errcode = '42501', message = 'PUBLIC_DUPLICATE_REVIEW_FORBIDDEN';
  end if;

  insert into complaints.complaint_duplicate_group_versions (
    group_id, version, state, canonical_complaint_id,
    reviewed_by_user_id, request_id, reviewed_at
  ) values (
    current_group.group_id, current_group.version + 1, 'withdrawn', null,
    p_actor_user_id, p_request_id, operation_at
  ) returning * into existing;

  return jsonb_build_object(
    'canonicalPublicId', p_canonical_public_id,
    'state', 'withdrawn',
    'withdrawnAt', existing.reviewed_at
  );
end;
$$;

revoke all on function complaints.public_duplicate_group_payload(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.review_public_duplicate_group(uuid, uuid[], uuid, text)
  from public, anon, authenticated;
revoke all on function public.withdraw_public_duplicate_group(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.review_public_duplicate_group(uuid, uuid[], uuid, text)
  to service_role;
grant execute on function public.withdraw_public_duplicate_group(uuid, uuid, text)
  to service_role;

comment on function public.review_public_duplicate_group(uuid, uuid[], uuid, text) is
  'Creates one reviewed duplicate relationship using only currently published public complaint identifiers.';
comment on function public.withdraw_public_duplicate_group(uuid, uuid, text) is
  'Appends a withdrawal version for the reviewed duplicate relationship identified by its canonical public complaint.';
