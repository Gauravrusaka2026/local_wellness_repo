begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(49);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'f0000000-0000-4000-8000-000000000001',
  'Synthetic Phase 7 fixture',
  'https://example.test/phase-7-fixture',
  'official',
  current_date
);

insert into governance.authorities (
  id, code, name, authority_type, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'f0100000-0000-4000-8000-000000000001',
  'PHASE7_TEST_STATE',
  'Phase 7 Test State',
  'state',
  'verified',
  true,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'f0100000-0000-4000-8000-000000000002',
    'f0100000-0000-4000-8000-000000000001',
    'PHASE7_TEST_AUTHORITY_ONE',
    'Phase 7 Authority One',
    'local_body',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  ),
  (
    'f0100000-0000-4000-8000-000000000003',
    'f0100000-0000-4000-8000-000000000001',
    'PHASE7_TEST_AUTHORITY_TWO',
    'Phase 7 Authority Two',
    'local_body',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'f0200000-0000-4000-8000-000000000001',
  'f0100000-0000-4000-8000-000000000001',
  'Phase 7 Test State',
  'PFS',
  'verified',
  true,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'f0300000-0000-4000-8000-000000000001',
    'f0100000-0000-4000-8000-000000000002',
    'f0200000-0000-4000-8000-000000000001',
    'Phase 7 Local Body One',
    'municipal_corporation',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  ),
  (
    'f0300000-0000-4000-8000-000000000002',
    'f0100000-0000-4000-8000-000000000003',
    'f0200000-0000-4000-8000-000000000001',
    'Phase 7 Local Body Two',
    'municipal_corporation',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  );

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'f0500000-0000-4000-8000-000000000001',
  'phase7_test_department',
  'Phase 7 Test Department',
  'verified',
  true,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'f0600000-0000-4000-8000-000000000001',
    'f0100000-0000-4000-8000-000000000002',
    'f0500000-0000-4000-8000-000000000001',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  ),
  (
    'f0600000-0000-4000-8000-000000000002',
    'f0100000-0000-4000-8000-000000000003',
    'f0500000-0000-4000-8000-000000000001',
    'verified',
    true,
    current_date,
    'f0000000-0000-4000-8000-000000000001'
  );

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'f0700000-0000-4000-8000-000000000001',
  'phase7_test_officer',
  'Phase 7 Test Officer',
  'verified',
  true,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'f1000000-0000-4000-8000-000000000001',
  'phase7_test_domain',
  'Phase 7 Test Domain',
  'active',
  'verified',
  true,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  location_verification_requirements, last_verified_on, reference_source_id
)
values (
  'f1100000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'phase7_test_category',
  'Phase 7 Test Category',
  'active',
  'verified',
  true,
  '{"maximumAccuracyMeters":50,"maximumAgeSeconds":300}'::jsonb,
  current_date,
  'f0000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'f2000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase7-citizen@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase7-operator@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values
  (
    'f2000000-0000-4000-8000-000000000002',
    'f0100000-0000-4000-8000-000000000002',
    'phase7-operator@example.test',
    'active',
    now() - interval '1 day',
    'f2000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    now() - interval '1 day'
  ),
  (
    'f2000000-0000-4000-8000-000000000002',
    'f0100000-0000-4000-8000-000000000003',
    'phase7-operator@example.test',
    'active',
    now() - interval '1 day',
    'f2000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    now() - interval '1 day'
  );

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'f2000000-0000-4000-8000-000000000002',
  role.id,
  authority.id,
  'authority',
  authority.id,
  now() - interval '1 day',
  'f2000000-0000-4000-8000-000000000002'
from public.roles as role
cross join (
  values
    ('f0100000-0000-4000-8000-000000000002'::uuid),
    ('f0100000-0000-4000-8000-000000000003'::uuid)
) as authority(id)
where role.code = 'government_operator';

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash, creation_request_fingerprint,
  category_id, description
)
values (
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  repeat('1', 64),
  repeat('2', 64),
  'f1100000-0000-4000-8000-000000000001',
  'Private Phase 7 accountability complaint.'
);

insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, spoof_risk_status,
  verification_status, verification_score
)
values (
  'f3100000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10,
  'gps',
  clock_timestamp(),
  clock_timestamp(),
  'low',
  'verified',
  0.99
);

