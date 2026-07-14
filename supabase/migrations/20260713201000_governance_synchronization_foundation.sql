insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'governance-raw-snapshots',
  'governance-raw-snapshots',
  false,
  104857600,
  array[
    'application/json',
    'application/geo+json',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/html',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table governance.source_endpoints (
  id uuid primary key default gen_random_uuid(),
  reference_source_id uuid
    references governance.reference_sources (id) on delete restrict,
  import_batch_id uuid references governance.import_batches (id) on delete restrict,
  authority_id uuid references governance.authorities (id) on delete restrict,
  source_key text not null,
  source_kind text not null,
  dataset_kind text not null,
  retrieval_method text not null,
  retrieval_format text not null,
  endpoint_url text,
  repository_path text,
  parser_key text not null,
  parser_contract_version text not null,
  secret_reference text,
  expected_media_types text[] not null default '{}'::text[],
  refresh_interval interval,
  next_sync_at timestamptz,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  last_verified_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_endpoints_source_key_check check (
    source_key = btrim(source_key) and source_key ~ '^[a-z][a-z0-9:_-]{1,159}$'
  ),
  constraint source_endpoints_dataset_kind_check check (
    dataset_kind in (
      'bootstrap_bundle',
      'authority',
      'state',
      'district',
      'taluka',
      'local_body',
      'ward',
      'department',
      'office',
      'officer_role',
      'officer',
      'officer_assignment',
      'utility',
      'emergency_contact',
      'boundary',
      'routing_reference'
    )
  ),
  constraint source_endpoints_source_kind_check check (
    source_kind in (
      'repository_bootstrap',
      'official_api',
      'official_file',
      'official_web'
    )
  ),
  constraint source_endpoints_retrieval_method_check check (
    retrieval_method in ('http_get', 'api', 'manual_upload')
  ),
  constraint source_endpoints_retrieval_format_check check (
    retrieval_format in ('csv', 'geojson', 'html', 'json', 'pdf', 'text', 'xlsx')
  ),
  constraint source_endpoints_url_check check (
    endpoint_url is null
    or (endpoint_url = btrim(endpoint_url) and endpoint_url ~ '^https://[^[:space:]]+$')
  ),
  constraint source_endpoints_repository_path_check check (
    repository_path is null
    or (
      repository_path = btrim(repository_path)
      and repository_path ~ '^resources/governance/[A-Za-z0-9_./-]+$'
      and repository_path !~ '(^|/)\.\.(/|$)'
    )
  ),
  constraint source_endpoints_location_shape_check check (
    (
      source_kind = 'repository_bootstrap'
      and reference_source_id is null
      and import_batch_id is not null
      and endpoint_url is null
      and repository_path is not null
      and retrieval_method = 'manual_upload'
    )
    or (
      source_kind <> 'repository_bootstrap'
      and reference_source_id is not null
      and import_batch_id is null
      and endpoint_url is not null
      and repository_path is null
    )
  ),
  constraint source_endpoints_parser_key_check check (
    parser_key ~ '^[a-z][a-z0-9_.:-]{1,159}$'
  ),
  constraint source_endpoints_parser_contract_version_check check (
    parser_contract_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint source_endpoints_secret_reference_check check (
    secret_reference is null
    or (
      secret_reference ~ '^[a-z][a-z0-9_.:-]{1,255}$'
      and secret_reference !~ '://'
      and secret_reference !~ '[=?&[:space:]]'
    )
  ),
  constraint source_endpoints_refresh_interval_check check (
    refresh_interval is null or refresh_interval > interval '0 seconds'
  ),
  constraint source_endpoints_status_check check (
    status in ('draft', 'active', 'paused', 'retired')
  ),
  constraint source_endpoints_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint source_endpoints_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint source_endpoints_active_check check (
    status <> 'active'
    or (
      verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and (
        source_kind = 'repository_bootstrap'
        or retrieval_method = 'manual_upload'
        or (refresh_interval is not null and next_sync_at is not null)
      )
    )
  ),
  constraint source_endpoints_source_key_unique unique (source_key)
);

create table governance.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_endpoint_id uuid not null
    references governance.source_endpoints (id) on delete restrict,
  trigger_kind text not null,
  source_contract_snapshot jsonb not null,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  records_discovered integer not null default 0,
  records_valid integer not null default 0,
  records_rejected integer not null default 0,
  changes_detected integer not null default 0,
  reviews_required integer not null default 0,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_runs_trigger_kind_check check (
    trigger_kind in ('scheduled', 'manual', 'bootstrap')
  ),
  constraint sync_runs_source_contract_check check (
    jsonb_typeof(source_contract_snapshot) = 'object'
    and not (source_contract_snapshot ? 'secretReference')
    and not (source_contract_snapshot ? 'secret_reference')
  ),
  constraint sync_runs_status_check check (
    status in (
      'queued',
      'retrieving',
      'snapshot_preserved',
      'normalizing',
      'matching',
      'detecting_changes',
      'awaiting_review',
      'approved',
      'publishing',
      'published',
      'rejected',
      'failed'
    )
  ),
  constraint sync_runs_counts_check check (
    records_discovered >= 0
    and records_valid >= 0
    and records_rejected >= 0
    and changes_detected >= 0
    and reviews_required >= 0
    and records_valid + records_rejected <= records_discovered
  ),
  constraint sync_runs_time_check check (
    completed_at is null or (started_at is not null and completed_at >= started_at)
  ),
  constraint sync_runs_terminal_check check (
    (status in ('published', 'rejected', 'failed') and completed_at is not null)
    or (status not in ('published', 'rejected', 'failed') and completed_at is null)
  ),
  constraint sync_runs_error_check check (
    (status = 'failed' and error_code is not null)
    or (status <> 'failed' and error_code is null and error_detail is null)
  )
);

