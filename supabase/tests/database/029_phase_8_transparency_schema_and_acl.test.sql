begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(45);

select has_table('complaints', 'public_visibility_policies');
select has_table('complaints', 'public_visibility_policy_versions');
select has_table('complaints', 'public_visibility_category_rules');
select has_table('complaints', 'complaint_publication_reviews');
select has_table('complaints', 'complaint_publication_projections');
select has_table('complaints', 'complaint_duplicate_group_versions');
select has_table('complaints', 'complaint_duplicate_group_members');
select has_table('complaints', 'public_media_derivatives');

select ok(to_regprocedure(
  'public.list_public_complaint_projections(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text)'
) is not null, 'bounded public complaint list RPC exists');
select ok(to_regprocedure(
  'public.get_public_complaint_projection(uuid)'
) is not null, 'public complaint detail RPC exists');
select ok(to_regprocedure(
  'public.list_public_complaint_hotspots(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer)'
) is not null, 'bounded hotspot RPC exists');
select ok(to_regprocedure(
  'public.list_public_ward_boundaries(double precision,double precision,double precision,double precision,integer)'
) is not null, 'bounded ward RPC exists');
select ok(to_regprocedure(
  'public.review_and_publish_complaint_projection(uuid,uuid,text,text,text)'
) is not null, 'privileged review-and-publish RPC exists');
select ok(to_regprocedure(
  'public.withdraw_public_complaint_projection(uuid,uuid,text,text)'
) is not null, 'privileged withdrawal RPC exists');
select ok(to_regprocedure(
  'public.review_public_duplicate_group(uuid,uuid[],uuid,text)'
) is not null, 'privileged public duplicate-group review RPC exists');
select ok(to_regprocedure(
  'public.withdraw_public_duplicate_group(uuid,uuid,text)'
) is not null, 'privileged public duplicate-group withdrawal RPC exists');

select ok(not exists (
  select 1
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = any(array[
      'public_visibility_policies',
      'public_visibility_policy_versions',
      'public_visibility_category_rules',
      'complaint_publication_reviews',
      'complaint_publication_projections',
      'complaint_duplicate_group_versions',
      'complaint_duplicate_group_members',
      'public_media_derivatives'
    ])
    and (not relation.relrowsecurity or not relation.relforcerowsecurity)
), 'all Phase 8 tables enable and force RLS');

select is(
  (select count(*)::integer from complaints.public_visibility_policy_versions),
  0,
  'Phase 8 seeds no visibility policy version'
);
select is(
  (select count(*)::integer from complaints.complaint_publication_projections),
  0,
  'Phase 8 seeds no public complaint projection'
);

select ok(not has_table_privilege(
  'service_role',
  'complaints.complaint_publication_projections',
  'select'
), 'service role cannot read projection tables directly');
select ok(not has_table_privilege(
  'authenticated',
  'complaints.complaint_publication_reviews',
  'select'
), 'authenticated clients cannot read reviewer evidence');
select ok(not has_table_privilege(
  'anon',
  'complaints.public_visibility_policy_versions',
  'select'
), 'anonymous clients cannot read policy tables directly');
select ok(not has_table_privilege(
  'service_role',
  'complaints.public_media_derivatives',
  'select'
), 'service role cannot bypass the processed-media boundary');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'complaints'
    and procedure.proname = any(array[
      'map_public_complaint_status',
      'actor_can_review_publication',
      'validate_public_visibility_policy_version',
      'validate_public_visibility_category_rule',
      'validate_complaint_publication_review',
      'validate_complaint_publication_projection',
      'validate_public_media_derivative_scope',
      'validate_public_transparency_query',
      'current_public_complaint_projections',
      'public_complaint_projection_payload',
      'public_duplicate_group_payload'
    ])
    and has_function_privilege('public', procedure.oid, 'execute')
), 'internal Phase 8 functions retain no PUBLIC execute grant');

