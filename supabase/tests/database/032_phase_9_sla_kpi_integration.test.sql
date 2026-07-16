begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(51);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  '91000000-0000-4000-8000-000000000001',
  'Synthetic Phase 9 fixture',
  'https://example.test/phase-9-fixture',
  'official',
  current_date
);

insert into governance.authorities (
  id, code, name, authority_type, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '91010000-0000-4000-8000-000000000001',
  'PHASE9_TEST_STATE', 'Phase 9 Test State', 'state', 'verified', true,
  current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '91010000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000001',
  'PHASE9_TEST_AUTHORITY', 'Phase 9 Test Authority', 'local_body',
  'verified', true, current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.states (
  id, authority_id, name, iso_code, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '91020000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000001',
  'Phase 9 Test State', 'PNS', 'verified', true,
  current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '91030000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000002',
  '91020000-0000-4000-8000-000000000001',
  'Phase 9 Verified Municipality', 'municipal_corporation', 'verified',
  false, true, current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.wards (
  id, local_body_id, source_ward_code, name, ward_number,
  verification_status, is_placeholder, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    '91040000-0000-4000-8000-000000000001',
    '91030000-0000-4000-8000-000000000001', 'P9-W1',
    'Phase 9 Verified Ward', '1', 'verified', false, true,
    current_date, '91000000-0000-4000-8000-000000000001'
  ),
  (
    '91040000-0000-4000-8000-000000000002',
    '91030000-0000-4000-8000-000000000001', 'P9-PW',
    'Phase 9 Placeholder Ward', 'P', 'placeholder', true, false,
    null, '91000000-0000-4000-8000-000000000001'
  );
insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '91050000-0000-4000-8000-000000000001',
  'phase9_test_department', 'Phase 9 Test Department', 'verified', true,
  current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '91060000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000002',
  '91050000-0000-4000-8000-000000000001', 'verified', true,
  current_date, '91000000-0000-4000-8000-000000000001'
);
insert into governance.officer_roles (
  id, code, name, verification_status, is_placeholder, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    '91070000-0000-4000-8000-000000000001',
    'phase9_test_officer', 'Phase 9 Test Officer', 'verified', false, true,
    current_date, '91000000-0000-4000-8000-000000000001'
  ),
  (
    '91070000-0000-4000-8000-000000000002',
    'phase9_placeholder_officer', 'Phase 9 Placeholder Officer',
    'placeholder', true, false, null,
    '91000000-0000-4000-8000-000000000001'
  );
insert into governance.officers (
  id, full_name, verification_status, is_placeholder, last_verified_on,
  reference_source_id
)
values (
  '91080000-0000-4000-8000-000000000001',
  'Verified Phase Nine Officer', 'verified', false, current_date,
  '91000000-0000-4000-8000-000000000001'
);
insert into governance.officer_assignments (
  id, assignment_key, version, authority_id, officer_role_id, officer_id,
  authority_department_id, local_body_id, ward_id, status, verification_status,
  is_placeholder, effective_from, last_verified_on, reference_source_id
)
values (
  '91090000-0000-4000-8000-000000000001', 'phase9:test:officer:1', 1,
  '91010000-0000-4000-8000-000000000002',
  '91070000-0000-4000-8000-000000000001',
  '91080000-0000-4000-8000-000000000001',
  '91060000-0000-4000-8000-000000000001',
  '91030000-0000-4000-8000-000000000001',
  '91040000-0000-4000-8000-000000000001',
  'active', 'verified', false, timestamptz '2026-01-01 00:00:00+00',
  current_date, '91000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '91100000-0000-4000-8000-000000000001',
  'phase9_test_domain', 'Phase 9 Test Domain', 'active', 'verified', true,
  current_date, '91000000-0000-4000-8000-000000000001'
);
insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_placeholder,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '91110000-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000001',
    'phase9_test_category', 'Phase 9 Test Category', 'active', 'verified',
    false, true, current_date, '91000000-0000-4000-8000-000000000001'
  ),
  (
    '91110000-0000-4000-8000-000000000002',
    '91100000-0000-4000-8000-000000000001',
    'phase9_placeholder_category', 'Phase 9 Placeholder Category',
    'active', 'placeholder', true, false, null,
    '91000000-0000-4000-8000-000000000001'
  );

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'phase9-citizen@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'phase9-operator@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91200000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'phase9-admin@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91200000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'phase9-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );
insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values (
  '91200000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000002', 'phase9-operator@example.test',
  'active', current_timestamp - interval '1 day',
  '91200000-0000-4000-8000-000000000003',
  '91200000-0000-4000-8000-000000000003', current_timestamp - interval '1 day'
);
insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  '91200000-0000-4000-8000-000000000002', role.id,
  '91010000-0000-4000-8000-000000000002', 'authority',
  '91010000-0000-4000-8000-000000000002',
  current_timestamp - interval '1 day', '91200000-0000-4000-8000-000000000003'
