begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(17);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'c0000000-0000-4000-8000-000000000001',
  'Synthetic complaint validation fixture',
  'https://example.test/complaint-validation-fixture',
  'official',
  date '2026-07-14'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'c0100000-0000-4000-8000-000000000001',
  'complaint_validation_domain', 'Complaint Validation Domain',
  'active', 'verified', true,
  date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'c0200000-0000-4000-8000-000000000001',
    'c0100000-0000-4000-8000-000000000001',
    'complaint_validation_category', 'Complaint Validation Category',
    'active', 'verified', true,
    date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
  ),
  (
    'c0200000-0000-4000-8000-000000000002',
    'c0100000-0000-4000-8000-000000000001',
    'complaint_emergency_category', 'Complaint Emergency Category',
    'active', 'verified', true,
    date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
  );

update routing.issue_categories
set is_emergency = true
where id = 'c0200000-0000-4000-8000-000000000002';

insert into routing.duplicate_detection_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'c0300000-0000-4000-8000-000000000001',
  'complaint_validation_duplicates', 'Complaint Validation Duplicates',
  'active', 'verified', true,
  date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
);

insert into routing.duplicate_detection_policy_versions (
  id, duplicate_detection_policy_id, version, category_id,
  maximum_distance_meters, maximum_age_seconds, minimum_score, maximum_results,
  weights, status, verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  'c0400000-0000-4000-8000-000000000001',
  'c0300000-0000-4000-8000-000000000001', 1,
  'c0200000-0000-4000-8000-000000000001',
  500, 86400, 0.6, 10,
  '{"category":1,"location":1,"time":1,"description":1,"media":1,"asset":1}',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'c1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'phase4-validation@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

create temporary table phase4_validation_fixture (
  draft_id uuid,
  unsupported_location_id uuid,
  mock_location_id uuid,
  low_accuracy_location_id uuid,
  stale_location_id uuid,
  duplicate_run_id uuid,
  placeholder_draft_id uuid,
  placeholder_location_id uuid,
  placeholder_submission_id uuid,
  emergency_draft_id uuid,
  emergency_location_id uuid,
  emergency_submission_id uuid
) on commit drop;

insert into phase4_validation_fixture (draft_id)
select draft_id
from public.create_complaint_draft(
  'c1000000-0000-4000-8000-000000000001',
  repeat('1',64), repeat('2',64),
  'c0200000-0000-4000-8000-000000000001', null,
  'Duplicate source description', 'en', '{}'::jsonb
);

update phase4_validation_fixture
set unsupported_location_id = public.append_complaint_location_evidence(
  'c1000000-0000-4000-8000-000000000001', draft_id, null,
  'current_location', 0, 0, 10, 'gps', current_timestamp, current_timestamp,
  false, '{}'::jsonb
);

select is(
  (select verification_status from complaints.complaint_location_evidence
    where id = (select unsupported_location_id from phase4_validation_fixture)),
  'unsupported_area',
  'zero verified jurisdictions derives unsupported-area evidence'
);

update phase4_validation_fixture
set mock_location_id = public.append_complaint_location_evidence(
  'c1000000-0000-4000-8000-000000000001', draft_id, null,
  'current_location', 0, 0, 10, 'gps', current_timestamp, current_timestamp,
  true, '{}'::jsonb
);
select is(
  (select verification_status from complaints.complaint_location_evidence
    where id = (select mock_location_id from phase4_validation_fixture)),
  'suspected_spoofing',
  'mock-location evidence can never be promoted to verified'
);

select throws_ok(
  $$select public.append_complaint_location_evidence(
    'c1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_validation_fixture), null,
    'current_location', 0, 0, 101, 'gps', current_timestamp, current_timestamp,
    false, '{}'::jsonb
  )$$,
  '23514',
  'COMPLAINT_LOCATION_ACCURACY_EXCEEDS_V1_LIMIT',
  'accuracy beyond the V1 50 metre limit is rejected before storage'
);

update phase4_validation_fixture
set stale_location_id = public.append_complaint_location_evidence(
  'c1000000-0000-4000-8000-000000000001', draft_id, null,
  'current_location', 0, 0, 10, 'gps',
  current_timestamp - interval '10 minutes',
  current_timestamp - interval '10 minutes', false, '{}'::jsonb
);
select is(
  (select verification_status from complaints.complaint_location_evidence
    where id = (select stale_location_id from phase4_validation_fixture)),
  'manual_review',
  'category maximum age prevents stale evidence from becoming verified'
);

select lives_ok($$
  select * from public.update_complaint_draft(
    'c1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_validation_fixture), 1,
    'c0200000-0000-4000-8000-000000000001', null,
    'Duplicate source description', 'en', '{}'::jsonb,
    (select unsupported_location_id from phase4_validation_fixture)
  )
$$);

select is(
  (
    select policy_version_id
    from public.find_complaint_duplicate_candidates(
      'c1000000-0000-4000-8000-000000000001',
      (select draft_id from phase4_validation_fixture), null, current_timestamp
    )
  ),
  'c0400000-0000-4000-8000-000000000001'::uuid,
  'database selects the one category-specific current duplicate policy'
);
select is(
  (
    select candidate_complaint_id
    from public.find_complaint_duplicate_candidates(
      'c1000000-0000-4000-8000-000000000001',
      (select draft_id from phase4_validation_fixture), null, current_timestamp
    )
  ),
  null::uuid,
  'zero-candidate duplicate checks still return policy metadata'
);

update phase4_validation_fixture
set duplicate_run_id = public.record_complaint_duplicate_check(
  'c1000000-0000-4000-8000-000000000001', draft_id,
  'c0400000-0000-4000-8000-000000000001',
  'phase4-duplicate-empty', repeat('3',64), current_timestamp, '[]'::jsonb
);

select is(
  (
    select candidate_count from public.get_complaint_duplicate_check(
      'c1000000-0000-4000-8000-000000000001',
      (select duplicate_run_id from phase4_validation_fixture)
    )
  ),
  0::smallint,
  'persisted empty duplicate result remains readable without rerunning time-sensitive search'
);
select is(
  (
    select public.record_complaint_duplicate_check(
      'c1000000-0000-4000-8000-000000000001',
      (select draft_id from phase4_validation_fixture),
      'c0400000-0000-4000-8000-000000000001',
      'phase4-duplicate-empty', repeat('3',64), current_timestamp, '[]'::jsonb
    )
  ),
  (select duplicate_run_id from phase4_validation_fixture),
  'duplicate result recording replays by actor and request ID'
);
select throws_ok(
  $$select public.record_complaint_duplicate_check(
    'c1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_validation_fixture),
    'c0400000-0000-4000-8000-000000000001',
    'phase4-duplicate-empty', repeat('4',64), current_timestamp, '[]'::jsonb
  )$$,
  '23505', 'COMPLAINT_DUPLICATE_RECORD_CONFLICT',
  'changed persisted duplicate result conflicts'
);

insert into routing.duplicate_detection_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'c0300000-0000-4000-8000-000000000002',
  'complaint_validation_duplicates_two', 'Complaint Validation Duplicates Two',
  'active', 'verified', true,
  date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
);
insert into routing.duplicate_detection_policy_versions (
  id, duplicate_detection_policy_id, version, category_id,
  maximum_distance_meters, maximum_age_seconds, minimum_score, maximum_results,
  weights, status, verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  'c0400000-0000-4000-8000-000000000002',
  'c0300000-0000-4000-8000-000000000002', 1,
  'c0200000-0000-4000-8000-000000000001', 500, 86400, 0.6, 10,
  '{"category":1,"location":1,"time":1,"description":1,"media":1,"asset":1}',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-14', 'c0000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$select * from public.find_complaint_duplicate_candidates(
    'c1000000-0000-4000-8000-000000000001',
    (select draft_id from phase4_validation_fixture), null, current_timestamp
  )$$,
  '23514', 'COMPLAINT_DUPLICATE_POLICY_AMBIGUOUS',
  'multiple equally specific policies fail closed'
);

