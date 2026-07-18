-- Local Wellness current-session Supabase upgrade
--
-- Generated deterministically by:
--   pnpm database:current-session:generate
--
-- For an existing target confirmed complete through migration 38:
--   20260716115000_phase_10_profile_images.sql
--
-- This one SQL Editor query detects and skips a complete migration 39-43
-- prefix, rejects partial or non-contiguous schema state, and executes only the
-- missing immutable source migrations in order. It does not modify Supabase's
-- migration ledger and does not load seed data. The whole query is atomic.
--
-- Exact source manifest (SHA-256 of source file bytes):
-- 522b3c83ae3817cfc438912c7bde7b2d9e2948ef2646b51ff73dafbfce04e9b0  20260716116000_phase_10_complaint_location_proximity.sql
-- 3270d23cc41dbfccb53552dc8698642fc311095da50b89085e4cb8904ca44715  20260716117000_phase_10_routing_delivery_readiness.sql
-- 3c97e81d922b67a90c2bb7b48f387bc8a530af93154c55a617bb8dc6340f8c76  20260716118000_bmc_ward_relationship_versions.sql
-- 58d2317126be57edf611b1cde1287ca63480cfbaf202906b3be93a4c2d1cddeb  20260716119000_government_invitation_scope_options.sql
-- a2d81b05dec142d8dceb75c6db4bcbeb5c6e60257c242bb9706c351e737d764c  20260717100000_public_complaint_engagements.sql

begin;

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('local_wellness_current_session_upgrade_39_43', 0)
);

create temp table local_wellness_upgrade_fingerprints (
  migration_position integer primary key,
  migration_name text not null unique,
  is_present boolean not null,
  is_complete boolean not null
) on commit drop;

create temp table local_wellness_upgrade_state (
  singleton boolean primary key default true check (singleton),
  cutoff_position integer not null,
  cutoff_name text
) on commit drop;

create or replace function pg_temp.local_wellness_relation_exists(p_qualified_name text)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select pg_catalog.to_regclass(p_qualified_name) is not null;
$helper$;

create or replace function pg_temp.local_wellness_procedure_exists(p_signature text)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select pg_catalog.to_regprocedure(p_signature) is not null;
$helper$;

create or replace function pg_temp.local_wellness_policy_exists(
  p_schema_name text,
  p_table_name text,
  p_policy_name text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = p_schema_name
      and policy.tablename = p_table_name
      and policy.policyname = p_policy_name
  );
$helper$;

create or replace function pg_temp.local_wellness_trigger_exists(
  p_schema_name text,
  p_table_name text,
  p_trigger_name text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    inner join pg_catalog.pg_class as relation on relation.oid = trigger_record.tgrelid
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = p_schema_name
      and relation.relname = p_table_name
      and trigger_record.tgname = p_trigger_name
      and not trigger_record.tgisinternal
  );
$helper$;

create or replace function pg_temp.local_wellness_constraint_exists(
  p_schema_name text,
  p_table_name text,
  p_constraint_name text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    inner join pg_catalog.pg_class as relation on relation.oid = constraint_record.conrelid
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = p_schema_name
      and relation.relname = p_table_name
      and constraint_record.conname = p_constraint_name
      and constraint_record.convalidated
  );
$helper$;

create or replace function pg_temp.local_wellness_column_exists(
  p_schema_name text,
  p_table_name text,
  p_column_name text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    inner join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = p_schema_name
      and relation.relname = p_table_name
      and attribute.attname = p_column_name
      and attribute.attnum > 0
      and not attribute.attisdropped
  );
$helper$;

create or replace function pg_temp.local_wellness_forced_rls(p_qualified_name text)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select coalesce((
    select relation.relrowsecurity and relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    where relation.oid = pg_catalog.to_regclass(p_qualified_name)
  ), false);
$helper$;

create or replace function pg_temp.local_wellness_private_bucket_exists(p_bucket_id text)
returns boolean
language plpgsql
stable
set search_path = ''
as $helper$
declare
  result boolean;
begin
  if pg_catalog.to_regclass('storage.buckets') is null then
    return false;
  end if;

  execute 'select exists (select 1 from storage.buckets where id = $1 and public = false)'
    into result
    using p_bucket_id;
  return result;
end;
$helper$;