from public.roles as role where role.code = 'government_operator';
insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  '91200000-0000-4000-8000-000000000003', role.id,
  null, 'global', null, current_timestamp - interval '1 day',
  '91200000-0000-4000-8000-000000000003'
from public.roles as role where role.code = 'platform_admin';

insert into complaints.sla_calendars (id, authority_id, code, name)
values (
  '91400000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000002',
  'phase9_calendar', 'Phase 9 Calendar'
);
insert into complaints.sla_calendar_versions (
  id, calendar_id, version, timezone_name, effective_from, source_url,
  verification_status
)
values
  (
    '91410000-0000-4000-8000-000000000001',
    '91400000-0000-4000-8000-000000000001', 1, 'Asia/Kolkata',
    timestamptz '2026-01-01 00:00:00+00', 'https://example.test/sla/calendar/v1',
    'source_verified'
  ),
  (
    '91410000-0000-4000-8000-000000000002',
    '91400000-0000-4000-8000-000000000001', 2, 'Asia/Kolkata',
    current_timestamp + interval '2 days', 'https://example.test/sla/calendar/v2',
    'source_verified'
  ),
  (
    '91410000-0000-4000-8000-000000000003',
    '91400000-0000-4000-8000-000000000001', 3, 'Asia/Kolkata',
    current_timestamp + interval '1 day', 'https://example.test/sla/calendar/backward',
    'source_verified'
  );
insert into complaints.sla_calendar_working_periods (
  calendar_version_id, iso_weekday, opens_at, closes_at
)
select version_id, weekday, time '09:00', time '17:00'
from unnest(array[
  '91410000-0000-4000-8000-000000000001'::uuid,
  '91410000-0000-4000-8000-000000000002'::uuid,
  '91410000-0000-4000-8000-000000000003'::uuid
]) as version(version_id)
cross join generate_series(1, 5) as weekday;
insert into complaints.sla_calendar_exceptions (
  calendar_version_id, exception_date, is_working_day, label
)
values (
  '91410000-0000-4000-8000-000000000001', date '2026-07-20', false,
  'Synthetic closed day'
);

select lives_ok(
  $$select public.publish_sla_calendar_version(
    '91200000-0000-4000-8000-000000000003',
    '91410000-0000-4000-8000-000000000001'
  )$$,
  'a platform administrator can publish a verified calendar'
);

insert into complaints.sla_policies (id, authority_id, local_body_id, code, name)
values (
  '91420000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000002',
  '91030000-0000-4000-8000-000000000001',
  'phase9_policy', 'Phase 9 Policy'
);
insert into complaints.sla_policy_versions (
  id, policy_id, calendar_version_id, version,
  acknowledgement_business_minutes, inspection_business_minutes,
  resolution_business_minutes, resolution_completion_status,
  pause_for_external_dependencies, effective_from, source_url, verification_status
)
values
  (
    '91430000-0000-4000-8000-000000000001',
    '91420000-0000-4000-8000-000000000001',
    '91410000-0000-4000-8000-000000000001', 1,
    60, 120, 240, 'resolved', true, timestamptz '2026-01-01 00:00:00+00',
    'https://example.test/sla/policy/v1', 'source_verified'
  ),
  (
    '91430000-0000-4000-8000-000000000002',
    '91420000-0000-4000-8000-000000000001',
    '91410000-0000-4000-8000-000000000002', 2,
    45, 90, 180, 'resolved', true, current_timestamp + interval '2 days',
    'https://example.test/sla/policy/v2', 'source_verified'
  );
select lives_ok(
  $$select public.publish_sla_policy_version(
    '91200000-0000-4000-8000-000000000003',
    '91430000-0000-4000-8000-000000000001'
  )$$,
  'a platform administrator can publish a verified policy'
);

