begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions;

select plan(20);

set local role service_role;
select is(
  (public.consume_api_rate_limit('test_scope', repeat('a', 64), 2, 60) ->> 'allowed')::boolean,
  true,
  'the first request is allowed'
);
select is(
  (public.consume_api_rate_limit('test_scope', repeat('a', 64), 2, 60) ->> 'remaining')::integer,
  0,
  'the second request consumes the remaining quota'
);
select is(
  (public.consume_api_rate_limit('test_scope', repeat('a', 64), 2, 60) ->> 'allowed')::boolean,
  false,
  'a request beyond the shared window limit is rejected'
);
reset role;

select is(
  (
    select request_count
    from private.api_rate_limit_windows
    where scope = 'test_scope'
      and subject_sha256 = repeat('a', 64)
  ),
  3,
  'the counter is capped at one beyond the configured limit'
);

set local role service_role;
select is(
  (public.consume_api_rate_limit('test_scope', repeat('b', 64), 2, 60) ->> 'allowed')::boolean,
  true,
  'a different hashed subject has an isolated quota'
);
select is(
  (public.consume_api_rate_limit('other_scope', repeat('a', 64), 2, 60) ->> 'allowed')::boolean,
  true,
  'a different operation scope has an isolated quota'
);
select throws_ok(
  $$ select public.consume_api_rate_limit('test_scope', 'not-a-digest', 2, 60) $$,
  '22023',
  'API_RATE_LIMIT_INVALID',
  'malformed subject hashes fail closed'
);
select throws_ok(
  $$ select public.consume_api_rate_limit('test_scope', repeat('c', 64), 0, 60) $$,
  '22023',
  'API_RATE_LIMIT_INVALID',
  'invalid quota policy values fail closed'
);
reset role;

insert into private.api_rate_limit_windows (
  scope, subject_sha256, window_started_at, request_count, expires_at
)
values
  ('expired_scope', repeat('d', 64), current_timestamp - interval '2 hours', 1, current_timestamp - interval '1 hour'),
  ('current_scope', repeat('e', 64), current_timestamp, 1, current_timestamp + interval '1 hour');

set local role service_role;
select is(
  public.purge_expired_api_rate_limits(1),
  1,
  'cleanup removes a bounded expired batch'
);
reset role;
select is(
  (select count(*)::integer from private.api_rate_limit_windows where scope = 'expired_scope'),
  0,
  'the expired quota row is removed'
);
select is(
  (select count(*)::integer from private.api_rate_limit_windows where scope = 'current_scope'),
  1,
  'cleanup preserves a current quota row'
);

set local role service_role;
select is(public.api_readiness_check(), true, 'the service-only readiness probe succeeds');
reset role;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'a1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'phase10-device-owner@example.test',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

set local role service_role;
select lives_ok(
  $$
    select public.register_device(
      p_user_id => 'a1000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => lpad(to_hex(device_number), 64, 'a'),
      p_platform => 'android',
      p_last_seen_at => current_timestamp
    )
    from generate_series(1, 10) as device_number
  $$,
  'ten distinct active installations can be registered'
);
reset role;

select is(
  (
    select count(*)::integer
    from public.devices
    where user_id = 'a1000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  10,
  'the account has exactly ten active installations'
);

set local role service_role;
select throws_ok(
  $$
    select public.register_device(
      p_user_id => 'a1000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => repeat('b', 64),
      p_platform => 'ios',
      p_last_seen_at => current_timestamp
    )
  $$,
  'P0001',
  'DEVICE_LIMIT_REACHED',
  'an eleventh active installation is rejected atomically'
);
reset role;

select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where subject_user_id = 'a1000000-0000-4000-8000-000000000001'
      and event_type = 'device_registered'
  ),
  10,
  'a rejected installation creates no registration audit event'
);

set local role service_role;
select lives_ok(
  $$
    select public.register_device(
      p_user_id => 'a1000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => lpad(to_hex(1), 64, 'a'),
      p_platform => 'android',
      p_last_seen_at => current_timestamp,
      p_app_version => '2.0.0'
    )
  $$,
  'an existing installation can refresh while the account is at its cap'
);
reset role;

select is(
  (
    select count(*)::integer
    from public.devices
    where user_id = 'a1000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  10,
  'refreshing an existing installation does not consume another slot'
);

set local role service_role;
select lives_ok(
  $$
    select public.revoke_device(
      p_user_id => 'a1000000-0000-4000-8000-000000000001',
      p_device_id => (
        select device.id
        from public.devices as device
        where device.user_id = 'a1000000-0000-4000-8000-000000000001'
          and device.device_identifier_hash = lpad(to_hex(1), 64, 'a')
      ),
      p_revoked_at => current_timestamp
    );
    select public.register_device(
      p_user_id => 'a1000000-0000-4000-8000-000000000001',
      p_device_identifier_hash => repeat('c', 64),
      p_platform => 'ios',
      p_last_seen_at => current_timestamp
    );
  $$,
  'revoking one installation makes one new slot available'
);
reset role;

select is(
  (
    select count(*)::integer
    from public.devices
    where user_id = 'a1000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  10,
  'the active installation cap remains stable after replacement'
);

select * from finish();
rollback;