update complaints.complaint_drafts
set selected_location_evidence_id = 'f3100000-0000-4000-8000-000000000001',
    status = 'submitted',
    submitted_at = clock_timestamp()
where id = 'f3000000-0000-4000-8000-000000000001';

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location, accuracy_meters,
  captured_at, resolved_at, decision_status, explanation_codes
)
values (
  'f3200000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'phase7-routing-fixture',
  'f1100000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10,
  clock_timestamp(),
  clock_timestamp(),
  'manual_review',
  array['phase7_fixture']::text[]
);
set local session_replication_role = origin;

insert into complaints.complaints (
  id, draft_id, complaint_number, citizen_user_id, category_id, description,
  description_language, custom_attributes, location_evidence_id,
  routing_decision_id, submitted_at
)
values (
  'f3300000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'LW-20260716-97000001',
  'f2000000-0000-4000-8000-000000000001',
  'f1100000-0000-4000-8000-000000000001',
  'Private Phase 7 accountability complaint.',
  'en',
  '{}'::jsonb,
  'f3100000-0000-4000-8000-000000000001',
  'f3200000-0000-4000-8000-000000000001',
  clock_timestamp()
);

insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id,
  department_id, authority_department_id, officer_role_id, assigned_at
)
values (
  'f3400000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  'f3200000-0000-4000-8000-000000000001',
  'f0100000-0000-4000-8000-000000000002',
  'f0300000-0000-4000-8000-000000000001',
  'f0500000-0000-4000-8000-000000000001',
  'f0600000-0000-4000-8000-000000000001',
  'f0700000-0000-4000-8000-000000000001',
  clock_timestamp()
);

insert into complaints.complaint_status_history (
  complaint_id, sequence, from_status, to_status, actor_user_id,
  event_source, reason_code, public_message
)
values (
  'f3300000-0000-4000-8000-000000000001',
  1,
  'draft',
  'submitted',
  'f2000000-0000-4000-8000-000000000001',
  'citizen_submission',
  'COMPLAINT_SUBMITTED',
  'Complaint submitted successfully.'
);

insert into complaints.resolution_policies (
  id, code, name, authority_id, category_id
)
values
  (
    'f4000000-0000-4000-8000-000000000001',
    'phase7_authority_one_policy',
    'Phase 7 Authority One Policy',
    'f0100000-0000-4000-8000-000000000002',
    'f1100000-0000-4000-8000-000000000001'
  ),
  (
    'f4000000-0000-4000-8000-000000000002',
    'phase7_authority_two_policy',
    'Phase 7 Authority Two Policy',
    'f0100000-0000-4000-8000-000000000003',
    'f1100000-0000-4000-8000-000000000001'
  );

insert into complaints.resolution_policy_versions (
  id, resolution_policy_id, version, status, rating_minimum, rating_maximum,
  ratings_required, feedback_window_seconds, eligible_feedback_statuses,
  reopen_window_seconds, eligible_reopen_statuses, max_reopen_attempts,
  reopen_evidence_required, allowed_reopen_reason_codes,
  repeat_escalation_threshold, effective_from, approved_by_user_id,
  approved_at, created_at
)
values (
  'f4100000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000001',
  1,
  'approved',
  1,
  5,
  false,
  3600,
  array['citizen_verification_pending', 'resolved', 'closed'],
  3600,
  array['citizen_verification_pending', 'resolved', 'closed'],
  2,
  true,
  array['issue_persists'],
  2,
  current_timestamp - interval '1 hour',
  'f2000000-0000-4000-8000-000000000002',
  current_timestamp - interval '2 hours',
  current_timestamp - interval '3 hours'
);

