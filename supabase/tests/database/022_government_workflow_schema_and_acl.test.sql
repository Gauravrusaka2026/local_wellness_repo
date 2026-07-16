begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(47);

select has_column('complaints', 'complaints', 'workflow_version', 'complaints carry workflow version');
select has_column('complaints', 'complaint_assignments', 'version', 'assignments carry a version');
select has_column('complaints', 'complaint_assignments', 'effective_from', 'assignments open at an effective time');
select has_column('complaints', 'complaint_assignments', 'effective_to', 'assignments close at an effective time');
select has_column('complaints', 'complaint_assignments', 'supersedes_assignment_id', 'assignment versions link to their predecessor');
select has_index(
  'complaints', 'complaint_assignments', 'complaint_assignments_one_active_idx',
  'one active assignment is enforced per complaint'
);

select has_table('complaints', 'government_role_capabilities');
select has_table('complaints', 'government_status_transition_rules');
select has_table('complaints', 'government_action_requests');
select has_table('complaints', 'government_action_audit_events');
select has_table('complaints', 'complaint_internal_notes');
select has_table('complaints', 'complaint_inspections');
select has_table('complaints', 'complaint_work_references');
select has_table('complaints', 'complaint_external_dependencies');
select has_table('complaints', 'complaint_resolution_evidence');
select has_table('complaints', 'complaint_resolutions');
select has_table('complaints', 'complaint_resolution_evidence_links');
select has_table('complaints', 'notification_outbox');

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'complaints'
      and relation.relkind = 'r'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  30,
  'all private complaint tables enable and force RLS'
);

select is(
  (
    select can_view and not can_acknowledge and not can_assign and not can_transfer
      and not can_update_status and not can_add_internal_note
    from complaints.government_role_capabilities as capability
    inner join public.roles as role on role.id = capability.role_id
    where role.code = 'moderator'
  ),
  true,
  'moderator capability is read-only'
);

select throws_ok(
  $$insert into complaints.government_status_transition_rules
      (action_type, from_status, to_status)
    values ('acknowledge', 'typo_status', 'acknowledged')$$,
  '23514',
  null,
  'transition source status rejects typos'
);

select ok(to_regprocedure(
  'public.list_government_complaints(uuid,integer,timestamp with time zone,uuid,uuid,text,text[],uuid,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,text)'
) is not null);
select ok(to_regprocedure('public.get_government_complaint(uuid,uuid,uuid)') is not null);
select ok(to_regprocedure('public.list_government_assignment_options(uuid,uuid,uuid)') is not null);
select ok(to_regprocedure(
  'public.perform_government_complaint_action(uuid,uuid,text,bigint,text,text,text,jsonb)'
) is not null);
select ok(to_regprocedure(
  'public.reserve_government_resolution_evidence(uuid,uuid,bigint,text,text,text,text,text,bigint,text,timestamp with time zone)'
) is not null);
select ok(to_regprocedure(
  'public.finalize_government_resolution_evidence(uuid,uuid,uuid,bigint,text,text,text,text,bigint,text)'
) is not null);
select ok(to_regprocedure(
  'public.get_government_resolution_evidence_object(uuid,uuid,uuid,uuid,text)'
) is not null);
select ok(to_regprocedure(
  'public.expire_government_resolution_evidence(integer)'
) is not null);
select ok(to_regprocedure(
  'public.fail_government_resolution_evidence(uuid,text)'
) is not null);

select ok(not has_schema_privilege('anon', 'complaints', 'usage'));
select ok(not has_schema_privilege('authenticated', 'complaints', 'usage'));
select ok(not has_schema_privilege('service_role', 'complaints', 'usage'));
select ok(not has_table_privilege('service_role', 'complaints.government_action_requests', 'select'));
select ok(not has_table_privilege('authenticated', 'complaints.notification_outbox', 'select'));
select ok(not has_function_privilege(
  'authenticated',
  'public.perform_government_complaint_action(uuid,uuid,text,bigint,text,text,text,jsonb)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.perform_government_complaint_action(uuid,uuid,text,bigint,text,text,text,jsonb)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.list_government_complaints(uuid,integer,timestamp with time zone,uuid,uuid,text,text[],uuid,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,text)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.list_government_complaints(uuid,integer,timestamp with time zone,uuid,uuid,text,text[],uuid,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,text)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.expire_government_resolution_evidence(integer)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.expire_government_resolution_evidence(integer)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.fail_government_resolution_evidence(uuid,text)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.fail_government_resolution_evidence(uuid,text)',
  'execute'
));

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ~ 'resolution-evidence-private'
        or coalesce(with_check, '') ~ 'resolution-evidence-private'
      )
  ),
  0,
  'resolution evidence has no broad client Storage policy'
);

select has_trigger(
  'complaints', 'complaints', 'complaints_validate_workflow_mutation',
  'complaint core has guarded workflow updates'
);
select has_trigger(
  'complaints', 'complaint_assignments', 'complaint_assignments_validate_version_mutation',
  'assignment history has guarded version mutations'
);
select has_trigger(
  'complaints', 'government_action_requests', 'government_action_requests_validate_mutation',
  'action replay identity is immutable outside its claimed completion'
);

select * from finish();
rollback;
