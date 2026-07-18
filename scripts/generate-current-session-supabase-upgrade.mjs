import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = join(repositoryRoot, 'supabase/migrations');
const deploymentDirectory = join(repositoryRoot, 'supabase/deploy/current-session');
const outputPaths = {
  migration: join(deploymentDirectory, '01_migrations_39_through_43.sql'),
  readme: join(deploymentDirectory, 'README.md'),
};

const baselineMigration = '20260716115000_phase_10_profile_images.sql';
const sourceMigrationNames = [
  '20260716116000_phase_10_complaint_location_proximity.sql',
  '20260716117000_phase_10_routing_delivery_readiness.sql',
  '20260716118000_bmc_ward_relationship_versions.sql',
  '20260716119000_government_invitation_scope_options.sql',
  '20260717100000_public_complaint_engagements.sql',
];
const firstMigrationPosition = 39;
const finalMigrationPosition = 43;

const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const relation = (qualifiedName) =>
  `pg_temp.local_wellness_relation_exists(${sqlString(qualifiedName)})`;
const procedure = (signature) => `pg_temp.local_wellness_procedure_exists(${sqlString(signature)})`;
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
const privateBucket = (name) => `pg_temp.local_wellness_private_bucket_exists(${sqlString(name)})`;
const all = (...predicates) => predicates.join('\n      and ');
const any = (...predicates) => predicates.join('\n      or ');

const baselineComplete = all(
  column('public', 'profiles', 'avatar_object_path'),
  column('public', 'profiles', 'avatar_updated_at'),
  procedure('private.set_profile_avatar_version()'),
  policy('storage', 'objects', 'profile_images_select_own'),
  policy('storage', 'objects', 'profile_images_insert_own'),
  policy('storage', 'objects', 'profile_images_update_own'),
  policy('storage', 'objects', 'profile_images_delete_own'),
  privateBucket('profile-images-private'),
);