update phase4_validation_fixture
set placeholder_draft_id = created.draft_id
from public.create_complaint_draft(
  'c1000000-0000-4000-8000-000000000001', repeat('5',64), repeat('6',64),
  '93000000-0000-4000-8000-000000000112', null,
  'Pending category must not submit.', 'en', '{"obstruction_type":"road"}'::jsonb
) as created;
update phase4_validation_fixture
set placeholder_location_id = gen_random_uuid();
insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, spoof_risk_status,
  verification_status, verification_score
)
select
  placeholder_location_id, placeholder_draft_id,
  'c1000000-0000-4000-8000-000000000001', 'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.84,18.54),4326),
  10, 'gps', current_timestamp, current_timestamp, 'low', 'verified', 1
from phase4_validation_fixture;
select lives_ok($$
  select * from public.update_complaint_draft(
    'c1000000-0000-4000-8000-000000000001',
    (select placeholder_draft_id from phase4_validation_fixture), 1,
    '93000000-0000-4000-8000-000000000112', null,
    'Pending category must not submit.', 'en', '{"obstruction_type":"road"}'::jsonb,
    (select placeholder_location_id from phase4_validation_fixture)
  )
$$);
with claimed as materialized (
  select submission.*
  from public.claim_complaint_submission(
    'c1000000-0000-4000-8000-000000000001',
    (select placeholder_draft_id from phase4_validation_fixture),
    repeat('7',64),
    repeat('8',64)
  ) as submission
)
update phase4_validation_fixture
set placeholder_submission_id = claimed.submission_request_id
from claimed;
select throws_ok(
  $$select * from public.submit_complaint(
    'c1000000-0000-4000-8000-000000000001',
    (select placeholder_submission_id from phase4_validation_fixture),
    'c1200000-0000-4000-8000-000000000001', '{}'::uuid[], false
  )$$,
  '23514', 'COMPLAINT_CATEGORY_NOT_ROUTABLE',
  'a still-unverified pilot category can never create a complaint'
);
select is((select count(*)::integer from complaints.complaints), 0, 'rejected pending-category submission leaves no complaint');

