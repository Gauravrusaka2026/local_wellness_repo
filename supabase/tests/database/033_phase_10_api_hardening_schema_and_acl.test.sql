begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions;

select plan(21);

select has_table('private'::name, 'api_rate_limit_windows'::name);
select has_index(
  'private',
  'api_rate_limit_windows',
  'api_rate_limit_windows_expiry_idx',
  'expired quota windows have a bounded-cleanup index'
);
select ok(
  (
    select relation.relrowsecurity and relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'private'
      and relation.relname = 'api_rate_limit_windows'
  ),
  'the quota table enables and forces RLS'
);

select ok(not has_table_privilege(
  'service_role', 'private.api_rate_limit_windows', 'select'
), 'service role cannot read quota subjects directly');
select ok(not has_table_privilege(
  'authenticated', 'private.api_rate_limit_windows', 'select'
), 'authenticated clients cannot read quota subjects directly');
select ok(not has_table_privilege(
  'anon', 'private.api_rate_limit_windows', 'select'
), 'anonymous clients cannot read quota subjects directly');

select ok(to_regprocedure(
  'public.consume_api_rate_limit(text,text,integer,integer)'
) is not null, 'quota consumption RPC exists');
select ok(to_regprocedure(
  'public.purge_expired_api_rate_limits(integer)'
) is not null, 'quota cleanup RPC exists');
select ok(to_regprocedure(
  'public.api_readiness_check()'
) is not null, 'API readiness RPC exists');

select ok(has_function_privilege(
  'service_role', 'public.consume_api_rate_limit(text,text,integer,integer)', 'execute'
), 'service role can consume quota');
select ok(has_function_privilege(
  'service_role', 'public.purge_expired_api_rate_limits(integer)', 'execute'
), 'service role can purge expired quota windows');
select ok(has_function_privilege(
  'service_role', 'public.api_readiness_check()', 'execute'
), 'service role can execute the readiness probe');

select ok(not has_function_privilege(
  'authenticated', 'public.consume_api_rate_limit(text,text,integer,integer)', 'execute'
), 'authenticated clients cannot consume quota directly');
select ok(not has_function_privilege(
  'authenticated', 'public.purge_expired_api_rate_limits(integer)', 'execute'
), 'authenticated clients cannot purge quota directly');
select ok(not has_function_privilege(
  'authenticated', 'public.api_readiness_check()', 'execute'
), 'authenticated clients cannot execute the readiness probe');

select ok(not has_function_privilege(
  'anon', 'public.consume_api_rate_limit(text,text,integer,integer)', 'execute'
), 'anonymous clients cannot consume quota directly');
select ok(not has_function_privilege(
  'anon', 'public.purge_expired_api_rate_limits(integer)', 'execute'
), 'anonymous clients cannot purge quota directly');
select ok(not has_function_privilege(
  'anon', 'public.api_readiness_check()', 'execute'
), 'anonymous clients cannot execute the readiness probe');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'consume_api_rate_limit',
      'purge_expired_api_rate_limits',
      'api_readiness_check'
    )
    and procedure.prosecdef
    and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
), 'every Phase 10 security-definer function pins an empty search path');

set local role service_role;
select is(public.api_readiness_check(), true, 'required V1 database and private buckets are ready');
reset role;

select is(
  (select count(*)::integer from private.api_rate_limit_windows),
  0,
  'the baseline contains no quota subjects'
);

select * from finish();
rollback;
