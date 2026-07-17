import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = join(repositoryRoot, 'supabase/migrations');
const outputPaths = {
  complete: join(repositoryRoot, 'supabase/master.sql'),
  part1: join(repositoryRoot, 'supabase/master.part-1.sql'),
  part2: join(repositoryRoot, 'supabase/master.part-2.sql'),
};
const part1CutoffMigrationName = '20260714124000_phase_5_government_workflow_security_and_rpc.sql';
const checkOnly = process.argv.includes('--check');

const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const relation = (qualifiedName) =>
  `pg_temp.local_wellness_relation_exists(${sqlString(qualifiedName)})`;
const functionNamed = (schema, name) =>
  `pg_temp.local_wellness_function_exists(${sqlString(schema)}, ${sqlString(name)})`;
const policy = (schema, table, name) =>
  `pg_temp.local_wellness_policy_exists(${sqlString(schema)}, ${sqlString(table)}, ${sqlString(name)})`;
const trigger = (schema, table, name) =>
  `pg_temp.local_wellness_trigger_exists(${sqlString(schema)}, ${sqlString(table)}, ${sqlString(name)})`;
const constraint = (schema, table, name) =>
  `pg_temp.local_wellness_constraint_exists(${sqlString(schema)}, ${sqlString(table)}, ${sqlString(name)})`;
const column = (schema, table, name) =>
  `pg_temp.local_wellness_column_exists(${sqlString(schema)}, ${sqlString(table)}, ${sqlString(name)})`;
const forcedRls = (qualifiedName) =>
  `pg_temp.local_wellness_forced_rls(${sqlString(qualifiedName)})`;
const roleCode = (code) => `pg_temp.local_wellness_role_code_exists(${sqlString(code)})`;
const privateBucket = (name) => `pg_temp.local_wellness_private_bucket_exists(${sqlString(name)})`;
const noColumnPrivilege = (role, schema, table, name, privilege) =>
  `not pg_temp.local_wellness_column_privilege(${sqlString(role)}, ${sqlString(schema)}, ${sqlString(table)}, ${sqlString(name)}, ${sqlString(privilege)})`;
const all = (...predicates) => predicates.join('\n      and ');
const any = (...predicates) => predicates.join('\n      or ');

