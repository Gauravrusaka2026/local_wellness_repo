begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(29);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'b0000000-0000-4000-8000-000000000001',
  'Synthetic Phase 4 fixture',
  'https://example.test/phase-4-fixture',
  'official',
  date '2026-07-14'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'b0100000-0000-4000-8000-000000000001', null,
    'PHASE4_TEST_STATE', 'Phase 4 Test State', 'state',
    'verified', true, date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
  ),
  (
    'b0100000-0000-4000-8000-000000000002',
    'b0100000-0000-4000-8000-000000000001',
    'PHASE4_TEST_LOCAL_BODY', 'Phase 4 Test Local Body', 'local_body',
    'verified', true, date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'b0200000-0000-4000-8000-000000000001',
  'b0100000-0000-4000-8000-000000000001',
  'Phase 4 Test State', 'PHS', 'verified', true,
  date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'b0300000-0000-4000-8000-000000000001',
  'b0100000-0000-4000-8000-000000000002',
  'b0200000-0000-4000-8000-000000000001',
  'Phase 4 Test Local Body', 'municipal_corporation', 'verified', true,
  date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, local_body_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'b0400000-0000-4000-8000-000000000001',
  'b0300000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))',
    4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'b0500000-0000-4000-8000-000000000001',
  'phase4_test_department', 'Phase 4 Test Department',
  'verified', true, date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'b0600000-0000-4000-8000-000000000001',
  'b0100000-0000-4000-8000-000000000002',
  'b0500000-0000-4000-8000-000000000001',
  'verified', true, date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'b0700000-0000-4000-8000-000000000001',
  'phase4_test_role', 'Phase 4 Test Role',
  'verified', true, date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'b0800000-0000-4000-8000-000000000001',
  'phase4_test_domain', 'Phase 4 Test Domain', 'active', 'verified', true,
  date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, minimum_media_count, maximum_media_count,
  status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'b0900000-0000-4000-8000-000000000001',
  'b0800000-0000-4000-8000-000000000001',
  'phase4_test_category', 'Phase 4 Test Category', 0, 5,
  'active', 'verified', true,
  date '2026-07-14', 'b0000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'phase4-submit@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

create temporary table phase4_submission_fixture (
  draft_id uuid,
  location_id uuid,
  media_id uuid,
  submission_request_id uuid,
  routing_request_id text,
  routing_decision_id uuid,
  complaint_id uuid
) on commit drop;

insert into phase4_submission_fixture (draft_id)
select draft_id
from public.create_complaint_draft(
  'b1000000-0000-4000-8000-000000000001',
  repeat('1', 64), repeat('2', 64),
  'b0900000-0000-4000-8000-000000000001', null,
  'Synthetic private complaint description.', 'en', '{}'::jsonb
);

select is((select count(*)::integer from complaints.complaint_drafts), 1, 'draft is created');
select is(
  (
    select replayed from public.create_complaint_draft(
      'b1000000-0000-4000-8000-000000000001',
      repeat('1', 64), repeat('2', 64),
      'b0900000-0000-4000-8000-000000000001', null,
      'Synthetic private complaint description.', 'en', '{}'::jsonb
    )
  ),
  true,
  'draft creation replays exactly'
);
select throws_ok(
  $$select * from public.create_complaint_draft(
    'b1000000-0000-4000-8000-000000000001', repeat('1',64), repeat('3',64),
    'b0900000-0000-4000-8000-000000000001', null, 'Changed', 'en', '{}'::jsonb
  )$$,
  '23505', 'COMPLAINT_DRAFT_IDEMPOTENCY_CONFLICT',
  'draft key reuse with changed input fails'
);

update phase4_submission_fixture
set location_id = public.append_complaint_location_evidence(
  'b1000000-0000-4000-8000-000000000001',
  draft_id, null, 'current_location', 73.84, 18.54, 10, 'gps',
  current_timestamp, current_timestamp, false, '{}'::jsonb
);

select is(
  (
    select verification_status
    from complaints.complaint_location_evidence
    where id = (select location_id from phase4_submission_fixture)
  ),
  'verified',
  'database derives verified location only from current eligible PostGIS evidence'
);
select is(
  (
    select device_recorded_at = captured_at
    from complaints.complaint_location_evidence
    where id = (select location_id from phase4_submission_fixture)
  ),
  true,
  'device and capture timestamps are retained independently'
);

select lives_ok($$
  select * from public.update_complaint_draft(
    'b1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_submission_fixture), 1,
    'b0900000-0000-4000-8000-000000000001', null,
    'Synthetic private complaint description.', 'en', '{}'::jsonb,
    (select location_id from phase4_submission_fixture)
  )
$$, 'the owned draft selects its verified location evidence');

update phase4_submission_fixture
set media_id = (
  select media_id from public.reserve_complaint_media(
    'b1000000-0000-4000-8000-000000000001', draft_id,
    'b1100000-0000-4000-8000-000000000001',
    'photo', 'live_camera', 'image/jpeg', 1024, repeat('a', 64),
    800, 600, null, null, null
  )
);

select matches(
  (select object_path from public.get_complaint_media_intent(
    'b1000000-0000-4000-8000-000000000001',
    (select media_id from phase4_submission_fixture)
  )),
  '^b1000000-0000-4000-8000-000000000001/.+/original$',
  'media path is server-generated beneath the owner namespace'
);
select is(
  (
    select replayed from public.reserve_complaint_media(
      'b1000000-0000-4000-8000-000000000001',
      (select draft_id from phase4_submission_fixture),
      'b1100000-0000-4000-8000-000000000001',
      'photo', 'live_camera', 'image/jpeg', 1024, repeat('a', 64),
      800, 600, null, null, null
    )
  ),
  true,
  'the same client media identifier replays its intent'
);
select throws_ok(
  $$select * from public.reserve_complaint_media(
    'b1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_submission_fixture),
    'b1100000-0000-4000-8000-000000000001',
    'photo', 'live_camera', 'image/jpeg', 2048, repeat('a',64),
    800, 600, null, null, null
  )$$,
  '23505', 'COMPLAINT_MEDIA_IDEMPOTENCY_CONFLICT',
  'changed media intent payload conflicts'
);
select is(
  (
    select upload_status from public.finalize_complaint_media(
      'b1000000-0000-4000-8000-000000000001',
      (select media_id from phase4_submission_fixture),
      'image/jpeg', 1024, repeat('a',64)
    )
  ),
  'finalized',
  'verified object metadata finalizes media'
);
select is(
  (
    select replayed from public.finalize_complaint_media(
      'b1000000-0000-4000-8000-000000000001',
      (select media_id from phase4_submission_fixture),
      'image/jpeg', 1024, repeat('a',64)
    )
  ),
  true,
  'media finalization replays exactly'
);

with claimed as materialized (
  select submission.*
  from public.claim_complaint_submission(
    'b1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_submission_fixture),
    repeat('4',64),
    repeat('5',64)
  ) as submission
)
update phase4_submission_fixture
set
  submission_request_id = claimed.submission_request_id,
  routing_request_id = claimed.routing_request_id
from claimed;

select is(
  (
    select routing_request_id from public.claim_complaint_submission(
      'b1000000-0000-4000-8000-000000000001',
      (select draft_id from phase4_submission_fixture), repeat('4',64), repeat('5',64)
    )
  ),
  (select routing_request_id from phase4_submission_fixture),
  'submission claim replays a stable routing request identifier'
);
select throws_ok(
  $$select * from public.claim_complaint_submission(
    'b1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_submission_fixture), repeat('4',64), repeat('6',64)
  )$$,
  '23505', 'COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT',
  'submission key reuse with another fingerprint fails'
);

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location,
  accuracy_meters, captured_at, resolved_at, decision_status, confidence_score,
  state_id, local_body_id, local_body_boundary_version_id,
  target_authority_id, department_id, authority_department_id, officer_role_id,
  route_rule_id, route_rule_version_id, confidence_policy_version_id,
  explanation_codes, explanation_metadata
)
select
  'b1200000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001', fixture.routing_request_id,
  'b0900000-0000-4000-8000-000000000001', evidence.location,
  evidence.accuracy_meters, evidence.captured_at, current_timestamp,
  'routed', 0.95,
  'b0200000-0000-4000-8000-000000000001',
  'b0300000-0000-4000-8000-000000000001',
  'b0400000-0000-4000-8000-000000000001',
  'b0100000-0000-4000-8000-000000000002',
  'b0500000-0000-4000-8000-000000000001',
  'b0600000-0000-4000-8000-000000000001',
  'b0700000-0000-4000-8000-000000000001',
  'b1300000-0000-4000-8000-000000000001',
  'b1300000-0000-4000-8000-000000000002',
  'b1300000-0000-4000-8000-000000000003',
  array['route_resolved']::text[],
  '{}'::jsonb
