begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(35);

select has_function(
  'complaints',
  'complaint_routing_evidence_mismatches',
  array['uuid', 'uuid', 'uuid'],
  'the exact routing-evidence mismatch classifier exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'service_role',
    'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)',
    'execute'
  ),
  'the mismatch classifier remains internal to the security-definer submission boundary'
);

select has_function(
  'complaints',
  'complete_complaint_submission_v2',
  array['uuid', 'uuid', 'uuid', 'uuid[]', 'boolean'],
  'the canonical forward-repair complaint completion implementation exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)',
    'execute'
  )
  and not has_function_privilege(
    'service_role',
    'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)',
    'execute'
  ),
  'only the public security-definer wrapper may invoke the canonical completion implementation'
);

select ok(
  (
    select pg_catalog.pg_get_functiondef(procedure.oid)
      like '%complaints.complete_complaint_submission_v2(%'
    from pg_catalog.pg_proc as procedure
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'submit_complaint'
      and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
        = 'p_actor_user_id uuid, p_submission_request_id uuid, p_routing_decision_id uuid, p_acknowledged_duplicate_suggestion_ids uuid[], p_emergency_disclaimer_acknowledged boolean'
  ),
  'the public submission wrapper delegates to the canonical forward-repair implementation'
);

create temporary table bmc_submission_fixture (
  actor_user_id uuid not null,
  category_id uuid not null,
  ward_id uuid not null,
  longitude double precision not null,
  latitude double precision not null,
  captured_at timestamptz not null,
  resolved_at timestamptz not null,
  draft_id uuid,
  location_id uuid,
  media_location_id uuid,
  media_id uuid,
  duplicate_policy_version_id uuid,
  duplicate_check_run_id uuid,
  submission_request_id uuid,
  routing_request_id text,
  routing_decision_id uuid,
  complaint_id uuid,
  assignment_id uuid
) on commit drop;

insert into bmc_submission_fixture (
  actor_user_id,
  category_id,
  ward_id,
  longitude,
  latitude,
  captured_at,
  resolved_at
)
select
  'e4500000-0000-4000-8000-000000000001',
  category.id,
  ward.id,
  extensions.st_x(extensions.st_pointonsurface(boundary.boundary)),
  extensions.st_y(extensions.st_pointonsurface(boundary.boundary)),
  current_timestamp,
  current_timestamp
from routing.issue_categories as category
cross join governance.wards as ward
inner join governance.ward_boundary_crosswalk_versions as crosswalk
  on crosswalk.operational_ward_id = ward.id
  and crosswalk.status = 'active'
  and crosswalk.verification_status = 'verified'
  and not crosswalk.is_placeholder
  and crosswalk.is_routing_eligible
  and crosswalk.auto_route_allowed
  and crosswalk.relationship_type = 'one_to_one'
  and crosswalk.effective_to is null
inner join governance.jurisdiction_boundary_versions as boundary
  on boundary.id = crosswalk.official_boundary_version_id
where category.code = 'garbage_dump'
  and category.status = 'active'
  and category.verification_status = 'verified'
  and not category.is_placeholder
  and category.is_routing_eligible
  and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
  and ward.ward_number = 'A';

select is(
  (select count(*)::integer from bmc_submission_fixture),
  1,
  'one reviewed BMC A Ward garbage-dump fixture is available'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'e4500000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'bmc-submission-integration@example.test',
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp
);

update bmc_submission_fixture as fixture
set draft_id = (
  select created.draft_id
  from public.create_complaint_draft(
    fixture.actor_user_id,
    repeat('1', 64),
    repeat('2', 64),
    fixture.category_id,
    null,
    'Garbage is accumulating beside the public footpath.',
    'en',
    '{"waste_type":"mixed_public_waste"}'::jsonb
  ) as created
);

