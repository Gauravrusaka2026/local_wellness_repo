begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(94);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'd0000000-0000-4000-8000-000000000001',
  'Synthetic Phase 5 fixture',
  'https://example.test/phase-5-fixture',
  'official',
  date '2026-07-14'
);

insert into governance.authorities (
  id, code, name, authority_type, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'd0100000-0000-4000-8000-000000000001', 'PHASE5_TEST_STATE',
  'Phase 5 Test State', 'state', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'd0100000-0000-4000-8000-000000000002',
  'd0100000-0000-4000-8000-000000000001', 'PHASE5_TEST_LOCAL_BODY',
  'Phase 5 Test Local Body', 'local_body', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into governance.states (
  id, authority_id, name, iso_code, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'd0200000-0000-4000-8000-000000000001',
  'd0100000-0000-4000-8000-000000000001',
  'Phase 5 Test State', 'PFT', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'd0300000-0000-4000-8000-000000000001',
  'd0100000-0000-4000-8000-000000000002',
  'd0200000-0000-4000-8000-000000000001',
  'Phase 5 Test Local Body', 'municipal_corporation', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into governance.wards (
  id, local_body_id, source_ward_code, name, ward_number,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'd0400000-0000-4000-8000-000000000001',
    'd0300000-0000-4000-8000-000000000001', 'P5-W1',
    'Phase 5 Ward One', '1', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0400000-0000-4000-8000-000000000002',
    'd0300000-0000-4000-8000-000000000001', 'P5-W2',
    'Phase 5 Ward Two', '2', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  );

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'd0500000-0000-4000-8000-000000000001',
    'phase5_test_department', 'Phase 5 Test Department', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0500000-0000-4000-8000-000000000002',
    'phase5_other_department', 'Phase 5 Other Department', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  );

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    'd0600000-0000-4000-8000-000000000001',
    'd0100000-0000-4000-8000-000000000002',
    'd0500000-0000-4000-8000-000000000001', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0600000-0000-4000-8000-000000000002',
    'd0100000-0000-4000-8000-000000000002',
    'd0500000-0000-4000-8000-000000000002', 'verified', true,
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  );

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'd0700000-0000-4000-8000-000000000001',
  'phase5_test_officer', 'Phase 5 Test Officer', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into governance.officers (
  id, full_name, verification_status, is_placeholder, last_verified_on,
  reference_source_id
)
values
  (
    'd0800000-0000-4000-8000-000000000001',
    'Verified Phase Five Officer', 'verified', false, date '2026-07-14',
    'd0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0800000-0000-4000-8000-000000000002',
    'Unverified Placeholder Officer', 'placeholder', true, null,
    'd0000000-0000-4000-8000-000000000001'
  );

insert into governance.officer_assignments (
  id, assignment_key, version, authority_id, officer_role_id, officer_id,
  authority_department_id, local_body_id, ward_id, status, verification_status,
  is_placeholder, effective_from, last_verified_on, reference_source_id
)
values
  (
    'd0900000-0000-4000-8000-000000000001', 'phase5:test:officer:1', 1,
    'd0100000-0000-4000-8000-000000000002',
    'd0700000-0000-4000-8000-000000000001',
    'd0800000-0000-4000-8000-000000000001',
    'd0600000-0000-4000-8000-000000000001',
    'd0300000-0000-4000-8000-000000000001',
    'd0400000-0000-4000-8000-000000000001',
    'active', 'verified', false, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0900000-0000-4000-8000-000000000002', 'phase5:test:officer:placeholder', 1,
    'd0100000-0000-4000-8000-000000000002',
    'd0700000-0000-4000-8000-000000000001',
    'd0800000-0000-4000-8000-000000000002',
    'd0600000-0000-4000-8000-000000000001',
    'd0300000-0000-4000-8000-000000000001',
    'd0400000-0000-4000-8000-000000000001',
    'active', 'placeholder', true, timestamptz '2026-01-01 00:00:00+00',
    null, 'd0000000-0000-4000-8000-000000000001'
  );

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'd1000000-0000-4000-8000-000000000001', 'phase5_test_domain',
  'Phase 5 Test Domain', 'active', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'd1100000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001', 'phase5_test_category',
  'Phase 5 Test Category', 'active', 'verified', true,
  date '2026-07-14', 'd0000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'phase5-citizen@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'phase5-operator@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'phase5-moderator@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'phase5-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
    'phase5-platform@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
    'phase5-cross-authority@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated',
    'phase5-ward-one@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated',
    'phase5-ward-two@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated',
    'phase5-department-one@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated',
    'phase5-department-two@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated',
    'phase5-expired-role@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated',
    'phase5-revoked-member@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values
  (
    'd2000000-0000-4000-8000-000000000002',
    'd0100000-0000-4000-8000-000000000002', 'phase5-operator@example.test',
    'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000003',
    'd0100000-0000-4000-8000-000000000002', 'phase5-moderator@example.test',
    'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  );

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'd2000000-0000-4000-8000-000000000002', role.id,
  'd0100000-0000-4000-8000-000000000002', 'authority',
  'd0100000-0000-4000-8000-000000000002', now() - interval '1 day',
  'd2000000-0000-4000-8000-000000000002'
from public.roles as role where role.code = 'government_operator';

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'd2000000-0000-4000-8000-000000000003', role.id,
  'd0100000-0000-4000-8000-000000000002', 'authority',
  'd0100000-0000-4000-8000-000000000002', now() - interval '1 day',
  'd2000000-0000-4000-8000-000000000002'
from public.roles as role where role.code = 'moderator';

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values
  (
    'd2000000-0000-4000-8000-000000000006',
    'd0100000-0000-4000-8000-000000000001',
    'phase5-cross-authority@example.test', 'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000007',
    'd0100000-0000-4000-8000-000000000002',
    'phase5-ward-one@example.test', 'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000008',
    'd0100000-0000-4000-8000-000000000002',
    'phase5-ward-two@example.test', 'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000009',
    'd0100000-0000-4000-8000-000000000002',
    'phase5-department-one@example.test', 'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000010',
    'd0100000-0000-4000-8000-000000000002',
    'phase5-department-two@example.test', 'active', now() - interval '1 day',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
  ),
  (
    'd2000000-0000-4000-8000-000000000011',
    'd0100000-0000-4000-8000-000000000002',
    'phase5-expired-role@example.test', 'active', now() - interval '2 days',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002', now() - interval '2 days'
  );

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, revoked_by, revoked_at
)
values (
  'd2000000-0000-4000-8000-000000000012',
  'd0100000-0000-4000-8000-000000000002',
  'phase5-revoked-member@example.test', 'revoked', now() - interval '2 days',
  'd2000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000002', now() - interval '1 day'
);

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'd2000000-0000-4000-8000-000000000005', role.id,
  null, 'global', null, now() - interval '1 day',
  'd2000000-0000-4000-8000-000000000002'