insert into complaints.sla_escalation_rules (id, policy_id, code, name)
values (
  '91440000-0000-4000-8000-000000000001',
  '91420000-0000-4000-8000-000000000001',
  'phase9_resolution_escalation', 'Phase 9 Resolution Escalation'
);
insert into complaints.sla_escalation_rule_versions (
  id, escalation_rule_id, policy_version_id, version, milestone,
  escalation_level, business_minutes_after_target, action_type,
  target_officer_role_id, effective_from, effective_to, source_url,
  verification_status
)
values
  (
    '91450000-0000-4000-8000-000000000001',
    '91440000-0000-4000-8000-000000000001',
    '91430000-0000-4000-8000-000000000001', 1, 'resolution', 1, 0,
    'mark_escalated', '91070000-0000-4000-8000-000000000001',
    timestamptz '2026-01-01 00:00:00+00', null,
    'https://example.test/sla/escalation/v1', 'source_verified'
  ),
  (
    '91450000-0000-4000-8000-000000000002',
    '91440000-0000-4000-8000-000000000001',
    '91430000-0000-4000-8000-000000000001', 2, 'resolution', 1, 30,
    'mark_escalated', '91070000-0000-4000-8000-000000000001',
    current_timestamp + interval '1 day', current_timestamp + interval '2 days',
    'https://example.test/sla/escalation/v2', 'source_verified'
  );
select lives_ok(
  $$select public.publish_sla_escalation_rule_version(
    '91200000-0000-4000-8000-000000000003',
    '91450000-0000-4000-8000-000000000001'
  )$$,
  'a platform administrator can publish a verified escalation rule'
);
select lives_ok(
  $$select public.publish_sla_escalation_rule_version(
    '91200000-0000-4000-8000-000000000003',
    '91450000-0000-4000-8000-000000000002'
  )$$,
  'a forward escalation version atomically supersedes its predecessor'
);
select lives_ok(
  $$select public.publish_sla_calendar_version(
    '91200000-0000-4000-8000-000000000003',
    '91410000-0000-4000-8000-000000000002'
  )$$,
  'a forward calendar version atomically supersedes its predecessor'
);
select lives_ok(
  $$select public.publish_sla_policy_version(
    '91200000-0000-4000-8000-000000000003',
    '91430000-0000-4000-8000-000000000002'
  )$$,
  'a forward policy version atomically supersedes its predecessor'
);

select is(
  (select status from complaints.sla_calendar_versions
    where id = '91410000-0000-4000-8000-000000000001'),
  'superseded',
  'the prior calendar is frozen as superseded'
);
select is(
  (select effective_to from complaints.sla_calendar_versions
    where id = '91410000-0000-4000-8000-000000000001'),
  (select effective_from from complaints.sla_calendar_versions
    where id = '91410000-0000-4000-8000-000000000002'),
  'calendar supersession closes the prior period exactly at the new boundary'
);
select is(
  (select status from complaints.sla_policy_versions
    where id = '91430000-0000-4000-8000-000000000001'),
  'superseded',
  'the prior policy remains frozen but effective until its boundary'
);
select is(
  (select status from complaints.sla_escalation_rule_versions
    where id = '91450000-0000-4000-8000-000000000001'),
  'superseded',
  'the prior escalation rule remains frozen but effective until its boundary'
);
select throws_ok(
  $$select public.publish_sla_calendar_version(
    '91200000-0000-4000-8000-000000000003',
    '91410000-0000-4000-8000-000000000003'
  )$$,
  '55000', 'SLA_CALENDAR_VERSION_OVERLAP',
  'a backward overlapping version cannot displace reviewed history'
);
select throws_ok(
  $$update complaints.sla_policy_versions
    set resolution_business_minutes = 1
    where id = '91430000-0000-4000-8000-000000000001'$$,
  '55000', 'SLA_VERSION_IMMUTABLE',
  'published SLA inputs cannot be rewritten'
);

insert into complaints.sla_policies (id, authority_id, local_body_id, code, name)
values (
  '91420000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000002',
  '91030000-0000-4000-8000-000000000001',
  'phase9_bad_override', 'Phase 9 Bad Override'
);
insert into complaints.sla_policy_versions (
  id, policy_id, calendar_version_id, version,
  acknowledgement_business_minutes, resolution_business_minutes,
  resolution_completion_status, effective_from, effective_to, source_url,
  verification_status
)
values (
  '91430000-0000-4000-8000-000000000003',
  '91420000-0000-4000-8000-000000000002',
  '91410000-0000-4000-8000-000000000001', 1, 60, 240, 'resolved',
  current_timestamp, current_timestamp + interval '1 day',
  'https://example.test/sla/policy/bad-override', 'source_verified'
);
insert into complaints.sla_category_overrides (
  policy_version_id, category_id, resolution_business_minutes
)
values (
  '91430000-0000-4000-8000-000000000003',
  '91110000-0000-4000-8000-000000000002', 10
);
select throws_ok(
  $$select public.publish_sla_policy_version(
    '91200000-0000-4000-8000-000000000003',
    '91430000-0000-4000-8000-000000000003'
  )$$,
  '55000', 'SLA_POLICY_OVERRIDE_INVALID',
  'placeholder category overrides cannot enter reviewed policy data'
);

