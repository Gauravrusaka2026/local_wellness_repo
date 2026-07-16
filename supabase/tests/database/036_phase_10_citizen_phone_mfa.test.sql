begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select ok(
  to_regprocedure('public.user_has_verified_phone_mfa(uuid)') is not null,
  'the verified-phone-MFA decision RPC exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.user_has_verified_phone_mfa(uuid)',
    'execute'
  ),
  'the service role can query verified phone MFA state'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.user_has_verified_phone_mfa(uuid)',
    'execute'
  )
    and not has_function_privilege(
      'anon',
      'public.user_has_verified_phone_mfa(uuid)',
      'execute'
    ),
  'untrusted clients cannot query another account factor state'
);
select ok(
  (
    select procedure.prosecdef
      and 'search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[]))
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.user_has_verified_phone_mfa(uuid)'::regprocedure
  ),
  'the factor-state function is security definer with an empty search path'
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
  (
    '00000000-0000-0000-0000-000000000000',
    'a3000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phone-factor@example.test',
    current_timestamp,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'totp-only@example.test',
    current_timestamp,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp
  );

set local role service_role;
select is(
  public.user_has_verified_phone_mfa('a3000000-0000-4000-8000-000000000001'),
  false,
  'an account with no MFA factor is not phone verified'
);
reset role;

insert into auth.mfa_factors (
  id,
  user_id,
  friendly_name,
  factor_type,
  status,
  phone,
  created_at,
  updated_at
)
values
  (
    'a3000000-0000-4000-8000-000000000011',
    'a3000000-0000-4000-8000-000000000001',
    'Unverified citizen phone',
    'phone',
    'unverified',
    '+919876543210',
    current_timestamp,
    current_timestamp
  ),
  (
    'a3000000-0000-4000-8000-000000000012',
    'a3000000-0000-4000-8000-000000000002',
    'Verified TOTP',
    'totp',
    'verified',
    null,
    current_timestamp,
    current_timestamp
  );

set local role service_role;
select is(
  public.user_has_verified_phone_mfa('a3000000-0000-4000-8000-000000000001'),
  false,
  'an unverified phone factor is not accepted'
);
select is(
  public.user_has_verified_phone_mfa('a3000000-0000-4000-8000-000000000002'),
  false,
  'a verified TOTP factor does not satisfy phone verification'
);
reset role;

update auth.mfa_factors
set status = 'verified', updated_at = current_timestamp
where id = 'a3000000-0000-4000-8000-000000000011';

set local role service_role;
select is(
  public.user_has_verified_phone_mfa('a3000000-0000-4000-8000-000000000001'),
  true,
  'a verified phone factor satisfies the phone-verification policy'
);
reset role;

update auth.mfa_factors
set status = 'unverified', updated_at = current_timestamp
where id = 'a3000000-0000-4000-8000-000000000011';

set local role service_role;
select is(
  public.user_has_verified_phone_mfa('a3000000-0000-4000-8000-000000000001'),
  false,
  'a factor no longer marked verified stops satisfying the policy'
);
reset role;

select is(
  (select count(*)::integer from public.profiles where id::text like 'a3000000-%'),
  2,
  'factor-state tests preserve normal profile provisioning'
);

select * from finish();
rollback;
