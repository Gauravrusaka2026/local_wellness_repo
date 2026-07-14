alter table governance.source_endpoints
  add column allowed_hosts text[] not null default '{}'::text[],
  add column max_response_bytes bigint not null default 20971520,
  add column fetch_timeout_seconds smallint not null default 30,
  add column consecutive_failure_count integer not null default 0,
  add column last_attempted_at timestamptz,
  add column last_succeeded_at timestamptz,
  add column last_failed_at timestamptz,
  add column last_failure_code text,
  add column disabled_until timestamptz,
  add column source_contract_sha256 text,
  add column approved_contract_sha256 text,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete restrict;

alter table governance.source_endpoints
  add constraint source_endpoints_max_response_bytes_check check (
    max_response_bytes between 1 and 104857600
  ),
  add constraint source_endpoints_fetch_timeout_check check (
    fetch_timeout_seconds between 1 and 120
  ),
  add constraint source_endpoints_failure_count_check check (
    consecutive_failure_count >= 0
  ),
  add constraint source_endpoints_failure_shape_check check (
    (
      consecutive_failure_count = 0
      and last_failure_code is null
    )
    or (
      consecutive_failure_count > 0
      and last_failed_at is not null
      and last_failure_code is not null
      and last_failure_code = upper(btrim(last_failure_code))
      and last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
    )
  ),
  add constraint source_endpoints_approval_shape_check check (
    (
      approved_contract_sha256 is null
      and approved_at is null
      and approved_by is null
    )
    or (
      approved_contract_sha256 is not null
      and approved_at is not null
      and approved_by is not null
    )
  ),
  add constraint source_endpoints_contract_hash_check check (
    source_contract_sha256 ~ '^[0-9a-f]{64}$'
    and (
      approved_contract_sha256 is null
      or approved_contract_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

alter table governance.source_endpoints
  drop constraint source_endpoints_dataset_kind_check;

alter table governance.source_endpoints
  add constraint source_endpoints_dataset_kind_check check (
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
      'contact',
      'utility',
      'emergency_contact',
      'boundary',
      'routing_reference'
    )
  );

alter table governance.sync_candidates
  drop constraint sync_candidates_entity_type_check;

alter table governance.sync_candidates
  add constraint sync_candidates_entity_type_check check (
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
      'contact',
      'utility',
      'emergency_contact',
      'jurisdiction_boundary',
      'routing_reference'
    )
  );

create table governance.sync_source_leases (
  source_endpoint_id uuid primary key
    references governance.source_endpoints (id) on delete restrict,
  sync_run_id uuid not null unique references governance.sync_runs (id) on delete restrict,
  lease_token uuid not null unique,
  worker_id text not null,
  acquired_at timestamptz not null,
  heartbeat_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint sync_source_leases_worker_id_check check (
    worker_id = btrim(worker_id)
    and worker_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$'
  ),
  constraint sync_source_leases_time_check check (
    heartbeat_at >= acquired_at
    and expires_at > heartbeat_at
  )
);

create table governance.sync_events (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references governance.sync_runs (id) on delete restrict,
  source_endpoint_id uuid not null
    references governance.source_endpoints (id) on delete restrict,
  event_type text not null,
  severity text not null default 'information',
  event_detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint sync_events_type_check check (
    event_type = lower(btrim(event_type))
    and event_type ~ '^[a-z][a-z0-9_.:-]{1,119}$'
  ),
  constraint sync_events_severity_check check (
    severity in ('information', 'warning', 'error')
  ),
  constraint sync_events_detail_check check (
    jsonb_typeof(event_detail) = 'object'
    and not event_detail ?| array[
      'authorization',
      'cookie',
      'leaseToken',
      'lease_token',
      'secret',
      'serviceRoleKey',
      'service_role_key',
      'token'
    ]
  )
);