from public.roles as role where role.code = 'platform_admin';

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  fixture.user_id,
  role.id,
  fixture.authority_id,
  fixture.scope_type,
  fixture.scope_id,
  now() - interval '1 day',
  'd2000000-0000-4000-8000-000000000002'
from (
  values
    (
      'd2000000-0000-4000-8000-000000000006'::uuid,
      'government_operator'::text,
      'd0100000-0000-4000-8000-000000000001'::uuid,
      'authority'::text,
      'd0100000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'd2000000-0000-4000-8000-000000000007'::uuid,
      'ward_officer'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid,
      'ward'::text,
      'd0400000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'd2000000-0000-4000-8000-000000000008'::uuid,
      'ward_officer'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid,
      'ward'::text,
      'd0400000-0000-4000-8000-000000000002'::uuid
    ),
    (
      'd2000000-0000-4000-8000-000000000009'::uuid,
      'department_officer'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid,
      'department'::text,
      'd0600000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'd2000000-0000-4000-8000-000000000010'::uuid,
      'department_officer'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid,
      'department'::text,
      'd0600000-0000-4000-8000-000000000002'::uuid
    ),
    (
      'd2000000-0000-4000-8000-000000000012'::uuid,
      'government_operator'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid,
      'authority'::text,
      'd0100000-0000-4000-8000-000000000002'::uuid
    )
) as fixture(user_id, role_code, authority_id, scope_type, scope_id)
inner join public.roles as role on role.code = fixture.role_code;

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from,
  effective_until, status, granted_by
)
select
  'd2000000-0000-4000-8000-000000000011', role.id,
  'd0100000-0000-4000-8000-000000000002', 'authority',
  'd0100000-0000-4000-8000-000000000002', now() - interval '2 days',
  now() - interval '1 day', 'expired',
  'd2000000-0000-4000-8000-000000000002'
from public.roles as role where role.code = 'government_operator';

-- Simulate a manually corrupted role/scope pairing. The workflow layer must not
-- let an authority-capable role widen scope when its grant is only ward-scoped.
insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'd2000000-0000-4000-8000-000000000007', role.id,
  'd0100000-0000-4000-8000-000000000002', 'ward',
  'd0400000-0000-4000-8000-000000000001', now() - interval '1 day',
  'd2000000-0000-4000-8000-000000000002'
from public.roles as role where role.code = 'government_operator';

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash, creation_request_fingerprint,
  category_id, description
)
values (
  'd3000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001', repeat('1', 64), repeat('2', 64),
  'd1100000-0000-4000-8000-000000000001', 'Private Phase 5 complaint.'
);

insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, spoof_risk_status,
  verification_status, verification_score
)
values (
  'd3100000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001', 'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10, 'gps', now(), now(), 'low', 'verified', 0.99
);

update complaints.complaint_drafts
set selected_location_evidence_id = 'd3100000-0000-4000-8000-000000000001',
    status = 'submitted', submitted_at = now()
where id = 'd3000000-0000-4000-8000-000000000001';

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location, accuracy_meters,
  captured_at, resolved_at, decision_status, explanation_codes
)
values (
  'd3200000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001', 'phase5-routing-fixture',
  'd1100000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10, now(), now(), 'manual_review', array['phase5_fixture']::text[]
);
set local session_replication_role = origin;

insert into complaints.complaints (
  id, draft_id, complaint_number, citizen_user_id, category_id, description,
  description_language, custom_attributes, location_evidence_id,
  routing_decision_id, submitted_at
)
values (
  'd3300000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001', 'LW-20260714-90000001',
  'd2000000-0000-4000-8000-000000000001',
  'd1100000-0000-4000-8000-000000000001', 'Private Phase 5 complaint.',
  'en', '{}'::jsonb, 'd3100000-0000-4000-8000-000000000001',
  'd3200000-0000-4000-8000-000000000001', now()
);

insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
  department_id, authority_department_id, officer_role_id, assigned_at
)
values (
  'd3400000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001',
  'd3200000-0000-4000-8000-000000000001',
  'd0100000-0000-4000-8000-000000000002',
  'd0300000-0000-4000-8000-000000000001',
  'd0400000-0000-4000-8000-000000000001',
  'd0500000-0000-4000-8000-000000000001',
  'd0600000-0000-4000-8000-000000000001',
  'd0700000-0000-4000-8000-000000000001', now()
);

insert into complaints.complaint_status_history (
  complaint_id, sequence, from_status, to_status, actor_user_id,
  event_source, reason_code, public_message
)
values (
  'd3300000-0000-4000-8000-000000000001', 1, 'draft', 'submitted',
  'd2000000-0000-4000-8000-000000000001', 'citizen_submission',
  'COMPLAINT_SUBMITTED', 'Complaint submitted successfully.'
);

insert into complaints.complaint_submission_requests (
  actor_user_id, draft_id, idempotency_key_hash, request_fingerprint,
  routing_request_id, state, routing_decision_id, complaint_id,
  response_payload, completed_at
)
values (
  'd2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001', repeat('3', 64), repeat('4', 64),
  'complaint-submit:d3500000-0000-4000-8000-000000000001', 'completed',
  'd3200000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001', '{}'::jsonb, now()
);

select throws_ok(
  $$select * from public.list_government_complaints(
    'd2000000-0000-4000-8000-000000000002', null, null, null, null,
    null, null, null, null, null, null, null, null, null
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'queue pagination limit cannot be null or become unbounded'
);
select throws_ok(
  $$select * from public.list_owned_complaints(
    'd2000000-0000-4000-8000-000000000001', null, null, null
  )$$,
  '22023', 'COMPLAINT_LIST_CURSOR_INVALID',
  'citizen complaint pagination limit cannot be null or become unbounded'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', null,
    repeat('a',64), repeat('b',64), 'phase5-null-version', '{}'::jsonb
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'action optimistic concurrency version cannot be null'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', 1,
    repeat('a',64), repeat('b',64), 'phase5-null-payload', null
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'action payload cannot bypass object validation with null'
);
select throws_ok(
  $$select * from public.reserve_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null,
    repeat('a',64), repeat('b',64), 'phase5-null-reserve-version',
    'photo', 'image/jpeg', 512, repeat('c',64), null
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'evidence reserve concurrency version cannot be null'
);
select throws_ok(
  $$select * from public.finalize_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001',
    'd3600000-0000-4000-8000-000000000001', null,
    repeat('a',64), repeat('b',64), 'phase5-null-finalize-version',
    'image/jpeg', 512, repeat('c',64)
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'evidence finalize concurrency version cannot be null'
);
select throws_ok(
  $$select public.expire_government_resolution_evidence(null)$$,
  '22023', 'RESOLUTION_EVIDENCE_CLEANUP_LIMIT_INVALID',
  'evidence cleanup limit cannot be null or become unbounded'
);
select throws_ok(
  $$select * from public.fail_government_resolution_evidence(
    'd3600000-0000-4000-8000-000000000001', null
  )$$,
  '22023', 'RESOLUTION_EVIDENCE_FAILURE_CODE_INVALID',
  'evidence failure code cannot bypass validation with null'
);

select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'operator sees its verified authority queue');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000004', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'user without government scope sees no queue rows');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000006', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'a role in another authority cannot cross the authority boundary');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000005', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'an active global platform administrator can read verified assignments');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000007', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'the exact ward scope can read its assignment');
select is((select count(*)::integer from public.list_government_assignment_options(
  'd2000000-0000-4000-8000-000000000007',
  'd3300000-0000-4000-8000-000000000001', null
)), 0, 'a manually ward-scoped operator role cannot assign or widen scope');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000008', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'a different ward scope cannot read the assignment');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000009', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'the exact authority-department scope can read its assignment');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000010', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'a different authority-department scope cannot read the assignment');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000011', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'an expired role assignment has no workflow access');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000012', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 0, 'a revoked authority membership has no workflow access');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000003', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'moderator may read its authority queue');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000002', 25, null, null,
  (select user_role.id from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = 'd2000000-0000-4000-8000-000000000003'
      and role.code = 'moderator'),
  null, null, null, null, null, null, null, null, null
)), 0, 'a role-assignment selector cannot borrow another actor scope');
select is(
  (select current_assignment ? 'authorityId' from public.list_government_complaints(
    'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
    null, null, null, null, null, null, null, null
  )), true, 'queue assignment JSON uses the public camel-case shape'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000003',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', 1,
    repeat('a',64), repeat('b',64), 'phase5-moderator-denied', '{}'::jsonb
  )$$,
  '42501', 'GOVERNMENT_ACCESS_REQUIRED', 'moderator cannot mutate a complaint'
);

select is(
  (select jsonb_array_length(options) from public.list_government_assignment_options(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  )), 1, 'assignment options contain the verified same-authority officer'
);
select is(
  (select options -> 0 -> 'allowedActions' from public.list_government_assignment_options(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  )), '["assign"]'::jsonb, 'same-scope officer option is reassignment-only'
);
select ok(not (select options @> '[{"officerAssignmentId":"d0900000-0000-4000-8000-000000000002"}]'::jsonb
  from public.list_government_assignment_options(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  )), 'placeholder assignment targets are omitted from assignment options');

