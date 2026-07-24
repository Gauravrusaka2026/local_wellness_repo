-- Extend the V1 taxonomy contract in two deliberately separate directions:
-- ordinary civic issues may become ward-routable only after every operational
-- prerequisite is present, while protected issues expose official call/browser
-- handoffs without entering the ordinary complaint or email-delivery workflow.

alter table routing.issue_categories
  drop constraint if exists issue_categories_routing_status_check,
  drop constraint if exists issue_categories_taxonomy_shape_check;

alter table routing.issue_categories
  add constraint issue_categories_routing_status_check check (
    routing_status in (
      'legacy',
      'mapped',
      'pending_verification',
      'protected_pending',
      'protected_handoff'
    )
  ),
  add constraint issue_categories_taxonomy_shape_check check (
    (
      category_purpose = 'routing_profile'
      and taxonomy_code is null
      and workflow_type is null
      and sensitivity_class is null
      and configuration_status = 'legacy'
      and routing_status = 'legacy'
      and routing_profile_category_id is null
      and public_visibility_default is null
      and comments_allowed is null
      and community_support_allowed is null
    )
    or (
      category_purpose = 'taxonomy_primary'
      and taxonomy_code ~ '^[A-Z]{3}$'
      and workflow_type is null
      and sensitivity_class is not null
      and configuration_status = 'taxonomy_ready'
      and routing_status in (
        'pending_verification',
        'protected_pending',
        'protected_handoff'
      )
      and routing_profile_category_id is null
      and classification_level = 'category'
      and parent_category_id is null
      and public_visibility_default is not null
      and comments_allowed is not null
      and community_support_allowed is not null
      and not is_routing_eligible
    )
    or (
      category_purpose = 'taxonomy_subcategory'
      and taxonomy_code ~ '^[A-Z]{3}-[0-9]{3}$'
      and workflow_type is not null
      and sensitivity_class is not null
      and configuration_status = 'taxonomy_ready'
      and (
        (
          routing_status = 'mapped'
          and routing_profile_category_id is not null
        )
        or (
          routing_status in (
            'pending_verification',
            'protected_pending',
            'protected_handoff'
          )
          and routing_profile_category_id is null
        )
      )
      and classification_level = 'subcategory'
      and parent_category_id is not null
      and public_visibility_default is not null
      and comments_allowed is not null
      and community_support_allowed is not null
      and not is_routing_eligible
    )
  );