select throws_ok(
  $$insert into complaints.resolution_policy_versions (
      resolution_policy_id, version, status, rating_minimum, rating_maximum,
      ratings_required, feedback_window_seconds, eligible_feedback_statuses,
      reopen_window_seconds, eligible_reopen_statuses, max_reopen_attempts,
      reopen_evidence_required, allowed_reopen_reason_codes,
      repeat_escalation_threshold, effective_from, approved_by_user_id,
      approved_at
    ) values (
      'f4000000-0000-4000-8000-000000000002', 1, 'approved', 1, 5, false,
      3600, array['citizen_verification_pending'], 3600,
      array['citizen_verification_pending'], 2, false, array['issue_persists'],
      2, current_timestamp - interval '1 hour',
      'f2000000-0000-4000-8000-000000000002', current_timestamp
    )$$,
  '23514',
  null,
  'an approved policy version cannot be inserted effective before its approval'
);
select throws_ok(
  $$insert into complaints.resolution_policy_versions (
      resolution_policy_id, version, rating_minimum, rating_maximum,
      ratings_required, feedback_window_seconds, eligible_feedback_statuses,
      reopen_window_seconds, eligible_reopen_statuses, max_reopen_attempts,
      reopen_evidence_required, allowed_reopen_reason_codes,
      repeat_escalation_threshold, effective_from
    ) values (
      'f4000000-0000-4000-8000-000000000002', 2, 1, 5, false,
      3600, array['citizen_verification_pending'], 3600,
      array['citizen_verification_pending'], 2, false, array[null]::text[],
      2, current_timestamp + interval '1 day'
    )$$,
  '23514',
  'RESOLUTION_POLICY_CONFIGURATION_INVALID',
  'policy reason-code arrays reject NULL elements'
);
select throws_ok(
  $$update complaints.resolution_policies
    set authority_id = 'f0100000-0000-4000-8000-000000000003'
    where id = 'f4000000-0000-4000-8000-000000000001'$$,
  '55000',
  'complaints.resolution_policies records are append-only.',
  'stable policy scope cannot be changed retroactively'
);

insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, observed_mime_type,
  observed_byte_size, verified_sha256, upload_status, upload_expires_at,
  finalized_at
)
values (
  'f3600000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  'f3400000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000002',
  'photo',
  'f3300000-0000-4000-8000-000000000001/f3600000-0000-4000-8000-000000000001/original',
  'image/jpeg',
  512,
  repeat('a', 64),
  'image/jpeg',
  512,
  repeat('a', 64),
  'finalized',
  clock_timestamp() + interval '15 minutes',
  clock_timestamp()
);

select is((
  select response_payload ->> 'status'
  from public.perform_government_complaint_action(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001',
    'acknowledge',
    1,
    repeat('3', 64),
    repeat('4', 64),
    'phase7-ack',
    '{"publicMessage":"Acknowledged for Phase 7."}'::jsonb
  )
), 'acknowledged', 'the government workflow reaches a resolution-eligible status');

select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001', 'submit_resolution', 2,
    repeat('5',64), repeat('6',64), 'phase7-resolution-mock',
    jsonb_build_object(
      'completionNote', 'Work reported complete.',
      'resolutionEvidenceIds', jsonb_build_array('f3600000-0000-4000-8000-000000000001'),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 10,
        'provider', 'gps', 'capturedAt', clock_timestamp(),
        'deviceRecordedAt', clock_timestamp(), 'isMockLocation', true
      )
    )
  )$$,
  '22023',
  'RESOLUTION_COMPLETION_LOCATION_INVALID',
  'resolution submission rejects an explicit mock location'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001', 'submit_resolution', 2,
    repeat('7',64), repeat('8',64), 'phase7-resolution-stale',
    jsonb_build_object(
      'completionNote', 'Work reported complete.',
      'resolutionEvidenceIds', jsonb_build_array('f3600000-0000-4000-8000-000000000001'),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 10,
        'provider', 'gps', 'capturedAt', clock_timestamp() - interval '10 minutes',
        'deviceRecordedAt', clock_timestamp() - interval '10 minutes',
        'isMockLocation', null
      )
    )
  )$$,
  '22023',
  'RESOLUTION_COMPLETION_LOCATION_INVALID',
  'resolution submission rejects a category-policy-stale location'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001', 'submit_resolution', 2,
    repeat('9',64), repeat('a',64), 'phase7-resolution-inaccurate',
    jsonb_build_object(
      'completionNote', 'Work reported complete.',
      'resolutionEvidenceIds', jsonb_build_array('f3600000-0000-4000-8000-000000000001'),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 51,
        'provider', 'gps', 'capturedAt', clock_timestamp(),
        'deviceRecordedAt', clock_timestamp(), 'isMockLocation', null
      )
    )
  )$$,
  '22023',
  'RESOLUTION_COMPLETION_LOCATION_INVALID',
  'resolution submission rejects accuracy above the category policy'
);