insert into complaints.sla_escalation_rules (id, policy_id, code, name)
values (
  '91440000-0000-4000-8000-000000000002',
  '91420000-0000-4000-8000-000000000001',
  'phase9_bad_role', 'Phase 9 Bad Role'
);
insert into complaints.sla_escalation_rule_versions (
  id, escalation_rule_id, policy_version_id, version, milestone,
  escalation_level, business_minutes_after_target, action_type,
  target_officer_role_id, effective_from, effective_to, source_url,
  verification_status
)
values (
  '91450000-0000-4000-8000-000000000003',
  '91440000-0000-4000-8000-000000000002',
  '91430000-0000-4000-8000-000000000001', 1, 'resolution', 2, 0,
  'record', '91070000-0000-4000-8000-000000000002',
  current_timestamp, current_timestamp + interval '1 day',
  'https://example.test/sla/escalation/bad-role', 'source_verified'
);
select throws_ok(
  $$select public.publish_sla_escalation_rule_version(
    '91200000-0000-4000-8000-000000000003',
    '91450000-0000-4000-8000-000000000003'
  )$$,
  '55000', 'SLA_ESCALATION_CONFIGURATION_INVALID',
  'a placeholder target role is rejected even for a record-only action'
);
select throws_ok(
  $$select public.publish_sla_calendar_version(
    '91200000-0000-4000-8000-000000000002',
    '91410000-0000-4000-8000-000000000003'
  )$$,
  '42501', 'PLATFORM_ADMIN_REQUIRED',
  'government operators cannot publish reviewed SLA configuration'
);

select is(
  complaints.add_sla_business_minutes(
    '91410000-0000-4000-8000-000000000001',
    timestamptz '2026-07-17 03:30:30+00',
    60
  ),
  timestamptz '2026-07-17 04:30:30+00',
  'calendar arithmetic preserves seconds inside a working period'
);
select is(
  complaints.add_sla_business_minutes(
    '91410000-0000-4000-8000-000000000001',
    timestamptz '2026-07-17 11:00:30+00',
    120
  ),
  timestamptz '2026-07-21 05:00:30+00',
  'calendar arithmetic crosses a weekend and reviewed closed-day exception'
);
select is(
  complaints.sla_business_minutes_between(
    '91410000-0000-4000-8000-000000000001',
    timestamptz '2026-07-17 11:00:30+00',
    timestamptz '2026-07-21 05:00:30+00'
  ),
  120,
  'business-minute measurement floors once after exact cross-period accumulation'
);

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash, creation_request_fingerprint,
  category_id, description, created_at, updated_at, expires_at
)
values
  (
    '91300000-0000-4000-8000-000000000001',
    '91200000-0000-4000-8000-000000000001', repeat('1', 64), repeat('2', 64),
    '91110000-0000-4000-8000-000000000001', 'Phase 9 verified complaint.',
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-08-15 03:30:00+00'
  ),
  (
    '91300000-0000-4000-8000-000000000002',
    '91200000-0000-4000-8000-000000000001', repeat('3', 64), repeat('4', 64),
    '91110000-0000-4000-8000-000000000001', 'Phase 9 placeholder-scope complaint.',
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-08-15 03:30:00+00'
  );
insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, spoof_risk_status,
  verification_status, verification_score, received_at, created_at
)
values
  (
    '91310000-0000-4000-8000-000000000001',
    '91300000-0000-4000-8000-000000000001',
    '91200000-0000-4000-8000-000000000001', 'current_location',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    10, 'gps', timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', 'low', 'verified', 0.99,
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
  ),
  (
    '91310000-0000-4000-8000-000000000002',
    '91300000-0000-4000-8000-000000000002',
    '91200000-0000-4000-8000-000000000001', 'current_location',
    extensions.st_setsrid(extensions.st_makepoint(73.85, 18.55), 4326),
    10, 'gps', timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', 'low', 'verified', 0.99,
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
  );
update complaints.complaint_drafts
set selected_location_evidence_id = case id
      when '91300000-0000-4000-8000-000000000001' then
        '91310000-0000-4000-8000-000000000001'::uuid
      else '91310000-0000-4000-8000-000000000002'::uuid end,
    status = 'submitted', submitted_at = timestamptz '2026-07-16 03:30:00+00'