create table routing.complaint_handoff_actions (
  id uuid primary key default gen_random_uuid(),
  action_key text not null,
  taxonomy_category_id uuid not null
    references routing.issue_categories (id) on delete restrict,
  action_kind text not null,
  label text not null,
  description text not null,
  target_value text not null,
  priority smallint not null default 100,
  source_url text not null,
  source_locator text not null,
  source_as_of date not null,
  last_checked_on date not null,
  source_status text not null,
  owner_approved_for_display boolean not null default false,
  is_active boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_handoff_actions_action_key_check check (
    action_key = btrim(action_key)
    and action_key ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint complaint_handoff_actions_kind_check check (
    action_kind in ('call', 'browser')
  ),
  constraint complaint_handoff_actions_label_check check (
    label = btrim(label)
    and char_length(label) between 1 and 120
  ),
  constraint complaint_handoff_actions_description_check check (
    description = btrim(description)
    and char_length(description) between 1 and 500
  ),
  constraint complaint_handoff_actions_target_check check (
    (
      action_kind = 'call'
      and target_value = btrim(target_value)
      and target_value ~ '^[0-9]{3,15}$'
    )
    or (
      action_kind = 'browser'
      and target_value = btrim(target_value)
      and target_value ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
    )
  ),
  constraint complaint_handoff_actions_priority_check check (
    priority between 0 and 32767
  ),
  constraint complaint_handoff_actions_source_url_check check (
    source_url = btrim(source_url)
    and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
  ),
  constraint complaint_handoff_actions_source_locator_check check (
    source_locator = btrim(source_locator)
    and char_length(source_locator) between 1 and 500
  ),
  constraint complaint_handoff_actions_source_dates_check check (
    source_as_of <= last_checked_on
  ),
  constraint complaint_handoff_actions_source_status_check check (
    source_status = btrim(source_status)
    and source_status ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint complaint_handoff_actions_active_approval_check check (
    not is_active or owner_approved_for_display
  ),
  constraint complaint_handoff_actions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint complaint_handoff_actions_action_key_unique unique (action_key),
  constraint complaint_handoff_actions_category_target_unique unique (
    taxonomy_category_id,
    action_kind,
    target_value
  )
);

create index complaint_handoff_actions_taxonomy_active_idx
  on routing.complaint_handoff_actions (
    taxonomy_category_id,
    priority,
    action_key
  )
  where is_active and owner_approved_for_display;

create function routing.validate_complaint_handoff_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  taxonomy_record record;
begin
  if new.action_kind not in ('call', 'browser') then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_HANDOFF_KIND_INVALID';
  end if;

  if (
    new.action_kind = 'call'
    and (
      new.target_value is distinct from btrim(new.target_value)
      or new.target_value !~ '^[0-9]{3,15}$'
    )
  ) or (
    new.action_kind = 'browser'
    and (
      new.target_value is distinct from btrim(new.target_value)
      or new.target_value !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_HANDOFF_TARGET_INVALID';
  end if;

  if new.source_url is distinct from btrim(new.source_url)
    or new.source_url !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_HANDOFF_SOURCE_URL_INVALID';
  end if;

  select
    category.category_purpose,
    category.sensitivity_class,
    category.routing_status,
    category.routing_profile_category_id,
    category.public_visibility_default,
    category.comments_allowed,
    category.community_support_allowed
  into taxonomy_record
  from routing.issue_categories as category
  where category.id = new.taxonomy_category_id;

  if not found
    or taxonomy_record.category_purpose not in (
      'taxonomy_primary',
      'taxonomy_subcategory'
    )
    or taxonomy_record.sensitivity_class not in (
      'PRIVATE',
      'EMERGENCY_PRIVATE'
    )
    or taxonomy_record.routing_status not in (
      'protected_pending',
      'protected_handoff'
    )
    or taxonomy_record.routing_profile_category_id is not null
    or taxonomy_record.public_visibility_default
    or taxonomy_record.comments_allowed
    or taxonomy_record.community_support_allowed then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_HANDOFF_CATEGORY_MUST_BE_PROTECTED';
  end if;

  if new.is_active
    and taxonomy_record.routing_status <> 'protected_handoff' then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_ACTIVE_HANDOFF_REQUIRES_READY_CATEGORY';
  end if;

  return new;
end;
$$;

create trigger complaint_handoff_actions_validate
before insert or update of
  taxonomy_category_id,
  action_kind,
  target_value,
  owner_approved_for_display,
  is_active,
  effective_from,
  effective_to
on routing.complaint_handoff_actions
for each row execute function routing.validate_complaint_handoff_action();

create trigger set_complaint_handoff_actions_updated_at
before update on routing.complaint_handoff_actions
for each row execute function private.set_updated_at();

alter table routing.complaint_handoff_actions enable row level security;
alter table routing.complaint_handoff_actions force row level security;

revoke all on table routing.complaint_handoff_actions
  from public, anon, authenticated;
grant all on table routing.complaint_handoff_actions to service_role;

create or replace function routing.validate_complaint_taxonomy_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_record record;
  route_profile_record record;
  is_protected boolean;
begin
  if tg_op = 'UPDATE'
    and old.category_purpose in ('taxonomy_primary', 'taxonomy_subcategory')
    and (
      new.category_purpose is distinct from old.category_purpose
      or new.taxonomy_code is distinct from old.taxonomy_code
    ) then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_IDENTITY_IMMUTABLE';
  end if;

  if new.category_purpose = 'routing_profile' then
    return new;
  end if;

  is_protected := new.sensitivity_class in ('PRIVATE', 'EMERGENCY_PRIVATE');

  if is_protected and (
    new.routing_status not in ('protected_pending', 'protected_handoff')
    or new.routing_profile_category_id is not null
    or new.public_visibility_default
    or new.comments_allowed
    or new.community_support_allowed
  ) then
    if new.taxonomy_code = 'COR'
      or new.taxonomy_code like 'COR-%' then
      raise exception using
        errcode = '23514',
        message = case
          when new.category_purpose = 'taxonomy_primary'
            then 'JAGRUKSETU_CORRUPTION_PRIMARY_MUST_REMAIN_PROTECTED'
          else 'JAGRUKSETU_CORRUPTION_INTAKE_MUST_REMAIN_PROTECTED'
        end;
    end if;

    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_PROTECTED_CATEGORY_MUST_REMAIN_NON_ROUTABLE';
  end if;

  if not is_protected
    and new.routing_status in ('protected_pending', 'protected_handoff') then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_PROTECTED_STATUS_REQUIRES_PROTECTED_SENSITIVITY';
  end if;

  if tg_op = 'UPDATE'
    and exists (
      select 1
      from routing.complaint_handoff_actions as action
      where action.taxonomy_category_id = new.id
        and action.is_active
        and action.owner_approved_for_display
        and action.effective_from <= current_timestamp
        and (action.effective_to is null or action.effective_to > current_timestamp)
    )
    and (
      not is_protected
      or new.routing_status <> 'protected_handoff'
      or new.routing_profile_category_id is not null
      or new.public_visibility_default
      or new.comments_allowed
      or new.community_support_allowed
    ) then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_CATEGORY_HAS_ACTIVE_HANDOFF';
  end if;

  if new.category_purpose = 'taxonomy_primary' then
    return new;
  end if;

  select
    parent.id,
    parent.domain_id,
    parent.category_purpose,
    parent.taxonomy_code
  into parent_record
  from routing.issue_categories as parent
  where parent.id = new.parent_category_id;

  if not found
    or parent_record.category_purpose <> 'taxonomy_primary'
    or parent_record.domain_id <> new.domain_id
    or split_part(new.taxonomy_code, '-', 1) <> parent_record.taxonomy_code then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_TAXONOMY_PARENT_INVALID';
  end if;

  if new.routing_profile_category_id is not null then
    select
      route_profile.id,
      route_profile.category_purpose,
      route_profile.classification_level,
      route_profile.parent_category_id
    into route_profile_record
    from routing.issue_categories as route_profile
    where route_profile.id = new.routing_profile_category_id;

    if not found
      or route_profile_record.category_purpose <> 'routing_profile'
      or route_profile_record.classification_level <> 'category'
      or route_profile_record.parent_category_id is not null then
      raise exception using
        errcode = '23514',
        message = 'JAGRUKSETU_TAXONOMY_ROUTE_PROFILE_INVALID';
    end if;
  end if;

  return new;
end;
$$;

drop function public.list_complaint_taxonomy();

create function public.list_complaint_taxonomy()
returns table (
  taxonomy_id uuid,
  primary_category_id uuid,
  primary_code text,
  primary_name text,
  subcategory_code text,
  subcategory_name text,
  subcategory_description text,
  workflow_type text,
  sensitivity_class text,
  routing_status text,
  routing_profile_category_id uuid,
  routing_profile_code text,
  routing_profile_name text,
  submission_available boolean,
  requires_asset boolean,
  requires_location boolean,
  is_emergency boolean,
  minimum_media_count integer,
  maximum_media_count integer,
  required_attributes text[],
  recommended_media_kinds text[],
  handoff_actions jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    subcategory.id,
    primary_category.id,
    primary_category.taxonomy_code,
    primary_category.name,
    subcategory.taxonomy_code,
    subcategory.name,
    subcategory.description,
    subcategory.workflow_type,
    subcategory.sensitivity_class,
    subcategory.routing_status,
    route_profile.id,
    route_profile.code,
    route_profile.name,
    (
      subcategory.routing_status = 'mapped'
      and route_profile.id is not null
      and route_profile.status = 'active'
      and route_profile.verification_status = 'verified'
      and not route_profile.is_placeholder
      and route_profile.is_routing_eligible
      and route_domain.status = 'active'
      and route_domain.verification_status = 'verified'
      and not route_domain.is_placeholder
      and route_domain.is_routing_eligible
      and exists (
        select 1
        from routing.route_rules as rule
        inner join routing.route_rule_versions as rule_version
          on rule_version.route_rule_id = rule.id
        inner join governance.local_bodies as local_body
          on local_body.id = rule_version.scope_local_body_id
        where rule.category_id = route_profile.id
          and rule.rule_code = 'V1_WARD_' || upper(route_profile.code)
          and rule.status = 'active'
          and rule.verification_status = 'verified'
          and not rule.is_placeholder
          and rule.is_routing_eligible
          and rule_version.status = 'active'
          and rule_version.verification_status = 'verified'
          and not rule_version.is_placeholder
          and rule_version.is_routing_eligible
          and rule_version.scope_local_body_id is not null
          and rule_version.scope_ward_id is null
          and rule_version.effective_from <= current_timestamp
          and (
            rule_version.effective_to is null
            or rule_version.effective_to > current_timestamp
          )
          and local_body.status = 'active'
          and local_body.verification_status = 'verified'
          and not local_body.is_placeholder
          and local_body.is_routing_eligible
          and exists (
            select 1
            from governance.wards as eligible_ward
            where eligible_ward.local_body_id = rule_version.scope_local_body_id
              and eligible_ward.status = 'active'
              and eligible_ward.verification_status = 'verified'
              and not eligible_ward.is_placeholder
              and eligible_ward.is_routing_eligible
          )
          and not exists (
            select 1
            from governance.wards as eligible_ward
            where eligible_ward.local_body_id = rule_version.scope_local_body_id
              and eligible_ward.status = 'active'
              and eligible_ward.verification_status = 'verified'
              and not eligible_ward.is_placeholder
              and eligible_ward.is_routing_eligible
              and not exists (
                select 1
                from routing.ward_issue_contacts as contact
                where contact.ward_id = eligible_ward.id
                  and contact.category_id = route_profile.id
                  and contact.is_active
                  and contact.email_owner_approved_for_routing
              )
          )
      )
    ),
    coalesce(route_profile.requires_asset, subcategory.requires_asset),
    coalesce(route_profile.requires_location, subcategory.requires_location),
    coalesce(route_profile.is_emergency, false) or subcategory.is_emergency,
    coalesce(
      route_profile.minimum_media_count,
      subcategory.minimum_media_count
    )::integer,
    coalesce(
      route_profile.maximum_media_count,
      subcategory.maximum_media_count
    )::integer,
    coalesce(route_profile.required_attributes, subcategory.required_attributes),
    case
      when jsonb_typeof(
        coalesce(route_profile.media_requirements, subcategory.media_requirements)
          -> 'recommended'
      ) = 'array'
      then array(
        select jsonb_array_elements_text(
          coalesce(route_profile.media_requirements, subcategory.media_requirements)
            -> 'recommended'
        )
      )
      else '{}'::text[]
    end,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', selected_action.action_key,
            'kind', selected_action.action_kind,
            'label', selected_action.label,
            'description', selected_action.description,
            'target', selected_action.target_value,
            'priority', selected_action.priority
          )
          order by
            selected_action.scope_rank,
            selected_action.priority,
            selected_action.action_key
        )
        from (
          select distinct on (candidate.action_kind, candidate.target_value)
            candidate.action_key,
            candidate.action_kind,
            candidate.label,
            candidate.description,
            candidate.target_value,
            candidate.priority,
            case
              when candidate.taxonomy_category_id = subcategory.id then 0
              else 1
            end as scope_rank
          from routing.complaint_handoff_actions as candidate
          where candidate.taxonomy_category_id in (
              subcategory.id,
              primary_category.id
            )
            and candidate.is_active
            and candidate.owner_approved_for_display
            and candidate.effective_from <= current_timestamp
            and (
              candidate.effective_to is null
              or candidate.effective_to > current_timestamp
            )
          order by
            candidate.action_kind,
            candidate.target_value,
            case
              when candidate.taxonomy_category_id = subcategory.id then 0
              else 1
            end,
            candidate.priority,
            candidate.action_key
        ) as selected_action
      ),
      '[]'::jsonb
    )
  from routing.issue_categories as subcategory
  inner join routing.issue_categories as primary_category
    on primary_category.id = subcategory.parent_category_id
   and primary_category.category_purpose = 'taxonomy_primary'
  left join routing.issue_categories as route_profile
    on route_profile.id = subcategory.routing_profile_category_id
   and route_profile.category_purpose = 'routing_profile'
  left join routing.issue_domains as route_domain
    on route_domain.id = route_profile.domain_id
  where subcategory.category_purpose = 'taxonomy_subcategory'
    and subcategory.status = 'active'
    and primary_category.status = 'active'
  order by primary_category.taxonomy_code, subcategory.taxonomy_code;
$$;

create function complaints.complaint_category_display_name(
  p_category_id uuid,
  p_custom_attributes jsonb
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select subcategory.name
      from routing.issue_categories as subcategory
      inner join routing.issue_categories as primary_category
        on primary_category.id = subcategory.parent_category_id
       and primary_category.category_purpose = 'taxonomy_primary'
      where subcategory.category_purpose = 'taxonomy_subcategory'
        and subcategory.taxonomy_code =
          p_custom_attributes ->> 'taxonomy_subcategory_code'
        and primary_category.taxonomy_code =
          p_custom_attributes ->> 'taxonomy_primary_code'
        and subcategory.workflow_type =
          p_custom_attributes ->> 'taxonomy_workflow_type'
        and subcategory.routing_profile_category_id = p_category_id
        and subcategory.status = 'active'
        and primary_category.status = 'active'
      limit 1
    ),
    (
      select route_profile.name
      from routing.issue_categories as route_profile
      where route_profile.id = p_category_id
    )
  );