const fingerprintDefinitions = new Map([
  [
    sourceMigrationNames[0],
    {
      present: any(
        procedure('complaints.enforce_v1_location_proximity()'),
        constraint('routing', 'issue_categories', 'issue_categories_v1_location_accuracy_check'),
        trigger(
          'complaints',
          'complaint_location_evidence',
          'complaint_location_evidence_enforce_v1_proximity',
        ),
      ),
      complete: all(
        procedure('complaints.enforce_v1_location_proximity()'),
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
    sourceMigrationNames[1],
    {
      present: any(
        procedure(
          'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
        ),
        procedure('complaints.assignment_delivery_readiness(uuid)'),
      ),
      complete: all(
        procedure(
          'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
        ),
        procedure('complaints.assignment_delivery_readiness(uuid)'),
        procedure('complaints.assignment_summary(uuid)'),
      ),
    },
  ],
  [
    sourceMigrationNames[2],
    {
      present: any(
        relation('governance.ward_administrative_zone_membership_versions'),
        relation('governance.ward_boundary_crosswalk_versions'),
      ),
      complete: all(
        relation('governance.ward_administrative_zone_membership_versions'),
        relation('governance.ward_boundary_crosswalk_versions'),
        procedure('governance.validate_ward_zone_membership_version()'),
        procedure('governance.validate_ward_boundary_crosswalk_version()'),
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
    sourceMigrationNames[3],
    {
      present: procedure('public.list_government_invitation_options(uuid[])'),
      complete: procedure('public.list_government_invitation_options(uuid[])'),
    },
  ],
  [
    sourceMigrationNames[4],
    {
      present: any(
        relation('complaints.public_complaint_engagements'),
        procedure(
          'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)',
        ),
      ),
      complete: all(
        relation('complaints.public_complaint_engagements'),
        forcedRls('complaints.public_complaint_engagements'),
        constraint(
          'complaints',
          'public_complaint_engagements',
          'public_complaint_engagements_pkey',
        ),
        constraint(
          'complaints',
          'public_complaint_engagements',
          'public_complaint_engagements_time_check',
        ),
        procedure('complaints.public_complaint_support_count(uuid)'),
        procedure(
          'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)',
        ),
        procedure('public.list_public_complaint_engagements(uuid,uuid[])'),
        procedure('public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)'),
      ),
    },
  ],
]);

const helperSql = `create temp table local_wellness_upgrade_fingerprints (
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
$helper$;`;

const renderManifest = (migrations) =>
  migrations.map(({ name, sha256 }) => `-- ${sha256}  ${name}`).join('\n');

const renderFingerprintRows = (migrations) =>
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
  from local_wellness_upgrade_state as state
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

  update local_wellness_upgrade_state
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

const renderMigrationArtifact = (migrations) => {
  const finalFingerprint = migrations.at(-1).fingerprint.complete;

  return `-- Local Wellness current-session Supabase upgrade
--
-- Generated deterministically by:
--   pnpm database:current-session:generate
--
-- For an existing target confirmed complete through migration 38:
--   ${baselineMigration}
--
-- This one SQL Editor query detects and skips a complete migration 39-43
-- prefix, rejects partial or non-contiguous schema state, and executes only the
-- missing immutable source migrations in order. It does not modify Supabase's
-- migration ledger and does not load seed data. The whole query is atomic.
--
-- Exact source manifest (SHA-256 of source file bytes):
${renderManifest(migrations)}

begin;

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('local_wellness_current_session_upgrade_39_43', 0)
);

${helperSql}

do $verify_baseline$
begin
  if not (${baselineComplete}) then
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
${renderFingerprintRows(migrations)};

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

  detected_cutoff := coalesce(first_missing - 1, ${finalMigrationPosition});

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
      when detected_cutoff = ${firstMigrationPosition - 1} then ${sqlString(baselineMigration)}
      else (
        select fingerprint.migration_name
        from local_wellness_upgrade_fingerprints as fingerprint
        where fingerprint.migration_position = detected_cutoff
      )
    end
  );

  raise notice 'Local Wellness detected current-session cutoff: % of ${finalMigrationPosition}', detected_cutoff;
end;
$detect_state$;
${migrations.map(renderAdaptiveMigration).join('')}
do $verify_upgrade$
declare
  final_cutoff integer;
begin
  select state.cutoff_position
  into final_cutoff
  from local_wellness_upgrade_state as state
  where state.singleton;

  if final_cutoff <> ${finalMigrationPosition} or not (${finalFingerprint}) then
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
`;
};

const renderReadme = (migrationBytes) => `# Current-session Supabase upgrade

This compact SQL Editor artifact upgrades an existing Local Wellness Supabase
database that is already complete through
\`${baselineMigration}\` (migration 38).

Run [\`01_migrations_39_through_43.sql\`](./01_migrations_39_through_43.sql) once
in **Supabase Dashboard → SQL Editor → New query**. Paste the complete file and
select **Run**. It is ${migrationBytes.toLocaleString('en-US')} bytes, substantially
smaller than \`supabase/master.part-2.sql\`.

The query:

- holds a transaction advisory lock;
- detects a complete migration 39-43 prefix and skips it;
- rejects partial or non-contiguous schema state;
- executes the exact missing source migrations in order;
- verifies migration 43 and \`public.api_readiness_check()\` before commit;
- changes neither \`supabase_migrations.schema_migrations\` nor seed data.

It is safe to run again after a successful execution: all five migrations are
detected as complete and skipped. If the query reports a baseline, partial, or
non-contiguous-state error, stop and reconcile that drift. Use
\`supabase/master.part-1.sql\` followed by \`supabase/master.part-2.sql\` only
when their coherent-prefix checks are appropriate. Never edit the guards or add
broad \`IF NOT EXISTS\` clauses.

This file installs schema changes only. Run the separate BMC mobile demo bundle
under \`supabase/deploy/bmc-mobile-demo/\` afterward when the target also needs
the reviewed BMC category, ward, geometry, and routing seed data.

## Complaint-submission forward repair

After migrations 39–43 and the BMC bundle are present, run
[\`../../migrations/20260718100000_complaint_routing_evidence_diagnostics.sql\`](../../migrations/20260718100000_complaint_routing_evidence_diagnostics.sql)
in the SQL Editor. This focused 19 KB migration replaces a potentially stale hosted complaint
completion implementation, keeps the internal functions non-executable by clients, and preserves
strict evidence validation. Its \`CREATE OR REPLACE\` statements make a SQL Editor retry safe.

Then run
[\`../diagnostics/bmc_submission_runtime_audit.sql\`](../diagnostics/bmc_submission_runtime_audit.sql)
and confirm every runtime check reports \`passed = true\` before retrying a saved complaint. Running
the migration through the SQL Editor repairs runtime behavior but does not add a row to the
Supabase CLI migration ledger; a later CLI deployment may safely apply and record the same
idempotent forward repair.
`;

const loadMigrations = async () =>
  Promise.all(
    sourceMigrationNames.map(async (name, index) => {
      const path = join(migrationsDirectory, name);
      const sql = await readFile(path, 'utf8');
      const dynamicTag = `$migration_${name.replace(/\.sql$/u, '')}$`;

      if (/^(?:begin|commit|rollback);\s*$/imu.test(sql)) {
        throw new Error(`${name} contains transaction control and cannot be nested atomically.`);
      }
      if (sql.includes(dynamicTag)) {
        throw new Error(`${name} collides with its generated dynamic SQL delimiter.`);
      }

      return {
        fingerprint: fingerprintDefinitions.get(name),
        name,
        position: firstMigrationPosition + index,
        sha256: createHash('sha256').update(sql).digest('hex'),
        sql,
      };
    }),
  );

export const buildCurrentSessionSupabaseUpgradeArtifacts = async () => {
  const migrations = await loadMigrations();
  const migrationArtifact = renderMigrationArtifact(migrations);

  return new Map([
    [outputPaths.migration, migrationArtifact],
    [outputPaths.readme, renderReadme(Buffer.byteLength(migrationArtifact, 'utf8'))],
  ]);
};

const checkArtifacts = async (artifacts) => {
  const stale = [];
  for (const [path, expected] of artifacts) {
    const actual = await readFile(path, 'utf8').catch(() => null);
    if (actual !== expected) {
      stale.push(relative(repositoryRoot, path));
    }
  }

  if (stale.length > 0) {
    throw new Error(
      `${stale.join(', ')} missing or stale. Run \`pnpm database:current-session:generate\`.`,
    );
  }
};

const writeArtifacts = async (artifacts) => {
  for (const [path, contents] of artifacts) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf8');
  }
};

const main = async () => {
  const checkOnly = process.argv.includes('--check');
  const artifacts = await buildCurrentSessionSupabaseUpgradeArtifacts();

  if (checkOnly) {
    await checkArtifacts(artifacts);
  } else {
    await writeArtifacts(artifacts);
  }

  process.stdout.write(
    `${checkOnly ? 'Checked' : 'Generated'} current-session Supabase upgrade artifacts.\n`,
  );
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main();
}
