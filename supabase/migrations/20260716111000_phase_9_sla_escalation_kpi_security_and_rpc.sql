create function complaints.actor_is_platform_admin(
  p_actor_user_id uuid,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = p_actor_user_id
      and role.code = 'platform_admin'
      and user_role.scope_type = 'global'
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and profile.status = 'active'
  );
$$;

create function complaints.reject_sla_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are append-only.', tg_table_schema, tg_table_name);
end;
$$;

create function complaints.validate_sla_reviewed_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_id text := nullif(current_setting('local_wellness.sla_version_mutation_id', true), '');
  old_payload jsonb;
  new_payload jsonb;
begin
  if tg_op = 'DELETE' or configured_id is distinct from old.id::text then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;

  old_payload := to_jsonb(old) - array[
    'status', 'effective_to', 'approved_by_user_id', 'approved_at'
  ];
  new_payload := to_jsonb(new) - array[
    'status', 'effective_to', 'approved_by_user_id', 'approved_at'
  ];
  if new_payload is distinct from old_payload then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;

  if not (
    (
      old.status = 'draft'
      and new.status = 'approved'
      and old.approved_by_user_id is null
      and old.approved_at is null
      and new.approved_by_user_id is not null
      and new.approved_at is not null
    )
    or (
      old.status = 'approved'
      and new.status = 'superseded'
      and new.effective_to is not null
      and new.effective_to > new.effective_from
      and new.approved_by_user_id is not distinct from old.approved_by_user_id
      and new.approved_at is not distinct from old.approved_at
    )
  ) then
    raise exception using errcode = '55000', message = 'SLA_VERSION_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger sla_calendar_versions_validate_mutation
before update or delete on complaints.sla_calendar_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();
create trigger sla_policy_versions_validate_mutation
before update or delete on complaints.sla_policy_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();
create trigger sla_escalation_rule_versions_validate_mutation
before update or delete on complaints.sla_escalation_rule_versions
for each row execute function complaints.validate_sla_reviewed_version_mutation();

create function complaints.validate_sla_draft_child_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_id uuid;
  parent_status text;
begin
  if tg_table_name in ('sla_calendar_working_periods', 'sla_calendar_exceptions') then
    if tg_op = 'DELETE' then
      parent_id := old.calendar_version_id;
    else
      parent_id := new.calendar_version_id;
    end if;
    select version.status into parent_status
    from complaints.sla_calendar_versions as version
    where version.id = parent_id;
  else
    if tg_op = 'DELETE' then
      parent_id := old.policy_version_id;
    else
      parent_id := new.policy_version_id;
    end if;
    select version.status into parent_status
    from complaints.sla_policy_versions as version
    where version.id = parent_id;
  end if;

  if parent_status is distinct from 'draft' then
    raise exception using errcode = '55000', message = 'SLA_VERSION_CHILD_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger sla_calendar_working_periods_validate_mutation
before insert or update or delete on complaints.sla_calendar_working_periods
for each row execute function complaints.validate_sla_draft_child_mutation();
create trigger sla_calendar_exceptions_validate_mutation
before insert or update or delete on complaints.sla_calendar_exceptions
for each row execute function complaints.validate_sla_draft_child_mutation();
create trigger sla_category_overrides_validate_mutation
before insert or update or delete on complaints.sla_category_overrides
for each row execute function complaints.validate_sla_draft_child_mutation();

create trigger sla_calendars_append_only
before update or delete on complaints.sla_calendars
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger sla_policies_append_only
before update or delete on complaints.sla_policies
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger sla_escalation_rules_append_only
before update or delete on complaints.sla_escalation_rules
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_bindings_append_only
before update or delete on complaints.complaint_sla_bindings
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_deadline_history_append_only
before update or delete on complaints.complaint_sla_deadline_history
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger complaint_sla_escalation_events_append_only
before update or delete on complaints.complaint_sla_escalation_events
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_definitions_append_only
before update or delete on complaints.kpi_definitions
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_definition_versions_append_only
before update or delete on complaints.kpi_definition_versions
for each row execute function complaints.reject_sla_append_only_mutation();
create trigger kpi_snapshots_append_only
before update or delete on complaints.kpi_snapshots
for each row execute function complaints.reject_sla_append_only_mutation();

