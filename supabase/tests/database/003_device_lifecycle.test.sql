begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

insert into governance.authorities (id, code, name, authority_type)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'TEST_DEVICE_AUTHORITY',
  'Test Device Authority',
  'other'
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
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'device.owner@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'blocked.device@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'revoked.device@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'audit.snapshot@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'lifecycle.actor@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'atomic.device@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.devices (
  id,
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token,
  last_seen_at,
  risk_status,
  revoked_at
)
values
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', repeat('b', 64), 'android', '1.0.0', 'blocked-push-token', '2026-07-13T09:00:00Z', 'blocked', null),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', repeat('c', 64), 'ios', '1.0.0', null, '2026-07-13T09:00:00Z', 'unknown', '2026-07-13T09:30:00Z'),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', repeat('d', 64), 'web', '1.0.0', 'active-push-token', '2026-07-13T09:00:00Z', 'unknown', null),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000006', repeat('f', 64), 'android', '1.0.0', 'atomic-push-token', '2026-07-13T09:00:00Z', 'unknown', null),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004', repeat('9', 64), 'ios', '1.0.0', null, '2026-07-13T09:00:00Z', 'unknown', null);

set local role service_role;
select lives_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => repeat('a', 64),
      p_platform => 'android',
      p_last_seen_at => '2026-07-13T10:00:00Z',
      p_app_version => '1.0.0',
      p_push_token => 'first-push-token',
      p_push_token_supplied => true
    )
  $$,
  'service role registers a device through the atomic RPC'
);

reset role;
select is(
  (
    select count(*)::integer
    from public.devices
    where user_id = '40000000-0000-4000-8000-000000000001'
      and device_identifier_hash = repeat('a', 64)
      and platform = 'android'
      and app_version = '1.0.0'
      and push_token = 'first-push-token'
      and is_active
  ),
  1,
  'registration persists one active device with the supplied metadata'
);
select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where subject_user_id = '40000000-0000-4000-8000-000000000001'
      and event_type = 'device_registered'
  ),
  1,
  'registration appends exactly one device_registered event'
);

set local role service_role;
select lives_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => repeat('a', 64),
      p_platform => 'android',
      p_last_seen_at => '2026-07-13T11:00:00Z',
      p_app_version => '2.0.0',
      p_push_token => null,
      p_push_token_supplied => false
    )
  $$,
  'service role refreshes an existing active registration'
);

reset role;
select is(
  (
    select count(*)::integer
    from public.devices
    where user_id = '40000000-0000-4000-8000-000000000001'
      and device_identifier_hash = repeat('a', 64)
      and app_version = '2.0.0'
      and push_token = 'first-push-token'
      and last_seen_at = '2026-07-13T11:00:00Z'
  ),
  1,
  'refresh updates mutable metadata while preserving an omitted push token'
);
select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where subject_user_id = '40000000-0000-4000-8000-000000000001'
      and event_type = 'device_registered'
  ),
  2,
  'each successful refresh appends exactly one registration event'
);

set local role service_role;
select lives_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => repeat('a', 64),
      p_platform => 'android',
      p_last_seen_at => '2026-07-13T12:00:00Z',
      p_app_version => null,
      p_push_token => null,
      p_push_token_supplied => true
    )
  $$,
  'an explicit null push token clears notification registration'
);

reset role;
select ok(
  (
    select push_token is null and app_version = '2.0.0'
    from public.devices
    where user_id = '40000000-0000-4000-8000-000000000001'
      and device_identifier_hash = repeat('a', 64)
  ),
  'explicit push-token clearing preserves an omitted app version'
);
select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where subject_user_id = '40000000-0000-4000-8000-000000000001'
      and event_type = 'device_registered'
  ),
  3,
  'push-token clearing still appends only one registration event'
);

set local role service_role;
select throws_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000002',
      p_device_identifier_hash => repeat('b', 64),
      p_platform => 'android',
      p_last_seen_at => '2026-07-13T12:00:00Z'
    )
  $$,
  'P0001',
  'DEVICE_BLOCKED',
  'blocked device identifiers cannot be refreshed'
);

reset role;
select ok(
  (
    select app_version = '1.0.0' and push_token = 'blocked-push-token'
    from public.devices
    where id = '50000000-0000-4000-8000-000000000002'
  )
    and not exists (
      select 1
      from public.auth_audit_events
      where device_id = '50000000-0000-4000-8000-000000000002'
        and event_type = 'device_registered'
    ),
  'blocked registration rejection leaves device and audit state unchanged'
);

set local role service_role;
select throws_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000003',
      p_device_identifier_hash => repeat('c', 64),
      p_platform => 'ios',
      p_last_seen_at => '2026-07-13T12:00:00Z'
    )
  $$,
  'P0001',
  'DEVICE_REVOKED',
  'revoked device identifiers cannot be re-registered'
);

reset role;
select ok(
  (
    select revoked_at = '2026-07-13T09:30:00Z'
    from public.devices
    where id = '50000000-0000-4000-8000-000000000003'
  )
    and not exists (
      select 1
      from public.auth_audit_events
      where device_id = '50000000-0000-4000-8000-000000000003'
        and event_type = 'device_registered'
    ),
  'revoked registration rejection leaves device and audit state unchanged'
);

set local role service_role;
select lives_ok(
  $$
    select public.revoke_device(
      p_user_id => '40000000-0000-4000-8000-000000000001',
      p_device_id => '50000000-0000-4000-8000-000000000004',
      p_revoked_at => '2026-07-13T12:30:00Z'
    )
  $$,
  'service role soft-revokes an active owned device'
);

