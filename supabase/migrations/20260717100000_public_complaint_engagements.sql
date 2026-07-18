create table if not exists complaints.public_complaint_engagements (
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_supporting boolean not null default false,
  is_following boolean not null default false,
  support_changed_at timestamptz not null default clock_timestamp(),
  follow_changed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  primary key (complaint_id, user_id),
  constraint public_complaint_engagements_time_check check (
    support_changed_at >= created_at
    and follow_changed_at >= created_at
    and updated_at >= created_at
  )
);

create index if not exists public_complaint_engagements_user_following_idx
  on complaints.public_complaint_engagements (user_id, updated_at desc, complaint_id)
  where is_following;

create index if not exists public_complaint_engagements_complaint_support_idx
  on complaints.public_complaint_engagements (complaint_id, user_id)
  where is_supporting;

alter table complaints.public_complaint_engagements enable row level security;
alter table complaints.public_complaint_engagements force row level security;

revoke all on table complaints.public_complaint_engagements from public;
revoke all on table complaints.public_complaint_engagements from anon;
revoke all on table complaints.public_complaint_engagements from authenticated;
revoke all on table complaints.public_complaint_engagements from service_role;

create or replace function complaints.public_complaint_support_count(p_complaint_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from complaints.public_complaint_engagements as engagement
  where p_complaint_id is not null
    and engagement.complaint_id = p_complaint_id
    and engagement.is_supporting;
$$;

create or replace function complaints.public_complaint_projection_payload(
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
    'publishedAt', p_projection.published_at,
    'supportCount', complaints.public_complaint_support_count(p_projection.complaint_id)
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

create or replace function public.list_public_complaint_feed(
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
  p_cursor text,
  p_sort text
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

  if p_sort is null or p_sort not in ('recent', 'trending') then
    raise exception using
      errcode = '22023',
      message = 'PUBLIC_TRANSPARENCY_QUERY_INVALID';
  end if;

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
  with eligible as (
    select
      candidate as source_projection,
      complaints.public_complaint_support_count(candidate.complaint_id) as support_count
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
      and extensions.st_intersects(
        candidate.approximate_location,
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      )
  ), cursor_value as (
    select eligible.source_projection, eligible.support_count
    from eligible
    where cursor_id is not null
      and (eligible.source_projection).public_id = cursor_id
  )
  select complaints.public_complaint_projection_payload(eligible.source_projection, false)
  from eligible
  where cursor_id is null
    or exists (
      select 1
      from cursor_value
      where (
          p_sort = 'trending'
          and (
            eligible.support_count < cursor_value.support_count
            or (
              eligible.support_count = cursor_value.support_count
              and (eligible.source_projection).published_at
                < (cursor_value.source_projection).published_at
            )
            or (
              eligible.support_count = cursor_value.support_count
              and (eligible.source_projection).published_at
                = (cursor_value.source_projection).published_at
              and (eligible.source_projection).public_id
                < (cursor_value.source_projection).public_id
            )
          )
        )
        or (
          p_sort = 'recent'
          and (
            (eligible.source_projection).published_at
              < (cursor_value.source_projection).published_at
            or (
              (eligible.source_projection).published_at
                = (cursor_value.source_projection).published_at
              and (eligible.source_projection).public_id
                < (cursor_value.source_projection).public_id
            )
          )
        )
    )
  order by
    case when p_sort = 'trending' then eligible.support_count end desc,
    (eligible.source_projection).published_at desc,
    (eligible.source_projection).public_id desc
  limit p_limit;
end;
$$;

create or replace function public.list_public_complaint_engagements(
  p_actor_user_id uuid,
  p_public_ids uuid[]
)
returns table (engagement jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null
    or p_public_ids is null
    or cardinality(p_public_ids) not between 1 and 100
    or array_position(p_public_ids, null) is not null
    or cardinality(p_public_ids) <> (
      select count(distinct requested.public_id)
      from unnest(p_public_ids) as requested(public_id)
    )
    or not exists (
      select 1
      from public.profiles as profile
      where profile.id = p_actor_user_id and profile.status = 'active'
    ) then
    raise exception using errcode = '42501', message = 'PUBLIC_ENGAGEMENT_FORBIDDEN';
  end if;

  return query
  select jsonb_build_object(
    'publicId', projection.public_id,
    'supportCount', complaints.public_complaint_support_count(projection.complaint_id),
    'supported', coalesce(current_engagement.is_supporting, false),
    'starred', coalesce(current_engagement.is_following, false)
  )
  from unnest(p_public_ids) with ordinality as requested(public_id, item_order)
  inner join complaints.current_public_complaint_projections(statement_timestamp()) as projection
    on projection.public_id = requested.public_id
  left join complaints.public_complaint_engagements as current_engagement
    on current_engagement.complaint_id = projection.complaint_id
    and current_engagement.user_id = p_actor_user_id
  order by requested.item_order;
end;
$$;

create or replace function public.set_public_complaint_engagement(
  p_actor_user_id uuid,
  p_public_id uuid,
  p_supported boolean,
  p_starred boolean
)
returns table (engagement jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
  source_complaint_id uuid;
begin
  if p_actor_user_id is null or p_public_id is null
    or p_supported is null or p_starred is null
    or not exists (
      select 1
      from public.profiles as profile
      where profile.id = p_actor_user_id and profile.status = 'active'
    ) then
    raise exception using errcode = '42501', message = 'PUBLIC_ENGAGEMENT_FORBIDDEN';
  end if;

  select projection.complaint_id
  into source_complaint_id
  from complaints.current_public_complaint_projections(operation_at) as projection
  where projection.public_id = p_public_id;

  if source_complaint_id is null then
    return;
  end if;

  perform 1
  from complaints.public_complaint_engagements as current_engagement
  where current_engagement.complaint_id = source_complaint_id
    and current_engagement.user_id = p_actor_user_id
  for update;

  insert into complaints.public_complaint_engagements (
    complaint_id,
    user_id,
    is_supporting,
    is_following,
    support_changed_at,
    follow_changed_at,
    created_at,
    updated_at
  ) values (
    source_complaint_id,
    p_actor_user_id,
    p_supported,
    p_starred,
    operation_at,
    operation_at,
    operation_at,
    operation_at
  )
  on conflict (complaint_id, user_id) do update
  set
    is_supporting = excluded.is_supporting,
    is_following = excluded.is_following,
    support_changed_at = case
      when complaints.public_complaint_engagements.is_supporting
        is distinct from excluded.is_supporting then operation_at
      else complaints.public_complaint_engagements.support_changed_at
    end,
    follow_changed_at = case
      when complaints.public_complaint_engagements.is_following
        is distinct from excluded.is_following then operation_at
      else complaints.public_complaint_engagements.follow_changed_at
    end,
    updated_at = operation_at;

  return query
  select jsonb_build_object(
    'publicId', projection.public_id,
    'supportCount', complaints.public_complaint_support_count(projection.complaint_id),
    'supported', current_engagement.is_supporting,
    'starred', current_engagement.is_following
  )
  from complaints.current_public_complaint_projections(operation_at) as projection
  inner join complaints.public_complaint_engagements as current_engagement
    on current_engagement.complaint_id = projection.complaint_id
    and current_engagement.user_id = p_actor_user_id
  where projection.public_id = p_public_id;
end;
$$;

revoke all on function complaints.public_complaint_support_count(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.list_public_complaint_feed(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.list_public_complaint_engagements(uuid, uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.set_public_complaint_engagement(
  uuid, uuid, boolean, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.list_public_complaint_feed(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text, text
) to service_role;
grant execute on function public.list_public_complaint_engagements(uuid, uuid[])
  to service_role;
grant execute on function public.set_public_complaint_engagement(
  uuid, uuid, boolean, boolean
) to service_role;

comment on table complaints.public_complaint_engagements is
  'Private one-row-per-account support and follow state for a currently reviewed public complaint.';
comment on function public.list_public_complaint_feed(
  double precision, double precision, double precision, double precision,
  text[], text[], timestamptz, timestamptz, integer, integer, text, text
) is
  'Returns reviewed public complaint projections ordered by recency or privacy-safe aggregate support.';
comment on function public.set_public_complaint_engagement(uuid, uuid, boolean, boolean) is
  'Idempotently sets one active account support and private follow state for a current public projection.';

do $public_complaint_engagements_verify$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'complaints'
      and relation.relname = 'public_complaint_engagements'
      and relation.relkind = 'r'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) or (
    select count(*)
    from information_schema.columns
    where table_schema = 'complaints'
      and table_name = 'public_complaint_engagements'
      and column_name = any(array[
        'complaint_id',
        'user_id',
        'is_supporting',
        'is_following',
        'support_changed_at',
        'follow_changed_at',
        'created_at',
        'updated_at'
      ]::text[])
  ) <> 8 or not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'complaints.public_complaint_engagements'::regclass
      and constraint_record.contype = 'p'
      and pg_catalog.pg_get_constraintdef(constraint_record.oid)
        = 'PRIMARY KEY (complaint_id, user_id)'
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'complaints.public_complaint_engagements'::regclass
      and constraint_record.conname = 'public_complaint_engagements_time_check'
      and constraint_record.contype = 'c'
      and constraint_record.convalidated
      and pg_catalog.pg_get_constraintdef(constraint_record.oid)
        = 'CHECK (((support_changed_at >= created_at) AND (follow_changed_at >= created_at) AND (updated_at >= created_at)))'
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'complaints.public_complaint_engagements'::regclass
      and constraint_record.conname = 'public_complaint_engagements_complaint_id_fkey'
      and constraint_record.contype = 'f'
      and constraint_record.convalidated
      and pg_catalog.pg_get_constraintdef(constraint_record.oid)
        = 'FOREIGN KEY (complaint_id) REFERENCES complaints.complaints(id) ON DELETE RESTRICT'
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'complaints.public_complaint_engagements'::regclass
      and constraint_record.conname = 'public_complaint_engagements_user_id_fkey'
      and constraint_record.contype = 'f'
      and constraint_record.convalidated
      and pg_catalog.pg_get_constraintdef(constraint_record.oid)
        = 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) or to_regprocedure(
    'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)'
  ) is null or to_regprocedure(
    'public.list_public_complaint_engagements(uuid,uuid[])'
  ) is null or to_regprocedure(
    'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)'
  ) is null or has_table_privilege(
    'authenticated', 'complaints.public_complaint_engagements', 'select'
  ) or has_function_privilege(
    'authenticated',
    'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.list_public_complaint_engagements(uuid,uuid[])',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)',
    'execute'
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC_COMPLAINT_ENGAGEMENT_MIGRATION_INCOMPLETE',
      hint = 'Reconcile the existing complaints.public_complaint_engagements relation instead of accepting partial schema drift.';
  end if;
end;
$public_complaint_engagements_verify$;