from phase4_submission_fixture as fixture
inner join complaints.complaint_location_evidence as evidence
  on evidence.id = fixture.location_id;
set local session_replication_role = origin;

update phase4_submission_fixture
set routing_decision_id = 'b1200000-0000-4000-8000-000000000001';

select is(
  (
    select routing_decision_id from public.get_routing_decision_replay(
      'b1000000-0000-4000-8000-000000000001',
      (select routing_request_id from phase4_submission_fixture)
    )
  ),
  'b1200000-0000-4000-8000-000000000001'::uuid,
  'routing replay lookup returns the original stored evidence'
);
select is(
  (
    select count(*)::integer from public.get_routing_decision_replay(
      'a1000000-0000-4000-8000-000000000002',
      (select routing_request_id from phase4_submission_fixture)
    )
  ),
  0,
  'routing replay lookup is actor-bound'
);

with submitted as materialized (
  select result.*
  from public.submit_complaint(
    'b1000000-0000-4000-8000-000000000001',
    (select submission_request_id from phase4_submission_fixture),
    (select routing_decision_id from phase4_submission_fixture),
    '{}'::uuid[],
    false
  ) as result
)
update phase4_submission_fixture
set complaint_id = submitted.complaint_id
from submitted;

select is((select count(*)::integer from complaints.complaints), 1, 'one complaint is created');
select matches(
  (select complaint_number from complaints.complaints),
  '^LW-[0-9]{8}-[0-9]{8,}$',
  'receipt receives a server-generated complaint number'
);
select is((select count(*)::integer from complaints.complaint_assignments), 1, 'initial route assignment is atomic');
select is((select count(*)::integer from complaints.complaint_status_history), 1, 'initial status event is atomic');
select is((select status from complaints.complaint_drafts), 'submitted', 'source draft becomes terminal');
select is((select state from complaints.complaint_submission_requests), 'completed', 'submission ledger stores completion');
select is(
  (
    select replayed from public.submit_complaint(
      'b1000000-0000-4000-8000-000000000001',
      (select submission_request_id from phase4_submission_fixture),
      (select routing_decision_id from phase4_submission_fixture),
      '{}'::uuid[], false
    )
  ),
  true,
  'atomic submission returns the stored receipt on retry'
);
select is((select count(*)::integer from complaints.complaints), 1, 'submission replay creates no duplicate');
select is(
  (select count(*)::integer from public.list_owned_complaints(
    'b1000000-0000-4000-8000-000000000001', 25, null, null
  )),
  1,
  'owner list returns the submitted complaint'
);
select is(
  (select count(*)::integer from public.get_owned_complaint(
    'b1000000-0000-4000-8000-000000000001',
    (select complaint_id from phase4_submission_fixture)
  )),
  1,
  'owner detail returns exact private capture evidence'
);
select is(
  (select count(*)::integer from public.get_owned_complaint(
    'a1000000-0000-4000-8000-000000000002',
    (select complaint_id from phase4_submission_fixture)
  )),
  0,
  'another actor receives no private complaint detail'
);
select is(
  (select count(*)::integer from public.get_complaint_timeline(
    'b1000000-0000-4000-8000-000000000001',
    (select complaint_id from phase4_submission_fixture)
  )),
  1,
  'owner timeline returns the immutable submission event'
);
select throws_ok(
  $$update complaints.complaints set current_status = 'assigned'$$,
  '55000', 'complaints.complaints records are append-only.',
  'Phase 4 complaint core cannot be rewritten directly'
);
select throws_ok(
  $$delete from complaints.complaint_status_history$$,
  '55000', 'complaints.complaint_status_history records are append-only.',
  'complaint history cannot be deleted'
);

select * from finish();
rollback;