const fingerprintDefinitions = new Map([
  [
    '20260713100000_phase_1_identity_and_access.sql',
    {
      present: relation('public.profiles'),
      complete: all(
        relation('public.profiles'),
        relation('public.devices'),
        relation('public.roles'),
        relation('public.authority_memberships'),
        relation('public.user_roles'),
        relation('public.auth_audit_events'),
        functionNamed('private', 'handle_auth_user_identity_updated'),
        trigger('auth', 'users', 'on_local_wellness_auth_user_identity_updated'),
        policy('public', 'auth_audit_events', 'auth_audit_events_select_own_or_managed_authority'),
        forcedRls('public.profiles'),
        forcedRls('public.devices'),
        roleCode('citizen'),
      ),
    },
  ],
  [
    '20260713130000_restrict_device_sensitive_column_access.sql',
    {
      present: all(
        noColumnPrivilege('authenticated', 'public', 'devices', 'device_identifier_hash', 'SELECT'),
        noColumnPrivilege('authenticated', 'public', 'devices', 'push_token', 'SELECT'),
      ),
      complete: all(
        noColumnPrivilege('authenticated', 'public', 'devices', 'device_identifier_hash', 'SELECT'),
        noColumnPrivilege('authenticated', 'public', 'devices', 'push_token', 'SELECT'),
      ),
    },
  ],
  [
    '20260713150000_atomic_device_lifecycle_and_access_provenance.sql',
    {
      present: functionNamed('public', 'revoke_device'),
      complete: all(
        functionNamed('public', 'register_device'),
        functionNamed('public', 'revoke_device'),
        policy('public', 'profiles', 'profiles_select_own_or_managed_authority'),
        noColumnPrivilege('authenticated', 'public', 'devices', 'push_token', 'UPDATE'),
      ),
    },
  ],
  [
    '20260713160000_phase_2_governance_schema.sql',
    {
      present: relation('governance.authorities'),
      complete: all(
        relation('governance.authorities'),
        relation('governance.states'),
        relation('governance.districts'),
        relation('governance.local_bodies'),
        relation('governance.wards'),
        relation('governance.jurisdiction_boundary_versions'),
        relation('governance.complaint_routing_references'),
        trigger(
          'governance',
          'complaint_routing_references',
          'complaint_routing_references_set_updated_at',
        ),
      ),
    },
  ],
  [
    '20260713161000_phase_2_governance_security.sql',
    {
      present: policy('governance', 'authorities', 'authorities_select_verified'),
      complete: all(
        policy(
          'governance',
          'complaint_routing_references',
          'complaint_routing_references_select_verified_or_platform_admin',
        ),
        policy('governance', 'offices', 'offices_select_verified_or_managed'),
        forcedRls('governance.complaint_routing_references'),
      ),
    },
  ],
  [
    '20260713162000_phase_2_identity_authority_forward_fix.sql',
    {
      present: functionNamed('private', 'validate_governance_role_scope'),
      complete: all(
        functionNamed('private', 'validate_governance_role_scope'),
        trigger('public', 'user_roles', 'user_roles_validate_governance_scope'),
        column('public', 'user_roles', 'authority_id'),
      ),
    },
  ],
  [
    '20260713163000_phase_2_jurisdiction_resolution.sql',
    {
      present: functionNamed('governance', 'resolve_jurisdiction'),
      complete: functionNamed('governance', 'resolve_jurisdiction'),
    },
  ],
  [
    '20260713164000_phase_2_governance_integrity_forward_fix.sql',
    {
      present: functionNamed('governance', 'reject_scope_key_update'),
      complete: all(
        trigger('governance', 'wards', 'wards_reject_scope_key_update'),
        trigger('governance', 'utilities', 'utilities_reject_scope_key_update'),
        policy('governance', 'authorities', 'authorities_select_verified_or_managed'),
      ),
    },
  ],
  [
    '20260713165000_enforce_authority_parent_types.sql',
    {
      present: functionNamed('governance', 'reject_invalid_authority_parent_types'),
      complete: all(
        functionNamed('governance', 'reject_invalid_authority_parent_types'),
        trigger('governance', 'authorities', 'authorities_reject_invalid_parent_types'),
      ),
    },
  ],
  [
    '20260713166000_harden_governance_access_and_geometry.sql',
    {
      present: constraint(
        'governance',
        'jurisdiction_boundary_versions',
        'jurisdiction_boundaries_coordinate_envelope_check',
      ),
      complete: all(
        constraint(
          'governance',
          'jurisdiction_boundary_versions',
          'jurisdiction_boundaries_coordinate_envelope_check',
        ),
        functionNamed('private', 'is_active_governance_authority'),
      ),
    },
  ],
  [
    '20260713200000_phase_3_routing_schema.sql',
    {
      present: relation('routing.issue_domains'),
      complete: all(
        relation('routing.issue_domains'),
        relation('routing.route_rule_versions'),
        relation('routing.routing_decisions'),
        trigger('routing', 'routing_decisions', 'routing_decisions_reject_delete'),
      ),
    },
  ],
  [
    '20260713201000_governance_synchronization_foundation.sql',
    {
      present: relation('governance.source_endpoints'),
      complete: all(
        relation('governance.source_endpoints'),
        relation('governance.raw_snapshots'),
        relation('governance.sync_review_events'),
        trigger('governance', 'sync_review_events', 'sync_review_events_reject_delete'),
      ),
    },
  ],
  [
    '20260713202000_phase_3_routing_security_and_rpc.sql',
    {
      present: functionNamed('routing', 'resolve_jurisdiction_with_accuracy'),
      complete: all(
        functionNamed('public', 'list_routing_categories'),
        functionNamed('public', 'resolve_routing_candidates'),
        functionNamed('public', 'record_routing_decision'),
      ),
    },
  ],
  [
    '20260714100000_phase_4_complaint_capture.sql',
    {
      present: relation('complaints.complaint_drafts'),
      complete: all(
        relation('complaints.complaint_drafts'),
        relation('complaints.complaints'),
        relation('complaints.complaint_assignments'),
        relation('complaints.duplicate_check_matches'),
        relation('complaints.complaint_number_sequence'),
      ),
    },
  ],
  [
    '20260714101000_phase_4_complaint_security_and_rpc.sql',
    {
      present: functionNamed('public', 'create_complaint_draft'),
      complete: all(
        functionNamed('public', 'submit_complaint'),
        functionNamed('public', 'list_owned_complaints'),
        functionNamed('public', 'get_complaint_timeline'),
        privateBucket('complaint-originals-private'),
        privateBucket('voice-recordings-private'),
      ),
    },
  ],
  [
    '20260714110000_governance_sync_scheduling_and_contacts.sql',
    {
      present: relation('governance.sync_source_leases'),
      complete: all(
        relation('governance.sync_source_leases'),
        relation('governance.contact_channel_versions'),
        relation('governance.current_verified_contacts'),
        trigger('governance', 'contact_channel_versions', 'contact_channel_versions_reject_delete'),
      ),
    },
  ],
  [
    '20260714111000_governance_sync_service_rpc.sql',
    {
      present: functionNamed('public', 'claim_due_governance_sync_sources'),
      complete: all(
        functionNamed('public', 'claim_due_governance_sync_sources'),
        functionNamed('public', 'record_governance_sync_snapshot'),
        functionNamed('public', 'fail_governance_sync_run'),
      ),
    },
  ],
  [
    '20260714112000_governance_sync_scope.sql',
    {
      present: relation('governance.sync_scope_targets'),
      complete: all(
        relation('governance.sync_scope_targets'),
        functionNamed('private', 'enforce_governance_sync_scope_target'),
        trigger('governance', 'sync_scope_targets', 'sync_scope_targets_enforce'),
      ),
    },
  ],
  [
    '20260714120000_backfill_auth_profiles.sql',
    {
      present: functionNamed('private', 'backfill_missing_auth_identities'),
      complete: functionNamed('private', 'backfill_missing_auth_identities'),
    },
  ],
  [
    '20260714121000_routing_configuration_validation.sql',
    {
      present: functionNamed('public', 'report_routing_confidence_policy_conflicts'),
      complete: functionNamed('public', 'report_routing_confidence_policy_conflicts'),
    },
  ],
  [
    '20260714122000_routing_asset_discovery.sql',
    {
      present: functionNamed('public', 'discover_routing_assets'),
      complete: functionNamed('public', 'discover_routing_assets'),
    },
  ],
  [
    '20260714123000_phase_5_government_workflow_schema.sql',
    {
      present: relation('complaints.government_role_capabilities'),
      complete: all(
        relation('complaints.government_role_capabilities'),
        relation('complaints.complaint_resolution_evidence'),
        relation('complaints.notification_outbox'),
      ),
    },
  ],
  [
    '20260714124000_phase_5_government_workflow_security_and_rpc.sql',
    {
      present: functionNamed('complaints', 'is_verified_assignment_scope'),
      complete: all(
        functionNamed('public', 'perform_government_complaint_action'),
        functionNamed('public', 'reserve_government_resolution_evidence'),
        functionNamed('public', 'fail_government_resolution_evidence'),
        privateBucket('resolution-evidence-private'),
      ),
    },
  ],
  [
    '20260714130000_phase_6_communication_and_notification_schema.sql',
    {
      present: relation('complaints.conversation_rooms'),
      complete: all(
        relation('complaints.conversation_rooms'),
        relation('complaints.messages'),
        relation('complaints.notifications'),
        relation('complaints.notification_outbox_jobs'),
      ),
    },
  ],
  [
    '20260714131000_phase_6_communication_notification_security_and_rpc.sql',
    {
      present: functionNamed('complaints', 'actor_can_communicate'),
      complete: all(
        functionNamed('public', 'authorize_realtime_room'),
        functionNamed('public', 'list_notifications'),
        functionNamed('public', 'fail_notification_delivery'),
      ),
    },
  ],
  [
    '20260716100000_phase_7_accountability_schema.sql',
    {
      present: relation('complaints.resolution_policies'),
      complete: all(
        relation('complaints.resolution_policies'),
        relation('complaints.complaint_reopen_requests'),
        relation('complaints.complaint_escalation_events'),
      ),
    },
  ],
  [
    '20260716101000_phase_7_accountability_security_and_rpc.sql',
    {
      present: functionNamed('complaints', 'resolve_resolution_policy_version'),
      complete: all(
        functionNamed('public', 'get_citizen_resolution_context'),
        functionNamed('public', 'submit_complaint_feedback'),
        functionNamed('public', 'reopen_complaint'),
      ),
    },
  ],
  [
    '20260716102000_phase_8_transparency_schema.sql',
    {
      present: relation('complaints.public_visibility_policies'),
      complete: all(
        relation('complaints.public_visibility_policies'),
        relation('complaints.complaint_publication_projections'),
        relation('complaints.public_media_derivatives'),
      ),
    },
  ],
  [
    '20260716103000_phase_8_transparency_security_and_rpc.sql',
    {
      present: functionNamed('complaints', 'actor_can_review_publication'),
      complete: all(
        functionNamed('complaints', 'actor_can_review_publication'),
        trigger('complaints', 'public_media_derivatives', 'public_media_derivatives_append_only'),
      ),
    },
  ],
  [
    '20260716104000_verified_governing_body_projection.sql',
    {
      present: functionNamed('public', 'resolve_verified_governing_bodies'),
      complete: functionNamed('public', 'resolve_verified_governing_bodies'),
    },
  ],
  [
    '20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql',
    {
      present: functionNamed('complaints', 'current_public_complaint_projections'),
      complete: all(
        functionNamed('public', 'list_public_complaint_projections'),
        functionNamed('public', 'list_public_complaint_hotspots'),
        functionNamed('public', 'withdraw_public_complaint_projection'),
      ),
    },
  ],
  [
    '20260716106000_phase_8_duplicate_group_publication.sql',
    {
      present: functionNamed('complaints', 'public_duplicate_group_payload'),
      complete: all(
        functionNamed('public', 'review_public_duplicate_group'),
        functionNamed('public', 'withdraw_public_duplicate_group'),
      ),
    },
  ],
  [
    '20260716110000_phase_9_sla_escalation_kpi_schema.sql',
    {
      present: relation('complaints.sla_calendars'),
      complete: all(
        relation('complaints.sla_calendars'),
        relation('complaints.sla_escalation_jobs'),
        relation('complaints.kpi_snapshots'),
      ),
    },
  ],
  [
    '20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql',
    {
      present: functionNamed('complaints', 'actor_is_platform_admin'),
      complete: all(
        functionNamed('public', 'get_government_complaint_sla'),
        functionNamed('public', 'list_government_kpi_snapshots'),
        forcedRls('complaints.kpi_snapshots'),
      ),
    },
  ],
  [
    '20260716112000_phase_10_api_hardening.sql',
    {
      present: relation('private.api_rate_limit_windows'),
      complete: all(
        relation('private.api_rate_limit_windows'),
        functionNamed('public', 'consume_api_rate_limit'),
        functionNamed('public', 'api_readiness_check'),
      ),
    },
  ],
  [
    '20260716113000_phase_10_privileged_mfa.sql',
    {
      present: functionNamed('private', 'jwt_has_aal2'),
      complete: all(
        functionNamed('private', 'jwt_has_aal2'),
        functionNamed('public', 'user_requires_privileged_mfa'),
      ),
    },
  ],
  [
    '20260716114000_phase_10_citizen_phone_mfa.sql',
    {
      present: functionNamed('public', 'user_has_verified_phone_mfa'),
      complete: functionNamed('public', 'user_has_verified_phone_mfa'),
    },
  ],
  [
    '20260716115000_phase_10_profile_images.sql',
    {
      present: any(
        column('public', 'profiles', 'avatar_object_path'),
        functionNamed('private', 'set_profile_avatar_version'),
        policy('storage', 'objects', 'profile_images_select_own'),
      ),
      complete: all(
        column('public', 'profiles', 'avatar_object_path'),
        column('public', 'profiles', 'avatar_updated_at'),
        functionNamed('private', 'set_profile_avatar_version'),
        policy('storage', 'objects', 'profile_images_select_own'),
        policy('storage', 'objects', 'profile_images_insert_own'),
        policy('storage', 'objects', 'profile_images_update_own'),
        policy('storage', 'objects', 'profile_images_delete_own'),
        privateBucket('profile-images-private'),
      ),
    },
  ],
  [
    '20260716116000_phase_10_complaint_location_proximity.sql',
    {
      present: functionNamed('complaints', 'enforce_v1_location_proximity'),
      complete: all(
        functionNamed('complaints', 'enforce_v1_location_proximity'),
        constraint('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check'),
        constraint('routing', 'issue_categories', 'issue_categories_v1_media_proximity_check'),
        trigger(
          'complaints',
          'complaint_location_evidence',
          'complaint_location_evidence_enforce_v1_proximity',
        ),
      ),
    },
  ],
  [
    '20260716117000_phase_10_routing_delivery_readiness.sql',
    {
      present: functionNamed('governance', 'resolve_complaint_contact_readiness'),
      complete: all(
        functionNamed('governance', 'resolve_complaint_contact_readiness'),
        functionNamed('complaints', 'assignment_delivery_readiness'),
        functionNamed('complaints', 'assignment_summary'),
      ),
    },
  ],
  [
    '20260716118000_bmc_ward_relationship_versions.sql',
    {
      present: relation('governance.ward_administrative_zone_membership_versions'),
      complete: all(
        relation('governance.ward_administrative_zone_membership_versions'),
        relation('governance.ward_boundary_crosswalk_versions'),
        functionNamed('governance', 'validate_ward_zone_membership_version'),
        functionNamed('governance', 'validate_ward_boundary_crosswalk_version'),
        trigger(
          'governance',
          'ward_administrative_zone_membership_versions',
          'ward_zone_membership_versions_validate',
        ),
        trigger(
          'governance',
          'ward_boundary_crosswalk_versions',
          'ward_boundary_crosswalk_versions_validate',
        ),
        forcedRls('governance.ward_administrative_zone_membership_versions'),
        forcedRls('governance.ward_boundary_crosswalk_versions'),
      ),
    },
  ],
  [
    '20260716119000_government_invitation_scope_options.sql',
    {
      present: functionNamed('public', 'list_government_invitation_options'),
      complete: functionNamed('public', 'list_government_invitation_options'),
    },
  ],
]);