select ok(
  exists (
    select 1
    from complaints.complaint_drafts as draft
    inner join bmc_submission_fixture as fixture on fixture.draft_id = draft.id
    where draft.citizen_user_id = fixture.actor_user_id
      and draft.category_id = fixture.category_id
      and draft.status = 'active'
      and draft.custom_attributes ->> 'waste_type' = 'mixed_public_waste'
  ),
  'the citizen owns an active BMC-category draft with its required attribute'
);

update bmc_submission_fixture as fixture
set location_id = public.append_complaint_location_evidence(
  fixture.actor_user_id,
  fixture.draft_id,
  null,
  'current_location',
  fixture.longitude,
  fixture.latitude,
  5,
  'gps',
  fixture.captured_at,
  fixture.captured_at,
  false,
  '{"testFixture":"bmc_a_ward"}'::jsonb
);

select ok(
  exists (
    select 1
    from complaints.complaint_location_evidence as evidence
    inner join bmc_submission_fixture as fixture on fixture.location_id = evidence.id
    where evidence.actor_user_id = fixture.actor_user_id
      and evidence.evidence_type = 'current_location'
      and evidence.provider = 'gps'
      and evidence.accuracy_meters = 5
      and evidence.verification_status = 'verified'
      and evidence.spoof_risk_status = 'low'
      and not evidence.mock_location_detected
      and (evidence.verification_metadata ->> 'jurisdictionMatchCount')::integer = 1
  ),
  'fresh 5 metre GPS evidence is database-verified in one jurisdiction'
);

select lives_ok(
  $$
    select *
    from public.update_complaint_draft(
      'e4500000-0000-4000-8000-000000000001',
      (select draft_id from bmc_submission_fixture),
      1,
      (select category_id from bmc_submission_fixture),
      null,
      'Garbage is accumulating beside the public footpath.',
      'en',
      '{"waste_type":"mixed_public_waste"}'::jsonb,
      (select location_id from bmc_submission_fixture)
    )
  $$,
  'the verified GPS evidence becomes the selected complaint location'
);

select is(
  (
    select draft.selected_location_evidence_id
    from complaints.complaint_drafts as draft
    inner join bmc_submission_fixture as fixture on fixture.draft_id = draft.id
  ),
  (select location_id from bmc_submission_fixture),
  'the draft retains the selected verified location identifier'
);

update bmc_submission_fixture as fixture
set media_location_id = public.append_complaint_location_evidence(
  fixture.actor_user_id,
  fixture.draft_id,
  null,
  'media_capture',
  fixture.longitude,
  fixture.latitude,
  5,
  'gps',
  fixture.captured_at,
  fixture.captured_at,
  false,
  '{"testFixture":"bmc_a_ward_photo"}'::jsonb
);

select ok(
  exists (
    select 1
    from complaints.complaint_location_evidence as media_location
    inner join complaints.complaint_location_evidence as issue_location
      on issue_location.id = (select location_id from bmc_submission_fixture)
    inner join bmc_submission_fixture as fixture
      on fixture.media_location_id = media_location.id
    where media_location.evidence_type = 'media_capture'
      and media_location.provider = 'gps'
      and media_location.verification_status = 'verified'
      and extensions.st_distance(
        media_location.location::extensions.geography,
        issue_location.location::extensions.geography
      ) <= 0.1
  ),
  'the photo capture has independently verified GPS evidence at the issue location'
);

update bmc_submission_fixture as fixture
set media_id = (
  select reserved.media_id
  from public.reserve_complaint_media(
    fixture.actor_user_id,
    fixture.draft_id,
    'e4500000-0000-4000-8000-000000000002',
    'photo',
    'live_camera',
    'image/jpeg',
    2048,
    repeat('a', 64),
    1280,
    960,
    null,
    fixture.media_location_id,
    fixture.captured_at
  ) as reserved
);

select is(
  (
    select upload_status
    from public.finalize_complaint_media(
      'e4500000-0000-4000-8000-000000000001',
      (select media_id from bmc_submission_fixture),
      'image/jpeg',
      2048,
      repeat('a', 64)
    )
  ),
  'finalized',
  'the private complaint photo is finalized against verified object metadata'
);