select is((
  select response_payload ->> 'status'
  from public.perform_government_complaint_action(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001',
    'submit_resolution',
    2,
    repeat('b', 64),
    repeat('c', 64),
    'phase7-resolution-valid',
    jsonb_build_object(
      'completionNote', 'Work completed and inspected.',
      'publicMessage', 'Please verify the completed work.',
      'resolutionEvidenceIds', jsonb_build_array(
        'f3600000-0000-4000-8000-000000000001'
      ),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84,
        'latitude', 18.54,
        'accuracyMeters', 10,
        'provider', 'gps',
        'capturedAt', clock_timestamp(),
        'deviceRecordedAt', clock_timestamp(),
        'isMockLocation', null
      )
    )
  )
), 'citizen_verification_pending',
  'valid resolution evidence transitions directly to citizen verification');
select ok((
  select response_payload ? 'resolution' = false
  from complaints.government_action_requests
  where request_id = 'phase7-resolution-valid'
), 'resolution action response preserves the strict Phase 5 public envelope');
select is((
  select completion_mock_location_detected
  from complaints.complaint_resolutions
  where complaint_id = 'f3300000-0000-4000-8000-000000000001'
), null::boolean, 'unknown mock-location state is preserved as NULL');
select ok((
  select completion_location_device_recorded_at is not null
    and completed_at is not null
    and completion_distance_to_complaint_meters <= 1
  from complaints.complaint_resolutions
  where complaint_id = 'f3300000-0000-4000-8000-000000000001'
), 'resolution history retains server completion and location provenance');

select is((
  select jsonb_array_length(accountability -> 'resolutionHistory')
  from public.get_government_complaint_accountability(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001',
    null
  )
), 1, 'government accountability includes the complete resolution history');
select is((
  select accountability -> 'resolutionHistory' -> 0 ->> 'completionNote'
  from public.get_government_complaint_accountability(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001',
    null
  )
), 'Work completed and inspected.',
  'government accountability retains the private completion note');

create temporary table phase7_runtime (
  key text primary key,
  uuid_value uuid,
  timestamp_value timestamptz
) on commit drop;
insert into phase7_runtime (key, timestamp_value)
values ('policy_boundary', clock_timestamp());

select throws_ok(
  $$update complaints.resolution_policy_versions
    set status = 'superseded', effective_to = current_timestamp - interval '1 minute'
    where id = 'f4100000-0000-4000-8000-000000000001'$$,
  '55000',
  'RESOLUTION_POLICY_VERSION_IMMUTABLE',
  'an approved policy version cannot be closed retroactively'
);
update complaints.resolution_policy_versions
set status = 'superseded',
    effective_to = (select timestamp_value from phase7_runtime where key = 'policy_boundary')
where id = 'f4100000-0000-4000-8000-000000000001';
insert into complaints.resolution_policy_versions (
  id, resolution_policy_id, version, status, rating_minimum, rating_maximum,
  ratings_required, feedback_window_seconds, eligible_feedback_statuses,
  reopen_window_seconds, eligible_reopen_statuses, max_reopen_attempts,
  reopen_evidence_required, allowed_reopen_reason_codes,
  repeat_escalation_threshold, effective_from, approved_by_user_id,
  approved_at, created_at
)
select
  'f4100000-0000-4000-8000-000000000002',
  'f4000000-0000-4000-8000-000000000001',
  2,
  'approved',
  1,
  5,
  true,
  3600,
  array['citizen_verification_pending', 'resolved', 'closed'],
  3600,
  array['citizen_verification_pending', 'resolved', 'closed'],
  2,
  true,
  array['new_issue_persists'],
  2,
  timestamp_value,
  'f2000000-0000-4000-8000-000000000002',
  timestamp_value - interval '1 millisecond',
  timestamp_value - interval '2 milliseconds'
from phase7_runtime where key = 'policy_boundary';

