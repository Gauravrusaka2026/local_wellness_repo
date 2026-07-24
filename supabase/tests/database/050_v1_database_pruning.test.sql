begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, complaints, extensions;

select plan(26);

select ok(
  to_regprocedure('private.v1_deferred_subsystems_pruned()') is not null,
  'the V1 prune marker exists'
);
select ok(
  not has_function_privilege(
    'service_role',
    'private.v1_deferred_subsystems_pruned()',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'private.v1_deferred_subsystems_pruned()',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'private.v1_deferred_subsystems_pruned()',
    'execute'
  ),
  'the internal prune marker is not executable by API roles'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'governance'
      and relation.relkind = 'r'
      and relation.relname = any(array[
        'source_endpoints',
        'sync_runs',
        'raw_snapshots',
        'sync_run_snapshots',
        'sync_candidates',
        'sync_change_items',
        'sync_review_items',
        'sync_review_events',
        'sync_source_leases',
        'sync_events',
        'source_evidence',
        'contact_channels',
        'contact_channel_versions',
        'sync_scope_targets'
      ]::text[])
  ),
  0,
  'all fourteen deferred governance synchronization/contact tables are absent'
);
select ok(
  to_regclass('complaints.complaint_comments') is null,
  'the unused public-comment table is absent'
);
select ok(
  to_regclass('governance.current_verified_contacts') is null,
  'the retired versioned-contact view is absent'
);

select ok(
  to_regprocedure('public.claim_due_governance_sync_sources(text,integer,integer)') is null,
  'the synchronization claim RPC is absent'
);
select ok(
  to_regprocedure('public.heartbeat_governance_sync_lease(uuid,uuid,integer)') is null,
  'the synchronization heartbeat RPC is absent'
);
select ok(
  to_regprocedure(
    'public.record_governance_sync_snapshot(uuid,uuid,uuid,text,text,text,bigint,text,text,timestamp with time zone,timestamp with time zone,smallint)'
  ) is null,
  'the synchronization snapshot RPC is absent'
);
select ok(
  to_regprocedure('public.fail_governance_sync_run(uuid,uuid,uuid,text,text)') is null,
  'the synchronization failure RPC is absent'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'storage.objects'::regclass
      and trigger_record.tgname = 'governance_snapshot_objects_guard_update'
      and not trigger_record.tgisinternal
  ),
  'the raw-snapshot Storage update guard is absent'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'storage.objects'::regclass
      and trigger_record.tgname = 'governance_snapshot_objects_guard_delete'
      and not trigger_record.tgisinternal
  ),
  'the raw-snapshot Storage delete guard is absent'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'governance.offices'::regclass
      and trigger_record.tgname = 'offices_reject_legacy_contact_update'
      and not trigger_record.tgisinternal
  ),
  'the obsolete contact-versioning write guard is absent'
);

select ok(
  to_regprocedure(
    'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)'
  ) is not null,
  'the dashboard delivery-readiness compatibility function remains'
);
select ok(
  position(
    'routing.ward_issue_contacts'
    in pg_get_functiondef(
      'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)'::regprocedure
    )
  ) > 0,
  'delivery readiness reads the compact ward/category contact matrix'
);
select ok(
  has_function_privilege(
    'service_role',
    'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
    'execute'
  ),
  'the service boundary can resolve delivery readiness'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'governance.resolve_complaint_contact_readiness(uuid,uuid,uuid,uuid,uuid,uuid,uuid)',
    'execute'
  ),
  'citizen API roles cannot resolve private contact readiness'
);
select ok(
  has_function_privilege(
    'service_role',
    'complaints.assignment_delivery_readiness(uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'complaints.assignment_delivery_readiness(uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'complaints.assignment_delivery_readiness(uuid)',
    'execute'
  ),
  'delivery-readiness compatibility retains only its service-role execution boundary'
);
select is(
  complaints.assignment_delivery_readiness(gen_random_uuid()) ->> 'reason',
  'verified_assignment_scope_unavailable',
  'delivery readiness executes safely after the retired contact tables are removed'
);
select is(
  (
    select governance.resolve_complaint_contact_readiness(
      local_body.authority_id,
      ward.local_body_id,
      ward.id,
      null,
      null,
      null,
      null
    ) ->> 'externalContactStatus'
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.ward_number = 'K/W'
    limit 1
  ),
  'verified_governing_body_contact',
  'a configured BMC ward still reports governing-body contact readiness'
);

select is(
  (select count(*)::integer from routing.ward_issue_contacts where is_active),
  338,
  'all 26 BMC wards by 13 profiles remain in the V1 routing matrix'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where status = 'active'
      and is_routing_eligible
      and not requires_asset
  ),
  13,
  'all thirteen current V1 profiles remain routable'
);
select ok(
  to_regprocedure('public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)') is not null,
  'complaint submission remains installed'
);
select ok(
  to_regprocedure('public.claim_v1_ward_emails(text,integer,integer)') is not null,
  'ward-email delivery remains installed'
);
select ok(
  to_regprocedure(
    'public.list_public_complaint_feed(double precision,double precision,double precision,double precision,text[],text[],timestamp with time zone,timestamp with time zone,integer,integer,text,text)'
  ) is not null,
  'the Community feed remains installed'
);
select ok(
  to_regprocedure(
    'public.list_government_complaints(uuid,integer,timestamp with time zone,uuid,uuid,text,text[],uuid,uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,text)'
  ) is not null,
  'the government complaint queue remains installed'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = any(array[
      'public',
      'private',
      'governance',
      'routing',
      'complaints'
    ]::text[])
      and relation.relkind = 'r'
  ),
  115,
  'the application schema retains the 129-to-114 prune plus one current protected-handoff table'
);

select * from finish();
rollback;