create table governance.raw_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_endpoint_id uuid not null
    references governance.source_endpoints (id) on delete restrict,
  first_sync_run_id uuid not null unique references governance.sync_runs (id) on delete restrict,
  previous_snapshot_id uuid references governance.raw_snapshots (id) on delete restrict,
  storage_bucket text not null default 'governance-raw-snapshots',
  storage_object_path text not null,
  sha256 text not null,
  media_type text not null,
  byte_size bigint not null,
  http_status smallint,
  etag text,
  source_last_modified_at timestamptz,
  retrieved_at timestamptz not null,
  retrieval_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint raw_snapshots_bucket_check check (storage_bucket = 'governance-raw-snapshots'),
  constraint raw_snapshots_object_path_check check (
    storage_object_path = btrim(storage_object_path)
    and char_length(storage_object_path) between 1 and 1000
    and storage_object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint raw_snapshots_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint raw_snapshots_media_type_check check (
    media_type = lower(btrim(media_type)) and media_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
  ),
  constraint raw_snapshots_byte_size_check check (byte_size >= 0),
  constraint raw_snapshots_http_status_check check (
    http_status is null or http_status between 100 and 599
  ),
  constraint raw_snapshots_metadata_check check (jsonb_typeof(retrieval_metadata) = 'object'),
  constraint raw_snapshots_previous_check check (previous_snapshot_id is distinct from id),
  constraint raw_snapshots_storage_object_unique unique (storage_bucket, storage_object_path),
  constraint raw_snapshots_source_hash_unique unique (source_endpoint_id, sha256)
);

create table governance.sync_run_snapshots (
  sync_run_id uuid primary key references governance.sync_runs (id) on delete restrict,
  raw_snapshot_id uuid not null references governance.raw_snapshots (id) on delete restrict,
  is_duplicate_content boolean not null default false,
  linked_at timestamptz not null default now()
);