do $verify_baseline$
begin
  if not (pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_object_path')
      and pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_updated_at')
      and pg_temp.local_wellness_procedure_exists('private.set_profile_avatar_version()')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_select_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_insert_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_update_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_delete_own')
      and pg_temp.local_wellness_private_bucket_exists('profile-images-private')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_38_BASELINE_REQUIRED',
      hint = 'This compact upgrade is only for a database complete through 20260716115000_phase_10_profile_images.sql.';
  end if;
end;
$verify_baseline$;

insert into local_wellness_upgrade_fingerprints (
  migration_position,
  migration_name,
  is_present,
  is_complete
)
values
  (
    39,
    '20260716116000_phase_10_complaint_location_proximity.sql',
    (pg_temp.local_wellness_procedure_exists('complaints.enforce_v1_location_proximity()')
      or pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check')
      or pg_temp.local_wellness_trigger_exists('complaints', 'complaint_location_evidence', 'complaint_location_evidence_enforce_v1_proximity')),
    (pg_temp.local_wellness_procedure_exists('complaints.enforce_v1_location_proximity()')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_media_proximity_check')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_location_evidence', 'complaint_location_evidence_enforce_v1_proximity'))
  ),
  (
    40,
    '20260716117000_phase_10_routing_delivery_readiness.sql',
    (pg_temp.local_wellness_procedure_exists('governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)')
      or pg_temp.local_wellness_procedure_exists('complaints.assignment_delivery_readiness(uuid)')),
    (pg_temp.local_wellness_procedure_exists('governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)')
      and pg_temp.local_wellness_procedure_exists('complaints.assignment_delivery_readiness(uuid)')
      and pg_temp.local_wellness_procedure_exists('complaints.assignment_summary(uuid)'))
  ),
  (
    41,
    '20260716118000_bmc_ward_relationship_versions.sql',
    (pg_temp.local_wellness_relation_exists('governance.ward_administrative_zone_membership_versions')
      or pg_temp.local_wellness_relation_exists('governance.ward_boundary_crosswalk_versions')),
    (pg_temp.local_wellness_relation_exists('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_relation_exists('governance.ward_boundary_crosswalk_versions')
      and pg_temp.local_wellness_procedure_exists('governance.validate_ward_zone_membership_version()')
      and pg_temp.local_wellness_procedure_exists('governance.validate_ward_boundary_crosswalk_version()')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_administrative_zone_membership_versions', 'ward_zone_membership_versions_validate')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_boundary_crosswalk_versions', 'ward_boundary_crosswalk_versions_validate')
      and pg_temp.local_wellness_forced_rls('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_forced_rls('governance.ward_boundary_crosswalk_versions'))
  ),
  (
    42,
    '20260716119000_government_invitation_scope_options.sql',
    (pg_temp.local_wellness_procedure_exists('public.list_government_invitation_options(uuid[])')),
    (pg_temp.local_wellness_procedure_exists('public.list_government_invitation_options(uuid[])'))
  ),
  (
    43,
    '20260717100000_public_complaint_engagements.sql',
    (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')
      or pg_temp.local_wellness_procedure_exists('public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)')),
    (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_forced_rls('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_pkey')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_time_check')
      and pg_temp.local_wellness_procedure_exists('complaints.public_complaint_support_count(uuid)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_engagements(uuid,uuid[])')
      and pg_temp.local_wellness_procedure_exists('public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)'))
  );

do $detect_state$
declare
  detected_cutoff integer;
  first_missing integer;
  first_missing_name text;
  partial_name text;
begin
  select fingerprint.migration_name
  into partial_name
  from local_wellness_upgrade_fingerprints as fingerprint
  where fingerprint.is_present
    and not fingerprint.is_complete
  order by fingerprint.migration_position
  limit 1;

  if partial_name is not null then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format('LOCAL_WELLNESS_PARTIAL_MIGRATION: %s', partial_name),
      hint = 'Reconcile this partially present migration before retrying; do not suppress the conflict.';
  end if;

  select min(fingerprint.migration_position)
  into first_missing
  from local_wellness_upgrade_fingerprints as fingerprint
  where not fingerprint.is_complete;

  detected_cutoff := coalesce(first_missing - 1, 43);

  if first_missing is not null then
    select fingerprint.migration_name
    into first_missing_name
    from local_wellness_upgrade_fingerprints as fingerprint
    where fingerprint.migration_position = first_missing;

    if exists (
      select 1
      from local_wellness_upgrade_fingerprints as fingerprint
      where fingerprint.migration_position > first_missing
        and fingerprint.is_present
    ) then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'LOCAL_WELLNESS_NONCONTIGUOUS_MIGRATION_HISTORY: first missing %s',
          first_missing_name
        ),
        hint = 'Later Local Wellness objects exist. Reconcile schema history before retrying.';
    end if;
  end if;

  insert into local_wellness_upgrade_state (cutoff_position, cutoff_name)
  values (
    detected_cutoff,
    case
      when detected_cutoff = 38 then '20260716115000_phase_10_profile_images.sql'
      else (
        select fingerprint.migration_name
        from local_wellness_upgrade_fingerprints as fingerprint
        where fingerprint.migration_position = detected_cutoff
      )
    end
  );

  raise notice 'Local Wellness detected current-session cutoff: % of 43', detected_cutoff;
end;
$detect_state$;

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716116000_phase_10_complaint_location_proximity.sql
-- ============================================================================
do $guard_39$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if current_cutoff >= 39 then
    raise notice 'Skipping already-complete migration 20260716116000_phase_10_complaint_location_proximity.sql';
    return;
  end if;

  if current_cutoff <> 38 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716116000_phase_10_complaint_location_proximity.sql';
  end if;

  execute $migration_20260716116000_phase_10_complaint_location_proximity$
alter table routing.issue_categories
  alter column location_verification_requirements set default jsonb_build_object(
    'maximumAccuracyMeters', 50,
    'maximumAgeSeconds', 300
  ),
  alter column media_requirements set default jsonb_build_object(
    'maximumCaptureDistanceMeters', 50
  );

update routing.issue_categories
set
  location_verification_requirements = jsonb_set(
    location_verification_requirements,
    '{maximumAccuracyMeters}',
    '50'::jsonb,
    true
  ),
  media_requirements = jsonb_set(
    media_requirements,
    '{maximumCaptureDistanceMeters}',
    '50'::jsonb,
    true
  );

alter table routing.issue_categories
  add constraint issue_categories_v1_location_accuracy_check check (
    (location_verification_requirements ->> 'maximumAccuracyMeters')::numeric <= 50
  ),
  add constraint issue_categories_v1_media_proximity_check check (
    jsonb_typeof(media_requirements -> 'maximumCaptureDistanceMeters') = 'number'
    and (media_requirements ->> 'maximumCaptureDistanceMeters')::numeric between 1 and 50
  );

create function complaints.enforce_v1_location_proximity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maximum_accuracy double precision;
  maximum_media_distance double precision;
  selected_location extensions.geometry(Point, 4326);
  capture_distance double precision;
begin
  select
    (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
    (category.media_requirements ->> 'maximumCaptureDistanceMeters')::double precision,
    selected.location
  into maximum_accuracy, maximum_media_distance, selected_location
  from complaints.complaint_drafts as draft
  inner join routing.issue_categories as category on category.id = draft.category_id
  left join complaints.complaint_location_evidence as selected
    on selected.id = draft.selected_location_evidence_id
  where draft.id = new.draft_id
    and draft.citizen_user_id = new.actor_user_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_LOCATION_CATEGORY_REQUIRED';
  end if;

  if new.accuracy_meters > maximum_accuracy then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_LOCATION_ACCURACY_EXCEEDS_V1_LIMIT';
  end if;

  if new.evidence_type = 'media_capture' then
    if selected_location is null then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_CURRENT_LOCATION_REQUIRED';
    end if;

    capture_distance := extensions.st_distance(
      new.location::extensions.geography,
      selected_location::extensions.geography
    );

    if capture_distance > maximum_media_distance then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_MEDIA_LOCATION_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

create trigger complaint_location_evidence_enforce_v1_proximity
before insert on complaints.complaint_location_evidence
for each row
execute function complaints.enforce_v1_location_proximity();

revoke all on function complaints.enforce_v1_location_proximity() from public;

comment on function complaints.enforce_v1_location_proximity() is
  'Fail-closed V1 guard requiring at most 50 metre device accuracy and at most 50 metre media-to-issue distance.';
$migration_20260716116000_phase_10_complaint_location_proximity$;

  if not (pg_temp.local_wellness_procedure_exists('complaints.enforce_v1_location_proximity()')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_media_proximity_check')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_location_evidence', 'complaint_location_evidence_enforce_v1_proximity')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716116000_phase_10_complaint_location_proximity.sql';
  end if;

  update local_wellness_upgrade_state
  set
    cutoff_position = 39,
    cutoff_name = '20260716116000_phase_10_complaint_location_proximity.sql'
  where singleton;

  raise notice 'Applied migration 20260716116000_phase_10_complaint_location_proximity.sql';
end;
$guard_39$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716116000_phase_10_complaint_location_proximity.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716117000_phase_10_routing_delivery_readiness.sql
-- ============================================================================
do $guard_40$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if current_cutoff >= 40 then
    raise notice 'Skipping already-complete migration 20260716117000_phase_10_routing_delivery_readiness.sql';
    return;
  end if;

  if current_cutoff <> 39 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716117000_phase_10_routing_delivery_readiness.sql';
  end if;

  execute $migration_20260716117000_phase_10_routing_delivery_readiness$
create function governance.resolve_complaint_contact_readiness(
  p_authority_id uuid,
  p_local_body_id uuid,
  p_ward_id uuid,
  p_authority_department_id uuid,
  p_office_id uuid,
  p_officer_id uuid,
  p_officer_assignment_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with matching_contacts as (
    select
      case
        when contact.officer_assignment_id = p_officer_assignment_id
          then 'officer_assignment'
        when contact.officer_id = p_officer_id then 'officer'
        when contact.office_id = p_office_id then 'office'
        when contact.authority_department_id = p_authority_department_id
          then 'authority_department'
        when contact.ward_id = p_ward_id then 'ward'
        when contact.local_body_id = p_local_body_id then 'local_body'
        when contact.authority_id = p_authority_id then 'authority'
      end as contact_scope,
      case
        when contact.officer_assignment_id = p_officer_assignment_id then 1
        when contact.officer_id = p_officer_id then 2
        when contact.office_id = p_office_id then 3
        when contact.authority_department_id = p_authority_department_id then 4
        when contact.ward_id = p_ward_id then 5
        when contact.local_body_id = p_local_body_id then 6
        when contact.authority_id = p_authority_id then 7
      end as scope_priority,
      contact.channel_type
    from governance.current_verified_contacts as contact
    where contact.is_complaint_delivery_approved
      and contact.intended_use = 'complaint_intake'
      and (
        (p_officer_assignment_id is not null
          and contact.officer_assignment_id = p_officer_assignment_id)
        or (p_officer_id is not null and contact.officer_id = p_officer_id)
        or (p_office_id is not null and contact.office_id = p_office_id)
        or (
          p_authority_department_id is not null
          and contact.authority_department_id = p_authority_department_id
        )
        or (p_ward_id is not null and contact.ward_id = p_ward_id)
        or (p_local_body_id is not null and contact.local_body_id = p_local_body_id)
        or (p_authority_id is not null and contact.authority_id = p_authority_id)
      )
  ),
  selected_scope as (
    select
      contact_scope,
      scope_priority,
      array_agg(distinct channel_type order by channel_type) as channel_types
    from matching_contacts
    where contact_scope is not null
    group by contact_scope, scope_priority
    order by scope_priority
    limit 1
  )
  select case
    when selected_scope.contact_scope is null then jsonb_build_object(
      'externalContactStatus', 'not_available',
      'contactScope', null,
      'approvedChannelTypes', '[]'::jsonb,
      'automaticOutboundDelivery', false,
      'reason', 'verified_queue_no_approved_external_contact'
    )
    when selected_scope.contact_scope in ('officer_assignment', 'officer')
      then jsonb_build_object(
        'externalContactStatus', 'verified_officer_contact',
        'contactScope', selected_scope.contact_scope,
        'approvedChannelTypes', to_jsonb(selected_scope.channel_types),
        'automaticOutboundDelivery', false,
        'reason', 'verified_officer_contact_available'
      )
    else jsonb_build_object(
      'externalContactStatus', 'verified_governing_body_contact',
      'contactScope', selected_scope.contact_scope,
      'approvedChannelTypes', to_jsonb(selected_scope.channel_types),
      'automaticOutboundDelivery', false,
      'reason', 'verified_governing_body_contact_available'
    )
  end
  from (select 1) as singleton
  left join selected_scope on true;
$$;

create function complaints.assignment_delivery_readiness(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target complaints.complaint_assignments%rowtype;
  current_officer_id uuid;
  current_office_id uuid;
  current_officer_assignment_id uuid;
begin
  select assignment.* into target
  from complaints.complaint_assignments as assignment
  where assignment.id = p_assignment_id;

  if not found or not complaints.is_verified_assignment_scope(
    target.authority_id,
    target.local_body_id,
    target.ward_id,
    target.department_id,
    target.authority_department_id,
    target.officer_role_id,
    null,
    current_timestamp
  ) then
    return jsonb_build_object(
      'governmentQueueStatus', 'unavailable',
      'externalContactStatus', 'not_available',
      'contactScope', null,
      'approvedChannelTypes', '[]'::jsonb,
      'automaticOutboundDelivery', false,
      'reason', 'verified_assignment_scope_unavailable'
    );
  end if;

  if complaints.assignment_has_current_verified_officer(target.id, current_timestamp) then
    select
      officer_assignment.id,
      officer_assignment.officer_id,
      officer_assignment.office_id
    into
      current_officer_assignment_id,
      current_officer_id,
      current_office_id
    from governance.officer_assignments as officer_assignment
    where officer_assignment.id = target.officer_assignment_id;
  end if;

  return jsonb_build_object('governmentQueueStatus', 'verified_scope')
    || governance.resolve_complaint_contact_readiness(
      target.authority_id,
      target.local_body_id,
      target.ward_id,
      target.authority_department_id,
      current_office_id,
      current_officer_id,
      current_officer_assignment_id
    );
end;
$$;

create or replace function complaints.assignment_summary(p_assignment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', assignment.id,
    'authorityId', assignment.authority_id,
    'authorityName', authority.name,
    'localBodyId', assignment.local_body_id,
    'localBodyName', local_body.name,
    'wardId', assignment.ward_id,
    'wardName', ward.name,
    'departmentId', assignment.department_id,
    'departmentName', department.name,
    'authorityDepartmentId', assignment.authority_department_id,
    'officerRoleId', assignment.officer_role_id,
    'officerRoleName', officer_role.name,
    'officerAssignmentId', officer_assignment.id,
    'officerName', officer.full_name,
    'source', case
      when assignment.assignment_source = 'routing_decision' then 'routing_decision'
      when assignment.assignment_source = 'government_transfer' then 'transfer'
      else 'manual_assignment'
    end,
    'status', assignment.status,
    'assignedAt', assignment.effective_from,
    'endedAt', assignment.effective_to,
    'deliveryReadiness', complaints.assignment_delivery_readiness(assignment.id)
  )
  from complaints.complaint_assignments as assignment
  inner join governance.authorities as authority on authority.id = assignment.authority_id
  inner join governance.local_bodies as local_body on local_body.id = assignment.local_body_id
  left join governance.wards as ward on ward.id = assignment.ward_id
  inner join governance.departments as department on department.id = assignment.department_id
  inner join governance.officer_roles as officer_role on officer_role.id = assignment.officer_role_id
  left join governance.officer_assignments as officer_assignment
    on officer_assignment.id = assignment.officer_assignment_id
   and (
     assignment.status <> 'active'
     or assignment.effective_to is not null
     or complaints.assignment_has_current_verified_officer(
       assignment.id,
       current_timestamp
     )
   )
  left join governance.officers as officer on officer.id = officer_assignment.officer_id
  where assignment.id = p_assignment_id;
$$;

revoke all on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) from public, anon, authenticated;
revoke all on function complaints.assignment_delivery_readiness(uuid)
  from public, anon, authenticated;

grant execute on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) to service_role;
grant execute on function complaints.assignment_delivery_readiness(uuid)
  to service_role;

comment on function governance.resolve_complaint_contact_readiness(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) is
  'Reports the most specific manually verified, complaint-delivery-approved contact scope without exposing contact values or performing outbound delivery.';
comment on function complaints.assignment_delivery_readiness(uuid) is
  'Distinguishes verified government-queue routing from optional external official-contact readiness; no outbound delivery is implied.';
$migration_20260716117000_phase_10_routing_delivery_readiness$;

  if not (pg_temp.local_wellness_procedure_exists('governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)')
      and pg_temp.local_wellness_procedure_exists('complaints.assignment_delivery_readiness(uuid)')
      and pg_temp.local_wellness_procedure_exists('complaints.assignment_summary(uuid)')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716117000_phase_10_routing_delivery_readiness.sql';
  end if;

  update local_wellness_upgrade_state
  set
    cutoff_position = 40,
    cutoff_name = '20260716117000_phase_10_routing_delivery_readiness.sql'
  where singleton;

  raise notice 'Applied migration 20260716117000_phase_10_routing_delivery_readiness.sql';
end;
$guard_40$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716117000_phase_10_routing_delivery_readiness.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716118000_bmc_ward_relationship_versions.sql
-- ============================================================================
do $guard_41$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if current_cutoff >= 41 then
    raise notice 'Skipping already-complete migration 20260716118000_bmc_ward_relationship_versions.sql';
    return;
  end if;

  if current_cutoff <> 40 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716118000_bmc_ward_relationship_versions.sql';
  end if;

  execute $migration_20260716118000_bmc_ward_relationship_versions$
create table governance.ward_administrative_zone_membership_versions (
  id uuid primary key default gen_random_uuid(),
  operational_ward_id uuid not null
    references governance.wards (id) on delete restrict,
  administrative_zone_id uuid not null
    references governance.administrative_units (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid
    references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_zone_membership_version_check check (version >= 1),
  constraint ward_zone_membership_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint ward_zone_membership_verification_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint ward_zone_membership_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint ward_zone_membership_routing_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint ward_zone_membership_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint ward_zone_membership_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint ward_zone_membership_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint ward_zone_membership_ward_version_unique unique (
    operational_ward_id,
    version
  )
);

create table governance.ward_boundary_crosswalk_versions (
  id uuid primary key default gen_random_uuid(),
  operational_ward_id uuid not null
    references governance.wards (id) on delete restrict,
  official_boundary_version_id uuid not null
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  version integer not null,
  relationship_type text not null,
  routing_instruction text not null,
  auto_route_allowed boolean not null default false,
  notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid
    references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_boundary_crosswalk_version_check check (version >= 1),
  constraint ward_boundary_crosswalk_relationship_check check (
    relationship_type in ('one_to_one', 'one_to_many_child')
  ),
  constraint ward_boundary_crosswalk_instruction_check check (
    routing_instruction = btrim(routing_instruction)
    and char_length(routing_instruction) between 1 and 1000
  ),
  constraint ward_boundary_crosswalk_notes_check check (
    notes is null
    or (notes = btrim(notes) and char_length(notes) between 1 and 2000)
  ),
  constraint ward_boundary_crosswalk_auto_route_check check (
    not auto_route_allowed or relationship_type = 'one_to_one'
  ),
  constraint ward_boundary_crosswalk_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint ward_boundary_crosswalk_verification_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint ward_boundary_crosswalk_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint ward_boundary_crosswalk_routing_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and auto_route_allowed
    )
  ),
  constraint ward_boundary_crosswalk_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint ward_boundary_crosswalk_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint ward_boundary_crosswalk_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint ward_boundary_crosswalk_ward_version_unique unique (
    operational_ward_id,
    version
  )
);

alter table governance.ward_administrative_zone_membership_versions
  add constraint ward_zone_membership_no_effective_overlap
  exclude using gist (
    operational_ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table governance.ward_boundary_crosswalk_versions
  add constraint ward_boundary_crosswalk_no_effective_overlap
  exclude using gist (
    operational_ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index ward_zone_membership_one_current_idx
  on governance.ward_administrative_zone_membership_versions (operational_ward_id)
  where effective_to is null and status = 'active';
create index ward_zone_membership_zone_effective_idx
  on governance.ward_administrative_zone_membership_versions (
    administrative_zone_id,
    status,
    effective_from,
    effective_to
  );
create index ward_zone_membership_routing_idx
  on governance.ward_administrative_zone_membership_versions (
    operational_ward_id,
    status,
    is_routing_eligible,
    effective_from,
    effective_to
  );

create unique index ward_boundary_crosswalk_one_current_idx
  on governance.ward_boundary_crosswalk_versions (operational_ward_id)
  where effective_to is null and status = 'active';
create index ward_boundary_crosswalk_boundary_effective_idx
  on governance.ward_boundary_crosswalk_versions (
    official_boundary_version_id,
    status,
    effective_from,
    effective_to
  );
create index ward_boundary_crosswalk_routing_idx
  on governance.ward_boundary_crosswalk_versions (
    operational_ward_id,
    status,
    is_routing_eligible,
    auto_route_allowed,
    effective_from,
    effective_to
  );

create function governance.validate_ward_zone_membership_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operational_ward governance.wards%rowtype;
  administrative_zone governance.administrative_units%rowtype;
begin
  select ward.* into operational_ward
  from governance.wards as ward
  where ward.id = new.operational_ward_id;

  select administrative_unit.* into administrative_zone
  from governance.administrative_units as administrative_unit
  where administrative_unit.id = new.administrative_zone_id;

  if operational_ward.id is null
    or administrative_zone.id is null
    or administrative_zone.unit_type <> 'zone'
    or administrative_zone.local_body_id is null
    or administrative_zone.local_body_id <> operational_ward.local_body_id then
    raise exception using
      errcode = '23514',
      message = 'WARD_ZONE_MEMBERSHIP_SCOPE_INVALID';
  end if;

  if new.is_routing_eligible and (
    operational_ward.status <> 'active'
    or operational_ward.verification_status <> 'verified'
    or operational_ward.is_placeholder
    or not operational_ward.is_routing_eligible
    or administrative_zone.status <> 'active'
    or administrative_zone.verification_status <> 'verified'
    or administrative_zone.is_placeholder
    or not administrative_zone.is_routing_eligible
    or not exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.id = operational_ward.local_body_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'WARD_ZONE_MEMBERSHIP_ROUTING_SCOPE_UNVERIFIED';
  end if;

  return new;
end;
$$;

create function governance.validate_ward_boundary_crosswalk_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operational_ward governance.wards%rowtype;
  official_boundary governance.jurisdiction_boundary_versions%rowtype;
  boundary_ward governance.wards%rowtype;
begin
  select ward.* into operational_ward
  from governance.wards as ward
  where ward.id = new.operational_ward_id;

  select boundary_version.* into official_boundary
  from governance.jurisdiction_boundary_versions as boundary_version
  where boundary_version.id = new.official_boundary_version_id;

  if official_boundary.ward_id is not null then
    select ward.* into boundary_ward
    from governance.wards as ward
    where ward.id = official_boundary.ward_id;
  end if;

  if operational_ward.id is null
    or official_boundary.id is null
    or official_boundary.ward_id is null
    or boundary_ward.id is null
    or boundary_ward.local_body_id <> operational_ward.local_body_id then
    raise exception using
      errcode = '23514',
      message = 'WARD_BOUNDARY_CROSSWALK_SCOPE_INVALID';
  end if;

  if new.is_routing_eligible and (
    not new.auto_route_allowed
    or new.relationship_type <> 'one_to_one'
    or operational_ward.status <> 'active'
    or operational_ward.verification_status <> 'verified'
    or operational_ward.is_placeholder
    or not operational_ward.is_routing_eligible
    or boundary_ward.status <> 'active'
    or boundary_ward.verification_status <> 'verified'
    or boundary_ward.is_placeholder
    or not boundary_ward.is_routing_eligible
    or official_boundary.status <> 'active'
    or official_boundary.verification_status <> 'verified'
    or official_boundary.is_placeholder
    or not official_boundary.is_routing_eligible
    or official_boundary.effective_from > new.effective_from
    or (
      official_boundary.effective_to is not null
      and official_boundary.effective_to <= new.effective_from
    )
    or not exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.id = operational_ward.local_body_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'WARD_BOUNDARY_CROSSWALK_ROUTING_SCOPE_UNVERIFIED';
  end if;

  return new;
end;
$$;

create trigger ward_zone_membership_versions_guard_update
before update on governance.ward_administrative_zone_membership_versions
for each row execute function governance.guard_version_update();
create trigger ward_zone_membership_versions_reject_delete
before delete on governance.ward_administrative_zone_membership_versions
for each row execute function governance.reject_historical_delete();
create trigger ward_zone_membership_versions_set_updated_at
before update on governance.ward_administrative_zone_membership_versions
for each row execute function private.set_updated_at();
create trigger ward_zone_membership_versions_validate
before insert or update on governance.ward_administrative_zone_membership_versions
for each row execute function governance.validate_ward_zone_membership_version();

create trigger ward_boundary_crosswalk_versions_guard_update
before update on governance.ward_boundary_crosswalk_versions
for each row execute function governance.guard_version_update();
create trigger ward_boundary_crosswalk_versions_reject_delete
before delete on governance.ward_boundary_crosswalk_versions
for each row execute function governance.reject_historical_delete();
create trigger ward_boundary_crosswalk_versions_set_updated_at
before update on governance.ward_boundary_crosswalk_versions
for each row execute function private.set_updated_at();
create trigger ward_boundary_crosswalk_versions_validate
before insert or update on governance.ward_boundary_crosswalk_versions
for each row execute function governance.validate_ward_boundary_crosswalk_version();

alter table governance.ward_administrative_zone_membership_versions
  enable row level security;
alter table governance.ward_administrative_zone_membership_versions
  force row level security;
alter table governance.ward_boundary_crosswalk_versions enable row level security;
alter table governance.ward_boundary_crosswalk_versions force row level security;

create policy ward_zone_membership_select_current_or_managed
on governance.ward_administrative_zone_membership_versions
for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and exists (
      select 1
      from governance.wards as ward
      inner join governance.local_bodies as local_body
        on local_body.id = ward.local_body_id
      where ward.id = operational_ward_id
        and private.is_verified_governance_authority(local_body.authority_id)
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body
      on local_body.id = ward.local_body_id
    where ward.id = operational_ward_id
      and private.can_manage_authority(local_body.authority_id)
  )
);

create policy ward_boundary_crosswalk_select_current_or_managed
on governance.ward_boundary_crosswalk_versions
for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and exists (
      select 1
      from governance.wards as ward
      inner join governance.local_bodies as local_body
        on local_body.id = ward.local_body_id
      where ward.id = operational_ward_id
        and private.is_verified_governance_authority(local_body.authority_id)
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body
      on local_body.id = ward.local_body_id
    where ward.id = operational_ward_id
      and private.can_manage_authority(local_body.authority_id)
  )
);

revoke all on governance.ward_administrative_zone_membership_versions
from public, anon, authenticated, service_role;
revoke all on governance.ward_boundary_crosswalk_versions
from public, anon, authenticated, service_role;
grant select on governance.ward_administrative_zone_membership_versions
to authenticated;
grant select on governance.ward_boundary_crosswalk_versions to authenticated;
grant select, insert, update
on governance.ward_administrative_zone_membership_versions to service_role;
grant select, insert, update
on governance.ward_boundary_crosswalk_versions to service_role;

revoke all on function governance.validate_ward_zone_membership_version()
from public, anon, authenticated, service_role;
revoke all on function governance.validate_ward_boundary_crosswalk_version()
from public, anon, authenticated, service_role;

comment on table governance.ward_administrative_zone_membership_versions is
  'Append-only effective-dated membership of an operational municipal ward in one normalized administrative zone.';
comment on column governance.ward_administrative_zone_membership_versions.administrative_zone_id is
  'References an administrative_units row whose unit_type is zone and whose local body matches the operational ward.';
comment on table governance.ward_boundary_crosswalk_versions is
  'Append-only effective-dated crosswalk from an operational ward to the exact official ward-boundary feature version used for location resolution.';
comment on column governance.ward_boundary_crosswalk_versions.official_boundary_version_id is
  'References the immutable jurisdiction_boundary_versions row containing the official source geometry feature.';
comment on column governance.ward_boundary_crosswalk_versions.auto_route_allowed is
  'Explicit source-reviewed gate for automatic routing. Split legacy polygons remain false until a distinct approved child boundary exists.';
comment on function governance.validate_ward_zone_membership_version() is
  'Requires ward and administrative-zone scopes to belong to the same local body and verifies routing dependencies before activation.';
comment on function governance.validate_ward_boundary_crosswalk_version() is
  'Requires a same-local-body ward boundary feature and blocks routing activation unless the mapping is verified one-to-one and explicitly approved.';
$migration_20260716118000_bmc_ward_relationship_versions$;

  if not (pg_temp.local_wellness_relation_exists('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_relation_exists('governance.ward_boundary_crosswalk_versions')
      and pg_temp.local_wellness_procedure_exists('governance.validate_ward_zone_membership_version()')
      and pg_temp.local_wellness_procedure_exists('governance.validate_ward_boundary_crosswalk_version()')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_administrative_zone_membership_versions', 'ward_zone_membership_versions_validate')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_boundary_crosswalk_versions', 'ward_boundary_crosswalk_versions_validate')
      and pg_temp.local_wellness_forced_rls('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_forced_rls('governance.ward_boundary_crosswalk_versions')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716118000_bmc_ward_relationship_versions.sql';
  end if;

  update local_wellness_upgrade_state
  set
    cutoff_position = 41,
    cutoff_name = '20260716118000_bmc_ward_relationship_versions.sql'
  where singleton;

  raise notice 'Applied migration 20260716118000_bmc_ward_relationship_versions.sql';
end;
$guard_41$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716118000_bmc_ward_relationship_versions.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716119000_government_invitation_scope_options.sql
-- ============================================================================
do $guard_42$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if current_cutoff >= 42 then
    raise notice 'Skipping already-complete migration 20260716119000_government_invitation_scope_options.sql';
    return;
  end if;

  if current_cutoff <> 41 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716119000_government_invitation_scope_options.sql';
  end if;

  execute $migration_20260716119000_government_invitation_scope_options$
create function public.list_government_invitation_options(
  p_authority_ids uuid[] default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible_authorities as materialized (
    select
      authority.id,
      authority.code,
      authority.name,
      authority.authority_type,
      authority.is_routing_eligible
    from governance.authorities as authority
    where authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and (
        p_authority_ids is null
        or authority.id = any(p_authority_ids)
      )
  ),
  options as (
    select
      'authority'::text as option_type,
      authority.id,
      authority.id as authority_id,
      authority.code,
      authority.name,
      authority.authority_type,
      authority.is_routing_eligible
    from eligible_authorities as authority

    union all

    select
      'ward'::text as option_type,
      ward.id,
      authority.id as authority_id,
      coalesce(ward.source_ward_code, ward.ward_number, ward.name) as code,
      ward.name,
      null::text as authority_type,
      ward.is_routing_eligible
    from eligible_authorities as authority
    inner join governance.local_bodies as local_body
      on local_body.authority_id = authority.id
     and local_body.status = 'active'
     and local_body.verification_status = 'verified'
     and not local_body.is_placeholder
     and local_body.is_routing_eligible
    inner join governance.wards as ward
      on ward.local_body_id = local_body.id
     and ward.status = 'active'
     and ward.verification_status = 'verified'
     and not ward.is_placeholder
     and ward.is_routing_eligible

    union all

    select
      'department'::text as option_type,
      authority_department.id,
      authority.id as authority_id,
      department.code,
      coalesce(authority_department.local_name, department.name) as name,
      null::text as authority_type,
      authority_department.is_routing_eligible
    from eligible_authorities as authority
    inner join governance.authority_departments as authority_department
      on authority_department.authority_id = authority.id
     and authority_department.status = 'active'
     and authority_department.verification_status = 'verified'
     and not authority_department.is_placeholder
     and authority_department.is_routing_eligible
    inner join governance.departments as department
      on department.id = authority_department.department_id
     and department.status = 'active'
     and department.verification_status = 'verified'
     and not department.is_placeholder
     and department.is_routing_eligible
  )
  select jsonb_build_object(
    'authorities', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityType', option.authority_type,
          'code', option.code,
          'id', option.id,
          'name', option.name
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'authority'),
      '[]'::jsonb
    ),
    'departments', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityId', option.authority_id,
          'code', option.code,
          'id', option.id,
          'name', option.name,
          'type', option.option_type
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'department'),
      '[]'::jsonb
    ),
    'wards', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'authorityId', option.authority_id,
          'code', option.code,
          'id', option.id,
          'name', option.name,
          'type', option.option_type
        ) order by option.name, option.code, option.id
      ) filter (where option.option_type = 'ward'),
      '[]'::jsonb
    )
  )
  from options as option;