create table governance.source_evidence (
  id uuid primary key default gen_random_uuid(),
  source_endpoint_id uuid not null
    references governance.source_endpoints (id) on delete restrict,
  raw_snapshot_id uuid not null references governance.raw_snapshots (id) on delete restrict,
  sync_candidate_id uuid references governance.sync_candidates (id) on delete restrict,
  evidence_kind text not null,
  source_record_locator text not null,
  source_field_path text,
  extracted_value_sha256 text,
  evidence_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint source_evidence_kind_check check (
    evidence_kind in (
      'api_field',
      'csv_cell',
      'html_element',
      'json_path',
      'pdf_region',
      'document_section'
    )
  ),
  constraint source_evidence_locator_check check (
    source_record_locator = btrim(source_record_locator)
    and char_length(source_record_locator) between 1 and 1000
  ),
  constraint source_evidence_field_path_check check (
    source_field_path is null
    or (
      source_field_path = btrim(source_field_path)
      and char_length(source_field_path) between 1 and 500
    )
  ),
  constraint source_evidence_hash_check check (
    extracted_value_sha256 is null or extracted_value_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint source_evidence_metadata_check check (
    jsonb_typeof(evidence_metadata) = 'object'
  )
);

create table governance.contact_channels (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null,
  channel_type text not null,
  visibility text not null default 'restricted',
  intended_use text not null default 'directory',
  purpose text,
  authority_id uuid references governance.authorities (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  office_id uuid references governance.offices (id) on delete restrict,
  officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  officer_id uuid references governance.officers (id) on delete restrict,
  officer_assignment_id uuid
    references governance.officer_assignments (id) on delete restrict,
  utility_id uuid references governance.utilities (id) on delete restrict,
  emergency_contact_id uuid
    references governance.emergency_contacts (id) on delete restrict,
  status text not null default 'draft',
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_channels_key_check check (
    channel_key = lower(btrim(channel_key))
    and channel_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint contact_channels_type_check check (
    channel_type in (
      'address',
      'contact_directory',
      'email',
      'helpline',
      'phone',
      'website'
    )
  ),
  constraint contact_channels_visibility_check check (
    visibility in ('public_official', 'internal', 'restricted')
  ),
  constraint contact_channels_intended_use_check check (
    intended_use in ('complaint_intake', 'directory', 'emergency', 'general_enquiry')
  ),
  constraint contact_channels_purpose_check check (
    purpose is null
    or (purpose = btrim(purpose) and char_length(purpose) between 1 and 500)
  ),
  constraint contact_channels_exactly_one_owner_check check (
    (authority_id is not null)::integer
      + (local_body_id is not null)::integer
      + (ward_id is not null)::integer
      + (authority_department_id is not null)::integer
      + (office_id is not null)::integer
      + (officer_role_id is not null)::integer
      + (officer_id is not null)::integer
      + (officer_assignment_id is not null)::integer
      + (utility_id is not null)::integer
      + (emergency_contact_id is not null)::integer = 1
  ),
  constraint contact_channels_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint contact_channels_placeholder_check check (
    not is_placeholder or status <> 'active'
  ),
  constraint contact_channels_key_unique unique (channel_key)
);

create table governance.contact_channel_versions (
  id uuid primary key default gen_random_uuid(),
  contact_channel_id uuid not null
    references governance.contact_channels (id) on delete restrict,
  version integer not null,
  contact_value text not null,
  normalized_value text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null default 'staged',
  verification_status text not null default 'unverified',
  is_placeholder boolean not null default false,
  source_endpoint_id uuid not null
    references governance.source_endpoints (id) on delete restrict,
  source_snapshot_id uuid not null
    references governance.raw_snapshots (id) on delete restrict,
  source_evidence_id uuid references governance.source_evidence (id) on delete restrict,
  source_url text not null,
  source_record_locator text not null,
  last_verified timestamptz,
  is_complaint_delivery_approved boolean not null default false,
  sync_review_item_id uuid
    references governance.sync_review_items (id) on delete restrict,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_channel_versions_version_check check (version >= 1),
  constraint contact_channel_versions_value_check check (
    contact_value = btrim(contact_value)
    and normalized_value = btrim(normalized_value)
    and char_length(contact_value) between 1 and 1000
    and char_length(normalized_value) between 1 and 1000
  ),
  constraint contact_channel_versions_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint contact_channel_versions_status_check check (
    status in ('staged', 'published', 'superseded', 'stale', 'rejected')
  ),
  constraint contact_channel_versions_verification_check check (
    verification_status in (
      'placeholder',
      'unverified',
      'source_verified',
      'manually_verified',
      'conflicting',
      'superseded',
      'stale'
    )
  ),
  constraint contact_channel_versions_placeholder_check check (
    not is_placeholder
    or (
      verification_status = 'placeholder'
      and status in ('staged', 'rejected')
    )
  ),
  constraint contact_channel_versions_source_url_check check (
    source_url = btrim(source_url) and source_url ~ '^https://[^[:space:]]+$'
  ),
  constraint contact_channel_versions_locator_check check (
    source_record_locator = btrim(source_record_locator)
    and char_length(source_record_locator) between 1 and 1000
  ),
  constraint contact_channel_versions_verified_at_check check (
    verification_status in ('placeholder', 'unverified', 'conflicting')
    or last_verified is not null
  ),
  constraint contact_channel_versions_manual_review_shape_check check (
    (
      verification_status in ('manually_verified', 'superseded', 'stale')
      and sync_review_item_id is not null
      and reviewed_at is not null
      and reviewed_by is not null
    )
    or (
      verification_status not in ('manually_verified', 'superseded', 'stale')
      and sync_review_item_id is null
      and reviewed_at is null
      and reviewed_by is null
    )
  ),
  constraint contact_channel_versions_publication_check check (
    (status = 'published' and verification_status = 'manually_verified')
    or status <> 'published'
  ),
  constraint contact_channel_versions_closed_status_check check (
    status not in ('superseded', 'stale') or effective_to is not null
  ),
  constraint contact_channel_versions_status_verification_check check (
    (status = 'superseded' and verification_status = 'superseded')
    or (status = 'stale' and verification_status = 'stale')
    or status not in ('superseded', 'stale')
  ),
  constraint contact_channel_versions_channel_version_unique unique (
    contact_channel_id,
    version
  )
);

alter table governance.contact_channel_versions
  add constraint contact_channel_versions_published_period_excl
  exclude using gist (
    contact_channel_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status = 'published');

create index source_endpoints_due_fetch_idx
  on governance.source_endpoints (next_sync_at, disabled_until, id)
  where status = 'active';
create index sync_source_leases_expiry_idx
  on governance.sync_source_leases (expires_at);
create index sync_events_run_time_idx
  on governance.sync_events (sync_run_id, occurred_at, id);
create index source_evidence_snapshot_idx
  on governance.source_evidence (raw_snapshot_id, source_record_locator);
create index source_evidence_candidate_idx
  on governance.source_evidence (sync_candidate_id)
  where sync_candidate_id is not null;
create index contact_channels_owner_office_idx
  on governance.contact_channels (office_id, channel_type, status)
  where office_id is not null;
create index contact_channels_owner_assignment_idx
  on governance.contact_channels (officer_assignment_id, channel_type, status)
  where officer_assignment_id is not null;
create index contact_channels_owner_local_body_idx
  on governance.contact_channels (local_body_id, channel_type, status)
  where local_body_id is not null;
create index contact_channel_versions_current_idx
  on governance.contact_channel_versions (
    contact_channel_id,
    effective_from desc,
    version desc
  )
  where status = 'published';
create index contact_channel_versions_source_idx
  on governance.contact_channel_versions (source_snapshot_id, source_record_locator);
create unique index contact_channel_versions_review_once_idx
  on governance.contact_channel_versions (sync_review_item_id)
  where sync_review_item_id is not null;

create function governance.set_source_endpoint_contract_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.source_contract_sha256 := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'referenceSourceId', new.reference_source_id,
          'importBatchId', new.import_batch_id,
          'authorityId', new.authority_id,
          'sourceKind', new.source_kind,
          'datasetKind', new.dataset_kind,
          'retrievalMethod', new.retrieval_method,
          'retrievalFormat', new.retrieval_format,
          'endpointUrl', new.endpoint_url,
          'repositoryPath', new.repository_path,
          'parserKey', new.parser_key,
          'parserContractVersion', new.parser_contract_version,
          'expectedMediaTypes', to_jsonb(new.expected_media_types),
          'allowedHosts', to_jsonb(new.allowed_hosts),
          'maxResponseBytes', new.max_response_bytes,
          'fetchTimeoutSeconds', new.fetch_timeout_seconds,
          'refreshInterval', new.refresh_interval
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

create trigger source_endpoints_contract_hash
before insert or update on governance.source_endpoints
for each row execute function governance.set_source_endpoint_contract_hash();

-- Existing deployments can already contain source registry rows from the
-- governance synchronization foundation migration. Run every existing row
-- through the deterministic hash trigger before enforcing the final shape.
update governance.source_endpoints
set source_contract_sha256 = source_contract_sha256;

alter table governance.source_endpoints
  alter column source_contract_sha256 set not null;

create or replace function governance.validate_source_endpoint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_host text;
begin
  if exists (
    select 1
    from unnest(new.expected_media_types) as media_type
    where media_type is null
      or media_type <> lower(btrim(media_type))
      or media_type !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
  ) or cardinality(new.expected_media_types) > 20
    or cardinality(new.expected_media_types) <> (
    select count(distinct media_type)
    from unnest(new.expected_media_types) as media_type
  ) or exists (
    select 1
    from unnest(new.expected_media_types) as media_type
    where media_type not in (
      'application/geo+json',
      'application/json',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/html',
      'text/plain'
    )
  ) then
    raise exception using errcode = '23514', message = 'SYNC_EXPECTED_MEDIA_TYPES_INVALID';
  end if;

  if exists (
    select 1
    from unnest(new.allowed_hosts) as allowed_host
    where allowed_host is null
      or allowed_host <> lower(btrim(allowed_host))
      or allowed_host !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  ) or cardinality(new.allowed_hosts) > 20
    or cardinality(new.allowed_hosts) <> (
    select count(distinct allowed_host)
    from unnest(new.allowed_hosts) as allowed_host
  ) then
    raise exception using errcode = '23514', message = 'SYNC_ALLOWED_HOSTS_INVALID';
  end if;

  if new.source_kind <> 'repository_bootstrap' then
    endpoint_host := lower(substring(new.endpoint_url from '^https://([^/:?#]+)'));
    if endpoint_host is null
      or new.endpoint_url !~ '^https://[^/:?#]+(?::443)?(?:[/?]|$)'
      or position('#' in new.endpoint_url) > 0
      or cardinality(new.allowed_hosts) = 0
      or not endpoint_host = any(new.allowed_hosts) then
      raise exception using errcode = '23514', message = 'SYNC_ENDPOINT_HOST_NOT_ALLOWED';
    end if;
  elsif cardinality(new.allowed_hosts) <> 0 then
    raise exception using errcode = '23514', message = 'SYNC_BOOTSTRAP_HOSTS_FORBIDDEN';
  end if;

  if new.status = 'active'
    and (
      new.approved_at is null
      or new.approved_by is null
      or new.approved_contract_sha256 is distinct from new.source_contract_sha256
      or not private.user_has_active_role(
        new.approved_by,
        'platform_admin',
        'global',
        null
      )
      or cardinality(new.expected_media_types) = 0
    ) then
    raise exception using errcode = '23514', message = 'SYNC_ACTIVE_SOURCE_REVIEW_REQUIRED';
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

create or replace function governance.validate_sync_run_insert()
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
    'expectedMediaTypes', to_jsonb(source.expected_media_types),
    'allowedHosts', to_jsonb(source.allowed_hosts),
    'maxResponseBytes', source.max_response_bytes,
    'fetchTimeoutSeconds', source.fetch_timeout_seconds,
    'sourceContractSha256', source.source_contract_sha256,
    'approvedContractSha256', source.approved_contract_sha256
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

create function governance.validate_source_evidence_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.raw_snapshots as snapshot
    where snapshot.id = new.raw_snapshot_id
      and snapshot.source_endpoint_id = new.source_endpoint_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_EVIDENCE_SOURCE_MISMATCH';
  end if;

  if new.sync_candidate_id is not null and not exists (
    select 1
    from governance.sync_candidates as candidate
    where candidate.id = new.sync_candidate_id
      and candidate.raw_snapshot_id = new.raw_snapshot_id
  ) then
    raise exception using errcode = '23514', message = 'SYNC_EVIDENCE_CANDIDATE_MISMATCH';
  end if;

  return new;
end;
$$;

create function governance.validate_contact_channel_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel governance.contact_channels%rowtype;
  channel_owner_type text;
  channel_owner_id uuid;
begin
  select * into channel
  from governance.contact_channels
  where id = new.contact_channel_id;

  if channel.id is null then
    raise exception using errcode = '23503', message = 'CONTACT_CHANNEL_NOT_FOUND';
  end if;

  channel_owner_type := case
    when channel.authority_id is not null then 'authority'
    when channel.local_body_id is not null then 'local_body'
    when channel.ward_id is not null then 'ward'
    when channel.authority_department_id is not null then 'department'
    when channel.office_id is not null then 'office'
    when channel.officer_role_id is not null then 'officer_role'
    when channel.officer_id is not null then 'officer'
    when channel.officer_assignment_id is not null then 'officer_assignment'
    when channel.utility_id is not null then 'utility'
    when channel.emergency_contact_id is not null then 'emergency_contact'
  end;
  channel_owner_id := coalesce(
    channel.authority_id,
    channel.local_body_id,
    channel.ward_id,
    channel.authority_department_id,
    channel.office_id,
    channel.officer_role_id,
    channel.officer_id,
    channel.officer_assignment_id,
    channel.utility_id,
    channel.emergency_contact_id
  );

  if channel.is_placeholder <> new.is_placeholder then
    raise exception using errcode = '23514', message = 'CONTACT_PLACEHOLDER_MARKER_MISMATCH';
  end if;

  if not exists (
    select 1
    from governance.raw_snapshots as snapshot
    where snapshot.id = new.source_snapshot_id
      and snapshot.source_endpoint_id = new.source_endpoint_id
  ) then
    raise exception using errcode = '23514', message = 'CONTACT_SOURCE_SNAPSHOT_MISMATCH';
  end if;

  if not exists (
    select 1
    from governance.source_endpoints as source
    where source.id = new.source_endpoint_id
      and lower(substring(new.source_url from '^https://([^/:?#]+)')) = any(source.allowed_hosts)
      and new.source_url ~ '^https://[^/:?#]+(?::443)?(?:[/?]|$)'
      and position('#' in new.source_url) = 0
  ) then
    raise exception using errcode = '23514', message = 'CONTACT_SOURCE_URL_NOT_APPROVED';
  end if;

  if new.source_evidence_id is not null and not exists (
    select 1
    from governance.source_evidence as evidence
    where evidence.id = new.source_evidence_id
      and evidence.source_endpoint_id = new.source_endpoint_id
      and evidence.raw_snapshot_id = new.source_snapshot_id
      and evidence.extracted_value_sha256 = encode(
        extensions.digest(convert_to(new.contact_value, 'UTF8'), 'sha256'),
        'hex'
      )
  ) then
    raise exception using errcode = '23514', message = 'CONTACT_SOURCE_EVIDENCE_MISMATCH';
  end if;

  if new.verification_status = 'source_verified' and new.status <> 'staged' then
    raise exception using errcode = '23514', message = 'CONTACT_SOURCE_VERIFIED_MUST_REMAIN_STAGED';
  end if;

  if new.verification_status in ('manually_verified', 'superseded', 'stale')
    and not exists (
      select 1
      from governance.sync_review_items as review_item
      inner join governance.sync_change_items as change_item
        on change_item.id = review_item.sync_change_item_id
      inner join governance.sync_candidates as candidate
        on candidate.id = change_item.sync_candidate_id
      inner join governance.sync_runs as sync_run
        on sync_run.id = candidate.sync_run_id
      where review_item.id = new.sync_review_item_id
        and new.source_evidence_id is not null
        and review_item.review_status = 'approved'
        and review_item.reviewed_by = new.reviewed_by
        and review_item.reviewed_at <= new.reviewed_at
        and change_item.status = 'approved'
        and candidate.entity_type = 'contact'
        and candidate.raw_snapshot_id = new.source_snapshot_id
        and candidate.source_record_locator = new.source_record_locator
        and sync_run.source_endpoint_id = new.source_endpoint_id
        and candidate.is_placeholder = new.is_placeholder
        and candidate.normalized_payload ->> 'ownerEntityType' = channel_owner_type
        and candidate.normalized_payload ->> 'channelType' = channel.channel_type
        and candidate.normalized_payload ->> 'normalizedValue' = new.normalized_value
        and candidate.normalized_payload ->> 'sourceUrl' = new.source_url
        and change_item.proposed_changes ->> 'channelKey' = channel.channel_key
        and change_item.proposed_changes ->> 'ownerRecordId' = channel_owner_id::text
        and change_item.proposed_changes ->> 'channelType' = channel.channel_type
        and change_item.proposed_changes ->> 'visibility' = channel.visibility
        and change_item.proposed_changes ->> 'intendedUse' = channel.intended_use
        and change_item.proposed_changes ->> 'normalizedValue' = new.normalized_value
        and change_item.proposed_changes -> 'isComplaintDeliveryApproved'
          = to_jsonb(new.is_complaint_delivery_approved)
    ) then
    raise exception using errcode = '55000', message = 'CONTACT_PUBLICATION_REVIEW_REQUIRED';
  end if;

  if new.status = 'published' and (channel.status <> 'active' or channel.is_placeholder) then
    raise exception using errcode = '55000', message = 'CONTACT_PUBLICATION_REVIEW_REQUIRED';
  end if;

  if new.is_complaint_delivery_approved and (
    new.status <> 'published'
    or new.verification_status <> 'manually_verified'
    or channel.visibility <> 'public_official'
    or channel.intended_use <> 'complaint_intake'
  ) then
    raise exception using errcode = '55000', message = 'CONTACT_DELIVERY_APPROVAL_INVALID';
  end if;

  if channel.channel_type = 'email' and (
    new.normalized_value <> lower(new.normalized_value)
    or new.normalized_value !~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ) then
    raise exception using errcode = '23514', message = 'CONTACT_EMAIL_INVALID';
  end if;

  if channel.channel_type in ('website', 'contact_directory')
    and new.normalized_value !~ '^https://[^[:space:]]+$' then
    raise exception using errcode = '23514', message = 'CONTACT_URL_INVALID';
  end if;

  if channel.channel_type in ('phone', 'helpline')
    and new.normalized_value !~ '^\+?[0-9]{3,15}$' then
    raise exception using errcode = '23514', message = 'CONTACT_PHONE_INVALID';
  end if;

  return new;
end;
$$;

create function governance.guard_contact_channel_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new) - array['status', 'updated_at']
  ) is distinct from (
    to_jsonb(old) - array['status', 'updated_at']
  ) then
    raise exception using errcode = '55000', message = 'CONTACT_CHANNEL_IDENTITY_IMMUTABLE';
  end if;

  if not (
    new.status = old.status
    or (old.status = 'draft' and new.status in ('active', 'inactive'))
    or (old.status = 'active' and new.status in ('inactive', 'superseded'))
    or (old.status = 'inactive' and new.status in ('active', 'superseded'))
  ) then
    raise exception using errcode = '55000', message = 'CONTACT_CHANNEL_TRANSITION_INVALID';
  end if;

  return new;
end;
$$;

create function governance.guard_contact_channel_version_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new) - array['status', 'verification_status', 'effective_to', 'updated_at']
  ) is distinct from (
    to_jsonb(old) - array['status', 'verification_status', 'effective_to', 'updated_at']
  ) then
    raise exception using errcode = '55000', message = 'CONTACT_VERSION_IMMUTABLE';
  end if;

  if not (
    (old.status = 'published' and new.status in ('superseded', 'stale'))
    or (old.status = 'staged' and new.status = 'rejected')
  ) then
    raise exception using errcode = '55000', message = 'CONTACT_VERSION_TRANSITION_INVALID';
  end if;

  if new.effective_to is null or new.effective_to <= new.effective_from then
    raise exception using errcode = '55000', message = 'CONTACT_VERSION_CLOSE_TIME_REQUIRED';
  end if;

  if (new.status = 'superseded' and new.verification_status <> 'superseded')
    or (new.status = 'stale' and new.verification_status <> 'stale') then
    raise exception using errcode = '55000', message = 'CONTACT_VERSION_CLOSE_STATUS_MISMATCH';
  end if;

  return new;