create table governance.sync_candidates (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references governance.sync_runs (id) on delete restrict,
  raw_snapshot_id uuid not null references governance.raw_snapshots (id) on delete restrict,
  source_record_key text not null,
  source_record_locator text not null,
  entity_type text not null,
  source_record_sha256 text not null,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  validation_status text not null default 'pending',
  validation_messages jsonb not null default '[]'::jsonb,
  is_placeholder boolean not null default false,
  matched_table text,
  matched_record_id uuid,
  match_method text not null default 'none',
  match_confidence numeric(7, 6) not null default 0,
  match_status text not null default 'unmatched',
  alternative_target_record_ids uuid[] not null default '{}'::uuid[],
  match_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_candidates_source_record_key_check check (
    source_record_key = btrim(source_record_key)
    and char_length(source_record_key) between 1 and 500
  ),
  constraint sync_candidates_source_record_sha256_check check (
    source_record_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint sync_candidates_source_record_locator_check check (
    source_record_locator = btrim(source_record_locator)
    and char_length(source_record_locator) between 1 and 1000
  ),
  constraint sync_candidates_entity_type_check check (
    entity_type in (
      'authority',
      'state',
      'district',
      'taluka',
      'local_body',
      'ward',
      'department',
      'office',
      'officer_role',
      'officer',
      'officer_assignment',
      'utility',
      'emergency_contact',
      'jurisdiction_boundary',
      'routing_reference'
    )
  ),
  constraint sync_candidates_raw_payload_check check (jsonb_typeof(raw_payload) = 'object'),
  constraint sync_candidates_normalized_payload_check check (
    normalized_payload is null or jsonb_typeof(normalized_payload) = 'object'
  ),
  constraint sync_candidates_validation_status_check check (
    validation_status in ('pending', 'valid', 'valid_with_warnings', 'rejected')
  ),
  constraint sync_candidates_validation_messages_check check (
    jsonb_typeof(validation_messages) = 'array'
  ),
  constraint sync_candidates_matched_table_check check (
    matched_table is null or matched_table ~ '^governance\.[a-z][a-z0-9_]*$'
  ),
  constraint sync_candidates_match_method_check check (
    match_method in (
      'official_identifier',
      'reviewed_crosswalk',
      'scoped_natural_key',
      'reviewer_selected',
      'none'
    )
  ),
  constraint sync_candidates_match_confidence_check check (
    match_confidence between 0 and 1
  ),
  constraint sync_candidates_match_status_check check (
    match_status in ('matched', 'new_entity', 'ambiguous', 'unmatched')
  ),
  constraint sync_candidates_match_target_check check (
    (matched_table is null and matched_record_id is null)
    or (matched_table is not null and matched_record_id is not null)
  ),
  constraint sync_candidates_match_evidence_check check (
    jsonb_typeof(match_evidence) = 'object'
    and (
      (
        match_status = 'matched'
        and match_method <> 'none'
        and matched_record_id is not null
      )
      or (
        match_status = 'new_entity'
        and matched_record_id is null
        and cardinality(alternative_target_record_ids) = 0
      )
      or (
        match_status = 'ambiguous'
        and match_method <> 'none'
        and matched_record_id is null
        and cardinality(alternative_target_record_ids) >= 2
      )
      or (
        match_status = 'unmatched'
        and match_method = 'none'
        and match_confidence = 0
        and matched_record_id is null
        and cardinality(alternative_target_record_ids) = 0
      )
    )
  ),
  constraint sync_candidates_run_record_unique unique (sync_run_id, source_record_key)
);

create table governance.sync_change_items (
  id uuid primary key default gen_random_uuid(),
  sync_candidate_id uuid not null
    references governance.sync_candidates (id) on delete restrict,
  detection_status text not null,
  change_kind text not null,
  target_table text,
  target_record_id uuid,
  proposed_changes jsonb not null default '{}'::jsonb,
  disposition text not null default 'normalized',
  requested_verification_status text not null default 'unverified',
  requested_routing_eligibility boolean not null default false,
  status text not null default 'detected',
  applied_at timestamptz,
  applied_by uuid references auth.users (id) on delete set null,
  failure_code text,
  failure_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_change_items_detection_status_check check (
    detection_status in ('new', 'changed', 'unchanged', 'missing', 'conflict')
  ),
  constraint sync_change_items_change_kind_check check (
    change_kind in (
      'create',
      'update',
      'append_version',
      'close_version',
      'deactivate',
      'quarantine',
      'reference_only',
      'no_change'
    )
  ),
  constraint sync_change_items_target_table_check check (
    target_table is null or target_table ~ '^governance\.[a-z][a-z0-9_]*$'
  ),
  constraint sync_change_items_target_check check (
    (change_kind in ('create', 'quarantine', 'reference_only') and target_record_id is null)
    or (change_kind = 'no_change' and target_table is not null and target_record_id is not null)
    or (change_kind in ('update', 'append_version', 'close_version', 'deactivate')
      and target_table is not null and target_record_id is not null)
  ),
  constraint sync_change_items_proposed_changes_check check (
    jsonb_typeof(proposed_changes) = 'object'
  ),
  constraint sync_change_items_disposition_check check (
    disposition in ('normalized', 'quarantined', 'reference_only')
  ),
  constraint sync_change_items_verification_status_check check (
    requested_verification_status in (
      'verified',
      'partially_verified',
      'unverified',
      'placeholder'
    )
  ),
  constraint sync_change_items_quarantine_check check (
    disposition <> 'quarantined'
    or (
      requested_verification_status in ('unverified', 'placeholder')
      and not requested_routing_eligibility
    )
  ),
  constraint sync_change_items_status_check check (
    status in ('detected', 'review_required', 'approved', 'rejected', 'applied', 'failed')
  ),
  constraint sync_change_items_application_check check (
    (status = 'applied' and applied_at is not null and applied_by is not null)
    or (status <> 'applied' and applied_at is null and applied_by is null)
  ),
  constraint sync_change_items_failure_check check (
    (status = 'failed' and failure_code is not null)
    or (status <> 'failed' and failure_code is null and failure_detail is null)
  ),
  constraint sync_change_items_candidate_unique unique (sync_candidate_id)
);

create table governance.sync_review_items (
  id uuid primary key default gen_random_uuid(),
  sync_change_item_id uuid not null unique
    references governance.sync_change_items (id) on delete restrict,
  review_status text not null default 'pending',
  review_reason text not null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_review_items_status_check check (
    review_status in ('pending', 'approved', 'rejected', 'needs_information')
  ),
  constraint sync_review_items_reason_check check (
    review_reason = btrim(review_reason) and char_length(review_reason) between 1 and 1000
  ),
  constraint sync_review_items_reviewed_check check (
    (review_status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (review_status in ('approved', 'rejected', 'needs_information')
      and reviewed_at is not null and reviewed_by is not null)
  )
);

create table governance.sync_review_events (
  id uuid primary key default gen_random_uuid(),
  sync_review_item_id uuid not null
    references governance.sync_review_items (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  verification_decision text,
  routing_eligibility_decision text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint sync_review_events_action_check check (
    action in ('requested', 'commented', 'approved', 'rejected', 'needs_information')
  ),
  constraint sync_review_events_verification_decision_check check (
    verification_decision is null
    or verification_decision in (
      'mark_verified',
      'mark_partially_verified',
      'retain_unverified',
      'mark_placeholder'
    )
  ),
  constraint sync_review_events_routing_decision_check check (
    routing_eligibility_decision is null
    or routing_eligibility_decision in ('enable', 'retain_disabled')
  ),
  constraint sync_review_events_decision_shape_check check (
    (
      action in ('requested', 'commented', 'needs_information')
      and verification_decision is null
      and routing_eligibility_decision is null
    )
    or (
      action in ('approved', 'rejected')
      and verification_decision is not null
      and routing_eligibility_decision is not null
    )
  ),
  constraint sync_review_events_notes_check check (
    notes is null or (notes = btrim(notes) and char_length(notes) between 1 and 2000)
  )
);

create index source_endpoints_schedule_idx
  on governance.source_endpoints (status, next_sync_at)
  where status = 'active';
create index source_endpoints_authority_dataset_idx
  on governance.source_endpoints (authority_id, dataset_kind, status);
create index sync_runs_source_created_idx
  on governance.sync_runs (source_endpoint_id, created_at desc);
create index raw_snapshots_sha256_idx on governance.raw_snapshots (sha256);
create index raw_snapshots_retrieved_idx on governance.raw_snapshots (retrieved_at desc);
create index sync_run_snapshots_snapshot_idx
  on governance.sync_run_snapshots (raw_snapshot_id, linked_at);
create index sync_candidates_match_idx
  on governance.sync_candidates (match_status, matched_table, matched_record_id);
create index sync_candidates_validation_idx
  on governance.sync_candidates (validation_status, raw_snapshot_id);
create index sync_candidates_run_idx
  on governance.sync_candidates (sync_run_id, validation_status, match_status);
create index sync_change_items_status_idx
  on governance.sync_change_items (status, detection_status, created_at);
create index sync_review_items_queue_idx
  on governance.sync_review_items (review_status, requested_at)
  where review_status = 'pending';
create index sync_review_events_review_time_idx
  on governance.sync_review_events (sync_review_item_id, occurred_at, id);

create function governance.validate_source_endpoint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.expected_media_types) as media_type
    where media_type is null
      or media_type <> lower(btrim(media_type))
      or media_type !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
  ) or cardinality(new.expected_media_types) <> (
    select count(distinct media_type)
    from unnest(new.expected_media_types) as media_type
  ) then
    raise exception using errcode = '23514', message = 'SYNC_EXPECTED_MEDIA_TYPES_INVALID';
  end if;

  if new.status = 'active'
    and new.source_kind = 'repository_bootstrap'
    and not exists (
      select 1
      from governance.import_batches as import_batch
      where import_batch.id = new.import_batch_id
        and import_batch.status = 'imported'
        and new.repository_path like import_batch.canonical_root || '/%'
    ) then
    raise exception using errcode = '23514', message = 'SYNC_ACTIVE_BOOTSTRAP_BATCH_INVALID';
  end if;

  if new.status = 'active' and not exists (
    select 1
    from governance.reference_sources as source
    where source.id = new.reference_source_id
      and source.status = 'active'
      and new.source_kind <> 'repository_bootstrap'
      and source.source_type = 'official'
  ) then
    if new.source_kind <> 'repository_bootstrap' then
      raise exception using errcode = '23514', message = 'SYNC_ACTIVE_SOURCE_TYPE_INVALID';
    end if;
  end if;

  return new;
end;
$$;

create function governance.guard_sync_run_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_allowed boolean;
begin
  if new.source_endpoint_id is distinct from old.source_endpoint_id
    or new.trigger_kind is distinct from old.trigger_kind
    or new.source_contract_snapshot is distinct from old.source_contract_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'SYNC_RUN_IDENTITY_IMMUTABLE';
  end if;
  if old.status in ('published', 'rejected', 'failed')
    and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception using errcode = '55000', message = 'SYNC_RUN_TERMINAL_STATE_IMMUTABLE';
  end if;

  transition_allowed := new.status = old.status or case old.status
    when 'queued' then new.status in ('retrieving', 'failed')
    when 'retrieving' then new.status in ('snapshot_preserved', 'failed')
    when 'snapshot_preserved' then new.status in ('normalizing', 'failed')
    when 'normalizing' then new.status in ('matching', 'failed')
    when 'matching' then new.status in ('detecting_changes', 'failed')
    when 'detecting_changes' then new.status in ('awaiting_review', 'failed')
    when 'awaiting_review' then new.status in ('approved', 'rejected')
    when 'approved' then new.status in ('publishing', 'failed')
    when 'publishing' then new.status in ('published', 'failed')
    else false
  end;
  if not transition_allowed then
    raise exception using errcode = '55000', message = 'SYNC_RUN_TRANSITION_INVALID';
  end if;

  return new;
end;
$$;

create function governance.validate_sync_run_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'queued' then
    raise exception using errcode = '55000', message = 'SYNC_RUN_MUST_START_QUEUED';
  end if;
  select jsonb_build_object(
    'sourceEndpointId', source.id,
    'referenceSourceId', source.reference_source_id,
    'importBatchId', source.import_batch_id,
    'authorityId', source.authority_id,
    'sourceKey', source.source_key,
    'sourceKind', source.source_kind,
    'datasetKind', source.dataset_kind,
    'retrievalMethod', source.retrieval_method,
    'format', source.retrieval_format,
    'endpointUrl', source.endpoint_url,
    'repositoryPath', source.repository_path,
    'parserKey', source.parser_key,
    'parserContractVersion', source.parser_contract_version,
    'expectedMediaTypes', to_jsonb(source.expected_media_types)
  )
  into new.source_contract_snapshot
  from governance.source_endpoints as source
  where source.id = new.source_endpoint_id;
  if new.source_contract_snapshot is null then
    raise exception using errcode = '23503', message = 'SYNC_SOURCE_ENDPOINT_NOT_FOUND';
  end if;
  return new;
end;
$$;

create function governance.validate_raw_snapshot_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.sync_runs as sync_run
    where sync_run.id = new.first_sync_run_id
      and sync_run.source_endpoint_id = new.source_endpoint_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_SNAPSHOT_SOURCE_MISMATCH';
  end if;
  if new.previous_snapshot_id is not null and not exists (
    select 1
    from governance.raw_snapshots as previous_snapshot
    where previous_snapshot.id = new.previous_snapshot_id
      and previous_snapshot.source_endpoint_id = new.source_endpoint_id
      and previous_snapshot.retrieved_at < new.retrieved_at
  ) then
    raise exception using errcode = '23514', message = 'SYNC_PREVIOUS_SNAPSHOT_INVALID';
  end if;

  return new;
end;
$$;

create function governance.validate_sync_run_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.sync_runs as sync_run
    inner join governance.raw_snapshots as snapshot
      on snapshot.id = new.raw_snapshot_id
    where sync_run.id = new.sync_run_id
      and sync_run.source_endpoint_id = snapshot.source_endpoint_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_RUN_SNAPSHOT_SOURCE_MISMATCH';
  end if;
  if new.is_duplicate_content and exists (
    select 1
    from governance.raw_snapshots as snapshot
    where snapshot.id = new.raw_snapshot_id
      and snapshot.first_sync_run_id = new.sync_run_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_FIRST_SNAPSHOT_NOT_DUPLICATE';
  end if;

  return new;
end;
$$;

create function governance.guard_sync_candidate_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array[
        'matched_table',
        'matched_record_id',
        'match_method',
        'match_confidence',
        'match_status',
        'alternative_target_record_ids',
        'match_evidence',
        'updated_at'
      ]
  ) is distinct from (
    to_jsonb(old)
      - array[
        'matched_table',
        'matched_record_id',
        'match_method',
        'match_confidence',
        'match_status',
        'alternative_target_record_ids',
        'match_evidence',
        'updated_at'
      ]
  ) then
    raise exception using errcode = '55000', message = 'SYNC_CANDIDATE_SOURCE_IMMUTABLE';
  end if;
  if old.match_status in ('matched', 'new_entity')
    and new.match_status is distinct from old.match_status then
    raise exception using errcode = '55000', message = 'SYNC_CANDIDATE_MATCH_TERMINAL';
  end if;

  return new;
end;
$$;

create function governance.validate_sync_candidate_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.sync_run_snapshots as run_snapshot
    where run_snapshot.sync_run_id = new.sync_run_id
      and run_snapshot.raw_snapshot_id = new.raw_snapshot_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_CANDIDATE_RUN_SNAPSHOT_MISMATCH';
  end if;
  return new;
end;
$$;

create function governance.guard_sync_change_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate governance.sync_candidates%rowtype;
  latest_review_event governance.sync_review_events%rowtype;
  expected_verification_decision text;
  expected_routing_decision text;
  candidate_run_status text;
begin
  if (
    to_jsonb(new)
      - array['status', 'applied_at', 'applied_by', 'failure_code', 'failure_detail', 'updated_at']
  ) is distinct from (
    to_jsonb(old)
      - array['status', 'applied_at', 'applied_by', 'failure_code', 'failure_detail', 'updated_at']
  ) then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_PROPOSAL_IMMUTABLE';
  end if;
  if old.status in ('rejected', 'applied', 'failed')
    and new.status is distinct from old.status then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_TERMINAL_STATE_IMMUTABLE';
  end if;
  if not (
    new.status = old.status
    or (old.status = 'detected' and new.status in ('review_required', 'failed'))
    or (old.status = 'review_required' and new.status in ('approved', 'rejected', 'failed'))
    or (old.status = 'approved' and new.status in ('applied', 'failed'))
  ) then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_TRANSITION_INVALID';
  end if;
  if new.status = 'rejected' and not exists (
    select 1
    from governance.sync_review_items as review
    where review.sync_change_item_id = new.id
      and review.review_status = 'rejected'
  ) then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_REQUIRES_REJECTED_REVIEW';
  end if;
  if new.status in ('approved', 'applied') and not exists (
    select 1
    from governance.sync_review_items as review
    where review.sync_change_item_id = new.id
      and review.review_status = 'approved'
  ) then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_REQUIRES_APPROVED_REVIEW';
  end if;
  if new.status in ('approved', 'applied') then
    select sync_candidate.* into candidate
    from governance.sync_candidates as sync_candidate
    where sync_candidate.id = new.sync_candidate_id;

    select sync_run.status into candidate_run_status
    from governance.sync_runs as sync_run
    where sync_run.id = candidate.sync_run_id;
    if new.status = 'approved'
      and candidate_run_status not in ('awaiting_review', 'approved') then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_RUN_NOT_REVIEWABLE';
    end if;
    if new.status = 'applied' and candidate_run_status <> 'publishing' then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_RUN_NOT_PUBLISHING';
    end if;

    if candidate.validation_status not in ('valid', 'valid_with_warnings') then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_VALIDATION_NOT_ELIGIBLE';
    end if;
    if candidate.match_status in ('ambiguous', 'unmatched')
      and new.disposition = 'normalized' then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_MATCH_NOT_ELIGIBLE';
    end if;
    if new.change_kind = 'create' and candidate.match_status <> 'new_entity' then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_CREATE_MATCH_INVALID';
    end if;
    if new.change_kind in ('update', 'append_version', 'close_version', 'deactivate', 'no_change')
      and candidate.match_status <> 'matched' then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_TARGET_MATCH_INVALID';
    end if;
    if candidate.is_placeholder and (
      new.disposition <> 'quarantined'
      or new.requested_verification_status not in ('unverified', 'placeholder')
      or new.requested_routing_eligibility
    ) then
      raise exception using errcode = '55000', message = 'SYNC_PLACEHOLDER_PROMOTION_FORBIDDEN';
    end if;

    select review_event.* into latest_review_event
    from governance.sync_review_events as review_event
    inner join governance.sync_review_items as review_item
      on review_item.id = review_event.sync_review_item_id
    where review_item.sync_change_item_id = new.id
      and review_event.action in ('approved', 'rejected')
    order by review_event.occurred_at desc, review_event.id desc
    limit 1;

    expected_verification_decision := case new.requested_verification_status
      when 'verified' then 'mark_verified'
      when 'partially_verified' then 'mark_partially_verified'
      when 'unverified' then 'retain_unverified'
      when 'placeholder' then 'mark_placeholder'
    end;
    expected_routing_decision := case
      when new.requested_routing_eligibility then 'enable'
      else 'retain_disabled'
    end;

    if latest_review_event.id is null
      or latest_review_event.action <> 'approved'
      or latest_review_event.verification_decision <> expected_verification_decision
      or latest_review_event.routing_eligibility_decision <> expected_routing_decision then
      raise exception using errcode = '55000', message = 'SYNC_CHANGE_APPROVED_EVENT_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

create function governance.validate_sync_change_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'detected' then
    raise exception using errcode = '55000', message = 'SYNC_CHANGE_MUST_START_DETECTED';
  end if;
  return new;
end;
$$;

create function governance.guard_sync_review_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array['review_status', 'reviewed_at', 'reviewed_by', 'reviewer_notes', 'updated_at']
  ) is distinct from (
    to_jsonb(old)
      - array['review_status', 'reviewed_at', 'reviewed_by', 'reviewer_notes', 'updated_at']
  ) then
    raise exception using errcode = '55000', message = 'SYNC_REVIEW_IDENTITY_IMMUTABLE';
  end if;
  if old.review_status in ('approved', 'rejected')
    and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception using errcode = '55000', message = 'SYNC_REVIEW_TERMINAL_STATE_IMMUTABLE';
  end if;
  if not (
    new.review_status = old.review_status
    or (old.review_status = 'pending'
      and new.review_status in ('approved', 'rejected', 'needs_information'))
    or (old.review_status = 'needs_information'
      and new.review_status in ('pending', 'approved', 'rejected'))
  ) then
    raise exception using errcode = '55000', message = 'SYNC_REVIEW_TRANSITION_INVALID';
  end if;
  if new.review_status in ('approved', 'rejected', 'needs_information') and not exists (
    select 1
    from governance.sync_review_events as review_event
    where review_event.sync_review_item_id = new.id
      and review_event.action = new.review_status
      and review_event.actor_user_id = new.reviewed_by
      and review_event.occurred_at <= new.reviewed_at
  ) then
    raise exception using errcode = '55000', message = 'SYNC_REVIEW_DECISION_EVENT_REQUIRED';
  end if;

  return new;
