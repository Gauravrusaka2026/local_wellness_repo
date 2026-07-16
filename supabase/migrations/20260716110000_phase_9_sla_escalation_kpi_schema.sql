create table complaints.sla_calendars (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_calendars_authority_code_unique unique (authority_id, code),
  constraint sla_calendars_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_calendars_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_calendar_versions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references complaints.sla_calendars (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  timezone_name text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_calendar_versions_number_unique unique (calendar_id, version),
  constraint sla_calendar_versions_number_check check (version >= 1),
  constraint sla_calendar_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_calendar_versions_timezone_check check (
    timezone_name = btrim(timezone_name)
    and char_length(timezone_name) between 1 and 80
  ),
  constraint sla_calendar_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_calendar_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_calendar_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_calendar_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create table complaints.sla_calendar_working_periods (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  iso_weekday smallint not null,
  period_sequence smallint not null default 1,
  opens_at time without time zone not null,
  closes_at time without time zone not null,
  created_at timestamptz not null default now(),
  constraint sla_calendar_working_periods_slot_unique unique (
    calendar_version_id,
    iso_weekday,
    period_sequence
  ),
  constraint sla_calendar_working_periods_weekday_check check (iso_weekday between 1 and 7),
  constraint sla_calendar_working_periods_sequence_check check (
    period_sequence between 1 and 8
  ),
  constraint sla_calendar_working_periods_time_check check (closes_at > opens_at)
);

create table complaints.sla_calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  exception_date date not null,
  is_working_day boolean not null,
  opens_at time without time zone,
  closes_at time without time zone,
  label text not null,
  created_at timestamptz not null default now(),
  constraint sla_calendar_exceptions_date_unique unique (
    calendar_version_id,
    exception_date
  ),
  constraint sla_calendar_exceptions_label_check check (
    label = btrim(label) and char_length(label) between 1 and 160
  ),
  constraint sla_calendar_exceptions_time_check check (
    (
      is_working_day
      and opens_at is not null
      and closes_at is not null
      and closes_at > opens_at
    )
    or (
      not is_working_day
      and opens_at is null
      and closes_at is null
    )
  )
);

create table complaints.sla_policies (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid references governance.local_bodies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_policies_scope_code_unique unique (authority_id, local_body_id, code),
  constraint sla_policies_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_policies_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references complaints.sla_policies (id) on delete restrict,
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  acknowledgement_business_minutes integer not null,
  inspection_business_minutes integer,
  resolution_business_minutes integer not null,
  resolution_completion_status text not null,
  pause_for_external_dependencies boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_policy_versions_number_unique unique (policy_id, version),
  constraint sla_policy_versions_number_check check (version >= 1),
  constraint sla_policy_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_policy_versions_target_check check (
    acknowledgement_business_minutes between 1 and 5256000
    and (
      inspection_business_minutes is null
      or inspection_business_minutes between 1 and 5256000
    )
    and resolution_business_minutes between 1 and 5256000
  ),
  constraint sla_policy_versions_resolution_status_check check (
    resolution_completion_status in (
      'resolution_submitted', 'citizen_verification_pending', 'resolved', 'closed'
    )
  ),
  constraint sla_policy_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_policy_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_policy_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_policy_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create unique index sla_policies_authority_default_code_unique
  on complaints.sla_policies (authority_id, code)
  where local_body_id is null;

create unique index sla_policies_local_body_code_unique
  on complaints.sla_policies (authority_id, local_body_id, code)
  where local_body_id is not null;

create table complaints.sla_category_overrides (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  category_id uuid not null references routing.issue_categories (id) on delete restrict,
  acknowledgement_business_minutes integer,
  inspection_business_minutes integer,
  resolution_business_minutes integer,
  created_at timestamptz not null default now(),
  constraint sla_category_overrides_category_unique unique (policy_version_id, category_id),
  constraint sla_category_overrides_nonempty_check check (
    acknowledgement_business_minutes is not null
    or inspection_business_minutes is not null
    or resolution_business_minutes is not null
  ),
  constraint sla_category_overrides_target_check check (
    (
      acknowledgement_business_minutes is null
      or acknowledgement_business_minutes between 1 and 5256000
    )
    and (
      inspection_business_minutes is null
      or inspection_business_minutes between 1 and 5256000
    )
    and (
      resolution_business_minutes is null
      or resolution_business_minutes between 1 and 5256000
    )
  )
);

create table complaints.sla_escalation_rules (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references complaints.sla_policies (id) on delete restrict,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sla_escalation_rules_code_unique unique (policy_id, code),
  constraint sla_escalation_rules_code_check check (
    code = btrim(code) and code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint sla_escalation_rules_name_check check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create table complaints.sla_escalation_rule_versions (
  id uuid primary key default gen_random_uuid(),
  escalation_rule_id uuid not null
    references complaints.sla_escalation_rules (id) on delete restrict,
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  version integer not null,
  milestone text not null,
  escalation_level smallint not null,
  business_minutes_after_target integer not null default 0,
  action_type text not null,
  target_officer_role_id uuid references governance.officer_roles (id) on delete restrict,
  status text not null default 'draft',
  effective_from timestamptz not null,
  effective_to timestamptz,
  source_url text,
  verification_status text not null default 'unverified',
  approved_by_user_id uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sla_escalation_rule_versions_number_unique unique (
    escalation_rule_id,
    version
  ),
  constraint sla_escalation_rule_versions_number_check check (version >= 1),
  constraint sla_escalation_rule_versions_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint sla_escalation_rule_versions_level_check check (
    escalation_level between 1 and 20
  ),
  constraint sla_escalation_rule_versions_delay_check check (
    business_minutes_after_target between 0 and 5256000
  ),
  constraint sla_escalation_rule_versions_action_check check (
    action_type in ('record', 'mark_escalated')
  ),
  constraint sla_escalation_rule_versions_status_check check (
    status in ('draft', 'approved', 'superseded')
  ),
  constraint sla_escalation_rule_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint sla_escalation_rule_versions_source_url_check check (
    source_url is null
    or (
      source_url = btrim(source_url)
      and char_length(source_url) between 10 and 2048
      and source_url ~ '^https?://'
    )
  ),
  constraint sla_escalation_rule_versions_verification_check check (
    verification_status in (
      'placeholder', 'unverified', 'source_verified', 'manually_verified',
      'conflicting', 'superseded', 'stale'
    )
  ),
  constraint sla_escalation_rule_versions_approval_check check (
    (
      status in ('approved', 'superseded')
      and verification_status in ('source_verified', 'manually_verified')
      and source_url is not null
      and approved_by_user_id is not null
      and approved_at is not null
      and (status <> 'superseded' or effective_to is not null)
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
  )
);

create table complaints.complaint_sla_bindings (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  cycle integer not null default 1,
  status text not null,
  policy_version_id uuid
    references complaints.sla_policy_versions (id) on delete restrict,
  candidate_count smallint not null,
  reason_code text not null,
  evaluated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint complaint_sla_bindings_cycle_unique unique (complaint_id, cycle),
  constraint complaint_sla_bindings_cycle_check check (cycle >= 1),
  constraint complaint_sla_bindings_status_check check (
    status in ('applied', 'not_configured', 'ambiguous', 'invalid_configuration')
  ),
  constraint complaint_sla_bindings_candidate_check check (
    candidate_count between 0 and 100
  ),
  constraint complaint_sla_bindings_reason_check check (
    reason_code in (
      'approved_policy_applied', 'no_approved_policy', 'ambiguous_approved_policy',
      'invalid_calendar_configuration', 'unverified_assignment_scope',
      'unverified_issue_category'
    )
  ),
  constraint complaint_sla_bindings_shape_check check (
    (
      status = 'applied'
      and policy_version_id is not null
      and candidate_count = 1
      and reason_code = 'approved_policy_applied'
    )
    or (
      status = 'not_configured'
      and policy_version_id is null
      and candidate_count = 0
      and reason_code in (
        'no_approved_policy', 'unverified_assignment_scope', 'unverified_issue_category'
      )
    )
    or (
      status = 'ambiguous'
      and policy_version_id is null
      and candidate_count > 1
      and reason_code = 'ambiguous_approved_policy'
    )
    or (
      status = 'invalid_configuration'
      and policy_version_id is null
      and reason_code = 'invalid_calendar_configuration'
    )
  )
);

create table complaints.complaint_sla_clocks (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  binding_id uuid not null
    references complaints.complaint_sla_bindings (id) on delete restrict,
  policy_version_id uuid not null
    references complaints.sla_policy_versions (id) on delete restrict,
  calendar_version_id uuid not null
    references complaints.sla_calendar_versions (id) on delete restrict,
  category_override_id uuid
    references complaints.sla_category_overrides (id) on delete restrict,
  milestone text not null,
  cycle integer not null default 1,
  target_business_minutes integer not null,
  started_at timestamptz not null,
  target_at timestamptz not null,
  state text not null default 'active',
  paused_at timestamptz,
  completed_at timestamptz,
  completion_status_history_id uuid
    references complaints.complaint_status_history (id) on delete restrict,
  breached_at timestamptz,
  external_dependency_segment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_sla_clocks_milestone_cycle_unique unique (
    complaint_id,
    milestone,
    cycle
  ),
  constraint complaint_sla_clocks_binding_milestone_unique unique (binding_id, milestone),
  constraint complaint_sla_clocks_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint complaint_sla_clocks_cycle_check check (cycle >= 1),
  constraint complaint_sla_clocks_target_minutes_check check (
    target_business_minutes between 1 and 5256000
  ),
  constraint complaint_sla_clocks_target_check check (target_at > started_at),
  constraint complaint_sla_clocks_state_check check (
    state in ('active', 'paused', 'met', 'breached', 'cancelled')
  ),
  constraint complaint_sla_clocks_lifecycle_check check (
    (
      state = 'active'
      and paused_at is null
      and completed_at is null
      and completion_status_history_id is null
    )
    or (
      state = 'paused'
      and paused_at is not null
      and completed_at is null
      and completion_status_history_id is null
    )
    or (
      state = 'met'
      and paused_at is null
      and completed_at is not null
      and completion_status_history_id is not null
      and breached_at is null
    )
    or (
      state = 'breached'
      and paused_at is null
      and breached_at is not null
    )
    or state = 'cancelled'
  )
);

create table complaints.complaint_sla_pause_intervals (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  external_dependency_id uuid not null
    references complaints.complaint_external_dependencies (id) on delete restrict,
  paused_at timestamptz not null,
  resumed_at timestamptz,
  paused_business_minutes integer,
  created_at timestamptz not null default now(),
  constraint complaint_sla_pause_intervals_clock_dependency_unique unique (
    clock_id,
    external_dependency_id
  ),
  constraint complaint_sla_pause_intervals_period_check check (
    resumed_at is null or resumed_at >= paused_at
  ),
  constraint complaint_sla_pause_intervals_minutes_check check (
    paused_business_minutes is null or paused_business_minutes >= 0
  ),
  constraint complaint_sla_pause_intervals_lifecycle_check check (
    (resumed_at is null and paused_business_minutes is null)
    or (resumed_at is not null and paused_business_minutes is not null)
  )
);

create unique index complaint_sla_pause_intervals_one_open_idx
  on complaints.complaint_sla_pause_intervals (clock_id)
  where resumed_at is null;

create table complaints.complaint_sla_deadline_history (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  sequence integer not null,
  reason_code text not null,
  prior_target_at timestamptz,
  target_at timestamptz not null,
  source_external_dependency_id uuid
    references complaints.complaint_external_dependencies (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint complaint_sla_deadline_history_sequence_unique unique (clock_id, sequence),
  constraint complaint_sla_deadline_history_sequence_check check (sequence >= 1),
  constraint complaint_sla_deadline_history_reason_check check (
    reason_code in ('initial_policy', 'external_dependency_resumed')
  ),
  constraint complaint_sla_deadline_history_shape_check check (
    (
      reason_code = 'initial_policy'
      and sequence = 1
      and prior_target_at is null
      and source_external_dependency_id is null
    )
    or (
      reason_code = 'external_dependency_resumed'
      and prior_target_at is not null
      and target_at >= prior_target_at
      and source_external_dependency_id is not null
    )
  )
);

create table complaints.sla_escalation_jobs (
  id uuid primary key default gen_random_uuid(),
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  escalation_rule_version_id uuid not null
    references complaints.sla_escalation_rule_versions (id) on delete restrict,
  due_at timestamptz not null,
  state text not null default 'pending',
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_failure_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sla_escalation_jobs_clock_rule_unique unique (
    clock_id,
    escalation_rule_version_id
  ),
  constraint sla_escalation_jobs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'cancelled', 'dead')
  ),
  constraint sla_escalation_jobs_attempt_check check (attempt_count between 0 and 5),
  constraint sla_escalation_jobs_worker_check check (
    worker_id is null
    or (worker_id = btrim(worker_id) and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$')
  ),
  constraint sla_escalation_jobs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint sla_escalation_jobs_lifecycle_check check (
    (
      state in ('pending', 'retry')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is null
    )
    or (
      state = 'processing'
      and worker_id is not null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
    )
    or (
      state in ('completed', 'cancelled', 'dead')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is not null
    )
  )
);

create table complaints.complaint_sla_escalation_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  clock_id uuid not null references complaints.complaint_sla_clocks (id) on delete restrict,
  escalation_job_id uuid not null unique
    references complaints.sla_escalation_jobs (id) on delete restrict,
  escalation_rule_version_id uuid not null
    references complaints.sla_escalation_rule_versions (id) on delete restrict,
  assignment_id uuid not null
    references complaints.complaint_assignments (id) on delete restrict,
  milestone text not null,
  escalation_level smallint not null,
  action_type text not null,
  prior_status text not null,
  resulting_status text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint complaint_sla_escalation_events_milestone_check check (
    milestone in ('acknowledgement', 'inspection', 'resolution')
  ),
  constraint complaint_sla_escalation_events_level_check check (
    escalation_level between 1 and 20
  ),
  constraint complaint_sla_escalation_events_action_check check (
    action_type in ('record', 'mark_escalated')
  ),
  constraint complaint_sla_escalation_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and not (
      metadata ?| array[
        'description', 'exactLocation', 'latitude', 'longitude', 'phone', 'email',
        'objectPath', 'signedUrl', 'token', 'leaseToken', 'sha256'
      ]
    )
  )
);

create table complaints.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null,
  created_at timestamptz not null default now(),
  constraint kpi_definitions_code_check check (
    code in (
      'acknowledgement_compliance', 'resolution_compliance',
      'citizen_confirmed_resolution_rate', 'reopen_rate', 'misrouting_rate',
      'backlog', 'evidence_completeness', 'communication_quality'
    )
  ),
  constraint kpi_definitions_name_check check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint kpi_definitions_unit_check check (unit in ('count', 'percent'))
);

create table complaints.kpi_definition_versions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references complaints.kpi_definitions (id) on delete restrict,
  version integer not null,
  algorithm_version text not null,
  implementation_hash text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint kpi_definition_versions_number_unique unique (definition_id, version),
  constraint kpi_definition_versions_number_check check (version >= 1),
  constraint kpi_definition_versions_algorithm_check check (
    algorithm_version = btrim(algorithm_version)
    and algorithm_version ~ '^v[0-9]+$'
  ),
  constraint kpi_definition_versions_hash_check check (
    implementation_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint kpi_definition_versions_effective_period_check check (
    effective_to is null or effective_to > effective_from
  )
);

insert into complaints.kpi_definitions (code, name, unit)
values
  ('acknowledgement_compliance', 'Acknowledgement compliance', 'percent'),
  ('resolution_compliance', 'Resolution compliance', 'percent'),
  ('citizen_confirmed_resolution_rate', 'Citizen-confirmed resolution rate', 'percent'),
  ('reopen_rate', 'Reopening rate', 'percent'),
  ('misrouting_rate', 'Misrouting rate', 'percent'),
  ('backlog', 'Open backlog', 'count'),
  ('evidence_completeness', 'Resolution evidence completeness', 'percent'),
  ('communication_quality', 'Communication quality', 'percent');

insert into complaints.kpi_definition_versions (
  definition_id,
  version,
  algorithm_version,
  implementation_hash,
  effective_from
)
select
  definition.id,
  1,
  'v1',
  encode(extensions.digest(definition.code || ':v1', 'sha256'), 'hex'),
  timestamptz '2026-07-16 00:00:00+00'
from complaints.kpi_definitions as definition;

create table complaints.kpi_calculation_runs (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  source_cutoff_at timestamptz not null,
  state text not null default 'pending',
  request_fingerprint text not null,
  requested_by_user_id uuid references auth.users (id) on delete restrict,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_failure_code text,
  calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_calculation_runs_request_unique unique (
    authority_id,
    request_fingerprint
  ),
  constraint kpi_calculation_runs_window_check check (
    window_ended_at > window_started_at
    and window_ended_at <= source_cutoff_at
    and window_ended_at - window_started_at <= interval '366 days'
  ),
  constraint kpi_calculation_runs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'dead')
  ),
  constraint kpi_calculation_runs_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint kpi_calculation_runs_attempt_check check (attempt_count between 0 and 5),
  constraint kpi_calculation_runs_worker_check check (
    worker_id is null
    or (worker_id = btrim(worker_id) and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$')
  ),
  constraint kpi_calculation_runs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint kpi_calculation_runs_lifecycle_check check (
    (
      state in ('pending', 'retry')
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is null
    )
    or (
      state = 'processing'
      and worker_id is not null
      and lease_token is not null
      and lease_expires_at is not null
      and calculated_at is null
    )
    or (
      state = 'completed'
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is not null
    )
    or (
      state = 'dead'
      and worker_id is null
      and lease_token is null
      and lease_expires_at is null
      and calculated_at is null
    )
  )
);

create table complaints.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null
    references complaints.kpi_calculation_runs (id) on delete restrict,
  definition_version_id uuid not null
    references complaints.kpi_definition_versions (id) on delete restrict,
  scope_type text not null,
  authority_id uuid not null references governance.authorities (id) on delete restrict,
  local_body_id uuid not null references governance.local_bodies (id) on delete restrict,
  ward_id uuid references governance.wards (id) on delete restrict,
  authority_department_id uuid
    references governance.authority_departments (id) on delete restrict,
  segment text not null,
  numerator bigint not null,
  denominator bigint not null,
  value numeric(14, 4),
  sample_size bigint not null,
  exclusions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint kpi_snapshots_dimension_unique unique (
    calculation_run_id,
    definition_version_id,
    scope_type,
    local_body_id,
    ward_id,
    authority_department_id,
    segment
  ),
  constraint kpi_snapshots_scope_check check (
    (
      scope_type = 'municipality'
      and ward_id is null
      and authority_department_id is null
    )
    or (
      scope_type = 'ward'
      and ward_id is not null
      and authority_department_id is null
    )
    or (
      scope_type = 'department'
      and ward_id is null
      and authority_department_id is not null
    )
  ),
  constraint kpi_snapshots_segment_check check (
    segment in ('all', 'external_dependency', 'no_external_dependency')
  ),
  constraint kpi_snapshots_values_check check (
    numerator >= 0
    and denominator >= 0
    and sample_size >= 0
    and (value is null or value >= 0)
  ),
  constraint kpi_snapshots_exclusions_check check (
    jsonb_typeof(exclusions) = 'object'
    and not (
      exclusions ?| array[
        'officerId', 'officerAssignmentId', 'description', 'exactLocation',
        'phone', 'email', 'objectPath', 'signedUrl', 'token', 'sha256'
      ]
    )
  )
);

