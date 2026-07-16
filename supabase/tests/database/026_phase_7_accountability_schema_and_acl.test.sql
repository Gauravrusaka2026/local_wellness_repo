begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(56);

select has_table('complaints', 'resolution_policies');
select has_table('complaints', 'resolution_policy_versions');
select has_table('complaints', 'citizen_action_requests');
select has_table('complaints', 'citizen_action_audit_events');
select has_table('complaints', 'complaint_feedback');
select has_table('complaints', 'complaint_reopen_evidence');
select has_table('complaints', 'complaint_reopen_requests');
select has_table('complaints', 'complaint_reopen_evidence_links');
select has_table('complaints', 'complaint_escalation_events');

select has_column('complaints', 'complaint_resolutions', 'completed_at',
  'resolution completion uses a server-owned timestamp');
select has_column('complaints', 'complaint_resolutions', 'completion_location',
  'resolution completion retains a PostGIS location');
select has_column('complaints', 'complaint_resolutions', 'completion_accuracy_meters',
  'resolution completion retains measured location accuracy');
select has_column('complaints', 'complaint_resolutions', 'completion_provider',
  'resolution completion retains its provider');
select has_column('complaints', 'complaint_resolutions', 'location_captured_at',
  'resolution completion retains capture time');
select has_column(
  'complaints',
  'complaint_resolutions',
  'completion_location_device_recorded_at',
  'resolution completion retains device time'
);
select has_column(
  'complaints',
  'complaint_resolutions',
  'completion_mock_location_detected',
  'resolution completion retains the nullable mock signal'
);
select has_column(
  'complaints',
  'complaint_resolutions',
  'completion_distance_to_complaint_meters',
  'resolution completion retains its distance from the complaint'
);
select has_column('complaints', 'complaint_resolutions', 'work_reference_id',
  'resolution history optionally snapshots a work reference');
select has_column('complaints', 'complaint_resolution_evidence_links', 'role',
  'resolution evidence links distinguish their after role');
select has_column('complaints', 'resolution_policy_versions', 'eligible_feedback_statuses',
  'policy versions configure feedback statuses');
select has_column('complaints', 'complaint_reopen_evidence', 'captured_at',
  'reopen evidence retains capture time');
select has_column('complaints', 'complaint_reopen_evidence', 'capture_location',
  'reopen evidence retains its PostGIS capture location');
select has_column('complaints', 'complaint_reopen_requests', 'reason_detail',
  'reopen requests retain the citizen explanation');

select ok(to_regprocedure(
  'public.perform_government_complaint_action(uuid,uuid,text,bigint,text,text,text,jsonb)'
) is not null);
select ok(to_regprocedure(
  'public.get_citizen_resolution_context(uuid,uuid)'
) is not null);
select ok(to_regprocedure(
  'public.get_government_complaint_accountability(uuid,uuid,uuid)'
) is not null);
select ok(to_regprocedure(
  'public.get_citizen_complaint_evidence_object(uuid,uuid,uuid,text)'
) is not null);
select ok(to_regprocedure(
  'public.reserve_citizen_reopen_evidence(uuid,uuid,bigint,text,text,text,text,text,bigint,text,timestamp with time zone,integer,integer,bigint,double precision,double precision,double precision,text,timestamp with time zone,timestamp with time zone,boolean)'
) is not null);
select ok(to_regprocedure(
  'public.finalize_citizen_reopen_evidence(uuid,uuid,uuid,bigint,text,text,text,text,bigint,text)'
) is not null);
select ok(to_regprocedure(
  'public.fail_citizen_reopen_evidence(uuid,text)'
) is not null);
select ok(to_regprocedure(
  'public.expire_citizen_reopen_evidence_reservations(integer)'
) is not null);
select ok(to_regprocedure(
  'public.submit_complaint_feedback(uuid,uuid,bigint,uuid,text,smallint,smallint,smallint,smallint,text,text,text,text)'
) is not null);
select ok(to_regprocedure(
  'public.reopen_complaint(uuid,uuid,bigint,uuid,text,text,uuid[],text,text,text)'
) is not null);

select ok(not exists (
  select 1
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = any(array[
      'resolution_policies',
      'resolution_policy_versions',
      'citizen_action_requests',
      'citizen_action_audit_events',
      'complaint_feedback',
      'complaint_reopen_evidence',
      'complaint_reopen_requests',
      'complaint_reopen_evidence_links',
      'complaint_escalation_events'
    ])
    and (not relation.relrowsecurity or not relation.relforcerowsecurity)
), 'all Phase 7 private tables enable and force RLS');