const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));

if (migrationNames.length === 0) {
  throw new Error(`No SQL migrations found in ${migrationsDirectory}.`);
}

const missingFingerprints = migrationNames.filter((name) => !fingerprintDefinitions.has(name));
const orphanedFingerprints = [...fingerprintDefinitions.keys()].filter(
  (name) => !migrationNames.includes(name),
);

if (missingFingerprints.length > 0 || orphanedFingerprints.length > 0) {
  throw new Error(
    `Migration fingerprint registry is out of date. Missing: ${missingFingerprints.join(', ') || 'none'}. Orphaned: ${orphanedFingerprints.join(', ') || 'none'}.`,
  );
}

const migrations = await Promise.all(
  migrationNames.map(async (name, index) => {
    const sql = await readFile(join(migrationsDirectory, name), 'utf8');

    if (!sql.trim()) {
      throw new Error(`Migration ${name} is empty.`);
    }

    if (
      /^\s*(begin|commit|rollback)\s*;|^\s*vacuum\b|create\s+(unique\s+)?index\s+concurrently\b/imu.test(
        sql,
      )
    ) {
      throw new Error(
        `Migration ${name} contains transaction-unsafe SQL for the adaptive Dashboard bundle.`,
      );
    }

    return {
      fingerprint: fingerprintDefinitions.get(name),
      name,
      position: index + 1,
      sha256: createHash('sha256').update(sql).digest('hex'),
      sql: sql.endsWith('\n') ? sql : `${sql}\n`,
    };
  }),
);