select is(
  (select response_payload ->> 'status' from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', 1,
    repeat('5',64), repeat('6',64), 'phase5-ack',
    '{"publicMessage":"Acknowledged by the municipal team."}'::jsonb
  )), 'acknowledged', 'authorized acknowledgement updates status atomically'
);
select is((select workflow_version from complaints.complaints
  where id = 'd3300000-0000-4000-8000-000000000001'), 2::bigint);
select is((select count(*)::integer from complaints.government_action_audit_events), 1);
select is((select count(*)::integer from complaints.notification_outbox), 2,
  'submission and acknowledgement each append an outbox event');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'assign', 2,
    repeat('f',64), repeat('e',64), 'phase5-placeholder-assignment-denied',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000002","reason":"initial_assignment"}'::jsonb
  )$$,
  '23514', 'OFFICER_ASSIGNMENT_INVALID',
  'placeholder assignment targets cannot enter production workflow'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'update_status', 2,
    repeat('4',64), repeat('4',64), 'phase5-noop-transition',
    '{"status":"acknowledged"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'same-status update cannot consume a workflow version or audit entry'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'update_status', 2,
    repeat('0',64), repeat('1',64), 'phase5-invalid-transition',
    '{"status":"closed"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'an invalid lifecycle transition fails closed'
);
select is(
  (select replayed from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', 1,
    repeat('5',64), repeat('6',64), 'phase5-ack',
    '{"publicMessage":"Acknowledged by the municipal team."}'::jsonb
  )), true, 'exact action retry returns the stored response'
);
select is((select count(*)::integer from complaints.government_action_audit_events), 1,
  'action replay creates no duplicate audit event');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'acknowledge', 2,
    repeat('5',64), repeat('7',64), 'phase5-ack-changed', '{}'::jsonb
  )$$,
  '23505', 'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT',
  'changed request reuse conflicts'
);

select is(
  (select response_payload ->> 'status' from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'assign', 2,
    repeat('8',64), repeat('9',64), 'phase5-assign',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000001","reason":"initial_assignment"}'::jsonb
  )), 'acknowledged', 'same-scope assignment preserves an in-progress status'
);
select is((select count(*)::integer from complaints.complaint_assignments), 2,
  'assignment creates a new version');
select is((select count(*)::integer from complaints.complaint_assignments
  where status = 'active' and effective_to is null), 1, 'exactly one assignment remains active');
select ok((select effective_to is not null from complaints.complaint_assignments where version = 1),
  'superseded assignment is closed');
select is((select count(*)::integer from public.list_owned_complaints(
  'd2000000-0000-4000-8000-000000000001', 25, null, null
)), 1, 'citizen list remains single-row after reassignment');
select is((select count(*)::integer from public.get_owned_complaint(
  'd2000000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001'
)), 1, 'citizen detail uses only the active assignment');
select is((select count(*)::integer from public.submit_complaint(
  'd2000000-0000-4000-8000-000000000001',
  (select id from complaints.complaint_submission_requests limit 1),
  'd3200000-0000-4000-8000-000000000001', '{}'::uuid[], false
)), 1, 'submission replay remains one row after assignment history grows');

insert into governance.officers (
  id, full_name, verification_status, last_verified_on, reference_source_id
)
values (
  'd0800000-0000-4000-8000-000000000003',
  'Verified Replacement Officer', 'verified', date '2026-07-14',
  'd0000000-0000-4000-8000-000000000001'
);
insert into governance.officer_assignments (
  id, assignment_key, version, authority_id, officer_role_id, officer_id,
  authority_department_id, local_body_id, ward_id, status, verification_status,
  effective_from, last_verified_on, reference_source_id
)
values (
  'd0900000-0000-4000-8000-000000000003', 'phase5:test:officer:replacement', 1,
  'd0100000-0000-4000-8000-000000000002',
  'd0700000-0000-4000-8000-000000000001',
  'd0800000-0000-4000-8000-000000000003',
  'd0600000-0000-4000-8000-000000000001',
  'd0300000-0000-4000-8000-000000000001',
  'd0400000-0000-4000-8000-000000000001',
  'active', 'verified', now(), date '2026-07-14',
  'd0000000-0000-4000-8000-000000000001'
);
update governance.officer_assignments
set status = 'superseded', effective_to = clock_timestamp()
where id = 'd0900000-0000-4000-8000-000000000001';

select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'authority operator retains access when the incumbent tenure ends');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000005', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'global platform administrator retains stale-incumbent recovery access');
select is((select current_assignment ->> 'officerAssignmentId'
  from public.list_government_complaints(
    'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
    null, null, null, null, null, null, null, null
  )), null::text, 'an ended incumbent is not represented as the current recipient');
select is((select (queue_flags ->> 'isUnassigned')::boolean
  from public.list_government_complaints(
    'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
    null, null, null, null, null, null, null, null
  )), true, 'an ended incumbent makes the complaint operationally unassigned');
select is((select (queue_flags ->> 'isUnassigned')::boolean
  from public.get_government_complaint(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  )), true, 'detail and queue agree that an ended incumbent is unassigned');
select is((select options -> 0 ->> 'officerAssignmentId'
  from public.list_government_assignment_options(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  )), 'd0900000-0000-4000-8000-000000000003',
  'only the current verified replacement is offered');
select is((select response_payload -> 'currentAssignment' ->> 'officerAssignmentId'
  from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'assign', 3,
    repeat('abcdef01',8), repeat('10fedcba',8), 'phase5-stale-incumbent-reassign',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000003","reason":"officer_unavailable"}'::jsonb
  )), 'd0900000-0000-4000-8000-000000000003',
  'stale incumbent can be replaced through the guarded workflow');
