insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'complaint-originals-private',
    'complaint-originals-private',
    false,
    52428800,
    array[
      'image/heic',
      'image/heif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]::text[]
  ),
  (
    'voice-recordings-private',
    'voice-recordings-private',
    false,
    26214400,
    array[
      'audio/aac',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/x-wav'
    ]::text[]
  ),
  (
    'complaint-thumbnails',
    'complaint-thumbnails',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'resolution-evidence-private',
    'resolution-evidence-private',
    false,
    52428800,
    array[
      'image/heic',
      'image/heif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]::text[]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function complaints.reject_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are append-only.', tg_table_schema, tg_table_name);
end;
$$;

create function complaints.validate_draft_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = new.citizen_user_id
      and profile.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_ACTOR_INACTIVE';
  end if;

  if new.selected_location_evidence_id is not null and not exists (
    select 1
    from complaints.complaint_location_evidence as evidence
    where evidence.id = new.selected_location_evidence_id
      and evidence.draft_id = new.id
      and evidence.actor_user_id = new.citizen_user_id
      and evidence.evidence_type = 'current_location'
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_LOCATION_SCOPE_INVALID';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.citizen_user_id is distinct from old.citizen_user_id
    or new.creation_idempotency_key_hash is distinct from old.creation_idempotency_key_hash
    or new.creation_request_fingerprint is distinct from old.creation_request_fingerprint
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_DRAFT_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and old.status <> 'active' then
    raise exception using errcode = '55000', message = 'COMPLAINT_DRAFT_TERMINAL';
  end if;

  return new;
end;
$$;

create function complaints.validate_location_evidence_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from complaints.complaint_drafts as draft
    where draft.id = new.draft_id
      and draft.citizen_user_id = new.actor_user_id
      and draft.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_LOCATION_DRAFT_INVALID';
  end if;

  if new.device_id is not null and not exists (
    select 1
    from public.devices as device
    where device.id = new.device_id
      and device.user_id = new.actor_user_id
      and device.is_active
      and device.risk_status <> 'blocked'
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_LOCATION_DEVICE_INVALID';
  end if;

  return new;
end;
$$;

create function complaints.validate_media_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from complaints.complaint_drafts as draft
    where draft.id = new.draft_id
      and draft.citizen_user_id = new.uploader_user_id
      and draft.status in ('active', 'submitted')
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_DRAFT_INVALID';
  end if;

  if new.capture_location_evidence_id is not null and not exists (
    select 1
    from complaints.complaint_location_evidence as evidence
    where evidence.id = new.capture_location_evidence_id
      and evidence.draft_id = new.draft_id
      and evidence.actor_user_id = new.uploader_user_id
      and evidence.evidence_type = 'media_capture'
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_LOCATION_INVALID';
  end if;

  if new.object_path <> format(
    '%s/%s/%s/original',
    new.uploader_user_id,
    new.draft_id,
    new.id
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_PATH_INVALID';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.draft_id is distinct from old.draft_id
    or new.uploader_user_id is distinct from old.uploader_user_id
    or new.client_media_id is distinct from old.client_media_id
    or new.media_kind is distinct from old.media_kind
    or new.capture_source is distinct from old.capture_source
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.declared_mime_type is distinct from old.declared_mime_type
    or new.declared_byte_size is distinct from old.declared_byte_size
    or new.client_sha256 is distinct from old.client_sha256
    or new.capture_location_evidence_id is distinct from old.capture_location_evidence_id
    or new.captured_at is distinct from old.captured_at
    or new.width_pixels is distinct from old.width_pixels
    or new.height_pixels is distinct from old.height_pixels
    or new.duration_seconds is distinct from old.duration_seconds
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_MEDIA_INTENT_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE'
    and old.upload_status = 'finalized'
    and (
      new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.upload_status is distinct from old.upload_status
      or new.finalized_at is distinct from old.finalized_at
    ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_MEDIA_FINALIZATION_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger complaint_drafts_validate_scope
before insert or update on complaints.complaint_drafts
for each row execute function complaints.validate_draft_scope();

create trigger complaint_drafts_set_updated_at
before update on complaints.complaint_drafts
for each row execute function private.set_updated_at();

create trigger complaint_location_evidence_validate_scope
before insert on complaints.complaint_location_evidence
for each row execute function complaints.validate_location_evidence_scope();

create trigger complaint_location_evidence_append_only
before update or delete on complaints.complaint_location_evidence
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_media_validate_scope
before insert or update on complaints.complaint_media
for each row execute function complaints.validate_media_scope();

create trigger complaint_media_set_updated_at
before update on complaints.complaint_media
for each row execute function private.set_updated_at();

create trigger complaints_append_only_phase4
before update or delete on complaints.complaints
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_assignments_append_only
before update or delete on complaints.complaint_assignments
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_status_history_append_only
before update or delete on complaints.complaint_status_history
for each row execute function complaints.reject_append_only_mutation();

create trigger duplicate_check_runs_append_only
before update or delete on complaints.duplicate_check_runs
for each row execute function complaints.reject_append_only_mutation();

create trigger duplicate_check_matches_append_only
before update or delete on complaints.duplicate_check_matches
for each row execute function complaints.reject_append_only_mutation();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'complaint_drafts',
    'complaint_location_evidence',
    'complaint_media',
    'complaints',
    'complaint_assignments',
    'complaint_status_history',
    'complaint_submission_requests',
    'duplicate_check_runs',
    'duplicate_check_matches'
  ]
  loop
    execute format('alter table complaints.%I enable row level security', table_name);
    execute format('alter table complaints.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all privileges on schema complaints from public, anon, authenticated, service_role;
revoke all privileges on all tables in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all sequences in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;
alter default privileges in schema complaints revoke all on tables
  from public, anon, authenticated, service_role;
alter default privileges in schema complaints revoke all on sequences
  from public, anon, authenticated, service_role;
alter default privileges in schema complaints revoke all on functions
  from public, anon, authenticated, service_role;

create function public.create_complaint_draft(
  p_actor_user_id uuid,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_category_id uuid default null,
  p_asset_id uuid default null,
  p_description text default null,
  p_description_language text default 'en',
  p_custom_attributes jsonb default '{}'::jsonb
)
returns table (
  draft_id uuid,
  status text,
  revision bigint,
  created_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.complaint_drafts%rowtype;
  inserted complaints.complaint_drafts%rowtype;
begin
  if p_actor_user_id is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'COMPLAINT_DRAFT_REQUEST_INVALID';
  end if;

  select draft.* into existing
  from complaints.complaint_drafts as draft
  where draft.citizen_user_id = p_actor_user_id
    and draft.creation_idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing.creation_request_fingerprint <> p_request_fingerprint
      or existing.category_id is distinct from p_category_id
      or existing.asset_id is distinct from p_asset_id
      or existing.description is distinct from p_description
      or existing.description_language is distinct from p_description_language
      or existing.custom_attributes is distinct from p_custom_attributes then
      raise exception using errcode = '23505', message = 'COMPLAINT_DRAFT_IDEMPOTENCY_CONFLICT';
    end if;

    return query select existing.id, existing.status, existing.revision, existing.created_at, true;
    return;
  end if;

  insert into complaints.complaint_drafts (
    citizen_user_id,
    creation_idempotency_key_hash,
    creation_request_fingerprint,
    category_id,
    asset_id,
    description,
    description_language,
    custom_attributes
  )
  values (
    p_actor_user_id,
    p_idempotency_key_hash,
    p_request_fingerprint,
    p_category_id,
    p_asset_id,
    p_description,
    p_description_language,
    p_custom_attributes
  )
  returning * into inserted;

  return query select inserted.id, inserted.status, inserted.revision, inserted.created_at, false;
exception
  when unique_violation then
    select draft.* into existing
    from complaints.complaint_drafts as draft
    where draft.citizen_user_id = p_actor_user_id
      and draft.creation_idempotency_key_hash = p_idempotency_key_hash;

    if found
      and existing.creation_request_fingerprint = p_request_fingerprint
      and existing.category_id is not distinct from p_category_id
      and existing.asset_id is not distinct from p_asset_id
      and existing.description is not distinct from p_description
      and existing.description_language is not distinct from p_description_language
      and existing.custom_attributes is not distinct from p_custom_attributes then
      return query select existing.id, existing.status, existing.revision, existing.created_at, true;
      return;
    end if;

    raise exception using errcode = '23505', message = 'COMPLAINT_DRAFT_IDEMPOTENCY_CONFLICT';
end;
$$;

create function public.get_complaint_draft(
  p_actor_user_id uuid,
  p_draft_id uuid
)
returns table (
  draft_id uuid,
  category_id uuid,
  asset_id uuid,
  description text,
  description_language text,
  custom_attributes jsonb,
  selected_location_evidence_id uuid,
  status text,
  revision bigint,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    draft.id,
    draft.category_id,
    draft.asset_id,
    draft.description,
    draft.description_language,
    draft.custom_attributes,
    draft.selected_location_evidence_id,
    draft.status,
    draft.revision,
    draft.expires_at,
    draft.created_at,
    draft.updated_at
  from complaints.complaint_drafts as draft
  where draft.id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id;
$$;

create function public.update_complaint_draft(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_expected_revision bigint,
  p_category_id uuid,
  p_asset_id uuid,
  p_description text,
  p_description_language text,
  p_custom_attributes jsonb,
  p_selected_location_evidence_id uuid
)
returns table (
  draft_id uuid,
  status text,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed complaints.complaint_drafts%rowtype;
begin
  update complaints.complaint_drafts as draft
  set
    category_id = p_category_id,
    asset_id = p_asset_id,
    description = p_description,
    description_language = p_description_language,
    custom_attributes = p_custom_attributes,
    selected_location_evidence_id = p_selected_location_evidence_id,
    revision = draft.revision + 1
  where draft.id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id
    and draft.status = 'active'
    and draft.expires_at > current_timestamp
    and draft.revision = p_expected_revision
  returning draft.* into changed;

  if not found then
    if not exists (
      select 1 from complaints.complaint_drafts as owned
      where owned.id = p_draft_id and owned.citizen_user_id = p_actor_user_id
    ) then
      raise exception using errcode = 'P0002', message = 'COMPLAINT_DRAFT_NOT_FOUND';
    end if;
    raise exception using errcode = '40001', message = 'COMPLAINT_DRAFT_REVISION_CONFLICT';
  end if;

  return query select changed.id, changed.status, changed.revision, changed.updated_at;
end;
$$;

create function public.discard_complaint_draft(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_expected_revision bigint
)
returns table (
  draft_id uuid,
  status text,
  revision bigint,
  discarded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.complaint_drafts%rowtype;
  discarded complaints.complaint_drafts%rowtype;
begin
  select draft.* into existing
  from complaints.complaint_drafts as draft
  where draft.id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_DRAFT_NOT_FOUND';
  end if;
  if existing.status = 'discarded' then
    return query select existing.id, existing.status, existing.revision, existing.discarded_at;
    return;
  end if;
  if existing.status <> 'active' or existing.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'COMPLAINT_DRAFT_REVISION_CONFLICT';
  end if;

  update complaints.complaint_drafts as draft
  set
    status = 'discarded',
    discarded_at = current_timestamp,
    revision = draft.revision + 1
  where draft.id = existing.id
  returning draft.* into discarded;

  return query select discarded.id, discarded.status, discarded.revision, discarded.discarded_at;
end;
$$;

create function public.append_complaint_location_evidence(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_device_id uuid,
  p_evidence_type text,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_provider text,
  p_captured_at timestamptz,
  p_device_recorded_at timestamptz,
  p_mock_location_detected boolean,
  p_verification_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_id uuid;
  maximum_accuracy double precision := 100;
  maximum_age_seconds integer := 300;
  jurisdiction_count integer := 0;
  derived_spoof_risk text;
  derived_verification_status text;
  derived_verification_score numeric(7, 6);
  derived_reason text;
begin
  if p_longitude is null
    or p_latitude is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90 then
    raise exception using errcode = '22023', message = 'COMPLAINT_LOCATION_INVALID';
  end if;

  if p_captured_at > current_timestamp + interval '2 minutes'
    or p_device_recorded_at > current_timestamp + interval '2 minutes' then
    raise exception using errcode = '22023', message = 'COMPLAINT_LOCATION_CAPTURED_IN_FUTURE';
  end if;

  select
    coalesce(
      (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
      100
    ),
    coalesce(
      (category.location_verification_requirements ->> 'maximumAgeSeconds')::integer,
      300
    )
  into maximum_accuracy, maximum_age_seconds
  from complaints.complaint_drafts as draft
  left join routing.issue_categories as category on category.id = draft.category_id
  where draft.id = p_draft_id and draft.citizen_user_id = p_actor_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_DRAFT_NOT_FOUND';
  end if;

  if p_mock_location_detected is true then
    derived_spoof_risk := 'blocked';
    derived_verification_status := 'suspected_spoofing';
    derived_verification_score := 0;
    derived_reason := 'mock_location_detected';
  elsif extract(epoch from (current_timestamp - p_captured_at)) > maximum_age_seconds then
    derived_spoof_risk := 'review';
    derived_verification_status := 'manual_review';
    derived_verification_score := 0.2;
    derived_reason := 'location_stale';
  elsif p_accuracy_meters > maximum_accuracy then
    derived_spoof_risk := 'review';
    derived_verification_status := 'low_accuracy';
    derived_verification_score := least(0.79, maximum_accuracy / p_accuracy_meters * 0.8);
    derived_reason := 'accuracy_above_category_limit';
  else
    select count(*)::integer into jurisdiction_count
    from routing.resolve_jurisdiction_with_accuracy(
      p_longitude,
      p_latitude,
      p_accuracy_meters,
      current_timestamp
    );

    if jurisdiction_count = 0 then
      derived_spoof_risk := 'unknown';
      derived_verification_status := 'unsupported_area';
      derived_verification_score := 0;
      derived_reason := 'no_verified_jurisdiction';
    elsif jurisdiction_count > 1 then
      derived_spoof_risk := 'review';
      derived_verification_status := 'manual_review';
      derived_verification_score := 0.5;
      derived_reason := 'ambiguous_verified_jurisdiction';
    elsif p_provider = 'unknown' then
      derived_spoof_risk := 'review';
      derived_verification_status := 'partially_verified';
      derived_verification_score := 0.75;
      derived_reason := 'unknown_location_provider';
    else
      derived_spoof_risk := 'low';
      derived_verification_status := 'verified';
      derived_verification_score := greatest(
        0.8,
        1 - (p_accuracy_meters / maximum_accuracy * 0.2)
      );
      derived_reason := 'verified_jurisdiction_match';
    end if;
  end if;

  insert into complaints.complaint_location_evidence (
    draft_id,
    actor_user_id,
    device_id,
    evidence_type,
    location,
    accuracy_meters,
    provider,
    captured_at,
    device_recorded_at,
    mock_location_detected,
    spoof_risk_status,
    verification_status,
    verification_score,
    verification_metadata
  )
  values (
    p_draft_id,
    p_actor_user_id,
    p_device_id,
    p_evidence_type,
    extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326),
    p_accuracy_meters,
    p_provider,
    p_captured_at,
    p_device_recorded_at,
    p_mock_location_detected,
    derived_spoof_risk,
    derived_verification_status,
    derived_verification_score,
    p_verification_metadata || jsonb_build_object(
      'reason', derived_reason,
      'jurisdictionMatchCount', jurisdiction_count,
      'maximumAccuracyMeters', maximum_accuracy,
      'maximumAgeSeconds', maximum_age_seconds
    )
  )
  returning id into evidence_id;

  return evidence_id;
end;
$$;

create function public.list_complaint_location_evidence(
  p_actor_user_id uuid,
  p_draft_id uuid
)
returns table (
  location_evidence_id uuid,
  evidence_type text,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  provider text,
  captured_at timestamptz,
  device_recorded_at timestamptz,
  received_at timestamptz,
  mock_location_detected boolean,
  spoof_risk_status text,
  verification_status text,
  verification_score numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    evidence.id,
    evidence.evidence_type,
    extensions.st_x(evidence.location),
    extensions.st_y(evidence.location),
    evidence.accuracy_meters,
    evidence.provider,
    evidence.captured_at,
    evidence.device_recorded_at,
    evidence.received_at,
    evidence.mock_location_detected,
    evidence.spoof_risk_status,
    evidence.verification_status,
    evidence.verification_score,
    evidence.created_at
  from complaints.complaint_location_evidence as evidence
  inner join complaints.complaint_drafts as draft on draft.id = evidence.draft_id
  where evidence.draft_id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id
  order by evidence.captured_at, evidence.id;
$$;

create function public.reserve_complaint_media(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_client_media_id uuid,
  p_media_kind text,
  p_capture_source text,
  p_declared_mime_type text,
  p_declared_byte_size bigint,
  p_client_sha256 text,
  p_width_pixels integer default null,
  p_height_pixels integer default null,
  p_duration_seconds numeric default null,
  p_capture_location_evidence_id uuid default null,
  p_captured_at timestamptz default null
)
returns table (
  media_id uuid,
  bucket_id text,
  object_path text,
  upload_status text,
  upload_expires_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.complaint_media%rowtype;
  reserved complaints.complaint_media%rowtype;
  next_id uuid := gen_random_uuid();
  selected_bucket text;
  normalized_mime text := lower(btrim(p_declared_mime_type));
begin
  selected_bucket := case
    when p_media_kind in ('photo', 'video') then 'complaint-originals-private'
    when p_media_kind = 'voice' then 'voice-recordings-private'
    else null
  end;

  if selected_bucket is null then
    raise exception using errcode = '22023', message = 'COMPLAINT_MEDIA_KIND_INVALID';
  end if;

  if (p_media_kind = 'photo' and normalized_mime not in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp'
    ))
    or (p_media_kind = 'video' and normalized_mime not in (
      'video/mp4', 'video/quicktime', 'video/webm'
    ))
    or (p_media_kind = 'voice' and normalized_mime not in (
      'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/x-wav'
    )) then
    raise exception using errcode = '22023', message = 'COMPLAINT_MEDIA_TYPE_INVALID';
  end if;

  select media.* into existing
  from complaints.complaint_media as media
  where media.draft_id = p_draft_id
    and media.client_media_id = p_client_media_id;

  if found then
    if existing.uploader_user_id <> p_actor_user_id
      or existing.media_kind <> p_media_kind
      or existing.capture_source <> p_capture_source
      or existing.declared_mime_type <> normalized_mime
      or existing.declared_byte_size <> p_declared_byte_size
      or existing.client_sha256 <> p_client_sha256
      or existing.width_pixels is distinct from p_width_pixels
      or existing.height_pixels is distinct from p_height_pixels
      or existing.duration_seconds is distinct from p_duration_seconds
      or existing.capture_location_evidence_id is distinct from p_capture_location_evidence_id
      or existing.captured_at is distinct from p_captured_at then
      raise exception using errcode = '23505', message = 'COMPLAINT_MEDIA_IDEMPOTENCY_CONFLICT';
    end if;

    if existing.upload_status = 'reserved' and existing.upload_expires_at <= current_timestamp then
      update complaints.complaint_media as media
      set upload_expires_at = current_timestamp + interval '15 minutes'
      where media.id = existing.id
      returning media.* into existing;
    end if;

    return query select
      existing.id,
      existing.bucket_id,
      existing.object_path,
      existing.upload_status,
      existing.upload_expires_at,
      true;
    return;
  end if;

  if (
    select count(*)
    from complaints.complaint_media as media
    where media.draft_id = p_draft_id and media.upload_status <> 'expired'
  ) >= 20 then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_LIMIT_EXCEEDED';
  end if;

  insert into complaints.complaint_media (
    id,
    draft_id,
    uploader_user_id,
    client_media_id,
    media_kind,
    capture_source,
    bucket_id,
    object_path,
    declared_mime_type,
    declared_byte_size,
    client_sha256,
    width_pixels,
    height_pixels,
    duration_seconds,
    capture_location_evidence_id,
    captured_at,
    upload_expires_at
  )
  values (
    next_id,
    p_draft_id,
    p_actor_user_id,
    p_client_media_id,
    p_media_kind,
    p_capture_source,
    selected_bucket,
    format('%s/%s/%s/original', p_actor_user_id, p_draft_id, next_id),
    normalized_mime,
    p_declared_byte_size,
    p_client_sha256,
    p_width_pixels,
    p_height_pixels,
    p_duration_seconds,
    p_capture_location_evidence_id,
    p_captured_at,
    current_timestamp + interval '15 minutes'
  )
  returning * into reserved;

  return query select
    reserved.id,
    reserved.bucket_id,
    reserved.object_path,
    reserved.upload_status,
    reserved.upload_expires_at,
    false;
end;
$$;

create function public.finalize_complaint_media(
  p_actor_user_id uuid,
  p_media_id uuid,
  p_observed_mime_type text,
  p_observed_byte_size bigint,
  p_verified_sha256 text
)
returns table (
  media_id uuid,
  upload_status text,
  processing_status text,
  moderation_status text,
  finalized_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.complaint_media%rowtype;
  finalized complaints.complaint_media%rowtype;
  normalized_mime text := lower(btrim(p_observed_mime_type));
begin
  select media.* into existing
  from complaints.complaint_media as media
  where media.id = p_media_id
    and media.uploader_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_MEDIA_NOT_FOUND';
  end if;

  if existing.upload_status = 'finalized' then
    if existing.observed_mime_type <> normalized_mime
      or existing.observed_byte_size <> p_observed_byte_size
      or existing.verified_sha256 <> p_verified_sha256 then
      raise exception using errcode = '23505', message = 'COMPLAINT_MEDIA_FINALIZATION_CONFLICT';
    end if;

    return query select
      existing.id,
      existing.upload_status,
      existing.processing_status,
      existing.moderation_status,
      existing.finalized_at,
      true;
    return;
  end if;

  if existing.upload_status <> 'reserved' or existing.upload_expires_at <= current_timestamp then
    raise exception using errcode = '55000', message = 'COMPLAINT_MEDIA_INTENT_EXPIRED';
  end if;
  if normalized_mime <> existing.declared_mime_type
    or p_observed_byte_size <> existing.declared_byte_size
    or p_verified_sha256 <> existing.client_sha256 then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_OBJECT_MISMATCH';
  end if;

  update complaints.complaint_media as media
  set
    observed_mime_type = normalized_mime,
    observed_byte_size = p_observed_byte_size,
    verified_sha256 = p_verified_sha256,
    upload_status = 'finalized',
    processing_status = 'pending',
    moderation_status = 'pending',
    finalized_at = current_timestamp,
    failure_code = null
  where media.id = existing.id
  returning media.* into finalized;

  return query select
    finalized.id,
    finalized.upload_status,
    finalized.processing_status,
    finalized.moderation_status,
    finalized.finalized_at,
    false;
end;
$$;

create function public.list_complaint_media(
  p_actor_user_id uuid,
  p_draft_id uuid
)
returns table (
  media_id uuid,
  draft_id uuid,
  complaint_id uuid,
  client_media_id uuid,
  media_kind text,
  capture_source text,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  width_pixels integer,
  height_pixels integer,
  duration_seconds numeric,
  capture_location_evidence_id uuid,
  captured_at timestamptz,
  distance_to_complaint_meters double precision,
  upload_status text,
  processing_status text,
  moderation_status text,
  upload_expires_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    media.id,
    media.draft_id,
    complaint.id,
    media.client_media_id,
    media.media_kind,
    media.capture_source,
    media.bucket_id,
    media.object_path,
    media.declared_mime_type,
    media.declared_byte_size,
    media.client_sha256,
    media.width_pixels,
    media.height_pixels,
    media.duration_seconds,
    media.capture_location_evidence_id,
    media.captured_at,
    media.distance_to_complaint_meters,
    media.upload_status,
    media.processing_status,
    media.moderation_status,
    media.upload_expires_at,
    media.finalized_at,
    media.created_at,
    media.updated_at
  from complaints.complaint_media as media
  inner join complaints.complaint_drafts as draft on draft.id = media.draft_id
  left join complaints.complaints as complaint on complaint.draft_id = media.draft_id
  where media.draft_id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id
  order by media.created_at, media.id;
$$;

create function public.get_complaint_media_intent(
  p_actor_user_id uuid,
  p_media_id uuid
)
returns table (
  media_id uuid,
  draft_id uuid,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  width_pixels integer,
  height_pixels integer,
  duration_seconds numeric,
  upload_status text,
  upload_expires_at timestamptz,
  finalized_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    media.id,
    media.draft_id,
    media.bucket_id,
    media.object_path,
    media.declared_mime_type,
    media.declared_byte_size,
    media.client_sha256,
    media.width_pixels,
    media.height_pixels,
    media.duration_seconds,
    media.upload_status,
    media.upload_expires_at,
    media.finalized_at
  from complaints.complaint_media as media
  where media.id = p_media_id
    and media.uploader_user_id = p_actor_user_id;
$$;

create function public.find_complaint_duplicate_candidates(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_duplicate_policy_version_id uuid,
  p_checked_at timestamptz default current_timestamp
)
returns table (
  policy_id uuid,
  policy_version_id uuid,
  policy_version integer,
  maximum_distance_meters double precision,
  maximum_age_seconds integer,
  minimum_score numeric,
  maximum_results smallint,
  weights jsonb,
  candidate_complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  asset_id uuid,
  public_status text,
  candidate_submitted_at timestamptz,
  distance_meters double precision,
  age_seconds integer,
  description_similarity double precision,
  matching_media_hashes integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  policy routing.duplicate_detection_policy_versions%rowtype;
  source_draft complaints.complaint_drafts%rowtype;
  source_location complaints.complaint_location_evidence%rowtype;
  effective_policy_id uuid;
  applicable_policy_count integer;
begin
  select draft.* into source_draft
  from complaints.complaint_drafts as draft
  where draft.id = p_draft_id
    and draft.citizen_user_id = p_actor_user_id
    and draft.status = 'active';

  if not found or source_draft.category_id is null or source_draft.selected_location_evidence_id is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_SOURCE_INCOMPLETE';
  end if;

  select evidence.* into source_location
  from complaints.complaint_location_evidence as evidence
  where evidence.id = source_draft.selected_location_evidence_id
    and evidence.draft_id = source_draft.id;

  if p_duplicate_policy_version_id is null then
    select count(*)::integer, (array_agg(version.id order by version.id))[1]
    into applicable_policy_count, effective_policy_id
    from routing.duplicate_detection_policy_versions as version
    inner join routing.duplicate_detection_policies as identity
      on identity.id = version.duplicate_detection_policy_id
    where version.category_id = source_draft.category_id
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
      and version.effective_from <= p_checked_at
      and (version.effective_to is null or version.effective_to > p_checked_at)
      and identity.status = 'active'
      and identity.verification_status = 'verified'
      and not identity.is_placeholder
      and identity.is_routing_eligible;

    if applicable_policy_count = 0 then
      select count(*)::integer, (array_agg(version.id order by version.id))[1]
      into applicable_policy_count, effective_policy_id
      from routing.duplicate_detection_policy_versions as version
      inner join routing.duplicate_detection_policies as identity
        on identity.id = version.duplicate_detection_policy_id
      where version.category_id is null
        and version.status = 'active'
        and version.verification_status = 'verified'
        and not version.is_placeholder
        and version.is_routing_eligible
        and version.effective_from <= p_checked_at
        and (version.effective_to is null or version.effective_to > p_checked_at)
        and identity.status = 'active'
        and identity.verification_status = 'verified'
        and not identity.is_placeholder
        and identity.is_routing_eligible;
    end if;

    if applicable_policy_count <> 1 then
      raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_POLICY_AMBIGUOUS';
    end if;
  else
    effective_policy_id := p_duplicate_policy_version_id;
  end if;

  select version.* into policy
  from routing.duplicate_detection_policy_versions as version
  inner join routing.duplicate_detection_policies as identity
    on identity.id = version.duplicate_detection_policy_id
  where version.id = effective_policy_id
    and (version.category_id is null or version.category_id = source_draft.category_id)
    and version.status = 'active'
    and version.verification_status = 'verified'
    and not version.is_placeholder
    and version.is_routing_eligible
    and version.effective_from <= p_checked_at
    and (version.effective_to is null or version.effective_to > p_checked_at)
    and identity.status = 'active'
    and identity.verification_status = 'verified'
    and not identity.is_placeholder
    and identity.is_routing_eligible;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_DUPLICATE_POLICY_NOT_FOUND';
  end if;

  return query
  select
    policy.duplicate_detection_policy_id,
    policy.id,
    policy.version,
    policy.maximum_distance_meters,
    policy.maximum_age_seconds,
    policy.minimum_score,
    policy.maximum_results,
    policy.weights,
    candidate.candidate_complaint_id,
    candidate.complaint_number,
    candidate.category_id,
    candidate.category_name,
    candidate.asset_id,
    candidate.public_status,
    candidate.candidate_submitted_at,
    candidate.distance_meters,
    candidate.age_seconds,
    candidate.description_similarity,
    candidate.matching_media_hashes
  from (select 1) as policy_row
  left join lateral (
    select
      complaint.id as candidate_complaint_id,
      complaint.complaint_number,
      complaint.category_id,
      candidate_category.name as category_name,
      complaint.asset_id,
      complaint.current_status as public_status,
      complaint.submitted_at as candidate_submitted_at,
      (
        round(
          extensions.st_distance(
            candidate_location.location::extensions.geography,
            source_location.location::extensions.geography
          )::numeric / 10
        ) * 10
      )::double precision as distance_meters,
      (
        floor(
          greatest(0, extract(epoch from (p_checked_at - complaint.submitted_at))) / 60
        ) * 60
      )::integer as age_seconds,
      case
        when source_draft.description is null then null
        else extensions.similarity(lower(source_draft.description), lower(complaint.description))
      end::double precision as description_similarity,
      (
        select count(distinct candidate_media.verified_sha256)::integer
        from complaints.complaint_media as candidate_media
        where candidate_media.draft_id = complaint.draft_id
          and candidate_media.upload_status = 'finalized'
          and candidate_media.verified_sha256 in (
            select source_media.verified_sha256
            from complaints.complaint_media as source_media
            where source_media.draft_id = source_draft.id
              and source_media.upload_status = 'finalized'
              and source_media.verified_sha256 is not null
          )
      ) as matching_media_hashes
    from complaints.complaints as complaint
    inner join routing.issue_categories as candidate_category
      on candidate_category.id = complaint.category_id
    inner join complaints.complaint_location_evidence as candidate_location
      on candidate_location.id = complaint.location_evidence_id
    where complaint.category_id = source_draft.category_id
      and complaint.submitted_at <= p_checked_at
      and complaint.submitted_at
        > p_checked_at - make_interval(secs => policy.maximum_age_seconds)
      and extensions.st_dwithin(
        candidate_location.location::extensions.geography,
        source_location.location::extensions.geography,
        policy.maximum_distance_meters
      )
    order by
      extensions.st_distance(
        candidate_location.location::extensions.geography,
        source_location.location::extensions.geography
      ),
      complaint.submitted_at desc,
      complaint.id
    limit policy.maximum_results
  ) as candidate on true;
end;
$$;

create function public.record_complaint_duplicate_check(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_duplicate_policy_version_id uuid,
  p_request_id text,
  p_result_fingerprint text,
  p_checked_at timestamptz,
  p_matches jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.duplicate_check_runs%rowtype;
  run_id uuid;
  match jsonb;
  candidate_id uuid;
  match_score numeric;
  match_distance double precision;
  match_age integer;
  match_factors jsonb;
begin
  if jsonb_typeof(p_matches) <> 'array'
    or jsonb_array_length(p_matches) > 100
    or p_result_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'COMPLAINT_DUPLICATE_RESULT_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaint_drafts as draft
    where draft.id = p_draft_id and draft.citizen_user_id = p_actor_user_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_DRAFT_NOT_FOUND';
  end if;

  select run.* into existing
  from complaints.duplicate_check_runs as run
  where run.actor_user_id = p_actor_user_id and run.request_id = p_request_id;

  if found then
    if existing.draft_id <> p_draft_id
      or existing.duplicate_policy_version_id <> p_duplicate_policy_version_id
      or existing.result_fingerprint <> p_result_fingerprint then
      raise exception using errcode = '23505', message = 'COMPLAINT_DUPLICATE_RECORD_CONFLICT';
    end if;
    return existing.id;
  end if;

  insert into complaints.duplicate_check_runs (
    actor_user_id,
    draft_id,
    duplicate_policy_version_id,
    request_id,
    result_fingerprint,
    candidate_count,
    checked_at
  )
  values (
    p_actor_user_id,
    p_draft_id,
    p_duplicate_policy_version_id,
    p_request_id,
    p_result_fingerprint,
    jsonb_array_length(p_matches),
    p_checked_at
  )
  returning id into run_id;

  for match in select value from jsonb_array_elements(p_matches)
  loop
    if jsonb_typeof(match) <> 'object'
      or not (match ?& array['candidateComplaintId', 'score', 'distanceMeters', 'ageSeconds', 'factors'])
      or match - array['candidateComplaintId', 'score', 'distanceMeters', 'ageSeconds', 'factors'] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'COMPLAINT_DUPLICATE_MATCH_INVALID';
    end if;

    begin
      candidate_id := (match ->> 'candidateComplaintId')::uuid;
      match_score := (match ->> 'score')::numeric;
      match_distance := (match ->> 'distanceMeters')::double precision;
      match_age := (match ->> 'ageSeconds')::integer;
      match_factors := match -> 'factors';
    exception when others then
      raise exception using errcode = '22023', message = 'COMPLAINT_DUPLICATE_MATCH_INVALID';
    end;

    if not exists (
      select 1 from complaints.complaints as complaint where complaint.id = candidate_id
    ) then
      raise exception using errcode = '23503', message = 'COMPLAINT_DUPLICATE_CANDIDATE_NOT_FOUND';
    end if;

    insert into complaints.duplicate_check_matches (
      duplicate_check_run_id,
      candidate_complaint_id,
      score,
      distance_meters,
      age_seconds,
      factor_summary
    )
    values (
      run_id,
      candidate_id,
      match_score,
      match_distance,
      match_age,
      match_factors
    );
  end loop;

  return run_id;
end;
$$;

create function public.get_complaint_duplicate_check(
  p_actor_user_id uuid,
  p_duplicate_check_run_id uuid
)
returns table (
  duplicate_check_run_id uuid,
  checked_at timestamptz,
  candidate_count smallint,
  policy_id uuid,
  policy_version_id uuid,
  policy_version integer,
  maximum_distance_meters double precision,
  maximum_age_seconds integer,
  minimum_score numeric,
  maximum_results smallint,
  weights jsonb,
  candidate_complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  public_status text,
  candidate_submitted_at timestamptz,
  score numeric,
  distance_meters double precision,
  age_seconds integer,
  factor_summary jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    run.id,
    run.checked_at,
    run.candidate_count,
    policy.duplicate_detection_policy_id,
    policy.id,
    policy.version,
    policy.maximum_distance_meters,
    policy.maximum_age_seconds,
    policy.minimum_score,
    policy.maximum_results,
    policy.weights,
    match.candidate_complaint_id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.submitted_at,
    match.score,
    match.distance_meters,
    match.age_seconds,
    match.factor_summary
  from complaints.duplicate_check_runs as run
  inner join routing.duplicate_detection_policy_versions as policy
    on policy.id = run.duplicate_policy_version_id
  left join complaints.duplicate_check_matches as match
    on match.duplicate_check_run_id = run.id
  left join complaints.complaints as complaint
    on complaint.id = match.candidate_complaint_id
  left join routing.issue_categories as category on category.id = complaint.category_id
  where run.id = p_duplicate_check_run_id
    and run.actor_user_id = p_actor_user_id
  order by match.score desc nulls last, match.distance_meters, match.candidate_complaint_id;
$$;

create function public.claim_complaint_submission(
  p_actor_user_id uuid,
  p_draft_id uuid,
  p_idempotency_key_hash text,
  p_request_fingerprint text
)
returns table (
  submission_request_id uuid,
  state text,
  routing_request_id text,
  complaint_id uuid,
  response_payload jsonb,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing complaints.complaint_submission_requests%rowtype;
  claimed complaints.complaint_submission_requests%rowtype;
  next_id uuid := gen_random_uuid();
begin
  if p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'COMPLAINT_SUBMISSION_KEY_INVALID';
  end if;

  select request.* into existing
  from complaints.complaint_submission_requests as request
  where request.actor_user_id = p_actor_user_id
    and request.idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing.draft_id <> p_draft_id
      or existing.request_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '23505', message = 'COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT';
    end if;

    return query select
      existing.id,
      existing.state,
      existing.routing_request_id,
      existing.complaint_id,
      existing.response_payload,
      existing.state = 'completed';
    return;
  end if;

  if not exists (
    select 1
    from complaints.complaint_drafts as draft
    where draft.id = p_draft_id
      and draft.citizen_user_id = p_actor_user_id
      and draft.status = 'active'
      and draft.expires_at > current_timestamp
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_DRAFT_NOT_SUBMITTABLE';
  end if;

  insert into complaints.complaint_submission_requests (
    id,
    actor_user_id,
    draft_id,
    idempotency_key_hash,
    request_fingerprint,
    routing_request_id
  )
  values (
    next_id,
    p_actor_user_id,
    p_draft_id,
    p_idempotency_key_hash,
    p_request_fingerprint,
    'complaint-submit:' || next_id::text
  )
  returning * into claimed;

  return query select
    claimed.id,
    claimed.state,
    claimed.routing_request_id,
    claimed.complaint_id,
    claimed.response_payload,
    false;
exception
  when unique_violation then
    select request.* into existing
    from complaints.complaint_submission_requests as request
    where request.actor_user_id = p_actor_user_id
      and request.idempotency_key_hash = p_idempotency_key_hash;

    if found
      and existing.draft_id = p_draft_id
      and existing.request_fingerprint = p_request_fingerprint then
      return query select
        existing.id,
        existing.state,
        existing.routing_request_id,
        existing.complaint_id,
        existing.response_payload,
        existing.state = 'completed';
      return;
    end if;

    raise exception using errcode = '23505', message = 'COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT';
end;
$$;

create function public.get_routing_decision_replay(
  p_actor_user_id uuid,
  p_request_id text
)
returns table (
  routing_decision_id uuid,
  request_id text,
  category_id uuid,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  captured_at timestamptz,
  resolved_at timestamptz,
  decision_status text,
  confidence_score numeric,
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
  asset_match_distance_meters double precision,
  asset_ownership_version_id uuid,
  target_authority_id uuid,
  department_id uuid,
  authority_department_id uuid,
  officer_role_id uuid,
  officer_assignment_id uuid,
  route_rule_id uuid,
  route_rule_version_id uuid,
  confidence_policy_version_id uuid,
  fallback_depth smallint,
  explanation_codes text[],
  explanation_metadata jsonb,
  ambiguity_count smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    decision.id,
    decision.request_id,
    decision.category_id,
    extensions.st_x(decision.input_location),
    extensions.st_y(decision.input_location),
    decision.accuracy_meters,
    decision.captured_at,
    decision.resolved_at,
    decision.decision_status,
    decision.confidence_score,
    decision.state_id,
    decision.district_id,
    decision.taluka_id,
    decision.local_body_id,
    decision.ward_id,
    decision.state_boundary_version_id,
    decision.district_boundary_version_id,
    decision.taluka_boundary_version_id,
    decision.local_body_boundary_version_id,
    decision.ward_boundary_version_id,
    decision.asset_type_id,
    decision.asset_id,
    decision.asset_version_id,
    decision.asset_match_distance_meters,
    decision.asset_ownership_version_id,
    decision.target_authority_id,
    decision.department_id,
    decision.authority_department_id,
    decision.officer_role_id,
    decision.officer_assignment_id,
    decision.route_rule_id,
    decision.route_rule_version_id,
    decision.confidence_policy_version_id,
    decision.fallback_depth,
    decision.explanation_codes,
    decision.explanation_metadata,
    decision.ambiguity_count
  from routing.routing_decisions as decision
  where decision.actor_user_id = p_actor_user_id
    and decision.request_id = p_request_id;
$$;

create function public.submit_complaint(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid,
  p_acknowledged_duplicate_suggestion_ids uuid[] default '{}'::uuid[],
  p_emergency_disclaimer_acknowledged boolean default false
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  status text,
  submitted_at timestamptz,
  routing_decision_id uuid,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  officer_role_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  category routing.issue_categories%rowtype;
  created_complaint_id uuid := gen_random_uuid();
  created_assignment_id uuid := gen_random_uuid();
  created_number text;
  operation_at timestamptz := current_timestamp;
  finalized_media_count integer;
  maximum_media_distance double precision;
  media_record record;
  media_distance double precision;
  latest_duplicate_run_id uuid;
begin
  select submission.* into request
  from complaints.complaint_submission_requests as submission
  where submission.id = p_submission_request_id
    and submission.actor_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_SUBMISSION_NOT_FOUND';
  end if;

  if request.state = 'completed' then
    return query
    select
      complaint.id,
      complaint.draft_id,
      complaint.complaint_number,
      complaint.current_status,
      complaint.submitted_at,
      complaint.routing_decision_id,
      assignment.id,
      assignment.authority_id,
      assignment.local_body_id,
      assignment.ward_id,
      assignment.department_id,
      assignment.officer_role_id,
      true
    from complaints.complaints as complaint
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
    where complaint.id = request.complaint_id;
    return;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = request.draft_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;

  if not found
    or draft.status <> 'active'
    or draft.expires_at <= operation_at
    or draft.category_id is null
    or draft.description is null
    or draft.selected_location_evidence_id is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_DRAFT_NOT_SUBMITTABLE';
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found
    or evidence.verification_status not in ('verified', 'partially_verified')
    or evidence.spoof_risk_status in ('high', 'blocked')
    or evidence.mock_location_detected is true then
    raise exception using errcode = '23514', message = 'COMPLAINT_LOCATION_NOT_VERIFIED';
  end if;

  select issue.* into category
  from routing.issue_categories as issue
  inner join routing.issue_domains as domain on domain.id = issue.domain_id
  where issue.id = draft.category_id
    and issue.status = 'active'
    and issue.verification_status = 'verified'
    and not issue.is_placeholder
    and issue.is_routing_eligible
    and domain.status = 'active'
    and domain.verification_status = 'verified'
    and not domain.is_placeholder
    and domain.is_routing_eligible;

  if not found then
    raise exception using errcode = '23514', message = 'COMPLAINT_CATEGORY_NOT_ROUTABLE';
  end if;
  if category.is_emergency and not p_emergency_disclaimer_acknowledged then
    raise exception using errcode = '23514', message = 'COMPLAINT_EMERGENCY_DISCLAIMER_REQUIRED';
  end if;
  if category.requires_asset and draft.asset_id is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_ASSET_REQUIRED';
  end if;
  if cardinality(category.required_attributes) > 0
    and not (draft.custom_attributes ?& category.required_attributes) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REQUIRED_ATTRIBUTES_MISSING';
  end if;

  if cardinality(p_acknowledged_duplicate_suggestion_ids) <> (
    select count(distinct suggestion_id)
    from unnest(p_acknowledged_duplicate_suggestion_ids) as suggestion_id
  ) then
    raise exception using errcode = '22023', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_INVALID';
  end if;

  select run.id into latest_duplicate_run_id
  from complaints.duplicate_check_runs as run
  inner join routing.duplicate_detection_policy_versions as policy
    on policy.id = run.duplicate_policy_version_id
  inner join routing.duplicate_detection_policies as policy_identity
    on policy_identity.id = policy.duplicate_detection_policy_id
  where run.draft_id = draft.id
    and run.actor_user_id = p_actor_user_id
    and policy.status = 'active'
    and policy.verification_status = 'verified'
    and not policy.is_placeholder
    and policy.is_routing_eligible
    and policy.effective_from <= operation_at
    and (policy.effective_to is null or policy.effective_to > operation_at)
    and policy_identity.status = 'active'
    and policy_identity.verification_status = 'verified'
    and not policy_identity.is_placeholder
    and policy_identity.is_routing_eligible
  order by run.checked_at desc, run.id desc
  limit 1;

  if latest_duplicate_run_id is null then
    if cardinality(p_acknowledged_duplicate_suggestion_ids) <> 0 then
      raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_INVALID';
    end if;
  elsif exists (
    select 1
    from complaints.duplicate_check_matches as match
    where match.duplicate_check_run_id = latest_duplicate_run_id
      and not (match.candidate_complaint_id = any(p_acknowledged_duplicate_suggestion_ids))
  ) or exists (
    select 1
    from unnest(p_acknowledged_duplicate_suggestion_ids) as suggestion_id
    where not exists (
      select 1
      from complaints.duplicate_check_matches as match
      where match.duplicate_check_run_id = latest_duplicate_run_id
        and match.candidate_complaint_id = suggestion_id
    )
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED';
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id
    and route.actor_user_id = p_actor_user_id
    and route.request_id = request.routing_request_id
  for share;

  if not found
    or decision.decision_status <> 'routed'
    or decision.category_id <> draft.category_id
    or decision.asset_id is distinct from draft.asset_id
    or not extensions.st_equals(decision.input_location, evidence.location)
    or decision.accuracy_meters <> evidence.accuracy_meters
    or decision.captured_at <> evidence.captured_at then
    raise exception using errcode = '23514', message = 'COMPLAINT_ROUTING_EVIDENCE_MISMATCH';
  end if;

  select count(*)::integer into finalized_media_count
  from complaints.complaint_media as media
  where media.draft_id = draft.id
    and media.media_kind in ('photo', 'video')
    and media.upload_status = 'finalized';

  if finalized_media_count < category.minimum_media_count
    or finalized_media_count > category.maximum_media_count then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_COUNT_INVALID';
  end if;
  if exists (
    select 1
    from complaints.complaint_media as media
    where media.draft_id = draft.id
      and media.upload_status not in ('finalized', 'expired')
  ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_NOT_READY';
  end if;

  if jsonb_typeof(category.media_requirements -> 'maximumCaptureDistanceMeters') = 'number' then
    maximum_media_distance := (category.media_requirements ->> 'maximumCaptureDistanceMeters')::double precision;
  end if;

  for media_record in
    select media.id, location.location
    from complaints.complaint_media as media
    left join complaints.complaint_location_evidence as location
      on location.id = media.capture_location_evidence_id
    where media.draft_id = draft.id and media.upload_status = 'finalized'
  loop
    if media_record.location is not null then
      media_distance := extensions.st_distance(
        media_record.location::extensions.geography,
        evidence.location::extensions.geography
      );
      if maximum_media_distance is not null and media_distance > maximum_media_distance then
        raise exception using errcode = '23514', message = 'COMPLAINT_MEDIA_LOCATION_MISMATCH';
      end if;
      update complaints.complaint_media as media
      set distance_to_complaint_meters = media_distance
      where media.id = media_record.id;
    end if;
  end loop;

  created_number := format(
    'LW-%s-%s',
    to_char(operation_at at time zone 'UTC', 'YYYYMMDD'),
    lpad(nextval('complaints.complaint_number_sequence'::regclass)::text, 8, '0')
  );

  insert into complaints.complaints (
    id,
    draft_id,
    complaint_number,
    citizen_user_id,
    category_id,
    asset_id,
    description,
    description_language,
    custom_attributes,
    location_evidence_id,
    routing_decision_id,
    current_status,
    visibility,
    submitted_at,
    created_at,
    updated_at
  )
  values (
    created_complaint_id,
    draft.id,
    created_number,
    p_actor_user_id,
    draft.category_id,
    draft.asset_id,
    draft.description,
    draft.description_language,
    draft.custom_attributes,
    evidence.id,
    decision.id,
    'submitted',
    'private',
    operation_at,
    operation_at,
    operation_at
  );

  insert into complaints.complaint_assignments (
    id,
    complaint_id,
    routing_decision_id,
    authority_id,
    local_body_id,
    ward_id,
    department_id,
    authority_department_id,
    officer_role_id,
    officer_assignment_id,
    asset_type_id,
    asset_id,
    asset_version_id,
    asset_ownership_version_id,
    assigned_at
  )
  values (
    created_assignment_id,
    created_complaint_id,
    decision.id,
    decision.target_authority_id,
    decision.local_body_id,
    decision.ward_id,
    decision.department_id,
    decision.authority_department_id,
    decision.officer_role_id,
    decision.officer_assignment_id,
    decision.asset_type_id,
    decision.asset_id,
    decision.asset_version_id,
    decision.asset_ownership_version_id,
    operation_at
  );

  insert into complaints.complaint_status_history (
    complaint_id,
    sequence,
    from_status,
    to_status,
    actor_user_id,
    event_source,
    reason_code,
    public_message,
    request_id,
    occurred_at
  )
  values (
    created_complaint_id,
    1,
    'draft',
    'submitted',
    p_actor_user_id,
    'citizen_submission',
    'COMPLAINT_SUBMITTED',
    'Complaint submitted successfully.',
    request.routing_request_id,
    operation_at
  );

  update complaints.complaint_drafts as source
  set
    status = 'submitted',
    submitted_at = operation_at,
    revision = source.revision + 1
  where source.id = draft.id;

  update complaints.complaint_submission_requests as submission
  set
    state = 'completed',
    routing_decision_id = decision.id,
    complaint_id = created_complaint_id,
    acknowledged_duplicate_suggestion_ids = p_acknowledged_duplicate_suggestion_ids,
    emergency_disclaimer_acknowledged = p_emergency_disclaimer_acknowledged,
    response_payload = jsonb_build_object(
      'complaintId', created_complaint_id,
      'draftId', draft.id,
      'complaintNumber', created_number,
      'status', 'submitted',
      'submittedAt', operation_at,
      'routingDecisionId', decision.id,
      'assignmentId', created_assignment_id,
      'authorityId', decision.target_authority_id,
      'localBodyId', decision.local_body_id,
      'wardId', decision.ward_id,
      'departmentId', decision.department_id,
      'officerRoleId', decision.officer_role_id
    ),
    completed_at = operation_at
  where submission.id = request.id;

  return query select
    created_complaint_id,
    draft.id,
    created_number,
    'submitted'::text,
    operation_at,
    decision.id,
    created_assignment_id,
    decision.target_authority_id,
    decision.local_body_id,
    decision.ward_id,
    decision.department_id,
    decision.officer_role_id,
    false;
end;
$$;

create function public.list_owned_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMPLAINT_LIST_CURSOR_INVALID';
  end if;

  return query
  select
    complaint.id,
    complaint.draft_id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.visibility,
    complaint.submitted_at,
    complaint.updated_at,
    assignment.authority_id,
    assignment.local_body_id,
    assignment.ward_id,
    assignment.department_id
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
  inner join routing.issue_categories as category on category.id = complaint.category_id
  where complaint.citizen_user_id = p_actor_user_id
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit;
end;
$$;

create function public.get_owned_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  asset_id uuid,
  description text,
  description_language text,
  custom_attributes jsonb,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  location_evidence_id uuid,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_device_recorded_at timestamptz,
  mock_location_detected boolean,
  location_verification_status text,
  location_verification_score numeric,
  routing_decision_id uuid,
  routing_request_id text,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  authority_department_id uuid,
  officer_role_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id,
    complaint.draft_id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.asset_id,
    complaint.description,
    complaint.description_language,
    complaint.custom_attributes,
    complaint.current_status,
    complaint.visibility,
    complaint.submitted_at,
    complaint.updated_at,
    evidence.id,
    extensions.st_x(evidence.location),
    extensions.st_y(evidence.location),
    evidence.accuracy_meters,
    evidence.provider,
    evidence.captured_at,
    evidence.device_recorded_at,
    evidence.mock_location_detected,
    evidence.verification_status,
    evidence.verification_score,
    complaint.routing_decision_id,
    submission.routing_request_id,
    assignment.id,
    assignment.authority_id,
    assignment.local_body_id,
    assignment.ward_id,
    assignment.department_id,
    assignment.authority_department_id,
    assignment.officer_role_id
  from complaints.complaints as complaint
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  inner join routing.issue_categories as category on category.id = complaint.category_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
  inner join complaints.complaint_submission_requests as submission
    on submission.complaint_id = complaint.id
  where complaint.id = p_complaint_id
    and complaint.citizen_user_id = p_actor_user_id;
$$;

create function public.get_complaint_timeline(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (
  event_id uuid,
  sequence integer,
  from_status text,
  to_status text,
  reason_code text,
  public_message text,
  occurred_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    history.id,
    history.sequence,
    history.from_status,
    history.to_status,
    history.reason_code,
    history.public_message,
    history.occurred_at
  from complaints.complaint_status_history as history
  inner join complaints.complaints as complaint on complaint.id = history.complaint_id
  where history.complaint_id = p_complaint_id
    and complaint.citizen_user_id = p_actor_user_id
  order by history.sequence;
$$;

revoke all on function public.create_complaint_draft(
  uuid, text, text, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.get_complaint_draft(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_complaint_draft(
  uuid, uuid, bigint, uuid, uuid, text, text, jsonb, uuid
) from public, anon, authenticated;
revoke all on function public.discard_complaint_draft(uuid, uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.append_complaint_location_evidence(
  uuid, uuid, uuid, text, double precision, double precision, double precision,
  text, timestamptz, timestamptz, boolean, jsonb
) from public, anon, authenticated;
revoke all on function public.list_complaint_location_evidence(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reserve_complaint_media(
  uuid, uuid, uuid, text, text, text, bigint, text, integer, integer, numeric, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.finalize_complaint_media(uuid, uuid, text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.list_complaint_media(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_complaint_media_intent(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.find_complaint_duplicate_candidates(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_complaint_duplicate_check(
  uuid, uuid, uuid, text, text, timestamptz, jsonb
) from public, anon, authenticated;
revoke all on function public.get_complaint_duplicate_check(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.claim_complaint_submission(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.get_routing_decision_replay(uuid, text)
  from public, anon, authenticated;
revoke all on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;
revoke all on function public.list_owned_complaints(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.get_owned_complaint(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_complaint_timeline(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_complaint_draft(
  uuid, text, text, uuid, uuid, text, text, jsonb
) to service_role;
grant execute on function public.get_complaint_draft(uuid, uuid) to service_role;
grant execute on function public.update_complaint_draft(
  uuid, uuid, bigint, uuid, uuid, text, text, jsonb, uuid
) to service_role;
grant execute on function public.discard_complaint_draft(uuid, uuid, bigint) to service_role;
grant execute on function public.append_complaint_location_evidence(
  uuid, uuid, uuid, text, double precision, double precision, double precision,
  text, timestamptz, timestamptz, boolean, jsonb
) to service_role;
grant execute on function public.list_complaint_location_evidence(uuid, uuid) to service_role;
grant execute on function public.reserve_complaint_media(
  uuid, uuid, uuid, text, text, text, bigint, text, integer, integer, numeric, uuid, timestamptz
) to service_role;
grant execute on function public.finalize_complaint_media(uuid, uuid, text, bigint, text)
  to service_role;
grant execute on function public.list_complaint_media(uuid, uuid) to service_role;
grant execute on function public.get_complaint_media_intent(uuid, uuid) to service_role;
grant execute on function public.find_complaint_duplicate_candidates(uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.record_complaint_duplicate_check(
  uuid, uuid, uuid, text, text, timestamptz, jsonb
) to service_role;
grant execute on function public.get_complaint_duplicate_check(uuid, uuid) to service_role;
grant execute on function public.claim_complaint_submission(uuid, uuid, text, text)
  to service_role;
grant execute on function public.get_routing_decision_replay(uuid, text) to service_role;
grant execute on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  to service_role;
grant execute on function public.list_owned_complaints(uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.get_owned_complaint(uuid, uuid) to service_role;
grant execute on function public.get_complaint_timeline(uuid, uuid) to service_role;

comment on function public.create_complaint_draft(uuid, text, text, uuid, uuid, text, text, jsonb) is
  'Service-only idempotent creation of a private resumable complaint draft.';
comment on function public.reserve_complaint_media(uuid, uuid, uuid, text, text, text, bigint, text, integer, integer, numeric, uuid, timestamptz) is
  'Service-only retry-safe reservation of an opaque private Storage object path.';
comment on function public.finalize_complaint_media(uuid, uuid, text, bigint, text) is
  'Service-only exact-replay finalization after the API verifies the reserved Storage object.';
comment on function public.claim_complaint_submission(uuid, uuid, text, text) is
  'Claims a durable complaint-submission idempotency record and stable routing request ID.';
comment on function public.get_routing_decision_replay(uuid, text) is
  'Service-only lookup of previously stored routing evidence for configuration-stable HTTP retries.';
comment on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean) is
  'Atomically validates capture/routing/duplicate evidence and creates one private complaint, assignment, history event, and replay receipt.';