where id in (
  '91300000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000002'
);

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location, accuracy_meters,
  captured_at, resolved_at, decision_status, explanation_codes
)
values
  (
    '91320000-0000-4000-8000-000000000001',
    '91200000-0000-4000-8000-000000000001', 'phase9-routing-verified',
    '91110000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    10, timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', 'manual_review', array['phase9_fixture']
  ),
  (
    '91320000-0000-4000-8000-000000000002',
    '91200000-0000-4000-8000-000000000001', 'phase9-routing-placeholder',
    '91110000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.85, 18.55), 4326),
    10, timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', 'manual_review', array['phase9_fixture']
  );
set local session_replication_role = origin;

insert into complaints.complaints (
  id, draft_id, complaint_number, citizen_user_id, category_id, description,
  description_language, custom_attributes, location_evidence_id,
  routing_decision_id, submitted_at, created_at, updated_at
)
values
  (
    '91330000-0000-4000-8000-000000000001',
    '91300000-0000-4000-8000-000000000001', 'LW-20260716-99000001',
    '91200000-0000-4000-8000-000000000001',
    '91110000-0000-4000-8000-000000000001', 'Phase 9 verified complaint.',
    'en', '{}'::jsonb, '91310000-0000-4000-8000-000000000001',
    '91320000-0000-4000-8000-000000000001',
    timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
  ),
  (
    '91330000-0000-4000-8000-000000000002',
    '91300000-0000-4000-8000-000000000002', 'LW-20260716-99000002',
    '91200000-0000-4000-8000-000000000001',
    '91110000-0000-4000-8000-000000000001', 'Phase 9 placeholder-scope complaint.',
    'en', '{}'::jsonb, '91310000-0000-4000-8000-000000000002',
    '91320000-0000-4000-8000-000000000002',
    timestamptz '2026-07-16 03:30:00+00',
    timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
  );

insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
  department_id, authority_department_id, officer_role_id, officer_assignment_id,
  assigned_at, effective_from
)
values (
  '91340000-0000-4000-8000-000000000001',
  '91330000-0000-4000-8000-000000000001',
  '91320000-0000-4000-8000-000000000001',
  '91010000-0000-4000-8000-000000000002',
  '91030000-0000-4000-8000-000000000001',
  '91040000-0000-4000-8000-000000000001',
  '91050000-0000-4000-8000-000000000001',
  '91060000-0000-4000-8000-000000000001',
  '91070000-0000-4000-8000-000000000001',
  '91090000-0000-4000-8000-000000000001',
  timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
);

set local session_replication_role = replica;
insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id, ward_id,
  department_id, authority_department_id, officer_role_id,
  assigned_at, effective_from
)
values (
  '91340000-0000-4000-8000-000000000002',
  '91330000-0000-4000-8000-000000000002',
  '91320000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000002',
  '91030000-0000-4000-8000-000000000001',
  '91040000-0000-4000-8000-000000000002',
  '91050000-0000-4000-8000-000000000001',
  '91060000-0000-4000-8000-000000000001',
  '91070000-0000-4000-8000-000000000001',
  timestamptz '2026-07-16 03:30:00+00', timestamptz '2026-07-16 03:30:00+00'
);
set local session_replication_role = origin;

select is(
  (select status from complaints.complaint_sla_bindings
    where complaint_id = '91330000-0000-4000-8000-000000000001'),
  'applied',
  'a still-effective superseded policy binds to a verified assignment'
);
select is(
  (select count(*)::integer from complaints.complaint_sla_clocks
    where complaint_id = '91330000-0000-4000-8000-000000000001'),
  3,
  'binding materializes acknowledgement, inspection, and resolution clocks'
);
select is(
  (select count(*)::integer from complaints.sla_escalation_jobs as job
    inner join complaints.complaint_sla_clocks as clock on clock.id = job.clock_id
    where clock.complaint_id = '91330000-0000-4000-8000-000000000001'),
  1,
  'only the effective reviewed escalation rule creates a leased job'
);

create temporary table phase9_no_binding as
select payload from public.get_government_complaint_sla(
  '91200000-0000-4000-8000-000000000002',
  '91330000-0000-4000-8000-000000000002',
  null
);
select is(
  (select (payload ->> 'policyApplied')::boolean from phase9_no_binding),
  false,
  'SLA detail returns policyApplied=false when no binding exists'
);
select is(
  (select payload ->> 'unavailableReason' from phase9_no_binding),
  'not_materialized',
  'SLA detail identifies a missing historical binding without returning null semantics'
);
select lives_ok(
  $$select complaints.initialize_complaint_sla(
    '91330000-0000-4000-8000-000000000002',
    '91340000-0000-4000-8000-000000000002',
    timestamptz '2026-07-16 03:30:00+00', 1
  )$$,
  'an unverified assignment is evaluated without creating operational clocks'
);
select is(
  (select reason_code from complaints.complaint_sla_bindings
    where complaint_id = '91330000-0000-4000-8000-000000000002'),
  'unverified_assignment_scope',
  'placeholder governance scope fails closed with explicit provenance'
);