end;
$$;

create function governance.validate_sync_review_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_status <> 'pending' then
    raise exception using errcode = '55000', message = 'SYNC_REVIEW_MUST_START_PENDING';
  end if;
  return new;
end;
$$;

create trigger source_endpoints_validate
before insert or update on governance.source_endpoints
for each row execute function governance.validate_source_endpoint();
create trigger source_endpoints_set_updated_at
before update on governance.source_endpoints
for each row execute function private.set_updated_at();
create trigger source_endpoints_reject_delete
before delete on governance.source_endpoints
for each row execute function governance.reject_historical_delete();

create trigger sync_runs_guard_update
before update on governance.sync_runs
for each row execute function governance.guard_sync_run_update();
create trigger sync_runs_validate_insert
before insert on governance.sync_runs
for each row execute function governance.validate_sync_run_insert();
create trigger sync_runs_set_updated_at
before update on governance.sync_runs
for each row execute function private.set_updated_at();
create trigger sync_runs_reject_delete
before delete on governance.sync_runs
for each row execute function governance.reject_historical_delete();

create trigger raw_snapshots_reject_update
before update on governance.raw_snapshots
for each row execute function governance.reject_import_ledger_update();
create trigger raw_snapshots_reject_delete
before delete on governance.raw_snapshots
for each row execute function governance.reject_historical_delete();