$$;

create or replace function public.list_owned_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMPLAINT_LIST_CURSOR_INVALID';
  end if;
  return query
  select
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id,
    complaints.complaint_category_display_name(
      complaint.category_id,
      complaint.custom_attributes
    ),
    complaint.current_status,
    complaint.visibility, complaint.submitted_at, complaint.updated_at,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where complaint.citizen_user_id = p_actor_user_id
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_owned_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid
)
returns table (
  complaint_id uuid,
  draft_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  asset_id uuid,
  description text,
  description_language text,
  custom_attributes jsonb,
  status text,
  visibility text,
  submitted_at timestamptz,
  updated_at timestamptz,
  location_evidence_id uuid,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_device_recorded_at timestamptz,
  mock_location_detected boolean,
  location_verification_status text,
  location_verification_score numeric,
  routing_decision_id uuid,
  routing_request_id text,
  assignment_id uuid,
  authority_id uuid,
  local_body_id uuid,
  ward_id uuid,
  department_id uuid,
  authority_department_id uuid,
  officer_role_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    complaint.id, complaint.draft_id, complaint.complaint_number,
    complaint.category_id,
    complaints.complaint_category_display_name(
      complaint.category_id,
      complaint.custom_attributes
    ),
    complaint.asset_id, complaint.description,
    complaint.description_language, complaint.custom_attributes,
    complaint.current_status, complaint.visibility, complaint.submitted_at,
    complaint.updated_at, evidence.id, extensions.st_x(evidence.location),
    extensions.st_y(evidence.location), evidence.accuracy_meters, evidence.provider,
    evidence.captured_at, evidence.device_recorded_at, evidence.mock_location_detected,
    evidence.verification_status, evidence.verification_score,
    complaint.routing_decision_id, submission.routing_request_id, assignment.id,
    assignment.authority_id, assignment.local_body_id, assignment.ward_id,
    assignment.department_id, assignment.authority_department_id,
    assignment.officer_role_id
  from complaints.complaints as complaint
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  inner join complaints.complaint_submission_requests as submission
    on submission.complaint_id = complaint.id
  where complaint.id = p_complaint_id
    and complaint.citizen_user_id = p_actor_user_id;
$$;

create or replace function public.list_government_complaints(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_submitted_at timestamptz default null,
  p_before_id uuid default null,
  p_scope_role_assignment_id uuid default null,
  p_queue text default null,
  p_statuses text[] default null,
  p_category_id uuid default null,
  p_ward_id uuid default null,
  p_authority_department_id uuid default null,
  p_officer_assignment_id uuid default null,
  p_submitted_from timestamptz default null,
  p_submitted_to timestamptz default null,
  p_search text default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_before_submitted_at is null) <> (p_before_id is null))
    or (p_queue is not null and p_queue not in (
      'new', 'unassigned', 'assigned', 'reopened', 'transferred',
      'awaiting_citizen_verification'
    ))
    or (p_search is not null and (
      btrim(p_search) = '' or char_length(p_search) > 120
    ))
    or (p_submitted_from is not null and p_submitted_to is not null
      and p_submitted_to <= p_submitted_from) then
    raise exception using errcode = '22023', message = 'GOVERNMENT_COMPLAINT_REQUEST_INVALID';
  end if;

  return query
  select
    complaint.id,
    complaint.complaint_number,
    complaint.category_id,
    complaints.complaint_category_display_name(
      complaint.category_id,
      complaint.custom_attributes
    ),
    complaint.current_status,
    complaint.submitted_at,
    complaint.updated_at,
    complaint.workflow_version,
    complaints.assignment_summary(assignment.id),
    jsonb_build_object(
      'isUnassigned', not complaints.assignment_has_current_verified_officer(
        assignment.id,
        current_timestamp
      ),
      'isReopened', complaint.current_status = 'reopened',
      'isTransferred', complaint.current_status = 'transferred',
      'isAwaitingCitizenVerification',
        complaint.current_status = 'citizen_verification_pending'
    )
  from complaints.complaints as complaint
  inner join complaints.complaint_assignments as assignment
    on assignment.complaint_id = complaint.id
   and assignment.status = 'active'
   and assignment.effective_to is null
  where complaints.actor_can_access_assignment(
      p_actor_user_id,
      assignment.id,
      'view',
      p_scope_role_assignment_id,
      current_timestamp
    )
    and (p_statuses is null or complaint.current_status = any(p_statuses))
    and (p_category_id is null or complaint.category_id = p_category_id)
    and (p_ward_id is null or assignment.ward_id = p_ward_id)
    and (
      p_authority_department_id is null
      or assignment.authority_department_id = p_authority_department_id
    )
    and (
      p_officer_assignment_id is null
      or (
        assignment.officer_assignment_id = p_officer_assignment_id
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
    )
    and (p_submitted_from is null or complaint.submitted_at >= p_submitted_from)
    and (p_submitted_to is null or complaint.submitted_at < p_submitted_to)
    and (
      p_search is null
      or complaint.complaint_number ilike '%' || btrim(p_search) || '%'
    )
    and (
      p_queue is null
      or (p_queue = 'new' and complaint.current_status = 'submitted')
      or (
        p_queue = 'unassigned'
        and not complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (
        p_queue = 'assigned'
        and complaints.assignment_has_current_verified_officer(
          assignment.id,
          current_timestamp
        )
      )
      or (p_queue = 'reopened' and complaint.current_status = 'reopened')
      or (p_queue = 'transferred' and complaint.current_status = 'transferred')
      or (
        p_queue = 'awaiting_citizen_verification'
        and complaint.current_status = 'citizen_verification_pending'
      )
    )
    and (
      p_before_submitted_at is null
      or (complaint.submitted_at, complaint.id) < (p_before_submitted_at, p_before_id)
    )
  order by complaint.submitted_at desc, complaint.id desc
  limit p_limit + 1;
end;
$$;

alter function public.get_government_complaint(uuid, uuid, uuid)
  rename to get_government_complaint_phase5_impl;
alter function public.get_government_complaint_phase5_impl(uuid, uuid, uuid)
  set schema private;

create function public.get_government_complaint(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (
  complaint_id uuid,
  complaint_number text,
  category_id uuid,
  category_name text,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz,
  workflow_version bigint,
  current_assignment jsonb,
  queue_flags jsonb,
  description text,
  longitude double precision,
  latitude double precision,
  accuracy_meters double precision,
  location_provider text,
  location_captured_at timestamptz,
  location_verification_status text,
  location_verification_score numeric,
  routing_summary jsonb,
  media jsonb,
  assignment_history jsonb,
  timeline jsonb,
  internal_notes jsonb,
  inspections jsonb,
  work_references jsonb,
  external_dependencies jsonb,
  resolution_evidence jsonb,
  allowed_actions text[],
  allowed_status_transitions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    implementation.complaint_id,
    implementation.complaint_number,
    implementation.category_id,
    complaints.complaint_category_display_name(
      implementation.category_id,
      complaint.custom_attributes
    ),
    implementation.status,
    implementation.submitted_at,
    implementation.updated_at,
    implementation.workflow_version,
    implementation.current_assignment,
    implementation.queue_flags,
    implementation.description,
    implementation.longitude,
    implementation.latitude,
    implementation.accuracy_meters,
    implementation.location_provider,
    implementation.location_captured_at,
    implementation.location_verification_status,
    implementation.location_verification_score,
    implementation.routing_summary,
    implementation.media,
    implementation.assignment_history,
    implementation.timeline,
    implementation.internal_notes,
    implementation.inspections,
    implementation.work_references,
    implementation.external_dependencies,
    implementation.resolution_evidence,
    implementation.allowed_actions,
    implementation.allowed_status_transitions
  from private.get_government_complaint_phase5_impl(
    p_actor_user_id,
    p_complaint_id,
    p_scope_role_assignment_id
  ) as implementation
  inner join complaints.complaints as complaint
    on complaint.id = implementation.complaint_id;
$$;

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
    complaints.complaint_category_display_name(
      complaint.category_id,
      complaint.custom_attributes
    ),
    ward.name,
    complaint.description,
    extensions.st_x(evidence.location),
    extensions.st_y(evidence.location),
    complaint.submitted_at,
    claimed.attempt_count
  from claimed
  inner join complaints.complaints as complaint on complaint.id = claimed.complaint_id
  inner join routing.issue_categories as route_profile
    on route_profile.id = claimed.category_id
  inner join governance.wards as ward on ward.id = claimed.ward_id
  inner join complaints.complaint_location_evidence as evidence
    on evidence.id = complaint.location_evidence_id
  order by claimed.queued_at, claimed.id;
end;
$$;

revoke all on function routing.validate_complaint_handoff_action()
  from public, anon, authenticated, service_role;
revoke all on function routing.validate_complaint_taxonomy_category()
  from public, anon, authenticated, service_role;
revoke all on function complaints.complaint_category_display_name(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.get_government_complaint_phase5_impl(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.list_complaint_taxonomy()
  from public, anon, authenticated, service_role;
grant execute on function public.list_complaint_taxonomy() to service_role;
revoke all on function public.list_owned_complaints(
  uuid, integer, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.list_owned_complaints(
  uuid, integer, timestamptz, uuid
) to service_role;
revoke all on function public.get_owned_complaint(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_owned_complaint(uuid, uuid)
  to service_role;
revoke all on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.list_government_complaints(
  uuid, integer, timestamptz, uuid, uuid, text, text[], uuid, uuid, uuid, uuid,
  timestamptz, timestamptz, text
) to service_role;
revoke all on function public.get_government_complaint(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_government_complaint(uuid, uuid, uuid)
  to service_role;
revoke all on function public.claim_v1_ward_emails(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_v1_ward_emails(text, integer, integer)
  to service_role;

comment on table routing.complaint_handoff_actions is
  'Private source-of-truth registry for official call/browser handoffs on protected taxonomy categories.';
comment on column routing.complaint_handoff_actions.target_value is
  'Public-safe digits-only telephone number or HTTPS URL; email and arbitrary URI targets are not supported.';
comment on column routing.complaint_handoff_actions.owner_approved_for_display is
  'Explicit approval to expose the sanitized handoff action through the trusted taxonomy API.';
comment on function complaints.complaint_category_display_name(uuid, jsonb) is
  'Returns the validated citizen taxonomy subcategory name, falling back to the operational routing-profile name.';
comment on function public.list_complaint_taxonomy() is
  'Returns taxonomy, fail-closed V1 ward-route readiness, and sanitized official handoff actions to the trusted API.';
comment on function public.claim_v1_ward_emails(text, integer, integer) is
  'Claims V1 ward-email jobs and uses the validated citizen taxonomy subcategory name when one is present.';