end;
$$;

create function governance.reject_legacy_contact_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_name text;
begin
  foreach field_name in array tg_argv
  loop
    if to_jsonb(new) -> field_name is distinct from to_jsonb(old) -> field_name then
      raise exception using
        errcode = '55000',
        message = 'LEGACY_CONTACT_FIELD_IMMUTABLE',
        detail = format(
          '%I.%I must be changed by appending a governance.contact_channel_versions row.',
          tg_table_name,
          field_name
        );
    end if;
  end loop;
  return new;
end;
$$;

create function governance.guard_referenced_snapshot_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from governance.raw_snapshots as snapshot
    where snapshot.storage_bucket = old.bucket_id
      and snapshot.storage_object_path = old.name
  ) then
    if tg_op = 'DELETE' then
      raise exception using errcode = '55000', message = 'SYNC_SNAPSHOT_OBJECT_IMMUTABLE';
    end if;
    if new.bucket_id is distinct from old.bucket_id
      or new.name is distinct from old.name
      or new.version is distinct from old.version
      or new.metadata is distinct from old.metadata
      or new.user_metadata is distinct from old.user_metadata then
      raise exception using errcode = '55000', message = 'SYNC_SNAPSHOT_OBJECT_IMMUTABLE';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger governance_snapshot_objects_guard_update
