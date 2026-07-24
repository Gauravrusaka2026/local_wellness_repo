begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, routing, complaints, extensions;

select plan(39);

select has_column(
  'routing', 'issue_categories', 'category_purpose',
  'categories distinguish taxonomy nodes from operational route profiles'
);
select has_column(
  'routing', 'issue_categories', 'taxonomy_code',
  'taxonomy records carry their stable source code'
);
select has_column(
  'routing', 'issue_categories', 'workflow_type',
  'taxonomy subcategories carry their workflow type'
);
select has_column(
  'routing', 'issue_categories', 'sensitivity_class',
  'taxonomy records carry their privacy class'
);
select has_column(
  'routing', 'issue_categories', 'configuration_status',
  'taxonomy configuration readiness is explicit'
);
select has_column(
  'routing', 'issue_categories', 'routing_status',
  'taxonomy routing readiness is independent from classification readiness'
);
select has_column(
  'routing', 'issue_categories', 'routing_profile_category_id',
  'taxonomy subcategories can map to a server-owned operational profile'
);
select has_column(
  'routing', 'issue_categories', 'public_visibility_default',
  'taxonomy records declare a conservative visibility default'
);
select has_column(
  'routing', 'issue_categories', 'comments_allowed',
  'taxonomy records declare whether comments are allowed'
);
select has_column(
  'routing', 'issue_categories', 'community_support_allowed',
  'taxonomy records declare whether community support is allowed'
);

select is(
  (select count(*)::integer from routing.issue_categories),
  370,
  'thirteen operational profiles and 357 taxonomy nodes coexist'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where category_purpose = 'routing_profile'
  ),
  13,
  'the thirteen operational profile identities are present'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where category_purpose = 'taxonomy_primary'
  ),
  17,
  'all seventeen primary taxonomy categories are seeded'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
  ),
  340,
  'all 340 taxonomy subcategories are seeded'
);
select is(
  (
    select count(distinct workflow_type)::integer
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
  ),
  19,
  'all nineteen workflow types occur in the taxonomy'
);

select is(
  (select count(*)::integer from public.list_complaint_taxonomy()),
  340,
  'the sanitized taxonomy RPC returns one row per subcategory'
);
select is(
  (
    select count(distinct primary_category_id)::integer
    from public.list_complaint_taxonomy()
  ),
  17,
  'the taxonomy RPC returns all primary groups'
);
select is(
  (
    select count(*)::integer
    from public.list_complaint_taxonomy()
    where routing_status = 'mapped'
      and routing_profile_category_id is not null
  ),
  256,
  'all ordinary taxonomy entries map to specialized or general ward profiles'
);
select is(
  (
    select count(*)::integer
    from public.list_complaint_taxonomy()
    where routing_status = 'mapped'
      and submission_available
  ),
  256,
  'all ordinary mappings reflect complete current V1 route readiness'
);
select is(
  (select count(*)::integer from public.list_routing_categories(true)),
  13,
  'the established full operational-profile catalogue excludes taxonomy nodes'
);
select is(
  (select count(*)::integer from public.list_routing_categories(false)),
  13,
  'the established routable-profile catalogue remains unchanged'
);

select is(
  (
    select count(*)::integer
    from routing.issue_categories as subcategory
    inner join routing.issue_categories as primary_category
      on primary_category.id = subcategory.parent_category_id
    where primary_category.taxonomy_code = 'COR'
      and subcategory.workflow_type = 'ANTI_CORRUPTION'
      and subcategory.sensitivity_class = 'PRIVATE'
      and subcategory.routing_status = 'protected_handoff'
      and subcategory.routing_profile_category_id is null
      and not subcategory.public_visibility_default
      and not subcategory.comments_allowed
      and not subcategory.community_support_allowed
  ),
  20,
  'all corruption subcategories are private, non-social, and unmapped'
);
select is(
  (
    select count(*)::integer
    from public.list_complaint_taxonomy()
    where primary_code = 'COR'
      and sensitivity_class = 'PRIVATE'
      and routing_status = 'protected_handoff'
      and not submission_available
  ),
  20,
  'the API projection keeps every corruption intake unavailable until independent routing exists'
);
select is(
  (
    select count(*)::integer
    from routing.ward_issue_contacts as contact
    inner join routing.issue_categories as category on category.id = contact.category_id
    where category.taxonomy_code like 'COR-%'
  ),
  0,
  'no corruption category can reach the ordinary ward contact matrix'
);

