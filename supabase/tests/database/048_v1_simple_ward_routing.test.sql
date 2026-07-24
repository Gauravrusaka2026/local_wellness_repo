begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(33);

select has_table(
  'routing',
  'ward_issue_contacts',
  'the private V1 ward/category contact table exists'
);

select has_table(
  'complaints',
  'ward_email_outbox',
  'the private V1 ward email outbox exists'
);

select is(
  (select count(*)::integer from routing.ward_issue_contacts where is_active),
  338,
  'the BMC V1 matrix contains 26 wards by 13 routing profiles'
);

select is(
  (
    select count(distinct contact.ward_id)::integer
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where contact.is_active
      and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
  ),
  26,
  'all 26 configured BMC operational wards have contact rows'
);

select is(
  (select count(distinct category_id)::integer from routing.ward_issue_contacts where is_active),
  13,
  'all 13 V1 routing profiles have ward contacts'
);

select ok(
  not exists (
    select ward_id, category_id
    from routing.ward_issue_contacts
    where is_active
    group by ward_id, category_id
    having count(*) <> 1
  ),
  'each active ward/category pair has exactly one recipient configuration'
);

select ok(
  not exists (
    select 1
    from routing.ward_issue_contacts
    where primary_contact = ''
       or central_fallback = ''
       or whatsapp_contact = ''
       or durable_role = ''
       or recipient_email !~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  'every route has an email, primary phone, fallback, WhatsApp contact and durable role'
);

select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where code = any(array[
      'garbage_dump', 'missed_sweeping', 'pothole', 'blocked_drain',
      'sewage_overflow', 'water_leakage', 'broken_streetlight', 'open_manhole',
      'mosquito_breeding', 'illegal_construction', 'encroachment', 'fallen_tree'
    ]::text[])
      and status = 'active'
      and is_routing_eligible
      and not requires_asset
      and required_attributes = '{}'::text[]
  ),
  12,
  'all V1 categories are active and do not require an asset lookup'
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
      and version.scope_local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and version.scope_ward_id is null
  ),
  13,
  'one auditable BMC ward-facade rule exists per V1 routing profile'
);

select is(
  (
    select distinct recipient_email
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and ward.ward_number = 'K/W'
  ),
  'ac.kw@mcgm.gov.in',
  'K/W routes to the configured ward mailbox'
);

select is(
  (
    select count(distinct recipient_email)::integer
    from routing.ward_issue_contacts
    where is_active
      and email_owner_approved_for_routing
  ),
  26,
  'the immutable ward directory supplies one approved mailbox per operational ward'
);

select ok(
  not exists (
    select 1
    from routing.ward_issue_contacts
    where is_active
      and (
        email_source_url is null
        or email_source_as_of is null
        or email_last_checked_on is null
        or email_source_locator is null
        or email_source_reported_status is null
        or not email_owner_approved_for_routing
      )
  ),
  'every active route retains complete ward-email provenance and explicit staging approval'
);

select ok(
  (
    select constraint_record.convalidated
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'routing.ward_issue_contacts'::regclass
      and constraint_record.conname = 'ward_issue_contacts_active_email_provenance_check'
  ),
  'the active email provenance constraint is validated after seeding'
);

select is(
  (
    select jsonb_object_agg(ward.ward_number, contact.recipient_email)
    from (
      select distinct ward_id, recipient_email
      from routing.ward_issue_contacts
      where is_active
    ) as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and ward.ward_number = any(array['K/S', 'K/N', 'P/E', 'P/W', 'M/E']::text[])
  ),
  '{"K/S":"ac.ke@mcgm.gov.in","K/N":"ac.kn@mcgm.gov.in","P/E":"ac.pe@mcgm.gov.in","P/W":"ac.pn@mcgm.gov.in","M/E":"ac.me@mcgm.gov.in"}'::jsonb,
  'split operational wards and M/E use the email values supplied by the ward directory'
);

select is(
  (
    select count(*)::integer
    from routing.ward_issue_contacts
    where is_active
      and email_source_locator like 'B2_operational_subscopes.csv:%'
  ),
  52,
  'four operational subscopes retain their B2 archive locators across 13 profiles'
);

select is(
  (
    select count(*)::integer
    from routing.ward_issue_contacts
    where is_active
      and email_source_locator like 'E_offices_contacts.csv:%'
  ),
  286,
  'the remaining 22 wards retain their office-contact archive locators'
);