select is((select complaints.assignment_summary(id) ->> 'officerAssignmentId'
  from complaints.complaint_assignments
  where complaint_id = 'd3300000-0000-4000-8000-000000000001' and version = 2
), 'd0900000-0000-4000-8000-000000000001',
  'ended complaint-assignment history retains incumbent provenance');

create temporary table phase5_evidence_fixture (
  evidence_id uuid,
  inspection_id uuid,
  dependency_id uuid
) on commit drop;

-- Expired reservations do not consume the active evidence allowance, but exact
-- replay must still fail closed so callers cannot mint a new upload token.
with expired_fixture as (
  select gen_random_uuid() as evidence_id
)
insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, upload_expires_at,
  created_at
)
select
  expired_fixture.evidence_id,
  'd3300000-0000-4000-8000-000000000001',
  assignment.id,
  'd2000000-0000-4000-8000-000000000002',
  'photo',
  format(
    '%s/%s/original',
    'd3300000-0000-4000-8000-000000000001',
    expired_fixture.evidence_id
  ),
  'image/jpeg', 512, repeat('1', 64), now() - interval '5 minutes',
  now() - interval '20 minutes'
from expired_fixture
inner join complaints.complaint_assignments as assignment
  on assignment.complaint_id = 'd3300000-0000-4000-8000-000000000001'
 and assignment.status = 'active'
 and assignment.effective_to is null;

insert into complaints.government_action_requests (
  actor_user_id, complaint_id, action_type, idempotency_key_hash,
  request_fingerprint, request_id, state, from_status, to_status,
  response_payload, completed_at
)
select
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001',
  'upload_resolution_evidence', repeat('2', 64), repeat('3', 64),
  'phase5-expired-evidence-replay', 'completed', 'acknowledged', 'acknowledged',
  jsonb_build_object(
    'evidenceId', evidence.id,
    'workflowVersion', 4
  ),
  now() - interval '5 minutes'
from complaints.complaint_resolution_evidence as evidence
where evidence.upload_expires_at < now();

select is(public.expire_government_resolution_evidence(100), 1,
  'bounded cleanup marks an elapsed reservation expired');

select throws_ok(
  $$select * from public.reserve_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 4,
    repeat('2',64), repeat('3',64), 'phase5-expired-evidence-replay',
    'photo', 'image/jpeg', 512, repeat('1',64), null
  )$$,
  '55000', 'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED',
  'exact reserve replay never revives an expired upload path'
);

with failed_fixture as (
  select gen_random_uuid() as evidence_id
)
insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, upload_expires_at
)
select
  failed_fixture.evidence_id,
  'd3300000-0000-4000-8000-000000000001', assignment.id,
  'd2000000-0000-4000-8000-000000000002', 'photo',
  format(
    '%s/%s/original',
    'd3300000-0000-4000-8000-000000000001',
    failed_fixture.evidence_id
  ),
  'image/jpeg', 512, repeat('5', 64), now() + interval '1 hour'
from failed_fixture
inner join complaints.complaint_assignments as assignment
  on assignment.complaint_id = 'd3300000-0000-4000-8000-000000000001'
 and assignment.status = 'active'
 and assignment.effective_to is null;
insert into complaints.government_action_requests (
  actor_user_id, complaint_id, action_type, idempotency_key_hash,
  request_fingerprint, request_id, state, from_status, to_status,
  response_payload, completed_at
)
select
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001',
  'upload_resolution_evidence', repeat('0123456789abcdef', 4),
  repeat('fedcba9876543210', 4),
  'phase5-failed-evidence-replay', 'completed', 'acknowledged', 'acknowledged',
  jsonb_build_object('evidenceId', evidence.id, 'workflowVersion', 4), now()
from complaints.complaint_resolution_evidence as evidence
where evidence.client_sha256 = repeat('5', 64);
select is((select upload_status from public.fail_government_resolution_evidence(
  (select id from complaints.complaint_resolution_evidence
    where client_sha256 = repeat('5', 64)),
  'storage_verification_failed'
)), 'failed', 'server-owned failure path preserves immutable upload history');
select throws_ok(
  $$select * from public.reserve_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 4,
    repeat('0123456789abcdef', 4), repeat('fedcba9876543210', 4),
    'phase5-failed-evidence-replay',
    'photo', 'image/jpeg', 512, repeat('5',64), null
  )$$,
  '55000', 'RESOLUTION_EVIDENCE_NOT_READY',
  'exact reserve replay cannot revive a failed upload path'
);

-- Historical unlinked evidence remains retained but cannot consume the current
-- assignment's allowance or be finalized by the replacement assignee.
with historical_fixtures as (
  select gen_random_uuid() as evidence_id
  from generate_series(1, 20)
)
insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, upload_expires_at
)
select
  historical_fixtures.evidence_id,
  'd3300000-0000-4000-8000-000000000001', assignment.id,
  'd2000000-0000-4000-8000-000000000002', 'photo',
  format(
    '%s/%s/original',
    'd3300000-0000-4000-8000-000000000001',
    historical_fixtures.evidence_id
  ),
  'image/jpeg', 512, repeat('6a', 32), now() + interval '1 hour'
