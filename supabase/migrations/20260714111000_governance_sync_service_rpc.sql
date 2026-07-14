create function public.claim_due_governance_sync_sources(
  p_worker_id text,
  p_limit integer default 5,
  p_lease_seconds integer default 300
)
returns table (
  run_id uuid,
  source_endpoint_id uuid,
  source_key text,
  endpoint_url text,
  allowed_hosts text[],
  expected_media_types text[],
  max_response_bytes bigint,
  fetch_timeout_seconds smallint,
  etag text,
  last_modified timestamptz,
  lease_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_record governance.source_endpoints%rowtype;
  stale_lease governance.sync_source_leases%rowtype;
  claimed_run_id uuid;
  claimed_lease_token uuid;
  latest_etag text;
  latest_last_modified timestamptz;
  stale_failure_count integer;
  stale_retry_at timestamptz;
begin
  if p_worker_id is null
    or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$' then
    raise exception using errcode = '22023', message = 'SYNC_WORKER_ID_INVALID';
  end if;
  if p_limit is distinct from 1 then
    raise exception using errcode = '22023', message = 'SYNC_CLAIM_LIMIT_INVALID';
  end if;
  if p_lease_seconds is null or p_lease_seconds not between 180 and 900 then
    raise exception using errcode = '22023', message = 'SYNC_LEASE_DURATION_INVALID';
  end if;

  for source_record in
    select source.*
    from governance.source_endpoints as source
    where source.status = 'active'
      and source.verification_status = 'verified'
      and not source.is_placeholder
      and source.approved_at is not null
      and source.approved_by is not null
      and source.approved_contract_sha256 = source.source_contract_sha256
      and source.source_kind <> 'repository_bootstrap'
      and source.retrieval_method in ('http_get', 'api')
      and source.endpoint_url is not null
      and source.next_sync_at <= current_timestamp
      and (source.disabled_until is null or source.disabled_until <= current_timestamp)
      and not exists (
        select 1
        from governance.sync_source_leases as active_lease
        where active_lease.source_endpoint_id = source.id
          and active_lease.expires_at > current_timestamp
      )
    order by source.next_sync_at, source.id
    for update of source skip locked
    limit p_limit
  loop
    select * into stale_lease
    from governance.sync_source_leases as existing_lease
    where existing_lease.source_endpoint_id = source_record.id
      and existing_lease.expires_at <= current_timestamp;

    if stale_lease.source_endpoint_id is not null then
      stale_failure_count := source_record.consecutive_failure_count + 1;
      stale_retry_at := current_timestamp + least(
        interval '24 hours',
        interval '5 minutes' * power(2, least(stale_failure_count, 8))
      );

      update governance.sync_runs
      set
        status = 'failed',
        completed_at = current_timestamp,
        error_code = 'LEASE_EXPIRED',
        error_detail = 'The synchronization worker lease expired before completion.'
      where id = stale_lease.sync_run_id
        and status = 'retrieving';

      insert into governance.sync_events (
        sync_run_id,
        source_endpoint_id,
        event_type,
        severity,
        event_detail
      ) values (
        stale_lease.sync_run_id,
        source_record.id,
        'retrieval.lease_expired',
        'error',
        jsonb_build_object('errorCode', 'LEASE_EXPIRED', 'retryAt', stale_retry_at)
      );

      update governance.source_endpoints
      set
        consecutive_failure_count = stale_failure_count,
        last_failed_at = current_timestamp,
        last_failure_code = 'LEASE_EXPIRED',
        disabled_until = stale_retry_at,
        next_sync_at = stale_retry_at
      where id = source_record.id;

      delete from governance.sync_source_leases as expired_lease
      where expired_lease.source_endpoint_id = source_record.id;

      continue;
    end if;

    insert into governance.sync_runs (source_endpoint_id, trigger_kind)
    values (source_record.id, 'scheduled')
    returning id into claimed_run_id;

    update governance.sync_runs
    set status = 'retrieving', started_at = current_timestamp
    where id = claimed_run_id;

    claimed_lease_token := gen_random_uuid();
    insert into governance.sync_source_leases (
      source_endpoint_id,
      sync_run_id,
      lease_token,
      worker_id,
      acquired_at,
      heartbeat_at,
      expires_at
    ) values (
      source_record.id,
      claimed_run_id,
      claimed_lease_token,
      p_worker_id,
      current_timestamp,
      current_timestamp,
      current_timestamp + make_interval(secs => p_lease_seconds)
    );

    update governance.source_endpoints
    set last_attempted_at = current_timestamp
    where id = source_record.id;

    select snapshot.etag, snapshot.source_last_modified_at
    into latest_etag, latest_last_modified
    from governance.raw_snapshots as snapshot
    where snapshot.source_endpoint_id = source_record.id
    order by snapshot.retrieved_at desc, snapshot.id desc
    limit 1;

    insert into governance.sync_events (
      sync_run_id,
      source_endpoint_id,
      event_type,
      event_detail
    ) values (
      claimed_run_id,
      source_record.id,
      'retrieval.claimed',
      jsonb_build_object('workerId', p_worker_id)
    );

    run_id := claimed_run_id;
    source_endpoint_id := source_record.id;
    source_key := source_record.source_key;
    endpoint_url := source_record.endpoint_url;
    allowed_hosts := source_record.allowed_hosts;
    expected_media_types := source_record.expected_media_types;
    max_response_bytes := source_record.max_response_bytes;
    fetch_timeout_seconds := source_record.fetch_timeout_seconds;
    etag := latest_etag;
    last_modified := latest_last_modified;
    lease_token := claimed_lease_token;
    return next;
  end loop;
end;
$$;

create function public.heartbeat_governance_sync_lease(
  p_run_id uuid,
  p_lease_token uuid,
  p_extend_seconds integer default 300
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  renewed_until timestamptz;
begin
  if p_extend_seconds is null or p_extend_seconds not between 180 and 900 then
    raise exception using errcode = '22023', message = 'SYNC_LEASE_DURATION_INVALID';
  end if;

  update governance.sync_source_leases
  set
    heartbeat_at = current_timestamp,
    expires_at = current_timestamp + make_interval(secs => p_extend_seconds)
  where sync_run_id = p_run_id
    and lease_token = p_lease_token
    and expires_at > current_timestamp
  returning expires_at into renewed_until;

  if renewed_until is null then
    raise exception using errcode = '55000', message = 'SYNC_LEASE_NOT_ACTIVE';
  end if;

  return renewed_until;
end;
$$;

create function public.record_governance_sync_snapshot(
  p_run_id uuid,
  p_source_endpoint_id uuid,
  p_lease_token uuid,
  p_storage_bucket text,
  p_storage_object_path text,
  p_sha256 text,
  p_byte_size bigint,
  p_media_type text,
  p_etag text,
  p_last_modified timestamptz,
  p_retrieved_at timestamptz,
  p_http_status smallint
)
returns table (
  raw_snapshot_id uuid,
  duplicate_content boolean,
  unchanged_response boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_record governance.source_endpoints%rowtype;
  current_snapshot governance.raw_snapshots%rowtype;
  selected_snapshot_id uuid;
  inserted_snapshot_id uuid;
  is_duplicate boolean := false;
begin
  if not exists (
    select 1
    from governance.sync_source_leases as active_lease
    where active_lease.sync_run_id = p_run_id
      and active_lease.source_endpoint_id = p_source_endpoint_id
      and active_lease.lease_token = p_lease_token
      and active_lease.expires_at > current_timestamp
  ) then
    raise exception using errcode = '55000', message = 'SYNC_LEASE_NOT_ACTIVE';
  end if;

  select * into source_record
  from governance.source_endpoints
  where id = p_source_endpoint_id
  for update;

  if source_record.id is null or not exists (
    select 1
    from governance.sync_runs as sync_run
    where sync_run.id = p_run_id
      and sync_run.source_endpoint_id = p_source_endpoint_id
      and sync_run.status = 'retrieving'
  ) then
    raise exception using errcode = '55000', message = 'SYNC_RUN_NOT_RETRIEVING';
  end if;

  if p_retrieved_at is null
    or p_retrieved_at > current_timestamp + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'SYNC_RETRIEVAL_TIME_INVALID';
  end if;

  select * into current_snapshot
  from governance.raw_snapshots as snapshot
  where snapshot.source_endpoint_id = p_source_endpoint_id
  order by snapshot.retrieved_at desc, snapshot.id desc
  limit 1;

  if p_http_status = 304 then
    if current_snapshot.id is null then
      raise exception using errcode = '55000', message = 'SYNC_NOT_MODIFIED_WITHOUT_SNAPSHOT';
    end if;
    if p_storage_bucket is not null
      or p_storage_object_path is not null
      or p_sha256 is not null
      or p_byte_size is not null
      or p_media_type is not null then
      raise exception using errcode = '22023', message = 'SYNC_NOT_MODIFIED_PAYLOAD_FORBIDDEN';
    end if;

    selected_snapshot_id := current_snapshot.id;
    is_duplicate := true;
  elsif p_http_status = 200 then
    if p_storage_bucket <> 'governance-raw-snapshots'
      or p_storage_object_path is null
      or p_storage_object_path <> btrim(p_storage_object_path)
      or p_storage_object_path !~ ('^' || p_source_endpoint_id::text || '/[0-9a-f]{64}\.[a-z0-9]+$')
      or p_sha256 is null
      or p_sha256 !~ '^[0-9a-f]{64}$'
      or p_storage_object_path !~ ('/' || p_sha256 || '\.[a-z0-9]+$')
      or p_byte_size is null
      or p_byte_size <= 0
      or p_byte_size > source_record.max_response_bytes
      or p_media_type is null
      or not p_media_type = any(source_record.expected_media_types) then
      raise exception using errcode = '22023', message = 'SYNC_SNAPSHOT_METADATA_INVALID';
    end if;

    if not exists (
      select 1
      from storage.objects as stored_object
      where stored_object.bucket_id = p_storage_bucket
        and stored_object.name = p_storage_object_path
        and stored_object.metadata ->> 'size' ~ '^[0-9]+$'
        and (stored_object.metadata ->> 'size')::bigint = p_byte_size
        and lower(stored_object.metadata ->> 'mimetype') = p_media_type
    ) then
      raise exception using errcode = '55000', message = 'SYNC_SNAPSHOT_OBJECT_NOT_FOUND';
    end if;

    insert into governance.raw_snapshots (
      source_endpoint_id,
      first_sync_run_id,
      previous_snapshot_id,
      storage_bucket,
      storage_object_path,
      sha256,
      media_type,
      byte_size,
      http_status,
      etag,
      source_last_modified_at,
      retrieved_at,
      retrieval_metadata
    ) values (
      p_source_endpoint_id,
      p_run_id,
      current_snapshot.id,
      p_storage_bucket,
      p_storage_object_path,
      p_sha256,
      p_media_type,
      p_byte_size,
      p_http_status,
      nullif(btrim(p_etag), ''),
      p_last_modified,
      p_retrieved_at,
      jsonb_build_object('retrievalMethod', source_record.retrieval_method)
    )
    on conflict (source_endpoint_id, sha256) do nothing
    returning id into inserted_snapshot_id;

    if inserted_snapshot_id is null then
      select snapshot.id into selected_snapshot_id
      from governance.raw_snapshots as snapshot
      where snapshot.source_endpoint_id = p_source_endpoint_id
        and snapshot.sha256 = p_sha256;
      is_duplicate := true;
    else
      selected_snapshot_id := inserted_snapshot_id;
    end if;
  else
    raise exception using errcode = '22023', message = 'SYNC_HTTP_STATUS_INVALID';
  end if;

  insert into governance.sync_run_snapshots (
    sync_run_id,
    raw_snapshot_id,
    is_duplicate_content
  ) values (
    p_run_id,
    selected_snapshot_id,
    is_duplicate
  );

  update governance.sync_runs
  set status = 'snapshot_preserved'
  where id = p_run_id;

  update governance.source_endpoints
  set
    consecutive_failure_count = 0,
    last_succeeded_at = p_retrieved_at,
    last_failure_code = null,
    disabled_until = null,
    next_sync_at = current_timestamp + refresh_interval
  where id = p_source_endpoint_id;

  delete from governance.sync_source_leases
  where sync_run_id = p_run_id and lease_token = p_lease_token;

  insert into governance.sync_events (
    sync_run_id,
    source_endpoint_id,
    event_type,
    event_detail
  ) values (
    p_run_id,
    p_source_endpoint_id,
    case when p_http_status = 304
      then 'retrieval.not_modified'
      else 'retrieval.snapshot_preserved'
    end,
    jsonb_build_object(
      'httpStatus', p_http_status,
      'duplicateContent', is_duplicate,
      'snapshotId', selected_snapshot_id
    )
  );

  raw_snapshot_id := selected_snapshot_id;
  duplicate_content := is_duplicate;
  unchanged_response := p_http_status = 304;
  return next;
end;
$$;

create function public.fail_governance_sync_run(
  p_run_id uuid,
  p_source_endpoint_id uuid,
  p_lease_token uuid,
  p_error_code text,
  p_error_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_failure_count integer;
  retry_at timestamptz;
  expected_error_detail text;
begin
  expected_error_detail := case p_error_code
    when 'FETCH_ABORTED' then 'The source retrieval was cancelled.'
    when 'FETCH_FAILED' then 'The approved source could not be retrieved.'
    when 'FETCH_TIMEOUT' then 'The approved source retrieval timed out.'
    when 'HTTP_STATUS_INVALID' then 'The approved source returned an unsupported HTTP status.'
    when 'MIME_TYPE_INVALID' then 'The approved source returned an unexpected media type.'
    when 'REDIRECT_INVALID' then 'The approved source returned an unsafe redirect.'
    when 'RESPONSE_EMPTY' then 'The approved source returned no content.'
    when 'RESPONSE_TOO_LARGE' then 'The approved source response exceeded its byte limit.'
    when 'SNAPSHOT_RECORD_FAILED' then 'The source snapshot metadata could not be recorded.'
    when 'SNAPSHOT_UPLOAD_FAILED' then 'The source snapshot bytes could not be preserved.'
    when 'SOURCE_CONTRACT_INVALID' then 'The approved source retrieval contract is invalid.'
    when 'SOURCE_URL_INVALID' then 'The approved source URL is invalid.'
  end;

  if expected_error_detail is null or p_error_detail is distinct from expected_error_detail then
    raise exception using errcode = '22023', message = 'SYNC_FAILURE_DETAIL_INVALID';
  end if;

  if not exists (
    select 1
    from governance.sync_source_leases as active_lease
    where active_lease.sync_run_id = p_run_id
      and active_lease.source_endpoint_id = p_source_endpoint_id
      and active_lease.lease_token = p_lease_token
      and active_lease.expires_at > current_timestamp
  ) then
    raise exception using errcode = '55000', message = 'SYNC_LEASE_NOT_ACTIVE';
  end if;

  select consecutive_failure_count + 1
  into next_failure_count
  from governance.source_endpoints
  where id = p_source_endpoint_id
  for update;

  if next_failure_count is null then
    raise exception using errcode = '55000', message = 'SYNC_SOURCE_ENDPOINT_NOT_FOUND';
  end if;

  update governance.sync_runs
  set
    status = 'failed',
    completed_at = current_timestamp,
    error_code = p_error_code,
    error_detail = p_error_detail
  where id = p_run_id
    and source_endpoint_id = p_source_endpoint_id
    and status = 'retrieving';

  if not found then
    raise exception using errcode = '55000', message = 'SYNC_RUN_NOT_RETRIEVING';
  end if;

  retry_at := current_timestamp + least(
    interval '24 hours',
    interval '5 minutes' * power(2, least(next_failure_count, 8))
  );

  update governance.source_endpoints
  set
    consecutive_failure_count = next_failure_count,
    last_failed_at = current_timestamp,
    last_failure_code = p_error_code,
    disabled_until = retry_at,
    next_sync_at = retry_at
  where id = p_source_endpoint_id;

  delete from governance.sync_source_leases
  where sync_run_id = p_run_id and lease_token = p_lease_token;

  insert into governance.sync_events (
    sync_run_id,
    source_endpoint_id,
    event_type,
    severity,
    event_detail
  ) values (
    p_run_id,
    p_source_endpoint_id,
    'retrieval.failed',
    'error',
    jsonb_build_object('errorCode', p_error_code, 'retryAt', retry_at)
  );
end;
$$;

revoke all on function public.claim_due_governance_sync_sources(text, integer, integer)
from public, anon, authenticated;
revoke all on function public.heartbeat_governance_sync_lease(uuid, uuid, integer)
from public, anon, authenticated;
revoke all on function public.record_governance_sync_snapshot(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  smallint
)
from public, anon, authenticated;
revoke all on function public.fail_governance_sync_run(uuid, uuid, uuid, text, text)
from public, anon, authenticated;

grant execute on function public.claim_due_governance_sync_sources(text, integer, integer)
to service_role;
grant execute on function public.heartbeat_governance_sync_lease(uuid, uuid, integer)
to service_role;
grant execute on function public.record_governance_sync_snapshot(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  smallint
)
to service_role;
grant execute on function public.fail_governance_sync_run(uuid, uuid, uuid, text, text)
to service_role;

comment on function public.claim_due_governance_sync_sources(text, integer, integer) is
  'Atomically claims reviewed, due official sources with PostgreSQL row locks and short worker leases.';
comment on function public.record_governance_sync_snapshot(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  text,
  timestamptz,
  timestamptz,
  smallint
) is
  'Records an immutable content-addressed raw snapshot or links a prior snapshot for HTTP 304.';
comment on function public.fail_governance_sync_run(uuid, uuid, uuid, text, text) is
  'Fails a retrieval run, records a sanitized audit event, and applies bounded exponential retry backoff.';