select is(
  (
    select jsonb_object_agg(status_counts.email_source_reported_status, status_counts.row_count)
    from (
      select email_source_reported_status, count(*)::integer as row_count
      from routing.ward_issue_contacts
      where is_active
      group by email_source_reported_status
    ) as status_counts
  ),
  '{"source_verified":208,"conflicting":104,"unverified":26}'::jsonb,
  'raw source statuses remain visible separately from the staging approval override'
);

select ok(
  not exists (
    select 1
    from routing.ward_issue_contacts
    where is_active
      and (
        email_source_url <> 'https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf'
        or email_source_as_of <> '2026-06-18'::date
        or email_last_checked_on <> '2026-07-20'::date
      )
  ),
  'email source URL and source dates are preserved from the supplied archive'
);

select is(
  (
    select count(distinct whatsapp_contact)::integer
    from routing.ward_issue_contacts
    where is_active
  ),
  1,
  'the published BMC WhatsApp contact is consistently retained'
);

select ok(
  (
    select class.relrowsecurity and class.relforcerowsecurity
    from pg_catalog.pg_class as class
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'routing' and class.relname = 'ward_issue_contacts'
  )
  and (
    select class.relrowsecurity and class.relforcerowsecurity
    from pg_catalog.pg_class as class
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'complaints' and class.relname = 'ward_email_outbox'
  ),
  'both V1 contact and delivery tables enforce RLS'
);

select ok(
  not has_table_privilege('anon', 'routing.ward_issue_contacts', 'select')
  and not has_table_privilege('authenticated', 'routing.ward_issue_contacts', 'select')
  and not has_table_privilege('anon', 'complaints.ward_email_outbox', 'select')
  and not has_table_privilege('authenticated', 'complaints.ward_email_outbox', 'select'),
  'citizen roles cannot read recipient contacts or delivery state'
);

select has_function(
  'public',
  'resolve_v1_ward_route',
  array[
    'uuid', 'text', 'uuid', 'double precision', 'double precision',
    'double precision', 'timestamp with time zone', 'timestamp with time zone', 'uuid'
  ],
  'the service-only V1 ward resolver exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.resolve_v1_ward_route(uuid,text,uuid,double precision,double precision,double precision,timestamp with time zone,timestamp with time zone,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.resolve_v1_ward_route(uuid,text,uuid,double precision,double precision,double precision,timestamp with time zone,timestamp with time zone,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.resolve_v1_ward_route(uuid,text,uuid,double precision,double precision,double precision,timestamp with time zone,timestamp with time zone,uuid)',
    'execute'
  ),
  'only the trusted API role can invoke the V1 resolver'
);

create temporary table v1_route_fixture (
  actor_user_id uuid not null,
  category_id uuid not null,
  ward_id uuid not null,
  longitude double precision not null,
  latitude double precision not null,
  captured_at timestamptz not null,
  draft_id uuid,
  location_id uuid,
  routing_decision_id uuid,
  complaint_id uuid,
  assignment_id uuid
) on commit drop;

insert into v1_route_fixture (
  actor_user_id,
  category_id,
  ward_id,
  longitude,
  latitude,
  captured_at
)
select
  'e4800000-0000-4000-8000-000000000001',
  category.id,
  ward.id,
  extensions.st_x(extensions.st_pointonsurface(boundary.boundary)),
  extensions.st_y(extensions.st_pointonsurface(boundary.boundary)),
  current_timestamp
from routing.issue_categories as category
cross join governance.wards as ward
inner join governance.jurisdiction_boundary_versions as boundary on boundary.ward_id = ward.id
where category.code = 'pothole'
  and ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
  and ward.ward_number = 'A'
  and boundary.status = 'active'
  and boundary.effective_to is null
limit 1;

select is(
  (select count(*)::integer from v1_route_fixture),
  1,
  'an A Ward point is available for a formerly disabled category'
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
  'e4800000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'v1-ward-routing@example.test',
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp
);

update v1_route_fixture as fixture
set draft_id = (
  select created.draft_id
  from public.create_complaint_draft(
    fixture.actor_user_id,
    repeat('a', 64),
    repeat('b', 64),
    fixture.category_id,
    null,
    'A pothole requires attention on this public road.',
    'en',
    '{}'::jsonb
  ) as created
);

