begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(48);

select has_table('complaints', 'sla_calendars');
select has_table('complaints', 'sla_calendar_versions');
select has_table('complaints', 'sla_calendar_working_periods');
select has_table('complaints', 'sla_calendar_exceptions');
select has_table('complaints', 'sla_policies');
select has_table('complaints', 'sla_policy_versions');
select has_table('complaints', 'sla_category_overrides');
select has_table('complaints', 'sla_escalation_rules');
select has_table('complaints', 'sla_escalation_rule_versions');
select has_table('complaints', 'complaint_sla_bindings');
select has_table('complaints', 'complaint_sla_clocks');
select has_table('complaints', 'complaint_sla_pause_intervals');
select has_table('complaints', 'complaint_sla_deadline_history');
select has_table('complaints', 'sla_escalation_jobs');
select has_table('complaints', 'complaint_sla_escalation_events');
select has_table('complaints', 'kpi_definitions');
select has_table('complaints', 'kpi_definition_versions');
select has_table('complaints', 'kpi_calculation_runs');
select has_table('complaints', 'kpi_snapshots');

select is(
  (select count(*)::integer from complaints.sla_calendar_versions),
  0,
  'Phase 9 seeds no operational SLA calendar version'
);
select is(
  (select count(*)::integer from complaints.sla_policy_versions),
  0,
  'Phase 9 seeds no operational SLA policy version'
);
select is(
  (select count(*)::integer from complaints.sla_escalation_rule_versions),
  0,
  'Phase 9 seeds no operational escalation rule version'
);
select is(
  (select count(*)::integer from complaints.kpi_definitions),
  8,
  'the bounded organizational KPI catalogue is seeded'
);
select is(
  (select count(*)::integer from complaints.kpi_definition_versions),
  8,
  'each seeded KPI has one reproducible algorithm version'
);
select is(
  (
    select definition.name
    from complaints.kpi_definitions as definition
    where definition.code = 'communication_quality'
  ),
  'Communication quality',
  'communication-quality code and display name describe the rating metric'
);

select ok(not exists (
  select 1
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = any(array[
      'sla_calendars', 'sla_calendar_versions', 'sla_calendar_working_periods',
      'sla_calendar_exceptions', 'sla_policies', 'sla_policy_versions',
      'sla_category_overrides', 'sla_escalation_rules',
      'sla_escalation_rule_versions', 'complaint_sla_bindings',
      'complaint_sla_clocks', 'complaint_sla_pause_intervals',
      'complaint_sla_deadline_history', 'sla_escalation_jobs',
      'complaint_sla_escalation_events', 'kpi_definitions',
      'kpi_definition_versions', 'kpi_calculation_runs', 'kpi_snapshots'
    ])
    and (not relation.relrowsecurity or not relation.relforcerowsecurity)
), 'every Phase 9 table enables and forces RLS');

select ok(not has_table_privilege(
  'service_role', 'complaints.complaint_sla_clocks', 'select'
), 'service role cannot read SLA clocks directly');
select ok(not has_table_privilege(
  'authenticated', 'complaints.kpi_snapshots', 'select'
), 'authenticated clients cannot read KPI snapshots directly');
select ok(not has_table_privilege(
  'anon', 'complaints.sla_policy_versions', 'select'
), 'anonymous clients cannot read SLA configuration directly');

