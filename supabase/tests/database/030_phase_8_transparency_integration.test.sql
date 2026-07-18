begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(58);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'e8000000-0000-4000-8000-000000000001',
  'Synthetic Phase 8 official fixture',
  'https://official.gov.test/phase-8-fixture',
  'official',
  current_date
);

insert into governance.authorities (
  id, code, name, authority_type, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8100000-0000-4000-8000-000000000001',
  'PHASE8_TEST_STATE',
  'Phase 8 Test State',
  'state',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'e8100000-0000-4000-8000-000000000002',
  'e8100000-0000-4000-8000-000000000001',
  'PHASE8_TEST_AUTHORITY',
  'Phase 8 Test Authority',
  'local_body',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.states (
  id, authority_id, name, iso_code, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8200000-0000-4000-8000-000000000001',
  'e8100000-0000-4000-8000-000000000001',
  'Phase 8 Test State',
  'PES',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, lgd_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'e8300000-0000-4000-8000-000000000001',
  'e8100000-0000-4000-8000-000000000002',
  'e8200000-0000-4000-8000-000000000001',
  'Phase 8 Test Municipal Corporation',
  'municipal_corporation',
  '980001',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.wards (
  id, local_body_id, source_ward_code, lgd_code, name, ward_number,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'e8400000-0000-4000-8000-000000000001',
  'e8300000-0000-4000-8000-000000000001',
  'PHASE8-WARD-1',
  '980101',
  'Phase 8 Ward 1',
  '1',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, ward_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'e8500000-0000-4000-8000-000000000001',
  'e8400000-0000-4000-8000-000000000001',
  1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))',
    4326
  ),
  'active',
  'verified',
  true,
  current_timestamp - interval '1 year',
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8600000-0000-4000-8000-000000000001',
  'phase8_test_department',
  'Phase 8 Test Department',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8700000-0000-4000-8000-000000000001',
  'e8100000-0000-4000-8000-000000000002',
  'e8600000-0000-4000-8000-000000000001',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8800000-0000-4000-8000-000000000001',
  'phase8_test_officer',
  'Phase 8 Test Officer',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8900000-0000-4000-8000-000000000001',
  'phase8_test_domain',
  'Phase 8 Test Domain',
  'active',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e8a00000-0000-4000-8000-000000000001',
  'e8900000-0000-4000-8000-000000000001',
  'phase8_test_category',
  'Phase 8 Test Category',
  'active',
  'verified',
  true,
  current_date,
  'e8000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'e8b00000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'phase8-citizen@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e8b00000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'phase8-admin@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e8b00000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'phase8-moderator@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.user_roles (
  user_id, role_id, scope_type, effective_from, granted_by
)
select
  'e8b00000-0000-4000-8000-000000000002',
  role.id,
  'global',
  current_timestamp - interval '1 day',
  'e8b00000-0000-4000-8000-000000000002'
from public.roles as role
where role.code = 'platform_admin';

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values (
  'e8b00000-0000-4000-8000-000000000003',
  'e8100000-0000-4000-8000-000000000002',
  'phase8-moderator@example.test',
  'active',
  current_timestamp - interval '1 day',
  'e8b00000-0000-4000-8000-000000000002',
  'e8b00000-0000-4000-8000-000000000002',
  current_timestamp - interval '1 day'
);

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'e8b00000-0000-4000-8000-000000000003',
  role.id,
  'e8100000-0000-4000-8000-000000000002',
  'authority',
  'e8100000-0000-4000-8000-000000000002',
  current_timestamp - interval '1 day',
  'e8b00000-0000-4000-8000-000000000002'
