-- Keep the existing operational category identifiers stable while adding the
-- citizen-facing JagrukSetu taxonomy to the same private routing registry.
-- Taxonomy classification never grants routing eligibility: a subcategory can
-- submit only through an independently verified operational route profile.

alter table routing.issue_categories
  add column category_purpose text not null default 'routing_profile',
  add column taxonomy_code text,
  add column workflow_type text,
  add column sensitivity_class text,
  add column configuration_status text not null default 'legacy',
  add column routing_status text not null default 'legacy',
  add column routing_profile_category_id uuid
    references routing.issue_categories (id) on delete restrict,
  add column public_visibility_default boolean,
  add column comments_allowed boolean,
  add column community_support_allowed boolean,
  add constraint issue_categories_category_purpose_check check (
    category_purpose in (
      'routing_profile',
      'taxonomy_primary',
      'taxonomy_subcategory'
    )
  ),
  add constraint issue_categories_taxonomy_code_check check (
    taxonomy_code is null
    or taxonomy_code ~ '^[A-Z]{3}(-[0-9]{3})?$'
  ),
  add constraint issue_categories_workflow_type_check check (
    workflow_type is null
    or workflow_type in (
      'MAINTENANCE',
      'SERVICE_FAILURE',
      'PUBLIC_HEALTH',
      'ENVIRONMENTAL',
      'ENFORCEMENT',
      'SAFETY_HAZARD',
      'EMERGENCY',
      'FACILITY_SERVICE',
      'LAW_AND_ORDER',
      'CRIME_REPORT',
      'CYBER_INCIDENT',
      'WELFARE_PROTECTION',
      'ADMINISTRATIVE_GRIEVANCE',
      'CONSUMER_REGULATORY',
      'TRANSPORT_SERVICE',
      'DISASTER_RESPONSE',
      'INFORMATION_ACCESS',
      'ANIMAL_WELFARE',
      'ANTI_CORRUPTION'
    )
  ),
  add constraint issue_categories_sensitivity_class_check check (
    sensitivity_class is null
    or sensitivity_class in (
      'PUBLIC',
      'RESTRICTED',
      'PRIVATE',
      'EMERGENCY_PRIVATE'
    )
  ),
  add constraint issue_categories_configuration_status_check check (
    configuration_status in ('legacy', 'taxonomy_ready')
  ),
  add constraint issue_categories_routing_status_check check (
    routing_status in (
      'legacy',
      'mapped',
      'pending_verification',
      'protected_pending'
    )
  ),
  add constraint issue_categories_routing_profile_not_self_check check (
    routing_profile_category_id is distinct from id
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
      and routing_status in ('pending_verification', 'protected_pending')
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
          routing_status in ('pending_verification', 'protected_pending')
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

create unique index issue_categories_taxonomy_code_unique_idx
  on routing.issue_categories (taxonomy_code)
  where taxonomy_code is not null;

create index issue_categories_taxonomy_parent_idx
  on routing.issue_categories (category_purpose, parent_category_id, taxonomy_code)
  where category_purpose in ('taxonomy_primary', 'taxonomy_subcategory');

create index issue_categories_routing_profile_category_idx
  on routing.issue_categories (routing_profile_category_id)
  where routing_profile_category_id is not null;

create function routing.validate_complaint_taxonomy_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_record record;
  route_profile_record record;
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

  if new.category_purpose = 'taxonomy_primary' then
    if new.taxonomy_code = 'COR' and (
      new.sensitivity_class <> 'PRIVATE'
      or new.routing_status <> 'protected_pending'
      or new.routing_profile_category_id is not null
      or new.public_visibility_default
      or new.comments_allowed
      or new.community_support_allowed
    ) then
      raise exception using
        errcode = '23514',
        message = 'JAGRUKSETU_CORRUPTION_PRIMARY_MUST_REMAIN_PROTECTED';
    end if;

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

  if parent_record.taxonomy_code = 'COR' and (
    new.sensitivity_class <> 'PRIVATE'
    or new.workflow_type <> 'ANTI_CORRUPTION'
    or new.routing_status <> 'protected_pending'
    or new.routing_profile_category_id is not null
    or new.public_visibility_default
    or new.comments_allowed
    or new.community_support_allowed
  ) then
    raise exception using
      errcode = '23514',
      message = 'JAGRUKSETU_CORRUPTION_INTAKE_MUST_REMAIN_PROTECTED';
  end if;

  return new;
end;
$$;

create trigger issue_categories_validate_complaint_taxonomy
before insert or update of
  category_purpose,
  taxonomy_code,
  workflow_type,
  sensitivity_class,
  configuration_status,
  routing_status,
  routing_profile_category_id,
  public_visibility_default,
  comments_allowed,
  community_support_allowed,
  domain_id,
  parent_category_id,
  classification_level,
  is_routing_eligible
on routing.issue_categories
for each row execute function routing.validate_complaint_taxonomy_category();

-- Preserve the established operational-category catalogue. Citizen-facing
-- taxonomy records have a separate, deliberately narrower projection below.
create or replace function public.list_routing_categories(
  p_include_non_routable boolean default false
)
returns table (
  category_id uuid,
  domain_code text,
  category_code text,
  category_name text,
  description text,
  parent_category_id uuid,
  classification_level text,
  default_severity text,
  requires_asset boolean,
  requires_location boolean,
  location_requirement text,
  is_emergency boolean,
  minimum_media_count smallint,
  maximum_media_count smallint,
  required_attributes text[],
  media_requirements jsonb,
  verification_status text,
  is_placeholder boolean,
  is_routing_eligible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    category.id,
    domain.code,
    category.code,
    category.name,
    category.description,
    category.parent_category_id,
    category.classification_level,
    category.default_severity,
    category.requires_asset,
    category.requires_location,
    category.location_requirement,
    category.is_emergency,
    category.minimum_media_count,
    category.maximum_media_count,
    category.required_attributes,
    category.media_requirements,
    category.verification_status,
    category.is_placeholder,
    category.is_routing_eligible
  from routing.issue_categories as category
  inner join routing.issue_domains as domain on domain.id = category.domain_id
  where category.category_purpose = 'routing_profile'
    and (
      p_include_non_routable
      or (
        category.status = 'active'
        and category.verification_status = 'verified'
        and not category.is_placeholder
        and category.is_routing_eligible
        and domain.status = 'active'
        and domain.verification_status = 'verified'
        and not domain.is_placeholder
        and domain.is_routing_eligible
      )
    )
  order by domain.code, category.code;
$$;

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
  recommended_media_kinds text[]
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
    ),
    coalesce(route_profile.requires_asset, subcategory.requires_asset),
    coalesce(route_profile.requires_location, subcategory.requires_location),
    coalesce(route_profile.is_emergency, false) or subcategory.is_emergency,
    coalesce(route_profile.minimum_media_count, subcategory.minimum_media_count)::integer,
    coalesce(route_profile.maximum_media_count, subcategory.maximum_media_count)::integer,
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
    end
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

create function complaints.assert_taxonomy_selection(
  p_category_id uuid,
  p_custom_attributes jsonb
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  reserved_keys constant text[] := array[
    'taxonomy_primary_code',
    'taxonomy_subcategory_code',
    'taxonomy_workflow_type'
  ]::text[];
  has_taxonomy_selection boolean;
  taxonomy_record record;
begin
  has_taxonomy_selection := p_custom_attributes ?| reserved_keys;

  if not has_taxonomy_selection then
    if p_category_id is not null and exists (
      select 1
      from routing.issue_categories as category
      where category.id = p_category_id
        and category.category_purpose <> 'routing_profile'
    ) then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_TAXONOMY_SELECTION_REQUIRED';
    end if;

    return;
  end if;

  if not (p_custom_attributes ?& reserved_keys)
    or jsonb_typeof(p_custom_attributes -> 'taxonomy_primary_code') <> 'string'
    or jsonb_typeof(p_custom_attributes -> 'taxonomy_subcategory_code') <> 'string'
    or jsonb_typeof(p_custom_attributes -> 'taxonomy_workflow_type') <> 'string' then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_TAXONOMY_SELECTION_INCOMPLETE';
  end if;

  select
    subcategory.id,
    subcategory.workflow_type,
    subcategory.routing_profile_category_id,
    primary_category.taxonomy_code as primary_code
  into taxonomy_record
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
    and subcategory.status = 'active'
    and primary_category.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_TAXONOMY_SELECTION_INVALID';
  end if;

  if taxonomy_record.routing_profile_category_id is null then
    if p_category_id is not null then
      raise exception using
        errcode = '23514',
        message = 'COMPLAINT_TAXONOMY_ROUTE_PROFILE_NOT_AVAILABLE';
    end if;
  elsif p_category_id is distinct from taxonomy_record.routing_profile_category_id then
    raise exception using
      errcode = '23514',
      message = 'COMPLAINT_TAXONOMY_ROUTE_PROFILE_MISMATCH';
  end if;

  return;
end;
$$;

create function complaints.validate_draft_taxonomy_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform complaints.assert_taxonomy_selection(new.category_id, new.custom_attributes);
  return new;
end;
$$;

create function complaints.validate_submitted_complaint_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- This re-resolves the tuple at the final complaint insert, so a taxonomy
  -- mapping changed after draft save cannot silently submit through a stale
  -- operational route profile.
  perform complaints.assert_taxonomy_selection(new.category_id, new.custom_attributes);
  return new;
end;
$$;

create trigger complaint_drafts_validate_taxonomy_selection
before insert or update of category_id, custom_attributes
on complaints.complaint_drafts
for each row execute function complaints.validate_draft_taxonomy_selection();

create trigger complaints_validate_taxonomy_on_submission
before insert on complaints.complaints
for each row execute function complaints.validate_submitted_complaint_taxonomy();

revoke all on function routing.validate_complaint_taxonomy_category()
  from public, anon, authenticated, service_role;
revoke all on function complaints.assert_taxonomy_selection(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_draft_taxonomy_selection()
  from public, anon, authenticated, service_role;
revoke all on function complaints.validate_submitted_complaint_taxonomy()
  from public, anon, authenticated, service_role;
revoke all on function public.list_complaint_taxonomy()
  from public, anon, authenticated, service_role;
grant execute on function public.list_complaint_taxonomy() to service_role;

comment on column routing.issue_categories.category_purpose is
  'Separates operational routing profiles from citizen-facing taxonomy hierarchy records.';
comment on column routing.issue_categories.taxonomy_code is
  'Stable uppercase JagrukSetu taxonomy code; null for operational route profiles.';
comment on column routing.issue_categories.routing_profile_category_id is
  'Optional server-controlled mapping from a taxonomy subcategory to an operational route profile.';
comment on function public.list_complaint_taxonomy() is
  'Returns the sanitized two-level JagrukSetu complaint taxonomy and current route-profile readiness to the trusted API.';
comment on function complaints.validate_draft_taxonomy_selection() is
  'Validates the three reserved taxonomy custom attributes and their server-controlled operational category mapping.';
comment on function complaints.assert_taxonomy_selection(uuid, jsonb) is
  'Re-resolves a taxonomy tuple and asserts its current server-controlled operational category mapping.';
comment on function complaints.validate_submitted_complaint_taxonomy() is
  'Revalidates taxonomy mapping at the canonical final complaint insert to reject mapping drift.';