from historical_fixtures
cross join lateral (
  select historical_assignment.id
  from complaints.complaint_assignments as historical_assignment
  where historical_assignment.complaint_id = 'd3300000-0000-4000-8000-000000000001'
    and historical_assignment.version = 2
) as assignment;
select is((select count(*)::integer
  from complaints.complaint_resolution_evidence as evidence
  inner join complaints.complaint_assignments as assignment
    on assignment.id = evidence.assignment_id
  where assignment.version = 2
), 20, 'twenty retained historical uploads do not consume the current allowance');
select is((select count(*)::integer
  from public.get_government_resolution_evidence_object(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001',
    (select evidence.id
      from complaints.complaint_resolution_evidence as evidence
      inner join complaints.complaint_assignments as assignment
        on assignment.id = evidence.assignment_id
      where assignment.version = 2
      limit 1),
    null,
    'finalize'
  )
), 0, 'replacement assignee cannot finalize historical assignment evidence');
insert into complaints.government_action_requests (
  actor_user_id, complaint_id, action_type, idempotency_key_hash,
  request_fingerprint, request_id, state, from_status, to_status,
  response_payload, completed_at
)
select
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001',
  'finalize_resolution_evidence', repeat('bead', 16), repeat('daeb', 16),
  'phase5-historical-finalize-replay', 'completed', 'acknowledged', 'acknowledged',
  jsonb_build_object('evidenceId', evidence.id, 'workflowVersion', 4), now()
from complaints.complaint_resolution_evidence as evidence
inner join complaints.complaint_assignments as assignment
  on assignment.id = evidence.assignment_id
where assignment.version = 2
limit 1;
select throws_ok(
  $$select * from public.finalize_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001',
    (select evidence.id
      from complaints.complaint_resolution_evidence as evidence
      inner join complaints.complaint_assignments as assignment
        on assignment.id = evidence.assignment_id
      where assignment.version = 2
      limit 1),
    4, repeat('bead',16), repeat('daeb',16),
    'phase5-historical-finalize-replay', 'image/jpeg', 512, repeat('6a',32)
  )$$,
  '55000', 'RESOLUTION_EVIDENCE_NOT_READY',
  'finalize replay cannot cross into a replacement assignment'
);

-- Leave nineteen usable, unlinked current reservations so the real reservation
-- below reaches (but does not exceed) the per-assignment limit.
with active_fixtures as (
  select gen_random_uuid() as evidence_id
  from generate_series(1, 19)
)
insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, upload_expires_at
)
select
  active_fixtures.evidence_id,
  'd3300000-0000-4000-8000-000000000001',
  assignment.id,
  'd2000000-0000-4000-8000-000000000002',
  'photo',
  format(
    '%s/%s/original',
    'd3300000-0000-4000-8000-000000000001',
    active_fixtures.evidence_id
  ),
  'image/jpeg', 512, repeat('4', 64), now() + interval '1 hour'
from active_fixtures
cross join lateral (
  select current_assignment.id
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = 'd3300000-0000-4000-8000-000000000001'
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null
) as assignment;

insert into phase5_evidence_fixture (evidence_id)
select evidence_id from public.reserve_government_resolution_evidence(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 4,
  repeat('a',64), repeat('b',64), 'phase5-evidence-reserve',
  'photo', 'image/jpeg', 1024, repeat('c',64), now()
);
select matches((select object_path from public.get_government_resolution_evidence_object(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001',
  (select evidence_id from phase5_evidence_fixture), null, 'finalize'
)), '^d3300000-.+/original$', 'evidence path is server-generated under the complaint');
select ok((select upload_expires_at > now() and workflow_version = 5
  from public.get_government_resolution_evidence_object(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001',
    (select evidence_id from phase5_evidence_fixture), null, 'finalize'
  )), 'finalize locator exposes expiry and current workflow version for preflight');
select is((select count(*)::integer from public.get_government_resolution_evidence_object(
  'd2000000-0000-4000-8000-000000000003',
  'd3300000-0000-4000-8000-000000000001',
  (select evidence_id from phase5_evidence_fixture), null, 'finalize'
)), 0, 'read-only moderator cannot obtain a finalize locator');
select throws_ok(
  $$select * from public.reserve_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 5,
    repeat('c',64), repeat('d',64), 'phase5-evidence-over-limit',
    'photo', 'image/jpeg', 1024, repeat('a',64), now()
  )$$,
  '23514', 'RESOLUTION_EVIDENCE_LIMIT_REACHED',
  'usable unlinked resolution evidence is capped at twenty per complaint'
);
select throws_ok(
  $$select * from public.finalize_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001',
    (select evidence_id from phase5_evidence_fixture), 5,
    repeat('d',64), repeat('e',64), 'phase5-evidence-bad',
    'image/jpeg', 1025, repeat('c',64)
  )$$,
  '23514', 'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
  'finalization independently rejects object metadata mismatch'
);
select is((select upload_status from public.finalize_government_resolution_evidence(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001',
  (select evidence_id from phase5_evidence_fixture), 5,
  repeat('f',64), repeat('0',64), 'phase5-evidence-finalize',
  'image/jpeg', 1024, repeat('c',64)
)), 'finalized', 'matching object evidence finalizes');
select throws_ok(
  $$select * from public.reserve_government_resolution_evidence(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 4,
    repeat('a',64), repeat('b',64), 'phase5-evidence-reserve',
    'photo', 'image/jpeg', 1024, repeat('c',64), now()
  )$$,
  '55000', 'RESOLUTION_EVIDENCE_NOT_READY',
  'exact reserve replay cannot reopen a finalized upload path'
);

