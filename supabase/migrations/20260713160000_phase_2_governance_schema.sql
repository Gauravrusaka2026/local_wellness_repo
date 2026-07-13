create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists governance;
revoke all on schema governance from public;

create table governance.reference_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_type text not null default 'official',
  purpose text,
  last_checked_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_sources_title_check check (
    title = btrim(title) and char_length(title) between 1 and 240
  ),
  constraint reference_sources_url_check check (
    url = btrim(url) and url ~ '^https?://[^[:space:]]+$'
  ),
  constraint reference_sources_source_type_check check (
    source_type in ('official', 'secondary', 'repository')
  ),
  constraint reference_sources_status_check check (status in ('active', 'inactive')),
  constraint reference_sources_url_unique unique (url)
);

create table governance.import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null,
  dataset_version text not null,
  canonical_root text not null,
  manifest_sha256 text not null,
  workbook_sha256 text not null,
  generated_seed_sha256 text,
  status text not null default 'pending',
  validation_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint import_batches_dataset_key_check check (
    dataset_key = btrim(dataset_key) and dataset_key ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint import_batches_dataset_version_check check (
    dataset_version = btrim(dataset_version)
    and char_length(dataset_version) between 1 and 80
  ),
  constraint import_batches_canonical_root_check check (
    canonical_root = btrim(canonical_root)
    and char_length(canonical_root) between 1 and 500
  ),
  constraint import_batches_manifest_sha256_check check (
    manifest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_workbook_sha256_check check (
    workbook_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_generated_seed_sha256_check check (
    generated_seed_sha256 is null or generated_seed_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_batches_status_check check (
    status in ('pending', 'validated', 'imported', 'failed')
  ),
  constraint import_batches_validation_summary_check check (
    jsonb_typeof(validation_summary) = 'object'
  ),
  constraint import_batches_completion_check check (
    (status in ('pending', 'validated') and completed_at is null)
    or (status in ('imported', 'failed') and completed_at is not null)
  ),
  constraint import_batches_dataset_version_unique unique (dataset_key, dataset_version)
);

create table governance.import_files (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references governance.import_batches (id) on delete restrict,
  file_name text not null,
  sha256 text not null,
  source_row_count integer not null,
  accepted_row_count integer not null default 0,
  rejected_row_count integer not null default 0,
  warning_count integer not null default 0,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_files_file_name_check check (
    file_name = btrim(file_name) and char_length(file_name) between 1 and 255
  ),
  constraint import_files_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint import_files_counts_check check (
    source_row_count >= 0
    and accepted_row_count >= 0
    and rejected_row_count >= 0
    and warning_count >= 0
    and accepted_row_count + rejected_row_count = source_row_count
  ),
  constraint import_files_validation_summary_check check (
    jsonb_typeof(validation_summary) = 'object'
  ),
  constraint import_files_batch_file_unique unique (import_batch_id, file_name)
);

create table governance.import_records (
  id uuid primary key default gen_random_uuid(),
  import_file_id uuid not null references governance.import_files (id) on delete restrict,
  row_number integer not null,
  source_key text,
  record_sha256 text not null,
  raw_payload jsonb not null,
  validation_status text not null,
  validation_messages jsonb not null default '[]'::jsonb,
  is_placeholder boolean not null default false,
  normalization_disposition text not null,
  normalized_table text,
  normalized_record_id uuid,
  created_at timestamptz not null default now(),
  constraint import_records_row_number_check check (row_number >= 1),
  constraint import_records_source_key_check check (
    source_key is null
    or (source_key = btrim(source_key) and char_length(source_key) between 1 and 500)
  ),
  constraint import_records_record_sha256_check check (
    record_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint import_records_raw_payload_check check (jsonb_typeof(raw_payload) = 'object'),
  constraint import_records_validation_status_check check (
    validation_status in ('accepted', 'accepted_with_warnings', 'rejected')
  ),
  constraint import_records_validation_messages_check check (
    jsonb_typeof(validation_messages) = 'array'
  ),
  constraint import_records_normalization_disposition_check check (
    normalization_disposition in (
      'normalized',
      'placeholder_preserved',
      'reference_only',
      'rejected'
    )
  ),
  constraint import_records_normalized_table_check check (
    normalized_table is null or normalized_table ~ '^governance\.[a-z][a-z0-9_]*$'
  ),
  constraint import_records_normalized_target_check check (
    (normalized_table is null and normalized_record_id is null)
    or (normalized_table is not null and normalized_record_id is not null)
  ),
  constraint import_records_file_row_unique unique (import_file_id, row_number)
);

create table governance.authorities (
  id uuid primary key default gen_random_uuid(),
  parent_authority_id uuid references governance.authorities (id) on delete restrict,
  code text not null,
  name text not null,
  authority_type text not null,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authorities_code_check check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'),
  constraint authorities_name_check check (
    name = btrim(name) and char_length(name) between 1 and 240
  ),
  constraint authorities_type_check check (
    authority_type in (
      'state',
      'state_agency',
      'district',
      'local_body',
      'utility',
      'emergency_service',
      'other'
    )
  ),
  constraint authorities_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint authorities_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint authorities_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint authorities_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint authorities_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint authorities_parent_check check (parent_authority_id is distinct from id),
  constraint authorities_code_unique unique (code)
);

create table governance.states (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  name text not null,
  iso_code text not null,
  lgd_code text,
  capital text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint states_name_check check (name = btrim(name) and char_length(name) between 1 and 120),
  constraint states_iso_code_check check (iso_code ~ '^[A-Z]{2,3}$'),
  constraint states_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint states_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint states_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint states_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint states_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint states_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint states_iso_code_unique unique (iso_code)
);

create table governance.districts (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  name text not null,
  revenue_division_name text,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint districts_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint districts_revenue_division_check check (
    revenue_division_name is null
    or (revenue_division_name = btrim(revenue_division_name) and char_length(revenue_division_name) between 1 and 120)
  ),
  constraint districts_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint districts_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint districts_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint districts_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint districts_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint districts_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.talukas (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references governance.districts (id) on delete restrict,
  name text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talukas_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint talukas_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint talukas_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint talukas_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint talukas_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint talukas_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint talukas_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.local_bodies (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  name text not null,
  body_type text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint local_bodies_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint local_bodies_type_check check (
    body_type in (
      'municipal_corporation',
      'municipal_council',
      'nagar_panchayat',
      'gram_panchayat',
      'zilla_parishad',
      'panchayat_samiti',
      'other'
    )
  ),
  constraint local_bodies_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint local_bodies_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint local_bodies_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint local_bodies_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint local_bodies_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint local_bodies_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.local_body_districts (
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  district_id uuid not null references governance.districts (id) on delete restrict,
  is_primary boolean not null default false,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (local_body_id, district_id)
);

create table governance.administrative_units (
  id uuid primary key default gen_random_uuid(),
  parent_unit_id uuid references governance.administrative_units (id) on delete restrict,
  state_id uuid not null references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  name text not null,
  unit_type text not null,
  lgd_code text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint administrative_units_name_check check (
    name = btrim(name) and char_length(name) between 1 and 240
  ),
  constraint administrative_units_type_check check (
    unit_type in ('revenue_division', 'block', 'zone', 'borough', 'village', 'other')
  ),
  constraint administrative_units_lgd_code_check check (
    lgd_code is null or lgd_code ~ '^[0-9]+$'
  ),
  constraint administrative_units_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint administrative_units_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint administrative_units_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint administrative_units_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint administrative_units_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint administrative_units_parent_check check (parent_unit_id is distinct from id)
);

create table governance.wards (
  id uuid primary key default gen_random_uuid(),
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  source_ward_code text,
  lgd_code text,
  name text not null,
  ward_number text,
  zone_name text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wards_source_code_check check (
    source_ward_code is null
    or (source_ward_code = btrim(source_ward_code) and char_length(source_ward_code) between 1 and 80)
  ),
  constraint wards_lgd_code_check check (lgd_code is null or lgd_code ~ '^[0-9]+$'),
  constraint wards_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint wards_number_check check (
    ward_number is null
    or (ward_number = btrim(ward_number) and char_length(ward_number) between 1 and 40)
  ),
  constraint wards_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint wards_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint wards_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint wards_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint wards_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  applicable_body_types text[] not null default '{}'::text[],
  complaint_types text[] not null default '{}'::text[],
  typical_coverage text,
  required_data text[] not null default '{}'::text[],
  priority_guidance text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint departments_name_check check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint departments_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint departments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint departments_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint departments_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint departments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint departments_code_unique unique (code)
);

create table governance.authority_departments (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  department_id uuid not null references governance.departments (id) on delete restrict,
  local_name text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_departments_local_name_check check (
    local_name is null or (local_name = btrim(local_name) and char_length(local_name) between 1 and 160)
  ),
  constraint authority_departments_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint authority_departments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint authority_departments_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint authority_departments_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint authority_departments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint authority_departments_authority_department_unique unique (authority_id, department_id)
);

create table governance.offices (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  authority_department_id uuid references governance.authority_departments (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  name text not null,
  office_type text not null,
  level text,
  jurisdiction_description text,
  address text,
  official_phone text,
  official_email text,
  coverage text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offices_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint offices_type_check check (
    office_type = btrim(office_type) and char_length(office_type) between 1 and 120
  ),
  constraint offices_email_check check (
    official_email is null
    or (official_email = lower(btrim(official_email)) and official_email ~ '^[^[:space:]@]+@[^[:space:]@]+$')
  ),
  constraint offices_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint offices_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint offices_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint offices_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint offices_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.officer_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  core_responsibility text,
  people_or_units_under_role text,
  reports_to_role_id uuid references governance.officer_roles (id) on delete restrict,
  reports_to_description text,
  typical_coverage text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officer_roles_code_check check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint officer_roles_name_check check (name = btrim(name) and char_length(name) between 1 and 180),
  constraint officer_roles_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint officer_roles_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officer_roles_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint officer_roles_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint officer_roles_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint officer_roles_reports_to_check check (reports_to_role_id is distinct from id),
  constraint officer_roles_code_unique unique (code)
);

create table governance.officers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  official_phone text,
  official_email text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officers_name_check check (
    full_name = btrim(full_name) and char_length(full_name) between 1 and 180
  ),
  constraint officers_email_check check (
    official_email is null
    or (official_email = lower(btrim(official_email)) and official_email ~ '^[^[:space:]@]+@[^[:space:]@]+$')
  ),
  constraint officers_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint officers_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officers_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint officers_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.officer_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_key text not null,
  version integer not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  officer_role_id uuid not null references governance.officer_roles (id) on delete restrict,
  officer_id uuid references governance.officers (id) on delete restrict,
  office_id uuid references governance.offices (id) on delete restrict,
  authority_department_id uuid references governance.authority_departments (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  responsibility text,
  coverage text,
  status text not null,
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint officer_assignments_key_check check (
    assignment_key = btrim(assignment_key)
    and assignment_key ~ '^[a-z0-9][a-z0-9:_-]{1,199}$'
  ),
  constraint officer_assignments_version_check check (version >= 1),
  constraint officer_assignments_status_check check (
    status in ('active', 'role_only', 'incumbent_unverified', 'inactive', 'superseded')
  ),
  constraint officer_assignments_filled_check check (status <> 'active' or officer_id is not null),
  constraint officer_assignments_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint officer_assignments_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint officer_assignments_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint officer_assignments_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint officer_assignments_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint officer_assignments_key_version_unique unique (assignment_key, version)
);

create table governance.utilities (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null unique references governance.authorities (id) on delete restrict,
  name text not null,
  function_description text not null,
  jurisdiction_description text,
  complaint_types text[] not null default '{}'::text[],
  reporting_channel text,
  local_office_description text,
  escalation_role_id uuid references governance.officer_roles (id) on delete restrict,
  routing_notes text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint utilities_name_check check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint utilities_function_check check (
    function_description = btrim(function_description)
    and char_length(function_description) between 1 and 500
  ),
  constraint utilities_status_check check (status in ('active', 'inactive', 'superseded')),
  constraint utilities_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint utilities_placeholder_check check (not is_placeholder or verification_status <> 'verified'),
  constraint utilities_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint utilities_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid references governance.authorities (id) on delete restrict,
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  service_name text not null,
  issue_type text not null,
  jurisdiction_description text not null,
  contact_type text not null,
  contact_value text,
  availability text,
  action text,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_contacts_service_check check (
    service_name = btrim(service_name) and char_length(service_name) between 1 and 200
  ),
  constraint emergency_contacts_issue_check check (
    issue_type = btrim(issue_type) and char_length(issue_type) between 1 and 500
  ),
  constraint emergency_contacts_jurisdiction_check check (
    jurisdiction_description = btrim(jurisdiction_description)
    and char_length(jurisdiction_description) between 1 and 240
  ),
  constraint emergency_contacts_type_check check (
    contact_type in ('phone', 'helpline', 'url', 'office', 'other')
  ),
  constraint emergency_contacts_value_check check (
    contact_value is null
    or (contact_value = btrim(contact_value) and char_length(contact_value) between 1 and 500)
  ),
  constraint emergency_contacts_status_check check (
    status in ('active', 'inactive', 'superseded')
  ),
  constraint emergency_contacts_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint emergency_contacts_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint emergency_contacts_usable_contact_check check (
    is_placeholder or contact_value is not null
  ),
  constraint emergency_contacts_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint emergency_contacts_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.jurisdiction_boundary_versions (
  id uuid primary key default gen_random_uuid(),
  state_id uuid references governance.states (id) on delete restrict,
  district_id uuid references governance.districts (id) on delete restrict,
  taluka_id uuid references governance.talukas (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  version integer not null,
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jurisdiction_boundaries_exactly_one_scope_check check (
    (state_id is not null)::integer
      + (district_id is not null)::integer
      + (taluka_id is not null)::integer
      + (local_body_id is not null)::integer
      + (ward_id is not null)::integer = 1
  ),
  constraint jurisdiction_boundaries_version_check check (version >= 1),
  constraint jurisdiction_boundaries_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint jurisdiction_boundaries_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint jurisdiction_boundaries_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint jurisdiction_boundaries_routing_eligibility_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint jurisdiction_boundaries_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint jurisdiction_boundaries_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint jurisdiction_boundaries_valid_geometry_check check (
    not extensions.st_isempty(boundary) and extensions.st_isvalid(boundary)
  ),
  constraint jurisdiction_boundaries_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  )
);

create table governance.complaint_routing_references (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null,
  version integer not null,
  issue_name text not null,
  primary_department_id uuid references governance.departments (id) on delete restrict,
  first_recipient_role_id uuid references governance.officer_roles (id) on delete restrict,
  primary_department_label text not null,
  first_recipient_role_label text not null,
  escalation_1_label text,
  escalation_2_label text,
  ownership_condition text,
  priority_or_emergency text,
  is_emergency boolean not null default false,
  routing_logic text not null,
  normalization_status text not null default 'unresolved',
  normalization_notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_routing_references_rule_code_check check (
    rule_code = btrim(rule_code) and rule_code ~ '^[A-Z0-9][A-Z0-9_-]{1,79}$'
  ),
  constraint complaint_routing_references_version_check check (version >= 1),
  constraint complaint_routing_references_issue_check check (
    issue_name = btrim(issue_name) and char_length(issue_name) between 1 and 240
  ),
  constraint complaint_routing_references_labels_check check (
    primary_department_label = btrim(primary_department_label)
    and char_length(primary_department_label) between 1 and 240
    and first_recipient_role_label = btrim(first_recipient_role_label)
    and char_length(first_recipient_role_label) between 1 and 240
  ),
  constraint complaint_routing_references_logic_check check (
    routing_logic = btrim(routing_logic) and char_length(routing_logic) between 1 and 2000
  ),
  constraint complaint_routing_references_normalization_status_check check (
    normalization_status in ('resolved', 'partially_resolved', 'unresolved')
  ),
  constraint complaint_routing_references_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint complaint_routing_references_verification_status_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint complaint_routing_references_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint complaint_routing_references_routing_eligibility_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and normalization_status = 'resolved'
      and primary_department_id is not null
      and first_recipient_role_id is not null
    )
  ),
  constraint complaint_routing_references_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint complaint_routing_references_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint complaint_routing_references_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint complaint_routing_references_rule_version_unique unique (rule_code, version)
);

alter table governance.officer_assignments
  add constraint officer_assignments_no_effective_overlap
  exclude using gist (
    assignment_key with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  );

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_state_no_effective_overlap
  exclude using gist (
    state_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (state_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_district_no_effective_overlap
  exclude using gist (
    district_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (district_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_taluka_no_effective_overlap
  exclude using gist (
    taluka_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (taluka_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_local_body_no_effective_overlap
  exclude using gist (
    local_body_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (local_body_id is not null and status <> 'draft');

alter table governance.jurisdiction_boundary_versions
  add constraint jurisdiction_boundaries_ward_no_effective_overlap
  exclude using gist (
    ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (ward_id is not null and status <> 'draft');

alter table governance.complaint_routing_references
  add constraint complaint_routing_references_no_effective_overlap
  exclude using gist (
    rule_code with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index states_lgd_code_unique_idx on governance.states (lgd_code) where lgd_code is not null;
create unique index districts_state_name_unique_idx on governance.districts (state_id, lower(name));
create unique index districts_lgd_code_unique_idx on governance.districts (lgd_code) where lgd_code is not null;
create unique index talukas_district_name_unique_idx on governance.talukas (district_id, lower(name));
create unique index talukas_lgd_code_unique_idx on governance.talukas (lgd_code) where lgd_code is not null;
create unique index local_bodies_lgd_code_unique_idx
  on governance.local_bodies (lgd_code) where lgd_code is not null;
create unique index local_body_districts_one_primary_idx
  on governance.local_body_districts (local_body_id) where is_primary;
create index local_body_districts_district_idx
  on governance.local_body_districts (district_id, local_body_id);
create unique index administrative_units_lgd_code_unique_idx
  on governance.administrative_units (lgd_code) where lgd_code is not null;
create index administrative_units_scope_idx
  on governance.administrative_units (state_id, district_id, taluka_id, local_body_id, unit_type);
create unique index wards_local_body_source_code_unique_idx
  on governance.wards (local_body_id, source_ward_code) where source_ward_code is not null;
create unique index wards_lgd_code_unique_idx
  on governance.wards (lgd_code) where lgd_code is not null;
create unique index wards_local_body_number_unique_idx
  on governance.wards (local_body_id, ward_number) where ward_number is not null;
create index authorities_parent_status_idx
  on governance.authorities (parent_authority_id, status, authority_type);
create index authority_departments_authority_status_idx
  on governance.authority_departments (authority_id, status, department_id);
create index offices_authority_status_idx on governance.offices (authority_id, status, name);
create index officer_assignments_authority_role_time_idx
  on governance.officer_assignments (authority_id, officer_role_id, status, effective_from, effective_to);
create index officer_assignments_officer_time_idx
  on governance.officer_assignments (officer_id, effective_from desc) where officer_id is not null;
create unique index officer_assignments_one_current_idx
  on governance.officer_assignments (assignment_key)
  where effective_to is null and status <> 'superseded';
create index emergency_contacts_scope_status_idx
  on governance.emergency_contacts (state_id, district_id, local_body_id, status);
create index import_records_source_key_idx
  on governance.import_records (source_key) where source_key is not null;
create index jurisdiction_boundary_versions_boundary_gix
  on governance.jurisdiction_boundary_versions using gist (boundary);
create index jurisdiction_boundary_versions_effective_idx
  on governance.jurisdiction_boundary_versions (status, effective_from, effective_to);
create unique index jurisdiction_boundaries_state_version_unique_idx
  on governance.jurisdiction_boundary_versions (state_id, version) where state_id is not null;
create unique index jurisdiction_boundaries_district_version_unique_idx
  on governance.jurisdiction_boundary_versions (district_id, version) where district_id is not null;
create unique index jurisdiction_boundaries_taluka_version_unique_idx
  on governance.jurisdiction_boundary_versions (taluka_id, version) where taluka_id is not null;
create unique index jurisdiction_boundaries_local_body_version_unique_idx
  on governance.jurisdiction_boundary_versions (local_body_id, version) where local_body_id is not null;
create unique index jurisdiction_boundaries_ward_version_unique_idx
  on governance.jurisdiction_boundary_versions (ward_id, version) where ward_id is not null;
create unique index jurisdiction_boundaries_one_current_state_idx
  on governance.jurisdiction_boundary_versions (state_id)
  where state_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_district_idx
  on governance.jurisdiction_boundary_versions (district_id)
  where district_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_taluka_idx
  on governance.jurisdiction_boundary_versions (taluka_id)
  where taluka_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_local_body_idx
  on governance.jurisdiction_boundary_versions (local_body_id)
  where local_body_id is not null and effective_to is null and status = 'active';
create unique index jurisdiction_boundaries_one_current_ward_idx
  on governance.jurisdiction_boundary_versions (ward_id)
  where ward_id is not null and effective_to is null and status = 'active';
create unique index complaint_routing_references_one_current_idx
  on governance.complaint_routing_references (rule_code)
  where effective_to is null and status = 'active';
create index complaint_routing_references_lookup_idx
  on governance.complaint_routing_references (
    issue_name,
    status,
    effective_from,
    effective_to,
    is_routing_eligible
  );

create trigger reference_sources_set_updated_at
before update on governance.reference_sources
for each row execute function private.set_updated_at();

create trigger authorities_set_updated_at
before update on governance.authorities
for each row execute function private.set_updated_at();

create trigger states_set_updated_at
before update on governance.states
for each row execute function private.set_updated_at();

create trigger districts_set_updated_at
before update on governance.districts
for each row execute function private.set_updated_at();

create trigger talukas_set_updated_at
before update on governance.talukas
for each row execute function private.set_updated_at();

create trigger local_bodies_set_updated_at
before update on governance.local_bodies
for each row execute function private.set_updated_at();

create trigger administrative_units_set_updated_at
before update on governance.administrative_units
for each row execute function private.set_updated_at();

create trigger wards_set_updated_at
before update on governance.wards
for each row execute function private.set_updated_at();

create trigger departments_set_updated_at
before update on governance.departments
for each row execute function private.set_updated_at();

create trigger authority_departments_set_updated_at
before update on governance.authority_departments
for each row execute function private.set_updated_at();

create trigger offices_set_updated_at
before update on governance.offices
for each row execute function private.set_updated_at();

create trigger officer_roles_set_updated_at
before update on governance.officer_roles
for each row execute function private.set_updated_at();

create trigger officers_set_updated_at
before update on governance.officers
for each row execute function private.set_updated_at();

create trigger officer_assignments_set_updated_at
before update on governance.officer_assignments
for each row execute function private.set_updated_at();

create trigger utilities_set_updated_at
before update on governance.utilities
for each row execute function private.set_updated_at();

create trigger emergency_contacts_set_updated_at
before update on governance.emergency_contacts
for each row execute function private.set_updated_at();

create trigger jurisdiction_boundary_versions_set_updated_at
before update on governance.jurisdiction_boundary_versions
for each row execute function private.set_updated_at();

create trigger complaint_routing_references_set_updated_at
before update on governance.complaint_routing_references
for each row execute function private.set_updated_at();

comment on schema governance is
  'Normalized, provenance-aware Maharashtra governance registry and versioned jurisdiction references.';
comment on table governance.authorities is
  'Canonical authorization supertype referenced by state, district, local-body, and utility entities.';
comment on table governance.import_records is
  'Immutable row-level provenance copied from canonical CSV inputs; rejected and placeholder rows remain traceable.';
comment on table governance.officer_roles is
  'Durable role definitions kept separate from changing officer assignments.';
comment on table governance.officers is
  'Verified or explicitly unverified real people only; role-only placeholders belong in officer_assignments.';
comment on table governance.officer_assignments is
  'Versioned authority-scoped incumbency or role-only records. Historical versions are retained.';
comment on table governance.jurisdiction_boundary_versions is
  'Versioned PostGIS MultiPolygon boundaries for exactly one governance jurisdiction.';
comment on table governance.complaint_routing_references is
  'Versioned source references imported in Phase 2; these are not executable Phase 3 routing rules.';