insert into complaints.complaint_external_dependencies (
  id, complaint_id, assignment_id, added_by_user_id, dependency_type,
  description, status, created_at, updated_at
)
values (
  '91350000-0000-4000-8000-000000000001',
  '91330000-0000-4000-8000-000000000001',
  '91340000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000002', 'external_agency',
  'Synthetic dependency.', 'active',
  timestamptz '2026-07-16 04:00:00+00', timestamptz '2026-07-16 04:00:00+00'
);
select is(
  (select count(*)::integer from complaints.complaint_sla_clocks
    where complaint_id = '91330000-0000-4000-8000-000000000001'
      and state = 'paused'),
  3,
  'an active external dependency pauses every configured clock'
);
insert into complaints.complaint_status_history (
  complaint_id, sequence, from_status, to_status, actor_user_id,
  event_source, reason_code, public_message, occurred_at
)
values (
  '91330000-0000-4000-8000-000000000001', 1, 'submitted', 'acknowledged',
  '91200000-0000-4000-8000-000000000002', 'government_action',
  'COMPLAINT_ACKNOWLEDGED', 'Complaint acknowledged.',
  timestamptz '2026-07-16 05:00:00+00'
);
select is(
  (select state from complaints.complaint_sla_clocks
    where complaint_id = '91330000-0000-4000-8000-000000000001'
      and milestone = 'acknowledgement'),
  'met',
  'a completion event closes a paused clock before classifying compliance'
);
select is(
  (select paused_business_minutes from complaints.complaint_sla_pause_intervals as pause
    inner join complaints.complaint_sla_clocks as clock on clock.id = pause.clock_id
    where clock.complaint_id = '91330000-0000-4000-8000-000000000001'
      and clock.milestone = 'acknowledgement'),
  60,
  'paused completion records the exact reviewed business-minute credit'
);
select is(
  (select count(*)::integer from complaints.complaint_sla_deadline_history as history
    inner join complaints.complaint_sla_clocks as clock on clock.id = history.clock_id
    where clock.complaint_id = '91330000-0000-4000-8000-000000000001'
      and clock.milestone = 'acknowledgement'),
  2,
  'pause credit appends deadline evidence instead of rewriting initial evidence'
);

select lives_ok(
  $$select complaints.resume_sla_clock(
    (select id from complaints.complaint_sla_clocks
      where complaint_id = '91330000-0000-4000-8000-000000000001'
        and milestone = 'resolution'),
    timestamptz '2026-07-16 05:30:00+00'
  )$$,
  'resolution can safely resume through the common pause-closing path'
);
update complaints.complaint_sla_clocks
set target_at = current_timestamp - interval '10 minutes', state = 'active',
  paused_at = null, updated_at = current_timestamp
where complaint_id = '91330000-0000-4000-8000-000000000001'
  and milestone = 'resolution';
update complaints.sla_escalation_jobs as job
set due_at = current_timestamp - interval '5 minutes',
  next_attempt_at = current_timestamp - interval '5 minutes',
  updated_at = current_timestamp
from complaints.complaint_sla_clocks as clock
where job.clock_id = clock.id
  and clock.complaint_id = '91330000-0000-4000-8000-000000000001'
  and clock.milestone = 'resolution';

