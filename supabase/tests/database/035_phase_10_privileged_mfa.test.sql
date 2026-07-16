begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions;

select plan(17);

select ok(
  to_regprocedure('private.jwt_has_aal2()') is not null,
  'the AAL2 session helper exists'
);
select ok(
  to_regprocedure('public.user_requires_privileged_mfa(uuid,timestamptz)') is not null,
  'the privileged-MFA decision RPC exists'
);
select ok(
  has_function_privilege('authenticated', 'private.jwt_has_aal2()', 'execute')
    and has_function_privilege('service_role', 'private.jwt_has_aal2()', 'execute')
    and not has_function_privilege('anon', 'private.jwt_has_aal2()', 'execute'),
  'only trusted database roles can execute the session assurance helper'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.user_requires_privileged_mfa(uuid,timestamptz)',
    'execute'
  )
    and not has_function_privilege(
      'authenticated',
      'public.user_requires_privileged_mfa(uuid,timestamptz)',
      'execute'
    )
    and not has_function_privilege(
      'anon',
      'public.user_requires_privileged_mfa(uuid,timestamptz)',
      'execute'
    ),
  'only the service role can query whether an account requires privileged MFA'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as procedure
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('private', 'public')
      and procedure.proname in (
        'jwt_has_aal2',
        'has_active_role',
        'can_manage_authority',
        'user_requires_privileged_mfa'
      )
      and procedure.prosecdef
      and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
  ),
  'every privileged-MFA security-definer function pins an empty search path'
);

insert into governance.authorities (
  id,
  code,
  name,
  authority_type,
  verification_status,
  is_placeholder,
  is_routing_eligible
)
values (
  'a2000000-0000-4000-8000-000000000001',
  'PHASE10_MFA_AUTHORITY',
  'Phase 10 MFA authority',
  'other',
  'unverified',
  false,
  false
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
    'a2000000-0000-4000-8000-000000000011',
    'authenticated',
    'authenticated',
    'phase10-citizen@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2000000-0000-4000-8000-000000000012',
    'authenticated',
    'authenticated',
    'phase10-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2000000-0000-4000-8000-000000000013',
    'authenticated',
    'authenticated',
    'phase10-expired-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.authority_memberships (
  user_id,
  authority_id,
  invitation_email,
  status,
  effective_from,
  effective_until,
  approved_by,
  approved_at
)
values
  (
    'a2000000-0000-4000-8000-000000000012',
    'a2000000-0000-4000-8000-000000000001',
    'phase10-manager@example.test',
    'active',
    current_timestamp - interval '1 day',
    null,
    'a2000000-0000-4000-8000-000000000012',
    current_timestamp - interval '1 day'
  ),
  (
    'a2000000-0000-4000-8000-000000000013',
    'a2000000-0000-4000-8000-000000000001',
    'phase10-expired-manager@example.test',
    'expired',
    current_timestamp - interval '2 days',
    current_timestamp - interval '1 day',
    'a2000000-0000-4000-8000-000000000013',
    current_timestamp - interval '2 days'
  );

insert into public.user_roles (
  user_id,
  role_id,
  authority_id,
  scope_type,
  scope_id,
  effective_from,
  effective_until,
  status,
  granted_by
)
values
  (
    'a2000000-0000-4000-8000-000000000012',
    (select id from public.roles where code = 'municipal_admin'),
    'a2000000-0000-4000-8000-000000000001',
    'authority',
    'a2000000-0000-4000-8000-000000000001',
    current_timestamp - interval '1 day',
    null,
    'active',
    'a2000000-0000-4000-8000-000000000012'
  ),
  (
    'a2000000-0000-4000-8000-000000000013',
    (select id from public.roles where code = 'municipal_admin'),
    'a2000000-0000-4000-8000-000000000001',
    'authority',
    'a2000000-0000-4000-8000-000000000001',
    current_timestamp - interval '2 days',
    current_timestamp - interval '1 day',
    'expired',
    'a2000000-0000-4000-8000-000000000013'
  );

set local role service_role;
select is(
  public.user_requires_privileged_mfa(
    'a2000000-0000-4000-8000-000000000011',
    current_timestamp
  ),
  false,
  'a citizen-only account does not require privileged MFA'
);
select is(
  public.user_requires_privileged_mfa(
    'a2000000-0000-4000-8000-000000000012',
    current_timestamp
  ),
  true,
  'an active municipal administrator requires privileged MFA'
);
select is(
  public.user_requires_privileged_mfa(
    'a2000000-0000-4000-8000-000000000013',
    current_timestamp
  ),
  false,
  'an expired privileged assignment does not require privileged MFA'
);
reset role;

set local "request.jwt.claims" = '{"role":"authenticated","sub":"a2000000-0000-4000-8000-000000000012","aal":"aal1"}';
set local role authenticated;
select is(private.jwt_has_aal2(), false, 'an AAL1 session is not treated as AAL2');
select is(
  private.has_active_role(
    'municipal_admin',
    'authority',
    'a2000000-0000-4000-8000-000000000001'
  ),
  false,
  'an AAL1 privileged user cannot satisfy a direct RLS role check'
);
select is(
  private.can_manage_authority('a2000000-0000-4000-8000-000000000001'),
  false,
  'an AAL1 privileged user cannot satisfy authority-management RLS'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"a2000000-0000-4000-8000-000000000012","aal":"aal2"}';
set local role authenticated;
select is(private.jwt_has_aal2(), true, 'a verified AAL2 session is recognized');
select is(
  private.has_active_role(
    'municipal_admin',
    'authority',
    'a2000000-0000-4000-8000-000000000001'
  ),
  true,
  'an AAL2 privileged user can satisfy a valid direct RLS role check'
);
select is(
  private.can_manage_authority('a2000000-0000-4000-8000-000000000001'),
  true,
  'an AAL2 privileged user can satisfy valid authority-management RLS'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"a2000000-0000-4000-8000-000000000013","aal":"aal2"}';
set local role authenticated;
select is(
  private.has_active_role(
    'municipal_admin',
    'authority',
    'a2000000-0000-4000-8000-000000000001'
  ),
  false,
  'AAL2 does not revive an expired privileged role'
);
select is(
  private.can_manage_authority('a2000000-0000-4000-8000-000000000001'),
  false,
  'AAL2 does not revive an expired authority membership'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"a2000000-0000-4000-8000-000000000011"}';
set local role authenticated;
select is(private.jwt_has_aal2(), false, 'a missing assurance claim fails closed as AAL1');

select * from finish();
rollback;
