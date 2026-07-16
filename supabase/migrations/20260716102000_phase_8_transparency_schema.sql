create table complaints.public_visibility_policies (
  id uuid primary key default gen_random_uuid(),
  local_body_id uuid not null
    references governance.local_bodies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_policies_code_check check (
    code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint public_visibility_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint public_visibility_policies_scope_code_unique unique (local_body_id, code)
);

create table complaints.public_visibility_policy_versions (
  id uuid primary key default gen_random_uuid(),
  public_visibility_policy_id uuid not null
    references complaints.public_visibility_policies (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  allowed_complaint_statuses text[] not null,
  minimum_hotspot_complaint_count smallint not null default 3,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_policy_versions_version_check check (version >= 1),
  constraint public_visibility_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint public_visibility_policy_versions_hotspot_count_check check (
    minimum_hotspot_complaint_count between 3 and 100
  ),
  constraint public_visibility_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint public_visibility_policy_versions_approval_shape_check check (
    (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
      and effective_to is null
    )
    or (
      status = 'approved'
      and approved_by_user_id is not null
      and approved_at is not null
      and effective_to is null
      and created_at <= approved_at
      and approved_at <= effective_from
    )
    or (
      status = 'superseded'
      and approved_by_user_id is not null
      and approved_at is not null
      and effective_to is not null
      and created_at <= approved_at
      and approved_at <= effective_from
    )
  ),
  constraint public_visibility_policy_versions_policy_version_unique unique (
    public_visibility_policy_id,
    version
  )
);

create table complaints.public_visibility_category_rules (
  id uuid primary key default gen_random_uuid(),
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  category_id uuid not null
    references routing.issue_categories (id) on delete restrict,
  publication_allowed boolean not null default false,
  processed_media_allowed boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  constraint public_visibility_category_rules_version_category_unique unique (
    public_visibility_policy_version_id,
    category_id
  )
);

create table complaints.complaint_publication_reviews (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  public_visibility_category_rule_id uuid not null
    references complaints.public_visibility_category_rules (id) on delete restrict,
  reviewer_user_id uuid not null references auth.users (id) on delete restrict,
  decision text not null,
  public_title text,
  public_summary text,
  reason_code text,
  request_id text not null,
  reviewed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_publication_reviews_actor_request_unique unique (
    reviewer_user_id,
    request_id
  ),
  constraint complaint_publication_reviews_decision_check check (
    decision in ('published', 'withdrawn')
  ),
  constraint complaint_publication_reviews_title_check check (
    public_title is null
    or (
      public_title = btrim(public_title)
      and char_length(public_title) between 1 and 160
    )
  ),
  constraint complaint_publication_reviews_summary_check check (
    public_summary is null
    or (
      public_summary = btrim(public_summary)
      and char_length(public_summary) between 1 and 2000
    )
  ),
  constraint complaint_publication_reviews_reason_check check (
    reason_code is null or reason_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint complaint_publication_reviews_request_check check (
    request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint complaint_publication_reviews_decision_shape_check check (
    (
      decision = 'published'
      and public_title is not null
      and public_summary is not null
      and reason_code is null
    )
    or (
      decision = 'withdrawn'
      and public_title is null
      and public_summary is null
      and reason_code is not null
    )
  ),
  constraint complaint_publication_reviews_time_check check (reviewed_at >= created_at)
);

create table complaints.complaint_publication_projections (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null,
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  version integer not null,
  review_id uuid not null unique
    references complaints.complaint_publication_reviews (id) on delete restrict,
  public_visibility_policy_version_id uuid not null
    references complaints.public_visibility_policy_versions (id) on delete restrict,
  public_visibility_category_rule_id uuid not null
    references complaints.public_visibility_category_rules (id) on delete restrict,
  category_id uuid not null
    references routing.issue_categories (id) on delete restrict,
  category_name text not null,
  local_body_id uuid not null
    references governance.local_bodies (id) on delete restrict,
  ward_id uuid not null references governance.wards (id) on delete restrict,
  ward_boundary_version_id uuid not null
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  approximate_location extensions.geometry(Point, 4326) not null,
  location_precision_meters integer not null,
  public_title text not null,
  public_summary text not null,
  public_status text not null,
  publication_state text not null,
  submitted_at timestamptz not null,
  source_updated_at timestamptz not null,
  published_at timestamptz not null,
  event_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_publication_projections_version_check check (version >= 1),
  constraint complaint_publication_projections_complaint_version_unique unique (
    complaint_id,
    version
  ),
  constraint complaint_publication_projections_public_version_unique unique (
    public_id,
    version
  ),
  constraint complaint_publication_projections_state_check check (
    publication_state in ('published', 'withdrawn')
  ),
  constraint complaint_publication_projections_location_check check (
    not extensions.st_isempty(approximate_location)
    and extensions.st_srid(approximate_location) = 4326
    and extensions.st_x(approximate_location) between -180 and 180
    and extensions.st_y(approximate_location) between -90 and 90
  ),
  constraint complaint_publication_projections_precision_check check (
    location_precision_meters between 1 and 200000
  ),
  constraint complaint_publication_projections_category_name_check check (
    category_name = btrim(category_name)
    and char_length(category_name) between 1 and 160
  ),
  constraint complaint_publication_projections_title_check check (
    public_title = btrim(public_title)
    and char_length(public_title) between 1 and 160
  ),
  constraint complaint_publication_projections_summary_check check (
    public_summary = btrim(public_summary)
    and char_length(public_summary) between 1 and 2000
  ),
  constraint complaint_publication_projections_public_status_check check (
    public_status in ('reported', 'in_progress', 'resolved', 'closed')
  ),
  constraint complaint_publication_projections_time_check check (
    event_at >= created_at
    and submitted_at <= source_updated_at
    and submitted_at <= published_at
    and published_at <= event_at
  )
);

create table complaints.complaint_duplicate_group_versions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  version integer not null,
  state text not null,
  canonical_complaint_id uuid
    references complaints.complaints (id) on delete restrict,
  reviewed_by_user_id uuid not null references auth.users (id) on delete restrict,
  request_id text not null,
  reviewed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default current_timestamp,
  constraint complaint_duplicate_group_versions_group_version_unique unique (
    group_id,
    version
  ),
  constraint complaint_duplicate_group_versions_actor_request_unique unique (
    reviewed_by_user_id,
    request_id
  ),
  constraint complaint_duplicate_group_versions_version_check check (version >= 1),
  constraint complaint_duplicate_group_versions_state_check check (
    state in ('confirmed', 'withdrawn')
  ),
  constraint complaint_duplicate_group_versions_state_shape_check check (
    (state = 'confirmed' and canonical_complaint_id is not null)
    or (state = 'withdrawn' and canonical_complaint_id is null)
  ),
  constraint complaint_duplicate_group_versions_request_check check (
    request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint complaint_duplicate_group_versions_time_check check (reviewed_at >= created_at)
);

create table complaints.complaint_duplicate_group_members (
  id uuid primary key default gen_random_uuid(),
  duplicate_group_version_id uuid not null
    references complaints.complaint_duplicate_group_versions (id) on delete restrict,
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  member_order smallint not null,
  is_canonical boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  constraint complaint_duplicate_group_members_version_complaint_unique unique (
    duplicate_group_version_id,
    complaint_id
  ),
  constraint complaint_duplicate_group_members_version_order_unique unique (
    duplicate_group_version_id,
    member_order
  ),
  constraint complaint_duplicate_group_members_order_check check (member_order >= 1)
);

create table complaints.public_media_derivatives (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null
    references complaints.complaints (id) on delete restrict,
  complaint_media_id uuid
    references complaints.complaint_media (id) on delete restrict,
  resolution_evidence_id uuid
    references complaints.complaint_resolution_evidence (id) on delete restrict,
  reopen_evidence_id uuid
    references complaints.complaint_reopen_evidence (id) on delete restrict,
  derivative_kind text not null,
  processing_status text not null default 'pending',
  moderation_status text not null default 'pending',
  publication_status text not null default 'unavailable',
  bucket_id text,
  object_path text,
  mime_type text,
  byte_size bigint,
  verified_sha256 text,
  created_at timestamptz not null default current_timestamp,
  constraint public_media_derivatives_one_source_check check (
    (complaint_media_id is not null)::integer
      + (resolution_evidence_id is not null)::integer
      + (reopen_evidence_id is not null)::integer = 1
  ),
  constraint public_media_derivatives_kind_check check (
    derivative_kind in ('image', 'video', 'audio', 'thumbnail')
  ),
  constraint public_media_derivatives_processing_check check (
    processing_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint public_media_derivatives_moderation_check check (
    moderation_status in ('pending', 'review_required', 'approved', 'rejected')
  ),
  constraint public_media_derivatives_publication_check check (
    publication_status = 'unavailable'
  ),
  constraint public_media_derivatives_object_shape_check check (
    (
      processing_status = 'ready'
      and bucket_id is not null
      and object_path is not null
      and mime_type is not null
      and byte_size between 1 and 52428800
      and verified_sha256 ~ '^[0-9a-f]{64}$'
    )
    or (
      processing_status <> 'ready'
      and bucket_id is null
      and object_path is null
      and mime_type is null
      and byte_size is null
      and verified_sha256 is null
    )
  )
);

create unique index public_visibility_policy_versions_one_current_idx
  on complaints.public_visibility_policy_versions (public_visibility_policy_id)
  where status = 'approved' and effective_to is null;
create index public_visibility_policy_versions_effective_idx
  on complaints.public_visibility_policy_versions (
    public_visibility_policy_id,
    status,
    effective_from,
    effective_to
  );
create index public_visibility_category_rules_category_idx
  on complaints.public_visibility_category_rules (
    category_id,
    public_visibility_policy_version_id
  ) where publication_allowed;
create index complaint_publication_reviews_complaint_time_idx
  on complaints.complaint_publication_reviews (complaint_id, reviewed_at desc, id desc);
create index complaint_publication_projections_latest_idx
  on complaints.complaint_publication_projections (complaint_id, version desc);
create index complaint_publication_projections_public_latest_idx
  on complaints.complaint_publication_projections (public_id, version desc);
create index complaint_publication_projections_filter_idx
  on complaints.complaint_publication_projections (
    local_body_id,
    ward_id,
    publication_state,
    public_id
  );
create index complaint_publication_projections_location_gix
  on complaints.complaint_publication_projections using gist (approximate_location);
create index complaint_duplicate_group_versions_latest_idx
  on complaints.complaint_duplicate_group_versions (group_id, version desc);
create unique index complaint_duplicate_group_members_one_canonical_idx
  on complaints.complaint_duplicate_group_members (duplicate_group_version_id)
  where is_canonical;
create index complaint_duplicate_group_members_complaint_idx
  on complaints.complaint_duplicate_group_members (complaint_id, duplicate_group_version_id);
create index public_media_derivatives_complaint_idx
  on complaints.public_media_derivatives (complaint_id, publication_status, created_at desc);

comment on table complaints.public_visibility_policies is
  'Stable municipality-scoped identity for review-gated public transparency policy versions.';
comment on table complaints.public_visibility_policy_versions is
  'Effective-dated public visibility policy; no operational version is seeded.';
comment on table complaints.public_visibility_category_rules is
  'Category decisions versioned through their immutable parent policy version.';
comment on table complaints.complaint_publication_reviews is
  'Append-only human publication and withdrawal review evidence.';
comment on table complaints.complaint_publication_projections is
  'Append-only public-safe complaint snapshots located only at a verified ward centroid.';
comment on table complaints.complaint_duplicate_group_versions is
  'Human-reviewed, append-only duplicate-group versions; similarity alone cannot confirm a group.';
comment on table complaints.complaint_duplicate_group_members is
  'Immutable membership of one reviewed duplicate-group version.';
comment on table complaints.public_media_derivatives is
  'Structural private derivative registry; publication is intentionally unavailable in Phase 8.';