select ok(
  to_regprocedure('public.list_complaint_taxonomy()') is not null,
  'the sanitized taxonomy RPC exists'
);
select ok(
  to_regprocedure('complaints.assert_taxonomy_selection(uuid,jsonb)') is not null,
  'the reusable taxonomy tuple assertion exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'complaints.complaints'::regclass
      and trigger_record.tgname = 'complaints_validate_taxonomy_on_submission'
      and not trigger_record.tgisinternal
  ),
  'final complaint insertion revalidates current taxonomy mapping'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'complaints.complaint_drafts'::regclass
      and trigger_record.tgname = 'complaint_drafts_validate_taxonomy_selection'
      and not trigger_record.tgisinternal
  ),
  'draft writes validate taxonomy tuples'
);
select ok(
  has_function_privilege('service_role', 'public.list_complaint_taxonomy()', 'execute'),
  'the trusted API role can read the sanitized taxonomy'
);
select ok(
  not has_function_privilege('anon', 'public.list_complaint_taxonomy()', 'execute')
  and not has_function_privilege(
    'authenticated',
    'public.list_complaint_taxonomy()',
    'execute'
  ),
  'direct citizen API roles cannot bypass the trusted taxonomy endpoint'
);

select lives_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select routing_profile_category_id
       from routing.issue_categories
       where taxonomy_code = 'SWM-001'),
      jsonb_build_object(
        'taxonomy_primary_code', 'SWM',
        'taxonomy_subcategory_code', 'SWM-001',
        'taxonomy_workflow_type', 'PUBLIC_HEALTH'
      )
    )
  $test$,
  'a complete mapped taxonomy tuple accepts its server-owned route profile'
);
select lives_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select id from routing.issue_categories where code = 'garbage_dump'),
      '{}'::jsonb
    )
  $test$,
  'legacy drafts without reserved taxonomy attributes remain compatible'
);
select throws_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select id from routing.issue_categories where code = 'garbage_dump'),
      jsonb_build_object('taxonomy_primary_code', 'SWM')
    )
  $test$,
  '23514',
  'COMPLAINT_TAXONOMY_SELECTION_INCOMPLETE',
  'partial reserved taxonomy attributes are rejected'
);
select lives_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      null,
      jsonb_build_object(
        'taxonomy_primary_code', 'COR',
        'taxonomy_subcategory_code', 'COR-001',
        'taxonomy_workflow_type', 'ANTI_CORRUPTION'
      )
    )
  $test$,
  'an unmapped protected selection may be retained as a non-submittable draft'
);
select throws_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select id from routing.issue_categories where code = 'garbage_dump'),
      jsonb_build_object(
        'taxonomy_primary_code', 'COR',
        'taxonomy_subcategory_code', 'COR-001',
        'taxonomy_workflow_type', 'ANTI_CORRUPTION'
      )
    )
  $test$,
  '23514',
  'COMPLAINT_TAXONOMY_ROUTE_PROFILE_NOT_AVAILABLE',
  'an unmapped protected selection cannot borrow an operational route profile'
);
select throws_ok(
  $test$
    update routing.issue_categories
    set
      routing_status = 'mapped',
      routing_profile_category_id = (
        select id from routing.issue_categories where code = 'garbage_dump'
      )
    where taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_CORRUPTION_INTAKE_MUST_REMAIN_PROTECTED',
  'corruption cannot be mapped to an ordinary operational/ward route'
);

select lives_ok(
  $test$
    update routing.issue_categories
    set routing_profile_category_id = (
      select id from routing.issue_categories where code = 'missed_sweeping'
    )
    where taxonomy_code = 'SWM-001'
  $test$,
  'a reviewed forward change can replace a non-protected taxonomy mapping'
);
select throws_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select id from routing.issue_categories where code = 'garbage_dump'),
      jsonb_build_object(
        'taxonomy_primary_code', 'SWM',
        'taxonomy_subcategory_code', 'SWM-001',
        'taxonomy_workflow_type', 'PUBLIC_HEALTH'
      )
    )
  $test$,
  '23514',
  'COMPLAINT_TAXONOMY_ROUTE_PROFILE_MISMATCH',
  'submission-time tuple revalidation rejects a route mapping changed after draft save'
);
select lives_ok(
  $test$
    select complaints.assert_taxonomy_selection(
      (select id from routing.issue_categories where code = 'missed_sweeping'),
      jsonb_build_object(
        'taxonomy_primary_code', 'SWM',
        'taxonomy_subcategory_code', 'SWM-001',
        'taxonomy_workflow_type', 'PUBLIC_HEALTH'
      )
    )
  $test$,
  'the replacement mapping becomes the only accepted submission tuple'
);

select * from finish();
rollback;
