-- Local Wellness adaptive existing-database migration — Part 2 of 2
--
-- Generated deterministically from supabase/migrations/*.sql by:
--   pnpm database:master:generate
--
-- This file contains an exact ordered slice of master.sql. It detects a coherent
-- already-complete migration prefix, skips those migrations as whole units, and
-- executes only the missing immutable source migrations. Native IF NOT EXISTS is
-- used by source migrations where definition-safe; policies, triggers, functions,
-- constraints, DML, and grants are never blindly suppressed.
-- Execute this query only after master.part-1.sql commits successfully.
-- The entire part is one transaction protected by an advisory transaction lock.
-- Any partial/non-contiguous fingerprint or source failure rolls back the part.
-- Dashboard execution does not repair supabase_migrations.schema_migrations.
-- Seed data remains intentionally separate under supabase/seed.
-- Complete source cutoff: 20260720
-- Complete source count: 48
-- Migrations in this part: 25
-- Part source range: 20260714130000_phase_6_communication_and_notification_schema.sql through 20260720103000_v1_ward_email_provenance.sql
--
-- Source manifest for this part (SHA-256 of the exact source file bytes):
-- 9be9e157aad6276476906a17a386285e4d1b0e7b69640d541d1207500f4f217e  20260714130000_phase_6_communication_and_notification_schema.sql
-- 9c5c157c8371ca191045ac2f438f9c58b4e6dae4cf24a38a4106855ad8347a9b  20260714131000_phase_6_communication_notification_security_and_rpc.sql
-- 9e199e7e117e00d955e75193e626d1a73d0b31eff7b36e0d0b975e635b1510b8  20260716100000_phase_7_accountability_schema.sql
-- 7c0f6e8b85fdff5ff330f9d308b71a1a156c26a8c1710b7babc0f1ac46824b18  20260716101000_phase_7_accountability_security_and_rpc.sql
-- daa4efd4e1857f047f79f3159f9745ae6e224a802eff259e3c012cf1b06d4f81  20260716102000_phase_8_transparency_schema.sql
-- 2c483d536852bc02e789767178d149aaaa0c0062319ba362e29211adafd20317  20260716103000_phase_8_transparency_security_and_rpc.sql
-- ae659432a586951e56149d91c4799b3c13fac76ba3aae932f1493ca8ed216c4e  20260716104000_verified_governing_body_projection.sql
-- 902d34605e9cf1c581cd1b2504a637c5e02e2456cfb8a454676bae56a6ab24f3  20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql
-- 06a25ec9659a49d222ef559f8af6dd354db7bd6a561fefd204c029e12f728dd1  20260716106000_phase_8_duplicate_group_publication.sql
-- f0b563a50149d23f2ebf3f95aefdbb1520c60dbaea24897a3add6f4c92f6a9f6  20260716110000_phase_9_sla_escalation_kpi_schema.sql
-- 22e4ce7839563b690c0c2516a409d3bcec8af14e52e0182abda1daa2e903cc73  20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql
-- 6ab94f07e47d080785014db93940c339a6a0d85d9ebc37fd3f2f6a938ad0ef4d  20260716112000_phase_10_api_hardening.sql
-- 07f658b859729addb0c7fe15ab53c2a50be37108ce8c1f41e6387ab4716dac56  20260716113000_phase_10_privileged_mfa.sql
-- 2cef00c3237e2a741d121b852d5f22fcd681ebeedcdb8d1a0604c2823c2becec  20260716114000_phase_10_citizen_phone_mfa.sql
-- 51f4a44339e26e79ab051d9c00b43d6416512595de932750f88231a1dd57f914  20260716115000_phase_10_profile_images.sql
-- 522b3c83ae3817cfc438912c7bde7b2d9e2948ef2646b51ff73dafbfce04e9b0  20260716116000_phase_10_complaint_location_proximity.sql
-- 3270d23cc41dbfccb53552dc8698642fc311095da50b89085e4cb8904ca44715  20260716117000_phase_10_routing_delivery_readiness.sql
-- 3c97e81d922b67a90c2bb7b48f387bc8a530af93154c55a617bb8dc6340f8c76  20260716118000_bmc_ward_relationship_versions.sql
-- 58d2317126be57edf611b1cde1287ca63480cfbaf202906b3be93a4c2d1cddeb  20260716119000_government_invitation_scope_options.sql
-- a2d81b05dec142d8dceb75c6db4bcbeb5c6e60257c242bb9706c351e737d764c  20260717100000_public_complaint_engagements.sql
-- 5c37f8f8175a5147d0ea6cfa3a95756f7fd510c2f31a467751d52ab522c78dc9  20260718100000_complaint_routing_evidence_diagnostics.sql
-- fdad9b29c845ba1749eb08fdb2c9d0140d6a0c926fe95692ea23e0eb9d62f411  20260718110000_governance_source_bundle_imports.sql
-- 0a199bc0773c613996c0ca52ae407a0a063d5455c7254b0a73e19c01220a635e  20260718123000_relax_routing_evidence_precision.sql
-- 3a1a35a531494fbeeea876c5b74a541fa9f9bba19a305777f7f461dbe87a002d  20260720100000_v1_simple_ward_routing.sql
-- 090e5033c0e0b354bd9b01f47ca8b2045db9ddd0a11c96481daa25f816f9ffa1  20260720103000_v1_ward_email_provenance.sql

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

create or replace function pg_temp.local_wellness_procedure_exists(p_signature text)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select pg_catalog.to_regprocedure(p_signature) is not null;
$helper$;

create or replace function pg_temp.local_wellness_function_execute_privilege(
  p_role_name text,
  p_signature text
)
returns boolean
language sql
stable
set search_path = ''
as $helper$
  select case
    when pg_catalog.to_regprocedure(p_signature) is null then false
    else pg_catalog.has_function_privilege(p_role_name, p_signature, 'EXECUTE')
  end;
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
      and pg_temp.local_wellness_procedure_exists('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)')
      and pg_temp.local_wellness_procedure_exists('public.submit_complaint_phase4_impl(uuid,uuid,uuid,uuid[],boolean)')
      and pg_temp.local_wellness_function_execute_privilege('service_role', 'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'complaint_assignments_validate_version_mutation')
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
      and pg_temp.local_wellness_function_exists('public', 'fail_notification_delivery')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaints', 'complaints_ensure_conversation')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_status_history', 'complaint_status_history_submission_outbox')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'complaint_assignments_assignment_outbox')
      and pg_temp.local_wellness_trigger_exists('complaints', 'notification_outbox', 'notification_outbox_create_job'))
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
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'complaint_assignments_initialize_sla')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_status_history', 'complaint_status_history_apply_sla')
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
  ),
  (
    43,
    '20260717100000_public_complaint_engagements.sql',
    (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')),
    (pg_temp.local_wellness_relation_exists('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_forced_rls('complaints.public_complaint_engagements')
      and pg_temp.local_wellness_function_exists('complaints', 'public_complaint_support_count')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_feed')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_engagements')
      and pg_temp.local_wellness_function_exists('public', 'set_public_complaint_engagement'))
  ),
  (
    44,
    '20260718100000_complaint_routing_evidence_diagnostics.sql',
    (pg_temp.local_wellness_function_exists('complaints', 'complete_complaint_submission_v2')),
    (pg_temp.local_wellness_function_exists('complaints', 'complaint_routing_evidence_mismatches')
      and pg_temp.local_wellness_function_exists('complaints', 'complete_complaint_submission_v2')
      and pg_temp.local_wellness_procedure_exists('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)')
      and pg_catalog.position('complaints.complete_complaint_submission_v2(' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'))) > 0
      and pg_temp.local_wellness_function_execute_privilege('service_role', 'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'))
  ),
  (
    45,
    '20260718110000_governance_source_bundle_imports.sql',
    (pg_temp.local_wellness_column_exists('governance', 'import_batches', 'source_bundle_sha256')),
    (pg_temp.local_wellness_column_exists('governance', 'import_batches', 'source_bundle_sha256')
      and pg_temp.local_wellness_constraint_exists('governance', 'import_batches', 'import_batches_source_bundle_sha256_check')
      and pg_temp.local_wellness_constraint_exists('governance', 'import_batches', 'import_batches_source_artifact_check'))
  ),
  (
    46,
    '20260718123000_relax_routing_evidence_precision.sql',
    (pg_catalog.position('extensions.st_dwithin(' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0),
    (pg_catalog.position('extensions.st_dwithin(' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0
      and pg_catalog.position('COMPLAINT_ROUTING_ACCURACY_MISMATCH' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0
      and pg_catalog.position('COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0)
  ),
  (
    47,
    '20260720100000_v1_simple_ward_routing.sql',
    (pg_temp.local_wellness_relation_exists('routing.ward_issue_contacts')),
    (pg_temp.local_wellness_relation_exists('routing.ward_issue_contacts')
      and pg_temp.local_wellness_relation_exists('complaints.ward_email_outbox')
      and pg_temp.local_wellness_forced_rls('routing.ward_issue_contacts')
      and pg_temp.local_wellness_forced_rls('complaints.ward_email_outbox')
      and pg_temp.local_wellness_function_exists('public', 'resolve_v1_ward_route')
      and pg_temp.local_wellness_function_exists('public', 'claim_v1_ward_emails')
      and pg_temp.local_wellness_function_exists('public', 'complete_v1_ward_email')
      and pg_temp.local_wellness_function_exists('public', 'fail_v1_ward_email')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'enqueue_v1_ward_email_after_assignment'))
  ),
  (
    48,
    '20260720103000_v1_ward_email_provenance.sql',
    (pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_url')),
    (pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_url')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_as_of')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_last_checked_on')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_locator')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_reported_status')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_owner_approved_for_routing')
      and pg_temp.local_wellness_constraint_exists('routing', 'ward_issue_contacts', 'ward_issue_contacts_active_email_provenance_check'))
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

  detected_cutoff := coalesce(first_missing - 1, 48);

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

  if 2 = 2 and detected_cutoff < 23 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_1_REQUIRED',
      hint = 'Execute master.part-1.sql successfully before Part 2.';
  end if;

  raise notice 'Local Wellness detected migration cutoff: % of 48', detected_cutoff;
end;
$detect_state$;


-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714130000_phase_6_communication_and_notification_schema.sql
-- ============================================================================
do $guard_24$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 24 then
    raise notice 'Skipping already-complete migration 20260714130000_phase_6_communication_and_notification_schema.sql';
    return;
  end if;

  if current_cutoff <> 23 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714130000_phase_6_communication_and_notification_schema.sql';
  end if;

  execute $migration_20260714130000_phase_6_communication_and_notification_schema$
create table complaints.conversation_rooms (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique
    references complaints.complaints (id) on delete restrict,
  visibility text not null default 'private',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint conversation_rooms_visibility_check check (
    visibility in ('private', 'public')
  ),
  constraint conversation_rooms_status_check check (
    status in ('active', 'closed')
  ),
  constraint conversation_rooms_lifecycle_check check (
    (status = 'active' and closed_at is null)
    or (status = 'closed' and closed_at is not null and closed_at >= created_at)
  )
);

alter table complaints.conversation_rooms
  add constraint conversation_rooms_id_complaint_unique unique (id, complaint_id);

create table complaints.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  member_type text not null,
  membership_source text not null,
  role_assignment_id uuid references public.user_roles (id) on delete restrict,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint room_members_type_check check (
    member_type in ('citizen', 'government', 'platform')
  ),
  constraint room_members_source_check check (
    membership_source in ('complaint_owner', 'message_sender', 'role_scope', 'system')
  ),
  constraint room_members_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint room_members_role_source_check check (
    (membership_source = 'role_scope' and role_assignment_id is not null)
    or membership_source <> 'role_scope'
  )
);

create unique index room_members_one_current_idx
  on complaints.room_members (room_id, user_id)
  where effective_to is null;

create index room_members_user_current_idx
  on complaints.room_members (user_id, room_id)
  where effective_to is null;

create table complaints.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  sender_user_id uuid not null references auth.users (id) on delete restrict,
  client_message_id uuid not null,
  body text not null,
  request_fingerprint text not null,
  request_id text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint messages_sender_client_id_unique unique (
    sender_user_id,
    client_message_id
  ),
  constraint messages_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  ),
  constraint messages_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint messages_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  )
);

alter table complaints.messages
  add constraint messages_room_complaint_fkey
    foreign key (room_id, complaint_id)
    references complaints.conversation_rooms (id, complaint_id) on delete restrict,
  add constraint messages_id_complaint_unique unique (id, complaint_id);

create index messages_room_keyset_idx
  on complaints.messages (room_id, created_at desc, id desc);

create index messages_complaint_keyset_idx
  on complaints.messages (complaint_id, created_at desc, id desc);

create table complaints.message_receipts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  read_through_message_id uuid not null
    references complaints.messages (id) on delete restrict,
  read_through_created_at timestamptz not null,
  read_at timestamptz not null default clock_timestamp(),
  event_id uuid not null unique default gen_random_uuid(),
  request_id text not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_receipts_room_user_unique unique (room_id, user_id),
  constraint message_receipts_version_check check (version >= 1),
  constraint message_receipts_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint message_receipts_time_check check (
    read_at >= read_through_created_at
  )
);

alter table complaints.message_receipts
  add constraint message_receipts_room_complaint_fkey
    foreign key (room_id, complaint_id)
    references complaints.conversation_rooms (id, complaint_id) on delete restrict,
  add constraint message_receipts_message_complaint_fkey
    foreign key (read_through_message_id, complaint_id)
    references complaints.messages (id, complaint_id) on delete restrict;

create index message_receipts_user_updated_idx
  on complaints.message_receipts (user_id, updated_at desc, id desc);

create table complaints.complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  client_message_id uuid not null,
  body text not null,
  visibility text not null default 'public',
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint complaint_comments_author_client_id_unique unique (
    author_user_id,
    client_message_id
  ),
  constraint complaint_comments_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  ),
  constraint complaint_comments_visibility_check check (visibility = 'public'),
  constraint complaint_comments_moderation_check check (
    moderation_status in ('pending', 'approved', 'rejected')
  )
);

create index complaint_comments_complaint_time_idx
  on complaints.complaint_comments (complaint_id, created_at desc, id desc);

alter table complaints.notification_outbox
  alter column status_history_id drop not null,
  add column message_id uuid unique
    references complaints.messages (id) on delete restrict,
  add column assignment_id uuid unique
    references complaints.complaint_assignments (id) on delete restrict;

alter table complaints.notification_outbox
  add constraint notification_outbox_id_complaint_unique unique (id, complaint_id);

alter table complaints.notification_outbox
  drop constraint notification_outbox_event_type_check,
  drop constraint notification_outbox_payload_check,
  add constraint notification_outbox_event_type_check check (
    event_type in (
      'complaint_submitted',
      'complaint_status_changed',
      'complaint_assignment_changed',
      'complaint_message_created'
    )
  ),
  add constraint notification_outbox_source_check check (
    num_nonnulls(status_history_id, message_id, assignment_id) = 1
  ),
  add constraint notification_outbox_event_source_check check (
    (event_type in ('complaint_submitted', 'complaint_status_changed')
      and status_history_id is not null)
    or (event_type = 'complaint_assignment_changed' and assignment_id is not null)
    or (event_type = 'complaint_message_created' and message_id is not null)
  ),
  add constraint notification_outbox_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'status', 'authorityId', 'wardId',
      'authorityDepartmentId', 'messageId', 'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'body', 'exactLocation', 'latitude', 'longitude',
        'citizenUserId', 'senderUserId', 'phone', 'email', 'objectPath',
        'signedUrl', 'token', 'pushToken'
      ]
    )
    and (event_type <> 'complaint_message_created' or payload ? 'messageId')
    and (
      event_type not in ('complaint_submitted', 'complaint_status_changed')
      or payload ? 'status'
    )
  );

create index notification_outbox_complaint_created_idx
  on complaints.notification_outbox (complaint_id, created_at, id);

create table complaints.notifications (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null
    references complaints.notification_outbox (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  recipient_user_id uuid not null references auth.users (id) on delete restrict,
  event_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_outbox_recipient_unique unique (
    outbox_id,
    recipient_user_id
  ),
  constraint notifications_event_type_check check (
    event_type in (
      'submission', 'assignment', 'acknowledgement', 'transfer', 'message',
      'status_update', 'resolution', 'reopen', 'escalation'
    )
  ),
  constraint notifications_title_check check (
    title = btrim(title) and char_length(title) between 1 and 160
  ),
  constraint notifications_body_check check (
    body = btrim(body) and char_length(body) between 1 and 1000
  ),
  constraint notifications_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'eventType', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'eventType', 'status', 'messageId',
      'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'body', 'exactLocation', 'latitude', 'longitude',
        'citizenUserId', 'senderUserId', 'phone', 'email', 'objectPath',
        'signedUrl', 'token', 'pushToken'
      ]
    )
  )
);

alter table complaints.notifications
  add constraint notifications_outbox_complaint_fkey
    foreign key (outbox_id, complaint_id)
    references complaints.notification_outbox (id, complaint_id) on delete restrict;

create index notifications_recipient_keyset_idx
  on complaints.notifications (recipient_user_id, created_at desc, id desc);

create index notifications_recipient_unread_idx
  on complaints.notifications (recipient_user_id, created_at desc, id desc)
  where read_at is null;

create table complaints.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null
    references complaints.notifications (id) on delete restrict,
  channel text not null,
  event_name text not null,
  destination_key text not null,
  device_id uuid references public.devices (id) on delete restrict,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  last_failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_destination_unique unique (
    notification_id,
    channel,
    event_name,
    destination_key
  ),
  constraint notification_deliveries_channel_check check (
    channel in ('in_app', 'realtime', 'push', 'email')
  ),
  constraint notification_deliveries_event_name_check check (
    event_name in (
      'complaint:status_changed', 'message:created', 'notification:created'
    )
  ),
  constraint notification_deliveries_destination_check check (
    destination_key = btrim(destination_key)
    and char_length(destination_key) between 38 and 80
    and destination_key ~ '^(user|device):[0-9a-f-]{36}$'
    and (
      (channel = 'push' and device_id is not null
        and destination_key = 'device:' || device_id::text)
      or (channel <> 'push' and device_id is null
        and destination_key ~ '^user:[0-9a-f-]{36}$')
    )
  ),
  constraint notification_deliveries_state_check check (
    state in ('pending', 'processing', 'retry', 'delivered', 'unsupported', 'dead')
  ),
  constraint notification_deliveries_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint notification_deliveries_worker_check check (
    leased_by is null
    or (
      leased_by = btrim(leased_by)
      and leased_by ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    )
  ),
  constraint notification_deliveries_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint notification_deliveries_lifecycle_check check (
    (state in ('pending', 'retry')
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is null)
    or (state = 'processing'
      and lease_token is not null and leased_by is not null and lease_expires_at is not null
      and delivered_at is null and attempt_count >= 1)
    or (state = 'delivered'
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is not null)
    or (state in ('unsupported', 'dead')
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is null)
  )
);

create index notification_deliveries_claim_idx
  on complaints.notification_deliveries (
    channel,
    state,
    next_attempt_at,
    created_at,
    id
  )
  where state in ('pending', 'retry', 'processing');

create index notification_deliveries_lease_expiry_idx
  on complaints.notification_deliveries (lease_expires_at, id)
  where state = 'processing';

create table complaints.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null
    references complaints.notification_deliveries (id) on delete restrict,
  attempt_number integer not null,
  event_type text not null,
  worker_id text not null,
  claim_token uuid not null,
  failure_code text,
  delivered_socket_count integer,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint notification_delivery_attempts_event_unique unique (
    delivery_id,
    attempt_number,
    event_type
  ),
  constraint notification_delivery_attempts_attempt_check check (
    attempt_number between 1 and 5
  ),
  constraint notification_delivery_attempts_event_check check (
    event_type in ('claimed', 'delivered', 'failed', 'lease_expired')
  ),
  constraint notification_delivery_attempts_worker_check check (
    worker_id = btrim(worker_id)
    and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
  ),
  constraint notification_delivery_attempts_failure_check check (
    (event_type in ('failed', 'lease_expired')
      and failure_code is not null
      and failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$')
    or (event_type not in ('failed', 'lease_expired') and failure_code is null)
  ),
  constraint notification_delivery_attempts_socket_count_check check (
    (event_type = 'delivered' and delivered_socket_count between 0 and 10000)
    or (event_type <> 'delivered' and delivered_socket_count is null)
  )
);

create index notification_delivery_attempts_delivery_time_idx
  on complaints.notification_delivery_attempts (delivery_id, occurred_at, id);

create table complaints.notification_outbox_jobs (
  outbox_id uuid primary key
    references complaints.notification_outbox (id) on delete restrict,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  worker_id text,
  lease_expires_at timestamptz,
  last_failure_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_jobs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'dead')
  ),
  constraint notification_outbox_jobs_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint notification_outbox_jobs_worker_check check (
    worker_id is null
    or (
      worker_id = btrim(worker_id)
      and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    )
  ),
  constraint notification_outbox_jobs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint notification_outbox_jobs_lifecycle_check check (
    (state in ('pending', 'retry')
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is null)
    or (state = 'processing'
      and lease_token is not null and worker_id is not null and lease_expires_at is not null
      and completed_at is null and attempt_count >= 1)
    or (state = 'completed'
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is not null)
    or (state = 'dead'
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is null)
  )
);

create index notification_outbox_jobs_claim_idx
  on complaints.notification_outbox_jobs (
    state,
    next_attempt_at,
    created_at,
    outbox_id
  )
  where state in ('pending', 'retry', 'processing');

create index notification_outbox_jobs_lease_expiry_idx
  on complaints.notification_outbox_jobs (lease_expires_at, outbox_id)
  where state = 'processing';

comment on table complaints.conversation_rooms is
  'One complaint-scoped conversation room. Phase 6 creates private rooms only.';
comment on table complaints.room_members is
  'Effective-dated participation evidence; never an authorization source.';
comment on table complaints.messages is
  'Immutable private complaint messages persisted before realtime delivery.';
comment on table complaints.message_receipts is
  'Monotonic per-user read-through position for a private complaint conversation.';
comment on table complaints.complaint_comments is
  'Structural public-comment record; no Phase 6 creation or read RPC is granted while complaints remain private.';
comment on table complaints.notifications is
  'Persistent data-minimized per-user in-app notifications.';
comment on table complaints.notification_deliveries is
  'Channel delivery state. Destinations remain referenced by user/device identifiers, never copied values.';
comment on table complaints.notification_delivery_attempts is
  'Append-only notification-delivery claim and outcome evidence.';
comment on table complaints.notification_outbox_jobs is
  'Mutable PostgreSQL lease/retry projection for the immutable notification outbox.';
$migration_20260714130000_phase_6_communication_and_notification_schema$;

  if not (pg_temp.local_wellness_relation_exists('complaints.conversation_rooms')
      and pg_temp.local_wellness_relation_exists('complaints.messages')
      and pg_temp.local_wellness_relation_exists('complaints.notifications')
      and pg_temp.local_wellness_relation_exists('complaints.notification_outbox_jobs')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714130000_phase_6_communication_and_notification_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 24,
    cutoff_name = '20260714130000_phase_6_communication_and_notification_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260714130000_phase_6_communication_and_notification_schema.sql';
end;
$guard_24$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714130000_phase_6_communication_and_notification_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260714131000_phase_6_communication_notification_security_and_rpc.sql
-- ============================================================================
do $guard_25$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 25 then
    raise notice 'Skipping already-complete migration 20260714131000_phase_6_communication_notification_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 24 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260714131000_phase_6_communication_notification_security_and_rpc.sql';
  end if;

  execute $migration_20260714131000_phase_6_communication_notification_security_and_rpc$
create function complaints.reject_immutable_communication_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are immutable.', tg_table_schema, tg_table_name);
end;
$$;

create function complaints.validate_conversation_room_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.created_at is distinct from old.created_at
    or old.status = 'closed'
    or old.visibility = 'public'
    or (old.visibility = 'private' and new.visibility not in ('private', 'public'))
    or (old.status = 'active' and new.status not in ('active', 'closed')) then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_room_member_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or old.effective_to is not null
    or new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.user_id is distinct from old.user_id
    or new.member_type is distinct from old.member_type
    or new.membership_source is distinct from old.membership_source
    or new.role_assignment_id is distinct from old.role_assignment_id
    or new.effective_from is distinct from old.effective_from
    or new.created_at is distinct from old.created_at
    or new.effective_to is null then
    raise exception using errcode = '55000', message = 'ROOM_MEMBER_HISTORY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create function complaints.validate_message_receipt_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.complaint_id is distinct from old.complaint_id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
    or new.version <> old.version + 1
    or (new.read_through_created_at, new.read_through_message_id)
      <= (old.read_through_created_at, old.read_through_message_id)
    or new.read_at < old.read_at
    or new.event_id is not distinct from old.event_id then
    raise exception using errcode = '55000', message = 'MESSAGE_READ_POSITION_NOT_MONOTONIC';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.outbox_id is distinct from old.outbox_id
    or new.complaint_id is distinct from old.complaint_id
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.event_type is distinct from old.event_type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.payload is distinct from old.payload
    or new.created_at is distinct from old.created_at
    or old.read_at is not null
    or new.read_at is null then
    raise exception using errcode = '55000', message = 'NOTIFICATION_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_delivery_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.notification_id is distinct from old.notification_id
    or new.channel is distinct from old.channel
    or new.event_name is distinct from old.event_name
    or new.destination_key is distinct from old.destination_key
    or new.device_id is distinct from old.device_id
    or new.created_at is distinct from old.created_at
    or new.attempt_count < old.attempt_count
    or new.attempt_count > old.attempt_count + 1
    or old.state in ('delivered', 'unsupported', 'dead')
    or (
      old.state in ('pending', 'retry')
      and new.state not in ('processing', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state not in ('processing', 'delivered', 'retry', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state = 'processing'
      and (
        old.lease_expires_at is null
        or old.lease_expires_at > clock_timestamp()
        or new.attempt_count <> old.attempt_count + 1
      )
    ) then
    raise exception using errcode = '55000', message = 'NOTIFICATION_DELIVERY_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_outbox_job_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.outbox_id is distinct from old.outbox_id
    or new.created_at is distinct from old.created_at
    or new.attempt_count < old.attempt_count
    or new.attempt_count > old.attempt_count + 1
    or old.state in ('completed', 'dead')
    or (
      old.state in ('pending', 'retry')
      and new.state not in ('processing', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state not in ('processing', 'completed', 'retry', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state = 'processing'
      and (
        old.lease_expires_at is null
        or old.lease_expires_at > clock_timestamp()
        or new.attempt_count <> old.attempt_count + 1
      )
    ) then
    raise exception using errcode = '55000', message = 'NOTIFICATION_OUTBOX_JOB_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create trigger conversation_rooms_validate_mutation
before update or delete on complaints.conversation_rooms
for each row execute function complaints.validate_conversation_room_mutation();

create trigger room_members_validate_mutation
before update or delete on complaints.room_members
for each row execute function complaints.validate_room_member_mutation();

create trigger messages_immutable
before update or delete on complaints.messages
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger message_receipts_validate_mutation
before update or delete on complaints.message_receipts
for each row execute function complaints.validate_message_receipt_mutation();

create trigger complaint_comments_immutable
before update or delete on complaints.complaint_comments
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger notifications_validate_mutation
before update or delete on complaints.notifications
for each row execute function complaints.validate_notification_mutation();

create trigger notifications_set_updated_at
before update on complaints.notifications
for each row execute function private.set_updated_at();

create trigger notification_deliveries_validate_mutation
before update or delete on complaints.notification_deliveries
for each row execute function complaints.validate_notification_delivery_mutation();

create trigger notification_deliveries_set_updated_at
before update on complaints.notification_deliveries
for each row execute function private.set_updated_at();

create trigger notification_delivery_attempts_immutable
before update or delete on complaints.notification_delivery_attempts
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger notification_outbox_jobs_validate_mutation
before update or delete on complaints.notification_outbox_jobs
for each row execute function complaints.validate_notification_outbox_job_mutation();

create trigger notification_outbox_jobs_set_updated_at
before update on complaints.notification_outbox_jobs
for each row execute function private.set_updated_at();

create function complaints.ensure_complaint_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_room_id uuid;
begin
  insert into complaints.conversation_rooms (complaint_id)
  values (new.id)
  on conflict (complaint_id) do update
    set complaint_id = excluded.complaint_id
  returning id into created_room_id;

  insert into complaints.room_members (
    room_id,
    user_id,
    member_type,
    membership_source,
    effective_from
  ) values (
    created_room_id,
    new.citizen_user_id,
    'citizen',
    'complaint_owner',
    new.submitted_at
  )
  on conflict (room_id, user_id) where effective_to is null do nothing;

  return new;
end;
$$;

create trigger complaints_ensure_conversation
after insert on complaints.complaints
for each row execute function complaints.ensure_complaint_conversation();

insert into complaints.conversation_rooms (complaint_id, created_at)
select complaint.id, complaint.created_at
from complaints.complaints as complaint
on conflict (complaint_id) do nothing;

insert into complaints.room_members (
  room_id,
  user_id,
  member_type,
  membership_source,
  effective_from,
  created_at
)
select
  room.id,
  complaint.citizen_user_id,
  'citizen',
  'complaint_owner',
  complaint.submitted_at,
  complaint.created_at
from complaints.conversation_rooms as room
inner join complaints.complaints as complaint on complaint.id = room.complaint_id
where not exists (
  select 1
  from complaints.room_members as current_member
  where current_member.room_id = room.id
    and current_member.user_id = complaint.citizen_user_id
    and current_member.effective_to is null
);

create function complaints.create_notification_outbox_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into complaints.notification_outbox_jobs (
    outbox_id,
    next_attempt_at,
    created_at,
    updated_at
  ) values (
    new.id,
    new.created_at,
    new.created_at,
    new.created_at
  )
  on conflict (outbox_id) do nothing;
  return new;
end;
$$;

create trigger notification_outbox_create_job
after insert on complaints.notification_outbox
for each row execute function complaints.create_notification_outbox_job();

insert into complaints.notification_outbox_jobs (
  outbox_id,
  next_attempt_at,
  created_at,
  updated_at
)
select outbox.id, outbox.created_at, outbox.created_at, outbox.created_at
from complaints.notification_outbox as outbox
on conflict (outbox_id) do nothing;

create function complaints.append_citizen_submission_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  if new.event_source <> 'citizen_submission' or new.reason_code <> 'COMPLAINT_SUBMITTED' then
    return new;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = new.complaint_id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;

  insert into complaints.notification_outbox (
    complaint_id,
    status_history_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_submitted',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', new.to_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', new.occurred_at
    )),
    new.occurred_at
  )
  on conflict (status_history_id) do nothing;

  return new;
end;
$$;

create trigger complaint_status_history_submission_outbox
after insert on complaints.complaint_status_history
for each row execute function complaints.append_citizen_submission_outbox();

insert into complaints.notification_outbox (
  complaint_id,
  status_history_id,
  event_type,
  aggregate_id,
  payload,
  occurred_at,
  created_at
)
select
  history.complaint_id,
  history.id,
  'complaint_submitted',
  history.complaint_id,
  jsonb_strip_nulls(jsonb_build_object(
    'complaintId', history.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'status', history.to_status,
    'authorityId', assignment.authority_id,
    'wardId', assignment.ward_id,
    'authorityDepartmentId', assignment.authority_department_id,
    'occurredAt', history.occurred_at
  )),
  history.occurred_at,
  history.occurred_at
from complaints.complaint_status_history as history
inner join complaints.complaints as complaint on complaint.id = history.complaint_id
inner join complaints.complaint_assignments as assignment
  on assignment.complaint_id = history.complaint_id
 and assignment.version = 1
where history.event_source = 'citizen_submission'
  and history.reason_code = 'COMPLAINT_SUBMITTED'
  and not exists (
    select 1
    from complaints.notification_outbox as existing
    where existing.status_history_id = history.id
  )
on conflict (status_history_id) do nothing;

create function complaints.append_assignment_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
begin
  if new.assignment_source = 'routing_decision' then
    return new;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  insert into complaints.notification_outbox (
    complaint_id,
    assignment_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_assignment_changed',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', complaint.current_status,
      'authorityId', new.authority_id,
      'wardId', new.ward_id,
      'authorityDepartmentId', new.authority_department_id,
      'occurredAt', new.effective_from
    )),
    new.effective_from
  )
  on conflict (assignment_id) do nothing;

  return new;
end;
$$;

create trigger complaint_assignments_assignment_outbox
after insert on complaints.complaint_assignments
for each row execute function complaints.append_assignment_outbox();

insert into complaints.notification_outbox (
  complaint_id,
  assignment_id,
  event_type,
  aggregate_id,
  payload,
  occurred_at,
  created_at
)
select
  assignment.complaint_id,
  assignment.id,
  'complaint_assignment_changed',
  assignment.complaint_id,
  jsonb_strip_nulls(jsonb_build_object(
    'complaintId', assignment.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'status', complaint.current_status,
    'authorityId', assignment.authority_id,
    'wardId', assignment.ward_id,
    'authorityDepartmentId', assignment.authority_department_id,
    'occurredAt', assignment.effective_from
  )),
  assignment.effective_from,
  assignment.created_at
from complaints.complaint_assignments as assignment
inner join complaints.complaints as complaint on complaint.id = assignment.complaint_id
where assignment.assignment_source <> 'routing_decision'
  and not exists (
    select 1
    from complaints.notification_outbox as existing
    where existing.assignment_id = assignment.id
  )
on conflict (assignment_id) do nothing;

create function complaints.append_message_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = new.complaint_id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;

  insert into complaints.notification_outbox (
    complaint_id,
    message_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_message_created',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', complaint.current_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'messageId', new.id,
      'occurredAt', new.created_at
    )),
    new.created_at
  );

  return new;
end;
$$;

create trigger messages_create_outbox
after insert on complaints.messages
for each row execute function complaints.append_message_outbox();

create function complaints.actor_can_communicate(
  p_actor_user_id uuid,
  p_complaint_id uuid,
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
    from complaints.complaints as complaint
    inner join public.profiles as profile on profile.id = p_actor_user_id
    where complaint.id = p_complaint_id
      and profile.status = 'active'
      and (
        complaint.citizen_user_id = p_actor_user_id
        or exists (
          select 1
          from complaints.complaint_assignments as assignment
          where assignment.complaint_id = complaint.id
            and assignment.status = 'active'
            and assignment.effective_to is null
            and complaints.actor_can_access_assignment(
              p_actor_user_id,
              assignment.id,
              'view',
              null,
              p_at
            )
        )
      )
  );
$$;

create function public.get_realtime_account(p_actor_user_id uuid)
returns table (user_id uuid, is_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_actor_user_id,
    exists (
      select 1
      from public.profiles as profile
      where profile.id = p_actor_user_id
        and profile.status = 'active'
    );
$$;

create function public.authorize_realtime_room(
  p_actor_user_id uuid,
  p_room_type text,
  p_resource_id uuid
)
returns table (authorized boolean, actor_type text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_platform_administrator boolean;
begin
  if p_actor_user_id is null
    or p_resource_id is null
    or p_room_type not in ('complaint', 'authority', 'ward', 'department') then
    return query select false, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_user_id and profile.status = 'active'
  ) then
    return query select false, null::text;
    return;
  end if;

  if p_room_type = 'complaint' then
    return query
    with access_result as (
      select complaints.actor_can_communicate(
        p_actor_user_id,
        p_resource_id,
        current_timestamp
      ) as is_authorized
    )
    select
      access_result.is_authorized,
      case
        when not access_result.is_authorized then null::text
        when exists (
          select 1
          from complaints.complaints as complaint
          where complaint.id = p_resource_id
            and complaint.citizen_user_id = p_actor_user_id
        ) then 'citizen'::text
        else 'government'::text
      end
    from access_result;
    return;
  end if;

  select exists (
    select 1
    from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where role.code = 'platform_admin'
      and user_role.scope_type = 'global'
  ) into is_platform_administrator;

  if p_room_type = 'authority' then
    return query
    select
      (
        is_platform_administrator
        and private.is_verified_governance_authority(p_resource_id)
      )
      or exists (
        select 1
        from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
        inner join public.roles as role on role.id = user_role.role_id
        where role.is_government
          and user_role.scope_type = 'authority'
          and user_role.scope_id = p_resource_id
          and user_role.authority_id = p_resource_id
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
      ),
      null::text;
    return;
  end if;

  if p_room_type = 'ward' then
    return query
    select
      (
        is_platform_administrator
        and exists (
          select 1
          from governance.wards as ward
          inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
          where ward.id = p_resource_id
            and ward.status = 'active'
            and ward.verification_status = 'verified'
            and not ward.is_placeholder
            and private.is_verified_governance_authority(local_body.authority_id)
        )
      )
      or exists (
        select 1
        from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
        inner join public.roles as role on role.id = user_role.role_id
        where role.is_government
          and user_role.scope_type = 'ward'
          and user_role.scope_id = p_resource_id
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
      ),
      null::text;
    return;
  end if;

  return query
  select
    (
      is_platform_administrator
      and exists (
        select 1
        from governance.authority_departments as authority_department
        inner join governance.departments as department
          on department.id = authority_department.department_id
        where authority_department.id = p_resource_id
          and authority_department.status = 'active'
          and authority_department.verification_status = 'verified'
          and not authority_department.is_placeholder
          and department.status = 'active'
          and department.verification_status = 'verified'
          and not department.is_placeholder
          and private.is_verified_governance_authority(authority_department.authority_id)
      )
    )
    or exists (
      select 1
      from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
      inner join public.roles as role on role.id = user_role.role_id
      where role.is_government
        and user_role.scope_type = 'department'
        and user_role.scope_id = p_resource_id
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
    ),
    null::text;
end;
$$;

create function public.create_complaint_message(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_client_message_id uuid,
  p_body text,
  p_request_id text default null
)
returns table (response_payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  room complaints.conversation_rooms%rowtype;
  complaint complaints.complaints%rowtype;
  existing_message complaints.messages%rowtype;
  created_message complaints.messages%rowtype;
  fingerprint text;
  normalized_request_id text;
  author_type text;
begin
  normalized_request_id := coalesce(
    nullif(btrim(p_request_id), ''),
    'message:' || coalesce(p_client_message_id::text, '')
  );

  if p_actor_user_id is null
    or p_complaint_id is null
    or p_client_message_id is null
    or p_body is null
    or p_body <> btrim(p_body)
    or char_length(p_body) not between 1 and 4000
    or normalized_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as candidate where candidate.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id;

  select candidate.* into room
  from complaints.conversation_rooms as candidate
  where candidate.complaint_id = p_complaint_id
    and candidate.visibility = 'private'
    and candidate.status = 'active';

  if not found then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_NOT_AVAILABLE';
  end if;

  fingerprint := encode(
    sha256(convert_to(p_complaint_id::text || ':' || p_body, 'UTF8')),
    'hex'
  );

  select message.* into existing_message
  from complaints.messages as message
  where message.sender_user_id = p_actor_user_id
    and message.client_message_id = p_client_message_id;

  if found then
    if existing_message.complaint_id <> p_complaint_id
      or existing_message.room_id <> room.id
      or existing_message.request_fingerprint <> fingerprint
      or existing_message.body <> p_body then
      raise exception using errcode = '23505', message = 'MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;

    author_type := case
      when complaint.citizen_user_id = existing_message.sender_user_id then 'citizen'
      else 'government'
    end;

    return query select jsonb_build_object(
      'id', existing_message.id,
      'complaintId', existing_message.complaint_id,
      'kind', 'private_message',
      'authorType', author_type,
      'authoredByMe', true,
      'body', existing_message.body,
      'createdAt', existing_message.created_at
    ), true;
    return;
  end if;

  insert into complaints.messages (
    room_id,
    complaint_id,
    sender_user_id,
    client_message_id,
    body,
    request_fingerprint,
    request_id
  ) values (
    room.id,
    p_complaint_id,
    p_actor_user_id,
    p_client_message_id,
    p_body,
    fingerprint,
    normalized_request_id
  )
  on conflict (sender_user_id, client_message_id) do nothing
  returning * into created_message;

  if not found then
    select message.* into existing_message
    from complaints.messages as message
    where message.sender_user_id = p_actor_user_id
      and message.client_message_id = p_client_message_id;

    if existing_message.id is null
      or existing_message.complaint_id <> p_complaint_id
      or existing_message.room_id <> room.id
      or existing_message.request_fingerprint <> fingerprint
      or existing_message.body <> p_body then
      raise exception using errcode = '23505', message = 'MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;

    created_message := existing_message;
    replayed := true;
  else
    replayed := false;
  end if;

  author_type := case
    when complaint.citizen_user_id = p_actor_user_id then 'citizen'
    else 'government'
  end;

  insert into complaints.room_members (
    room_id,
    user_id,
    member_type,
    membership_source,
    effective_from
  ) values (
    room.id,
    p_actor_user_id,
    author_type,
    case when author_type = 'citizen' then 'complaint_owner' else 'message_sender' end,
    created_message.created_at
  )
  on conflict (room_id, user_id) where effective_to is null do nothing;

  response_payload := jsonb_build_object(
    'id', created_message.id,
    'complaintId', created_message.complaint_id,
    'kind', 'private_message',
    'authorType', author_type,
    'authoredByMe', true,
    'body', created_message.body,
    'createdAt', created_message.created_at
  );
  return next;
end;
$$;

create function public.list_complaint_messages(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_limit integer default 25,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (response_payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item_count integer;
  items jsonb;
  last_created_at timestamptz;
  last_id uuid;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_limit is null
    or p_limit not between 1 and 100
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  with selected as materialized (
    select
      message.id,
      message.complaint_id,
      message.sender_user_id,
      message.body,
      message.created_at,
      complaint.citizen_user_id
    from complaints.messages as message
    inner join complaints.complaints as complaint on complaint.id = message.complaint_id
    where message.complaint_id = p_complaint_id
      and (
        p_before_created_at is null
        or (message.created_at, message.id) < (p_before_created_at, p_before_id)
      )
    order by message.created_at desc, message.id desc
    limit p_limit
  )
  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', selected.id,
          'complaintId', selected.complaint_id,
          'kind', 'private_message',
          'authorType', case
            when selected.sender_user_id = selected.citizen_user_id then 'citizen'
            else 'government'
          end,
          'authoredByMe', selected.sender_user_id = p_actor_user_id,
          'body', selected.body,
          'createdAt', selected.created_at
        ) order by selected.created_at desc, selected.id desc
      ),
      '[]'::jsonb
    ),
    min(selected.created_at),
    (
      select tail.id
      from selected as tail
      order by tail.created_at, tail.id
      limit 1
    )
  into item_count, items, last_created_at, last_id
  from selected;

  response_payload := jsonb_build_object(
    'items', items,
    'nextCursor', case
      when item_count = p_limit then jsonb_build_object(
        'beforeCreatedAt', last_created_at,
        'beforeId', last_id
      )
      else null
    end
  );
  return next;
end;
$$;

create function public.mark_complaint_message_read(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_read_through_message_id uuid,
  p_read_through_created_at timestamptz,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room complaints.conversation_rooms%rowtype;
  read_message complaints.messages%rowtype;
  receipt complaints.message_receipts%rowtype;
  operation_at timestamptz := clock_timestamp();
  normalized_request_id text;
begin
  normalized_request_id := coalesce(
    nullif(btrim(p_request_id), ''),
    'message-read:' || coalesce(p_read_through_message_id::text, '')
  );

  if p_actor_user_id is null
    or p_complaint_id is null
    or p_read_through_message_id is null
    or p_read_through_created_at is null
    or normalized_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  select candidate.* into room
  from complaints.conversation_rooms as candidate
  where candidate.complaint_id = p_complaint_id
    and candidate.visibility = 'private'
    and candidate.status = 'active'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_NOT_AVAILABLE';
  end if;

  select message.* into read_message
  from complaints.messages as message
  where message.id = p_read_through_message_id
    and message.room_id = room.id
    and message.complaint_id = p_complaint_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'MESSAGE_NOT_FOUND';
  end if;

  if read_message.created_at is distinct from p_read_through_created_at then
    raise exception using errcode = '23514', message = 'MESSAGE_READ_POSITION_INVALID';
  end if;

  select current_receipt.* into receipt
  from complaints.message_receipts as current_receipt
  where current_receipt.room_id = room.id
    and current_receipt.user_id = p_actor_user_id
  for update;

  if not found then
    insert into complaints.message_receipts (
      room_id,
      complaint_id,
      user_id,
      read_through_message_id,
      read_through_created_at,
      read_at,
      request_id,
      updated_at
    ) values (
      room.id,
      p_complaint_id,
      p_actor_user_id,
      read_message.id,
      read_message.created_at,
      operation_at,
      normalized_request_id,
      operation_at
    ) returning * into receipt;
  elsif (read_message.created_at, read_message.id)
    > (receipt.read_through_created_at, receipt.read_through_message_id) then
    update complaints.message_receipts as current_receipt
    set
      read_through_message_id = read_message.id,
      read_through_created_at = read_message.created_at,
      read_at = operation_at,
      event_id = gen_random_uuid(),
      request_id = normalized_request_id,
      version = current_receipt.version + 1,
      updated_at = operation_at
    where current_receipt.id = receipt.id
    returning * into receipt;
  end if;

  return jsonb_build_object(
    'complaintId', receipt.complaint_id,
    'readThroughCreatedAt', receipt.read_through_created_at,
    'readThroughMessageId', receipt.read_through_message_id,
    'updatedAt', receipt.updated_at
  );
end;
$$;

create function public.list_notifications(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (response_payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item_count integer;
  items jsonb;
  last_created_at timestamptz;
  last_id uuid;
begin
  if p_actor_user_id is null
    or p_limit is null
    or p_limit not between 1 and 100
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_user_id and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  with selected as materialized (
    select
      notification.id,
      notification.outbox_id,
      notification.event_type,
      notification.payload - 'eventType' - 'occurredAt' as safe_payload,
      outbox.occurred_at,
      notification.created_at,
      notification.read_at
    from complaints.notifications as notification
    inner join complaints.notification_outbox as outbox on outbox.id = notification.outbox_id
    where notification.recipient_user_id = p_actor_user_id
      and complaints.actor_can_communicate(
        p_actor_user_id,
        notification.complaint_id,
        current_timestamp
      )
      and (
        p_before_created_at is null
        or (notification.created_at, notification.id) < (p_before_created_at, p_before_id)
      )
    order by notification.created_at desc, notification.id desc
    limit p_limit
  )
  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', selected.id,
          'eventId', selected.outbox_id,
          'eventType', selected.event_type,
          'payload', selected.safe_payload,
          'occurredAt', selected.occurred_at,
          'createdAt', selected.created_at,
          'readAt', selected.read_at
        ) order by selected.created_at desc, selected.id desc
      ),
      '[]'::jsonb
    ),
    min(selected.created_at),
    (
      select tail.id
      from selected as tail
      order by tail.created_at, tail.id
      limit 1
    )
  into item_count, items, last_created_at, last_id
  from selected;

  response_payload := jsonb_build_object(
    'items', items,
    'nextCursor', case
      when item_count = p_limit then jsonb_build_object(
        'beforeCreatedAt', last_created_at,
        'beforeId', last_id
      )
      else null
    end
  );
  return next;
end;
$$;

create function public.mark_notification_read(
  p_actor_user_id uuid,
  p_notification_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification complaints.notifications%rowtype;
  operation_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or p_notification_id is null then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  select candidate.* into notification
  from complaints.notifications as candidate
  where candidate.id = p_notification_id
    and candidate.recipient_user_id = p_actor_user_id
    and complaints.actor_can_communicate(
      p_actor_user_id,
      candidate.complaint_id,
      current_timestamp
    )
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification.read_at is null then
    update complaints.notifications as candidate
    set read_at = operation_at, updated_at = operation_at
    where candidate.id = notification.id
    returning * into notification;
  end if;

  return jsonb_build_object(
    'notificationId', notification.id,
    'readAt', notification.read_at
  );
end;
$$;

create function public.claim_notification_outbox(
  p_worker_id text,
  p_limit integer default 25,
  p_lease_seconds integer default 60
)
returns table (outbox_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null
    or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    or p_limit is null
    or p_limit not between 1 and 100
    or p_lease_seconds is null
    or p_lease_seconds not between 15 and 300 then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  update complaints.notification_outbox_jobs as job
  set
    state = 'dead',
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED',
    updated_at = operation_at
  where job.state = 'processing'
    and job.lease_expires_at <= operation_at
    and job.attempt_count >= 5;

  return query
  with candidates as materialized (
    select job.outbox_id
    from complaints.notification_outbox_jobs as job
    where (
        job.state in ('pending', 'retry')
        and job.next_attempt_at <= operation_at
      )
      or (
        job.state = 'processing'
        and job.lease_expires_at <= operation_at
        and job.attempt_count < 5
      )
    order by
      case when job.state = 'processing' then 0 else 1 end,
      coalesce(job.lease_expires_at, job.next_attempt_at),
      job.created_at,
      job.outbox_id
    for update skip locked
    limit p_limit
  ), claimed as (
    update complaints.notification_outbox_jobs as job
    set
      state = 'processing',
      attempt_count = job.attempt_count + 1,
      lease_token = gen_random_uuid(),
      worker_id = p_worker_id,
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case
        when job.state = 'processing' then 'LEASE_EXPIRED'
        else job.last_failure_code
      end,
      updated_at = operation_at
    from candidates
    where job.outbox_id = candidates.outbox_id
    returning job.outbox_id, job.lease_token
  )
  select claimed.outbox_id, claimed.lease_token
  from claimed;
end;
$$;

create function public.materialize_notification_outbox(
  p_outbox_id uuid,
  p_lease_token uuid
)
returns table (notification_count integer, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job complaints.notification_outbox_jobs%rowtype;
  outbox complaints.notification_outbox%rowtype;
  complaint complaints.complaints%rowtype;
  history complaints.complaint_status_history%rowtype;
  current_assignment complaints.complaint_assignments%rowtype;
  event_assignment complaints.complaint_assignments%rowtype;
  message complaints.messages%rowtype;
  operation_at timestamptz := clock_timestamp();
  actor_user_id uuid;
  semantic_event_type text;
  notification_title text;
  notification_body text;
  notification_payload jsonb;
  materialized_count integer;
begin
  if p_outbox_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_REQUEST_INVALID';
  end if;

  select job.* into current_job
  from complaints.notification_outbox_jobs as job
  where job.outbox_id = p_outbox_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_OUTBOX_JOB_NOT_FOUND';
  end if;

  if current_job.state = 'completed' then
    select count(*)::integer into materialized_count
    from complaints.notifications as notification
    where notification.outbox_id = p_outbox_id;
    return query select materialized_count, true;
    return;
  end if;

  if current_job.state <> 'processing'
    or current_job.lease_token is distinct from p_lease_token
    or current_job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  select candidate.* into outbox
  from complaints.notification_outbox as candidate
  where candidate.id = p_outbox_id;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = outbox.complaint_id;

  select candidate.* into current_assignment
  from complaints.complaint_assignments as candidate
  where candidate.complaint_id = outbox.complaint_id
    and candidate.status = 'active'
    and candidate.effective_to is null;

  if outbox.message_id is not null then
    select candidate.* into message
    from complaints.messages as candidate
    where candidate.id = outbox.message_id;
    actor_user_id := message.sender_user_id;
    semantic_event_type := 'message';
  elsif outbox.assignment_id is not null then
    select candidate.* into event_assignment
    from complaints.complaint_assignments as candidate
    where candidate.id = outbox.assignment_id;
    actor_user_id := event_assignment.assigned_by_user_id;
    semantic_event_type := case
      when event_assignment.assignment_source = 'government_transfer' then 'transfer'
      else 'assignment'
    end;
  else
    select candidate.* into history
    from complaints.complaint_status_history as candidate
    where candidate.id = outbox.status_history_id;
    actor_user_id := history.actor_user_id;
    semantic_event_type := case
      when outbox.event_type = 'complaint_submitted' then 'submission'
      when history.reason_code = 'COMPLAINT_ACKNOWLEDGED'
        or history.to_status = 'acknowledged' then 'acknowledgement'
      when history.reason_code = 'COMPLAINT_TRANSFERRED'
        or history.to_status = 'transferred' then 'transfer'
      when history.reason_code = 'COMPLAINT_ASSIGNED'
        or history.to_status = 'assigned' then 'assignment'
      when history.reason_code = 'RESOLUTION_SUBMITTED'
        or history.to_status in ('resolution_submitted', 'resolved', 'closed') then 'resolution'
      when history.to_status = 'reopened' then 'reopen'
      when history.to_status = 'escalated' then 'escalation'
      else 'status_update'
    end;
  end if;

  notification_title := case semantic_event_type
    when 'submission' then 'Complaint submitted'
    when 'assignment' then 'Complaint assignment updated'
    when 'acknowledgement' then 'Complaint acknowledged'
    when 'transfer' then 'Complaint transferred'
    when 'message' then 'New complaint message'
    when 'resolution' then 'Complaint resolution updated'
    when 'reopen' then 'Complaint reopened'
    when 'escalation' then 'Complaint escalated'
    else 'Complaint status updated'
  end;
  notification_body := case semantic_event_type
    when 'submission' then 'A complaint has been submitted and routed.'
    when 'assignment' then 'The responsible government assignment has changed.'
    when 'acknowledgement' then 'The complaint has been acknowledged.'
    when 'transfer' then 'The complaint has been transferred to another responsible team.'
    when 'message' then 'A new private message is available on the complaint.'
    when 'resolution' then 'The complaint resolution has been updated.'
    when 'reopen' then 'The complaint has been reopened.'
    when 'escalation' then 'The complaint has been escalated.'
    else 'The complaint status has changed.'
  end;
  notification_payload := jsonb_strip_nulls(jsonb_build_object(
    'complaintId', outbox.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'eventType', semantic_event_type,
    'status', outbox.payload ->> 'status',
    'messageId', outbox.message_id,
    'occurredAt', outbox.occurred_at
  ));

  with recipient_candidates as materialized (
    select complaint.citizen_user_id as user_id
    where complaint.citizen_user_id is distinct from actor_user_id
      and exists (
        select 1 from public.profiles as profile
        where profile.id = complaint.citizen_user_id and profile.status = 'active'
      )
    union
    select user_role.user_id
    from public.user_roles as user_role
    where current_assignment.id is not null
      and user_role.user_id is distinct from actor_user_id
      and complaints.actor_can_access_assignment(
        user_role.user_id,
        current_assignment.id,
        'view',
        user_role.id,
        operation_at
      )
  )
  insert into complaints.notifications (
    outbox_id,
    complaint_id,
    recipient_user_id,
    event_type,
    title,
    body,
    payload,
    created_at,
    updated_at
  )
  select
    outbox.id,
    outbox.complaint_id,
    recipient.user_id,
    semantic_event_type,
    notification_title,
    notification_body,
    notification_payload,
    operation_at,
    operation_at
  from recipient_candidates as recipient
  on conflict (outbox_id, recipient_user_id) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    delivered_at,
    created_at,
    updated_at
  )
  select
    notification.id,
    'in_app',
    'notification:created',
    'user:' || notification.recipient_user_id::text,
    'delivered',
    operation_at,
    operation_at,
    operation_at,
    operation_at
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    created_at,
    updated_at
  )
  select
    notification.id,
    'realtime',
    case when semantic_event_type = 'message'
      then 'message:created'
      else 'complaint:status_changed'
    end,
    'user:' || notification.recipient_user_id::text,
    'pending',
    operation_at,
    operation_at,
    operation_at
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    last_failure_code,
    created_at,
    updated_at
  )
  select
    notification.id,
    'email',
    'notification:created',
    'user:' || notification.recipient_user_id::text,
    'unsupported',
    operation_at,
    'CHANNEL_DEFERRED',
    operation_at,
    operation_at
  from complaints.notifications as notification
  inner join public.profiles as profile on profile.id = notification.recipient_user_id
  where notification.outbox_id = outbox.id
    and profile.email is not null
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    device_id,
    state,
    next_attempt_at,
    last_failure_code,
    created_at,
    updated_at
  )
  select
    notification.id,
    'push',
    'notification:created',
    'device:' || device.id::text,
    device.id,
    'unsupported',
    operation_at,
    'CHANNEL_DEFERRED',
    operation_at,
    operation_at
  from complaints.notifications as notification
  inner join public.devices as device on device.user_id = notification.recipient_user_id
  where notification.outbox_id = outbox.id
    and device.is_active
    and device.risk_status <> 'blocked'
    and device.push_token is not null
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  update complaints.notification_outbox_jobs as job
  set
    state = 'completed',
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    completed_at = operation_at,
    updated_at = operation_at
  where job.outbox_id = current_job.outbox_id;

  select count(*)::integer into materialized_count
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id;

  return query select materialized_count, false;
end;
$$;

create function public.fail_notification_outbox(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job complaints.notification_outbox_jobs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_outbox_id is null
    or p_lease_token is null
    or p_error_code <> 'MATERIALIZATION_FAILED' then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_FAILURE_INVALID';
  end if;

  select job.* into current_job
  from complaints.notification_outbox_jobs as job
  where job.outbox_id = p_outbox_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_OUTBOX_JOB_NOT_FOUND';
  end if;

  if current_job.state <> 'processing'
    or current_job.lease_token is distinct from p_lease_token
    or current_job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  if current_job.attempt_count >= 5 then
    update complaints.notification_outbox_jobs as job
    set
      state = 'dead',
      lease_token = null,
      worker_id = null,
      lease_expires_at = null,
      last_failure_code = p_error_code,
      updated_at = operation_at
    where job.outbox_id = current_job.outbox_id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;

  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, current_job.attempt_count - 1))::integer)
  );
  update complaints.notification_outbox_jobs as job
  set
    state = 'retry',
    next_attempt_at = retry_at,
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    last_failure_code = p_error_code,
    updated_at = operation_at
  where job.outbox_id = current_job.outbox_id;

  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function public.claim_realtime_deliveries(
  p_instance_id text,
  p_batch_size integer default 25,
  p_lease_seconds integer default 30
)
returns table (
  delivery_id uuid,
  event_id uuid,
  event_name text,
  recipient_user_id uuid,
  complaint_id uuid,
  payload jsonb,
  attempt_count integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  claimed complaints.notification_deliveries%rowtype;
  notification complaints.notifications%rowtype;
  outbox complaints.notification_outbox%rowtype;
  message complaints.messages%rowtype;
  complaint complaints.complaints%rowtype;
  operation_at timestamptz := clock_timestamp();
  new_claim_token uuid;
begin
  if p_instance_id is null
    or p_instance_id <> btrim(p_instance_id)
    or p_instance_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    or p_batch_size is null
    or p_batch_size not between 1 and 100
    or p_lease_seconds is null
    or p_lease_seconds not between 5 and 300 then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  for candidate in
    select delivery.*
    from complaints.notification_deliveries as delivery
    where delivery.channel = 'realtime'
      and (
        (delivery.state in ('pending', 'retry') and delivery.next_attempt_at <= operation_at)
        or (delivery.state = 'processing' and delivery.lease_expires_at <= operation_at)
      )
    order by
      case when delivery.state = 'processing' then 0 else 1 end,
      coalesce(delivery.lease_expires_at, delivery.next_attempt_at),
      delivery.created_at,
      delivery.id
    for update skip locked
    limit p_batch_size
  loop
    select current_notification.* into notification
    from complaints.notifications as current_notification
    where current_notification.id = candidate.notification_id;

    if candidate.state = 'processing' then
      insert into complaints.notification_delivery_attempts (
        delivery_id,
        attempt_number,
        event_type,
        worker_id,
        claim_token,
        failure_code,
        occurred_at
      ) values (
        candidate.id,
        candidate.attempt_count,
        'lease_expired',
        candidate.leased_by,
        candidate.lease_token,
        'LEASE_EXPIRED',
        operation_at
      ) on conflict on constraint notification_delivery_attempts_event_unique do nothing;
    end if;

    if candidate.attempt_count >= 5 then
      update complaints.notification_deliveries as delivery
      set
        state = 'dead',
        lease_token = null,
        leased_by = null,
        lease_expires_at = null,
        last_failure_code = 'LEASE_EXPIRED',
        updated_at = operation_at
      where delivery.id = candidate.id;
      continue;
    end if;

    if not complaints.actor_can_communicate(
      notification.recipient_user_id,
      notification.complaint_id,
      operation_at
    ) then
      update complaints.notification_deliveries as delivery
      set
        state = 'dead',
        lease_token = null,
        leased_by = null,
        lease_expires_at = null,
        last_failure_code = 'RECIPIENT_ACCESS_REVOKED',
        updated_at = operation_at
      where delivery.id = candidate.id;
      continue;
    end if;

    new_claim_token := gen_random_uuid();
    update complaints.notification_deliveries as delivery
    set
      state = 'processing',
      attempt_count = delivery.attempt_count + 1,
      lease_token = new_claim_token,
      leased_by = p_instance_id,
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case
        when delivery.state = 'processing' then 'LEASE_EXPIRED'
        else delivery.last_failure_code
      end,
      updated_at = operation_at
    where delivery.id = candidate.id
    returning * into claimed;

    insert into complaints.notification_delivery_attempts (
      delivery_id,
      attempt_number,
      event_type,
      worker_id,
      claim_token,
      occurred_at
    ) values (
      claimed.id,
      claimed.attempt_count,
      'claimed',
      p_instance_id,
      new_claim_token,
      operation_at
    );

    select candidate_outbox.* into outbox
    from complaints.notification_outbox as candidate_outbox
    where candidate_outbox.id = notification.outbox_id;

    if outbox.message_id is not null then
      select candidate_message.* into message
      from complaints.messages as candidate_message
      where candidate_message.id = outbox.message_id;
      select candidate_complaint.* into complaint
      from complaints.complaints as candidate_complaint
      where candidate_complaint.id = message.complaint_id;
      payload := jsonb_build_object(
        'message', jsonb_build_object(
          'id', message.id,
          'complaintId', message.complaint_id,
          'kind', 'private_message',
          'authorType', case
            when message.sender_user_id = complaint.citizen_user_id then 'citizen'
            else 'government'
          end,
          'authoredByMe', message.sender_user_id = notification.recipient_user_id,
          'body', message.body,
          'createdAt', message.created_at
        )
      );
    else
      payload := jsonb_build_object(
        'notification', jsonb_build_object(
          'id', notification.id,
          'eventId', notification.outbox_id,
          'eventType', notification.event_type,
          'payload', notification.payload - 'eventType' - 'occurredAt',
          'occurredAt', outbox.occurred_at,
          'createdAt', notification.created_at,
          'readAt', notification.read_at
        )
      );
    end if;

    delivery_id := claimed.id;
    event_id := notification.outbox_id;
    event_name := claimed.event_name;
    recipient_user_id := notification.recipient_user_id;
    complaint_id := notification.complaint_id;
    attempt_count := claimed.attempt_count;
    claim_token := new_claim_token;
    return next;
  end loop;
end;
$$;

create function public.complete_notification_delivery(
  p_delivery_id uuid,
  p_instance_id text,
  p_claim_token uuid,
  p_delivered_socket_count integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery complaints.notification_deliveries%rowtype;
  operation_at timestamptz := clock_timestamp();
begin
  if p_delivery_id is null
    or p_instance_id is null
    or p_claim_token is null
    or p_delivered_socket_count is null
    or p_delivered_socket_count not between 0 and 10000 then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_COMPLETION_INVALID';
  end if;

  select candidate.* into delivery
  from complaints.notification_deliveries as candidate
  where candidate.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_DELIVERY_NOT_FOUND';
  end if;

  if delivery.channel <> 'realtime'
    or delivery.state <> 'processing'
    or delivery.leased_by is distinct from p_instance_id
    or delivery.lease_token is distinct from p_claim_token
    or delivery.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  update complaints.notification_deliveries as candidate
  set
    state = 'delivered',
    lease_token = null,
    leased_by = null,
    lease_expires_at = null,
    delivered_at = operation_at,
    last_failure_code = null,
    updated_at = operation_at
  where candidate.id = delivery.id;

  insert into complaints.notification_delivery_attempts (
    delivery_id,
    attempt_number,
    event_type,
    worker_id,
    claim_token,
    delivered_socket_count,
    occurred_at
  ) values (
    delivery.id,
    delivery.attempt_count,
    'delivered',
    p_instance_id,
    p_claim_token,
    p_delivered_socket_count,
    operation_at
  );
end;
$$;

create function public.fail_notification_delivery(
  p_delivery_id uuid,
  p_instance_id text,
  p_claim_token uuid,
  p_failure_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery complaints.notification_deliveries%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
  next_state text;
begin
  if p_delivery_id is null
    or p_instance_id is null
    or p_claim_token is null
    or p_failure_code not in (
      'DELIVERY_DEPENDENCY_UNAVAILABLE',
      'DELIVERY_EMIT_FAILED'
    ) then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_FAILURE_INVALID';
  end if;

  select candidate.* into delivery
  from complaints.notification_deliveries as candidate
  where candidate.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_DELIVERY_NOT_FOUND';
  end if;

  if delivery.channel <> 'realtime'
    or delivery.state <> 'processing'
    or delivery.leased_by is distinct from p_instance_id
    or delivery.lease_token is distinct from p_claim_token
    or delivery.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  if delivery.attempt_count >= 5 then
    next_state := 'dead';
    retry_at := delivery.next_attempt_at;
  else
    next_state := 'retry';
    retry_at := operation_at + make_interval(
      secs => least(300, (5 * power(2, delivery.attempt_count - 1))::integer)
    );
  end if;

  update complaints.notification_deliveries as candidate
  set
    state = next_state,
    next_attempt_at = retry_at,
    lease_token = null,
    leased_by = null,
    lease_expires_at = null,
    last_failure_code = p_failure_code,
    updated_at = operation_at
  where candidate.id = delivery.id;

  insert into complaints.notification_delivery_attempts (
    delivery_id,
    attempt_number,
    event_type,
    worker_id,
    claim_token,
    failure_code,
    occurred_at
  ) values (
    delivery.id,
    delivery.attempt_count,
    'failed',
    p_instance_id,
    p_claim_token,
    p_failure_code,
    operation_at
  );
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'conversation_rooms',
    'room_members',
    'messages',
    'message_receipts',
    'complaint_comments',
    'notifications',
    'notification_deliveries',
    'notification_delivery_attempts',
    'notification_outbox_jobs'
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

revoke all on function public.get_realtime_account(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.authorize_realtime_room(uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_complaint_message(uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke all on function public.list_notifications(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_notification_read(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_notification_outbox(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_notification_outbox(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_notification_outbox(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_realtime_deliveries(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_notification_delivery(uuid, text, uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_notification_delivery(uuid, text, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.get_realtime_account(uuid) to service_role;
grant execute on function public.authorize_realtime_room(uuid, text, uuid) to service_role;
grant execute on function public.create_complaint_message(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text)
  to service_role;
grant execute on function public.list_notifications(uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.mark_notification_read(uuid, uuid) to service_role;
grant execute on function public.claim_notification_outbox(text, integer, integer)
  to service_role;
grant execute on function public.materialize_notification_outbox(uuid, uuid)
  to service_role;
grant execute on function public.fail_notification_outbox(uuid, uuid, text)
  to service_role;
grant execute on function public.claim_realtime_deliveries(text, integer, integer)
  to service_role;
grant execute on function public.complete_notification_delivery(uuid, text, uuid, integer)
  to service_role;
grant execute on function public.fail_notification_delivery(uuid, text, uuid, text)
  to service_role;

comment on function public.create_complaint_message(uuid, uuid, uuid, text, text) is
  'Service-only idempotent private complaint-message creation with current authorization.';
comment on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid) is
  'Service-only private complaint-message keyset listing with current authorization.';
comment on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text) is
  'Service-only monotonic private complaint-message read position.';
comment on function public.claim_notification_outbox(text, integer, integer) is
  'Service-only PostgreSQL lease claim for immutable notification-outbox materialization.';
comment on function public.materialize_notification_outbox(uuid, uuid) is
  'Service-only, claim-guarded, idempotent and data-minimized notification materialization.';
comment on function public.claim_realtime_deliveries(text, integer, integer) is
  'Service-only bounded PostgreSQL lease claim with current recipient authorization.';
$migration_20260714131000_phase_6_communication_notification_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'authorize_realtime_room')
      and pg_temp.local_wellness_function_exists('public', 'list_notifications')
      and pg_temp.local_wellness_function_exists('public', 'fail_notification_delivery')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaints', 'complaints_ensure_conversation')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_status_history', 'complaint_status_history_submission_outbox')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'complaint_assignments_assignment_outbox')
      and pg_temp.local_wellness_trigger_exists('complaints', 'notification_outbox', 'notification_outbox_create_job')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260714131000_phase_6_communication_notification_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 25,
    cutoff_name = '20260714131000_phase_6_communication_notification_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260714131000_phase_6_communication_notification_security_and_rpc.sql';
end;
$guard_25$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260714131000_phase_6_communication_notification_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716100000_phase_7_accountability_schema.sql
-- ============================================================================
do $guard_26$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 26 then
    raise notice 'Skipping already-complete migration 20260716100000_phase_7_accountability_schema.sql';
    return;
  end if;

  if current_cutoff <> 25 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716100000_phase_7_accountability_schema.sql';
  end if;

  execute $migration_20260716100000_phase_7_accountability_schema$
alter table complaints.complaint_work_references
  add constraint complaint_work_references_id_complaint_unique unique (id, complaint_id);

alter table complaints.complaint_resolutions
  add column completed_at timestamptz,
  add column completion_location extensions.geometry(Point, 4326),
  add column completion_accuracy_meters double precision,
  add column completion_provider text,
  add column location_captured_at timestamptz,
  add column completion_location_device_recorded_at timestamptz,
  add column completion_mock_location_detected boolean,
  add column completion_distance_to_complaint_meters double precision,
  add column work_reference_id uuid,
  add constraint complaint_resolutions_id_complaint_unique unique (id, complaint_id),
  add constraint complaint_resolutions_work_reference_fkey
    foreign key (work_reference_id, complaint_id)
    references complaints.complaint_work_references (id, complaint_id) on delete restrict,
  add constraint complaint_resolutions_completion_accuracy_check check (
    completion_accuracy_meters is null
    or completion_accuracy_meters between 0 and 5000
  ),
  add constraint complaint_resolutions_completion_provider_check check (
    completion_provider is null
    or completion_provider in ('gps', 'network', 'fused', 'unknown')
  ),
  add constraint complaint_resolutions_completion_distance_check check (
    completion_distance_to_complaint_meters is null
    or completion_distance_to_complaint_meters between 0 and 100000
  ),
  add constraint complaint_resolutions_completion_location_check check (
    completion_location is null
    or (
      not extensions.st_isempty(completion_location)
      and extensions.st_srid(completion_location) = 4326
      and extensions.st_x(completion_location) between -180 and 180
      and extensions.st_y(completion_location) between -90 and 90
    )
  ),
  add constraint complaint_resolutions_completion_shape_check check (
    (
      completed_at is null
      and completion_location is null
      and completion_accuracy_meters is null
      and completion_provider is null
      and location_captured_at is null
      and completion_location_device_recorded_at is null
      and completion_mock_location_detected is null
      and completion_distance_to_complaint_meters is null
      and work_reference_id is null
    )
    or (
      completed_at is not null
      and completion_location is not null
      and completion_accuracy_meters is not null
      and completion_provider is not null
      and location_captured_at is not null
      and completion_location_device_recorded_at is not null
      and completion_distance_to_complaint_meters is not null
      and location_captured_at <= completed_at + interval '2 minutes'
      and completion_location_device_recorded_at <= completed_at + interval '2 minutes'
      and abs(extract(epoch from (
        location_captured_at - completion_location_device_recorded_at
      ))) <= 300
    )
  );

alter table complaints.complaint_resolution_evidence_links
  add column role text not null default 'after',
  add constraint complaint_resolution_evidence_links_role_check check (role = 'after');

create table complaints.resolution_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  authority_id uuid references governance.authorities (id) on delete restrict,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resolution_policies_code_unique unique (code),
  constraint resolution_policies_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint resolution_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create unique index resolution_policies_global_scope_idx
  on complaints.resolution_policies ((true))
  where authority_id is null and category_id is null;
create unique index resolution_policies_authority_scope_idx
  on complaints.resolution_policies (authority_id)
  where authority_id is not null and category_id is null;
create unique index resolution_policies_category_scope_idx
  on complaints.resolution_policies (category_id)
  where authority_id is null and category_id is not null;
create unique index resolution_policies_authority_category_scope_idx
  on complaints.resolution_policies (authority_id, category_id)
  where authority_id is not null and category_id is not null;

create table complaints.resolution_policy_versions (
  id uuid primary key default gen_random_uuid(),
  resolution_policy_id uuid not null
    references complaints.resolution_policies (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  rating_minimum smallint not null,
  rating_maximum smallint not null,
  ratings_required boolean not null default true,
  feedback_window_seconds integer not null,
  eligible_feedback_statuses text[] not null,
  reopen_window_seconds integer not null,
  eligible_reopen_statuses text[] not null,
  max_reopen_attempts smallint not null,
  reopen_evidence_required boolean not null default false,
  allowed_reopen_reason_codes text[] not null,
  repeat_escalation_threshold smallint not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint resolution_policy_versions_policy_version_unique unique (
    resolution_policy_id,
    version
  ),
  constraint resolution_policy_versions_version_check check (version >= 1),
  constraint resolution_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint resolution_policy_versions_rating_range_check check (
    rating_minimum between 1 and 10
    and rating_maximum between rating_minimum and 10
  ),
  constraint resolution_policy_versions_window_check check (
    feedback_window_seconds between 60 and 31536000
    and reopen_window_seconds between 60 and 31536000
  ),
  constraint resolution_policy_versions_statuses_check check (
    cardinality(eligible_feedback_statuses) between 1 and 4
    and eligible_feedback_statuses <@ array[
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed'
    ]::text[]
    and
    cardinality(eligible_reopen_statuses) between 1 and 6
    and eligible_reopen_statuses <@ array[
      'resolution_submitted', 'citizen_verification_pending', 'resolved',
      'closed', 'reopened', 'escalated'
    ]::text[]
  ),
  constraint resolution_policy_versions_attempt_check check (
    max_reopen_attempts between 1 and 20
    and repeat_escalation_threshold between 2 and max_reopen_attempts
  ),
  constraint resolution_policy_versions_reason_check check (
    cardinality(allowed_reopen_reason_codes) between 1 and 20
  ),
  constraint resolution_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint resolution_policy_versions_approval_check check (
    (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
      and effective_to is null
    )
    or (
      status = 'approved'
      and approved_by_user_id is not null
      and approved_at is not null
      and approved_at >= created_at
      and approved_at <= effective_from
    )
    or (
      status = 'superseded'
      and approved_by_user_id is not null
      and approved_at is not null
      and approved_at >= created_at
      and approved_at <= effective_from
      and effective_to is not null
    )
  )
);

alter table complaints.resolution_policy_versions
  add constraint resolution_policy_versions_no_effective_overlap
  exclude using gist (
    resolution_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index resolution_policy_versions_one_current_idx
  on complaints.resolution_policy_versions (resolution_policy_id)
  where status = 'approved' and effective_to is null;
create index resolution_policy_versions_effective_idx
  on complaints.resolution_policy_versions (
    resolution_policy_id,
    status,
    effective_from,
    effective_to
  );

create table complaints.citizen_action_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  action_type text not null,
  idempotency_key_hash text not null,
  request_fingerprint text not null,
  request_id text not null,
  expected_workflow_version bigint not null,
  state text not null default 'claimed',
  from_status text not null,
  to_status text not null,
  response_payload jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint citizen_action_requests_actor_key_unique unique (
    actor_user_id,
    idempotency_key_hash
  ),
  constraint citizen_action_requests_action_check check (
    action_type in (
      'reserve_reopen_evidence',
      'finalize_reopen_evidence',
      'submit_feedback',
      'reopen'
    )
  ),
  constraint citizen_action_requests_key_check check (
    idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint citizen_action_requests_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint citizen_action_requests_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint citizen_action_requests_workflow_version_check check (
    expected_workflow_version >= 1
  ),
  constraint citizen_action_requests_state_check check (state in ('claimed', 'completed')),
  constraint citizen_action_requests_response_check check (
    response_payload is null or jsonb_typeof(response_payload) = 'object'
  ),
  constraint citizen_action_requests_completion_check check (
    (state = 'claimed' and response_payload is null and completed_at is null)
    or (state = 'completed' and response_payload is not null and completed_at is not null)
  )
);

create table complaints.citizen_action_audit_events (
  id uuid primary key default gen_random_uuid(),
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_id uuid references complaints.complaint_resolutions (id) on delete restrict,
  assignment_id uuid references complaints.complaint_assignments (id) on delete restrict,
  action_type text not null,
  from_status text not null,
  to_status text not null,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint citizen_action_audit_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'comment', 'reasonDetail', 'exactLocation', 'latitude', 'longitude',
        'phone', 'email', 'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create table complaints.complaint_feedback (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  outcome text not null,
  satisfaction_rating smallint,
  speed_rating smallint,
  quality_rating smallint,
  communication_rating smallint,
  comment text,
  created_at timestamptz not null default now(),
  constraint complaint_feedback_resolution_citizen_unique unique (
    resolution_id,
    citizen_user_id
  ),
  constraint complaint_feedback_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_feedback_outcome_check check (
    outcome in (
      'resolved', 'partially_resolved', 'not_resolved',
      'temporary_fix', 'wrong_location'
    )
  ),
  constraint complaint_feedback_rating_check check (
    (satisfaction_rating is null or satisfaction_rating between 1 and 10)
    and (speed_rating is null or speed_rating between 1 and 10)
    and (quality_rating is null or quality_rating between 1 and 10)
    and (communication_rating is null or communication_rating between 1 and 10)
  ),
  constraint complaint_feedback_rating_shape_check check (
    num_nonnulls(
      satisfaction_rating,
      speed_rating,
      quality_rating,
      communication_rating
    ) in (0, 4)
  ),
  constraint complaint_feedback_comment_check check (
    comment is null
    or (comment = btrim(comment) and char_length(comment) between 1 and 2000)
  )
);

create table complaints.complaint_reopen_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null references complaints.complaint_resolutions (id) on delete restrict,
  uploader_user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null,
  bucket_id text not null default 'complaint-originals-private',
  object_path text not null,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  client_sha256 text not null,
  width_pixels integer,
  height_pixels integer,
  duration_milliseconds bigint,
  observed_mime_type text,
  observed_byte_size bigint,
  verified_sha256 text,
  captured_at timestamptz not null,
  capture_location extensions.geometry(Point, 4326) not null,
  capture_accuracy_meters double precision not null,
  capture_provider text not null,
  location_captured_at timestamptz not null,
  location_device_recorded_at timestamptz not null,
  mock_location_detected boolean,
  upload_status text not null default 'reserved',
  upload_expires_at timestamptz not null,
  finalized_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_reopen_evidence_object_unique unique (bucket_id, object_path),
  constraint complaint_reopen_evidence_id_scope_unique unique (
    id,
    complaint_id,
    resolution_id
  ),
  constraint complaint_reopen_evidence_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_reopen_evidence_kind_check check (kind in ('photo', 'video')),
  constraint complaint_reopen_evidence_bucket_check check (
    bucket_id = 'complaint-originals-private'
  ),
  constraint complaint_reopen_evidence_path_check check (
    object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/reopen$'
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint complaint_reopen_evidence_declared_mime_check check (
    declared_mime_type = lower(btrim(declared_mime_type))
    and declared_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_reopen_evidence_observed_mime_check check (
    observed_mime_type is null
    or observed_mime_type in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
  ),
  constraint complaint_reopen_evidence_size_check check (
    declared_byte_size between 1 and 52428800
    and (observed_byte_size is null or observed_byte_size between 1 and 52428800)
  ),
  constraint complaint_reopen_evidence_dimensions_check check (
    (width_pixels is null and height_pixels is null)
    or (
      width_pixels between 1 and 20000
      and height_pixels between 1 and 20000
    )
  ),
  constraint complaint_reopen_evidence_duration_check check (
    duration_milliseconds is null
    or (duration_milliseconds between 1 and 600000 and kind = 'video')
  ),
  constraint complaint_reopen_evidence_hash_check check (
    client_sha256 ~ '^[0-9a-f]{64}$'
    and (verified_sha256 is null or verified_sha256 ~ '^[0-9a-f]{64}$')
  ),
  constraint complaint_reopen_evidence_location_accuracy_check check (
    capture_accuracy_meters is null or capture_accuracy_meters between 0 and 5000
  ),
  constraint complaint_reopen_evidence_location_provider_check check (
    capture_provider is null
    or capture_provider in ('gps', 'network', 'fused', 'unknown')
  ),
  constraint complaint_reopen_evidence_location_check check (
    capture_location is null
    or (
      not extensions.st_isempty(capture_location)
      and extensions.st_srid(capture_location) = 4326
      and extensions.st_x(capture_location) between -180 and 180
      and extensions.st_y(capture_location) between -90 and 90
    )
  ),
  constraint complaint_reopen_evidence_location_shape_check check (
    location_captured_at <= created_at + interval '2 minutes'
    and location_device_recorded_at <= created_at + interval '2 minutes'
    and abs(extract(epoch from (
      location_captured_at - location_device_recorded_at
    ))) <= 300
  ),
  constraint complaint_reopen_evidence_status_check check (
    upload_status in ('reserved', 'finalized', 'failed', 'expired')
  ),
  constraint complaint_reopen_evidence_expiry_check check (upload_expires_at > created_at),
  constraint complaint_reopen_evidence_finalize_check check (
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
  )
);

create table complaints.complaint_reopen_requests (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null unique
    references complaints.complaint_resolutions (id) on delete restrict,
  citizen_user_id uuid not null references auth.users (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  action_request_id uuid not null unique
    references complaints.citizen_action_requests (id) on delete restrict,
  attempt_number smallint not null,
  reason_code text not null,
  reason_detail text not null,
  window_closes_at timestamptz not null,
  outcome_status text not null,
  requested_at timestamptz not null default now(),
  constraint complaint_reopen_requests_attempt_unique unique (complaint_id, attempt_number),
  constraint complaint_reopen_requests_id_scope_unique unique (
    id,
    complaint_id,
    resolution_id
  ),
  constraint complaint_reopen_requests_resolution_complaint_fkey foreign key (
    resolution_id,
    complaint_id
  ) references complaints.complaint_resolutions (id, complaint_id) on delete restrict,
  constraint complaint_reopen_requests_attempt_check check (attempt_number between 1 and 20),
  constraint complaint_reopen_requests_reason_check check (
    reason_code = btrim(reason_code)
    and reason_code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint complaint_reopen_requests_detail_check check (
    reason_detail = btrim(reason_detail)
    and char_length(reason_detail) between 1 and 4000
  ),
  constraint complaint_reopen_requests_outcome_check check (
    outcome_status in ('reopened', 'escalated')
  ),
  constraint complaint_reopen_requests_window_check check (requested_at <= window_closes_at)
);

create table complaints.complaint_reopen_evidence_links (
  reopen_request_id uuid not null
    references complaints.complaint_reopen_requests (id) on delete restrict,
  evidence_id uuid not null unique
    references complaints.complaint_reopen_evidence (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  resolution_id uuid not null
    references complaints.complaint_resolutions (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (reopen_request_id, evidence_id),
  constraint complaint_reopen_evidence_links_request_scope_fkey foreign key (
    reopen_request_id,
    complaint_id,
    resolution_id
  ) references complaints.complaint_reopen_requests (
    id,
    complaint_id,
    resolution_id
  ) on delete restrict,
  constraint complaint_reopen_evidence_links_evidence_scope_fkey foreign key (
    evidence_id,
    complaint_id,
    resolution_id
  ) references complaints.complaint_reopen_evidence (
    id,
    complaint_id,
    resolution_id
  ) on delete restrict
);

create table complaints.complaint_escalation_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  reopen_request_id uuid not null unique
    references complaints.complaint_reopen_requests (id) on delete restrict,
  resolution_policy_version_id uuid not null
    references complaints.resolution_policy_versions (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  escalation_type text not null,
  observed_reopen_count smallint not null,
  threshold_reopen_count smallint not null,
  occurred_at timestamptz not null default now(),
  constraint complaint_escalation_events_type_check check (
    escalation_type = 'repeated_reopen'
  ),
  constraint complaint_escalation_events_count_check check (
    threshold_reopen_count >= 2
    and observed_reopen_count >= threshold_reopen_count
  )
);

create index citizen_action_requests_complaint_time_idx
  on complaints.citizen_action_requests (complaint_id, claimed_at desc, id);
create index citizen_action_audit_complaint_time_idx
  on complaints.citizen_action_audit_events (complaint_id, occurred_at desc, id);
create index complaint_feedback_complaint_time_idx
  on complaints.complaint_feedback (complaint_id, created_at desc, id);
create index complaint_reopen_evidence_complaint_time_idx
  on complaints.complaint_reopen_evidence (complaint_id, created_at, id);
create index complaint_reopen_evidence_expiry_idx
  on complaints.complaint_reopen_evidence (upload_expires_at)
  where upload_status = 'reserved';
create index complaint_reopen_requests_complaint_attempt_idx
  on complaints.complaint_reopen_requests (complaint_id, attempt_number desc);
create index complaint_escalation_events_complaint_time_idx
  on complaints.complaint_escalation_events (complaint_id, occurred_at desc, id);
create index complaint_resolutions_completion_location_gix
  on complaints.complaint_resolutions using gist (completion_location)
  where completion_location is not null;

comment on table complaints.resolution_policies is
  'Stable, scope-aware identity for versioned citizen feedback and reopening policy.';
comment on table complaints.resolution_policy_versions is
  'Effective-dated approved policy snapshots. No Phase 7 production policy is seeded.';
comment on table complaints.citizen_action_requests is
  'Durable exact-replay ledger for citizen feedback, reopen, and follow-up evidence mutations.';
comment on table complaints.citizen_action_audit_events is
  'Append-only, data-minimized audit evidence for successful citizen accountability actions.';
comment on table complaints.complaint_feedback is
  'Immutable citizen feedback linked to one exact completed resolution and policy version.';
comment on table complaints.complaint_reopen_evidence is
  'Private integrity-checked citizen follow-up evidence reserved before a reopen request.';
comment on table complaints.complaint_reopen_requests is
  'Accepted, policy-bound citizen reopen requests; denied attempts leave no partial record.';
comment on table complaints.complaint_escalation_events is
  'Append-only repeated-reopen escalation evidence with policy and assignment snapshots.';
$migration_20260716100000_phase_7_accountability_schema$;

  if not (pg_temp.local_wellness_relation_exists('complaints.resolution_policies')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_reopen_requests')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_escalation_events')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716100000_phase_7_accountability_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 26,
    cutoff_name = '20260716100000_phase_7_accountability_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260716100000_phase_7_accountability_schema.sql';
end;
$guard_26$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716100000_phase_7_accountability_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716101000_phase_7_accountability_security_and_rpc.sql
-- ============================================================================
do $guard_27$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 27 then
    raise notice 'Skipping already-complete migration 20260716101000_phase_7_accountability_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 26 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716101000_phase_7_accountability_security_and_rpc.sql';
  end if;

  execute $migration_20260716101000_phase_7_accountability_security_and_rpc$
alter table complaints.complaint_status_history
  drop constraint complaint_status_history_source_check,
  add constraint complaint_status_history_source_check check (
    event_source in ('citizen_submission', 'citizen_action', 'government_action', 'system')
  );

create function complaints.validate_resolution_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  if exists (
    select 1
    from unnest(new.eligible_reopen_statuses) as value(status)
    where value.status is null
  ) or exists (
    select 1
    from unnest(new.eligible_feedback_statuses) as value(status)
    where value.status is null
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    where value.reason_code is null
  ) or exists (
    select 1
    from unnest(new.eligible_reopen_statuses) as value(status)
    group by value.status
    having count(*) > 1
  ) or exists (
    select 1
    from unnest(new.eligible_feedback_statuses) as value(status)
    group by value.status
    having count(*) > 1
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    where value.reason_code !~ '^[a-z][a-z0-9_]{1,79}$'
       or value.reason_code <> btrim(value.reason_code)
    group by value.reason_code
    having count(*) >= 1
  ) or exists (
    select 1
    from unnest(new.allowed_reopen_reason_codes) as value(reason_code)
    group by value.reason_code
    having count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'RESOLUTION_POLICY_CONFIGURATION_INVALID';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.resolution_policy_id is distinct from old.resolution_policy_id
    or new.version is distinct from old.version
    or new.rating_minimum is distinct from old.rating_minimum
    or new.rating_maximum is distinct from old.rating_maximum
    or new.ratings_required is distinct from old.ratings_required
    or new.feedback_window_seconds is distinct from old.feedback_window_seconds
    or new.eligible_feedback_statuses is distinct from old.eligible_feedback_statuses
    or new.reopen_window_seconds is distinct from old.reopen_window_seconds
    or new.eligible_reopen_statuses is distinct from old.eligible_reopen_statuses
    or new.max_reopen_attempts is distinct from old.max_reopen_attempts
    or new.reopen_evidence_required is distinct from old.reopen_evidence_required
    or new.allowed_reopen_reason_codes is distinct from old.allowed_reopen_reason_codes
    or new.repeat_escalation_threshold is distinct from old.repeat_escalation_threshold
    or new.effective_from is distinct from old.effective_from
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and not (
    (
      old.status = 'draft'
      and new.status = 'approved'
      and old.approved_by_user_id is null
      and old.approved_at is null
      and old.effective_to is null
      and new.approved_by_user_id is not null
      and new.approved_at is not null
      and new.effective_to is null
    )
    or (
      old.status = 'approved'
      and new.status = 'superseded'
      and new.effective_to is not null
      and new.effective_to > new.effective_from
      and new.effective_to >= current_timestamp
      and new.approved_by_user_id is not distinct from old.approved_by_user_id
      and new.approved_at is not distinct from old.approved_at
    )
  ) then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_VERSION_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger resolution_policy_versions_validate
before insert or update or delete on complaints.resolution_policy_versions
for each row execute function complaints.validate_resolution_policy_version();

create function complaints.current_citizen_action_request_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text;
begin
  configured := current_setting('local_wellness.citizen_action_id', true);
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

create function complaints.validate_citizen_action_request_mutation()
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
    or new.expected_workflow_version is distinct from old.expected_workflow_version
    or new.from_status is distinct from old.from_status
    or new.to_status is distinct from old.to_status
    or new.claimed_at is distinct from old.claimed_at
    or complaints.current_citizen_action_request_id() is distinct from old.id
    or new.state <> 'completed'
    or new.response_payload is null
    or new.completed_at is null then
    raise exception using errcode = '55000', message = 'CITIZEN_ACTION_REQUEST_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger citizen_action_requests_validate_mutation
before update or delete on complaints.citizen_action_requests
for each row execute function complaints.validate_citizen_action_request_mutation();

create or replace function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  government_action_id uuid := complaints.current_action_request_id();
  citizen_action_id uuid := complaints.current_citizen_action_request_id();
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

  if government_action_id is not null and exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = government_action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    return new;
  end if;

  if citizen_action_id is not null and exists (
    select 1
    from complaints.citizen_action_requests as action
    where action.id = citizen_action_id
      and action.complaint_id = old.id
      and action.actor_user_id = old.citizen_user_id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'complaints.complaints records are append-only.';
end;
$$;

create function complaints.validate_reopen_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_id uuid := complaints.current_citizen_action_request_id();
  mutation_mode text := nullif(
    current_setting('local_wellness.reopen_evidence_mutation', true),
    ''
  );
begin
  if tg_op = 'DELETE'
    or old.upload_status <> 'reserved'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.resolution_id is distinct from old.resolution_id
    or new.uploader_user_id is distinct from old.uploader_user_id
    or new.kind is distinct from old.kind
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.declared_mime_type is distinct from old.declared_mime_type
    or new.declared_byte_size is distinct from old.declared_byte_size
    or new.client_sha256 is distinct from old.client_sha256
    or new.width_pixels is distinct from old.width_pixels
    or new.height_pixels is distinct from old.height_pixels
    or new.duration_milliseconds is distinct from old.duration_milliseconds
    or new.captured_at is distinct from old.captured_at
    or not extensions.st_equals(new.capture_location, old.capture_location)
    or new.capture_accuracy_meters is distinct from old.capture_accuracy_meters
    or new.capture_provider is distinct from old.capture_provider
    or new.location_captured_at is distinct from old.location_captured_at
    or new.location_device_recorded_at is distinct from old.location_device_recorded_at
    or new.mock_location_detected is distinct from old.mock_location_detected
    or new.upload_expires_at is distinct from old.upload_expires_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
  end if;

  if new.upload_status = 'finalized' then
    if action_id is null or not exists (
      select 1
      from complaints.citizen_action_requests as action
      where action.id = action_id
        and action.complaint_id = old.complaint_id
        and action.actor_user_id = old.uploader_user_id
        and action.action_type = 'finalize_reopen_evidence'
        and action.state = 'claimed'
    ) then
      raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
    end if;
  elsif new.upload_status in ('failed', 'expired') then
    if mutation_mode not in ('fail', 'expire')
      or new.failure_code is null
      or new.failure_code !~ '^[A-Z][A-Z0-9_]{2,63}$'
      or new.observed_mime_type is distinct from old.observed_mime_type
      or new.observed_byte_size is distinct from old.observed_byte_size
      or new.verified_sha256 is distinct from old.verified_sha256
      or new.finalized_at is distinct from old.finalized_at then
      raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
    end if;
  else
    raise exception using errcode = '55000', message = 'COMPLAINT_REOPEN_EVIDENCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger complaint_reopen_evidence_validate_mutation
before update or delete on complaints.complaint_reopen_evidence
for each row execute function complaints.validate_reopen_evidence_mutation();
create trigger complaint_reopen_evidence_set_updated_at
before update on complaints.complaint_reopen_evidence
for each row execute function private.set_updated_at();
create trigger resolution_policies_append_only
before update or delete on complaints.resolution_policies
for each row execute function complaints.reject_append_only_mutation();

create trigger citizen_action_audit_events_append_only
before update or delete on complaints.citizen_action_audit_events
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_feedback_append_only
before update or delete on complaints.complaint_feedback
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_reopen_requests_append_only
before update or delete on complaints.complaint_reopen_requests
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_reopen_evidence_links_append_only
before update or delete on complaints.complaint_reopen_evidence_links
for each row execute function complaints.reject_append_only_mutation();
create trigger complaint_escalation_events_append_only
before update or delete on complaints.complaint_escalation_events
for each row execute function complaints.reject_append_only_mutation();

create function complaints.resolve_resolution_policy_version(
  p_authority_id uuid,
  p_category_id uuid,
  p_at timestamptz default current_timestamp
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_id uuid;
  selected_count integer;
begin
  with eligible as (
    select
      version.id,
      ((policy.authority_id is not null)::integer
        + (policy.category_id is not null)::integer) as specificity
    from complaints.resolution_policies as policy
    inner join complaints.resolution_policy_versions as version
      on version.resolution_policy_id = policy.id
    where version.status in ('approved', 'superseded')
      and version.effective_from <= p_at
      and (version.effective_to is null or version.effective_to > p_at)
      and (policy.authority_id is null or policy.authority_id = p_authority_id)
      and (policy.category_id is null or policy.category_id = p_category_id)
  ), ranked as (
    select eligible.*, max(eligible.specificity) over () as highest_specificity
    from eligible
  )
  select (array_agg(ranked.id order by ranked.id))[1], count(*)::integer
  into selected_id, selected_count
  from ranked
  where ranked.specificity = ranked.highest_specificity;

  if selected_id is null or selected_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  return selected_id;
end;
$$;

insert into complaints.government_status_transition_rules (
  action_type,
  from_status,
  to_status
)
values
  ('submit_resolution', 'acknowledged', 'citizen_verification_pending'),
  ('submit_resolution', 'inspection_completed', 'citizen_verification_pending'),
  ('submit_resolution', 'work_order_created', 'citizen_verification_pending'),
  ('submit_resolution', 'work_in_progress', 'citizen_verification_pending')
on conflict do nothing;

alter function public.perform_government_complaint_action(
  uuid, uuid, text, bigint, text, text, text, jsonb
) rename to perform_government_complaint_action_phase5_impl;

revoke all on function public.perform_government_complaint_action_phase5_impl(
  uuid, uuid, text, bigint, text, text, text, jsonb
) from public, anon, authenticated, service_role;

create function complaints.perform_phase7_resolution_submission(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text,
  p_payload jsonb
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
  resolution_id uuid := gen_random_uuid();
  resolution_version integer;
  evidence_ids uuid[];
  history_id uuid := gen_random_uuid();
  response jsonb;
  location_payload jsonb;
  completion_longitude double precision;
  completion_latitude double precision;
  completion_accuracy double precision;
  completion_provider text;
  location_captured_at timestamptz;
  location_device_recorded_at timestamptz;
  mock_location_detected boolean;
  maximum_location_accuracy double precision;
  maximum_location_age_seconds integer;
  work_reference_id uuid;
  public_message text;
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
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload - array[
      'completionNote', 'resolutionEvidenceIds', 'publicMessage',
      'completionLocation', 'workReferenceId'
    ] <> '{}'::jsonb
    or not (p_payload ?& array[
      'completionNote', 'resolutionEvidenceIds', 'completionLocation'
    ])
    or jsonb_typeof(p_payload -> 'resolutionEvidenceIds') <> 'array'
    or jsonb_array_length(p_payload -> 'resolutionEvidenceIds') not between 1 and 20
    or jsonb_typeof(p_payload -> 'completionLocation') <> 'object' then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.government_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'submit_resolution'
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
      p_actor_user_id,
      assignment.id,
      'submit_resolution',
      null,
      operation_at
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
    p_actor_user_id,
    assignment.id,
    'submit_resolution',
    null,
    operation_at
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  if not exists (
    select 1
    from complaints.government_status_transition_rules as rule
    where rule.action_type = 'submit_resolution'
      and rule.from_status = complaint.current_status
      and rule.to_status = 'citizen_verification_pending'
  ) or exists (
    select 1
    from complaints.complaint_external_dependencies as dependency
    where dependency.complaint_id = complaint.id
      and dependency.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'INVALID_STATUS_TRANSITION';
  end if;

  location_payload := p_payload -> 'completionLocation';
  if location_payload - array[
    'longitude', 'latitude', 'accuracyMeters', 'provider', 'capturedAt',
    'deviceRecordedAt', 'isMockLocation'
  ] <> '{}'::jsonb
    or not (location_payload ?& array[
      'longitude', 'latitude', 'accuracyMeters', 'provider', 'capturedAt',
      'deviceRecordedAt', 'isMockLocation'
    ])
    or jsonb_typeof(location_payload -> 'longitude') <> 'number'
    or jsonb_typeof(location_payload -> 'latitude') <> 'number'
    or jsonb_typeof(location_payload -> 'accuracyMeters') <> 'number'
    or jsonb_typeof(location_payload -> 'provider') <> 'string'
    or jsonb_typeof(location_payload -> 'capturedAt') <> 'string'
    or jsonb_typeof(location_payload -> 'deviceRecordedAt') <> 'string'
    or jsonb_typeof(location_payload -> 'isMockLocation') not in ('boolean', 'null') then
    raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end if;
  begin
    completion_longitude := (location_payload ->> 'longitude')::double precision;
    completion_latitude := (location_payload ->> 'latitude')::double precision;
    completion_accuracy := (location_payload ->> 'accuracyMeters')::double precision;
    completion_provider := location_payload ->> 'provider';
    location_captured_at := (location_payload ->> 'capturedAt')::timestamptz;
    location_device_recorded_at :=
      (location_payload ->> 'deviceRecordedAt')::timestamptz;
    mock_location_detected := (location_payload ->> 'isMockLocation')::boolean;
    work_reference_id := nullif(p_payload ->> 'workReferenceId', '')::uuid;
  exception
    when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end;
  select
    coalesce(
      (category.location_verification_requirements ->> 'maximumAccuracyMeters')::double precision,
      100
    ),
    coalesce(
      (category.location_verification_requirements ->> 'maximumAgeSeconds')::integer,
      300
    )
  into maximum_location_accuracy, maximum_location_age_seconds
  from routing.issue_categories as category
  where category.id = complaint.category_id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  if location_captured_at is null
    or location_device_recorded_at is null
    or completion_longitude not between -180 and 180
    or completion_latitude not between -90 and 90
    or completion_accuracy not between 0 and 5000
    or completion_provider not in ('gps', 'network', 'fused', 'unknown')
    or completion_accuracy > maximum_location_accuracy
    or mock_location_detected is true
    or extract(epoch from (operation_at - location_captured_at))
      > maximum_location_age_seconds
    or location_captured_at > operation_at + interval '2 minutes'
    or location_device_recorded_at > operation_at + interval '2 minutes'
    or abs(extract(epoch from (
      location_captured_at - location_device_recorded_at
    ))) > 300 then
    raise exception using errcode = '22023', message = 'RESOLUTION_COMPLETION_LOCATION_INVALID';
  end if;

  if work_reference_id is not null and not exists (
    select 1
    from complaints.complaint_work_references as work_reference
    where work_reference.id = work_reference_id
      and work_reference.complaint_id = complaint.id
      and work_reference.assignment_id = assignment.id
  ) then
    raise exception using errcode = '22023', message = 'RESOLUTION_WORK_REFERENCE_INVALID';
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
    select count(distinct evidence_id)::integer
    from unnest(evidence_ids) as evidence_id
  ) then
    raise exception using errcode = '22023', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;

  perform 1
  from complaints.complaint_resolution_evidence as evidence
  where evidence.id = any(evidence_ids)
  for update;
  if (
    select count(*)
    from complaints.complaint_resolution_evidence as evidence
    where evidence.id = any(evidence_ids)
      and evidence.complaint_id = complaint.id
      and evidence.assignment_id = assignment.id
      and evidence.upload_status = 'finalized'
      and evidence.finalized_at is not null
      and not exists (
        select 1
        from complaints.complaint_resolution_evidence_links as link
        where link.evidence_id = evidence.id
      )
  ) <> cardinality(evidence_ids) then
    raise exception using errcode = '23514', message = 'RESOLUTION_EVIDENCE_NOT_READY';
  end if;

  insert into complaints.government_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'submit_resolution',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.current_status, 'citizen_verification_pending'
  );
  perform set_config('local_wellness.government_action_id', action_id::text, true);

  select coalesce(max(resolution.version), 0) + 1
  into resolution_version
  from complaints.complaint_resolutions as resolution
  where resolution.complaint_id = complaint.id;
  public_message := nullif(btrim(p_payload ->> 'publicMessage'), '');
  insert into complaints.complaint_resolutions (
    id, complaint_id, version, assignment_id, submitted_by_user_id,
    completion_note, public_message, created_at, completed_at,
    completion_location, completion_accuracy_meters, completion_provider,
    location_captured_at, completion_location_device_recorded_at,
    completion_mock_location_detected, completion_distance_to_complaint_meters,
    work_reference_id
  ) values (
    resolution_id, complaint.id, resolution_version, assignment.id,
    p_actor_user_id, btrim(p_payload ->> 'completionNote'), public_message,
    operation_at, operation_at,
    extensions.st_setsrid(
      extensions.st_makepoint(completion_longitude, completion_latitude),
      4326
    )::extensions.geometry(Point, 4326),
    completion_accuracy, completion_provider, location_captured_at,
    location_device_recorded_at, mock_location_detected,
    (
      select extensions.st_distance(
        original_location.location::extensions.geography,
        extensions.st_setsrid(
          extensions.st_makepoint(completion_longitude, completion_latitude),
          4326
        )::extensions.geography
      )
      from complaints.complaint_location_evidence as original_location
      where original_location.id = complaint.location_evidence_id
    ),
    work_reference_id
  );
  insert into complaints.complaint_resolution_evidence_links (
    resolution_id,
    evidence_id,
    role,
    created_at
  )
  select resolution_id, evidence_id, 'after', operation_at
  from unnest(evidence_ids) as evidence_id;

  update complaints.complaints as target
  set
    current_status = 'citizen_verification_pending',
    workflow_version = target.workflow_version + 1,
    updated_at = operation_at
  where target.id = complaint.id;

  insert into complaints.complaint_status_history (
    id, complaint_id, sequence, from_status, to_status, actor_user_id,
    event_source, reason_code, public_message, request_id, occurred_at
  ) values (
    history_id, complaint.id,
    (select coalesce(max(history.sequence), 0) + 1
      from complaints.complaint_status_history as history
      where history.complaint_id = complaint.id),
    complaint.current_status, 'citizen_verification_pending', p_actor_user_id,
    'government_action', 'RESOLUTION_SUBMITTED', public_message,
    p_request_id, operation_at
  );
  insert into complaints.notification_outbox (
    complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
  ) values (
    complaint.id, history_id, 'complaint_status_changed', complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', 'citizen_verification_pending',
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )),
    operation_at
  );

  response := jsonb_build_object(
    'actionId', action_id,
    'complaintId', complaint.id,
    'complaintNumber', complaint.complaint_number,
    'status', 'citizen_verification_pending',
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
    assignment.id, 'submit_resolution', complaint.current_status,
    'citizen_verification_pending', p_request_id,
    jsonb_build_object('entityId', resolution_id), operation_at
  );
  update complaints.government_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
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
begin
  if p_action_type = 'submit_resolution' then
    return query
    select result.response_payload, result.replayed
    from complaints.perform_phase7_resolution_submission(
      p_actor_user_id,
      p_complaint_id,
      p_expected_workflow_version,
      p_idempotency_key_hash,
      p_request_fingerprint,
      p_request_id,
      p_payload
    ) as result;
    return;
  end if;

  return query
  select result.response_payload, result.replayed
  from public.perform_government_complaint_action_phase5_impl(
    p_actor_user_id,
    p_complaint_id,
    p_action_type,
    p_expected_workflow_version,
    p_idempotency_key_hash,
    p_request_fingerprint,
    p_request_id,
    p_payload
  ) as result;
end;
$$;

create function complaints.accountability_resolution_payload(
  p_complaint_id uuid,
  p_resolution_id uuid,
  p_include_completion_note boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', resolution.id,
    'version', resolution.version,
    'publicMessage', resolution.public_message,
    'completedAt', resolution.completed_at,
    'completionLocation', case when resolution.completion_location is null then null
      else jsonb_build_object(
        'latitude', extensions.st_y(resolution.completion_location),
        'longitude', extensions.st_x(resolution.completion_location),
        'accuracyMeters', resolution.completion_accuracy_meters,
        'provider', resolution.completion_provider,
        'capturedAt', resolution.location_captured_at
      ) end,
    'distanceFromComplaintMeters', resolution.completion_distance_to_complaint_meters,
    'workReference', case when resolution.work_reference_id is null then null else (
      select jsonb_build_object(
        'id', work_reference.id,
        'referenceType', work_reference.reference_type,
        'referenceNumber', work_reference.reference_number,
        'description', work_reference.description
      )
      from complaints.complaint_work_references as work_reference
      where work_reference.id = resolution.work_reference_id
        and work_reference.complaint_id = resolution.complaint_id
    ) end,
    'beforeEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', media.id,
        'role', 'before',
        'kind', media.media_kind,
        'mimeType', coalesce(media.observed_mime_type, media.declared_mime_type),
        'byteSize', coalesce(media.observed_byte_size, media.declared_byte_size),
        'capturedAt', media.captured_at,
        'createdAt', media.created_at
      ) order by media.created_at, media.id)
      from complaints.complaint_media as media
      inner join complaints.complaints as source_complaint
        on source_complaint.draft_id = media.draft_id
      where source_complaint.id = resolution.complaint_id
        and media.upload_status = 'finalized'
    ), '[]'::jsonb),
    'afterEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'role', 'after',
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'capturedAt', evidence.captured_at,
        'createdAt', evidence.created_at
      ) order by link.created_at, evidence.id)
      from complaints.complaint_resolution_evidence_links as link
      inner join complaints.complaint_resolution_evidence as evidence
        on evidence.id = link.evidence_id
      where link.resolution_id = resolution.id
        and evidence.upload_status = 'finalized'
    ), '[]'::jsonb),
    'reopenEvidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'role', 'reopen',
        'kind', evidence.kind,
        'mimeType', coalesce(evidence.observed_mime_type, evidence.declared_mime_type),
        'byteSize', coalesce(evidence.observed_byte_size, evidence.declared_byte_size),
        'capturedAt', evidence.captured_at,
        'createdAt', evidence.created_at
      ) order by link.created_at, evidence.id)
      from complaints.complaint_reopen_requests as reopen_request
      inner join complaints.complaint_reopen_evidence_links as link
        on link.reopen_request_id = reopen_request.id
      inner join complaints.complaint_reopen_evidence as evidence
        on evidence.id = link.evidence_id
      where reopen_request.resolution_id = resolution.id
        and evidence.upload_status = 'finalized'
    ), '[]'::jsonb)
  ) || case when p_include_completion_note
    then jsonb_build_object('completionNote', resolution.completion_note)
    else '{}'::jsonb
  end
  from complaints.complaint_resolutions as resolution
  where resolution.id = p_resolution_id
    and resolution.complaint_id = p_complaint_id;
$$;

create function public.get_citizen_resolution_context(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (resolution_context jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy_version complaints.resolution_policy_versions%rowtype;
  reopen_count integer := 0;
  policy_payload jsonb := null;
  policy_unavailable_reason text := null;
  feedback_allowed boolean := false;
  reopen_allowed boolean := false;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;

  if resolution.id is not null then
    select historical_assignment.* into resolution_assignment
    from complaints.complaint_assignments as historical_assignment
    where historical_assignment.id = resolution.assignment_id
      and historical_assignment.complaint_id = complaint.id;
  end if;

  if resolution.id is null then
    policy_unavailable_reason := 'No completed resolution is available for review.';
  elsif resolution.completed_at is null then
    policy_unavailable_reason := 'The latest resolution is not ready for citizen review.';
  else
    select count(*)::integer into reopen_count
    from complaints.complaint_reopen_requests as reopen_request
    where reopen_request.complaint_id = complaint.id;

    if resolution_assignment.id is null then
      policy_unavailable_reason := 'No resolution assignment is available for this complaint.';
    else
      begin
        select version.* into policy_version
        from complaints.resolution_policy_versions as version
        where version.id = complaints.resolve_resolution_policy_version(
          resolution_assignment.authority_id,
          complaint.category_id,
          resolution.completed_at
        );

        feedback_allowed := complaint.current_status = any(policy_version.eligible_feedback_statuses)
          and current_timestamp <= resolution.completed_at
            + make_interval(secs => policy_version.feedback_window_seconds)
          and not exists (
            select 1
            from complaints.complaint_feedback as feedback
            where feedback.resolution_id = resolution.id
              and feedback.citizen_user_id = p_actor_user_id
          );
        reopen_allowed := complaint.current_status = any(policy_version.eligible_reopen_statuses)
          and current_timestamp <= resolution.completed_at
            + make_interval(secs => policy_version.reopen_window_seconds)
          and reopen_count < policy_version.max_reopen_attempts
          and not exists (
            select 1
            from complaints.complaint_reopen_requests as reopen_request
            where reopen_request.resolution_id = resolution.id
          );
        policy_payload := jsonb_build_object(
          'id', policy_version.id,
          'version', policy_version.version,
          'outcomeOptions', jsonb_build_array(
            jsonb_build_object('code', 'resolved', 'label', 'Resolved'),
            jsonb_build_object('code', 'partially_resolved', 'label', 'Partially resolved'),
            jsonb_build_object('code', 'not_resolved', 'label', 'Not resolved'),
            jsonb_build_object('code', 'temporary_fix', 'label', 'Temporary fix'),
            jsonb_build_object('code', 'wrong_location', 'label', 'Wrong location')
          ),
          'reopenReasonOptions', coalesce((
            select jsonb_agg(jsonb_build_object(
              'code', reason.code,
              'label', initcap(replace(reason.code, '_', ' '))
            ) order by reason.ordinal)
            from unnest(policy_version.allowed_reopen_reason_codes)
              with ordinality as reason(code, ordinal)
          ), '[]'::jsonb),
          'ratingMinimum', policy_version.rating_minimum,
          'ratingMaximum', policy_version.rating_maximum,
          'ratingsRequired', policy_version.ratings_required,
          'ratingLabels', jsonb_build_object(
            'satisfaction', 'Satisfaction',
            'speed', 'Resolution speed',
            'quality', 'Resolution quality',
            'communication', 'Communication'
          ),
          'reopenDeadline', resolution.completed_at
            + make_interval(secs => policy_version.reopen_window_seconds),
          'reopenAttemptsRemaining', greatest(
            policy_version.max_reopen_attempts - reopen_count,
            0
          ),
          'reopenEvidenceRequired', policy_version.reopen_evidence_required,
          'feedbackAllowed', feedback_allowed,
          'reopenAllowed', reopen_allowed,
          'reopenEvidenceUploadAllowed', reopen_allowed,
          'unavailableReason', null
        );
      exception when sqlstate '55000' then
        policy_unavailable_reason :=
          'No unambiguous approved resolution policy is available for this complaint.';
      end;
    end if;
  end if;

  return query select jsonb_build_object(
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version,
    'status', complaint.current_status,
    'latestResolution', case when resolution.id is null then null
      else complaints.accountability_resolution_payload(
        complaint.id,
        resolution.id,
        false
      ) end,
    'policy', policy_payload,
    'policyUnavailableReason', policy_unavailable_reason,
    'availableReopenEvidence', case when resolution.id is null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', evidence.id,
          'kind', evidence.kind,
          'mimeType', evidence.observed_mime_type,
          'byteSize', evidence.observed_byte_size,
          'uploadStatus', evidence.upload_status,
          'capturedAt', evidence.captured_at,
          'captureLocation', jsonb_build_object(
            'latitude', extensions.st_y(evidence.capture_location),
            'longitude', extensions.st_x(evidence.capture_location),
            'accuracyMeters', evidence.capture_accuracy_meters,
            'provider', evidence.capture_provider,
            'capturedAt', evidence.location_captured_at
          ),
          'finalizedAt', evidence.finalized_at,
          'createdAt', evidence.created_at
        ) order by evidence.created_at, evidence.id)
        from complaints.complaint_reopen_evidence as evidence
        where evidence.complaint_id = complaint.id
          and evidence.resolution_id = resolution.id
          and evidence.uploader_user_id = p_actor_user_id
          and evidence.upload_status = 'finalized'
          and not exists (
            select 1
            from complaints.complaint_reopen_evidence_links as link
            where link.evidence_id = evidence.id
          )
      ), '[]'::jsonb) end,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', feedback.id,
        'resolutionId', feedback.resolution_id,
        'outcome', feedback.outcome,
        'ratings', case when feedback.satisfaction_rating is null then null
          else jsonb_build_object(
            'satisfaction', feedback.satisfaction_rating,
            'speed', feedback.speed_rating,
            'quality', feedback.quality_rating,
            'communication', feedback.communication_rating
          ) end,
        'comment', feedback.comment,
        'submittedAt', feedback.created_at
      ) order by feedback.created_at, feedback.id)
      from complaints.complaint_feedback as feedback
      where feedback.complaint_id = complaint.id
        and feedback.citizen_user_id = p_actor_user_id
    ), '[]'::jsonb),
    'reopenRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reopen_request.id,
        'resolutionId', reopen_request.resolution_id,
        'attemptNumber', reopen_request.attempt_number,
        'reasonCode', reopen_request.reason_code,
        'explanation', reopen_request.reason_detail,
        'evidenceIds', coalesce((
          select jsonb_agg(link.evidence_id order by link.created_at, link.evidence_id)
          from complaints.complaint_reopen_evidence_links as link
          where link.reopen_request_id = reopen_request.id
        ), '[]'::jsonb),
        'resultingStatus', reopen_request.outcome_status,
        'requestedAt', reopen_request.requested_at
      ) order by reopen_request.attempt_number)
      from complaints.complaint_reopen_requests as reopen_request
      where reopen_request.complaint_id = complaint.id
        and reopen_request.citizen_user_id = p_actor_user_id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', escalation.id,
        'level', escalation.observed_reopen_count,
        'reasonCode', escalation.escalation_type,
        'occurredAt', escalation.occurred_at
      ) order by escalation.occurred_at, escalation.id)
      from complaints.complaint_escalation_events as escalation
      where escalation.complaint_id = complaint.id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_government_complaint_accountability(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid
)
returns table (accountability jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  if not found or not complaints.actor_can_access_assignment(
    p_actor_user_id,
    assignment.id,
    'view',
    p_scope_role_assignment_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  return query select jsonb_build_object(
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version,
    'resolutionHistory', coalesce((
      select jsonb_agg(
        complaints.accountability_resolution_payload(
          complaint.id,
          resolution.id,
          true
        ) order by resolution.version
      )
      from complaints.complaint_resolutions as resolution
      where resolution.complaint_id = complaint.id
    ), '[]'::jsonb),
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', feedback.id,
        'resolutionId', feedback.resolution_id,
        'outcome', feedback.outcome,
        'ratings', case when feedback.satisfaction_rating is null then null
          else jsonb_build_object(
            'satisfaction', feedback.satisfaction_rating,
            'speed', feedback.speed_rating,
            'quality', feedback.quality_rating,
            'communication', feedback.communication_rating
          ) end,
        'comment', feedback.comment,
        'submittedAt', feedback.created_at
      ) order by feedback.created_at, feedback.id)
      from complaints.complaint_feedback as feedback
      where feedback.complaint_id = complaint.id
    ), '[]'::jsonb),
    'reopenRequests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reopen_request.id,
        'resolutionId', reopen_request.resolution_id,
        'attemptNumber', reopen_request.attempt_number,
        'reasonCode', reopen_request.reason_code,
        'explanation', reopen_request.reason_detail,
        'evidenceIds', coalesce((
          select jsonb_agg(link.evidence_id order by link.created_at, link.evidence_id)
          from complaints.complaint_reopen_evidence_links as link
          where link.reopen_request_id = reopen_request.id
        ), '[]'::jsonb),
        'resultingStatus', reopen_request.outcome_status,
        'requestedAt', reopen_request.requested_at
      ) order by reopen_request.attempt_number)
      from complaints.complaint_reopen_requests as reopen_request
      where reopen_request.complaint_id = complaint.id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', escalation.id,
        'level', escalation.observed_reopen_count,
        'reasonCode', escalation.escalation_type,
        'occurredAt', escalation.occurred_at
      ) order by escalation.occurred_at, escalation.id)
      from complaints.complaint_escalation_events as escalation
      where escalation.complaint_id = complaint.id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_citizen_complaint_evidence_object(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_evidence_id uuid,
  p_purpose text
)
returns table (
  evidence_id uuid,
  evidence_role text,
  bucket_id text,
  object_path text,
  declared_mime_type text,
  declared_byte_size bigint,
  client_sha256 text,
  observed_mime_type text,
  observed_byte_size bigint,
  upload_expires_at timestamptz,
  upload_status text,
  workflow_version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select located.*
  from (
    select
      media.id,
      'before'::text,
      media.bucket_id,
      media.object_path,
      media.declared_mime_type,
      media.declared_byte_size,
      media.client_sha256,
      media.observed_mime_type,
      media.observed_byte_size,
      media.upload_expires_at,
      media.upload_status,
      complaint.workflow_version
    from complaints.complaint_media as media
    inner join complaints.complaints as complaint on complaint.draft_id = media.draft_id
    where p_purpose = 'view'
      and media.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and media.upload_status = 'finalized'

    union all

    select
      evidence.id,
      'after'::text,
      evidence.bucket_id,
      evidence.object_path,
      evidence.declared_mime_type,
      evidence.declared_byte_size,
      evidence.client_sha256,
      evidence.observed_mime_type,
      evidence.observed_byte_size,
      evidence.upload_expires_at,
      evidence.upload_status,
      complaint.workflow_version
    from complaints.complaint_resolution_evidence as evidence
    inner join complaints.complaint_resolution_evidence_links as link
      on link.evidence_id = evidence.id
    inner join complaints.complaint_resolutions as resolution
      on resolution.id = link.resolution_id
    inner join complaints.complaints as complaint on complaint.id = resolution.complaint_id
    where p_purpose = 'view'
      and evidence.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and evidence.upload_status = 'finalized'

    union all

    select
      evidence.id,
      'reopen'::text,
      evidence.bucket_id,
      evidence.object_path,
      evidence.declared_mime_type,
      evidence.declared_byte_size,
      evidence.client_sha256,
      evidence.observed_mime_type,
      evidence.observed_byte_size,
      evidence.upload_expires_at,
      evidence.upload_status,
      complaint.workflow_version
    from complaints.complaint_reopen_evidence as evidence
    inner join complaints.complaints as complaint on complaint.id = evidence.complaint_id
    where evidence.id = p_evidence_id
      and complaint.id = p_complaint_id
      and complaint.citizen_user_id = p_actor_user_id
      and evidence.uploader_user_id = p_actor_user_id
      and (
        (p_purpose = 'view' and evidence.upload_status = 'finalized')
        or (
          p_purpose = 'finalize'
          and (
            evidence.upload_status = 'finalized'
            or (
              evidence.upload_status = 'reserved'
            )
          )
        )
      )
  ) as located;
$$;

create function public.reserve_citizen_reopen_evidence(
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
  p_captured_at timestamptz,
  p_width_pixels integer,
  p_height_pixels integer,
  p_duration_milliseconds bigint,
  p_location_longitude double precision,
  p_location_latitude double precision,
  p_location_accuracy_meters double precision,
  p_location_provider text,
  p_location_captured_at timestamptz,
  p_location_device_recorded_at timestamptz,
  p_location_mock_detected boolean
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
  captured_at timestamptz,
  location_longitude double precision,
  location_latitude double precision,
  location_accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
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
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  evidence complaints.complaint_reopen_evidence%rowtype;
  action_id uuid := gen_random_uuid();
  next_evidence_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  response jsonb;
  normalized_mime text := lower(btrim(p_mime_type));
  maximum_location_accuracy double precision;
  maximum_location_age_seconds integer;
  location_field_count integer := num_nonnulls(
    p_location_longitude,
    p_location_latitude,
    p_location_accuracy_meters,
    p_location_provider,
    p_location_captured_at,
    p_location_device_recorded_at
  );
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
    or p_kind not in ('photo', 'video')
    or normalized_mime not in (
      'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    )
    or (p_kind = 'photo' and normalized_mime not like 'image/%')
    or (p_kind = 'video' and normalized_mime not like 'video/%')
    or p_byte_size not between 1 and 52428800
    or p_sha256 !~ '^[0-9a-f]{64}$'
    or p_captured_at is null
    or p_captured_at > operation_at + interval '2 minutes'
    or ((p_width_pixels is null) <> (p_height_pixels is null))
    or (p_width_pixels is not null and (
      p_width_pixels not between 1 and 20000
      or p_height_pixels not between 1 and 20000
    ))
    or (p_kind = 'photo' and p_duration_milliseconds is not null)
    or (p_kind = 'video' and (
      p_duration_milliseconds is null
      or p_duration_milliseconds not between 1 and 600000
    ))
    or location_field_count <> 6 then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  if (
    p_location_longitude not between -180 and 180
    or p_location_latitude not between -90 and 90
    or p_location_accuracy_meters not between 0 and 5000
    or p_location_provider not in ('gps', 'network', 'fused', 'unknown')
    or p_location_captured_at > operation_at + interval '2 minutes'
    or p_location_device_recorded_at > operation_at + interval '2 minutes'
    or abs(extract(epoch from (
      p_location_captured_at - p_location_device_recorded_at
    ))) > 300
  ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'reserve_reopen_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_reopen_evidence as stored
    where stored.id = (existing_action.response_payload ->> 'evidenceId')::uuid
      and stored.uploader_user_id = p_actor_user_id;
    if not found or evidence.upload_status <> 'reserved' then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
    end if;
    if evidence.upload_expires_at <= operation_at then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED';
    end if;
    return query select
      evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
      evidence.declared_mime_type, evidence.declared_byte_size,
      evidence.upload_status, evidence.upload_expires_at, evidence.captured_at,
      extensions.st_x(evidence.capture_location),
      extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
      evidence.capture_provider, evidence.location_captured_at, evidence.created_at,
      existing_action.expected_workflow_version, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
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
  into maximum_location_accuracy, maximum_location_age_seconds
  from routing.issue_categories as category
  where category.id = complaint.category_id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  if p_location_mock_detected is true
    or p_location_accuracy_meters > maximum_location_accuracy
    or extract(epoch from (operation_at - p_location_captured_at))
      > maximum_location_age_seconds then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null or resolution.completed_at is null
    or exists (
      select 1 from complaints.complaint_reopen_requests as request
      where request.resolution_id = resolution.id
    ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  if complaint.current_status <> all(policy.eligible_reopen_statuses) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  if operation_at > resolution.completed_at
      + make_interval(secs => policy.reopen_window_seconds) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_DEADLINE_EXPIRED';
  end if;
  if (select count(*) from complaints.complaint_reopen_requests as request
      where request.complaint_id = complaint.id) >= policy.max_reopen_attempts then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_ATTEMPTS_EXHAUSTED';
  end if;
  if (select count(*) from complaints.complaint_reopen_evidence as existing
      where existing.complaint_id = complaint.id
        and existing.resolution_id = resolution.id
        and existing.uploader_user_id = p_actor_user_id
        and (
          existing.upload_status = 'finalized'
          or (
            existing.upload_status = 'reserved'
            and existing.upload_expires_at > operation_at
          )
        )
        and not exists (
          select 1 from complaints.complaint_reopen_evidence_links as link
          where link.evidence_id = existing.id
        )) >= 20 then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_LIMIT_REACHED';
  end if;

  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'reserve_reopen_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, complaint.current_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);

  insert into complaints.complaint_reopen_evidence (
    id, complaint_id, resolution_id, uploader_user_id, kind, object_path,
    declared_mime_type, declared_byte_size, client_sha256,
    width_pixels, height_pixels, duration_milliseconds, captured_at,
    capture_location, capture_accuracy_meters, capture_provider,
    location_captured_at, location_device_recorded_at, mock_location_detected,
    upload_expires_at, created_at, updated_at
  ) values (
    next_evidence_id, complaint.id, resolution.id, p_actor_user_id, p_kind,
    format('%s/%s/reopen', complaint.id, next_evidence_id),
    normalized_mime, p_byte_size, p_sha256,
    p_width_pixels, p_height_pixels, p_duration_milliseconds, p_captured_at,
    extensions.st_setsrid(
      extensions.st_makepoint(p_location_longitude, p_location_latitude),
      4326
    )::extensions.geometry(Point, 4326),
    p_location_accuracy_meters, p_location_provider, p_location_captured_at,
    p_location_device_recorded_at, p_location_mock_detected,
    operation_at + interval '15 minutes', operation_at, operation_at
  ) returning * into evidence;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'resolutionId', resolution.id,
    'workflowVersion', complaint.workflow_version
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'reserve_reopen_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.bucket_id, evidence.object_path, evidence.kind,
    evidence.declared_mime_type, evidence.declared_byte_size,
    evidence.upload_status, evidence.upload_expires_at, evidence.captured_at,
    extensions.st_x(evidence.capture_location),
    extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
    evidence.capture_provider, evidence.location_captured_at, evidence.created_at,
    complaint.workflow_version, false;
end;
$$;

create function public.finalize_citizen_reopen_evidence(
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
  location_longitude double precision,
  location_latitude double precision,
  location_accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
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
  evidence complaints.complaint_reopen_evidence%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  normalized_mime text := lower(btrim(p_observed_mime_type));
  response jsonb;
begin
  if p_actor_user_id is null or p_complaint_id is null or p_evidence_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or p_observed_byte_size not between 1 and 52428800
    or p_verified_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'finalize_reopen_evidence'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    select stored.* into evidence
    from complaints.complaint_reopen_evidence as stored
    where stored.id = p_evidence_id and stored.uploader_user_id = p_actor_user_id;
    return query select
      evidence.id, evidence.kind, evidence.observed_mime_type,
      evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
      extensions.st_x(evidence.capture_location),
      extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
      evidence.capture_provider, evidence.location_captured_at,
      evidence.finalized_at, evidence.created_at,
      existing_action.expected_workflow_version, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select stored.* into evidence
  from complaints.complaint_reopen_evidence as stored
  where stored.id = p_evidence_id
    and stored.complaint_id = complaint.id
    and stored.uploader_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_EVIDENCE_NOT_FOUND';
  end if;
  if evidence.upload_status <> 'reserved' then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
  end if;
  if evidence.upload_expires_at <= operation_at then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED';
  end if;
  if evidence.declared_mime_type <> normalized_mime
    or evidence.declared_byte_size <> p_observed_byte_size
    or evidence.client_sha256 <> p_verified_sha256 then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH';
  end if;

  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'finalize_reopen_evidence',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, complaint.current_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);
  update complaints.complaint_reopen_evidence as target
  set
    observed_mime_type = normalized_mime,
    observed_byte_size = p_observed_byte_size,
    verified_sha256 = p_verified_sha256,
    upload_status = 'finalized',
    finalized_at = operation_at,
    updated_at = operation_at
  where target.id = evidence.id
  returning * into evidence;

  response := jsonb_build_object(
    'evidenceId', evidence.id,
    'complaintId', complaint.id,
    'workflowVersion', complaint.workflow_version
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, evidence.resolution_id, assignment.id,
    'finalize_reopen_evidence', complaint.current_status, complaint.current_status,
    p_request_id, jsonb_build_object('entityId', evidence.id), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select
    evidence.id, evidence.kind, evidence.observed_mime_type,
    evidence.observed_byte_size, evidence.upload_status, evidence.captured_at,
    extensions.st_x(evidence.capture_location),
    extensions.st_y(evidence.capture_location), evidence.capture_accuracy_meters,
    evidence.capture_provider, evidence.location_captured_at,
    evidence.finalized_at, evidence.created_at, complaint.workflow_version, false;
end;
$$;

create function public.fail_citizen_reopen_evidence(
  p_evidence_id uuid,
  p_failure_code text
)
returns table (evidence_id uuid, upload_status text, failure_code text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_evidence_id is null
    or p_failure_code is null
    or p_failure_code not in (
      'CONTENT_TYPE_MISMATCH',
      'OBJECT_INTEGRITY_MISMATCH'
    ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  perform set_config('local_wellness.reopen_evidence_mutation', 'fail', true);
  return query
  update complaints.complaint_reopen_evidence as evidence
  set upload_status = 'failed', failure_code = p_failure_code, updated_at = clock_timestamp()
  where evidence.id = p_evidence_id and evidence.upload_status = 'reserved'
  returning evidence.id, evidence.upload_status, evidence.failure_code;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_EVIDENCE_NOT_FOUND';
  end if;
end;
$$;

create function public.expire_citizen_reopen_evidence_reservations(
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
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_REOPEN_EVIDENCE_CLEANUP_LIMIT_INVALID';
  end if;

  perform set_config('local_wellness.reopen_evidence_mutation', 'expire', true);
  with expiring as (
    select evidence.id
    from complaints.complaint_reopen_evidence as evidence
    where evidence.upload_status = 'reserved'
      and evidence.upload_expires_at <= operation_at
    order by evidence.upload_expires_at, evidence.id
    for update skip locked
    limit p_limit
  )
  update complaints.complaint_reopen_evidence as evidence
  set upload_status = 'expired',
      failure_code = 'UPLOAD_RESERVATION_EXPIRED',
      updated_at = operation_at
  from expiring
  where evidence.id = expiring.id;
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create function public.submit_complaint_feedback(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_resolution_id uuid,
  p_outcome text,
  p_satisfaction_rating smallint,
  p_speed_rating smallint,
  p_quality_rating smallint,
  p_communication_rating smallint,
  p_comment text,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text
)
returns table (result jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  feedback_id uuid := gen_random_uuid();
  history_id uuid;
  operation_at timestamptz := clock_timestamp();
  next_status text;
  next_workflow_version bigint;
  response jsonb;
  feedback_payload jsonb;
  rating_count integer := num_nonnulls(
    p_satisfaction_rating,
    p_speed_rating,
    p_quality_rating,
    p_communication_rating
  );
begin
  if p_actor_user_id is null or p_complaint_id is null or p_resolution_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_outcome is null or p_outcome not in (
      'resolved', 'partially_resolved', 'not_resolved',
      'temporary_fix', 'wrong_location'
    )
    or rating_count not in (0, 4)
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
    or (p_comment is not null and (
      p_comment <> btrim(p_comment) or char_length(p_comment) not between 1 and 2000
    )) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'submit_feedback'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_FEEDBACK_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null
    or resolution.id <> p_resolution_id
    or resolution.completed_at is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_RESOLUTION_MISMATCH';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  if exists (
    select 1
    from complaints.complaint_feedback as feedback
    where feedback.resolution_id = resolution.id
      and feedback.citizen_user_id = p_actor_user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_FEEDBACK_ALREADY_SUBMITTED';
  end if;
  if complaint.current_status <> all(policy.eligible_feedback_statuses)
    or operation_at > resolution.completed_at
      + make_interval(secs => policy.feedback_window_seconds)
    or (policy.ratings_required and rating_count <> 4)
    or (rating_count = 4 and (
      p_satisfaction_rating not between policy.rating_minimum and policy.rating_maximum
      or p_speed_rating not between policy.rating_minimum and policy.rating_maximum
      or p_quality_rating not between policy.rating_minimum and policy.rating_maximum
      or p_communication_rating not between policy.rating_minimum and policy.rating_maximum
    )) then
    raise exception using errcode = '23514', message = 'COMPLAINT_FEEDBACK_NOT_ALLOWED';
  end if;

  next_status := case
    when p_outcome = 'resolved'
      and complaint.current_status in (
        'resolution_submitted',
        'citizen_verification_pending'
      ) then 'resolved'
    else complaint.current_status
  end;
  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'submit_feedback',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, next_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);

  insert into complaints.complaint_feedback (
    id, complaint_id, resolution_id, citizen_user_id,
    resolution_policy_version_id, action_request_id, outcome,
    satisfaction_rating, speed_rating, quality_rating, communication_rating,
    comment, created_at
  ) values (
    feedback_id, complaint.id, resolution.id, p_actor_user_id,
    policy.id, action_id, p_outcome,
    p_satisfaction_rating, p_speed_rating, p_quality_rating,
    p_communication_rating, p_comment, operation_at
  );

  next_workflow_version := complaint.workflow_version;
  if next_status <> complaint.current_status then
    next_workflow_version := complaint.workflow_version + 1;
    update complaints.complaints as target
    set current_status = next_status,
        workflow_version = target.workflow_version + 1,
        updated_at = operation_at
    where target.id = complaint.id;
    history_id := gen_random_uuid();
    insert into complaints.complaint_status_history (
      id, complaint_id, sequence, from_status, to_status, actor_user_id,
      event_source, reason_code, request_id, occurred_at
    ) values (
      history_id, complaint.id,
      (select coalesce(max(history.sequence), 0) + 1
        from complaints.complaint_status_history as history
        where history.complaint_id = complaint.id),
      complaint.current_status, next_status, p_actor_user_id,
      'citizen_action', 'RESOLUTION_CONFIRMED', p_request_id, operation_at
    );
    insert into complaints.notification_outbox (
      complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
    ) values (
      complaint.id, history_id, 'complaint_status_changed', complaint.id,
      jsonb_strip_nulls(jsonb_build_object(
        'complaintId', complaint.id,
        'complaintNumber', complaint.complaint_number,
        'status', next_status,
        'authorityId', assignment.authority_id,
        'wardId', assignment.ward_id,
        'authorityDepartmentId', assignment.authority_department_id,
        'occurredAt', operation_at
      )), operation_at
    );
  end if;

  feedback_payload := jsonb_build_object(
    'id', feedback_id,
    'resolutionId', resolution.id,
    'outcome', p_outcome,
    'ratings', case when rating_count = 0 then null else jsonb_build_object(
      'satisfaction', p_satisfaction_rating,
      'speed', p_speed_rating,
      'quality', p_quality_rating,
      'communication', p_communication_rating
    ) end,
    'comment', p_comment,
    'submittedAt', operation_at
  );
  response := jsonb_build_object(
    'complaintId', complaint.id,
    'status', next_status,
    'workflowVersion', next_workflow_version,
    'updatedAt', case when next_status = complaint.current_status
      then complaint.updated_at else operation_at end,
    'feedback', feedback_payload
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'submit_feedback', complaint.current_status, next_status, p_request_id,
    jsonb_build_object('entityId', feedback_id, 'outcome', p_outcome), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

create function public.reopen_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_expected_workflow_version bigint,
  p_resolution_id uuid,
  p_reason_code text,
  p_explanation text,
  p_evidence_ids uuid[],
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_request_id text
)
returns table (result jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  resolution complaints.complaint_resolutions%rowtype;
  resolution_assignment complaints.complaint_assignments%rowtype;
  policy complaints.resolution_policy_versions%rowtype;
  existing_action complaints.citizen_action_requests%rowtype;
  action_id uuid := gen_random_uuid();
  reopen_request_id uuid := gen_random_uuid();
  escalation_id uuid;
  history_id uuid := gen_random_uuid();
  operation_at timestamptz := clock_timestamp();
  attempt_number integer;
  next_status text;
  response jsonb;
  request_payload jsonb;
  escalation_payload jsonb := null;
  normalized_evidence_ids uuid[] := coalesce(p_evidence_ids, '{}'::uuid[]);
begin
  if p_actor_user_id is null or p_complaint_id is null or p_resolution_id is null
    or p_expected_workflow_version is null or p_expected_workflow_version < 1
    or p_reason_code is null
    or p_reason_code <> btrim(p_reason_code)
    or p_reason_code !~ '^[a-z][a-z0-9_]{1,79}$'
    or p_explanation is null
    or (
      p_explanation <> btrim(p_explanation)
      or char_length(p_explanation) not between 1 and 4000
    )
    or cardinality(normalized_evidence_ids) > 20
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[0-9a-f]{64}$'
    or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;
  if cardinality(normalized_evidence_ids) <> (
    select count(distinct evidence_id)::integer
    from unnest(normalized_evidence_ids) as evidence_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'COMPLAINT_RESOLUTION_REQUEST_INVALID';
  end if;

  select action.* into existing_action
  from complaints.citizen_action_requests as action
  where action.actor_user_id = p_actor_user_id
    and action.idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if existing_action.complaint_id <> p_complaint_id
      or existing_action.action_type <> 'reopen'
      or existing_action.request_fingerprint <> p_request_fingerprint
      or existing_action.state <> 'completed' then
      raise exception using
        errcode = '23505',
        message = 'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT';
    end if;
    return query select existing_action.response_payload, true;
    return;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id
    and candidate.citizen_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  if complaint.workflow_version <> p_expected_workflow_version then
    raise exception using errcode = '40001', message = 'COMPLAINT_WORKFLOW_VERSION_CONFLICT';
  end if;
  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = complaint.id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;
  select candidate.* into resolution
  from complaints.complaint_resolutions as candidate
  where candidate.complaint_id = complaint.id
  order by candidate.version desc
  limit 1;
  if resolution.id is null or resolution.id <> p_resolution_id
    or resolution.completed_at is null then
    raise exception using errcode = '23514', message = 'COMPLAINT_RESOLUTION_MISMATCH';
  end if;
  if exists (
      select 1 from complaints.complaint_reopen_requests as request
      where request.resolution_id = resolution.id
    ) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  select historical_assignment.* into resolution_assignment
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.id = resolution.assignment_id
    and historical_assignment.complaint_id = complaint.id;
  if not found then
    raise exception using errcode = '55000', message = 'RESOLUTION_POLICY_UNAVAILABLE';
  end if;
  select version.* into policy
  from complaints.resolution_policy_versions as version
  where version.id = complaints.resolve_resolution_policy_version(
    resolution_assignment.authority_id,
    complaint.category_id,
    resolution.completed_at
  );
  select count(*)::integer + 1 into attempt_number
  from complaints.complaint_reopen_requests as request
  where request.complaint_id = complaint.id;
  if complaint.current_status <> all(policy.eligible_reopen_statuses) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_NOT_ALLOWED';
  end if;
  if operation_at > resolution.completed_at
      + make_interval(secs => policy.reopen_window_seconds) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_DEADLINE_EXPIRED';
  end if;
  if attempt_number > policy.max_reopen_attempts then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_ATTEMPTS_EXHAUSTED';
  end if;
  if not coalesce(p_reason_code = any(policy.allowed_reopen_reason_codes), false) then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_REASON_INVALID';
  end if;
  if policy.reopen_evidence_required and cardinality(normalized_evidence_ids) = 0 then
    raise exception using errcode = '23514', message = 'COMPLAINT_REOPEN_EVIDENCE_REQUIRED';
  end if;

  perform 1
  from complaints.complaint_reopen_evidence as evidence
  where evidence.id = any(normalized_evidence_ids)
  for update;
  if cardinality(normalized_evidence_ids) > 0 and (
    select count(*)
    from complaints.complaint_reopen_evidence as evidence
    where evidence.id = any(normalized_evidence_ids)
      and evidence.complaint_id = complaint.id
      and evidence.resolution_id = resolution.id
      and evidence.uploader_user_id = p_actor_user_id
      and evidence.upload_status = 'finalized'
      and evidence.finalized_at is not null
      and not exists (
        select 1
        from complaints.complaint_reopen_evidence_links as link
        where link.evidence_id = evidence.id
      )
  ) <> cardinality(normalized_evidence_ids) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY';
  end if;

  next_status := case when attempt_number >= policy.repeat_escalation_threshold
    then 'escalated' else 'reopened' end;
  insert into complaints.citizen_action_requests (
    id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
    request_fingerprint, request_id, expected_workflow_version, from_status, to_status
  ) values (
    action_id, p_actor_user_id, complaint.id, 'reopen',
    p_idempotency_key_hash, p_request_fingerprint, p_request_id,
    complaint.workflow_version, complaint.current_status, next_status
  );
  perform set_config('local_wellness.citizen_action_id', action_id::text, true);
  insert into complaints.complaint_reopen_requests (
    id, complaint_id, resolution_id, citizen_user_id,
    resolution_policy_version_id, action_request_id, attempt_number,
    reason_code, reason_detail, window_closes_at, outcome_status, requested_at
  ) values (
    reopen_request_id, complaint.id, resolution.id, p_actor_user_id,
    policy.id, action_id, attempt_number, p_reason_code, p_explanation,
    resolution.completed_at + make_interval(secs => policy.reopen_window_seconds),
    next_status, operation_at
  );
  insert into complaints.complaint_reopen_evidence_links (
    reopen_request_id,
    evidence_id,
    complaint_id,
    resolution_id,
    created_at
  )
  select reopen_request_id, evidence_id, complaint.id, resolution.id, operation_at
  from unnest(normalized_evidence_ids) as evidence_id;

  if next_status = 'escalated' then
    escalation_id := gen_random_uuid();
    insert into complaints.complaint_escalation_events (
      id, complaint_id, reopen_request_id, resolution_policy_version_id,
      assignment_id, escalation_type, observed_reopen_count,
      threshold_reopen_count, occurred_at
    ) values (
      escalation_id, complaint.id, reopen_request_id, policy.id, assignment.id,
      'repeated_reopen', attempt_number, policy.repeat_escalation_threshold,
      operation_at
    );
    escalation_payload := jsonb_build_object(
      'id', escalation_id,
      'level', attempt_number,
      'reasonCode', 'repeated_reopen',
      'occurredAt', operation_at
    );
  end if;

  update complaints.complaints as target
  set current_status = next_status,
      workflow_version = target.workflow_version + 1,
      updated_at = operation_at
  where target.id = complaint.id;
  insert into complaints.complaint_status_history (
    id, complaint_id, sequence, from_status, to_status, actor_user_id,
    event_source, reason_code, request_id, occurred_at
  ) values (
    history_id, complaint.id,
    (select coalesce(max(history.sequence), 0) + 1
      from complaints.complaint_status_history as history
      where history.complaint_id = complaint.id),
    complaint.current_status, next_status, p_actor_user_id, 'citizen_action',
    case when next_status = 'escalated'
      then 'REPEATED_REOPEN_ESCALATED' else 'COMPLAINT_REOPENED' end,
    p_request_id, operation_at
  );
  insert into complaints.notification_outbox (
    complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
  ) values (
    complaint.id, history_id, 'complaint_status_changed', complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', next_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )), operation_at
  );

  request_payload := jsonb_build_object(
    'id', reopen_request_id,
    'resolutionId', resolution.id,
    'attemptNumber', attempt_number,
    'reasonCode', p_reason_code,
    'explanation', p_explanation,
    'evidenceIds', to_jsonb(normalized_evidence_ids),
    'resultingStatus', next_status,
    'requestedAt', operation_at
  );
  response := jsonb_build_object(
    'complaintId', complaint.id,
    'status', next_status,
    'workflowVersion', complaint.workflow_version + 1,
    'updatedAt', operation_at,
    'reopenRequest', request_payload,
    'escalation', escalation_payload
  );
  insert into complaints.citizen_action_audit_events (
    action_request_id, complaint_id, actor_user_id, resolution_id,
    assignment_id, action_type, from_status, to_status, request_id, metadata,
    occurred_at
  ) values (
    action_id, complaint.id, p_actor_user_id, resolution.id, assignment.id,
    'reopen', complaint.current_status, next_status, p_request_id,
    jsonb_build_object(
      'entityId', reopen_request_id,
      'attemptNumber', attempt_number,
      'escalated', next_status = 'escalated'
    ), operation_at
  );
  update complaints.citizen_action_requests as action
  set state = 'completed', response_payload = response, completed_at = operation_at
  where action.id = action_id;

  return query select response, false;
end;
$$;

alter table complaints.resolution_policies enable row level security;
alter table complaints.resolution_policies force row level security;
alter table complaints.resolution_policy_versions enable row level security;
alter table complaints.resolution_policy_versions force row level security;
alter table complaints.citizen_action_requests enable row level security;
alter table complaints.citizen_action_requests force row level security;
alter table complaints.citizen_action_audit_events enable row level security;
alter table complaints.citizen_action_audit_events force row level security;
alter table complaints.complaint_feedback enable row level security;
alter table complaints.complaint_feedback force row level security;
alter table complaints.complaint_reopen_evidence enable row level security;
alter table complaints.complaint_reopen_evidence force row level security;
alter table complaints.complaint_reopen_requests enable row level security;
alter table complaints.complaint_reopen_requests force row level security;
alter table complaints.complaint_reopen_evidence_links enable row level security;
alter table complaints.complaint_reopen_evidence_links force row level security;
alter table complaints.complaint_escalation_events enable row level security;
alter table complaints.complaint_escalation_events force row level security;

revoke all on table
  complaints.resolution_policies,
  complaints.resolution_policy_versions,
  complaints.citizen_action_requests,
  complaints.citizen_action_audit_events,
  complaints.complaint_feedback,
  complaints.complaint_reopen_evidence,
  complaints.complaint_reopen_requests,
  complaints.complaint_reopen_evidence_links,
  complaints.complaint_escalation_events
from public, anon, authenticated, service_role;

revoke all on function complaints.validate_resolution_policy_version()
  from public, anon, authenticated, service_role;
revoke all on function complaints.current_citizen_action_request_id()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_citizen_action_request_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_complaint_workflow_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_reopen_evidence_mutation()
  from public, anon, authenticated, service_role;
revoke all on function complaints.resolve_resolution_policy_version(
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function complaints.perform_phase7_resolution_submission(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated, service_role;
revoke all on function complaints.accountability_resolution_payload(
  uuid,
  uuid,
  boolean
) from public, anon, authenticated, service_role;

revoke all on function public.perform_government_complaint_action(
  uuid,
  uuid,
  text,
  bigint,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;
revoke all on function public.get_citizen_resolution_context(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_government_complaint_accountability(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_citizen_complaint_evidence_object(
  uuid,
  uuid,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.reserve_citizen_reopen_evidence(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  timestamptz,
  integer,
  integer,
  bigint,
  double precision,
  double precision,
  double precision,
  text,
  timestamptz,
  timestamptz,
  boolean
) from public, anon, authenticated;
revoke all on function public.finalize_citizen_reopen_evidence(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  text
) from public, anon, authenticated;
revoke all on function public.fail_citizen_reopen_evidence(uuid, text)
  from public, anon, authenticated;
revoke all on function public.expire_citizen_reopen_evidence_reservations(integer)
  from public, anon, authenticated;
revoke all on function public.submit_complaint_feedback(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.reopen_complaint(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  text,
  uuid[],
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.perform_government_complaint_action(
  uuid,
  uuid,
  text,
  bigint,
  text,
  text,
  text,
  jsonb
) to service_role;
grant execute on function public.get_citizen_resolution_context(uuid, uuid)
  to service_role;
grant execute on function public.get_government_complaint_accountability(uuid, uuid, uuid)
  to service_role;
grant execute on function public.get_citizen_complaint_evidence_object(
  uuid,
  uuid,
  uuid,
  text
) to service_role;
grant execute on function public.reserve_citizen_reopen_evidence(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  timestamptz,
  integer,
  integer,
  bigint,
  double precision,
  double precision,
  double precision,
  text,
  timestamptz,
  timestamptz,
  boolean
) to service_role;
grant execute on function public.finalize_citizen_reopen_evidence(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  text
) to service_role;
grant execute on function public.fail_citizen_reopen_evidence(uuid, text)
  to service_role;
grant execute on function public.expire_citizen_reopen_evidence_reservations(integer)
  to service_role;
grant execute on function public.submit_complaint_feedback(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  smallint,
  smallint,
  smallint,
  smallint,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.reopen_complaint(
  uuid,
  uuid,
  bigint,
  uuid,
  text,
  text,
  uuid[],
  text,
  text,
  text
) to service_role;

comment on function public.get_citizen_resolution_context(uuid, uuid) is
  'Returns the owning citizen accountability history and fail-closed effective review policy.';
comment on function public.get_government_complaint_accountability(uuid, uuid, uuid) is
  'Returns resolution, feedback, reopening, and escalation history after assignment-scope authorization.';
comment on function public.get_citizen_complaint_evidence_object(uuid, uuid, uuid, text) is
  'Locates private before, after, or reopen evidence for an owning citizen and explicit purpose.';
comment on function public.expire_citizen_reopen_evidence_reservations(integer) is
  'Expires bounded, abandoned citizen reopen evidence upload reservations using skip-locked cleanup.';
comment on function public.submit_complaint_feedback(
  uuid, uuid, bigint, uuid, text, smallint, smallint, smallint, smallint,
  text, text, text, text
) is
  'Records one policy-bound citizen review with exact replay and an atomic positive confirmation transition.';
comment on function public.reopen_complaint(
  uuid, uuid, bigint, uuid, text, text, uuid[], text, text, text
) is
  'Records a policy-bound reopen request and atomically escalates repeated unresolved resolutions.';
$migration_20260716101000_phase_7_accountability_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'get_citizen_resolution_context')
      and pg_temp.local_wellness_function_exists('public', 'submit_complaint_feedback')
      and pg_temp.local_wellness_function_exists('public', 'reopen_complaint')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716101000_phase_7_accountability_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 27,
    cutoff_name = '20260716101000_phase_7_accountability_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260716101000_phase_7_accountability_security_and_rpc.sql';
end;
$guard_27$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716101000_phase_7_accountability_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716102000_phase_8_transparency_schema.sql
-- ============================================================================
do $guard_28$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 28 then
    raise notice 'Skipping already-complete migration 20260716102000_phase_8_transparency_schema.sql';
    return;
  end if;

  if current_cutoff <> 27 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716102000_phase_8_transparency_schema.sql';
  end if;

  execute $migration_20260716102000_phase_8_transparency_schema$
create table complaints.public_visibility_policies (
  id uuid primary key default gen_random_uuid(),
  local_body_id uuid not null
    references governance.local_bodies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_policies_code_check check (
    code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint public_visibility_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint public_visibility_policies_scope_code_unique unique (local_body_id, code)
);

create table complaints.public_visibility_policy_versions (
  id uuid primary key default gen_random_uuid(),
  public_visibility_policy_id uuid not null
    references complaints.public_visibility_policies (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  allowed_complaint_statuses text[] not null,
  minimum_hotspot_complaint_count smallint not null default 3,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_policy_versions_version_check check (version >= 1),
  constraint public_visibility_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint public_visibility_policy_versions_hotspot_count_check check (
    minimum_hotspot_complaint_count between 3 and 100
  ),
  constraint public_visibility_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint public_visibility_policy_versions_approval_shape_check check (
    (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
      and effective_to is null
    )
    or (
      status = 'approved'
      and approved_by_user_id is not null
      and approved_at is not null
      and effective_to is null
      and created_at <= approved_at
      and approved_at <= effective_from
    )
    or (
      status = 'superseded'
      and approved_by_user_id is not null
      and approved_at is not null
      and effective_to is not null
      and created_at <= approved_at
      and approved_at <= effective_from
    )
  ),
  constraint public_visibility_policy_versions_policy_version_unique unique (
    public_visibility_policy_id,
    version
  )
);

create table complaints.public_visibility_category_rules (
  id uuid primary key default gen_random_uuid(),
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  category_id uuid not null
    references routing.issue_categories (id) on delete restrict,
  publication_allowed boolean not null default false,
  processed_media_allowed boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_category_rules_version_category_unique unique (
    public_visibility_policy_version_id,
    category_id
  )
);

create table complaints.complaint_publication_reviews (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  public_visibility_category_rule_id uuid not null
    references complaints.public_visibility_category_rules (id) on delete restrict,
  reviewer_user_id uuid not null references auth.users (id) on delete restrict,
  decision text not null,
  public_title text,
  public_summary text,
  reason_code text,
  request_id text not null,
  reviewed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_publication_reviews_actor_request_unique unique (
    reviewer_user_id,
    request_id
  ),
  constraint complaint_publication_reviews_decision_check check (
    decision in ('published', 'withdrawn')
  ),
  constraint complaint_publication_reviews_title_check check (
    public_title is null
    or (
      public_title = btrim(public_title)
      and char_length(public_title) between 1 and 160
    )
  ),
  constraint complaint_publication_reviews_summary_check check (
    public_summary is null
    or (
      public_summary = btrim(public_summary)
      and char_length(public_summary) between 1 and 2000
    )
  ),
  constraint complaint_publication_reviews_reason_check check (
    reason_code is null or reason_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint complaint_publication_reviews_request_check check (
    request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint complaint_publication_reviews_decision_shape_check check (
    (
      decision = 'published'
      and public_title is not null
      and public_summary is not null
      and reason_code is null
    )
    or (
      decision = 'withdrawn'
      and public_title is null
      and public_summary is null
      and reason_code is not null
    )
  ),
  constraint complaint_publication_reviews_time_check check (reviewed_at >= created_at)
);

create table complaints.complaint_publication_projections (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null,
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  version integer not null,
  review_id uuid not null unique
    references complaints.complaint_publication_reviews (id) on delete restrict,
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  public_visibility_category_rule_id uuid not null
    references complaints.public_visibility_category_rules (id) on delete restrict,
  category_id uuid not null
    references routing.issue_categories (id) on delete restrict,
  category_name text not null,
  local_body_id uuid not null
    references governance.local_bodies (id) on delete restrict,
  ward_id uuid not null references governance.wards (id) on delete restrict,
  ward_boundary_version_id uuid not null
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  approximate_location extensions.geometry(Point, 4326) not null,
  location_precision_meters integer not null,
  public_title text not null,
  public_summary text not null,
  public_status text not null,
  publication_state text not null,
  submitted_at timestamptz not null,
  source_updated_at timestamptz not null,
  published_at timestamptz not null,
  event_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_publication_projections_version_check check (version >= 1),
  constraint complaint_publication_projections_complaint_version_unique unique (
    complaint_id,
    version
  ),
  constraint complaint_publication_projections_public_version_unique unique (
    public_id,
    version
  ),
  constraint complaint_publication_projections_state_check check (
    publication_state in ('published', 'withdrawn')
  ),
  constraint complaint_publication_projections_location_check check (
    not extensions.st_isempty(approximate_location)
    and extensions.st_srid(approximate_location) = 4326
    and extensions.st_x(approximate_location) between -180 and 180
    and extensions.st_y(approximate_location) between -90 and 90
  ),
  constraint complaint_publication_projections_precision_check check (
    location_precision_meters between 1 and 200000
  ),
  constraint complaint_publication_projections_category_name_check check (
    category_name = btrim(category_name)
    and char_length(category_name) between 1 and 160
  ),
  constraint complaint_publication_projections_title_check check (
    public_title = btrim(public_title)
    and char_length(public_title) between 1 and 160
  ),
  constraint complaint_publication_projections_summary_check check (
    public_summary = btrim(public_summary)
    and char_length(public_summary) between 1 and 2000
  ),
  constraint complaint_publication_projections_public_status_check check (
    public_status in ('reported', 'in_progress', 'resolved', 'closed')
  ),
  constraint complaint_publication_projections_time_check check (
    event_at >= created_at
    and submitted_at <= source_updated_at
    and submitted_at <= published_at
    and published_at <= event_at
  )
);

create table complaints.complaint_duplicate_group_versions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  version integer not null,
  state text not null,
  canonical_complaint_id uuid
    references complaints.complaints (id) on delete restrict,
  reviewed_by_user_id uuid not null references auth.users (id) on delete restrict,
  request_id text not null,
  reviewed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_duplicate_group_versions_group_version_unique unique (
    group_id,
    version
  ),
  constraint complaint_duplicate_group_versions_actor_request_unique unique (
    reviewed_by_user_id,
    request_id
  ),
  constraint complaint_duplicate_group_versions_version_check check (version >= 1),
  constraint complaint_duplicate_group_versions_state_check check (
    state in ('confirmed', 'withdrawn')
  ),
  constraint complaint_duplicate_group_versions_state_shape_check check (
    (state = 'confirmed' and canonical_complaint_id is not null)
    or (state = 'withdrawn' and canonical_complaint_id is null)
  ),
  constraint complaint_duplicate_group_versions_request_check check (
    request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint complaint_duplicate_group_versions_time_check check (reviewed_at >= created_at)
);

create table complaints.complaint_duplicate_group_members (
  id uuid primary key default gen_random_uuid(),
  duplicate_group_version_id uuid not null
    references complaints.complaint_duplicate_group_versions (id) on delete restrict,
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  member_order smallint not null,
  is_canonical boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  constraint complaint_duplicate_group_members_version_complaint_unique unique (
    duplicate_group_version_id,
    complaint_id
  ),
  constraint complaint_duplicate_group_members_version_order_unique unique (
    duplicate_group_version_id,
    member_order
  ),
  constraint complaint_duplicate_group_members_order_check check (member_order >= 1)
);

create table complaints.public_media_derivatives (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  complaint_media_id uuid
    references complaints.complaint_media (id) on delete restrict,
  resolution_evidence_id uuid
    references complaints.complaint_resolution_evidence (id) on delete restrict,
  reopen_evidence_id uuid
    references complaints.complaint_reopen_evidence (id) on delete restrict,
  derivative_kind text not null,
  processing_status text not null default 'pending',
  moderation_status text not null default 'pending',
  publication_status text not null default 'unavailable',
  bucket_id text,
  object_path text,
  mime_type text,
  byte_size bigint,
  verified_sha256 text,
  created_at timestamptz not null default current_timestamp,
  constraint public_media_derivatives_one_source_check check (
    (complaint_media_id is not null)::integer
      + (resolution_evidence_id is not null)::integer
      + (reopen_evidence_id is not null)::integer = 1
  ),
  constraint public_media_derivatives_kind_check check (
    derivative_kind in ('image', 'video', 'audio', 'thumbnail')
  ),
  constraint public_media_derivatives_processing_check check (
    processing_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint public_media_derivatives_moderation_check check (
    moderation_status in ('pending', 'review_required', 'approved', 'rejected')
  ),
  constraint public_media_derivatives_publication_check check (
    publication_status = 'unavailable'
  ),
  constraint public_media_derivatives_object_shape_check check (
    (
      processing_status = 'ready'
      and bucket_id is not null
      and object_path is not null
      and mime_type is not null
      and byte_size between 1 and 52428800
      and verified_sha256 ~ '^[0-9a-f]{64}$'
    )
    or (
      processing_status <> 'ready'
      and bucket_id is null
      and object_path is null
      and mime_type is null
      and byte_size is null
      and verified_sha256 is null
    )
  )
);

create unique index public_visibility_policy_versions_one_current_idx
  on complaints.public_visibility_policy_versions (public_visibility_policy_id)
  where status = 'approved' and effective_to is null;
create index public_visibility_policy_versions_effective_idx
  on complaints.public_visibility_policy_versions (
    public_visibility_policy_id,
    status,
    effective_from,
    effective_to
  );
create index public_visibility_category_rules_category_idx
  on complaints.public_visibility_category_rules (
    category_id,
    public_visibility_policy_version_id
  ) where publication_allowed;
create index complaint_publication_reviews_complaint_time_idx
  on complaints.complaint_publication_reviews (complaint_id, reviewed_at desc, id desc);
create index complaint_publication_projections_latest_idx
  on complaints.complaint_publication_projections (complaint_id, version desc);
create index complaint_publication_projections_public_latest_idx
  on complaints.complaint_publication_projections (public_id, version desc);
create index complaint_publication_projections_filter_idx
  on complaints.complaint_publication_projections (
    local_body_id,
    ward_id,
    publication_state,
    public_id
  );
create index complaint_publication_projections_location_gix
  on complaints.complaint_publication_projections using gist (approximate_location);
create index complaint_duplicate_group_versions_latest_idx
  on complaints.complaint_duplicate_group_versions (group_id, version desc);
create unique index complaint_duplicate_group_members_one_canonical_idx
  on complaints.complaint_duplicate_group_members (duplicate_group_version_id)
  where is_canonical;
create index complaint_duplicate_group_members_complaint_idx
  on complaints.complaint_duplicate_group_members (complaint_id, duplicate_group_version_id);
create index public_media_derivatives_complaint_idx
  on complaints.public_media_derivatives (complaint_id, publication_status, created_at desc);

comment on table complaints.public_visibility_policies is
  'Stable municipality-scoped identity for review-gated public transparency policy versions.';
comment on table complaints.public_visibility_policy_versions is
  'Effective-dated public visibility policy; no operational version is seeded.';
comment on table complaints.public_visibility_category_rules is
  'Category decisions versioned through their immutable parent policy version.';
comment on table complaints.complaint_publication_reviews is
  'Append-only human publication and withdrawal review evidence.';
comment on table complaints.complaint_publication_projections is
  'Append-only public-safe complaint snapshots located only at a verified ward centroid.';
comment on table complaints.complaint_duplicate_group_versions is
  'Human-reviewed, append-only duplicate-group versions; similarity alone cannot confirm a group.';
comment on table complaints.complaint_duplicate_group_members is
  'Immutable membership of one reviewed duplicate-group version.';
comment on table complaints.public_media_derivatives is
  'Structural private derivative registry; publication is intentionally unavailable in Phase 8.';
$migration_20260716102000_phase_8_transparency_schema$;

  if not (pg_temp.local_wellness_relation_exists('complaints.public_visibility_policies')
      and pg_temp.local_wellness_relation_exists('complaints.complaint_publication_projections')
      and pg_temp.local_wellness_relation_exists('complaints.public_media_derivatives')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716102000_phase_8_transparency_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 28,
    cutoff_name = '20260716102000_phase_8_transparency_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260716102000_phase_8_transparency_schema.sql';
end;
$guard_28$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716102000_phase_8_transparency_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716103000_phase_8_transparency_security_and_rpc.sql
-- ============================================================================
do $guard_29$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 29 then
    raise notice 'Skipping already-complete migration 20260716103000_phase_8_transparency_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 28 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716103000_phase_8_transparency_security_and_rpc.sql';
  end if;

  execute $migration_20260716103000_phase_8_transparency_security_and_rpc$
create function complaints.map_public_complaint_status(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned'
    ) then 'reported'
    when p_status = 'resolved' then 'resolved'
    when p_status in ('closed', 'rejected', 'cancelled') then 'closed'
    else 'in_progress'
  end;
$$;

create function complaints.actor_can_review_publication(
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
    private.user_has_active_role(
      p_actor_user_id,
      'platform_admin',
      'global',
      null
    )
    or private.user_has_active_role(
      p_actor_user_id,
      'moderator',
      'authority',
      p_authority_id
    );
$$;

create function complaints.validate_public_visibility_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_authority_id uuid;
begin
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
      or new.created_at is distinct from old.created_at
      or new.approved_by_user_id is distinct from old.approved_by_user_id
      or new.approved_at is distinct from old.approved_at then
      raise exception using
        errcode = '55000',
        message = 'PUBLIC_VISIBILITY_POLICY_VERSION_IMMUTABLE';
    end if;

    if not (
      (old.status = 'draft' and new.status = 'approved' and new.effective_to is null)
      or (
        old.status = 'approved'
        and new.status = 'superseded'
        and new.effective_to is not null
        and new.effective_to >= clock_timestamp()
      )
    ) then
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
    where policy.id = new.public_visibility_policy_id;

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

create function complaints.validate_public_visibility_category_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from complaints.public_visibility_policy_versions as policy_version
    where policy_version.id = new.public_visibility_policy_version_id
      and policy_version.status = 'draft'
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC_VISIBILITY_CATEGORY_RULE_PARENT_NOT_DRAFT';
  end if;
  return new;
end;
$$;

create function complaints.validate_complaint_publication_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_authority_id uuid;
begin
  if not exists (
    select 1
    from complaints.public_visibility_category_rules as category_rule
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = category_rule.public_visibility_policy_version_id
    inner join complaints.public_visibility_policies as policy
      on policy.id = policy_version.public_visibility_policy_id
    inner join governance.local_bodies as local_body
      on local_body.id = policy.local_body_id
    inner join complaints.complaints as complaint
      on complaint.id = new.complaint_id
    where category_rule.id = new.public_visibility_category_rule_id
      and policy_version.id = new.public_visibility_policy_version_id
      and category_rule.category_id = complaint.category_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_REVIEW_SCOPE_INVALID';
  end if;

  select local_body.authority_id into policy_authority_id
  from complaints.public_visibility_policy_versions as policy_version
  inner join complaints.public_visibility_policies as policy
    on policy.id = policy_version.public_visibility_policy_id
  inner join governance.local_bodies as local_body
    on local_body.id = policy.local_body_id
  where policy_version.id = new.public_visibility_policy_version_id;

  if not complaints.actor_can_review_publication(
    new.reviewer_user_id,
    policy_authority_id
  ) then
    raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
  end if;

  return new;
end;
$$;

create function complaints.validate_complaint_publication_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review complaints.complaint_publication_reviews%rowtype;
  prior complaints.complaint_publication_projections%rowtype;
  boundary governance.jurisdiction_boundary_versions%rowtype;
  expected_centroid extensions.geometry(Point, 4326);
  minimum_precision integer;
begin
  select candidate.* into review
  from complaints.complaint_publication_reviews as candidate
  where candidate.id = new.review_id;

  if review.id is null
    or review.complaint_id <> new.complaint_id
    or review.public_visibility_policy_version_id
      <> new.public_visibility_policy_version_id
    or review.public_visibility_category_rule_id
      <> new.public_visibility_category_rule_id
    or review.decision <> new.publication_state then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_REVIEW_INVALID';
  end if;

  select candidate.* into prior
  from complaints.complaint_publication_projections as candidate
  where candidate.complaint_id = new.complaint_id
  order by candidate.version desc
  limit 1;

  if prior.id is null then
    if new.version <> 1 or new.publication_state <> 'published' then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_PUBLICATION_PROJECTION_VERSION_INVALID';
    end if;
  elsif new.version <> prior.version + 1 or new.public_id <> prior.public_id then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_VERSION_INVALID';
  end if;

  if new.publication_state = 'withdrawn' then
    if prior.id is null or prior.publication_state <> 'published'
      or new.category_id <> prior.category_id
      or new.category_name <> prior.category_name
      or new.local_body_id <> prior.local_body_id
      or new.ward_id <> prior.ward_id
      or new.ward_boundary_version_id <> prior.ward_boundary_version_id
      or not extensions.st_equals(new.approximate_location, prior.approximate_location)
      or new.location_precision_meters <> prior.location_precision_meters
      or new.public_title <> prior.public_title
      or new.public_summary <> prior.public_summary
      or new.public_status <> prior.public_status
      or new.submitted_at <> prior.submitted_at
      or new.source_updated_at <> prior.source_updated_at
      or new.published_at <> prior.published_at then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_PUBLICATION_WITHDRAWAL_SNAPSHOT_INVALID';
    end if;
    return new;
  end if;

  if review.public_title <> new.public_title
    or review.public_summary <> new.public_summary then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_CONTENT_INVALID';
  end if;

  if not exists (
    select 1
    from complaints.complaints as complaint
    inner join routing.issue_categories as category on category.id = complaint.category_id
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
      and assignment.status = 'active'
      and assignment.effective_to is null
    inner join complaints.public_visibility_category_rules as category_rule
      on category_rule.id = new.public_visibility_category_rule_id
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = new.public_visibility_policy_version_id
      and policy_version.id = category_rule.public_visibility_policy_version_id
    inner join complaints.public_visibility_policies as policy
      on policy.id = policy_version.public_visibility_policy_id
    where complaint.id = new.complaint_id
      and complaint.category_id = new.category_id
      and category.name = new.category_name
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and assignment.local_body_id = new.local_body_id
      and assignment.ward_id = new.ward_id
      and policy.local_body_id = assignment.local_body_id
      and policy_version.status = 'approved'
      and policy_version.effective_from <= new.event_at
      and (policy_version.effective_to is null or policy_version.effective_to > new.event_at)
      and complaint.current_status = any(policy_version.allowed_complaint_statuses)
      and category_rule.category_id = complaint.category_id
      and category_rule.publication_allowed
      and complaints.map_public_complaint_status(complaint.current_status) = new.public_status
      and complaint.submitted_at = new.submitted_at
      and complaint.updated_at = new.source_updated_at
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        new.event_at
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_SOURCE_INVALID';
  end if;

  select candidate.* into boundary
  from governance.jurisdiction_boundary_versions as candidate
  inner join governance.wards as ward on ward.id = candidate.ward_id
  inner join governance.local_bodies as local_body
    on local_body.id = ward.local_body_id
  where candidate.id = new.ward_boundary_version_id
    and candidate.ward_id = new.ward_id
    and ward.local_body_id = new.local_body_id
    and candidate.status = 'active'
    and candidate.verification_status = 'verified'
    and not candidate.is_placeholder
    and candidate.is_routing_eligible
    and candidate.effective_from <= new.event_at
    and (candidate.effective_to is null or candidate.effective_to > new.event_at)
    and ward.status = 'active'
    and ward.verification_status = 'verified'
    and not ward.is_placeholder
    and ward.is_routing_eligible
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible;

  if boundary.id is null then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_WARD_BOUNDARY_UNAVAILABLE';
  end if;

  expected_centroid := extensions.st_centroid(boundary.boundary);
  minimum_precision := ceil(greatest(
    1,
    extensions.st_maxdistance(
      extensions.st_transform(boundary.boundary, 3857),
      extensions.st_transform(expected_centroid, 3857)
    )
  ))::integer;

  if not extensions.st_equals(new.approximate_location, expected_centroid)
    or new.location_precision_meters < minimum_precision then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_APPROXIMATION_INVALID';
  end if;

  return new;
end;
$$;

create function complaints.validate_public_media_derivative_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.complaint_media_id is not null and not exists (
      select 1
      from complaints.complaint_media as media
      inner join complaints.complaints as complaint on complaint.draft_id = media.draft_id
      where media.id = new.complaint_media_id and complaint.id = new.complaint_id
    ))
    or (new.resolution_evidence_id is not null and not exists (
      select 1 from complaints.complaint_resolution_evidence as evidence
      where evidence.id = new.resolution_evidence_id
        and evidence.complaint_id = new.complaint_id
    ))
    or (new.reopen_evidence_id is not null and not exists (
      select 1 from complaints.complaint_reopen_evidence as evidence
      where evidence.id = new.reopen_evidence_id
        and evidence.complaint_id = new.complaint_id
    )) then
    raise exception using
      errcode = '23514',
      message = 'PUBLIC_MEDIA_DERIVATIVE_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

create trigger public_visibility_policies_append_only
before update or delete on complaints.public_visibility_policies
for each row execute function complaints.reject_append_only_mutation();

create trigger public_visibility_policy_versions_validate
before insert or update on complaints.public_visibility_policy_versions
for each row execute function complaints.validate_public_visibility_policy_version();

create trigger public_visibility_policy_versions_reject_delete
before delete on complaints.public_visibility_policy_versions
for each row execute function complaints.reject_append_only_mutation();

create trigger public_visibility_category_rules_validate
before insert on complaints.public_visibility_category_rules
for each row execute function complaints.validate_public_visibility_category_rule();

create trigger public_visibility_category_rules_append_only
before update or delete on complaints.public_visibility_category_rules
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_publication_reviews_validate
before insert on complaints.complaint_publication_reviews
for each row execute function complaints.validate_complaint_publication_review();

create trigger complaint_publication_reviews_append_only
before update or delete on complaints.complaint_publication_reviews
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_publication_projections_validate
before insert on complaints.complaint_publication_projections
for each row execute function complaints.validate_complaint_publication_projection();

create trigger complaint_publication_projections_append_only
before update or delete on complaints.complaint_publication_projections
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_duplicate_group_versions_append_only
before update or delete on complaints.complaint_duplicate_group_versions
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_duplicate_group_members_append_only
before update or delete on complaints.complaint_duplicate_group_members
for each row execute function complaints.reject_append_only_mutation();

create trigger public_media_derivatives_validate
before insert on complaints.public_media_derivatives
for each row execute function complaints.validate_public_media_derivative_scope();

create trigger public_media_derivatives_append_only
before update or delete on complaints.public_media_derivatives
for each row execute function complaints.reject_append_only_mutation();
$migration_20260716103000_phase_8_transparency_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('complaints', 'actor_can_review_publication')
      and pg_temp.local_wellness_trigger_exists('complaints', 'public_media_derivatives', 'public_media_derivatives_append_only')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716103000_phase_8_transparency_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 29,
    cutoff_name = '20260716103000_phase_8_transparency_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260716103000_phase_8_transparency_security_and_rpc.sql';
end;
$guard_29$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716103000_phase_8_transparency_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716104000_verified_governing_body_projection.sql
-- ============================================================================
do $guard_30$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 30 then
    raise notice 'Skipping already-complete migration 20260716104000_verified_governing_body_projection.sql';
    return;
  end if;

  if current_cutoff <> 29 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716104000_verified_governing_body_projection.sql';
  end if;

  execute $migration_20260716104000_verified_governing_body_projection$
create function public.resolve_verified_governing_bodies(
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
  match jsonb
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
    jsonb_build_object(
      'state', jsonb_build_object(
        'kind', 'state',
        'name', state.name,
        'type', 'state',
        'verificationStatus', state.verification_status,
        'lastVerifiedOn', state.last_verified_on,
        'sourceUrl', state_source.url
      ),
      'district', case
        when district.id is null then null
        else jsonb_build_object(
          'kind', 'district',
          'name', district.name,
          'type', 'district',
          'verificationStatus', district.verification_status,
          'lastVerifiedOn', district.last_verified_on,
          'sourceUrl', district_source.url
        )
      end,
      'taluka', case
        when taluka.id is null then null
        else jsonb_build_object(
          'kind', 'taluka',
          'name', taluka.name,
          'type', 'taluka',
          'verificationStatus', taluka.verification_status,
          'lastVerifiedOn', taluka.last_verified_on,
          'sourceUrl', taluka_source.url
        )
      end,
      'authority', jsonb_build_object(
        'kind', 'authority',
        'name', authority.name,
        'type', authority.authority_type,
        'verificationStatus', authority.verification_status,
        'lastVerifiedOn', authority.last_verified_on,
        'sourceUrl', authority_source.url
      ),
      'localBody', jsonb_build_object(
        'kind', 'local_body',
        'name', local_body.name,
        'type', local_body.body_type,
        'verificationStatus', local_body.verification_status,
        'lastVerifiedOn', local_body.last_verified_on,
        'sourceUrl', local_body_source.url
      ),
      'ward', case
        when ward.id is null then null
        else jsonb_build_object(
          'kind', 'ward',
          'name', ward.name,
          'type', 'ward',
          'verificationStatus', ward.verification_status,
          'lastVerifiedOn', ward.last_verified_on,
          'sourceUrl', ward_source.url
        )
      end
    ) as match
  from routing.resolve_jurisdiction_with_accuracy(
    p_longitude,
    p_latitude,
    p_accuracy_meters,
    p_resolved_at
  ) as resolved
  inner join governance.states as state on state.id = resolved.state_id
  inner join governance.reference_sources as state_source
    on state_source.id = state.reference_source_id
  inner join governance.local_bodies as local_body
    on local_body.id = resolved.local_body_id
  inner join governance.reference_sources as local_body_source
    on local_body_source.id = local_body.reference_source_id
  inner join governance.authorities as authority
    on authority.id = local_body.authority_id
  inner join governance.reference_sources as authority_source
    on authority_source.id = authority.reference_source_id
  inner join governance.jurisdiction_boundary_versions as local_body_boundary
    on local_body_boundary.id = resolved.local_body_boundary_version_id
  inner join governance.reference_sources as local_body_boundary_source
    on local_body_boundary_source.id = local_body_boundary.reference_source_id
  left join governance.districts as district on district.id = resolved.district_id
  left join governance.reference_sources as district_source
    on district_source.id = district.reference_source_id
  left join governance.talukas as taluka on taluka.id = resolved.taluka_id
  left join governance.reference_sources as taluka_source
    on taluka_source.id = taluka.reference_source_id
  left join governance.wards as ward on ward.id = resolved.ward_id
  left join governance.reference_sources as ward_source
    on ward_source.id = ward.reference_source_id
  left join governance.jurisdiction_boundary_versions as state_boundary
    on state_boundary.id = resolved.state_boundary_version_id
  left join governance.reference_sources as state_boundary_source
    on state_boundary_source.id = state_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as district_boundary
    on district_boundary.id = resolved.district_boundary_version_id
  left join governance.reference_sources as district_boundary_source
    on district_boundary_source.id = district_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as taluka_boundary
    on taluka_boundary.id = resolved.taluka_boundary_version_id
  left join governance.reference_sources as taluka_boundary_source
    on taluka_boundary_source.id = taluka_boundary.reference_source_id
  left join governance.jurisdiction_boundary_versions as ward_boundary
    on ward_boundary.id = resolved.ward_boundary_version_id
  left join governance.reference_sources as ward_boundary_source
    on ward_boundary_source.id = ward_boundary.reference_source_id
  where state.status = 'active'
    and state.verification_status = 'verified'
    and not state.is_placeholder
    and state.is_routing_eligible
    and state_source.status = 'active'
    and state_source.source_type = 'official'
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible
    and local_body_source.status = 'active'
    and local_body_source.source_type = 'official'
    and authority.status = 'active'
    and authority.verification_status = 'verified'
    and not authority.is_placeholder
    and authority.is_routing_eligible
    and authority_source.status = 'active'
    and authority_source.source_type = 'official'
    and local_body_boundary_source.status = 'active'
    and local_body_boundary_source.source_type = 'official'
    and (
      resolved.state_boundary_version_id is null
      or (
        state_boundary_source.status = 'active'
        and state_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.district_id is null
      or (
        district.status = 'active'
        and district.verification_status = 'verified'
        and not district.is_placeholder
        and district.is_routing_eligible
        and district_source.status = 'active'
        and district_source.source_type = 'official'
        and district_boundary_source.status = 'active'
        and district_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.taluka_id is null
      or (
        taluka.status = 'active'
        and taluka.verification_status = 'verified'
        and not taluka.is_placeholder
        and taluka.is_routing_eligible
        and taluka_source.status = 'active'
        and taluka_source.source_type = 'official'
        and taluka_boundary_source.status = 'active'
        and taluka_boundary_source.source_type = 'official'
      )
    )
    and (
      resolved.ward_id is null
      or (
        ward.status = 'active'
        and ward.verification_status = 'verified'
        and not ward.is_placeholder
        and ward.is_routing_eligible
        and ward_source.status = 'active'
        and ward_source.source_type = 'official'
        and ward_boundary_source.status = 'active'
        and ward_boundary_source.source_type = 'official'
      )
    )
  order by
    state.name,
    district.name nulls last,
    taluka.name nulls last,
    local_body.name,
    ward.name nulls last,
    resolved.local_body_id,
    resolved.ward_id nulls last;
$$;

revoke all on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) to service_role;

comment on function public.resolve_verified_governing_bodies(
  double precision,
  double precision,
  double precision,
  timestamptz
) is
  'Service-role-only, official-source, public-safe governing-body projection for a verified PostGIS jurisdiction match.';
$migration_20260716104000_verified_governing_body_projection$;

  if not (pg_temp.local_wellness_function_exists('public', 'resolve_verified_governing_bodies')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716104000_verified_governing_body_projection.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 30,
    cutoff_name = '20260716104000_verified_governing_body_projection.sql'
  where singleton;

  raise notice 'Applied migration 20260716104000_verified_governing_body_projection.sql';
end;
$guard_30$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716104000_verified_governing_body_projection.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql
-- ============================================================================
do $guard_31$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 31 then
    raise notice 'Skipping already-complete migration 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql';
    return;
  end if;

  if current_cutoff <> 30 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql';
  end if;

  execute $migration_20260716105000_phase_8_transparency_rpc_and_acl_forward_fix$
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
$migration_20260716105000_phase_8_transparency_rpc_and_acl_forward_fix$;

  if not (pg_temp.local_wellness_function_exists('public', 'list_public_complaint_projections')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_hotspots')
      and pg_temp.local_wellness_function_exists('public', 'withdraw_public_complaint_projection')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 31,
    cutoff_name = '20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql'
  where singleton;

  raise notice 'Applied migration 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql';
end;
$guard_31$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716106000_phase_8_duplicate_group_publication.sql
-- ============================================================================
do $guard_32$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 32 then
    raise notice 'Skipping already-complete migration 20260716106000_phase_8_duplicate_group_publication.sql';
    return;
  end if;

  if current_cutoff <> 31 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716106000_phase_8_duplicate_group_publication.sql';
  end if;

  execute $migration_20260716106000_phase_8_duplicate_group_publication$
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
$migration_20260716106000_phase_8_duplicate_group_publication$;

  if not (pg_temp.local_wellness_function_exists('public', 'review_public_duplicate_group')
      and pg_temp.local_wellness_function_exists('public', 'withdraw_public_duplicate_group')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716106000_phase_8_duplicate_group_publication.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 32,
    cutoff_name = '20260716106000_phase_8_duplicate_group_publication.sql'
  where singleton;

  raise notice 'Applied migration 20260716106000_phase_8_duplicate_group_publication.sql';
end;
$guard_32$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716106000_phase_8_duplicate_group_publication.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716110000_phase_9_sla_escalation_kpi_schema.sql
-- ============================================================================
do $guard_33$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 33 then
    raise notice 'Skipping already-complete migration 20260716110000_phase_9_sla_escalation_kpi_schema.sql';
    return;
  end if;

  if current_cutoff <> 32 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716110000_phase_9_sla_escalation_kpi_schema.sql';
  end if;

  execute $migration_20260716110000_phase_9_sla_escalation_kpi_schema$
create table complaints.sla_calendars (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_calendars_authority_code_unique unique (authority_id, code),
  constraint sla_calendars_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_calendars_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_calendar_versions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references complaints.sla_calendars (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  timezone_name text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_calendar_versions_number_unique unique (calendar_id, version),
  constraint sla_calendar_versions_number_check check (version >= 1),
  constraint sla_calendar_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_calendar_versions_timezone_check check (
    timezone_name = btrim(timezone_name)
    and char_length(timezone_name) between 1 and 80
  ),
  constraint sla_calendar_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_calendar_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_calendar_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_calendar_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create table complaints.sla_calendar_working_periods (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  iso_weekday smallint not null,
  period_sequence smallint not null default 1,
  opens_at time without time zone not null,
  closes_at time without time zone not null,
  created_at timestamptz not null default now(),
  constraint sla_calendar_working_periods_slot_unique unique (
    calendar_version_id,
    iso_weekday,
    period_sequence
  ),
  constraint sla_calendar_working_periods_weekday_check check (iso_weekday between 1 and 7),
  constraint sla_calendar_working_periods_sequence_check check (
    period_sequence between 1 and 8
  ),
  constraint sla_calendar_working_periods_time_check check (closes_at > opens_at)
);

create table complaints.sla_calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  exception_date date not null,
  is_working_day boolean not null,
  opens_at time without time zone,
  closes_at time without time zone,
  label text not null,
  created_at timestamptz not null default now(),
  constraint sla_calendar_exceptions_date_unique unique (
    calendar_version_id,
    exception_date
  ),
  constraint sla_calendar_exceptions_label_check check (
    label = btrim(label) and char_length(label) between 1 and 160
  ),
  constraint sla_calendar_exceptions_time_check check (
    (
      is_working_day
      and opens_at is not null
      and closes_at is not null
      and closes_at > opens_at
    )
    or (
      not is_working_day
      and opens_at is null
      and closes_at is null
    )
  )
);

create table complaints.sla_policies (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_policies_scope_code_unique unique (authority_id, local_body_id, code),
  constraint sla_policies_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references complaints.sla_policies (id) on delete restrict,
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  acknowledgement_business_minutes integer not null,
  inspection_business_minutes integer,
  resolution_business_minutes integer not null,
  resolution_completion_status text not null,
  pause_for_external_dependencies boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_policy_versions_number_unique unique (policy_id, version),
  constraint sla_policy_versions_number_check check (version >= 1),
  constraint sla_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_policy_versions_target_check check (
    acknowledgement_business_minutes between 1 and 5256000
    and (
      inspection_business_minutes is null
      or inspection_business_minutes between 1 and 5256000
    )
    and resolution_business_minutes between 1 and 5256000
  ),
  constraint sla_policy_versions_resolution_status_check check (
    resolution_completion_status in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed'
    )
  ),
  constraint sla_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_policy_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_policy_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_policy_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create unique index sla_policies_authority_default_code_unique
  on complaints.sla_policies (authority_id, code)
  where local_body_id is null;

create unique index sla_policies_local_body_code_unique
  on complaints.sla_policies (authority_id, local_body_id, code)
  where local_body_id is not null;

create table complaints.sla_category_overrides (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  acknowledgement_business_minutes integer,
  inspection_business_minutes integer,
  resolution_business_minutes integer,
  created_at timestamptz not null default now(),
  constraint sla_category_overrides_category_unique unique (policy_version_id, category_id),
  constraint sla_category_overrides_nonempty_check check (
    acknowledgement_business_minutes is not null
    or inspection_business_minutes is not null
    or resolution_business_minutes is not null
  ),
  constraint sla_category_overrides_target_check check (
    (
      acknowledgement_business_minutes is null
      or acknowledgement_business_minutes between 1 and 5256000
    )
    and (
      inspection_business_minutes is null
      or inspection_business_minutes between 1 and 5256000
    )
    and (
      resolution_business_minutes is null
      or resolution_business_minutes between 1 and 5256000
    )
  )
);

create table complaints.sla_escalation_rules (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references complaints.sla_policies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_escalation_rules_code_unique unique (policy_id, code),
  constraint sla_escalation_rules_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_escalation_rules_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_escalation_rule_versions (
  id uuid primary key default gen_random_uuid(),
  escalation_rule_id uuid not null
    references complaints.sla_escalation_rules (id) on delete restrict,
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  version integer not null,
  milestone text not null,
  escalation_level smallint not null,
  business_minutes_after_target integer not null default 0,
  action_type text not null,
  target_officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  status text not null default 'draft',
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_escalation_rule_versions_number_unique unique (
    escalation_rule_id,
    version
  ),
  constraint sla_escalation_rule_versions_number_check check (version >= 1),
  constraint sla_escalation_rule_versions_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint sla_escalation_rule_versions_level_check check (
    escalation_level between 1 and 20
  ),
  constraint sla_escalation_rule_versions_delay_check check (
    business_minutes_after_target between 0 and 5256000
  ),
  constraint sla_escalation_rule_versions_action_check check (
    action_type in ('record', 'mark_escalated')
  ),
  constraint sla_escalation_rule_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_escalation_rule_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_escalation_rule_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_escalation_rule_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_escalation_rule_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create table complaints.complaint_sla_bindings (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  cycle integer not null default 1,
  status text not null,
  policy_version_id uuid
    references complaints.sla_policy_versions (id) on delete restrict,
  candidate_count smallint not null,
  reason_code text not null,
  evaluated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint complaint_sla_bindings_cycle_unique unique (complaint_id, cycle),
  constraint complaint_sla_bindings_cycle_check check (cycle >= 1),
  constraint complaint_sla_bindings_status_check check (
    status in ('applied', 'not_configured', 'ambiguous', 'invalid_configuration')
  ),
  constraint complaint_sla_bindings_candidate_check check (
    candidate_count between 0 and 100
  ),
  constraint complaint_sla_bindings_reason_check check (
    reason_code in (
      'approved_policy_applied', 'no_approved_policy', 'ambiguous_approved_policy',
      'invalid_calendar_configuration', 'unverified_assignment_scope',
      'unverified_issue_category'
    )
  ),
  constraint complaint_sla_bindings_shape_check check (
    (
      status = 'applied'
      and policy_version_id is not null
      and candidate_count = 1
      and reason_code = 'approved_policy_applied'
    )
    or (
      status = 'not_configured'
      and policy_version_id is null
      and candidate_count = 0
      and reason_code in (
        'no_approved_policy', 'unverified_assignment_scope', 'unverified_issue_category'
      )
    )
    or (
      status = 'ambiguous'
      and policy_version_id is null
      and candidate_count > 1
      and reason_code = 'ambiguous_approved_policy'
    )
    or (
      status = 'invalid_configuration'
      and policy_version_id is null
      and reason_code = 'invalid_calendar_configuration'
    )
  )
);

create table complaints.complaint_sla_clocks (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  binding_id uuid not null
    references complaints.complaint_sla_bindings (id) on delete restrict,
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  category_override_id uuid
    references complaints.sla_category_overrides (id) on delete restrict,
  milestone text not null,
  cycle integer not null default 1,
  target_business_minutes integer not null,
  started_at timestamptz not null,
  target_at timestamptz not null,
  state text not null default 'active',
  paused_at timestamptz,
  completed_at timestamptz,
  completion_status_history_id uuid
    references complaints.complaint_status_history (id) on delete restrict,
  breached_at timestamptz,
  external_dependency_segment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_sla_clocks_milestone_cycle_unique unique (
    complaint_id,
    milestone,
    cycle
  ),
  constraint complaint_sla_clocks_binding_milestone_unique unique (binding_id, milestone),
  constraint complaint_sla_clocks_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint complaint_sla_clocks_cycle_check check (cycle >= 1),
  constraint complaint_sla_clocks_target_minutes_check check (
    target_business_minutes between 1 and 5256000
  ),
  constraint complaint_sla_clocks_target_check check (target_at > started_at),
  constraint complaint_sla_clocks_state_check check (
    state in ('active', 'paused', 'met', 'breached', 'cancelled')
  ),
  constraint complaint_sla_clocks_lifecycle_check check (
    (
      state = 'active'
      and paused_at is null
      and completed_at is null
      and completion_status_history_id is null
    )
    or (
      state = 'paused'
      and paused_at is not null
      and completed_at is null
      and completion_status_history_id is null
    )
    or (
      state = 'met'
      and paused_at is null
      and completed_at is not null
      and completion_status_history_id is not null
      and breached_at is null
    )
    or (
      state = 'breached'
      and paused_at is null
      and breached_at is not null
    )
    or state = 'cancelled'
  )
);

create table complaints.complaint_sla_pause_intervals (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  external_dependency_id uuid not null
    references complaints.complaint_external_dependencies (id) on delete restrict,
  paused_at timestamptz not null,
  resumed_at timestamptz,
  paused_business_minutes integer,
  created_at timestamptz not null default now(),
  constraint complaint_sla_pause_intervals_clock_dependency_unique unique (
    clock_id,
    external_dependency_id
  ),
  constraint complaint_sla_pause_intervals_period_check check (
    resumed_at is null or resumed_at >= paused_at
  ),
  constraint complaint_sla_pause_intervals_minutes_check check (
    paused_business_minutes is null or paused_business_minutes >= 0
  ),
  constraint complaint_sla_pause_intervals_lifecycle_check check (
    (resumed_at is null and paused_business_minutes is null)
    or (resumed_at is not null and paused_business_minutes is not null)
  )
);

create unique index complaint_sla_pause_intervals_one_open_idx
  on complaints.complaint_sla_pause_intervals (clock_id)
  where resumed_at is null;

create table complaints.complaint_sla_deadline_history (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  sequence integer not null,
  reason_code text not null,
  prior_target_at timestamptz,
  target_at timestamptz not null,
  source_external_dependency_id uuid
    references complaints.complaint_external_dependencies (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint complaint_sla_deadline_history_sequence_unique unique (clock_id, sequence),
  constraint complaint_sla_deadline_history_sequence_check check (sequence >= 1),
  constraint complaint_sla_deadline_history_reason_check check (
    reason_code in ('initial_policy', 'external_dependency_resumed')
  ),
  constraint complaint_sla_deadline_history_shape_check check (
    (
      reason_code = 'initial_policy'
      and sequence = 1
      and prior_target_at is null
      and source_external_dependency_id is null
    )
    or (
      reason_code = 'external_dependency_resumed'
      and prior_target_at is not null
      and target_at >= prior_target_at
      and source_external_dependency_id is not null
    )
  )
);

create table complaints.sla_escalation_jobs (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  escalation_rule_version_id uuid not null
    references complaints.sla_escalation_rule_versions (id) on delete restrict,
  due_at timestamptz not null,
  state text not null default 'pending',
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_failure_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sla_escalation_jobs_clock_rule_unique unique (
    clock_id,
    escalation_rule_version_id
  ),
  constraint sla_escalation_jobs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'cancelled', 'dead')
  ),
  constraint sla_escalation_jobs_attempt_check check (attempt_count between 0 and 5),
  constraint sla_escalation_jobs_worker_check check (
    worker_id is null
    or (worker_id = btrim(worker_id) and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$')
  ),
  constraint sla_escalation_jobs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint sla_escalation_jobs_lifecycle_check check (
    (
      state in ('pending', 'retry')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is null
    )
    or (
      state = 'processing'
      and worker_id is not null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
    )
    or (
      state in ('completed', 'cancelled', 'dead')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is not null
    )
  )
);

create table complaints.complaint_sla_escalation_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  escalation_job_id uuid not null unique
    references complaints.sla_escalation_jobs (id) on delete restrict,
  escalation_rule_version_id uuid not null
    references complaints.sla_escalation_rule_versions (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  milestone text not null,
  escalation_level smallint not null,
  action_type text not null,
  prior_status text not null,
  resulting_status text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint complaint_sla_escalation_events_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint complaint_sla_escalation_events_level_check check (
    escalation_level between 1 and 20
  ),
  constraint complaint_sla_escalation_events_action_check check (
    action_type in ('record', 'mark_escalated')
  ),
  constraint complaint_sla_escalation_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'phone', 'email',
        'objectPath', 'signedUrl', 'token', 'leaseToken', 'sha256'
      ]
    )
  )
);

create table complaints.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null,
  created_at timestamptz not null default now(),
  constraint kpi_definitions_code_check check (
    code in (
      'acknowledgement_compliance', 'resolution_compliance',
      'citizen_confirmed_resolution_rate', 'reopen_rate', 'misrouting_rate',
      'backlog', 'evidence_completeness', 'communication_quality'
    )
  ),
  constraint kpi_definitions_name_check check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint kpi_definitions_unit_check check (unit in ('count', 'percent'))
);

create table complaints.kpi_definition_versions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references complaints.kpi_definitions (id) on delete restrict,
  version integer not null,
  algorithm_version text not null,
  implementation_hash text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint kpi_definition_versions_number_unique unique (definition_id, version),
  constraint kpi_definition_versions_number_check check (version >= 1),
  constraint kpi_definition_versions_algorithm_check check (
    algorithm_version = btrim(algorithm_version)
    and algorithm_version ~ '^v[0-9]+$'
  ),
  constraint kpi_definition_versions_hash_check check (
    implementation_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint kpi_definition_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  )
);

insert into complaints.kpi_definitions (code, name, unit)
values
  ('acknowledgement_compliance', 'Acknowledgement compliance', 'percent'),
  ('resolution_compliance', 'Resolution compliance', 'percent'),
  ('citizen_confirmed_resolution_rate', 'Citizen-confirmed resolution rate', 'percent'),
  ('reopen_rate', 'Reopening rate', 'percent'),
  ('misrouting_rate', 'Misrouting rate', 'percent'),
  ('backlog', 'Open backlog', 'count'),
  ('evidence_completeness', 'Resolution evidence completeness', 'percent'),
  ('communication_quality', 'Communication quality', 'percent');

insert into complaints.kpi_definition_versions (
  definition_id,
  version,
  algorithm_version,
  implementation_hash,
  effective_from
)
select
  definition.id,
  1,
  'v1',
  encode(extensions.digest(definition.code || ':v1', 'sha256'), 'hex'),
  timestamptz '2026-07-16 00:00:00+00'
from complaints.kpi_definitions as definition;

create table complaints.kpi_calculation_runs (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  source_cutoff_at timestamptz not null,
  state text not null default 'pending',
  request_fingerprint text not null,
  requested_by_user_id uuid references auth.users (id) on delete restrict,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_failure_code text,
  calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_calculation_runs_request_unique unique (
    authority_id,
    request_fingerprint
  ),
  constraint kpi_calculation_runs_window_check check (
    window_ended_at > window_started_at
    and window_ended_at <= source_cutoff_at
    and window_ended_at - window_started_at <= interval '366 days'
  ),
  constraint kpi_calculation_runs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'dead')
  ),
  constraint kpi_calculation_runs_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint kpi_calculation_runs_attempt_check check (attempt_count between 0 and 5),
  constraint kpi_calculation_runs_worker_check check (
    worker_id is null
    or (worker_id = btrim(worker_id) and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$')
  ),
  constraint kpi_calculation_runs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint kpi_calculation_runs_lifecycle_check check (
    (
      state in ('pending', 'retry')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is null
    )
    or (
      state = 'processing'
      and worker_id is not null
      and lease_token is not null
      and lease_expires_at is not null
      and calculated_at is null
    )
    or (
      state = 'completed'
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is not null
    )
    or (
      state = 'dead'
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is null
    )
  )
);

create table complaints.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null
    references complaints.kpi_calculation_runs (id) on delete restrict,
  definition_version_id uuid not null
    references complaints.kpi_definition_versions (id) on delete restrict,
  scope_type text not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  segment text not null,
  numerator bigint not null,
  denominator bigint not null,
  value numeric(14, 4),
  sample_size bigint not null,
  exclusions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint kpi_snapshots_dimension_unique unique (
    calculation_run_id,
    definition_version_id,
    scope_type,
    local_body_id,
    ward_id,
    authority_department_id,
    segment
  ),
  constraint kpi_snapshots_scope_check check (
    (
      scope_type = 'municipality'
      and ward_id is null
      and authority_department_id is null
    )
    or (
      scope_type = 'ward'
      and ward_id is not null
      and authority_department_id is null
    )
    or (
      scope_type = 'department'
      and ward_id is null
      and authority_department_id is not null
    )
  ),
  constraint kpi_snapshots_segment_check check (
    segment in ('all', 'external_dependency', 'no_external_dependency')
  ),
  constraint kpi_snapshots_values_check check (
    numerator >= 0
    and denominator >= 0
    and sample_size >= 0
    and (value is null or value >= 0)
  ),
  constraint kpi_snapshots_exclusions_check check (
    jsonb_typeof(exclusions) = 'object'
    and not (
      exclusions ?| array[
        'officerId', 'officerAssignmentId', 'description', 'exactLocation',
        'phone', 'email', 'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create unique index kpi_snapshots_dimension_null_safe_unique
  on complaints.kpi_snapshots (
    calculation_run_id,
    definition_version_id,
    scope_type,
    local_body_id,
    coalesce(ward_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(
      authority_department_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    segment
  );

create index sla_calendar_versions_effective_idx
  on complaints.sla_calendar_versions (calendar_id, status, effective_from, effective_to);
create index sla_policy_versions_effective_idx
  on complaints.sla_policy_versions (policy_id, status, effective_from, effective_to);
create index sla_policies_scope_idx
  on complaints.sla_policies (authority_id, local_body_id, code);
create index sla_escalation_rule_versions_policy_idx
  on complaints.sla_escalation_rule_versions (
    policy_version_id, status, milestone, escalation_level
  );
create index sla_escalation_rule_versions_stable_idx
  on complaints.sla_escalation_rule_versions (
    escalation_rule_id, version, effective_from, effective_to
  );
create index complaint_sla_clocks_due_idx
  on complaints.complaint_sla_clocks (state, target_at, id)
  where state in ('active', 'paused');
create index complaint_sla_clocks_complaint_idx
  on complaints.complaint_sla_clocks (complaint_id, cycle, milestone);
create index complaint_sla_bindings_complaint_idx
  on complaints.complaint_sla_bindings (complaint_id, cycle desc);
create index complaint_sla_deadline_history_clock_idx
  on complaints.complaint_sla_deadline_history (clock_id, sequence);
create index sla_escalation_jobs_claim_idx
  on complaints.sla_escalation_jobs (state, next_attempt_at, due_at, id)
  where state in ('pending', 'retry', 'processing');
create index sla_escalation_jobs_lease_expiry_idx
  on complaints.sla_escalation_jobs (lease_expires_at, id)
  where state = 'processing';
create index complaint_sla_escalation_events_complaint_idx
  on complaints.complaint_sla_escalation_events (complaint_id, occurred_at desc, id);
create index kpi_calculation_runs_claim_idx
  on complaints.kpi_calculation_runs (state, next_attempt_at, created_at, id)
  where state in ('pending', 'retry', 'processing');
create index kpi_snapshots_scope_idx
  on complaints.kpi_snapshots (
    authority_id, scope_type, local_body_id, ward_id, authority_department_id, segment
  );
create index kpi_snapshots_run_definition_idx
  on complaints.kpi_snapshots (calculation_run_id, definition_version_id);

comment on table complaints.sla_calendar_versions is
  'Reviewed effective-dated business calendar versions; no operational calendar is seeded.';
comment on table complaints.sla_policy_versions is
  'Reviewed effective-dated SLA targets; draft or unverified versions never create clocks.';
comment on table complaints.complaint_sla_clocks is
  'Materialized complaint milestone clocks retaining exact policy, calendar, scope and deadline evidence.';
comment on table complaints.complaint_sla_bindings is
  'Immutable policy-selection outcome per complaint cycle, including fail-closed missing or ambiguous configuration.';
comment on table complaints.sla_escalation_jobs is
  'PostgreSQL-leased overdue work with bounded retries; lease tokens are private capabilities.';
comment on table complaints.complaint_sla_escalation_events is
  'Append-only automatic overdue escalation evidence without individual-officer performance scoring.';
comment on table complaints.kpi_definition_versions is
  'Versioned code-owned KPI algorithm identities used to reproduce immutable snapshot calculations.';
comment on table complaints.kpi_snapshots is
  'Immutable organizational KPI snapshots with scope, segment, numerator, denominator and source run provenance.';
$migration_20260716110000_phase_9_sla_escalation_kpi_schema$;

  if not (pg_temp.local_wellness_relation_exists('complaints.sla_calendars')
      and pg_temp.local_wellness_relation_exists('complaints.sla_escalation_jobs')
      and pg_temp.local_wellness_relation_exists('complaints.kpi_snapshots')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716110000_phase_9_sla_escalation_kpi_schema.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 33,
    cutoff_name = '20260716110000_phase_9_sla_escalation_kpi_schema.sql'
  where singleton;

  raise notice 'Applied migration 20260716110000_phase_9_sla_escalation_kpi_schema.sql';
end;
$guard_33$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716110000_phase_9_sla_escalation_kpi_schema.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql
-- ============================================================================
do $guard_34$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 34 then
    raise notice 'Skipping already-complete migration 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql';
    return;
  end if;

  if current_cutoff <> 33 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql';
  end if;

  execute $migration_20260716111000_phase_9_sla_escalation_kpi_security_and_rpc$
create function complaints.actor_is_platform_admin(
  p_actor_user_id uuid,
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
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = p_actor_user_id
      and role.code = 'platform_admin'
      and user_role.scope_type = 'global'
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and profile.status = 'active'
  );
$$;

create function complaints.reject_sla_append_only_mutation()
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

create function complaints.validate_sla_reviewed_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_id text := nullif(current_setting('local_wellness.sla_version_mutation_id', true), '');
  old_payload jsonb;
  new_payload jsonb;
begin
  if tg_op = 'DELETE' or configured_id is distinct from old.id::text then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;

  old_payload := to_jsonb(old) - array[
    'status', 'effective_to', 'approved_by_user_id', 'approved_at'
  ];
  new_payload := to_jsonb(new) - array[
    'status', 'effective_to', 'approved_by_user_id', 'approved_at'
  ];
  if new_payload is distinct from old_payload then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;

  if not (
    (
      old.status = 'draft'
      and new.status = 'approved'
      and old.approved_by_user_id is null
      and old.approved_at is null
      and new.approved_by_user_id is not null
      and new.approved_at is not null
    )
    or (
      old.status = 'approved'
      and new.status = 'superseded'
      and new.effective_to is not null
      and new.effective_to > new.effective_from
      and new.approved_by_user_id is not distinct from old.approved_by_user_id
      and new.approved_at is not distinct from old.approved_at
    )
  ) then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger sla_calendar_versions_validate_mutation
before update or delete on complaints.sla_calendar_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();
create trigger sla_policy_versions_validate_mutation
before update or delete on complaints.sla_policy_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();
create trigger sla_escalation_rule_versions_validate_mutation
before update or delete on complaints.sla_escalation_rule_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();

create function complaints.validate_sla_draft_child_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_id uuid;
  parent_status text;
begin
  if tg_table_name in ('sla_calendar_working_periods', 'sla_calendar_exceptions') then
    if tg_op = 'DELETE' then
      parent_id := old.calendar_version_id;
    else
      parent_id := new.calendar_version_id;
    end if;
    select version.status into parent_status
    from complaints.sla_calendar_versions as version
    where version.id = parent_id;
  else
    if tg_op = 'DELETE' then
      parent_id := old.policy_version_id;
    else
      parent_id := new.policy_version_id;
    end if;
    select version.status into parent_status
    from complaints.sla_policy_versions as version
    where version.id = parent_id;
  end if;

  if parent_status is distinct from 'draft' then
    raise exception using errcode = '55000', message = 'SLA_VERSION_CHILD_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger sla_calendar_working_periods_validate_mutation
before insert or update or delete on complaints.sla_calendar_working_periods
for each row execute function complaints.validate_sla_draft_child_mutation();
create trigger sla_calendar_exceptions_validate_mutation
before insert or update or delete on complaints.sla_calendar_exceptions
for each row execute function complaints.validate_sla_draft_child_mutation();
create trigger sla_category_overrides_validate_mutation
before insert or update or delete on complaints.sla_category_overrides
for each row execute function complaints.validate_sla_draft_child_mutation();

create trigger sla_calendars_append_only
before update or delete on complaints.sla_calendars
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger sla_policies_append_only
before update or delete on complaints.sla_policies
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger sla_escalation_rules_append_only
before update or delete on complaints.sla_escalation_rules
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_bindings_append_only
before update or delete on complaints.complaint_sla_bindings
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_deadline_history_append_only
before update or delete on complaints.complaint_sla_deadline_history
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_escalation_events_append_only
before update or delete on complaints.complaint_sla_escalation_events
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_definitions_append_only
before update or delete on complaints.kpi_definitions
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_definition_versions_append_only
before update or delete on complaints.kpi_definition_versions
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_snapshots_append_only
before update or delete on complaints.kpi_snapshots
for each row execute function complaints.reject_sla_append_only_mutation();

create function complaints.validate_sla_calendar_configuration(p_calendar_version_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
begin
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;

  if timezone_name is null or not exists (
    select 1 from pg_catalog.pg_timezone_names as timezone
    where timezone.name = timezone_name
  ) then
    return false;
  end if;
  if not exists (
    select 1 from complaints.sla_calendar_working_periods as period
    where period.calendar_version_id = p_calendar_version_id
  ) then
    return false;
  end if;
  if exists (
    select 1
    from complaints.sla_calendar_working_periods as left_period
    inner join complaints.sla_calendar_working_periods as right_period
      on right_period.calendar_version_id = left_period.calendar_version_id
     and right_period.iso_weekday = left_period.iso_weekday
     and right_period.id > left_period.id
     and right_period.opens_at < left_period.closes_at
     and right_period.closes_at > left_period.opens_at
    where left_period.calendar_version_id = p_calendar_version_id
  ) then
    return false;
  end if;
  return true;
end;
$$;

create function complaints.add_sla_business_minutes(
  p_calendar_version_id uuid,
  p_started_at timestamptz,
  p_business_minutes integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
  local_date date;
  current_at timestamptz := p_started_at;
  remaining_seconds numeric := p_business_minutes::numeric * 60;
  period record;
  period_started_at timestamptz;
  period_ended_at timestamptz;
  available_seconds numeric;
  days_scanned integer := 0;
begin
  if p_calendar_version_id is null or p_started_at is null
    or p_business_minutes is null or p_business_minutes < 0 then
    raise exception using errcode = '22023', message = 'SLA_CALENDAR_REQUEST_INVALID';
  end if;
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;
  if timezone_name is null or not complaints.validate_sla_calendar_configuration(
    p_calendar_version_id
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;

  if p_business_minutes = 0 then return p_started_at; end if;

  local_date := (current_at at time zone timezone_name)::date;
  while remaining_seconds > 0 loop
    days_scanned := days_scanned + 1;
    if days_scanned > 4000 then
      raise exception using errcode = '54000', message = 'SLA_CALENDAR_RANGE_EXCEEDED';
    end if;

    for period in
      with exception as (
        select candidate.*
        from complaints.sla_calendar_exceptions as candidate
        where candidate.calendar_version_id = p_calendar_version_id
          and candidate.exception_date = local_date
      ), periods as (
        select exception.opens_at, exception.closes_at
        from exception where exception.is_working_day
        union all
        select weekly.opens_at, weekly.closes_at
        from complaints.sla_calendar_working_periods as weekly
        where weekly.calendar_version_id = p_calendar_version_id
          and weekly.iso_weekday = extract(isodow from local_date)::smallint
          and not exists (select 1 from exception)
      )
      select periods.opens_at, periods.closes_at
      from periods
      order by periods.opens_at
    loop
      period_started_at := (local_date + period.opens_at) at time zone timezone_name;
      period_ended_at := (local_date + period.closes_at) at time zone timezone_name;
      if period_ended_at <= current_at then
        continue;
      end if;
      period_started_at := greatest(period_started_at, current_at);
      available_seconds := extract(epoch from period_ended_at - period_started_at);
      if available_seconds <= 0 then
        continue;
      end if;
      if remaining_seconds <= available_seconds then
        return period_started_at + make_interval(secs => remaining_seconds::double precision);
      end if;
      remaining_seconds := remaining_seconds - available_seconds;
      current_at := period_ended_at;
    end loop;
    local_date := local_date + 1;
    current_at := local_date::timestamp at time zone timezone_name;
  end loop;
  return current_at;
end;
$$;

create function complaints.sla_business_minutes_between(
  p_calendar_version_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
  local_date date;
  final_date date;
  period record;
  period_started_at timestamptz;
  period_ended_at timestamptz;
  total_seconds numeric := 0;
  days_scanned integer := 0;
begin
  if p_started_at is null or p_ended_at is null or p_ended_at < p_started_at then
    raise exception using errcode = '22023', message = 'SLA_CALENDAR_REQUEST_INVALID';
  end if;
  if p_ended_at = p_started_at then return 0; end if;
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;
  if timezone_name is null or not complaints.validate_sla_calendar_configuration(
    p_calendar_version_id
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;
  local_date := (p_started_at at time zone timezone_name)::date;
  final_date := (p_ended_at at time zone timezone_name)::date;
  while local_date <= final_date loop
    days_scanned := days_scanned + 1;
    if days_scanned > 4000 then
      raise exception using errcode = '54000', message = 'SLA_CALENDAR_RANGE_EXCEEDED';
    end if;
    for period in
      with exception as (
        select candidate.* from complaints.sla_calendar_exceptions as candidate
        where candidate.calendar_version_id = p_calendar_version_id
          and candidate.exception_date = local_date
      ), periods as (
        select exception.opens_at, exception.closes_at
        from exception where exception.is_working_day
        union all
        select weekly.opens_at, weekly.closes_at
        from complaints.sla_calendar_working_periods as weekly
        where weekly.calendar_version_id = p_calendar_version_id
          and weekly.iso_weekday = extract(isodow from local_date)::smallint
          and not exists (select 1 from exception)
      )
      select periods.opens_at, periods.closes_at from periods order by periods.opens_at
    loop
      period_started_at := greatest(
        (local_date + period.opens_at) at time zone timezone_name,
        p_started_at
      );
      period_ended_at := least(
        (local_date + period.closes_at) at time zone timezone_name,
        p_ended_at
      );
      if period_ended_at > period_started_at then
        total_seconds := total_seconds
          + extract(epoch from period_ended_at - period_started_at);
      end if;
    end loop;
    local_date := local_date + 1;
  end loop;
  return least(floor(total_seconds / 60), 2147483647)::integer;
end;
$$;

create function public.publish_sla_calendar_version(
  p_actor_user_id uuid,
  p_calendar_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_calendar_versions%rowtype;
  calendar complaints.sla_calendars%rowtype;
  prior_version complaints.sla_calendar_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_calendar_versions as candidate
  where candidate.id = p_calendar_version_id for update;
  select candidate.* into calendar from complaints.sla_calendars as candidate
  where candidate.id = version.calendar_id;
  if version.id is null or calendar.id is null or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or not private.is_verified_governance_authority(calendar.authority_id)
    or not complaints.validate_sla_calendar_configuration(version.id) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1 from complaints.sla_calendar_versions as candidate
    where candidate.calendar_id = version.calendar_id
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_calendar_versions as candidate
  where candidate.calendar_id = version.calendar_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_calendar_versions as candidate
  where candidate.calendar_id = version.calendar_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_calendar_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_calendar_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function public.publish_sla_policy_version(
  p_actor_user_id uuid,
  p_policy_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_policy_versions%rowtype;
  policy complaints.sla_policies%rowtype;
  calendar complaints.sla_calendar_versions%rowtype;
  calendar_definition complaints.sla_calendars%rowtype;
  prior_version complaints.sla_policy_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_policy_versions as candidate
  where candidate.id = p_policy_version_id for update;
  select candidate.* into policy from complaints.sla_policies as candidate
  where candidate.id = version.policy_id;
  select candidate.* into calendar from complaints.sla_calendar_versions as candidate
  where candidate.id = version.calendar_version_id;
  select candidate.* into calendar_definition from complaints.sla_calendars as candidate
  where candidate.id = calendar.calendar_id;
  if version.id is null or policy.id is null or calendar.id is null
    or calendar_definition.id is null or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or calendar.status not in ('approved', 'superseded')
    or calendar.verification_status not in ('source_verified', 'manually_verified')
    or calendar_definition.authority_id <> policy.authority_id
    or not private.is_verified_governance_authority(policy.authority_id)
    or not complaints.validate_sla_calendar_configuration(calendar.id)
    or calendar.effective_from > version.effective_from
    or (
      calendar.effective_to is not null
      and (version.effective_to is null or calendar.effective_to < version.effective_to)
    ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_CONFIGURATION_INVALID';
  end if;
  if policy.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = policy.local_body_id
      and local_body.authority_id = policy.authority_id
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1
    from complaints.sla_category_overrides as override
    left join routing.issue_categories as category on category.id = override.category_id
    where override.policy_version_id = version.id
      and (
        category.id is null
        or category.status <> 'active'
        or category.verification_status <> 'verified'
        or category.is_placeholder
        or not category.is_routing_eligible
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_OVERRIDE_INVALID';
  end if;
  if exists (
    select 1 from complaints.sla_policy_versions as candidate
    where candidate.policy_id = version.policy_id
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_policy_versions as candidate
  where candidate.policy_id = version.policy_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_POLICY_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_policy_versions as candidate
  where candidate.policy_id = version.policy_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_policy_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_policy_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function public.publish_sla_escalation_rule_version(
  p_actor_user_id uuid,
  p_escalation_rule_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_escalation_rule_versions%rowtype;
  rule complaints.sla_escalation_rules%rowtype;
  policy_version complaints.sla_policy_versions%rowtype;
  prior_version complaints.sla_escalation_rule_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_escalation_rule_versions as candidate
  where candidate.id = p_escalation_rule_version_id for update;
  select candidate.* into policy_version from complaints.sla_policy_versions as candidate
  where candidate.id = version.policy_version_id;
  select candidate.* into rule from complaints.sla_escalation_rules as candidate
  where candidate.id = version.escalation_rule_id;
  if version.id is null or policy_version.id is null or rule.id is null
    or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or policy_version.status not in ('approved', 'superseded')
    or version.effective_from < policy_version.effective_from
    or (
      policy_version.effective_to is not null
      and (version.effective_to is null or version.effective_to > policy_version.effective_to)
    )
    or (version.milestone = 'inspection' and policy_version.inspection_business_minutes is null)
    or rule.policy_id <> policy_version.policy_id
    or (version.action_type = 'mark_escalated' and version.target_officer_role_id is null)
    or (
      version.target_officer_role_id is not null
      and not exists (
        select 1 from governance.officer_roles as officer_role
        where officer_role.id = version.target_officer_role_id
          and officer_role.status = 'active'
          and officer_role.verification_status = 'verified'
          and not officer_role.is_placeholder
          and officer_role.is_routing_eligible
      )
    ) then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1
    from complaints.sla_escalation_rule_versions as candidate
    where candidate.policy_version_id = version.policy_version_id
      and candidate.milestone = version.milestone
      and candidate.escalation_level = version.escalation_level
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.escalation_rule_id <> version.escalation_rule_id
        or candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_escalation_rule_versions as candidate
  where candidate.policy_version_id = version.policy_version_id
    and candidate.milestone = version.milestone
    and candidate.escalation_level = version.escalation_level
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_escalation_rule_versions as candidate
  where candidate.policy_version_id = version.policy_version_id
    and candidate.milestone = version.milestone
    and candidate.escalation_level = version.escalation_level
    and candidate.escalation_rule_id = version.escalation_rule_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_escalation_rule_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_escalation_rule_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function complaints.initialize_complaint_sla(
  p_complaint_id uuid,
  p_assignment_id uuid,
  p_started_at timestamptz,
  p_cycle integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  selected_policy_version complaints.sla_policy_versions%rowtype;
  selected_policy_version_id uuid;
  selected_count integer := 0;
  binding_id uuid;
  override complaints.sla_category_overrides%rowtype;
  target record;
  clock_id uuid;
  target_at timestamptz;
begin
  if p_complaint_id is null or p_assignment_id is null or p_started_at is null
    or p_cycle is null or p_cycle < 1 then
    raise exception using errcode = '22023', message = 'SLA_BINDING_REQUEST_INVALID';
  end if;
  select existing.id into binding_id
  from complaints.complaint_sla_bindings as existing
  where existing.complaint_id = p_complaint_id and existing.cycle = p_cycle;
  if binding_id is not null then return binding_id; end if;

  select candidate.* into complaint from complaints.complaints as candidate
  where candidate.id = p_complaint_id;
  select candidate.* into assignment from complaints.complaint_assignments as candidate
  where candidate.id = p_assignment_id and candidate.complaint_id = p_complaint_id;
  if complaint.id is null or assignment.id is null then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if assignment.status <> 'active'
    or assignment.effective_from > p_started_at
    or (assignment.effective_to is not null and assignment.effective_to <= p_started_at)
    or not complaints.is_verified_assignment_scope(
      assignment.authority_id,
      assignment.local_body_id,
      assignment.ward_id,
      assignment.department_id,
      assignment.authority_department_id,
      assignment.officer_role_id,
      assignment.officer_assignment_id,
      p_started_at
    ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'unverified_assignment_scope', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  if not exists (
    select 1
    from routing.issue_categories as category
    where category.id = complaint.category_id
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
  ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'unverified_issue_category', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  with eligible as (
    select version.*, ((policy.local_body_id is not null)::integer) as specificity
    from complaints.sla_policies as policy
    inner join complaints.sla_policy_versions as version on version.policy_id = policy.id
    inner join complaints.sla_calendar_versions as calendar
      on calendar.id = version.calendar_version_id
    where policy.authority_id = assignment.authority_id
      and (policy.local_body_id is null or policy.local_body_id = assignment.local_body_id)
      and version.status in ('approved', 'superseded')
      and version.verification_status in ('source_verified', 'manually_verified')
      and version.effective_from <= p_started_at
      and (version.effective_to is null or version.effective_to > p_started_at)
      and calendar.status in ('approved', 'superseded')
      and calendar.verification_status in ('source_verified', 'manually_verified')
      and calendar.effective_from <= p_started_at
      and (calendar.effective_to is null or calendar.effective_to > p_started_at)
  ), ranked as (
    select eligible.*, max(eligible.specificity) over () as highest_specificity
    from eligible
  )
  select (array_agg(ranked.id order by ranked.id))[1], count(*)::integer
  into selected_policy_version_id, selected_count
  from ranked where ranked.specificity = ranked.highest_specificity;

  if selected_count = 0 then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'no_approved_policy', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;
  if selected_count > 1 then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'ambiguous', null,
      least(selected_count, 100), 'ambiguous_approved_policy', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;
  select candidate.* into selected_policy_version
  from complaints.sla_policy_versions as candidate
  where candidate.id = selected_policy_version_id;
  if not complaints.validate_sla_calendar_configuration(
    selected_policy_version.calendar_version_id
  ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'invalid_configuration', null,
      1, 'invalid_calendar_configuration', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  insert into complaints.complaint_sla_bindings (
    complaint_id, assignment_id, cycle, status, policy_version_id,
    candidate_count, reason_code, evaluated_at
  ) values (
    complaint.id, assignment.id, p_cycle, 'applied', selected_policy_version.id,
    1, 'approved_policy_applied', p_started_at
  ) returning id into binding_id;

  select candidate.* into override
  from complaints.sla_category_overrides as candidate
  where candidate.policy_version_id = selected_policy_version.id
    and candidate.category_id = complaint.category_id;

  for target in
    select * from (values
      (
        'acknowledgement'::text,
        coalesce(
          override.acknowledgement_business_minutes,
          selected_policy_version.acknowledgement_business_minutes
        )
      ),
      (
        'inspection'::text,
        coalesce(
          override.inspection_business_minutes,
          selected_policy_version.inspection_business_minutes
        )
      ),
      (
        'resolution'::text,
        coalesce(
          override.resolution_business_minutes,
          selected_policy_version.resolution_business_minutes
        )
      )
    ) as configured(milestone, business_minutes)
    where configured.business_minutes is not null
  loop
    target_at := complaints.add_sla_business_minutes(
      selected_policy_version.calendar_version_id,
      p_started_at,
      target.business_minutes
    );
    insert into complaints.complaint_sla_clocks (
      complaint_id, assignment_id, binding_id, policy_version_id, calendar_version_id,
      category_override_id, milestone, cycle, target_business_minutes,
      started_at, target_at, state
    ) values (
      complaint.id, assignment.id, binding_id, selected_policy_version.id,
      selected_policy_version.calendar_version_id, override.id, target.milestone,
      p_cycle, target.business_minutes, p_started_at, target_at, 'active'
    ) returning id into clock_id;
    insert into complaints.complaint_sla_deadline_history (
      clock_id, sequence, reason_code, prior_target_at, target_at, occurred_at
    ) values (clock_id, 1, 'initial_policy', null, target_at, p_started_at);

    insert into complaints.sla_escalation_jobs (
      clock_id, escalation_rule_version_id, due_at, state, next_attempt_at
    )
    select
      clock_id,
      rule.id,
      complaints.add_sla_business_minutes(
        selected_policy_version.calendar_version_id,
        target_at,
        rule.business_minutes_after_target
      ),
      'pending',
      complaints.add_sla_business_minutes(
        selected_policy_version.calendar_version_id,
        target_at,
        rule.business_minutes_after_target
      )
    from complaints.sla_escalation_rule_versions as rule
    where rule.policy_version_id = selected_policy_version.id
      and rule.milestone = target.milestone
      and rule.status in ('approved', 'superseded')
      and rule.verification_status in ('source_verified', 'manually_verified')
      and rule.effective_from <= p_started_at
      and (rule.effective_to is null or rule.effective_to > p_started_at);
  end loop;
  return binding_id;
end;
$$;

create function complaints.initialize_initial_complaint_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.version = 1 and new.assignment_source = 'routing_decision' then
    perform complaints.initialize_complaint_sla(
      new.complaint_id,
      new.id,
      new.effective_from,
      1
    );
  end if;
  return new;
end;
$$;

create trigger complaint_assignments_initialize_sla
after insert on complaints.complaint_assignments
for each row execute function complaints.initialize_initial_complaint_sla();

create function complaints.resume_sla_clock(
  p_clock_id uuid,
  p_resumed_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  clock complaints.complaint_sla_clocks%rowtype;
  pause complaints.complaint_sla_pause_intervals%rowtype;
  paused_minutes integer;
  revised_target timestamptz;
  next_sequence integer;
begin
  if p_clock_id is null or p_resumed_at is null then
    raise exception using errcode = '22023', message = 'SLA_PAUSE_REQUEST_INVALID';
  end if;

  select candidate.* into clock
  from complaints.complaint_sla_clocks as candidate
  where candidate.id = p_clock_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SLA_CLOCK_NOT_FOUND';
  end if;
  if clock.state <> 'paused' then
    return clock.target_at;
  end if;

  select candidate.* into pause
  from complaints.complaint_sla_pause_intervals as candidate
  where candidate.clock_id = clock.id and candidate.resumed_at is null
  for update;
  if pause.id is null or p_resumed_at < pause.paused_at then
    raise exception using errcode = '55000', message = 'SLA_PAUSE_INTERVAL_INVALID';
  end if;

  paused_minutes := complaints.sla_business_minutes_between(
    clock.calendar_version_id,
    pause.paused_at,
    p_resumed_at
  );
  revised_target := complaints.add_sla_business_minutes(
    clock.calendar_version_id,
    clock.target_at,
    paused_minutes
  );

  update complaints.complaint_sla_pause_intervals as candidate
  set resumed_at = p_resumed_at, paused_business_minutes = paused_minutes
  where candidate.id = pause.id;
  update complaints.complaint_sla_clocks as candidate
  set state = 'active', paused_at = null, target_at = revised_target,
    updated_at = p_resumed_at
  where candidate.id = clock.id;

  select coalesce(max(history.sequence), 0) + 1 into next_sequence
  from complaints.complaint_sla_deadline_history as history
  where history.clock_id = clock.id;
  insert into complaints.complaint_sla_deadline_history (
    clock_id, sequence, reason_code, prior_target_at, target_at,
    source_external_dependency_id, occurred_at
  ) values (
    clock.id, next_sequence, 'external_dependency_resumed', clock.target_at,
    revised_target, pause.external_dependency_id, p_resumed_at
  );

  update complaints.sla_escalation_jobs as job
  set
    due_at = complaints.add_sla_business_minutes(
      clock.calendar_version_id,
      revised_target,
      rule.business_minutes_after_target
    ),
    next_attempt_at = complaints.add_sla_business_minutes(
      clock.calendar_version_id,
      revised_target,
      rule.business_minutes_after_target
    ),
    updated_at = p_resumed_at
  from complaints.sla_escalation_rule_versions as rule
  where job.clock_id = clock.id
    and job.escalation_rule_version_id = rule.id
    and job.state in ('pending', 'retry', 'processing');

  return revised_target;
end;
$$;

create or replace function complaints.initialize_initial_complaint_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_cycle integer;
  prior_clock record;
begin
  if new.status <> 'active' or new.effective_to is not null then
    return new;
  end if;

  for prior_clock in
    select candidate.id, candidate.state
    from complaints.complaint_sla_clocks as candidate
    where candidate.complaint_id = new.complaint_id
      and candidate.assignment_id <> new.id
      and candidate.completed_at is null
      and candidate.state in ('active', 'paused', 'breached')
    for update
  loop
    if prior_clock.state = 'paused' then
      perform complaints.resume_sla_clock(prior_clock.id, new.effective_from);
    end if;
  end loop;

  update complaints.complaint_sla_clocks as clock
  set state = 'cancelled', paused_at = null, updated_at = new.effective_from
  where clock.complaint_id = new.complaint_id
    and clock.assignment_id <> new.id
    and clock.completed_at is null
    and clock.state in ('active', 'paused', 'breached');
  update complaints.sla_escalation_jobs as job
  set state = 'cancelled', worker_id = null, lease_token = null,
    lease_expires_at = null, completed_at = new.effective_from,
    updated_at = new.effective_from
  from complaints.complaint_sla_clocks as clock
  where job.clock_id = clock.id
    and clock.complaint_id = new.complaint_id
    and clock.assignment_id <> new.id
    and job.state in ('pending', 'retry');

  select coalesce(max(binding.cycle), 0) + 1 into next_cycle
  from complaints.complaint_sla_bindings as binding
  where binding.complaint_id = new.complaint_id;
  perform complaints.initialize_complaint_sla(
    new.complaint_id,
    new.id,
    new.effective_from,
    next_cycle
  );
  return new;
end;
$$;

create function complaints.apply_status_event_to_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  next_cycle integer;
  operation_at timestamptz := new.occurred_at;
  clock_entry record;
  revised_target timestamptz;
begin
  for clock_entry in
    select candidate.id, candidate.state, candidate.target_at
    from complaints.complaint_sla_clocks as candidate
    inner join complaints.sla_policy_versions as policy
      on policy.id = candidate.policy_version_id
    where candidate.complaint_id = new.complaint_id
      and candidate.state in ('active', 'paused', 'breached')
      and candidate.completed_at is null
      and (
        (candidate.milestone = 'acknowledgement' and new.to_status = 'acknowledged')
        or (candidate.milestone = 'inspection' and new.to_status = 'inspection_completed')
        or (
          candidate.milestone = 'resolution'
          and new.to_status = policy.resolution_completion_status
        )
      )
    for update of candidate
  loop
    revised_target := clock_entry.target_at;
    if clock_entry.state = 'paused' then
      revised_target := complaints.resume_sla_clock(clock_entry.id, operation_at);
    end if;
    update complaints.complaint_sla_clocks as candidate
    set
      state = case when operation_at <= revised_target then 'met' else 'breached' end,
      paused_at = null,
      completed_at = operation_at,
      completion_status_history_id = new.id,
      breached_at = case when operation_at <= revised_target
        then null else coalesce(candidate.breached_at, revised_target) end,
      updated_at = operation_at
    where candidate.id = clock_entry.id;
  end loop;

  update complaints.sla_escalation_jobs as job
  set state = 'cancelled', completed_at = operation_at, updated_at = operation_at
  from complaints.complaint_sla_clocks as clock
  where job.clock_id = clock.id
    and clock.complaint_id = new.complaint_id
    and clock.completed_at is not null
    and job.state in ('pending', 'retry');

  if new.to_status in ('rejected', 'cancelled', 'closed') then
    for clock_entry in
      select candidate.id, candidate.state
      from complaints.complaint_sla_clocks as candidate
      where candidate.complaint_id = new.complaint_id
        and candidate.completed_at is null
        and candidate.state in ('active', 'paused', 'breached')
      for update
    loop
      if clock_entry.state = 'paused' then
        perform complaints.resume_sla_clock(clock_entry.id, operation_at);
      end if;
    end loop;
    update complaints.complaint_sla_clocks as clock
    set state = 'cancelled', paused_at = null, updated_at = operation_at
    where clock.complaint_id = new.complaint_id
      and clock.completed_at is null
      and clock.state in ('active', 'paused', 'breached');
    update complaints.sla_escalation_jobs as job
    set state = 'cancelled', completed_at = operation_at, updated_at = operation_at
    from complaints.complaint_sla_clocks as clock
    where job.clock_id = clock.id
      and clock.complaint_id = new.complaint_id
      and job.state in ('pending', 'retry');
  end if;

  if new.event_source = 'citizen_action' and new.to_status in ('reopened', 'escalated') then
    select assignment.id into assignment_id
    from complaints.complaint_assignments as assignment
    where assignment.complaint_id = new.complaint_id
      and assignment.status = 'active' and assignment.effective_to is null;
    select coalesce(max(binding.cycle), 0) + 1 into next_cycle
    from complaints.complaint_sla_bindings as binding
    where binding.complaint_id = new.complaint_id;
    if assignment_id is not null then
      perform complaints.initialize_complaint_sla(
        new.complaint_id, assignment_id, operation_at, next_cycle
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger complaint_status_history_apply_sla
after insert on complaints.complaint_status_history
for each row execute function complaints.apply_status_event_to_sla();

create function complaints.apply_external_dependency_to_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := coalesce(new.updated_at, clock_timestamp());
  clock record;
  pause complaints.complaint_sla_pause_intervals%rowtype;
  paused_minutes integer;
  prior_target timestamptz;
  revised_target timestamptz;
  next_sequence integer;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    update complaints.complaint_sla_clocks as candidate
    set external_dependency_segment = true, updated_at = operation_at
    where candidate.complaint_id = new.complaint_id;

    for clock in
      with updated as (
        update complaints.complaint_sla_clocks as candidate
        set state = 'paused', paused_at = operation_at, updated_at = operation_at
        from complaints.sla_policy_versions as policy
        where candidate.complaint_id = new.complaint_id
          and candidate.policy_version_id = policy.id
          and policy.pause_for_external_dependencies
          and candidate.state = 'active'
          and not exists (
            select 1 from complaints.complaint_sla_pause_intervals as existing
            where existing.clock_id = candidate.id and existing.resumed_at is null
          )
        returning candidate.id
      )
      select updated.id from updated
    loop
      insert into complaints.complaint_sla_pause_intervals (
        clock_id, external_dependency_id, paused_at
      ) values (clock.id, new.id, operation_at);
    end loop;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'active'
    and new.status in ('resolved', 'cancelled')
    and not exists (
    select 1 from complaints.complaint_external_dependencies as dependency
    where dependency.complaint_id = new.complaint_id
      and dependency.id <> new.id
      and dependency.status = 'active'
  ) then
    for clock in
      select candidate.*
      from complaints.complaint_sla_clocks as candidate
      where candidate.complaint_id = new.complaint_id
        and candidate.state = 'paused'
      for update
    loop
      select candidate.* into pause
      from complaints.complaint_sla_pause_intervals as candidate
      where candidate.clock_id = clock.id and candidate.resumed_at is null
      for update;
      if pause.id is null then continue; end if;
      paused_minutes := complaints.sla_business_minutes_between(
        clock.calendar_version_id,
        pause.paused_at,
        operation_at
      );
      prior_target := clock.target_at;
      revised_target := complaints.add_sla_business_minutes(
        clock.calendar_version_id,
        prior_target,
        paused_minutes
      );
      update complaints.complaint_sla_pause_intervals as candidate
      set resumed_at = operation_at, paused_business_minutes = paused_minutes
      where candidate.id = pause.id;
      update complaints.complaint_sla_clocks as candidate
      set state = 'active', paused_at = null, target_at = revised_target, updated_at = operation_at
      where candidate.id = clock.id;
      select coalesce(max(history.sequence), 0) + 1 into next_sequence
      from complaints.complaint_sla_deadline_history as history
      where history.clock_id = clock.id;
      insert into complaints.complaint_sla_deadline_history (
        clock_id, sequence, reason_code, prior_target_at, target_at,
        source_external_dependency_id, occurred_at
      ) values (
        clock.id, next_sequence, 'external_dependency_resumed', prior_target,
        revised_target, pause.external_dependency_id, operation_at
      );
      update complaints.sla_escalation_jobs as job
      set
        due_at = complaints.add_sla_business_minutes(
          clock.calendar_version_id,
          revised_target,
          rule.business_minutes_after_target
        ),
        next_attempt_at = complaints.add_sla_business_minutes(
          clock.calendar_version_id,
          revised_target,
          rule.business_minutes_after_target
        ),
        updated_at = operation_at
      from complaints.sla_escalation_rule_versions as rule
      where job.clock_id = clock.id
        and job.escalation_rule_version_id = rule.id
        and job.state in ('pending', 'retry', 'processing');
    end loop;
  end if;
  return new;
end;
$$;

create trigger complaint_external_dependencies_apply_sla
after insert or update of status on complaints.complaint_external_dependencies
for each row execute function complaints.apply_external_dependency_to_sla();

create function complaints.current_sla_escalation_job_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text := nullif(current_setting('local_wellness.sla_escalation_job_id', true), '');
begin
  if configured is null then return null; end if;
  begin return configured::uuid;
  exception when invalid_text_representation then return null;
  end;
end;
$$;

create or replace function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  government_action_id uuid := complaints.current_action_request_id();
  citizen_action_id uuid := complaints.current_citizen_action_request_id();
  sla_job_id uuid := complaints.current_sla_escalation_job_id();
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

  if government_action_id is not null and exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = government_action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then return new; end if;

  if citizen_action_id is not null and exists (
    select 1
    from complaints.citizen_action_requests as action
    where action.id = citizen_action_id
      and action.complaint_id = old.id
      and action.actor_user_id = old.citizen_user_id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then return new; end if;

  if sla_job_id is not null
    and new.current_status = 'escalated'
    and exists (
      select 1
      from complaints.sla_escalation_jobs as job
      inner join complaints.complaint_sla_clocks as clock on clock.id = job.clock_id
      inner join complaints.sla_escalation_rule_versions as rule
        on rule.id = job.escalation_rule_version_id
      where job.id = sla_job_id
        and job.state = 'processing'
        and job.lease_expires_at > clock_timestamp()
        and clock.complaint_id = old.id
        and rule.action_type = 'mark_escalated'
    ) then return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'complaints.complaints records are append-only.';
end;
$$;

create function public.claim_sla_escalation_jobs(
  p_worker_id text,
  p_limit integer default 25,
  p_lease_seconds integer default 60
)
returns table (job_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'
    or p_limit is null or p_limit not between 1 and 100
    or p_lease_seconds is null or p_lease_seconds not between 15 and 300 then
    raise exception using errcode = '22023', message = 'SLA_JOB_CLAIM_INVALID';
  end if;

  update complaints.sla_escalation_jobs as job
  set
    state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED', completed_at = operation_at, updated_at = operation_at
  where job.state = 'processing'
    and job.lease_expires_at <= operation_at and job.attempt_count >= 5;

  return query
  with candidates as materialized (
    select job.id
    from complaints.sla_escalation_jobs as job
    inner join complaints.complaint_sla_clocks as clock on clock.id = job.clock_id
    where clock.state in ('active', 'breached')
      and clock.completed_at is null
      and job.due_at <= operation_at
      and (
        (job.state in ('pending', 'retry') and job.next_attempt_at <= operation_at)
        or (
          job.state = 'processing' and job.lease_expires_at <= operation_at
          and job.attempt_count < 5
        )
      )
    order by job.due_at, job.created_at, job.id
    for update of job skip locked
    limit p_limit
  ), claimed as (
    update complaints.sla_escalation_jobs as job
    set
      state = 'processing', attempt_count = job.attempt_count + 1,
      worker_id = p_worker_id, lease_token = gen_random_uuid(),
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case when job.state = 'processing'
        then 'LEASE_EXPIRED' else job.last_failure_code end,
      updated_at = operation_at
    from candidates where job.id = candidates.id
    returning job.id, job.lease_token
  )
  select claimed.id, claimed.lease_token from claimed;
end;
$$;

create function public.execute_sla_escalation_job(
  p_job_id uuid,
  p_lease_token uuid
)
returns table (
  outcome text,
  escalation_event_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job complaints.sla_escalation_jobs%rowtype;
  clock complaints.complaint_sla_clocks%rowtype;
  rule complaints.sla_escalation_rule_versions%rowtype;
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  event_id uuid;
  operation_at timestamptz := clock_timestamp();
  prior_status text;
  resulting_status text;
  status_history_id uuid;
  status_sequence integer;
begin
  if p_job_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'SLA_JOB_REQUEST_INVALID';
  end if;
  select candidate.* into job from complaints.sla_escalation_jobs as candidate
  where candidate.id = p_job_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SLA_JOB_NOT_FOUND';
  end if;
  select existing.id into event_id
  from complaints.complaint_sla_escalation_events as existing
  where existing.escalation_job_id = job.id;
  if job.state = 'completed' and event_id is not null then
    return query select 'completed'::text, event_id, true;
    return;
  end if;
  if job.state <> 'processing' or job.lease_token is distinct from p_lease_token
    or job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'SLA_JOB_CLAIM_INVALID';
  end if;
  select candidate.* into clock from complaints.complaint_sla_clocks as candidate
  where candidate.id = job.clock_id for update;
  select candidate.* into rule from complaints.sla_escalation_rule_versions as candidate
  where candidate.id = job.escalation_rule_version_id;
  select candidate.* into complaint from complaints.complaints as candidate
  where candidate.id = clock.complaint_id for update;
  select candidate.* into assignment
  from complaints.complaint_assignments as candidate
  where candidate.complaint_id = clock.complaint_id
    and candidate.status = 'active'
    and candidate.effective_to is null;

  if clock.completed_at is not null or clock.state = 'cancelled'
    or complaint.current_status in ('resolved', 'closed', 'rejected', 'cancelled')
    or assignment.id is null
    or assignment.id <> clock.assignment_id then
    update complaints.sla_escalation_jobs as candidate
    set state = 'cancelled', worker_id = null, lease_token = null, lease_expires_at = null,
      completed_at = operation_at, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'cancelled'::text, null::uuid, false;
    return;
  end if;

  if clock.state = 'paused' or job.due_at > operation_at then
    update complaints.sla_escalation_jobs as candidate
    set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
      next_attempt_at = greatest(job.due_at, operation_at + interval '1 minute'),
      last_failure_code = null, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'cancelled'::text, null::uuid, false;
    return;
  end if;

  update complaints.complaint_sla_clocks as candidate
  set state = 'breached', breached_at = coalesce(candidate.breached_at, candidate.target_at),
    updated_at = operation_at
  where candidate.id = clock.id and candidate.state = 'active';

  prior_status := complaint.current_status;
  resulting_status := prior_status;
  if rule.action_type = 'mark_escalated' and prior_status <> 'escalated' then
    perform set_config('local_wellness.sla_escalation_job_id', job.id::text, true);
    update complaints.complaints as candidate
    set current_status = 'escalated', workflow_version = candidate.workflow_version + 1,
      updated_at = operation_at
    where candidate.id = complaint.id;
    resulting_status := 'escalated';
  end if;

  select coalesce(max(history.sequence), 0) + 1 into status_sequence
  from complaints.complaint_status_history as history
  where history.complaint_id = complaint.id;
  insert into complaints.complaint_status_history (
    complaint_id, sequence, from_status, to_status, actor_user_id, event_source,
    reason_code, public_message, metadata, occurred_at
  ) values (
    complaint.id, status_sequence, prior_status, resulting_status, null, 'system',
    case when rule.action_type = 'mark_escalated'
      then 'SLA_OVERDUE_ESCALATION' else 'SLA_OVERDUE_RECORDED' end,
    'The complaint exceeded a reviewed service deadline.',
    jsonb_build_object(
      'milestone', rule.milestone,
      'escalationLevel', rule.escalation_level
    ),
    operation_at
  ) returning id into status_history_id;

  insert into complaints.notification_outbox (
    complaint_id,
    status_history_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    complaint.id,
    status_history_id,
    'complaint_status_changed',
    complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', resulting_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )),
    operation_at
  );

  insert into complaints.complaint_sla_escalation_events (
    complaint_id, clock_id, escalation_job_id, escalation_rule_version_id,
    assignment_id, milestone, escalation_level, action_type,
    prior_status, resulting_status, occurred_at,
    metadata
  ) values (
    complaint.id, clock.id, job.id, rule.id, clock.assignment_id,
    rule.milestone, rule.escalation_level, rule.action_type,
    prior_status, resulting_status, operation_at,
    jsonb_build_object('statusHistoryId', status_history_id)
  ) returning id into event_id;

  update complaints.sla_escalation_jobs as candidate
  set state = 'completed', worker_id = null, lease_token = null, lease_expires_at = null,
    completed_at = operation_at, updated_at = operation_at
  where candidate.id = job.id;

  return query select
    case when resulting_status = 'escalated' and prior_status <> 'escalated'
      then 'escalated'::text else 'recorded'::text end,
    event_id,
    false;
end;
$$;

create function public.fail_sla_escalation_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job complaints.sla_escalation_jobs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_job_id is null or p_lease_token is null
    or p_error_code <> 'SLA_ESCALATION_EXECUTION_FAILED' then
    raise exception using errcode = '22023', message = 'SLA_JOB_FAILURE_INVALID';
  end if;
  select candidate.* into job from complaints.sla_escalation_jobs as candidate
  where candidate.id = p_job_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SLA_JOB_NOT_FOUND'; end if;
  if job.state <> 'processing' or job.lease_token is distinct from p_lease_token
    or job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'SLA_JOB_CLAIM_INVALID';
  end if;
  if job.attempt_count >= 5 then
    update complaints.sla_escalation_jobs as candidate
    set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
      last_failure_code = p_error_code, completed_at = operation_at, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;
  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, job.attempt_count - 1))::integer)
  );
  update complaints.sla_escalation_jobs as candidate
  set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
    next_attempt_at = retry_at, last_failure_code = p_error_code, updated_at = operation_at
  where candidate.id = job.id;
  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function complaints.complaint_matches_kpi_segment(
  p_complaint_id uuid,
  p_segment text,
  p_source_cutoff_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_segment
    when 'all' then true
    when 'external_dependency' then exists (
      select 1 from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = p_complaint_id
        and dependency.created_at <= p_source_cutoff_at
    )
    when 'no_external_dependency' then not exists (
      select 1 from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = p_complaint_id
        and dependency.created_at <= p_source_cutoff_at
    )
    else false
  end;
$$;

create function complaints.complaint_matches_kpi_scope(
  p_complaint_id uuid,
  p_authority_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_source_cutoff_at timestamptz
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
    where assignment.complaint_id = p_complaint_id
      and assignment.authority_id = p_authority_id
      and assignment.effective_from <= p_source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > p_source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        p_source_cutoff_at
      )
      and (
        (p_scope_type = 'municipality' and assignment.local_body_id = p_scope_id)
        or (p_scope_type = 'ward' and assignment.ward_id = p_scope_id)
        or (
          p_scope_type = 'department'
          and assignment.authority_department_id = p_scope_id
        )
      )
  );
$$;

create function complaints.complaint_status_at(
  p_complaint_id uuid,
  p_source_cutoff_at timestamptz
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select history.to_status
  from complaints.complaint_status_history as history
  where history.complaint_id = p_complaint_id
    and history.occurred_at <= p_source_cutoff_at
  order by history.occurred_at desc, history.sequence desc
  limit 1;
$$;

create function public.enqueue_kpi_calculation_run(
  p_actor_user_id uuid,
  p_authority_id uuid,
  p_window_started_at timestamptz,
  p_window_ended_at timestamptz,
  p_source_cutoff_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  fingerprint text;
  operation_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or p_authority_id is null
    or p_window_started_at is null or p_window_ended_at is null
    or p_source_cutoff_at is null
    or p_window_ended_at <= p_window_started_at
    or p_window_ended_at > p_source_cutoff_at
    or p_source_cutoff_at > operation_at
    or p_window_ended_at - p_window_started_at > interval '366 days' then
    raise exception using errcode = '22023', message = 'KPI_RUN_REQUEST_INVALID';
  end if;
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) and not exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join public.authority_memberships as membership
      on membership.user_id = user_role.user_id
     and membership.authority_id = user_role.authority_id
    where user_role.user_id = p_actor_user_id
      and user_role.authority_id = p_authority_id
      and user_role.scope_type = 'authority'
      and role.code in ('municipal_admin', 'government_operator')
      and user_role.status = 'active'
      and user_role.effective_from <= operation_at
      and (user_role.effective_until is null or user_role.effective_until > operation_at)
      and membership.status = 'active'
      and membership.effective_from <= operation_at
      and (membership.effective_until is null or membership.effective_until > operation_at)
      and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;
  if not private.is_verified_governance_authority(p_authority_id) then
    raise exception using errcode = '55000', message = 'KPI_AUTHORITY_NOT_VERIFIED';
  end if;
  fingerprint := encode(extensions.digest(
    concat_ws(
      '|',
      p_authority_id::text,
      round(extract(epoch from p_window_started_at) * 1000000)::bigint::text,
      round(extract(epoch from p_window_ended_at) * 1000000)::bigint::text,
      round(extract(epoch from p_source_cutoff_at) * 1000000)::bigint::text,
      'kpi-v1'
    ),
    'sha256'
  ), 'hex');
  insert into complaints.kpi_calculation_runs (
    authority_id, window_started_at, window_ended_at, source_cutoff_at,
    request_fingerprint, requested_by_user_id, next_attempt_at
  ) values (
    p_authority_id, p_window_started_at, p_window_ended_at, p_source_cutoff_at,
    fingerprint, p_actor_user_id, operation_at
  )
  on conflict (authority_id, request_fingerprint) do update
    set authority_id = excluded.authority_id
  returning id into run_id;
  return run_id;
end;
$$;

create function public.schedule_kpi_calculation_runs(
  p_window_started_at timestamptz,
  p_window_ended_at timestamptz,
  p_source_cutoff_at timestamptz
)
returns table (run_id uuid, authority_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_window_started_at is null or p_window_ended_at is null
    or p_source_cutoff_at is null or p_window_ended_at <= p_window_started_at
    or p_window_ended_at > p_source_cutoff_at
    or p_source_cutoff_at > operation_at
    or p_window_ended_at - p_window_started_at > interval '366 days' then
    raise exception using errcode = '22023', message = 'KPI_RUN_REQUEST_INVALID';
  end if;
  return query
  with authorities as (
    select distinct assignment.authority_id
    from complaints.complaint_assignments as assignment
    inner join complaints.complaints as complaint on complaint.id = assignment.complaint_id
    where complaint.submitted_at <= p_source_cutoff_at
      and private.is_verified_governance_authority(assignment.authority_id)
  ), candidates as (
    select
      authority.authority_id,
      encode(extensions.digest(
        concat_ws(
          '|',
          authority.authority_id::text,
          round(extract(epoch from p_window_started_at) * 1000000)::bigint::text,
          round(extract(epoch from p_window_ended_at) * 1000000)::bigint::text,
          round(extract(epoch from p_source_cutoff_at) * 1000000)::bigint::text,
          'kpi-v1'
        ),
        'sha256'
      ), 'hex') as fingerprint
    from authorities as authority
  ), inserted as (
    insert into complaints.kpi_calculation_runs (
      authority_id, window_started_at, window_ended_at, source_cutoff_at,
      request_fingerprint, requested_by_user_id, next_attempt_at
    )
    select
      candidate.authority_id, p_window_started_at, p_window_ended_at,
      p_source_cutoff_at, candidate.fingerprint, null, clock_timestamp()
    from candidates as candidate
    on conflict on constraint kpi_calculation_runs_request_unique do update
      set authority_id = excluded.authority_id
    returning
      complaints.kpi_calculation_runs.id,
      complaints.kpi_calculation_runs.authority_id
  )
  select inserted.id, inserted.authority_id from inserted;
end;
$$;

create function public.claim_kpi_calculation_runs(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table (run_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'
    or p_limit is null or p_limit not between 1 and 50
    or p_lease_seconds is null or p_lease_seconds not between 15 and 600 then
    raise exception using errcode = '22023', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  update complaints.kpi_calculation_runs as run
  set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED', updated_at = operation_at
  where run.state = 'processing' and run.lease_expires_at <= operation_at
    and run.attempt_count >= 5;

  return query
  with candidates as materialized (
    select run.id
    from complaints.kpi_calculation_runs as run
    where (
      run.state in ('pending', 'retry') and run.next_attempt_at <= operation_at
    ) or (
      run.state = 'processing' and run.lease_expires_at <= operation_at
      and run.attempt_count < 5
    )
    order by coalesce(run.lease_expires_at, run.next_attempt_at), run.created_at, run.id
    for update skip locked limit p_limit
  ), claimed as (
    update complaints.kpi_calculation_runs as run
    set state = 'processing', attempt_count = run.attempt_count + 1,
      worker_id = p_worker_id, lease_token = gen_random_uuid(),
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case when run.state = 'processing'
        then 'LEASE_EXPIRED' else run.last_failure_code end,
      updated_at = operation_at
    from candidates where run.id = candidates.id
    returning run.id, run.lease_token
  )
  select claimed.id, claimed.lease_token from claimed;
end;
$$;

create function public.materialize_kpi_calculation_run(
  p_run_id uuid,
  p_lease_token uuid
)
returns table (snapshot_count integer, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run complaints.kpi_calculation_runs%rowtype;
  scope record;
  segment text;
  definition record;
  numerator_value bigint;
  denominator_value bigint;
  sample_value bigint;
  metric_value numeric(14, 4);
  operation_at timestamptz := clock_timestamp();
  inserted_count integer := 0;
begin
  if p_run_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'KPI_RUN_MATERIALIZATION_INVALID';
  end if;
  select candidate.* into run from complaints.kpi_calculation_runs as candidate
  where candidate.id = p_run_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'KPI_RUN_NOT_FOUND'; end if;
  if run.state = 'completed' then
    select count(*)::integer into inserted_count
    from complaints.kpi_snapshots as snapshot
    where snapshot.calculation_run_id = run.id;
    return query select inserted_count, true;
    return;
  end if;
  if run.state <> 'processing' or run.lease_token is distinct from p_lease_token
    or run.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  if run.source_cutoff_at > operation_at
    or not private.is_verified_governance_authority(run.authority_id) then
    raise exception using errcode = '55000', message = 'KPI_RUN_SCOPE_INVALID';
  end if;

  for scope in
    select distinct
      'municipality'::text as scope_type,
      assignment.local_body_id as scope_id,
      assignment.local_body_id,
      null::uuid as ward_id,
      null::uuid as authority_department_id,
      local_body.name as scope_name
    from complaints.complaint_assignments as assignment
    inner join governance.local_bodies as local_body on local_body.id = assignment.local_body_id
    where assignment.authority_id = run.authority_id
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
    union
    select distinct
      'ward'::text, assignment.ward_id, assignment.local_body_id,
      assignment.ward_id, null::uuid, ward.name
    from complaints.complaint_assignments as assignment
    inner join governance.wards as ward on ward.id = assignment.ward_id
    where assignment.authority_id = run.authority_id and assignment.ward_id is not null
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
    union
    select distinct
      'department'::text, assignment.authority_department_id, assignment.local_body_id,
      null::uuid, assignment.authority_department_id, department.name
    from complaints.complaint_assignments as assignment
    inner join governance.authority_departments as authority_department
      on authority_department.id = assignment.authority_department_id
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where assignment.authority_id = run.authority_id
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
  loop
    foreach segment in array array['all', 'external_dependency', 'no_external_dependency'] loop
      for definition in
        select stable.id as definition_id, stable.code, stable.unit,
          version.id as version_id, version.algorithm_version,
          version.implementation_hash
        from complaints.kpi_definitions as stable
        inner join complaints.kpi_definition_versions as version
          on version.definition_id = stable.id
        where version.effective_from <= run.source_cutoff_at
          and (version.effective_to is null or version.effective_to > run.source_cutoff_at)
          and version.version = (
            select max(candidate.version)
            from complaints.kpi_definition_versions as candidate
            where candidate.definition_id = stable.id
              and candidate.effective_from <= run.source_cutoff_at
              and (candidate.effective_to is null or candidate.effective_to > run.source_cutoff_at)
          )
        order by stable.code
      loop
        numerator_value := 0;
        denominator_value := 0;
        sample_value := 0;
        metric_value := null;

        if definition.code in ('acknowledgement_compliance', 'resolution_compliance') then
          select
            count(*) filter (
              where clock.completed_at is not null and clock.completed_at <= clock.target_at
            )::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_sla_clocks as clock
          where clock.milestone = case definition.code
              when 'acknowledgement_compliance' then 'acknowledgement' else 'resolution' end
            and clock.target_at >= run.window_started_at
            and clock.target_at < run.window_ended_at
            and clock.target_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              clock.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              clock.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'citizen_confirmed_resolution_rate' then
          select
            count(*) filter (where feedback.outcome = 'resolved')::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_feedback as feedback
          where feedback.created_at >= run.window_started_at
            and feedback.created_at < run.window_ended_at
            and feedback.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              feedback.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              feedback.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'reopen_rate' then
          select
            count(*) filter (where exists (
              select 1 from complaints.complaint_reopen_requests as reopen
              where reopen.resolution_id = resolution.id
                and reopen.requested_at <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_resolutions as resolution
          where resolution.created_at >= run.window_started_at
            and resolution.created_at < run.window_ended_at
            and resolution.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              resolution.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              resolution.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'misrouting_rate' then
          select
            count(*) filter (where exists (
              select 1 from complaints.complaint_assignments as correction
              where correction.complaint_id = complaint.id
                and correction.reason_code = 'routing_correction'
                and correction.effective_from <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaints as complaint
          where complaint.submitted_at >= run.window_started_at
            and complaint.submitted_at < run.window_ended_at
            and complaint.submitted_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              complaint.id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              complaint.id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'backlog' then
          select count(*)::bigint, count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaints as complaint
          where complaint.submitted_at <= run.source_cutoff_at
            and complaints.complaint_status_at(complaint.id, run.source_cutoff_at)
              not in ('resolved', 'closed', 'rejected', 'cancelled')
            and complaints.complaint_matches_kpi_scope(
              complaint.id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              complaint.id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'evidence_completeness' then
          select
            count(*) filter (where exists (
              select 1
              from complaints.complaint_resolution_evidence_links as link
              inner join complaints.complaint_resolution_evidence as evidence
                on evidence.id = link.evidence_id
              where link.resolution_id = resolution.id
                and evidence.upload_status = 'finalized'
                and evidence.finalized_at <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_resolutions as resolution
          where resolution.created_at >= run.window_started_at
            and resolution.created_at < run.window_ended_at
            and resolution.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              resolution.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              resolution.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'communication_quality' then
          select
            coalesce(sum(
              feedback.communication_rating - resolution_policy_version.rating_minimum
            ), 0)::bigint,
            coalesce(sum(
              resolution_policy_version.rating_maximum
                - resolution_policy_version.rating_minimum
            ), 0)::bigint,
            count(*)::bigint
          into numerator_value, denominator_value, sample_value
          from complaints.complaint_feedback as feedback
          inner join complaints.resolution_policy_versions as resolution_policy_version
            on resolution_policy_version.id = feedback.resolution_policy_version_id
          where feedback.communication_rating is not null
            and feedback.communication_rating between
              resolution_policy_version.rating_minimum
              and resolution_policy_version.rating_maximum
            and feedback.created_at >= run.window_started_at
            and feedback.created_at < run.window_ended_at
            and feedback.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              feedback.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              feedback.complaint_id, segment, run.source_cutoff_at
            );
        end if;

        if definition.code <> 'communication_quality' then
          sample_value := denominator_value;
        end if;
        metric_value := case
          when definition.code = 'backlog' then numerator_value::numeric
          when denominator_value > 0
            then round((numerator_value::numeric * 100) / denominator_value, 4)
          else null
        end;
        insert into complaints.kpi_snapshots (
          calculation_run_id, definition_version_id, scope_type, authority_id,
          local_body_id, ward_id, authority_department_id, segment,
          numerator, denominator, value, sample_size, exclusions
        ) values (
          run.id, definition.version_id, scope.scope_type, run.authority_id,
          scope.local_body_id, scope.ward_id, scope.authority_department_id, segment,
          numerator_value, denominator_value, metric_value, sample_value,
          jsonb_build_object(
            'sourceCutoffAt', run.source_cutoff_at,
            'algorithmVersion', definition.algorithm_version,
            'implementationHash', definition.implementation_hash
          )
        );
        inserted_count := inserted_count + 1;
      end loop;
    end loop;
  end loop;

  update complaints.kpi_calculation_runs as candidate
  set state = 'completed', worker_id = null, lease_token = null, lease_expires_at = null,
    calculated_at = operation_at, updated_at = operation_at
  where candidate.id = run.id;
  return query select inserted_count, false;
end;
$$;

create function public.fail_kpi_calculation_run(
  p_run_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run complaints.kpi_calculation_runs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_run_id is null or p_lease_token is null
    or p_error_code <> 'KPI_CALCULATION_FAILED' then
    raise exception using errcode = '22023', message = 'KPI_RUN_FAILURE_INVALID';
  end if;
  select candidate.* into run from complaints.kpi_calculation_runs as candidate
  where candidate.id = p_run_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'KPI_RUN_NOT_FOUND'; end if;
  if run.state <> 'processing' or run.lease_token is distinct from p_lease_token
    or run.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  if run.attempt_count >= 5 then
    update complaints.kpi_calculation_runs as candidate
    set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
      last_failure_code = p_error_code, updated_at = operation_at
    where candidate.id = run.id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;
  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, run.attempt_count - 1))::integer)
  );
  update complaints.kpi_calculation_runs as candidate
  set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
    next_attempt_at = retry_at, last_failure_code = p_error_code, updated_at = operation_at
  where candidate.id = run.id;
  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function public.get_government_complaint_sla(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  binding complaints.complaint_sla_bindings%rowtype;
  unavailable_reason text;
begin
  if p_actor_user_id is null or p_complaint_id is null then
    raise exception using errcode = '22023', message = 'ACCOUNTABILITY_REQUEST_INVALID';
  end if;
  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select assignment.id into assignment_id
  from complaints.complaint_assignments as assignment
  where assignment.complaint_id = p_complaint_id
    and assignment.status = 'active' and assignment.effective_to is null;
  if assignment_id is null or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment_id, 'view', p_scope_role_assignment_id, current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;
  select candidate.* into binding
  from complaints.complaint_sla_bindings as candidate
  where candidate.complaint_id = p_complaint_id
  order by candidate.cycle desc limit 1;
  unavailable_reason := case binding.status
    when 'not_configured' then binding.reason_code
    when 'ambiguous' then 'ambiguous_policy'
    when 'invalid_configuration' then 'invalid_configuration'
    when 'applied' then null
    else 'not_materialized'
  end;

  return query select jsonb_build_object(
    'complaintId', p_complaint_id,
    'policyApplied', coalesce(binding.status = 'applied', false),
    'unavailableReason', unavailable_reason,
    'clocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', clock.id,
        'milestone', clock.milestone,
        'cycle', clock.cycle,
        'state', clock.state,
        'policyCode', policy.code,
        'policyVersion', policy_version.version,
        'targetBusinessMinutes', clock.target_business_minutes,
        'startedAt', clock.started_at,
        'targetAt', clock.target_at,
        'completedAt', clock.completed_at,
        'breachedAt', clock.breached_at,
        'pausedAt', clock.paused_at,
        'externalDependencySegment', clock.external_dependency_segment
      ) order by clock.cycle, clock.milestone)
      from complaints.complaint_sla_clocks as clock
      inner join complaints.sla_policy_versions as policy_version
        on policy_version.id = clock.policy_version_id
      inner join complaints.sla_policies as policy on policy.id = policy_version.policy_id
      where clock.complaint_id = p_complaint_id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'clockId', event.clock_id,
        'milestone', event.milestone,
        'level', event.escalation_level,
        'action', event.action_type,
        'occurredAt', event.occurred_at,
        'resultingStatus', event.resulting_status
      ) order by event.occurred_at, event.id)
      from complaints.complaint_sla_escalation_events as event
      where event.complaint_id = p_complaint_id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.list_government_kpi_snapshots(
  p_actor_user_id uuid,
  p_authority_id uuid default null,
  p_scope_role_assignment_id uuid default null,
  p_scope_type text default null,
  p_scope_id uuid default null,
  p_segment text default null,
  p_metric_codes text[] default null
)
returns table (payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_authority_id uuid;
  authority_count integer;
  latest_run complaints.kpi_calculation_runs%rowtype;
begin
  if p_actor_user_id is null
    or (p_scope_type is null) <> (p_scope_id is null)
    or (p_scope_type is not null and p_scope_type not in ('municipality', 'ward', 'department'))
    or (p_segment is not null and p_segment not in (
      'all', 'external_dependency', 'no_external_dependency'
    ))
    or coalesce(cardinality(p_metric_codes), 0) > 20
    or exists (
      select 1 from unnest(coalesce(p_metric_codes, '{}'::text[])) as filter(code)
      where filter.code not in (
        'acknowledgement_compliance', 'resolution_compliance',
        'citizen_confirmed_resolution_rate', 'reopen_rate', 'misrouting_rate',
        'backlog', 'evidence_completeness', 'communication_quality'
      )
    ) then
    raise exception using errcode = '22023', message = 'ACCOUNTABILITY_REQUEST_INVALID';
  end if;

  if complaints.actor_is_platform_admin(p_actor_user_id, current_timestamp) then
    resolved_authority_id := p_authority_id;
    if resolved_authority_id is null then
      raise exception using errcode = '22023', message = 'KPI_AUTHORITY_REQUIRED';
    end if;
  else
    select
      (array_agg(distinct user_role.authority_id order by user_role.authority_id))[1],
      count(distinct user_role.authority_id)::integer
    into resolved_authority_id, authority_count
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join public.authority_memberships as membership
      on membership.user_id = user_role.user_id
     and membership.authority_id = user_role.authority_id
    where user_role.user_id = p_actor_user_id
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and (p_authority_id is null or user_role.authority_id = p_authority_id)
      and role.is_government
      and profile.status = 'active'
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (membership.effective_until is null or membership.effective_until > current_timestamp);
    if authority_count <> 1 then
      raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
    end if;
  end if;

  if not exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = p_actor_user_id
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and (
        (role.code = 'platform_admin' and user_role.scope_type = 'global')
        or user_role.authority_id = resolved_authority_id
      )
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select candidate.* into latest_run
  from complaints.kpi_calculation_runs as candidate
  where candidate.authority_id = resolved_authority_id and candidate.state = 'completed'
  order by candidate.source_cutoff_at desc, candidate.calculated_at desc, candidate.id desc
  limit 1;

  if latest_run.id is null then
    return query select jsonb_build_object(
      'runId', null, 'windowStartedAt', null, 'windowEndedAt', null,
      'sourceCutoffAt', null, 'calculatedAt', null, 'items', '[]'::jsonb
    );
    return;
  end if;

  return query select jsonb_build_object(
    'runId', latest_run.id,
    'windowStartedAt', latest_run.window_started_at,
    'windowEndedAt', latest_run.window_ended_at,
    'sourceCutoffAt', latest_run.source_cutoff_at,
    'calculatedAt', latest_run.calculated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', snapshot.id,
        'metricCode', definition.code,
        'metricName', definition.name,
        'unit', definition.unit,
        'definitionVersion', definition_version.version,
        'scopeType', snapshot.scope_type,
        'scopeId', case snapshot.scope_type
          when 'municipality' then snapshot.local_body_id
          when 'ward' then snapshot.ward_id
          else snapshot.authority_department_id end,
        'scopeName', case snapshot.scope_type
          when 'municipality' then local_body.name
          when 'ward' then ward.name
          else department.name end,
        'segment', snapshot.segment,
        'numerator', snapshot.numerator,
        'denominator', snapshot.denominator,
        'value', snapshot.value,
        'sampleSize', snapshot.sample_size
      ) order by snapshot.scope_type, snapshot.segment, definition.code, snapshot.id)
      from complaints.kpi_snapshots as snapshot
      inner join complaints.kpi_definition_versions as definition_version
        on definition_version.id = snapshot.definition_version_id
      inner join complaints.kpi_definitions as definition
        on definition.id = definition_version.definition_id
      inner join governance.local_bodies as local_body on local_body.id = snapshot.local_body_id
      left join governance.wards as ward on ward.id = snapshot.ward_id
      left join governance.authority_departments as authority_department
        on authority_department.id = snapshot.authority_department_id
      left join governance.departments as department
        on department.id = authority_department.department_id
      where snapshot.calculation_run_id = latest_run.id
        and (p_scope_type is null or snapshot.scope_type = p_scope_type)
        and (
          p_scope_id is null
          or (p_scope_type = 'municipality' and snapshot.local_body_id = p_scope_id)
          or (p_scope_type = 'ward' and snapshot.ward_id = p_scope_id)
          or (
            p_scope_type = 'department'
            and snapshot.authority_department_id = p_scope_id
          )
        )
        and (p_segment is null or snapshot.segment = p_segment)
        and (p_metric_codes is null or definition.code = any(p_metric_codes))
        and exists (
          select 1
          from public.user_roles as user_role
          inner join public.roles as role on role.id = user_role.role_id
          where user_role.user_id = p_actor_user_id
            and user_role.status = 'active'
            and user_role.effective_from <= current_timestamp
            and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
            and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
            and (
              (role.code = 'platform_admin' and user_role.scope_type = 'global')
              or (
                user_role.authority_id = snapshot.authority_id
                and (
                  user_role.scope_type = 'authority'
                  or (user_role.scope_type = 'ward' and user_role.scope_id = snapshot.ward_id)
                  or (
                    user_role.scope_type = 'department'
                    and user_role.scope_id = snapshot.authority_department_id
                  )
                )
              )
            )
        )
    ), '[]'::jsonb)
  );
end;
$$;

alter table complaints.sla_calendars enable row level security;
alter table complaints.sla_calendars force row level security;
alter table complaints.sla_calendar_versions enable row level security;
alter table complaints.sla_calendar_versions force row level security;
alter table complaints.sla_calendar_working_periods enable row level security;
alter table complaints.sla_calendar_working_periods force row level security;
alter table complaints.sla_calendar_exceptions enable row level security;
alter table complaints.sla_calendar_exceptions force row level security;
alter table complaints.sla_policies enable row level security;
alter table complaints.sla_policies force row level security;
alter table complaints.sla_policy_versions enable row level security;
alter table complaints.sla_policy_versions force row level security;
alter table complaints.sla_category_overrides enable row level security;
alter table complaints.sla_category_overrides force row level security;
alter table complaints.sla_escalation_rules enable row level security;
alter table complaints.sla_escalation_rules force row level security;
alter table complaints.sla_escalation_rule_versions enable row level security;
alter table complaints.sla_escalation_rule_versions force row level security;
alter table complaints.complaint_sla_bindings enable row level security;
alter table complaints.complaint_sla_bindings force row level security;
alter table complaints.complaint_sla_clocks enable row level security;
alter table complaints.complaint_sla_clocks force row level security;
alter table complaints.complaint_sla_pause_intervals enable row level security;
alter table complaints.complaint_sla_pause_intervals force row level security;
alter table complaints.complaint_sla_deadline_history enable row level security;
alter table complaints.complaint_sla_deadline_history force row level security;
alter table complaints.sla_escalation_jobs enable row level security;
alter table complaints.sla_escalation_jobs force row level security;
alter table complaints.complaint_sla_escalation_events enable row level security;
alter table complaints.complaint_sla_escalation_events force row level security;
alter table complaints.kpi_definitions enable row level security;
alter table complaints.kpi_definitions force row level security;
alter table complaints.kpi_definition_versions enable row level security;
alter table complaints.kpi_definition_versions force row level security;
alter table complaints.kpi_calculation_runs enable row level security;
alter table complaints.kpi_calculation_runs force row level security;
alter table complaints.kpi_snapshots enable row level security;
alter table complaints.kpi_snapshots force row level security;

revoke all on all tables in schema complaints from anon, authenticated, service_role;

revoke all on function public.publish_sla_calendar_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_sla_policy_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_sla_escalation_rule_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.claim_sla_escalation_jobs(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.execute_sla_escalation_job(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_sla_escalation_job(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.enqueue_kpi_calculation_run(
  uuid, uuid, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.schedule_kpi_calculation_runs(
  timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.claim_kpi_calculation_runs(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.materialize_kpi_calculation_run(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_kpi_calculation_run(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_government_complaint_sla(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) from public, anon, authenticated;

grant execute on function public.publish_sla_calendar_version(uuid, uuid) to service_role;
grant execute on function public.publish_sla_policy_version(uuid, uuid) to service_role;
grant execute on function public.publish_sla_escalation_rule_version(uuid, uuid)
  to service_role;
grant execute on function public.claim_sla_escalation_jobs(text, integer, integer)
  to service_role;
grant execute on function public.execute_sla_escalation_job(uuid, uuid) to service_role;
grant execute on function public.fail_sla_escalation_job(uuid, uuid, text) to service_role;
grant execute on function public.enqueue_kpi_calculation_run(
  uuid, uuid, timestamptz, timestamptz, timestamptz
) to service_role;
grant execute on function public.schedule_kpi_calculation_runs(
  timestamptz, timestamptz, timestamptz
) to service_role;
grant execute on function public.claim_kpi_calculation_runs(text, integer, integer)
  to service_role;
grant execute on function public.materialize_kpi_calculation_run(uuid, uuid) to service_role;
grant execute on function public.fail_kpi_calculation_run(uuid, uuid, text) to service_role;
grant execute on function public.get_government_complaint_sla(uuid, uuid, uuid)
  to service_role;
grant execute on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) to service_role;

revoke execute on function complaints.actor_is_platform_admin(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.reject_sla_append_only_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_reviewed_version_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_draft_child_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_calendar_configuration(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.add_sla_business_minutes(uuid, timestamptz, integer)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.sla_business_minutes_between(
  uuid, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.initialize_complaint_sla(
  uuid, uuid, timestamptz, integer
) from public, anon, authenticated, service_role;
revoke execute on function complaints.initialize_initial_complaint_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.resume_sla_clock(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.apply_status_event_to_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.apply_external_dependency_to_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.current_sla_escalation_job_id()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_matches_kpi_segment(
  uuid, text, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_matches_kpi_scope(
  uuid, uuid, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_status_at(uuid, timestamptz)
  from public, anon, authenticated, service_role;

comment on function public.get_government_complaint_sla(uuid, uuid, uuid) is
  'Returns access-scoped SLA clocks, fail-closed policy availability, and automatic escalation evidence.';
comment on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) is
  'Returns only access-scoped immutable organizational KPI snapshots; no public or individual-officer output.';
$migration_20260716111000_phase_9_sla_escalation_kpi_security_and_rpc$;

  if not (pg_temp.local_wellness_function_exists('public', 'get_government_complaint_sla')
      and pg_temp.local_wellness_function_exists('public', 'list_government_kpi_snapshots')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'complaint_assignments_initialize_sla')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_status_history', 'complaint_status_history_apply_sla')
      and pg_temp.local_wellness_forced_rls('complaints.kpi_snapshots')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 34,
    cutoff_name = '20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql'
  where singleton;

  raise notice 'Applied migration 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql';
end;
$guard_34$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716112000_phase_10_api_hardening.sql
-- ============================================================================
do $guard_35$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 35 then
    raise notice 'Skipping already-complete migration 20260716112000_phase_10_api_hardening.sql';
    return;
  end if;

  if current_cutoff <> 34 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716112000_phase_10_api_hardening.sql';
  end if;

  execute $migration_20260716112000_phase_10_api_hardening$
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
$migration_20260716112000_phase_10_api_hardening$;

  if not (pg_temp.local_wellness_relation_exists('private.api_rate_limit_windows')
      and pg_temp.local_wellness_function_exists('public', 'consume_api_rate_limit')
      and pg_temp.local_wellness_function_exists('public', 'api_readiness_check')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716112000_phase_10_api_hardening.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 35,
    cutoff_name = '20260716112000_phase_10_api_hardening.sql'
  where singleton;

  raise notice 'Applied migration 20260716112000_phase_10_api_hardening.sql';
end;
$guard_35$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716112000_phase_10_api_hardening.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716113000_phase_10_privileged_mfa.sql
-- ============================================================================
do $guard_36$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 36 then
    raise notice 'Skipping already-complete migration 20260716113000_phase_10_privileged_mfa.sql';
    return;
  end if;

  if current_cutoff <> 35 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716113000_phase_10_privileged_mfa.sql';
  end if;

  execute $migration_20260716113000_phase_10_privileged_mfa$
create function private.jwt_has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

revoke all on function private.jwt_has_aal2() from public;
grant execute on function private.jwt_has_aal2() to authenticated, service_role;

comment on function private.jwt_has_aal2() is
  'Returns true only for a verified authenticated JWT carrying Supabase Auth AAL2.';

create or replace function private.has_active_role(
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
  select
    private.jwt_has_aal2()
    and private.user_has_active_role(
      (select auth.uid()),
      required_role_code,
      required_scope_type,
      required_scope_id
    );
$$;

create or replace function private.can_manage_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.jwt_has_aal2()
    and private.user_can_manage_authority(
      (select auth.uid()),
      target_authority_id
    );
$$;

comment on function private.has_active_role(text, text, uuid) is
  'AAL2-gated current-session role check used by privileged direct RLS policies.';
comment on function private.can_manage_authority(uuid) is
  'AAL2-gated current-session authority-management check used by privileged direct RLS policies.';

create function public.user_requires_privileged_mfa(
  p_user_id uuid,
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
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = p_user_id
      and profile.status = 'active'
      and (role.is_government or role.is_privileged)
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and (
        user_role.scope_type = 'global'
        or exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= p_at
            and (membership.effective_until is null or membership.effective_until > p_at)
        )
      )
  );
$$;

revoke all on function public.user_requires_privileged_mfa(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.user_requires_privileged_mfa(uuid, timestamptz)
  to service_role;

comment on function public.user_requires_privileged_mfa(uuid, timestamptz) is
  'Service-only decision for whether current government or privileged access requires AAL2.';
$migration_20260716113000_phase_10_privileged_mfa$;

  if not (pg_temp.local_wellness_function_exists('private', 'jwt_has_aal2')
      and pg_temp.local_wellness_function_exists('public', 'user_requires_privileged_mfa')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716113000_phase_10_privileged_mfa.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 36,
    cutoff_name = '20260716113000_phase_10_privileged_mfa.sql'
  where singleton;

  raise notice 'Applied migration 20260716113000_phase_10_privileged_mfa.sql';
end;
$guard_36$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716113000_phase_10_privileged_mfa.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716114000_phase_10_citizen_phone_mfa.sql
-- ============================================================================
do $guard_37$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 37 then
    raise notice 'Skipping already-complete migration 20260716114000_phase_10_citizen_phone_mfa.sql';
    return;
  end if;

  if current_cutoff <> 36 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716114000_phase_10_citizen_phone_mfa.sql';
  end if;

  execute $migration_20260716114000_phase_10_citizen_phone_mfa$
create function public.user_has_verified_phone_mfa(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.mfa_factors as factor
    where factor.user_id = p_user_id
      and factor.factor_type::text = 'phone'
      and factor.status::text = 'verified'
  );
$$;

revoke all on function public.user_has_verified_phone_mfa(uuid)
  from public, anon, authenticated;
grant execute on function public.user_has_verified_phone_mfa(uuid)
  to service_role;

comment on function public.user_has_verified_phone_mfa(uuid) is
  'Service-only phone-factor check used to enforce citizen phone verification without exposing factor details.';
$migration_20260716114000_phase_10_citizen_phone_mfa$;

  if not (pg_temp.local_wellness_function_exists('public', 'user_has_verified_phone_mfa')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716114000_phase_10_citizen_phone_mfa.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 37,
    cutoff_name = '20260716114000_phase_10_citizen_phone_mfa.sql'
  where singleton;

  raise notice 'Applied migration 20260716114000_phase_10_citizen_phone_mfa.sql';
end;
$guard_37$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716114000_phase_10_citizen_phone_mfa.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716115000_phase_10_profile_images.sql
-- ============================================================================
do $guard_38$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 38 then
    raise notice 'Skipping already-complete migration 20260716115000_phase_10_profile_images.sql';
    return;
  end if;

  if current_cutoff <> 37 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260716115000_phase_10_profile_images.sql';
  end if;

  execute $migration_20260716115000_phase_10_profile_images$
alter table public.profiles
  add column avatar_object_path text,
  add column avatar_updated_at timestamptz,
  add constraint profiles_avatar_object_path_check check (
    avatar_object_path is null
    or avatar_object_path ~ (
      '^' || id::text || '/avatar\.(jpe?g|png|webp)$'
    )
  ),
  add constraint profiles_avatar_timestamp_check check (
    (avatar_object_path is null and avatar_updated_at is null)
    or (avatar_object_path is not null and avatar_updated_at is not null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images-private',
  'profile-images-private',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.set_profile_avatar_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.avatar_updated_at := case
    when new.avatar_object_path is null then null
    else clock_timestamp()
  end;

  return new;
end;
$$;

create function private.reject_profile_avatar_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'PROFILE_AVATAR_VERSION_SERVER_OWNED';
end;
$$;

create trigger profiles_set_avatar_version
before update of avatar_object_path on public.profiles
for each row
execute function private.set_profile_avatar_version();

create trigger profiles_reject_avatar_version_update
before update of avatar_updated_at on public.profiles
for each row
execute function private.reject_profile_avatar_version_update();

create policy profile_images_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
)
with check (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create or replace function public.api_readiness_check()
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
      select count(*) = 5
      from storage.buckets as bucket
      where bucket.id in (
        'complaint-originals-private',
        'governance-raw-snapshots',
        'profile-images-private',
        'resolution-evidence-private',
        'voice-recordings-private'
      )
        and bucket.public = false
    );
$$;

revoke all on function private.set_profile_avatar_version() from public;
revoke all on function private.reject_profile_avatar_version_update() from public;
revoke all on function public.api_readiness_check() from public, anon, authenticated;
grant execute on function public.api_readiness_check() to service_role;

comment on column public.profiles.avatar_object_path is
  'Owner-private Supabase Storage path for the current profile image; never exposed in public complaint projections.';
comment on column public.profiles.avatar_updated_at is
  'Server-maintained cache/version timestamp for the current private profile image.';
comment on function private.set_profile_avatar_version() is
  'Versions private profile-image metadata without trusting a client-supplied timestamp.';
comment on function private.reject_profile_avatar_version_update() is
  'Rejects direct changes to the server-owned private profile-image version timestamp.';
$migration_20260716115000_phase_10_profile_images$;

  if not (pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_object_path')
      and pg_temp.local_wellness_column_exists('public', 'profiles', 'avatar_updated_at')
      and pg_temp.local_wellness_function_exists('private', 'set_profile_avatar_version')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_select_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_insert_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_update_own')
      and pg_temp.local_wellness_policy_exists('storage', 'objects', 'profile_images_delete_own')
      and pg_temp.local_wellness_private_bucket_exists('profile-images-private')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716115000_phase_10_profile_images.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 38,
    cutoff_name = '20260716115000_phase_10_profile_images.sql'
  where singleton;

  raise notice 'Applied migration 20260716115000_phase_10_profile_images.sql';
end;
$guard_38$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260716115000_phase_10_profile_images.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260716116000_phase_10_complaint_location_proximity.sql
-- ============================================================================
do $guard_39$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
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

  if not (pg_temp.local_wellness_function_exists('complaints', 'enforce_v1_location_proximity')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check')
      and pg_temp.local_wellness_constraint_exists('routing', 'issue_categories', 'issue_categories_v1_media_proximity_check')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_location_evidence', 'complaint_location_evidence_enforce_v1_proximity')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716116000_phase_10_complaint_location_proximity.sql';
  end if;

  update local_wellness_bundle_state
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
  from local_wellness_bundle_state as state
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

  if not (pg_temp.local_wellness_function_exists('governance', 'resolve_complaint_contact_readiness')
      and pg_temp.local_wellness_function_exists('complaints', 'assignment_delivery_readiness')
      and pg_temp.local_wellness_function_exists('complaints', 'assignment_summary')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716117000_phase_10_routing_delivery_readiness.sql';
  end if;

  update local_wellness_bundle_state
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
  from local_wellness_bundle_state as state
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
      and pg_temp.local_wellness_function_exists('governance', 'validate_ward_zone_membership_version')
      and pg_temp.local_wellness_function_exists('governance', 'validate_ward_boundary_crosswalk_version')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_administrative_zone_membership_versions', 'ward_zone_membership_versions_validate')
      and pg_temp.local_wellness_trigger_exists('governance', 'ward_boundary_crosswalk_versions', 'ward_boundary_crosswalk_versions_validate')
      and pg_temp.local_wellness_forced_rls('governance.ward_administrative_zone_membership_versions')
      and pg_temp.local_wellness_forced_rls('governance.ward_boundary_crosswalk_versions')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716118000_bmc_ward_relationship_versions.sql';
  end if;

  update local_wellness_bundle_state
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
  from local_wellness_bundle_state as state
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

  if not (pg_temp.local_wellness_function_exists('public', 'list_government_invitation_options')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260716119000_government_invitation_scope_options.sql';
  end if;

  update local_wellness_bundle_state
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
  from local_wellness_bundle_state as state
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
      and pg_temp.local_wellness_function_exists('complaints', 'public_complaint_support_count')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_feed')
      and pg_temp.local_wellness_function_exists('public', 'list_public_complaint_engagements')
      and pg_temp.local_wellness_function_exists('public', 'set_public_complaint_engagement')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260717100000_public_complaint_engagements.sql';
  end if;

  update local_wellness_bundle_state
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

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260718100000_complaint_routing_evidence_diagnostics.sql
-- ============================================================================
do $guard_44$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 44 then
    raise notice 'Skipping already-complete migration 20260718100000_complaint_routing_evidence_diagnostics.sql';
    return;
  end if;

  if current_cutoff <> 43 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260718100000_complaint_routing_evidence_diagnostics.sql';
  end if;

  execute $migration_20260718100000_complaint_routing_evidence_diagnostics$
create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_equals(decision.input_location, evidence.location) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is distinct from evidence.accuracy_meters then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is distinct from evidence.captured_at then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

comment on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid) is
  'Internal exact comparison of a claimed complaint draft location and its recorded routing decision. Empty results defer prerequisite validation to the canonical completion implementation.';

create or replace function complaints.complete_complaint_submission_v2(
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
  routing_evidence_mismatches text[];
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

  routing_evidence_mismatches := complaints.complaint_routing_evidence_mismatches(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id
  );

  if cardinality(routing_evidence_mismatches) > 0 then
    raise exception using
      errcode = '23514',
      message = routing_evidence_mismatches[1],
      detail = array_to_string(routing_evidence_mismatches, ',');
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id
    and route.actor_user_id = p_actor_user_id
    and route.request_id = request.routing_request_id
  for share;

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

revoke all on function complaints.complete_complaint_submission_v2(
  uuid, uuid, uuid, uuid[], boolean
) from public, anon, authenticated, service_role;

comment on function complaints.complete_complaint_submission_v2(
  uuid, uuid, uuid, uuid[], boolean
) is
  'Internal canonical Phase 4 complaint completion implementation with validation-ordered granular routing-evidence checks; direct execution is denied.';

create or replace function public.submit_complaint(
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
  from complaints.complete_complaint_submission_v2(
    p_actor_user_id,
    p_submission_request_id,
    p_routing_decision_id,
    p_acknowledged_duplicate_suggestion_ids,
    p_emergency_disclaimer_acknowledged
  ) as implementation;
end;
$$;

revoke all on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;
grant execute on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean)
  to service_role;

comment on function public.submit_complaint(uuid, uuid, uuid, uuid[], boolean) is
  'Service-only atomic complaint submission wrapper with completed-request replay and canonical forward-repair delegation.';
$migration_20260718100000_complaint_routing_evidence_diagnostics$;

  if not (pg_temp.local_wellness_function_exists('complaints', 'complaint_routing_evidence_mismatches')
      and pg_temp.local_wellness_function_exists('complaints', 'complete_complaint_submission_v2')
      and pg_temp.local_wellness_procedure_exists('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)')
      and pg_catalog.position('complaints.complete_complaint_submission_v2(' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'))) > 0
      and pg_temp.local_wellness_function_execute_privilege('service_role', 'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260718100000_complaint_routing_evidence_diagnostics.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 44,
    cutoff_name = '20260718100000_complaint_routing_evidence_diagnostics.sql'
  where singleton;

  raise notice 'Applied migration 20260718100000_complaint_routing_evidence_diagnostics.sql';
end;
$guard_44$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260718100000_complaint_routing_evidence_diagnostics.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260718110000_governance_source_bundle_imports.sql
-- ============================================================================
do $guard_45$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 45 then
    raise notice 'Skipping already-complete migration 20260718110000_governance_source_bundle_imports.sql';
    return;
  end if;

  if current_cutoff <> 44 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260718110000_governance_source_bundle_imports.sql';
  end if;

  execute $migration_20260718110000_governance_source_bundle_imports$
alter table governance.import_batches
  add column source_bundle_sha256 text;

alter table governance.import_batches
  alter column workbook_sha256 drop not null;

alter table governance.import_batches
  add constraint import_batches_source_bundle_sha256_check check (
    source_bundle_sha256 is null
    or source_bundle_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add constraint import_batches_source_artifact_check check (
    workbook_sha256 is not null or source_bundle_sha256 is not null
  );

comment on column governance.import_batches.workbook_sha256 is
  'SHA-256 of the exact human-reference workbook bytes for workbook-backed imports; null for source-bundle-only imports.';

comment on column governance.import_batches.source_bundle_sha256 is
  'SHA-256 of the exact immutable source-bundle archive bytes, including ZIP research or bootstrap bundles; null for workbook-only imports.';

comment on constraint import_batches_source_artifact_check
  on governance.import_batches is
  'Every import batch must pin at least one exact source artifact: a workbook, a source bundle, or both.';
$migration_20260718110000_governance_source_bundle_imports$;

  if not (pg_temp.local_wellness_column_exists('governance', 'import_batches', 'source_bundle_sha256')
      and pg_temp.local_wellness_constraint_exists('governance', 'import_batches', 'import_batches_source_bundle_sha256_check')
      and pg_temp.local_wellness_constraint_exists('governance', 'import_batches', 'import_batches_source_artifact_check')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260718110000_governance_source_bundle_imports.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 45,
    cutoff_name = '20260718110000_governance_source_bundle_imports.sql'
  where singleton;

  raise notice 'Applied migration 20260718110000_governance_source_bundle_imports.sql';
end;
$guard_45$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260718110000_governance_source_bundle_imports.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260718123000_relax_routing_evidence_precision.sql
-- ============================================================================
do $guard_46$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 46 then
    raise notice 'Skipping already-complete migration 20260718123000_relax_routing_evidence_precision.sql';
    return;
  end if;

  if current_cutoff <> 45 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260718123000_relax_routing_evidence_precision.sql';
  end if;

  execute $migration_20260718123000_relax_routing_evidence_precision$
-- Preserve routing safety while avoiding false mismatches caused by client/DB
-- timestamp precision and GPS serialization differences.
create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_dwithin(
    decision.input_location::extensions.geography,
    evidence.location::extensions.geography,
    2.0
  ) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is null
    or evidence.accuracy_meters is null
    or abs(decision.accuracy_meters - evidence.accuracy_meters) > 0.5 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is null
    or evidence.captured_at is null
    or abs(extract(epoch from (decision.captured_at - evidence.captured_at))) > 2 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

$migration_20260718123000_relax_routing_evidence_precision$;

  if not (pg_catalog.position('extensions.st_dwithin(' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0
      and pg_catalog.position('COMPLAINT_ROUTING_ACCURACY_MISMATCH' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0
      and pg_catalog.position('COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH' in pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'))) > 0) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260718123000_relax_routing_evidence_precision.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 46,
    cutoff_name = '20260718123000_relax_routing_evidence_precision.sql'
  where singleton;

  raise notice 'Applied migration 20260718123000_relax_routing_evidence_precision.sql';
end;
$guard_46$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260718123000_relax_routing_evidence_precision.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260720100000_v1_simple_ward_routing.sql
-- ============================================================================
do $guard_47$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 47 then
    raise notice 'Skipping already-complete migration 20260720100000_v1_simple_ward_routing.sql';
    return;
  end if;

  if current_cutoff <> 46 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260720100000_v1_simple_ward_routing.sql';
  end if;

  execute $migration_20260720100000_v1_simple_ward_routing$
-- V1 keeps the durable complaint ledger while reducing the operational routing
-- path to: captured location -> configured ward -> configured ward recipient.
-- Recipient contact values remain private and are never returned to citizen clients.

create table if not exists routing.ward_issue_contacts (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references governance.wards (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  recipient_email text not null,
  primary_contact text not null,
  secondary_contact text,
  central_fallback text not null,
  whatsapp_contact text not null,
  durable_role text not null,
  usage_note text not null,
  source_as_of date not null,
  last_checked_on date not null,
  ward_source_url text not null,
  issue_source_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_issue_contacts_recipient_email_check check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  constraint ward_issue_contacts_primary_contact_check check (
    primary_contact = btrim(primary_contact)
    and char_length(primary_contact) between 1 and 500
  ),
  constraint ward_issue_contacts_secondary_contact_check check (
    secondary_contact is null
    or (
      secondary_contact = btrim(secondary_contact)
      and char_length(secondary_contact) between 1 and 500
    )
  ),
  constraint ward_issue_contacts_central_fallback_check check (
    central_fallback = btrim(central_fallback)
    and char_length(central_fallback) between 1 and 500
  ),
  constraint ward_issue_contacts_whatsapp_check check (
    whatsapp_contact = btrim(whatsapp_contact)
    and char_length(whatsapp_contact) between 1 and 120
  ),
  constraint ward_issue_contacts_role_check check (
    durable_role = btrim(durable_role)
    and char_length(durable_role) between 1 and 240
  ),
  constraint ward_issue_contacts_usage_note_check check (
    usage_note = btrim(usage_note)
    and char_length(usage_note) between 1 and 2000
  ),
  constraint ward_issue_contacts_source_dates_check check (
    source_as_of <= last_checked_on
  ),
  constraint ward_issue_contacts_source_urls_check check (
    ward_source_url = btrim(ward_source_url)
    and issue_source_url = btrim(issue_source_url)
    and ward_source_url ~ '^https://'
    and issue_source_url ~ '^https://'
  ),
  constraint ward_issue_contacts_ward_category_unique unique (ward_id, category_id)
);

create table if not exists complaints.ward_email_outbox (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  ward_id uuid not null references governance.wards (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  recipient_email text not null,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error_code text,
  provider_message_id text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_email_outbox_recipient_check check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  constraint ward_email_outbox_state_check check (
    state in ('pending', 'processing', 'retry', 'sent', 'dead')
  ),
  constraint ward_email_outbox_attempt_count_check check (attempt_count >= 0),
  constraint ward_email_outbox_lease_shape_check check (
    (state = 'processing' and lease_owner is not null and lease_expires_at is not null)
    or (state <> 'processing' and lease_owner is null and lease_expires_at is null)
  ),
  constraint ward_email_outbox_sent_shape_check check (
    (state = 'sent' and sent_at is not null)
    or (state <> 'sent' and sent_at is null)
  ),
  constraint ward_email_outbox_error_check check (
    last_error_code is null
    or (
      last_error_code = btrim(last_error_code)
      and last_error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
    )
  ),
  constraint ward_email_outbox_provider_id_check check (
    provider_message_id is null
    or (
      provider_message_id = btrim(provider_message_id)
      and char_length(provider_message_id) between 1 and 500
    )
  ),
  constraint ward_email_outbox_complaint_recipient_unique unique (
    complaint_id,
    ward_id,
    recipient_email
  )
);

create index if not exists ward_issue_contacts_category_ward_active_idx
  on routing.ward_issue_contacts (category_id, ward_id)
  where is_active;

create index if not exists ward_email_outbox_ready_idx
  on complaints.ward_email_outbox (available_at, queued_at, id)
  where state in ('pending', 'retry');

create index if not exists ward_email_outbox_expired_lease_idx
  on complaints.ward_email_outbox (lease_expires_at, id)
  where state = 'processing';

drop trigger if exists set_ward_issue_contacts_updated_at
  on routing.ward_issue_contacts;
create trigger set_ward_issue_contacts_updated_at
before update on routing.ward_issue_contacts
for each row execute function private.set_updated_at();

drop trigger if exists set_ward_email_outbox_updated_at
  on complaints.ward_email_outbox;
create trigger set_ward_email_outbox_updated_at
before update on complaints.ward_email_outbox
for each row execute function private.set_updated_at();

alter table routing.ward_issue_contacts enable row level security;
alter table routing.ward_issue_contacts force row level security;
alter table complaints.ward_email_outbox enable row level security;
alter table complaints.ward_email_outbox force row level security;

revoke all on table routing.ward_issue_contacts from public, anon, authenticated;
revoke all on table complaints.ward_email_outbox from public, anon, authenticated;
grant all on table routing.ward_issue_contacts to service_role;
grant all on table complaints.ward_email_outbox to service_role;

create or replace function public.resolve_v1_ward_route(
  p_actor_user_id uuid,
  p_request_id text,
  p_category_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz,
  p_resolved_at timestamptz,
  p_asset_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  point extensions.geometry(Point, 4326);
  selected record;
  decision_id uuid;
  explanation_metadata jsonb;
begin
  if p_actor_user_id is null
    or p_category_id is null
    or p_captured_at is null
    or p_resolved_at is null then
    raise exception using errcode = '22023', message = 'V1_WARD_ROUTE_INPUT_INVALID';
  end if;

  if not exists (
    select 1
    from routing.issue_categories as category
    where category.id = p_category_id
      and category.status = 'active'
      and category.is_routing_eligible
  ) then
    raise exception using errcode = '22023', message = 'V1_WARD_ROUTE_CATEGORY_UNAVAILABLE';
  end if;

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

  point := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),
    4326
  )::extensions.geometry(Point, 4326);

  with matching_boundaries as (
    select
      contact.id as contact_id,
      boundary.id as ward_boundary_version_id,
      0 as match_rank
    from routing.ward_issue_contacts as contact
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.ward_id = contact.ward_id
    where contact.category_id = p_category_id
      and contact.is_active
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
      and (
        extensions.st_covers(boundary.boundary, point)
        or extensions.st_dwithin(
          boundary.boundary::extensions.geography,
          point::extensions.geography,
          greatest(p_accuracy_meters, 1.0)
        )
      )
    union all
    select
      contact.id,
      boundary.id,
      case crosswalk.relationship_type
        when 'one_to_one' then 1
        else 2
      end
    from routing.ward_issue_contacts as contact
    inner join governance.ward_boundary_crosswalk_versions as crosswalk
      on crosswalk.operational_ward_id = contact.ward_id
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.id = crosswalk.official_boundary_version_id
    where contact.category_id = p_category_id
      and contact.is_active
      and crosswalk.status = 'active'
      and crosswalk.effective_from <= p_resolved_at
      and (crosswalk.effective_to is null or crosswalk.effective_to > p_resolved_at)
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
      and (
        extensions.st_covers(boundary.boundary, point)
        or extensions.st_dwithin(
          boundary.boundary::extensions.geography,
          point::extensions.geography,
          greatest(p_accuracy_meters, 1.0)
        )
      )
  ), ranked_boundaries as (
    select
      match.contact_id,
      match.ward_boundary_version_id,
      min(match.match_rank) as match_rank
    from matching_boundaries as match
    group by match.contact_id, match.ward_boundary_version_id
  )
  select
    contact.id as contact_id,
    contact.ward_id,
    ward.ward_number,
    ward.local_body_id,
    local_body.state_id,
    local_body.authority_id,
    ranked.ward_boundary_version_id,
    local_body_boundary.id as local_body_boundary_version_id,
    rule.id as route_rule_id,
    rule_version.id as route_rule_version_id,
    rule_version.target_authority_id,
    rule_version.target_department_id as department_id,
    authority_department.id as authority_department_id,
    rule_version.target_officer_role_id as officer_role_id,
    rule_version.confidence_policy_version_id,
    confidence_version.confidence_policy_id,
    confidence_version.version as confidence_policy_version
  into selected
  from ranked_boundaries as ranked
  inner join routing.ward_issue_contacts as contact on contact.id = ranked.contact_id
  inner join governance.wards as ward on ward.id = contact.ward_id
  inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
  inner join lateral (
    select boundary.id
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.local_body_id = local_body.id
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
    order by boundary.version desc, boundary.id
    limit 1
  ) as local_body_boundary on true
  inner join routing.route_rules as rule
    on rule.category_id = contact.category_id
   and rule.rule_code = 'V1_WARD_' || upper((
     select category.code from routing.issue_categories as category
     where category.id = contact.category_id
   ))
   and rule.status = 'active'
  inner join routing.route_rule_versions as rule_version
   on rule_version.route_rule_id = rule.id
   and rule_version.scope_local_body_id = ward.local_body_id
   and rule_version.status = 'active'
   and rule_version.effective_from <= p_resolved_at
   and (rule_version.effective_to is null or rule_version.effective_to > p_resolved_at)
  inner join governance.authority_departments as authority_department
    on authority_department.authority_id = rule_version.target_authority_id
   and authority_department.department_id = rule_version.target_department_id
   and authority_department.status = 'active'
  inner join routing.confidence_policy_versions as confidence_version
    on confidence_version.id = rule_version.confidence_policy_version_id
  order by ranked.match_rank, ward.ward_number, ward.id, ranked.ward_boundary_version_id
  limit 1;

  if not found then
    explanation_metadata := jsonb_build_object(
      'policyId', null,
      'policyVersionId', null,
      'policyVersion', null,
      'requestedAssetId', p_asset_id,
      'confidenceBand', 'none',
      'confidenceFactors', jsonb_build_array(),
      'jurisdiction', jsonb_build_object(
        'status', 'unsupported',
        'matches', jsonb_build_array(),
        'reason', 'No configured V1 ward recipient covers this location and category.'
      ),
      'selectedCandidateId', null,
      'selectedRoutingRuleId', null,
      'selectedRoutingRuleVersionId', null,
      'fallbackUsed', false,
      'fallbackPath', jsonb_build_array(),
      'ambiguousCandidateIds', jsonb_build_array(),
      'candidateEvaluations', jsonb_build_array()
    );

    return public.record_routing_decision(
      p_actor_user_id => p_actor_user_id,
      p_request_id => p_request_id,
      p_longitude => p_longitude,
      p_latitude => p_latitude,
      p_accuracy_meters => p_accuracy_meters,
      p_captured_at => p_captured_at,
      p_resolved_at => p_resolved_at,
      p_category_id => p_category_id,
      p_decision_status => 'unsupported_area',
      p_explanation_codes => array['v1_ward_route_unavailable']::text[],
      p_explanation_metadata => explanation_metadata
    );
  end if;

  explanation_metadata := jsonb_build_object(
    'policyId', selected.confidence_policy_id,
    'policyVersionId', selected.confidence_policy_version_id,
    'policyVersion', selected.confidence_policy_version,
    'requestedAssetId', p_asset_id,
    'confidenceBand', 'high',
    'confidenceFactors', jsonb_build_array(
      jsonb_build_object(
        'code', 'jurisdiction', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The captured location intersects a configured ward boundary.'
      ),
      jsonb_build_object(
        'code', 'category', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The complaint category has an active ward contact.'
      ),
      jsonb_build_object(
        'code', 'department', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The route targets the configured municipal intake department.'
      ),
      jsonb_build_object(
        'code', 'role', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The route targets the configured durable intake role.'
      )
    ),
    'jurisdiction', jsonb_build_object(
      'status', 'resolved',
      'matches', jsonb_build_array(jsonb_build_object(
        'stateId', selected.state_id,
        'districtId', null,
        'talukaId', null,
        'localBodyId', selected.local_body_id,
        'wardId', selected.ward_id,
        'stateBoundaryVersionId', null,
        'districtBoundaryVersionId', null,
        'talukaBoundaryVersionId', null,
        'localBodyBoundaryVersionId', selected.local_body_boundary_version_id,
        'wardBoundaryVersionId', selected.ward_boundary_version_id,
        'evidence', jsonb_build_array()
      )),
      'reason', 'The captured location resolved to a configured V1 municipal ward.'
    ),
    'selectedCandidateId', 'v1-ward:' || selected.contact_id::text,
    'selectedRoutingRuleId', selected.route_rule_id,
    'selectedRoutingRuleVersionId', selected.route_rule_version_id,
    'fallbackUsed', false,
    'fallbackPath', jsonb_build_array(),
    'ambiguousCandidateIds', jsonb_build_array(),
    'candidateEvaluations', jsonb_build_array()
  );

  decision_id := public.record_routing_decision(
    p_actor_user_id => p_actor_user_id,
    p_request_id => p_request_id,
    p_longitude => p_longitude,
    p_latitude => p_latitude,
    p_accuracy_meters => p_accuracy_meters,
    p_captured_at => p_captured_at,
    p_resolved_at => p_resolved_at,
    p_category_id => p_category_id,
    p_decision_status => 'routed',
    p_confidence_score => 1.0,
    p_state_id => selected.state_id,
    p_local_body_id => selected.local_body_id,
    p_ward_id => selected.ward_id,
    p_local_body_boundary_version_id => selected.local_body_boundary_version_id,
    p_ward_boundary_version_id => selected.ward_boundary_version_id,
    p_target_authority_id => selected.target_authority_id,
    p_department_id => selected.department_id,
    p_authority_department_id => selected.authority_department_id,
    p_officer_role_id => selected.officer_role_id,
    p_route_rule_id => selected.route_rule_id,
    p_route_rule_version_id => selected.route_rule_version_id,
    p_confidence_policy_version_id => selected.confidence_policy_version_id,
    p_explanation_codes => array['v1_ward_recipient_configured']::text[],
    p_explanation_metadata => explanation_metadata
  );

  return decision_id;
end;
$$;

create or replace function complaints.enqueue_v1_ward_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from routing.routing_decisions as decision
    inner join routing.route_rules as rule on rule.id = decision.route_rule_id
    where decision.id = new.routing_decision_id
      and rule.rule_code like 'V1_WARD_%'
  ) then
    return new;
  end if;

  insert into complaints.ward_email_outbox (
    complaint_id,
    ward_id,
    category_id,
    recipient_email
  )
  select
    new.complaint_id,
    new.ward_id,
    complaint.category_id,
    contact.recipient_email
  from complaints.complaints as complaint
  inner join routing.ward_issue_contacts as contact
    on contact.ward_id = new.ward_id
   and contact.category_id = complaint.category_id
   and contact.is_active
  where complaint.id = new.complaint_id
  on conflict (complaint_id, ward_id, recipient_email) do nothing;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'V1_WARD_EMAIL_RECIPIENT_NOT_CONFIGURED';
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_v1_ward_email_after_assignment
  on complaints.complaint_assignments;
create trigger enqueue_v1_ward_email_after_assignment
after insert on complaints.complaint_assignments
for each row
when (new.ward_id is not null)
execute function complaints.enqueue_v1_ward_email();

create or replace function public.claim_v1_ward_emails(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns table (
  outbox_id uuid,
  complaint_id uuid,
  recipient_email text,
  complaint_number text,
  category_name text,
  ward_name text,
  description text,
  longitude double precision,
  latitude double precision,
  submitted_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null
    or btrim(p_worker_id) = ''
    or p_limit not between 1 and 100
    or p_lease_seconds not between 30 and 3600 then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_CLAIM_INVALID';
  end if;

  return query
  with candidates as (
    select outbox.id
    from complaints.ward_email_outbox as outbox
    where (
      outbox.state in ('pending', 'retry')
      and outbox.available_at <= now()
    ) or (
      outbox.state = 'processing'
      and outbox.lease_expires_at <= now()
    )
    order by outbox.available_at, outbox.queued_at, outbox.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update complaints.ward_email_outbox as outbox
    set
      state = 'processing',
      attempt_count = outbox.attempt_count + 1,
      lease_owner = btrim(p_worker_id),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      last_error_code = null,
      updated_at = now()
    from candidates
    where outbox.id = candidates.id
    returning outbox.*
  )
  select
    claimed.id,
    claimed.complaint_id,
    claimed.recipient_email,
    complaint.complaint_number,
    category.name,
    ward.name,
    complaint.description,
    extensions.st_x(evidence.location),
    extensions.st_y(evidence.location),
    complaint.submitted_at,
    claimed.attempt_count
  from claimed
  inner join complaints.complaints as complaint on complaint.id = claimed.complaint_id
  inner join routing.issue_categories as category on category.id = claimed.category_id
  inner join governance.wards as ward on ward.id = claimed.ward_id
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  order by claimed.queued_at, claimed.id;
end;
$$;

create or replace function public.complete_v1_ward_email(
  p_outbox_id uuid,
  p_worker_id text,
  p_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider_message_id is null or btrim(p_provider_message_id) = '' then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_PROVIDER_ID_REQUIRED';
  end if;

  update complaints.ward_email_outbox as outbox
  set
    state = 'sent',
    provider_message_id = btrim(p_provider_message_id),
    sent_at = now(),
    lease_owner = null,
    lease_expires_at = null,
    last_error_code = null,
    updated_at = now()
  where outbox.id = p_outbox_id
    and outbox.state = 'processing'
    and outbox.lease_owner = btrim(p_worker_id)
    and outbox.lease_expires_at > now();

  if not found then
    raise exception using errcode = '40001', message = 'V1_WARD_EMAIL_LEASE_INVALID';
  end if;
end;
$$;

create or replace function public.fail_v1_ward_email(
  p_outbox_id uuid,
  p_worker_id text,
  p_error_code text,
  p_retry_after_seconds integer default 300,
  p_max_attempts integer default 5
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error_code is null
    or btrim(p_error_code) !~ '^[A-Z][A-Z0-9_]{1,79}$'
    or p_retry_after_seconds not between 30 and 86400
    or p_max_attempts not between 1 and 20 then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_FAILURE_INVALID';
  end if;

  update complaints.ward_email_outbox as outbox
  set
    state = case when outbox.attempt_count >= p_max_attempts then 'dead' else 'retry' end,
    available_at = case
      when outbox.attempt_count >= p_max_attempts then outbox.available_at
      else now() + make_interval(secs => p_retry_after_seconds)
    end,
    lease_owner = null,
    lease_expires_at = null,
    last_error_code = btrim(p_error_code),
    updated_at = now()
  where outbox.id = p_outbox_id
    and outbox.state = 'processing'
    and outbox.lease_owner = btrim(p_worker_id);

  if not found then
    raise exception using errcode = '40001', message = 'V1_WARD_EMAIL_LEASE_INVALID';
  end if;
end;
$$;

-- Existing drafts can contain a no-longer-required asset selection. The V1 ward
-- route deliberately ignores that selection; all other routing evidence checks
-- remain fail-closed.
create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  v1_ward_route boolean := false;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  select exists (
    select 1
    from routing.route_rules as rule
    where rule.id = decision.route_rule_id
      and rule.rule_code like 'V1_WARD_%'
  ) into v1_ward_route;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if not v1_ward_route and decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_dwithin(
    decision.input_location::extensions.geography,
    evidence.location::extensions.geography,
    2.0
  ) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is null
    or evidence.accuracy_meters is null
    or abs(decision.accuracy_meters - evidence.accuracy_meters) > 0.5 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is null
    or evidence.captured_at is null
    or abs(extract(epoch from (decision.captured_at - evidence.captured_at))) > 2 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) to service_role;

revoke all on function public.claim_v1_ward_emails(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_v1_ward_emails(text, integer, integer)
  to service_role;

revoke all on function public.complete_v1_ward_email(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_v1_ward_email(uuid, text, text)
  to service_role;

revoke all on function public.fail_v1_ward_email(uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.fail_v1_ward_email(uuid, text, text, integer, integer)
  to service_role;

revoke all on function complaints.enqueue_v1_ward_email()
  from public, anon, authenticated, service_role;
revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

comment on table routing.ward_issue_contacts is
  'Private V1 ward/category recipient and published phone/WhatsApp configuration.';
comment on table complaints.ward_email_outbox is
  'Private idempotent queue for ward complaint email delivery; queued is not equivalent to sent.';
comment on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) is 'Resolves the V1 complaint target directly from PostGIS ward geometry and private contact configuration.';
$migration_20260720100000_v1_simple_ward_routing$;

  if not (pg_temp.local_wellness_relation_exists('routing.ward_issue_contacts')
      and pg_temp.local_wellness_relation_exists('complaints.ward_email_outbox')
      and pg_temp.local_wellness_forced_rls('routing.ward_issue_contacts')
      and pg_temp.local_wellness_forced_rls('complaints.ward_email_outbox')
      and pg_temp.local_wellness_function_exists('public', 'resolve_v1_ward_route')
      and pg_temp.local_wellness_function_exists('public', 'claim_v1_ward_emails')
      and pg_temp.local_wellness_function_exists('public', 'complete_v1_ward_email')
      and pg_temp.local_wellness_function_exists('public', 'fail_v1_ward_email')
      and pg_temp.local_wellness_trigger_exists('complaints', 'complaint_assignments', 'enqueue_v1_ward_email_after_assignment')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260720100000_v1_simple_ward_routing.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 47,
    cutoff_name = '20260720100000_v1_simple_ward_routing.sql'
  where singleton;

  raise notice 'Applied migration 20260720100000_v1_simple_ward_routing.sql';
end;
$guard_47$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260720100000_v1_simple_ward_routing.sql
-- ============================================================================

-- ============================================================================
-- BEGIN SOURCE MIGRATION: 20260720103000_v1_ward_email_provenance.sql
-- ============================================================================
do $guard_48$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= 48 then
    raise notice 'Skipping already-complete migration 20260720103000_v1_ward_email_provenance.sql';
    return;
  end if;

  if current_cutoff <> 47 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: 20260720103000_v1_ward_email_provenance.sql';
  end if;

  execute $migration_20260720103000_v1_ward_email_provenance$
-- Preserve the immutable ward-directory evidence used by the private V1
-- complaint-delivery matrix. The columns remain nullable for inactive legacy
-- rows, while the constraint requires complete evidence before a route is active.

alter table routing.ward_issue_contacts
  add column if not exists email_source_url text,
  add column if not exists email_source_as_of date,
  add column if not exists email_last_checked_on date,
  add column if not exists email_source_locator text,
  add column if not exists email_source_reported_status text,
  add column if not exists email_owner_approved_for_routing boolean not null default false;

do $ward_issue_contact_email_provenance_constraint$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'routing.ward_issue_contacts'::regclass
      and constraint_record.conname = 'ward_issue_contacts_active_email_provenance_check'
  ) then
    alter table routing.ward_issue_contacts
      add constraint ward_issue_contacts_active_email_provenance_check check (
        not is_active
        or (
          email_source_url is not null
          and email_source_url = btrim(email_source_url)
          and email_source_url ~ '^https://'
          and email_source_as_of is not null
          and email_last_checked_on is not null
          and email_source_as_of <= email_last_checked_on
          and email_source_locator is not null
          and email_source_locator = btrim(email_source_locator)
          and char_length(email_source_locator) between 1 and 500
          and email_source_reported_status is not null
          and email_source_reported_status = btrim(email_source_reported_status)
          and char_length(email_source_reported_status) between 1 and 80
          and email_owner_approved_for_routing
        )
      ) not valid;
  end if;
end;
$ward_issue_contact_email_provenance_constraint$;

comment on column routing.ward_issue_contacts.email_source_url is
  'Official source URL published in the immutable ward-directory archive for this recipient mailbox.';
comment on column routing.ward_issue_contacts.email_source_as_of is
  'Source-as-of date reported by the ward-directory archive.';
comment on column routing.ward_issue_contacts.email_last_checked_on is
  'Date on which the ward-directory archive last checked the published mailbox.';
comment on column routing.ward_issue_contacts.email_source_locator is
  'Deterministic archive member and record locator for the mailbox evidence.';
comment on column routing.ward_issue_contacts.email_source_reported_status is
  'Raw verification status from the supplied archive; retained separately from the staging approval decision.';
comment on column routing.ward_issue_contacts.email_owner_approved_for_routing is
  'Explicit staging approval that permits this private mailbox to be used by the V1 routing facade.';
$migration_20260720103000_v1_ward_email_provenance$;

  if not (pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_url')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_as_of')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_last_checked_on')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_locator')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_source_reported_status')
      and pg_temp.local_wellness_column_exists('routing', 'ward_issue_contacts', 'email_owner_approved_for_routing')
      and pg_temp.local_wellness_constraint_exists('routing', 'ward_issue_contacts', 'ward_issue_contacts_active_email_provenance_check')) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: 20260720103000_v1_ward_email_provenance.sql';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = 48,
    cutoff_name = '20260720103000_v1_ward_email_provenance.sql'
  where singleton;

  raise notice 'Applied migration 20260720103000_v1_ward_email_provenance.sql';
end;
$guard_48$;
-- ============================================================================
-- END SOURCE MIGRATION: 20260720103000_v1_ward_email_provenance.sql
-- ============================================================================

do $verify_part$
declare
  final_cutoff integer;
begin
  select state.cutoff_position
  into final_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if final_cutoff < 48 then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_2_VERIFICATION_FAILED';
  end if;

  if not public.api_readiness_check() then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_FINAL_READINESS_FAILED';
  end if;
end;
$verify_part$;

commit;
