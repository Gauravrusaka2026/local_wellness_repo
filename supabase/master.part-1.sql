-- Local Wellness adaptive existing-database migration — Part 1 of 2
--
-- Generated deterministically from supabase/migrations/*.sql by:
--   pnpm database:master:generate
--
-- This file contains an exact ordered slice of master.sql. It detects a coherent
-- already-complete migration prefix, skips those migrations as whole units, and
-- executes only the missing immutable source migrations. Native IF NOT EXISTS is
-- used by source migrations where definition-safe; policies, triggers, functions,
-- constraints, DML, and grants are never blindly suppressed.
-- After this query commits successfully, execute master.part-2.sql.
-- The entire part is one transaction protected by an advisory transaction lock.
-- Any partial/non-contiguous fingerprint or source failure rolls back the part.
-- Dashboard execution does not repair supabase_migrations.schema_migrations.
-- Seed data remains intentionally separate under supabase/seed.
-- Complete source cutoff: 20260716
-- Complete source count: 42
-- Migrations in this part: 23
-- Part source range: 20260713100000_phase_1_identity_and_access.sql through 20260714124000_phase_5_government_workflow_security_and_rpc.sql
--
-- Source manifest for this part (SHA-256 of the exact source file bytes):
-- 863ce6c718de64ae702385e979c44b011fd979c271ba5f400fe2db658f90d513  20260713100000_phase_1_identity_and_access.sql
-- ca15998b42fc4b796990c2a2d69616aff2b1344734d7eb68d3c8325843be9a2c  20260713130000_restrict_device_sensitive_column_access.sql
-- 254a7fc1d1ceee1ea9f6bc626f2077a952c8b746aa2c9f87b1de66fd72d32c25  20260713150000_atomic_device_lifecycle_and_access_provenance.sql
-- 7947dca03ad470650af73bcaf608c9011b7f334fcdd19b1079e2058f6f81d05e  20260713160000_phase_2_governance_schema.sql
-- 75cd01f095674d67139aef9b010d3fef644a4ecfe8293f2c93f0ab6f967af313  20260713161000_phase_2_governance_security.sql
-- 5ac562cea1c9d1c8c3a02cf43c06ad8ab32e4e361a51d3000976e1b4a9a56597  20260713162000_phase_2_identity_authority_forward_fix.sql
-- de068699d7eccdb3e790d04d18fc3cab545bfc9e0fdfa6f6cc7551c2b6a66486  20260713163000_phase_2_jurisdiction_resolution.sql
-- e1a5bfccc0d3cae25a2528eea3f04e1c59c7ac70e1cfba94a140472cf18b9da1  20260713164000_phase_2_governance_integrity_forward_fix.sql
-- 494a717d6ac0e1191dc0fff77ba35ca3468498544942b62e34f4f00ee00006bf  20260713165000_enforce_authority_parent_types.sql
-- 35299e615d2296b2ab1771ed7d58f1a36ce04df87b19fe11124a5914a0c47e8c  20260713166000_harden_governance_access_and_geometry.sql
-- da8d564fe0058b7373a82b38e99659721703276982d1fd80d306e9ae1a9a0566  20260713200000_phase_3_routing_schema.sql
-- 4b1b5a0b788702c41411044e3c42a5488c8d83dff2157e1d5ec837d6c3b42208  20260713201000_governance_synchronization_foundation.sql
-- 75f1b2d3007dab2109d96a1823b58f17d1795d325964b9d70d251554a7165748  20260713202000_phase_3_routing_security_and_rpc.sql
-- 416e6ab052ec09546325df8e1ab927ede1c6f3554d9cc88c177968c34021ec15  20260714100000_phase_4_complaint_capture.sql
-- b5e4f7936f5ea5fe515f91ad09b7454d75076fb448931916e5cb428680e81e67  20260714101000_phase_4_complaint_security_and_rpc.sql
-- 68a78de85efd25b293e646f03b0ae43e364cd0fa5c65a46122cf04312d35ecff  20260714110000_governance_sync_scheduling_and_contacts.sql
-- 855fd8e6224856939ae00bd789e6f37ce6d9f77fff5071e1d347e56e06f24576  20260714111000_governance_sync_service_rpc.sql
-- 9f58151d570dcbaf745cc4c0e3941c2ae0dc893b55fd3446a27cb72783a528f4  20260714112000_governance_sync_scope.sql
-- d676cf0764656961149a3764c4f481637bd1694d700afb77eda22296792737b2  20260714120000_backfill_auth_profiles.sql
-- b29f82add22edcf9321443f8bbc6250a12b0c7a6d126eee87e912d5e03fb1dfd  20260714121000_routing_configuration_validation.sql
-- f5874331c57607158fa9e474d707f51708ece44fccb814175314751d7ec335eb  20260714122000_routing_asset_discovery.sql
-- 37da9e77d2dbe36694ae7546f0f192df25a3a85e40a39d2dddc0a8c01b0c2625  20260714123000_phase_5_government_workflow_schema.sql
-- ffd2074338a1a15c85af317c8794690e2794327c35969eae558e34f513e2e74d  20260714124000_phase_5_government_workflow_security_and_rpc.sql

begin;

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('local_wellness_adaptive_master', 0)
);

create temp table local_wellness_bundle_fingerprints (
  migration_position integer primary key,
  migration_name text not null unique,
  is_present boolean not null,
  is_complete boolean not null
) on commit drop;

create temp table local_wellness_bundle_state (
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

create or replace function pg_temp.local_wellness_function_exists(
  p_schema_name text,
  p_function_name text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select exists (
    select 1
    from pg_catalog.pg_proc as procedure
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = p_schema_name
      and procedure.proname = p_function_name
  );
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

create or replace function pg_temp.local_wellness_role_code_exists(p_role_code text)
returns boolean
language plpgsql
stable
set search_path = ''
as $helper$
declare
  result boolean;
begin
  if pg_catalog.to_regclass('public.roles') is null then
    return false;
  end if;

  execute 'select exists (select 1 from public.roles where code = $1)'
    into result
    using p_role_code;
  return result;
end;
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

create or replace function pg_temp.local_wellness_column_privilege(
  p_role_name text,
  p_schema_name text,
  p_table_name text,
  p_column_name text,
  p_privilege text
)
returns boolean
language plpgsql
stable
set search_path = ''
as $helper$
begin
  if not exists (
      select 1 from pg_catalog.pg_roles as role where role.rolname = p_role_name
    )
    or not pg_temp.local_wellness_column_exists(
      p_schema_name,
      p_table_name,
      p_column_name
    )
  then
    return false;
  end if;

  return pg_catalog.has_column_privilege(
    p_role_name,
    pg_catalog.format('%I.%I', p_schema_name, p_table_name),
    p_column_name,
    p_privilege
  );
end;
$helper$;

insert into local_wellness_bundle_fingerprints (
  migration_position,
  migration_name,
  is_present,
  is_complete
)
values
  (
    1,
    '20260713100000_phase_1_identity_and_access.sql',
    (pg_temp.local_wellness_relation_exists('public.profiles')),
    (pg_temp.local_wellness_relation_exists('public.profiles')
      and pg_temp.local_wellness_relation_exists('public.devices')
      and pg_temp.local_wellness_relation_exists('public.roles')
      and pg_temp.local_wellness_relation_exists('public.authority_memberships')
      and pg_temp.local_wellness_relation_exists('public.user_roles')
      and pg_temp.local_wellness_relation_exists('public.auth_audit_events')
      and pg_temp.local_wellness_function_exists('private', 'handle_auth_user_identity_updated')
      and pg_temp.local_wellness_trigger_exists('auth', 'users', 'on_local_wellness_auth_user_identity_updated')
      and pg_temp.local_wellness_policy_exists('public', 'auth_audit_events', 'auth_audit_events_select_own_or_managed_authority')
      and pg_temp.local_wellness_forced_rls('public.profiles')
      and pg_temp.local_wellness_forced_rls('public.devices')
      and pg_temp.local_wellness_role_code_exists('citizen'))
  ),
  (
    2,
    '20260713130000_restrict_device_sensitive_column_access.sql',
    (not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'device_identifier_hash', 'SELECT')
      and not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'push_token', 'SELECT')),
    (not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'device_identifier_hash', 'SELECT')
      and not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'push_token', 'SELECT'))
  ),
  (
    3,
    '20260713150000_atomic_device_lifecycle_and_access_provenance.sql',
    (pg_temp.local_wellness_function_exists('public', 'revoke_device')),
    (pg_temp.local_wellness_function_exists('public', 'register_device')
      and pg_temp.local_wellness_function_exists('public', 'revoke_device')
      and pg_temp.local_wellness_policy_exists('public', 'profiles', 'profiles_select_own_or_managed_authority')
      and not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'push_token', 'UPDATE'))
  ),
  (
    4,
    '20260713160000_phase_2_governance_schema.sql',
    (pg_temp.local_wellness_relation_exists('governance.authorities')),
    (pg_temp.local_wellness_relation_exists('governance.authorities')
      and pg_temp.local_wellness_relation_exists('governance.states')
      and pg_temp.local_wellness_relation_exists('governance.districts')
      and pg_temp.local_wellness_relation_exists('governance.local_bodies')
      and pg_temp.local_wellness_relation_exists('governance.wards')
      and pg_temp.local_wellness_relation_exists('governance.jurisdiction_boundary_versions')
      and pg_temp.local_wellness_relation_exists('governance.complaint_routing_references')
      and pg_temp.local_wellness_trigger_exists('governance', 'complaint_routing_references', 'complaint_routing_references_set_updated_at'))
  ),
  (
    5,
    '20260713161000_phase_2_governance_security.sql',
    (pg_temp.local_wellness_policy_exists('governance', 'authorities', 'authorities_select_verified')),
    (pg_temp.local_wellness_policy_exists('governance', 'complaint_routing_references', 'complaint_routing_references_select_verified_or_platform_admin')
      and pg_temp.local_wellness_policy_exists('governance', 'offices', 'offices_select_verified_or_managed')
      and pg_temp.local_wellness_forced_rls('governance.complaint_routing_references'))
  ),
  (
    6,
    '20260713162000_phase_2_identity_authority_forward_fix.sql',
    (pg_temp.local_wellness_function_exists('private', 'validate_governance_role_scope')),
    (pg_temp.local_wellness_function_exists('private', 'validate_governance_role_scope')
      and pg_temp.local_wellness_trigger_exists('public', 'user_roles', 'user_roles_validate_governance_scope')
      and pg_temp.local_wellness_column_exists('public', 'user_roles', 'authority_id'))
  ),
  (
    7,
    '20260713163000_phase_2_jurisdiction_resolution.sql',
    (pg_temp.local_wellness_function_exists('governance', 'resolve_jurisdiction')),
    (pg_temp.local_wellness_function_exists('governance', 'resolve_jurisdiction'))
  ),
  (
    8,
    '20260713164000_phase_2_governance_integrity_forward_fix.sql',
    (pg_temp.local_wellness_function_exists('governance', 'reject_scope_key_update')),
    (pg_temp.local_wellness_trigger_exists('governance', 'wards', 'wards_reject_scope_key_update')
      and pg_temp.local_wellness_trigger_exists('governance', 'utilities', 'utilities_reject_scope_key_update')
      and pg_temp.local_wellness_policy_exists('governance', 'authorities', 'authorities_select_verified_or_managed'))
  ),
  (
    9,
    '20260713165000_enforce_authority_parent_types.sql',
    (pg_temp.local_wellness_function_exists('governance', 'reject_invalid_authority_parent_types')),
    (pg_temp.local_wellness_function_exists('governance', 'reject_invalid_authority_parent_types')
      and pg_temp.local_wellness_trigger_exists('governance', 'authorities', 'authorities_reject_invalid_parent_types'))
  ),
  (
    10,
    '20260713166000_harden_governance_access_and_geometry.sql',
    (pg_temp.local_wellness_constraint_exists('governance', 'jurisdiction_boundary_versions', 'jurisdiction_boundaries_coordinate_envelope_check')),
    (pg_temp.local_wellness_constraint_exists('governance', 'jurisdiction_boundary_versions', 'jurisdiction_boundaries_coordinate_envelope_check')
      and pg_temp.local_wellness_function_exists('private', 'is_active_governance_authority'))
  ),
  (
    11,
    '20260713200000_phase_3_routing_schema.sql',
    (pg_temp.local_wellness_relation_exists('routing.issue_domains')),
    (pg_temp.local_wellness_relation_exists('routing.issue_domains')
      and pg_temp.local_wellness_relation_exists('routing.route_rule_versions')
      and pg_temp.local_wellness_relation_exists('routing.routing_decisions')
      and pg_temp.local_wellness_trigger_exists('routing', 'routing_decisions', 'routing_decisions_reject_delete'))
  ),
  (
    12,
    '20260713201000_governance_synchronization_foundation.sql',
    (pg_temp.local_wellness_relation_exists('governance.source_endpoints')),
    (pg_temp.local_wellness_relation_exists('governance.source_endpoints')
      and pg_temp.local_wellness_relation_exists('governance.raw_snapshots')
      and pg_temp.local_wellness_relation_exists('governance.sync_review_events')
      and pg_temp.local_wellness_trigger_exists('governance', 'sync_review_events', 'sync_review_events_reject_delete'))
  ),
  (
    13,
    '20260713202000_phase_3_routing_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('routing', 'resolve_jurisdiction_with_accuracy')),
    (pg_temp.local_wellness_function_exists('public', 'list_routing_categories')
      and pg_temp.local_wellness_function_exists('public', 'resolve_routing_candidates')
      and pg_temp.local_wellness_function_exists('public', 'record_routing_decision'))
  ),
  (
    14,
    '20260714100000_phase_4_complaint_capture.sql',
    (pg_temp.local_wellness_relation_exists('complaints.complaint_drafts')),
    (pg_temp.local_wellness_relation_exists('complaints.complaint_drafts')
      and pg_temp.local_wellness_relation_exists('complaints.complaints')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_assignments')
      and pg_temp.local_wellness_relation_exists('complaints.duplicate_check_matches')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_number_sequence'))
  ),
  (
    15,
    '20260714101000_phase_4_complaint_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('public', 'create_complaint_draft')),
    (pg_temp.local_wellness_function_exists('public', 'submit_complaint')
      and pg_temp.local_wellness_function_exists('public', 'list_owned_complaints')
      and pg_temp.local_wellness_function_exists('public', 'get_complaint_timeline')
      and pg_temp.local_wellness_private_bucket_exists('complaint-originals-private')
      and pg_temp.local_wellness_private_bucket_exists('voice-recordings-private'))
  ),
  (
    16,
    '20260714110000_governance_sync_scheduling_and_contacts.sql',
    (pg_temp.local_wellness_relation_exists('governance.sync_source_leases')),
    (pg_temp.local_wellness_relation_exists('governance.sync_source_leases')
      and pg_temp.local_wellness_relation_exists('governance.contact_channel_versions')
      and pg_temp.local_wellness_relation_exists('governance.current_verified_contacts')
      and pg_temp.local_wellness_trigger_exists('governance', 'contact_channel_versions', 'contact_channel_versions_reject_delete'))
  ),
  (
    17,
    '20260714111000_governance_sync_service_rpc.sql',
    (pg_temp.local_wellness_function_exists('public', 'claim_due_governance_sync_sources')),
    (pg_temp.local_wellness_function_exists('public', 'claim_due_governance_sync_sources')
      and pg_temp.local_wellness_function_exists('public', 'record_governance_sync_snapshot')
      and pg_temp.local_wellness_function_exists('public', 'fail_governance_sync_run'))
  ),
  (
    18,
    '20260714112000_governance_sync_scope.sql',
    (pg_temp.local_wellness_relation_exists('governance.sync_scope_targets')),
    (pg_temp.local_wellness_relation_exists('governance.sync_scope_targets')
      and pg_temp.local_wellness_function_exists('private', 'enforce_governance_sync_scope_target')
      and pg_temp.local_wellness_trigger_exists('governance', 'sync_scope_targets', 'sync_scope_targets_enforce'))
  ),
  (
    19,
    '20260714120000_backfill_auth_profiles.sql',
    (pg_temp.local_wellness_function_exists('private', 'backfill_missing_auth_identities')),
    (pg_temp.local_wellness_function_exists('private', 'backfill_missing_auth_identities'))
  ),
  (
    20,
    '20260714121000_routing_configuration_validation.sql',
    (pg_temp.local_wellness_function_exists('public', 'report_routing_confidence_policy_conflicts')),
    (pg_temp.local_wellness_function_exists('public', 'report_routing_confidence_policy_conflicts'))
  ),
  (
    21,
    '20260714122000_routing_asset_discovery.sql',
    (pg_temp.local_wellness_function_exists('public', 'discover_routing_assets')),
    (pg_temp.local_wellness_function_exists('public', 'discover_routing_assets'))
  ),
  (
    22,
    '20260714123000_phase_5_government_workflow_schema.sql',
    (pg_temp.local_wellness_relation_exists('complaints.government_role_capabilities')),
    (pg_temp.local_wellness_relation_exists('complaints.government_role_capabilities')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_resolution_evidence')
      and pg_temp.local_wellness_relation_exists('complaints.notification_outbox'))
  ),
  (
    23,
    '20260714124000_phase_5_government_workflow_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'is_verified_assignment_scope')),
    (pg_temp.local_wellness_function_exists('public', 'perform_government_complaint_action')
      and pg_temp.local_wellness_function_exists('public', 'reserve_government_resolution_evidence')
      and pg_temp.local_wellness_function_exists('public', 'fail_government_resolution_evidence')
      and pg_temp.local_wellness_private_bucket_exists('resolution-evidence-private'))
  ),
  (
    24,
    '20260714130000_phase_6_communication_and_notification_schema.sql',
    (pg_temp.local_wellness_relation_exists('complaints.conversation_rooms')),
    (pg_temp.local_wellness_relation_exists('complaints.conversation_rooms')
      and pg_temp.local_wellness_relation_exists('complaints.messages')
      and pg_temp.local_wellness_relation_exists('complaints.notifications')
      and pg_temp.local_wellness_relation_exists('complaints.notification_outbox_jobs'))
  ),
  (
    25,
    '20260714131000_phase_6_communication_notification_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'actor_can_communicate')),
    (pg_temp.local_wellness_function_exists('public', 'authorize_realtime_room')
      and pg_temp.local_wellness_function_exists('public', 'list_notifications')
      and pg_temp.local_wellness_function_exists('public', 'fail_notification_delivery'))
  ),
  (
    26,
    '20260716100000_phase_7_accountability_schema.sql',
    (pg_temp.local_wellness_relation_exists('complaints.resolution_policies')),
    (pg_temp.local_wellness_relation_exists('complaints.resolution_policies')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_reopen_requests')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_escalation_events'))
  ),
  (
    27,
    '20260716101000_phase_7_accountability_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'resolve_resolution_policy_version')),
    (pg_temp.local_wellness_function_exists('public', 'get_citizen_resolution_context')
      and pg_temp.local_wellness_function_exists('public', 'submit_complaint_feedback')
      and pg_temp.local_wellness_function_exists('public', 'reopen_complaint'))
  ),
  (
    28,
    '20260716102000_phase_8_transparency_schema.sql',
    (pg_temp.local_wellness_relation_exists('complaints.public_visibility_policies')),
    (pg_temp.local_wellness_relation_exists('complaints.public_visibility_policies')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_publication_projections')
      and pg_temp.local_wellness_relation_exists('complaints.public_media_derivatives'))
  ),
  (
    29,
    '20260716103000_phase_8_transparency_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'actor_can_review_publication')),
    (pg_temp.local_wellness_function_exists('complaints', 'actor_can_review_publication')
      and pg_temp.local_wellness_trigger_exists('complaints', 'public_media_derivatives', 'public_media_derivatives_append_only'))
  ),
  (
    30,
    '20260716104000_verified_governing_body_projection.sql',
    (pg_temp.local_wellness_function_exists('public', 'resolve_verified_governing_bodies')),
    (pg_temp.local_wellness_function_exists('public', 'resolve_verified_governing_bodies'))
  ),
  (
    31,
    '20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'current_public_complaint_projections')),
    (pg_temp.local_wellness_function_exists('public', 'list_public_complaint_projections')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_hotspots')
      and pg_temp.local_wellness_function_exists('public', 'withdraw_public_complaint_projection'))
  ),
  (
    32,
    '20260716106000_phase_8_duplicate_group_publication.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'public_duplicate_group_payload')),
    (pg_temp.local_wellness_function_exists('public', 'review_public_duplicate_group')
      and pg_temp.local_wellness_function_exists('public', 'withdraw_public_duplicate_group'))
  ),
  (
    33,
    '20260716110000_phase_9_sla_escalation_kpi_schema.sql',
    (pg_temp.local_wellness_relation_exists('complaints.sla_calendars')),
    (pg_temp.local_wellness_relation_exists('complaints.sla_calendars')
      and pg_temp.local_wellness_relation_exists('complaints.sla_escalation_jobs')
      and pg_temp.local_wellness_relation_exists('complaints.kpi_snapshots'))
  ),
  (
    34,
    '20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'actor_is_platform_admin')),
    (pg_temp.local_wellness_function_exists('public', 'get_government_complaint_sla')
      and pg_temp.local_wellness_function_exists('public', 'list_government_kpi_snapshots')
      and pg_temp.local_wellness_forced_rls('complaints.kpi_snapshots'))
  ),
  (
    35,
    '20260716112000_phase_10_api_hardening.sql',
    (pg_temp.local_wellness_relation_exists('private.api_rate_limit_windows')),
    (pg_temp.local_wellness_relation_exists('private.api_rate_limit_windows')
      and pg_temp.local_wellness_function_exists('public', 'consume_api_rate_limit')
      and pg_temp.local_wellness_function_exists('public', 'api_readiness_check'))
  ),
  (
    36,
    '20260716113000_phase_10_privileged_mfa.sql',
    (pg_temp.local_wellness_function_exists('private', 'jwt_has_aal2')),
    (pg_temp.local_wellness_function_exists('private', 'jwt_has_aal2')
      and pg_temp.local_wellness_function_exists('public', 'user_requires_privileged_mfa'))
  ),
  (
    37,
    '20260716114000_phase_10_citizen_phone_mfa.sql',
    (pg_temp.local_wellness_function_exists('public', 'user_has_verified_phone_mfa')),
    (pg_temp.local_wellness_function_exists('public', 'user_has_verified_phone_mfa'))
  ),
  (
    38,
    '20260716115000_phase_10_profile_images.sql',
    (pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_object_path')
      or pg_temp.local_wellness_function_exists('private', 'set_profile_avatar_version')
      or pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_select_own')),
    (pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_object_path')
      and pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_updated_at')
      and pg_temp.local_wellness_function_exists('private', 'set_profile_avatar_version')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_select_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_insert_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_update_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_delete_own')
      and pg_temp.local_wellness_private_bucket_exists('profile-images-private'))
  ),
  (
    39,
    '20260716116000_phase_10_complaint_location_proximity.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'enforce_v1_location_proximity')),
    (pg_temp.local_wellness_function_exists('complaints', 'enforce_v1_location_proximity')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_media_proximity_check')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_location_evidence', 'complaint_location_evidence_enforce_v1_proximity'))
  ),
  (
    40,
    '20260716117000_phase_10_routing_delivery_readiness.sql',
    (pg_temp.local_wellness_function_exists('governance', 'resolve_complaint_contact_readiness')),
    (pg_temp.local_wellness_function_exists('governance', 'resolve_complaint_contact_readiness')
      and pg_temp.local_wellness_function_exists('complaints', 'assignment_delivery_readiness')
      and pg_temp.local_wellness_function_exists('complaints', 'assignment_summary'))
  ),
  (
    41,
    '20260716118000_bmc_ward_relationship_versions.sql',
    (pg_temp.local_wellness_relation_exists('governance.ward_administrative_zone_membership_versions')),
    (pg_temp.local_wellness_relation_exists('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_relation_exists('governance.ward_boundary_crosswalk_versions')
      and pg_temp.local_wellness_function_exists('governance', 'validate_ward_zone_membership_version')
      and pg_temp.local_wellness_function_exists('governance', 'validate_ward_boundary_crosswalk_version')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_administrative_zone_membership_versions', 'ward_zone_membership_versions_validate')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_boundary_crosswalk_versions', 'ward_boundary_crosswalk_versions_validate')
      and pg_temp.local_wellness_forced_rls('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_forced_rls('governance.ward_boundary_crosswalk_versions'))
  ),
  (
    42,
    '20260716119000_government_invitation_scope_options.sql',
    (pg_temp.local_wellness_function_exists('public', 'list_government_invitation_options')),
    (pg_temp.local_wellness_function_exists('public', 'list_government_invitation_options'))
  );

do $detect_state$
declare
  detected_cutoff integer;
  first_missing integer;
  first_missing_name text;
begin
  select min(fingerprint.migration_position)
  into first_missing
  from local_wellness_bundle_fingerprints as fingerprint
  where not fingerprint.is_complete;

  detected_cutoff := coalesce(first_missing - 1, 42);

  if first_missing is not null then
    select fingerprint.migration_name
    into first_missing_name
    from local_wellness_bundle_fingerprints as fingerprint
    where fingerprint.migration_position = first_missing;

    if (
      select fingerprint.is_present
      from local_wellness_bundle_fingerprints as fingerprint
      where fingerprint.migration_position = first_missing
    ) then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'LOCAL_WELLNESS_PARTIAL_MIGRATION: %s',
          first_missing_name
        ),
        hint = 'Do not add IF NOT EXISTS. Reconcile this partially present migration first.';
    end if;

    if exists (
      select 1
      from local_wellness_bundle_fingerprints as fingerprint
      where fingerprint.migration_position > first_missing
        and fingerprint.is_present
    ) then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'LOCAL_WELLNESS_NONCONTIGUOUS_MIGRATION_HISTORY: first missing %s',
          first_missing_name
        ),
        hint = 'Later Local Wellness objects exist. Stop and reconcile the schema before retrying.';
    end if;
  end if;

  insert into local_wellness_bundle_state (cutoff_position, cutoff_name)
  values (
    detected_cutoff,
    case
      when detected_cutoff = 0 then null
      else (
        select fingerprint.migration_name
        from local_wellness_bundle_fingerprints as fingerprint
        where fingerprint.migration_position = detected_cutoff
      )
    end
  );

  if 1 = 2 and detected_cutoff < 23 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_1_REQUIRED',
      hint = 'Execute master.part-1.sql successfully before Part 2.';
  end if;

  raise notice 'Local Wellness detected migration cutoff: % of 42', detected_cutoff;
end;
$detect_state$;


-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713100000_phase_1_identity_and_access.sql
-- ============================================================================
do $guard_1$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 1 then
    raise notice 'Skipping already-complete migration 20260713100000_phase_1_identity_and_access.sql';
    return;
  end if;

  if current_cutoff <> 0 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713100000_phase_1_identity_and_access.sql';
  end if;

  execute $migration_20260713100000_phase_1_identity_and_access$
create schema if not exists private;

revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  status text not null default 'active',
  trust_score smallint not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 120
    )
  ),
  constraint profiles_phone_check check (
    phone is null
    or (
      phone = btrim(phone)
      and char_length(phone) between 3 and 32
    )
  ),
  constraint profiles_email_check check (
    email is null
    or (
      email = lower(btrim(email))
      and char_length(email) between 3 and 320
    )
  ),
  constraint profiles_preferred_language_check check (
    preferred_language in ('en', 'hi', 'mr')
  ),
  constraint profiles_status_check check (
    status in ('pending', 'active', 'suspended', 'disabled', 'deleted')
  ),
  constraint profiles_trust_score_check check (trust_score between 0 and 100)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_identifier_hash text not null,
  platform text not null,
  app_version text,
  push_token text,
  last_seen_at timestamptz not null default now(),
  risk_status text not null default 'unknown',
  revoked_at timestamptz,
  is_active boolean generated always as (revoked_at is null) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_user_identifier_unique unique (user_id, device_identifier_hash),
  constraint devices_identifier_hash_check check (
    device_identifier_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint devices_platform_check check (platform in ('android', 'ios', 'web')),
  constraint devices_app_version_check check (
    app_version is null
    or (
      app_version = btrim(app_version)
      and char_length(app_version) between 1 and 64
    )
  ),
  constraint devices_push_token_check check (
    push_token is null or char_length(push_token) between 1 and 4096
  ),
  constraint devices_risk_status_check check (
    risk_status in ('trusted', 'unknown', 'review', 'blocked')
  )
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  is_government boolean not null default false,
  is_privileged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_code_check check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint roles_name_check check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint roles_description_check check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 500
    )
  )
);

create table public.authority_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  authority_id uuid not null,
  invitation_email text not null,
  status text not null default 'invited',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_memberships_status_check check (
    status in ('invited', 'pending_approval', 'active', 'expired', 'revoked')
  ),
  constraint authority_memberships_invitation_email_check check (
    invitation_email = lower(btrim(invitation_email))
    and char_length(invitation_email) between 3 and 320
  ),
  constraint authority_memberships_effective_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint authority_memberships_expired_check check (
    status <> 'expired' or effective_until is not null
  ),
  constraint authority_memberships_approval_check check (
    (
      status in ('active', 'expired')
      and approved_by is not null
      and approved_at is not null
    )
    or (
      status not in ('active', 'expired')
      and approved_by is null
      and approved_at is null
    )
  ),
  constraint authority_memberships_revocation_check check (
    (
      status = 'revoked'
      and revoked_by is not null
      and revoked_at is not null
    )
    or (
      status <> 'revoked'
      and revoked_by is null
      and revoked_at is null
    )
  )
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  authority_id uuid,
  scope_type text not null,
  scope_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  status text not null default 'active',
  granted_by uuid references auth.users (id) on delete set null,
  revoked_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_scope_type_check check (
    scope_type in ('global', 'authority', 'ward', 'department')
  ),
  constraint user_roles_scope_check check (
    (
      scope_type = 'global'
      and authority_id is null
      and scope_id is null
    )
    or (
      scope_type = 'authority'
      and authority_id is not null
      and scope_id = authority_id
    )
    or (
      scope_type in ('ward', 'department')
      and authority_id is not null
      and scope_id is not null
    )
  ),
  constraint user_roles_effective_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint user_roles_status_check check (status in ('active', 'expired', 'revoked')),
  constraint user_roles_expired_check check (
    status <> 'expired' or effective_until is not null
  ),
  constraint user_roles_revocation_check check (
    (
      status = 'revoked'
      and revoked_by is not null
      and revoked_at is not null
    )
    or (
      status <> 'revoked'
      and revoked_by is null
      and revoked_at is null
    )
  )
);

create table public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  subject_user_id uuid references auth.users (id) on delete set null,
  authority_id uuid,
  device_id uuid references public.devices (id) on delete set null,
  event_type text not null,
  outcome text not null,
  request_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint auth_audit_events_event_type_check check (
    event_type in (
      'sign_in_succeeded',
      'sign_in_failed',
      'sign_out_succeeded',
      'session_refreshed',
      'otp_requested',
      'otp_verified',
      'device_registered',
      'device_revoked',
      'government_invitation_created',
      'government_invitation_failed',
      'platform_admin_bootstrapped',
      'access_denied'
    )
  ),
  constraint auth_audit_events_outcome_check check (outcome in ('success', 'failure')),
  constraint auth_audit_events_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint auth_audit_events_user_agent_check check (
    user_agent is null or char_length(user_agent) between 1 and 1024
  )
);

create unique index authority_memberships_one_live_membership_idx
  on public.authority_memberships (user_id, authority_id)
  where status in ('invited', 'pending_approval', 'active');

create index authority_memberships_active_lookup_idx
  on public.authority_memberships (
    user_id,
    authority_id,
    status,
    effective_from,
    effective_until
  );

create index authority_memberships_authority_status_idx
  on public.authority_memberships (authority_id, status, user_id);

create unique index user_roles_one_active_assignment_idx
  on public.user_roles (
    user_id,
    role_id,
    scope_type,
    coalesce(authority_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'active';

create index user_roles_active_lookup_idx
  on public.user_roles (
    user_id,
    role_id,
    status,
    effective_from,
    effective_until
  );

create index user_roles_authority_scope_idx
  on public.user_roles (authority_id, scope_type, scope_id, status, user_id)
  where authority_id is not null;

create index devices_user_active_idx
  on public.devices (user_id, is_active, last_seen_at desc);

create index auth_audit_events_actor_time_idx
  on public.auth_audit_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

create index auth_audit_events_subject_time_idx
  on public.auth_audit_events (subject_user_id, occurred_at desc)
  where subject_user_id is not null;

create index auth_audit_events_authority_time_idx
  on public.auth_audit_events (authority_id, occurred_at desc)
  where authority_id is not null;

insert into public.roles (
  id,
  code,
  name,
  description,
  is_system,
  is_government,
  is_privileged
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'citizen',
    'Citizen',
    'Creates and follows civic complaints as a resident.',
    true,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'government_operator',
    'Government operator',
    'Performs operational work within an assigned authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'ward_officer',
    'Ward officer',
    'Handles work within an assigned ward and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'department_officer',
    'Department officer',
    'Handles work within an assigned department and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'municipal_admin',
    'Municipal administrator',
    'Manages identity access within an assigned municipal authority.',
    true,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'platform_admin',
    'Platform administrator',
    'Manages restricted platform-wide administrative access.',
    true,
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000007',
    'moderator',
    'Moderator',
    'Moderates content within an assigned authority.',
    true,
    true,
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_government = excluded.is_government,
  is_privileged = excluded.is_privileged,
  updated_at = now();

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger devices_set_updated_at
before update on public.devices
for each row execute function private.set_updated_at();

create trigger roles_set_updated_at
before update on public.roles
for each row execute function private.set_updated_at();

create trigger authority_memberships_set_updated_at
before update on public.authority_memberships
for each row execute function private.set_updated_at();

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function private.set_updated_at();

create function private.user_has_active_role(
  candidate_user_id uuid,
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = candidate_user_id
      and profile.status = 'active'
      and role.code = required_role_code
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
      and (
        required_scope_type is null
        or (
          user_role.scope_type = required_scope_type
          and user_role.scope_id is not distinct from required_scope_id
        )
      )
      and (
        user_role.scope_type = 'global'
        or exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= current_timestamp
            and (
              membership.effective_until is null
              or membership.effective_until > current_timestamp
            )
        )
      )
  );
$$;

create function private.has_active_role(
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_active_role(
    (select auth.uid()),
    required_role_code,
    required_scope_type,
    required_scope_id
  );
$$;

create function private.user_can_manage_authority(
  candidate_user_id uuid,
  target_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_authority_id is not null
    and (
      private.user_has_active_role(
        candidate_user_id,
        'platform_admin',
        'global',
        null
      )
      or private.user_has_active_role(
        candidate_user_id,
        'municipal_admin',
        'authority',
        target_authority_id
      )
    );
$$;

create function private.can_manage_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_can_manage_authority(
    (select auth.uid()),
    target_authority_id
  );
$$;

create function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  citizen_role_id uuid;
  requested_language text;
begin
  requested_language := new.raw_user_meta_data ->> 'preferred_language';

  insert into public.profiles (
    id,
    display_name,
    phone,
    email,
    preferred_language,
    status
  )
  values (
    new.id,
    nullif(
      btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')),
      ''
    ),
    nullif(btrim(new.phone), ''),
    nullif(lower(btrim(new.email)), ''),
    case when requested_language in ('en', 'hi', 'mr') then requested_language else 'en' end,
    'active'
  )
  on conflict (id) do nothing;

  select role.id
  into strict citizen_role_id
  from public.roles as role
  where role.code = 'citizen';

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  values (
    new.id,
    citizen_role_id,
    'global',
    'active',
    now()
  );

  return new;
end;
$$;

create function private.handle_auth_user_identity_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    phone = nullif(btrim(new.phone), ''),
    email = nullif(lower(btrim(new.email)), '')
  where id = new.id;

  return new;
end;
$$;

create trigger on_local_wellness_auth_user_created
after insert on auth.users
for each row execute function private.handle_auth_user_created();

create trigger on_local_wellness_auth_user_identity_updated
after update of email, phone on auth.users
for each row
when (old.email is distinct from new.email or old.phone is distinct from new.phone)
execute function private.handle_auth_user_identity_updated();

create function public.provision_government_invitation(
  invited_user_id uuid,
  invitation_email text,
  authority_id uuid,
  role_id uuid,
  scope_type text,
  scope_id uuid,
  effective_from timestamptz,
  effective_until timestamptz,
  actor_user_id uuid
)
returns table (membership_id uuid, role_assignment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role_code text;
  selected_role_is_privileged boolean;
begin
  if invited_user_id is null
    or invitation_email is null
    or authority_id is null
    or role_id is null
    or scope_type is null
    or scope_id is null
    or effective_from is null
    or actor_user_id is null then
    raise exception 'Government invitation arguments must not be null.'
      using errcode = '22004';
  end if;

  if effective_until is not null and effective_until <= effective_from then
    raise exception 'effective_until must be later than effective_from.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = invited_user_id
      and profile.email = lower(btrim(invitation_email))
  ) then
    raise exception 'The invited Auth user and invitation email do not match.'
      using errcode = '23503';
  end if;

  if not private.user_can_manage_authority(actor_user_id, authority_id) then
    raise exception 'The actor cannot manage the requested authority.'
      using errcode = '42501';
  end if;

  select role.code, role.is_privileged
  into selected_role_code, selected_role_is_privileged
  from public.roles as role
  where role.id = role_id;

  if selected_role_code is null then
    raise exception 'The requested role does not exist.'
      using errcode = '23503';
  end if;

  if selected_role_is_privileged
    and not private.user_has_active_role(actor_user_id, 'platform_admin', 'global', null) then
    raise exception 'Only an active platform administrator may grant a privileged role.'
      using errcode = '42501';
  end if;

  if not (
    (selected_role_code in ('government_operator', 'municipal_admin', 'moderator')
      and scope_type = 'authority'
      and scope_id = authority_id)
    or (selected_role_code = 'ward_officer' and scope_type = 'ward')
    or (selected_role_code = 'department_officer' and scope_type = 'department')
  ) then
    raise exception 'The requested role and scope combination is not permitted.'
      using errcode = '23514';
  end if;

  insert into public.authority_memberships (
    user_id,
    authority_id,
    invitation_email,
    status,
    effective_from,
    effective_until,
    invited_by,
    approved_by,
    approved_at
  )
  values (
    invited_user_id,
    authority_id,
    lower(btrim(invitation_email)),
    'active',
    effective_from,
    effective_until,
    actor_user_id,
    actor_user_id,
    now()
  )
  returning id into membership_id;

  insert into public.user_roles (
    user_id,
    role_id,
    authority_id,
    scope_type,
    scope_id,
    effective_from,
    effective_until,
    status,
    granted_by
  )
  values (
    invited_user_id,
    role_id,
    authority_id,
    scope_type,
    scope_id,
    effective_from,
    effective_until,
    'active',
    actor_user_id
  )
  returning id into role_assignment_id;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    authority_id,
    event_type,
    outcome,
    metadata
  )
  values (
    actor_user_id,
    invited_user_id,
    authority_id,
    'government_invitation_created',
    'success',
    jsonb_build_object(
      'roleCode', selected_role_code,
      'membershipId', membership_id,
      'roleAssignmentId', role_assignment_id
    )
  );

  return next;
end;
$$;

create function public.bootstrap_platform_administrator(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  platform_admin_role_id uuid;
  role_assignment_id uuid;
begin
  if target_user_id is null then
    raise exception 'target_user_id must not be null.'
      using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('local_wellness.bootstrap_platform_administrator', 0)
  );

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = target_user_id
      and profile.status = 'active'
  ) then
    raise exception 'The target user must have an active profile.'
      using errcode = '23514';
  end if;

  select role.id
  into strict platform_admin_role_id
  from public.roles as role
  where role.code = 'platform_admin';

  if exists (
    select 1
    from public.user_roles as user_role
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.role_id = platform_admin_role_id
      and user_role.scope_type = 'global'
      and user_role.status = 'active'
      and profile.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
  ) then
    raise exception 'An active platform administrator already exists.'
      using errcode = '55000';
  end if;

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  values (
    target_user_id,
    platform_admin_role_id,
    'global',
    'active',
    now()
  )
  returning id into role_assignment_id;

  insert into public.auth_audit_events (
    subject_user_id,
    event_type,
    outcome,
    metadata
  )
  values (
    target_user_id,
    'platform_admin_bootstrapped',
    'success',
    jsonb_build_object('roleAssignmentId', role_assignment_id)
  );

  return role_assignment_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.devices enable row level security;
alter table public.devices force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.authority_memberships enable row level security;
alter table public.authority_memberships force row level security;
alter table public.auth_audit_events enable row level security;
alter table public.auth_audit_events force row level security;

create policy profiles_select_own_or_managed_authority
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = profiles.id
      and (select private.can_manage_authority(membership.authority_id))
  )
);

create policy profiles_update_own_safe_fields
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and status in ('pending', 'active')
)
with check (
  id = (select auth.uid())
  and status in ('pending', 'active')
);

create policy devices_select_own_or_managed_authority
on public.devices
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = devices.user_id
      and (select private.can_manage_authority(membership.authority_id))
  )
);

create policy devices_insert_own
on public.devices
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.status in ('pending', 'active')
  )
);

create policy devices_update_own_safe_fields
on public.devices
for update
to authenticated
using (
  user_id = (select auth.uid())
  and risk_status <> 'blocked'
)
with check (user_id = (select auth.uid()));

create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

create policy user_roles_select_own_or_managed_authority
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
);

create policy authority_memberships_select_own_or_managed_authority
on public.authority_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy auth_audit_events_select_own_or_managed_authority
on public.auth_audit_events
for select
to authenticated
using (
  actor_user_id = (select auth.uid())
  or subject_user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
);

revoke all on public.profiles from anon, authenticated, service_role;
revoke all on public.devices from anon, authenticated, service_role;
revoke all on public.roles from anon, authenticated, service_role;
revoke all on public.user_roles from anon, authenticated, service_role;
revoke all on public.authority_memberships from anon, authenticated, service_role;
revoke all on public.auth_audit_events from anon, authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (display_name, preferred_language) on public.profiles to authenticated;

grant select on public.devices to authenticated;
grant insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices to authenticated;
grant update (app_version, push_token, last_seen_at)
  on public.devices to authenticated;

grant select on public.roles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.authority_memberships to authenticated;
grant select on public.auth_audit_events to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.devices to service_role;
grant select, insert, update, delete on public.roles to service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select, insert, update, delete on public.authority_memberships to service_role;
grant select, insert on public.auth_audit_events to service_role;

grant usage on schema private to authenticated, service_role;

revoke all on function private.set_updated_at() from public;
revoke all on function private.user_has_active_role(uuid, text, text, uuid) from public;
revoke all on function private.has_active_role(text, text, uuid) from public;
revoke all on function private.user_can_manage_authority(uuid, uuid) from public;
revoke all on function private.can_manage_authority(uuid) from public;
revoke all on function private.handle_auth_user_created() from public;
revoke all on function private.handle_auth_user_identity_updated() from public;
revoke all on function public.provision_government_invitation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid
) from public, anon, authenticated;
revoke all on function public.bootstrap_platform_administrator(uuid)
  from public, anon, authenticated;

grant execute on function private.has_active_role(text, text, uuid)
  to authenticated, service_role;
grant execute on function private.can_manage_authority(uuid)
  to authenticated, service_role;
grant execute on function public.provision_government_invitation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid
) to service_role;
grant execute on function public.bootstrap_platform_administrator(uuid)
  to service_role;

comment on schema private is
  'Non-exposed security-definer helpers used by Local Wellness RLS policies.';
comment on table public.profiles is
  'Application identity data extending Supabase Auth users.';
comment on table public.devices is
  'Hashed user device registrations and server-managed risk state.';
comment on table public.roles is
  'System role reference data. Role assignments are stored separately.';
comment on table public.user_roles is
  'Versioned, expiring role assignments with explicit authority scope.';
comment on table public.authority_memberships is
  'Invitation and membership state for a user within an authority.';
comment on table public.auth_audit_events is
  'Append-only authentication and access audit events.';
comment on column public.user_roles.authority_id is
  'Phase 1 authority UUID. A governance foreign key is added in Phase 2.';
comment on column public.authority_memberships.authority_id is
  'Phase 1 authority UUID. A governance foreign key is added in Phase 2.';
$migration_20260713100000_phase_1_identity_and_access$;

  if not (pg_temp.local_wellness_relation_exists('public.profiles')
      and pg_temp.local_wellness_relation_exists('public.devices')
      and pg_temp.local_wellness_relation_exists('public.roles')
      and pg_temp.local_wellness_relation_exists('public.authority_memberships')
      and pg_temp.local_wellness_relation_exists('public.user_roles')
      and pg_temp.local_wellness_relation_exists('public.auth_audit_events')
      and pg_temp.local_wellness_function_exists('private', 'handle_auth_user_identity_updated')
      and pg_temp.local_wellness_trigger_exists('auth', 'users', 'on_local_wellness_auth_user_identity_updated')
      and pg_temp.local_wellness_policy_exists('public', 'auth_audit_events', 'auth_audit_events_select_own_or_managed_authority')
      and pg_temp.local_wellness_forced_rls('public.profiles')
      and pg_temp.local_wellness_forced_rls('public.devices')
      and pg_temp.local_wellness_role_code_exists('citizen')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713100000_phase_1_identity_and_access.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 1,
    cutoff_name = '20260713100000_phase_1_identity_and_access.sql'
  where singleton;

  raise notice 'Applied migration 20260713100000_phase_1_identity_and_access.sql';
end;
$guard_1$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713100000_phase_1_identity_and_access.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713130000_restrict_device_sensitive_column_access.sql
-- ============================================================================
do $guard_2$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 2 then
    raise notice 'Skipping already-complete migration 20260713130000_restrict_device_sensitive_column_access.sql';
    return;
  end if;

  if current_cutoff <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713130000_restrict_device_sensitive_column_access.sql';
  end if;

  execute $migration_20260713130000_restrict_device_sensitive_column_access$
revoke select on public.devices from authenticated;

grant select (
  id,
  user_id,
  platform,
  app_version,
  last_seen_at,
  risk_status,
  revoked_at,
  is_active,
  created_at,
  updated_at
) on public.devices to authenticated;

comment on column public.devices.device_identifier_hash is
  'Sensitive server-only device fingerprint. Never expose through authenticated SQL queries.';
comment on column public.devices.push_token is
  'Sensitive server-only notification address. Never expose through authenticated SQL queries.';
$migration_20260713130000_restrict_device_sensitive_column_access$;

  if not (not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'device_identifier_hash', 'SELECT')
      and not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'push_token', 'SELECT')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713130000_restrict_device_sensitive_column_access.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 2,
    cutoff_name = '20260713130000_restrict_device_sensitive_column_access.sql'
  where singleton;

  raise notice 'Applied migration 20260713130000_restrict_device_sensitive_column_access.sql';
end;
$guard_2$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713130000_restrict_device_sensitive_column_access.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713150000_atomic_device_lifecycle_and_access_provenance.sql
-- ============================================================================
do $guard_3$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 3 then
    raise notice 'Skipping already-complete migration 20260713150000_atomic_device_lifecycle_and_access_provenance.sql';
    return;
  end if;

  if current_cutoff <> 2 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713150000_atomic_device_lifecycle_and_access_provenance.sql';
  end if;

  execute $migration_20260713150000_atomic_device_lifecycle_and_access_provenance$
alter table public.authority_memberships
  drop constraint authority_memberships_approval_check;

alter table public.authority_memberships
  add constraint authority_memberships_approval_check check (
    (
      status in ('active', 'expired')
      and approved_by is not null
      and approved_at is not null
    )
    or (
      status in ('invited', 'pending_approval')
      and approved_by is null
      and approved_at is null
    )
    or (
      status = 'revoked'
      and (
        (approved_by is null and approved_at is null)
        or (approved_by is not null and approved_at is not null)
      )
    )
  );

alter table public.authority_memberships
  drop constraint authority_memberships_invited_by_fkey,
  drop constraint authority_memberships_approved_by_fkey,
  drop constraint authority_memberships_revoked_by_fkey;

alter table public.authority_memberships
  add constraint authority_memberships_invited_by_fkey
    foreign key (invited_by) references auth.users (id) on delete restrict,
  add constraint authority_memberships_approved_by_fkey
    foreign key (approved_by) references auth.users (id) on delete restrict,
  add constraint authority_memberships_revoked_by_fkey
    foreign key (revoked_by) references auth.users (id) on delete restrict;

alter table public.user_roles
  drop constraint user_roles_granted_by_fkey,
  drop constraint user_roles_revoked_by_fkey;

alter table public.user_roles
  add constraint user_roles_granted_by_fkey
    foreign key (granted_by) references auth.users (id) on delete restrict,
  add constraint user_roles_revoked_by_fkey
    foreign key (revoked_by) references auth.users (id) on delete restrict;

alter table public.auth_audit_events
  drop constraint auth_audit_events_actor_user_id_fkey,
  drop constraint auth_audit_events_subject_user_id_fkey,
  drop constraint auth_audit_events_device_id_fkey;

comment on column public.auth_audit_events.actor_user_id is
  'Immutable UUID snapshot of the actor at event time; intentionally has no foreign key.';
comment on column public.auth_audit_events.subject_user_id is
  'Immutable UUID snapshot of the subject at event time; intentionally has no foreign key.';
comment on column public.auth_audit_events.device_id is
  'Immutable UUID snapshot of the device at event time; intentionally has no foreign key.';

drop policy profiles_select_own_or_managed_authority on public.profiles;

create policy profiles_select_own_or_managed_authority
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = profiles.id
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (
        membership.effective_until is null
        or membership.effective_until > current_timestamp
      )
      and (select private.can_manage_authority(membership.authority_id))
  )
);

drop policy devices_select_own_or_managed_authority on public.devices;

create policy devices_select_own_or_managed_authority
on public.devices
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = devices.user_id
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (
        membership.effective_until is null
        or membership.effective_until > current_timestamp
      )
      and (select private.can_manage_authority(membership.authority_id))
  )
);

drop policy devices_insert_own on public.devices;
drop policy devices_update_own_safe_fields on public.devices;

revoke insert, update on public.devices from authenticated;
revoke insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices from authenticated;
revoke update (app_version, push_token, last_seen_at)
  on public.devices from authenticated;

create function public.register_device(
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

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
      and profile.status in ('pending', 'active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_OWNER_INACTIVE';
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

create function public.revoke_device(
  p_user_id uuid,
  p_device_id uuid,
  p_revoked_at timestamptz,
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
  revoked_device public.devices%rowtype;
begin
  if p_user_id is null or p_device_id is null or p_revoked_at is null then
    raise exception using
      errcode = '22004',
      message = 'DEVICE_REVOCATION_INVALID';
  end if;

  update public.devices as device
  set
    push_token = null,
    revoked_at = p_revoked_at
  where device.id = p_device_id
    and device.user_id = p_user_id
    and device.revoked_at is null
  returning device.* into revoked_device;

  if revoked_device.id is null then
    select device.*
    into revoked_device
    from public.devices as device
    where device.id = p_device_id
      and device.user_id = p_user_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_NOT_FOUND';
    end if;

    if revoked_device.revoked_at is not null then
      return revoked_device;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_REVOCATION_CONFLICT';
  end if;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    device_id,
    event_type,
    outcome,
    request_id,
    ip_address,
    user_agent
  )
  values (
    p_user_id,
    p_user_id,
    revoked_device.id,
    'device_revoked',
    'success',
    p_request_id,
    p_ip_address,
    p_user_agent
  );

  return revoked_device;
end;
$$;

revoke all on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) from public, anon, authenticated;
revoke all on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) from public, anon, authenticated;

grant execute on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) to service_role;
grant execute on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) to service_role;

comment on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) is
  'Service-only atomic device registration/upsert with a device_registered audit event.';
comment on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) is
  'Service-only atomic soft revocation with a device_revoked audit event.';
$migration_20260713150000_atomic_device_lifecycle_and_access_provenance$;

  if not (pg_temp.local_wellness_function_exists('public', 'register_device')
      and pg_temp.local_wellness_function_exists('public', 'revoke_device')
      and pg_temp.local_wellness_policy_exists('public', 'profiles', 'profiles_select_own_or_managed_authority')
      and not pg_temp.local_wellness_column_privilege('authenticated', 'public', 'devices', 'push_token', 'UPDATE')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713150000_atomic_device_lifecycle_and_access_provenance.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 3,
    cutoff_name = '20260713150000_atomic_device_lifecycle_and_access_provenance.sql'
  where singleton;

  raise notice 'Applied migration 20260713150000_atomic_device_lifecycle_and_access_provenance.sql';
end;
$guard_3$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713150000_atomic_device_lifecycle_and_access_provenance.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713160000_phase_2_governance_schema.sql
-- ============================================================================
do $guard_4$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 4 then
    raise notice 'Skipping already-complete migration 20260713160000_phase_2_governance_schema.sql';
    return;
  end if;

  if current_cutoff <> 3 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713160000_phase_2_governance_schema.sql';
  end if;

  execute $migration_20260713160000_phase_2_governance_schema$
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists governance;
revoke all on schema governance from public;

create table governance.reference_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_type text not null default 'official',
  purpose text,
  last_checked_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_sources_title_check check (
    title = btrim(title) and char_length(title) between 1 and 240
  ),
  constraint reference_sources_url_check check (
    url = btrim(url) and url ~ '^https?://[^[:space:]]+$'
  ),
  constraint reference_sources_source_type_check check (
    source_type in ('official', 'secondary', 'repository')
  ),
  constraint reference_sources_status_check check (status in ('active', 'inactive')),
  constraint reference_sources_url_unique unique (url)
);

create table governance.import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null,
  dataset_version text not null,
  canonical_root text not null,
  manifest_sha256 text not null,
  workbook_sha256 text not null,
  generated_seed_sha256 text,
  status text not null default 'pending',
  validation_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint import_batches_dataset_key_check check (
    dataset_key = btrim(dataset_key) and dataset_key ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint import_batches_dataset_version_check check (
    dataset_version = btrim(dataset_version)
    and char_length(dataset_version) between 1 and 80
  ),
  constraint import_batches_canonical_root_check check (
    canonical_root = btrim(canonical_root)
    and char_length(canonical_root) between 1 and 500
  ),
  constraint import_batches_manifest_sha256_check check (
    manifest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_workbook_sha256_check check (
    workbook_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_generated_seed_sha256_check check (
    generated_seed_sha256 is null or generated_seed_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_status_check check (
    status in ('pending', 'validated', 'imported', 'failed')
  ),
  constraint import_batches_validation_summary_check check (
    jsonb_typeof(validation_summary) = 'object'
  ),
  constraint import_batches_completion_check check (
    (status in ('pending', 'validated') and completed_at is null)
    or (status in ('imported', 'failed') and completed_at is not null)
  ),
  constraint import_batches_dataset_version_unique unique (dataset_key, dataset_version)
);

create table governance.import_files (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references governance.import_batches (id) on delete restrict,
  file_name text not null,
  sha256 text not null,
  source_row_count integer not null,
  accepted_row_count integer not null default 0,
  rejected_row_count integer not null default 0,
  warning_count integer not null default 0,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_files_file_name_check check (
    file_name = btrim(file_name) and char_length(file_name) between 1 and 255
  ),
  constraint import_files_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint import_files_counts_check check (
    source_row_count >= 0
    and accepted_row_count >= 0
    and rejected_row_count >= 0
    and warning_count >= 0
    and accepted_row_count + rejected_row_count = source_row_count
  ),
  constraint import_files_validation_summary_check check (
    jsonb_typeof(validation_summary) = 'object'
  ),
  constraint import_files_batch_file_unique unique (import_batch_id, file_name)
);

create table governance.import_records (
  id uuid primary key default gen_random_uuid(),
  import_file_id uuid not null references governance.import_files (id) on delete restrict,
  row_number integer not null,
  source_key text,
  record_sha256 text not null,
  raw_payload jsonb not null,
  validation_status text not null,
  validation_messages jsonb not null default '[]'::jsonb,
  is_placeholder boolean not null default false,
  normalization_disposition text not null,
  normalized_table text,
  normalized_record_id uuid,
  created_at timestamptz not null default now(),
  constraint import_records_row_number_check check (row_number >= 1),
  constraint import_records_source_key_check check (
    source_key is null
    or (source_key = btrim(source_key) and char_length(source_key) between 1 and 500)
  ),
  constraint import_records_record_sha256_check check (
    record_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_records_raw_payload_check check (jsonb_typeof(raw_payload) = 'object'),
  constraint import_records_validation_status_check check (
    validation_status in ('accepted', 'accepted_with_warnings', 'rejected')
  ),
  constraint import_records_validation_messages_check check (
    jsonb_typeof(validation_messages) = 'array'
  ),
  constraint import_records_normalization_disposition_check check (
    normalization_disposition in (
      'normalized',
      'placeholder_preserved',
      'reference_only',
      'rejected'
    )
  ),
  constraint import_records_normalized_table_check check (
    normalized_table is null or normalized_table ~ '^governance\.[a-z][a-z0-9_]*$'
  ),
  constraint import_records_normalized_target_check check (
    (normalized_table is null and normalized_record_id is null)
    or (normalized_table is not null and normalized_record_id is not null)
  ),
  constraint import_records_file_row_unique unique (import_file_id, row_number)
);

create table governance.authorities (
  id uuid primary key default gen_random_uuid(),
  parent_authority_id uuid references governance.authorities (id) on delete restrict,
  code text not null,
  name text not null,
  authority_type text not null,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authorities_code_check check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'),
  constraint authorities_name_check check (
    name = btrim(name) and char_length(name) between 1 and 240
  ),
  constraint authorities_type_check check (
    authority_type in (
      'state',
      'state_agency',
      'district',
      'local_body',
      'utility',
      'emergency_service',
      'other'
    )
  ),
  constraint authorities_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint authorities_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint authorities_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint authorities_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint authorities_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint authorities_parent_check check (parent_authority_id is distinct from id),
  constraint authorities_code_unique unique (code)
);

create table governance.states (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  name text not null,
  iso_code text not null,
  lgd_code text,
  capital text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint states_name_check check (name = btrim(name) and char_length(name) between 1 and 120),
  constraint states_iso_code_check check (iso_code ~ '^[A-Z]{2,3}$'),
  constraint states_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint states_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint states_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint states_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint states_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint states_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint states_iso_code_unique unique (iso_code)
);

create table governance.districts (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  name text not null,
  revenue_division_name text,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint districts_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint districts_revenue_division_check check (
    revenue_division_name is null
    or (revenue_division_name = btrim(revenue_division_name) and char_length(revenue_division_name) between 1 and 120)
  ),
  constraint districts_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint districts_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint districts_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint districts_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint districts_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint districts_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.talukas (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references governance.districts (id) on delete restrict,
  name text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talukas_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint talukas_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint talukas_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint talukas_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint talukas_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint talukas_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint talukas_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.local_bodies (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  name text not null,
  body_type text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_bodies_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint local_bodies_type_check check (
    body_type in (
      'municipal_corporation',
      'municipal_council',
      'nagar_panchayat',
      'gram_panchayat',
      'zilla_parishad',
      'panchayat_samiti',
      'other'
    )
  ),
  constraint local_bodies_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint local_bodies_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint local_bodies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint local_bodies_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint local_bodies_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint local_bodies_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.local_body_districts (
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  district_id uuid not null references governance.districts (id) on delete restrict,
  is_primary boolean not null default false,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (local_body_id, district_id)
);

create table governance.administrative_units (
  id uuid primary key default gen_random_uuid(),
  parent_unit_id uuid references governance.administrative_units (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  name text not null,
  unit_type text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint administrative_units_name_check check (
    name = btrim(name) and char_length(name) between 1 and 240
  ),
  constraint administrative_units_type_check check (
    unit_type in ('revenue_division', 'block', 'zone', 'borough', 'village', 'other')
  ),
  constraint administrative_units_lgd_code_check check (
    lgd_code is null or lgd_code ~ '^[0-9]+$'
  ),
  constraint administrative_units_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint administrative_units_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint administrative_units_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint administrative_units_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint administrative_units_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint administrative_units_parent_check check (parent_unit_id is distinct from id)
);

create table governance.wards (
  id uuid primary key default gen_random_uuid(),
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  source_ward_code text,
  lgd_code text,
  name text not null,
  ward_number text,
  zone_name text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wards_source_code_check check (
    source_ward_code is null
    or (source_ward_code = btrim(source_ward_code) and char_length(source_ward_code) between 1 and 80)
  ),
  constraint wards_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint wards_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint wards_number_check check (
    ward_number is null
    or (ward_number = btrim(ward_number) and char_length(ward_number) between 1 and 40)
  ),
  constraint wards_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint wards_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint wards_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint wards_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint wards_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  applicable_body_types text[] not null default '{}'::text[],
  complaint_types text[] not null default '{}'::text[],
  typical_coverage text,
  required_data text[] not null default '{}'::text[],
  priority_guidance text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint departments_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint departments_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint departments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint departments_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint departments_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint departments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint departments_code_unique unique (code)
);

create table governance.authority_departments (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  department_id uuid not null references governance.departments (id) on delete restrict,
  local_name text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_departments_local_name_check check (
    local_name is null or (local_name = btrim(local_name) and char_length(local_name) between 1 and 160)
  ),
  constraint authority_departments_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint authority_departments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint authority_departments_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint authority_departments_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint authority_departments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint authority_departments_authority_department_unique unique (authority_id, department_id)
);

create table governance.offices (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  authority_department_id uuid references governance.authority_departments (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  name text not null,
  office_type text not null,
  level text,
  jurisdiction_description text,
  address text,
  official_phone text,
  official_email text,
  coverage text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offices_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint offices_type_check check (
    office_type = btrim(office_type) and char_length(office_type) between 1 and 120
  ),
  constraint offices_email_check check (
    official_email is null
    or (official_email = lower(btrim(official_email)) and official_email ~ '^[^[:space:]@]+@[^[:space:]@]+$')
  ),
  constraint offices_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint offices_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint offices_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint offices_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint offices_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.officer_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  core_responsibility text,
  people_or_units_under_role text,
  reports_to_role_id uuid references governance.officer_roles (id) on delete restrict,
  reports_to_description text,
  typical_coverage text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officer_roles_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint officer_roles_name_check check (name = btrim(name) and char_length(name) between 1 and 180),
  constraint officer_roles_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint officer_roles_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officer_roles_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint officer_roles_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint officer_roles_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint officer_roles_reports_to_check check (reports_to_role_id is distinct from id),
  constraint officer_roles_code_unique unique (code)
);

create table governance.officers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  official_phone text,
  official_email text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officers_name_check check (
    full_name = btrim(full_name) and char_length(full_name) between 1 and 180
  ),
  constraint officers_email_check check (
    official_email is null
    or (official_email = lower(btrim(official_email)) and official_email ~ '^[^[:space:]@]+@[^[:space:]@]+$')
  ),
  constraint officers_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint officers_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officers_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint officers_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.officer_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_key text not null,
  version integer not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  officer_role_id uuid not null references governance.officer_roles (id) on delete restrict,
  officer_id uuid references governance.officers (id) on delete restrict,
  office_id uuid references governance.offices (id) on delete restrict,
  authority_department_id uuid references governance.authority_departments (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  responsibility text,
  coverage text,
  status text not null,
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officer_assignments_key_check check (
    assignment_key = btrim(assignment_key)
    and assignment_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint officer_assignments_version_check check (version >= 1),
  constraint officer_assignments_status_check check (
    status in ('active', 'role_only', 'incumbent_unverified', 'inactive', 'superseded')
  ),
  constraint officer_assignments_filled_check check (status <> 'active' or officer_id is not null),
  constraint officer_assignments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officer_assignments_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint officer_assignments_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint officer_assignments_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint officer_assignments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint officer_assignments_key_version_unique unique (assignment_key, version)
);

create table governance.utilities (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  name text not null,
  function_description text not null,
  jurisdiction_description text,
  complaint_types text[] not null default '{}'::text[],
  reporting_channel text,
  local_office_description text,
  escalation_role_id uuid references governance.officer_roles (id) on delete restrict,
  routing_notes text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint utilities_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint utilities_function_check check (
    function_description = btrim(function_description)
    and char_length(function_description) between 1 and 500
  ),
  constraint utilities_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint utilities_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint utilities_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint utilities_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint utilities_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid references governance.authorities (id) on delete restrict,
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  service_name text not null,
  issue_type text not null,
  jurisdiction_description text not null,
  contact_type text not null,
  contact_value text,
  availability text,
  action text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_contacts_service_check check (
    service_name = btrim(service_name) and char_length(service_name) between 1 and 200
  ),
  constraint emergency_contacts_issue_check check (
    issue_type = btrim(issue_type) and char_length(issue_type) between 1 and 500
  ),
  constraint emergency_contacts_jurisdiction_check check (
    jurisdiction_description = btrim(jurisdiction_description)
    and char_length(jurisdiction_description) between 1 and 240
  ),
  constraint emergency_contacts_type_check check (
    contact_type in ('phone', 'helpline', 'url', 'office', 'other')
  ),
  constraint emergency_contacts_value_check check (
    contact_value is null
    or (contact_value = btrim(contact_value) and char_length(contact_value) between 1 and 500)
  ),
  constraint emergency_contacts_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint emergency_contacts_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint emergency_contacts_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint emergency_contacts_usable_contact_check check (
    is_placeholder or contact_value is not null
  ),
  constraint emergency_contacts_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint emergency_contacts_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.jurisdiction_boundary_versions (
  id uuid primary key default gen_random_uuid(),
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  version integer not null,
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jurisdiction_boundaries_exactly_one_scope_check check (
    (state_id is not null)::integer
      + (district_id is not null)::integer
      + (taluka_id is not null)::integer
      + (local_body_id is not null)::integer
      + (ward_id is not null)::integer = 1
  ),
  constraint jurisdiction_boundaries_version_check check (version >= 1),
  constraint jurisdiction_boundaries_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint jurisdiction_boundaries_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint jurisdiction_boundaries_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint jurisdiction_boundaries_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint jurisdiction_boundaries_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint jurisdiction_boundaries_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint jurisdiction_boundaries_valid_geometry_check check (
    not extensions.st_isempty(boundary) and extensions.st_isvalid(boundary)
  ),
  constraint jurisdiction_boundaries_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.complaint_routing_references (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null,
  version integer not null,
  issue_name text not null,
  primary_department_id uuid references governance.departments (id) on delete restrict,
  first_recipient_role_id uuid references governance.officer_roles (id) on delete restrict,
  primary_department_label text not null,
  first_recipient_role_label text not null,
  escalation_1_label text,
  escalation_2_label text,
  ownership_condition text,
  priority_or_emergency text,
  is_emergency boolean not null default false,
  routing_logic text not null,
  normalization_status text not null default 'unresolved',
  normalization_notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_routing_references_rule_code_check check (
    rule_code = btrim(rule_code) and rule_code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'
  ),
  constraint complaint_routing_references_version_check check (version >= 1),
  constraint complaint_routing_references_issue_check check (
    issue_name = btrim(issue_name) and char_length(issue_name) between 1 and 240
  ),
  constraint complaint_routing_references_labels_check check (
    primary_department_label = btrim(primary_department_label)
    and char_length(primary_department_label) between 1 and 240
    and first_recipient_role_label = btrim(first_recipient_role_label)
    and char_length(first_recipient_role_label) between 1 and 240
  ),
  constraint complaint_routing_references_logic_check check (
    routing_logic = btrim(routing_logic) and char_length(routing_logic) between 1 and 2000
  ),
  constraint complaint_routing_references_normalization_status_check check (
    normalization_status in ('resolved', 'partially_resolved', 'unresolved')
  ),
  constraint complaint_routing_references_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint complaint_routing_references_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint complaint_routing_references_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint complaint_routing_references_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and normalization_status = 'resolved'
      and primary_department_id is not null
      and first_recipient_role_id is not null
    )
  ),
  constraint complaint_routing_references_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint complaint_routing_references_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint complaint_routing_references_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint complaint_routing_references_rule_version_unique unique (rule_code, version)
);

alter table governance.officer_assignments
  add constraint officer_assignments_no_effective_overlap
  exclude using gist (
    assignment_key with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  );

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_state_no_effective_overlap
  exclude using gist (
    state_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (state_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_district_no_effective_overlap
  exclude using gist (
    district_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (district_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_taluka_no_effective_overlap
  exclude using gist (
    taluka_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (taluka_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_local_body_no_effective_overlap
  exclude using gist (
    local_body_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (local_body_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_ward_no_effective_overlap
  exclude using gist (
    ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (ward_id is not null and status <> 'draft');

alter table governance.complaint_routing_references
  add constraint complaint_routing_references_no_effective_overlap
  exclude using gist (
    rule_code with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index states_lgd_code_unique_idx on governance.states (lgd_code) where lgd_code is not null;
create unique index districts_state_name_unique_idx on governance.districts (state_id, lower(name));
create unique index districts_lgd_code_unique_idx on governance.districts (lgd_code) where lgd_code is not null;
create unique index talukas_district_name_unique_idx on governance.talukas (district_id, lower(name));
create unique index talukas_lgd_code_unique_idx on governance.talukas (lgd_code) where lgd_code is not null;
create unique index local_bodies_lgd_code_unique_idx
  on governance.local_bodies (lgd_code) where lgd_code is not null;
create unique index local_body_districts_one_primary_idx
  on governance.local_body_districts (local_body_id) where is_primary;
create index local_body_districts_district_idx
  on governance.local_body_districts (district_id, local_body_id);
create unique index administrative_units_lgd_code_unique_idx
  on governance.administrative_units (lgd_code) where lgd_code is not null;
create index administrative_units_scope_idx
  on governance.administrative_units (state_id, district_id, taluka_id, local_body_id, unit_type);
create unique index wards_local_body_source_code_unique_idx
  on governance.wards (local_body_id, source_ward_code) where source_ward_code is not null;
create unique index wards_lgd_code_unique_idx
  on governance.wards (lgd_code) where lgd_code is not null;
create unique index wards_local_body_number_unique_idx
  on governance.wards (local_body_id, ward_number) where ward_number is not null;
create index authorities_parent_status_idx
  on governance.authorities (parent_authority_id, status, authority_type);
create index authority_departments_authority_status_idx
  on governance.authority_departments (authority_id, status, department_id);
create index offices_authority_status_idx on governance.offices (authority_id, status, name);
create index officer_assignments_authority_role_time_idx
  on governance.officer_assignments (authority_id, officer_role_id, status, effective_from, effective_to);
create index officer_assignments_officer_time_idx
  on governance.officer_assignments (officer_id, effective_from desc) where officer_id is not null;
create unique index officer_assignments_one_current_idx
  on governance.officer_assignments (assignment_key)
  where effective_to is null and status <> 'superseded';
create index emergency_contacts_scope_status_idx
  on governance.emergency_contacts (state_id, district_id, local_body_id, status);
create index import_records_source_key_idx
  on governance.import_records (source_key) where source_key is not null;
create index jurisdiction_boundary_versions_boundary_gix
  on governance.jurisdiction_boundary_versions using gist (boundary);
create index jurisdiction_boundary_versions_effective_idx
  on governance.jurisdiction_boundary_versions (status, effective_from, effective_to);
create unique index jurisdiction_boundaries_state_version_unique_idx
  on governance.jurisdiction_boundary_versions (state_id, version) where state_id is not null;
create unique index jurisdiction_boundaries_district_version_unique_idx
  on governance.jurisdiction_boundary_versions (district_id, version) where district_id is not null;
create unique index jurisdiction_boundaries_taluka_version_unique_idx
  on governance.jurisdiction_boundary_versions (taluka_id, version) where taluka_id is not null;
create unique index jurisdiction_boundaries_local_body_version_unique_idx
  on governance.jurisdiction_boundary_versions (local_body_id, version) where local_body_id is not null;
create unique index jurisdiction_boundaries_ward_version_unique_idx
  on governance.jurisdiction_boundary_versions (ward_id, version) where ward_id is not null;
create unique index jurisdiction_boundaries_one_current_state_idx
  on governance.jurisdiction_boundary_versions (state_id)
  where state_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_district_idx
  on governance.jurisdiction_boundary_versions (district_id)
  where district_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_taluka_idx
  on governance.jurisdiction_boundary_versions (taluka_id)
  where taluka_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_local_body_idx
  on governance.jurisdiction_boundary_versions (local_body_id)
  where local_body_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_ward_idx
  on governance.jurisdiction_boundary_versions (ward_id)
  where ward_id is not null and effective_to is null and status = 'active';
create unique index complaint_routing_references_one_current_idx
  on governance.complaint_routing_references (rule_code)
  where effective_to is null and status = 'active';
create index complaint_routing_references_lookup_idx
  on governance.complaint_routing_references (
    issue_name,
    status,
    effective_from,
    effective_to,
    is_routing_eligible
  );

create trigger reference_sources_set_updated_at
before update on governance.reference_sources
for each row execute function private.set_updated_at();

create trigger authorities_set_updated_at
before update on governance.authorities
for each row execute function private.set_updated_at();

create trigger states_set_updated_at
before update on governance.states
for each row execute function private.set_updated_at();

create trigger districts_set_updated_at
before update on governance.districts
for each row execute function private.set_updated_at();

create trigger talukas_set_updated_at
before update on governance.talukas
for each row execute function private.set_updated_at();

create trigger local_bodies_set_updated_at
before update on governance.local_bodies
for each row execute function private.set_updated_at();

create trigger administrative_units_set_updated_at
before update on governance.administrative_units
for each row execute function private.set_updated_at();

create trigger wards_set_updated_at
before update on governance.wards
for each row execute function private.set_updated_at();

create trigger departments_set_updated_at
before update on governance.departments
for each row execute function private.set_updated_at();

create trigger authority_departments_set_updated_at
before update on governance.authority_departments
for each row execute function private.set_updated_at();

create trigger offices_set_updated_at
before update on governance.offices
for each row execute function private.set_updated_at();

create trigger officer_roles_set_updated_at
before update on governance.officer_roles
for each row execute function private.set_updated_at();

create trigger officers_set_updated_at
before update on governance.officers
for each row execute function private.set_updated_at();

create trigger officer_assignments_set_updated_at
before update on governance.officer_assignments
for each row execute function private.set_updated_at();

create trigger utilities_set_updated_at
before update on governance.utilities
for each row execute function private.set_updated_at();

create trigger emergency_contacts_set_updated_at
before update on governance.emergency_contacts
for each row execute function private.set_updated_at();

create trigger jurisdiction_boundary_versions_set_updated_at
before update on governance.jurisdiction_boundary_versions
for each row execute function private.set_updated_at();

create trigger complaint_routing_references_set_updated_at
before update on governance.complaint_routing_references
for each row execute function private.set_updated_at();

comment on schema governance is
  'Normalized, provenance-aware Maharashtra governance registry and versioned jurisdiction references.';
comment on table governance.authorities is
  'Canonical authorization supertype referenced by state, district, local-body, and utility entities.';
comment on table governance.import_records is
  'Immutable row-level provenance copied from canonical CSV inputs; rejected and placeholder rows remain traceable.';
comment on table governance.officer_roles is
  'Durable role definitions kept separate from changing officer assignments.';
comment on table governance.officers is
  'Verified or explicitly unverified real people only; role-only placeholders belong in officer_assignments.';
comment on table governance.officer_assignments is
  'Versioned authority-scoped incumbency or role-only records. Historical versions are retained.';
comment on table governance.jurisdiction_boundary_versions is
  'Versioned PostGIS MultiPolygon boundaries for exactly one governance jurisdiction.';
comment on table governance.complaint_routing_references is
  'Versioned source references imported in Phase 2; these are not executable Phase 3 routing rules.';
$migration_20260713160000_phase_2_governance_schema$;

  if not (pg_temp.local_wellness_relation_exists('governance.authorities')
      and pg_temp.local_wellness_relation_exists('governance.states')
      and pg_temp.local_wellness_relation_exists('governance.districts')
      and pg_temp.local_wellness_relation_exists('governance.local_bodies')
      and pg_temp.local_wellness_relation_exists('governance.wards')
      and pg_temp.local_wellness_relation_exists('governance.jurisdiction_boundary_versions')
      and pg_temp.local_wellness_relation_exists('governance.complaint_routing_references')
      and pg_temp.local_wellness_trigger_exists('governance', 'complaint_routing_references', 'complaint_routing_references_set_updated_at')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713160000_phase_2_governance_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 4,
    cutoff_name = '20260713160000_phase_2_governance_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260713160000_phase_2_governance_schema.sql';
end;
$guard_4$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713160000_phase_2_governance_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713161000_phase_2_governance_security.sql
-- ============================================================================
do $guard_5$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 5 then
    raise notice 'Skipping already-complete migration 20260713161000_phase_2_governance_security.sql';
    return;
  end if;

  if current_cutoff <> 4 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713161000_phase_2_governance_security.sql';
  end if;

  execute $migration_20260713161000_phase_2_governance_security$
create function governance.reject_historical_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are retained as history and cannot be deleted.', tg_table_schema, tg_table_name);
end;
$$;

create function governance.guard_import_batch_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array[
        'status',
        'validation_summary',
        'completed_at',
        'generated_seed_sha256'
      ]
  ) is distinct from (
    to_jsonb(old)
      - array[
        'status',
        'validation_summary',
        'completed_at',
        'generated_seed_sha256'
      ]
  ) then
    raise exception using
      errcode = '55000',
      message = 'Import batch identity and canonical source hashes are immutable.';
  end if;

  if old.status <> new.status and not (
    (old.status = 'pending' and new.status in ('validated', 'failed'))
    or (old.status = 'validated' and new.status in ('imported', 'failed'))
  ) then
    raise exception using
      errcode = '55000',
      message = 'Import batch status transitions are monotonic.';
  end if;

  if old.status in ('imported', 'failed') and (
    new.status is distinct from old.status
    or new.validation_summary is distinct from old.validation_summary
    or new.completed_at is distinct from old.completed_at
  ) then
    raise exception using
      errcode = '55000',
      message = 'Completed import batches are immutable.';
  end if;

  if old.generated_seed_sha256 is not null
    and new.generated_seed_sha256 is distinct from old.generated_seed_sha256 then
    raise exception using
      errcode = '55000',
      message = 'The generated seed hash can only be recorded once.';
  end if;

  return new;
end;
$$;

create function governance.reject_import_ledger_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I import ledger records are immutable.', tg_table_schema, tg_table_name);
end;
$$;

create function governance.guard_version_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array['status', 'effective_to', 'is_routing_eligible', 'updated_at']
  ) is distinct from (
    to_jsonb(old)
      - array['status', 'effective_to', 'is_routing_eligible', 'updated_at']
  ) then
    raise exception using
      errcode = '55000',
      message = format(
        '%I.%I version content is immutable; close the version and append a new row.',
        tg_table_schema,
        tg_table_name
      );
  end if;

  if old.effective_to is not null
    and new.effective_to is distinct from old.effective_to then
    raise exception using
      errcode = '55000',
      message = 'A closed version cannot be reopened or re-dated.';
  end if;

  if old.status <> new.status and not (
    (old.status = 'draft' and new.status = 'active')
    or (
      old.status not in ('inactive', 'superseded')
      and new.status in ('inactive', 'superseded')
      and new.effective_to is not null
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Version status transitions are monotonic.';
  end if;

  if (to_jsonb(new) ->> 'is_routing_eligible')
    is distinct from (to_jsonb(old) ->> 'is_routing_eligible')
    and not (
      (
        (to_jsonb(old) ->> 'is_routing_eligible') = 'false'
        and (to_jsonb(new) ->> 'is_routing_eligible') = 'true'
        and old.status = 'draft'
        and new.status = 'active'
      )
      or (
        (to_jsonb(old) ->> 'is_routing_eligible') = 'true'
        and (to_jsonb(new) ->> 'is_routing_eligible') = 'false'
        and new.effective_to is not null
      )
    ) then
    raise exception using
      errcode = '55000',
      message = 'Routing eligibility changes are allowed only during activation or closure.';
  end if;

  return new;
end;
$$;

create function governance.validate_authority_subtype()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.authority_id
      and authority.authority_type = tg_argv[0]
  ) then
    raise exception using
      errcode = '23514',
      message = format(
        'Authority %s must have authority_type %s for %I.%I.',
        new.authority_id,
        tg_argv[0],
        tg_table_schema,
        tg_table_name
      );
  end if;

  return new;
end;
$$;

create function governance.validate_office_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.taluka_id is not null and not exists (
    select 1 from governance.talukas as taluka
    where taluka.id = new.taluka_id and taluka.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office taluka must belong to its district.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must cover its taluka district.';
  end if;

  if new.authority_department_id is not null and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Office department must belong to its authority.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = new.local_body_id
      and local_body.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must match its authority.';
  end if;

  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.ward_id
      and local_body.authority_id = new.authority_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'Office ward must belong to its authority and local body.';
  end if;

  if new.district_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_body_districts as coverage
      on coverage.local_body_id = ward.local_body_id
    where ward.id = new.ward_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office ward must fall within its district.';
  end if;

  if new.taluka_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    inner join governance.wards as ward on ward.local_body_id = coverage.local_body_id
    where taluka.id = new.taluka_id and ward.id = new.ward_id
  ) then
    raise exception using errcode = '23514', message = 'Office ward must fall within its taluka district.';
  end if;

  return new;
end;
$$;

create function governance.validate_officer_assignment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.taluka_id is not null and not exists (
    select 1 from governance.talukas as taluka
    where taluka.id = new.taluka_id and taluka.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment taluka must belong to its district.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must cover its taluka district.';
  end if;

  if new.office_id is not null and not exists (
    select 1 from governance.offices as office
    where office.id = new.office_id and office.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment office must belong to its authority.';
  end if;

  if new.authority_department_id is not null and not exists (
    select 1 from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment department must belong to its authority.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must match its authority.';
  end if;

  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.ward_id
      and local_body.authority_id = new.authority_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must belong to its authority and local body.';
  end if;

  if new.district_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_body_districts as coverage
      on coverage.local_body_id = ward.local_body_id
    where ward.id = new.ward_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must fall within its district.';
  end if;

  if new.taluka_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    inner join governance.wards as ward on ward.local_body_id = coverage.local_body_id
    where taluka.id = new.taluka_id and ward.id = new.ward_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must fall within its taluka district.';
  end if;

  return new;
end;
$$;

create function governance.validate_local_body_district_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.local_bodies as local_body
    inner join governance.districts as district on district.id = new.district_id
    where local_body.id = new.local_body_id and local_body.state_id = district.state_id
  ) then
    raise exception using errcode = '23514', message = 'Local body and district must belong to the same state.';
  end if;

  return new;
end;
$$;

create function governance.validate_administrative_unit_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and not exists (
    select 1 from governance.districts as district
    where district.id = new.district_id and district.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit district must belong to its state.';
  end if;

  if new.taluka_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.districts as district on district.id = taluka.district_id
    where taluka.id = new.taluka_id
      and district.state_id = new.state_id
      and (new.district_id is null or taluka.district_id = new.district_id)
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit taluka conflicts with its state or district.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must belong to its state.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must cover its taluka district.';
  end if;

  if new.parent_unit_id is not null and not exists (
    select 1 from governance.administrative_units as parent
    where parent.id = new.parent_unit_id
      and parent.state_id = new.state_id
      and (
        parent.district_id is null
        or parent.district_id = new.district_id
      )
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit parent conflicts with its state or district.';
  end if;

  if new.parent_unit_id is not null and exists (
    with recursive ancestors as (
      select parent.id, parent.parent_unit_id
      from governance.administrative_units as parent
      where parent.id = new.parent_unit_id
      union all
      select parent.id, parent.parent_unit_id
      from governance.administrative_units as parent
      inner join ancestors on ancestors.parent_unit_id = parent.id
    )
    select 1 from ancestors where ancestors.id = new.id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit parent relationships cannot contain a cycle.';
  end if;

  if exists (
    select 1 from governance.administrative_units as child
    where child.parent_unit_id = new.id
      and (
        child.state_id <> new.state_id
        or (new.district_id is not null and child.district_id is distinct from new.district_id)
      )
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit scope changes cannot invalidate existing children.';
  end if;

  return new;
end;
$$;

create function governance.validate_emergency_contact_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jurisdiction_authority_id uuid;
begin
  if new.district_id is not null and new.state_id is not null and not exists (
    select 1 from governance.districts as district
    where district.id = new.district_id and district.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact district must belong to its state.';
  end if;

  if new.local_body_id is not null and new.state_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact local body must belong to its state.';
  end if;

  if new.local_body_id is not null and new.district_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact local body must cover its district.';
  end if;

  if new.authority_id is not null then
    if new.local_body_id is not null then
      select local_body.authority_id into jurisdiction_authority_id
      from governance.local_bodies as local_body where local_body.id = new.local_body_id;
    elsif new.district_id is not null then
      select district.authority_id into jurisdiction_authority_id
      from governance.districts as district where district.id = new.district_id;
    elsif new.state_id is not null then
      select state.authority_id into jurisdiction_authority_id
      from governance.states as state where state.id = new.state_id;
    end if;

    if jurisdiction_authority_id is not null and not exists (
      select 1 from governance.authorities as authority
      where authority.id = new.authority_id
        and (
          authority.id = jurisdiction_authority_id
          or authority.parent_authority_id = jurisdiction_authority_id
        )
    ) then
      raise exception using errcode = '23514', message = 'Emergency contact authority must own or be a direct child of its jurisdiction.';
    end if;
  end if;

  return new;
end;
$$;

create function private.is_verified_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
  );
$$;

create trigger import_batches_guard_update
before update on governance.import_batches
for each row execute function governance.guard_import_batch_update();

create trigger import_batches_reject_delete
before delete on governance.import_batches
for each row execute function governance.reject_historical_delete();

create trigger import_files_reject_update
before update on governance.import_files
for each row execute function governance.reject_import_ledger_update();

create trigger import_files_reject_delete
before delete on governance.import_files
for each row execute function governance.reject_historical_delete();

create trigger import_records_reject_update
before update on governance.import_records
for each row execute function governance.reject_import_ledger_update();

create trigger import_records_reject_delete
before delete on governance.import_records
for each row execute function governance.reject_historical_delete();

create trigger officer_assignments_guard_update
before update on governance.officer_assignments
for each row execute function governance.guard_version_update();

create trigger officer_assignments_reject_delete
before delete on governance.officer_assignments
for each row execute function governance.reject_historical_delete();

create trigger jurisdiction_boundaries_guard_update
before update on governance.jurisdiction_boundary_versions
for each row execute function governance.guard_version_update();

create trigger jurisdiction_boundaries_reject_delete
before delete on governance.jurisdiction_boundary_versions
for each row execute function governance.reject_historical_delete();

create trigger complaint_routing_references_guard_update
before update on governance.complaint_routing_references
for each row execute function governance.guard_version_update();

create trigger complaint_routing_references_reject_delete
before delete on governance.complaint_routing_references
for each row execute function governance.reject_historical_delete();

create trigger states_validate_authority_subtype
before insert or update of authority_id on governance.states
for each row execute function governance.validate_authority_subtype('state');

create trigger districts_validate_authority_subtype
before insert or update of authority_id on governance.districts
for each row execute function governance.validate_authority_subtype('district');

create trigger local_bodies_validate_authority_subtype
before insert or update of authority_id on governance.local_bodies
for each row execute function governance.validate_authority_subtype('local_body');

create trigger utilities_validate_authority_subtype
before insert or update of authority_id on governance.utilities
for each row execute function governance.validate_authority_subtype('utility');

create trigger offices_validate_scope
before insert or update of
  authority_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.offices
for each row execute function governance.validate_office_scope();

create trigger officer_assignments_validate_scope
before insert or update of
  authority_id,
  office_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.officer_assignments
for each row execute function governance.validate_officer_assignment_scope();

create trigger local_body_districts_validate_scope
before insert or update of local_body_id, district_id
on governance.local_body_districts
for each row execute function governance.validate_local_body_district_scope();

create trigger administrative_units_validate_scope
before insert or update of parent_unit_id, state_id, district_id, taluka_id, local_body_id
on governance.administrative_units
for each row execute function governance.validate_administrative_unit_scope();

create trigger emergency_contacts_validate_scope
before insert or update of authority_id, state_id, district_id, local_body_id
on governance.emergency_contacts
for each row execute function governance.validate_emergency_contact_scope();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'reference_sources',
    'import_batches',
    'import_files',
    'import_records',
    'authorities',
    'states',
    'districts',
    'talukas',
    'local_bodies',
    'local_body_districts',
    'administrative_units',
    'wards',
    'departments',
    'authority_departments',
    'offices',
    'officer_roles',
    'officers',
    'officer_assignments',
    'utilities',
    'emergency_contacts',
    'jurisdiction_boundary_versions',
    'complaint_routing_references'
  ]
  loop
    execute format('alter table governance.%I enable row level security', table_name);
    execute format('alter table governance.%I force row level security', table_name);
  end loop;
end;
$$;

create policy reference_sources_select_active
on governance.reference_sources for select to authenticated
using (
  status = 'active'
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy import_batches_select_platform_admin
on governance.import_batches for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy import_files_select_platform_admin
on governance.import_files for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy import_records_select_platform_admin
on governance.import_records for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy authorities_select_verified_or_managed
on governance.authorities for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(id))
);

create policy states_select_verified_or_managed
on governance.states for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy districts_select_verified_or_managed
on governance.districts for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy talukas_select_verified_or_managed
on governance.talukas for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and exists (
      select 1 from governance.districts as public_district
      where public_district.id = talukas.district_id
        and (select private.is_verified_governance_authority(public_district.authority_id))
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.districts as district
    where district.id = talukas.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy local_bodies_select_verified_or_managed
on governance.local_bodies for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy local_body_districts_select_visible_or_managed
on governance.local_body_districts for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or
  exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = local_body_districts.local_body_id
      and (
        (
          local_body.status = 'active'
          and local_body.verification_status = 'verified'
          and not local_body.is_placeholder
          and (select private.is_verified_governance_authority(local_body.authority_id))
        )
        or (select private.can_manage_authority(local_body.authority_id))
      )
  )
);

create policy administrative_units_select_verified_or_managed
on governance.administrative_units for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (
      exists (
        select 1 from governance.local_bodies as public_local_body
        where public_local_body.id = administrative_units.local_body_id
          and (select private.is_verified_governance_authority(public_local_body.authority_id))
      )
      or exists (
        select 1 from governance.districts as public_district
        where public_district.id = administrative_units.district_id
          and (select private.is_verified_governance_authority(public_district.authority_id))
      )
      or (
        administrative_units.local_body_id is null
        and administrative_units.district_id is null
        and exists (
          select 1 from governance.states as public_state
          where public_state.id = administrative_units.state_id
            and (select private.is_verified_governance_authority(public_state.authority_id))
        )
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = administrative_units.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = administrative_units.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy wards_select_verified_or_managed
on governance.wards for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and exists (
      select 1 from governance.local_bodies as public_local_body
      where public_local_body.id = wards.local_body_id
        and (select private.is_verified_governance_authority(public_local_body.authority_id))
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = wards.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

create policy departments_select_verified_or_platform_admin
on governance.departments for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy authority_departments_select_verified_or_managed
on governance.authority_departments for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy offices_select_verified_or_managed
on governance.offices for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy officer_roles_select_verified_or_platform_admin
on governance.officer_roles for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy officers_select_managed
on governance.officers for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.officer_assignments as assignment
    where assignment.officer_id = officers.id
      and (select private.can_manage_authority(assignment.authority_id))
  )
);

create policy officer_assignments_select_managed
on governance.officer_assignments for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy utilities_select_verified_or_managed
on governance.utilities for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy emergency_contacts_select_verified_or_managed
on governance.emergency_contacts for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (authority_id is not null and (select private.can_manage_authority(authority_id)))
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy jurisdiction_boundaries_select_current_or_managed
on governance.jurisdiction_boundary_versions for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = jurisdiction_boundary_versions.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = jurisdiction_boundary_versions.ward_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = jurisdiction_boundary_versions.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy complaint_routing_references_select_verified_or_platform_admin
on governance.complaint_routing_references for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
  )
  or (select private.has_active_role('platform_admin', 'global', null))
);

revoke all privileges on schema governance from public, anon, authenticated, service_role;
revoke all privileges on all tables in schema governance from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema governance from public, anon, authenticated, service_role;

grant usage on schema governance to authenticated, service_role;

grant select on governance.reference_sources to authenticated;
grant select on governance.import_batches to authenticated;
grant select on governance.import_files to authenticated;
grant select on governance.import_records to authenticated;
grant select on governance.authorities to authenticated;
grant select on governance.states to authenticated;
grant select on governance.districts to authenticated;
grant select on governance.talukas to authenticated;
grant select on governance.local_bodies to authenticated;
grant select on governance.local_body_districts to authenticated;
grant select on governance.administrative_units to authenticated;
grant select on governance.wards to authenticated;
grant select on governance.departments to authenticated;
grant select on governance.authority_departments to authenticated;
grant select on governance.offices to authenticated;
grant select on governance.officer_roles to authenticated;
grant select on governance.officers to authenticated;
grant select on governance.officer_assignments to authenticated;
grant select on governance.utilities to authenticated;
grant select on governance.emergency_contacts to authenticated;
grant select on governance.jurisdiction_boundary_versions to authenticated;
grant select on governance.complaint_routing_references to authenticated;

grant select, insert, update on all tables in schema governance to service_role;

alter default privileges in schema governance revoke all on tables from public, anon, authenticated;
alter default privileges in schema governance revoke all on functions from public, anon, authenticated;

comment on function governance.reject_historical_delete() is
  'Rejects hard deletion of import ledgers and versioned governance history.';
comment on function governance.guard_version_update() is
  'Allows a version row to be closed or superseded without permitting in-place history rewrites.';
$migration_20260713161000_phase_2_governance_security$;

  if not (pg_temp.local_wellness_policy_exists('governance', 'complaint_routing_references', 'complaint_routing_references_select_verified_or_platform_admin')
      and pg_temp.local_wellness_policy_exists('governance', 'offices', 'offices_select_verified_or_managed')
      and pg_temp.local_wellness_forced_rls('governance.complaint_routing_references')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713161000_phase_2_governance_security.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 5,
    cutoff_name = '20260713161000_phase_2_governance_security.sql'
  where singleton;

  raise notice 'Applied migration 20260713161000_phase_2_governance_security.sql';
end;
$guard_5$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713161000_phase_2_governance_security.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713162000_phase_2_identity_authority_forward_fix.sql
-- ============================================================================
do $guard_6$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 6 then
    raise notice 'Skipping already-complete migration 20260713162000_phase_2_identity_authority_forward_fix.sql';
    return;
  end if;

  if current_cutoff <> 5 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713162000_phase_2_identity_authority_forward_fix.sql';
  end if;

  execute $migration_20260713162000_phase_2_identity_authority_forward_fix$
with legacy_authority_ids as (
  select authority_id
  from public.authority_memberships
  union
  select authority_id
  from public.user_roles
  where authority_id is not null
  union
  select authority_id
  from public.auth_audit_events
  where authority_id is not null
)
insert into governance.authorities (
  id,
  code,
  name,
  authority_type,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible
)
select
  legacy.authority_id,
  'LEGACY_' || upper(replace(legacy.authority_id::text, '-', '_')),
  'Legacy authority ' || legacy.authority_id::text,
  'other',
  'active',
  'placeholder',
  'Created by the Phase 2 forward fix. Reconcile this identifier with verified governance data.',
  true,
  false
from legacy_authority_ids as legacy
where legacy.authority_id is not null
on conflict (id) do nothing;

alter table public.authority_memberships
  add constraint authority_memberships_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

alter table public.user_roles
  add constraint user_roles_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

alter table public.auth_audit_events
  add constraint auth_audit_events_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

create or replace function private.user_has_active_role(
  candidate_user_id uuid,
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = candidate_user_id
      and profile.status = 'active'
      and role.code = required_role_code
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
      and (
        required_scope_type is null
        or (
          user_role.scope_type = required_scope_type
          and user_role.scope_id is not distinct from required_scope_id
        )
      )
      and (
        user_role.scope_type = 'global'
        or (
          exists (
            select 1
            from governance.authorities as authority
            where authority.id = user_role.authority_id
              and authority.status = 'active'
          )
          and exists (
            select 1
            from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = user_role.authority_id
              and membership.status = 'active'
              and membership.effective_from <= current_timestamp
              and (
                membership.effective_until is null
                or membership.effective_until > current_timestamp
              )
          )
        )
      )
  );
$$;

create or replace function private.user_can_manage_authority(
  candidate_user_id uuid,
  target_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from governance.authorities as authority
      where authority.id = target_authority_id
        and authority.status = 'active'
    )
    and (
      private.user_has_active_role(
        candidate_user_id,
        'platform_admin',
        'global',
        null
      )
      or private.user_has_active_role(
        candidate_user_id,
        'municipal_admin',
        'authority',
        target_authority_id
      )
    );
$$;

create function private.validate_governance_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope_type = 'global' then
    return new;
  end if;

  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_NOT_FOUND';
  end if;

  if new.scope_type = 'authority' and new.scope_id <> new.authority_id then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_MISMATCH';
  end if;

  if new.scope_type = 'ward' and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.scope_id
      and local_body.authority_id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_WARD_MISMATCH';
  end if;

  if new.scope_type = 'department' and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.scope_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_DEPARTMENT_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger user_roles_validate_governance_scope
before insert or update of authority_id, scope_type, scope_id
on public.user_roles
for each row execute function private.validate_governance_role_scope();

revoke all on function private.validate_governance_role_scope() from public, anon, authenticated;

comment on column public.authority_memberships.authority_id is
  'Canonical authority reference enforced by the Phase 2 governance registry.';
comment on column public.user_roles.authority_id is
  'Canonical authority reference enforced by the Phase 2 governance registry.';
comment on column public.auth_audit_events.authority_id is
  'Canonical retained authority reference for an immutable authentication audit event.';
comment on function private.validate_governance_role_scope() is
  'Validates authority, ward, and authority-department ownership for scoped role assignments.';
$migration_20260713162000_phase_2_identity_authority_forward_fix$;

  if not (pg_temp.local_wellness_function_exists('private', 'validate_governance_role_scope')
      and pg_temp.local_wellness_trigger_exists('public', 'user_roles', 'user_roles_validate_governance_scope')
      and pg_temp.local_wellness_column_exists('public', 'user_roles', 'authority_id')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713162000_phase_2_identity_authority_forward_fix.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 6,
    cutoff_name = '20260713162000_phase_2_identity_authority_forward_fix.sql'
  where singleton;

  raise notice 'Applied migration 20260713162000_phase_2_identity_authority_forward_fix.sql';
end;
$guard_6$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713162000_phase_2_identity_authority_forward_fix.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713163000_phase_2_jurisdiction_resolution.sql
-- ============================================================================
do $guard_7$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 7 then
    raise notice 'Skipping already-complete migration 20260713163000_phase_2_jurisdiction_resolution.sql';
    return;
  end if;

  if current_cutoff <> 6 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713163000_phase_2_jurisdiction_resolution.sql';
  end if;

  execute $migration_20260713163000_phase_2_jurisdiction_resolution$
create function governance.resolve_jurisdiction(
  p_longitude double precision,
  p_latitude double precision,
  p_resolved_at timestamptz default current_timestamp
)
returns table (
  local_body_id uuid,
  ward_id uuid,
  local_body_boundary_version_id uuid,
  ward_boundary_version_id uuid
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_longitude is null
    or p_latitude is null
    or p_resolved_at is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90 then
    raise exception using
      errcode = '22023',
      message = 'JURISDICTION_COORDINATES_INVALID';
  end if;

  return query
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  )
  select
    local_body.id,
    ward_match.ward_id,
    local_body_boundary.id,
    ward_match.boundary_version_id
  from governance.jurisdiction_boundary_versions as local_body_boundary
  inner join governance.local_bodies as local_body
    on local_body.id = local_body_boundary.local_body_id
  inner join governance.authorities as local_body_authority
    on local_body_authority.id = local_body.authority_id
  cross join input_point
  left join lateral (
    select
      ward.id as ward_id,
      ward_boundary.id as boundary_version_id
    from governance.jurisdiction_boundary_versions as ward_boundary
    inner join governance.wards as ward on ward.id = ward_boundary.ward_id
    where ward.local_body_id = local_body.id
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
      and ward_boundary.status = 'active'
      and ward_boundary.verification_status = 'verified'
      and not ward_boundary.is_placeholder
      and ward_boundary.is_routing_eligible
      and ward_boundary.effective_from <= p_resolved_at
      and (
        ward_boundary.effective_to is null
        or ward_boundary.effective_to > p_resolved_at
      )
      and extensions.st_covers(ward_boundary.boundary, input_point.location)
  ) as ward_match on true
  where local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body_authority.status = 'active'
    and local_body_authority.verification_status = 'verified'
    and not local_body_authority.is_placeholder
    and local_body_authority.is_routing_eligible
    and local_body_boundary.status = 'active'
    and local_body_boundary.verification_status = 'verified'
    and not local_body_boundary.is_placeholder
    and local_body_boundary.is_routing_eligible
    and local_body_boundary.effective_from <= p_resolved_at
    and (
      local_body_boundary.effective_to is null
      or local_body_boundary.effective_to > p_resolved_at
    )
    and extensions.st_covers(local_body_boundary.boundary, input_point.location)
  order by local_body.id, ward_match.ward_id nulls last;
end;
$$;

revoke all on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated;

grant execute on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) to service_role;

comment on function governance.resolve_jurisdiction(
  double precision,
  double precision,
  timestamptz
) is
  'Resolves all active, verified, routing-eligible local-body and ward boundaries covering a WGS84 coordinate; it does not execute Phase 3 complaint routing.';
$migration_20260713163000_phase_2_jurisdiction_resolution$;

  if not (pg_temp.local_wellness_function_exists('governance', 'resolve_jurisdiction')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713163000_phase_2_jurisdiction_resolution.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 7,
    cutoff_name = '20260713163000_phase_2_jurisdiction_resolution.sql'
  where singleton;

  raise notice 'Applied migration 20260713163000_phase_2_jurisdiction_resolution.sql';
end;
$guard_7$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713163000_phase_2_jurisdiction_resolution.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713164000_phase_2_governance_integrity_forward_fix.sql
-- ============================================================================
do $guard_8$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 8 then
    raise notice 'Skipping already-complete migration 20260713164000_phase_2_governance_integrity_forward_fix.sql';
    return;
  end if;

  if current_cutoff <> 7 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713164000_phase_2_governance_integrity_forward_fix.sql';
  end if;

  execute $migration_20260713164000_phase_2_governance_integrity_forward_fix$
create function governance.reject_scope_key_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  argument_index integer;
  column_name text;
begin
  for argument_index in 0..tg_nargs - 1 loop
    column_name := tg_argv[argument_index];

    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception using
        errcode = '55000',
        message = format(
          '%I.%I scope key %I is immutable; create or supersede a record instead.',
          tg_table_schema,
          tg_table_name,
          column_name
        );
    end if;
  end loop;

  return new;
end;
$$;

create function governance.validate_authority_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_authority_id is null then
    return new;
  end if;

  if exists (
    with recursive ancestors as (
      select authority.id, authority.parent_authority_id
      from governance.authorities as authority
      where authority.id = new.parent_authority_id

      union all

      select authority.id, authority.parent_authority_id
      from governance.authorities as authority
      inner join ancestors on ancestors.parent_authority_id = authority.id
    )
    select 1 from ancestors where ancestors.id = new.id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent relationships cannot contain a cycle.';
  end if;

  return new;
end;
$$;

create function governance.reject_authority_cycles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    with recursive authority_paths as (
      select
        authority.id as origin_id,
        authority.parent_authority_id as next_id,
        array[authority.id]::uuid[] as visited_ids,
        false as has_cycle
      from governance.authorities as authority

      union all

      select
        path.origin_id,
        parent.parent_authority_id,
        path.visited_ids || parent.id,
        parent.id = any(path.visited_ids)
      from authority_paths as path
      inner join governance.authorities as parent on parent.id = path.next_id
      where not path.has_cycle
    )
    select 1 from authority_paths where has_cycle
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent relationships cannot contain a cycle.';
  end if;

  return null;
end;
$$;

create function private.is_active_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id and state.status = 'active'
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id and district.status = 'active'
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id and local_body.status = 'active'
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id and utility.status = 'active'
        )
        else true
      end
  );
$$;

create or replace function private.is_verified_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id
            and state.status = 'active'
            and state.verification_status = 'verified'
            and not state.is_placeholder
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id
            and district.status = 'active'
            and district.verification_status = 'verified'
            and not district.is_placeholder
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id
            and local_body.status = 'active'
            and local_body.verification_status = 'verified'
            and not local_body.is_placeholder
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id
            and utility.status = 'active'
            and utility.verification_status = 'verified'
            and not utility.is_placeholder
        )
        else true
      end
  );
$$;

create or replace function private.user_has_active_role(
  candidate_user_id uuid,
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = candidate_user_id
      and profile.status = 'active'
      and role.code = required_role_code
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
      and (
        required_scope_type is null
        or (
          user_role.scope_type = required_scope_type
          and user_role.scope_id is not distinct from required_scope_id
        )
      )
      and (
        user_role.scope_type = 'global'
        or (
          user_role.authority_id is not null
          and private.is_active_governance_authority(user_role.authority_id)
          and exists (
            select 1
            from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = user_role.authority_id
              and membership.status = 'active'
              and membership.effective_from <= current_timestamp
              and (
                membership.effective_until is null
                or membership.effective_until > current_timestamp
              )
          )
          and (
            (
              user_role.scope_type = 'authority'
              and user_role.scope_id = user_role.authority_id
            )
            or (
              user_role.scope_type = 'ward'
              and exists (
                select 1
                from governance.wards as ward
                inner join governance.local_bodies as local_body
                  on local_body.id = ward.local_body_id
                where ward.id = user_role.scope_id
                  and ward.status = 'active'
                  and not ward.is_placeholder
                  and local_body.authority_id = user_role.authority_id
                  and local_body.status = 'active'
              )
            )
            or (
              user_role.scope_type = 'department'
              and exists (
                select 1
                from governance.authority_departments as authority_department
                inner join governance.departments as department
                  on department.id = authority_department.department_id
                where authority_department.id = user_role.scope_id
                  and authority_department.authority_id = user_role.authority_id
                  and authority_department.status = 'active'
                  and not authority_department.is_placeholder
                  and department.status = 'active'
                  and not department.is_placeholder
              )
            )
          )
        )
      )
  );
$$;

create or replace function private.user_can_manage_authority(
  candidate_user_id uuid,
  target_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_governance_authority(target_authority_id)
    and (
      private.user_has_active_role(
        candidate_user_id,
        'platform_admin',
        'global',
        null
      )
      or private.user_has_active_role(
        candidate_user_id,
        'municipal_admin',
        'authority',
        target_authority_id
      )
    );
$$;

create or replace function private.validate_governance_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope_type = 'global' then
    return new;
  end if;

  if not private.is_active_governance_authority(new.authority_id) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_NOT_ACTIVE';
  end if;

  if new.scope_type = 'authority' and new.scope_id <> new.authority_id then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_MISMATCH';
  end if;

  if new.scope_type = 'ward' and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.scope_id
      and ward.status = 'active'
      and not ward.is_placeholder
      and local_body.authority_id = new.authority_id
      and local_body.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_WARD_MISMATCH';
  end if;

  if new.scope_type = 'department' and not exists (
    select 1
    from governance.authority_departments as authority_department
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where authority_department.id = new.scope_id
      and authority_department.authority_id = new.authority_id
      and authority_department.status = 'active'
      and not authority_department.is_placeholder
      and department.status = 'active'
      and not department.is_placeholder
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_DEPARTMENT_MISMATCH';
  end if;

  return new;
end;
$$;

create function public.get_active_authority_memberships(
  p_user_id uuid,
  p_at timestamptz
)
returns setof public.authority_memberships
language sql
stable
security definer
set search_path = ''
as $$
  select membership.*
  from public.authority_memberships as membership
  inner join public.profiles as profile on profile.id = membership.user_id
  where membership.user_id = p_user_id
    and profile.status = 'active'
    and membership.status = 'active'
    and membership.effective_from <= p_at
    and (membership.effective_until is null or membership.effective_until > p_at)
    and private.is_active_governance_authority(membership.authority_id)
  order by membership.effective_from, membership.id;
$$;

create function public.get_active_user_roles(
  p_user_id uuid,
  p_at timestamptz
)
returns setof public.user_roles
language sql
stable
security definer
set search_path = ''
as $$
  select user_role.*
  from public.user_roles as user_role
  inner join public.profiles as profile on profile.id = user_role.user_id
  where user_role.user_id = p_user_id
    and profile.status = 'active'
    and user_role.status = 'active'
    and user_role.effective_from <= p_at
    and (user_role.effective_until is null or user_role.effective_until > p_at)
    and (
      user_role.scope_type = 'global'
      or (
        user_role.authority_id is not null
        and private.is_active_governance_authority(user_role.authority_id)
        and exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= p_at
            and (membership.effective_until is null or membership.effective_until > p_at)
        )
        and (
          (
            user_role.scope_type = 'authority'
            and user_role.scope_id = user_role.authority_id
          )
          or (
            user_role.scope_type = 'ward'
            and exists (
              select 1
              from governance.wards as ward
              inner join governance.local_bodies as local_body
                on local_body.id = ward.local_body_id
              where ward.id = user_role.scope_id
                and ward.status = 'active'
                and not ward.is_placeholder
                and local_body.authority_id = user_role.authority_id
                and local_body.status = 'active'
            )
          )
          or (
            user_role.scope_type = 'department'
            and exists (
              select 1
              from governance.authority_departments as authority_department
              inner join governance.departments as department
                on department.id = authority_department.department_id
              where authority_department.id = user_role.scope_id
                and authority_department.authority_id = user_role.authority_id
                and authority_department.status = 'active'
                and not authority_department.is_placeholder
                and department.status = 'active'
                and not department.is_placeholder
            )
          )
        )
      )
    )
  order by user_role.effective_from, user_role.id;
$$;

alter table governance.officer_assignments
  add constraint officer_assignments_status_officer_check check (
    (status = 'role_only' and officer_id is null)
    or (status in ('active', 'incumbent_unverified') and officer_id is not null)
    or status in ('inactive', 'superseded')
  ) not valid;

alter table governance.officer_assignments
  validate constraint officer_assignments_status_officer_check;

create trigger authorities_validate_hierarchy
before insert or update of parent_authority_id
on governance.authorities
for each row execute function governance.validate_authority_hierarchy();

create constraint trigger authorities_reject_hierarchy_cycles
after insert or update of parent_authority_id
on governance.authorities
deferrable initially immediate
for each row execute function governance.reject_authority_cycles();

create trigger authorities_reject_scope_key_update
before update of parent_authority_id, authority_type
on governance.authorities
for each row execute function governance.reject_scope_key_update(
  'parent_authority_id',
  'authority_type'
);

create trigger states_reject_scope_key_update
before update of authority_id on governance.states
for each row execute function governance.reject_scope_key_update('authority_id');

create trigger districts_reject_scope_key_update
before update of authority_id, state_id on governance.districts
for each row execute function governance.reject_scope_key_update('authority_id', 'state_id');

create trigger talukas_reject_scope_key_update
before update of district_id on governance.talukas
for each row execute function governance.reject_scope_key_update('district_id');

create trigger local_bodies_reject_scope_key_update
before update of authority_id, state_id on governance.local_bodies
for each row execute function governance.reject_scope_key_update('authority_id', 'state_id');

create trigger local_body_districts_reject_scope_key_update
before update of local_body_id, district_id on governance.local_body_districts
for each row execute function governance.reject_scope_key_update('local_body_id', 'district_id');

create trigger wards_reject_scope_key_update
before update of local_body_id on governance.wards
for each row execute function governance.reject_scope_key_update('local_body_id');

create trigger authority_departments_reject_scope_key_update
before update of authority_id, department_id on governance.authority_departments
for each row execute function governance.reject_scope_key_update('authority_id', 'department_id');

create trigger offices_reject_scope_key_update
before update of
  authority_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.offices
for each row execute function governance.reject_scope_key_update(
  'authority_id',
  'authority_department_id',
  'district_id',
  'taluka_id',
  'local_body_id',
  'ward_id'
);

create trigger utilities_reject_scope_key_update
before update of authority_id on governance.utilities
for each row execute function governance.reject_scope_key_update('authority_id');

drop policy authorities_select_verified_or_managed on governance.authorities;
create policy authorities_select_verified_or_managed
on governance.authorities for select to authenticated
using (
  (select private.is_verified_governance_authority(id))
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(id))
);

drop policy local_body_districts_select_visible_or_managed on governance.local_body_districts;
create policy local_body_districts_select_visible_or_managed
on governance.local_body_districts for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or (
    exists (
      select 1
      from governance.local_bodies as local_body
      where local_body.id = local_body_districts.local_body_id
        and (select private.is_verified_governance_authority(local_body.authority_id))
    )
    and exists (
      select 1
      from governance.districts as district
      where district.id = local_body_districts.district_id
        and (select private.is_verified_governance_authority(district.authority_id))
    )
  )
  or exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = local_body_districts.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

drop policy emergency_contacts_select_verified_or_managed on governance.emergency_contacts;
create policy emergency_contacts_select_verified_or_managed
on governance.emergency_contacts for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (
      authority_id is null
      or (select private.is_verified_governance_authority(authority_id))
    )
    and (
      state_id is null
      or exists (
        select 1 from governance.states as state
        where state.id = emergency_contacts.state_id
          and (select private.is_verified_governance_authority(state.authority_id))
      )
    )
    and (
      district_id is null
      or exists (
        select 1 from governance.districts as district
        where district.id = emergency_contacts.district_id
          and (select private.is_verified_governance_authority(district.authority_id))
      )
    )
    and (
      local_body_id is null
      or exists (
        select 1 from governance.local_bodies as local_body
        where local_body.id = emergency_contacts.local_body_id
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
  or exists (
    select 1 from governance.states as state
    where state.id = emergency_contacts.state_id
      and (select private.can_manage_authority(state.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = emergency_contacts.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = emergency_contacts.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

drop policy jurisdiction_boundaries_select_current_or_managed
  on governance.jurisdiction_boundary_versions;
create policy jurisdiction_boundaries_select_current_or_managed
on governance.jurisdiction_boundary_versions for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and (
      exists (
        select 1 from governance.states as state
        where state.id = jurisdiction_boundary_versions.state_id
          and (select private.is_verified_governance_authority(state.authority_id))
      )
      or exists (
        select 1 from governance.districts as district
        where district.id = jurisdiction_boundary_versions.district_id
          and (select private.is_verified_governance_authority(district.authority_id))
      )
      or exists (
        select 1
        from governance.talukas as taluka
        inner join governance.districts as district on district.id = taluka.district_id
        where taluka.id = jurisdiction_boundary_versions.taluka_id
          and taluka.status = 'active'
          and taluka.verification_status = 'verified'
          and not taluka.is_placeholder
          and (select private.is_verified_governance_authority(district.authority_id))
      )
      or exists (
        select 1 from governance.local_bodies as local_body
        where local_body.id = jurisdiction_boundary_versions.local_body_id
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
      or exists (
        select 1
        from governance.wards as ward
        inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
        where ward.id = jurisdiction_boundary_versions.ward_id
          and ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.states as state
    where state.id = jurisdiction_boundary_versions.state_id
      and (select private.can_manage_authority(state.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = jurisdiction_boundary_versions.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1
    from governance.talukas as taluka
    inner join governance.districts as district on district.id = taluka.district_id
    where taluka.id = jurisdiction_boundary_versions.taluka_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = jurisdiction_boundary_versions.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = jurisdiction_boundary_versions.ward_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

revoke all on function governance.reject_scope_key_update() from public, anon, authenticated;
revoke all on function governance.validate_authority_hierarchy() from public, anon, authenticated;
revoke all on function governance.reject_authority_cycles() from public, anon, authenticated;
revoke all on function private.is_active_governance_authority(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.is_verified_governance_authority(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.is_verified_governance_authority(uuid)
  to authenticated, service_role;
revoke all on function private.validate_governance_role_scope()
  from public, anon, authenticated;
revoke all on function public.get_active_authority_memberships(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.get_active_user_roles(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_active_authority_memberships(uuid, timestamptz)
  to service_role;
grant execute on function public.get_active_user_roles(uuid, timestamptz)
  to service_role;

comment on function private.is_active_governance_authority(uuid) is
  'Checks the current canonical authority and typed governance entity lifecycle for trusted authorization paths.';
comment on function public.get_active_authority_memberships(uuid, timestamptz) is
  'Service-only effective membership read constrained by canonical governance authority lifecycle.';
comment on function public.get_active_user_roles(uuid, timestamptz) is
  'Service-only effective role read constrained by membership and canonical authority, ward, or department ownership.';
$migration_20260713164000_phase_2_governance_integrity_forward_fix$;

  if not (pg_temp.local_wellness_trigger_exists('governance', 'wards', 'wards_reject_scope_key_update')
      and pg_temp.local_wellness_trigger_exists('governance', 'utilities', 'utilities_reject_scope_key_update')
      and pg_temp.local_wellness_policy_exists('governance', 'authorities', 'authorities_select_verified_or_managed')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713164000_phase_2_governance_integrity_forward_fix.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 8,
    cutoff_name = '20260713164000_phase_2_governance_integrity_forward_fix.sql'
  where singleton;

  raise notice 'Applied migration 20260713164000_phase_2_governance_integrity_forward_fix.sql';
end;
$guard_8$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713164000_phase_2_governance_integrity_forward_fix.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713165000_enforce_authority_parent_types.sql
-- ============================================================================
do $guard_9$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 9 then
    raise notice 'Skipping already-complete migration 20260713165000_enforce_authority_parent_types.sql';
    return;
  end if;

  if current_cutoff <> 8 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713165000_enforce_authority_parent_types.sql';
  end if;

  execute $migration_20260713165000_enforce_authority_parent_types$
create function governance.reject_invalid_authority_parent_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from governance.authorities as child
    left join governance.authorities as parent on parent.id = child.parent_authority_id
    where
      (child.authority_type = 'state' and child.parent_authority_id is not null)
      or (
        child.authority_type in ('district', 'state_agency')
        and (parent.id is null or parent.authority_type <> 'state')
      )
      or (
        child.authority_type = 'local_body'
        and (parent.id is null or parent.authority_type not in ('state', 'district'))
      )
      or (
        child.authority_type in ('utility', 'emergency_service')
        and (
          parent.id is null
          or parent.authority_type not in ('state', 'district', 'local_body')
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent type is incompatible with child authority type.';
  end if;

  return null;
end;
$$;

create constraint trigger authorities_reject_invalid_parent_types
after insert or update of parent_authority_id, authority_type
on governance.authorities
deferrable initially immediate
for each row execute function governance.reject_invalid_authority_parent_types();

revoke all on function governance.reject_invalid_authority_parent_types()
from public, anon, authenticated;

comment on function governance.reject_invalid_authority_parent_types() is
  'Rejects parentless or type-incompatible structured authority hierarchies after each statement.';
$migration_20260713165000_enforce_authority_parent_types$;

  if not (pg_temp.local_wellness_function_exists('governance', 'reject_invalid_authority_parent_types')
      and pg_temp.local_wellness_trigger_exists('governance', 'authorities', 'authorities_reject_invalid_parent_types')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713165000_enforce_authority_parent_types.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 9,
    cutoff_name = '20260713165000_enforce_authority_parent_types.sql'
  where singleton;

  raise notice 'Applied migration 20260713165000_enforce_authority_parent_types.sql';
end;
$guard_9$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713165000_enforce_authority_parent_types.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713166000_harden_governance_access_and_geometry.sql
-- ============================================================================
do $guard_10$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 10 then
    raise notice 'Skipping already-complete migration 20260713166000_harden_governance_access_and_geometry.sql';
    return;
  end if;

  if current_cutoff <> 9 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713166000_harden_governance_access_and_geometry.sql';
  end if;

  execute $migration_20260713166000_harden_governance_access_and_geometry$
create or replace function private.is_active_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and authority.verification_status <> 'placeholder'
      and not authority.is_placeholder
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id
            and state.status = 'active'
            and state.verification_status <> 'placeholder'
            and not state.is_placeholder
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id
            and district.status = 'active'
            and district.verification_status <> 'placeholder'
            and not district.is_placeholder
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id
            and local_body.status = 'active'
            and local_body.verification_status <> 'placeholder'
            and not local_body.is_placeholder
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id
            and utility.status = 'active'
            and utility.verification_status <> 'placeholder'
            and not utility.is_placeholder
        )
        else true
      end
  );
$$;

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_coordinate_envelope_check check (
    extensions.st_xmin(extensions.box3d(boundary)) >= -180
    and extensions.st_xmax(extensions.box3d(boundary)) <= 180
    and extensions.st_ymin(extensions.box3d(boundary)) >= -90
    and extensions.st_ymax(extensions.box3d(boundary)) <= 90
  ) not valid;

alter table governance.jurisdiction_boundary_versions
  validate constraint jurisdiction_boundaries_coordinate_envelope_check;

comment on constraint jurisdiction_boundaries_coordinate_envelope_check
on governance.jurisdiction_boundary_versions is
  'Keeps SRID 4326 boundary coordinates inside the valid longitude and latitude envelope.';

comment on function private.is_active_governance_authority(uuid) is
  'Returns true only for an active, non-placeholder canonical authority with an active non-placeholder typed record where applicable.';
$migration_20260713166000_harden_governance_access_and_geometry$;

  if not (pg_temp.local_wellness_constraint_exists('governance', 'jurisdiction_boundary_versions', 'jurisdiction_boundaries_coordinate_envelope_check')
      and pg_temp.local_wellness_function_exists('private', 'is_active_governance_authority')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713166000_harden_governance_access_and_geometry.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 10,
    cutoff_name = '20260713166000_harden_governance_access_and_geometry.sql'
  where singleton;

  raise notice 'Applied migration 20260713166000_harden_governance_access_and_geometry.sql';
end;
$guard_10$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713166000_harden_governance_access_and_geometry.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713200000_phase_3_routing_schema.sql
-- ============================================================================
do $guard_11$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 11 then
    raise notice 'Skipping already-complete migration 20260713200000_phase_3_routing_schema.sql';
    return;
  end if;

  if current_cutoff <> 10 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713200000_phase_3_routing_schema.sql';
  end if;

  execute $migration_20260713200000_phase_3_routing_schema$
create schema if not exists routing;
revoke all on schema routing from public;

create table routing.issue_domains (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issue_domains_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint issue_domains_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint issue_domains_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 1000)
  ),
  constraint issue_domains_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint issue_domains_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint issue_domains_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint issue_domains_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint issue_domains_code_unique unique (code)
);

create table routing.issue_categories (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references routing.issue_domains (id) on delete restrict,
  parent_category_id uuid references routing.issue_categories (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  classification_level text not null default 'category',
  default_severity text not null default 'medium',
  requires_asset boolean not null default false,
  requires_location boolean not null default true,
  location_requirement text not null default 'required',
  is_emergency boolean not null default false,
  minimum_media_count smallint not null default 0,
  maximum_media_count smallint not null default 5,
  required_attributes text[] not null default '{}'::text[],
  media_requirements jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issue_categories_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint issue_categories_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint issue_categories_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 1000)
  ),
  constraint issue_categories_classification_level_check check (
    classification_level in ('category', 'subcategory', 'issue')
  ),
  constraint issue_categories_parent_shape_check check (
    (classification_level = 'category' and parent_category_id is null)
    or (classification_level in ('subcategory', 'issue') and parent_category_id is not null)
  ),
  constraint issue_categories_default_severity_check check (
    default_severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint issue_categories_location_requirement_check check (
    location_requirement in ('required', 'optional')
  ),
  constraint issue_categories_location_consistency_check check (
    requires_location = (location_requirement = 'required')
  ),
  constraint issue_categories_media_count_check check (
    minimum_media_count between 0 and 20
    and maximum_media_count between minimum_media_count and 20
  ),
  constraint issue_categories_media_requirements_check check (
    jsonb_typeof(media_requirements) = 'object'
  ),
  constraint issue_categories_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint issue_categories_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint issue_categories_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint issue_categories_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint issue_categories_parent_check check (parent_category_id is distinct from id),
  constraint issue_categories_code_unique unique (code)
);

create table routing.category_aliases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  alias text not null,
  alias_key text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_aliases_alias_check check (
    alias = btrim(alias) and char_length(alias) between 1 and 160
  ),
  constraint category_aliases_key_check check (alias_key ~ '^[a-z][a-z0-9_]{1,159}$'),
  constraint category_aliases_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint category_aliases_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint category_aliases_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint category_aliases_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint category_aliases_key_unique unique (alias_key)
);

create table routing.asset_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  matching_distance_meters double precision not null default 25,
  identifier_required boolean not null default false,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_types_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint asset_types_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint asset_types_matching_distance_check check (
    matching_distance_meters > 0 and matching_distance_meters <= 5000
  ),
  constraint asset_types_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_types_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_types_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_types_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_types_code_unique unique (code)
);

create table routing.category_asset_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  asset_type_id uuid not null references routing.asset_types (id) on delete restrict,
  requirement text not null default 'optional',
  match_priority smallint not null default 100,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_asset_types_requirement_check check (
    requirement in ('optional', 'required')
  ),
  constraint category_asset_types_priority_check check (match_priority between 0 and 32767),
  constraint category_asset_types_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint category_asset_types_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint category_asset_types_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint category_asset_types_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint category_asset_types_unique unique (category_id, asset_type_id)
);

create table routing.assets (
  id uuid primary key default gen_random_uuid(),
  asset_type_id uuid not null references routing.asset_types (id) on delete restrict,
  asset_key text not null,
  external_identifier text,
  display_name text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_key_check check (
    asset_key = btrim(asset_key) and asset_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint assets_external_identifier_check check (
    external_identifier is null
    or (
      external_identifier = btrim(external_identifier)
      and char_length(external_identifier) between 1 and 240
    )
  ),
  constraint assets_display_name_check check (
    display_name is null
    or (display_name = btrim(display_name) and char_length(display_name) between 1 and 240)
  ),
  constraint assets_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint assets_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint assets_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint assets_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint assets_key_unique unique (asset_key)
);

create table routing.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references routing.assets (id) on delete restrict,
  version integer not null,
  district_id uuid references governance.districts (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  location extensions.geometry(Geometry, 4326) not null,
  attributes jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_versions_version_check check (version >= 1),
  constraint asset_versions_attributes_check check (jsonb_typeof(attributes) = 'object'),
  constraint asset_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint asset_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint asset_versions_valid_geometry_check check (
    not extensions.st_isempty(location) and extensions.st_isvalid(location)
  ),
  constraint asset_versions_coordinate_envelope_check check (
    extensions.st_xmin(extensions.box3d(location)) >= -180
    and extensions.st_xmax(extensions.box3d(location)) <= 180
    and extensions.st_ymin(extensions.box3d(location)) >= -90
    and extensions.st_ymax(extensions.box3d(location)) <= 90
  ),
  constraint asset_versions_asset_version_unique unique (asset_id, version)
);

create table routing.asset_ownership_versions (
  id uuid primary key default gen_random_uuid(),
  ownership_key text not null,
  version integer not null,
  asset_id uuid not null references routing.assets (id) on delete restrict,
  owner_authority_id uuid not null references governance.authorities (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  office_id uuid references governance.offices (id) on delete restrict,
  officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_ownership_versions_key_check check (
    ownership_key = btrim(ownership_key)
    and ownership_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint asset_ownership_versions_version_check check (version >= 1),
  constraint asset_ownership_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_ownership_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_ownership_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_ownership_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_ownership_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint asset_ownership_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint asset_ownership_versions_key_version_unique unique (ownership_key, version)
);

create table routing.confidence_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confidence_policies_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint confidence_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint confidence_policies_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint confidence_policies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint confidence_policies_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint confidence_policies_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint confidence_policies_code_unique unique (code)
);

create table routing.confidence_policy_versions (
  id uuid primary key default gen_random_uuid(),
  confidence_policy_id uuid not null
    references routing.confidence_policies (id) on delete restrict,
  version integer not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  automatic_threshold numeric(7, 6) not null,
  manual_review_threshold numeric(7, 6) not null,
  ambiguity_delta numeric(7, 6) not null,
  fallback_penalty_per_level numeric(7, 6) not null,
  factors jsonb not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confidence_policy_versions_version_check check (version >= 1),
  constraint confidence_policy_versions_thresholds_check check (
    automatic_threshold between 0 and 1
    and manual_review_threshold between 0 and 1
    and automatic_threshold >= manual_review_threshold
    and ambiguity_delta between 0 and 1
    and fallback_penalty_per_level between 0 and 1
  ),
  constraint confidence_policy_versions_factors_check check (
    jsonb_typeof(factors) = 'array' and jsonb_array_length(factors) > 0
  ),
  constraint confidence_policy_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint confidence_policy_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint confidence_policy_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint confidence_policy_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint confidence_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint confidence_policy_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint confidence_policy_versions_policy_version_unique unique (
    confidence_policy_id,
    version
  )
);

create table routing.duplicate_detection_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_detection_policies_code_check check (
    code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint duplicate_detection_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint duplicate_detection_policies_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint duplicate_detection_policies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint duplicate_detection_policies_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint duplicate_detection_policies_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint duplicate_detection_policies_code_unique unique (code)
);

create table routing.duplicate_detection_policy_versions (
  id uuid primary key default gen_random_uuid(),
  duplicate_detection_policy_id uuid not null
    references routing.duplicate_detection_policies (id) on delete restrict,
  version integer not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  maximum_distance_meters double precision not null,
  maximum_age_seconds integer not null,
  minimum_score numeric(7, 6) not null,
  maximum_results smallint not null,
  weights jsonb not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_detection_policy_versions_version_check check (version >= 1),
  constraint duplicate_detection_policy_versions_distance_check check (
    maximum_distance_meters > 0 and maximum_distance_meters <= 50000
  ),
  constraint duplicate_detection_policy_versions_age_check check (maximum_age_seconds > 0),
  constraint duplicate_detection_policy_versions_score_check check (minimum_score between 0 and 1),
  constraint duplicate_detection_policy_versions_results_check check (
    maximum_results between 1 and 100
  ),
  constraint duplicate_detection_policy_versions_weights_check check (
    jsonb_typeof(weights) = 'object'
  ),
  constraint duplicate_detection_policy_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint duplicate_detection_policy_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint duplicate_detection_policy_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint duplicate_detection_policy_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint duplicate_detection_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint duplicate_detection_policy_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint duplicate_detection_policy_versions_policy_version_unique unique (
    duplicate_detection_policy_id,
    version
  )
);

create table routing.route_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  rule_code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_rules_code_check check (
    rule_code = btrim(rule_code) and rule_code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'
  ),
  constraint route_rules_name_check check (
    name = btrim(name) and char_length(name) between 1 and 200
  ),
  constraint route_rules_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint route_rules_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint route_rules_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint route_rules_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint route_rules_code_unique unique (rule_code)
);

create table routing.route_rule_versions (
  id uuid primary key default gen_random_uuid(),
  route_rule_id uuid not null references routing.route_rules (id) on delete restrict,
  version integer not null,
  scope_authority_id uuid references governance.authorities (id) on delete restrict,
  scope_local_body_id uuid references governance.local_bodies (id) on delete restrict,
  scope_ward_id uuid references governance.wards (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  target_authority_id uuid references governance.authorities (id) on delete restrict,
  target_department_id uuid references governance.departments (id) on delete restrict,
  target_officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  target_office_id uuid references governance.offices (id) on delete restrict,
  confidence_policy_version_id uuid
    references routing.confidence_policy_versions (id) on delete restrict,
  asset_requirement text not null default 'none',
  requires_asset_owner boolean not null default false,
  priority integer not null default 100,
  fallback_depth smallint not null default 0,
  fallback_path uuid[] not null default '{}'::uuid[],
  confidence_factor_codes text[] not null default '{}'::text[],
  explanation_code text not null,
  routing_notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_rule_versions_version_check check (version >= 1),
  constraint route_rule_versions_asset_requirement_check check (
    asset_requirement in ('none', 'preferred', 'required')
  ),
  constraint route_rule_versions_asset_owner_requirement_check check (
    not requires_asset_owner or asset_requirement <> 'none'
  ),
  constraint route_rule_versions_priority_check check (priority >= 0),
  constraint route_rule_versions_fallback_depth_check check (
    fallback_depth between 0 and 32 and cardinality(fallback_path) = fallback_depth
  ),
  constraint route_rule_versions_explanation_code_check check (
    explanation_code ~ '^[a-z][a-z0-9_]{1,119}$'
  ),
  constraint route_rule_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint route_rule_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint route_rule_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint route_rule_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and target_department_id is not null
      and target_officer_role_id is not null
      and confidence_policy_version_id is not null
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint route_rule_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint route_rule_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint route_rule_versions_rule_version_unique unique (route_rule_id, version)
);

create table routing.routing_decisions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  request_id text not null,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  input_location extensions.geometry(Point, 4326) not null,
  accuracy_meters double precision not null,
  captured_at timestamptz not null,
  resolved_at timestamptz not null,
  decision_status text not null,
  confidence_score numeric(7, 6),
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  state_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  district_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  taluka_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  local_body_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  ward_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  asset_version_id uuid references routing.asset_versions (id) on delete restrict,
  asset_match_distance_meters double precision,
  asset_ownership_version_id uuid
    references routing.asset_ownership_versions (id) on delete restrict,
  target_authority_id uuid references governance.authorities (id) on delete restrict,
  department_id uuid references governance.departments (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  officer_assignment_id uuid references governance.officer_assignments (id) on delete restrict,
  route_rule_id uuid references routing.route_rules (id) on delete restrict,
  route_rule_version_id uuid references routing.route_rule_versions (id) on delete restrict,
  confidence_policy_version_id uuid
    references routing.confidence_policy_versions (id) on delete restrict,
  fallback_depth smallint not null default 0,
  explanation_codes text[] not null default '{}'::text[],
  explanation_metadata jsonb not null default '{}'::jsonb,
  ambiguity_count smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint routing_decisions_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint routing_decisions_status_check check (
    decision_status in ('routed', 'manual_review', 'mapping_required', 'unsupported_area')
  ),
  constraint routing_decisions_confidence_check check (
    confidence_score is null or confidence_score between 0 and 1
  ),
  constraint routing_decisions_accuracy_check check (
    accuracy_meters >= 0 and accuracy_meters <= 5000
  ),
  constraint routing_decisions_capture_time_check check (
    captured_at <= resolved_at + interval '2 minutes'
  ),
  constraint routing_decisions_explanation_metadata_check check (
    jsonb_typeof(explanation_metadata) = 'object'
    and not (
      explanation_metadata
        ?| array[
          'officerName',
          'officerPhone',
          'officerEmail',
          'contactValue',
          'complaintText',
          'description'
        ]
    )
  ),
  constraint routing_decisions_fallback_depth_check check (fallback_depth between 0 and 32),
  constraint routing_decisions_asset_distance_check check (
    asset_match_distance_meters is null or asset_match_distance_meters >= 0
  ),
  constraint routing_decisions_geographic_version_shape_check check (
    (state_id is null or local_body_id is not null)
    and (district_id is null) = (district_boundary_version_id is null)
    and (taluka_id is null) = (taluka_boundary_version_id is null)
    and (local_body_id is null) = (local_body_boundary_version_id is null)
    and (ward_id is null) = (ward_boundary_version_id is null)
    and (state_boundary_version_id is null or state_id is not null)
  ),
  constraint routing_decisions_asset_shape_check check (
    (
      asset_type_id is null
      and asset_id is null
      and asset_version_id is null
      and asset_match_distance_meters is null
      and asset_ownership_version_id is null
    )
    or (
      asset_type_id is not null
      and asset_id is not null
      and asset_version_id is not null
      and asset_match_distance_meters is not null
    )
  ),
  constraint routing_decisions_outcome_shape_check check (
    (
      decision_status = 'routed'
      and confidence_score is not null
      and state_id is not null
      and local_body_id is not null
      and local_body_boundary_version_id is not null
      and target_authority_id is not null
      and department_id is not null
      and authority_department_id is not null
      and officer_role_id is not null
      and route_rule_id is not null
      and route_rule_version_id is not null
      and confidence_policy_version_id is not null
    )
    or (
      decision_status <> 'routed'
      and asset_type_id is null
      and asset_id is null
      and asset_version_id is null
      and asset_match_distance_meters is null
      and asset_ownership_version_id is null
      and target_authority_id is null
      and department_id is null
      and authority_department_id is null
      and officer_role_id is null
      and officer_assignment_id is null
      and route_rule_id is null
      and route_rule_version_id is null
    )
  ),
  constraint routing_decisions_ambiguity_count_check check (
    ambiguity_count between 0 and 32767
  ),
  constraint routing_decisions_valid_location_check check (
    not extensions.st_isempty(input_location)
    and extensions.st_x(input_location) between -180 and 180
    and extensions.st_y(input_location) between -90 and 90
  ),
  constraint routing_decisions_actor_request_unique unique (actor_user_id, request_id)
);

alter table routing.asset_versions
  add constraint asset_versions_no_effective_overlap
  exclude using gist (
    asset_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.asset_ownership_versions
  add constraint asset_ownership_versions_no_effective_overlap
  exclude using gist (
    ownership_key with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.confidence_policy_versions
  add constraint confidence_policy_versions_no_effective_overlap
  exclude using gist (
    confidence_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.duplicate_detection_policy_versions
  add constraint duplicate_detection_policy_versions_no_effective_overlap
  exclude using gist (
    duplicate_detection_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.route_rule_versions
  add constraint route_rule_versions_no_effective_overlap
  exclude using gist (
    route_rule_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index assets_external_identifier_unique_idx
  on routing.assets (asset_type_id, external_identifier)
  where external_identifier is not null;
create index asset_versions_geometry_gix
  on routing.asset_versions using gist (location);
create index asset_versions_geography_gix
  on routing.asset_versions using gist ((location::extensions.geography));
create index asset_versions_scope_effective_idx
  on routing.asset_versions (local_body_id, ward_id, status, effective_from, effective_to);
create unique index asset_versions_one_current_idx
  on routing.asset_versions (asset_id)
  where effective_to is null and status = 'active';
create index asset_ownership_versions_asset_effective_idx
  on routing.asset_ownership_versions (asset_id, status, effective_from, effective_to);
create unique index asset_ownership_versions_one_current_idx
  on routing.asset_ownership_versions (ownership_key)
  where effective_to is null and status = 'active';
create unique index confidence_policy_versions_one_current_idx
  on routing.confidence_policy_versions (confidence_policy_id)
  where effective_to is null and status = 'active';
create unique index duplicate_detection_policy_versions_one_current_idx
  on routing.duplicate_detection_policy_versions (duplicate_detection_policy_id)
  where effective_to is null and status = 'active';
create index route_rule_versions_lookup_idx
  on routing.route_rule_versions (
    route_rule_id,
    status,
    priority,
    fallback_depth,
    effective_from,
    effective_to
  );
create unique index route_rule_versions_one_current_idx
  on routing.route_rule_versions (route_rule_id)
  where effective_to is null and status = 'active';
create index routing_decisions_request_idx on routing.routing_decisions (request_id, created_at desc);
create index routing_decisions_category_time_idx
  on routing.routing_decisions (category_id, created_at desc);
create index routing_decisions_location_gix
  on routing.routing_decisions using gist (input_location);

create function routing.validate_category_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_domain_id uuid;
  parent_level text;
begin
  if new.parent_category_id is not null then
    select category.domain_id, category.classification_level
    into parent_domain_id, parent_level
    from routing.issue_categories as category
    where category.id = new.parent_category_id;

    if not found then
      raise exception using errcode = '23503', message = 'ROUTING_CATEGORY_PARENT_NOT_FOUND';
    end if;
    if parent_domain_id <> new.domain_id then
      raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_DOMAIN_MISMATCH';
    end if;
    if new.classification_level = 'subcategory' and parent_level <> 'category' then
      raise exception using errcode = '23514', message = 'ROUTING_SUBCATEGORY_PARENT_INVALID';
    end if;
    if new.classification_level = 'issue' and parent_level not in ('category', 'subcategory') then
      raise exception using errcode = '23514', message = 'ROUTING_ISSUE_PARENT_INVALID';
    end if;
    if exists (
      with recursive ancestors as (
        select category.id, category.parent_category_id
        from routing.issue_categories as category
        where category.id = new.parent_category_id
        union all
        select parent.id, parent.parent_category_id
        from routing.issue_categories as parent
        inner join ancestors on ancestors.parent_category_id = parent.id
      )
      select 1 from ancestors where id = new.id
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_CYCLE';
    end if;
  end if;

  if new.is_routing_eligible and (
    not exists (
      select 1
      from routing.issue_domains as domain
      where domain.id = new.domain_id
        and domain.status = 'active'
        and domain.verification_status = 'verified'
        and not domain.is_placeholder
        and domain.is_routing_eligible
    )
    or exists (
      with recursive ancestors as (
        select category.*
        from routing.issue_categories as category
        where category.id = new.parent_category_id
        union all
        select parent.*
        from routing.issue_categories as parent
        inner join ancestors on ancestors.parent_category_id = parent.id
      )
      select 1
      from ancestors
      where domain_id <> new.domain_id
        or status <> 'active'
        or verification_status <> 'verified'
        or is_placeholder
        or not is_routing_eligible
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_ANCESTOR_NOT_ELIGIBLE';
  end if;

  if tg_op = 'UPDATE' and exists (
    with recursive descendants as (
      select child.id, child.is_routing_eligible
      from routing.issue_categories as child
      where child.parent_category_id = new.id
      union all
      select child.id, child.is_routing_eligible
      from routing.issue_categories as child
      inner join descendants on child.parent_category_id = descendants.id
    )
    select 1 from descendants where is_routing_eligible
  ) and (
    new.status <> 'active'
    or new.verification_status <> 'verified'
    or new.is_placeholder
    or not new.is_routing_eligible
    or new.domain_id is distinct from old.domain_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_ACTIVE_CHILD_INVALIDATED';
  end if;
  if tg_op = 'UPDATE'
    and (
      new.domain_id is distinct from old.domain_id
      or new.classification_level is distinct from old.classification_level
    )
    and exists (
      select 1 from routing.issue_categories as child
      where child.parent_category_id = new.id
    ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_PARENT_SHAPE_IMMUTABLE';
  end if;

  return new;
end;
$$;

create function routing.validate_asset_version_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.local_body_districts as local_body_district
    where local_body_district.local_body_id = new.local_body_id
      and local_body_district.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_DISTRICT_SCOPE_INVALID';
  end if;
  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.ward_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_WARD_SCOPE_INVALID';
  end if;

  return new;
end;
$$;

create function routing.guard_durable_identity_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  immutable_column text;
begin
  foreach immutable_column in array tg_argv
  loop
    if to_jsonb(new) -> immutable_column is distinct from to_jsonb(old) -> immutable_column then
      raise exception using
        errcode = '55000',
        message = format(
          '%I.%I durable identity column %I is immutable.',
          tg_table_schema,
          tg_table_name,
          immutable_column
        );
    end if;
  end loop;

  return new;
end;
$$;

create function routing.validate_asset_ownership_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.authority_department_id is not null and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.owner_authority_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_OWNER_DEPARTMENT_INVALID';
  end if;
  if new.office_id is not null and not exists (
    select 1
    from governance.offices as office
    where office.id = new.office_id and office.authority_id = new.owner_authority_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_OWNER_OFFICE_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_route_rule_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule_category_id uuid;
  scoped_authority_id uuid;
  category_requires_asset boolean;
  stable_rule_is_eligible boolean;
begin
  select
    rule.category_id,
    category.requires_asset,
    rule.status = 'active'
      and rule.verification_status = 'verified'
      and not rule.is_placeholder
      and rule.is_routing_eligible
  into rule_category_id, category_requires_asset, stable_rule_is_eligible
  from routing.route_rules as rule
  inner join routing.issue_categories as category on category.id = rule.category_id
  where rule.id = new.route_rule_id;

  if not found then
    raise exception using errcode = '23503', message = 'ROUTING_RULE_NOT_FOUND';
  end if;
  if new.is_routing_eligible and not stable_rule_is_eligible then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_IDENTITY_NOT_ELIGIBLE';
  end if;
  if new.scope_ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.scope_ward_id
      and (new.scope_local_body_id is null or ward.local_body_id = new.scope_local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_WARD_SCOPE_INVALID';
  end if;
  if new.scope_local_body_id is not null then
    select local_body.authority_id into scoped_authority_id
    from governance.local_bodies as local_body
    where local_body.id = new.scope_local_body_id;
    if new.scope_authority_id is not null and scoped_authority_id <> new.scope_authority_id then
      raise exception using errcode = '23514', message = 'ROUTING_RULE_AUTHORITY_SCOPE_INVALID';
    end if;
  end if;
  if new.asset_id is not null and not exists (
    select 1
    from routing.assets as asset
    where asset.id = new.asset_id
      and (new.asset_type_id is null or asset.asset_type_id = new.asset_type_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_TYPE_INVALID';
  end if;
  if new.route_rule_id = any(new.fallback_path) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_SELF_REFERENCE';
  end if;
  if (
    select count(*) from unnest(new.fallback_path) as fallback_rule_id
  ) <> (
    select count(distinct fallback_rule_id)
    from unnest(new.fallback_path) as fallback_rule_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_DUPLICATE';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) as fallback_rule_id
    where not exists (
      select 1 from routing.route_rules as fallback_rule
      where fallback_rule.id = fallback_rule_id
    )
  ) then
    raise exception using errcode = '23503', message = 'ROUTING_RULE_FALLBACK_NOT_FOUND';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) as fallback_rule_id
    inner join routing.route_rules as fallback_rule on fallback_rule.id = fallback_rule_id
    where fallback_rule.category_id <> rule_category_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CATEGORY_MISMATCH';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) with ordinality as fallback_rule(fallback_rule_id, path_position)
    where not exists (
      select 1
      from routing.route_rule_versions as fallback_version
      where fallback_version.route_rule_id = fallback_rule.fallback_rule_id
        and fallback_version.status in ('draft', 'active')
        and fallback_version.effective_from <= new.effective_from
        and (
          fallback_version.effective_to is null
          or fallback_version.effective_to > new.effective_from
        )
        and fallback_version.fallback_depth = fallback_rule.path_position - 1
        and fallback_version.fallback_path = case
          when fallback_rule.path_position = 1 then '{}'::uuid[]
          else new.fallback_path[1:(fallback_rule.path_position - 1)::integer]
        end
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CHAIN_INVALID';
  end if;
  if exists (
    with recursive fallback_graph(rule_id) as (
      select fallback_rule_id
      from unnest(new.fallback_path) as fallback_rule_id
      union
      select nested_rule_id
      from fallback_graph
      inner join routing.route_rule_versions as fallback_version
        on fallback_version.route_rule_id = fallback_graph.rule_id
        and fallback_version.status in ('draft', 'active')
        and fallback_version.effective_to is null
      cross join lateral unnest(fallback_version.fallback_path) as nested_rule_id
    )
    select 1 from fallback_graph where rule_id = new.route_rule_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CYCLE';
  end if;
  if (
    select count(*) from unnest(new.confidence_factor_codes) as factor_code
  ) <> (
    select count(distinct factor_code)
    from unnest(new.confidence_factor_codes) as factor_code
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_FACTOR_DUPLICATE';
  end if;
  if new.target_office_id is not null
    and new.target_authority_id is not null
    and not exists (
      select 1 from governance.offices as office
      where office.id = new.target_office_id
        and office.authority_id = new.target_authority_id
    ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_TARGET_OFFICE_INVALID';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from routing.issue_categories as category
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    where category.id = rule_category_id
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CATEGORY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and category_requires_asset and new.asset_requirement <> 'required' then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_REQUIRED_ASSET_MISSING';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from governance.departments as department
    where department.id = new.target_department_id
      and department.status = 'active'
      and department.verification_status = 'verified'
      and not department.is_placeholder
      and department.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_DEPARTMENT_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from governance.officer_roles as officer_role
    where officer_role.id = new.target_officer_role_id
      and officer_role.status = 'active'
      and officer_role.verification_status = 'verified'
      and not officer_role.is_placeholder
      and officer_role.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_OFFICER_ROLE_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from routing.confidence_policy_versions as policy_version
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where policy_version.id = new.confidence_policy_version_id
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and policy_version.effective_from <= new.effective_from
      and (
        policy_version.effective_to is null
        or policy_version.effective_to > new.effective_from
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_POLICY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and exists (
    select 1
    from unnest(new.confidence_factor_codes) as factor_code
    where not exists (
      select 1
      from routing.confidence_policy_versions as policy_version
      cross join lateral jsonb_array_elements(policy_version.factors) as factor
      where policy_version.id = new.confidence_policy_version_id
        and factor ->> 'code' = factor_code
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_FACTOR_UNKNOWN';
  end if;
  if new.is_routing_eligible and new.target_authority_id is not null
    and not private.is_verified_governance_authority(new.target_authority_id) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_TARGET_AUTHORITY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and new.asset_type_id is not null and not exists (
    select 1 from routing.asset_types as asset_type
    where asset_type.id = new.asset_type_id
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_TYPE_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and new.asset_id is not null and not exists (
    select 1 from routing.assets as asset
    where asset.id = new.asset_id
      and asset.status = 'active'
      and asset.verification_status = 'verified'
      and not asset.is_placeholder
      and asset.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_NOT_ELIGIBLE';
  end if;

  return new;
end;
$$;

create function routing.validate_confidence_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_routing_eligible then
    return new;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.factors) as factor
    where jsonb_typeof(factor) <> 'object'
      or coalesce(factor ->> 'code', '') !~ '^[a-z][a-z0-9_]{1,79}$'
      or jsonb_typeof(factor -> 'weight') <> 'number'
      or jsonb_typeof(factor -> 'required') <> 'boolean'
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTORS_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.factors) as factor
    where (factor ->> 'weight')::numeric < 0
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_WEIGHT_INVALID';
  end if;
  if (
    select count(*) from jsonb_array_elements(new.factors) as factor
  ) <> (
    select count(distinct factor ->> 'code')
    from jsonb_array_elements(new.factors) as factor
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_DUPLICATE';
  end if;
  if coalesce((
    select sum((factor ->> 'weight')::numeric)
    from jsonb_array_elements(new.factors) as factor
  ), 0) <= 0 then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_WEIGHT_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_duplicate_detection_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  weight_key text;
  total_weight numeric := 0;
begin
  if not new.is_routing_eligible then
    return new;
  end if;

  if not (new.weights ?& array['category', 'location', 'time', 'description', 'media', 'asset'])
    or new.weights - array['category', 'location', 'time', 'description', 'media', 'asset']
      <> '{}'::jsonb then
    raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHTS_KEYS_INVALID';
  end if;
  foreach weight_key in array array['category', 'location', 'time', 'description', 'media', 'asset']
  loop
    if jsonb_typeof(new.weights -> weight_key) <> 'number' then
      raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_INVALID';
    end if;
    if (new.weights ->> weight_key)::numeric < 0 then
      raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_INVALID';
    end if;
    total_weight := total_weight + (new.weights ->> weight_key)::numeric;
  end loop;
  if total_weight <= 0 then
    raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_TOTAL_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_routing_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  route_context record;
  ownership_context record;
  asset_context record;
  expected_target_authority_id uuid;
  expected_department_id uuid;
  expected_officer_role_id uuid;
  expected_office_id uuid;
begin
  select
    null::uuid as owner_authority_id,
    null::uuid as authority_department_id,
    null::uuid as department_id,
    null::uuid as office_id,
    null::uuid as officer_role_id
  into ownership_context;

  if new.state_id is not null and not exists (
    select 1
    from governance.states as state
    where state.id = new.state_id
      and state.status = 'active'
      and state.verification_status = 'verified'
      and not state.is_placeholder
      and state.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_STATE_INVALID';
  end if;
  if new.local_body_id is not null and not exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = new.local_body_id
      and local_body.state_id = new.state_id
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_LOCAL_BODY_INVALID';
  end if;
  if new.district_id is not null and not exists (
    select 1
    from governance.districts as district
    inner join governance.local_body_districts as local_body_district
      on local_body_district.district_id = district.id
      and local_body_district.local_body_id = new.local_body_id
    where district.id = new.district_id
      and district.state_id = new.state_id
      and district.status = 'active'
      and district.verification_status = 'verified'
      and not district.is_placeholder
      and district.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_DISTRICT_INVALID';
  end if;
  if new.taluka_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    where taluka.id = new.taluka_id
      and taluka.district_id = new.district_id
      and taluka.status = 'active'
      and taluka.verification_status = 'verified'
      and not taluka.is_placeholder
      and taluka.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TALUKA_INVALID';
  end if;
  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.ward_id
      and ward.local_body_id = new.local_body_id
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_WARD_INVALID';
  end if;

  if new.state_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.state_boundary_version_id
      and boundary.state_id = new.state_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_STATE_BOUNDARY_INVALID';
  end if;
  if new.district_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.district_boundary_version_id
      and boundary.district_id = new.district_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_DISTRICT_BOUNDARY_INVALID';
  end if;
  if new.taluka_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.taluka_boundary_version_id
      and boundary.taluka_id = new.taluka_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TALUKA_BOUNDARY_INVALID';
  end if;
  if new.local_body_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.local_body_boundary_version_id
      and boundary.local_body_id = new.local_body_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_LOCAL_BODY_BOUNDARY_INVALID';
  end if;
  if new.ward_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.ward_boundary_version_id
      and boundary.ward_id = new.ward_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_WARD_BOUNDARY_INVALID';
  end if;

  if new.confidence_policy_version_id is not null and not exists (
    select 1
    from routing.confidence_policy_versions as policy_version
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where policy_version.id = new.confidence_policy_version_id
      and (policy_version.category_id is null or policy_version.category_id = new.category_id)
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and policy_version.effective_from <= new.resolved_at
      and (policy_version.effective_to is null or policy_version.effective_to > new.resolved_at)
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_CONFIDENCE_POLICY_INVALID';
  end if;

  if not (
    new.explanation_metadata
      ?& array[
        'policyVersionId',
        'selectedRoutingRuleId',
        'selectedRoutingRuleVersionId',
        'fallbackUsed',
        'fallbackPath',
        'jurisdiction'
      ]
  )
    or new.explanation_metadata -> 'fallbackUsed'
      is distinct from to_jsonb(new.fallback_depth > 0)
    or (
      case
      when jsonb_typeof(new.explanation_metadata -> 'fallbackPath') = 'array'
        then jsonb_array_length(new.explanation_metadata -> 'fallbackPath') <> new.fallback_depth
      else true
      end
    )
    or jsonb_typeof(new.explanation_metadata -> 'jurisdiction') is distinct from 'object'
    or new.explanation_metadata ->> 'policyVersionId'
      is distinct from new.confidence_policy_version_id::text then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_EXPLANATION_METADATA_INVALID';
  end if;

  if new.decision_status = 'routed' and (
    new.explanation_metadata ->> 'selectedRoutingRuleId'
      is distinct from new.route_rule_id::text
    or new.explanation_metadata ->> 'selectedRoutingRuleVersionId'
      is distinct from new.route_rule_version_id::text
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_EXPLANATION_RULE_MISMATCH';
  end if;

  if new.decision_status <> 'routed' then
    if new.decision_status = 'unsupported_area' and (
      new.state_id is not null
      or new.local_body_id is not null
      or new.confidence_policy_version_id is not null
      or new.fallback_depth <> 0
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_UNSUPPORTED_AREA_SHAPE_INVALID';
    end if;
    if new.fallback_depth > 0 and new.confidence_policy_version_id is null then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_FALLBACK_POLICY_MISSING';
    end if;
    return new;
  end if;

  select
    category.requires_asset as category_requires_asset,
    local_body.authority_id as local_body_authority_id,
    rule_version.asset_requirement,
    rule_version.asset_type_id as rule_asset_type_id,
    rule_version.asset_id as rule_asset_id,
    rule_version.target_authority_id as rule_target_authority_id,
    rule_version.target_department_id as rule_target_department_id,
    rule_version.target_officer_role_id as rule_target_officer_role_id,
    rule_version.target_office_id as rule_target_office_id,
    rule_version.confidence_policy_version_id,
    rule_version.fallback_depth,
    policy_version.automatic_threshold
  into route_context
  from routing.route_rules as route_rule
  inner join routing.route_rule_versions as rule_version
    on rule_version.id = new.route_rule_version_id
    and rule_version.route_rule_id = route_rule.id
  inner join routing.issue_categories as category
    on category.id = route_rule.category_id
  inner join governance.local_bodies as local_body
    on local_body.id = new.local_body_id
  inner join routing.confidence_policy_versions as policy_version
    on policy_version.id = rule_version.confidence_policy_version_id
  where route_rule.id = new.route_rule_id
    and route_rule.category_id = new.category_id
    and route_rule.status = 'active'
    and route_rule.verification_status = 'verified'
    and not route_rule.is_placeholder
    and route_rule.is_routing_eligible
    and rule_version.status = 'active'
    and rule_version.verification_status = 'verified'
    and not rule_version.is_placeholder
    and rule_version.is_routing_eligible
    and rule_version.effective_from <= new.resolved_at
    and (rule_version.effective_to is null or rule_version.effective_to > new.resolved_at)
    and (rule_version.scope_authority_id is null
      or rule_version.scope_authority_id = local_body.authority_id)
    and (rule_version.scope_local_body_id is null
      or rule_version.scope_local_body_id = new.local_body_id)
    and (rule_version.scope_ward_id is null or rule_version.scope_ward_id = new.ward_id);

  if not found then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_CONTEXT_INVALID';
  end if;
  if route_context.confidence_policy_version_id <> new.confidence_policy_version_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_POLICY_MISMATCH';
  end if;
  if route_context.fallback_depth <> new.fallback_depth then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_FALLBACK_DEPTH_MISMATCH';
  end if;
  if new.confidence_score < route_context.automatic_threshold then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_CONFIDENCE_BELOW_AUTOMATIC_THRESHOLD';
  end if;

  if new.asset_id is not null then
    select
      asset.asset_type_id,
      asset_version.asset_id as version_asset_id,
      asset_version.district_id,
      asset_version.local_body_id,
      asset_version.ward_id,
      asset_version.location,
      asset_type.matching_distance_meters
    into asset_context
    from routing.assets as asset
    inner join routing.asset_types as asset_type on asset_type.id = asset.asset_type_id
    inner join routing.asset_versions as asset_version on asset_version.id = new.asset_version_id
    where asset.id = new.asset_id
      and asset.asset_type_id = new.asset_type_id
      and asset.status = 'active'
      and asset.verification_status = 'verified'
      and not asset.is_placeholder
      and asset.is_routing_eligible
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
      and asset_version.asset_id = asset.id
      and asset_version.status = 'active'
      and asset_version.verification_status = 'verified'
      and not asset_version.is_placeholder
      and asset_version.is_routing_eligible
      and asset_version.effective_from <= new.resolved_at
      and (asset_version.effective_to is null or asset_version.effective_to > new.resolved_at)
      and (asset_version.district_id is null or asset_version.district_id = new.district_id)
      and (asset_version.local_body_id is null or asset_version.local_body_id = new.local_body_id)
      and (asset_version.ward_id is null or asset_version.ward_id = new.ward_id);
    if not found then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_VERSION_INVALID';
    end if;
    if route_context.rule_asset_type_id is not null
      and route_context.rule_asset_type_id <> new.asset_type_id then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_ASSET_TYPE_MISMATCH';
    end if;
    if route_context.rule_asset_id is not null and route_context.rule_asset_id <> new.asset_id then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_ASSET_MISMATCH';
    end if;
    if abs(
      extensions.st_distance(
        asset_context.location::extensions.geography,
        new.input_location::extensions.geography
      ) - new.asset_match_distance_meters
    ) > 0.1 then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_DISTANCE_MISMATCH';
    end if;
    if new.asset_match_distance_meters > greatest(
      asset_context.matching_distance_meters,
      new.accuracy_meters
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_OUTSIDE_TOLERANCE';
    end if;
  elsif route_context.category_requires_asset or route_context.asset_requirement = 'required' then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_REQUIRED_ASSET_MISSING';
  end if;

  if new.asset_ownership_version_id is not null then
    select
      ownership.owner_authority_id,
      ownership.authority_department_id,
      owner_department.department_id,
      ownership.office_id,
      ownership.officer_role_id
    into ownership_context
    from routing.asset_ownership_versions as ownership
    left join governance.authority_departments as owner_department
      on owner_department.id = ownership.authority_department_id
    where ownership.id = new.asset_ownership_version_id
      and ownership.asset_id = new.asset_id
      and ownership.status = 'active'
      and ownership.verification_status = 'verified'
      and not ownership.is_placeholder
      and ownership.is_routing_eligible
      and ownership.effective_from <= new.resolved_at
      and (ownership.effective_to is null or ownership.effective_to > new.resolved_at);
    if not found then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_OWNERSHIP_INVALID';
    end if;
  end if;

  expected_target_authority_id := coalesce(
    ownership_context.owner_authority_id,
    route_context.rule_target_authority_id,
    route_context.local_body_authority_id
  );
  expected_department_id := coalesce(
    ownership_context.department_id,
    route_context.rule_target_department_id
  );
  expected_officer_role_id := coalesce(
    ownership_context.officer_role_id,
    route_context.rule_target_officer_role_id
  );
  expected_office_id := coalesce(
    ownership_context.office_id,
    route_context.rule_target_office_id
  );

  if new.target_authority_id <> expected_target_authority_id
    or new.department_id <> expected_department_id
    or new.officer_role_id <> expected_officer_role_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_MISMATCH';
  end if;
  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.target_authority_id
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and private.is_verified_governance_authority(authority.id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_AUTHORITY_INVALID';
  end if;
  if not exists (
    select 1
    from governance.authority_departments as authority_department
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.target_authority_id
      and authority_department.department_id = new.department_id
      and authority_department.status = 'active'
      and authority_department.verification_status = 'verified'
      and not authority_department.is_placeholder
      and authority_department.is_routing_eligible
      and department.status = 'active'
      and department.verification_status = 'verified'
      and not department.is_placeholder
      and department.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_AUTHORITY_DEPARTMENT_INVALID';
  end if;
  if ownership_context.authority_department_id is not null
    and ownership_context.authority_department_id <> new.authority_department_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OWNER_DEPARTMENT_MISMATCH';
  end if;
  if not exists (
    select 1
    from governance.officer_roles as officer_role
    where officer_role.id = new.officer_role_id
      and officer_role.status = 'active'
      and officer_role.verification_status = 'verified'
      and not officer_role.is_placeholder
      and officer_role.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OFFICER_ROLE_INVALID';
  end if;

  if expected_office_id is not null and not exists (
    select 1
    from governance.offices as office
    where office.id = expected_office_id
      and office.authority_id = new.target_authority_id
      and (office.authority_department_id is null
        or office.authority_department_id = new.authority_department_id)
      and (office.district_id is null or office.district_id = new.district_id)
      and (office.taluka_id is null or office.taluka_id = new.taluka_id)
      and (office.local_body_id is null or office.local_body_id = new.local_body_id)
      and (office.ward_id is null or office.ward_id = new.ward_id)
      and office.status = 'active'
      and office.verification_status = 'verified'
      and not office.is_placeholder
      and office.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_OFFICE_SCOPE_INVALID';
  end if;

  if new.officer_assignment_id is not null and not exists (
    select 1
    from governance.officer_assignments as assignment
    inner join governance.officers as officer on officer.id = assignment.officer_id
    where assignment.id = new.officer_assignment_id
      and assignment.authority_id = new.target_authority_id
      and assignment.officer_role_id = new.officer_role_id
      and (assignment.authority_department_id is null
        or assignment.authority_department_id = new.authority_department_id)
      and (expected_office_id is null or assignment.office_id = expected_office_id)
      and (assignment.district_id is null or assignment.district_id = new.district_id)
      and (assignment.taluka_id is null or assignment.taluka_id = new.taluka_id)
      and (assignment.local_body_id is null or assignment.local_body_id = new.local_body_id)
      and (assignment.ward_id is null or assignment.ward_id = new.ward_id)
      and assignment.status = 'active'
      and assignment.verification_status = 'verified'
      and not assignment.is_placeholder
      and assignment.effective_from <= new.resolved_at
      and (assignment.effective_to is null or assignment.effective_to > new.resolved_at)
      and officer.status = 'active'
      and officer.verification_status = 'verified'
      and not officer.is_placeholder
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OFFICER_ASSIGNMENT_INVALID';
  end if;

  return new;
end;
$$;

create trigger issue_categories_validate_hierarchy
before insert or update of
  domain_id,
  parent_category_id,
  classification_level,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible
on routing.issue_categories
for each row execute function routing.validate_category_hierarchy();

create trigger asset_versions_validate_scope
before insert or update of district_id, local_body_id, ward_id
on routing.asset_versions
for each row execute function routing.validate_asset_version_scope();

create trigger asset_ownership_versions_validate_scope
before insert or update of owner_authority_id, authority_department_id, office_id
on routing.asset_ownership_versions
for each row execute function routing.validate_asset_ownership_scope();

create trigger route_rule_versions_validate
before insert or update
on routing.route_rule_versions
for each row execute function routing.validate_route_rule_version();

create trigger confidence_policy_versions_validate
before insert or update on routing.confidence_policy_versions
for each row execute function routing.validate_confidence_policy_version();

create trigger duplicate_detection_policy_versions_validate
before insert or update on routing.duplicate_detection_policy_versions
for each row execute function routing.validate_duplicate_detection_policy_version();

create trigger routing_decisions_validate
before insert on routing.routing_decisions
for each row execute function routing.validate_routing_decision();

create trigger assets_guard_durable_identity
before update on routing.assets
for each row execute function routing.guard_durable_identity_update('id', 'asset_type_id', 'asset_key');
create trigger confidence_policies_guard_durable_identity
before update on routing.confidence_policies
for each row execute function routing.guard_durable_identity_update('id', 'code');
create trigger duplicate_detection_policies_guard_durable_identity
before update on routing.duplicate_detection_policies
for each row execute function routing.guard_durable_identity_update('id', 'code');
create trigger route_rules_guard_durable_identity
before update on routing.route_rules
for each row execute function routing.guard_durable_identity_update(
  'id',
  'category_id',
  'rule_code'
);

create trigger issue_domains_set_updated_at
before update on routing.issue_domains
for each row execute function private.set_updated_at();
create trigger issue_categories_set_updated_at
before update on routing.issue_categories
for each row execute function private.set_updated_at();
create trigger category_aliases_set_updated_at
before update on routing.category_aliases
for each row execute function private.set_updated_at();
create trigger asset_types_set_updated_at
before update on routing.asset_types
for each row execute function private.set_updated_at();
create trigger category_asset_types_set_updated_at
before update on routing.category_asset_types
for each row execute function private.set_updated_at();
create trigger assets_set_updated_at
before update on routing.assets
for each row execute function private.set_updated_at();
create trigger asset_versions_set_updated_at
before update on routing.asset_versions
for each row execute function private.set_updated_at();
create trigger asset_ownership_versions_set_updated_at
before update on routing.asset_ownership_versions
for each row execute function private.set_updated_at();
create trigger confidence_policies_set_updated_at
before update on routing.confidence_policies
for each row execute function private.set_updated_at();
create trigger confidence_policy_versions_set_updated_at
before update on routing.confidence_policy_versions
for each row execute function private.set_updated_at();
create trigger duplicate_detection_policies_set_updated_at
before update on routing.duplicate_detection_policies
for each row execute function private.set_updated_at();
create trigger duplicate_detection_policy_versions_set_updated_at
before update on routing.duplicate_detection_policy_versions
for each row execute function private.set_updated_at();
create trigger route_rules_set_updated_at
before update on routing.route_rules
for each row execute function private.set_updated_at();
create trigger route_rule_versions_set_updated_at
before update on routing.route_rule_versions
for each row execute function private.set_updated_at();

create trigger asset_versions_guard_update
before update on routing.asset_versions
for each row execute function governance.guard_version_update();
create trigger asset_versions_reject_delete
before delete on routing.asset_versions
for each row execute function governance.reject_historical_delete();
create trigger asset_ownership_versions_guard_update
before update on routing.asset_ownership_versions
for each row execute function governance.guard_version_update();
create trigger asset_ownership_versions_reject_delete
before delete on routing.asset_ownership_versions
for each row execute function governance.reject_historical_delete();
create trigger confidence_policy_versions_guard_update
before update on routing.confidence_policy_versions
for each row execute function governance.guard_version_update();
create trigger confidence_policy_versions_reject_delete
before delete on routing.confidence_policy_versions
for each row execute function governance.reject_historical_delete();
create trigger duplicate_detection_policy_versions_guard_update
before update on routing.duplicate_detection_policy_versions
for each row execute function governance.guard_version_update();
create trigger duplicate_detection_policy_versions_reject_delete
before delete on routing.duplicate_detection_policy_versions
for each row execute function governance.reject_historical_delete();
create trigger route_rule_versions_guard_update
before update on routing.route_rule_versions
for each row execute function governance.guard_version_update();
create trigger route_rule_versions_reject_delete
before delete on routing.route_rule_versions
for each row execute function governance.reject_historical_delete();
create trigger routing_decisions_reject_update
before update on routing.routing_decisions
for each row execute function governance.reject_import_ledger_update();
create trigger routing_decisions_reject_delete
before delete on routing.routing_decisions
for each row execute function governance.reject_historical_delete();

comment on schema routing is
  'Private, data-driven routing configuration, versioned asset ownership, policies, and decisions.';
comment on table routing.issue_categories is
  'Domain-scoped category hierarchy with explicit severity, media, location, verification, and routing requirements.';
comment on table routing.route_rule_versions is
  'Immutable operational route-rule versions; source routing references remain separate in governance.';
comment on table routing.routing_decisions is
  'Append-only, service-only routing audit. It stores exact coordinates and entity identifiers, never officer contacts or complaint text.';
$migration_20260713200000_phase_3_routing_schema$;

  if not (pg_temp.local_wellness_relation_exists('routing.issue_domains')
      and pg_temp.local_wellness_relation_exists('routing.route_rule_versions')
      and pg_temp.local_wellness_relation_exists('routing.routing_decisions')
      and pg_temp.local_wellness_trigger_exists('routing', 'routing_decisions', 'routing_decisions_reject_delete')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713200000_phase_3_routing_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 11,
    cutoff_name = '20260713200000_phase_3_routing_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260713200000_phase_3_routing_schema.sql';
end;
$guard_11$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713200000_phase_3_routing_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713201000_governance_synchronization_foundation.sql
-- ============================================================================
do $guard_12$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 12 then
    raise notice 'Skipping already-complete migration 20260713201000_governance_synchronization_foundation.sql';
    return;
  end if;

  if current_cutoff <> 11 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713201000_governance_synchronization_foundation.sql';
  end if;

  execute $migration_20260713201000_governance_synchronization_foundation$
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
$migration_20260713201000_governance_synchronization_foundation$;

  if not (pg_temp.local_wellness_relation_exists('governance.source_endpoints')
      and pg_temp.local_wellness_relation_exists('governance.raw_snapshots')
      and pg_temp.local_wellness_relation_exists('governance.sync_review_events')
      and pg_temp.local_wellness_trigger_exists('governance', 'sync_review_events', 'sync_review_events_reject_delete')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713201000_governance_synchronization_foundation.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 12,
    cutoff_name = '20260713201000_governance_synchronization_foundation.sql'
  where singleton;

  raise notice 'Applied migration 20260713201000_governance_synchronization_foundation.sql';
end;
$guard_12$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713201000_governance_synchronization_foundation.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260713202000_phase_3_routing_security_and_rpc.sql
-- ============================================================================
do $guard_13$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 13 then
    raise notice 'Skipping already-complete migration 20260713202000_phase_3_routing_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 12 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260713202000_phase_3_routing_security_and_rpc.sql';
  end if;

  execute $migration_20260713202000_phase_3_routing_security_and_rpc$
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
$migration_20260713202000_phase_3_routing_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'list_routing_categories')
      and pg_temp.local_wellness_function_exists('public', 'resolve_routing_candidates')
      and pg_temp.local_wellness_function_exists('public', 'record_routing_decision')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260713202000_phase_3_routing_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 13,
    cutoff_name = '20260713202000_phase_3_routing_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260713202000_phase_3_routing_security_and_rpc.sql';
end;
$guard_13$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260713202000_phase_3_routing_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714100000_phase_4_complaint_capture.sql
-- ============================================================================
do $guard_14$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 14 then
    raise notice 'Skipping already-complete migration 20260714100000_phase_4_complaint_capture.sql';
    return;
  end if;

  if current_cutoff <> 13 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714100000_phase_4_complaint_capture.sql';
  end if;

  execute $migration_20260714100000_phase_4_complaint_capture$
create extension if not exists pg_trgm with schema extensions;

create schema if not exists complaints;
revoke all on schema complaints from public;

alter table routing.issue_categories
  add column location_verification_requirements jsonb not null default jsonb_build_object(
    'maximumAccuracyMeters', 100,
    'maximumAgeSeconds', 300
  ),
  add constraint issue_categories_location_verification_requirements_check check (
    jsonb_typeof(location_verification_requirements) = 'object'
    and location_verification_requirements
      ?& array['maximumAccuracyMeters', 'maximumAgeSeconds']
    and location_verification_requirements
      - array['maximumAccuracyMeters', 'maximumAgeSeconds'] = '{}'::jsonb
    and jsonb_typeof(location_verification_requirements -> 'maximumAccuracyMeters') = 'number'
    and jsonb_typeof(location_verification_requirements -> 'maximumAgeSeconds') = 'number'
    and (location_verification_requirements ->> 'maximumAccuracyMeters')::numeric
      between 1 and 5000
    and (location_verification_requirements ->> 'maximumAgeSeconds')::numeric
      between 1 and 86400
  );

create sequence complaints.complaint_number_sequence;

create table complaints.complaint_drafts (
  id uuid primary key default gen_random_uuid(),
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  creation_idempotency_key_hash text not null,
  creation_request_fingerprint text not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  description text,
  description_language text not null default 'en',
  custom_attributes jsonb not null default '{}'::jsonb,
  selected_location_evidence_id uuid,
  status text not null default 'active',
  revision bigint not null default 1,
  expires_at timestamptz not null default (now() + interval '30 days'),
  discarded_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_drafts_creation_key_unique unique (
    citizen_user_id,
    creation_idempotency_key_hash
  ),
  constraint complaint_drafts_creation_key_check check (
    creation_idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_drafts_creation_fingerprint_check check (
    creation_request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_drafts_description_check check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 5000
    )
  ),
  constraint complaint_drafts_language_check check (
    description_language in ('en', 'hi', 'mr')
  ),
  constraint complaint_drafts_attributes_check check (
    jsonb_typeof(custom_attributes) = 'object'
    and not (
      custom_attributes
        ?| array[
          'authorityId',
          'wardId',
          'departmentId',
          'authorityDepartmentId',
          'officerRoleId',
          'officerAssignmentId',
          'routingRuleId',
          'status'
        ]
    )
  ),
  constraint complaint_drafts_status_check check (
    status in ('active', 'discarded', 'submitted')
  ),
  constraint complaint_drafts_revision_check check (revision >= 1),
  constraint complaint_drafts_expiry_check check (expires_at > created_at),
  constraint complaint_drafts_lifecycle_check check (
    (status = 'active' and discarded_at is null and submitted_at is null)
    or (status = 'discarded' and discarded_at is not null and submitted_at is null)
    or (status = 'submitted' and discarded_at is null and submitted_at is not null)
  )
);

create table complaints.complaint_location_evidence (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  device_id uuid references public.devices (id) on delete restrict,
  evidence_type text not null default 'current_location',
  location extensions.geometry(Point, 4326) not null,
  accuracy_meters double precision not null,
  provider text not null,
  captured_at timestamptz not null,
  device_recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  mock_location_detected boolean,
  spoof_risk_status text not null default 'unknown',
  verification_status text not null default 'pending',
  verification_score numeric(7, 6),
  verification_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint complaint_location_evidence_type_check check (
    evidence_type in ('current_location', 'media_capture')
  ),
  constraint complaint_location_evidence_accuracy_check check (
    accuracy_meters >= 0 and accuracy_meters <= 5000
  ),
  constraint complaint_location_evidence_provider_check check (
    provider in ('gps', 'network', 'fused', 'unknown')
  ),
  constraint complaint_location_evidence_capture_time_check check (
    captured_at <= received_at + interval '2 minutes'
    and device_recorded_at <= received_at + interval '2 minutes'
    and abs(extract(epoch from (captured_at - device_recorded_at))) <= 300
  ),
  constraint complaint_location_evidence_spoof_risk_check check (
    spoof_risk_status in ('unknown', 'low', 'review', 'high', 'blocked')
  ),
  constraint complaint_location_evidence_verification_check check (
    verification_status in (
      'pending',
      'verified',
      'partially_verified',
      'low_accuracy',
      'location_mismatch',
      'suspected_spoofing',
      'unsupported_area',
      'manual_review'
    )
  ),
  constraint complaint_location_evidence_score_check check (
    verification_score is null or verification_score between 0 and 1
  ),
  constraint complaint_location_evidence_verification_shape_check check (
    (verification_status = 'pending' and verification_score is null)
    or (verification_status <> 'pending' and verification_score is not null)
  ),
  constraint complaint_location_evidence_metadata_check check (
    jsonb_typeof(verification_metadata) = 'object'
    and not (
      verification_metadata
        ?| array['description', 'complaintText', 'phone', 'email', 'signedUrl', 'token']
    )
  ),
  constraint complaint_location_evidence_location_check check (
    not extensions.st_isempty(location)
    and extensions.st_srid(location) = 4326
    and extensions.st_x(location) between -180 and 180
    and extensions.st_y(location) between -90 and 90
  )
);

alter table complaints.complaint_drafts
  add constraint complaint_drafts_selected_location_fkey
  foreign key (selected_location_evidence_id)
  references complaints.complaint_location_evidence (id)
  on delete restrict;

create table complaints.complaint_media (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  client_media_id uuid not null,
  media_kind text not null,
  capture_source text not null,
  bucket_id text not null,
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  capture_location_evidence_id uuid
    references complaints.complaint_location_evidence (id) on delete restrict,
  captured_at timestamptz,
  width_pixels integer,
  height_pixels integer,
  duration_seconds numeric(10, 3),
  distance_to_complaint_meters double precision,
  upload_status text not null default 'reserved',
  processing_status text not null default 'pending',
  moderation_status text not null default 'pending',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_media_client_unique unique (draft_id, client_media_id),
  constraint complaint_media_object_unique unique (bucket_id, object_path),
  constraint complaint_media_kind_check check (media_kind in ('photo', 'video', 'voice')),
  constraint complaint_media_capture_source_check check (
    capture_source in ('live_camera', 'live_video', 'live_microphone')
  ),
  constraint complaint_media_kind_source_check check (
    (media_kind = 'photo' and capture_source = 'live_camera')
    or (media_kind = 'video' and capture_source = 'live_video')
    or (media_kind = 'voice' and capture_source = 'live_microphone')
  ),
  constraint complaint_media_bucket_check check (
    (media_kind in ('photo', 'video') and bucket_id = 'complaint-originals-private')
    or (media_kind = 'voice' and bucket_id = 'voice-recordings-private')
  ),
  constraint complaint_media_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/original$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_media_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
  ),
  constraint complaint_media_observed_mime_check check (
    observed_mime_type is null
    or (
      observed_mime_type = lower(btrim(observed_mime_type))
      and observed_mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'
    )
  ),
  constraint complaint_media_declared_size_check check (
    declared_byte_size between 1 and 52428800
  ),
  constraint complaint_media_observed_size_check check (
    observed_byte_size is null or observed_byte_size between 1 and 52428800
  ),
  constraint complaint_media_client_sha_check check (client_sha256 ~ '^[0-9a-f]{64}$'),
  constraint complaint_media_verified_sha_check check (
    verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_media_distance_check check (
    distance_to_complaint_meters is null or distance_to_complaint_meters >= 0
  ),
  constraint complaint_media_dimensions_check check (
    (width_pixels is null and height_pixels is null)
    or (
      width_pixels between 1 and 32768
      and height_pixels between 1 and 32768
      and media_kind in ('photo', 'video')
    )
  ),
  constraint complaint_media_duration_check check (
    duration_seconds is null
    or (duration_seconds > 0 and duration_seconds <= 600 and media_kind in ('video', 'voice'))
  ),
  constraint complaint_media_upload_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_media_processing_status_check check (
    processing_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint complaint_media_moderation_status_check check (
    moderation_status in ('pending', 'review_required', 'approved', 'rejected')
  ),
  constraint complaint_media_expiry_check check (upload_expires_at > created_at),
  constraint complaint_media_finalize_shape_check check (
    (
      upload_status = 'finalized'
      and observed_mime_type is not null
      and observed_byte_size is not null
      and verified_sha256 is not null
      and finalized_at is not null
      and failure_code is null
    )
    or (
      upload_status <> 'finalized'
      and finalized_at is null
      and verified_sha256 is null
    )
  ),
  constraint complaint_media_failure_code_check check (
    failure_code is null
    or (
      failure_code = btrim(failure_code)
      and failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
    )
  )
);

create table complaints.complaints (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique
    references complaints.complaint_drafts (id) on delete restrict,
  complaint_number text not null unique,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  description text not null,
  description_language text not null,
  custom_attributes jsonb not null,
  location_evidence_id uuid not null unique
    references complaints.complaint_location_evidence (id) on delete restrict,
  routing_decision_id uuid not null unique
    references routing.routing_decisions (id) on delete restrict,
  current_status text not null default 'submitted',
  visibility text not null default 'private',
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaints_number_check check (
    complaint_number ~ '^LW-[0-9]{8}-[0-9]{8,}$'
  ),
  constraint complaints_description_check check (
    description = btrim(description) and char_length(description) between 1 and 5000
  ),
  constraint complaints_language_check check (description_language in ('en', 'hi', 'mr')),
  constraint complaints_attributes_check check (jsonb_typeof(custom_attributes) = 'object'),
  constraint complaints_status_check check (
    current_status in (
      'submitted',
      'validation_pending',
      'validated',
      'routing_pending',
      'assigned',
      'acknowledged',
      'inspection_scheduled',
      'inspection_completed',
      'work_order_created',
      'work_in_progress',
      'resolution_submitted',
      'citizen_verification_pending',
      'resolved',
      'closed',
      'transferred',
      'waiting_for_material',
      'waiting_for_external_agency',
      'reopened',
      'rejected',
      'cancelled',
      'escalated'
    )
  ),
  constraint complaints_phase4_visibility_check check (visibility = 'private'),
  constraint complaints_submission_time_check check (submitted_at >= created_at - interval '1 second')
);

create table complaints.complaint_assignments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique
    references complaints.complaints (id) on delete restrict,
  routing_decision_id uuid not null unique
    references routing.routing_decisions (id) on delete restrict,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  department_id uuid not null references governance.departments (id) on delete restrict,
  authority_department_id uuid not null
    references governance.authority_departments (id) on delete restrict,
  officer_role_id uuid not null references governance.officer_roles (id) on delete restrict,
  officer_assignment_id uuid references governance.officer_assignments (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  asset_version_id uuid references routing.asset_versions (id) on delete restrict,
  asset_ownership_version_id uuid
    references routing.asset_ownership_versions (id) on delete restrict,
  assignment_source text not null default 'routing_decision',
  status text not null default 'active',
  assigned_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint complaint_assignments_source_check check (
    assignment_source = 'routing_decision'
  ),
  constraint complaint_assignments_status_check check (status = 'active'),
  constraint complaint_assignments_asset_shape_check check (
    (asset_id is null and asset_version_id is null and asset_ownership_version_id is null)
    or (asset_id is not null and asset_type_id is not null and asset_version_id is not null)
  )
);

create table complaints.complaint_status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  sequence integer not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users (id) on delete restrict,
  event_source text not null,
  reason_code text not null,
  public_message text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint complaint_status_history_sequence_unique unique (complaint_id, sequence),
  constraint complaint_status_history_sequence_check check (sequence >= 1),
  constraint complaint_status_history_source_check check (
    event_source in ('citizen_submission', 'government_action', 'system')
  ),
  constraint complaint_status_history_reason_check check (
    reason_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint complaint_status_history_message_check check (
    public_message is null
    or (
      public_message = btrim(public_message)
      and char_length(public_message) between 1 and 1000
    )
  ),
  constraint complaint_status_history_request_check check (
    request_id is null
    or (
      request_id = btrim(request_id)
      and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    )
  ),
  constraint complaint_status_history_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array['exactLocation', 'description', 'phone', 'email', 'signedUrl', 'token']
    )
  )
);

create table complaints.complaint_submission_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  routing_request_id text not null unique,
  state text not null default 'claimed',
  routing_decision_id uuid references routing.routing_decisions (id) on delete restrict,
  complaint_id uuid references complaints.complaints (id) on delete restrict,
  acknowledged_duplicate_suggestion_ids uuid[] not null default '{}'::uuid[],
  emergency_disclaimer_acknowledged boolean not null default false,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint complaint_submission_requests_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint complaint_submission_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_submission_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint complaint_submission_requests_routing_request_check check (
    routing_request_id ~ '^complaint-submit:[0-9a-f-]{36}$'
  ),
  constraint complaint_submission_requests_state_check check (
    state in ('claimed', 'completed')
  ),
  constraint complaint_submission_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint complaint_submission_requests_acknowledgements_check check (
    cardinality(acknowledged_duplicate_suggestion_ids) <= 100
  ),
  constraint complaint_submission_requests_completion_check check (
    (
      state = 'claimed'
      and routing_decision_id is null
      and complaint_id is null
      and cardinality(acknowledged_duplicate_suggestion_ids) = 0
      and not emergency_disclaimer_acknowledged
      and response_payload is null
      and completed_at is null
    )
    or (
      state = 'completed'
      and routing_decision_id is not null
      and complaint_id is not null
      and response_payload is not null
      and completed_at is not null
    )
  )
);

create table complaints.duplicate_check_runs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  draft_id uuid not null references complaints.complaint_drafts (id) on delete restrict,
  duplicate_policy_version_id uuid not null
    references routing.duplicate_detection_policy_versions (id) on delete restrict,
  request_id text not null,
  result_fingerprint text not null,
  candidate_count smallint not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint duplicate_check_runs_request_unique unique (actor_user_id, request_id),
  constraint duplicate_check_runs_request_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint duplicate_check_runs_fingerprint_check check (
    result_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint duplicate_check_runs_count_check check (candidate_count between 0 and 100)
);

create table complaints.duplicate_check_matches (
  id uuid primary key default gen_random_uuid(),
  duplicate_check_run_id uuid not null
    references complaints.duplicate_check_runs (id) on delete restrict,
  candidate_complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  score numeric(7, 6) not null,
  distance_meters double precision not null,
  age_seconds integer not null,
  factor_summary jsonb not null,
  created_at timestamptz not null default now(),
  constraint duplicate_check_matches_candidate_unique unique (
    duplicate_check_run_id,
    candidate_complaint_id
  ),
  constraint duplicate_check_matches_score_check check (score between 0 and 1),
  constraint duplicate_check_matches_distance_check check (distance_meters >= 0),
  constraint duplicate_check_matches_age_check check (age_seconds >= 0),
  constraint duplicate_check_matches_factor_check check (
    jsonb_typeof(factor_summary) = 'object'
    and not (
      factor_summary
        ?| array['description', 'exactLocation', 'mediaHashes', 'phone', 'email']
    )
  )
);

create index complaint_drafts_owner_status_updated_idx
  on complaints.complaint_drafts (citizen_user_id, status, updated_at desc);
create index complaint_drafts_expiry_idx
  on complaints.complaint_drafts (expires_at)
  where status = 'active';
create index complaint_location_evidence_draft_time_idx
  on complaints.complaint_location_evidence (draft_id, captured_at desc);
create index complaint_location_evidence_geography_gix
  on complaints.complaint_location_evidence
  using gist ((location::extensions.geography));
create index complaint_media_draft_status_idx
  on complaints.complaint_media (draft_id, upload_status, created_at);
create index complaint_media_expiry_idx
  on complaints.complaint_media (upload_expires_at)
  where upload_status = 'reserved';
create index complaint_media_verified_sha_idx
  on complaints.complaint_media (verified_sha256)
  where verified_sha256 is not null;
create index complaints_owner_submitted_idx
  on complaints.complaints (citizen_user_id, submitted_at desc, id);
create index complaints_category_submitted_idx
  on complaints.complaints (category_id, submitted_at desc);
create index complaints_status_submitted_idx
  on complaints.complaints (current_status, submitted_at desc);
create index complaint_assignments_authority_idx
  on complaints.complaint_assignments (authority_id, status, assigned_at desc);
create index complaint_assignments_ward_idx
  on complaints.complaint_assignments (ward_id, status, assigned_at desc)
  where ward_id is not null;
create index complaint_assignments_department_idx
  on complaints.complaint_assignments (authority_department_id, status, assigned_at desc);
create index complaint_status_history_timeline_idx
  on complaints.complaint_status_history (complaint_id, sequence);
create index complaint_submission_requests_draft_idx
  on complaints.complaint_submission_requests (draft_id, state, created_at desc);
create index duplicate_check_runs_draft_idx
  on complaints.duplicate_check_runs (draft_id, checked_at desc);
create index duplicate_check_matches_candidate_idx
  on complaints.duplicate_check_matches (candidate_complaint_id, created_at desc);

comment on schema complaints is
  'Private Phase 4 complaint capture state. Clients use authenticated NestJS endpoints, not direct table access.';
comment on table complaints.complaint_drafts is
  'Durable resumable citizen drafts; discard is a retained state transition rather than deletion.';
comment on table complaints.complaint_location_evidence is
  'Append-only exact device and media capture location evidence.';
comment on table complaints.complaint_media is
  'Private signed-upload intent and verified finalization metadata; signed tokens are never stored.';
comment on table complaints.complaints is
  'Submitted private complaints bound to immutable routing and exact location evidence.';
comment on table complaints.complaint_assignments is
  'Initial server-derived assignment copied from the stored routed decision.';
comment on table complaints.complaint_status_history is
  'Append-only official complaint lifecycle history.';
comment on table complaints.complaint_submission_requests is
  'Durable exact-replay idempotency ledger for complaint submission.';
comment on table complaints.duplicate_check_runs is
  'Append-only advisory duplicate evaluation runs using a versioned routing policy.';
comment on table complaints.duplicate_check_matches is
  'Privacy-restricted scored candidates retained for duplicate-evaluation audit.';
$migration_20260714100000_phase_4_complaint_capture$;

  if not (pg_temp.local_wellness_relation_exists('complaints.complaint_drafts')
      and pg_temp.local_wellness_relation_exists('complaints.complaints')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_assignments')
      and pg_temp.local_wellness_relation_exists('complaints.duplicate_check_matches')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_number_sequence')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714100000_phase_4_complaint_capture.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 14,
    cutoff_name = '20260714100000_phase_4_complaint_capture.sql'
  where singleton;

  raise notice 'Applied migration 20260714100000_phase_4_complaint_capture.sql';
end;
$guard_14$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714100000_phase_4_complaint_capture.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714101000_phase_4_complaint_security_and_rpc.sql
-- ============================================================================
do $guard_15$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 15 then
    raise notice 'Skipping already-complete migration 20260714101000_phase_4_complaint_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 14 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714101000_phase_4_complaint_security_and_rpc.sql';
  end if;

  execute $migration_20260714101000_phase_4_complaint_security_and_rpc$
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
$migration_20260714101000_phase_4_complaint_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'submit_complaint')
      and pg_temp.local_wellness_function_exists('public', 'list_owned_complaints')
      and pg_temp.local_wellness_function_exists('public', 'get_complaint_timeline')
      and pg_temp.local_wellness_private_bucket_exists('complaint-originals-private')
      and pg_temp.local_wellness_private_bucket_exists('voice-recordings-private')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714101000_phase_4_complaint_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 15,
    cutoff_name = '20260714101000_phase_4_complaint_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260714101000_phase_4_complaint_security_and_rpc.sql';
end;
$guard_15$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714101000_phase_4_complaint_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714110000_governance_sync_scheduling_and_contacts.sql
-- ============================================================================
do $guard_16$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 16 then
    raise notice 'Skipping already-complete migration 20260714110000_governance_sync_scheduling_and_contacts.sql';
    return;
  end if;

  if current_cutoff <> 15 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714110000_governance_sync_scheduling_and_contacts.sql';
  end if;

  execute $migration_20260714110000_governance_sync_scheduling_and_contacts$
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
$migration_20260714110000_governance_sync_scheduling_and_contacts$;

  if not (pg_temp.local_wellness_relation_exists('governance.sync_source_leases')
      and pg_temp.local_wellness_relation_exists('governance.contact_channel_versions')
      and pg_temp.local_wellness_relation_exists('governance.current_verified_contacts')
      and pg_temp.local_wellness_trigger_exists('governance', 'contact_channel_versions', 'contact_channel_versions_reject_delete')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714110000_governance_sync_scheduling_and_contacts.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 16,
    cutoff_name = '20260714110000_governance_sync_scheduling_and_contacts.sql'
  where singleton;

  raise notice 'Applied migration 20260714110000_governance_sync_scheduling_and_contacts.sql';
end;
$guard_16$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714110000_governance_sync_scheduling_and_contacts.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714111000_governance_sync_service_rpc.sql
-- ============================================================================
do $guard_17$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 17 then
    raise notice 'Skipping already-complete migration 20260714111000_governance_sync_service_rpc.sql';
    return;
  end if;

  if current_cutoff <> 16 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714111000_governance_sync_service_rpc.sql';
  end if;

  execute $migration_20260714111000_governance_sync_service_rpc$
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
$migration_20260714111000_governance_sync_service_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'claim_due_governance_sync_sources')
      and pg_temp.local_wellness_function_exists('public', 'record_governance_sync_snapshot')
      and pg_temp.local_wellness_function_exists('public', 'fail_governance_sync_run')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714111000_governance_sync_service_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 17,
    cutoff_name = '20260714111000_governance_sync_service_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260714111000_governance_sync_service_rpc.sql';
end;
$guard_17$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714111000_governance_sync_service_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714112000_governance_sync_scope.sql
-- ============================================================================
do $guard_18$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 18 then
    raise notice 'Skipping already-complete migration 20260714112000_governance_sync_scope.sql';
    return;
  end if;

  if current_cutoff <> 17 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714112000_governance_sync_scope.sql';
  end if;

  execute $migration_20260714112000_governance_sync_scope$
create table governance.sync_scope_targets (
  id uuid primary key default gen_random_uuid(),
  scope_group_key text not null,
  scope_key text not null,
  target_kind text not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  selection_rank smallint,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  is_routing_eligible boolean not null default false,
  selection_notes text,
  last_verified_on date,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_scope_targets_group_key_check check (
    scope_group_key = btrim(scope_group_key)
    and scope_group_key ~ '^[a-z][a-z0-9:_-]{1,159}$'
  ),
  constraint sync_scope_targets_scope_key_check check (
    scope_key = btrim(scope_key)
    and scope_key ~ '^[a-z][a-z0-9:_-]{1,239}$'
  ),
  constraint sync_scope_targets_scope_key_unique unique (scope_key),
  constraint sync_scope_targets_kind_check check (
    target_kind in ('authority', 'local_body', 'ward')
  ),
  constraint sync_scope_targets_shape_check check (
    (target_kind = 'authority' and local_body_id is null and ward_id is null)
    or (target_kind = 'local_body' and local_body_id is not null and ward_id is null)
    or (target_kind = 'ward' and local_body_id is not null and ward_id is not null)
  ),
  constraint sync_scope_targets_rank_check check (
    selection_rank is null or selection_rank between 1 and 32767
  ),
  constraint sync_scope_targets_status_check check (
    status in ('draft', 'active', 'paused', 'retired')
  ),
  constraint sync_scope_targets_verification_status_check check (
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
  constraint sync_scope_targets_notes_check check (
    selection_notes is null
    or (
      selection_notes = btrim(selection_notes)
      and char_length(selection_notes) between 1 and 2000
    )
  ),
  constraint sync_scope_targets_review_shape_check check (
    (approved_at is null and approved_by is null)
    or (approved_at is not null and approved_by is not null)
  ),
  constraint sync_scope_targets_active_review_check check (
    status <> 'active'
    or (
      verification_status = 'manually_verified'
      and last_verified_on is not null
      and approved_at is not null
      and approved_by is not null
    )
  ),
  constraint sync_scope_targets_routing_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'manually_verified'
      and last_verified_on is not null
      and approved_at is not null
      and approved_by is not null
    )
  ),
  constraint sync_scope_targets_retired_check check (
    status <> 'retired' or verification_status in ('superseded', 'stale')
  )
);

alter table governance.local_bodies
  add constraint local_bodies_id_authority_id_unique unique (id, authority_id);

alter table governance.wards
  add constraint wards_id_local_body_id_unique unique (id, local_body_id);

alter table governance.sync_scope_targets
  add constraint sync_scope_targets_local_body_authority_fkey
  foreign key (local_body_id, authority_id)
  references governance.local_bodies (id, authority_id)
  on delete restrict,
  add constraint sync_scope_targets_ward_local_body_fkey
  foreign key (ward_id, local_body_id)
  references governance.wards (id, local_body_id)
  on delete restrict;

create unique index sync_scope_targets_group_authority_unique
on governance.sync_scope_targets (scope_group_key, authority_id)
where target_kind = 'authority';

create unique index sync_scope_targets_group_local_body_unique
on governance.sync_scope_targets (scope_group_key, local_body_id)
where target_kind = 'local_body';

create unique index sync_scope_targets_group_ward_unique
on governance.sync_scope_targets (scope_group_key, ward_id)
where target_kind = 'ward';

create unique index sync_scope_targets_group_local_body_rank_unique
on governance.sync_scope_targets (scope_group_key, local_body_id, selection_rank)
where target_kind = 'ward' and selection_rank is not null;

create index sync_scope_targets_group_status_rank_idx
on governance.sync_scope_targets (scope_group_key, status, selection_rank, id);

create index sync_scope_targets_authority_status_idx
on governance.sync_scope_targets (authority_id, status, id);

create index sync_scope_targets_local_body_status_idx
on governance.sync_scope_targets (local_body_id, status, id)
where local_body_id is not null;

create function private.enforce_governance_sync_scope_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_is_required boolean;
  target_is_routing_eligible boolean;
begin
  if tg_op = 'UPDATE' and (
    new.scope_group_key is distinct from old.scope_group_key
    or new.scope_key is distinct from old.scope_key
    or new.target_kind is distinct from old.target_kind
    or new.authority_id is distinct from old.authority_id
    or new.local_body_id is distinct from old.local_body_id
    or new.ward_id is distinct from old.ward_id
  ) then
    raise exception using
      errcode = '55000',
      message = 'SYNC_SCOPE_TARGET_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'INSERT' then
    review_is_required := new.verification_status = 'manually_verified'
      or new.status = 'active'
      or new.is_routing_eligible;
  else
    review_is_required := new.status = 'active'
      or new.is_routing_eligible
      or (
        new.verification_status = 'manually_verified'
        and (
          old.verification_status is distinct from new.verification_status
          or old.approved_at is distinct from new.approved_at
          or old.approved_by is distinct from new.approved_by
          or old.last_verified_on is distinct from new.last_verified_on
        )
      );
  end if;

  if review_is_required then
    if new.approved_at is null
      or new.approved_by is null
      or new.last_verified_on is null
      or new.approved_at > current_timestamp
      or new.last_verified_on > current_date
      or not private.user_has_active_role(
        new.approved_by,
        'platform_admin',
        'global',
        null
      ) then
      raise exception using
        errcode = '23514',
        message = 'SYNC_SCOPE_TARGET_REVIEW_REQUIRED';
    end if;
  end if;

  if new.is_routing_eligible then
    case new.target_kind
      when 'authority' then
        select
          authority.status = 'active'
          and authority.verification_status = 'verified'
          and not authority.is_placeholder
          and authority.is_routing_eligible
        into target_is_routing_eligible
        from governance.authorities as authority
        where authority.id = new.authority_id;
      when 'local_body' then
        select
          local_body.status = 'active'
          and local_body.verification_status = 'verified'
          and not local_body.is_placeholder
          and local_body.is_routing_eligible
        into target_is_routing_eligible
        from governance.local_bodies as local_body
        where local_body.id = new.local_body_id;
      when 'ward' then
        select
          ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and ward.is_routing_eligible
        into target_is_routing_eligible
        from governance.wards as ward
        where ward.id = new.ward_id;
    end case;

    if not coalesce(target_is_routing_eligible, false) then
      raise exception using
        errcode = '23514',
        message = 'SYNC_SCOPE_TARGET_NOT_ROUTABLE';
    end if;
  end if;

  return new;
end;
$$;

create trigger sync_scope_targets_enforce
before insert or update on governance.sync_scope_targets
for each row execute function private.enforce_governance_sync_scope_target();

create trigger sync_scope_targets_set_updated_at
before update on governance.sync_scope_targets
for each row execute function private.set_updated_at();

alter table governance.sync_scope_targets enable row level security;
alter table governance.sync_scope_targets force row level security;

revoke all on governance.sync_scope_targets
from public, anon, authenticated, service_role;
grant select, insert, update on governance.sync_scope_targets to service_role;

revoke all on function private.enforce_governance_sync_scope_target() from public;

comment on table governance.sync_scope_targets is
  'Review-gated, service-only synchronization target selection. A target being selected for synchronization never makes its referenced governance entity routable.';

comment on column governance.sync_scope_targets.scope_group_key is
  'Stable data-driven grouping for a pilot or future statewide synchronization scope.';

comment on column governance.sync_scope_targets.is_routing_eligible is
  'Independent safety gate that can be true only after platform review and only when the referenced canonical entity is itself verified and routing eligible.';
$migration_20260714112000_governance_sync_scope$;

  if not (pg_temp.local_wellness_relation_exists('governance.sync_scope_targets')
      and pg_temp.local_wellness_function_exists('private', 'enforce_governance_sync_scope_target')
      and pg_temp.local_wellness_trigger_exists('governance', 'sync_scope_targets', 'sync_scope_targets_enforce')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714112000_governance_sync_scope.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 18,
    cutoff_name = '20260714112000_governance_sync_scope.sql'
  where singleton;

  raise notice 'Applied migration 20260714112000_governance_sync_scope.sql';
end;
$guard_18$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714112000_governance_sync_scope.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714120000_backfill_auth_profiles.sql
-- ============================================================================
do $guard_19$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 19 then
    raise notice 'Skipping already-complete migration 20260714120000_backfill_auth_profiles.sql';
    return;
  end if;

  if current_cutoff <> 18 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714120000_backfill_auth_profiles.sql';
  end if;

  execute $migration_20260714120000_backfill_auth_profiles$
create function private.backfill_missing_auth_identities()
returns table (
  profiles_inserted bigint,
  citizen_roles_inserted bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  citizen_role_id uuid;
begin
  select role.id
  into strict citizen_role_id
  from public.roles as role
  where role.code = 'citizen'
    and not role.is_privileged
    and not role.is_government;

  insert into public.profiles (
    id,
    display_name,
    phone,
    email,
    preferred_language,
    status
  )
  select
    auth_user.id,
    case
      when char_length(
        btrim(
          coalesce(
            auth_user.raw_user_meta_data ->> 'display_name',
            auth_user.raw_user_meta_data ->> 'name'
          )
        )
      ) between 1 and 120
        then btrim(
          coalesce(
            auth_user.raw_user_meta_data ->> 'display_name',
            auth_user.raw_user_meta_data ->> 'name'
          )
        )
      else null
    end,
    case
      when char_length(btrim(auth_user.phone)) between 3 and 32
        then btrim(auth_user.phone)
      else null
    end,
    case
      when char_length(lower(btrim(auth_user.email))) between 3 and 320
        then lower(btrim(auth_user.email))
      else null
    end,
    case
      when auth_user.raw_user_meta_data ->> 'preferred_language' in ('en', 'hi', 'mr')
        then auth_user.raw_user_meta_data ->> 'preferred_language'
      else 'en'
    end,
    'active'
  from auth.users as auth_user
  where not exists (
    select 1
    from public.profiles as profile
    where profile.id = auth_user.id
  )
  on conflict (id) do nothing;

  get diagnostics profiles_inserted = row_count;

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  select
    auth_user.id,
    citizen_role_id,
    'global',
    'active',
    now()
  from auth.users as auth_user
  where not exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = auth_user.id
      and user_role.role_id = citizen_role_id
      and user_role.scope_type = 'global'
      and user_role.authority_id is null
      and user_role.scope_id is null
  )
  on conflict do nothing;

  get diagnostics citizen_roles_inserted = row_count;

  return next;
end;
$$;

revoke all on function private.backfill_missing_auth_identities()
  from public, anon, authenticated, service_role;

select *
from private.backfill_missing_auth_identities();

comment on function private.backfill_missing_auth_identities() is
  'Idempotently repairs missing application profiles and non-privileged global citizen roles for existing Supabase Auth users without overwriting application identity data or reactivating revoked citizen access.';
$migration_20260714120000_backfill_auth_profiles$;

  if not (pg_temp.local_wellness_function_exists('private', 'backfill_missing_auth_identities')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714120000_backfill_auth_profiles.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 19,
    cutoff_name = '20260714120000_backfill_auth_profiles.sql'
  where singleton;

  raise notice 'Applied migration 20260714120000_backfill_auth_profiles.sql';
end;
$guard_19$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714120000_backfill_auth_profiles.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714121000_routing_configuration_validation.sql
-- ============================================================================
do $guard_20$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 20 then
    raise notice 'Skipping already-complete migration 20260714121000_routing_configuration_validation.sql';
    return;
  end if;

  if current_cutoff <> 19 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714121000_routing_configuration_validation.sql';
  end if;

  execute $migration_20260714121000_routing_configuration_validation$
create function public.report_routing_confidence_policy_conflicts()
returns table (
  category_id uuid,
  left_route_rule_id uuid,
  left_route_rule_version_id uuid,
  left_rule_code text,
  left_confidence_policy_version_id uuid,
  left_scope_authority_id uuid,
  left_scope_local_body_id uuid,
  left_scope_ward_id uuid,
  left_asset_type_id uuid,
  left_asset_id uuid,
  right_route_rule_id uuid,
  right_route_rule_version_id uuid,
  right_rule_code text,
  right_confidence_policy_version_id uuid,
  right_scope_authority_id uuid,
  right_scope_local_body_id uuid,
  right_scope_ward_id uuid,
  right_asset_type_id uuid,
  right_asset_id uuid,
  conflict_effective_from timestamptz,
  conflict_effective_to timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with applicable_versions as (
    select
      route_rule.category_id,
      route_rule.id as route_rule_id,
      route_rule.rule_code,
      rule_version.id as route_rule_version_id,
      rule_version.scope_authority_id,
      rule_version.scope_local_body_id,
      rule_version.scope_ward_id,
      rule_version.asset_type_id,
      rule_version.asset_id,
      rule_version.confidence_policy_version_id,
      greatest(rule_version.effective_from, policy_version.effective_from) as applicable_from,
      least(
        coalesce(rule_version.effective_to, 'infinity'::timestamptz),
        coalesce(policy_version.effective_to, 'infinity'::timestamptz)
      ) as applicable_to
    from routing.route_rule_versions as rule_version
    inner join routing.route_rules as route_rule on route_rule.id = rule_version.route_rule_id
    inner join routing.issue_categories as category on category.id = route_rule.category_id
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    inner join routing.confidence_policy_versions as policy_version
      on policy_version.id = rule_version.confidence_policy_version_id
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where route_rule.status = 'active'
      and route_rule.verification_status = 'verified'
      and not route_rule.is_placeholder
      and route_rule.is_routing_eligible
      and rule_version.status = 'active'
      and rule_version.verification_status = 'verified'
      and not rule_version.is_placeholder
      and rule_version.is_routing_eligible
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and (policy_version.category_id is null or policy_version.category_id = category.id)
      and greatest(rule_version.effective_from, policy_version.effective_from) < least(
        coalesce(rule_version.effective_to, 'infinity'::timestamptz),
        coalesce(policy_version.effective_to, 'infinity'::timestamptz)
      )
  ),
  conflicting_pairs as (
    select
      left_version.*,
      right_version.route_rule_id as right_route_rule_id,
      right_version.route_rule_version_id as right_route_rule_version_id,
      right_version.rule_code as right_rule_code,
      right_version.confidence_policy_version_id as right_confidence_policy_version_id,
      right_version.scope_authority_id as right_scope_authority_id,
      right_version.scope_local_body_id as right_scope_local_body_id,
      right_version.scope_ward_id as right_scope_ward_id,
      right_version.asset_type_id as right_asset_type_id,
      right_version.asset_id as right_asset_id,
      right_version.applicable_from as right_applicable_from,
      right_version.applicable_to as right_applicable_to
    from applicable_versions as left_version
    inner join applicable_versions as right_version
      on right_version.category_id = left_version.category_id
      and right_version.route_rule_version_id > left_version.route_rule_version_id
      and right_version.confidence_policy_version_id
        <> left_version.confidence_policy_version_id
      and tstzrange(
        left_version.applicable_from,
        left_version.applicable_to,
        '[)'
      ) && tstzrange(
        right_version.applicable_from,
        right_version.applicable_to,
        '[)'
      )
    where exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
        and (
          left_version.scope_authority_id is null
          or left_version.scope_authority_id = local_body.authority_id
        )
        and (
          right_version.scope_authority_id is null
          or right_version.scope_authority_id = local_body.authority_id
        )
        and (
          left_version.scope_local_body_id is null
          or left_version.scope_local_body_id = local_body.id
        )
        and (
          right_version.scope_local_body_id is null
          or right_version.scope_local_body_id = local_body.id
        )
        and (
          (
            left_version.scope_ward_id is null
            and right_version.scope_ward_id is null
          )
          or exists (
            select 1
            from governance.wards as ward
            where ward.local_body_id = local_body.id
              and ward.status = 'active'
              and ward.verification_status = 'verified'
              and not ward.is_placeholder
              and ward.is_routing_eligible
              and (
                left_version.scope_ward_id is null
                or left_version.scope_ward_id = ward.id
              )
              and (
                right_version.scope_ward_id is null
                or right_version.scope_ward_id = ward.id
              )
          )
        )
    )
      and (
        (
          left_version.asset_type_id is null
          and left_version.asset_id is null
          and right_version.asset_type_id is null
          and right_version.asset_id is null
        )
        or exists (
          select 1
          from routing.assets as asset
          inner join routing.asset_types as asset_type on asset_type.id = asset.asset_type_id
          where asset.status = 'active'
            and asset.verification_status = 'verified'
            and not asset.is_placeholder
            and asset.is_routing_eligible
            and asset_type.status = 'active'
            and asset_type.verification_status = 'verified'
            and not asset_type.is_placeholder
            and asset_type.is_routing_eligible
            and (left_version.asset_id is null or left_version.asset_id = asset.id)
            and (right_version.asset_id is null or right_version.asset_id = asset.id)
            and (
              left_version.asset_type_id is null
              or left_version.asset_type_id = asset.asset_type_id
            )
            and (
              right_version.asset_type_id is null
              or right_version.asset_type_id = asset.asset_type_id
            )
        )
      )
  )
  select
    conflict.category_id,
    conflict.route_rule_id,
    conflict.route_rule_version_id,
    conflict.rule_code,
    conflict.confidence_policy_version_id,
    conflict.scope_authority_id,
    conflict.scope_local_body_id,
    conflict.scope_ward_id,
    conflict.asset_type_id,
    conflict.asset_id,
    conflict.right_route_rule_id,
    conflict.right_route_rule_version_id,
    conflict.right_rule_code,
    conflict.right_confidence_policy_version_id,
    conflict.right_scope_authority_id,
    conflict.right_scope_local_body_id,
    conflict.right_scope_ward_id,
    conflict.right_asset_type_id,
    conflict.right_asset_id,
    greatest(conflict.applicable_from, conflict.right_applicable_from),
    case
      when least(conflict.applicable_to, conflict.right_applicable_to) = 'infinity'::timestamptz
        then null
      else least(conflict.applicable_to, conflict.right_applicable_to)
    end
  from conflicting_pairs as conflict
  order by
    conflict.category_id,
    conflict.route_rule_version_id,
    conflict.right_route_rule_version_id;
$$;

revoke all on function public.report_routing_confidence_policy_conflicts()
  from public, anon, authenticated, service_role;
grant execute on function public.report_routing_confidence_policy_conflicts() to service_role;

comment on function public.report_routing_confidence_policy_conflicts() is
  'Service-only activation report for overlapping operational route-rule versions that reference different confidence policy versions. Runtime routing continues to fail closed independently.';
$migration_20260714121000_routing_configuration_validation$;

  if not (pg_temp.local_wellness_function_exists('public', 'report_routing_confidence_policy_conflicts')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714121000_routing_configuration_validation.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 20,
    cutoff_name = '20260714121000_routing_configuration_validation.sql'
  where singleton;

  raise notice 'Applied migration 20260714121000_routing_configuration_validation.sql';
end;
$guard_20$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714121000_routing_configuration_validation.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714122000_routing_asset_discovery.sql
-- ============================================================================
do $guard_21$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 21 then
    raise notice 'Skipping already-complete migration 20260714122000_routing_asset_discovery.sql';
    return;
  end if;

  if current_cutoff <> 20 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714122000_routing_asset_discovery.sql';
  end if;

  execute $migration_20260714122000_routing_asset_discovery$
create function public.discover_routing_assets(
  p_category_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_resolved_at timestamptz default current_timestamp,
  p_limit integer default 25
)
returns table (
  asset_id uuid,
  display_name text,
  asset_type_name text,
  distance_meters double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_category_id is null
    or p_longitude is null
    or p_latitude is null
    or p_accuracy_meters is null
    or p_resolved_at is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90
    or p_accuracy_meters < 0
    or p_accuracy_meters > 5000
    or p_limit is null
    or p_limit < 1
    or p_limit > 50 then
    raise exception using errcode = '22023', message = 'ROUTING_ASSET_DISCOVERY_INPUT_INVALID';
  end if;

  return query
  with input_point as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geometry(Point, 4326) as location
  ),
  jurisdiction_candidates as materialized (
    select *
    from routing.resolve_jurisdiction_with_accuracy(
      p_longitude,
      p_latitude,
      p_accuracy_meters,
      p_resolved_at
    )
  ),
  resolved_jurisdiction as (
    select jurisdiction.*
    from jurisdiction_candidates as jurisdiction
    where (select count(*) from jurisdiction_candidates) = 1
  ),
  eligible_asset_types as (
    select
      asset_type.id,
      asset_type.name,
      asset_type.matching_distance_meters,
      category_asset_type.match_priority
    from routing.issue_categories as category
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    inner join routing.category_asset_types as category_asset_type
      on category_asset_type.category_id = category.id
    inner join routing.asset_types as asset_type
      on asset_type.id = category_asset_type.asset_type_id
    where category.id = p_category_id
      and category.requires_asset
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
      and category_asset_type.requirement = 'required'
      and category_asset_type.status = 'active'
      and category_asset_type.verification_status = 'verified'
      and not category_asset_type.is_placeholder
      and category_asset_type.is_routing_eligible
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
  )
  select
    asset.id,
    coalesce(asset.display_name, asset_type.name),
    asset_type.name,
    extensions.st_distance(
      asset_version.location::extensions.geography,
      input_point.location::extensions.geography
    ) as measured_distance_meters
  from resolved_jurisdiction as jurisdiction
  cross join input_point
  inner join eligible_asset_types as asset_type on true
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
    and (asset_version.district_id is null or asset_version.district_id = jurisdiction.district_id)
    and (asset_version.local_body_id is null or asset_version.local_body_id = jurisdiction.local_body_id)
    and (asset_version.ward_id is null or asset_version.ward_id = jurisdiction.ward_id)
  where extensions.st_dwithin(
      asset_version.location::extensions.geography,
      input_point.location::extensions.geography,
      greatest(asset_type.matching_distance_meters, p_accuracy_meters)
    )
    and exists (
      select 1
      from routing.asset_ownership_versions as ownership
      inner join governance.authorities as owner_authority
        on owner_authority.id = ownership.owner_authority_id
      where ownership.asset_id = asset.id
        and ownership.status = 'active'
        and ownership.verification_status = 'verified'
        and not ownership.is_placeholder
        and ownership.is_routing_eligible
        and ownership.effective_from <= p_resolved_at
        and (ownership.effective_to is null or ownership.effective_to > p_resolved_at)
        and owner_authority.status = 'active'
        and owner_authority.verification_status = 'verified'
        and not owner_authority.is_placeholder
        and owner_authority.is_routing_eligible
        and private.is_verified_governance_authority(owner_authority.id)
        and (
          ownership.authority_department_id is null
          or exists (
            select 1
            from governance.authority_departments as authority_department
            inner join governance.departments as department
              on department.id = authority_department.department_id
            where authority_department.id = ownership.authority_department_id
              and authority_department.authority_id = owner_authority.id
              and authority_department.status = 'active'
              and authority_department.verification_status = 'verified'
              and not authority_department.is_placeholder
              and authority_department.is_routing_eligible
              and department.status = 'active'
              and department.verification_status = 'verified'
              and not department.is_placeholder
              and department.is_routing_eligible
          )
        )
        and (
          ownership.office_id is null
          or exists (
            select 1
            from governance.offices as office
            where office.id = ownership.office_id
              and office.authority_id = owner_authority.id
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
        and (
          ownership.officer_role_id is null
          or exists (
            select 1
            from governance.officer_roles as officer_role
            where officer_role.id = ownership.officer_role_id
              and officer_role.status = 'active'
              and officer_role.verification_status = 'verified'
              and not officer_role.is_placeholder
              and officer_role.is_routing_eligible
          )
        )
    )
  order by asset_type.match_priority, measured_distance_meters, asset.id
  limit p_limit;
end;
$$;

revoke all on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) from public, anon, authenticated, service_role;

grant execute on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) to service_role;

comment on function public.discover_routing_assets(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz,
  integer
) is
  'Service-only PostGIS asset picker. Returns sanitized nearby options only when category, jurisdiction, asset, version, and ownership evidence are current, verified, non-placeholder, and routing-eligible.';
$migration_20260714122000_routing_asset_discovery$;

  if not (pg_temp.local_wellness_function_exists('public', 'discover_routing_assets')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714122000_routing_asset_discovery.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 21,
    cutoff_name = '20260714122000_routing_asset_discovery.sql'
  where singleton;

  raise notice 'Applied migration 20260714122000_routing_asset_discovery.sql';
end;
$guard_21$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714122000_routing_asset_discovery.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714123000_phase_5_government_workflow_schema.sql
-- ============================================================================
do $guard_22$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 22 then
    raise notice 'Skipping already-complete migration 20260714123000_phase_5_government_workflow_schema.sql';
    return;
  end if;

  if current_cutoff <> 21 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714123000_phase_5_government_workflow_schema.sql';
  end if;

  execute $migration_20260714123000_phase_5_government_workflow_schema$
alter table complaints.complaints
  add column workflow_version bigint not null default 1,
  add constraint complaints_workflow_version_check check (workflow_version >= 1);

alter table complaints.complaint_assignments
  drop constraint complaint_assignments_complaint_id_key,
  drop constraint complaint_assignments_routing_decision_id_key,
  drop constraint complaint_assignments_source_check,
  drop constraint complaint_assignments_status_check;

alter table complaints.complaint_assignments
  add column version integer not null default 1,
  add column effective_from timestamptz,
  add column effective_to timestamptz,
  add column assigned_by_user_id uuid references auth.users (id) on delete restrict,
  add column ended_by_user_id uuid references auth.users (id) on delete restrict,
  add column assigned_user_id uuid references auth.users (id) on delete restrict,
  add column supersedes_assignment_id uuid
    references complaints.complaint_assignments (id) on delete restrict,
  add column reason_code text;

update complaints.complaint_assignments
set effective_from = assigned_at;

alter table complaints.complaint_assignments
  alter column effective_from set not null,
  alter column effective_from set default current_timestamp,
  add constraint complaint_assignments_version_check check (version >= 1),
  add constraint complaint_assignments_version_unique unique (complaint_id, version),
  add constraint complaint_assignments_supersedes_unique unique (supersedes_assignment_id),
  add constraint complaint_assignments_supersedes_self_check check (
    supersedes_assignment_id is distinct from id
  ),
  add constraint complaint_assignments_source_check check (
    assignment_source in (
      'routing_decision',
      'government_assignment',
      'government_reassignment',
      'government_transfer'
    )
  ),
  add constraint complaint_assignments_status_check check (
    status in ('active', 'superseded', 'cancelled')
  ),
  add constraint complaint_assignments_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  add constraint complaint_assignments_lifecycle_check check (
    (status = 'active' and effective_to is null and ended_by_user_id is null)
    or (status in ('superseded', 'cancelled') and effective_to is not null)
  ),
  add constraint complaint_assignments_reason_check check (
    reason_code is null
    or reason_code ~ '^[a-z][a-z0-9_]{1,79}$'
  );

create unique index complaint_assignments_one_active_idx
  on complaints.complaint_assignments (complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_history_idx
  on complaints.complaint_assignments (complaint_id, version desc);

create index complaint_assignments_active_authority_queue_idx
  on complaints.complaint_assignments (authority_id, complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_active_ward_queue_idx
  on complaints.complaint_assignments (ward_id, complaint_id)
  where status = 'active' and effective_to is null and ward_id is not null;

create index complaint_assignments_active_department_queue_idx
  on complaints.complaint_assignments (authority_department_id, complaint_id)
  where status = 'active' and effective_to is null;

create index complaint_assignments_active_officer_queue_idx
  on complaints.complaint_assignments (officer_assignment_id, complaint_id)
  where status = 'active' and effective_to is null and officer_assignment_id is not null;

create table complaints.government_role_capabilities (
  role_id uuid primary key references public.roles (id) on delete restrict,
  can_view boolean not null default false,
  can_acknowledge boolean not null default false,
  can_assign boolean not null default false,
  can_transfer boolean not null default false,
  can_update_status boolean not null default false,
  can_add_internal_note boolean not null default false,
  can_manage_inspection boolean not null default false,
  can_add_work_reference boolean not null default false,
  can_add_external_dependency boolean not null default false,
  can_upload_resolution_evidence boolean not null default false,
  can_submit_resolution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into complaints.government_role_capabilities (
  role_id,
  can_view,
  can_acknowledge,
  can_assign,
  can_transfer,
  can_update_status,
  can_add_internal_note,
  can_manage_inspection,
  can_add_work_reference,
  can_add_external_dependency,
  can_upload_resolution_evidence,
  can_submit_resolution
)
select
  role.id,
  true,
  role.code <> 'moderator',
  role.code in ('platform_admin', 'municipal_admin', 'government_operator'),
  role.code in ('platform_admin', 'municipal_admin', 'government_operator'),
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator',
  role.code <> 'moderator'
from public.roles as role
where role.code in (
  'platform_admin',
  'municipal_admin',
  'government_operator',
  'ward_officer',
  'department_officer',
  'moderator'
);

create table complaints.government_status_transition_rules (
  action_type text not null,
  from_status text not null,
  to_status text not null,
  created_at timestamptz not null default now(),
  primary key (action_type, from_status, to_status),
  constraint government_status_transition_action_check check (
    action_type in (
      'acknowledge',
      'assign',
      'transfer',
      'update_status',
      'schedule_inspection',
      'complete_inspection',
      'add_work_reference',
      'add_external_dependency',
      'resolve_external_dependency',
      'submit_resolution'
    )
  ),
  constraint government_status_transition_from_check check (
    from_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
      'acknowledged', 'inspection_scheduled', 'inspection_completed',
      'work_order_created', 'work_in_progress', 'resolution_submitted',
      'citizen_verification_pending', 'resolved', 'closed', 'transferred',
      'waiting_for_material', 'waiting_for_external_agency', 'reopened',
      'rejected', 'cancelled', 'escalated'
    )
  ),
  constraint government_status_transition_to_check check (
    to_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
      'acknowledged', 'inspection_scheduled', 'inspection_completed',
      'work_order_created', 'work_in_progress', 'resolution_submitted',
      'citizen_verification_pending', 'resolved', 'closed', 'transferred',
      'waiting_for_material', 'waiting_for_external_agency', 'reopened',
      'rejected', 'cancelled', 'escalated'
    )
  )
);

insert into complaints.government_status_transition_rules (
  action_type,
  from_status,
  to_status
)
values
  ('acknowledge', 'submitted', 'acknowledged'),
  ('acknowledge', 'assigned', 'acknowledged'),
  ('acknowledge', 'transferred', 'acknowledged'),
  ('acknowledge', 'reopened', 'acknowledged'),
  ('acknowledge', 'escalated', 'acknowledged'),
  ('assign', 'submitted', 'assigned'),
  ('assign', 'transferred', 'assigned'),
  ('assign', 'reopened', 'assigned'),
  ('assign', 'escalated', 'assigned'),
  ('transfer', 'submitted', 'transferred'),
  ('transfer', 'assigned', 'transferred'),
  ('transfer', 'acknowledged', 'transferred'),
  ('transfer', 'inspection_scheduled', 'transferred'),
  ('transfer', 'inspection_completed', 'transferred'),
  ('transfer', 'work_order_created', 'transferred'),
  ('transfer', 'work_in_progress', 'transferred'),
  ('transfer', 'waiting_for_material', 'transferred'),
  ('transfer', 'waiting_for_external_agency', 'transferred'),
  ('transfer', 'reopened', 'transferred'),
  ('transfer', 'escalated', 'transferred'),
  ('schedule_inspection', 'assigned', 'inspection_scheduled'),
  ('schedule_inspection', 'acknowledged', 'inspection_scheduled'),
  ('schedule_inspection', 'reopened', 'inspection_scheduled'),
  ('complete_inspection', 'inspection_scheduled', 'inspection_completed'),
  ('add_work_reference', 'acknowledged', 'work_order_created'),
  ('add_work_reference', 'inspection_completed', 'work_order_created'),
  ('add_external_dependency', 'acknowledged', 'waiting_for_external_agency'),
  ('add_external_dependency', 'inspection_completed', 'waiting_for_external_agency'),
  ('add_external_dependency', 'work_order_created', 'waiting_for_external_agency'),
  ('add_external_dependency', 'work_in_progress', 'waiting_for_external_agency'),
  ('add_external_dependency', 'acknowledged', 'waiting_for_material'),
  ('add_external_dependency', 'inspection_completed', 'waiting_for_material'),
  ('add_external_dependency', 'work_order_created', 'waiting_for_material'),
  ('add_external_dependency', 'work_in_progress', 'waiting_for_material'),
  ('resolve_external_dependency', 'waiting_for_material', 'work_in_progress'),
  ('resolve_external_dependency', 'waiting_for_external_agency', 'work_in_progress'),
  ('update_status', 'acknowledged', 'work_in_progress'),
  ('update_status', 'inspection_completed', 'work_in_progress'),
  ('update_status', 'work_order_created', 'work_in_progress'),
  ('update_status', 'waiting_for_material', 'work_in_progress'),
  ('update_status', 'waiting_for_external_agency', 'work_in_progress'),
  ('update_status', 'acknowledged', 'escalated'),
  ('update_status', 'inspection_scheduled', 'escalated'),
  ('update_status', 'inspection_completed', 'escalated'),
  ('update_status', 'work_order_created', 'escalated'),
  ('update_status', 'work_in_progress', 'escalated'),
  ('update_status', 'waiting_for_material', 'escalated'),
  ('update_status', 'waiting_for_external_agency', 'escalated'),
  ('update_status', 'escalated', 'acknowledged'),
  ('submit_resolution', 'acknowledged', 'resolution_submitted'),
  ('submit_resolution', 'inspection_completed', 'resolution_submitted'),
  ('submit_resolution', 'work_order_created', 'resolution_submitted'),
  ('submit_resolution', 'work_in_progress', 'resolution_submitted');

create table complaints.government_action_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  action_type text not null,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  request_id text not null,
  state text not null default 'claimed',
  from_status text,
  to_status text,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint government_action_requests_actor_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint government_action_requests_action_check check (
    action_type in (
      'acknowledge',
      'assign',
      'transfer',
      'update_status',
      'add_internal_note',
      'schedule_inspection',
      'complete_inspection',
      'add_work_reference',
      'add_external_dependency',
      'resolve_external_dependency',
      'upload_resolution_evidence',
      'finalize_resolution_evidence',
      'submit_resolution'
    )
  ),
  constraint government_action_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint government_action_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint government_action_requests_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint government_action_requests_state_check check (
    state in ('claimed', 'completed')
  ),
  constraint government_action_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint government_action_requests_completion_check check (
    (state = 'claimed' and response_payload is null and completed_at is null)
    or (state = 'completed' and response_payload is not null and completed_at is not null)
  )
);

create table complaints.government_action_audit_events (
  id uuid primary key default gen_random_uuid(),
  action_request_id uuid not null unique
    references complaints.government_action_requests (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  assignment_id uuid references complaints.complaint_assignments (id) on delete restrict,
  action_type text not null,
  from_status text,
  to_status text,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint government_action_audit_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'phone', 'email',
        'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create table complaints.complaint_internal_notes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint complaint_internal_notes_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  )
);

create table complaints.complaint_inspections (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  status text not null default 'scheduled',
  scheduled_for timestamptz not null,
  instructions text,
  scheduled_by_user_id uuid not null references auth.users (id) on delete restrict,
  outcome text,
  summary text,
  completed_by_user_id uuid references auth.users (id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_inspections_status_check check (
    status in ('scheduled', 'completed', 'cancelled')
  ),
  constraint complaint_inspections_instructions_check check (
    instructions is null
    or (instructions = btrim(instructions) and char_length(instructions) between 1 and 2000)
  ),
  constraint complaint_inspections_outcome_check check (
    outcome is null
    or outcome in (
      'confirmed', 'not_found', 'partially_confirmed', 'access_blocked',
      'external_dependency'
    )
  ),
  constraint complaint_inspections_summary_check check (
    summary is null
    or (summary = btrim(summary) and char_length(summary) between 1 and 4000)
  ),
  constraint complaint_inspections_completion_check check (
    (status = 'scheduled' and outcome is null and summary is null
      and completed_by_user_id is null and completed_at is null)
    or (status = 'completed' and outcome is not null and summary is not null
      and completed_by_user_id is not null and completed_at is not null)
    or status = 'cancelled'
  )
);

create unique index complaint_inspections_one_scheduled_idx
  on complaints.complaint_inspections (complaint_id)
  where status = 'scheduled';

create table complaints.complaint_work_references (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  added_by_user_id uuid not null references auth.users (id) on delete restrict,
  reference_type text not null,
  reference_number text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint complaint_work_references_type_check check (
    reference_type = btrim(reference_type)
    and reference_type ~ '^[A-Za-z][A-Za-z0-9 _.-]{0,79}$'
  ),
  constraint complaint_work_references_number_check check (
    reference_number = btrim(reference_number)
    and char_length(reference_number) between 1 and 160
  ),
  constraint complaint_work_references_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 2000)
  ),
  constraint complaint_work_references_unique unique (
    complaint_id,
    reference_type,
    reference_number
  )
);

create table complaints.complaint_external_dependencies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  added_by_user_id uuid not null references auth.users (id) on delete restrict,
  dependency_type text not null,
  description text not null,
  expected_by timestamptz,
  status text not null default 'active',
  resolution_summary text,
  resolved_by_user_id uuid references auth.users (id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_external_dependencies_type_check check (
    dependency_type in ('material', 'external_agency', 'permit', 'utility', 'other')
  ),
  constraint complaint_external_dependencies_description_check check (
    description = btrim(description) and char_length(description) between 1 and 4000
  ),
  constraint complaint_external_dependencies_status_check check (
    status in ('active', 'resolved', 'cancelled')
  ),
  constraint complaint_external_dependencies_resolution_summary_check check (
    resolution_summary is null
    or (resolution_summary = btrim(resolution_summary)
      and char_length(resolution_summary) between 1 and 2000)
  ),
  constraint complaint_external_dependencies_resolution_check check (
    (status = 'active' and resolution_summary is null
      and resolved_by_user_id is null and resolved_at is null)
    or (status in ('resolved', 'cancelled') and resolved_at is not null)
  )
);

create table complaints.complaint_resolution_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null,
  bucket_id text not null default 'resolution-evidence-private',
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  captured_at timestamptz,
  upload_status text not null default 'reserved',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_resolution_evidence_object_unique unique (bucket_id, object_path),
  constraint complaint_resolution_evidence_kind_check check (kind in ('photo', 'video')),
  constraint complaint_resolution_evidence_bucket_check check (
    bucket_id = 'resolution-evidence-private'
  ),
  constraint complaint_resolution_evidence_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/original$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_resolution_evidence_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_resolution_evidence_observed_mime_check check (
    observed_mime_type is null
    or observed_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_resolution_evidence_size_check check (
    declared_byte_size between 1 and 52428800
    and (observed_byte_size is null or observed_byte_size between 1 and 52428800)
  ),
  constraint complaint_resolution_evidence_hash_check check (
    client_sha256 ~ '^[0-9a-f]{64}$'
    and (verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$')
  ),
  constraint complaint_resolution_evidence_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_resolution_evidence_expiry_check check (
    upload_expires_at > created_at
  ),
  constraint complaint_resolution_evidence_finalize_check check (
    (upload_status = 'finalized' and observed_mime_type is not null
      and observed_byte_size is not null and verified_sha256 is not null
      and finalized_at is not null and failure_code is null)
    or (upload_status <> 'finalized' and finalized_at is null and verified_sha256 is null)
  )
);

create table complaints.complaint_resolutions (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  version integer not null,
  assignment_id uuid not null references complaints.complaint_assignments (id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users (id) on delete restrict,
  completion_note text not null,
  public_message text,
  created_at timestamptz not null default now(),
  constraint complaint_resolutions_version_unique unique (complaint_id, version),
  constraint complaint_resolutions_version_check check (version >= 1),
  constraint complaint_resolutions_note_check check (
    completion_note = btrim(completion_note)
    and char_length(completion_note) between 1 and 4000
  ),
  constraint complaint_resolutions_public_message_check check (
    public_message is null
    or (public_message = btrim(public_message) and char_length(public_message) between 1 and 1000)
  )
);

create table complaints.complaint_resolution_evidence_links (
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  evidence_id uuid not null
    references complaints.complaint_resolution_evidence (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (resolution_id, evidence_id),
  constraint complaint_resolution_evidence_links_evidence_unique unique (evidence_id)
);

create table complaints.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  status_history_id uuid not null unique
    references complaints.complaint_status_history (id) on delete restrict,
  event_type text not null default 'complaint_status_changed',
  aggregate_type text not null default 'complaint',
  aggregate_id uuid not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint notification_outbox_event_type_check check (
    event_type = 'complaint_status_changed'
  ),
  constraint notification_outbox_aggregate_check check (
    aggregate_type = 'complaint' and aggregate_id = complaint_id
  ),
  constraint notification_outbox_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'status', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'status', 'authorityId', 'wardId',
      'authorityDepartmentId', 'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'citizenUserId',
        'phone', 'email', 'objectPath', 'signedUrl', 'token'
      ]
    )
  )
);

create index complaints_government_queue_idx
  on complaints.complaints (current_status, submitted_at desc, id desc);
create index complaints_government_category_queue_idx
  on complaints.complaints (category_id, submitted_at desc, id desc);
create index complaints_government_number_trgm_idx
  on complaints.complaints using gin (complaint_number extensions.gin_trgm_ops);
create index complaint_internal_notes_timeline_idx
  on complaints.complaint_internal_notes (complaint_id, created_at, id);
create index complaint_inspections_timeline_idx
  on complaints.complaint_inspections (complaint_id, created_at, id);
create index complaint_work_references_timeline_idx
  on complaints.complaint_work_references (complaint_id, created_at, id);
create index complaint_external_dependencies_timeline_idx
  on complaints.complaint_external_dependencies (complaint_id, created_at, id);
create index complaint_resolution_evidence_timeline_idx
  on complaints.complaint_resolution_evidence (complaint_id, created_at, id);
create index complaint_resolution_evidence_expiry_idx
  on complaints.complaint_resolution_evidence (upload_expires_at)
  where upload_status = 'reserved';
create index government_action_audit_complaint_time_idx
  on complaints.government_action_audit_events (complaint_id, occurred_at desc, id);
create index notification_outbox_created_idx
  on complaints.notification_outbox (created_at, id);

comment on table complaints.government_role_capabilities is
  'Least-privilege Phase 5 capability matrix; moderators are read-only.';
comment on table complaints.government_status_transition_rules is
  'Fail-closed Phase 5 government workflow transition graph.';
comment on table complaints.government_action_requests is
  'Durable exact-replay ledger for government complaint mutations.';
comment on table complaints.government_action_audit_events is
  'Append-only, data-minimized audit trail for successful government actions.';
comment on table complaints.notification_outbox is
  'Private data-minimized domain-event outbox; Phase 5 provides no delivery behavior.';
$migration_20260714123000_phase_5_government_workflow_schema$;

  if not (pg_temp.local_wellness_relation_exists('complaints.government_role_capabilities')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_resolution_evidence')
      and pg_temp.local_wellness_relation_exists('complaints.notification_outbox')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714123000_phase_5_government_workflow_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 22,
    cutoff_name = '20260714123000_phase_5_government_workflow_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260714123000_phase_5_government_workflow_schema.sql';
end;
$guard_22$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714123000_phase_5_government_workflow_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714124000_phase_5_government_workflow_security_and_rpc.sql
-- ============================================================================
do $guard_23$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 23 then
    raise notice 'Skipping already-complete migration 20260714124000_phase_5_government_workflow_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 22 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714124000_phase_5_government_workflow_security_and_rpc.sql';
  end if;

  execute $migration_20260714124000_phase_5_government_workflow_security_and_rpc$
drop trigger complaints_append_only_phase4 on complaints.complaints;
drop trigger complaint_assignments_append_only on complaints.complaint_assignments;

create function complaints.current_action_request_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text;
begin
  configured := current_setting('local_wellness.government_action_id', true);
  if configured is null or configured = '' then
    return null;
  end if;
  begin
    return configured::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

create function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if new.id is distinct from old.id
    or new.draft_id is distinct from old.draft_id
    or new.complaint_number is distinct from old.complaint_number
    or new.citizen_user_id is distinct from old.citizen_user_id
    or new.category_id is distinct from old.category_id
    or new.asset_id is distinct from old.asset_id
    or new.description is distinct from old.description
    or new.description_language is distinct from old.description_language
    or new.custom_attributes is distinct from old.custom_attributes
    or new.location_evidence_id is distinct from old.location_evidence_id
    or new.routing_decision_id is distinct from old.routing_decision_id
    or new.visibility is distinct from old.visibility
    or new.submitted_at is distinct from old.submitted_at
    or new.created_at is distinct from old.created_at
    or new.workflow_version <> old.workflow_version + 1
    or new.updated_at < old.updated_at then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if action_id is null or not exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  return new;
end;
$$;

create trigger complaints_validate_workflow_mutation
before update or delete on complaints.complaints
for each row execute function complaints.validate_complaint_workflow_mutation();

create function complaints.validate_assignment_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaint_assignments records are versioned and cannot be deleted.';
  end if;

  if tg_op = 'INSERT' then
    if new.assignment_source <> 'routing_decision' and (
      action_id is null or not exists (
        select 1
        from complaints.government_action_requests as action
        where action.id = action_id
          and action.complaint_id = new.complaint_id
          and action.state = 'claimed'
          and action.action_type in ('assign', 'transfer')
      )
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_ASSIGNMENT_MUTATION_DENIED';
    end if;
    return new;
  end if;

  if old.status <> 'active'
    or new.status not in ('superseded', 'cancelled')
    or new.effective_to is null
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.routing_decision_id is distinct from old.routing_decision_id
    or new.authority_id is distinct from old.authority_id
    or new.local_body_id is distinct from old.local_body_id
    or new.ward_id is distinct from old.ward_id
    or new.department_id is distinct from old.department_id
    or new.authority_department_id is distinct from old.authority_department_id
    or new.officer_role_id is distinct from old.officer_role_id
    or new.officer_assignment_id is distinct from old.officer_assignment_id
    or new.asset_type_id is distinct from old.asset_type_id
    or new.asset_id is distinct from old.asset_id
    or new.asset_version_id is distinct from old.asset_version_id
    or new.asset_ownership_version_id is distinct from old.asset_ownership_version_id
    or new.assignment_source is distinct from old.assignment_source
    or new.assigned_at is distinct from old.assigned_at
    or new.created_at is distinct from old.created_at
    or new.version is distinct from old.version
    or new.effective_from is distinct from old.effective_from
    or new.assigned_by_user_id is distinct from old.assigned_by_user_id
    or new.assigned_user_id is distinct from old.assigned_user_id
    or new.supersedes_assignment_id is distinct from old.supersedes_assignment_id
    or new.reason_code is distinct from old.reason_code
    or action_id is null
    or not exists (
      select 1
      from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.state = 'claimed'
        and action.action_type in ('assign', 'transfer')
        and action.actor_user_id = new.ended_by_user_id
    ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_ASSIGNMENT_HISTORY_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger complaint_assignments_validate_version_mutation
before insert or update or delete on complaints.complaint_assignments
for each row execute function complaints.validate_assignment_version_mutation();

create function complaints.validate_terminal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = format(
      '%I.%I records cannot be deleted.', tg_table_schema, tg_table_name
    );
  end if;
  if old.status <> 'scheduled'
    or new.status not in ('completed', 'cancelled')
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.scheduled_for is distinct from old.scheduled_for
    or new.instructions is distinct from old.instructions
    or new.scheduled_by_user_id is distinct from old.scheduled_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'COMPLAINT_INSPECTION_HISTORY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_inspections_validate_terminal_update
before update or delete on complaints.complaint_inspections
for each row execute function complaints.validate_terminal_update();

create function complaints.validate_resolution_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mutation_mode text := nullif(
    current_setting('local_wellness.resolution_evidence_mutation', true),
    ''
  );
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;
  if new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.uploader_user_id is distinct from old.uploader_user_id
    or new.kind is distinct from old.kind
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.declared_mime_type is distinct from old.declared_mime_type
    or new.declared_byte_size is distinct from old.declared_byte_size
    or new.client_sha256 is distinct from old.client_sha256
    or new.captured_at is distinct from old.captured_at
    or new.upload_expires_at is distinct from old.upload_expires_at
    or new.created_at is distinct from old.created_at
    or old.upload_status <> 'reserved' then
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;

  if new.upload_status = 'finalized' then
    if action_id is null or not exists (
      select 1
      from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.action_type = 'finalize_resolution_evidence'
        and action.state = 'claimed'
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status = 'expired' then
    if mutation_mode <> 'expire'
      or new.failure_code <> 'UPLOAD_RESERVATION_EXPIRED'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status = 'failed' then
    if mutation_mode <> 'fail'
      or new.failure_code is null
      or new.failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
    end if;
  else
    raise exception using errcode = '55000', message = 'COMPLAINT_RESOLUTION_EVIDENCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_resolution_evidence_validate_mutation
before update or delete on complaints.complaint_resolution_evidence
for each row execute function complaints.validate_resolution_evidence_mutation();

create trigger complaint_resolution_evidence_set_updated_at
before update on complaints.complaint_resolution_evidence
for each row execute function private.set_updated_at();

create trigger complaint_inspections_set_updated_at
before update on complaints.complaint_inspections
for each row execute function private.set_updated_at();

create trigger complaint_external_dependencies_set_updated_at
before update on complaints.complaint_external_dependencies
for each row execute function private.set_updated_at();

create function complaints.validate_external_dependency_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_action_request_id();
begin
  if tg_op = 'DELETE'
    or old.status <> 'active'
    or new.status <> 'resolved'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.assignment_id is distinct from old.assignment_id
    or new.added_by_user_id is distinct from old.added_by_user_id
    or new.dependency_type is distinct from old.dependency_type
    or new.description is distinct from old.description
    or new.expected_by is distinct from old.expected_by
    or new.created_at is distinct from old.created_at
    or action_id is null
    or not exists (
      select 1 from complaints.government_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.actor_user_id = new.resolved_by_user_id
        and action.action_type = 'resolve_external_dependency'
        and action.state = 'claimed'
    ) then
    raise exception using errcode = '55000', message = 'COMPLAINT_EXTERNAL_DEPENDENCY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_external_dependencies_validate_mutation
before update or delete on complaints.complaint_external_dependencies
for each row execute function complaints.validate_external_dependency_mutation();

create trigger government_role_capabilities_set_updated_at
before update on complaints.government_role_capabilities
for each row execute function private.set_updated_at();

create function complaints.validate_government_action_request_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or old.state <> 'claimed'
    or new.id is distinct from old.id
    or new.actor_user_id is distinct from old.actor_user_id
    or new.complaint_id is distinct from old.complaint_id
    or new.action_type is distinct from old.action_type
    or new.idempotency_key_hash is distinct from old.idempotency_key_hash
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.request_id is distinct from old.request_id
    or new.from_status is distinct from old.from_status
    or new.claimed_at is distinct from old.claimed_at
    or complaints.current_action_request_id() is distinct from old.id
    or not (
      (new.state = 'claimed' and new.response_payload is null and new.completed_at is null)
      or (new.state = 'completed' and new.response_payload is not null and new.completed_at is not null)
    ) then
    raise exception using errcode = '55000', message = 'GOVERNMENT_ACTION_REQUEST_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger government_action_requests_validate_mutation
before update or delete on complaints.government_action_requests
for each row execute function complaints.validate_government_action_request_mutation();

create trigger complaint_internal_notes_append_only
before update or delete on complaints.complaint_internal_notes
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_work_references_append_only
before update or delete on complaints.complaint_work_references
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_resolutions_append_only
before update or delete on complaints.complaint_resolutions
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_resolution_evidence_links_append_only
before update or delete on complaints.complaint_resolution_evidence_links
for each row execute function complaints.reject_append_only_mutation();
create trigger government_action_audit_events_append_only
before update or delete on complaints.government_action_audit_events
for each row execute function complaints.reject_append_only_mutation();
create trigger notification_outbox_append_only
before update or delete on complaints.notification_outbox
for each row execute function complaints.reject_append_only_mutation();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'government_role_capabilities',
    'government_status_transition_rules',
    'government_action_requests',
    'government_action_audit_events',
    'complaint_internal_notes',
    'complaint_inspections',
    'complaint_work_references',
    'complaint_external_dependencies',
    'complaint_resolution_evidence',
    'complaint_resolutions',
    'complaint_resolution_evidence_links',
    'notification_outbox'
  ]
  loop
    execute format('alter table complaints.%I enable row level security', table_name);
    execute format('alter table complaints.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all privileges on all tables in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all sequences in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;

create function complaints.is_verified_assignment_scope(
  p_authority_id uuid,
  p_local_body_id uuid,
  p_ward_id uuid,
  p_department_id uuid,
  p_authority_department_id uuid,
  p_officer_role_id uuid,
  p_officer_assignment_id uuid,
  p_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_verified_governance_authority(p_authority_id)
    and exists (
      select 1 from governance.authorities as authority
      where authority.id = p_authority_id and authority.is_routing_eligible
    )
    and exists (
      select 1 from governance.local_bodies as local_body
      where local_body.id = p_local_body_id
        and local_body.authority_id = p_authority_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
    )
    and (
      p_ward_id is null or exists (
        select 1 from governance.wards as ward
        where ward.id = p_ward_id
          and ward.local_body_id = p_local_body_id
          and ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and ward.is_routing_eligible
      )
    )
    and exists (
      select 1
      from governance.authority_departments as authority_department
      inner join governance.departments as department
        on department.id = authority_department.department_id
      where authority_department.id = p_authority_department_id
        and authority_department.authority_id = p_authority_id
        and authority_department.department_id = p_department_id
        and authority_department.status = 'active'
        and authority_department.verification_status = 'verified'
        and not authority_department.is_placeholder
        and authority_department.is_routing_eligible
        and department.status = 'active'
        and department.verification_status = 'verified'
        and not department.is_placeholder
        and department.is_routing_eligible
    )
    and exists (
      select 1 from governance.officer_roles as officer_role
      where officer_role.id = p_officer_role_id
        and officer_role.status = 'active'
        and officer_role.verification_status = 'verified'
        and not officer_role.is_placeholder
        and officer_role.is_routing_eligible
    )
    and (
      p_officer_assignment_id is null or exists (
        select 1
        from governance.officer_assignments as officer_assignment
        inner join governance.officers as officer on officer.id = officer_assignment.officer_id
        where officer_assignment.id = p_officer_assignment_id
          and officer_assignment.authority_id = p_authority_id
          and officer_assignment.local_body_id = p_local_body_id
          and officer_assignment.ward_id is not distinct from p_ward_id
          and officer_assignment.authority_department_id = p_authority_department_id
          and officer_assignment.officer_role_id = p_officer_role_id
          and officer_assignment.status = 'active'
          and officer_assignment.verification_status = 'verified'
          and not officer_assignment.is_placeholder
          and officer_assignment.effective_from <= p_at
          and (officer_assignment.effective_to is null or officer_assignment.effective_to > p_at)
          and officer.status = 'active'
          and officer.verification_status = 'verified'
          and not officer.is_placeholder
      )
    );
$$;

create function complaints.role_capability_enabled(
  capability complaints.government_role_capabilities,
  capability_name text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case capability_name
    when 'view' then capability.can_view
    when 'acknowledge' then capability.can_acknowledge
    when 'assign' then capability.can_assign
    when 'transfer' then capability.can_transfer
    when 'update_status' then capability.can_update_status
    when 'add_internal_note' then capability.can_add_internal_note
    when 'schedule_inspection' then capability.can_manage_inspection
    when 'complete_inspection' then capability.can_manage_inspection
    when 'add_work_reference' then capability.can_add_work_reference
    when 'add_external_dependency' then capability.can_add_external_dependency
    when 'resolve_external_dependency' then capability.can_add_external_dependency
    when 'upload_resolution_evidence' then capability.can_upload_resolution_evidence
    when 'submit_resolution' then capability.can_submit_resolution
    else false
  end;
$$;

create function complaints.actor_can_access_assignment(
  p_actor_user_id uuid,
  p_assignment_id uuid,
  p_capability text,
  p_scope_role_assignment_id uuid default null,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaint_assignments as assignment
    inner join public.user_roles as user_role on user_role.user_id = p_actor_user_id
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join complaints.government_role_capabilities as capability
      on capability.role_id = role.id
    where assignment.id = p_assignment_id
      and assignment.status = 'active'
      and assignment.effective_to is null
      and profile.status = 'active'
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and complaints.role_capability_enabled(capability, p_capability)
      and (
        p_capability not in ('assign', 'transfer')
        or user_role.scope_type in ('global', 'authority')
      )
      and (
        (role.code = 'platform_admin' and user_role.scope_type = 'global')
        or (
          user_role.authority_id = assignment.authority_id
          and private.is_verified_governance_authority(assignment.authority_id)
          and exists (
            select 1 from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = assignment.authority_id
              and membership.status = 'active'
              and membership.effective_from <= p_at
              and (membership.effective_until is null or membership.effective_until > p_at)
          )
          and (
            (user_role.scope_type = 'authority' and user_role.scope_id = assignment.authority_id)
            or (user_role.scope_type = 'ward' and user_role.scope_id = assignment.ward_id)
            or (
              user_role.scope_type = 'department'
              and user_role.scope_id = assignment.authority_department_id
            )
          )
        )
      )
  );
$$;

create function complaints.assignment_has_current_verified_officer(
  p_assignment_id uuid,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaint_assignments as assignment
    where assignment.id = p_assignment_id
      and assignment.officer_assignment_id is not null
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        p_at
      )
  );
$$;

create function complaints.assignment_summary(p_assignment_id uuid)
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
    'endedAt', assignment.effective_to
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

create function public.list_government_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null,
  p_scope_role_assignment_id uuid default null,
  p_queue text default null,
  p_statuses text[] default null,
  p_category_id uuid default null,
  p_ward_id uuid default null,
  p_authority_department_id uuid default null,
  p_officer_assignment_id uuid default null,
  p_submitted_from timestamptz default null,
  p_submitted_to timestamptz default null,
  p_search text default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null))
    or (p_queue is not null and p_queue not in (
      'new', 'unassigned', 'assigned', 'reopened', 'transferred',
      'awaiting_citizen_verification'
    ))
    or (p_search is not null and (
      btrim(p_search) = '' or char_length(p_search) > 120
    ))
    or (p_submitted_from is not null and p_submitted_to is not null
      and p_submitted_to <= p_submitted_from) then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  return query
  select
    complaint.id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.submitted_at,
    complaint.updated_at,
    complaint.workflow_version,
    complaints.assignment_summary(assignment.id),
    jsonb_build_object(
      'isUnassigned', not complaints.assignment_has_current_verified_officer(
        assignment.id,
        current_timestamp
      ),
      'isReopened', complaint.current_status = 'reopened',
      'isTransferred', complaint.current_status = 'transferred',
      'isAwaitingCitizenVerification',
        complaint.current_status = 'citizen_verification_pending'
    )
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join routing.issue_categories as category on category.id = complaint.category_id
  where complaints.actor_can_access_assignment(
      p_actor_user_id,
      assignment.id,
      'view',
      p_scope_role_assignment_id,
      current_timestamp
    )
    and (p_statuses is null or complaint.current_status = any(p_statuses))
    and (p_category_id is null or complaint.category_id = p_category_id)
    and (p_ward_id is null or assignment.ward_id = p_ward_id)
    and (
      p_authority_department_id is null
      or assignment.authority_department_id = p_authority_department_id
    )
    and (
      p_officer_assignment_id is null
      or (
        assignment.officer_assignment_id = p_officer_assignment_id
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
    )
    and (p_submitted_from is null or complaint.submitted_at >= p_submitted_from)
    and (p_submitted_to is null or complaint.submitted_at < p_submitted_to)
    and (
      p_search is null
      or complaint.complaint_number ilike '%' || btrim(p_search) || '%'
    )
    and (
      p_queue is null
      or (p_queue = 'new' and complaint.current_status = 'submitted')
      or (
        p_queue = 'unassigned'
        and not complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (
        p_queue = 'assigned'
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (p_queue = 'reopened' and complaint.current_status = 'reopened')
      or (p_queue = 'transferred' and complaint.current_status = 'transferred')
      or (
        p_queue = 'awaiting_citizen_verification'
        and complaint.current_status = 'citizen_verification_pending'
      )
    )
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit + 1;
end;
$$;

create function complaints.action_is_state_eligible(
  p_action_type text,
  p_status text,
  p_complaint_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_action_type = 'add_internal_note' then true
    when p_action_type = 'upload_resolution_evidence' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type = 'finalize_resolution_evidence' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type = 'assign' then p_status not in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
      'rejected', 'cancelled'
    )
    when p_action_type in ('acknowledge', 'schedule_inspection') then exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = p_action_type and rule.from_status = p_status
    )
    when p_action_type = 'transfer' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'transfer' and rule.from_status = p_status
      )
      and not exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id
          and inspection.status = 'scheduled'
      )
      and not exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id
          and dependency.status = 'active'
      )
    when p_action_type = 'update_status' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'update_status' and rule.from_status = p_status
      )
      and not exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id
          and inspection.status = 'scheduled'
      )
      and not exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id
          and dependency.status = 'active'
      )
    when p_action_type = 'complete_inspection' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'complete_inspection' and rule.from_status = p_status
      ) and exists (
        select 1 from complaints.complaint_inspections as inspection
        where inspection.complaint_id = p_complaint_id and inspection.status = 'scheduled'
      )
    when p_action_type = 'add_work_reference' then
      p_status in ('work_order_created', 'work_in_progress') or exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'add_work_reference' and rule.from_status = p_status
      )
    when p_action_type = 'add_external_dependency' then
      p_status in ('waiting_for_material', 'waiting_for_external_agency') or exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'add_external_dependency' and rule.from_status = p_status
      )
    when p_action_type = 'resolve_external_dependency' then
      exists (
        select 1 from complaints.government_status_transition_rules as rule
        where rule.action_type = 'resolve_external_dependency' and rule.from_status = p_status
      ) and exists (
        select 1 from complaints.complaint_external_dependencies as dependency
        where dependency.complaint_id = p_complaint_id and dependency.status = 'active'
      )
    when p_action_type = 'submit_resolution' then exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'submit_resolution' and rule.from_status = p_status
    )
    else false
  end;
$$;

create function public.get_government_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb,
  description text,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_verification_status text,
  location_verification_score numeric,
  routing_summary jsonb,
  media jsonb,
  assignment_history jsonb,
  timeline jsonb,
  internal_notes jsonb,
  inspections jsonb,
  work_references jsonb,
  external_dependencies jsonb,
  resolution_evidence jsonb,
  allowed_actions text[],
  allowed_status_transitions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id,
    complaint.complaint_number,
    complaint.category_id,
    category.name,
    complaint.current_status,
    complaint.submitted_at,
    complaint.updated_at,
    complaint.workflow_version,
    complaints.assignment_summary(assignment.id),
    jsonb_build_object(
      'isUnassigned', not complaints.assignment_has_current_verified_officer(
        assignment.id,
        current_timestamp
      ),
      'isReopened', complaint.current_status = 'reopened',
      'isTransferred', complaint.current_status = 'transferred',
      'isAwaitingCitizenVerification',
        complaint.current_status = 'citizen_verification_pending'
    ),
    complaint.description,
    extensions.st_x(location.location),
    extensions.st_y(location.location),
    location.accuracy_meters,
    location.provider,
    location.captured_at,
    location.verification_status,
    location.verification_score,
    jsonb_build_object(
      'decisionStatus', routing_decision.decision_status,
      'confidenceScore', routing_decision.confidence_score,
      'explanationCode', routing_decision.explanation_codes[1],
      'fallbackUsed', routing_decision.fallback_depth > 0,
      'fallbackDepth', routing_decision.fallback_depth,
      'resolvedAt', routing_decision.resolved_at
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', complaint_media.id,
        'kind', complaint_media.media_kind,
        'mimeType', coalesce(complaint_media.observed_mime_type, complaint_media.declared_mime_type),
        'byteSize', coalesce(complaint_media.observed_byte_size, complaint_media.declared_byte_size),
        'capturedAt', complaint_media.captured_at,
        'widthPixels', complaint_media.width_pixels,
        'heightPixels', complaint_media.height_pixels,
        'durationMilliseconds', case when complaint_media.duration_seconds is null then null
          else round(complaint_media.duration_seconds * 1000)::bigint end,
        'processingStatus', complaint_media.processing_status,
        'moderationStatus', complaint_media.moderation_status
      ) order by complaint_media.created_at, complaint_media.id)
      from complaints.complaint_media as complaint_media
      where complaint_media.draft_id = complaint.draft_id
        and complaint_media.upload_status = 'finalized'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(complaints.assignment_summary(history.id)
        order by history.version, history.id)
      from complaints.complaint_assignments as history
      where history.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'sequence', event.sequence,
        'fromStatus', event.from_status,
        'toStatus', event.to_status,
        'reasonCode', event.reason_code,
        'publicMessage', event.public_message,
        'occurredAt', event.occurred_at
      ) order by event.sequence)
      from complaints.complaint_status_history as event
      where event.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.id,
        'body', note.body,
        'authorDisplayName', author.display_name,
        'createdAt', note.created_at
      ) order by note.created_at, note.id)
      from complaints.complaint_internal_notes as note
      left join public.profiles as author on author.id = note.author_user_id
      where note.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', inspection.id,
        'status', inspection.status,
        'scheduledFor', inspection.scheduled_for,
        'instructions', inspection.instructions,
        'outcome', inspection.outcome,
        'summary', inspection.summary,
        'completedAt', inspection.completed_at,
        'createdAt', inspection.created_at
      ) order by inspection.created_at, inspection.id)
      from complaints.complaint_inspections as inspection
      where inspection.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', work.id,
        'referenceType', work.reference_type,
        'referenceNumber', work.reference_number,
        'description', work.description,
        'createdAt', work.created_at
      ) order by work.created_at, work.id)
      from complaints.complaint_work_references as work
      where work.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dependency.id,
        'dependencyType', dependency.dependency_type,
        'description', dependency.description,
        'expectedBy', dependency.expected_by,
        'status', dependency.status,
        'resolutionSummary', dependency.resolution_summary,
        'resolvedAt', dependency.resolved_at,
        'createdAt', dependency.created_at
      ) order by dependency.created_at, dependency.id)
      from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = complaint.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'uploadStatus', evidence.upload_status,
        'availableForResolution',
          evidence.upload_status = 'finalized'
          and evidence.assignment_id = assignment.id
          and not exists (
            select 1
            from complaints.complaint_resolution_evidence_links as used_evidence
            where used_evidence.evidence_id = evidence.id
          ),
        'capturedAt', evidence.captured_at,
        'finalizedAt', evidence.finalized_at,
        'createdAt', evidence.created_at
      ) order by evidence.created_at, evidence.id)
      from complaints.complaint_resolution_evidence as evidence
      where evidence.complaint_id = complaint.id
    ), '[]'::jsonb),
    array(
      select action_name
      from unnest(array[
        'acknowledge', 'assign', 'transfer', 'update_status', 'add_internal_note',
        'schedule_inspection', 'complete_inspection', 'add_work_reference',
        'add_external_dependency', 'resolve_external_dependency',
        'upload_resolution_evidence', 'submit_resolution'
      ]::text[]) as action_name
      where complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, action_name,
        p_scope_role_assignment_id, current_timestamp
      )
        and complaints.action_is_state_eligible(
          action_name,
          complaint.current_status,
          complaint.id
        )
        and (
          action_name = 'add_internal_note'
          or (
            action_name = 'upload_resolution_evidence'
            and complaint.current_status not in (
              'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
              'rejected', 'cancelled'
            )
          )
          or (
            action_name in ('acknowledge', 'transfer', 'schedule_inspection')
            and exists (
              select 1
              from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = action_name
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'assign'
            and complaint.current_status not in (
              'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed',
              'rejected', 'cancelled'
            )
          )
          or (
            action_name = 'update_status'
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'update_status'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'complete_inspection'
            and exists (
              select 1 from complaints.complaint_inspections as pending_inspection
              where pending_inspection.complaint_id = complaint.id
                and pending_inspection.status = 'scheduled'
            )
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'complete_inspection'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'add_work_reference'
            and (
              complaint.current_status in ('work_order_created', 'work_in_progress')
              or exists (
                select 1 from complaints.government_status_transition_rules as action_rule
                where action_rule.action_type = 'add_work_reference'
                  and action_rule.from_status = complaint.current_status
              )
            )
          )
          or (
            action_name = 'add_external_dependency'
            and (
              complaint.current_status in ('waiting_for_material', 'waiting_for_external_agency')
              or exists (
                select 1 from complaints.government_status_transition_rules as action_rule
                where action_rule.action_type = 'add_external_dependency'
                  and action_rule.from_status = complaint.current_status
              )
            )
          )
          or (
            action_name = 'resolve_external_dependency'
            and exists (
              select 1 from complaints.complaint_external_dependencies as open_dependency
              where open_dependency.complaint_id = complaint.id
                and open_dependency.status = 'active'
            )
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'resolve_external_dependency'
                and action_rule.from_status = complaint.current_status
            )
          )
          or (
            action_name = 'submit_resolution'
            and exists (
              select 1 from complaints.government_status_transition_rules as action_rule
              where action_rule.action_type = 'submit_resolution'
                and action_rule.from_status = complaint.current_status
            )
            and exists (
              select 1 from complaints.complaint_resolution_evidence as ready_evidence
              where ready_evidence.complaint_id = complaint.id
                and ready_evidence.assignment_id = assignment.id
                and ready_evidence.upload_status = 'finalized'
                and not exists (
                  select 1 from complaints.complaint_resolution_evidence_links as used_evidence
                  where used_evidence.evidence_id = ready_evidence.id
                )
            )
            and not exists (
              select 1 from complaints.complaint_external_dependencies as open_dependency
              where open_dependency.complaint_id = complaint.id
                and open_dependency.status = 'active'
            )
          )
        )
      order by action_name
    ),
    array(
      select distinct rule.to_status
      from complaints.government_status_transition_rules as rule
      where rule.action_type = 'update_status'
        and rule.from_status = complaint.current_status
        and complaints.action_is_state_eligible(
          'update_status',
          complaint.current_status,
          complaint.id
        )
      order by rule.to_status
    )
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join routing.issue_categories as category on category.id = complaint.category_id
  inner join complaints.complaint_location_evidence as location
    on location.id = complaint.location_evidence_id
  inner join routing.routing_decisions as routing_decision
    on routing_decision.id = complaint.routing_decision_id
  where complaint.id = p_complaint_id
    and complaints.actor_can_access_assignment(
      p_actor_user_id, assignment.id, 'view',
      p_scope_role_assignment_id, current_timestamp
    );
$$;

create function public.list_government_assignment_options(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (
  complaint_id uuid,
  workflow_version bigint,
  options jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id,
    complaint.workflow_version,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'officerAssignmentId', officer_assignment.id,
        'authorityDepartmentId', officer_assignment.authority_department_id,
        'departmentId', authority_department.department_id,
        'departmentName', department.name,
        'wardId', officer_assignment.ward_id,
        'wardName', ward.name,
        'officerRoleId', officer_assignment.officer_role_id,
        'officerRoleName', officer_role.name,
        'officerName', officer.full_name,
        'allowedActions', case
          when officer_assignment.ward_id is not distinct from assignment.ward_id
            and authority_department.department_id = assignment.department_id
            and officer_assignment.authority_department_id = assignment.authority_department_id
            and officer_assignment.officer_role_id = assignment.officer_role_id
          then jsonb_build_array('assign')
          else jsonb_build_array('transfer')
        end
      ) order by department.name, officer_role.name, officer.full_name, officer_assignment.id)
      from governance.officer_assignments as officer_assignment
      inner join governance.authority_departments as authority_department
        on authority_department.id = officer_assignment.authority_department_id
      inner join governance.departments as department
        on department.id = authority_department.department_id
      inner join governance.officer_roles as officer_role
        on officer_role.id = officer_assignment.officer_role_id
      inner join governance.officers as officer on officer.id = officer_assignment.officer_id
      left join governance.wards as ward on ward.id = officer_assignment.ward_id
      where officer_assignment.authority_id = assignment.authority_id
        and officer_assignment.local_body_id = assignment.local_body_id
        and officer_assignment.id is distinct from assignment.officer_assignment_id
        and officer_assignment.status = 'active'
        and officer_assignment.verification_status = 'verified'
        and not officer_assignment.is_placeholder
        and officer_assignment.effective_from <= current_timestamp
        and (
          officer_assignment.effective_to is null
          or officer_assignment.effective_to > current_timestamp
        )
        and complaints.is_verified_assignment_scope(
          officer_assignment.authority_id,
          officer_assignment.local_body_id,
          officer_assignment.ward_id,
          authority_department.department_id,
          officer_assignment.authority_department_id,
          officer_assignment.officer_role_id,
          officer_assignment.id,
          current_timestamp
        )
    ), '[]'::jsonb)
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where complaint.id = p_complaint_id
    and (
      complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, 'assign',
        p_scope_role_assignment_id, current_timestamp
      )
      or complaints.actor_can_access_assignment(
        p_actor_user_id, assignment.id, 'transfer',
        p_scope_role_assignment_id, current_timestamp
      )
    );
$$;

create function public.get_government_resolution_evidence_object(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_scope_role_assignment_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  evidence_id uuid,
  complaint_id uuid,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_status text,
  upload_expires_at timestamptz,
  workflow_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    evidence.id,
    evidence.complaint_id,
    evidence.bucket_id,
    evidence.object_path,
    evidence.declared_mime_type,
    evidence.declared_byte_size,
    evidence.client_sha256,
    evidence.observed_mime_type,
    evidence.observed_byte_size,
    evidence.upload_status,
    evidence.upload_expires_at,
    complaint.workflow_version
  from complaints.complaint_resolution_evidence as evidence
  inner join complaints.complaints as complaint
    on complaint.id = evidence.complaint_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = evidence.complaint_id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where evidence.id = p_evidence_id
    and evidence.complaint_id = p_complaint_id
    and p_purpose in ('view', 'finalize')
    and (p_purpose = 'view' or evidence.assignment_id = assignment.id)
    and complaints.actor_can_access_assignment(
      p_actor_user_id, assignment.id,
      case when p_purpose = 'finalize' then 'upload_resolution_evidence' else 'view' end,
      p_scope_role_assignment_id, current_timestamp
    );
$$;

create function complaints.action_capability(p_action_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_action_type
    when 'acknowledge' then 'acknowledge'
    when 'assign' then 'assign'
    when 'transfer' then 'transfer'
    when 'update_status' then 'update_status'
    when 'add_internal_note' then 'add_internal_note'
    when 'schedule_inspection' then 'schedule_inspection'
    when 'complete_inspection' then 'complete_inspection'
    when 'add_work_reference' then 'add_work_reference'
    when 'add_external_dependency' then 'add_external_dependency'
    when 'resolve_external_dependency' then 'add_external_dependency'
    when 'upload_resolution_evidence' then 'upload_resolution_evidence'
    when 'finalize_resolution_evidence' then 'upload_resolution_evidence'
    when 'submit_resolution' then 'submit_resolution'
    else null
  end;
$$;

create function public.perform_government_complaint_action(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_action_type text,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_payload jsonb default '{}'::jsonb
)
returns table (response_payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  capability_name text := complaints.action_capability(p_action_type);
  next_status text;
  reason_code text;
  public_message text;
  entity_id uuid;
  next_assignment_id uuid;
  target record;
  scheduled_inspection complaints.complaint_inspections%rowtype;
  dependency complaints.complaint_external_dependencies%rowtype;
  resolution_id uuid;
  evidence_ids uuid[];
  history_id uuid;
  response jsonb;
  scheduled_for timestamptz;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or capability_name is null
    or p_action_type in ('upload_resolution_evidence', 'finalize_resolution_evidence')
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
      or existing_action.request_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    if existing_action.state <> 'completed' then
      raise exception using errcode = '55000', message = 'COMPLAINT_ACTION_IN_PROGRESS';
    end if;

    select current_assignment.* into assignment
    from complaints.complaint_assignments as current_assignment
    where current_assignment.complaint_id = p_complaint_id
      and current_assignment.status = 'active'
      and current_assignment.effective_to is null;

    if not found or not complaints.actor_can_access_assignment(
      p_actor_user_id, assignment.id, capability_name, null, operation_at
    ) then
      raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
    end if;

    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null
  for update;

  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment.id, capability_name, null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;

  if not complaints.action_is_state_eligible(
    p_action_type, complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, p_action_type, p_idempotency_key_hash,
    p_request_fingerprint, p_request_id, complaint.current_status, complaint.current_status
  )
  on conflict (actor_user_id, idempotency_key_hash) do nothing;

  if not found then
    select action.* into existing_action
    from complaints.government_action_requests as action
    where action.actor_user_id = p_actor_user_id
      and action.idempotency_key_hash = p_idempotency_key_hash;
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> p_action_type
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  perform set_config('local_wellness.government_action_id', action_id::text, true);
  next_status := complaint.current_status;

  if p_action_type = 'acknowledge' then
    if p_payload - array['publicMessage'] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    next_status := 'acknowledged';
    reason_code := 'COMPLAINT_ACKNOWLEDGED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');

  elsif p_action_type in ('assign', 'transfer') then
    if p_payload - array['officerAssignmentId', 'reason', 'note'] <> '{}'::jsonb
      or not (p_payload ?& array['officerAssignmentId', 'reason']) then
      raise exception using errcode = '22023', message = 'OFFICER_ASSIGNMENT_REQUIRED';
    end if;

    begin
      select
        officer_assignment.id,
        officer_assignment.authority_id,
        officer_assignment.local_body_id,
        officer_assignment.ward_id,
        authority_department.department_id,
        officer_assignment.authority_department_id,
        officer_assignment.officer_role_id,
        null::uuid as assigned_user_id
      into target
      from governance.officer_assignments as officer_assignment
      inner join governance.authority_departments as authority_department
        on authority_department.id = officer_assignment.authority_department_id
      inner join governance.officers as officer on officer.id = officer_assignment.officer_id
      where officer_assignment.id = (p_payload ->> 'officerAssignmentId')::uuid
        and officer_assignment.authority_id = assignment.authority_id
        and officer_assignment.local_body_id = assignment.local_body_id
        and complaints.is_verified_assignment_scope(
          officer_assignment.authority_id,
          officer_assignment.local_body_id,
          officer_assignment.ward_id,
          authority_department.department_id,
          officer_assignment.authority_department_id,
          officer_assignment.officer_role_id,
          officer_assignment.id,
          operation_at
        );
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'OFFICER_ASSIGNMENT_INVALID';
    end;

    if target.id is null
      or target.id is not distinct from assignment.officer_assignment_id
      or (p_action_type = 'assign' and (
        target.ward_id is distinct from assignment.ward_id
        or target.department_id <> assignment.department_id
        or target.authority_department_id <> assignment.authority_department_id
        or target.officer_role_id <> assignment.officer_role_id
      ))
      or (p_action_type = 'transfer'
        and target.ward_id is not distinct from assignment.ward_id
        and target.department_id = assignment.department_id
        and target.authority_department_id = assignment.authority_department_id
        and target.officer_role_id = assignment.officer_role_id)
      or (
        p_action_type = 'assign'
        and p_payload ->> 'reason' not in (
          'initial_assignment', 'workload_balance', 'officer_unavailable',
          'specialist_required', 'routing_correction'
        )
      )
      or (
        p_action_type = 'transfer'
        and p_payload ->> 'reason' not in (
          'incorrect_department', 'specialist_required', 'routing_correction',
          'operational_transfer'
        )
      ) then
      raise exception using errcode = '23514', message = 'OFFICER_ASSIGNMENT_INVALID';
    end if;

    update complaints.complaint_assignments as current_assignment
    set
      status = 'superseded',
      effective_to = operation_at,
      ended_by_user_id = p_actor_user_id
    where current_assignment.id = assignment.id;

    next_assignment_id := gen_random_uuid();
    insert into complaints.complaint_assignments (
      id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
      department_id, authority_department_id, officer_role_id, officer_assignment_id,
      asset_type_id, asset_id, asset_version_id, asset_ownership_version_id,
      assignment_source, status, assigned_at, version, effective_from,
      assigned_by_user_id, assigned_user_id, supersedes_assignment_id, reason_code
    ) values (
      next_assignment_id, complaint.id, assignment.routing_decision_id,
      target.authority_id, target.local_body_id, target.ward_id,
      target.department_id, target.authority_department_id, target.officer_role_id, target.id,
      assignment.asset_type_id, assignment.asset_id, assignment.asset_version_id,
      assignment.asset_ownership_version_id,
      case when p_action_type = 'transfer' then 'government_transfer'
        when assignment.officer_assignment_id is null then 'government_assignment'
        else 'government_reassignment' end,
      'active', operation_at, assignment.version + 1, operation_at,
      p_actor_user_id, target.assigned_user_id, assignment.id, p_payload ->> 'reason'
    );
    select created_assignment.* into assignment
    from complaints.complaint_assignments as created_assignment
    where created_assignment.id = next_assignment_id;
    entity_id := next_assignment_id;
    if p_action_type = 'transfer' and complaint.current_status <> 'transferred' then
      next_status := 'transferred';
      reason_code := 'COMPLAINT_TRANSFERRED';
    elsif p_action_type = 'assign' and exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'assign'
        and rule.from_status = complaint.current_status
        and rule.to_status = 'assigned'
    ) then
      next_status := 'assigned';
      reason_code := 'COMPLAINT_ASSIGNED';
    end if;
    if nullif(btrim(p_payload ->> 'note'), '') is not null then
      insert into complaints.complaint_internal_notes (
        complaint_id, assignment_id, author_user_id, body
      ) values (
        complaint.id, next_assignment_id, p_actor_user_id, btrim(p_payload ->> 'note')
      );
    end if;

  elsif p_action_type = 'update_status' then
    if p_payload - array['status', 'publicMessage'] <> '{}'::jsonb
      or not (p_payload ? 'status') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    next_status := p_payload ->> 'status';
    if next_status = complaint.current_status then
      raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
    end if;
    if exists (
      select 1 from complaints.complaint_inspections as active_inspection
      where active_inspection.complaint_id = complaint.id
        and active_inspection.status = 'scheduled'
    ) or exists (
      select 1 from complaints.complaint_external_dependencies as active_dependency
      where active_dependency.complaint_id = complaint.id
        and active_dependency.status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
    end if;
    reason_code := 'GOVERNMENT_STATUS_UPDATED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');

  elsif p_action_type = 'add_internal_note' then
    if p_payload - array['body'] <> '{}'::jsonb or not (p_payload ? 'body') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    insert into complaints.complaint_internal_notes (
      id, complaint_id, assignment_id, author_user_id, body
    ) values (
      entity_id, complaint.id, assignment.id, p_actor_user_id, btrim(p_payload ->> 'body')
    );

  elsif p_action_type = 'schedule_inspection' then
    if p_payload - array['scheduledFor', 'instructions'] <> '{}'::jsonb
      or not (p_payload ? 'scheduledFor') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      scheduled_for := (p_payload ->> 'scheduledFor')::timestamptz;
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if scheduled_for <= operation_at then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    begin
      insert into complaints.complaint_inspections (
        id, complaint_id, assignment_id, scheduled_for, instructions,
        scheduled_by_user_id
      ) values (
        entity_id, complaint.id, assignment.id,
        scheduled_for,
        nullif(btrim(p_payload ->> 'instructions'), ''), p_actor_user_id
      );
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    next_status := 'inspection_scheduled';
    reason_code := 'INSPECTION_SCHEDULED';

  elsif p_action_type = 'complete_inspection' then
    if p_payload - array['inspectionId', 'outcome', 'summary'] <> '{}'::jsonb
      or not (p_payload ?& array['inspectionId', 'outcome', 'summary'])
      or p_payload ->> 'outcome' not in (
        'confirmed', 'not_found', 'partially_confirmed', 'access_blocked',
        'external_dependency'
      ) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      select inspection.* into scheduled_inspection
      from complaints.complaint_inspections as inspection
      where inspection.id = (p_payload ->> 'inspectionId')::uuid
        and inspection.complaint_id = complaint.id
        and inspection.status = 'scheduled'
      for update;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if not found then
      raise exception using errcode = 'P0002', message = 'COMPLAINT_INSPECTION_NOT_FOUND';
    end if;
    update complaints.complaint_inspections as inspection
    set
      status = 'completed',
      outcome = p_payload ->> 'outcome',
      summary = btrim(p_payload ->> 'summary'),
      completed_by_user_id = p_actor_user_id,
      completed_at = operation_at
    where inspection.id = scheduled_inspection.id;
    entity_id := scheduled_inspection.id;
    next_status := 'inspection_completed';
    reason_code := 'INSPECTION_COMPLETED';

  elsif p_action_type = 'add_work_reference' then
    if p_payload - array['referenceType', 'referenceNumber', 'description'] <> '{}'::jsonb
      or not (p_payload ?& array['referenceType', 'referenceNumber']) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    insert into complaints.complaint_work_references (
      id, complaint_id, assignment_id, added_by_user_id,
      reference_type, reference_number, description
    ) values (
      entity_id, complaint.id, assignment.id, p_actor_user_id,
      btrim(p_payload ->> 'referenceType'), btrim(p_payload ->> 'referenceNumber'),
      nullif(btrim(p_payload ->> 'description'), '')
    );
    if exists (
      select 1 from complaints.government_status_transition_rules as rule
      where rule.action_type = 'add_work_reference'
        and rule.from_status = complaint.current_status
        and rule.to_status = 'work_order_created'
    ) then
      next_status := 'work_order_created';
      reason_code := 'WORK_REFERENCE_ADDED';
    end if;

  elsif p_action_type = 'add_external_dependency' then
    if p_payload - array['dependencyType', 'description', 'expectedBy'] <> '{}'::jsonb
      or not (p_payload ?& array['dependencyType', 'description'])
      or p_payload ->> 'dependencyType' not in (
        'material', 'external_agency', 'permit', 'utility', 'other'
      ) then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    entity_id := gen_random_uuid();
    begin
      insert into complaints.complaint_external_dependencies (
        id, complaint_id, assignment_id, added_by_user_id,
        dependency_type, description, expected_by
      ) values (
        entity_id, complaint.id, assignment.id, p_actor_user_id,
        p_payload ->> 'dependencyType', btrim(p_payload ->> 'description'),
        case when nullif(p_payload ->> 'expectedBy', '') is null then null
          else (p_payload ->> 'expectedBy')::timestamptz end
      );
    exception when invalid_datetime_format then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if complaint.current_status in ('waiting_for_material', 'waiting_for_external_agency') then
      next_status := complaint.current_status;
    else
      next_status := case when p_payload ->> 'dependencyType' = 'material'
        then 'waiting_for_material' else 'waiting_for_external_agency' end;
    end if;
    reason_code := 'EXTERNAL_DEPENDENCY_ADDED';

  elsif p_action_type = 'resolve_external_dependency' then
    if p_payload - array['dependencyId', 'resolutionSummary'] <> '{}'::jsonb
      or not (p_payload ? 'dependencyId') then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end if;
    begin
      select candidate.* into dependency
      from complaints.complaint_external_dependencies as candidate
      where candidate.id = (p_payload ->> 'dependencyId')::uuid
        and candidate.complaint_id = complaint.id
        and candidate.status = 'active'
      for update;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
    end;
    if not found then
      raise exception using errcode = 'P0002', message = 'COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND';
    end if;
    update complaints.complaint_external_dependencies as target_dependency
    set status = 'resolved',
        resolution_summary = nullif(btrim(p_payload ->> 'resolutionSummary'), ''),
        resolved_by_user_id = p_actor_user_id,
        resolved_at = operation_at
    where target_dependency.id = dependency.id;
    entity_id := dependency.id;
    if exists (
      select 1 from complaints.complaint_external_dependencies as remaining_dependency
      where remaining_dependency.complaint_id = complaint.id
        and remaining_dependency.status = 'active'
    ) then
      next_status := complaint.current_status;
    else
      next_status := 'work_in_progress';
      reason_code := 'EXTERNAL_DEPENDENCY_RESOLVED';
    end if;

  elsif p_action_type = 'submit_resolution' then
    if p_payload - array['completionNote', 'resolutionEvidenceIds', 'publicMessage'] <> '{}'::jsonb
      or not (p_payload ?& array['completionNote', 'resolutionEvidenceIds'])
      or jsonb_typeof(p_payload -> 'resolutionEvidenceIds') <> 'array'
      or jsonb_array_length(p_payload -> 'resolutionEvidenceIds') not between 1 and 20 then
      raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    begin
      select array_agg(value::uuid order by ordinal)
      into evidence_ids
      from jsonb_array_elements_text(p_payload -> 'resolutionEvidenceIds')
        with ordinality as evidence(value, ordinal);
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
    end;
    if cardinality(evidence_ids) <> (
      select count(distinct evidence_id)::integer from unnest(evidence_ids) as evidence_id
    ) then
      raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    perform 1
    from complaints.complaint_resolution_evidence as evidence
    where evidence.id = any(evidence_ids)
    for update;
    if (
      select count(*) from complaints.complaint_resolution_evidence as evidence
      where evidence.id = any(evidence_ids)
        and evidence.complaint_id = complaint.id
        and evidence.assignment_id = assignment.id
        and evidence.upload_status = 'finalized'
        and evidence.finalized_at is not null
        and not exists (
          select 1 from complaints.complaint_resolution_evidence_links as link
          where link.evidence_id = evidence.id
        )
    ) <> cardinality(evidence_ids)
      or exists (
        select 1 from complaints.complaint_external_dependencies as open_dependency
        where open_dependency.complaint_id = complaint.id
          and open_dependency.status = 'active'
      ) then
      raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    resolution_id := gen_random_uuid();
    insert into complaints.complaint_resolutions (
      id, complaint_id, version, assignment_id, submitted_by_user_id,
      completion_note, public_message
    ) values (
      resolution_id, complaint.id,
      coalesce((select max(resolution.version) + 1
        from complaints.complaint_resolutions as resolution
        where resolution.complaint_id = complaint.id), 1),
      assignment.id, p_actor_user_id, btrim(p_payload ->> 'completionNote'),
      nullif(btrim(p_payload ->> 'publicMessage'), '')
    );
    insert into complaints.complaint_resolution_evidence_links (resolution_id, evidence_id)
    select resolution_id, evidence_id from unnest(evidence_ids) as evidence_id;
    entity_id := resolution_id;
    next_status := 'resolution_submitted';
    reason_code := 'RESOLUTION_SUBMITTED';
    public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');
  end if;

  if next_status <> complaint.current_status and not exists (
    select 1 from complaints.government_status_transition_rules as rule
    where rule.action_type = p_action_type
      and rule.from_status = complaint.current_status
      and rule.to_status = next_status
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update complaints.government_action_requests as action
  set to_status = next_status
  where action.id = action_id;

  update complaints.complaints as target_complaint
  set
    current_status = next_status,
    workflow_version = target_complaint.workflow_version + 1,
    updated_at = operation_at
  where target_complaint.id = complaint.id;

  if next_status <> complaint.current_status then
    history_id := gen_random_uuid();
    insert into complaints.complaint_status_history (
      id, complaint_id, sequence, from_status, to_status, actor_user_id,
      event_source, reason_code, public_message, request_id, occurred_at
    ) values (
      history_id, complaint.id,
      (select coalesce(max(history.sequence), 0) + 1
        from complaints.complaint_status_history as history
        where history.complaint_id = complaint.id),
      complaint.current_status, next_status, p_actor_user_id,
      'government_action', reason_code, public_message, p_request_id, operation_at
    );
    insert into complaints.notification_outbox (
      complaint_id, status_history_id, aggregate_id, payload, occurred_at
    ) values (
      complaint.id, history_id, complaint.id,
      jsonb_strip_nulls(jsonb_build_object(
        'complaintId', complaint.id,
        'complaintNumber', complaint.complaint_number,
        'status', next_status,
        'authorityId', assignment.authority_id,
        'wardId', assignment.ward_id,
        'authorityDepartmentId', assignment.authority_department_id,
        'occurredAt', operation_at
      )),
      operation_at
    );
  end if;

  response := jsonb_build_object(
    'actionId', action_id,
    'complaintId', complaint.id,
    'complaintNumber', complaint.complaint_number,
    'status', next_status,
    'workflowVersion', complaint.workflow_version + 1,
    'updatedAt', operation_at,
    'currentAssignment', complaints.assignment_summary(assignment.id)
  );

  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id,
    assignment.id, p_action_type, complaint.current_status, next_status, p_request_id,
    jsonb_strip_nulls(jsonb_build_object('entityId', entity_id)), operation_at
  );

  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

create function public.reserve_government_resolution_evidence(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_kind text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text,
  p_captured_at timestamptz default null
)
returns table (
  evidence_id uuid,
  bucket_id text,
  object_path text,
  kind text,
  declared_mime_type text,
  declared_byte_size bigint,
  upload_status text,
  upload_expires_at timestamptz,
  created_at timestamptz,
  workflow_version bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  evidence complaints.complaint_resolution_evidence%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  next_evidence_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  response jsonb;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_kind is null
    or p_kind not in ('photo', 'video')
    or p_mime_type is null
    or lower(btrim(p_mime_type)) not in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
    or (p_kind = 'photo' and lower(btrim(p_mime_type)) not like 'image/%')
    or (p_kind = 'video' and lower(btrim(p_mime_type)) not like 'video/%')
    or p_byte_size is null
    or p_byte_size not between 1 and 52428800
    or p_sha256 is null
    or p_sha256 !~ '^[0-9a-f]{64}$'
    or p_captured_at > operation_at + interval '2 minutes' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null
  for update;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment.id, 'upload_resolution_evidence', null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> complaint.id
      or existing_action.action_type <> 'upload_resolution_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_resolution_evidence as stored
    where stored.id = (existing_action.response_payload ->> 'evidenceId')::uuid
      and stored.assignment_id = assignment.id;
    if evidence.id is null then
      raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
    end if;
    -- A replay preserves the original immutable reservation. It must never make an
    -- expired object path appear eligible for a newly minted upload token.
    if evidence.upload_status = 'expired'
      or (evidence.upload_status = 'reserved' and evidence.upload_expires_at <= operation_at) then
      raise exception using
        errcode = '55000',
        message = 'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED';
    end if;
    if evidence.upload_status <> 'reserved' then
      raise exception using
        errcode = '55000',
        message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    return query select
      evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
      evidence.declared_mime_type, evidence.declared_byte_size, evidence.upload_status,
      evidence.upload_expires_at, evidence.created_at,
      (existing_action.response_payload ->> 'workflowVersion')::bigint, true;
    return;
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;

  if not complaints.action_is_state_eligible(
    'upload_resolution_evidence', complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  -- The complaint row lock serializes reservations for one complaint. Only usable,
  -- unlinked evidence consumes the bounded upload allowance.
  if (
    select count(*)
    from complaints.complaint_resolution_evidence as active_evidence
    where active_evidence.complaint_id = complaint.id
      and active_evidence.assignment_id = assignment.id
      and (
        (
          active_evidence.upload_status = 'reserved'
          and active_evidence.upload_expires_at > operation_at
        )
        or active_evidence.upload_status = 'finalized'
      )
      and not exists (
        select 1
        from complaints.complaint_resolution_evidence_links as evidence_link
        where evidence_link.evidence_id = active_evidence.id
      )
  ) >= 20 then
    raise exception using
      errcode = '23514',
      message = 'RESOLUTION_EVIDENCE_LIMIT_REACHED';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'upload_resolution_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, complaint.current_status
  ) on conflict (actor_user_id, idempotency_key_hash) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
  end if;
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  insert into complaints.complaint_resolution_evidence (
    id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
    declared_mime_type, declared_byte_size, client_sha256, captured_at,
    upload_expires_at
  ) values (
    next_evidence_id, complaint.id, assignment.id, p_actor_user_id, p_kind,
    format('%s/%s/original', complaint.id, next_evidence_id),
    lower(btrim(p_mime_type)), p_byte_size, p_sha256, p_captured_at,
    operation_at + interval '15 minutes'
  ) returning * into evidence;

  update complaints.complaints as target
  set workflow_version = target.workflow_version + 1, updated_at = operation_at
  where target.id = complaint.id;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'bucket', evidence.bucket_id,
    'objectPath', evidence.object_path,
    'kind', evidence.kind,
    'mimeType', evidence.declared_mime_type,
    'byteSize', evidence.declared_byte_size,
    'uploadStatus', evidence.upload_status,
    'expiresAt', evidence.upload_expires_at,
    'createdAt', evidence.created_at,
    'workflowVersion', complaint.workflow_version + 1
  );
  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id, assignment_id,
    action_type, from_status, to_status, request_id, metadata, occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id, assignment.id,
    'upload_resolution_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
    evidence.declared_mime_type, evidence.declared_byte_size, evidence.upload_status,
    evidence.upload_expires_at, evidence.created_at, complaint.workflow_version + 1, false;
end;
$$;

create function public.finalize_government_resolution_evidence(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_observed_mime_type text,
  p_observed_byte_size bigint,
  p_verified_sha256 text
)
returns table (
  evidence_id uuid,
  kind text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_status text,
  captured_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz,
  workflow_version bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  evidence complaints.complaint_resolution_evidence%rowtype;
  existing_action complaints.government_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  normalized_mime text := lower(btrim(p_observed_mime_type));
  response jsonb;
begin
  if p_actor_user_id is null or p_complaint_id is null or p_evidence_id is null
    or p_expected_workflow_version is null
    or p_expected_workflow_version < 1
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_observed_mime_type is null
    or normalized_mime is null
    or p_observed_byte_size is null
    or p_observed_byte_size not between 1 and 52428800
    or p_verified_sha256 is null
    or p_verified_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;
  select candidate.* into complaint
  from complaints.complaints as candidate where candidate.id = p_complaint_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active' and current_assignment.effective_to is null
  for update;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment.id, 'upload_resolution_evidence', null, operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> complaint.id
      or existing_action.action_type <> 'finalize_resolution_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence from complaints.complaint_resolution_evidence as stored
    where stored.id = p_evidence_id
      and stored.complaint_id = complaint.id
      and stored.assignment_id = assignment.id;
    if evidence.id is null then
      raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
    end if;
    return query select evidence.id, evidence.kind, evidence.observed_mime_type,
      evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
      evidence.finalized_at, evidence.created_at,
      (existing_action.response_payload ->> 'workflowVersion')::bigint, true;
    return;
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  if not complaints.action_is_state_eligible(
    'finalize_resolution_evidence', complaint.current_status, complaint.id
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;
  select stored.* into evidence
  from complaints.complaint_resolution_evidence as stored
  where stored.id = p_evidence_id
    and stored.complaint_id = complaint.id
    and stored.assignment_id = assignment.id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'RESOLUTION_EVIDENCE_NOT_FOUND';
  end if;
  if evidence.upload_status <> 'reserved' or evidence.upload_expires_at <= operation_at then
    raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;
  if evidence.declared_mime_type <> normalized_mime
    or evidence.declared_byte_size <> p_observed_byte_size
    or evidence.client_sha256 <> p_verified_sha256 then
    raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'finalize_resolution_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, complaint.current_status
  ) on conflict (actor_user_id, idempotency_key_hash) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT';
  end if;
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  update complaints.complaint_resolution_evidence as target
  set observed_mime_type = normalized_mime,
      observed_byte_size = p_observed_byte_size,
      verified_sha256 = p_verified_sha256,
      upload_status = 'finalized',
      finalized_at = operation_at,
      failure_code = null
  where target.id = evidence.id
  returning * into evidence;
  update complaints.complaints as target
  set workflow_version = target.workflow_version + 1, updated_at = operation_at
  where target.id = complaint.id;

  response := jsonb_build_object(
    'evidenceId', evidence.id, 'complaintId', complaint.id, 'kind', evidence.kind,
    'mimeType', evidence.observed_mime_type, 'byteSize', evidence.observed_byte_size,
    'uploadStatus', evidence.upload_status, 'capturedAt', evidence.captured_at,
    'finalizedAt', evidence.finalized_at, 'createdAt', evidence.created_at,
    'workflowVersion', complaint.workflow_version + 1
  );
  insert into complaints.government_action_audit_events (
    action_request_id, complaint_id, actor_user_id, authority_id, assignment_id,
    action_type, from_status, to_status, request_id, metadata, occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, assignment.authority_id, assignment.id,
    'finalize_resolution_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select evidence.id, evidence.kind, evidence.observed_mime_type,
    evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
    evidence.finalized_at, evidence.created_at, complaint.workflow_version + 1, false;
end;
$$;

create function public.expire_government_resolution_evidence(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_CLEANUP_LIMIT_INVALID';
  end if;

  perform set_config(
    'local_wellness.resolution_evidence_mutation',
    'expire',
    true
  );
  with expiring as (
    select evidence.id
    from complaints.complaint_resolution_evidence as evidence
    where evidence.upload_status = 'reserved'
      and evidence.upload_expires_at <= operation_at
    order by evidence.upload_expires_at, evidence.id
    for update skip locked
    limit p_limit
  )
  update complaints.complaint_resolution_evidence as evidence
  set upload_status = 'expired',
      failure_code = 'UPLOAD_RESERVATION_EXPIRED'
  from expiring
  where evidence.id = expiring.id;
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create function public.fail_government_resolution_evidence(
  p_evidence_id uuid,
  p_failure_code text
)
returns table (
  evidence_id uuid,
  upload_status text,
  failure_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_failure_code text := upper(btrim(p_failure_code));
begin
  if p_evidence_id is null
    or p_failure_code is null
    or normalized_failure_code is null
    or normalized_failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
    or normalized_failure_code = 'UPLOAD_RESERVATION_EXPIRED' then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_FAILURE_CODE_INVALID';
  end if;

  perform set_config(
    'local_wellness.resolution_evidence_mutation',
    'fail',
    true
  );
  return query
  update complaints.complaint_resolution_evidence as evidence
  set upload_status = 'failed',
      failure_code = normalized_failure_code
  where evidence.id = p_evidence_id
    and evidence.upload_status = 'reserved'
  returning evidence.id, evidence.upload_status, evidence.failure_code;

  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;
end;
$$;

create or replace function public.list_owned_complaints(
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
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMPLAINT_LIST_CURSOR_INVALID';
  end if;
  return query
  select
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id, category.name, complaint.current_status,
    complaint.visibility, complaint.submitted_at, complaint.updated_at,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
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

create or replace function public.get_owned_complaint(
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
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id, category.name, complaint.asset_id, complaint.description,
    complaint.description_language, complaint.custom_attributes,
    complaint.current_status, complaint.visibility, complaint.submitted_at,
    complaint.updated_at, evidence.id, extensions.st_x(evidence.location),
    extensions.st_y(evidence.location), evidence.accuracy_meters, evidence.provider,
    evidence.captured_at, evidence.device_recorded_at, evidence.mock_location_detected,
    evidence.verification_status, evidence.verification_score,
    complaint.routing_decision_id, submission.routing_request_id, assignment.id,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id, assignment.authority_department_id,
    assignment.officer_role_id
  from complaints.complaints as complaint
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  inner join routing.issue_categories as category on category.id = complaint.category_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join complaints.complaint_submission_requests as submission
    on submission.complaint_id = complaint.id
  where complaint.id = p_complaint_id
    and complaint.citizen_user_id = p_actor_user_id;
$$;

alter function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  rename to submit_complaint_phase4_impl;

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
  completed_complaint_id uuid;
begin
  select request.complaint_id into completed_complaint_id
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id
    and request.state = 'completed';

  if found then
    return query
    select
      complaint.id, complaint.draft_id, complaint.complaint_number,
      complaint.current_status, complaint.submitted_at, complaint.routing_decision_id,
      assignment.id, assignment.authority_id, assignment.local_body_id,
      assignment.ward_id, assignment.department_id, assignment.officer_role_id, true
    from complaints.complaints as complaint
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
     and assignment.status = 'active'
     and assignment.effective_to is null
    where complaint.id = completed_complaint_id;
    return;
  end if;

  return query
  select implementation.*
  from public.submit_complaint_phase4_impl(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id,
    p_acknowledged_duplicate_suggestion_ids,
    p_emergency_disclaimer_acknowledged
  ) as implementation;
end;
$$;

revoke all on function public.submit_complaint_phase4_impl(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated, service_role;

revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;

revoke all on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.get_government_complaint(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_government_assignment_options(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_government_resolution_evidence_object(
  uuid, uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.reserve_government_resolution_evidence(
  uuid, uuid, bigint, text, text, text, text, text, bigint, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.finalize_government_resolution_evidence(
  uuid, uuid, uuid, bigint, text, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.expire_government_resolution_evidence(integer)
  from public, anon, authenticated;
revoke all on function public.fail_government_resolution_evidence(uuid, text)
  from public, anon, authenticated;
revoke all on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;

grant execute on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) to service_role;
grant execute on function public.get_government_complaint(uuid, uuid, uuid)
  to service_role;
grant execute on function public.list_government_assignment_options(uuid, uuid, uuid)
  to service_role;
grant execute on function public.get_government_resolution_evidence_object(
  uuid, uuid, uuid, uuid, text
) to service_role;
grant execute on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) to service_role;
grant execute on function public.reserve_government_resolution_evidence(
  uuid, uuid, bigint, text, text, text, text, text, bigint, text, timestamptz
) to service_role;
grant execute on function public.finalize_government_resolution_evidence(
  uuid, uuid, uuid, bigint, text, text, text, text, bigint, text
) to service_role;
grant execute on function public.expire_government_resolution_evidence(integer)
  to service_role;
grant execute on function public.fail_government_resolution_evidence(uuid, text)
  to service_role;
grant execute on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  to service_role;

comment on function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) is 'Service-only, scope-authorized and exactly replayable Phase 5 government workflow mutation.';
comment on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) is 'Service-only access-scoped queue with keyset pagination and no location coordinates.';
comment on function public.expire_government_resolution_evidence(integer)
  is 'Service-only bounded cleanup for immutable upload reservations whose upload window has elapsed.';
comment on function public.fail_government_resolution_evidence(uuid, text)
  is 'Service-only guarded transition from a reserved evidence upload to a terminal technical failure.';
$migration_20260714124000_phase_5_government_workflow_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'perform_government_complaint_action')
      and pg_temp.local_wellness_function_exists('public', 'reserve_government_resolution_evidence')
      and pg_temp.local_wellness_function_exists('public', 'fail_government_resolution_evidence')
      and pg_temp.local_wellness_private_bucket_exists('resolution-evidence-private')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714124000_phase_5_government_workflow_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 23,
    cutoff_name = '20260714124000_phase_5_government_workflow_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260714124000_phase_5_government_workflow_security_and_rpc.sql';
end;
$guard_23$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714124000_phase_5_government_workflow_security_and_rpc.sql
-- ============================================================================

do $verify_part$
declare
  final_cutoff integer;
begin
  select state.cutoff_position
  into final_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if final_cutoff < 23 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_1_VERIFICATION_FAILED';
  end if;
end;
$verify_part$;

commit;
