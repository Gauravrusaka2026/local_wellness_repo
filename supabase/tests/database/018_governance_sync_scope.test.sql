begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(30);

select has_table('governance', 'sync_scope_targets', 'synchronization scope targets exist');
select has_column(
  'governance', 'sync_scope_targets', 'scope_group_key',
  'scope targets belong to a stable data-driven group'
);
select has_column(
  'governance', 'sync_scope_targets', 'authority_id',
  'scope targets reference a canonical authority'
);
select has_column(
  'governance', 'sync_scope_targets', 'local_body_id',
  'local-body and ward scope targets reference a canonical local body'
);
select has_column(
  'governance', 'sync_scope_targets', 'ward_id',
  'ward scope targets reference a canonical ward'
);
select has_index(
  'governance',
  'sync_scope_targets',
  'sync_scope_targets_group_ward_unique',
  'a ward can occur only once in a synchronization scope group'
);
select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'governance.sync_scope_targets'::regclass
  ),
  'synchronization scope targets use forced RLS'
);
select ok(not has_table_privilege('anon', 'governance.sync_scope_targets', 'select'));
select ok(not has_table_privilege('authenticated', 'governance.sync_scope_targets', 'select'));
select ok(has_table_privilege('service_role', 'governance.sync_scope_targets', 'select'));
select ok(has_table_privilege('service_role', 'governance.sync_scope_targets', 'insert'));
select ok(has_table_privilege('service_role', 'governance.sync_scope_targets', 'update'));
select ok(not has_table_privilege('service_role', 'governance.sync_scope_targets', 'delete'));

select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets
    where scope_group_key = 'municipal_governance_sync_pilot_v1'
  ),
  10,
  'the pilot scope contains exactly ten ward targets'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets as target
    inner join governance.local_bodies as local_body on local_body.id = target.local_body_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
      and local_body.name = 'Pune Municipal Corporation'
  ),
  5,
  'Pune wards one through five are selected'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets as target
    inner join governance.local_bodies as local_body on local_body.id = target.local_body_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
      and local_body.name = 'Brihanmumbai Municipal Corporation'
  ),
  5,
  'Brihanmumbai wards one through five are selected'
);
select is(
  (
    select array_agg(ward.source_ward_code order by ward.source_ward_code)
    from governance.sync_scope_targets as target
    inner join governance.wards as ward on ward.id = target.ward_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
  ),
  array[
    'BRIH-W01', 'BRIH-W02', 'BRIH-W03', 'BRIH-W04', 'BRIH-W05',
    'PUNE-W01', 'PUNE-W02', 'PUNE-W03', 'PUNE-W04', 'PUNE-W05'
  ]::text[],
  'the scope references only the requested canonical source ward codes'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets
    where scope_group_key = 'municipal_governance_sync_pilot_v1'
      and status = 'draft'
      and verification_status = 'unverified'
      and not is_routing_eligible
      and approved_at is null
      and approved_by is null
  ),
  10,
  'all pilot ward targets remain draft, unverified, unapproved, and non-routable'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets as target
    inner join governance.wards as ward
      on ward.id = target.ward_id
      and ward.local_body_id = target.local_body_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
  ),
  10,
  'every selected ward belongs to its selected local body'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets as target
    inner join governance.local_bodies as local_body
      on local_body.id = target.local_body_id
      and local_body.authority_id = target.authority_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
  ),
  10,
  'every selected local body belongs to its selected authority'
);
select is(
  (
    select count(*)::integer
    from governance.sync_scope_targets as target
    inner join governance.wards as ward on ward.id = target.ward_id
    where target.scope_group_key = 'municipal_governance_sync_pilot_v1'
      and ward.verification_status = 'placeholder'
      and ward.is_placeholder
      and not ward.is_routing_eligible
  ),
  10,
  'all selected canonical wards remain clearly marked placeholder and non-routable'
);
select is(
  (
    select count(*)::integer
    from (
      select ward_id
      from governance.sync_scope_targets
      where scope_group_key = 'municipal_governance_sync_pilot_v1'
      group by ward_id
      having count(*) > 1
    ) as duplicate_target
  ),
  0,
  'the pilot contains no duplicate ward target'
);

select throws_ok(
  $$
    insert into governance.sync_scope_targets (
      scope_group_key, scope_key, target_kind, authority_id, local_body_id, ward_id
    ) values (
      'pgtap_invalid_hierarchy',
      'pgtap_invalid_hierarchy:ward:pune-w01',
      'ward',
      '3fabe3b8-47cf-58fe-a59c-bb34bd02322a',
      'fa1e71b4-01e3-5e72-92e8-1476eec1adcd',
      'a0cb5365-45e2-5706-815e-11afba7b87d8'
    )
  $$,
  '23503',
  null,
  'a ward cannot be scoped under a different local body'
);
select throws_ok(
  $$
    insert into governance.sync_scope_targets (
      scope_group_key, scope_key, target_kind, authority_id, local_body_id, ward_id
    ) values (
      'pgtap_invalid_shape',
      'pgtap_invalid_shape:authority',
      'authority',
      'aa3f9456-c120-5d9b-b96e-27604b138fea',
      '1c814ec3-0126-527a-9888-a4a00b70551d',
      null
    )
  $$,
  '23514',
  null,
  'target shape must match its target kind'
);
select throws_ok(
  $$
    update governance.sync_scope_targets
    set status = 'active'
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  $$,
  '23514',
  null,
  'an unreviewed target cannot become active'
);
select throws_ok(
  $$
    update governance.sync_scope_targets
    set scope_key = 'municipal_governance_sync_pilot_v1:ward:renamed'
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  $$,
  '55000',
  'SYNC_SCOPE_TARGET_IDENTITY_IMMUTABLE',
  'a synchronization target identity is immutable'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'scope-reviewer@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'scope-admin@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

select throws_ok(
  $$
    update governance.sync_scope_targets
    set
      status = 'active',
      verification_status = 'manually_verified',
      last_verified_on = date '2026-07-14',
      approved_at = now(),
      approved_by = 'e1000000-0000-4000-8000-000000000001'
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  $$,
  '23514',
  'SYNC_SCOPE_TARGET_REVIEW_REQUIRED',
  'an arbitrary authenticated user cannot approve a synchronization target'
);

insert into public.user_roles (user_id, role_id, scope_type)
values (
  'e1000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000006',
  'global'
);

update governance.sync_scope_targets
set
  status = 'active',
  verification_status = 'manually_verified',
  last_verified_on = date '2026-07-14',
  approved_at = now(),
  approved_by = 'e1000000-0000-4000-8000-000000000002'
where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01';

select is(
  (
    select status
    from governance.sync_scope_targets
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  ),
  'active',
  'a global platform administrator can activate a reviewed synchronization target'
);
select ok(
  not (
    select is_routing_eligible
    from governance.sync_scope_targets
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  ),
  'activating synchronization scope does not enable routing'
);
select throws_ok(
  $$
    update governance.sync_scope_targets
    set is_routing_eligible = true
    where scope_key = 'municipal_governance_sync_pilot_v1:ward:pune-w01'
  $$,
  '23514',
  'SYNC_SCOPE_TARGET_NOT_ROUTABLE',
  'a placeholder canonical ward cannot become routable through synchronization scope'
);

select * from finish();
rollback;
