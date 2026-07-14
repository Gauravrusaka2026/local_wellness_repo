begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions;

select plan(14);

select has_function(
  'private',
  'backfill_missing_auth_identities',
  array[]::text[],
  'the auth identity repair function exists'
);
select ok(
  not has_function_privilege('public', 'private.backfill_missing_auth_identities()', 'execute'),
  'PUBLIC cannot execute the auth identity repair function'
);
select ok(
  not has_function_privilege('anon', 'private.backfill_missing_auth_identities()', 'execute'),
  'anonymous clients cannot execute the auth identity repair function'
);
select ok(
  not has_function_privilege('authenticated', 'private.backfill_missing_auth_identities()', 'execute'),
  'authenticated clients cannot execute the auth identity repair function'
);
select ok(
  not has_function_privilege('service_role', 'private.backfill_missing_auth_identities()', 'execute'),
  'the service role cannot invoke the one-time repair operation'
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
    'f1900000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'legacy.citizen@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Legacy Citizen","preferred_language":"mr"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f1900000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'existing.citizen@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Auth Metadata Must Not Win","preferred_language":"en"}',
    now(),
    now()
  );

delete from public.user_roles
where user_id = 'f1900000-0000-4000-8000-000000000001'
  and role_id = (select id from public.roles where code = 'citizen');

delete from public.profiles
where id = 'f1900000-0000-4000-8000-000000000001';

update public.profiles
set
  display_name = 'Application Profile Wins',
  preferred_language = 'hi',
  trust_score = 42
where id = 'f1900000-0000-4000-8000-000000000002';

update public.user_roles
set
  status = 'revoked',
  revoked_by = 'f1900000-0000-4000-8000-000000000002',
  revoked_at = now()
where user_id = 'f1900000-0000-4000-8000-000000000002'
  and role_id = (select id from public.roles where code = 'citizen')
  and scope_type = 'global'
  and status = 'active';

insert into public.user_roles (user_id, role_id, scope_type, status)
select
  'f1900000-0000-4000-8000-000000000002',
  role.id,
  'global',
  'active'
from public.roles as role
where role.code = 'platform_admin';

create temporary table first_backfill_result on commit drop as
select * from private.backfill_missing_auth_identities();

select is(
  (select profiles_inserted from first_backfill_result),
  1::bigint,
  'the repair inserts exactly the missing profile'
);
select is(
  (select citizen_roles_inserted from first_backfill_result),
  1::bigint,
  'the repair inserts exactly the missing global citizen role'
);
select results_eq(
  $$
    select display_name, email, preferred_language, status
    from public.profiles
    where id = 'f1900000-0000-4000-8000-000000000001'
  $$,
  $$values ('Legacy Citizen'::text, 'legacy.citizen@example.test'::text, 'mr'::text, 'active'::text)$$,
  'the missing profile is safely derived from Supabase Auth identity data'
);
select results_eq(
  $$
    select display_name, preferred_language, trust_score
    from public.profiles
    where id = 'f1900000-0000-4000-8000-000000000002'
  $$,
  $$values ('Application Profile Wins'::text, 'hi'::text, 42::smallint)$$,
  'existing application profile data is not overwritten'
);
select is(
  (
    select count(*)::integer
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = 'f1900000-0000-4000-8000-000000000001'
      and role.code = 'citizen'
      and user_role.scope_type = 'global'
      and user_role.status = 'active'
  ),
  1,
  'the repaired user receives one active global citizen role'
);
select is(
  (
    select count(*)::integer
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = 'f1900000-0000-4000-8000-000000000002'
      and role.code = 'citizen'
      and user_role.scope_type = 'global'
      and user_role.status = 'revoked'
  ),
  1,
  'revoked citizen-role history is preserved instead of being reactivated'
);
select is(
  (
    select count(*)::integer
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = 'f1900000-0000-4000-8000-000000000002'
      and role.code = 'platform_admin'
      and role.is_privileged
      and user_role.status = 'active'
  ),
  1,
  'existing privileged access is left unchanged'
);

create temporary table second_backfill_result on commit drop as
select * from private.backfill_missing_auth_identities();

select is(
  (select profiles_inserted from second_backfill_result),
  0::bigint,
  'a repeated repair does not insert profiles'
);
select is(
  (select citizen_roles_inserted from second_backfill_result),
  0::bigint,
  'a repeated repair does not insert citizen roles'
);

select * from finish();
rollback;