from public.roles as role
where role.code = 'moderator';

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash,
  creation_request_fingerprint, category_id, description,
  created_at, updated_at
)
values
  (
    'e8c00000-0000-4000-8000-000000000001',
    'e8b00000-0000-4000-8000-000000000001', repeat('1', 64), repeat('a', 64),
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint one.',
    current_timestamp - interval '20 minutes', current_timestamp - interval '20 minutes'
  ),
  (
    'e8c00000-0000-4000-8000-000000000002',
    'e8b00000-0000-4000-8000-000000000001', repeat('2', 64), repeat('b', 64),
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint two.',
    current_timestamp - interval '19 minutes', current_timestamp - interval '19 minutes'
  ),
  (
    'e8c00000-0000-4000-8000-000000000003',
    'e8b00000-0000-4000-8000-000000000001', repeat('3', 64), repeat('c', 64),
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint three.',
    current_timestamp - interval '18 minutes', current_timestamp - interval '18 minutes'
  );

insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, received_at,
  spoof_risk_status, verification_status, verification_score
)
values
  (
    'e8d00000-0000-4000-8000-000000000001',
    'e8c00000-0000-4000-8000-000000000001',
    'e8b00000-0000-4000-8000-000000000001', 'current_location',
    extensions.st_setsrid(extensions.st_makepoint(73.81, 18.51), 4326),
    10, 'gps', current_timestamp - interval '20 minutes',
    current_timestamp - interval '20 minutes', current_timestamp - interval '20 minutes',
    'low', 'verified', 0.99
  ),
  (
    'e8d00000-0000-4000-8000-000000000002',
    'e8c00000-0000-4000-8000-000000000002',
    'e8b00000-0000-4000-8000-000000000001', 'current_location',
    extensions.st_setsrid(extensions.st_makepoint(73.82, 18.52), 4326),
    10, 'gps', current_timestamp - interval '19 minutes',
    current_timestamp - interval '19 minutes', current_timestamp - interval '19 minutes',
    'low', 'verified', 0.99
  ),
  (
    'e8d00000-0000-4000-8000-000000000003',
    'e8c00000-0000-4000-8000-000000000003',
    'e8b00000-0000-4000-8000-000000000001', 'current_location',
    extensions.st_setsrid(extensions.st_makepoint(73.83, 18.53), 4326),
    10, 'gps', current_timestamp - interval '18 minutes',
    current_timestamp - interval '18 minutes', current_timestamp - interval '18 minutes',
    'low', 'verified', 0.99
  );

update complaints.complaint_drafts as draft
set selected_location_evidence_id = evidence.id,
    status = 'submitted',
    submitted_at = draft.created_at + interval '1 minute'
from complaints.complaint_location_evidence as evidence
where evidence.draft_id = draft.id
  and draft.id in (
    'e8c00000-0000-4000-8000-000000000001',
    'e8c00000-0000-4000-8000-000000000002',
    'e8c00000-0000-4000-8000-000000000003'
  );

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location, accuracy_meters,
  captured_at, resolved_at, decision_status, explanation_codes
)
values
  (
    'e8e00000-0000-4000-8000-000000000001',
    'e8b00000-0000-4000-8000-000000000001', 'phase8-routing-1',
    'e8a00000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.81, 18.51), 4326),
    10, current_timestamp - interval '20 minutes', current_timestamp - interval '20 minutes',
    'manual_review', array['phase8_fixture']::text[]
  ),
  (
    'e8e00000-0000-4000-8000-000000000002',
    'e8b00000-0000-4000-8000-000000000001', 'phase8-routing-2',
    'e8a00000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.82, 18.52), 4326),
    10, current_timestamp - interval '19 minutes', current_timestamp - interval '19 minutes',
    'manual_review', array['phase8_fixture']::text[]
  ),
  (
    'e8e00000-0000-4000-8000-000000000003',
    'e8b00000-0000-4000-8000-000000000001', 'phase8-routing-3',
    'e8a00000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.83, 18.53), 4326),
    10, current_timestamp - interval '18 minutes', current_timestamp - interval '18 minutes',
    'manual_review', array['phase8_fixture']::text[]
  );
set local session_replication_role = origin;

