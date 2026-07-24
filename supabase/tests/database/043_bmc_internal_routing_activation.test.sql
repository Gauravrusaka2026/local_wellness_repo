begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(20);

select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where code in (
      'garbage_dump', 'missed_sweeping', 'pothole', 'blocked_drain',
      'sewage_overflow', 'water_leakage', 'broken_streetlight', 'open_manhole',
      'mosquito_breeding', 'illegal_construction', 'encroachment', 'fallen_tree'
    )
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
      and not requires_asset
  ),
  12,
  'all 12 owner-approved V1 BMC categories are operational'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    where rule.rule_code like 'V1_WARD_%'
      and rule.status = 'active'
      and rule.is_routing_eligible
      and version.status = 'active'
      and version.is_routing_eligible
  ),
  13,
  '13 auditable V1 ward-facade rules are active and routing eligible'
);

select is(
  (
    select count(*)::integer
    from routing.confidence_policies as policy
    inner join routing.confidence_policy_versions as version
      on version.confidence_policy_id = policy.id
    where policy.code = 'bmc_internal_demo_ward_routing'
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and version.version = 1
      and version.category_id is null
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
      and version.automatic_threshold = 0.8
      and version.manual_review_threshold = 0.5
      and version.ambiguity_delta = 0.05
      and version.fallback_penalty_per_level = 0.1
      and jsonb_array_length(version.factors) = 4
  ),
  1,
  'one reviewed internal-demo confidence policy is active'
);

select is(
  (
    select count(*)::integer
    from routing.duplicate_detection_policies as policy
    inner join routing.duplicate_detection_policy_versions as version
      on version.duplicate_detection_policy_id = policy.id
    inner join routing.issue_categories as category on category.id = version.category_id
    where policy.code like 'bmc_internal_demo_%'
      and category.code in ('garbage_dump', 'missed_sweeping', 'mosquito_breeding')
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and version.version = 1
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
      and version.maximum_distance_meters = 50
      and version.maximum_age_seconds = 604800
      and version.minimum_score = 0.65
      and version.maximum_results = 20
      and version.weights = '{"category":3,"location":3,"time":1,"description":2,"media":1,"asset":0}'::jsonb
  ),
  3,
  'each operational category has one bounded duplicate-detection policy'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules
    where rule_code like 'BMC_INTERNAL_%'
  ),
  66,
  '66 stable BMC internal route identities are present'
);

select is(
  (
    select count(*)::integer
    from routing.route_rule_versions as version
    inner join routing.route_rules as rule on rule.id = version.route_rule_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and version.version = 1
  ),
  66,
  'every BMC internal route has exactly one immutable version'
);

select is(
  (
    select count(distinct version.scope_ward_id)::integer
    from routing.route_rule_versions as version
    inner join routing.route_rules as rule on rule.id = version.route_rule_id
    where rule.rule_code like 'BMC_INTERNAL_%'
  ),
  22,
  'BMC internal routes cover exactly 22 operational wards'
);

select ok(
  not exists (
    select 1
    from routing.route_rule_versions as version
    inner join routing.route_rules as rule on rule.id = version.route_rule_id
    inner join governance.wards as ward on ward.id = version.scope_ward_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and ward.ward_number in ('K/S', 'K/N', 'P/E', 'P/W', 'K/E', 'P/N')
  ),
  'split-child wards and legacy boundary anchors have no executable routes'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    inner join governance.complaint_routing_references as source_reference
      on source_reference.id = version.source_routing_reference_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and rule.status = 'active'
      and rule.verification_status = 'verified'
      and not rule.is_placeholder
      and rule.is_routing_eligible
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
      and version.scope_authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and version.scope_local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and version.target_authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and version.target_department_id = source_reference.primary_department_id
      and version.target_officer_role_id = source_reference.first_recipient_role_id
  ),
  66,
  'all routes use the BMC authority and their reviewed department-role reference'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    inner join governance.complaint_routing_references as source_reference
      on source_reference.id = version.source_routing_reference_id
    inner join routing.issue_categories as category on category.id = rule.category_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and (
        (category.code = 'garbage_dump' and source_reference.rule_code = 'BMC_R001')
        or (category.code = 'missed_sweeping' and source_reference.rule_code = 'BMC_R002')
        or (category.code = 'mosquito_breeding' and source_reference.rule_code = 'BMC_R009')
      )
  ),
  66,
  'all route versions preserve the category-specific BMC source reference'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    inner join routing.confidence_policy_versions as policy_version
      on policy_version.id = version.confidence_policy_version_id
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and policy.code = 'bmc_internal_demo_ward_routing'
      and version.asset_requirement = 'none'
      and not version.requires_asset_owner
      and version.asset_type_id is null
      and version.asset_id is null
      and version.fallback_depth = 0
      and version.fallback_path = '{}'::uuid[]
      and version.confidence_factor_codes = array[
        'jurisdiction', 'category', 'department', 'role'
      ]::text[]
  ),
  66,
  'asset-independent routes use one confidence policy and no invented fallback chain'
);

select is(
  (
    select count(*)::integer
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    inner join governance.wards as ward on ward.id = version.scope_ward_id
    inner join governance.offices as office on office.id = version.target_office_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and version.target_officer_role_id = '3dd57bed-bea9-575a-b933-8ff97eea66c3'
      and office.authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and office.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and office.ward_id = ward.id
      and office.status = 'active'
      and office.verification_status = 'verified'
      and not office.is_placeholder
      and office.is_routing_eligible
  ),
  66,
  'every route targets the durable Ward Assistant Commissioner role and matching ward office'
);