select is(
  (select count(*)::integer from complaints.resolution_policy_versions),
  0,
  'Phase 7 does not promote an operational resolution policy'
);
select ok(not has_table_privilege(
  'service_role',
  'complaints.complaint_feedback',
  'select'
));
select ok(not has_table_privilege(
  'authenticated',
  'complaints.complaint_reopen_evidence',
  'select'
));
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'complaints'
    and procedure.proname = any(array[
      'validate_resolution_policy_version',
      'current_citizen_action_request_id',
      'validate_citizen_action_request_mutation',
      'validate_complaint_workflow_mutation',
      'validate_reopen_evidence_mutation',
      'resolve_resolution_policy_version',
      'perform_phase7_resolution_submission',
      'accountability_resolution_payload'
    ])
    and has_function_privilege('public', procedure.oid, 'execute')
), 'internal security-definer helpers retain no PUBLIC execute grant');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where procedure.prosecdef
    and namespace.nspname in ('public', 'complaints')
    and procedure.proname = any(array[
      'validate_resolution_policy_version',
      'current_citizen_action_request_id',
      'validate_citizen_action_request_mutation',
      'validate_complaint_workflow_mutation',
      'validate_reopen_evidence_mutation',
      'resolve_resolution_policy_version',
      'perform_phase7_resolution_submission',
      'accountability_resolution_payload',
      'get_citizen_resolution_context',
      'get_government_complaint_accountability',
      'get_citizen_complaint_evidence_object',
      'reserve_citizen_reopen_evidence',
      'finalize_citizen_reopen_evidence',
      'fail_citizen_reopen_evidence',
      'expire_citizen_reopen_evidence_reservations',
      'submit_complaint_feedback',
      'reopen_complaint'
    ])
    and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
), 'every Phase 7 security-definer function pins an empty search path');

select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'perform_government_complaint_action',
      'get_citizen_resolution_context',
      'get_government_complaint_accountability',
      'get_citizen_complaint_evidence_object',
      'reserve_citizen_reopen_evidence',
      'finalize_citizen_reopen_evidence',
      'fail_citizen_reopen_evidence',
      'expire_citizen_reopen_evidence_reservations',
      'submit_complaint_feedback',
      'reopen_complaint'
    ])
    and not has_function_privilege('service_role', procedure.oid, 'execute')
), 'the service boundary can invoke every intended Phase 7 RPC');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'perform_government_complaint_action',
      'get_citizen_resolution_context',
      'get_government_complaint_accountability',
      'get_citizen_complaint_evidence_object',
      'reserve_citizen_reopen_evidence',
      'finalize_citizen_reopen_evidence',
      'fail_citizen_reopen_evidence',
      'expire_citizen_reopen_evidence_reservations',
      'submit_complaint_feedback',
      'reopen_complaint'
    ])
    and has_function_privilege('authenticated', procedure.oid, 'execute')
), 'authenticated clients cannot invoke Phase 7 service RPCs directly');
select ok(not exists (
  select 1
  from pg_catalog.pg_proc as procedure
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any(array[
      'perform_government_complaint_action',
      'get_citizen_resolution_context',
      'get_government_complaint_accountability',
      'get_citizen_complaint_evidence_object',
      'reserve_citizen_reopen_evidence',
      'finalize_citizen_reopen_evidence',
      'fail_citizen_reopen_evidence',
      'expire_citizen_reopen_evidence_reservations',
      'submit_complaint_feedback',
      'reopen_complaint'
    ])
    and has_function_privilege('anon', procedure.oid, 'execute')
), 'anonymous clients cannot invoke Phase 7 service RPCs directly');
select ok(not has_function_privilege(
  'service_role',
  'public.perform_government_complaint_action_phase5_impl(uuid,uuid,text,bigint,text,text,text,jsonb)',
  'execute'
), 'the superseded direct Phase 5 action function remains private');

select has_trigger(
  'complaints',
  'resolution_policy_versions',
  'resolution_policy_versions_validate',
  'policy versions enforce approval and immutable effective history'
);
select has_trigger(
  'complaints',
  'resolution_policies',
  'resolution_policies_append_only',
  'stable policy identities and scopes are append-only'
);
select has_trigger(
  'complaints',
  'citizen_action_requests',
  'citizen_action_requests_validate_mutation',
  'citizen action replay identities are guarded'
);
select has_trigger(
  'complaints',
  'complaint_feedback',
  'complaint_feedback_append_only',
  'citizen feedback is append-only'
);
select has_trigger(
  'complaints',
  'complaint_reopen_requests',
  'complaint_reopen_requests_append_only',
  'reopen requests are append-only'
);
select has_trigger(
  'complaints',
  'complaint_reopen_evidence',
  'complaint_reopen_evidence_validate_mutation',
  'reopen evidence mutation is guarded'
);
select ok((
  select pg_get_constraintdef(constraint_record.oid) like '%citizen_action%'
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaint_status_history_source_check'
), 'status history accepts the explicit citizen action source');
select is((
  select count(*)::integer
  from pg_catalog.pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and (
      coalesce(qual, '') ~ 'reopen'
      or coalesce(with_check, '') ~ 'reopen'
    )
), 0, 'no broad client Storage policy is introduced for reopen evidence');
select ok((
  select format_type(attribute.atttypid, attribute.atttypmod) = 'geometry(Point,4326)'
  from pg_catalog.pg_attribute as attribute
  inner join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = 'complaint_resolutions'
    and attribute.attname = 'completion_location'
), 'resolution completion evidence uses a Point 4326 PostGIS typmod');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaint_resolutions_completion_shape_check'
    and pg_get_constraintdef(constraint_record.oid) like '%completion_location_device_recorded_at%'
), 'completion evidence retains required device timestamp provenance');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'complaint_resolution_evidence_links_role_check'
), 'resolution evidence links are explicitly after evidence');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'resolution_policy_versions_no_effective_overlap'
), 'approved and superseded policy periods cannot overlap');
select is((
  select count(*)::integer
  from complaints.government_status_transition_rules
  where action_type = 'submit_resolution'
    and to_status = 'citizen_verification_pending'
), 4, 'resolution submission transitions directly to citizen verification');

select * from finish();
rollback;
