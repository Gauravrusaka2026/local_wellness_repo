begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, extensions;

select plan(17);

select has_table('complaints', 'public_complaint_engagements');
select col_is_pk(
  'complaints',
  'public_complaint_engagements',
  array['complaint_id', 'user_id'],
  'one account has one current state per source complaint'
);
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = 'public_complaint_engagements'
), 'engagement state enables and forces RLS');
select is((
  select count(*)::integer
  from pg_catalog.pg_policies
  where schemaname = 'complaints'
    and tablename = 'public_complaint_engagements'
), 0, 'engagement state has no direct row policy');

select ok(not has_table_privilege(
  'service_role',
  'complaints.public_complaint_engagements',
  'select'
), 'service role cannot read private engagement rows directly');
select ok(not has_table_privilege(
  'authenticated',
  'complaints.public_complaint_engagements',
  'select'
), 'authenticated clients cannot read private engagement rows directly');
select ok(not has_table_privilege(
  'anon',
  'complaints.public_complaint_engagements',
  'select'
), 'anonymous clients cannot read private engagement rows directly');

select ok(to_regprocedure(
  'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)'
) is not null, 'reviewed public feed supports explicit recent or trending order');
select ok(to_regprocedure(
  'public.list_public_complaint_engagements(uuid,uuid[])'
) is not null, 'private batch engagement lookup exists');
select ok(to_regprocedure(
  'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)'
) is not null, 'idempotent engagement set-state RPC exists');

select ok(has_function_privilege(
  'service_role',
  'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)',
  'execute'
), 'service role can execute the reviewed feed function');
select ok(has_function_privilege(
  'service_role',
  'public.list_public_complaint_engagements(uuid,uuid[])',
  'execute'
), 'service role can execute engagement lookup');
select ok(has_function_privilege(
  'service_role',
  'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)',
  'execute'
), 'service role can execute engagement set-state');

select ok(not has_function_privilege(
  'authenticated',
  'public.set_public_complaint_engagement(uuid,uuid,boolean,boolean)',
  'execute'
), 'authenticated clients cannot bypass the API engagement boundary');
select ok(not has_function_privilege(
  'anon',
  'public.list_public_complaint_engagements(uuid,uuid[])',
  'execute'
), 'anonymous clients cannot read viewer engagement state');
select ok(not has_function_privilege(
  'service_role',
  'complaints.public_complaint_support_count(uuid)',
  'execute'
), 'the aggregate helper remains internal');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('public', 'complaints')
    and procedure.proname = any(array[
      'public_complaint_support_count',
      'list_public_complaint_feed',
      'list_public_complaint_engagements',
      'set_public_complaint_engagement'
    ])
    and procedure.prosecdef
    and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
), 'every engagement security-definer function pins an empty search path');

select * from finish();
rollback;
