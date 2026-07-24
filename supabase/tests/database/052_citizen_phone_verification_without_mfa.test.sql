begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select ok(
  to_regprocedure('public.user_has_verified_phone(uuid)') is not null,
  'the confirmed-phone decision RPC exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.user_has_verified_phone(uuid)',
    'execute'
  ),
  'the service role can query confirmed phone state'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.user_has_verified_phone(uuid)',
    'execute'
  )
    and not has_function_privilege(
      'anon',
      'public.user_has_verified_phone(uuid)',
      'execute'
    ),
  'untrusted clients cannot query another account phone state'
);
select ok(
  (
    select procedure.prosecdef
      and 'search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[]))
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.user_has_verified_phone(uuid)'::regprocedure
  ),
  'the confirmed-phone function is security definer with an empty search path'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'no-phone@example.test',
    current_timestamp,
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'unconfirmed-phone@example.test',
    current_timestamp,
    '+919876543201',
    null,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'confirmed-phone@example.test',
    current_timestamp,
    '+919876543202',
    current_timestamp,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp
  );

set local role service_role;
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000001'),
  false,
  'an account without a phone is not verified'
);
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000002'),
  false,
  'an account with an unconfirmed phone is not verified'
);
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000003'),
  true,
  'a confirmed phone is verified without an MFA factor'
);
reset role;

update auth.users
set phone_confirmed_at = current_timestamp, updated_at = current_timestamp
where id = 'a4000000-0000-4000-8000-000000000002';

set local role service_role;
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000002'),
  true,
  'confirming the phone satisfies the citizen verification policy'
);
reset role;

update auth.users
set phone = null, updated_at = current_timestamp
where id = 'a4000000-0000-4000-8000-000000000003';

set local role service_role;
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000003'),
  false,
  'removing the phone stops satisfying the citizen verification policy'
);
reset role;

update auth.users
set deleted_at = current_timestamp, updated_at = current_timestamp
where id = 'a4000000-0000-4000-8000-000000000002';

set local role service_role;
select is(
  public.user_has_verified_phone('a4000000-0000-4000-8000-000000000002'),
  false,
  'a soft-deleted account cannot satisfy citizen phone verification'
);
reset role;

select * from finish();
rollback;