before update on storage.objects
for each row execute function governance.guard_referenced_snapshot_object();
create trigger governance_snapshot_objects_guard_delete
before delete on storage.objects
for each row execute function governance.guard_referenced_snapshot_object();

create trigger sync_events_reject_update
before update on governance.sync_events
for each row execute function governance.reject_import_ledger_update();
create trigger sync_events_reject_delete
before delete on governance.sync_events
for each row execute function governance.reject_historical_delete();

create trigger source_evidence_validate_scope
before insert on governance.source_evidence
for each row execute function governance.validate_source_evidence_scope();
create trigger source_evidence_reject_update
before update on governance.source_evidence
for each row execute function governance.reject_import_ledger_update();
create trigger source_evidence_reject_delete
before delete on governance.source_evidence
for each row execute function governance.reject_historical_delete();

create trigger contact_channels_set_updated_at
before update on governance.contact_channels
for each row execute function private.set_updated_at();
create trigger contact_channels_guard_update
before update on governance.contact_channels
for each row execute function governance.guard_contact_channel_update();
create trigger contact_channels_reject_delete
before delete on governance.contact_channels
for each row execute function governance.reject_historical_delete();

create trigger contact_channel_versions_validate
before insert on governance.contact_channel_versions
for each row execute function governance.validate_contact_channel_version();
create trigger contact_channel_versions_guard_update
before update on governance.contact_channel_versions
for each row execute function governance.guard_contact_channel_version_update();
create trigger contact_channel_versions_set_updated_at
before update on governance.contact_channel_versions
for each row execute function private.set_updated_at();
create trigger contact_channel_versions_reject_delete
before delete on governance.contact_channel_versions
for each row execute function governance.reject_historical_delete();