reset role;
select ok(
  (
    select revoked_at = '2026-07-13T12:30:00Z'
      and not is_active
      and push_token is null
    from public.devices
    where id = '50000000-0000-4000-8000-000000000004'
  ),
  'soft revocation sets revoked_at, derives inactivity, and removes the push token'
);
select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where device_id = '50000000-0000-4000-8000-000000000004'
      and event_type = 'device_revoked'
  ),
  1,
  'soft revocation appends exactly one device_revoked event'
);

set local role service_role;
select lives_ok(
  $$
    select public.revoke_device(
      p_user_id => '40000000-0000-4000-8000-000000000001',
      p_device_id => '50000000-0000-4000-8000-000000000004',
      p_revoked_at => '2026-07-13T13:00:00Z'
    )
  $$,
  'an already-revoked owned device returns successfully without another mutation'
);

reset role;
select ok(
  (
    select revoked_at = '2026-07-13T12:30:00Z'
    from public.devices
    where id = '50000000-0000-4000-8000-000000000004'
  )
    and (
      select count(*) = 1
      from public.auth_audit_events
      where device_id = '50000000-0000-4000-8000-000000000004'
        and event_type = 'device_revoked'
    ),
  'repeated revocation preserves the original state and exactly one device_revoked event'
);

set local role service_role;
select throws_ok(
  $$
    select public.revoke_device(
      p_user_id => '40000000-0000-4000-8000-000000000002',
      p_device_id => '50000000-0000-4000-8000-000000000004',
      p_revoked_at => '2026-07-13T13:00:00Z'
    )
  $$,
  'P0001',
  'DEVICE_NOT_FOUND',
  'revocation does not disclose a device owned by another user'
);

reset role;
create function pg_temp.reject_selected_device_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subject_user_id = '40000000-0000-4000-8000-000000000006'
    and new.event_type in ('device_registered', 'device_revoked') then
    raise exception using
      errcode = 'P0001',
      message = 'ATOMICITY_TEST_FAILURE';
  end if;

  return new;
end;
$$;

create trigger reject_selected_device_audit
before insert on public.auth_audit_events
for each row execute function pg_temp.reject_selected_device_audit();

set local role service_role;
select throws_ok(
  $$
    select public.register_device(
      p_user_id => '40000000-0000-4000-8000-000000000006',
      p_device_identifier_hash => repeat('e', 64),
      p_platform => 'android',
      p_last_seen_at => '2026-07-13T13:00:00Z'
    )
  $$,
  'P0001',
  'ATOMICITY_TEST_FAILURE',
  'registration surfaces an audit insertion failure'
);

reset role;
select ok(
  not exists (
    select 1
    from public.devices
    where user_id = '40000000-0000-4000-8000-000000000006'
      and device_identifier_hash = repeat('e', 64)
  )
    and not exists (
      select 1
      from public.auth_audit_events
      where subject_user_id = '40000000-0000-4000-8000-000000000006'
        and event_type = 'device_registered'
    ),
  'audit failure rolls back the registration mutation'
);

set local role service_role;
select throws_ok(
  $$
    select public.revoke_device(
      p_user_id => '40000000-0000-4000-8000-000000000006',
      p_device_id => '50000000-0000-4000-8000-000000000005',
      p_revoked_at => '2026-07-13T13:00:00Z'
    )
  $$,
  'P0001',
  'ATOMICITY_TEST_FAILURE',
  'revocation surfaces an audit insertion failure'
);

reset role;
select ok(
  (
    select revoked_at is null and push_token = 'atomic-push-token'
    from public.devices
    where id = '50000000-0000-4000-8000-000000000005'
  )
    and not exists (
      select 1
      from public.auth_audit_events
      where device_id = '50000000-0000-4000-8000-000000000005'
        and event_type = 'device_revoked'
    ),
  'audit failure rolls back the revocation mutation'
);

drop trigger reject_selected_device_audit on public.auth_audit_events;

insert into public.authority_memberships (
  user_id,
  authority_id,
  invitation_email,
  status,
  invited_by
)
values (
  '40000000-0000-4000-8000-000000000001',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'device.owner@example.test',
  'invited',
  '40000000-0000-4000-8000-000000000005'
);

select throws_ok(
  $$delete from auth.users where id = '40000000-0000-4000-8000-000000000005'$$,
  '23503',
  'update or delete on table "users" violates foreign key constraint "authority_memberships_invited_by_fkey" on table "authority_memberships"',
  'deleting an access lifecycle actor fails instead of erasing provenance'
);

insert into public.auth_audit_events (
  id,
  actor_user_id,
  subject_user_id,
  device_id,
  event_type,
  outcome
)
values (
  '60000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000004',
  '50000000-0000-4000-8000-000000000006',
  'sign_in_succeeded',
  'success'
);

select lives_ok(
  $$delete from public.devices where id = '50000000-0000-4000-8000-000000000006'$$,
  'deleting a device does not fail because an audit event snapshots its identifier'
);
select is(
  (
    select device_id
    from public.auth_audit_events
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  '50000000-0000-4000-8000-000000000006'::uuid,
  'device deletion does not mutate audit device attribution'
);
select lives_ok(
  $$delete from auth.users where id = '40000000-0000-4000-8000-000000000004'$$,
  'deleting an audit subject does not fail on immutable audit snapshots'
);
select ok(
  (
    select actor_user_id = '40000000-0000-4000-8000-000000000004'
      and subject_user_id = '40000000-0000-4000-8000-000000000004'
    from public.auth_audit_events
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  'identity deletion does not mutate audit actor or subject attribution'
);

select * from finish();
rollback;
