begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(55);

select ok(
  exists (select 1 from pg_catalog.pg_namespace where nspname = 'governance'),
  'governance schema exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_extension as extension
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = extension.extnamespace
    where extension.extname = 'postgis' and namespace.nspname = 'extensions'
  ),
  'PostGIS is installed in the extensions schema'
);

select has_table('governance', 'reference_sources', 'reference_sources table exists');
select has_table('governance', 'import_batches', 'import_batches table exists');
select has_table('governance', 'import_files', 'import_files table exists');
select has_table('governance', 'import_records', 'import_records table exists');
select has_table('governance', 'authorities', 'authorities table exists');
select has_table('governance', 'states', 'states table exists');
select has_table('governance', 'districts', 'districts table exists');
select has_table('governance', 'talukas', 'talukas table exists');
select has_table('governance', 'local_bodies', 'local_bodies table exists');
select has_table('governance', 'local_body_districts', 'local_body_districts table exists');
select has_table('governance', 'administrative_units', 'administrative_units table exists');
select has_table('governance', 'wards', 'wards table exists');
select has_table('governance', 'departments', 'departments table exists');
select has_table('governance', 'authority_departments', 'authority_departments table exists');
select has_table('governance', 'offices', 'offices table exists');
select has_table('governance', 'officer_roles', 'officer_roles table exists');
select has_table('governance', 'officers', 'officers table exists');
select has_table('governance', 'officer_assignments', 'officer_assignments table exists');
select has_table('governance', 'utilities', 'utilities table exists');
select has_table('governance', 'emergency_contacts', 'emergency_contacts table exists');
select has_table(
  'governance',
  'jurisdiction_boundary_versions',
  'jurisdiction_boundary_versions table exists'
);
select has_table(
  'governance',
  'complaint_routing_references',
  'complaint_routing_references table exists'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'governance'
      and relation.relkind = 'r'
      and relation.relrowsecurity
  ),
  38,
  'RLS is enabled on every governance and synchronization table'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'governance'
      and relation.relkind = 'r'
      and relation.relforcerowsecurity
  ),
  38,
  'RLS is forced on every governance and synchronization table'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where conname in (
      'authority_memberships_authority_id_fkey',
      'user_roles_authority_id_fkey',
      'auth_audit_events_authority_id_fkey'
    )
      and confrelid = 'governance.authorities'::regclass
      and confdeltype = 'r'
  ),
  3,
  'all Phase 1 authority columns have restrictive canonical foreign keys'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where conrelid in (
      'governance.states'::regclass,
      'governance.districts'::regclass,
      'governance.local_bodies'::regclass,
      'governance.utilities'::regclass
    )
      and contype = 'f'
      and confrelid = 'governance.authorities'::regclass
  ),
  4,
  'state, district, local-body, and utility records reference canonical authorities'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_attribute
    where attrelid in (
      'governance.states'::regclass,
      'governance.districts'::regclass,
      'governance.talukas'::regclass,
      'governance.local_bodies'::regclass,
      'governance.administrative_units'::regclass,
      'governance.wards'::regclass
    )
      and attname = 'lgd_code'
      and atttypid = 'text'::regtype
      and not attnotnull
  ),
  6,
  'LGD codes are nullable text so leading zeroes are preserved and placeholders become null'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_attribute
    where attrelid = 'governance.import_batches'::regclass
      and attname in ('manifest_sha256', 'workbook_sha256', 'generated_seed_sha256')
      and atttypid = 'text'::regtype
  ),
  3,
  'import batches preserve manifest, workbook, and generated-seed hashes'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_attribute
    where attrelid = 'governance.import_records'::regclass
      and attname in (
        'record_sha256',
        'normalization_disposition',
        'normalized_table',
        'normalized_record_id'
      )
  ),
  4,
  'import records preserve row hashes and normalization disposition targets'
);
select is(
  (
    select atttypid
    from pg_catalog.pg_attribute
    where attrelid = 'governance.import_records'::regclass and attname = 'raw_payload'
  ),
  'jsonb'::regtype::oid,
  'raw canonical records are retained as JSONB'
);
select is(
  (
    select pg_catalog.format_type(atttypid, atttypmod)
    from pg_catalog.pg_attribute
    where attrelid = 'governance.jurisdiction_boundary_versions'::regclass
      and attname = 'boundary'
  ),
  'geometry(MultiPolygon,4326)',
  'jurisdiction boundaries use WGS84 MultiPolygon geometry'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'governance.jurisdiction_boundary_versions'::regclass
      and conname = 'jurisdiction_boundaries_exactly_one_scope_check'
  ),
  'each boundary version has exactly one strongly referenced jurisdiction scope'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_index as index
    inner join pg_catalog.pg_class as index_relation on index_relation.oid = index.indexrelid
    inner join pg_catalog.pg_am as access_method on access_method.oid = index_relation.relam
    where index.indexrelid = 'governance.jurisdiction_boundary_versions_boundary_gix'::regclass
      and access_method.amname = 'gist'
  ),
  'boundary versions have a GiST spatial index'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as index_relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = index_relation.relnamespace
    where namespace.nspname = 'governance'
      and index_relation.relname in (
        'jurisdiction_boundaries_one_current_state_idx',
        'jurisdiction_boundaries_one_current_district_idx',
        'jurisdiction_boundaries_one_current_taluka_idx',
        'jurisdiction_boundaries_one_current_local_body_idx',
        'jurisdiction_boundaries_one_current_ward_idx'
      )
  ),
  5,
  'each jurisdiction kind has a current-active version index'
);
select ok(
  (
    select pg_catalog.pg_get_indexdef(indexrelid)
    from pg_catalog.pg_index
    where indexrelid = 'governance.complaint_routing_references_one_current_idx'::regclass
  ) like '%status = ''active''%',
  'routing-reference current uniqueness applies only to active versions'
);
select has_index(
  'governance',
  'officer_assignments',
  'officer_assignments_one_current_idx',
  'officer assignments have a current-version uniqueness index'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'governance.authorities'::regclass
      and conname = 'authorities_placeholder_check'
  ),
  'verified authorities cannot be marked as placeholders'
);
select ok(
  not has_table_privilege('service_role', 'governance.officer_assignments', 'delete')
    and not has_table_privilege(
      'service_role',
      'governance.jurisdiction_boundary_versions',
      'delete'
    )
    and not has_table_privilege(
      'service_role',
      'governance.complaint_routing_references',
      'delete'
    ),
  'service role cannot delete version history'
);
select ok(
  not has_table_privilege('authenticated', 'governance.authorities', 'insert')
    and not has_table_privilege('authenticated', 'governance.authorities', 'update')
    and not has_table_privilege('authenticated', 'governance.authorities', 'delete'),
  'authenticated clients cannot mutate governance authorities'
);
select ok(
  not has_table_privilege('anon', 'governance.authorities', 'select')
    and not has_schema_privilege('anon', 'governance', 'usage'),
  'anonymous clients have no governance access'
);
select ok(
  has_table_privilege('service_role', 'governance.authorities', 'select')
    and has_table_privilege('service_role', 'governance.authorities', 'insert')
    and has_table_privilege('service_role', 'governance.authorities', 'update'),
  'service role has explicit non-destructive governance DML'
);
select ok(
  has_table_privilege('authenticated', 'governance.authorities', 'select')
    and has_table_privilege('authenticated', 'governance.emergency_contacts', 'select'),
  'authenticated reads are grantable only through governance RLS'
);
select ok(
  has_function_privilege(
    'service_role',
    'governance.resolve_jurisdiction(double precision,double precision,timestamptz)',
    'execute'
  ),
  'service role may execute jurisdiction resolution'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'governance.resolve_jurisdiction(double precision,double precision,timestamptz)',
    'execute'
  ),
  'authenticated clients cannot execute service-side jurisdiction resolution directly'
);
select is(
  (
    select count(*)::integer from pg_catalog.pg_trigger
    where tgrelid in (
      'governance.officer_assignments'::regclass,
      'governance.jurisdiction_boundary_versions'::regclass,
      'governance.complaint_routing_references'::regclass
    )
      and tgname like '%guard_update'
      and not tgisinternal
  ),
  3,
  'all versioned tables reject in-place content rewrites'
);
select is(
  (
    select count(*)::integer from pg_catalog.pg_trigger
    where tgrelid in (
      'governance.import_batches'::regclass,
      'governance.import_files'::regclass,
      'governance.import_records'::regclass,
      'governance.officer_assignments'::regclass,
      'governance.jurisdiction_boundary_versions'::regclass,
      'governance.complaint_routing_references'::regclass
    )
      and tgname like '%reject_delete'
      and not tgisinternal
  ),
  6,
  'import ledgers and version histories reject hard deletion'
);
select is(
  (
    select count(*)::integer from pg_catalog.pg_trigger
    where tgrelid in (
      'governance.import_batches'::regclass,
      'governance.import_files'::regclass,
      'governance.import_records'::regclass
    )
      and tgname in (
        'import_batches_guard_update',
        'import_files_reject_update',
        'import_records_reject_update'
      )
      and not tgisinternal
  ),
  3,
  'import provenance has immutable or monotonic update guards'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.user_roles'::regclass
      and tgname = 'user_roles_validate_governance_scope'
      and not tgisinternal
  ),
  'Phase 1 role scopes are checked against canonical governance entities'
);
select ok(
  pg_catalog.pg_get_functiondef(
    'private.user_has_active_role(uuid,text,text,uuid)'::regprocedure
  ) like '%private.is_active_governance_authority%',
  'scoped authorization checks use the canonical active-authority lifecycle helper'
);
select ok(
  to_regclass('governance.local_bodies_state_type_name_unique_idx') is null,
  'local-body names are not incorrectly unique across different districts'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'governance.emergency_contacts'::regclass
      and attname = 'contact_value'
      and not attnotnull
  ),
  'placeholder emergency frameworks may retain a null normalized contact'
);
select ok(
  not exists (
    select 1
    from (
      select authority_id from public.authority_memberships
      union all
      select authority_id from public.user_roles where authority_id is not null
      union all
      select authority_id from public.auth_audit_events where authority_id is not null
    ) as authority_reference
    left join governance.authorities as authority on authority.id = authority_reference.authority_id
    where authority.id is null
  ),
  'the forward fix leaves no orphaned Phase 1 authority references'
);
select ok(
  not exists (
    select 1 from governance.authorities
    where code like 'LEGACY\_%' escape '\'
      and not (
        authority_type = 'other'
        and verification_status = 'placeholder'
        and is_placeholder
        and not is_routing_eligible
      )
  ),
  'legacy authority identifiers remain clearly marked, non-routable placeholders'
);

select * from finish();
rollback;