create trigger offices_reject_legacy_contact_update
before update of address, official_phone, official_email on governance.offices
for each row execute function governance.reject_legacy_contact_update(
  'address',
  'official_phone',
  'official_email'
);
create trigger officers_reject_legacy_contact_update
before update of official_phone, official_email on governance.officers
for each row execute function governance.reject_legacy_contact_update(
  'official_phone',
  'official_email'
);
create trigger utilities_reject_legacy_contact_update
before update of reporting_channel, local_office_description on governance.utilities
for each row execute function governance.reject_legacy_contact_update(
  'reporting_channel',
  'local_office_description'
);
create trigger emergency_contacts_reject_legacy_contact_update
before update of contact_type, contact_value, availability on governance.emergency_contacts
for each row execute function governance.reject_legacy_contact_update(
  'contact_type',
  'contact_value',
  'availability'
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sync_source_leases',
    'sync_events',
    'source_evidence',
    'contact_channels',
    'contact_channel_versions'
  ]
  loop
    execute format('alter table governance.%I enable row level security', table_name);
    execute format('alter table governance.%I force row level security', table_name);
    execute format(
      'revoke all on governance.%I from public, anon, authenticated, service_role',
      table_name
    );
  end loop;
end;
$$;

grant select on governance.sync_events to service_role;
grant select on governance.source_evidence to service_role;
grant select, insert, update on governance.contact_channels to service_role;
grant select, insert, update on governance.contact_channel_versions to service_role;