select ok(
  exists (
    select 1
    from complaints.complaint_media as media
    inner join bmc_submission_fixture as fixture on fixture.media_id = media.id
    where media.draft_id = fixture.draft_id
      and media.uploader_user_id = fixture.actor_user_id
      and media.capture_location_evidence_id = fixture.media_location_id
      and media.upload_status = 'finalized'
      and media.bucket_id = 'complaint-originals-private'
  ),
  'finalized media stays private and bound to its verified capture location'
);

update bmc_submission_fixture as fixture
set duplicate_policy_version_id = (
  select duplicate.policy_version_id
  from public.find_complaint_duplicate_candidates(
    fixture.actor_user_id,
    fixture.draft_id,
    null,
    fixture.resolved_at
  ) as duplicate
  limit 1
);

select ok(
  exists (
    select 1
    from routing.duplicate_detection_policy_versions as version
    inner join routing.duplicate_detection_policies as policy
      on policy.id = version.duplicate_detection_policy_id
    inner join bmc_submission_fixture as fixture
      on fixture.duplicate_policy_version_id = version.id
    where policy.code = 'bmc_internal_demo_garbage_dump'
      and version.status = 'active'
      and version.verification_status = 'verified'
      and version.is_routing_eligible
  ),
  'duplicate discovery selects the reviewed BMC garbage-dump policy'
);

update bmc_submission_fixture as fixture
set duplicate_check_run_id = public.record_complaint_duplicate_check(
  fixture.actor_user_id,
  fixture.draft_id,
  fixture.duplicate_policy_version_id,
  'bmc-a-ward-empty-duplicate-check',
  repeat('b', 64),
  fixture.resolved_at,
  '[]'::jsonb
);

select is(
  (
    select candidate_count
    from public.get_complaint_duplicate_check(
      'e4500000-0000-4000-8000-000000000001',
      (select duplicate_check_run_id from bmc_submission_fixture)
    )
  ),
  0::smallint,
  'the current empty duplicate result is persisted before submission'
);

with claimed as materialized (
  select result.*
  from bmc_submission_fixture as fixture
  cross join lateral public.claim_complaint_submission(
    fixture.actor_user_id,
    fixture.draft_id,
    repeat('c', 64),
    repeat('d', 64)
  ) as result
)
update bmc_submission_fixture as fixture
set
  submission_request_id = claimed.submission_request_id,
  routing_request_id = claimed.routing_request_id
from claimed;

select ok(
  exists (
    select 1
    from complaints.complaint_submission_requests as request
    inner join bmc_submission_fixture as fixture
      on fixture.submission_request_id = request.id
    where request.actor_user_id = fixture.actor_user_id
      and request.draft_id = fixture.draft_id
      and request.state = 'claimed'
      and request.routing_request_id = fixture.routing_request_id
      and request.routing_request_id ~ '^complaint-submit:[0-9a-f-]{36}$'
  ),
  'submission claim creates the stable routing request ledger entry'
);

create temporary table bmc_submission_candidate on commit drop as
select candidate.*
from bmc_submission_fixture as fixture
cross join lateral public.resolve_routing_candidates(
  fixture.longitude,
  fixture.latitude,
  5,
  fixture.category_id,
  null,
  fixture.resolved_at
) as candidate
where candidate.ward_id = fixture.ward_id
  and candidate.routing_rule_code like 'BMC_INTERNAL_%';

select is(
  (select count(*)::integer from bmc_submission_candidate),
  1,
  'the legacy BMC route family produces exactly one A Ward candidate'
);

select ok(
  exists (
    select 1
    from bmc_submission_candidate as candidate
    where candidate.target_authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and candidate.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and candidate.routing_rule_code = 'BMC_INTERNAL_GARBAGE_DUMP_A'
      and candidate.officer_role_id = '3dd57bed-bea9-575a-b933-8ff97eea66c3'
      and candidate.officer_assignment_id is not null
      and candidate.fallback_depth = 0
  ),
  'the route targets the reviewed BMC A Ward internal queue and incumbent role'
);