update v1_route_fixture as fixture
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
  '{"testFixture":"v1_simple_ward_route"}'::jsonb
);

update v1_route_fixture as fixture
set routing_decision_id = public.resolve_v1_ward_route(
  fixture.actor_user_id,
  'v1-simple-ward-route-test',
  fixture.category_id,
  fixture.longitude,
  fixture.latitude,
  5,
  fixture.captured_at,
  current_timestamp,
  null
);

select is(
  (
    select decision.decision_status
    from routing.routing_decisions as decision
    inner join v1_route_fixture as fixture on fixture.routing_decision_id = decision.id
  ),
  'routed',
  'the simplified resolver produces a routed decision'
);

select is(
  (
    select decision.ward_id
    from routing.routing_decisions as decision
    inner join v1_route_fixture as fixture on fixture.routing_decision_id = decision.id
  ),
  (select ward_id from v1_route_fixture),
  'the simplified resolver records the PostGIS-resolved ward'
);

select is(
  (
    select rule.rule_code
    from routing.routing_decisions as decision
    inner join routing.route_rules as rule on rule.id = decision.route_rule_id
    inner join v1_route_fixture as fixture on fixture.routing_decision_id = decision.id
  ),
  'V1_WARD_POTHOLE',
  'the resolver uses the generic category rule'
);

update v1_route_fixture as fixture
set complaint_id = gen_random_uuid();

insert into complaints.complaints (
  id,
  draft_id,
  complaint_number,
  citizen_user_id,
  category_id,
  description,
  description_language,
  custom_attributes,
  location_evidence_id,
  routing_decision_id,
  submitted_at
)
select
  fixture.complaint_id,
  fixture.draft_id,
  'LW-20260720-48000001',
  fixture.actor_user_id,
  fixture.category_id,
  'A pothole requires attention on this public road.',
  'en',
  '{}'::jsonb,
  fixture.location_id,
  fixture.routing_decision_id,
  current_timestamp
from v1_route_fixture as fixture;

update v1_route_fixture as fixture
set assignment_id = gen_random_uuid();

insert into complaints.complaint_assignments (
  id,
  complaint_id,
  routing_decision_id,
  authority_id,
  local_body_id,
  ward_id,
  department_id,
  authority_department_id,
  officer_role_id,
  assigned_at
)
select
  fixture.assignment_id,
  fixture.complaint_id,
  decision.id,
  decision.target_authority_id,
  decision.local_body_id,
  decision.ward_id,
  decision.department_id,
  decision.authority_department_id,
  decision.officer_role_id,
  current_timestamp
from v1_route_fixture as fixture
inner join routing.routing_decisions as decision on decision.id = fixture.routing_decision_id;

select is(
  (
    select count(*)::integer
    from complaints.ward_email_outbox as outbox
    inner join v1_route_fixture as fixture on fixture.complaint_id = outbox.complaint_id
    where outbox.state = 'pending'
  ),
  1,
  'creating the V1 assignment atomically queues one ward email'
);

select is(
  (
    select outbox.recipient_email
    from complaints.ward_email_outbox as outbox
    inner join v1_route_fixture as fixture on fixture.complaint_id = outbox.complaint_id
  ),
  'ac.a@mcgm.gov.in',
  'the queued recipient is snapshotted from the resolved ward contact'
);

create temporary table claimed_v1_email as
select * from public.claim_v1_ward_emails('v1-test-worker', 1, 300);

select is(
  (select count(*)::integer from claimed_v1_email),
  1,
  'the service worker can lease the queued ward email'
);

select is(
  (select recipient_email from claimed_v1_email),
  'ac.a@mcgm.gov.in',
  'the delivery lease contains the private recipient snapshot'
);

select lives_ok(
  $$
    select public.complete_v1_ward_email(
      (select outbox_id from claimed_v1_email),
      'v1-test-worker',
      'provider-message-v1-test'
    )
  $$,
  'the current lease owner can mark the delivery sent'
);

select is(
  (
    select outbox.state
    from complaints.ward_email_outbox as outbox
    inner join claimed_v1_email as claimed on claimed.outbox_id = outbox.id
  ),
  'sent',
  'sent is recorded separately from queued and processing'
);

select * from finish();
rollback;