create temporary table phase9_sla_claim_one as
select * from public.claim_sla_escalation_jobs('phase9.worker', 10, 60);
select is(
  (select count(*)::integer from phase9_sla_claim_one),
  1,
  'the due SLA job is claimed with a private lease token'
);
select is(
  (
    select result.status
    from phase9_sla_claim_one as claim
    cross join lateral public.fail_sla_escalation_job(
      claim.job_id, claim.lease_token, 'SLA_ESCALATION_EXECUTION_FAILED'
    ) as result
  ),
  'retry_scheduled',
  'the worker failure code schedules a bounded retry'
);
update complaints.sla_escalation_jobs
set next_attempt_at = current_timestamp - interval '1 second'
where id = (select job_id from phase9_sla_claim_one);
create temporary table phase9_sla_claim_two as
select * from public.claim_sla_escalation_jobs('phase9.worker', 10, 60);
select ok(
  (select lease_token from phase9_sla_claim_two)
    is distinct from (select lease_token from phase9_sla_claim_one),
  'a retry receives a fresh lease capability'
);
create temporary table phase9_sla_execution as
select result.*
from phase9_sla_claim_two as claim
cross join lateral public.execute_sla_escalation_job(
  claim.job_id, claim.lease_token
) as result;
select is(
  (select outcome from phase9_sla_execution),
  'escalated',
  'a due reviewed rule performs its data-driven escalation action'
);
select is(
  (select current_status from complaints.complaints
    where id = '91330000-0000-4000-8000-000000000001'),
  'escalated',
  'the authorized SLA job advances complaint workflow state'
);
select is(
  (select count(*)::integer from complaints.complaint_sla_escalation_events
    where complaint_id = '91330000-0000-4000-8000-000000000001'),
  1,
  'automatic escalation evidence is append-only and unique per job'
);
select is(
  (select count(*)::integer from complaints.notification_outbox as outbox
    inner join complaints.complaint_status_history as history
      on history.id = outbox.status_history_id
    where history.complaint_id = '91330000-0000-4000-8000-000000000001'
      and history.reason_code = 'SLA_OVERDUE_ESCALATION'),
  1,
  'escalation evidence and its notification outbox record commit atomically'
);
select ok(not exists (
  select 1
  from complaints.notification_outbox as outbox
  inner join complaints.complaint_status_history as history
    on history.id = outbox.status_history_id
  where history.reason_code = 'SLA_OVERDUE_ESCALATION'
    and outbox.payload ?| array[
      'description', 'exactLocation', 'latitude', 'longitude', 'citizenUserId',
      'phone', 'email', 'objectPath', 'signedUrl', 'token', 'leaseToken'
    ]
), 'automatic escalation notification payload is data-minimized');
create temporary table phase9_sla_replay as
select result.*
from phase9_sla_claim_two as claim
cross join lateral public.execute_sla_escalation_job(
  claim.job_id, claim.lease_token
) as result;
select is(
  (select replayed from phase9_sla_replay),
  true,
  'completed escalation execution replays without duplicate evidence'
);

insert into complaints.resolution_policies (id, code, name, authority_id, category_id)
values (
  '91500000-0000-4000-8000-000000000001',
  'phase9_resolution_policy', 'Phase 9 Resolution Policy',
  '91010000-0000-4000-8000-000000000002',
  '91110000-0000-4000-8000-000000000001'
);
insert into complaints.resolution_policy_versions (
  id, resolution_policy_id, version, status, rating_minimum, rating_maximum,
  ratings_required, feedback_window_seconds, eligible_feedback_statuses,
  reopen_window_seconds, eligible_reopen_statuses, max_reopen_attempts,
  allowed_reopen_reason_codes, repeat_escalation_threshold, effective_from,
  approved_by_user_id, approved_at, created_at
)
values (
  '91510000-0000-4000-8000-000000000001',
  '91500000-0000-4000-8000-000000000001', 1, 'approved', 3, 5, true,
  86400, array['resolved'], 86400, array['resolved'], 3,
  array['issue_persists'], 2, timestamptz '2026-01-03 00:00:00+00',
  '91200000-0000-4000-8000-000000000003',
  timestamptz '2026-01-02 00:00:00+00', timestamptz '2026-01-01 00:00:00+00'
);
insert into complaints.complaint_resolutions (
  id, complaint_id, version, assignment_id, submitted_by_user_id,
  completion_note, created_at
)
values (
  '91520000-0000-4000-8000-000000000001',
  '91330000-0000-4000-8000-000000000001', 1,
  '91340000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000002',
  'Synthetic completed work.', current_timestamp - interval '10 minutes'
);
insert into complaints.citizen_action_requests (
  id, actor_user_id, complaint_id, action_type, idempotency_key_hash,
  request_fingerprint, request_id, expected_workflow_version, state,
  from_status, to_status, response_payload, claimed_at, completed_at
)
values (
  '91530000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000001',
  '91330000-0000-4000-8000-000000000001', 'submit_feedback',
  repeat('5', 64), repeat('6', 64), 'phase9-feedback', 2, 'completed',
  'escalated', 'escalated', '{}'::jsonb,
  current_timestamp - interval '5 minutes', current_timestamp - interval '5 minutes'
);
insert into complaints.complaint_feedback (
  id, complaint_id, resolution_id, citizen_user_id,
  resolution_policy_version_id, action_request_id, outcome,
  satisfaction_rating, speed_rating, quality_rating, communication_rating,
  created_at
)
values (
  '91540000-0000-4000-8000-000000000001',
  '91330000-0000-4000-8000-000000000001',
  '91520000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000001',
  '91510000-0000-4000-8000-000000000001',
  '91530000-0000-4000-8000-000000000001', 'resolved', 4, 4, 4, 4,
  current_timestamp - interval '5 minutes'
);

