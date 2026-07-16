create table private.api_rate_limit_windows (
  scope text not null,
  subject_sha256 text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  primary key (scope, subject_sha256, window_started_at),
  constraint api_rate_limit_windows_scope_format check (
    scope ~ '^[a-z][a-z0-9_]{2,63}$'
  ),
  constraint api_rate_limit_windows_subject_sha256_format check (
    subject_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint api_rate_limit_windows_request_count_positive check (request_count > 0),
  constraint api_rate_limit_windows_expiry_order check (
    expires_at > window_started_at
  )
);

create index api_rate_limit_windows_expiry_idx
  on private.api_rate_limit_windows (expires_at);

alter table private.api_rate_limit_windows enable row level security;
alter table private.api_rate_limit_windows force row level security;

revoke all on private.api_rate_limit_windows from public, anon, authenticated, service_role;

comment on table private.api_rate_limit_windows is
  'Privacy-safe fixed-window API quota counters. Subjects are one-way hashes and rows are accessible only through narrow service functions.';

create function public.consume_api_rate_limit(
  p_scope text,
  p_subject_sha256 text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_checked_at timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_reset_at timestamptz;
  v_observed_count integer;
begin
  if p_scope is null
    or p_scope !~ '^[a-z][a-z0-9_]{2,63}$'
    or p_subject_sha256 is null
    or p_subject_sha256 !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit < 1
    or p_limit > 10000
    or p_window_seconds is null
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'API_RATE_LIMIT_INVALID';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_checked_at) / p_window_seconds) * p_window_seconds
  );
  v_reset_at := v_window_started_at + make_interval(secs => p_window_seconds);

  insert into private.api_rate_limit_windows as rate_window (
    scope,
    subject_sha256,
    window_started_at,
    request_count,
    expires_at,
    created_at,
    updated_at
  )
  values (
    p_scope,
    p_subject_sha256,
    v_window_started_at,
    1,
    v_reset_at + interval '5 minutes',
    v_checked_at,
    v_checked_at
  )
  on conflict (scope, subject_sha256, window_started_at) do update
  set
    request_count = least(rate_window.request_count + 1, p_limit + 1),
    expires_at = greatest(rate_window.expires_at, excluded.expires_at),
    updated_at = v_checked_at
  returning request_count into v_observed_count;

  return jsonb_build_object(
    'allowed', v_observed_count <= p_limit,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_observed_count, 0),
    'reset_at', v_reset_at
  );
end;
$$;

create function public.purge_expired_api_rate_limits(
  p_max_rows integer default 1000
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_max_rows is null or p_max_rows < 1 or p_max_rows > 10000 then
    raise exception using
      errcode = '22023',
      message = 'API_RATE_LIMIT_PURGE_INVALID';
  end if;

  delete from private.api_rate_limit_windows as rate_window
  where rate_window.ctid in (
    select candidate.ctid
    from private.api_rate_limit_windows as candidate
    where candidate.expires_at <= clock_timestamp()
    order by candidate.expires_at, candidate.scope, candidate.subject_sha256
    limit p_max_rows
  );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create function public.api_readiness_check()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.roles as role
      where role.code = 'citizen'
    )
    and (
      select count(*) = 4
      from storage.buckets as bucket
      where bucket.id in (
        'complaint-originals-private',
        'governance-raw-snapshots',
        'resolution-evidence-private',
        'voice-recordings-private'
      )
        and bucket.public = false
    );
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.purge_expired_api_rate_limits(integer)
  from public, anon, authenticated;
revoke all on function public.api_readiness_check()
  from public, anon, authenticated;

grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;
grant execute on function public.purge_expired_api_rate_limits(integer)
  to service_role;
grant execute on function public.api_readiness_check()
  to service_role;

comment on function public.consume_api_rate_limit(text, text, integer, integer) is
  'Consumes one shared PostgreSQL-backed API quota unit for an already-hashed subject.';
comment on function public.purge_expired_api_rate_limits(integer) is
  'Deletes a bounded batch of expired API quota windows for platform scheduling.';
comment on function public.api_readiness_check() is
  'Narrow service-only dependency probe for required V1 database and private Storage configuration.';

create or replace function public.register_device(
  p_user_id uuid,
  p_device_identifier_hash text,
  p_platform text,
  p_last_seen_at timestamptz,
  p_app_version text default null,
  p_push_token text default null,
  p_push_token_supplied boolean default false,
  p_request_id uuid default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_device public.devices%rowtype;
  conflicting_risk_status text;
  conflicting_revoked_at timestamptz;
begin
  if p_user_id is null
    or p_device_identifier_hash is null
    or p_platform is null
    or p_last_seen_at is null then
    raise exception using
      errcode = '22004',
      message = 'DEVICE_REGISTRATION_INVALID';
  end if;

  perform 1
  from public.profiles as profile
  where profile.id = p_user_id
    and profile.status in ('pending', 'active')
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_OWNER_INACTIVE';
  end if;

  if not exists (
    select 1
    from public.devices as existing_device
    where existing_device.user_id = p_user_id
      and existing_device.device_identifier_hash = p_device_identifier_hash
  ) and (
    select count(*)
    from public.devices as active_device
    where active_device.user_id = p_user_id
      and active_device.revoked_at is null
  ) >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_LIMIT_REACHED';
  end if;

  insert into public.devices as existing_device (
    user_id,
    device_identifier_hash,
    platform,
    app_version,
    push_token,
    last_seen_at
  )
  values (
    p_user_id,
    p_device_identifier_hash,
    p_platform,
    p_app_version,
    case when p_push_token_supplied then p_push_token else null end,
    p_last_seen_at
  )
  on conflict (user_id, device_identifier_hash) do update
  set
    platform = excluded.platform,
    app_version = coalesce(excluded.app_version, existing_device.app_version),
    push_token = case
      when p_push_token_supplied then excluded.push_token
      else existing_device.push_token
    end,
    last_seen_at = excluded.last_seen_at
  where existing_device.risk_status <> 'blocked'
    and existing_device.revoked_at is null
  returning * into registered_device;

  if registered_device.id is null then
    select device.risk_status, device.revoked_at
    into conflicting_risk_status, conflicting_revoked_at
    from public.devices as device
    where device.user_id = p_user_id
      and device.device_identifier_hash = p_device_identifier_hash;

    if conflicting_risk_status = 'blocked' then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_BLOCKED';
    end if;

    if conflicting_revoked_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_REVOKED';
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_REGISTRATION_CONFLICT';
  end if;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    device_id,
    event_type,
    outcome,
    request_id,
    ip_address,
    user_agent,
    metadata
  )
  values (
    p_user_id,
    p_user_id,
    registered_device.id,
    'device_registered',
    'success',
    p_request_id,
    p_ip_address,
    p_user_agent,
    jsonb_build_object('platform', registered_device.platform)
  );

  return registered_device;
end;
$$;

comment on function public.register_device(
  uuid, text, text, timestamptz, text, text, boolean, uuid, inet, text
) is
  'Atomically registers or refreshes an owned installation, appends audit evidence, rejects revoked/blocked identifiers, and caps active installations per account.';
