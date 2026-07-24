begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select ok(
  to_regprocedure('public.hook_require_email_identity(jsonb)') is not null,
  'the email-identity signup hook exists'
);
select ok(
  has_function_privilege(
    'supabase_auth_admin',
    'public.hook_require_email_identity(jsonb)',
    'execute'
  ),
  'Supabase Auth can execute the signup hook'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.hook_require_email_identity(jsonb)',
    'execute'
  )
    and not has_function_privilege(
      'anon',
      'public.hook_require_email_identity(jsonb)',
      'execute'
    )
    and not has_function_privilege(
      'service_role',
      'public.hook_require_email_identity(jsonb)',
      'execute'
    ),
  'application roles cannot invoke the signup hook'
);
select ok(
  (
    select not procedure.prosecdef
      and 'search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[]))
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.hook_require_email_identity(jsonb)'::regprocedure
  ),
  'the hook is security invoker with an empty search path'
);
select is(
  public.hook_require_email_identity(
    '{"metadata":{"name":"before-user-created"},"user":{"email":"citizen@example.test","phone":""}}'
  ),
  '{}'::jsonb,
  'an email account is allowed'
);
select is(
  public.hook_require_email_identity(
    '{"metadata":{"name":"before-user-created"},"user":{"email":" citizen@example.test ","phone":""}}'
  ),
  '{}'::jsonb,
  'a provider email with surrounding whitespace is still recognized'
);
select is(
  public.hook_require_email_identity(
    '{"metadata":{"name":"before-user-created"},"user":{"email":"","phone":"12025550123"}}'
  ) #>> '{error,code}',
  'email_required',
  'a phone-only account is rejected'
);
select is(
  (
    public.hook_require_email_identity(
      '{"metadata":{"name":"before-user-created"},"user":{"phone":"12025550123"}}'
    ) #>> '{error,http_code}'
  )::integer,
  403,
  'a missing email fails closed with a forbidden response'
);

select * from finish();
rollback;
