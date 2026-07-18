-- Local Wellness hosted BMC complaint-submission audit.
--
-- Safe to run in Supabase Dashboard > SQL Editor. This script is read-only,
-- returns only schema/configuration counts, and does not inspect citizen data.

begin transaction read only;
set local statement_timeout = '15s';

with runtime_checks (check_name, expected, actual, passed) as (
  values
    (
      'submit wrapper exists',
      'true',
      (pg_catalog.to_regprocedure(
        'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'
      ) is not null)::text,
      pg_catalog.to_regprocedure(
        'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'
      ) is not null
    ),
    (
      'routing evidence classifier exists',
      'true',
      (pg_catalog.to_regprocedure(
        'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'
      ) is not null)::text,
      pg_catalog.to_regprocedure(
        'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'
      ) is not null
    ),
    (
      'canonical submit implementation v2 exists',
      'true',
      (pg_catalog.to_regprocedure(
        'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)'
      ) is not null)::text,
      pg_catalog.to_regprocedure(
        'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)'
      ) is not null
    ),
    (
      'submit wrapper delegates to canonical implementation v2',
      'true',
      coalesce((
        select pg_catalog.pg_get_functiondef(procedure.oid)
          like '%complaints.complete_complaint_submission_v2(%'
        from pg_catalog.pg_proc as procedure
        inner join pg_catalog.pg_namespace as namespace
          on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public'
          and procedure.proname = 'submit_complaint'
          and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
            = 'p_actor_user_id uuid, p_submission_request_id uuid, p_routing_decision_id uuid, p_acknowledged_duplicate_suggestion_ids uuid[], p_emergency_disclaimer_acknowledged boolean'
      ), false)::text,
      coalesce((
        select pg_catalog.pg_get_functiondef(procedure.oid)
          like '%complaints.complete_complaint_submission_v2(%'
        from pg_catalog.pg_proc as procedure
        inner join pg_catalog.pg_namespace as namespace
          on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public'
          and procedure.proname = 'submit_complaint'
          and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
            = 'p_actor_user_id uuid, p_submission_request_id uuid, p_routing_decision_id uuid, p_acknowledged_duplicate_suggestion_ids uuid[], p_emergency_disclaimer_acknowledged boolean'
      ), false)
    ),
    (
      'service role can execute submit wrapper',
      'true',
      case
        when pg_catalog.to_regprocedure(
          'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'
        ) is null then 'false'
        else pg_catalog.has_function_privilege(
          'service_role',
          'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)',
          'EXECUTE'
        )::text
      end,
      case
        when pg_catalog.to_regprocedure(
          'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)'
        ) is null then false
        else pg_catalog.has_function_privilege(
          'service_role',
          'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)',
          'EXECUTE'
        )
      end
    ),
    (
      'service role cannot execute canonical implementation v2 directly',
      'false',
      case
        when pg_catalog.to_regprocedure(
          'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)'
        ) is null then 'missing'
        else pg_catalog.has_function_privilege(
          'service_role',
          'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)',
          'EXECUTE'
        )::text
      end,
      case
        when pg_catalog.to_regprocedure(
          'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)'
        ) is null then false
        else not pg_catalog.has_function_privilege(
          'service_role',
          'complaints.complete_complaint_submission_v2(uuid,uuid,uuid,uuid[],boolean)',
          'EXECUTE'
        )
      end
    ),
    (
      'service role cannot execute routing evidence classifier directly',
      'false',
      case
        when pg_catalog.to_regprocedure(
          'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'
        ) is null then 'missing'
        else pg_catalog.has_function_privilege(
          'service_role',
          'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)',
          'EXECUTE'
        )::text
      end,
      case
        when pg_catalog.to_regprocedure(
          'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)'
        ) is null then false
        else not pg_catalog.has_function_privilege(
          'service_role',
          'complaints.complaint_routing_evidence_mismatches(uuid,uuid,uuid)',
          'EXECUTE'
        )
      end
    )
),
required_triggers (schema_name, table_name, trigger_name) as (
  values
    ('complaints', 'complaints', 'complaints_ensure_conversation'),
    ('complaints', 'complaint_assignments', 'complaint_assignments_validate_version_mutation'),
    ('complaints', 'complaint_assignments', 'complaint_assignments_assignment_outbox'),
    ('complaints', 'complaint_assignments', 'complaint_assignments_initialize_sla'),
    ('complaints', 'complaint_status_history', 'complaint_status_history_submission_outbox'),
    ('complaints', 'complaint_status_history', 'complaint_status_history_apply_sla'),
    ('complaints', 'notification_outbox', 'notification_outbox_create_job')
),
trigger_checks as (
  select
    'trigger ' || required.trigger_name as check_name,
    'enabled'::text as expected,
    coalesce(
      case trigger_record.tgenabled
        when 'O' then 'enabled'
        when 'A' then 'enabled_always'
        when 'R' then 'enabled_replica'
        when 'D' then 'disabled'
      end,
      'missing'
    ) as actual,
    trigger_record.oid is not null and trigger_record.tgenabled <> 'D' as passed
  from required_triggers as required
  left join pg_catalog.pg_namespace as namespace
    on namespace.nspname = required.schema_name
  left join pg_catalog.pg_class as relation
    on relation.relnamespace = namespace.oid
    and relation.relname = required.table_name
  left join pg_catalog.pg_trigger as trigger_record
    on trigger_record.tgrelid = relation.oid
    and trigger_record.tgname = required.trigger_name
    and not trigger_record.tgisinternal
),
all_checks as (
  select * from runtime_checks
  union all
  select * from trigger_checks
)
select check_name, expected, actual, passed
from all_checks
order by passed, check_name;