insert into complaints.complaints (
  id, draft_id, complaint_number, citizen_user_id, category_id, description,
  description_language, custom_attributes, location_evidence_id,
  routing_decision_id, current_status, submitted_at, created_at, updated_at
)
values
  (
    'e8f00000-0000-4000-8000-000000000001',
    'e8c00000-0000-4000-8000-000000000001', 'LW-20260716-98000001',
    'e8b00000-0000-4000-8000-000000000001',
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint one.', 'en', '{}',
    'e8d00000-0000-4000-8000-000000000001',
    'e8e00000-0000-4000-8000-000000000001', 'submitted',
    current_timestamp - interval '19 minutes',
    current_timestamp - interval '20 minutes', current_timestamp - interval '19 minutes'
  ),
  (
    'e8f00000-0000-4000-8000-000000000002',
    'e8c00000-0000-4000-8000-000000000002', 'LW-20260716-98000002',
    'e8b00000-0000-4000-8000-000000000001',
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint two.', 'en', '{}',
    'e8d00000-0000-4000-8000-000000000002',
    'e8e00000-0000-4000-8000-000000000002', 'submitted',
    current_timestamp - interval '18 minutes',
    current_timestamp - interval '19 minutes', current_timestamp - interval '18 minutes'
  ),
  (
    'e8f00000-0000-4000-8000-000000000003',
    'e8c00000-0000-4000-8000-000000000003', 'LW-20260716-98000003',
    'e8b00000-0000-4000-8000-000000000001',
    'e8a00000-0000-4000-8000-000000000001',
    'Private Phase 8 complaint three.', 'en', '{}',
    'e8d00000-0000-4000-8000-000000000003',
    'e8e00000-0000-4000-8000-000000000003', 'submitted',
    current_timestamp - interval '17 minutes',
    current_timestamp - interval '18 minutes', current_timestamp - interval '17 minutes'
  );

insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
  department_id, authority_department_id, officer_role_id, assigned_at
)
values
  (
    'e8aa0000-0000-4000-8000-000000000001',
    'e8f00000-0000-4000-8000-000000000001',
    'e8e00000-0000-4000-8000-000000000001',
    'e8100000-0000-4000-8000-000000000002',
    'e8300000-0000-4000-8000-000000000001',
    'e8400000-0000-4000-8000-000000000001',
    'e8600000-0000-4000-8000-000000000001',
    'e8700000-0000-4000-8000-000000000001',
    'e8800000-0000-4000-8000-000000000001',
    current_timestamp - interval '19 minutes'
  ),
  (
    'e8aa0000-0000-4000-8000-000000000002',
    'e8f00000-0000-4000-8000-000000000002',
    'e8e00000-0000-4000-8000-000000000002',
    'e8100000-0000-4000-8000-000000000002',
    'e8300000-0000-4000-8000-000000000001',
    'e8400000-0000-4000-8000-000000000001',
    'e8600000-0000-4000-8000-000000000001',
    'e8700000-0000-4000-8000-000000000001',
    'e8800000-0000-4000-8000-000000000001',
    current_timestamp - interval '18 minutes'
  ),
  (
    'e8aa0000-0000-4000-8000-000000000003',
    'e8f00000-0000-4000-8000-000000000003',
    'e8e00000-0000-4000-8000-000000000003',
    'e8100000-0000-4000-8000-000000000002',
    'e8300000-0000-4000-8000-000000000001',
    'e8400000-0000-4000-8000-000000000001',
    'e8600000-0000-4000-8000-000000000001',
    'e8700000-0000-4000-8000-000000000001',
    'e8800000-0000-4000-8000-000000000001',
    current_timestamp - interval '17 minutes'
  );

select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100, null
  )
), 0, 'public reads fail closed before a policy and review exist');

insert into complaints.public_visibility_policies (
  id, local_body_id, code, name
)
values (
  'e8ab0000-0000-4000-8000-000000000001',
  'e8300000-0000-4000-8000-000000000001',
  'phase8_test_visibility',
  'Phase 8 Test Visibility'
);