insert into governance.officers (
  id, full_name, verification_status, last_verified_on, reference_source_id
)
values (
  'd0800000-0000-4000-8000-000000000004',
  'Verified Transfer Officer', 'verified', date '2026-07-14',
  'd0000000-0000-4000-8000-000000000001'
);
insert into governance.officer_assignments (
  id, assignment_key, version, authority_id, officer_role_id, officer_id,
  authority_department_id, local_body_id, ward_id, status, verification_status,
  effective_from, last_verified_on, reference_source_id
)
values (
  'd0900000-0000-4000-8000-000000000004', 'phase5:test:officer:transfer', 1,
  'd0100000-0000-4000-8000-000000000002',
  'd0700000-0000-4000-8000-000000000001',
  'd0800000-0000-4000-8000-000000000004',
  'd0600000-0000-4000-8000-000000000001',
  'd0300000-0000-4000-8000-000000000001',
  'd0400000-0000-4000-8000-000000000002',
  'active', 'verified', now(), date '2026-07-14',
  'd0000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'schedule_inspection', 6,
    repeat('1',64), repeat('2',64), 'phase5-inspection-past',
    jsonb_build_object('scheduledFor', now() - interval '1 hour')
  )$$,
  '22023', 'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
  'inspection schedule rejects a historical server time'
);
select is((select response_payload ->> 'status' from public.perform_government_complaint_action(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 'schedule_inspection', 6,
  repeat('3',64), repeat('4',64), 'phase5-inspection-schedule',
  jsonb_build_object('scheduledFor', now() + interval '1 day')
)), 'inspection_scheduled', 'inspection scheduling applies its transition');
select ok((select
  not ('transfer' = any(allowed_actions))
  and not ('update_status' = any(allowed_actions))
  and cardinality(allowed_status_transitions) = 0
from public.get_government_complaint(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', null
)), 'detail suppresses status exits while a scheduled inspection is open');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'transfer', 7,
    repeat('13579bdf',8), repeat('fdb97531',8), 'phase5-inspection-transfer-blocked',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000004","reason":"operational_transfer"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'transfer cannot strand a scheduled inspection'
);
update phase5_evidence_fixture set inspection_id = (
  select id from complaints.complaint_inspections where status = 'scheduled'
);
select is((select response_payload ->> 'status' from public.perform_government_complaint_action(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 'complete_inspection', 7,
  repeat('6',64), repeat('7',64), 'phase5-inspection-complete',
  jsonb_build_object(
    'inspectionId', (select inspection_id from phase5_evidence_fixture),
    'outcome', 'confirmed', 'summary', 'Issue confirmed on site.'
  )
)), 'inspection_completed', 'exact scheduled inspection completes');

select is((select response_payload ->> 'status' from public.perform_government_complaint_action(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 'add_external_dependency', 8,
  repeat('7',64), repeat('8',64), 'phase5-dependency-add',
  '{"dependencyType":"external_agency","description":"Awaiting agency clearance."}'::jsonb
)), 'waiting_for_external_agency', 'external dependency moves complaint to waiting');
select ok((select
  not ('transfer' = any(allowed_actions))
  and not ('update_status' = any(allowed_actions))
  and cardinality(allowed_status_transitions) = 0
from public.get_government_complaint(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', null
)), 'detail suppresses status exits while an external dependency is active');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'transfer', 9,
    repeat('2468ace0',8), repeat('0eca8642',8), 'phase5-dependency-transfer-blocked',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000004","reason":"operational_transfer"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'transfer cannot strand an active external dependency'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'update_status', 9,
    repeat('02468ace',8), repeat('eca86420',8), 'phase5-dependency-status-blocked',
    '{"status":"escalated"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'manual status change cannot strand an active external dependency'
);
update phase5_evidence_fixture set dependency_id = (
  select id from complaints.complaint_external_dependencies where status = 'active'
);
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'submit_resolution', 9,
    repeat('9',64), repeat('a',64), 'phase5-resolution-blocked',
    jsonb_build_object(
      'completionNote', 'Completed.',
      'resolutionEvidenceIds', jsonb_build_array((select evidence_id from phase5_evidence_fixture)),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 10,
        'provider', 'gps', 'capturedAt', clock_timestamp(),
        'deviceRecordedAt', clock_timestamp(), 'isMockLocation', null
      )
    )
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'waiting dependency state blocks resolution submission'
);
select is((select response_payload ->> 'status' from public.perform_government_complaint_action(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 'resolve_external_dependency', 9,
  repeat('b',64), repeat('c',64), 'phase5-dependency-resolve',
  jsonb_build_object(
    'dependencyId', (select dependency_id from phase5_evidence_fixture),
    'resolutionSummary', 'Agency clearance received.'
  )
)), 'work_in_progress', 'dependency closure returns complaint to work in progress');
select is((select resolution_summary from complaints.complaint_external_dependencies
  where id = (select dependency_id from phase5_evidence_fixture)),
  'Agency clearance received.', 'dependency closure history is retained');