create unique index kpi_snapshots_dimension_null_safe_unique
  on complaints.kpi_snapshots (
    calculation_run_id,
    definition_version_id,
    scope_type,
    local_body_id,
    coalesce(ward_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(
      authority_department_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    segment
  );

create index sla_calendar_versions_effective_idx
  on complaints.sla_calendar_versions (calendar_id, status, effective_from, effective_to);
create index sla_policy_versions_effective_idx
  on complaints.sla_policy_versions (policy_id, status, effective_from, effective_to);
create index sla_policies_scope_idx
  on complaints.sla_policies (authority_id, local_body_id, code);
create index sla_escalation_rule_versions_policy_idx
  on complaints.sla_escalation_rule_versions (
    policy_version_id, status, milestone, escalation_level
  );
create index sla_escalation_rule_versions_stable_idx
  on complaints.sla_escalation_rule_versions (
    escalation_rule_id, version, effective_from, effective_to
  );
create index complaint_sla_clocks_due_idx
  on complaints.complaint_sla_clocks (state, target_at, id)
  where state in ('active', 'paused');
create index complaint_sla_clocks_complaint_idx
  on complaints.complaint_sla_clocks (complaint_id, cycle, milestone);
create index complaint_sla_bindings_complaint_idx
  on complaints.complaint_sla_bindings (complaint_id, cycle desc);
create index complaint_sla_deadline_history_clock_idx
  on complaints.complaint_sla_deadline_history (clock_id, sequence);
create index sla_escalation_jobs_claim_idx
  on complaints.sla_escalation_jobs (state, next_attempt_at, due_at, id)
  where state in ('pending', 'retry', 'processing');
create index sla_escalation_jobs_lease_expiry_idx
  on complaints.sla_escalation_jobs (lease_expires_at, id)
  where state = 'processing';
create index complaint_sla_escalation_events_complaint_idx
  on complaints.complaint_sla_escalation_events (complaint_id, occurred_at desc, id);
create index kpi_calculation_runs_claim_idx
  on complaints.kpi_calculation_runs (state, next_attempt_at, created_at, id)
  where state in ('pending', 'retry', 'processing');
create index kpi_snapshots_scope_idx
  on complaints.kpi_snapshots (
    authority_id, scope_type, local_body_id, ward_id, authority_department_id, segment
  );
create index kpi_snapshots_run_definition_idx
  on complaints.kpi_snapshots (calculation_run_id, definition_version_id);

comment on table complaints.sla_calendar_versions is
  'Reviewed effective-dated business calendar versions; no operational calendar is seeded.';
comment on table complaints.sla_policy_versions is
  'Reviewed effective-dated SLA targets; draft or unverified versions never create clocks.';
comment on table complaints.complaint_sla_clocks is
  'Materialized complaint milestone clocks retaining exact policy, calendar, scope and deadline evidence.';
comment on table complaints.complaint_sla_bindings is
  'Immutable policy-selection outcome per complaint cycle, including fail-closed missing or ambiguous configuration.';
comment on table complaints.sla_escalation_jobs is
  'PostgreSQL-leased overdue work with bounded retries; lease tokens are private capabilities.';
comment on table complaints.complaint_sla_escalation_events is
  'Append-only automatic overdue escalation evidence without individual-officer performance scoring.';
comment on table complaints.kpi_definition_versions is
  'Versioned code-owned KPI algorithm identities used to reproduce immutable snapshot calculations.';
comment on table complaints.kpi_snapshots is
  'Immutable organizational KPI snapshots with scope, segment, numerator, denominator and source run provenance.';