select is((
  select resolution_context -> 'policy' ->> 'id'
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 'f4100000-0000-4000-8000-000000000001',
  'citizen context freezes policy at the resolution completion time');
select is(
  complaints.resolve_resolution_policy_version(
    'f0100000-0000-4000-8000-000000000002',
    'f1100000-0000-4000-8000-000000000001',
    (select timestamp_value + interval '1 millisecond'
      from phase7_runtime where key = 'policy_boundary')
  ),
  'f4100000-0000-4000-8000-000000000002'::uuid,
  'the newer policy is independently effective after the rollover boundary'
);

set local session_replication_role = replica;
update complaints.complaint_assignments
set status = 'superseded',
    effective_to = clock_timestamp(),
    ended_by_user_id = 'f2000000-0000-4000-8000-000000000002'
where id = 'f3400000-0000-4000-8000-000000000001';
insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id,
  department_id, authority_department_id, officer_role_id, assignment_source,
  status, assigned_at, version, effective_from, assigned_by_user_id,
  supersedes_assignment_id, reason_code
)
values (
  'f3400000-0000-4000-8000-000000000002',
  'f3300000-0000-4000-8000-000000000001',
  'f3200000-0000-4000-8000-000000000001',
  'f0100000-0000-4000-8000-000000000003',
  'f0300000-0000-4000-8000-000000000002',
  'f0500000-0000-4000-8000-000000000001',
  'f0600000-0000-4000-8000-000000000002',
  'f0700000-0000-4000-8000-000000000001',
  'government_transfer',
  'active',
  clock_timestamp(),
  2,
  clock_timestamp(),
  'f2000000-0000-4000-8000-000000000002',
  'f3400000-0000-4000-8000-000000000001',
  'authority_transfer'
);
set local session_replication_role = origin;

select is((
  select resolution_context -> 'policy' ->> 'id'
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 'f4100000-0000-4000-8000-000000000001',
  'policy scope remains anchored to the resolution assignment after transfer');
select throws_ok(
  $$select complaints.resolve_resolution_policy_version(
    'f0100000-0000-4000-8000-000000000003',
    'f1100000-0000-4000-8000-000000000001',
    clock_timestamp()
  )$$,
  '55000',
  'RESOLUTION_POLICY_UNAVAILABLE',
  'a missing policy fails closed with the operational marker'
);

select throws_ok(
  $$select * from public.reserve_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001', 3,
    repeat('d',64), repeat('e',64), 'phase7-reopen-mock',
    'photo', 'image/jpeg', 512, repeat('f',64), clock_timestamp(),
    100, 100, null, 73.84, 18.54, 10, 'gps', clock_timestamp(),
    clock_timestamp(), true
  )$$,
  '22023', 'COMPLAINT_RESOLUTION_REQUEST_INVALID',
  'reopen evidence rejects an explicit mock location'
);
select throws_ok(
  $$select * from public.reserve_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001', 3,
    repeat('0',64), repeat('1',64), 'phase7-reopen-stale',
    'photo', 'image/jpeg', 512, repeat('2',64), clock_timestamp(),
    100, 100, null, 73.84, 18.54, 10, 'gps',
    clock_timestamp() - interval '10 minutes',
    clock_timestamp() - interval '10 minutes', null
  )$$,
  '22023', 'COMPLAINT_RESOLUTION_REQUEST_INVALID',
  'reopen evidence rejects a category-policy-stale location'
);
select throws_ok(
  $$select * from public.reserve_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001', 3,
    repeat('3',64), repeat('4',64), 'phase7-reopen-inaccurate',
    'photo', 'image/jpeg', 512, repeat('5',64), clock_timestamp(),
    100, 100, null, 73.84, 18.54, 51, 'gps', clock_timestamp(),
    clock_timestamp(), null
  )$$,
  '22023', 'COMPLAINT_RESOLUTION_REQUEST_INVALID',
  'reopen evidence rejects accuracy above the category policy'
);
select throws_ok(
  $$select * from public.reserve_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001', 3,
    repeat('6',64), repeat('7',64), 'phase7-reopen-dimensions',
    'photo', 'image/jpeg', 512, repeat('8',64), clock_timestamp(),
    20001, 20001, null, 73.84, 18.54, 10, 'gps', clock_timestamp(),
    clock_timestamp(), null
  )$$,
  '22023', 'COMPLAINT_RESOLUTION_REQUEST_INVALID',
  'reopen evidence rejects dimensions above the 20,000 pixel limit'
);