select throws_ok(
  $$insert into complaints.public_visibility_policy_versions (
      public_visibility_policy_id, version, status, allowed_complaint_statuses,
      minimum_hotspot_complaint_count, effective_from,
      approved_by_user_id, approved_at, created_at
    ) values (
      'e8ab0000-0000-4000-8000-000000000001', 99, 'approved',
      array['submitted'], 3, current_timestamp - interval '30 minutes',
      'e8b00000-0000-4000-8000-000000000002',
      current_timestamp - interval '1 hour',
      current_timestamp - interval '2 hours'
    )$$,
  '55000',
  'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID',
  'a visibility policy version cannot bypass the draft review state'
);

insert into complaints.public_visibility_policy_versions (
  id, public_visibility_policy_id, version, allowed_complaint_statuses,
  minimum_hotspot_complaint_count, effective_from, created_at
)
values (
  'e8ac0000-0000-4000-8000-000000000001',
  'e8ab0000-0000-4000-8000-000000000001',
  1,
  array['submitted'],
  3,
  current_timestamp - interval '30 minutes',
  current_timestamp - interval '2 hours'
);

insert into complaints.public_visibility_category_rules (
  id, public_visibility_policy_version_id, category_id, publication_allowed
)
values (
  'e8ad0000-0000-4000-8000-000000000001',
  'e8ac0000-0000-4000-8000-000000000001',
  'e8a00000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$update complaints.public_visibility_policy_versions
    set status = 'approved',
        approved_by_user_id = 'e8b00000-0000-4000-8000-000000000003',
        approved_at = current_timestamp - interval '1 hour'
    where id = 'e8ac0000-0000-4000-8000-000000000001'$$,
  '42501',
  'PUBLICATION_REVIEW_FORBIDDEN',
  'an authority moderator cannot activate public visibility policy'
);

update complaints.public_visibility_policy_versions
set status = 'approved',
    approved_by_user_id = 'e8b00000-0000-4000-8000-000000000002',
    approved_at = current_timestamp - interval '1 hour'
where id = 'e8ac0000-0000-4000-8000-000000000001';

select is((
  select status
  from complaints.public_visibility_policy_versions
  where id = 'e8ac0000-0000-4000-8000-000000000001'
), 'approved', 'a platform administrator can approve a fully configured draft policy');

select throws_ok(
  $$select public.review_and_publish_complaint_projection(
    'e8b00000-0000-4000-8000-000000000003',
    'e8f00000-0000-4000-8000-000000000001',
    'Reviewed public title one',
    'Reviewed public summary one.',
    'phase8-publish-forbidden'
  )$$,
  '42501',
  'PUBLICATION_REVIEW_FORBIDDEN',
  'a scoped moderator cannot publish a complaint projection'
);

create temporary table phase8_publications (
  complaint_id uuid primary key,
  publication jsonb not null
) on commit drop;

insert into phase8_publications (complaint_id, publication)
values
  (
    'e8f00000-0000-4000-8000-000000000001',
    public.review_and_publish_complaint_projection(
      'e8b00000-0000-4000-8000-000000000002',
      'e8f00000-0000-4000-8000-000000000001',
      'Reviewed public title one',
      'Reviewed public summary one.',
      'phase8-publish-1'
    )
  ),
  (
    'e8f00000-0000-4000-8000-000000000002',
    public.review_and_publish_complaint_projection(
      'e8b00000-0000-4000-8000-000000000002',
      'e8f00000-0000-4000-8000-000000000002',
      'Reviewed public title two',
      'Reviewed public summary two.',
      'phase8-publish-2'
    )
  );

select is((
  select count(*)::integer
  from public.list_public_complaint_hotspots(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100
  )
), 0, 'hotspots remain hidden below the approved minimum cohort');
select is((
  select count(*)::integer
  from public.list_public_ward_boundaries(73.7, 18.4, 74.0, 18.7, 100)
), 0, 'ward aggregates remain hidden below the approved minimum cohort');

insert into phase8_publications (complaint_id, publication)
values (
  'e8f00000-0000-4000-8000-000000000003',
  public.review_and_publish_complaint_projection(
    'e8b00000-0000-4000-8000-000000000002',
    'e8f00000-0000-4000-8000-000000000003',
    'Reviewed public title three',
    'Reviewed public summary three.',
    'phase8-publish-3'
  )
);