const part1Count = migrations.findIndex(({ name }) => name === part1CutoffMigrationName) + 1;

if (part1Count <= 0 || part1Count >= migrations.length) {
  throw new Error(
    `Reviewed part boundary ${part1CutoffMigrationName} is missing or cannot produce two parts.`,
  );
}

const migrationParts = [migrations.slice(0, part1Count), migrations.slice(part1Count)];
const generatedAt = migrationNames.at(-1)?.slice(0, 8);
const renderManifest = (sourceMigrations) =>
  sourceMigrations.map(({ name, sha256 }) => `-- ${sha256}  ${name}`).join('\n');

const renderCompleteMigration = ({ name, sql }) => `
-- ============================================================================
-- BEGIN SOURCE MIGRATION: ${name}
-- ============================================================================
begin;

${sql}commit;
-- ============================================================================
-- END SOURCE MIGRATION: ${name}
-- ============================================================================
`;

const completeHeader = `-- Local Wellness Supabase master migration
--
-- Generated deterministically from supabase/migrations/*.sql by:
--   pnpm database:master:generate
--
-- This artifact is for bootstrapping an empty Supabase/PostgreSQL database.
-- Existing databases must use master.part-1.sql and master.part-2.sql, whose
-- adaptive migration-level guards validate and skip an already-complete prefix.
-- Do not place any generated artifact in supabase/migrations. Seed data remains
-- intentionally separate under supabase/seed.
-- Source migration cutoff: ${generatedAt}
-- Source migration count: ${migrations.length}
--
-- Source manifest (SHA-256 of the exact source file bytes):
${renderManifest(migrations)}
`;