select ok(not has_function_privilege(
  'service_role',
  'complaints.public_duplicate_group_payload(uuid,timestamp with time zone)',
  'execute'
), 'service role cannot invoke the internal duplicate-group projection helper directly');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where procedure.prosecdef
    and namespace.nspname in ('public', 'complaints')
    and procedure.proname = any(array[
      'actor_can_review_publication',
      'validate_public_visibility_policy_version',
      'validate_public_visibility_category_rule',
      'validate_complaint_publication_review',
      'validate_complaint_publication_projection',
      'validate_public_media_derivative_scope',
      'current_public_complaint_projections',
      'public_complaint_projection_payload',
      'list_public_complaint_projections',
      'get_public_complaint_projection',
      'list_public_complaint_hotspots',
      'list_public_ward_boundaries',
      'review_and_publish_complaint_projection',
      'withdraw_public_complaint_projection',
      'public_duplicate_group_payload',
      'review_public_duplicate_group',
      'withdraw_public_duplicate_group'
    ])
    and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
), 'every Phase 8 security-definer function pins an empty search path');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'list_public_complaint_projections',
      'get_public_complaint_projection',
      'list_public_complaint_hotspots',
      'list_public_ward_boundaries',
      'review_and_publish_complaint_projection',
      'withdraw_public_complaint_projection',
      'review_public_duplicate_group',
      'withdraw_public_duplicate_group'
    ])
    and not has_function_privilege('service_role', procedure.oid, 'execute')
), 'service role can invoke every intended Phase 8 RPC');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'list_public_complaint_projections',
      'get_public_complaint_projection',
      'list_public_complaint_hotspots',
      'list_public_ward_boundaries',
      'review_and_publish_complaint_projection',
      'withdraw_public_complaint_projection',
      'review_public_duplicate_group',
      'withdraw_public_duplicate_group'
    ])
    and has_function_privilege('authenticated', procedure.oid, 'execute')
), 'authenticated clients cannot invoke Phase 8 service RPCs directly');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'list_public_complaint_projections',
      'get_public_complaint_projection',
      'list_public_complaint_hotspots',
      'list_public_ward_boundaries',
      'review_and_publish_complaint_projection',
      'withdraw_public_complaint_projection',
      'review_public_duplicate_group',
      'withdraw_public_duplicate_group'
    ])
    and has_function_privilege('anon', procedure.oid, 'execute')
), 'anonymous clients cannot invoke Phase 8 database RPCs directly');

select is((
  select count(*)::integer
  from pg_catalog.pg_policies
  where schemaname = 'complaints'
    and tablename = any(array[
      'public_visibility_policies',
      'public_visibility_policy_versions',
      'public_visibility_category_rules',
      'complaint_publication_reviews',
      'complaint_publication_projections',
      'complaint_duplicate_group_versions',
      'complaint_duplicate_group_members',
      'public_media_derivatives'
    ])
), 0, 'Phase 8 creates no direct row policy around its service-only boundary');

select has_trigger(
  'complaints',
  'public_visibility_policy_versions',
  'public_visibility_policy_versions_validate',
  'policy approval and immutable effective history are enforced'
);
select has_trigger(
  'complaints',
  'complaint_publication_reviews',
  'complaint_publication_reviews_append_only',
  'publication review evidence is append-only'
);
select has_trigger(
  'complaints',
  'complaint_publication_projections',
  'complaint_publication_projections_append_only',
  'public projection versions are append-only'
);
select has_trigger(
  'complaints',
  'complaint_duplicate_group_versions',
  'complaint_duplicate_group_versions_append_only',
  'reviewed duplicate-group versions are append-only'
);
select has_trigger(
  'complaints',
  'public_media_derivatives',
  'public_media_derivatives_append_only',
  'processed-media derivative records are append-only'
);

select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'public_media_derivatives_publication_check'
    and pg_get_constraintdef(constraint_record.oid) like '%unavailable%'
), 'processed media remains structurally unavailable');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaints_phase4_visibility_check'
    and pg_get_constraintdef(constraint_record.oid) like '%private%'
), 'the private source complaint visibility invariant remains unchanged');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaint_publication_projections_location_check'
), 'projection geometry is constrained to a valid WGS84 point');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaint_publication_projections_complaint_version_unique'
), 'complaint publication versions cannot collide');

select ok((
  select pg_get_function_result(to_regprocedure(
    'public.list_public_complaint_projections(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text)'
  )) = 'TABLE(projection jsonb)'
), 'complaint list exposes only an allowlisted JSON wrapper');
select ok((
  select pg_get_function_result(to_regprocedure(
    'public.get_public_complaint_projection(uuid)'
  )) = 'TABLE(projection jsonb)'
), 'complaint detail exposes only an allowlisted JSON wrapper');
select ok((
  select pg_get_function_result(to_regprocedure(
    'public.list_public_complaint_hotspots(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer)'
  )) = 'TABLE(hotspot jsonb)'
), 'hotspots expose only an allowlisted JSON wrapper');
select ok((
  select pg_get_function_result(to_regprocedure(
    'public.list_public_ward_boundaries(double precision,double precision,double precision,double precision,integer)'
  )) = 'TABLE(ward_boundary jsonb)'
), 'ward boundaries expose only an allowlisted JSON wrapper');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname like '%public%media%'
), 'Phase 8 exposes no public-media RPC');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname like '%public%comment%'
), 'Phase 8 exposes no public-comment RPC');

select * from finish();
rollback;