update phase4_validation_fixture
set emergency_draft_id = created.draft_id
from public.create_complaint_draft(
  'c1000000-0000-4000-8000-000000000001', repeat('9',64), repeat('a',64),
  'c0200000-0000-4000-8000-000000000002', null,
  'Emergency disclaimer test.', 'en', '{}'::jsonb
) as created;
update phase4_validation_fixture set emergency_location_id = gen_random_uuid();
insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, spoof_risk_status,
  verification_status, verification_score
)
select
  emergency_location_id, emergency_draft_id,
  'c1000000-0000-4000-8000-000000000001', 'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.84,18.54),4326),
  10, 'gps', current_timestamp, current_timestamp, 'low', 'verified', 1
from phase4_validation_fixture;
select lives_ok($$
  select * from public.update_complaint_draft(
    'c1000000-0000-4000-8000-000000000001',
    (select emergency_draft_id from phase4_validation_fixture), 1,
    'c0200000-0000-4000-8000-000000000002', null,
    'Emergency disclaimer test.', 'en', '{}'::jsonb,
    (select emergency_location_id from phase4_validation_fixture)
  )
$$);
with claimed as materialized (
  select submission.*
  from public.claim_complaint_submission(
    'c1000000-0000-4000-8000-000000000001',
    (select emergency_draft_id from phase4_validation_fixture),
    repeat('b',64),
    repeat('c',64)
  ) as submission
)
update phase4_validation_fixture
set emergency_submission_id = claimed.submission_request_id
from claimed;
select throws_ok(
  $$select * from public.submit_complaint(
    'c1000000-0000-4000-8000-000000000001',
    (select emergency_submission_id from phase4_validation_fixture),
    'c1200000-0000-4000-8000-000000000002', '{}'::uuid[], false
  )$$,
  '23514', 'COMPLAINT_EMERGENCY_DISCLAIMER_REQUIRED',
  'emergency category requires the explicit disclaimer acknowledgement'
);
select is((select count(*)::integer from complaints.complaints), 0, 'emergency acknowledgement failure remains atomic');

select * from finish();
rollback;
