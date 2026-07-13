begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(63);

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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'citizen.a@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Citizen A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'citizen.b@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Citizen B"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin.a@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Admin A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'officer.a@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Officer A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'admin.b@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Admin B"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'officer.b@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Officer B"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'expired.admin@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Expired Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'revoked.admin@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Revoked Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'bootstrap.admin@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bootstrap Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'invite.target@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Invite Target"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'privileged.target@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Privileged Target"}', now(), now());

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
  ('10000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin.a@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'officer.a@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'admin.b@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000006', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'officer.b@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'expired.admin@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'revoked.admin@example.test', 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', now() - interval '2 days');

insert into public.user_roles (
  user_id,
  role_id,
  authority_id,
  scope_type,
  scope_id,
  effective_from,
  effective_until,
  status,
  granted_by,
  revoked_by,
  revoked_at
)
values
  ('10000000-0000-4000-8000-000000000003', (select id from public.roles where code = 'municipal_admin'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '2 days', null, 'active', '10000000-0000-4000-8000-000000000003', null, null),
  ('10000000-0000-4000-8000-000000000004', (select id from public.roles where code = 'ward_officer'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ward', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', now() - interval '2 days', null, 'active', '10000000-0000-4000-8000-000000000003', null, null),
  ('10000000-0000-4000-8000-000000000005', (select id from public.roles where code = 'municipal_admin'), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authority', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '2 days', null, 'active', '10000000-0000-4000-8000-000000000005', null, null),
  ('10000000-0000-4000-8000-000000000006', (select id from public.roles where code = 'department_officer'), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'department', 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', now() - interval '2 days', null, 'active', '10000000-0000-4000-8000-000000000005', null, null),
  ('10000000-0000-4000-8000-000000000007', (select id from public.roles where code = 'municipal_admin'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '2 days', now() - interval '1 hour', 'active', '10000000-0000-4000-8000-000000000003', null, null),
  ('10000000-0000-4000-8000-000000000008', (select id from public.roles where code = 'municipal_admin'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '2 days', null, 'revoked', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', now() - interval '1 hour');

insert into public.devices (
  id,
  user_id,
  device_identifier_hash,
  platform,
  app_version
)
values
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', repeat('a', 64), 'android', '1.0.0'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', repeat('b', 64), 'ios', '1.0.0');

insert into public.auth_audit_events (
  id,
  actor_user_id,
  subject_user_id,
  authority_id,
  event_type,
  outcome
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, 'sign_in_succeeded', 'success'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'access_denied', 'failure'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'access_denied', 'failure');

select is((select count(*)::integer from public.profiles where id::text like '10000000-%'), 11, 'Auth inserts auto-provision profiles');
select is((select count(*)::integer from public.user_roles as user_role inner join public.roles as role on role.id = user_role.role_id where user_role.user_id::text like '10000000-%' and role.code = 'citizen'), 11, 'Auth inserts auto-assign the citizen role');

grant insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices to authenticated;

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
set local role authenticated;

select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000001'), 1, 'citizen reads own profile');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 0, 'citizen cannot read another profile');
select lives_ok($$update public.profiles set display_name = 'Updated Citizen', preferred_language = 'mr' where id = '10000000-0000-4000-8000-000000000001'$$);
select throws_ok($$update public.profiles set status = 'disabled' where id = '10000000-0000-4000-8000-000000000001'$$);
select throws_ok(
  $$insert into public.devices (user_id, device_identifier_hash, platform) values ('10000000-0000-4000-8000-000000000001', repeat('c', 64), 'android')$$,
  '42501',
  'new row violates row-level security policy for table "devices"',
  'RLS denies an own-device insert even when a narrow insert grant is restored'
);
select throws_ok($$insert into public.devices (user_id, device_identifier_hash, platform) values ('10000000-0000-4000-8000-000000000002', repeat('d', 64), 'android')$$);
select throws_ok($$insert into public.devices (user_id, device_identifier_hash, platform, risk_status) values ('10000000-0000-4000-8000-000000000001', repeat('e', 64), 'android', 'trusted')$$);
reset role;
revoke insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices from authenticated;
set local role authenticated;
select throws_ok(
  $$insert into public.devices (user_id, device_identifier_hash, platform) values ('10000000-0000-4000-8000-000000000001', repeat('f', 64), 'android')$$,
  '42501',
  'permission denied for table devices',
  'authenticated device writes require the service-only atomic RPC'
);
select throws_ok($$insert into public.user_roles (user_id, role_id, authority_id, scope_type, scope_id) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$);
select throws_ok($$insert into public.authority_memberships (user_id, authority_id, invitation_email) values ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'citizen.a@example.test')$$);
select throws_ok($$select public.provision_government_invitation('10000000-0000-4000-8000-000000000010', 'invite.target@example.test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000002', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), null, '10000000-0000-4000-8000-000000000003')$$);
select throws_ok($$select public.bootstrap_platform_administrator('10000000-0000-4000-8000-000000000009')$$);
select throws_ok($$delete from public.devices where user_id = '10000000-0000-4000-8000-000000000001'$$);
select throws_ok($$update public.auth_audit_events set outcome = 'failure' where id = '30000000-0000-4000-8000-000000000001'$$);
select throws_ok($$delete from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000001'$$);
select is((select count(*)::integer from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000003'), 0, 'citizen cannot read another authority audit event');
select is((select count(*)::integer from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000001'), 1, 'citizen reads own audit event');

reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from public.profiles$$);
select throws_ok($$select * from public.roles$$);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000003"}';
set local role authenticated;
select ok(private.can_manage_authority('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'municipal admin manages own authority');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000004'), 1, 'municipal admin reads same-authority profile');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000006'), 0, 'municipal admin cannot read cross-authority profile');
select is((select count(*)::integer from public.authority_memberships where user_id = '10000000-0000-4000-8000-000000000004'), 1, 'municipal admin reads same-authority membership');
select is((select count(*)::integer from public.authority_memberships where user_id = '10000000-0000-4000-8000-000000000006'), 0, 'municipal admin cannot read cross-authority membership');
select is((select count(*)::integer from public.user_roles where user_id = '10000000-0000-4000-8000-000000000004' and authority_id is not null), 1, 'municipal admin reads same-authority role');
select is((select count(*)::integer from public.user_roles where user_id = '10000000-0000-4000-8000-000000000006' and authority_id is not null), 0, 'municipal admin cannot read cross-authority role');
select is((select count(*)::integer from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000002'), 1, 'municipal admin reads same-authority audit');
select is((select count(*)::integer from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000003'), 0, 'municipal admin cannot read cross-authority audit');
select is((select count(*)::integer from public.devices where user_id = '10000000-0000-4000-8000-000000000004'), 1, 'municipal admin reads same-authority device');
select is((select count(*)::integer from public.devices where user_id = '10000000-0000-4000-8000-000000000006'), 0, 'municipal admin cannot read cross-authority device');

reset role;
update public.authority_memberships
set
  status = 'expired',
  effective_until = now() - interval '1 hour'
where user_id = '10000000-0000-4000-8000-000000000004'
  and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000003"}';
set local role authenticated;
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000004'), 0, 'municipal admin cannot read a former member profile after membership expiry');
select is((select count(*)::integer from public.devices where user_id = '10000000-0000-4000-8000-000000000004'), 0, 'municipal admin cannot read former member devices after membership expiry');

reset role;
update public.authority_memberships
set
  status = 'revoked',
  effective_until = null,
  revoked_by = '10000000-0000-4000-8000-000000000003',
  revoked_at = now()
where user_id = '10000000-0000-4000-8000-000000000004'
  and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000003"}';
set local role authenticated;
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000004'), 0, 'municipal admin cannot read a former member profile after membership revocation');
select is((select count(*)::integer from public.devices where user_id = '10000000-0000-4000-8000-000000000004'), 0, 'municipal admin cannot read former member devices after membership revocation');

reset role;
update public.authority_memberships
set
  status = 'active',
  effective_until = null,
  revoked_by = null,
  revoked_at = null
where user_id = '10000000-0000-4000-8000-000000000004'
  and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000007"}';
set local role authenticated;
select ok(not private.has_active_role('municipal_admin', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'past effective_until makes an active-status role inactive');
select ok(not private.can_manage_authority('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'expired role cannot manage an authority');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000004'), 0, 'expired admin cannot read scoped profile');

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000008"}';
set local role authenticated;
select ok(not private.has_active_role('municipal_admin', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revoked role is inactive');
select ok(not private.can_manage_authority('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revoked role cannot manage an authority');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000004'), 0, 'revoked admin cannot read scoped profile');

reset role;
update public.user_roles
set effective_until = null
where user_id = '10000000-0000-4000-8000-000000000007'
  and role_id = '00000000-0000-4000-8000-000000000005';
update public.authority_memberships
set
  status = 'expired',
  effective_until = now() - interval '1 hour'
where user_id = '10000000-0000-4000-8000-000000000007'
  and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000007"}';
set local role authenticated;
select ok(not private.has_active_role('municipal_admin', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'expired membership makes an otherwise-active scoped role inactive');
select ok(not private.can_manage_authority('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'expired membership cannot manage an authority');

reset role;
update public.authority_memberships
set
  status = 'revoked',
  effective_until = null,
  revoked_by = '10000000-0000-4000-8000-000000000003',
  revoked_at = now()
where user_id = '10000000-0000-4000-8000-000000000007'
  and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000007"}';
set local role authenticated;
select ok(not private.has_active_role('municipal_admin', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revoked membership makes an otherwise-active scoped role inactive');
select ok(not private.can_manage_authority('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revoked membership cannot manage an authority');
select is((select count(*)::integer from public.authority_memberships where user_id = '10000000-0000-4000-8000-000000000007' and approved_by = '10000000-0000-4000-8000-000000000003' and approved_at is not null), 1, 'revoked membership preserves approval provenance');

reset role;
set local role service_role;
select throws_ok($$update public.auth_audit_events set outcome = 'failure' where id = '30000000-0000-4000-8000-000000000001'$$);
select throws_ok($$delete from public.auth_audit_events where id = '30000000-0000-4000-8000-000000000001'$$);
select lives_ok($$select public.bootstrap_platform_administrator('10000000-0000-4000-8000-000000000009')$$);

reset role;
select is((select count(*)::integer from public.user_roles as user_role inner join public.roles as role on role.id = user_role.role_id where user_role.user_id = '10000000-0000-4000-8000-000000000009' and role.code = 'platform_admin' and user_role.status = 'active'), 1, 'bootstrap creates one active global platform admin role');
select is((select count(*)::integer from public.auth_audit_events where subject_user_id = '10000000-0000-4000-8000-000000000009' and event_type = 'platform_admin_bootstrapped'), 1, 'bootstrap appends its audit event');

set local role service_role;
select throws_ok($$select public.bootstrap_platform_administrator('10000000-0000-4000-8000-000000000010')$$);
select throws_ok($$select * from public.provision_government_invitation('10000000-0000-4000-8000-000000000011', 'privileged.target@example.test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-4000-8000-000000000002', 'authority', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now(), null, '10000000-0000-4000-8000-000000000003')$$);
select lives_ok($$select * from public.provision_government_invitation('10000000-0000-4000-8000-000000000010', 'invite.target@example.test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000002', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), null, '10000000-0000-4000-8000-000000000003')$$);

reset role;
select is((select count(*)::integer from public.authority_memberships where user_id = '10000000-0000-4000-8000-000000000010' and authority_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status = 'active' and approved_by = '10000000-0000-4000-8000-000000000003' and approved_at is not null), 1, 'invitation creates an immediately active approved membership');
select is((select count(*)::integer from public.user_roles where user_id = '10000000-0000-4000-8000-000000000010' and role_id = '00000000-0000-4000-8000-000000000002' and status = 'active'), 1, 'invitation creates the active scoped role');
select is((select count(*)::integer from public.auth_audit_events where subject_user_id = '10000000-0000-4000-8000-000000000010' and event_type = 'government_invitation_created'), 1, 'invitation appends its audit event');

set local "request.jwt.claims" = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000010"}';
set local role authenticated;
select ok(private.has_active_role('government_operator', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'invited government user has scope at first sign-in');

reset role;
set local role service_role;
select throws_ok($$select * from public.provision_government_invitation('10000000-0000-4000-8000-000000000011', 'privileged.target@example.test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000005', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), null, '10000000-0000-4000-8000-000000000003')$$);
select lives_ok($$select * from public.provision_government_invitation('10000000-0000-4000-8000-000000000011', 'privileged.target@example.test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000007', 'authority', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), null, '10000000-0000-4000-8000-000000000009')$$);

reset role;
select is((select count(*)::integer from public.authority_memberships where user_id = '10000000-0000-4000-8000-000000000011' and status = 'active'), 1, 'platform admin can create an authority-scoped moderator membership');
select is((select count(*)::integer from public.user_roles where user_id = '10000000-0000-4000-8000-000000000011' and role_id = '00000000-0000-4000-8000-000000000007' and status = 'active'), 1, 'platform admin can grant the privileged moderator role');

select * from finish();
rollback;
