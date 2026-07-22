-- V1 keeps the durable complaint ledger while reducing the operational routing
-- path to: captured location -> configured ward -> configured ward recipient.
-- Recipient contact values remain private and are never returned to citizen clients.

create table if not exists routing.ward_issue_contacts (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references governance.wards (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  recipient_email text not null,
  primary_contact text not null,
  secondary_contact text,
  central_fallback text not null,
  whatsapp_contact text not null,
  durable_role text not null,
  usage_note text not null,
  source_as_of date not null,
  last_checked_on date not null,
  ward_source_url text not null,
  issue_source_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_issue_contacts_recipient_email_check check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  constraint ward_issue_contacts_primary_contact_check check (
    primary_contact = btrim(primary_contact)
    and char_length(primary_contact) between 1 and 500
  ),
  constraint ward_issue_contacts_secondary_contact_check check (
    secondary_contact is null
    or (
      secondary_contact = btrim(secondary_contact)
      and char_length(secondary_contact) between 1 and 500
    )
  ),
  constraint ward_issue_contacts_central_fallback_check check (
    central_fallback = btrim(central_fallback)
    and char_length(central_fallback) between 1 and 500
  ),
  constraint ward_issue_contacts_whatsapp_check check (
    whatsapp_contact = btrim(whatsapp_contact)
    and char_length(whatsapp_contact) between 1 and 120
  ),
  constraint ward_issue_contacts_role_check check (
    durable_role = btrim(durable_role)
    and char_length(durable_role) between 1 and 240
  ),
  constraint ward_issue_contacts_usage_note_check check (
    usage_note = btrim(usage_note)
    and char_length(usage_note) between 1 and 2000
  ),
  constraint ward_issue_contacts_source_dates_check check (
    source_as_of <= last_checked_on
  ),
  constraint ward_issue_contacts_source_urls_check check (
    ward_source_url = btrim(ward_source_url)
    and issue_source_url = btrim(issue_source_url)
    and ward_source_url ~ '^https://'
    and issue_source_url ~ '^https://'
  ),
  constraint ward_issue_contacts_ward_category_unique unique (ward_id, category_id)
);

create table if not exists complaints.ward_email_outbox (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  ward_id uuid not null references governance.wards (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  recipient_email text not null,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error_code text,
  provider_message_id text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_email_outbox_recipient_check check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
  ),
  constraint ward_email_outbox_state_check check (
    state in ('pending', 'processing', 'retry', 'sent', 'dead')
  ),
  constraint ward_email_outbox_attempt_count_check check (attempt_count >= 0),
  constraint ward_email_outbox_lease_shape_check check (
    (state = 'processing' and lease_owner is not null and lease_expires_at is not null)
    or (state <> 'processing' and lease_owner is null and lease_expires_at is null)
  ),
  constraint ward_email_outbox_sent_shape_check check (
    (state = 'sent' and sent_at is not null)
    or (state <> 'sent' and sent_at is null)
  ),
  constraint ward_email_outbox_error_check check (
    last_error_code is null
    or (
      last_error_code = btrim(last_error_code)
      and last_error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
    )
  ),
  constraint ward_email_outbox_provider_id_check check (
    provider_message_id is null
    or (
      provider_message_id = btrim(provider_message_id)
      and char_length(provider_message_id) between 1 and 500
    )
  ),
  constraint ward_email_outbox_complaint_recipient_unique unique (
    complaint_id,
    ward_id,
    recipient_email
  )
);

create index if not exists ward_issue_contacts_category_ward_active_idx
  on routing.ward_issue_contacts (category_id, ward_id)
  where is_active;

create index if not exists ward_email_outbox_ready_idx
  on complaints.ward_email_outbox (available_at, queued_at, id)
  where state in ('pending', 'retry');

create index if not exists ward_email_outbox_expired_lease_idx
  on complaints.ward_email_outbox (lease_expires_at, id)
  where state = 'processing';

drop trigger if exists set_ward_issue_contacts_updated_at
  on routing.ward_issue_contacts;
create trigger set_ward_issue_contacts_updated_at
before update on routing.ward_issue_contacts
for each row execute function private.set_updated_at();

drop trigger if exists set_ward_email_outbox_updated_at
  on complaints.ward_email_outbox;
create trigger set_ward_email_outbox_updated_at
before update on complaints.ward_email_outbox
for each row execute function private.set_updated_at();

alter table routing.ward_issue_contacts enable row level security;
alter table routing.ward_issue_contacts force row level security;
alter table complaints.ward_email_outbox enable row level security;
alter table complaints.ward_email_outbox force row level security;

revoke all on table routing.ward_issue_contacts from public, anon, authenticated;
revoke all on table complaints.ward_email_outbox from public, anon, authenticated;
grant all on table routing.ward_issue_contacts to service_role;
grant all on table complaints.ward_email_outbox to service_role;

create or replace function public.resolve_v1_ward_route(
  p_actor_user_id uuid,
  p_request_id text,
  p_category_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz,
  p_resolved_at timestamptz,
  p_asset_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  point extensions.geometry(Point, 4326);
  selected record;
  decision_id uuid;
  explanation_metadata jsonb;
begin
  if p_actor_user_id is null
    or p_category_id is null
    or p_captured_at is null
    or p_resolved_at is null then
    raise exception using errcode = '22023', message = 'V1_WARD_ROUTE_INPUT_INVALID';
  end if;

  if not exists (
    select 1
    from routing.issue_categories as category
    where category.id = p_category_id
      and category.status = 'active'
      and category.is_routing_eligible
  ) then
    raise exception using errcode = '22023', message = 'V1_WARD_ROUTE_CATEGORY_UNAVAILABLE';
  end if;

  if p_longitude is null
    or p_latitude is null
    or p_longitude < -180
    or p_longitude > 180
    or p_latitude < -90
    or p_latitude > 90
    or p_accuracy_meters is null
    or p_accuracy_meters < 0
    or p_accuracy_meters > 5000 then
    raise exception using errcode = '22023', message = 'ROUTING_COORDINATES_INVALID';
  end if;

  point := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),
    4326
  )::extensions.geometry(Point, 4326);

  with matching_boundaries as (
    select
      contact.id as contact_id,
      boundary.id as ward_boundary_version_id,
      0 as match_rank
    from routing.ward_issue_contacts as contact
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.ward_id = contact.ward_id
    where contact.category_id = p_category_id
      and contact.is_active
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
      and (
        extensions.st_covers(boundary.boundary, point)
        or extensions.st_dwithin(
          boundary.boundary::extensions.geography,
          point::extensions.geography,
          greatest(p_accuracy_meters, 1.0)
        )
      )
    union all
    select
      contact.id,
      boundary.id,
      case crosswalk.relationship_type
        when 'one_to_one' then 1
        else 2
      end
    from routing.ward_issue_contacts as contact
    inner join governance.ward_boundary_crosswalk_versions as crosswalk
      on crosswalk.operational_ward_id = contact.ward_id
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.id = crosswalk.official_boundary_version_id
    where contact.category_id = p_category_id
      and contact.is_active
      and crosswalk.status = 'active'
      and crosswalk.effective_from <= p_resolved_at
      and (crosswalk.effective_to is null or crosswalk.effective_to > p_resolved_at)
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
      and (
        extensions.st_covers(boundary.boundary, point)
        or extensions.st_dwithin(
          boundary.boundary::extensions.geography,
          point::extensions.geography,
          greatest(p_accuracy_meters, 1.0)
        )
      )
  ), ranked_boundaries as (
    select
      match.contact_id,
      match.ward_boundary_version_id,
      min(match.match_rank) as match_rank
    from matching_boundaries as match
    group by match.contact_id, match.ward_boundary_version_id
  )
  select
    contact.id as contact_id,
    contact.ward_id,
    ward.ward_number,
    ward.local_body_id,
    local_body.state_id,
    local_body.authority_id,
    ranked.ward_boundary_version_id,
    local_body_boundary.id as local_body_boundary_version_id,
    rule.id as route_rule_id,
    rule_version.id as route_rule_version_id,
    rule_version.target_authority_id,
    rule_version.target_department_id as department_id,
    authority_department.id as authority_department_id,
    rule_version.target_officer_role_id as officer_role_id,
    rule_version.confidence_policy_version_id,
    confidence_version.confidence_policy_id,
    confidence_version.version as confidence_policy_version
  into selected
  from ranked_boundaries as ranked
  inner join routing.ward_issue_contacts as contact on contact.id = ranked.contact_id
  inner join governance.wards as ward on ward.id = contact.ward_id
  inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
  inner join lateral (
    select boundary.id
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.local_body_id = local_body.id
      and boundary.status = 'active'
      and boundary.effective_from <= p_resolved_at
      and (boundary.effective_to is null or boundary.effective_to > p_resolved_at)
    order by boundary.version desc, boundary.id
    limit 1
  ) as local_body_boundary on true
  inner join routing.route_rules as rule
    on rule.category_id = contact.category_id
   and rule.rule_code = 'V1_WARD_' || upper((
     select category.code from routing.issue_categories as category
     where category.id = contact.category_id
   ))
   and rule.status = 'active'
  inner join routing.route_rule_versions as rule_version
   on rule_version.route_rule_id = rule.id
   and rule_version.scope_local_body_id = ward.local_body_id
   and rule_version.status = 'active'
   and rule_version.effective_from <= p_resolved_at
   and (rule_version.effective_to is null or rule_version.effective_to > p_resolved_at)
  inner join governance.authority_departments as authority_department
    on authority_department.authority_id = rule_version.target_authority_id
   and authority_department.department_id = rule_version.target_department_id
   and authority_department.status = 'active'
  inner join routing.confidence_policy_versions as confidence_version
    on confidence_version.id = rule_version.confidence_policy_version_id
  order by ranked.match_rank, ward.ward_number, ward.id, ranked.ward_boundary_version_id
  limit 1;

  if not found then
    explanation_metadata := jsonb_build_object(
      'policyId', null,
      'policyVersionId', null,
      'policyVersion', null,
      'requestedAssetId', p_asset_id,
      'confidenceBand', 'none',
      'confidenceFactors', jsonb_build_array(),
      'jurisdiction', jsonb_build_object(
        'status', 'unsupported',
        'matches', jsonb_build_array(),
        'reason', 'No configured V1 ward recipient covers this location and category.'
      ),
      'selectedCandidateId', null,
      'selectedRoutingRuleId', null,
      'selectedRoutingRuleVersionId', null,
      'fallbackUsed', false,
      'fallbackPath', jsonb_build_array(),
      'ambiguousCandidateIds', jsonb_build_array(),
      'candidateEvaluations', jsonb_build_array()
    );

    return public.record_routing_decision(
      p_actor_user_id => p_actor_user_id,
      p_request_id => p_request_id,
      p_longitude => p_longitude,
      p_latitude => p_latitude,
      p_accuracy_meters => p_accuracy_meters,
      p_captured_at => p_captured_at,
      p_resolved_at => p_resolved_at,
      p_category_id => p_category_id,
      p_decision_status => 'unsupported_area',
      p_explanation_codes => array['v1_ward_route_unavailable']::text[],
      p_explanation_metadata => explanation_metadata
    );
  end if;

  explanation_metadata := jsonb_build_object(
    'policyId', selected.confidence_policy_id,
    'policyVersionId', selected.confidence_policy_version_id,
    'policyVersion', selected.confidence_policy_version,
    'requestedAssetId', p_asset_id,
    'confidenceBand', 'high',
    'confidenceFactors', jsonb_build_array(
      jsonb_build_object(
        'code', 'jurisdiction', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The captured location intersects a configured ward boundary.'
      ),
      jsonb_build_object(
        'code', 'category', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The complaint category has an active ward contact.'
      ),
      jsonb_build_object(
        'code', 'department', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The route targets the configured municipal intake department.'
      ),
      jsonb_build_object(
        'code', 'role', 'matched', true, 'required', true,
        'weight', 0.25, 'contribution', 0.25,
        'explanation', 'The route targets the configured durable intake role.'
      )
    ),
    'jurisdiction', jsonb_build_object(
      'status', 'resolved',
      'matches', jsonb_build_array(jsonb_build_object(
        'stateId', selected.state_id,
        'districtId', null,
        'talukaId', null,
        'localBodyId', selected.local_body_id,
        'wardId', selected.ward_id,
        'stateBoundaryVersionId', null,
        'districtBoundaryVersionId', null,
        'talukaBoundaryVersionId', null,
        'localBodyBoundaryVersionId', selected.local_body_boundary_version_id,
        'wardBoundaryVersionId', selected.ward_boundary_version_id,
        'evidence', jsonb_build_array()
      )),
      'reason', 'The captured location resolved to a configured V1 municipal ward.'
    ),
    'selectedCandidateId', 'v1-ward:' || selected.contact_id::text,
    'selectedRoutingRuleId', selected.route_rule_id,
    'selectedRoutingRuleVersionId', selected.route_rule_version_id,
    'fallbackUsed', false,
    'fallbackPath', jsonb_build_array(),
    'ambiguousCandidateIds', jsonb_build_array(),
    'candidateEvaluations', jsonb_build_array()
  );

  decision_id := public.record_routing_decision(
    p_actor_user_id => p_actor_user_id,
    p_request_id => p_request_id,
    p_longitude => p_longitude,
    p_latitude => p_latitude,
    p_accuracy_meters => p_accuracy_meters,
    p_captured_at => p_captured_at,
    p_resolved_at => p_resolved_at,
    p_category_id => p_category_id,
    p_decision_status => 'routed',
    p_confidence_score => 1.0,
    p_state_id => selected.state_id,
    p_local_body_id => selected.local_body_id,
    p_ward_id => selected.ward_id,
    p_local_body_boundary_version_id => selected.local_body_boundary_version_id,
    p_ward_boundary_version_id => selected.ward_boundary_version_id,
    p_target_authority_id => selected.target_authority_id,
    p_department_id => selected.department_id,
    p_authority_department_id => selected.authority_department_id,
    p_officer_role_id => selected.officer_role_id,
    p_route_rule_id => selected.route_rule_id,
    p_route_rule_version_id => selected.route_rule_version_id,
    p_confidence_policy_version_id => selected.confidence_policy_version_id,
    p_explanation_codes => array['v1_ward_recipient_configured']::text[],
    p_explanation_metadata => explanation_metadata
  );

  return decision_id;
