begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(44);

select has_table('governance', 'sync_source_leases', 'source leases exist');
select has_table('governance', 'sync_events', 'synchronization audit events exist');
select has_table('governance', 'source_evidence', 'field-level source evidence exists');
select has_function(
  'public',
  'claim_due_governance_sync_sources',
  array['text', 'integer', 'integer']
);
select has_function(
  'public',
  'record_governance_sync_snapshot',
  array[
    'uuid', 'uuid', 'uuid', 'text', 'text', 'text', 'bigint', 'text',
    'text', 'timestamp with time zone', 'timestamp with time zone', 'smallint'
  ]
);
select has_function(
  'public',
  'fail_governance_sync_run',
  array['uuid', 'uuid', 'uuid', 'text', 'text']
);
select col_not_null(
  'governance',
  'source_endpoints',
  'source_contract_sha256',
  'source contract hashes are required after additive backfill'
);
select is(
  (
    select count(*)::integer
    from governance.source_endpoints
    where source_contract_sha256 is null
  ),
  0,
  'all existing and seeded source endpoints have a contract hash'
);

select is(
  (
    select count(*)::integer
    from governance.source_endpoints
    where source_key like 'pmc:%' or source_key like 'bmc:%'
  ),
  10,
  'all reviewed pilot source locations are registered'
);
select is(
  (
    select count(*)::integer
    from governance.source_endpoints
    where (source_key like 'pmc:%' or source_key like 'bmc:%')
      and status = 'draft'
      and verification_status = 'unverified'
      and approved_at is null
      and next_sync_at is null
  ),
  10,
  'pilot endpoints remain inactive and unverified after seeding'
);
select is(
  (
    select count(*)::integer
    from governance.source_endpoints
    where (source_key like 'pmc:%' or source_key like 'bmc:%')
      and endpoint_url ~ '^https://'
      and cardinality(allowed_hosts) > 0
  ),
  10,
  'pilot endpoints use HTTPS and an explicit redirect host allowlist'
);
select is(
  (
    select count(*)::integer
    from governance.source_endpoints
    where (source_key like 'pmc:%' or source_key like 'bmc:%')
      and source_contract_sha256 ~ '^[0-9a-f]{64}$'
      and approved_contract_sha256 is null
  ),
  10,
  'every inactive pilot endpoint has a deterministic unapproved contract hash'
);

select ok(not has_table_privilege('anon', 'governance.sync_source_leases', 'select'));
select ok(not has_table_privilege('authenticated', 'governance.sync_events', 'select'));
select ok(not has_table_privilege('service_role', 'governance.sync_source_leases', 'select'));
select ok(has_table_privilege('service_role', 'governance.sync_events', 'select'));
select ok(not has_function_privilege(
  'authenticated',
  'public.claim_due_governance_sync_sources(text,integer,integer)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.claim_due_governance_sync_sources(text,integer,integer)',
  'execute'
));
select throws_ok(
  $$select * from public.claim_due_governance_sync_sources('pgtap.invalid-batch', 2, 300)$$,
  '22023',
  'SYNC_CLAIM_LIMIT_INVALID',
  'the dispatcher can claim only one source at a time'
);
select throws_ok(
  $$select * from public.claim_due_governance_sync_sources('pgtap.short-lease', 1, 60)$$,
  '22023',
  'SYNC_LEASE_DURATION_INVALID',
  'leases cannot be shorter than the safe fetch and persistence window'
);

select throws_ok(
  $$
    insert into governance.source_endpoints (
      reference_source_id, authority_id, source_key, source_kind, dataset_kind,
      retrieval_method, retrieval_format, endpoint_url, parser_key,
      parser_contract_version, expected_media_types, allowed_hosts,
      refresh_interval, status, verification_status
    ) values (
      (select id from governance.reference_sources where url = 'https://www.mcgm.gov.in/irj/portal/anonymous/qlmc'),
      '3fabe3b8-47cf-58fe-a59c-bb34bd02322a',
      'bmc:invalid_host:test', 'official_web', 'officer_assignment',
      'http_get', 'html', 'https://127.0.0.1/private', 'test.invalid_host',
      '1.0.0', array['text/html'], array['www.mcgm.gov.in'], interval '1 day',
      'draft', 'unverified'
    )
  $$,
  '23514',
  'SYNC_ENDPOINT_HOST_NOT_ALLOWED',
  'registered endpoint hosts must exactly match an approved host'
);