const helperSql = `create temp table local_wellness_bundle_fingerprints (
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
`;

const renderFingerprintRows = () =>
  migrations
    .map(
      ({ fingerprint, name, position }) => `  (
    ${position},
    ${sqlString(name)},
    (${fingerprint.present}),
    (${fingerprint.complete})
  )`,
    )
    .join(',\n');

const renderDetection = (partNumber) => `insert into local_wellness_bundle_fingerprints (
  migration_position,
  migration_name,
  is_present,
  is_complete
)
values
${renderFingerprintRows()};

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

  detected_cutoff := coalesce(first_missing - 1, ${migrations.length});

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

  if ${partNumber} = 2 and detected_cutoff < ${part1Count} then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_1_REQUIRED',
      hint = 'Execute master.part-1.sql successfully before Part 2.';
  end if;

  raise notice 'Local Wellness detected migration cutoff: % of ${migrations.length}', detected_cutoff;
end;
$detect_state$;
`;

const renderAdaptiveMigration = ({ fingerprint, name, position, sql }) => {
  const identifier = name.replace(/\.sql$/u, '');

  return `
-- ============================================================================
-- BEGIN SOURCE MIGRATION: ${name}
-- ============================================================================
do $guard_${position}$
declare
  current_cutoff integer;
begin
  select state.cutoff_position
  into current_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if current_cutoff >= ${position} then
    raise notice 'Skipping already-complete migration ${name}';
    return;
  end if;

  if current_cutoff <> ${position - 1} then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_GAP: ${name}';
  end if;

  execute $migration_${identifier}$
${sql}$migration_${identifier}$;

  if not (${fingerprint.complete}) then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_MIGRATION_POSTCONDITION_FAILED: ${name}';
  end if;

  update local_wellness_bundle_state
  set
    cutoff_position = ${position},
    cutoff_name = ${sqlString(name)}
  where singleton;

  raise notice 'Applied migration ${name}';
end;
$guard_${position}$;
-- ============================================================================
-- END SOURCE MIGRATION: ${name}
-- ============================================================================
`;
};

