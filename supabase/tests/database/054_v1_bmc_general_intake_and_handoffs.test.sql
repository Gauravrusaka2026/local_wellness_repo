begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, routing, governance, complaints, extensions;

select plan(33);

select has_table(
  'routing',
  'complaint_handoff_actions',
  'the private protected-category handoff registry exists'
);

select ok(
  (
    select class.relrowsecurity and class.relforcerowsecurity
    from pg_catalog.pg_class as class
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = class.relnamespace
    where namespace.nspname = 'routing'
      and class.relname = 'complaint_handoff_actions'
  ),
  'the handoff registry enables and forces RLS'
);

select ok(
  not has_table_privilege(
    'anon',
    'routing.complaint_handoff_actions',
    'select'
  )
  and not has_table_privilege(
    'authenticated',
    'routing.complaint_handoff_actions',
    'select'
  ),
  'citizen database roles cannot read protected handoff source records'
);

select ok(
  has_table_privilege(
    'service_role',
    'routing.complaint_handoff_actions',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'routing.complaint_handoff_actions',
    'insert'
  )
  and has_table_privilege(
    'service_role',
    'routing.complaint_handoff_actions',
    'update'
  )
  and has_table_privilege(
    'service_role',
    'routing.complaint_handoff_actions',
    'delete'
  ),
  'only the trusted service role receives direct handoff-table privileges'
);

select ok(
  to_regprocedure('public.list_complaint_taxonomy()') is not null,
  'the extended taxonomy RPC exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_complaint_taxonomy()',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.list_complaint_taxonomy()',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.list_complaint_taxonomy()',
    'execute'
  ),
  'only the trusted API role can invoke the extended taxonomy RPC'
);

select ok(
  to_regprocedure(
    'complaints.complaint_category_display_name(uuid,jsonb)'
  ) is not null,
  'the internal complaint-category display helper exists'
);

select is(
  complaints.complaint_category_display_name(
    (
      select routing_profile_category_id
      from routing.issue_categories
      where taxonomy_code = 'SWM-001'
    ),
    jsonb_build_object(
      'taxonomy_primary_code', 'SWM',
      'taxonomy_subcategory_code', 'SWM-001',
      'taxonomy_workflow_type', 'PUBLIC_HEALTH'
    )
  ),
  (
    select name
    from routing.issue_categories
    where taxonomy_code = 'SWM-001'
  ),
  'the display helper returns the validated taxonomy subcategory name'
);

select is(
  complaints.complaint_category_display_name(
    (select id from routing.issue_categories where code = 'garbage_dump'),
    '{}'::jsonb
  ),
  (select name from routing.issue_categories where code = 'garbage_dump'),
  'the display helper falls back to the operational profile name'
);

select ok(
  pg_get_functiondef(
    to_regprocedure(
      'public.list_owned_complaints(uuid,integer,timestamptz,uuid)'
    )
  ) like '%complaints.complaint_category_display_name%',
  'the citizen complaint list uses the taxonomy display helper'
);

select ok(
  pg_get_functiondef(
    to_regprocedure('public.get_owned_complaint(uuid,uuid)')
  ) like '%complaints.complaint_category_display_name%',
  'the citizen complaint detail uses the taxonomy display helper'
);

select ok(
  pg_get_functiondef(
    to_regprocedure(
      'public.list_government_complaints(uuid,integer,timestamptz,uuid,uuid,text,text[],uuid,uuid,uuid,uuid,timestamptz,timestamptz,text)'
    )
  ) like '%complaints.complaint_category_display_name%'
  and pg_get_functiondef(
    to_regprocedure('public.get_government_complaint(uuid,uuid,uuid)')
  ) like '%complaints.complaint_category_display_name%',
  'government complaint list and detail use the taxonomy display helper'
);

select ok(
  pg_get_functiondef(
    to_regprocedure('public.claim_v1_ward_emails(text,integer,integer)')
  ) like '%complaints.complaint_category_display_name%',
  'ward email claims use the taxonomy display helper'
);

select lives_ok(
  $test$
    update routing.issue_categories
    set routing_status = 'protected_handoff'
    where taxonomy_code in ('COR', 'COR-001')
  $test$,
  'protected primary and subcategory records can enter handoff-ready state'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_public_category',
      category.id,
      'call',
      'Call test service',
      'This row must be rejected because the category is public.',
      '999999999999991',
      'https://example.test/public-category',
      'pgTAP public-category fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'SWM-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_CATEGORY_MUST_BE_PROTECTED',
  'ordinary public taxonomy categories cannot receive protected handoffs'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_email_kind',
      category.id,
      'email',
      'Email test service',
      'Email is deliberately not an allowed protected handoff kind.',
      'authority@example.test',
      'https://example.test/email-kind',
      'pgTAP email-kind fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_KIND_INVALID',
  'email is not an allowed handoff action kind'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_email_call_target',
      category.id,
      'call',
      'Call test service',
      'A call target must contain digits only.',
      'authority@example.test',
      'https://example.test/email-call-target',
      'pgTAP email-call-target fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_TARGET_INVALID',
  'an email address cannot be smuggled into a call target'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_mailto_browser_target',
      category.id,
      'browser',
      'Open test service',
      'A browser target must use HTTPS.',
      'mailto:authority@example.test',
      'https://example.test/mailto-browser-target',
      'pgTAP mailto-browser-target fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_TARGET_INVALID',
  'a mailto URI cannot be smuggled into a browser target'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_credential_browser_target',
      category.id,
      'browser',
      'Open unsafe test service',
      'An HTTPS target must not contain URL credentials.',
      'https://user:password@example.test/unsafe',
      'https://example.test/credential-browser-target',
      'pgTAP credential-browser-target fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_TARGET_INVALID',
  'browser handoff targets reject URL credentials'
);

