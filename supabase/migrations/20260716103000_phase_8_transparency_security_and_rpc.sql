create function complaints.map_public_complaint_status(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_status in (
      'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned'
    ) then 'reported'
    when p_status = 'resolved' then 'resolved'
    when p_status in ('closed', 'rejected', 'cancelled') then 'closed'
    else 'in_progress'
  end;
$$;

create function complaints.actor_can_review_publication(
  p_actor_user_id uuid,
  p_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.user_has_active_role(
      p_actor_user_id,
      'platform_admin',
      'global',
      null
    )
    or private.user_has_active_role(
      p_actor_user_id,
      'moderator',
      'authority',
      p_authority_id
    );
$$;

create function complaints.validate_public_visibility_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_authority_id uuid;
begin
  if cardinality(new.allowed_complaint_statuses) not between 1 and 22
    or array_position(new.allowed_complaint_statuses, null) is not null
    or cardinality(new.allowed_complaint_statuses) <> (
      select count(distinct status_name)
      from unnest(new.allowed_complaint_statuses) as status_name
    )
    or exists (
      select 1
      from unnest(new.allowed_complaint_statuses) as status_name
      where status_name not in (
        'submitted', 'validation_pending', 'validated', 'routing_pending', 'assigned',
        'acknowledged', 'inspection_scheduled', 'inspection_completed',
        'work_order_created', 'work_in_progress', 'resolution_submitted',
        'citizen_verification_pending', 'resolved', 'closed', 'transferred',
        'waiting_for_material', 'waiting_for_external_agency', 'reopened',
        'rejected', 'cancelled', 'escalated'
      )
    ) then
    raise exception using
      errcode = '23514',
      message = 'PUBLIC_VISIBILITY_POLICY_CONFIGURATION_INVALID';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.public_visibility_policy_id is distinct from old.public_visibility_policy_id
      or new.version is distinct from old.version
      or new.allowed_complaint_statuses is distinct from old.allowed_complaint_statuses
      or new.minimum_hotspot_complaint_count
        is distinct from old.minimum_hotspot_complaint_count
      or new.effective_from is distinct from old.effective_from
      or new.created_at is distinct from old.created_at
      or new.approved_by_user_id is distinct from old.approved_by_user_id
      or new.approved_at is distinct from old.approved_at then
      raise exception using
        errcode = '55000',
        message = 'PUBLIC_VISIBILITY_POLICY_VERSION_IMMUTABLE';
    end if;

    if not (
      (old.status = 'draft' and new.status = 'approved' and new.effective_to is null)
      or (
        old.status = 'approved'
        and new.status = 'superseded'
        and new.effective_to is not null
        and new.effective_to >= clock_timestamp()
      )
    ) then
      raise exception using
        errcode = '55000',
        message = 'PUBLIC_VISIBILITY_POLICY_TRANSITION_INVALID';
    end if;
  end if;

  if new.status = 'approved' then
    if not exists (
      select 1
      from complaints.public_visibility_category_rules as category_rule
      where category_rule.public_visibility_policy_version_id = new.id
    ) then
      raise exception using
        errcode = '23514',
        message = 'PUBLIC_VISIBILITY_POLICY_CATEGORY_RULE_REQUIRED';
    end if;

    select local_body.authority_id into policy_authority_id
    from complaints.public_visibility_policies as policy
    inner join governance.local_bodies as local_body
      on local_body.id = policy.local_body_id
    where policy.id = new.public_visibility_policy_id;

    if policy_authority_id is null
      or not complaints.actor_can_review_publication(
        new.approved_by_user_id,
        policy_authority_id
      ) then
      raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
    end if;
  end if;

  return new;
end;
$$;

create function complaints.validate_public_visibility_category_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from complaints.public_visibility_policy_versions as policy_version
    where policy_version.id = new.public_visibility_policy_version_id
      and policy_version.status = 'draft'
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC_VISIBILITY_CATEGORY_RULE_PARENT_NOT_DRAFT';
  end if;
  return new;
end;
$$;

create function complaints.validate_complaint_publication_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_authority_id uuid;
begin
  if not exists (
    select 1
    from complaints.public_visibility_category_rules as category_rule
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = category_rule.public_visibility_policy_version_id
    inner join complaints.public_visibility_policies as policy
      on policy.id = policy_version.public_visibility_policy_id
    inner join governance.local_bodies as local_body
      on local_body.id = policy.local_body_id
    inner join complaints.complaints as complaint
      on complaint.id = new.complaint_id
    where category_rule.id = new.public_visibility_category_rule_id
      and policy_version.id = new.public_visibility_policy_version_id
      and category_rule.category_id = complaint.category_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_REVIEW_SCOPE_INVALID';
  end if;

  select local_body.authority_id into policy_authority_id
  from complaints.public_visibility_policy_versions as policy_version
  inner join complaints.public_visibility_policies as policy
    on policy.id = policy_version.public_visibility_policy_id
  inner join governance.local_bodies as local_body
    on local_body.id = policy.local_body_id
  where policy_version.id = new.public_visibility_policy_version_id;

  if not complaints.actor_can_review_publication(
    new.reviewer_user_id,
    policy_authority_id
  ) then
    raise exception using errcode = '42501', message = 'PUBLICATION_REVIEW_FORBIDDEN';
  end if;

  return new;
end;
$$;

create function complaints.validate_complaint_publication_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review complaints.complaint_publication_reviews%rowtype;
  prior complaints.complaint_publication_projections%rowtype;
  boundary governance.jurisdiction_boundary_versions%rowtype;
  expected_centroid extensions.geometry(Point, 4326);
  minimum_precision integer;
begin
  select candidate.* into review
  from complaints.complaint_publication_reviews as candidate
  where candidate.id = new.review_id;

  if review.id is null
    or review.complaint_id <> new.complaint_id
    or review.public_visibility_policy_version_id
      <> new.public_visibility_policy_version_id
    or review.public_visibility_category_rule_id
      <> new.public_visibility_category_rule_id
    or review.decision <> new.publication_state then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_REVIEW_INVALID';
  end if;

  select candidate.* into prior
  from complaints.complaint_publication_projections as candidate
  where candidate.complaint_id = new.complaint_id
  order by candidate.version desc
  limit 1;

  if prior.id is null then
    if new.version <> 1 or new.publication_state <> 'published' then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_PUBLICATION_PROJECTION_VERSION_INVALID';
    end if;
  elsif new.version <> prior.version + 1 or new.public_id <> prior.public_id then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_VERSION_INVALID';
  end if;

  if new.publication_state = 'withdrawn' then
    if prior.id is null or prior.publication_state <> 'published'
      or new.category_id <> prior.category_id
      or new.category_name <> prior.category_name
      or new.local_body_id <> prior.local_body_id
      or new.ward_id <> prior.ward_id
      or new.ward_boundary_version_id <> prior.ward_boundary_version_id
      or not extensions.st_equals(new.approximate_location, prior.approximate_location)
      or new.location_precision_meters <> prior.location_precision_meters
      or new.public_title <> prior.public_title
      or new.public_summary <> prior.public_summary
      or new.public_status <> prior.public_status
      or new.submitted_at <> prior.submitted_at
      or new.source_updated_at <> prior.source_updated_at
      or new.published_at <> prior.published_at then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_PUBLICATION_WITHDRAWAL_SNAPSHOT_INVALID';
    end if;
    return new;
  end if;

  if review.public_title <> new.public_title
    or review.public_summary <> new.public_summary then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_PROJECTION_CONTENT_INVALID';
  end if;

  if not exists (
    select 1
    from complaints.complaints as complaint
    inner join routing.issue_categories as category on category.id = complaint.category_id
    inner join complaints.complaint_assignments as assignment
      on assignment.complaint_id = complaint.id
      and assignment.status = 'active'
      and assignment.effective_to is null
    inner join complaints.public_visibility_category_rules as category_rule
      on category_rule.id = new.public_visibility_category_rule_id
    inner join complaints.public_visibility_policy_versions as policy_version
      on policy_version.id = new.public_visibility_policy_version_id
      and policy_version.id = category_rule.public_visibility_policy_version_id
    inner join complaints.public_visibility_policies as policy
      on policy.id = policy_version.public_visibility_policy_id
    where complaint.id = new.complaint_id
      and complaint.category_id = new.category_id
      and category.name = new.category_name
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and assignment.local_body_id = new.local_body_id
      and assignment.ward_id = new.ward_id
      and policy.local_body_id = assignment.local_body_id
      and policy_version.status = 'approved'
      and policy_version.effective_from <= new.event_at
      and (policy_version.effective_to is null or policy_version.effective_to > new.event_at)
      and complaint.current_status = any(policy_version.allowed_complaint_statuses)
      and category_rule.category_id = complaint.category_id
      and category_rule.publication_allowed
      and complaints.map_public_complaint_status(complaint.current_status) = new.public_status
      and complaint.submitted_at = new.submitted_at
      and complaint.updated_at = new.source_updated_at
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        new.event_at
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_SOURCE_INVALID';
  end if;

  select candidate.* into boundary
  from governance.jurisdiction_boundary_versions as candidate
  inner join governance.wards as ward on ward.id = candidate.ward_id
  inner join governance.local_bodies as local_body
    on local_body.id = ward.local_body_id
  where candidate.id = new.ward_boundary_version_id
    and candidate.ward_id = new.ward_id
    and ward.local_body_id = new.local_body_id
    and candidate.status = 'active'
    and candidate.verification_status = 'verified'
    and not candidate.is_placeholder
    and candidate.is_routing_eligible
    and candidate.effective_from <= new.event_at
    and (candidate.effective_to is null or candidate.effective_to > new.event_at)
    and ward.status = 'active'
    and ward.verification_status = 'verified'
    and not ward.is_placeholder
    and ward.is_routing_eligible
    and local_body.status = 'active'
    and local_body.verification_status = 'verified'
    and not local_body.is_placeholder
    and local_body.is_routing_eligible;

  if boundary.id is null then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_WARD_BOUNDARY_UNAVAILABLE';
  end if;

  expected_centroid := extensions.st_centroid(boundary.boundary);
  minimum_precision := ceil(greatest(
    1,
    extensions.st_maxdistance(
      extensions.st_transform(boundary.boundary, 3857),
      extensions.st_transform(expected_centroid, 3857)
    )
  ))::integer;

  if not extensions.st_equals(new.approximate_location, expected_centroid)
    or new.location_precision_meters < minimum_precision then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_PUBLICATION_APPROXIMATION_INVALID';
  end if;

  return new;
end;
$$;

create function complaints.validate_public_media_derivative_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.complaint_media_id is not null and not exists (
      select 1
      from complaints.complaint_media as media
      inner join complaints.complaints as complaint on complaint.draft_id = media.draft_id
      where media.id = new.complaint_media_id and complaint.id = new.complaint_id
    ))
    or (new.resolution_evidence_id is not null and not exists (
      select 1 from complaints.complaint_resolution_evidence as evidence
      where evidence.id = new.resolution_evidence_id
        and evidence.complaint_id = new.complaint_id
    ))
    or (new.reopen_evidence_id is not null and not exists (
      select 1 from complaints.complaint_reopen_evidence as evidence
      where evidence.id = new.reopen_evidence_id
        and evidence.complaint_id = new.complaint_id
    )) then
    raise exception using
      errcode = '23514',
      message = 'PUBLIC_MEDIA_DERIVATIVE_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

create trigger public_visibility_policies_append_only
before update or delete on complaints.public_visibility_policies
for each row execute function complaints.reject_append_only_mutation();

create trigger public_visibility_policy_versions_validate
before insert or update on complaints.public_visibility_policy_versions
for each row execute function complaints.validate_public_visibility_policy_version();

create trigger public_visibility_policy_versions_reject_delete
before delete on complaints.public_visibility_policy_versions
for each row execute function complaints.reject_append_only_mutation();

create trigger public_visibility_category_rules_validate
before insert on complaints.public_visibility_category_rules
for each row execute function complaints.validate_public_visibility_category_rule();

create trigger public_visibility_category_rules_append_only
before update or delete on complaints.public_visibility_category_rules
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_publication_reviews_validate
before insert on complaints.complaint_publication_reviews
for each row execute function complaints.validate_complaint_publication_review();

create trigger complaint_publication_reviews_append_only
before update or delete on complaints.complaint_publication_reviews
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_publication_projections_validate
before insert on complaints.complaint_publication_projections
for each row execute function complaints.validate_complaint_publication_projection();

create trigger complaint_publication_projections_append_only
before update or delete on complaints.complaint_publication_projections
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_duplicate_group_versions_append_only
before update or delete on complaints.complaint_duplicate_group_versions
for each row execute function complaints.reject_append_only_mutation();

create trigger complaint_duplicate_group_members_append_only
before update or delete on complaints.complaint_duplicate_group_members
for each row execute function complaints.reject_append_only_mutation();

create trigger public_media_derivatives_validate
before insert on complaints.public_media_derivatives
for each row execute function complaints.validate_public_media_derivative_scope();

create trigger public_media_derivatives_append_only
before update or delete on complaints.public_media_derivatives
for each row execute function complaints.reject_append_only_mutation();