create function complaints.validate_sla_calendar_configuration(p_calendar_version_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
begin
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;

  if timezone_name is null or not exists (
    select 1 from pg_catalog.pg_timezone_names as timezone
    where timezone.name = timezone_name
  ) then
    return false;
  end if;
  if not exists (
    select 1 from complaints.sla_calendar_working_periods as period
    where period.calendar_version_id = p_calendar_version_id
  ) then
    return false;
  end if;
  if exists (
    select 1
    from complaints.sla_calendar_working_periods as left_period
    inner join complaints.sla_calendar_working_periods as right_period
      on right_period.calendar_version_id = left_period.calendar_version_id
     and right_period.iso_weekday = left_period.iso_weekday
     and right_period.id > left_period.id
     and right_period.opens_at < left_period.closes_at
     and right_period.closes_at > left_period.opens_at
    where left_period.calendar_version_id = p_calendar_version_id
  ) then
    return false;
  end if;
  return true;
end;
$$;

create function complaints.add_sla_business_minutes(
  p_calendar_version_id uuid,
  p_started_at timestamptz,
  p_business_minutes integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
  local_date date;
  current_at timestamptz := p_started_at;
  remaining_seconds numeric := p_business_minutes::numeric * 60;
  period record;
  period_started_at timestamptz;
  period_ended_at timestamptz;
  available_seconds numeric;
  days_scanned integer := 0;
begin
  if p_calendar_version_id is null or p_started_at is null
    or p_business_minutes is null or p_business_minutes < 0 then
    raise exception using errcode = '22023', message = 'SLA_CALENDAR_REQUEST_INVALID';
  end if;
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;
  if timezone_name is null or not complaints.validate_sla_calendar_configuration(
    p_calendar_version_id
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;

  if p_business_minutes = 0 then return p_started_at; end if;

  local_date := (current_at at time zone timezone_name)::date;
  while remaining_seconds > 0 loop
    days_scanned := days_scanned + 1;
    if days_scanned > 4000 then
      raise exception using errcode = '54000', message = 'SLA_CALENDAR_RANGE_EXCEEDED';
    end if;

    for period in
      with exception as (
        select candidate.*
        from complaints.sla_calendar_exceptions as candidate
        where candidate.calendar_version_id = p_calendar_version_id
          and candidate.exception_date = local_date
      ), periods as (
        select exception.opens_at, exception.closes_at
        from exception where exception.is_working_day
        union all
        select weekly.opens_at, weekly.closes_at
        from complaints.sla_calendar_working_periods as weekly
        where weekly.calendar_version_id = p_calendar_version_id
          and weekly.iso_weekday = extract(isodow from local_date)::smallint
          and not exists (select 1 from exception)
      )
      select periods.opens_at, periods.closes_at
      from periods
      order by periods.opens_at
    loop
      period_started_at := (local_date + period.opens_at) at time zone timezone_name;
      period_ended_at := (local_date + period.closes_at) at time zone timezone_name;
      if period_ended_at <= current_at then
        continue;
      end if;
      period_started_at := greatest(period_started_at, current_at);
      available_seconds := extract(epoch from period_ended_at - period_started_at);
      if available_seconds <= 0 then
        continue;
      end if;
      if remaining_seconds <= available_seconds then
        return period_started_at + make_interval(secs => remaining_seconds::double precision);
      end if;
      remaining_seconds := remaining_seconds - available_seconds;
      current_at := period_ended_at;
    end loop;
    local_date := local_date + 1;
    current_at := local_date::timestamp at time zone timezone_name;
  end loop;
  return current_at;
end;
$$;

create function complaints.sla_business_minutes_between(
  p_calendar_version_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  timezone_name text;
  local_date date;
  final_date date;
  period record;
  period_started_at timestamptz;
  period_ended_at timestamptz;
  total_seconds numeric := 0;
  days_scanned integer := 0;
begin
  if p_started_at is null or p_ended_at is null or p_ended_at < p_started_at then
    raise exception using errcode = '22023', message = 'SLA_CALENDAR_REQUEST_INVALID';
  end if;
  if p_ended_at = p_started_at then return 0; end if;
  select version.timezone_name into timezone_name
  from complaints.sla_calendar_versions as version
  where version.id = p_calendar_version_id;
  if timezone_name is null or not complaints.validate_sla_calendar_configuration(
    p_calendar_version_id
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;
  local_date := (p_started_at at time zone timezone_name)::date;
  final_date := (p_ended_at at time zone timezone_name)::date;
  while local_date <= final_date loop
    days_scanned := days_scanned + 1;
    if days_scanned > 4000 then
      raise exception using errcode = '54000', message = 'SLA_CALENDAR_RANGE_EXCEEDED';
    end if;
    for period in
      with exception as (
        select candidate.* from complaints.sla_calendar_exceptions as candidate
        where candidate.calendar_version_id = p_calendar_version_id
          and candidate.exception_date = local_date
      ), periods as (
        select exception.opens_at, exception.closes_at
        from exception where exception.is_working_day
        union all
        select weekly.opens_at, weekly.closes_at
        from complaints.sla_calendar_working_periods as weekly
        where weekly.calendar_version_id = p_calendar_version_id
          and weekly.iso_weekday = extract(isodow from local_date)::smallint
          and not exists (select 1 from exception)
      )
      select periods.opens_at, periods.closes_at from periods order by periods.opens_at
    loop
      period_started_at := greatest(
        (local_date + period.opens_at) at time zone timezone_name,
        p_started_at
      );
      period_ended_at := least(
        (local_date + period.closes_at) at time zone timezone_name,
        p_ended_at
      );
      if period_ended_at > period_started_at then
        total_seconds := total_seconds
          + extract(epoch from period_ended_at - period_started_at);
      end if;
    end loop;
    local_date := local_date + 1;
  end loop;
  return least(floor(total_seconds / 60), 2147483647)::integer;
end;
$$;

create function public.publish_sla_calendar_version(
  p_actor_user_id uuid,
  p_calendar_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_calendar_versions%rowtype;
  calendar complaints.sla_calendars%rowtype;
  prior_version complaints.sla_calendar_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_calendar_versions as candidate
  where candidate.id = p_calendar_version_id for update;
  select candidate.* into calendar from complaints.sla_calendars as candidate
  where candidate.id = version.calendar_id;
  if version.id is null or calendar.id is null or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or not private.is_verified_governance_authority(calendar.authority_id)
    or not complaints.validate_sla_calendar_configuration(version.id) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1 from complaints.sla_calendar_versions as candidate
    where candidate.calendar_id = version.calendar_id
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_calendar_versions as candidate
  where candidate.calendar_id = version.calendar_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_CALENDAR_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_calendar_versions as candidate
  where candidate.calendar_id = version.calendar_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_calendar_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_calendar_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function public.publish_sla_policy_version(
  p_actor_user_id uuid,
  p_policy_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_policy_versions%rowtype;
  policy complaints.sla_policies%rowtype;
  calendar complaints.sla_calendar_versions%rowtype;
  calendar_definition complaints.sla_calendars%rowtype;
  prior_version complaints.sla_policy_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_policy_versions as candidate
  where candidate.id = p_policy_version_id for update;
  select candidate.* into policy from complaints.sla_policies as candidate
  where candidate.id = version.policy_id;
  select candidate.* into calendar from complaints.sla_calendar_versions as candidate
  where candidate.id = version.calendar_version_id;
  select candidate.* into calendar_definition from complaints.sla_calendars as candidate
  where candidate.id = calendar.calendar_id;
  if version.id is null or policy.id is null or calendar.id is null
    or calendar_definition.id is null or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or calendar.status not in ('approved', 'superseded')
    or calendar.verification_status not in ('source_verified', 'manually_verified')
    or calendar_definition.authority_id <> policy.authority_id
    or not private.is_verified_governance_authority(policy.authority_id)
    or not complaints.validate_sla_calendar_configuration(calendar.id)
    or calendar.effective_from > version.effective_from
    or (
      calendar.effective_to is not null
      and (version.effective_to is null or calendar.effective_to < version.effective_to)
    ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_CONFIGURATION_INVALID';
  end if;
  if policy.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = policy.local_body_id
      and local_body.authority_id = policy.authority_id
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1
    from complaints.sla_category_overrides as override
    left join routing.issue_categories as category on category.id = override.category_id
    where override.policy_version_id = version.id
      and (
        category.id is null
        or category.status <> 'active'
        or category.verification_status <> 'verified'
        or category.is_placeholder
        or not category.is_routing_eligible
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_OVERRIDE_INVALID';
  end if;
  if exists (
    select 1 from complaints.sla_policy_versions as candidate
    where candidate.policy_id = version.policy_id
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_POLICY_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_policy_versions as candidate
  where candidate.policy_id = version.policy_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_POLICY_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_policy_versions as candidate
  where candidate.policy_id = version.policy_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_policy_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_policy_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function public.publish_sla_escalation_rule_version(
  p_actor_user_id uuid,
  p_escalation_rule_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version complaints.sla_escalation_rule_versions%rowtype;
  rule complaints.sla_escalation_rules%rowtype;
  policy_version complaints.sla_policy_versions%rowtype;
  prior_version complaints.sla_escalation_rule_versions%rowtype;
  approved_overlap_count integer;
  operation_at timestamptz := clock_timestamp();
begin
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  select candidate.* into version from complaints.sla_escalation_rule_versions as candidate
  where candidate.id = p_escalation_rule_version_id for update;
  select candidate.* into policy_version from complaints.sla_policy_versions as candidate
  where candidate.id = version.policy_version_id;
  select candidate.* into rule from complaints.sla_escalation_rules as candidate
  where candidate.id = version.escalation_rule_id;
  if version.id is null or policy_version.id is null or rule.id is null
    or version.status <> 'draft'
    or version.verification_status not in ('source_verified', 'manually_verified')
    or version.source_url is null
    or policy_version.status not in ('approved', 'superseded')
    or version.effective_from < policy_version.effective_from
    or (
      policy_version.effective_to is not null
      and (version.effective_to is null or version.effective_to > policy_version.effective_to)
    )
    or (version.milestone = 'inspection' and policy_version.inspection_business_minutes is null)
    or rule.policy_id <> policy_version.policy_id
    or (version.action_type = 'mark_escalated' and version.target_officer_role_id is null)
    or (
      version.target_officer_role_id is not null
      and not exists (
        select 1 from governance.officer_roles as officer_role
        where officer_role.id = version.target_officer_role_id
          and officer_role.status = 'active'
          and officer_role.verification_status = 'verified'
          and not officer_role.is_placeholder
          and officer_role.is_routing_eligible
      )
    ) then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_CONFIGURATION_INVALID';
  end if;
  if exists (
    select 1
    from complaints.sla_escalation_rule_versions as candidate
    where candidate.policy_version_id = version.policy_version_id
      and candidate.milestone = version.milestone
      and candidate.escalation_level = version.escalation_level
      and candidate.status in ('approved', 'superseded')
      and candidate.id <> version.id
      and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
        && tstzrange(version.effective_from, version.effective_to, '[)')
      and (
        candidate.escalation_rule_id <> version.escalation_rule_id
        or candidate.status = 'superseded'
        or candidate.effective_from >= version.effective_from
        or candidate.version >= version.version
      )
  ) then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_VERSION_OVERLAP';
  end if;
  select count(*)::integer into approved_overlap_count
  from complaints.sla_escalation_rule_versions as candidate
  where candidate.policy_version_id = version.policy_version_id
    and candidate.milestone = version.milestone
    and candidate.escalation_level = version.escalation_level
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)');
  if approved_overlap_count > 1 then
    raise exception using errcode = '55000', message = 'SLA_ESCALATION_VERSION_OVERLAP';
  end if;
  select candidate.* into prior_version
  from complaints.sla_escalation_rule_versions as candidate
  where candidate.policy_version_id = version.policy_version_id
    and candidate.milestone = version.milestone
    and candidate.escalation_level = version.escalation_level
    and candidate.escalation_rule_id = version.escalation_rule_id
    and candidate.status = 'approved'
    and candidate.id <> version.id
    and tstzrange(candidate.effective_from, candidate.effective_to, '[)')
      && tstzrange(version.effective_from, version.effective_to, '[)')
  limit 1
  for update;
  if prior_version.id is not null then
    perform set_config(
      'local_wellness.sla_version_mutation_id', prior_version.id::text, true
    );
    update complaints.sla_escalation_rule_versions as candidate
    set status = 'superseded', effective_to = version.effective_from
    where candidate.id = prior_version.id;
  end if;
  perform set_config('local_wellness.sla_version_mutation_id', version.id::text, true);
  update complaints.sla_escalation_rule_versions as candidate
  set status = 'approved', approved_by_user_id = p_actor_user_id, approved_at = operation_at
  where candidate.id = version.id;
  return version.id;
end;
$$;

create function complaints.initialize_complaint_sla(
  p_complaint_id uuid,
  p_assignment_id uuid,
  p_started_at timestamptz,
  p_cycle integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  selected_policy_version complaints.sla_policy_versions%rowtype;
  selected_policy_version_id uuid;
  selected_count integer := 0;
  binding_id uuid;
  override complaints.sla_category_overrides%rowtype;
  target record;
  clock_id uuid;
  target_at timestamptz;
begin
  if p_complaint_id is null or p_assignment_id is null or p_started_at is null
    or p_cycle is null or p_cycle < 1 then
    raise exception using errcode = '22023', message = 'SLA_BINDING_REQUEST_INVALID';
  end if;
  select existing.id into binding_id
  from complaints.complaint_sla_bindings as existing
  where existing.complaint_id = p_complaint_id and existing.cycle = p_cycle;
  if binding_id is not null then return binding_id; end if;

  select candidate.* into complaint from complaints.complaints as candidate
  where candidate.id = p_complaint_id;
  select candidate.* into assignment from complaints.complaint_assignments as candidate
  where candidate.id = p_assignment_id and candidate.complaint_id = p_complaint_id;
  if complaint.id is null or assignment.id is null then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if assignment.status <> 'active'
    or assignment.effective_from > p_started_at
    or (assignment.effective_to is not null and assignment.effective_to <= p_started_at)
    or not complaints.is_verified_assignment_scope(
      assignment.authority_id,
      assignment.local_body_id,
      assignment.ward_id,
      assignment.department_id,
      assignment.authority_department_id,
      assignment.officer_role_id,
      assignment.officer_assignment_id,
      p_started_at
    ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'unverified_assignment_scope', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  if not exists (
    select 1
    from routing.issue_categories as category
    where category.id = complaint.category_id
      and category.status = 'active'
      and category.verification_status = 'verified'
      and not category.is_placeholder
      and category.is_routing_eligible
  ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'unverified_issue_category', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  with eligible as (
    select version.*, ((policy.local_body_id is not null)::integer) as specificity
    from complaints.sla_policies as policy
    inner join complaints.sla_policy_versions as version on version.policy_id = policy.id
    inner join complaints.sla_calendar_versions as calendar
      on calendar.id = version.calendar_version_id
    where policy.authority_id = assignment.authority_id
      and (policy.local_body_id is null or policy.local_body_id = assignment.local_body_id)
      and version.status in ('approved', 'superseded')
      and version.verification_status in ('source_verified', 'manually_verified')
      and version.effective_from <= p_started_at
      and (version.effective_to is null or version.effective_to > p_started_at)
      and calendar.status in ('approved', 'superseded')
      and calendar.verification_status in ('source_verified', 'manually_verified')
      and calendar.effective_from <= p_started_at
      and (calendar.effective_to is null or calendar.effective_to > p_started_at)
  ), ranked as (
    select eligible.*, max(eligible.specificity) over () as highest_specificity
    from eligible
  )
  select (array_agg(ranked.id order by ranked.id))[1], count(*)::integer
  into selected_policy_version_id, selected_count
  from ranked where ranked.specificity = ranked.highest_specificity;

  if selected_count = 0 then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'not_configured', null,
      0, 'no_approved_policy', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;
  if selected_count > 1 then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'ambiguous', null,
      least(selected_count, 100), 'ambiguous_approved_policy', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;
  select candidate.* into selected_policy_version
  from complaints.sla_policy_versions as candidate
  where candidate.id = selected_policy_version_id;
  if not complaints.validate_sla_calendar_configuration(
    selected_policy_version.calendar_version_id
  ) then
    insert into complaints.complaint_sla_bindings (
      complaint_id, assignment_id, cycle, status, policy_version_id,
      candidate_count, reason_code, evaluated_at
    ) values (
      complaint.id, assignment.id, p_cycle, 'invalid_configuration', null,
      1, 'invalid_calendar_configuration', p_started_at
    ) returning id into binding_id;
    return binding_id;
  end if;

  insert into complaints.complaint_sla_bindings (
    complaint_id, assignment_id, cycle, status, policy_version_id,
    candidate_count, reason_code, evaluated_at
  ) values (
    complaint.id, assignment.id, p_cycle, 'applied', selected_policy_version.id,
    1, 'approved_policy_applied', p_started_at
  ) returning id into binding_id;

  select candidate.* into override
  from complaints.sla_category_overrides as candidate
  where candidate.policy_version_id = selected_policy_version.id
    and candidate.category_id = complaint.category_id;

  for target in
    select * from (values
      (
        'acknowledgement'::text,
        coalesce(
          override.acknowledgement_business_minutes,
          selected_policy_version.acknowledgement_business_minutes
        )
      ),
      (
        'inspection'::text,
        coalesce(
          override.inspection_business_minutes,
          selected_policy_version.inspection_business_minutes
        )
      ),
      (
        'resolution'::text,
        coalesce(
          override.resolution_business_minutes,
          selected_policy_version.resolution_business_minutes
        )
      )
    ) as configured(milestone, business_minutes)
    where configured.business_minutes is not null
  loop
    target_at := complaints.add_sla_business_minutes(
      selected_policy_version.calendar_version_id,
      p_started_at,
      target.business_minutes
    );
    insert into complaints.complaint_sla_clocks (
      complaint_id, assignment_id, binding_id, policy_version_id, calendar_version_id,
      category_override_id, milestone, cycle, target_business_minutes,
      started_at, target_at, state
    ) values (
      complaint.id, assignment.id, binding_id, selected_policy_version.id,
      selected_policy_version.calendar_version_id, override.id, target.milestone,
      p_cycle, target.business_minutes, p_started_at, target_at, 'active'
    ) returning id into clock_id;
    insert into complaints.complaint_sla_deadline_history (
      clock_id, sequence, reason_code, prior_target_at, target_at, occurred_at
    ) values (clock_id, 1, 'initial_policy', null, target_at, p_started_at);

    insert into complaints.sla_escalation_jobs (
      clock_id, escalation_rule_version_id, due_at, state, next_attempt_at
    )
    select
      clock_id,
      rule.id,
      complaints.add_sla_business_minutes(
        selected_policy_version.calendar_version_id,
        target_at,
        rule.business_minutes_after_target
      ),
      'pending',
      complaints.add_sla_business_minutes(
        selected_policy_version.calendar_version_id,
        target_at,
        rule.business_minutes_after_target
      )
    from complaints.sla_escalation_rule_versions as rule
    where rule.policy_version_id = selected_policy_version.id
      and rule.milestone = target.milestone
      and rule.status in ('approved', 'superseded')
      and rule.verification_status in ('source_verified', 'manually_verified')
      and rule.effective_from <= p_started_at
      and (rule.effective_to is null or rule.effective_to > p_started_at);
  end loop;
  return binding_id;
end;
$$;

create function complaints.initialize_initial_complaint_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.version = 1 and new.assignment_source = 'routing_decision' then
    perform complaints.initialize_complaint_sla(
      new.complaint_id,
      new.id,
      new.effective_from,
      1
    );
  end if;
  return new;
end;
$$;

create trigger complaint_assignments_initialize_sla
after insert on complaints.complaint_assignments
for each row execute function complaints.initialize_initial_complaint_sla();

create function complaints.resume_sla_clock(
  p_clock_id uuid,
  p_resumed_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  clock complaints.complaint_sla_clocks%rowtype;
  pause complaints.complaint_sla_pause_intervals%rowtype;
  paused_minutes integer;
  revised_target timestamptz;
  next_sequence integer;
begin
  if p_clock_id is null or p_resumed_at is null then
    raise exception using errcode = '22023', message = 'SLA_PAUSE_REQUEST_INVALID';
  end if;

  select candidate.* into clock
  from complaints.complaint_sla_clocks as candidate
  where candidate.id = p_clock_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SLA_CLOCK_NOT_FOUND';
  end if;
  if clock.state <> 'paused' then
    return clock.target_at;
  end if;

  select candidate.* into pause
  from complaints.complaint_sla_pause_intervals as candidate
  where candidate.clock_id = clock.id and candidate.resumed_at is null
  for update;
  if pause.id is null or p_resumed_at < pause.paused_at then
    raise exception using errcode = '55000', message = 'SLA_PAUSE_INTERVAL_INVALID';
  end if;

  paused_minutes := complaints.sla_business_minutes_between(
    clock.calendar_version_id,
    pause.paused_at,
    p_resumed_at
  );
  revised_target := complaints.add_sla_business_minutes(
    clock.calendar_version_id,
    clock.target_at,
    paused_minutes
  );

  update complaints.complaint_sla_pause_intervals as candidate
  set resumed_at = p_resumed_at, paused_business_minutes = paused_minutes
  where candidate.id = pause.id;
  update complaints.complaint_sla_clocks as candidate
  set state = 'active', paused_at = null, target_at = revised_target,
    updated_at = p_resumed_at
  where candidate.id = clock.id;

  select coalesce(max(history.sequence), 0) + 1 into next_sequence
  from complaints.complaint_sla_deadline_history as history
  where history.clock_id = clock.id;
  insert into complaints.complaint_sla_deadline_history (
    clock_id, sequence, reason_code, prior_target_at, target_at,
    source_external_dependency_id, occurred_at
  ) values (
    clock.id, next_sequence, 'external_dependency_resumed', clock.target_at,
    revised_target, pause.external_dependency_id, p_resumed_at
  );

  update complaints.sla_escalation_jobs as job
  set
    due_at = complaints.add_sla_business_minutes(
      clock.calendar_version_id,
      revised_target,
      rule.business_minutes_after_target
    ),
    next_attempt_at = complaints.add_sla_business_minutes(
      clock.calendar_version_id,
      revised_target,
      rule.business_minutes_after_target
    ),
    updated_at = p_resumed_at
  from complaints.sla_escalation_rule_versions as rule
  where job.clock_id = clock.id
    and job.escalation_rule_version_id = rule.id
    and job.state in ('pending', 'retry', 'processing');

  return revised_target;
end;
$$;

create or replace function complaints.initialize_initial_complaint_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_cycle integer;
  prior_clock record;
begin
  if new.status <> 'active' or new.effective_to is not null then
    return new;
  end if;

  for prior_clock in
    select candidate.id, candidate.state
    from complaints.complaint_sla_clocks as candidate
    where candidate.complaint_id = new.complaint_id
      and candidate.assignment_id <> new.id
      and candidate.completed_at is null
      and candidate.state in ('active', 'paused', 'breached')
    for update
  loop
    if prior_clock.state = 'paused' then
      perform complaints.resume_sla_clock(prior_clock.id, new.effective_from);
    end if;
  end loop;

  update complaints.complaint_sla_clocks as clock
  set state = 'cancelled', paused_at = null, updated_at = new.effective_from
  where clock.complaint_id = new.complaint_id
    and clock.assignment_id <> new.id
    and clock.completed_at is null
    and clock.state in ('active', 'paused', 'breached');
  update complaints.sla_escalation_jobs as job
  set state = 'cancelled', worker_id = null, lease_token = null,
    lease_expires_at = null, completed_at = new.effective_from,
    updated_at = new.effective_from
  from complaints.complaint_sla_clocks as clock
  where job.clock_id = clock.id
    and clock.complaint_id = new.complaint_id
    and clock.assignment_id <> new.id
    and job.state in ('pending', 'retry');

  select coalesce(max(binding.cycle), 0) + 1 into next_cycle
  from complaints.complaint_sla_bindings as binding
  where binding.complaint_id = new.complaint_id;
  perform complaints.initialize_complaint_sla(
    new.complaint_id,
    new.id,
    new.effective_from,
    next_cycle
  );
  return new;
end;
$$;

create function complaints.apply_status_event_to_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  next_cycle integer;
  operation_at timestamptz := new.occurred_at;
  clock_entry record;
  revised_target timestamptz;
begin
  for clock_entry in
    select candidate.id, candidate.state, candidate.target_at
    from complaints.complaint_sla_clocks as candidate
    inner join complaints.sla_policy_versions as policy
      on policy.id = candidate.policy_version_id
    where candidate.complaint_id = new.complaint_id
      and candidate.state in ('active', 'paused', 'breached')
      and candidate.completed_at is null
      and (
        (candidate.milestone = 'acknowledgement' and new.to_status = 'acknowledged')
        or (candidate.milestone = 'inspection' and new.to_status = 'inspection_completed')
        or (
          candidate.milestone = 'resolution'
          and new.to_status = policy.resolution_completion_status
        )
      )
    for update of candidate
  loop
    revised_target := clock_entry.target_at;
    if clock_entry.state = 'paused' then
      revised_target := complaints.resume_sla_clock(clock_entry.id, operation_at);
    end if;
    update complaints.complaint_sla_clocks as candidate
    set
      state = case when operation_at <= revised_target then 'met' else 'breached' end,
      paused_at = null,
      completed_at = operation_at,
      completion_status_history_id = new.id,
      breached_at = case when operation_at <= revised_target
        then null else coalesce(candidate.breached_at, revised_target) end,
      updated_at = operation_at
    where candidate.id = clock_entry.id;
  end loop;

  update complaints.sla_escalation_jobs as job
  set state = 'cancelled', completed_at = operation_at, updated_at = operation_at
  from complaints.complaint_sla_clocks as clock
  where job.clock_id = clock.id
    and clock.complaint_id = new.complaint_id
    and clock.completed_at is not null
    and job.state in ('pending', 'retry');

  if new.to_status in ('rejected', 'cancelled', 'closed') then
    for clock_entry in
      select candidate.id, candidate.state
      from complaints.complaint_sla_clocks as candidate
      where candidate.complaint_id = new.complaint_id
        and candidate.completed_at is null
        and candidate.state in ('active', 'paused', 'breached')
      for update
    loop
      if clock_entry.state = 'paused' then
        perform complaints.resume_sla_clock(clock_entry.id, operation_at);
      end if;
    end loop;
    update complaints.complaint_sla_clocks as clock
    set state = 'cancelled', paused_at = null, updated_at = operation_at
    where clock.complaint_id = new.complaint_id
      and clock.completed_at is null
      and clock.state in ('active', 'paused', 'breached');
    update complaints.sla_escalation_jobs as job
    set state = 'cancelled', completed_at = operation_at, updated_at = operation_at
    from complaints.complaint_sla_clocks as clock
    where job.clock_id = clock.id
      and clock.complaint_id = new.complaint_id
      and job.state in ('pending', 'retry');
  end if;

  if new.event_source = 'citizen_action' and new.to_status in ('reopened', 'escalated') then
    select assignment.id into assignment_id
    from complaints.complaint_assignments as assignment
    where assignment.complaint_id = new.complaint_id
      and assignment.status = 'active' and assignment.effective_to is null;
    select coalesce(max(binding.cycle), 0) + 1 into next_cycle
    from complaints.complaint_sla_bindings as binding
    where binding.complaint_id = new.complaint_id;
    if assignment_id is not null then
      perform complaints.initialize_complaint_sla(
        new.complaint_id, assignment_id, operation_at, next_cycle
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger complaint_status_history_apply_sla
after insert on complaints.complaint_status_history
for each row execute function complaints.apply_status_event_to_sla();

create function complaints.apply_external_dependency_to_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := coalesce(new.updated_at, clock_timestamp());
  clock record;
  pause complaints.complaint_sla_pause_intervals%rowtype;
  paused_minutes integer;
  prior_target timestamptz;
  revised_target timestamptz;
  next_sequence integer;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    update complaints.complaint_sla_clocks as candidate
    set external_dependency_segment = true, updated_at = operation_at
    where candidate.complaint_id = new.complaint_id;

    for clock in
      with updated as (
        update complaints.complaint_sla_clocks as candidate
        set state = 'paused', paused_at = operation_at, updated_at = operation_at
        from complaints.sla_policy_versions as policy
        where candidate.complaint_id = new.complaint_id
          and candidate.policy_version_id = policy.id
          and policy.pause_for_external_dependencies
          and candidate.state = 'active'
          and not exists (
            select 1 from complaints.complaint_sla_pause_intervals as existing
            where existing.clock_id = candidate.id and existing.resumed_at is null
          )
        returning candidate.id
      )
      select updated.id from updated
    loop
      insert into complaints.complaint_sla_pause_intervals (
        clock_id, external_dependency_id, paused_at
      ) values (clock.id, new.id, operation_at);
    end loop;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'active'
    and new.status in ('resolved', 'cancelled')
    and not exists (
    select 1 from complaints.complaint_external_dependencies as dependency
    where dependency.complaint_id = new.complaint_id
      and dependency.id <> new.id
      and dependency.status = 'active'
  ) then
    for clock in
      select candidate.*
      from complaints.complaint_sla_clocks as candidate
      where candidate.complaint_id = new.complaint_id
        and candidate.state = 'paused'
      for update
    loop
      select candidate.* into pause
      from complaints.complaint_sla_pause_intervals as candidate
      where candidate.clock_id = clock.id and candidate.resumed_at is null
      for update;
      if pause.id is null then continue; end if;
      paused_minutes := complaints.sla_business_minutes_between(
        clock.calendar_version_id,
        pause.paused_at,
        operation_at
      );
      prior_target := clock.target_at;
      revised_target := complaints.add_sla_business_minutes(
        clock.calendar_version_id,
        prior_target,
        paused_minutes
      );
      update complaints.complaint_sla_pause_intervals as candidate
      set resumed_at = operation_at, paused_business_minutes = paused_minutes
      where candidate.id = pause.id;
      update complaints.complaint_sla_clocks as candidate
      set state = 'active', paused_at = null, target_at = revised_target, updated_at = operation_at
      where candidate.id = clock.id;
      select coalesce(max(history.sequence), 0) + 1 into next_sequence
      from complaints.complaint_sla_deadline_history as history
      where history.clock_id = clock.id;
      insert into complaints.complaint_sla_deadline_history (
        clock_id, sequence, reason_code, prior_target_at, target_at,
        source_external_dependency_id, occurred_at
      ) values (
        clock.id, next_sequence, 'external_dependency_resumed', prior_target,
        revised_target, pause.external_dependency_id, operation_at
      );
      update complaints.sla_escalation_jobs as job
      set
        due_at = complaints.add_sla_business_minutes(
          clock.calendar_version_id,
          revised_target,
          rule.business_minutes_after_target
        ),
        next_attempt_at = complaints.add_sla_business_minutes(
          clock.calendar_version_id,
          revised_target,
          rule.business_minutes_after_target
        ),
        updated_at = operation_at
      from complaints.sla_escalation_rule_versions as rule
      where job.clock_id = clock.id
        and job.escalation_rule_version_id = rule.id
        and job.state in ('pending', 'retry', 'processing');
    end loop;
  end if;
  return new;
end;
$$;

create trigger complaint_external_dependencies_apply_sla
after insert or update of status on complaints.complaint_external_dependencies
for each row execute function complaints.apply_external_dependency_to_sla();

create function complaints.current_sla_escalation_job_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  configured text := nullif(current_setting('local_wellness.sla_escalation_job_id', true), '');
begin
  if configured is null then return null; end if;
  begin return configured::uuid;
  exception when invalid_text_representation then return null;
  end;
end;
$$;

create or replace function complaints.validate_complaint_workflow_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  government_action_id uuid := complaints.current_action_request_id();
  citizen_action_id uuid := complaints.current_citizen_action_request_id();
  sla_job_id uuid := complaints.current_sla_escalation_job_id();
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if new.id is distinct from old.id
    or new.draft_id is distinct from old.draft_id
    or new.complaint_number is distinct from old.complaint_number
    or new.citizen_user_id is distinct from old.citizen_user_id
    or new.category_id is distinct from old.category_id
    or new.asset_id is distinct from old.asset_id
    or new.description is distinct from old.description
    or new.description_language is distinct from old.description_language
    or new.custom_attributes is distinct from old.custom_attributes
    or new.location_evidence_id is distinct from old.location_evidence_id
    or new.routing_decision_id is distinct from old.routing_decision_id
    or new.visibility is distinct from old.visibility
    or new.submitted_at is distinct from old.submitted_at
    or new.created_at is distinct from old.created_at
    or new.workflow_version <> old.workflow_version + 1
    or new.updated_at < old.updated_at then
    raise exception using
      errcode = '55000',
      message = 'complaints.complaints records are append-only.';
  end if;

  if government_action_id is not null and exists (
    select 1
    from complaints.government_action_requests as action
    where action.id = government_action_id
      and action.complaint_id = old.id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then return new; end if;

  if citizen_action_id is not null and exists (
    select 1
    from complaints.citizen_action_requests as action
    where action.id = citizen_action_id
      and action.complaint_id = old.id
      and action.actor_user_id = old.citizen_user_id
      and action.state = 'claimed'
      and action.from_status = old.current_status
      and action.to_status = new.current_status
  ) then return new; end if;

  if sla_job_id is not null
    and new.current_status = 'escalated'
    and exists (
      select 1
      from complaints.sla_escalation_jobs as job
      inner join complaints.complaint_sla_clocks as clock on clock.id = job.clock_id
      inner join complaints.sla_escalation_rule_versions as rule
        on rule.id = job.escalation_rule_version_id
      where job.id = sla_job_id
        and job.state = 'processing'
        and job.lease_expires_at > clock_timestamp()
        and clock.complaint_id = old.id
        and rule.action_type = 'mark_escalated'
    ) then return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'complaints.complaints records are append-only.';
end;
$$;

create function public.claim_sla_escalation_jobs(
  p_worker_id text,
  p_limit integer default 25,
  p_lease_seconds integer default 60
)
returns table (job_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'
    or p_limit is null or p_limit not between 1 and 100
    or p_lease_seconds is null or p_lease_seconds not between 15 and 300 then
    raise exception using errcode = '22023', message = 'SLA_JOB_CLAIM_INVALID';
  end if;

  update complaints.sla_escalation_jobs as job
  set
    state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED', completed_at = operation_at, updated_at = operation_at
  where job.state = 'processing'
    and job.lease_expires_at <= operation_at and job.attempt_count >= 5;

  return query
  with candidates as materialized (
    select job.id
    from complaints.sla_escalation_jobs as job
    inner join complaints.complaint_sla_clocks as clock on clock.id = job.clock_id
    where clock.state in ('active', 'breached')
      and clock.completed_at is null
      and job.due_at <= operation_at
      and (
        (job.state in ('pending', 'retry') and job.next_attempt_at <= operation_at)
        or (
          job.state = 'processing' and job.lease_expires_at <= operation_at
          and job.attempt_count < 5
        )
      )
    order by job.due_at, job.created_at, job.id
    for update of job skip locked
    limit p_limit
  ), claimed as (
    update complaints.sla_escalation_jobs as job
    set
      state = 'processing', attempt_count = job.attempt_count + 1,
      worker_id = p_worker_id, lease_token = gen_random_uuid(),
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case when job.state = 'processing'
        then 'LEASE_EXPIRED' else job.last_failure_code end,
      updated_at = operation_at
    from candidates where job.id = candidates.id
    returning job.id, job.lease_token
  )
  select claimed.id, claimed.lease_token from claimed;
end;
$$;

create function public.execute_sla_escalation_job(
  p_job_id uuid,
  p_lease_token uuid
)
returns table (
  outcome text,
  escalation_event_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job complaints.sla_escalation_jobs%rowtype;
  clock complaints.complaint_sla_clocks%rowtype;
  rule complaints.sla_escalation_rule_versions%rowtype;
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
  event_id uuid;
  operation_at timestamptz := clock_timestamp();
  prior_status text;
  resulting_status text;
  status_history_id uuid;
  status_sequence integer;
begin
  if p_job_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'SLA_JOB_REQUEST_INVALID';
  end if;
  select candidate.* into job from complaints.sla_escalation_jobs as candidate
  where candidate.id = p_job_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SLA_JOB_NOT_FOUND';
  end if;
  select existing.id into event_id
  from complaints.complaint_sla_escalation_events as existing
  where existing.escalation_job_id = job.id;
  if job.state = 'completed' and event_id is not null then
    return query select 'completed'::text, event_id, true;
    return;
  end if;
  if job.state <> 'processing' or job.lease_token is distinct from p_lease_token
    or job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'SLA_JOB_CLAIM_INVALID';
  end if;
  select candidate.* into clock from complaints.complaint_sla_clocks as candidate
  where candidate.id = job.clock_id for update;
  select candidate.* into rule from complaints.sla_escalation_rule_versions as candidate
  where candidate.id = job.escalation_rule_version_id;
  select candidate.* into complaint from complaints.complaints as candidate
  where candidate.id = clock.complaint_id for update;
  select candidate.* into assignment
  from complaints.complaint_assignments as candidate
  where candidate.complaint_id = clock.complaint_id
    and candidate.status = 'active'
    and candidate.effective_to is null;

  if clock.completed_at is not null or clock.state = 'cancelled'
    or complaint.current_status in ('resolved', 'closed', 'rejected', 'cancelled')
    or assignment.id is null
    or assignment.id <> clock.assignment_id then
    update complaints.sla_escalation_jobs as candidate
    set state = 'cancelled', worker_id = null, lease_token = null, lease_expires_at = null,
      completed_at = operation_at, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'cancelled'::text, null::uuid, false;
    return;
  end if;

  if clock.state = 'paused' or job.due_at > operation_at then
    update complaints.sla_escalation_jobs as candidate
    set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
      next_attempt_at = greatest(job.due_at, operation_at + interval '1 minute'),
      last_failure_code = null, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'cancelled'::text, null::uuid, false;
    return;
  end if;

  update complaints.complaint_sla_clocks as candidate
  set state = 'breached', breached_at = coalesce(candidate.breached_at, candidate.target_at),
    updated_at = operation_at
  where candidate.id = clock.id and candidate.state = 'active';

  prior_status := complaint.current_status;
  resulting_status := prior_status;
  if rule.action_type = 'mark_escalated' and prior_status <> 'escalated' then
    perform set_config('local_wellness.sla_escalation_job_id', job.id::text, true);
    update complaints.complaints as candidate
    set current_status = 'escalated', workflow_version = candidate.workflow_version + 1,
      updated_at = operation_at
    where candidate.id = complaint.id;
    resulting_status := 'escalated';
  end if;

  select coalesce(max(history.sequence), 0) + 1 into status_sequence
  from complaints.complaint_status_history as history
  where history.complaint_id = complaint.id;
  insert into complaints.complaint_status_history (
    complaint_id, sequence, from_status, to_status, actor_user_id, event_source,
    reason_code, public_message, metadata, occurred_at
  ) values (
    complaint.id, status_sequence, prior_status, resulting_status, null, 'system',
    case when rule.action_type = 'mark_escalated'
      then 'SLA_OVERDUE_ESCALATION' else 'SLA_OVERDUE_RECORDED' end,
    'The complaint exceeded a reviewed service deadline.',
    jsonb_build_object(
      'milestone', rule.milestone,
      'escalationLevel', rule.escalation_level
    ),
    operation_at
  ) returning id into status_history_id;

  insert into complaints.notification_outbox (
    complaint_id,
    status_history_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    complaint.id,
    status_history_id,
    'complaint_status_changed',
    complaint.id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', complaint.id,
      'complaintNumber', complaint.complaint_number,
      'status', resulting_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', operation_at
    )),
    operation_at
  );

  insert into complaints.complaint_sla_escalation_events (
    complaint_id, clock_id, escalation_job_id, escalation_rule_version_id,
    assignment_id, milestone, escalation_level, action_type,
    prior_status, resulting_status, occurred_at,
    metadata
  ) values (
    complaint.id, clock.id, job.id, rule.id, clock.assignment_id,
    rule.milestone, rule.escalation_level, rule.action_type,
    prior_status, resulting_status, operation_at,
    jsonb_build_object('statusHistoryId', status_history_id)
  ) returning id into event_id;

  update complaints.sla_escalation_jobs as candidate
  set state = 'completed', worker_id = null, lease_token = null, lease_expires_at = null,
    completed_at = operation_at, updated_at = operation_at
  where candidate.id = job.id;

  return query select
    case when resulting_status = 'escalated' and prior_status <> 'escalated'
      then 'escalated'::text else 'recorded'::text end,
    event_id,
    false;
end;
$$;

create function public.fail_sla_escalation_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job complaints.sla_escalation_jobs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_job_id is null or p_lease_token is null
    or p_error_code <> 'SLA_ESCALATION_EXECUTION_FAILED' then
    raise exception using errcode = '22023', message = 'SLA_JOB_FAILURE_INVALID';
  end if;
  select candidate.* into job from complaints.sla_escalation_jobs as candidate
  where candidate.id = p_job_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SLA_JOB_NOT_FOUND'; end if;
  if job.state <> 'processing' or job.lease_token is distinct from p_lease_token
    or job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'SLA_JOB_CLAIM_INVALID';
  end if;
  if job.attempt_count >= 5 then
    update complaints.sla_escalation_jobs as candidate
    set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
      last_failure_code = p_error_code, completed_at = operation_at, updated_at = operation_at
    where candidate.id = job.id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;
  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, job.attempt_count - 1))::integer)
  );
  update complaints.sla_escalation_jobs as candidate
  set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
    next_attempt_at = retry_at, last_failure_code = p_error_code, updated_at = operation_at
  where candidate.id = job.id;
  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function complaints.complaint_matches_kpi_segment(
  p_complaint_id uuid,
  p_segment text,
  p_source_cutoff_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_segment
    when 'all' then true
    when 'external_dependency' then exists (
      select 1 from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = p_complaint_id
        and dependency.created_at <= p_source_cutoff_at
    )
    when 'no_external_dependency' then not exists (
      select 1 from complaints.complaint_external_dependencies as dependency
      where dependency.complaint_id = p_complaint_id
        and dependency.created_at <= p_source_cutoff_at
    )
    else false
  end;
$$;

create function complaints.complaint_matches_kpi_scope(
  p_complaint_id uuid,
  p_authority_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_source_cutoff_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaint_assignments as assignment
    where assignment.complaint_id = p_complaint_id
      and assignment.authority_id = p_authority_id
      and assignment.effective_from <= p_source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > p_source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id,
        assignment.local_body_id,
        assignment.ward_id,
        assignment.department_id,
        assignment.authority_department_id,
        assignment.officer_role_id,
        assignment.officer_assignment_id,
        p_source_cutoff_at
      )
      and (
        (p_scope_type = 'municipality' and assignment.local_body_id = p_scope_id)
        or (p_scope_type = 'ward' and assignment.ward_id = p_scope_id)
        or (
          p_scope_type = 'department'
          and assignment.authority_department_id = p_scope_id
        )
      )
  );
$$;

create function complaints.complaint_status_at(
  p_complaint_id uuid,
  p_source_cutoff_at timestamptz
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select history.to_status
  from complaints.complaint_status_history as history
  where history.complaint_id = p_complaint_id
    and history.occurred_at <= p_source_cutoff_at
  order by history.occurred_at desc, history.sequence desc
  limit 1;
$$;

create function public.enqueue_kpi_calculation_run(
  p_actor_user_id uuid,
  p_authority_id uuid,
  p_window_started_at timestamptz,
  p_window_ended_at timestamptz,
  p_source_cutoff_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  fingerprint text;
  operation_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or p_authority_id is null
    or p_window_started_at is null or p_window_ended_at is null
    or p_source_cutoff_at is null
    or p_window_ended_at <= p_window_started_at
    or p_window_ended_at > p_source_cutoff_at
    or p_source_cutoff_at > operation_at
    or p_window_ended_at - p_window_started_at > interval '366 days' then
    raise exception using errcode = '22023', message = 'KPI_RUN_REQUEST_INVALID';
  end if;
  if not complaints.actor_is_platform_admin(p_actor_user_id, operation_at) and not exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join public.authority_memberships as membership
      on membership.user_id = user_role.user_id
     and membership.authority_id = user_role.authority_id
    where user_role.user_id = p_actor_user_id
      and user_role.authority_id = p_authority_id
      and user_role.scope_type = 'authority'
      and role.code in ('municipal_admin', 'government_operator')
      and user_role.status = 'active'
      and user_role.effective_from <= operation_at
      and (user_role.effective_until is null or user_role.effective_until > operation_at)
      and membership.status = 'active'
      and membership.effective_from <= operation_at
      and (membership.effective_until is null or membership.effective_until > operation_at)
      and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;
  if not private.is_verified_governance_authority(p_authority_id) then
    raise exception using errcode = '55000', message = 'KPI_AUTHORITY_NOT_VERIFIED';
  end if;
  fingerprint := encode(extensions.digest(
    concat_ws(
      '|',
      p_authority_id::text,
      round(extract(epoch from p_window_started_at) * 1000000)::bigint::text,
      round(extract(epoch from p_window_ended_at) * 1000000)::bigint::text,
      round(extract(epoch from p_source_cutoff_at) * 1000000)::bigint::text,
      'kpi-v1'
    ),
    'sha256'
  ), 'hex');
  insert into complaints.kpi_calculation_runs (
    authority_id, window_started_at, window_ended_at, source_cutoff_at,
    request_fingerprint, requested_by_user_id, next_attempt_at
  ) values (
    p_authority_id, p_window_started_at, p_window_ended_at, p_source_cutoff_at,
    fingerprint, p_actor_user_id, operation_at
  )
  on conflict (authority_id, request_fingerprint) do update
    set authority_id = excluded.authority_id
  returning id into run_id;
  return run_id;
end;
$$;

create function public.schedule_kpi_calculation_runs(
  p_window_started_at timestamptz,
  p_window_ended_at timestamptz,
  p_source_cutoff_at timestamptz
)
returns table (run_id uuid, authority_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_window_started_at is null or p_window_ended_at is null
    or p_source_cutoff_at is null or p_window_ended_at <= p_window_started_at
    or p_window_ended_at > p_source_cutoff_at
    or p_source_cutoff_at > operation_at
    or p_window_ended_at - p_window_started_at > interval '366 days' then
    raise exception using errcode = '22023', message = 'KPI_RUN_REQUEST_INVALID';
  end if;
  return query
  with authorities as (
    select distinct assignment.authority_id
    from complaints.complaint_assignments as assignment
    inner join complaints.complaints as complaint on complaint.id = assignment.complaint_id
    where complaint.submitted_at <= p_source_cutoff_at
      and private.is_verified_governance_authority(assignment.authority_id)
  ), candidates as (
    select
      authority.authority_id,
      encode(extensions.digest(
        concat_ws(
          '|',
          authority.authority_id::text,
          round(extract(epoch from p_window_started_at) * 1000000)::bigint::text,
          round(extract(epoch from p_window_ended_at) * 1000000)::bigint::text,
          round(extract(epoch from p_source_cutoff_at) * 1000000)::bigint::text,
          'kpi-v1'
        ),
        'sha256'
      ), 'hex') as fingerprint
    from authorities as authority
  ), inserted as (
    insert into complaints.kpi_calculation_runs (
      authority_id, window_started_at, window_ended_at, source_cutoff_at,
      request_fingerprint, requested_by_user_id, next_attempt_at
    )
    select
      candidate.authority_id, p_window_started_at, p_window_ended_at,
      p_source_cutoff_at, candidate.fingerprint, null, clock_timestamp()
    from candidates as candidate
    on conflict on constraint kpi_calculation_runs_request_unique do update
      set authority_id = excluded.authority_id
    returning
      complaints.kpi_calculation_runs.id,
      complaints.kpi_calculation_runs.authority_id
  )
  select inserted.id, inserted.authority_id from inserted;
end;
$$;

create function public.claim_kpi_calculation_runs(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns table (run_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'
    or p_limit is null or p_limit not between 1 and 50
    or p_lease_seconds is null or p_lease_seconds not between 15 and 600 then
    raise exception using errcode = '22023', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  update complaints.kpi_calculation_runs as run
  set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED', updated_at = operation_at
  where run.state = 'processing' and run.lease_expires_at <= operation_at
    and run.attempt_count >= 5;

  return query
  with candidates as materialized (
    select run.id
    from complaints.kpi_calculation_runs as run
    where (
      run.state in ('pending', 'retry') and run.next_attempt_at <= operation_at
    ) or (
      run.state = 'processing' and run.lease_expires_at <= operation_at
      and run.attempt_count < 5
    )
    order by coalesce(run.lease_expires_at, run.next_attempt_at), run.created_at, run.id
    for update skip locked limit p_limit
  ), claimed as (
    update complaints.kpi_calculation_runs as run
    set state = 'processing', attempt_count = run.attempt_count + 1,
      worker_id = p_worker_id, lease_token = gen_random_uuid(),
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case when run.state = 'processing'
        then 'LEASE_EXPIRED' else run.last_failure_code end,
      updated_at = operation_at
    from candidates where run.id = candidates.id
    returning run.id, run.lease_token
  )
  select claimed.id, claimed.lease_token from claimed;
end;
$$;

create function public.materialize_kpi_calculation_run(
  p_run_id uuid,
  p_lease_token uuid
)
returns table (snapshot_count integer, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run complaints.kpi_calculation_runs%rowtype;
  scope record;
  segment text;
  definition record;
  numerator_value bigint;
  denominator_value bigint;
  sample_value bigint;
  metric_value numeric(14, 4);
  operation_at timestamptz := clock_timestamp();
  inserted_count integer := 0;
begin
  if p_run_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'KPI_RUN_MATERIALIZATION_INVALID';
  end if;
  select candidate.* into run from complaints.kpi_calculation_runs as candidate
  where candidate.id = p_run_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'KPI_RUN_NOT_FOUND'; end if;
  if run.state = 'completed' then
    select count(*)::integer into inserted_count
    from complaints.kpi_snapshots as snapshot
    where snapshot.calculation_run_id = run.id;
    return query select inserted_count, true;
    return;
  end if;
  if run.state <> 'processing' or run.lease_token is distinct from p_lease_token
    or run.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  if run.source_cutoff_at > operation_at
    or not private.is_verified_governance_authority(run.authority_id) then
    raise exception using errcode = '55000', message = 'KPI_RUN_SCOPE_INVALID';
  end if;

  for scope in
    select distinct
      'municipality'::text as scope_type,
      assignment.local_body_id as scope_id,
      assignment.local_body_id,
      null::uuid as ward_id,
      null::uuid as authority_department_id,
      local_body.name as scope_name
    from complaints.complaint_assignments as assignment
    inner join governance.local_bodies as local_body on local_body.id = assignment.local_body_id
    where assignment.authority_id = run.authority_id
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
    union
    select distinct
      'ward'::text, assignment.ward_id, assignment.local_body_id,
      assignment.ward_id, null::uuid, ward.name
    from complaints.complaint_assignments as assignment
    inner join governance.wards as ward on ward.id = assignment.ward_id
    where assignment.authority_id = run.authority_id and assignment.ward_id is not null
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
    union
    select distinct
      'department'::text, assignment.authority_department_id, assignment.local_body_id,
      null::uuid, assignment.authority_department_id, department.name
    from complaints.complaint_assignments as assignment
    inner join governance.authority_departments as authority_department
      on authority_department.id = assignment.authority_department_id
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where assignment.authority_id = run.authority_id
      and assignment.effective_from <= run.source_cutoff_at
      and (assignment.effective_to is null or assignment.effective_to > run.source_cutoff_at)
      and complaints.is_verified_assignment_scope(
        assignment.authority_id, assignment.local_body_id, assignment.ward_id,
        assignment.department_id, assignment.authority_department_id,
        assignment.officer_role_id, assignment.officer_assignment_id,
        run.source_cutoff_at
      )
  loop
    foreach segment in array array['all', 'external_dependency', 'no_external_dependency'] loop
      for definition in
        select stable.id as definition_id, stable.code, stable.unit,
          version.id as version_id, version.algorithm_version,
          version.implementation_hash
        from complaints.kpi_definitions as stable
        inner join complaints.kpi_definition_versions as version
          on version.definition_id = stable.id
        where version.effective_from <= run.source_cutoff_at
          and (version.effective_to is null or version.effective_to > run.source_cutoff_at)
          and version.version = (
            select max(candidate.version)
            from complaints.kpi_definition_versions as candidate
            where candidate.definition_id = stable.id
              and candidate.effective_from <= run.source_cutoff_at
              and (candidate.effective_to is null or candidate.effective_to > run.source_cutoff_at)
          )
        order by stable.code
      loop
        numerator_value := 0;
        denominator_value := 0;
        sample_value := 0;
        metric_value := null;

        if definition.code in ('acknowledgement_compliance', 'resolution_compliance') then
          select
            count(*) filter (
              where clock.completed_at is not null and clock.completed_at <= clock.target_at
            )::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_sla_clocks as clock
          where clock.milestone = case definition.code
              when 'acknowledgement_compliance' then 'acknowledgement' else 'resolution' end
            and clock.target_at >= run.window_started_at
            and clock.target_at < run.window_ended_at
            and clock.target_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              clock.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              clock.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'citizen_confirmed_resolution_rate' then
          select
            count(*) filter (where feedback.outcome = 'resolved')::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_feedback as feedback
          where feedback.created_at >= run.window_started_at
            and feedback.created_at < run.window_ended_at
            and feedback.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              feedback.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              feedback.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'reopen_rate' then
          select
            count(*) filter (where exists (
              select 1 from complaints.complaint_reopen_requests as reopen
              where reopen.resolution_id = resolution.id
                and reopen.requested_at <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_resolutions as resolution
          where resolution.created_at >= run.window_started_at
            and resolution.created_at < run.window_ended_at
            and resolution.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              resolution.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              resolution.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'misrouting_rate' then
          select
            count(*) filter (where exists (
              select 1 from complaints.complaint_assignments as correction
              where correction.complaint_id = complaint.id
                and correction.reason_code = 'routing_correction'
                and correction.effective_from <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaints as complaint
          where complaint.submitted_at >= run.window_started_at
            and complaint.submitted_at < run.window_ended_at
            and complaint.submitted_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              complaint.id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              complaint.id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'backlog' then
          select count(*)::bigint, count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaints as complaint
          where complaint.submitted_at <= run.source_cutoff_at
            and complaints.complaint_status_at(complaint.id, run.source_cutoff_at)
              not in ('resolved', 'closed', 'rejected', 'cancelled')
            and complaints.complaint_matches_kpi_scope(
              complaint.id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              complaint.id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'evidence_completeness' then
          select
            count(*) filter (where exists (
              select 1
              from complaints.complaint_resolution_evidence_links as link
              inner join complaints.complaint_resolution_evidence as evidence
                on evidence.id = link.evidence_id
              where link.resolution_id = resolution.id
                and evidence.upload_status = 'finalized'
                and evidence.finalized_at <= run.source_cutoff_at
            ))::bigint,
            count(*)::bigint
          into numerator_value, denominator_value
          from complaints.complaint_resolutions as resolution
          where resolution.created_at >= run.window_started_at
            and resolution.created_at < run.window_ended_at
            and resolution.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              resolution.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              resolution.complaint_id, segment, run.source_cutoff_at
            );
        elsif definition.code = 'communication_quality' then
          select
            coalesce(sum(
              feedback.communication_rating - resolution_policy_version.rating_minimum
            ), 0)::bigint,
            coalesce(sum(
              resolution_policy_version.rating_maximum
                - resolution_policy_version.rating_minimum
            ), 0)::bigint,
            count(*)::bigint
          into numerator_value, denominator_value, sample_value
          from complaints.complaint_feedback as feedback
          inner join complaints.resolution_policy_versions as resolution_policy_version
            on resolution_policy_version.id = feedback.resolution_policy_version_id
          where feedback.communication_rating is not null
            and feedback.communication_rating between
              resolution_policy_version.rating_minimum
              and resolution_policy_version.rating_maximum
            and feedback.created_at >= run.window_started_at
            and feedback.created_at < run.window_ended_at
            and feedback.created_at <= run.source_cutoff_at
            and complaints.complaint_matches_kpi_scope(
              feedback.complaint_id, run.authority_id, scope.scope_type,
              scope.scope_id, run.source_cutoff_at
            )
            and complaints.complaint_matches_kpi_segment(
              feedback.complaint_id, segment, run.source_cutoff_at
            );
        end if;

        if definition.code <> 'communication_quality' then
          sample_value := denominator_value;
        end if;
        metric_value := case
          when definition.code = 'backlog' then numerator_value::numeric
          when denominator_value > 0
            then round((numerator_value::numeric * 100) / denominator_value, 4)
          else null
        end;
        insert into complaints.kpi_snapshots (
          calculation_run_id, definition_version_id, scope_type, authority_id,
          local_body_id, ward_id, authority_department_id, segment,
          numerator, denominator, value, sample_size, exclusions
        ) values (
          run.id, definition.version_id, scope.scope_type, run.authority_id,
          scope.local_body_id, scope.ward_id, scope.authority_department_id, segment,
          numerator_value, denominator_value, metric_value, sample_value,
          jsonb_build_object(
            'sourceCutoffAt', run.source_cutoff_at,
            'algorithmVersion', definition.algorithm_version,
            'implementationHash', definition.implementation_hash
          )
        );
        inserted_count := inserted_count + 1;
      end loop;
    end loop;
  end loop;

  update complaints.kpi_calculation_runs as candidate
  set state = 'completed', worker_id = null, lease_token = null, lease_expires_at = null,
    calculated_at = operation_at, updated_at = operation_at
  where candidate.id = run.id;
  return query select inserted_count, false;
end;
$$;

create function public.fail_kpi_calculation_run(
  p_run_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run complaints.kpi_calculation_runs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_run_id is null or p_lease_token is null
    or p_error_code <> 'KPI_CALCULATION_FAILED' then
    raise exception using errcode = '22023', message = 'KPI_RUN_FAILURE_INVALID';
  end if;
  select candidate.* into run from complaints.kpi_calculation_runs as candidate
  where candidate.id = p_run_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'KPI_RUN_NOT_FOUND'; end if;
  if run.state <> 'processing' or run.lease_token is distinct from p_lease_token
    or run.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'KPI_RUN_CLAIM_INVALID';
  end if;
  if run.attempt_count >= 5 then
    update complaints.kpi_calculation_runs as candidate
    set state = 'dead', worker_id = null, lease_token = null, lease_expires_at = null,
      last_failure_code = p_error_code, updated_at = operation_at
    where candidate.id = run.id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;
  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, run.attempt_count - 1))::integer)
  );
  update complaints.kpi_calculation_runs as candidate
  set state = 'retry', worker_id = null, lease_token = null, lease_expires_at = null,
    next_attempt_at = retry_at, last_failure_code = p_error_code, updated_at = operation_at
  where candidate.id = run.id;
  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function public.get_government_complaint_sla(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_scope_role_assignment_id uuid default null
)
returns table (payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  binding complaints.complaint_sla_bindings%rowtype;
  unavailable_reason text;
begin
  if p_actor_user_id is null or p_complaint_id is null then
    raise exception using errcode = '22023', message = 'ACCOUNTABILITY_REQUEST_INVALID';
  end if;
  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;
  select assignment.id into assignment_id
  from complaints.complaint_assignments as assignment
  where assignment.complaint_id = p_complaint_id
    and assignment.status = 'active' and assignment.effective_to is null;
  if assignment_id is null or not complaints.actor_can_access_assignment(
    p_actor_user_id, assignment_id, 'view', p_scope_role_assignment_id, current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;
  select candidate.* into binding
  from complaints.complaint_sla_bindings as candidate
  where candidate.complaint_id = p_complaint_id
  order by candidate.cycle desc limit 1;
  unavailable_reason := case binding.status
    when 'not_configured' then binding.reason_code
    when 'ambiguous' then 'ambiguous_policy'
    when 'invalid_configuration' then 'invalid_configuration'
    when 'applied' then null
    else 'not_materialized'
  end;

  return query select jsonb_build_object(
    'complaintId', p_complaint_id,
    'policyApplied', coalesce(binding.status = 'applied', false),
    'unavailableReason', unavailable_reason,
    'clocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', clock.id,
        'milestone', clock.milestone,
        'cycle', clock.cycle,
        'state', clock.state,
        'policyCode', policy.code,
        'policyVersion', policy_version.version,
        'targetBusinessMinutes', clock.target_business_minutes,
        'startedAt', clock.started_at,
        'targetAt', clock.target_at,
        'completedAt', clock.completed_at,
        'breachedAt', clock.breached_at,
        'pausedAt', clock.paused_at,
        'externalDependencySegment', clock.external_dependency_segment
      ) order by clock.cycle, clock.milestone)
      from complaints.complaint_sla_clocks as clock
      inner join complaints.sla_policy_versions as policy_version
        on policy_version.id = clock.policy_version_id
      inner join complaints.sla_policies as policy on policy.id = policy_version.policy_id
      where clock.complaint_id = p_complaint_id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'clockId', event.clock_id,
        'milestone', event.milestone,
        'level', event.escalation_level,
        'action', event.action_type,
        'occurredAt', event.occurred_at,
        'resultingStatus', event.resulting_status
      ) order by event.occurred_at, event.id)
      from complaints.complaint_sla_escalation_events as event
      where event.complaint_id = p_complaint_id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.list_government_kpi_snapshots(
  p_actor_user_id uuid,
  p_authority_id uuid default null,
  p_scope_role_assignment_id uuid default null,
  p_scope_type text default null,
  p_scope_id uuid default null,
  p_segment text default null,
  p_metric_codes text[] default null
)
returns table (payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_authority_id uuid;
  authority_count integer;
  latest_run complaints.kpi_calculation_runs%rowtype;
begin
  if p_actor_user_id is null
    or (p_scope_type is null) <> (p_scope_id is null)
    or (p_scope_type is not null and p_scope_type not in ('municipality', 'ward', 'department'))
    or (p_segment is not null and p_segment not in (
      'all', 'external_dependency', 'no_external_dependency'
    ))
    or coalesce(cardinality(p_metric_codes), 0) > 20
    or exists (
      select 1 from unnest(coalesce(p_metric_codes, '{}'::text[])) as filter(code)
      where filter.code not in (
        'acknowledgement_compliance', 'resolution_compliance',
        'citizen_confirmed_resolution_rate', 'reopen_rate', 'misrouting_rate',
        'backlog', 'evidence_completeness', 'communication_quality'
      )
    ) then
    raise exception using errcode = '22023', message = 'ACCOUNTABILITY_REQUEST_INVALID';
  end if;

  if complaints.actor_is_platform_admin(p_actor_user_id, current_timestamp) then
    resolved_authority_id := p_authority_id;
    if resolved_authority_id is null then
      raise exception using errcode = '22023', message = 'KPI_AUTHORITY_REQUIRED';
    end if;
  else
    select
      (array_agg(distinct user_role.authority_id order by user_role.authority_id))[1],
      count(distinct user_role.authority_id)::integer
    into resolved_authority_id, authority_count
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    inner join public.authority_memberships as membership
      on membership.user_id = user_role.user_id
     and membership.authority_id = user_role.authority_id
    where user_role.user_id = p_actor_user_id
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and (p_authority_id is null or user_role.authority_id = p_authority_id)
      and role.is_government
      and profile.status = 'active'
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (membership.effective_until is null or membership.effective_until > current_timestamp);
    if authority_count <> 1 then
      raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
    end if;
  end if;

  if not exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = p_actor_user_id
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
      and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
      and (
        (role.code = 'platform_admin' and user_role.scope_type = 'global')
        or user_role.authority_id = resolved_authority_id
      )
  ) then
    raise exception using errcode = '42501', message = 'GOVERNMENT_ACCESS_REQUIRED';
  end if;

  select candidate.* into latest_run
  from complaints.kpi_calculation_runs as candidate
  where candidate.authority_id = resolved_authority_id and candidate.state = 'completed'
  order by candidate.source_cutoff_at desc, candidate.calculated_at desc, candidate.id desc
  limit 1;

  if latest_run.id is null then
    return query select jsonb_build_object(
      'runId', null, 'windowStartedAt', null, 'windowEndedAt', null,
      'sourceCutoffAt', null, 'calculatedAt', null, 'items', '[]'::jsonb
    );
    return;
  end if;

  return query select jsonb_build_object(
    'runId', latest_run.id,
    'windowStartedAt', latest_run.window_started_at,
    'windowEndedAt', latest_run.window_ended_at,
    'sourceCutoffAt', latest_run.source_cutoff_at,
    'calculatedAt', latest_run.calculated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', snapshot.id,
        'metricCode', definition.code,
        'metricName', definition.name,
        'unit', definition.unit,
        'definitionVersion', definition_version.version,
        'scopeType', snapshot.scope_type,
        'scopeId', case snapshot.scope_type
          when 'municipality' then snapshot.local_body_id
          when 'ward' then snapshot.ward_id
          else snapshot.authority_department_id end,
        'scopeName', case snapshot.scope_type
          when 'municipality' then local_body.name
          when 'ward' then ward.name
          else department.name end,
        'segment', snapshot.segment,
        'numerator', snapshot.numerator,
        'denominator', snapshot.denominator,
        'value', snapshot.value,
        'sampleSize', snapshot.sample_size
      ) order by snapshot.scope_type, snapshot.segment, definition.code, snapshot.id)
      from complaints.kpi_snapshots as snapshot
      inner join complaints.kpi_definition_versions as definition_version
        on definition_version.id = snapshot.definition_version_id
      inner join complaints.kpi_definitions as definition
        on definition.id = definition_version.definition_id
      inner join governance.local_bodies as local_body on local_body.id = snapshot.local_body_id
      left join governance.wards as ward on ward.id = snapshot.ward_id
      left join governance.authority_departments as authority_department
        on authority_department.id = snapshot.authority_department_id
      left join governance.departments as department
        on department.id = authority_department.department_id
      where snapshot.calculation_run_id = latest_run.id
        and (p_scope_type is null or snapshot.scope_type = p_scope_type)
        and (
          p_scope_id is null
          or (p_scope_type = 'municipality' and snapshot.local_body_id = p_scope_id)
          or (p_scope_type = 'ward' and snapshot.ward_id = p_scope_id)
          or (
            p_scope_type = 'department'
            and snapshot.authority_department_id = p_scope_id
          )
        )
        and (p_segment is null or snapshot.segment = p_segment)
        and (p_metric_codes is null or definition.code = any(p_metric_codes))
        and exists (
          select 1
          from public.user_roles as user_role
          inner join public.roles as role on role.id = user_role.role_id
          where user_role.user_id = p_actor_user_id
            and user_role.status = 'active'
            and user_role.effective_from <= current_timestamp
            and (user_role.effective_until is null or user_role.effective_until > current_timestamp)
            and (p_scope_role_assignment_id is null or user_role.id = p_scope_role_assignment_id)
            and (
              (role.code = 'platform_admin' and user_role.scope_type = 'global')
              or (
                user_role.authority_id = snapshot.authority_id
                and (
                  user_role.scope_type = 'authority'
                  or (user_role.scope_type = 'ward' and user_role.scope_id = snapshot.ward_id)
                  or (
                    user_role.scope_type = 'department'
                    and user_role.scope_id = snapshot.authority_department_id
                  )
                )
              )
            )
        )
    ), '[]'::jsonb)
  );
end;
$$;

alter table complaints.sla_calendars enable row level security;
alter table complaints.sla_calendars force row level security;
alter table complaints.sla_calendar_versions enable row level security;
alter table complaints.sla_calendar_versions force row level security;
alter table complaints.sla_calendar_working_periods enable row level security;
alter table complaints.sla_calendar_working_periods force row level security;
alter table complaints.sla_calendar_exceptions enable row level security;
alter table complaints.sla_calendar_exceptions force row level security;
alter table complaints.sla_policies enable row level security;
alter table complaints.sla_policies force row level security;
alter table complaints.sla_policy_versions enable row level security;
alter table complaints.sla_policy_versions force row level security;
alter table complaints.sla_category_overrides enable row level security;
alter table complaints.sla_category_overrides force row level security;
alter table complaints.sla_escalation_rules enable row level security;
alter table complaints.sla_escalation_rules force row level security;
alter table complaints.sla_escalation_rule_versions enable row level security;
alter table complaints.sla_escalation_rule_versions force row level security;
alter table complaints.complaint_sla_bindings enable row level security;
alter table complaints.complaint_sla_bindings force row level security;
alter table complaints.complaint_sla_clocks enable row level security;
alter table complaints.complaint_sla_clocks force row level security;
alter table complaints.complaint_sla_pause_intervals enable row level security;
alter table complaints.complaint_sla_pause_intervals force row level security;
alter table complaints.complaint_sla_deadline_history enable row level security;
alter table complaints.complaint_sla_deadline_history force row level security;
alter table complaints.sla_escalation_jobs enable row level security;
alter table complaints.sla_escalation_jobs force row level security;
alter table complaints.complaint_sla_escalation_events enable row level security;
alter table complaints.complaint_sla_escalation_events force row level security;
alter table complaints.kpi_definitions enable row level security;
alter table complaints.kpi_definitions force row level security;
alter table complaints.kpi_definition_versions enable row level security;
alter table complaints.kpi_definition_versions force row level security;
alter table complaints.kpi_calculation_runs enable row level security;
alter table complaints.kpi_calculation_runs force row level security;
alter table complaints.kpi_snapshots enable row level security;
alter table complaints.kpi_snapshots force row level security;

revoke all on all tables in schema complaints from anon, authenticated, service_role;

revoke all on function public.publish_sla_calendar_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_sla_policy_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_sla_escalation_rule_version(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.claim_sla_escalation_jobs(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.execute_sla_escalation_job(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_sla_escalation_job(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.enqueue_kpi_calculation_run(
  uuid, uuid, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.schedule_kpi_calculation_runs(
  timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.claim_kpi_calculation_runs(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.materialize_kpi_calculation_run(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_kpi_calculation_run(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_government_complaint_sla(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) from public, anon, authenticated;

grant execute on function public.publish_sla_calendar_version(uuid, uuid) to service_role;
grant execute on function public.publish_sla_policy_version(uuid, uuid) to service_role;
grant execute on function public.publish_sla_escalation_rule_version(uuid, uuid)
  to service_role;
grant execute on function public.claim_sla_escalation_jobs(text, integer, integer)
  to service_role;
grant execute on function public.execute_sla_escalation_job(uuid, uuid) to service_role;
grant execute on function public.fail_sla_escalation_job(uuid, uuid, text) to service_role;
grant execute on function public.enqueue_kpi_calculation_run(
  uuid, uuid, timestamptz, timestamptz, timestamptz
) to service_role;
grant execute on function public.schedule_kpi_calculation_runs(
  timestamptz, timestamptz, timestamptz
) to service_role;
grant execute on function public.claim_kpi_calculation_runs(text, integer, integer)
  to service_role;
grant execute on function public.materialize_kpi_calculation_run(uuid, uuid) to service_role;
grant execute on function public.fail_kpi_calculation_run(uuid, uuid, text) to service_role;
grant execute on function public.get_government_complaint_sla(uuid, uuid, uuid)
  to service_role;
grant execute on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) to service_role;

revoke execute on function complaints.actor_is_platform_admin(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.reject_sla_append_only_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_reviewed_version_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_draft_child_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.validate_sla_calendar_configuration(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.add_sla_business_minutes(uuid, timestamptz, integer)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.sla_business_minutes_between(
  uuid, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.initialize_complaint_sla(
  uuid, uuid, timestamptz, integer
) from public, anon, authenticated, service_role;
revoke execute on function complaints.initialize_initial_complaint_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.resume_sla_clock(uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function complaints.apply_status_event_to_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.apply_external_dependency_to_sla()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.current_sla_escalation_job_id()
  from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_matches_kpi_segment(
  uuid, text, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_matches_kpi_scope(
  uuid, uuid, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke execute on function complaints.complaint_status_at(uuid, timestamptz)
  from public, anon, authenticated, service_role;

comment on function public.get_government_complaint_sla(uuid, uuid, uuid) is
  'Returns access-scoped SLA clocks, fail-closed policy availability, and automatic escalation evidence.';
comment on function public.list_government_kpi_snapshots(
  uuid, uuid, uuid, text, uuid, text, text[]
) is
  'Returns only access-scoped immutable organizational KPI snapshots; no public or individual-officer output.';