select throws_ok(
  $$
    update governance.source_endpoints
    set status = 'active', verification_status = 'verified',
        last_verified_on = date '2026-07-14', next_sync_at = now()
    where id = '94200000-0000-4000-8000-000000000002'
  $$,
  '23514',
  'SYNC_ACTIVE_SOURCE_REVIEW_REQUIRED',
  'a source cannot become active without attributed review'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'c1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'sync-source-reviewer@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select throws_ok(
  $$
    update governance.source_endpoints
    set
      status = 'active',
      verification_status = 'verified',
      last_verified_on = date '2026-07-14',
      approved_contract_sha256 = source_contract_sha256,
      approved_at = now(),
      approved_by = 'c1000000-0000-4000-8000-000000000001',
      next_sync_at = now() - interval '1 minute'
    where id = '94200000-0000-4000-8000-000000000002'
  $$,
  '23514',
  'SYNC_ACTIVE_SOURCE_REVIEW_REQUIRED',
  'an arbitrary authenticated user cannot approve a retrieval contract'
);

insert into public.user_roles (user_id, role_id, scope_type)
values (
  'c1000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000006',
  'global'
);

update governance.source_endpoints
set
  status = 'active',
  verification_status = 'verified',
  last_verified_on = date '2026-07-14',
  approved_contract_sha256 = source_contract_sha256,
  approved_at = now(),
  approved_by = 'c1000000-0000-4000-8000-000000000001',
  next_sync_at = now() - interval '1 minute'
where id = '94200000-0000-4000-8000-000000000002';

select throws_ok(
  $$
    update governance.source_endpoints
    set fetch_timeout_seconds = fetch_timeout_seconds + 1
    where id = '94200000-0000-4000-8000-000000000002'
  $$,
  '23514',
  'SYNC_ACTIVE_SOURCE_REVIEW_REQUIRED',
  'a material source-contract change invalidates the prior approval'
);

create temporary table claimed_source on commit drop as
select *
from public.claim_due_governance_sync_sources('pgtap.worker-1', 1, 300);

select is((select count(*)::integer from claimed_source), 1, 'one due source is claimed');
select is(
  (select source_endpoint_id from claimed_source),
  '94200000-0000-4000-8000-000000000002'::uuid,
  'claim returns the reviewed due source'
);
select is(
  (
    select status
    from governance.sync_runs
    where id = (select run_id from claimed_source)
  ),
  'retrieving',
  'claim starts a retrieving run'
);
select is(
  (
    select count(*)::integer
    from governance.sync_source_leases
    where sync_run_id = (select run_id from claimed_source)
  ),
  1,
  'claim creates a short PostgreSQL lease'
);
select is(
  (
    select count(*)::integer
    from public.claim_due_governance_sync_sources('pgtap.worker-2', 1, 300)
  ),
  0,
  'a live lease prevents a concurrent duplicate claim'
);

select throws_ok(
  $$
    select *
    from public.record_governance_sync_snapshot(
      (select run_id from claimed_source),
      (select source_endpoint_id from claimed_source),
      (select lease_token from claimed_source),
      'governance-raw-snapshots',
      '94200000-0000-4000-8000-000000000002/' || repeat('a', 64) || '.html',
      repeat('a', 64),
      512,
      'text/html',
      '"fixture-v1"',
      timestamptz '2026-07-14 08:00:00+00',
      now(),
      200::smallint
    )
  $$,
  '55000',
  'SYNC_SNAPSHOT_OBJECT_NOT_FOUND',
  'snapshot metadata cannot be recorded before exact bytes exist in private Storage'
);

insert into storage.objects (bucket_id, name, metadata)
values (
  'governance-raw-snapshots',
  '94200000-0000-4000-8000-000000000002/' || repeat('a', 64) || '.html',
  jsonb_build_object('size', 512, 'mimetype', 'text/html')
);

create temporary table recorded_snapshot on commit drop as
select *
from public.record_governance_sync_snapshot(
  (select run_id from claimed_source),
  (select source_endpoint_id from claimed_source),
  (select lease_token from claimed_source),
  'governance-raw-snapshots',
  '94200000-0000-4000-8000-000000000002/' || repeat('a', 64) || '.html',
  repeat('a', 64),
  512,
  'text/html',
  '"fixture-v1"',
  timestamptz '2026-07-14 08:00:00+00',
  now(),
  200::smallint
);

select is((select duplicate_content from recorded_snapshot), false, 'new bytes create a snapshot');
select is(
  (
    select status
    from governance.sync_runs
    where id = (select run_id from claimed_source)
  ),
  'snapshot_preserved',
  'successful retrieval preserves the snapshot before parsing'
);
select is(
  (
    select count(*)::integer
    from governance.sync_source_leases
    where sync_run_id = (select run_id from claimed_source)
  ),
  0,
  'successful snapshot recording releases the lease'
);
select throws_ok(
  $$
    update storage.objects
    set metadata = jsonb_build_object('size', 513, 'mimetype', 'text/html')
    where bucket_id = 'governance-raw-snapshots'
      and name = '94200000-0000-4000-8000-000000000002/' || repeat('a', 64) || '.html'
  $$,
  '55000',
  'SYNC_SNAPSHOT_OBJECT_IMMUTABLE',
  'a Storage object becomes immutable when the snapshot ledger references it'
);

update governance.source_endpoints
set next_sync_at = now() - interval '1 minute'
where id = '94200000-0000-4000-8000-000000000002';

create temporary table unchanged_claim on commit drop as
select *
from public.claim_due_governance_sync_sources('pgtap.worker-3', 1, 300);

create temporary table unchanged_snapshot on commit drop as
select *
from public.record_governance_sync_snapshot(
  (select run_id from unchanged_claim),
  (select source_endpoint_id from unchanged_claim),
  (select lease_token from unchanged_claim),
  null, null, null, null, null,
  '"fixture-v1"',
  null,
  now(),
  304::smallint
);

select is((select unchanged_response from unchanged_snapshot), true, 'HTTP 304 reuses prior evidence');
select is(
  (
    select count(*)::integer
    from governance.raw_snapshots
    where source_endpoint_id = '94200000-0000-4000-8000-000000000002'
  ),
  1,
  'HTTP 304 does not create an empty or duplicate raw snapshot'
);

update governance.source_endpoints
set next_sync_at = now() - interval '1 minute'
where id = '94200000-0000-4000-8000-000000000002';

create temporary table failed_claim on commit drop as
select *
from public.claim_due_governance_sync_sources('pgtap.worker-4', 1, 300);

select throws_ok(
  format(
    'select public.fail_governance_sync_run(%L::uuid,%L::uuid,%L::uuid,%L,%L)',
    (select run_id from failed_claim),
    (select source_endpoint_id from failed_claim),
    (select lease_token from failed_claim),
    'ARBITRARY_FAILURE',
    'An unreviewed diagnostic containing source details.'
  ),
  '22023',
  'SYNC_FAILURE_DETAIL_INVALID',
  'failure persistence accepts only fixed sanitized error-code details'
);

select lives_ok(
  format(
    'select public.fail_governance_sync_run(%L::uuid,%L::uuid,%L::uuid,%L,%L)',
    (select run_id from failed_claim),
    (select source_endpoint_id from failed_claim),
    (select lease_token from failed_claim),
    'FETCH_TIMEOUT',
    'The approved source retrieval timed out.'
  ),
  'retrieval failure is recorded without external queue infrastructure'
);
select is(
  (
    select status
    from governance.sync_runs
    where id = (select run_id from failed_claim)
  ),
  'failed',
  'failed retrieval runs are terminal'
);
select ok(
  (
    select consecutive_failure_count = 1
      and last_failure_code = 'FETCH_TIMEOUT'
      and disabled_until > now()
    from governance.source_endpoints
    where id = '94200000-0000-4000-8000-000000000002'
  ),
  'failure applies audited bounded retry backoff'
);

select is(
  (
    select count(*)::integer
    from governance.sync_events
    where source_endpoint_id = '94200000-0000-4000-8000-000000000002'
  ),
  6,
  'claim, snapshot, unchanged, and failure events remain append-only audit evidence'
);

update governance.source_endpoints
set next_sync_at = now() - interval '1 minute', disabled_until = null
where id = '94200000-0000-4000-8000-000000000002';
insert into governance.sync_runs (id, source_endpoint_id, trigger_kind)
values (
  'c2000000-0000-4000-8000-000000000001',
  '94200000-0000-4000-8000-000000000002',
  'scheduled'
);
update governance.sync_runs
set status = 'retrieving', started_at = now() - interval '3 minutes'
where id = 'c2000000-0000-4000-8000-000000000001';
insert into governance.sync_source_leases (
  source_endpoint_id, sync_run_id, lease_token, worker_id,
  acquired_at, heartbeat_at, expires_at
)
values (
  '94200000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001',
  'pgtap.expired-worker',
  now() - interval '3 minutes',
  now() - interval '2 minutes',
  now() - interval '1 minute'
);

create temporary table reclaimed_source on commit drop as
select *
from public.claim_due_governance_sync_sources('pgtap.recovery-worker', 1, 300);

select ok(
  (
    select status = 'failed' and error_code = 'LEASE_EXPIRED'
    from governance.sync_runs
    where id = 'c2000000-0000-4000-8000-000000000001'
  ),
  'an expired worker run is terminally audited before reclaim'
);
select is(
  (select count(*)::integer from reclaimed_source),
  0,
  'an expired lease applies backoff instead of being immediately reclaimed'
);
select ok(
  (
    select consecutive_failure_count = 2
      and last_failure_code = 'LEASE_EXPIRED'
      and disabled_until > now()
    from governance.source_endpoints
    where id = '94200000-0000-4000-8000-000000000002'
  ),
  'lease expiry increments the failure counter and schedules bounded retry backoff'
);

select * from finish();
rollback;