select is((
  select publication ->> 'state'
  from phase8_publications
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 'published', 'review creates a published projection');
select is((
  select (publication ->> 'version')::integer
  from phase8_publications
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 1, 'first publication starts at version one');

select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100, null
  )
), 3, 'bounded list returns all current reviewed projections');
select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7,
    array['phase8_test_category']::text[],
    array['reported'],
    current_timestamp - interval '1 day',
    current_timestamp,
    12,
    100,
    null
  )
), 3, 'category, public-status, and date filters apply to reviewed fields');
select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    72.0, 17.0, 72.5, 17.5, null, null, null, null, 12, 100, null
  )
), 0, 'a disjoint viewport returns no public projection');

select throws_ok(
  $$select * from public.list_public_complaint_projections(
    73.7, 18.4, 76.0, 18.7, null, null, null, null, 12, 100, null
  )$$,
  '22023',
  'PUBLIC_TRANSPARENCY_QUERY_INVALID',
  'database boundary rejects an oversized viewport'
);
select throws_ok(
  $$select * from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100, 'not-a-uuid'
  )$$,
  '22023',
  'PUBLIC_TRANSPARENCY_QUERY_INVALID',
  'database boundary rejects a malformed cursor'
);

select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 2, null
  )
), 2, 'complaint pagination honors the requested database limit');

select is((
  select (projection ->> 'supportCount')::integer
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  )
), 0, 'a reviewed public projection starts with no aggregate support');

select is((
  select engagement
  from public.list_public_complaint_engagements(
    'e8b00000-0000-4000-8000-000000000001',
    array[(
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )]
  )
), jsonb_build_object(
  'publicId', (
    select publication ->> 'publicId'
    from phase8_publications
    where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
  ),
  'supportCount', 0,
  'supported', false,
  'starred', false
), 'an active account receives only its own private engagement state and public aggregate');

select ok((
  select
    engagement ->> 'supported' = 'true'
    and engagement ->> 'starred' = 'true'
    and (engagement ->> 'supportCount')::integer = 1
  from public.set_public_complaint_engagement(
    'e8b00000-0000-4000-8000-000000000001',
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    true,
    true
  )
), 'one active account can support and privately star a current reviewed report');

select is((
  select (projection ->> 'supportCount')::integer
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  )
), 1, 'public output exposes only the aggregate support count');

select is((
  select count(*)::integer
  from public.set_public_complaint_engagement(
    'e8b00000-0000-4000-8000-000000000001',
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    true,
    true
  )
), 1, 'repeating the same engagement state is idempotent');

select is((
  select projection ->> 'publicId'
  from public.list_public_complaint_feed(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100, null, 'trending'
  )
  limit 1
), (
  select publication ->> 'publicId'
  from phase8_publications
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 'trending order ranks a supported reviewed report ahead of unsupported reports');

select is((
  select (engagement ->> 'supportCount')::integer
  from public.set_public_complaint_engagement(
    'e8b00000-0000-4000-8000-000000000001',
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    false,
    true
  )
), 0, 'support can be removed without removing the private star');

select ok((
  select
    engagement ->> 'supported' = 'false'
    and engagement ->> 'starred' = 'true'
  from public.list_public_complaint_engagements(
    'e8b00000-0000-4000-8000-000000000001',
    array[(
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )]
  )
), 'the viewer can recover private star state without exposing identity publicly');

select is((
  select count(*)::integer
  from public.set_public_complaint_engagement(
    'e8b00000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000099',
    true,
    true
  )
), 0, 'an unknown or unpublished public identifier cannot receive engagement');

select throws_ok(
  $$select * from public.list_public_complaint_engagements(
    'e8b00000-0000-4000-8000-000000000001', null
  )$$,
  '42501',
  'PUBLIC_ENGAGEMENT_FORBIDDEN',
  'a null public-identifier collection fails closed'
);

update public.profiles
set status = 'suspended', updated_at = clock_timestamp()
where id = 'e8b00000-0000-4000-8000-000000000001';
select throws_ok(
  format(
    $query$select * from public.list_public_complaint_engagements(
      'e8b00000-0000-4000-8000-000000000001', array[%L::uuid]
    )$query$,
    (
      select publication ->> 'publicId'
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  ),
  '42501',
  'PUBLIC_ENGAGEMENT_FORBIDDEN',
  'a suspended account cannot read or mutate engagement state'
);
update public.profiles
set status = 'active', updated_at = clock_timestamp()
where id = 'e8b00000-0000-4000-8000-000000000001';

select ok((
  select
    abs((projection -> 'location' ->> 'longitude')::double precision - 73.85) < 0.000001
    and abs((projection -> 'location' ->> 'latitude')::double precision - 18.55) < 0.000001
    and (projection -> 'location' ->> 'precisionMeters')::integer > 1000
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  )
), 'public detail uses the ward-derived centroid and conservative precision');

select ok((
  select
    projection ->> 'summary' = 'Reviewed public summary one.'
    and projection -> 'category' ->> 'code' = 'phase8_test_category'
    and projection -> 'localBody' ->> 'code' = '980001'
    and projection -> 'ward' ->> 'code' = '980101'
    and projection::text not like '%Private Phase 8 complaint%'
    and projection::text not like '%complaintNumber%'
    and projection::text not like '%citizen%'
    and projection::text not like '%reviewer%'
    and projection::text not like '%routing%'
    and projection::text not like '%objectPath%'
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  )
), 'detail returns sanitized reviewed text without private source or review fields');