select is(
  (
    select count(*)::integer
    from (
      select rule.category_id, version.scope_ward_id
      from routing.route_rules as rule
      inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
      where rule.rule_code like 'BMC_INTERNAL_%'
      group by rule.category_id, version.scope_ward_id
      having count(*) = 1
    ) as unique_route
  ),
  66,
  'each operational category and ward pair has exactly one route'
);

select is(
  (
    select count(*)::integer
    from routing.route_rule_versions as version
    inner join routing.route_rules as rule on rule.id = version.route_rule_id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and version.routing_notes =
        'Internal Local Wellness queue target only; this rule does not send email, phone, portal, or other external BMC delivery.'
  ),
  66,
  'every route explicitly records its internal-queue-only delivery boundary'
);

with routing_cases as (
  select
    category.id as category_id,
    ward.id as ward_id,
    extensions.st_pointonsurface(boundary.boundary) as location
  from routing.issue_categories as category
  cross join governance.wards as ward
  inner join governance.ward_boundary_crosswalk_versions as crosswalk
    on crosswalk.operational_ward_id = ward.id
    and crosswalk.status = 'active'
    and crosswalk.is_routing_eligible
    and crosswalk.auto_route_allowed
    and crosswalk.relationship_type = 'one_to_one'
    and crosswalk.effective_to is null
  inner join governance.jurisdiction_boundary_versions as boundary
    on boundary.id = crosswalk.official_boundary_version_id
  where category.code in ('garbage_dump', 'missed_sweeping', 'mosquito_breeding')
    and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
), resolved as (
  select routing_case.category_id, routing_case.ward_id, candidate.*
  from routing_cases as routing_case
  cross join lateral public.resolve_routing_candidates(
    extensions.st_x(routing_case.location),
    extensions.st_y(routing_case.location),
    5,
    routing_case.category_id,
    null,
    timestamptz '2026-07-17 00:00:00+00'
  ) as candidate
  where candidate.ward_id = routing_case.ward_id
)
select is(
  (select count(*)::integer from resolved),
  66,
  'point-on-surface resolution returns one candidate for every operational ward-category pair'
);

with routing_cases as (
  select
    category.id as category_id,
    ward.id as ward_id,
    extensions.st_pointonsurface(boundary.boundary) as location
  from routing.issue_categories as category
  cross join governance.wards as ward
  inner join governance.ward_boundary_crosswalk_versions as crosswalk
    on crosswalk.operational_ward_id = ward.id
    and crosswalk.status = 'active'
    and crosswalk.is_routing_eligible
    and crosswalk.auto_route_allowed
    and crosswalk.relationship_type = 'one_to_one'
    and crosswalk.effective_to is null
  inner join governance.jurisdiction_boundary_versions as boundary
    on boundary.id = crosswalk.official_boundary_version_id
  where category.code in ('garbage_dump', 'missed_sweeping', 'mosquito_breeding')
    and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
), resolved as (
  select routing_case.category_id, routing_case.ward_id, candidate.*
  from routing_cases as routing_case
  cross join lateral public.resolve_routing_candidates(
    extensions.st_x(routing_case.location),
    extensions.st_y(routing_case.location),
    5,
    routing_case.category_id,
    null,
    timestamptz '2026-07-17 00:00:00+00'
  ) as candidate
  where candidate.ward_id = routing_case.ward_id
)
select is(
  (
    select count(*)::integer
    from resolved
    where target_authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and officer_role_id = '3dd57bed-bea9-575a-b933-8ff97eea66c3'
      and routing_rule_code like 'BMC_INTERNAL_%'
      and fallback_depth = 0
      and officer_assignment_id is not null
  ),
  66,
  'resolved candidates retain the reviewed BMC authority, role, route, and incumbent assignment'
);

with split_cases as (
  select
    category.id as category_id,
    extensions.st_pointonsurface(boundary.boundary) as location
  from routing.issue_categories as category
  cross join governance.wards as ward
  inner join governance.ward_boundary_crosswalk_versions as crosswalk
    on crosswalk.operational_ward_id = ward.id
    and crosswalk.relationship_type = 'one_to_many_child'
    and crosswalk.effective_to is null
  inner join governance.jurisdiction_boundary_versions as boundary
    on boundary.id = crosswalk.official_boundary_version_id
  where category.code in ('garbage_dump', 'missed_sweeping', 'mosquito_breeding')
    and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
), resolved as (
  select candidate.candidate_id
  from split_cases as split_case
  cross join lateral public.resolve_routing_candidates(
    extensions.st_x(split_case.location),
    extensions.st_y(split_case.location),
    5,
    split_case.category_id,
    null,
    timestamptz '2026-07-17 00:00:00+00'
  ) as candidate
)
select is(
  (select count(*)::integer from resolved),
  0,
  'split-boundary points remain fail-closed for all operational categories'
);

select is(
  (
    select count(*)::integer
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and contact.is_active
  ),
  338,
  'the compact V1 contact matrix remains active alongside internal routing'
);

select ok(
  exists (
    select 1
    from governance.import_batches
    where dataset_key = 'bmc_demo_governance'
      and dataset_version = 'MUMBAI_BMC_DEMO_BOOTSTRAP_DATA_v1'
      and status = 'imported'
      and generated_seed_sha256 ~ '^[0-9a-f]{64}$'
      and validation_summary ->> 'externalDeliveryApproved' = 'false'
      and not (validation_summary ? 'internalRoutingSeedSha256')
  ),
  'the completed governance import audit stays immutable and continues to deny external delivery'
);

select is(
  (select count(*)::integer from public.report_routing_confidence_policy_conflicts()),
  0,
  'the BMC ward routes introduce no confidence-policy conflicts'
);

select * from finish();
rollback;