end;
$$;

create or replace function complaints.enqueue_v1_ward_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from routing.routing_decisions as decision
    inner join routing.route_rules as rule on rule.id = decision.route_rule_id
    where decision.id = new.routing_decision_id
      and rule.rule_code like 'V1_WARD_%'
  ) then
    return new;
  end if;

  insert into complaints.ward_email_outbox (
    complaint_id,
    ward_id,
    category_id,
    recipient_email
  )
  select
    new.complaint_id,
    new.ward_id,
    complaint.category_id,
    contact.recipient_email
  from complaints.complaints as complaint
  inner join routing.ward_issue_contacts as contact
    on contact.ward_id = new.ward_id
   and contact.category_id = complaint.category_id
   and contact.is_active
  where complaint.id = new.complaint_id
  on conflict (complaint_id, ward_id, recipient_email) do nothing;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'V1_WARD_EMAIL_RECIPIENT_NOT_CONFIGURED';
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_v1_ward_email_after_assignment
  on complaints.complaint_assignments;
create trigger enqueue_v1_ward_email_after_assignment
after insert on complaints.complaint_assignments
for each row
when (new.ward_id is not null)
execute function complaints.enqueue_v1_ward_email();

create or replace function public.claim_v1_ward_emails(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns table (
  outbox_id uuid,
  complaint_id uuid,
  recipient_email text,
  complaint_number text,
  category_name text,
  ward_name text,
  description text,
  longitude double precision,
  latitude double precision,
  submitted_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null
    or btrim(p_worker_id) = ''
    or p_limit not between 1 and 100
    or p_lease_seconds not between 30 and 3600 then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_CLAIM_INVALID';
  end if;

  return query
  with candidates as (
    select outbox.id
    from complaints.ward_email_outbox as outbox
    where (
      outbox.state in ('pending', 'retry')
      and outbox.available_at <= now()
    ) or (
      outbox.state = 'processing'
      and outbox.lease_expires_at <= now()
    )
    order by outbox.available_at, outbox.queued_at, outbox.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update complaints.ward_email_outbox as outbox
    set
      state = 'processing',
      attempt_count = outbox.attempt_count + 1,
      lease_owner = btrim(p_worker_id),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      last_error_code = null,
      updated_at = now()
    from candidates
    where outbox.id = candidates.id
    returning outbox.*
  )
  select
    claimed.id,
    claimed.complaint_id,
    claimed.recipient_email,
    complaint.complaint_number,
    category.name,
    ward.name,
    complaint.description,
    extensions.st_x(evidence.location),
    extensions.st_y(evidence.location),
    complaint.submitted_at,
    claimed.attempt_count
  from claimed
  inner join complaints.complaints as complaint on complaint.id = claimed.complaint_id
  inner join routing.issue_categories as category on category.id = claimed.category_id
  inner join governance.wards as ward on ward.id = claimed.ward_id
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  order by claimed.queued_at, claimed.id;
end;
$$;

create or replace function public.complete_v1_ward_email(
  p_outbox_id uuid,
  p_worker_id text,
  p_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider_message_id is null or btrim(p_provider_message_id) = '' then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_PROVIDER_ID_REQUIRED';
  end if;

  update complaints.ward_email_outbox as outbox
  set
    state = 'sent',
    provider_message_id = btrim(p_provider_message_id),
    sent_at = now(),
    lease_owner = null,
    lease_expires_at = null,
    last_error_code = null,
    updated_at = now()
  where outbox.id = p_outbox_id
    and outbox.state = 'processing'
    and outbox.lease_owner = btrim(p_worker_id)
    and outbox.lease_expires_at > now();

  if not found then
    raise exception using errcode = '40001', message = 'V1_WARD_EMAIL_LEASE_INVALID';
  end if;
end;
$$;

create or replace function public.fail_v1_ward_email(
  p_outbox_id uuid,
  p_worker_id text,
  p_error_code text,
  p_retry_after_seconds integer default 300,
  p_max_attempts integer default 5
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error_code is null
    or btrim(p_error_code) !~ '^[A-Z][A-Z0-9_]{1,79}$'
    or p_retry_after_seconds not between 30 and 86400
    or p_max_attempts not between 1 and 20 then
    raise exception using errcode = '22023', message = 'V1_WARD_EMAIL_FAILURE_INVALID';
  end if;

  update complaints.ward_email_outbox as outbox
  set
    state = case when outbox.attempt_count >= p_max_attempts then 'dead' else 'retry' end,
    available_at = case
      when outbox.attempt_count >= p_max_attempts then outbox.available_at
      else now() + make_interval(secs => p_retry_after_seconds)
    end,
    lease_owner = null,
    lease_expires_at = null,
    last_error_code = btrim(p_error_code),
    updated_at = now()
  where outbox.id = p_outbox_id
    and outbox.state = 'processing'
    and outbox.lease_owner = btrim(p_worker_id);

  if not found then
    raise exception using errcode = '40001', message = 'V1_WARD_EMAIL_LEASE_INVALID';
  end if;
end;
$$;

-- Existing drafts can contain a no-longer-required asset selection. The V1 ward
-- route deliberately ignores that selection; all other routing evidence checks
-- remain fail-closed.
create or replace function complaints.complaint_routing_evidence_mismatches(
  p_actor_user_id uuid,
  p_submission_request_id uuid,
  p_routing_decision_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  submission complaints.complaint_submission_requests%rowtype;
  draft complaints.complaint_drafts%rowtype;
  evidence complaints.complaint_location_evidence%rowtype;
  decision routing.routing_decisions%rowtype;
  v1_ward_route boolean := false;
  mismatches text[] := '{}'::text[];
begin
  select request.* into submission
  from complaints.complaint_submission_requests as request
  where request.id = p_submission_request_id
    and request.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select candidate.* into draft
  from complaints.complaint_drafts as candidate
  where candidate.id = submission.draft_id
    and candidate.citizen_user_id = p_actor_user_id;

  if not found or draft.selected_location_evidence_id is null then
    return mismatches;
  end if;

  select location.* into evidence
  from complaints.complaint_location_evidence as location
  where location.id = draft.selected_location_evidence_id
    and location.draft_id = draft.id
    and location.actor_user_id = p_actor_user_id;

  if not found then
    return mismatches;
  end if;

  select route.* into decision
  from routing.routing_decisions as route
  where route.id = p_routing_decision_id;

  if not found then
    return array['COMPLAINT_ROUTING_DECISION_NOT_FOUND']::text[];
  end if;

  select exists (
    select 1
    from routing.route_rules as rule
    where rule.id = decision.route_rule_id
      and rule.rule_code like 'V1_WARD_%'
  ) into v1_ward_route;

  if decision.actor_user_id is distinct from p_actor_user_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACTOR_MISMATCH');
  end if;
  if decision.request_id is distinct from submission.routing_request_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_REQUEST_MISMATCH');
  end if;
  if decision.decision_status is distinct from 'routed' then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_STATUS_MISMATCH');
  end if;
  if decision.category_id is distinct from draft.category_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CATEGORY_MISMATCH');
  end if;
  if not v1_ward_route and decision.asset_id is distinct from draft.asset_id then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ASSET_MISMATCH');
  end if;
  if not extensions.st_dwithin(
    decision.input_location::extensions.geography,
    evidence.location::extensions.geography,
    2.0
  ) then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_LOCATION_MISMATCH');
  end if;
  if decision.accuracy_meters is null
    or evidence.accuracy_meters is null
    or abs(decision.accuracy_meters - evidence.accuracy_meters) > 0.5 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_ACCURACY_MISMATCH');
  end if;
  if decision.captured_at is null
    or evidence.captured_at is null
    or abs(extract(epoch from (decision.captured_at - evidence.captured_at))) > 2 then
    mismatches := array_append(mismatches, 'COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH');
  end if;

  return mismatches;
end;
$$;

revoke all on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) to service_role;

revoke all on function public.claim_v1_ward_emails(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_v1_ward_emails(text, integer, integer)
  to service_role;

revoke all on function public.complete_v1_ward_email(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_v1_ward_email(uuid, text, text)
  to service_role;

revoke all on function public.fail_v1_ward_email(uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.fail_v1_ward_email(uuid, text, text, integer, integer)
  to service_role;

revoke all on function complaints.enqueue_v1_ward_email()
  from public, anon, authenticated, service_role;
revoke all on function complaints.complaint_routing_evidence_mismatches(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

comment on table routing.ward_issue_contacts is
  'Private V1 ward/category recipient and published phone/WhatsApp configuration.';
comment on table complaints.ward_email_outbox is
  'Private idempotent queue for ward complaint email delivery; queued is not equivalent to sent.';
comment on function public.resolve_v1_ward_route(
  uuid, text, uuid, double precision, double precision, double precision,
  timestamptz, timestamptz, uuid
) is 'Resolves the V1 complaint target directly from PostGIS ward geometry and private contact configuration.';