$$;

revoke all on function public.list_government_invitation_options(uuid[])
  from public, anon, authenticated;
grant execute on function public.list_government_invitation_options(uuid[])
  to service_role;

comment on function public.list_government_invitation_options(uuid[]) is
  'Lists active verified non-placeholder routable authority, ward, and authority-department labels for server-authorized government invitations.';
$migration_20260716119000_government_invitation_scope_options$;

  if not (pg_temp.local_wellness_procedure_exists('public.list_government_invitation_options(uuid[])')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716119000_government_invitation_scope_options.sql';
  end if;

  update local_wellness_upgrade_state
  set
    cutoff_position = 42,
    cutoff_name = '20260716119000_government_invitation_scope_options.sql'
  where singleton;

  raise notice 'Applied migration 20260716119000_government_invitation_scope_options.sql';
end;
$guard_42$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716119000_government_invitation_scope_options.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260717100000_public_complaint_engagements.sql
-- ============================================================================
do $guard_43$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if current_cutoff >= 43 then
    raise notice 'Skipping already-complete migration 20260717100000_public_complaint_engagements.sql';
    return;
  end if;

  if current_cutoff <> 42 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260717100000_public_complaint_engagements.sql';
  end if;

  execute $migration_20260717100000_public_complaint_engagements$
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
$migration_20260717100000_public_complaint_engagements$;

  if not (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_forced_rls('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_pkey')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_time_check')
      and pg_temp.local_wellness_procedure_exists('complaints.public_complaint_support_count(uuid)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_engagements(uuid,uuid[])')
      and pg_temp.local_wellness_procedure_exists('public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260717100000_public_complaint_engagements.sql';
  end if;

  update local_wellness_upgrade_state
  set
    cutoff_position = 43,
    cutoff_name = '20260717100000_public_complaint_engagements.sql'
  where singleton;

  raise notice 'Applied migration 20260717100000_public_complaint_engagements.sql';
end;
$guard_43$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260717100000_public_complaint_engagements.sql
-- ============================================================================

do $verify_upgrade$
declare
  final_cutoff integer;
begin
  select state.cutoff_position
  into final_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if final_cutoff <> 43 or not (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_forced_rls('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_pkey')
      and pg_temp.local_wellness_constraint_exists('complaints', 'public_complaint_engagements', 'public_complaint_engagements_time_check')
      and pg_temp.local_wellness_procedure_exists('complaints.public_complaint_support_count(uuid)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)')
      and pg_temp.local_wellness_procedure_exists('public.list_public_complaint_engagements(uuid,uuid[])')
      and pg_temp.local_wellness_procedure_exists('public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_43_VERIFICATION_FAILED';
  end if;

  if pg_catalog.to_regprocedure('public.api_readiness_check()') is null
    or not public.api_readiness_check() then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_FINAL_READINESS_FAILED';
  end if;
end;
$verify_upgrade$;

commit;