insert into phase7_runtime (key, uuid_value)
select 'reopen_evidence_one', evidence_id
from public.reserve_citizen_reopen_evidence(
  'f2000000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  3,
  repeat('9',64),
  repeat('a',64),
  'phase7-reopen-reserve-one',
  'photo',
  'image/jpeg',
  512,
  repeat('b',64),
  clock_timestamp(),
  100,
  100,
  null,
  73.84,
  18.54,
  10,
  'gps',
  clock_timestamp(),
  clock_timestamp(),
  null
);
select is((
  select upload_status
  from complaints.complaint_reopen_evidence
  where id = (select uuid_value from phase7_runtime where key = 'reopen_evidence_one')
), 'reserved', 'nullable mock state permits a valid reopen evidence reservation');
select is((
  select evidence_role
  from public.get_citizen_complaint_evidence_object(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    (select uuid_value from phase7_runtime where key = 'reopen_evidence_one'),
    'finalize'
  )
), 'reopen', 'the owner can locate reserved reopen evidence for finalization');

select is((
  select upload_status
  from public.finalize_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    (select uuid_value from phase7_runtime where key = 'reopen_evidence_one'),
    3,
    repeat('c',64),
    repeat('d',64),
    'phase7-reopen-finalize-one',
    'image/jpeg',
    512,
    repeat('b',64)
  )
), 'finalized', 'reopen evidence finalizes after integrity verification');
select is((
  select jsonb_array_length(resolution_context -> 'availableReopenEvidence')
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 1, 'finalized unlinked evidence survives a citizen context reload');
select ok((
  select not (
    resolution_context -> 'availableReopenEvidence' -> 0
      ?| array['objectPath', 'bucket', 'sha256', 'token']
  )
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 'available reopen evidence never exposes storage or integrity secrets');
select throws_ok(
  $$select * from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000002',
    'f3300000-0000-4000-8000-000000000001'
  )$$,
  'P0002', 'COMPLAINT_NOT_FOUND',
  'non-owners cannot read citizen accountability or reserved evidence'
);

insert into phase7_runtime (key, uuid_value)
select 'expired_evidence', evidence_id
from public.reserve_citizen_reopen_evidence(
  'f2000000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  3,
  repeat('e',64),
  repeat('f',64),
  'phase7-reopen-expired',
  'photo',
  'image/jpeg',
  512,
  repeat('0',64),
  clock_timestamp(),
  100,
  100,
  null,
  73.84,
  18.54,
  10,
  'gps',
  clock_timestamp(),
  clock_timestamp(),
  null
);
set local session_replication_role = replica;
update complaints.complaint_reopen_evidence
set captured_at = clock_timestamp() - interval '30 minutes',
    location_captured_at = clock_timestamp() - interval '30 minutes',
    location_device_recorded_at = clock_timestamp() - interval '30 minutes',
    created_at = clock_timestamp() - interval '30 minutes',
    updated_at = clock_timestamp() - interval '30 minutes',
    upload_expires_at = clock_timestamp() - interval '15 minutes'
where id = (select uuid_value from phase7_runtime where key = 'expired_evidence');
set local session_replication_role = origin;
select throws_ok(
  $$select * from public.reserve_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001', 3,
    repeat('e',64), repeat('f',64), 'phase7-reopen-expired',
    'photo', 'image/jpeg', 512, repeat('0',64), clock_timestamp(),
    100, 100, null, 73.84, 18.54, 10, 'gps', clock_timestamp(),
    clock_timestamp(), null
  )$$,
  '23514', 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED',
  'an expired exact reserve replay cannot mint another upload target'
);
select is(
  public.expire_citizen_reopen_evidence_reservations(10),
  1,
  'bounded cleanup expires abandoned reopen evidence reservations'
);
select is((
  select upload_status
  from complaints.complaint_reopen_evidence
  where id = (select uuid_value from phase7_runtime where key = 'expired_evidence')
), 'expired', 'cleanup preserves an explicit expired reservation state');

create temporary table phase7_positive_feedback_baseline on commit drop as
select
  (select count(*)
    from complaints.complaint_status_history
    where complaint_id = 'f3300000-0000-4000-8000-000000000001') as history_count,
  (select count(*)
    from complaints.notification_outbox
    where complaint_id = 'f3300000-0000-4000-8000-000000000001') as outbox_count;