select throws_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_credential_source_url',
      category.id,
      'call',
      'Call source test service',
      'An official source URL must not contain URL credentials.',
      '999999999999992',
      'https://user:password@example.test/unsafe-source',
      'pgTAP credential-source fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_HANDOFF_SOURCE_URL_INVALID',
  'handoff provenance rejects source URLs containing credentials'
);

select lives_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      priority,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_cor_primary_call',
      category.id,
      'call',
      'Call primary test service',
      'Primary-category fallback used by the pgTAP fixture.',
      '999999999999999',
      90,
      'https://example.test/primary-call',
      'pgTAP primary-call fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR'
  $test$,
  'a digits-only primary call handoff is accepted'
);

select lives_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      priority,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_cor_exact_call',
      category.id,
      'call',
      'Call exact test service',
      'Subcategory-specific action must override the matching primary fallback.',
      '999999999999999',
      100,
      'https://example.test/exact-call',
      'pgTAP exact-call fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  'a digits-only exact call handoff is accepted'
);

select lives_ok(
  $test$
    insert into routing.complaint_handoff_actions (
      action_key,
      taxonomy_category_id,
      action_kind,
      label,
      description,
      target_value,
      priority,
      source_url,
      source_locator,
      source_as_of,
      last_checked_on,
      source_status,
      owner_approved_for_display,
      is_active
    )
    select
      'test_cor_browser',
      category.id,
      'browser',
      'Open exact test service',
      'HTTPS browser action used by the pgTAP fixture.',
      'https://example.test/exact-browser',
      110,
      'https://example.test/exact-browser-source',
      'pgTAP exact-browser fixture',
      '2026-07-24'::date,
      '2026-07-24'::date,
      'source_verified',
      true,
      true
    from routing.issue_categories as category
    where category.taxonomy_code = 'COR-001'
  $test$,
  'an HTTPS browser handoff is accepted'
);

select is(
  (
    select action ->> 'key'
    from public.list_complaint_taxonomy() as taxonomy
    cross join lateral jsonb_array_elements(taxonomy.handoff_actions) as action
    where taxonomy.subcategory_code = 'COR-001'
      and action ->> 'target' = '999999999999999'
  ),
  'test_cor_exact_call',
  'an exact subcategory action overrides a duplicate primary fallback target'
);

select ok(
  (
    select action ?& array[
      'key',
      'kind',
      'label',
      'description',
      'target',
      'priority'
    ]::text[]
    from public.list_complaint_taxonomy() as taxonomy
    cross join lateral jsonb_array_elements(taxonomy.handoff_actions) as action
    where taxonomy.subcategory_code = 'COR-001'
      and action ->> 'key' = 'test_cor_exact_call'
  ),
  'the public handoff contains every documented client field'
);

select is(
  (
    select count(*)::integer
    from public.list_complaint_taxonomy() as taxonomy
    cross join lateral jsonb_array_elements(taxonomy.handoff_actions) as action
    cross join lateral jsonb_object_keys(action) as field_name
    where taxonomy.subcategory_code = 'COR-001'
      and action ->> 'key' = 'test_cor_exact_call'
      and field_name not in (
        'key',
        'kind',
        'label',
        'description',
        'target',
        'priority'
      )
  ),
  0,
  'the public handoff does not expose source records or internal identifiers'
);

select is(
  (
    select routing_status
    from public.list_complaint_taxonomy()
    where subcategory_code = 'COR-001'
  ),
  'protected_handoff',
  'the taxonomy projection exposes the protected handoff-ready state'
);

select is(
  (
    select submission_available
    from public.list_complaint_taxonomy()
    where subcategory_code = 'COR-001'
  ),
  false,
  'a protected handoff is never advertised as an ordinary complaint submission'
);

select throws_ok(
  $test$
    update routing.issue_categories
    set routing_status = 'protected_pending'
    where taxonomy_code = 'COR-001'
  $test$,
  '23514',
  'JAGRUKSETU_CATEGORY_HAS_ACTIVE_HANDOFF',
  'a category with an active handoff cannot be downgraded behind that action'
);

select is(
  (
    select jsonb_typeof(handoff_actions)
    from public.list_complaint_taxonomy()
    where subcategory_code = 'SWM-001'
  ),
  'array',
  'the handoff contract always returns a JSON array, including when empty'
);

select is(
  (
    select submission_available
    from public.list_complaint_taxonomy()
    where subcategory_code = 'SWM-001'
  ),
  true,
  'a mapped taxonomy item with a complete verified V1 ward route is available'
);

select lives_ok(
  $test$
    update routing.ward_issue_contacts as contact
    set is_active = false
    where contact.id = (
      select candidate.id
      from routing.issue_categories as taxonomy
      inner join routing.ward_issue_contacts as candidate
        on candidate.category_id = taxonomy.routing_profile_category_id
      inner join governance.wards as ward on ward.id = candidate.ward_id
      where taxonomy.taxonomy_code = 'SWM-001'
        and candidate.is_active
        and ward.status = 'active'
        and ward.verification_status = 'verified'
        and not ward.is_placeholder
        and ward.is_routing_eligible
      order by ward.ward_number, candidate.id
      limit 1
    )
  $test$,
  'the readiness fixture removes one required ward contact'
);

select is(
  (
    select submission_available
    from public.list_complaint_taxonomy()
    where subcategory_code = 'SWM-001'
  ),
  false,
  'mapped submission availability fails closed when any eligible ward lacks a contact'
);

select * from finish();
rollback;