insert into complaints.complaint_resolution_evidence (
  id, complaint_id, assignment_id, uploader_user_id, kind, object_path,
  declared_mime_type, declared_byte_size, client_sha256, observed_mime_type,
  observed_byte_size, verified_sha256, upload_status, upload_expires_at,
  finalized_at
)
select
  'd3600000-0000-4000-8000-000000000001',
  'd3300000-0000-4000-8000-000000000001', assignment.id,
  'd2000000-0000-4000-8000-000000000002', 'photo',
  'd3300000-0000-4000-8000-000000000001/d3600000-0000-4000-8000-000000000001/original',
  'image/jpeg', 512, repeat('1a', 32), 'image/jpeg', 512, repeat('1a', 32),
  'finalized', now() + interval '1 hour', now()
from complaints.complaint_assignments as assignment
where assignment.complaint_id = 'd3300000-0000-4000-8000-000000000001'
  and assignment.version = 2;
select is((
  select evidence_item ->> 'availableForResolution'
  from public.get_government_complaint(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  ) as detail
  cross join lateral jsonb_array_elements(detail.resolution_evidence) as evidence_item
  where evidence_item ->> 'id' = 'd3600000-0000-4000-8000-000000000001'
), 'false', 'evidence from a superseded assignment remains history-only');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'submit_resolution', 10,
    repeat('1abc',16), repeat('cba1',16), 'phase5-old-assignment-evidence-blocked',
    jsonb_build_object(
      'completionNote', 'Completed.',
      'resolutionEvidenceIds', jsonb_build_array(
        'd3600000-0000-4000-8000-000000000001'
      ),
      'completionLocation', jsonb_build_object(
        'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 10,
        'provider', 'gps', 'capturedAt', clock_timestamp(),
        'deviceRecordedAt', clock_timestamp(), 'isMockLocation', null
      )
    )
  )$$,
  '23514', 'RESOLUTION_EVIDENCE_NOT_READY',
  'resolution submission rejects evidence from a superseded assignment'
);

select is((select response_payload ->> 'status' from public.perform_government_complaint_action(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', 'submit_resolution', 10,
  repeat('d',64), repeat('e',64), 'phase5-resolution-submit',
  jsonb_build_object(
    'completionNote', 'Work completed and verified by the field team.',
    'resolutionEvidenceIds', jsonb_build_array((select evidence_id from phase5_evidence_fixture)),
    'publicMessage', 'Resolution evidence has been submitted.',
    'completionLocation', jsonb_build_object(
      'longitude', 73.84, 'latitude', 18.54, 'accuracyMeters', 10,
      'provider', 'gps', 'capturedAt', clock_timestamp(),
      'deviceRecordedAt', clock_timestamp(), 'isMockLocation', null
    )
  )
)), 'citizen_verification_pending',
  'finalized evidence is mandatory and linked before citizen verification');
select is((select count(*)::integer from complaints.complaint_resolutions), 1);
select is((select count(*)::integer from complaints.complaint_resolution_evidence_links), 1);
select is((
  select evidence_item ->> 'availableForResolution'
  from public.get_government_complaint(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', null
  ) as detail
  cross join lateral jsonb_array_elements(detail.resolution_evidence) as evidence_item
  where evidence_item ->> 'id' = (select evidence_id::text from phase5_evidence_fixture)
), 'false', 'linked evidence remains in history but is not selectable for another resolution');
select throws_ok(
  $$select * from public.perform_government_complaint_action(
    'd2000000-0000-4000-8000-000000000002',
    'd3300000-0000-4000-8000-000000000001', 'assign', 11,
    repeat('e',64), repeat('f',64), 'phase5-terminal-assign-denied',
    '{"officerAssignmentId":"d0900000-0000-4000-8000-000000000001","reason":"workload_balance"}'::jsonb
  )$$,
  '23514', 'INVALID_STATUS_TRANSITION',
  'terminal resolution state rejects a status-preserving reassignment'
);
select is((select count(*)::integer from complaints.notification_outbox), 9,
  'outbox retains the submission, status transitions, and assignment changes');
select ok(not ((select payload from complaints.notification_outbox limit 1)
  ?| array['latitude','longitude','description','citizenUserId']),
  'outbox payload contains no location, description, or citizen identifier');
select is((select count(*)::integer from complaints.government_action_audit_events), 10,
  'every successful action is audited once');
select is((select count(*)::integer from public.get_government_complaint(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', null
)), 1, 'authorized detail remains available after resolution submission');
select ok((select routing_summary ? 'explanationCode' from public.get_government_complaint(
  'd2000000-0000-4000-8000-000000000002',
  'd3300000-0000-4000-8000-000000000001', null
)), 'detail exposes a privacy-safe routing explanation summary');

update governance.wards
set status = 'inactive', is_routing_eligible = false
where id = 'd0400000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'authority operator can recover a complaint after child governance retirement');
select is((select count(*)::integer from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000005', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 1, 'global platform administrator retains retired-scope remediation access');
select ok((select
  current_assignment ->> 'officerAssignmentId' is null
  and (queue_flags ->> 'isUnassigned')::boolean
from public.list_government_complaints(
  'd2000000-0000-4000-8000-000000000002', 25, null, null, null, null,
  null, null, null, null, null, null, null, null
)), 'retired child scope is visible but no longer presents a verified current recipient');

select throws_ok(
  $$update complaints.complaints
    set current_status = 'closed', workflow_version = workflow_version + 1$$,
  '55000', 'complaints.complaints records are append-only.',
  'direct workflow mutation remains denied'
);
select throws_ok(
  $$delete from complaints.complaint_resolution_evidence_links$$,
  '55000', 'complaints.complaint_resolution_evidence_links records are append-only.',
  'resolution evidence membership is immutable'
);

select * from finish();
rollback;