update bmc_submission_fixture as fixture
set routing_decision_id = public.record_routing_decision(
  p_actor_user_id => fixture.actor_user_id,
  p_request_id => fixture.routing_request_id,
  p_longitude => fixture.longitude,
  p_latitude => fixture.latitude,
  p_accuracy_meters => 5::double precision,
  p_captured_at => fixture.captured_at,
  p_resolved_at => fixture.resolved_at,
  p_category_id => fixture.category_id,
  p_decision_status => 'routed'::text,
  p_confidence_score => 1::numeric,
  p_state_id => candidate.state_id,
  p_district_id => candidate.district_id,
  p_taluka_id => candidate.taluka_id,
  p_local_body_id => candidate.local_body_id,
  p_ward_id => candidate.ward_id,
  p_state_boundary_version_id => candidate.state_boundary_version_id,
  p_district_boundary_version_id => candidate.district_boundary_version_id,
  p_taluka_boundary_version_id => candidate.taluka_boundary_version_id,
  p_local_body_boundary_version_id => candidate.local_body_boundary_version_id,
  p_ward_boundary_version_id => candidate.ward_boundary_version_id,
  p_target_authority_id => candidate.target_authority_id,
  p_department_id => candidate.department_id,
  p_authority_department_id => candidate.authority_department_id,
  p_officer_role_id => candidate.officer_role_id,
  p_officer_assignment_id => candidate.officer_assignment_id,
  p_route_rule_id => candidate.route_rule_id,
  p_route_rule_version_id => candidate.route_rule_version_id,
  p_confidence_policy_version_id => candidate.confidence_policy_version_id,
  p_fallback_depth => candidate.fallback_depth,
  p_explanation_codes => array['automatic_route_selected']::text[],
  p_explanation_metadata => jsonb_build_object(
    'policyId', candidate.confidence_policy_id,
    'policyVersionId', candidate.confidence_policy_version_id,
    'policyVersion', candidate.confidence_policy_version,
    'requestedAssetId', null,
    'confidenceBand', 'automatic',
    'confidenceFactors', candidate.confidence_weights -> 'factors',
    'jurisdiction', jsonb_build_object(
      'status', 'resolved',
      'reason', 'verified_jurisdiction_match',
      'matches', jsonb_build_array(jsonb_build_object(
        'stateId', candidate.state_id,
        'districtId', candidate.district_id,
        'talukaId', candidate.taluka_id,
        'localBodyId', candidate.local_body_id,
        'wardId', candidate.ward_id,
        'stateBoundaryVersionId', candidate.state_boundary_version_id,
        'districtBoundaryVersionId', candidate.district_boundary_version_id,
        'talukaBoundaryVersionId', candidate.taluka_boundary_version_id,
        'localBodyBoundaryVersionId', candidate.local_body_boundary_version_id,
        'wardBoundaryVersionId', candidate.ward_boundary_version_id
      ))
    ),
    'selectedCandidateId', candidate.candidate_id,
    'selectedRoutingRuleId', candidate.route_rule_id,
    'selectedRoutingRuleVersionId', candidate.route_rule_version_id,
    'fallbackUsed', candidate.fallback_depth > 0,
    'fallbackPath', to_jsonb(candidate.fallback_path),
    'ambiguousCandidateIds', '[]'::jsonb,
    'candidateEvaluations', jsonb_build_array(jsonb_build_object(
      'candidateId', candidate.candidate_id,
      'routingRuleId', candidate.route_rule_id,
      'routingRuleVersionId', candidate.route_rule_version_id,
      'eligible', true,
      'rejectionReasons', '[]'::jsonb
    ))
  ),
  p_ambiguity_count => 0::smallint
)
from bmc_submission_candidate as candidate;

select ok(
  exists (
    select 1
    from routing.routing_decisions as decision
    inner join bmc_submission_fixture as fixture
      on fixture.routing_decision_id = decision.id
    where decision.actor_user_id = fixture.actor_user_id
      and decision.request_id = fixture.routing_request_id
      and decision.decision_status = 'routed'
      and decision.confidence_score = 1
      and decision.category_id = fixture.category_id
      and decision.ward_id = fixture.ward_id
  ),
  'the routed decision is append-only evidence bound to the claim, actor, category, and ward'
);

