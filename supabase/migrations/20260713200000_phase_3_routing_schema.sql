create schema if not exists routing;
revoke all on schema routing from public;

create table routing.issue_domains (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issue_domains_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint issue_domains_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint issue_domains_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 1000)
  ),
  constraint issue_domains_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint issue_domains_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint issue_domains_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint issue_domains_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint issue_domains_code_unique unique (code)
);

create table routing.issue_categories (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references routing.issue_domains (id) on delete restrict,
  parent_category_id uuid references routing.issue_categories (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  classification_level text not null default 'category',
  default_severity text not null default 'medium',
  requires_asset boolean not null default false,
  requires_location boolean not null default true,
  location_requirement text not null default 'required',
  is_emergency boolean not null default false,
  minimum_media_count smallint not null default 0,
  maximum_media_count smallint not null default 5,
  required_attributes text[] not null default '{}'::text[],
  media_requirements jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issue_categories_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint issue_categories_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint issue_categories_description_check check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 1000)
  ),
  constraint issue_categories_classification_level_check check (
    classification_level in ('category', 'subcategory', 'issue')
  ),
  constraint issue_categories_parent_shape_check check (
    (classification_level = 'category' and parent_category_id is null)
    or (classification_level in ('subcategory', 'issue') and parent_category_id is not null)
  ),
  constraint issue_categories_default_severity_check check (
    default_severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint issue_categories_location_requirement_check check (
    location_requirement in ('required', 'optional')
  ),
  constraint issue_categories_location_consistency_check check (
    requires_location = (location_requirement = 'required')
  ),
  constraint issue_categories_media_count_check check (
    minimum_media_count between 0 and 20
    and maximum_media_count between minimum_media_count and 20
  ),
  constraint issue_categories_media_requirements_check check (
    jsonb_typeof(media_requirements) = 'object'
  ),
  constraint issue_categories_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint issue_categories_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint issue_categories_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint issue_categories_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint issue_categories_parent_check check (parent_category_id is distinct from id),
  constraint issue_categories_code_unique unique (code)
);

create table routing.category_aliases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  alias text not null,
  alias_key text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_aliases_alias_check check (
    alias = btrim(alias) and char_length(alias) between 1 and 160
  ),
  constraint category_aliases_key_check check (alias_key ~ '^[a-z][a-z0-9_]{1,159}$'),
  constraint category_aliases_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint category_aliases_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint category_aliases_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint category_aliases_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint category_aliases_key_unique unique (alias_key)
);

create table routing.asset_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  matching_distance_meters double precision not null default 25,
  identifier_required boolean not null default false,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_types_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint asset_types_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint asset_types_matching_distance_check check (
    matching_distance_meters > 0 and matching_distance_meters <= 5000
  ),
  constraint asset_types_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_types_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_types_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_types_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_types_code_unique unique (code)
);

create table routing.category_asset_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  asset_type_id uuid not null references routing.asset_types (id) on delete restrict,
  requirement text not null default 'optional',
  match_priority smallint not null default 100,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_asset_types_requirement_check check (
    requirement in ('optional', 'required')
  ),
  constraint category_asset_types_priority_check check (match_priority between 0 and 32767),
  constraint category_asset_types_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint category_asset_types_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint category_asset_types_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint category_asset_types_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint category_asset_types_unique unique (category_id, asset_type_id)
);