with pilot_categories (category_code) as (
  values
    ('garbage_dump'),
    ('missed_sweeping'),
    ('pothole'),
    ('blocked_drain'),
    ('sewage_overflow'),
    ('water_leakage'),
    ('broken_streetlight'),
    ('open_manhole'),
    ('mosquito_breeding'),
    ('illegal_construction'),
    ('encroachment'),
    ('fallen_tree')
),
bmc_scope as (
  select
    'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'::uuid as local_body_id,
    '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'::uuid as authority_id
),
metrics (metric, expected, actual, passed) as (
  select
    'pilot category records', 12::bigint, count(*)::bigint, count(*) = 12
  from routing.issue_categories as category
  where category.code in (select category_code from pilot_categories)
  union all
  select
    'operational BMC categories', 3::bigint, count(*)::bigint, count(*) = 3
  from routing.issue_categories as category
  where category.code in ('garbage_dump', 'missed_sweeping', 'mosquito_breeding')
    and category.status = 'active'
    and category.verification_status = 'verified'
    and not category.is_placeholder
    and category.is_routing_eligible
  union all
  select
    'BMC operational ward records', 26::bigint, count(*)::bigint, count(*) = 26
  from governance.wards as ward
  cross join bmc_scope
  where ward.local_body_id = bmc_scope.local_body_id
    and ward.source_ward_code like 'BMC-%'
    and ward.source_ward_code not like 'BMC-LEGACY-GEOMETRY-%'
    and not ward.is_placeholder
  union all
  select
    'BMC auto-routable one-to-one wards', 22::bigint, count(*)::bigint, count(*) = 22
  from governance.ward_boundary_crosswalk_versions as crosswalk
  inner join governance.wards as ward on ward.id = crosswalk.operational_ward_id
  cross join bmc_scope
  where ward.local_body_id = bmc_scope.local_body_id
    and crosswalk.status = 'active'
    and crosswalk.verification_status = 'verified'
    and not crosswalk.is_placeholder
    and crosswalk.is_routing_eligible
    and crosswalk.auto_route_allowed
    and crosswalk.relationship_type = 'one_to_one'
    and crosswalk.effective_to is null
  union all
  select
    'active BMC internal route versions', 66::bigint, count(*)::bigint, count(*) = 66
  from routing.route_rules as rule
  inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
  where rule.rule_code like 'BMC_INTERNAL_%'
    and rule.status = 'active'
    and rule.verification_status = 'verified'
    and not rule.is_placeholder
    and rule.is_routing_eligible
    and version.status = 'active'
    and version.verification_status = 'verified'
    and not version.is_placeholder
    and version.is_routing_eligible
  union all
  select
    'BMC contacts approved for external complaint delivery',
    0::bigint,
    count(*)::bigint,
    count(*) = 0
  from governance.contact_channel_versions as version
  inner join governance.contact_channels as channel on channel.id = version.contact_channel_id
  cross join bmc_scope
  where version.is_complaint_delivery_approved
    and (
      channel.authority_id = bmc_scope.authority_id
      or channel.local_body_id = bmc_scope.local_body_id
      or channel.ward_id in (
        select ward.id
        from governance.wards as ward
        where ward.local_body_id = bmc_scope.local_body_id
      )
      or channel.office_id in (
        select office.id
        from governance.offices as office
        where office.authority_id = bmc_scope.authority_id
      )
      or channel.officer_assignment_id in (
        select assignment.id
        from governance.officer_assignments as assignment
        where assignment.authority_id = bmc_scope.authority_id
      )
    )
)
select metric, expected, actual, passed
from metrics
order by passed, metric;

rollback;