create trigger raw_snapshots_validate_scope
before insert on governance.raw_snapshots
for each row execute function governance.validate_raw_snapshot_scope();

create trigger sync_run_snapshots_validate
before insert or update on governance.sync_run_snapshots
for each row execute function governance.validate_sync_run_snapshot();
create trigger sync_run_snapshots_reject_update
before update on governance.sync_run_snapshots
for each row execute function governance.reject_import_ledger_update();
create trigger sync_run_snapshots_reject_delete
before delete on governance.sync_run_snapshots
for each row execute function governance.reject_historical_delete();

create trigger sync_candidates_guard_update
before update on governance.sync_candidates
for each row execute function governance.guard_sync_candidate_update();
create trigger sync_candidates_validate_scope
before insert or update of sync_run_id, raw_snapshot_id on governance.sync_candidates
for each row execute function governance.validate_sync_candidate_scope();
create trigger sync_candidates_set_updated_at
before update on governance.sync_candidates
for each row execute function private.set_updated_at();
create trigger sync_candidates_reject_delete
before delete on governance.sync_candidates
for each row execute function governance.reject_historical_delete();

create trigger sync_change_items_guard_update
before update on governance.sync_change_items
for each row execute function governance.guard_sync_change_update();
create trigger sync_change_items_validate_insert
before insert on governance.sync_change_items
for each row execute function governance.validate_sync_change_insert();
create trigger sync_change_items_set_updated_at
before update on governance.sync_change_items
for each row execute function private.set_updated_at();
create trigger sync_change_items_reject_delete
before delete on governance.sync_change_items
for each row execute function governance.reject_historical_delete();