select ok(
  exists (
    select 1
    from routing.routing_decisions as decision
    inner join bmc_submission_candidate as candidate
      on candidate.route_rule_id = decision.route_rule_id
      and candidate.route_rule_version_id = decision.route_rule_version_id
    inner join bmc_submission_fixture as fixture
      on fixture.routing_decision_id = decision.id
    where decision.target_authority_id = candidate.target_authority_id
      and decision.department_id = candidate.department_id
      and decision.authority_department_id = candidate.authority_department_id
      and decision.officer_role_id = candidate.officer_role_id
      and decision.officer_assignment_id = candidate.officer_assignment_id
      and decision.confidence_policy_version_id = candidate.confidence_policy_version_id
  ),
  'the recorded decision preserves the complete verified BMC candidate target'
);

select is(
  complaints.complaint_routing_evidence_mismatches(
    (select actor_user_id from bmc_submission_fixture),
    (select submission_request_id from bmc_submission_fixture),
    (select routing_decision_id from bmc_submission_fixture)
  ),
  '{}'::text[],
  'the selected GPS evidence exactly matches the recorded BMC routing decision'
);

select throws_ok(
  format(
    $$select * from public.submit_complaint(%L, %L, %L, '{}'::uuid[], false)$$,
    (select actor_user_id from bmc_submission_fixture),
    (select submission_request_id from bmc_submission_fixture),
    'e4500000-0000-4000-8000-000000000099'::uuid
  ),
  '23514',
  'COMPLAINT_ROUTING_DECISION_NOT_FOUND',
  'a missing routing decision fails closed with a granular evidence marker'
);

with submitted as materialized (
  select result.*
  from bmc_submission_fixture as fixture
  cross join lateral public.submit_complaint(
    fixture.actor_user_id,
    fixture.submission_request_id,
    fixture.routing_decision_id,
    '{}'::uuid[],
    false
  ) as result
)
update bmc_submission_fixture as fixture
set
  complaint_id = submitted.complaint_id,
  assignment_id = submitted.assignment_id
from submitted;

select ok(
  (select complaint_id is not null and assignment_id is not null from bmc_submission_fixture),
  'public.submit_complaint returns the complaint and initial assignment receipt'
);

select ok(
  exists (
    select 1
    from complaints.complaints as complaint
    inner join bmc_submission_fixture as fixture on fixture.complaint_id = complaint.id
    where complaint.draft_id = fixture.draft_id
      and complaint.citizen_user_id = fixture.actor_user_id
      and complaint.category_id = fixture.category_id
      and complaint.location_evidence_id = fixture.location_id
      and complaint.routing_decision_id = fixture.routing_decision_id
      and complaint.current_status = 'submitted'
      and complaint.visibility = 'private'
      and complaint.complaint_number ~ '^LW-[0-9]{8}-[0-9]{8,}$'
  ),
  'the submitted complaint preserves its citizen, category, GPS, route, privacy, and receipt'
);

select ok(
  exists (
    select 1
    from complaints.complaint_media as media
    inner join bmc_submission_fixture as fixture on fixture.media_id = media.id
    where media.upload_status = 'finalized'
      and media.distance_to_complaint_meters <= 0.1
  ),
  'submission records the finalized photo distance within the 50 metre guard'
);

select is(
  (
    select count(*)::integer
    from complaints.complaint_assignments as assignment
    inner join bmc_submission_fixture as fixture on fixture.complaint_id = assignment.complaint_id
    where assignment.version = 1
      and assignment.status = 'active'
      and assignment.effective_to is null
      and assignment.assignment_source = 'routing_decision'
  ),
  1,
  'submission creates exactly one active version-one routing assignment'
);

