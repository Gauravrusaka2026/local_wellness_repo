begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(38);

insert into governance.reference_sources (
  id,
  title,
  url,
  source_type,
  purpose,
  last_checked_on,
  status
)
values (
  '60000000-0000-4000-8000-000000000001',
  'Phase 2 RLS fixture source',
  'https://example.test/phase-2-governance-rls',
  'official',
  'Transaction-local governance RLS fixtures',
  current_date,
  'active'
);

insert into governance.authorities (
  id,
  parent_authority_id,
  code,
  name,
  authority_type,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values
  (
    '60000000-0000-4000-8000-000000000010',
    null,
    'RLS_TEST_STATE',
    'RLS Test State',
    'state',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000011',
    '60000000-0000-4000-8000-000000000010',
    'RLS_TEST_LOCAL_BODY_A',
    'RLS Test Local Body A',
    'local_body',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000012',
    '60000000-0000-4000-8000-000000000010',
    'RLS_TEST_LOCAL_BODY_B',
    'RLS Test Local Body B',
    'local_body',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000013',
    '60000000-0000-4000-8000-000000000010',
    'RLS_TEST_PLACEHOLDER',
    'RLS Test Placeholder Local Body',
    'local_body',
    'active',
    'placeholder',
    true,
    false,
    null,
    null
  ),
  (
    '60000000-0000-4000-8000-000000000014',
    '60000000-0000-4000-8000-000000000010',
    'RLS_TEST_INACTIVE',
    'RLS Test Inactive Local Body',
    'local_body',
    'inactive',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id,
  authority_id,
  name,
  iso_code,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values (
  '60000000-0000-4000-8000-000000000020',
  '60000000-0000-4000-8000-000000000010',
  'RLS Test State',
  'QZ',
  'active',
  'verified',
  false,
  false,
  current_date,
  '60000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id,
  authority_id,
  state_id,
  name,
  body_type,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values
  (
    '60000000-0000-4000-8000-000000000021',
    '60000000-0000-4000-8000-000000000011',
    '60000000-0000-4000-8000-000000000020',
    'RLS Test Local Body A',
    'municipal_corporation',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000022',
    '60000000-0000-4000-8000-000000000012',
    '60000000-0000-4000-8000-000000000020',
    'RLS Test Local Body B',
    'municipal_corporation',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000023',
    '60000000-0000-4000-8000-000000000013',
    '60000000-0000-4000-8000-000000000020',
    'RLS Test Placeholder Local Body',
    'municipal_corporation',
    'active',
    'placeholder',
    true,
    false,
    null,
    null
  );

insert into governance.offices (
  id,
  authority_id,
  name,
  office_type,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible
)
values
  (
    '60000000-0000-4000-8000-000000000031',
    '60000000-0000-4000-8000-000000000011',
    'RLS Test Authority A Review Office',
    'review_fixture',
    'active',
    'unverified',
    false,
    false
  ),
  (
    '60000000-0000-4000-8000-000000000032',
    '60000000-0000-4000-8000-000000000012',
    'RLS Test Authority B Review Office',
    'review_fixture',
    'active',
    'unverified',
    false,
    false
  );

insert into governance.emergency_contacts (
  id,
  authority_id,
  state_id,
  local_body_id,
  service_name,
  issue_type,
  jurisdiction_description,
  contact_type,
  contact_value,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values
  (
    '60000000-0000-4000-8000-000000000041',
    '60000000-0000-4000-8000-000000000010',
    '60000000-0000-4000-8000-000000000020',
    null,
    'RLS Test Verified Emergency Service',
    'Verified fixture emergency',
    'RLS Test State',
    'helpline',
    '112',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000042',
    null,
    '60000000-0000-4000-8000-000000000020',
    null,
    'RLS Test Placeholder Emergency Service',
    'Placeholder fixture emergency',
    'RLS Test State',
    'helpline',
    null,
    'active',
    'placeholder',
    true,
    false,
    null,
    null
  ),
  (
    '60000000-0000-4000-8000-000000000043',
    '60000000-0000-4000-8000-000000000013',
    '60000000-0000-4000-8000-000000000020',
    '60000000-0000-4000-8000-000000000023',
    'RLS Test Child Of Placeholder Authority',
    'Parent visibility fixture emergency',
    'RLS Test Placeholder Local Body',
    'helpline',
    '999',
    'active',
    'verified',
    false,
    false,
    current_date,
    '60000000-0000-4000-8000-000000000001'
  );

insert into governance.import_batches (
  id,
  dataset_key,
  dataset_version,
  canonical_root,
  manifest_sha256,
  workbook_sha256,
  status,
  validation_summary,
  started_at,
  completed_at
)
values (
  '60000000-0000-4000-8000-000000000050',
  'rls_test',
  'transaction-fixture-v1',
  'supabase/tests/database/006_governance_rls.test.sql',
  repeat('a', 64),
  repeat('b', 64),
  'imported',
  '{"fixture":true}'::jsonb,
  current_timestamp - interval '1 minute',
  current_timestamp
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'governance.citizen@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Governance Citizen"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'governance.admin.a@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Governance Admin A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'governance.platform@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Governance Platform Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'governance.legacy.ward@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Legacy Ward Scope"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'governance.legacy.department@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Legacy Department Scope"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'governance.inactive.authority@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Inactive Authority Scope"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'governance.placeholder.authority@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Placeholder Authority Scope"}', now(), now());

insert into public.authority_memberships (
  user_id,
  authority_id,
  invitation_email,
  status,
  effective_from,
  invited_by,
  approved_by,
  approved_at
)
values
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000011', 'governance.admin.a@example.test', 'active', current_timestamp - interval '1 day', '61000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', current_timestamp - interval '1 day'),
  ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000011', 'governance.legacy.ward@example.test', 'active', current_timestamp - interval '1 day', '61000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', current_timestamp - interval '1 day'),
  ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000011', 'governance.legacy.department@example.test', 'active', current_timestamp - interval '1 day', '61000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', current_timestamp - interval '1 day'),
  ('61000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000014', 'governance.inactive.authority@example.test', 'active', current_timestamp - interval '1 day', '61000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', current_timestamp - interval '1 day'),
  ('61000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000013', 'governance.placeholder.authority@example.test', 'active', current_timestamp - interval '1 day', '61000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', current_timestamp - interval '1 day');

insert into public.user_roles (
  user_id,
  role_id,
  authority_id,
  scope_type,
  scope_id,
  effective_from,
  status,
  granted_by
)
values
  (
    '61000000-0000-4000-8000-000000000002',
    (select id from public.roles where code = 'municipal_admin'),
    '60000000-0000-4000-8000-000000000011',
    'authority',
    '60000000-0000-4000-8000-000000000011',
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000002'
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    (select id from public.roles where code = 'platform_admin'),
    null,
    'global',
    null,
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000003'
  );

-- These rows model Phase 1 data that predates the governance scope trigger.
set local session_replication_role = replica;
insert into public.user_roles (
  user_id,
  role_id,
  authority_id,
  scope_type,
  scope_id,
  effective_from,
  status,
  granted_by
)
values
  (
    '61000000-0000-4000-8000-000000000004',
    (select id from public.roles where code = 'ward_officer'),
    '60000000-0000-4000-8000-000000000011',
    'ward',
    '60000000-0000-4000-8000-000000000091',
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000002'
  ),
  (
    '61000000-0000-4000-8000-000000000005',
    (select id from public.roles where code = 'department_officer'),
    '60000000-0000-4000-8000-000000000011',
    'department',
    '60000000-0000-4000-8000-000000000092',
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000002'
  ),
  (
    '61000000-0000-4000-8000-000000000006',
    (select id from public.roles where code = 'municipal_admin'),
    '60000000-0000-4000-8000-000000000014',
    'authority',
    '60000000-0000-4000-8000-000000000014',
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000003'
  ),
  (
    '61000000-0000-4000-8000-000000000007',
    (select id from public.roles where code = 'municipal_admin'),
    '60000000-0000-4000-8000-000000000013',
    'authority',
    '60000000-0000-4000-8000-000000000013',
    current_timestamp - interval '1 day',
    'active',
    '61000000-0000-4000-8000-000000000003'
  );
set local session_replication_role = origin;

select ok(
  not has_function_privilege(
    'anon',
    'private.is_verified_governance_authority(uuid)',
    'execute'
  )
    and has_function_privilege(
      'authenticated',
      'private.is_verified_governance_authority(uuid)',
      'execute'
    )
    and has_function_privilege(
      'service_role',
      'private.is_verified_governance_authority(uuid)',
      'execute'
    ),
  'the verified-authority policy helper is callable only by trusted database roles'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_active_user_roles(uuid,timestamptz)',
    'execute'
  )
    and not has_function_privilege(
      'authenticated',
      'public.get_active_user_roles(uuid,timestamptz)',
      'execute'
    )
    and has_function_privilege(
      'service_role',
      'public.get_active_user_roles(uuid,timestamptz)',
      'execute'
    ),
  'only the service role can execute the effective-role RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_active_authority_memberships(uuid,timestamptz)',
    'execute'
  )
    and not has_function_privilege(
      'authenticated',
      'public.get_active_authority_memberships(uuid,timestamptz)',
      'execute'
    )
    and has_function_privilege(
      'service_role',
      'public.get_active_authority_memberships(uuid,timestamptz)',
      'execute'
    ),
  'only the service role can execute the effective-membership RPC'
);

set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok(
  $$select count(*) from governance.authorities$$,
  '42501',
  'permission denied for schema governance',
  'anonymous users cannot read the governance schema'
);
select throws_ok(
  $$select count(*) from public.get_active_user_roles('61000000-0000-4000-8000-000000000002', current_timestamp)$$,
  '42501',
  'permission denied for function get_active_user_roles',
  'anonymous users cannot execute the effective-role RPC'
);
select throws_ok(
  $$select count(*) from public.get_active_authority_memberships('61000000-0000-4000-8000-000000000002', current_timestamp)$$,
  '42501',
  'permission denied for function get_active_authority_memberships',
  'anonymous users cannot execute the effective-membership RPC'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"61000000-0000-4000-8000-000000000001"}';
set local role authenticated;
select is(
  (select count(*)::integer from governance.authorities where id = '60000000-0000-4000-8000-000000000011'),
  1,
  'an authenticated user can read a verified active authority'
);
select is(
  (select count(*)::integer from governance.authorities where id = '60000000-0000-4000-8000-000000000013'),
  0,
  'an authenticated user cannot read a placeholder authority'
);
select is(
  (select count(*)::integer from governance.local_bodies where id = '60000000-0000-4000-8000-000000000021'),
  1,
  'an authenticated user can read a verified active local body'
);
select is(
  (select count(*)::integer from governance.local_bodies where id = '60000000-0000-4000-8000-000000000023'),
  0,
  'an authenticated user cannot read a placeholder local body'
);
select is(
  (select count(*)::integer from governance.emergency_contacts where id = '60000000-0000-4000-8000-000000000041'),
  1,
  'an authenticated user can read a verified emergency contact'
);
select is(
  (select count(*)::integer from governance.emergency_contacts where id = '60000000-0000-4000-8000-000000000042'),
  0,
  'an authenticated user cannot read a placeholder emergency contact'
);
select is(
  (select count(*)::integer from governance.emergency_contacts where id = '60000000-0000-4000-8000-000000000043'),
  0,
  'a verified child contact is hidden when its owning authority is a placeholder'
);
select is(
  (select count(*)::integer from governance.import_batches where id = '60000000-0000-4000-8000-000000000050'),
  0,
  'a regular authenticated user cannot read import-ledger data'
);
select throws_ok(
  $$insert into governance.authorities (code, name, authority_type) values ('RLS_CLIENT_WRITE', 'Client Write', 'other')$$,
  '42501',
  'permission denied for table authorities',
  'authenticated users cannot insert governance authorities'
);
select throws_ok(
  $$select count(*) from public.get_active_user_roles('61000000-0000-4000-8000-000000000001', current_timestamp)$$,
  '42501',
  'permission denied for function get_active_user_roles',
  'authenticated users cannot execute the service-only role RPC'
);
select throws_ok(
  $$select count(*) from public.get_active_authority_memberships('61000000-0000-4000-8000-000000000001', current_timestamp)$$,
  '42501',
  'permission denied for function get_active_authority_memberships',
  'authenticated users cannot execute the service-only membership RPC'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"61000000-0000-4000-8000-000000000002"}';
set local role authenticated;
select ok(
  private.can_manage_authority('60000000-0000-4000-8000-000000000011'),
  'a municipal manager can manage its own active authority'
);
select ok(
  not private.can_manage_authority('60000000-0000-4000-8000-000000000012'),
  'a municipal manager cannot manage another authority'
);
select is(
  (select count(*)::integer from governance.offices where id = '60000000-0000-4000-8000-000000000031'),
  1,
  'a municipal manager can review an unverified office in its authority'
);
select is(
  (select count(*)::integer from governance.offices where id = '60000000-0000-4000-8000-000000000032'),
  0,
  'a municipal manager cannot review another authority unverified office'
);
select is(
  (select count(*)::integer from governance.import_batches where id = '60000000-0000-4000-8000-000000000050'),
  0,
  'a municipal manager cannot read the import ledger'
);
select throws_ok(
  $$update governance.offices set name = 'Client Update' where id = '60000000-0000-4000-8000-000000000031'$$,
  '42501',
  'permission denied for table offices',
  'a municipal manager cannot mutate its governance scope directly'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"61000000-0000-4000-8000-000000000003"}';
set local role authenticated;
select is(
  (select count(*)::integer from governance.import_batches where id = '60000000-0000-4000-8000-000000000050'),
  1,
  'a platform administrator can review the import ledger'
);
select is(
  (select count(*)::integer from governance.authorities where id = '60000000-0000-4000-8000-000000000013'),
  1,
  'a platform administrator can review a placeholder authority'
);
select is(
  (select count(*)::integer from governance.local_bodies where id = '60000000-0000-4000-8000-000000000023'),
  1,
  'a platform administrator can review a placeholder local body'
);
select is(
  (select count(*)::integer from governance.emergency_contacts where id = '60000000-0000-4000-8000-000000000043'),
  1,
  'a platform administrator can review a verified child of a placeholder authority'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000002',
      current_timestamp
    )
  ),
  2,
  'the service-only role RPC returns the citizen and valid municipal-manager roles'
);
select is(
  (
    select count(*)::integer
    from public.get_active_authority_memberships(
      '61000000-0000-4000-8000-000000000002',
      current_timestamp
    )
  ),
  1,
  'the service-only membership RPC returns a valid active authority membership'
);
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000004',
      current_timestamp
    )
  ),
  1,
  'an invalid legacy ward role is filtered while the citizen role remains active'
);
select is(
  (
    select count(*)::integer
    from public.get_active_authority_memberships(
      '61000000-0000-4000-8000-000000000004',
      current_timestamp
    )
  ),
  1,
  'an invalid legacy ward role does not erase its valid authority membership'
);
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000005',
      current_timestamp
    )
  ),
  1,
  'an invalid legacy department role is filtered while the citizen role remains active'
);
select is(
  (
    select count(*)::integer
    from public.get_active_authority_memberships(
      '61000000-0000-4000-8000-000000000005',
      current_timestamp
    )
  ),
  1,
  'an invalid legacy department role does not erase its valid authority membership'
);
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000006',
      current_timestamp
    )
  ),
  1,
  'an inactive-authority role is filtered while the citizen role remains active'
);
select is(
  (
    select count(*)::integer
    from public.get_active_authority_memberships(
      '61000000-0000-4000-8000-000000000006',
      current_timestamp
    )
  ),
  0,
  'an inactive authority is filtered from effective memberships'
);
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000007',
      current_timestamp
    )
  ),
  1,
  'a legacy placeholder-authority role is filtered while the citizen role remains active'
);
select is(
  (
    select count(*)::integer
    from public.get_active_authority_memberships(
      '61000000-0000-4000-8000-000000000007',
      current_timestamp
    )
  ),
  0,
  'a placeholder authority is filtered from effective memberships'
);
select is(
  (
    select count(*)::integer
    from public.get_active_user_roles(
      '61000000-0000-4000-8000-000000000003',
      current_timestamp
    )
  ),
  2,
  'global platform-administrator access remains valid without an authority membership'
);

select * from finish();
rollback;