create view governance.current_verified_contacts
with (security_invoker = true)
as
select
  channel.id as contact_channel_id,
  channel.channel_key,
  channel.channel_type,
  channel.visibility,
  channel.intended_use,
  channel.purpose,
  channel.authority_id,
  channel.local_body_id,
  channel.ward_id,
  channel.authority_department_id,
  channel.office_id,
  channel.officer_role_id,
  channel.officer_id,
  channel.officer_assignment_id,
  channel.utility_id,
  channel.emergency_contact_id,
  version.id as contact_channel_version_id,
  version.version,
  version.contact_value,
  version.normalized_value,
  version.effective_from,
  version.effective_to,
  version.last_verified,
  version.is_complaint_delivery_approved,
  version.source_url,
  version.source_snapshot_id
from governance.contact_channels as channel
inner join governance.contact_channel_versions as version
  on version.contact_channel_id = channel.id
where channel.status = 'active'
  and not channel.is_placeholder
  and channel.visibility = 'public_official'
  and version.status = 'published'
  and version.verification_status = 'manually_verified'
  and not version.is_placeholder
  and version.effective_from <= current_timestamp
  and (version.effective_to is null or version.effective_to > current_timestamp);

revoke all on governance.current_verified_contacts
from public, anon, authenticated, service_role;
grant select on governance.current_verified_contacts to service_role;

comment on table governance.sync_source_leases is
  'Short PostgreSQL leases used by scheduled fetch workers; this replaces any need for Redis-backed job coordination.';
comment on table governance.sync_events is
  'Append-only structured synchronization audit events with secret-bearing keys rejected.';
comment on table governance.source_evidence is
  'Immutable field-level provenance pointing into an exact raw source snapshot without duplicating source content.';
comment on table governance.contact_channels is
  'Durable ownership and visibility identity for an official contact channel; values are stored only in append-only versions.';
comment on table governance.contact_channel_versions is
  'Versioned official contact values. Source-verified values remain staged; publication requires attributed manual review.';
comment on view governance.current_verified_contacts is
  'Service-only projection of effective, manually verified, non-placeholder published contact versions.';