const renderPartHeader = (sourceMigrations, partNumber) => {
  const firstMigration = sourceMigrations.at(0)?.name;
  const lastMigration = sourceMigrations.at(-1)?.name;
  const nextInstruction =
    partNumber === 1
      ? '-- After this query commits successfully, execute master.part-2.sql.'
      : '-- Execute this query only after master.part-1.sql commits successfully.';

  return `-- Local Wellness adaptive existing-database migration — Part ${partNumber} of 2
--
-- Generated deterministically from supabase/migrations/*.sql by:
--   pnpm database:master:generate
--
-- This file contains an exact ordered slice of master.sql. It detects a coherent
-- already-complete migration prefix, skips those migrations as whole units, and
-- executes only the missing immutable source migrations. Native IF NOT EXISTS is
-- used by source migrations where definition-safe; policies, triggers, functions,
-- constraints, DML, and grants are never blindly suppressed.
${nextInstruction}
-- The entire part is one transaction protected by an advisory transaction lock.
-- Any partial/non-contiguous fingerprint or source failure rolls back the part.
-- Dashboard execution does not repair supabase_migrations.schema_migrations.
-- Seed data remains intentionally separate under supabase/seed.
-- Complete source cutoff: ${generatedAt}
-- Complete source count: ${migrations.length}
-- Migrations in this part: ${sourceMigrations.length}
-- Part source range: ${firstMigration} through ${lastMigration}
--
-- Source manifest for this part (SHA-256 of the exact source file bytes):
${renderManifest(sourceMigrations)}
`;
};

