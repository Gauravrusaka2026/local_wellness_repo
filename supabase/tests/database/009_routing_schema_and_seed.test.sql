begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(41);

select ok(
  exists (select 1 from pg_catalog.pg_namespace where nspname = 'routing'),
  'private routing schema exists'
);
select has_table('routing', 'issue_domains', 'issue domains exist');
select has_table('routing', 'issue_categories', 'issue categories exist');
select has_table('routing', 'category_aliases', 'category aliases exist');
select has_table('routing', 'asset_types', 'asset types exist');
select has_table('routing', 'category_asset_types', 'category-to-asset requirements exist');
select has_table('routing', 'assets', 'stable assets exist');
select has_table('routing', 'asset_versions', 'spatial asset versions exist');
select has_table('routing', 'asset_ownership_versions', 'versioned asset ownership exists');
select has_table('routing', 'confidence_policies', 'stable confidence policies exist');
select has_table('routing', 'confidence_policy_versions', 'confidence policy versions exist');
select has_table('routing', 'duplicate_detection_policies', 'duplicate policy identities exist');
select has_table(
  'routing',
  'duplicate_detection_policy_versions',
  'duplicate policy versions exist'
);
select has_table('routing', 'route_rules', 'stable routing rules exist');
select has_table('routing', 'route_rule_versions', 'routing rule versions exist');
select has_table('routing', 'routing_decisions', 'append-only routing decision audit exists');

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'routing'
      and relation.relkind = 'r'
      and relation.relrowsecurity
  ),
  17,
  'RLS is enabled on every routing table'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'routing'
      and relation.relkind = 'r'
      and relation.relforcerowsecurity
  ),
  17,
  'RLS is forced on every routing table'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'governance'
      and relation.relname in (
        'source_endpoints',
        'sync_runs',
        'raw_snapshots',
        'sync_run_snapshots',
        'sync_candidates',
        'sync_change_items',
        'sync_review_items',
        'sync_review_events',
        'sync_source_leases',
        'sync_events',
        'source_evidence',
        'contact_channels',
        'contact_channel_versions',
        'sync_scope_targets'
      )
  ),
  0,
  'deferred governance synchronization and contact tables are physically absent'
);
select ok(
  to_regprocedure('private.v1_deferred_subsystems_pruned()') is not null,
  'the adaptive master bundle records the V1 physical prune'
);

select ok(
  to_regprocedure(
    'public.resolve_jurisdiction_context(double precision,double precision,double precision,timestamp with time zone)'
  ) is not null,
  'accuracy-aware jurisdiction RPC exists'
);
select ok(
  to_regprocedure(
    'public.resolve_routing_candidates(double precision,double precision,double precision,uuid,uuid,timestamp with time zone)'
  ) is not null,
  'data-driven candidate RPC exists'
);
select ok(
  to_regprocedure(
    'public.record_routing_decision(uuid,text,double precision,double precision,double precision,timestamp with time zone,timestamp with time zone,uuid,text,numeric,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,double precision,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,smallint,text[],jsonb,smallint)'
  ) is not null,
  'routing decision audit RPC exists'
);
select ok(
  to_regprocedure(
    'public.resolve_routing_policy_context(uuid,uuid,uuid,timestamp with time zone)'
  ) is not null,
  'asset-independent routing policy context RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.resolve_jurisdiction_context(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  ),
  'anonymous clients cannot resolve internal jurisdiction evidence directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_routing_candidates(double precision,double precision,double precision,uuid,uuid,timestamp with time zone)',
    'execute'
  ),
  'authenticated clients cannot invoke routing candidates directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_routing_policy_context(uuid,uuid,uuid,timestamp with time zone)',
    'execute'
  ),
  'authenticated clients cannot invoke routing policy context directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_jurisdiction_context(double precision,double precision,double precision,timestamp with time zone)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.resolve_routing_candidates(double precision,double precision,double precision,uuid,uuid,timestamp with time zone)',
    'execute'
  ),
  'only the service boundary receives routing resolver execution'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_routing_policy_context(uuid,uuid,uuid,timestamp with time zone)',
    'execute'
  ),
  'the service boundary can load policy context without a candidate row'
);

select is(
  (select count(*)::integer from routing.issue_categories),
  370,
  'thirteen operational profiles and the complete JagrukSetu taxonomy are seeded'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
      and not requires_asset
  ),
  13,
  'all V1 profiles are enabled for the owner-approved ward route'
);
select is(
  (
    select count(*)::integer
    from routing.category_aliases as alias
    inner join routing.issue_categories as category on category.id = alias.category_id
    inner join governance.complaint_routing_references as reference
      on reference.id = alias.source_routing_reference_id
    where category.code = 'blocked_drain'
      and alias.alias_key = 'storm_water_blockage'
      and reference.issue_name = 'Storm-water blockage'
      and alias.verification_status = 'unverified'
      and not alias.is_routing_eligible
  ),
  1,
  'Blocked drain retains an explicit non-operational bootstrap alias'
);
select is(
  (select count(*)::integer from public.list_routing_categories(true)),
  13,
  'service callers can explicitly inspect all engineering categories'
);
select is(
  (select count(*)::integer from public.list_routing_categories(false)),
  13,
  'operational category lookup returns all V1 ward-routable categories'
);
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'governance-raw-snapshots' and not public
  ),
  'the retired raw-snapshot bucket stays private until removed through the Storage API'
);
select ok(
  to_regclass('complaints.complaint_comments') is null,
  'unused public comments are physically absent'
);
select ok(
  to_regprocedure('public.claim_due_governance_sync_sources(text,integer,integer)') is null,
  'the retired synchronization claim RPC is absent'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_index
    where indexrelid = 'routing.asset_versions_geography_gix'::regclass
  )
  and exists (
    select 1 from pg_catalog.pg_index
    where indexrelid = 'governance.jurisdiction_boundary_versions_geography_gix'::regclass
  ),
  'asset and jurisdiction radius queries have geography GiST indexes'
);
select ok(
  not has_table_privilege('service_role', 'routing.routing_decisions', 'delete'),
  'service operations cannot delete routing history'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_attribute
    where attrelid = 'routing.routing_decisions'::regclass
      and attname in (
        'actor_user_id',
        'accuracy_meters',
        'captured_at',
        'explanation_metadata',
        'input_location',
        'state_id',
        'district_id',
        'taluka_id',
        'local_body_id',
        'ward_id',
        'state_boundary_version_id',
        'district_boundary_version_id',
        'taluka_boundary_version_id',
        'local_body_boundary_version_id',
        'ward_boundary_version_id',
        'asset_version_id',
        'asset_match_distance_meters'
      )
      and not attisdropped
  ),
  17,
  'routing audit preserves actor, exact geographic versions, asset matching, and location evidence'
);
select has_trigger(
  'routing',
  'route_rules',
  'route_rules_guard_durable_identity',
  'stable route-rule category identity is guarded'
);

select * from finish();
rollback;