set local time zone 'UTC';
create temporary table phase9_kpi_request_utc as
select public.enqueue_kpi_calculation_run(
  '91200000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000002',
  current_timestamp - interval '30 days', current_timestamp, current_timestamp
) as run_id;
set local time zone 'Asia/Kolkata';
create temporary table phase9_kpi_request_ist as
select public.enqueue_kpi_calculation_run(
  '91200000-0000-4000-8000-000000000002',
  '91010000-0000-4000-8000-000000000002',
  current_timestamp - interval '30 days', current_timestamp, current_timestamp
) as run_id;
select is(
  (select run_id from phase9_kpi_request_utc),
  (select run_id from phase9_kpi_request_ist),
  'KPI request fingerprints are canonical across session time zones'
);
select throws_ok(
  $$select public.enqueue_kpi_calculation_run(
    '91200000-0000-4000-8000-000000000002',
    '91010000-0000-4000-8000-000000000002',
    current_timestamp - interval '1 day', current_timestamp,
    current_timestamp + interval '1 minute'
  )$$,
  '22023', 'KPI_RUN_REQUEST_INVALID',
  'manual KPI enqueue rejects a future source cutoff'
);
select throws_ok(
  $$select * from public.schedule_kpi_calculation_runs(
    current_timestamp - interval '1 day', current_timestamp,
    current_timestamp + interval '1 minute'
  )$$,
  '22023', 'KPI_RUN_REQUEST_INVALID',
  'scheduled KPI enqueue rejects a future source cutoff'
);

create temporary table phase9_kpi_claim as
select * from public.claim_kpi_calculation_runs('phase9.kpi.worker', 10, 120);
select is(
  (select count(*)::integer from phase9_kpi_claim),
  1,
  'a canonical pending KPI run is leased once'
);
create temporary table phase9_kpi_materialized as
select result.*
from phase9_kpi_claim as claim
cross join lateral public.materialize_kpi_calculation_run(
  claim.run_id, claim.lease_token
) as result;
select is(
  (select snapshot_count from phase9_kpi_materialized),
  72,
  'eight KPIs materialize for three verified scopes and three segments'
);
select is(
  (
    select snapshot.value
    from complaints.kpi_snapshots as snapshot
    inner join complaints.kpi_definition_versions as definition_version
      on definition_version.id = snapshot.definition_version_id
    inner join complaints.kpi_definitions as definition
      on definition.id = definition_version.definition_id
    where definition.code = 'communication_quality'
      and snapshot.scope_type = 'municipality'
      and snapshot.local_body_id = '91030000-0000-4000-8000-000000000001'
      and snapshot.segment = 'all'
  ),
  50.0000::numeric,
  'communication quality uses the feedback policy 3-to-5 rating scale'
);
select ok(not exists (
  select 1 from complaints.kpi_snapshots
  where ward_id = '91040000-0000-4000-8000-000000000002'
), 'placeholder assignment scopes never create even zero-valued KPI snapshots');
select ok(not exists (
  select 1 from complaints.kpi_snapshots
  where not (exclusions ?& array['sourceCutoffAt', 'algorithmVersion', 'implementationHash'])
), 'every KPI snapshot retains source cutoff and exact implementation identity');
create temporary table phase9_kpi_replay as
select result.*
from phase9_kpi_claim as claim
cross join lateral public.materialize_kpi_calculation_run(
  claim.run_id, claim.lease_token
) as result;
select is(
  (select replayed from phase9_kpi_replay),
  true,
  'completed KPI materialization replays without rewriting snapshots'
);
select throws_ok(
  $$update complaints.kpi_snapshots set value = 0
    where calculation_run_id = (select run_id from phase9_kpi_claim)$$,
  '55000', 'complaints.kpi_snapshots records are append-only.',
  'materialized KPI evidence cannot be rewritten'
);
select ok(
  jsonb_array_length((
    select payload -> 'items'
    from public.list_government_kpi_snapshots(
      '91200000-0000-4000-8000-000000000002',
      '91010000-0000-4000-8000-000000000002', null, null, null, null, null
    )
  )) > 0,
  'authorized government users can read organizational KPI snapshots'
);
select throws_ok(
  $$select * from public.list_government_kpi_snapshots(
    '91200000-0000-4000-8000-000000000004',
    '91010000-0000-4000-8000-000000000002', null, null, null, null, null
  )$$,
  '42501', 'GOVERNMENT_ACCESS_REQUIRED',
  'users without reviewed government scope cannot read KPI snapshots'
);

select * from finish();
rollback;