const renderPart = (sourceMigrations, partNumber) => {
  const requiredCutoff = partNumber === 1 ? part1Count : migrations.length;
  const finalCheck =
    partNumber === 2
      ? `
  if not public.api_readiness_check() then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_FINAL_READINESS_FAILED';
  end if;
`
      : '';

  return `${renderPartHeader(sourceMigrations, partNumber)}
begin;

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('local_wellness_adaptive_master', 0)
);

${helperSql}
${renderDetection(partNumber)}
${sourceMigrations.map(renderAdaptiveMigration).join('')}
do $verify_part$
declare
  final_cutoff integer;
begin
  select state.cutoff_position
  into final_cutoff
  from local_wellness_bundle_state as state
  where state.singleton;

  if final_cutoff < ${requiredCutoff} then
    raise exception using
      errcode = 'P0001',
      message = 'LOCAL_WELLNESS_PART_${partNumber}_VERIFICATION_FAILED';
  end if;
${finalCheck}end;
$verify_part$;

commit;
`;
};

const artifacts = [
  {
    path: outputPaths.complete,
    generated: `${completeHeader}${migrations.map(renderCompleteMigration).join('')}`,
  },
  ...migrationParts.map((sourceMigrations, index) => ({
    path: index === 0 ? outputPaths.part1 : outputPaths.part2,
    generated: renderPart(sourceMigrations, index + 1),
  })),
];

if (checkOnly) {
  const staleArtifacts = [];

  for (const artifact of artifacts) {
    const committed = await readFile(artifact.path, 'utf8').catch(() => null);

    if (committed !== artifact.generated) {
      staleArtifacts.push(artifact.path.slice(repositoryRoot.length + 1));
    }
  }

  if (staleArtifacts.length > 0) {
    throw new Error(
      `${staleArtifacts.join(', ')} missing or stale. Run \`pnpm database:master:generate\`.`,
    );
  }

  process.stdout.write(
    `Master migration and two adaptive SQL Editor parts are current (${migrations.length} source migrations).\n`,
  );
} else {
  await Promise.all(artifacts.map(({ path, generated }) => writeFile(path, generated, 'utf8')));
  process.stdout.write(
    `Updated master.sql and two adaptive SQL Editor parts from ${migrations.length} source migrations.\n`,
  );
}