select is((
  select (hotspot ->> 'complaintCount')::integer
  from public.list_public_complaint_hotspots(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100
  )
), 3, 'hotspot output appears at the approved minimum cohort');
select is((
  select (ward_boundary ->> 'complaintCount')::integer
  from public.list_public_ward_boundaries(73.7, 18.4, 74.0, 18.7, 100)
), 3, 'verified ward boundary output appears at the approved cohort');
select is((
  select ward_boundary ->> 'code'
  from public.list_public_ward_boundaries(73.7, 18.4, 74.0, 18.7, 100)
), '980101', 'ward output uses a reviewed stable public code');
select is((
  select ward_boundary -> 'boundary' ->> 'type'
  from public.list_public_ward_boundaries(73.7, 18.4, 74.0, 18.7, 100)
), 'MultiPolygon', 'ward output exposes provider-neutral GeoJSON geometry');

select is((
  select public.review_and_publish_complaint_projection(
    'e8b00000-0000-4000-8000-000000000002',
    'e8f00000-0000-4000-8000-000000000001',
    'Reviewed public title one',
    'Reviewed public summary one.',
    'phase8-publish-1'
  ) ->> 'publicId'
), (
  select publication ->> 'publicId'
  from phase8_publications
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 'exact publication replay returns the stable public identifier');
select is((
  select count(*)::integer
  from complaints.complaint_publication_projections
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 1, 'exact publication replay appends no duplicate version');
select throws_ok(
  $$select public.review_and_publish_complaint_projection(
    'e8b00000-0000-4000-8000-000000000002',
    'e8f00000-0000-4000-8000-000000000001',
    'Conflicting public title',
    'Reviewed public summary one.',
    'phase8-publish-1'
  )$$,
  '23505',
  'PUBLICATION_REVIEW_IDEMPOTENCY_CONFLICT',
  'publication replay rejects a changed reviewed payload'
);

create temporary table phase8_duplicate_group (result jsonb not null) on commit drop;
insert into phase8_duplicate_group (result)
select public.review_public_duplicate_group(
  'e8b00000-0000-4000-8000-000000000002',
  array_agg((publication ->> 'publicId')::uuid order by complaint_id desc),
  (
    select (publication ->> 'publicId')::uuid
    from phase8_publications
    where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
  ),
  'phase8-duplicate-review-1'
)
from phase8_publications;

select is(
  (select result from phase8_duplicate_group),
  jsonb_build_object(
    'canonicalPublicId', (
      select publication ->> 'publicId'
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    'relatedPublicIds', (
      select to_jsonb(array_agg(
        (publication ->> 'publicId')::uuid
        order by (publication ->> 'publicId')::uuid
      ))
      from phase8_publications
      where complaint_id <> 'e8f00000-0000-4000-8000-000000000001'
    ),
    'totalCount', 3
  ),
  'duplicate review returns only the canonical public ID, sorted related public IDs, and count'
);

select ok(
  (select count(*) from complaints.complaint_duplicate_group_versions) = 1
  and (select count(*) from complaints.complaint_duplicate_group_members) = 3
  and (
    select count(*)
    from complaints.complaint_duplicate_group_members
    where is_canonical
  ) = 1,
  'duplicate review persists one confirmed version with one canonical member'
);

select ok((
  select
    projection -> 'duplicateGroup' = (select result from phase8_duplicate_group)
    and (
      select array_agg(key order by key)
      from jsonb_object_keys(projection -> 'duplicateGroup') as keys(key)
    ) = array['canonicalPublicId', 'relatedPublicIds', 'totalCount']::text[]
    and projection::text not like '%groupId%'
    and projection::text not like '%complaintId%'
    and projection::text not like '%authorityId%'
    and projection::text not like '%localBodyId%'
    and projection::text not like '%wardId%'
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    )
  )
), 'canonical detail exposes only the reviewed public duplicate-group contract');

select is((
  select projection -> 'duplicateGroup'
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000002'
    )
  )
), jsonb_build_object(
  'canonicalPublicId', (
    select publication ->> 'publicId'
    from phase8_publications
    where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
  ),
  'relatedPublicIds', (
    select to_jsonb(array_agg(
      (publication ->> 'publicId')::uuid
      order by (publication ->> 'publicId')::uuid
    ))
    from phase8_publications
    where complaint_id <> 'e8f00000-0000-4000-8000-000000000002'
  ),
  'totalCount', 3
), 'related detail excludes itself and links to the canonical and remaining public reports');