create trigger sync_review_items_guard_update
before update on governance.sync_review_items
for each row execute function governance.guard_sync_review_update();
create trigger sync_review_items_validate_insert
before insert on governance.sync_review_items
for each row execute function governance.validate_sync_review_insert();
create trigger sync_review_items_set_updated_at
before update on governance.sync_review_items
for each row execute function private.set_updated_at();
create trigger sync_review_items_reject_delete
before delete on governance.sync_review_items
for each row execute function governance.reject_historical_delete();

create trigger sync_review_events_reject_update
before update on governance.sync_review_events
for each row execute function governance.reject_import_ledger_update();
create trigger sync_review_events_reject_delete
before delete on governance.sync_review_events
for each row execute function governance.reject_historical_delete();

comment on table governance.source_endpoints is
  'Reviewable official retrieval endpoints and schedules; credentials are intentionally not stored here.';
comment on table governance.raw_snapshots is
  'Immutable metadata for exact raw source bytes preserved in the private governance-raw-snapshots bucket.';
comment on table governance.sync_run_snapshots is
  'Idempotent run-to-snapshot links; repeated content reuses the source endpoint and SHA-256 snapshot.';
comment on table governance.sync_candidates is
  'Normalized and validated source candidates staged separately from canonical governance entities.';
comment on table governance.sync_change_items is
  'Detected canonical changes that cannot be applied until a separate human review is approved.';
comment on table governance.sync_review_items is
  'Human verification queue separating source retrieval and change detection from canonical promotion.';
comment on table governance.sync_review_events is
  'Append-only review actions preserving actor attribution and every verification/routing decision.';