create table routing.assets (
  id uuid primary key default gen_random_uuid(),
  asset_type_id uuid not null references routing.asset_types (id) on delete restrict,
  asset_key text not null,
  external_identifier text,
  display_name text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_key_check check (
    asset_key = btrim(asset_key) and asset_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint assets_external_identifier_check check (
    external_identifier is null
    or (
      external_identifier = btrim(external_identifier)
      and char_length(external_identifier) between 1 and 240
    )
  ),
  constraint assets_display_name_check check (
    display_name is null
    or (display_name = btrim(display_name) and char_length(display_name) between 1 and 240)
  ),
  constraint assets_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint assets_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint assets_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint assets_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint assets_key_unique unique (asset_key)
);

create table routing.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references routing.assets (id) on delete restrict,
  version integer not null,
  district_id uuid references governance.districts (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  location extensions.geometry(Geometry, 4326) not null,
  attributes jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_versions_version_check check (version >= 1),
  constraint asset_versions_attributes_check check (jsonb_typeof(attributes) = 'object'),
  constraint asset_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint asset_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint asset_versions_valid_geometry_check check (
    not extensions.st_isempty(location) and extensions.st_isvalid(location)
  ),
  constraint asset_versions_coordinate_envelope_check check (
    extensions.st_xmin(extensions.box3d(location)) >= -180
    and extensions.st_xmax(extensions.box3d(location)) <= 180
    and extensions.st_ymin(extensions.box3d(location)) >= -90
    and extensions.st_ymax(extensions.box3d(location)) <= 90
  ),
  constraint asset_versions_asset_version_unique unique (asset_id, version)
);

create table routing.asset_ownership_versions (
  id uuid primary key default gen_random_uuid(),
  ownership_key text not null,
  version integer not null,
  asset_id uuid not null references routing.assets (id) on delete restrict,
  owner_authority_id uuid not null references governance.authorities (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  office_id uuid references governance.offices (id) on delete restrict,
  officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_ownership_versions_key_check check (
    ownership_key = btrim(ownership_key)
    and ownership_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint asset_ownership_versions_version_check check (version >= 1),
  constraint asset_ownership_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint asset_ownership_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint asset_ownership_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint asset_ownership_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint asset_ownership_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint asset_ownership_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint asset_ownership_versions_key_version_unique unique (ownership_key, version)
);

create table routing.confidence_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confidence_policies_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint confidence_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint confidence_policies_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint confidence_policies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint confidence_policies_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint confidence_policies_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint confidence_policies_code_unique unique (code)
);

create table routing.confidence_policy_versions (
  id uuid primary key default gen_random_uuid(),
  confidence_policy_id uuid not null
    references routing.confidence_policies (id) on delete restrict,
  version integer not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  automatic_threshold numeric(7, 6) not null,
  manual_review_threshold numeric(7, 6) not null,
  ambiguity_delta numeric(7, 6) not null,
  fallback_penalty_per_level numeric(7, 6) not null,
  factors jsonb not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confidence_policy_versions_version_check check (version >= 1),
  constraint confidence_policy_versions_thresholds_check check (
    automatic_threshold between 0 and 1
    and manual_review_threshold between 0 and 1
    and automatic_threshold >= manual_review_threshold
    and ambiguity_delta between 0 and 1
    and fallback_penalty_per_level between 0 and 1
  ),
  constraint confidence_policy_versions_factors_check check (
    jsonb_typeof(factors) = 'array' and jsonb_array_length(factors) > 0
  ),
  constraint confidence_policy_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint confidence_policy_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint confidence_policy_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint confidence_policy_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint confidence_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint confidence_policy_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint confidence_policy_versions_policy_version_unique unique (
    confidence_policy_id,
    version
  )
);

create table routing.duplicate_detection_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_detection_policies_code_check check (
    code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint duplicate_detection_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint duplicate_detection_policies_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint duplicate_detection_policies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint duplicate_detection_policies_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint duplicate_detection_policies_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint duplicate_detection_policies_code_unique unique (code)
);

create table routing.duplicate_detection_policy_versions (
  id uuid primary key default gen_random_uuid(),
  duplicate_detection_policy_id uuid not null
    references routing.duplicate_detection_policies (id) on delete restrict,
  version integer not null,
  category_id uuid references routing.issue_categories (id) on delete restrict,
  maximum_distance_meters double precision not null,
  maximum_age_seconds integer not null,
  minimum_score numeric(7, 6) not null,
  maximum_results smallint not null,
  weights jsonb not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_detection_policy_versions_version_check check (version >= 1),
  constraint duplicate_detection_policy_versions_distance_check check (
    maximum_distance_meters > 0 and maximum_distance_meters <= 50000
  ),
  constraint duplicate_detection_policy_versions_age_check check (maximum_age_seconds > 0),
  constraint duplicate_detection_policy_versions_score_check check (minimum_score between 0 and 1),
  constraint duplicate_detection_policy_versions_results_check check (
    maximum_results between 1 and 100
  ),
  constraint duplicate_detection_policy_versions_weights_check check (
    jsonb_typeof(weights) = 'object'
  ),
  constraint duplicate_detection_policy_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint duplicate_detection_policy_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint duplicate_detection_policy_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint duplicate_detection_policy_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint duplicate_detection_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint duplicate_detection_policy_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint duplicate_detection_policy_versions_policy_version_unique unique (
    duplicate_detection_policy_id,
    version
  )
);

create table routing.route_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  rule_code text not null,
  name text not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_rules_code_check check (
    rule_code = btrim(rule_code) and rule_code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'
  ),
  constraint route_rules_name_check check (
    name = btrim(name) and char_length(name) between 1 and 200
  ),
  constraint route_rules_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint route_rules_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint route_rules_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint route_rules_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint route_rules_code_unique unique (rule_code)
);

create table routing.route_rule_versions (
  id uuid primary key default gen_random_uuid(),
  route_rule_id uuid not null references routing.route_rules (id) on delete restrict,
  version integer not null,
  scope_authority_id uuid references governance.authorities (id) on delete restrict,
  scope_local_body_id uuid references governance.local_bodies (id) on delete restrict,
  scope_ward_id uuid references governance.wards (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  target_authority_id uuid references governance.authorities (id) on delete restrict,
  target_department_id uuid references governance.departments (id) on delete restrict,
  target_officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  target_office_id uuid references governance.offices (id) on delete restrict,
  confidence_policy_version_id uuid
    references routing.confidence_policy_versions (id) on delete restrict,
  asset_requirement text not null default 'none',
  requires_asset_owner boolean not null default false,
  priority integer not null default 100,
  fallback_depth smallint not null default 0,
  fallback_path uuid[] not null default '{}'::uuid[],
  confidence_factor_codes text[] not null default '{}'::text[],
  explanation_code text not null,
  routing_notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  source_routing_reference_id uuid
    references governance.complaint_routing_references (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_rule_versions_version_check check (version >= 1),
  constraint route_rule_versions_asset_requirement_check check (
    asset_requirement in ('none', 'preferred', 'required')
  ),
  constraint route_rule_versions_asset_owner_requirement_check check (
    not requires_asset_owner or asset_requirement <> 'none'
  ),
  constraint route_rule_versions_priority_check check (priority >= 0),
  constraint route_rule_versions_fallback_depth_check check (
    fallback_depth between 0 and 32 and cardinality(fallback_path) = fallback_depth
  ),
  constraint route_rule_versions_explanation_code_check check (
    explanation_code ~ '^[a-z][a-z0-9_]{1,119}$'
  ),
  constraint route_rule_versions_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint route_rule_versions_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint route_rule_versions_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint route_rule_versions_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and target_department_id is not null
      and target_officer_role_id is not null
      and confidence_policy_version_id is not null
      and last_verified_on is not null
      and reference_source_id is not null
    )
  ),
  constraint route_rule_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint route_rule_versions_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint route_rule_versions_rule_version_unique unique (route_rule_id, version)
);

create table routing.routing_decisions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  request_id text not null,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  input_location extensions.geometry(Point, 4326) not null,
  accuracy_meters double precision not null,
  captured_at timestamptz not null,
  resolved_at timestamptz not null,
  decision_status text not null,
  confidence_score numeric(7, 6),
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  state_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  district_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  taluka_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  local_body_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  ward_boundary_version_id uuid
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  asset_type_id uuid references routing.asset_types (id) on delete restrict,
  asset_id uuid references routing.assets (id) on delete restrict,
  asset_version_id uuid references routing.asset_versions (id) on delete restrict,
  asset_match_distance_meters double precision,
  asset_ownership_version_id uuid
    references routing.asset_ownership_versions (id) on delete restrict,
  target_authority_id uuid references governance.authorities (id) on delete restrict,
  department_id uuid references governance.departments (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  officer_assignment_id uuid references governance.officer_assignments (id) on delete restrict,
  route_rule_id uuid references routing.route_rules (id) on delete restrict,
  route_rule_version_id uuid references routing.route_rule_versions (id) on delete restrict,
  confidence_policy_version_id uuid
    references routing.confidence_policy_versions (id) on delete restrict,
  fallback_depth smallint not null default 0,
  explanation_codes text[] not null default '{}'::text[],
  explanation_metadata jsonb not null default '{}'::jsonb,
  ambiguity_count smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint routing_decisions_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint routing_decisions_status_check check (
    decision_status in ('routed', 'manual_review', 'mapping_required', 'unsupported_area')
  ),
  constraint routing_decisions_confidence_check check (
    confidence_score is null or confidence_score between 0 and 1
  ),
  constraint routing_decisions_accuracy_check check (
    accuracy_meters >= 0 and accuracy_meters <= 5000
  ),
  constraint routing_decisions_capture_time_check check (
    captured_at <= resolved_at + interval '2 minutes'
  ),
  constraint routing_decisions_explanation_metadata_check check (
    jsonb_typeof(explanation_metadata) = 'object'
    and not (
      explanation_metadata
        ?| array[
          'officerName',
          'officerPhone',
          'officerEmail',
          'contactValue',
          'complaintText',
          'description'
        ]
    )
  ),
  constraint routing_decisions_fallback_depth_check check (fallback_depth between 0 and 32),
  constraint routing_decisions_asset_distance_check check (
    asset_match_distance_meters is null or asset_match_distance_meters >= 0
  ),
  constraint routing_decisions_geographic_version_shape_check check (
    (state_id is null or local_body_id is not null)
    and (district_id is null) = (district_boundary_version_id is null)
    and (taluka_id is null) = (taluka_boundary_version_id is null)
    and (local_body_id is null) = (local_body_boundary_version_id is null)
    and (ward_id is null) = (ward_boundary_version_id is null)
    and (state_boundary_version_id is null or state_id is not null)
  ),
  constraint routing_decisions_asset_shape_check check (
    (
      asset_type_id is null
      and asset_id is null
      and asset_version_id is null
      and asset_match_distance_meters is null
      and asset_ownership_version_id is null
    )
    or (
      asset_type_id is not null
      and asset_id is not null
      and asset_version_id is not null
      and asset_match_distance_meters is not null
    )
  ),
  constraint routing_decisions_outcome_shape_check check (
    (
      decision_status = 'routed'
      and confidence_score is not null
      and state_id is not null
      and local_body_id is not null
      and local_body_boundary_version_id is not null
      and target_authority_id is not null
      and department_id is not null
      and authority_department_id is not null
      and officer_role_id is not null
      and route_rule_id is not null
      and route_rule_version_id is not null
      and confidence_policy_version_id is not null
    )
    or (
      decision_status <> 'routed'
      and asset_type_id is null
      and asset_id is null
      and asset_version_id is null
      and asset_match_distance_meters is null
      and asset_ownership_version_id is null
      and target_authority_id is null
      and department_id is null
      and authority_department_id is null
      and officer_role_id is null
      and officer_assignment_id is null
      and route_rule_id is null
      and route_rule_version_id is null
    )
  ),
  constraint routing_decisions_ambiguity_count_check check (
    ambiguity_count between 0 and 32767
  ),
  constraint routing_decisions_valid_location_check check (
    not extensions.st_isempty(input_location)
    and extensions.st_x(input_location) between -180 and 180
    and extensions.st_y(input_location) between -90 and 90
  ),
  constraint routing_decisions_actor_request_unique unique (actor_user_id, request_id)
);

alter table routing.asset_versions
  add constraint asset_versions_no_effective_overlap
  exclude using gist (
    asset_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.asset_ownership_versions
  add constraint asset_ownership_versions_no_effective_overlap
  exclude using gist (
    ownership_key with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.confidence_policy_versions
  add constraint confidence_policy_versions_no_effective_overlap
  exclude using gist (
    confidence_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.duplicate_detection_policy_versions
  add constraint duplicate_detection_policy_versions_no_effective_overlap
  exclude using gist (
    duplicate_detection_policy_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table routing.route_rule_versions
  add constraint route_rule_versions_no_effective_overlap
  exclude using gist (
    route_rule_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index assets_external_identifier_unique_idx
  on routing.assets (asset_type_id, external_identifier)
  where external_identifier is not null;
create index asset_versions_geometry_gix
  on routing.asset_versions using gist (location);
create index asset_versions_geography_gix
  on routing.asset_versions using gist ((location::extensions.geography));
create index asset_versions_scope_effective_idx
  on routing.asset_versions (local_body_id, ward_id, status, effective_from, effective_to);
create unique index asset_versions_one_current_idx
  on routing.asset_versions (asset_id)
  where effective_to is null and status = 'active';
create index asset_ownership_versions_asset_effective_idx
  on routing.asset_ownership_versions (asset_id, status, effective_from, effective_to);
create unique index asset_ownership_versions_one_current_idx
  on routing.asset_ownership_versions (ownership_key)
  where effective_to is null and status = 'active';
create unique index confidence_policy_versions_one_current_idx
  on routing.confidence_policy_versions (confidence_policy_id)
  where effective_to is null and status = 'active';
create unique index duplicate_detection_policy_versions_one_current_idx
  on routing.duplicate_detection_policy_versions (duplicate_detection_policy_id)
  where effective_to is null and status = 'active';
create index route_rule_versions_lookup_idx
  on routing.route_rule_versions (
    route_rule_id,
    status,
    priority,
    fallback_depth,
    effective_from,
    effective_to
  );
create unique index route_rule_versions_one_current_idx
  on routing.route_rule_versions (route_rule_id)
  where effective_to is null and status = 'active';
create index routing_decisions_request_idx on routing.routing_decisions (request_id, created_at desc);
create index routing_decisions_category_time_idx
  on routing.routing_decisions (category_id, created_at desc);
create index routing_decisions_location_gix
  on routing.routing_decisions using gist (input_location);

create function routing.validate_category_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_domain_id uuid;
  parent_level text;
begin
  if new.parent_category_id is not null then
    select category.domain_id, category.classification_level
    into parent_domain_id, parent_level
    from routing.issue_categories as category
    where category.id = new.parent_category_id;

    if not found then
      raise exception using errcode = '23503', message = 'ROUTING_CATEGORY_PARENT_NOT_FOUND';
    end if;
    if parent_domain_id <> new.domain_id then
      raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_DOMAIN_MISMATCH';
    end if;
    if new.classification_level = 'subcategory' and parent_level <> 'category' then
      raise exception using errcode = '23514', message = 'ROUTING_SUBCATEGORY_PARENT_INVALID';
    end if;
    if new.classification_level = 'issue' and parent_level not in ('category', 'subcategory') then
      raise exception using errcode = '23514', message = 'ROUTING_ISSUE_PARENT_INVALID';
    end if;
    if exists (
      with recursive ancestors as (
        select category.id, category.parent_category_id
        from routing.issue_categories as category
        where category.id = new.parent_category_id
        union all
        select parent.id, parent.parent_category_id
        from routing.issue_categories as parent
        inner join ancestors on ancestors.parent_category_id = parent.id
      )
      select 1 from ancestors where id = new.id
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_CYCLE';
    end if;
  end if;

  if new.is_routing_eligible and (
    not exists (
      select 1
      from routing.issue_domains as domain
      where domain.id = new.domain_id
        and domain.status = 'active'
        and domain.verification_status = 'verified'
        and not domain.is_placeholder
        and domain.is_routing_eligible
    )
    or exists (
      with recursive ancestors as (
        select category.*
        from routing.issue_categories as category
        where category.id = new.parent_category_id
        union all
        select parent.*
        from routing.issue_categories as parent
        inner join ancestors on ancestors.parent_category_id = parent.id
      )
      select 1
      from ancestors
      where domain_id <> new.domain_id
        or status <> 'active'
        or verification_status <> 'verified'
        or is_placeholder
        or not is_routing_eligible
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_ANCESTOR_NOT_ELIGIBLE';
  end if;

  if tg_op = 'UPDATE' and exists (
    with recursive descendants as (
      select child.id, child.is_routing_eligible
      from routing.issue_categories as child
      where child.parent_category_id = new.id
      union all
      select child.id, child.is_routing_eligible
      from routing.issue_categories as child
      inner join descendants on child.parent_category_id = descendants.id
    )
    select 1 from descendants where is_routing_eligible
  ) and (
    new.status <> 'active'
    or new.verification_status <> 'verified'
    or new.is_placeholder
    or not new.is_routing_eligible
    or new.domain_id is distinct from old.domain_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_ACTIVE_CHILD_INVALIDATED';
  end if;
  if tg_op = 'UPDATE'
    and (
      new.domain_id is distinct from old.domain_id
      or new.classification_level is distinct from old.classification_level
    )
    and exists (
      select 1 from routing.issue_categories as child
      where child.parent_category_id = new.id
    ) then
    raise exception using errcode = '23514', message = 'ROUTING_CATEGORY_PARENT_SHAPE_IMMUTABLE';
  end if;

  return new;
end;
$$;

create function routing.validate_asset_version_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.local_body_districts as local_body_district
    where local_body_district.local_body_id = new.local_body_id
      and local_body_district.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_DISTRICT_SCOPE_INVALID';
  end if;
  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.ward_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_WARD_SCOPE_INVALID';
  end if;

  return new;
end;
$$;

create function routing.guard_durable_identity_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  immutable_column text;
begin
  foreach immutable_column in array tg_argv
  loop
    if to_jsonb(new) -> immutable_column is distinct from to_jsonb(old) -> immutable_column then
      raise exception using
        errcode = '55000',
        message = format(
          '%I.%I durable identity column %I is immutable.',
          tg_table_schema,
          tg_table_name,
          immutable_column
        );
    end if;
  end loop;

  return new;
end;
$$;

create function routing.validate_asset_ownership_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.authority_department_id is not null and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.owner_authority_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_OWNER_DEPARTMENT_INVALID';
  end if;
  if new.office_id is not null and not exists (
    select 1
    from governance.offices as office
    where office.id = new.office_id and office.authority_id = new.owner_authority_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_ASSET_OWNER_OFFICE_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_route_rule_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule_category_id uuid;
  scoped_authority_id uuid;
  category_requires_asset boolean;
  stable_rule_is_eligible boolean;
begin
  select
    rule.category_id,
    category.requires_asset,
    rule.status = 'active'
      and rule.verification_status = 'verified'
      and not rule.is_placeholder
      and rule.is_routing_eligible
  into rule_category_id, category_requires_asset, stable_rule_is_eligible
  from routing.route_rules as rule
  inner join routing.issue_categories as category on category.id = rule.category_id
  where rule.id = new.route_rule_id;

  if not found then
    raise exception using errcode = '23503', message = 'ROUTING_RULE_NOT_FOUND';
  end if;
  if new.is_routing_eligible and not stable_rule_is_eligible then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_IDENTITY_NOT_ELIGIBLE';
  end if;
  if new.scope_ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.scope_ward_id
      and (new.scope_local_body_id is null or ward.local_body_id = new.scope_local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_WARD_SCOPE_INVALID';
  end if;
  if new.scope_local_body_id is not null then
    select local_body.authority_id into scoped_authority_id
    from governance.local_bodies as local_body
    where local_body.id = new.scope_local_body_id;
    if new.scope_authority_id is not null and scoped_authority_id <> new.scope_authority_id then
      raise exception using errcode = '23514', message = 'ROUTING_RULE_AUTHORITY_SCOPE_INVALID';
    end if;
  end if;
  if new.asset_id is not null and not exists (
    select 1
    from routing.assets as asset
    where asset.id = new.asset_id
      and (new.asset_type_id is null or asset.asset_type_id = new.asset_type_id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_TYPE_INVALID';
  end if;
  if new.route_rule_id = any(new.fallback_path) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_SELF_REFERENCE';
  end if;
  if (
    select count(*) from unnest(new.fallback_path) as fallback_rule_id
  ) <> (
    select count(distinct fallback_rule_id)
    from unnest(new.fallback_path) as fallback_rule_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_DUPLICATE';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) as fallback_rule_id
    where not exists (
      select 1 from routing.route_rules as fallback_rule
      where fallback_rule.id = fallback_rule_id
    )
  ) then
    raise exception using errcode = '23503', message = 'ROUTING_RULE_FALLBACK_NOT_FOUND';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) as fallback_rule_id
    inner join routing.route_rules as fallback_rule on fallback_rule.id = fallback_rule_id
    where fallback_rule.category_id <> rule_category_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CATEGORY_MISMATCH';
  end if;
  if exists (
    select 1
    from unnest(new.fallback_path) with ordinality as fallback_rule(fallback_rule_id, path_position)
    where not exists (
      select 1
      from routing.route_rule_versions as fallback_version
      where fallback_version.route_rule_id = fallback_rule.fallback_rule_id
        and fallback_version.status in ('draft', 'active')
        and fallback_version.effective_from <= new.effective_from
        and (
          fallback_version.effective_to is null
          or fallback_version.effective_to > new.effective_from
        )
        and fallback_version.fallback_depth = fallback_rule.path_position - 1
        and fallback_version.fallback_path = case
          when fallback_rule.path_position = 1 then '{}'::uuid[]
          else new.fallback_path[1:(fallback_rule.path_position - 1)::integer]
        end
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CHAIN_INVALID';
  end if;
  if exists (
    with recursive fallback_graph(rule_id) as (
      select fallback_rule_id
      from unnest(new.fallback_path) as fallback_rule_id
      union
      select nested_rule_id
      from fallback_graph
      inner join routing.route_rule_versions as fallback_version
        on fallback_version.route_rule_id = fallback_graph.rule_id
        and fallback_version.status in ('draft', 'active')
        and fallback_version.effective_to is null
      cross join lateral unnest(fallback_version.fallback_path) as nested_rule_id
    )
    select 1 from fallback_graph where rule_id = new.route_rule_id
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_FALLBACK_CYCLE';
  end if;
  if (
    select count(*) from unnest(new.confidence_factor_codes) as factor_code
  ) <> (
    select count(distinct factor_code)
    from unnest(new.confidence_factor_codes) as factor_code
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_FACTOR_DUPLICATE';
  end if;
  if new.target_office_id is not null
    and new.target_authority_id is not null
    and not exists (
      select 1 from governance.offices as office
      where office.id = new.target_office_id
        and office.authority_id = new.target_authority_id
    ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_TARGET_OFFICE_INVALID';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from routing.issue_categories as category
    inner join routing.issue_domains as domain on domain.id = category.domain_id
    where category.id = rule_category_id
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
      and domain.status = 'active'
      and domain.verification_status = 'verified'
      and not domain.is_placeholder
      and domain.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CATEGORY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and category_requires_asset and new.asset_requirement <> 'required' then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_REQUIRED_ASSET_MISSING';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from governance.departments as department
    where department.id = new.target_department_id
      and department.status = 'active'
      and department.verification_status = 'verified'
      and not department.is_placeholder
      and department.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_DEPARTMENT_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from governance.officer_roles as officer_role
    where officer_role.id = new.target_officer_role_id
      and officer_role.status = 'active'
      and officer_role.verification_status = 'verified'
      and not officer_role.is_placeholder
      and officer_role.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_OFFICER_ROLE_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and not exists (
    select 1
    from routing.confidence_policy_versions as policy_version
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where policy_version.id = new.confidence_policy_version_id
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
      and policy_version.effective_from <= new.effective_from
      and (
        policy_version.effective_to is null
        or policy_version.effective_to > new.effective_from
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_POLICY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and exists (
    select 1
    from unnest(new.confidence_factor_codes) as factor_code
    where not exists (
      select 1
      from routing.confidence_policy_versions as policy_version
      cross join lateral jsonb_array_elements(policy_version.factors) as factor
      where policy_version.id = new.confidence_policy_version_id
        and factor ->> 'code' = factor_code
    )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_CONFIDENCE_FACTOR_UNKNOWN';
  end if;
  if new.is_routing_eligible and new.target_authority_id is not null
    and not private.is_verified_governance_authority(new.target_authority_id) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_TARGET_AUTHORITY_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and new.asset_type_id is not null and not exists (
    select 1 from routing.asset_types as asset_type
    where asset_type.id = new.asset_type_id
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_TYPE_NOT_ELIGIBLE';
  end if;
  if new.is_routing_eligible and new.asset_id is not null and not exists (
    select 1 from routing.assets as asset
    where asset.id = new.asset_id
      and asset.status = 'active'
      and asset.verification_status = 'verified'
      and not asset.is_placeholder
      and asset.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_RULE_ASSET_NOT_ELIGIBLE';
  end if;

  return new;
end;
$$;

create function routing.validate_confidence_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_routing_eligible then
    return new;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.factors) as factor
    where jsonb_typeof(factor) <> 'object'
      or coalesce(factor ->> 'code', '') !~ '^[a-z][a-z0-9_]{1,79}$'
      or jsonb_typeof(factor -> 'weight') <> 'number'
      or jsonb_typeof(factor -> 'required') <> 'boolean'
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTORS_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.factors) as factor
    where (factor ->> 'weight')::numeric < 0
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_WEIGHT_INVALID';
  end if;
  if (
    select count(*) from jsonb_array_elements(new.factors) as factor
  ) <> (
    select count(distinct factor ->> 'code')
    from jsonb_array_elements(new.factors) as factor
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_DUPLICATE';
  end if;
  if coalesce((
    select sum((factor ->> 'weight')::numeric)
    from jsonb_array_elements(new.factors) as factor
  ), 0) <= 0 then
    raise exception using errcode = '23514', message = 'ROUTING_CONFIDENCE_FACTOR_WEIGHT_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_duplicate_detection_policy_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  weight_key text;
  total_weight numeric := 0;
begin
  if not new.is_routing_eligible then
    return new;
  end if;

  if not (new.weights ?& array['category', 'location', 'time', 'description', 'media', 'asset'])
    or new.weights - array['category', 'location', 'time', 'description', 'media', 'asset']
      <> '{}'::jsonb then
    raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHTS_KEYS_INVALID';
  end if;
  foreach weight_key in array array['category', 'location', 'time', 'description', 'media', 'asset']
  loop
    if jsonb_typeof(new.weights -> weight_key) <> 'number' then
      raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_INVALID';
    end if;
    if (new.weights ->> weight_key)::numeric < 0 then
      raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_INVALID';
    end if;
    total_weight := total_weight + (new.weights ->> weight_key)::numeric;
  end loop;
  if total_weight <= 0 then
    raise exception using errcode = '23514', message = 'ROUTING_DUPLICATE_WEIGHT_TOTAL_INVALID';
  end if;

  return new;
end;
$$;

create function routing.validate_routing_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  route_context record;
  ownership_context record;
  asset_context record;
  expected_target_authority_id uuid;
  expected_department_id uuid;
  expected_officer_role_id uuid;
  expected_office_id uuid;
begin
  select
    null::uuid as owner_authority_id,
    null::uuid as authority_department_id,
    null::uuid as department_id,
    null::uuid as office_id,
    null::uuid as officer_role_id
  into ownership_context;

  if new.state_id is not null and not exists (
    select 1
    from governance.states as state
    where state.id = new.state_id
      and state.status = 'active'
      and state.verification_status = 'verified'
      and not state.is_placeholder
      and state.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_STATE_INVALID';
  end if;
  if new.local_body_id is not null and not exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = new.local_body_id
      and local_body.state_id = new.state_id
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_LOCAL_BODY_INVALID';
  end if;
  if new.district_id is not null and not exists (
    select 1
    from governance.districts as district
    inner join governance.local_body_districts as local_body_district
      on local_body_district.district_id = district.id
      and local_body_district.local_body_id = new.local_body_id
    where district.id = new.district_id
      and district.state_id = new.state_id
      and district.status = 'active'
      and district.verification_status = 'verified'
      and not district.is_placeholder
      and district.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_DISTRICT_INVALID';
  end if;
  if new.taluka_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    where taluka.id = new.taluka_id
      and taluka.district_id = new.district_id
      and taluka.status = 'active'
      and taluka.verification_status = 'verified'
      and not taluka.is_placeholder
      and taluka.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TALUKA_INVALID';
  end if;
  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    where ward.id = new.ward_id
      and ward.local_body_id = new.local_body_id
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_WARD_INVALID';
  end if;

  if new.state_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.state_boundary_version_id
      and boundary.state_id = new.state_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_STATE_BOUNDARY_INVALID';
  end if;
  if new.district_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.district_boundary_version_id
      and boundary.district_id = new.district_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_DISTRICT_BOUNDARY_INVALID';
  end if;
  if new.taluka_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.taluka_boundary_version_id
      and boundary.taluka_id = new.taluka_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TALUKA_BOUNDARY_INVALID';
  end if;
  if new.local_body_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.local_body_boundary_version_id
      and boundary.local_body_id = new.local_body_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_LOCAL_BODY_BOUNDARY_INVALID';
  end if;
  if new.ward_boundary_version_id is not null and not exists (
    select 1
    from governance.jurisdiction_boundary_versions as boundary
    where boundary.id = new.ward_boundary_version_id
      and boundary.ward_id = new.ward_id
      and boundary.status = 'active'
      and boundary.verification_status = 'verified'
      and not boundary.is_placeholder
      and boundary.is_routing_eligible
      and boundary.effective_from <= new.resolved_at
      and (boundary.effective_to is null or boundary.effective_to > new.resolved_at)
      and extensions.st_dwithin(
        boundary.boundary::extensions.geography,
        new.input_location::extensions.geography,
        new.accuracy_meters
      )
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_WARD_BOUNDARY_INVALID';
  end if;

  if new.confidence_policy_version_id is not null and not exists (
    select 1
    from routing.confidence_policy_versions as policy_version
    inner join routing.confidence_policies as policy
      on policy.id = policy_version.confidence_policy_id
    where policy_version.id = new.confidence_policy_version_id
      and (policy_version.category_id is null or policy_version.category_id = new.category_id)
      and policy_version.status = 'active'
      and policy_version.verification_status = 'verified'
      and not policy_version.is_placeholder
      and policy_version.is_routing_eligible
      and policy_version.effective_from <= new.resolved_at
      and (policy_version.effective_to is null or policy_version.effective_to > new.resolved_at)
      and policy.status = 'active'
      and policy.verification_status = 'verified'
      and not policy.is_placeholder
      and policy.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_CONFIDENCE_POLICY_INVALID';
  end if;

  if not (
    new.explanation_metadata
      ?& array[
        'policyVersionId',
        'selectedRoutingRuleId',
        'selectedRoutingRuleVersionId',
        'fallbackUsed',
        'fallbackPath',
        'jurisdiction'
      ]
  )
    or new.explanation_metadata -> 'fallbackUsed'
      is distinct from to_jsonb(new.fallback_depth > 0)
    or (
      case
      when jsonb_typeof(new.explanation_metadata -> 'fallbackPath') = 'array'
        then jsonb_array_length(new.explanation_metadata -> 'fallbackPath') <> new.fallback_depth
      else true
      end
    )
    or jsonb_typeof(new.explanation_metadata -> 'jurisdiction') is distinct from 'object'
    or new.explanation_metadata ->> 'policyVersionId'
      is distinct from new.confidence_policy_version_id::text then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_EXPLANATION_METADATA_INVALID';
  end if;

  if new.decision_status = 'routed' and (
    new.explanation_metadata ->> 'selectedRoutingRuleId'
      is distinct from new.route_rule_id::text
    or new.explanation_metadata ->> 'selectedRoutingRuleVersionId'
      is distinct from new.route_rule_version_id::text
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_EXPLANATION_RULE_MISMATCH';
  end if;

  if new.decision_status <> 'routed' then
    if new.decision_status = 'unsupported_area' and (
      new.state_id is not null
      or new.local_body_id is not null
      or new.confidence_policy_version_id is not null
      or new.fallback_depth <> 0
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_UNSUPPORTED_AREA_SHAPE_INVALID';
    end if;
    if new.fallback_depth > 0 and new.confidence_policy_version_id is null then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_FALLBACK_POLICY_MISSING';
    end if;
    return new;
  end if;

  select
    category.requires_asset as category_requires_asset,
    local_body.authority_id as local_body_authority_id,
    rule_version.asset_requirement,
    rule_version.asset_type_id as rule_asset_type_id,
    rule_version.asset_id as rule_asset_id,
    rule_version.target_authority_id as rule_target_authority_id,
    rule_version.target_department_id as rule_target_department_id,
    rule_version.target_officer_role_id as rule_target_officer_role_id,
    rule_version.target_office_id as rule_target_office_id,
    rule_version.confidence_policy_version_id,
    rule_version.fallback_depth,
    policy_version.automatic_threshold
  into route_context
  from routing.route_rules as route_rule
  inner join routing.route_rule_versions as rule_version
    on rule_version.id = new.route_rule_version_id
    and rule_version.route_rule_id = route_rule.id
  inner join routing.issue_categories as category
    on category.id = route_rule.category_id
  inner join governance.local_bodies as local_body
    on local_body.id = new.local_body_id
  inner join routing.confidence_policy_versions as policy_version
    on policy_version.id = rule_version.confidence_policy_version_id
  where route_rule.id = new.route_rule_id
    and route_rule.category_id = new.category_id
    and route_rule.status = 'active'
    and route_rule.verification_status = 'verified'
    and not route_rule.is_placeholder
    and route_rule.is_routing_eligible
    and rule_version.status = 'active'
    and rule_version.verification_status = 'verified'
    and not rule_version.is_placeholder
    and rule_version.is_routing_eligible
    and rule_version.effective_from <= new.resolved_at
    and (rule_version.effective_to is null or rule_version.effective_to > new.resolved_at)
    and (rule_version.scope_authority_id is null
      or rule_version.scope_authority_id = local_body.authority_id)
    and (rule_version.scope_local_body_id is null
      or rule_version.scope_local_body_id = new.local_body_id)
    and (rule_version.scope_ward_id is null or rule_version.scope_ward_id = new.ward_id);

  if not found then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_CONTEXT_INVALID';
  end if;
  if route_context.confidence_policy_version_id <> new.confidence_policy_version_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_POLICY_MISMATCH';
  end if;
  if route_context.fallback_depth <> new.fallback_depth then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_FALLBACK_DEPTH_MISMATCH';
  end if;
  if new.confidence_score < route_context.automatic_threshold then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_CONFIDENCE_BELOW_AUTOMATIC_THRESHOLD';
  end if;

  if new.asset_id is not null then
    select
      asset.asset_type_id,
      asset_version.asset_id as version_asset_id,
      asset_version.district_id,
      asset_version.local_body_id,
      asset_version.ward_id,
      asset_version.location,
      asset_type.matching_distance_meters
    into asset_context
    from routing.assets as asset
    inner join routing.asset_types as asset_type on asset_type.id = asset.asset_type_id
    inner join routing.asset_versions as asset_version on asset_version.id = new.asset_version_id
    where asset.id = new.asset_id
      and asset.asset_type_id = new.asset_type_id
      and asset.status = 'active'
      and asset.verification_status = 'verified'
      and not asset.is_placeholder
      and asset.is_routing_eligible
      and asset_type.status = 'active'
      and asset_type.verification_status = 'verified'
      and not asset_type.is_placeholder
      and asset_type.is_routing_eligible
      and asset_version.asset_id = asset.id
      and asset_version.status = 'active'
      and asset_version.verification_status = 'verified'
      and not asset_version.is_placeholder
      and asset_version.is_routing_eligible
      and asset_version.effective_from <= new.resolved_at
      and (asset_version.effective_to is null or asset_version.effective_to > new.resolved_at)
      and (asset_version.district_id is null or asset_version.district_id = new.district_id)
      and (asset_version.local_body_id is null or asset_version.local_body_id = new.local_body_id)
      and (asset_version.ward_id is null or asset_version.ward_id = new.ward_id);
    if not found then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_VERSION_INVALID';
    end if;
    if route_context.rule_asset_type_id is not null
      and route_context.rule_asset_type_id <> new.asset_type_id then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_ASSET_TYPE_MISMATCH';
    end if;
    if route_context.rule_asset_id is not null and route_context.rule_asset_id <> new.asset_id then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_RULE_ASSET_MISMATCH';
    end if;
    if abs(
      extensions.st_distance(
        asset_context.location::extensions.geography,
        new.input_location::extensions.geography
      ) - new.asset_match_distance_meters
    ) > 0.1 then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_DISTANCE_MISMATCH';
    end if;
    if new.asset_match_distance_meters > greatest(
      asset_context.matching_distance_meters,
      new.accuracy_meters
    ) then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_OUTSIDE_TOLERANCE';
    end if;
  elsif route_context.category_requires_asset or route_context.asset_requirement = 'required' then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_REQUIRED_ASSET_MISSING';
  end if;

  if new.asset_ownership_version_id is not null then
    select
      ownership.owner_authority_id,
      ownership.authority_department_id,
      owner_department.department_id,
      ownership.office_id,
      ownership.officer_role_id
    into ownership_context
    from routing.asset_ownership_versions as ownership
    left join governance.authority_departments as owner_department
      on owner_department.id = ownership.authority_department_id
    where ownership.id = new.asset_ownership_version_id
      and ownership.asset_id = new.asset_id
      and ownership.status = 'active'
      and ownership.verification_status = 'verified'
      and not ownership.is_placeholder
      and ownership.is_routing_eligible
      and ownership.effective_from <= new.resolved_at
      and (ownership.effective_to is null or ownership.effective_to > new.resolved_at);
    if not found then
      raise exception using errcode = '23514', message = 'ROUTING_DECISION_ASSET_OWNERSHIP_INVALID';
    end if;
  end if;

  expected_target_authority_id := coalesce(
    ownership_context.owner_authority_id,
    route_context.rule_target_authority_id,
    route_context.local_body_authority_id
  );
  expected_department_id := coalesce(
    ownership_context.department_id,
    route_context.rule_target_department_id
  );
  expected_officer_role_id := coalesce(
    ownership_context.officer_role_id,
    route_context.rule_target_officer_role_id
  );
  expected_office_id := coalesce(
    ownership_context.office_id,
    route_context.rule_target_office_id
  );

  if new.target_authority_id <> expected_target_authority_id
    or new.department_id <> expected_department_id
    or new.officer_role_id <> expected_officer_role_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_MISMATCH';
  end if;
  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.target_authority_id
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
      and private.is_verified_governance_authority(authority.id)
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_AUTHORITY_INVALID';
  end if;
  if not exists (
    select 1
    from governance.authority_departments as authority_department
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.target_authority_id
      and authority_department.department_id = new.department_id
      and authority_department.status = 'active'
      and authority_department.verification_status = 'verified'
      and not authority_department.is_placeholder
      and authority_department.is_routing_eligible
      and department.status = 'active'
      and department.verification_status = 'verified'
      and not department.is_placeholder
      and department.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_AUTHORITY_DEPARTMENT_INVALID';
  end if;
  if ownership_context.authority_department_id is not null
    and ownership_context.authority_department_id <> new.authority_department_id then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OWNER_DEPARTMENT_MISMATCH';
  end if;
  if not exists (
    select 1
    from governance.officer_roles as officer_role
    where officer_role.id = new.officer_role_id
      and officer_role.status = 'active'
      and officer_role.verification_status = 'verified'
      and not officer_role.is_placeholder
      and officer_role.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OFFICER_ROLE_INVALID';
  end if;

  if expected_office_id is not null and not exists (
    select 1
    from governance.offices as office
    where office.id = expected_office_id
      and office.authority_id = new.target_authority_id
      and (office.authority_department_id is null
        or office.authority_department_id = new.authority_department_id)
      and (office.district_id is null or office.district_id = new.district_id)
      and (office.taluka_id is null or office.taluka_id = new.taluka_id)
      and (office.local_body_id is null or office.local_body_id = new.local_body_id)
      and (office.ward_id is null or office.ward_id = new.ward_id)
      and office.status = 'active'
      and office.verification_status = 'verified'
      and not office.is_placeholder
      and office.is_routing_eligible
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_TARGET_OFFICE_SCOPE_INVALID';
  end if;

  if new.officer_assignment_id is not null and not exists (
    select 1
    from governance.officer_assignments as assignment
    inner join governance.officers as officer on officer.id = assignment.officer_id
    where assignment.id = new.officer_assignment_id
      and assignment.authority_id = new.target_authority_id
      and assignment.officer_role_id = new.officer_role_id
      and (assignment.authority_department_id is null
        or assignment.authority_department_id = new.authority_department_id)
      and (expected_office_id is null or assignment.office_id = expected_office_id)
      and (assignment.district_id is null or assignment.district_id = new.district_id)
      and (assignment.taluka_id is null or assignment.taluka_id = new.taluka_id)
      and (assignment.local_body_id is null or assignment.local_body_id = new.local_body_id)
      and (assignment.ward_id is null or assignment.ward_id = new.ward_id)
      and assignment.status = 'active'
      and assignment.verification_status = 'verified'
      and not assignment.is_placeholder
      and assignment.effective_from <= new.resolved_at
      and (assignment.effective_to is null or assignment.effective_to > new.resolved_at)
      and officer.status = 'active'
      and officer.verification_status = 'verified'
      and not officer.is_placeholder
  ) then
    raise exception using errcode = '23514', message = 'ROUTING_DECISION_OFFICER_ASSIGNMENT_INVALID';
  end if;

  return new;
end;
$$;

create trigger issue_categories_validate_hierarchy
before insert or update of
  domain_id,
  parent_category_id,
  classification_level,
  status,
  verification_status,
  is_placeholder,
  is_routing_eligible
on routing.issue_categories
for each row execute function routing.validate_category_hierarchy();

create trigger asset_versions_validate_scope
before insert or update of district_id, local_body_id, ward_id
on routing.asset_versions
for each row execute function routing.validate_asset_version_scope();

create trigger asset_ownership_versions_validate_scope
before insert or update of owner_authority_id, authority_department_id, office_id
on routing.asset_ownership_versions
for each row execute function routing.validate_asset_ownership_scope();

create trigger route_rule_versions_validate
before insert or update
on routing.route_rule_versions
for each row execute function routing.validate_route_rule_version();

create trigger confidence_policy_versions_validate
before insert or update on routing.confidence_policy_versions
for each row execute function routing.validate_confidence_policy_version();

create trigger duplicate_detection_policy_versions_validate
before insert or update on routing.duplicate_detection_policy_versions
for each row execute function routing.validate_duplicate_detection_policy_version();

create trigger routing_decisions_validate
before insert on routing.routing_decisions
for each row execute function routing.validate_routing_decision();

create trigger assets_guard_durable_identity
before update on routing.assets
for each row execute function routing.guard_durable_identity_update('id', 'asset_type_id', 'asset_key');
create trigger confidence_policies_guard_durable_identity
before update on routing.confidence_policies
for each row execute function routing.guard_durable_identity_update('id', 'code');
create trigger duplicate_detection_policies_guard_durable_identity
before update on routing.duplicate_detection_policies
for each row execute function routing.guard_durable_identity_update('id', 'code');
create trigger route_rules_guard_durable_identity
before update on routing.route_rules
for each row execute function routing.guard_durable_identity_update(
  'id',
  'category_id',
  'rule_code'
);

create trigger issue_domains_set_updated_at
before update on routing.issue_domains
for each row execute function private.set_updated_at();
create trigger issue_categories_set_updated_at
before update on routing.issue_categories
for each row execute function private.set_updated_at();
create trigger category_aliases_set_updated_at
before update on routing.category_aliases
for each row execute function private.set_updated_at();
create trigger asset_types_set_updated_at
before update on routing.asset_types
for each row execute function private.set_updated_at();
create trigger category_asset_types_set_updated_at
before update on routing.category_asset_types
for each row execute function private.set_updated_at();
create trigger assets_set_updated_at
before update on routing.assets
for each row execute function private.set_updated_at();
create trigger asset_versions_set_updated_at
before update on routing.asset_versions
for each row execute function private.set_updated_at();
create trigger asset_ownership_versions_set_updated_at
before update on routing.asset_ownership_versions
for each row execute function private.set_updated_at();
create trigger confidence_policies_set_updated_at
before update on routing.confidence_policies
for each row execute function private.set_updated_at();
create trigger confidence_policy_versions_set_updated_at
before update on routing.confidence_policy_versions
for each row execute function private.set_updated_at();
create trigger duplicate_detection_policies_set_updated_at
before update on routing.duplicate_detection_policies
for each row execute function private.set_updated_at();
create trigger duplicate_detection_policy_versions_set_updated_at
before update on routing.duplicate_detection_policy_versions
for each row execute function private.set_updated_at();
create trigger route_rules_set_updated_at
before update on routing.route_rules
for each row execute function private.set_updated_at();
create trigger route_rule_versions_set_updated_at
before update on routing.route_rule_versions
for each row execute function private.set_updated_at();

create trigger asset_versions_guard_update
before update on routing.asset_versions
for each row execute function governance.guard_version_update();
create trigger asset_versions_reject_delete
before delete on routing.asset_versions
for each row execute function governance.reject_historical_delete();
create trigger asset_ownership_versions_guard_update
before update on routing.asset_ownership_versions
for each row execute function governance.guard_version_update();
create trigger asset_ownership_versions_reject_delete
before delete on routing.asset_ownership_versions
for each row execute function governance.reject_historical_delete();
create trigger confidence_policy_versions_guard_update
before update on routing.confidence_policy_versions
for each row execute function governance.guard_version_update();
create trigger confidence_policy_versions_reject_delete
before delete on routing.confidence_policy_versions
for each row execute function governance.reject_historical_delete();
create trigger duplicate_detection_policy_versions_guard_update
before update on routing.duplicate_detection_policy_versions
for each row execute function governance.guard_version_update();
create trigger duplicate_detection_policy_versions_reject_delete
before delete on routing.duplicate_detection_policy_versions
for each row execute function governance.reject_historical_delete();
create trigger route_rule_versions_guard_update
before update on routing.route_rule_versions
for each row execute function governance.guard_version_update();
create trigger route_rule_versions_reject_delete
before delete on routing.route_rule_versions
for each row execute function governance.reject_historical_delete();
create trigger routing_decisions_reject_update
before update on routing.routing_decisions
for each row execute function governance.reject_import_ledger_update();
create trigger routing_decisions_reject_delete
before delete on routing.routing_decisions
for each row execute function governance.reject_historical_delete();

comment on schema routing is
  'Private, data-driven routing configuration, versioned asset ownership, policies, and decisions.';
comment on table routing.issue_categories is
  'Domain-scoped category hierarchy with explicit severity, media, location, verification, and routing requirements.';
comment on table routing.route_rule_versions is
  'Immutable operational route-rule versions; source routing references remain separate in governance.';
comment on table routing.routing_decisions is
  'Append-only, service-only routing audit. It stores exact coordinates and entity identifiers, never officer contacts or complaint text.';