select is(
  public.review_public_duplicate_group(
    'e8b00000-0000-4000-8000-000000000002',
    (
      select array_agg((publication ->> 'publicId')::uuid order by complaint_id)
      from phase8_publications
    ),
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    'phase8-duplicate-review-1'
  ),
  (select result from phase8_duplicate_group),
  'exact duplicate review replay returns the prior deterministic result'
);
select is((
  select count(*)::integer from complaints.complaint_duplicate_group_versions
), 1, 'exact duplicate review replay appends no duplicate version');

select throws_ok(
  format(
    $query$select public.review_public_duplicate_group(
      'e8b00000-0000-4000-8000-000000000002',
      array[%L::uuid, %L::uuid, %L::uuid],
      %L::uuid,
      'phase8-duplicate-review-1'
    )$query$,
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000002'
    ),
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000003'
    ),
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000002'
    )
  ),
  '23505',
  'PUBLIC_DUPLICATE_IDEMPOTENCY_CONFLICT',
  'duplicate review replay rejects a changed canonical public report'
);

select throws_ok(
  format(
    $query$select public.review_public_duplicate_group(
      'e8b00000-0000-4000-8000-000000000002',
      array[%L::uuid, '00000000-0000-4000-8000-000000000099'::uuid],
      %L::uuid,
      'phase8-duplicate-unpublished'
    )$query$,
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000003'
    ),
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000003'
    )
  ),
  '42501',
  'PUBLIC_DUPLICATE_REVIEW_FORBIDDEN',
  'unpublished or unknown public identifiers cannot enter a reviewed duplicate group'
);

create temporary table phase8_duplicate_withdrawal (result jsonb not null) on commit drop;
insert into phase8_duplicate_withdrawal (result)
select public.withdraw_public_duplicate_group(
  'e8b00000-0000-4000-8000-000000000002',
  (
    select (publication ->> 'publicId')::uuid
    from phase8_publications
    where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
  ),
  'phase8-duplicate-withdraw-1'
);