select ok(to_regprocedure(
  'public.publish_sla_calendar_version(uuid,uuid)'
) is not null, 'calendar publication RPC exists');
select ok(to_regprocedure(
  'public.publish_sla_policy_version(uuid,uuid)'
) is not null, 'policy publication RPC exists');
select ok(to_regprocedure(
  'public.publish_sla_escalation_rule_version(uuid,uuid)'
) is not null, 'escalation publication RPC exists');
select ok(to_regprocedure(
  'public.claim_sla_escalation_jobs(text,integer,integer)'
) is not null, 'SLA job claim RPC exists');
select ok(to_regprocedure(
  'public.execute_sla_escalation_job(uuid,uuid)'
) is not null, 'SLA job execution RPC exists');
select ok(to_regprocedure(
  'public.fail_sla_escalation_job(uuid,uuid,text)'
) is not null, 'SLA job failure RPC exists');
select ok(to_regprocedure(
  'public.enqueue_kpi_calculation_run(uuid,uuid,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
) is not null, 'KPI enqueue RPC exists');
select ok(to_regprocedure(
  'public.schedule_kpi_calculation_runs(timestamp with time zone,timestamp with time zone,timestamp with time zone)'
) is not null, 'KPI scheduler RPC exists');
select ok(to_regprocedure(
  'public.claim_kpi_calculation_runs(text,integer,integer)'
) is not null, 'KPI claim RPC exists');
select ok(to_regprocedure(
  'public.materialize_kpi_calculation_run(uuid,uuid)'
) is not null, 'KPI materialization RPC exists');
select ok(to_regprocedure(
  'public.fail_kpi_calculation_run(uuid,uuid,text)'
) is not null, 'KPI failure RPC exists');
select ok(to_regprocedure(
  'public.get_government_complaint_sla(uuid,uuid,uuid)'
) is not null, 'government SLA detail RPC exists');
select ok(to_regprocedure(
  'public.list_government_kpi_snapshots(uuid,uuid,uuid,text,uuid,text,text[])'
) is not null, 'government KPI list RPC exists');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'publish_sla_calendar_version', 'publish_sla_policy_version',
      'publish_sla_escalation_rule_version', 'claim_sla_escalation_jobs',
      'execute_sla_escalation_job', 'fail_sla_escalation_job',
      'enqueue_kpi_calculation_run', 'schedule_kpi_calculation_runs',
      'claim_kpi_calculation_runs', 'materialize_kpi_calculation_run',
      'fail_kpi_calculation_run', 'get_government_complaint_sla',
      'list_government_kpi_snapshots'
    ])
    and not has_function_privilege('service_role', procedure.oid, 'execute')
), 'service role can execute every intended Phase 9 RPC');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'publish_sla_calendar_version', 'publish_sla_policy_version',
      'publish_sla_escalation_rule_version', 'claim_sla_escalation_jobs',
      'execute_sla_escalation_job', 'fail_sla_escalation_job',
      'enqueue_kpi_calculation_run', 'schedule_kpi_calculation_runs',
      'claim_kpi_calculation_runs', 'materialize_kpi_calculation_run',
      'fail_kpi_calculation_run', 'get_government_complaint_sla',
      'list_government_kpi_snapshots'
    ])
    and has_function_privilege('authenticated', procedure.oid, 'execute')
), 'authenticated clients cannot invoke Phase 9 service RPCs directly');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'publish_sla_calendar_version', 'publish_sla_policy_version',
      'publish_sla_escalation_rule_version', 'claim_sla_escalation_jobs',
      'execute_sla_escalation_job', 'fail_sla_escalation_job',
      'enqueue_kpi_calculation_run', 'schedule_kpi_calculation_runs',
      'claim_kpi_calculation_runs', 'materialize_kpi_calculation_run',
      'fail_kpi_calculation_run', 'get_government_complaint_sla',
      'list_government_kpi_snapshots'
    ])
    and has_function_privilege('anon', procedure.oid, 'execute')
), 'anonymous clients cannot invoke Phase 9 service RPCs');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'complaints'
    and procedure.proname = any(array[
      'actor_is_platform_admin', 'reject_sla_append_only_mutation',
      'validate_sla_reviewed_version_mutation', 'validate_sla_draft_child_mutation',
      'validate_sla_calendar_configuration', 'add_sla_business_minutes',
      'sla_business_minutes_between', 'initialize_complaint_sla',
      'initialize_initial_complaint_sla', 'resume_sla_clock',
      'apply_status_event_to_sla', 'apply_external_dependency_to_sla',
      'current_sla_escalation_job_id', 'complaint_matches_kpi_segment',
      'complaint_matches_kpi_scope', 'complaint_status_at'
    ])
    and has_function_privilege('public', procedure.oid, 'execute')
), 'internal Phase 9 functions retain no PUBLIC execute grant');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where procedure.prosecdef
    and namespace.nspname in ('public', 'complaints')
    and procedure.proname = any(array[
      'actor_is_platform_admin', 'reject_sla_append_only_mutation',
      'validate_sla_reviewed_version_mutation', 'validate_sla_draft_child_mutation',
      'validate_sla_calendar_configuration', 'add_sla_business_minutes',
      'sla_business_minutes_between', 'initialize_complaint_sla',
      'initialize_initial_complaint_sla', 'resume_sla_clock',
      'apply_status_event_to_sla', 'apply_external_dependency_to_sla',
      'current_sla_escalation_job_id', 'complaint_matches_kpi_segment',
      'complaint_matches_kpi_scope', 'complaint_status_at',
      'publish_sla_calendar_version', 'publish_sla_policy_version',
      'publish_sla_escalation_rule_version', 'claim_sla_escalation_jobs',
      'execute_sla_escalation_job', 'fail_sla_escalation_job',
      'enqueue_kpi_calculation_run', 'schedule_kpi_calculation_runs',
      'claim_kpi_calculation_runs', 'materialize_kpi_calculation_run',
      'fail_kpi_calculation_run', 'get_government_complaint_sla',
      'list_government_kpi_snapshots'
    ])
    and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
), 'every Phase 9 security-definer function pins an empty search path');

select ok(not exists (
  select 1
  from information_schema.columns
  where table_schema = 'complaints'
    and table_name in ('kpi_calculation_runs', 'kpi_snapshots')
    and column_name ilike '%officer%'
), 'organizational KPI storage has no individual-officer ranking dimension');

select * from finish();
rollback;