select ok(
  exists (
    select 1
    from complaints.complaint_assignments as assignment
    inner join bmc_submission_fixture as fixture on fixture.assignment_id = assignment.id
    inner join bmc_submission_candidate as candidate
      on candidate.target_authority_id = assignment.authority_id
      and candidate.local_body_id = assignment.local_body_id
      and candidate.ward_id = assignment.ward_id
      and candidate.department_id = assignment.department_id
      and candidate.authority_department_id = assignment.authority_department_id
      and candidate.officer_role_id = assignment.officer_role_id
      and candidate.officer_assignment_id = assignment.officer_assignment_id
    where assignment.complaint_id = fixture.complaint_id
      and assignment.routing_decision_id = fixture.routing_decision_id
  ),
  'the initial assignment exactly matches the recorded BMC routing target'
);

select is(
  (
    select count(*)::integer
    from complaints.complaint_status_history as history
    inner join bmc_submission_fixture as fixture on fixture.complaint_id = history.complaint_id
    where history.sequence = 1
      and history.from_status = 'draft'
      and history.to_status = 'submitted'
      and history.actor_user_id = fixture.actor_user_id
      and history.event_source = 'citizen_submission'
      and history.reason_code = 'COMPLAINT_SUBMITTED'
      and history.request_id = fixture.routing_request_id
  ),
  1,
  'one immutable initial citizen-submission history event is recorded'
);

select ok(
  exists (
    select 1
    from complaints.complaint_drafts as draft
    inner join bmc_submission_fixture as fixture on fixture.draft_id = draft.id
    where draft.status = 'submitted'
      and draft.submitted_at is not null
      and draft.revision = 3
  ),
  'the source draft becomes terminal only after atomic submission'
);

select ok(
  exists (
    select 1
    from complaints.complaint_submission_requests as request
    inner join bmc_submission_fixture as fixture
      on fixture.submission_request_id = request.id
    where request.state = 'completed'
      and request.routing_decision_id = fixture.routing_decision_id
      and request.complaint_id = fixture.complaint_id
      and request.completed_at is not null
      and request.response_payload ->> 'complaintId' = fixture.complaint_id::text
  ),
  'the submission ledger stores its completed route and complaint receipt'
);

select is(
  (
    select count(*)::integer
    from public.get_owned_complaint(
      'e4500000-0000-4000-8000-000000000001',
      (select complaint_id from bmc_submission_fixture)
    )
  ),
  1,
  'the citizen can retrieve the submitted private BMC complaint'
);

select is(
  (
    select replayed
    from public.submit_complaint(
      'e4500000-0000-4000-8000-000000000001',
      (select submission_request_id from bmc_submission_fixture),
      (select routing_decision_id from bmc_submission_fixture),
      '{}'::uuid[],
      false
    )
  ),
  true,
  'an exact public.submit_complaint retry returns the stored receipt'
);

select is(
  (
    select count(*)::integer
    from complaints.complaints as complaint
    inner join bmc_submission_fixture as fixture on fixture.draft_id = complaint.draft_id
  ),
  1,
  'submission replay creates no duplicate complaint'
);

select ok(
  (
    select
      readiness ->> 'governmentQueueStatus' = 'verified_scope'
      and readiness ->> 'externalContactStatus' = 'verified_governing_body_contact'
      and readiness ->> 'contactScope' = 'ward'
      and readiness -> 'approvedChannelTypes' = '["email","phone","whatsapp"]'::jsonb
      and not (readiness ->> 'automaticOutboundDelivery')::boolean
    from complaints.assignment_delivery_readiness(
      (select assignment_id from bmc_submission_fixture)
    ) as readiness
  ),
  'the BMC assignment resolves its compact ward contact without claiming automatic delivery'
);

select ok(
  exists (
    select 1
    from routing.ward_issue_contacts as contact
    inner join bmc_submission_fixture as fixture
      on fixture.ward_id = contact.ward_id
     and fixture.category_id = contact.category_id
    where contact.is_active
      and contact.recipient_email = 'ac.a@mcgm.gov.in'
  ),
  'the successful A Ward submission retains its active category-specific email recipient'
);

select * from finish();
rollback;