select is((
  select result ->> 'state' from phase8_duplicate_withdrawal
), 'withdrawn', 'duplicate-group withdrawal returns an explicit withdrawn state');
select is((
  select count(*)::integer from complaints.complaint_duplicate_group_versions
), 2, 'duplicate-group withdrawal appends a second immutable version');
select is((
  select projection -> 'duplicateGroup'
  from public.get_public_complaint_projection(
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000002'
    )
  )
), 'null'::jsonb, 'withdrawal removes duplicate relationships from public detail');

select is(
  public.withdraw_public_duplicate_group(
    'e8b00000-0000-4000-8000-000000000002',
    (
      select (publication ->> 'publicId')::uuid
      from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
    ),
    'phase8-duplicate-withdraw-1'
  ),
  (select result from phase8_duplicate_withdrawal),
  'exact duplicate-group withdrawal replay returns the prior result'
);
select is((
  select count(*)::integer from complaints.complaint_duplicate_group_versions
), 2, 'exact duplicate-group withdrawal replay appends no new version');

select throws_ok(
  format(
    $query$select public.withdraw_public_duplicate_group(
      'e8b00000-0000-4000-8000-000000000002',
      %L::uuid,
      'phase8-duplicate-withdraw-1'
    )$query$,
    (
      select publication ->> 'publicId' from phase8_publications
      where complaint_id = 'e8f00000-0000-4000-8000-000000000002'
    )
  ),
  '23505',
  'PUBLIC_DUPLICATE_IDEMPOTENCY_CONFLICT',
  'duplicate-group withdrawal replay rejects a changed canonical public report'
);

create temporary table phase8_withdrawal (result jsonb not null) on commit drop;
insert into phase8_withdrawal (result)
select public.withdraw_public_complaint_projection(
  'e8b00000-0000-4000-8000-000000000002',
  (publication ->> 'publicId')::uuid,
  'PRIVACY_WITHDRAWAL',
  'phase8-withdraw-1'
)
from phase8_publications
where complaint_id = 'e8f00000-0000-4000-8000-000000000001';

select is((select result ->> 'state' from phase8_withdrawal), 'withdrawn',
  'withdrawal appends an explicit terminal public version');
select is((
  select count(*)::integer
  from public.get_public_complaint_projection(
    (select (result ->> 'publicId')::uuid from phase8_withdrawal)
  )
), 0, 'withdrawal removes the complaint from current public detail');
select is((
  select count(*)::integer
  from public.list_public_complaint_engagements(
    'e8b00000-0000-4000-8000-000000000001',
    array[(select (result ->> 'publicId')::uuid from phase8_withdrawal)]
  )
), 0, 'withdrawal immediately hides private viewer state for the public identifier');
select is((
  select count(*)::integer
  from public.list_public_complaint_projections(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100, null
  )
), 2, 'withdrawal removes the complaint from current list results');
select is((
  select count(*)::integer
  from public.list_public_complaint_hotspots(
    73.7, 18.4, 74.0, 18.7, null, null, null, null, 12, 100
  )
), 0, 'withdrawal immediately reapplies the minimum hotspot cohort');
select is((
  select count(*)::integer
  from public.list_public_ward_boundaries(73.7, 18.4, 74.0, 18.7, 100)
), 0, 'withdrawal immediately reapplies the safe ward cohort');

select is((
  select public.withdraw_public_complaint_projection(
    'e8b00000-0000-4000-8000-000000000002',
    (result ->> 'publicId')::uuid,
    'PRIVACY_WITHDRAWAL',
    'phase8-withdraw-1'
  ) ->> 'state'
  from phase8_withdrawal
), 'withdrawn', 'exact withdrawal replay returns the prior result');
select is((
  select count(*)::integer
  from complaints.complaint_publication_projections
  where complaint_id = 'e8f00000-0000-4000-8000-000000000001'
), 2, 'exact withdrawal replay appends no duplicate version');

select throws_ok(
  $$update complaints.complaint_publication_projections
    set public_summary = 'Mutated private operator text.'
    where complaint_id = 'e8f00000-0000-4000-8000-000000000002'$$,
  '55000',
  'complaints.complaint_publication_projections records are append-only.',
  'published projection history cannot be rewritten'
);

select * from finish();
rollback;