savepoint phase7_positive_feedback_transition;
select is((
  select result ->> 'status'
  from public.submit_complaint_feedback(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    3,
    (select id from complaints.complaint_resolutions
      where complaint_id = 'f3300000-0000-4000-8000-000000000001'
      order by version desc limit 1),
    'resolved',
    5::smallint, 5::smallint, 5::smallint, 5::smallint,
    'The completed work resolved the reported issue.',
    repeat('0a',32), repeat('0b',32), 'phase7-feedback-positive-transition'
  )
), 'resolved',
  'positive feedback resolves a complaint pending citizen verification');
select is((
  select workflow_version
  from complaints.complaints
  where id = 'f3300000-0000-4000-8000-000000000001'
), 4::bigint,
  'positive feedback increments the complaint workflow version exactly once');
select ok((
  select count(*) = baseline.history_count + 1
    and max(history.sequence) = 4
    and (array_agg(history.from_status order by history.sequence desc))[1]
      = 'citizen_verification_pending'
    and (array_agg(history.to_status order by history.sequence desc))[1]
      = 'resolved'
    and (array_agg(history.reason_code order by history.sequence desc))[1]
      = 'RESOLUTION_CONFIRMED'
  from complaints.complaint_status_history as history
  cross join phase7_positive_feedback_baseline as baseline
  where history.complaint_id = 'f3300000-0000-4000-8000-000000000001'
  group by baseline.history_count
), 'positive feedback appends exactly one resolved status-history event');
select ok((
  select count(*) = baseline.outbox_count + 1
    and (array_agg(outbox.payload ->> 'status'
      order by outbox.occurred_at desc, outbox.id desc))[1] = 'resolved'
  from complaints.notification_outbox as outbox
  cross join phase7_positive_feedback_baseline as baseline
  where outbox.complaint_id = 'f3300000-0000-4000-8000-000000000001'
  group by baseline.outbox_count
), 'positive feedback appends exactly one resolved notification-outbox event');
rollback to savepoint phase7_positive_feedback_transition;

select is((
  select result ->> 'status'
  from public.submit_complaint_feedback(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    3,
    (select id from complaints.complaint_resolutions
      where complaint_id = 'f3300000-0000-4000-8000-000000000001'
      order by version desc limit 1),
    'not_resolved',
    null, null, null, null,
    'The issue is still present.',
    repeat('1',64), repeat('2',64), 'phase7-feedback-one'
  )
), 'citizen_verification_pending',
  'adverse feedback is recorded without claiming resolution');
select is((
  select workflow_version from complaints.complaints
  where id = 'f3300000-0000-4000-8000-000000000001'
), 3::bigint, 'adverse feedback does not consume a workflow transition');
select is((
  select replayed
  from public.submit_complaint_feedback(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    3,
    (select id from complaints.complaint_resolutions
      where complaint_id = 'f3300000-0000-4000-8000-000000000001'
      order by version desc limit 1),
    'not_resolved',
    null, null, null, null,
    'The issue is still present.',
    repeat('1',64), repeat('2',64), 'phase7-feedback-one'
  )
), true, 'feedback exact replay returns its stored response');

