begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(13);

select ok(
  to_regprocedure('public.report_routing_confidence_policy_conflicts()') is not null,
  'routing confidence-policy conflict report exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.report_routing_confidence_policy_conflicts()',
    'execute'
  ),
  'service role can execute the configuration report'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.report_routing_confidence_policy_conflicts()',
    'execute'
  ),
  'anonymous clients cannot inspect routing configuration'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.report_routing_confidence_policy_conflicts()',
    'execute'
  ),
  'authenticated clients cannot inspect routing configuration'
);
select is(
  (select count(*)::integer from public.report_routing_confidence_policy_conflicts()),
  0,
  'the non-routable bootstrap configuration has no operational conflicts'
);

insert into governance.reference_sources (
  id, title, url, source_type, last_checked_on
)
values (
  'a2000000-0000-4000-8000-000000000001',
  'Synthetic routing configuration validation fixture',
  'https://example.test/routing-configuration-validation',
  'official',
  date '2026-07-14'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a2010000-0000-4000-8000-000000000001', null,
    'CONFIG_TEST_STATE', 'Configuration Test State', 'state',
    'verified', true, date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2010000-0000-4000-8000-000000000002',
    'a2010000-0000-4000-8000-000000000001',
    'CONFIG_TEST_BODY_A', 'Configuration Test Body A', 'local_body',
    'verified', true, date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2010000-0000-4000-8000-000000000003',
    'a2010000-0000-4000-8000-000000000001',
    'CONFIG_TEST_BODY_B', 'Configuration Test Body B', 'local_body',
    'verified', true, date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'a2020000-0000-4000-8000-000000000001',
  'a2010000-0000-4000-8000-000000000001',
  'Configuration Test State', 'CT', 'verified', true,
  date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a2030000-0000-4000-8000-000000000001',
    'a2010000-0000-4000-8000-000000000002',
    'a2020000-0000-4000-8000-000000000001',
    'Configuration Test Body A', 'municipal_corporation', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2030000-0000-4000-8000-000000000002',
    'a2010000-0000-4000-8000-000000000003',
    'a2020000-0000-4000-8000-000000000001',
    'Configuration Test Body B', 'municipal_corporation', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into governance.wards (
  id, local_body_id, source_ward_code, name, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a2040000-0000-4000-8000-000000000001',
    'a2030000-0000-4000-8000-000000000001',
    'CONFIG-WARD-A', 'Configuration Test Ward A', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2040000-0000-4000-8000-000000000002',
    'a2030000-0000-4000-8000-000000000002',
    'CONFIG-WARD-B', 'Configuration Test Ward B', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'a2050000-0000-4000-8000-000000000001',
  'config_validation', 'Configuration Validation', 'verified', true,
  date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
);

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'a2060000-0000-4000-8000-000000000001',
  'config_reviewer', 'Configuration Reviewer', 'verified', true,
  date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'a2070000-0000-4000-8000-000000000001',
  'configuration_validation', 'Configuration Validation', 'active', 'verified', true,
  date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'a2080000-0000-4000-8000-000000000001',
    'a2070000-0000-4000-8000-000000000001',
    'config_same_policy', 'Configuration Same Policy', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2080000-0000-4000-8000-000000000002',
    'a2070000-0000-4000-8000-000000000001',
    'config_conflict', 'Configuration Conflict', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2080000-0000-4000-8000-000000000003',
    'a2070000-0000-4000-8000-000000000001',
    'config_disjoint_time', 'Configuration Disjoint Time', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2080000-0000-4000-8000-000000000004',
    'a2070000-0000-4000-8000-000000000001',
    'config_disjoint_scope', 'Configuration Disjoint Scope', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2080000-0000-4000-8000-000000000005',
    'a2070000-0000-4000-8000-000000000001',
    'config_disjoint_asset', 'Configuration Disjoint Asset', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into routing.asset_types (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'a2090000-0000-4000-8000-000000000001',
    'config_asset_a', 'Configuration Asset A', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a2090000-0000-4000-8000-000000000002',
    'config_asset_b', 'Configuration Asset B', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into routing.assets (
  id, asset_type_id, asset_key, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'a20a0000-0000-4000-8000-000000000001',
    'a2090000-0000-4000-8000-000000000001', 'config:asset:a',
    'active', 'verified', true, date '2026-07-14',
    'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20a0000-0000-4000-8000-000000000002',
    'a2090000-0000-4000-8000-000000000002', 'config:asset:b',
    'active', 'verified', true, date '2026-07-14',
    'a2000000-0000-4000-8000-000000000001'
  );

insert into routing.confidence_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'a20b0000-0000-4000-8000-000000000001',
    'config_policy_a', 'Configuration Policy A', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20b0000-0000-4000-8000-000000000002',
    'config_policy_b', 'Configuration Policy B', 'active', 'verified', true,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into routing.confidence_policy_versions (
  id, confidence_policy_id, version, automatic_threshold, manual_review_threshold,
  ambiguity_delta, fallback_penalty_per_level, factors, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values
  (
    'a20c0000-0000-4000-8000-000000000001',
    'a20b0000-0000-4000-8000-000000000001', 1, 0.8, 0.5, 0.05, 0.1,
    '[{"code":"base_match","weight":1,"required":true}]'::jsonb,
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20c0000-0000-4000-8000-000000000002',
    'a20b0000-0000-4000-8000-000000000002', 1, 0.75, 0.45, 0.04, 0.1,
    '[{"code":"base_match","weight":1,"required":true}]'::jsonb,
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

insert into routing.route_rules (
  id, category_id, rule_code, name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
select
  rule.id,
  rule.category_id,
  rule.rule_code,
  rule.name,
  'active',
  'verified',
  true,
  date '2026-07-14',
  'a2000000-0000-4000-8000-000000000001'::uuid
from (
  values
    ('a20d0000-0000-4000-8000-000000000001'::uuid, 'a2080000-0000-4000-8000-000000000001'::uuid, 'CONFIG_SAME_A', 'Configuration Same A'),
    ('a20d0000-0000-4000-8000-000000000002'::uuid, 'a2080000-0000-4000-8000-000000000001'::uuid, 'CONFIG_SAME_B', 'Configuration Same B'),
    ('a20d0000-0000-4000-8000-000000000003'::uuid, 'a2080000-0000-4000-8000-000000000002'::uuid, 'CONFIG_CONFLICT_A', 'Configuration Conflict A'),
    ('a20d0000-0000-4000-8000-000000000004'::uuid, 'a2080000-0000-4000-8000-000000000002'::uuid, 'CONFIG_CONFLICT_B', 'Configuration Conflict B'),
    ('a20d0000-0000-4000-8000-000000000005'::uuid, 'a2080000-0000-4000-8000-000000000003'::uuid, 'CONFIG_TIME_A', 'Configuration Time A'),
    ('a20d0000-0000-4000-8000-000000000006'::uuid, 'a2080000-0000-4000-8000-000000000003'::uuid, 'CONFIG_TIME_B', 'Configuration Time B'),
    ('a20d0000-0000-4000-8000-000000000007'::uuid, 'a2080000-0000-4000-8000-000000000004'::uuid, 'CONFIG_SCOPE_A', 'Configuration Scope A'),
    ('a20d0000-0000-4000-8000-000000000008'::uuid, 'a2080000-0000-4000-8000-000000000004'::uuid, 'CONFIG_SCOPE_B', 'Configuration Scope B'),
    ('a20d0000-0000-4000-8000-000000000009'::uuid, 'a2080000-0000-4000-8000-000000000005'::uuid, 'CONFIG_ASSET_A', 'Configuration Asset A'),
    ('a20d0000-0000-4000-8000-00000000000a'::uuid, 'a2080000-0000-4000-8000-000000000005'::uuid, 'CONFIG_ASSET_B', 'Configuration Asset B')
) as rule(id, category_id, rule_code, name);

insert into routing.route_rule_versions (
  id, route_rule_id, version, scope_authority_id, scope_local_body_id, scope_ward_id,
  asset_type_id, asset_id, target_department_id, target_officer_role_id,
  confidence_policy_version_id, asset_requirement, confidence_factor_codes,
  explanation_code, status, verification_status, is_routing_eligible,
  effective_from, effective_to, last_verified_on, reference_source_id
)
values
  (
    'a20e0000-0000-4000-8000-000000000001',
    'a20d0000-0000-4000-8000-000000000001', 1,
    null, null, null, null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'none', array['base_match'],
    'config_same_a', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000002',
    'a20d0000-0000-4000-8000-000000000002', 1,
    null, null, null, null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'none', array['base_match'],
    'config_same_b', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000003',
    'a20d0000-0000-4000-8000-000000000003', 1,
    null, null, null, null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'none', array['base_match'],
    'config_conflict_a', 'active', 'verified', true,
    timestamptz '2026-02-01 00:00:00+00', timestamptz '2026-12-01 00:00:00+00',
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000004',
    'a20d0000-0000-4000-8000-000000000004', 1,
    'a2010000-0000-4000-8000-000000000002',
    'a2030000-0000-4000-8000-000000000001',
    'a2040000-0000-4000-8000-000000000001',
    'a2090000-0000-4000-8000-000000000001',
    'a20a0000-0000-4000-8000-000000000001',
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000002', 'preferred', array['base_match'],
    'config_conflict_b', 'active', 'verified', true,
    timestamptz '2026-03-01 00:00:00+00', timestamptz '2027-01-01 00:00:00+00',
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000005',
    'a20d0000-0000-4000-8000-000000000005', 1,
    null, null, null, null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'none', array['base_match'],
    'config_time_a', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', timestamptz '2026-06-01 00:00:00+00',
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000006',
    'a20d0000-0000-4000-8000-000000000006', 1,
    null, null, null, null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000002', 'none', array['base_match'],
    'config_time_b', 'active', 'verified', true,
    timestamptz '2026-06-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000007',
    'a20d0000-0000-4000-8000-000000000007', 1,
    'a2010000-0000-4000-8000-000000000002',
    'a2030000-0000-4000-8000-000000000001',
    'a2040000-0000-4000-8000-000000000001',
    null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'none', array['base_match'],
    'config_scope_a', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000008',
    'a20d0000-0000-4000-8000-000000000008', 1,
    'a2010000-0000-4000-8000-000000000003',
    'a2030000-0000-4000-8000-000000000002',
    'a2040000-0000-4000-8000-000000000002',
    null, null,
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000002', 'none', array['base_match'],
    'config_scope_b', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-000000000009',
    'a20d0000-0000-4000-8000-000000000009', 1,
    null, null, null,
    'a2090000-0000-4000-8000-000000000001',
    'a20a0000-0000-4000-8000-000000000001',
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000001', 'preferred', array['base_match'],
    'config_asset_a', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  ),
  (
    'a20e0000-0000-4000-8000-00000000000a',
    'a20d0000-0000-4000-8000-00000000000a', 1,
    null, null, null,
    'a2090000-0000-4000-8000-000000000002',
    'a20a0000-0000-4000-8000-000000000002',
    'a2050000-0000-4000-8000-000000000001',
    'a2060000-0000-4000-8000-000000000001',
    'a20c0000-0000-4000-8000-000000000002', 'preferred', array['base_match'],
    'config_asset_b', 'active', 'verified', true,
    timestamptz '2026-01-01 00:00:00+00', null,
    date '2026-07-14', 'a2000000-0000-4000-8000-000000000001'
  );

select is(
  (select count(*)::integer from public.report_routing_confidence_policy_conflicts()),
  1,
  'exactly one conflicting operational context is reported'
);
select is(
  (
    select count(*)::integer
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000002'
  ),
  1,
  'an overlapping global and authority/local-body/ward/asset-specific pair is detected'
);
select is(
  (
    select count(*)::integer
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000001'
  ),
  0,
  'simultaneously applicable rules using the same policy version are not conflicts'
);
select results_eq(
  $$
    select
      left_confidence_policy_version_id,
      right_confidence_policy_version_id,
      conflict_effective_from,
      conflict_effective_to
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000002'
  $$,
  $$
    values (
      'a20c0000-0000-4000-8000-000000000001'::uuid,
      'a20c0000-0000-4000-8000-000000000002'::uuid,
      timestamptz '2026-03-01 00:00:00+00',
      timestamptz '2026-12-01 00:00:00+00'
    )
  $$,
  'the report identifies both policy versions and their exact effective overlap'
);
select is(
  (
    select count(*)::integer
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000003'
  ),
  0,
  'adjacent half-open effective periods are disjoint'
);
select is(
  (
    select count(*)::integer
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000004'
  ),
  0,
  'different authority, local-body, and ward scopes are disjoint'
);
select is(
  (
    select count(*)::integer
    from public.report_routing_confidence_policy_conflicts()
    where category_id = 'a2080000-0000-4000-8000-000000000005'
  ),
  0,
  'different asset identities and types are disjoint'
);
select ok(
  not exists (
    select 1
    from public.report_routing_confidence_policy_conflicts()
    where left_confidence_policy_version_id = right_confidence_policy_version_id
  ),
  'the report never labels a shared policy version as a conflict'
);

select * from finish();
rollback;