select is((
  select result ->> 'status'
  from public.reopen_complaint(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    3,
    (select id from complaints.complaint_resolutions
      where complaint_id = 'f3300000-0000-4000-8000-000000000001'
      order by version desc limit 1),
    'issue_persists',
    'The completed work did not resolve the reported issue.',
    array[(select uuid_value from phase7_runtime where key = 'reopen_evidence_one')],
    repeat('3',64), repeat('4',64), 'phase7-reopen-one'
  )
), 'reopened', 'first policy-bound reopen returns the complaint to work');
select is((
  select jsonb_array_length(resolution_context -> 'availableReopenEvidence')
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 0, 'linked reopen evidence leaves the available evidence list');
select is((
  select replayed
  from public.reopen_complaint(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    3,
    (select resolution_id from complaints.complaint_reopen_requests
      where complaint_id = 'f3300000-0000-4000-8000-000000000001'
      and attempt_number = 1),
    'issue_persists',
    'The completed work did not resolve the reported issue.',
    array[(select uuid_value from phase7_runtime where key = 'reopen_evidence_one')],
    repeat('3',64), repeat('4',64), 'phase7-reopen-one'
  )
), true, 'reopen exact replay returns its stored response');

set local session_replication_role = replica;
update complaints.complaints
set current_status = 'closed',
    workflow_version = 5,
    updated_at = clock_timestamp()
where id = 'f3300000-0000-4000-8000-000000000001';
insert into complaints.complaint_resolutions (
  id, complaint_id, version, assignment_id, submitted_by_user_id,
  completion_note, public_message, created_at, completed_at,
  completion_location, completion_accuracy_meters, completion_provider,
  location_captured_at, completion_location_device_recorded_at,
  completion_mock_location_detected, completion_distance_to_complaint_meters
)
values (
  'f3700000-0000-4000-8000-000000000002',
  'f3300000-0000-4000-8000-000000000001',
  2,
  'f3400000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000002',
  'Second completion for terminal-state verification.',
  'Please verify the second completion.',
  clock_timestamp(),
  clock_timestamp(),
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10,
  'gps',
  clock_timestamp(),
  clock_timestamp(),
  null,
  0
);
set local session_replication_role = origin;

select is((
  select result ->> 'status'
  from public.submit_complaint_feedback(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    5,
    'f3700000-0000-4000-8000-000000000002',
    'resolved',
    5::smallint, 5::smallint, 5::smallint, 5::smallint,
    'The follow-up is satisfactory.',
    repeat('5',64), repeat('6',64), 'phase7-feedback-terminal'
  )
), 'closed', 'positive feedback never regresses a terminal closed complaint');
select is((
  select workflow_version from complaints.complaints
  where id = 'f3300000-0000-4000-8000-000000000001'
), 5::bigint, 'terminal positive feedback does not create a closed-to-resolved transition');

insert into phase7_runtime (key, uuid_value)
select 'reopen_evidence_two', evidence_id
from public.reserve_citizen_reopen_evidence(
  'f2000000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  5,
  repeat('7',64), repeat('8',64), 'phase7-reopen-reserve-two',
  'photo', 'image/jpeg', 512, repeat('9',64), clock_timestamp(),
  100, 100, null, 73.84, 18.54, 10, 'gps', clock_timestamp(),
  clock_timestamp(), null
);
select is((
  select upload_status
  from public.finalize_citizen_reopen_evidence(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    (select uuid_value from phase7_runtime where key = 'reopen_evidence_two'),
    5,
    repeat('a',64), repeat('b',64), 'phase7-reopen-finalize-two',
    'image/jpeg', 512, repeat('9',64)
  )
), 'finalized', 'second-resolution reopen evidence finalizes');
select is((
  select result ->> 'status'
  from public.reopen_complaint(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001',
    5,
    'f3700000-0000-4000-8000-000000000002',
    'new_issue_persists',
    'The second completion still did not resolve the issue.',
    array[(select uuid_value from phase7_runtime where key = 'reopen_evidence_two')],
    repeat('ab',32), repeat('cd',32), 'phase7-reopen-two'
  )
), 'escalated', 'the configured repeated-reopen threshold escalates atomically');
select is((
  select count(*)::integer
  from complaints.complaint_escalation_events
  where complaint_id = 'f3300000-0000-4000-8000-000000000001'
), 1, 'repeated reopen appends one durable escalation event');
select is((
  select reason_code
  from complaints.complaint_status_history
  where complaint_id = 'f3300000-0000-4000-8000-000000000001'
  order by sequence desc
  limit 1
), 'REPEATED_REOPEN_ESCALATED',
  'escalation appends explicit citizen-action status history');
select ok(exists (
  select 1
  from complaints.notification_outbox
  where complaint_id = 'f3300000-0000-4000-8000-000000000001'
    and payload ->> 'status' = 'escalated'
), 'escalation appends an atomic notification outbox event');
select is((
  select jsonb_array_length(resolution_context -> 'escalations')
  from public.get_citizen_resolution_context(
    'f2000000-0000-4000-8000-000000000001',
    'f3300000-0000-4000-8000-000000000001'
  )
), 1, 'citizen context returns the durable escalation history');

select * from finish();
rollback;
