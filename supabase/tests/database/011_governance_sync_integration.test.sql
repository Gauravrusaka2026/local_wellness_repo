begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '96000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'sync.reviewer@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into governance.source_endpoints (
  id, import_batch_id, source_key, source_kind, dataset_kind,
  retrieval_method, retrieval_format, repository_path, parser_key,
  parser_contract_version, expected_media_types, status, verification_status
)
values (
  '96000000-0000-4000-8000-000000000002',
  '1340c42e-d0f0-5864-b886-5634136276a9',
  'sync_test_wards_bootstrap', 'repository_bootstrap', 'ward',
  'manual_upload', 'csv', 'resources/governance/csv/Wards.csv',
  'mh_governance.wards', '1.0.0', array['text/csv'], 'draft', 'unverified'
);

select lives_ok(
  $$
    insert into governance.source_endpoints (
      import_batch_id, source_key, source_kind, dataset_kind,
      retrieval_method, retrieval_format, repository_path, parser_key,
      parser_contract_version, expected_media_types, status, verification_status
    ) values (
      '1340c42e-d0f0-5864-b886-5634136276a9',
      'sync_test_authorities_bootstrap', 'repository_bootstrap', 'authority',
      'manual_upload', 'csv', 'resources/governance/csv/State_Overview.csv',
      'mh_governance.state_overview', '1.0.0', array['text/csv'], 'draft', 'unverified'
    )
  $$,
  'governance synchronization supports authority datasets'
);

select throws_ok(
  $$
    insert into governance.source_endpoints (
      import_batch_id, source_key, source_kind, dataset_kind,
      retrieval_method, retrieval_format, repository_path, parser_key,
      parser_contract_version, expected_media_types
    ) values (
      '1340c42e-d0f0-5864-b886-5634136276a9',
      'sync_test_invalid_media', 'repository_bootstrap', 'ward',
      'manual_upload', 'csv', 'resources/governance/csv/Wards.csv',
      'mh_governance.wards', '1.0.0', array['Text/CSV']
    )
  $$,
  '23514',
  'SYNC_EXPECTED_MEDIA_TYPES_INVALID',
  'source media types must be normalized MIME values'
);
select throws_ok(
  $$
    insert into governance.source_endpoints (
      import_batch_id, source_key, source_kind, dataset_kind,
      retrieval_method, retrieval_format, repository_path, parser_key,
      parser_contract_version, secret_reference
    ) values (
      '1340c42e-d0f0-5864-b886-5634136276a9',
      'sync_test_secret_material', 'repository_bootstrap', 'ward',
      'manual_upload', 'csv', 'resources/governance/csv/Wards.csv',
      'mh_governance.wards', '1.0.0', 'https://secret.example.test/token'
    )
  $$,
  '23514',
  null,
  'source registry rejects inline secret material'
);
select throws_ok(
  $$
    insert into governance.source_endpoints (
      reference_source_id, import_batch_id, source_key, source_kind, dataset_kind,
      retrieval_method, retrieval_format, repository_path, parser_key,
      parser_contract_version
    ) values (
      '60299aab-b027-5da8-91d3-80e5e38765e0',
      '1340c42e-d0f0-5864-b886-5634136276a9',
      'sync_test_mixed_provenance', 'repository_bootstrap', 'bootstrap_bundle',
      'manual_upload', 'csv', 'resources/governance/csv/',
      'mh_governance.bootstrap_bundle', '1.0.0'
    )
  $$,
  '23514',
  null,
  'bootstrap endpoints cannot masquerade as official-source endpoints'
);

insert into governance.sync_runs (id, source_endpoint_id, trigger_kind)
values
  (
    '96100000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000010', 'bootstrap'
  ),
  (
    '96100000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000010', 'bootstrap'
  ),
  (
    '96100000-0000-4000-8000-000000000003',
    '96000000-0000-4000-8000-000000000002', 'bootstrap'
  ),
  (
    '96100000-0000-4000-8000-000000000004',
    '93000000-0000-4000-8000-000000000010', 'manual'
  ),
  (
    '96100000-0000-4000-8000-000000000005',
    '93000000-0000-4000-8000-000000000010', 'manual'
  );

select ok(
  (
    select source_contract_snapshot ->> 'parserContractVersion' = '1.0.0'
      and source_contract_snapshot ->> 'repositoryPath' = 'resources/governance/csv/'
      and not (source_contract_snapshot ? 'secretReference')
    from governance.sync_runs
    where id = '96100000-0000-4000-8000-000000000001'
  ),
  'each run captures its sanitized source and parser contract server-side'
);
select throws_ok(
  $$
    update governance.sync_runs
    set source_contract_snapshot = source_contract_snapshot || '{"parserContractVersion":"9.9.9"}'
    where id = '96100000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'SYNC_RUN_IDENTITY_IMMUTABLE',
  'historical run source contracts are immutable'
);

select throws_ok(
  $$
    insert into governance.sync_runs (
      source_endpoint_id, trigger_kind, status, started_at
    ) values (
      '93000000-0000-4000-8000-000000000010', 'manual', 'retrieving', now()
    )
  $$,
  '55000',
  'SYNC_RUN_MUST_START_QUEUED',
  'synchronization runs always start queued'
);
select throws_ok(
  $$
    update governance.sync_runs
    set status = 'matching', started_at = now()
    where id = '96100000-0000-4000-8000-000000000005'
  $$,
  '55000',
  'SYNC_RUN_TRANSITION_INVALID',
  'synchronization lifecycle cannot skip stages'
);
select lives_ok(
  $$
    update governance.sync_runs
    set status = 'retrieving', started_at = now()
    where id = '96100000-0000-4000-8000-000000000005'
  $$,
  'a legal synchronization lifecycle transition succeeds'
);

insert into governance.raw_snapshots (
  id, source_endpoint_id, first_sync_run_id, storage_object_path,
  sha256, media_type, byte_size, retrieved_at
)
values
  (
    '96200000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000010',
    '96100000-0000-4000-8000-000000000001',
    'mh-bootstrap/2026-07-13/snapshot-1.csv', repeat('a', 64),
    'text/csv', 100, timestamptz '2026-07-13 10:00:00+00'
  ),
  (
    '96200000-0000-4000-8000-000000000002',
    '96000000-0000-4000-8000-000000000002',
    '96100000-0000-4000-8000-000000000003',
    'ward-bootstrap/2026-07-13/snapshot-1.csv', repeat('b', 64),
    'text/csv', 20, timestamptz '2026-07-13 10:30:00+00'
  );

insert into governance.sync_run_snapshots (
  sync_run_id, raw_snapshot_id, is_duplicate_content
)
values
  (
    '96100000-0000-4000-8000-000000000001',
    '96200000-0000-4000-8000-000000000001', false
  ),
  (
    '96100000-0000-4000-8000-000000000002',
    '96200000-0000-4000-8000-000000000001', true
  );

select is(
  (
    select count(*)::integer
    from governance.sync_run_snapshots
    where raw_snapshot_id = '96200000-0000-4000-8000-000000000001'
  ),
  2,
  'identical bytes reuse one immutable snapshot across synchronization runs'
);
select throws_ok(
  $$
    insert into governance.raw_snapshots (
      source_endpoint_id, first_sync_run_id, storage_object_path,
      sha256, media_type, byte_size, retrieved_at
    ) values (
      '93000000-0000-4000-8000-000000000010',
      '96100000-0000-4000-8000-000000000005',
      'mh-bootstrap/2026-07-13/duplicate.csv', repeat('a', 64),
      'text/csv', 100, timestamptz '2026-07-13 11:00:00+00'
    )
  $$,
  '23505',
  null,
  'source and digest uniqueness prevents duplicate raw snapshot rows'
);
select throws_ok(
  $$
    insert into governance.raw_snapshots (
      source_endpoint_id, first_sync_run_id, previous_snapshot_id,
      storage_object_path, sha256, media_type, byte_size, retrieved_at
    ) values (
      '93000000-0000-4000-8000-000000000010',
      '96100000-0000-4000-8000-000000000004',
      '96200000-0000-4000-8000-000000000002',
      'mh-bootstrap/2026-07-13/cross-source.csv', repeat('c', 64),
      'text/csv', 110, timestamptz '2026-07-13 11:00:00+00'
    )
  $$,
  '23514',
  'SYNC_PREVIOUS_SNAPSHOT_INVALID',
  'snapshot history cannot cross source endpoints'
);
select lives_ok(
  $$
    insert into governance.raw_snapshots (
      id, source_endpoint_id, first_sync_run_id, previous_snapshot_id,
      storage_object_path, sha256, media_type, byte_size, retrieved_at
    ) values (
      '96200000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000010',
      '96100000-0000-4000-8000-000000000004',
      '96200000-0000-4000-8000-000000000001',
      'mh-bootstrap/2026-07-13/snapshot-2.csv', repeat('c', 64),
      'text/csv', 110, timestamptz '2026-07-13 11:00:00+00'
    )
  $$,
  'a later same-source snapshot can reference its exact predecessor'
);

insert into governance.sync_candidates (
  id, sync_run_id, raw_snapshot_id,
  source_record_key, source_record_locator, entity_type,
  source_record_sha256, raw_payload, normalized_payload, validation_status,
  is_placeholder, match_method, match_confidence, match_status
)
values
  (
    '96300000-0000-4000-8000-000000000001',
    '96100000-0000-4000-8000-000000000001',
    '96200000-0000-4000-8000-000000000001', 'ward:new', 'Wards.csv:2', 'ward',
    repeat('d', 64), '{"name":"New Ward"}', '{"name":"New Ward"}',
    'valid', false, 'none', 0, 'new_entity'
  ),
  (
    '96300000-0000-4000-8000-000000000002',
    '96100000-0000-4000-8000-000000000001',
    '96200000-0000-4000-8000-000000000001', 'ward:placeholder',
    'Wards.csv:3', 'ward', repeat('e', 64), '{"name":"TBD"}',
    '{"name":"TBD"}', 'valid_with_warnings', true, 'none', 0, 'new_entity'
  ),
  (
    '96300000-0000-4000-8000-000000000003',
    '96100000-0000-4000-8000-000000000001',
    '96200000-0000-4000-8000-000000000001', 'ward:partial',
    'Wards.csv:4', 'ward', repeat('f', 64), '{"name":"Partial Ward"}',
    '{"name":"Partial Ward"}', 'valid_with_warnings', false, 'none', 0, 'new_entity'
  );

update governance.sync_runs
set status = 'retrieving', started_at = timestamptz '2026-07-13 09:59:00+00'
where id = '96100000-0000-4000-8000-000000000001';
update governance.sync_runs
set status = 'snapshot_preserved'
where id = '96100000-0000-4000-8000-000000000001';
update governance.sync_runs
set status = 'normalizing'
where id = '96100000-0000-4000-8000-000000000001';
update governance.sync_runs
set status = 'matching'
where id = '96100000-0000-4000-8000-000000000001';
update governance.sync_runs
set status = 'detecting_changes'
where id = '96100000-0000-4000-8000-000000000001';
update governance.sync_runs
set status = 'awaiting_review'
where id = '96100000-0000-4000-8000-000000000001';

insert into governance.sync_change_items (
  id, sync_candidate_id, detection_status, change_kind, target_table,
  proposed_changes, disposition, requested_verification_status,
  requested_routing_eligibility
)
values
  (
    '96400000-0000-4000-8000-000000000001',
    '96300000-0000-4000-8000-000000000001', 'new', 'create',
    'governance.wards', '{"name":"New Ward"}', 'normalized', 'verified', true
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96300000-0000-4000-8000-000000000002', 'new', 'create',
    'governance.wards', '{"name":"TBD"}', 'normalized', 'verified', true
  ),
  (
    '96400000-0000-4000-8000-000000000003',
    '96300000-0000-4000-8000-000000000003', 'new', 'create',
    'governance.wards', '{"name":"Partial Ward"}', 'normalized',
    'partially_verified', false
  );

insert into governance.sync_review_items (
  id, sync_change_item_id, review_reason
)
values
  (
    '96500000-0000-4000-8000-000000000001',
    '96400000-0000-4000-8000-000000000001', 'New verified ward requires review.'
  ),
  (
    '96500000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000002', 'Placeholder promotion must be blocked.'
  ),
  (
    '96500000-0000-4000-8000-000000000003',
    '96400000-0000-4000-8000-000000000003',
    'Partial verification requires an explicit reviewer decision.'
  );

insert into governance.sync_review_events (
  id, sync_review_item_id, actor_user_id, action,
  verification_decision, routing_eligibility_decision, notes, occurred_at
)
values
  (
    '96600000-0000-4000-8000-000000000001',
    '96500000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001', 'approved',
    'mark_verified', 'enable', 'Official provenance reviewed.',
    timestamptz '2026-07-13 12:00:00+00'
  ),
  (
    '96600000-0000-4000-8000-000000000002',
    '96500000-0000-4000-8000-000000000002',
    '96000000-0000-4000-8000-000000000001', 'approved',
    'mark_verified', 'enable', 'Deliberately invalid placeholder decision.',
    timestamptz '2026-07-13 12:00:00+00'
  ),
  (
    '96600000-0000-4000-8000-000000000003',
    '96500000-0000-4000-8000-000000000003',
    '96000000-0000-4000-8000-000000000001', 'approved',
    'mark_partially_verified', 'retain_disabled',
    'Partial verification retained explicitly.',
    timestamptz '2026-07-13 12:00:00+00'
  );

update governance.sync_change_items
set status = 'review_required'
where id in (
  '96400000-0000-4000-8000-000000000001',
  '96400000-0000-4000-8000-000000000002',
  '96400000-0000-4000-8000-000000000003'
);
update governance.sync_review_items
set
  review_status = 'approved',
  reviewed_at = timestamptz '2026-07-13 12:01:00+00',
  reviewed_by = '96000000-0000-4000-8000-000000000001'
where id in (
  '96500000-0000-4000-8000-000000000001',
  '96500000-0000-4000-8000-000000000002',
  '96500000-0000-4000-8000-000000000003'
);

select lives_ok(
  $$
    update governance.sync_change_items
    set status = 'approved'
    where id = '96400000-0000-4000-8000-000000000001'
  $$,
  'reviewed, validated, explicitly verified changes can enter approved state'
);
select throws_ok(
  $$
    update governance.sync_change_items
    set status = 'approved'
    where id = '96400000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'SYNC_PLACEHOLDER_PROMOTION_FORBIDDEN',
  'human approval cannot promote placeholder data into verified routing'
);
select lives_ok(
  $$
    update governance.sync_change_items
    set status = 'approved'
    where id = '96400000-0000-4000-8000-000000000003'
  $$,
  'partial verification requires and accepts only its explicit review decision'
);
select throws_ok(
  $$update governance.sync_review_events set notes = 'rewritten' where id = '96600000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'review events are append-only'
);
select throws_ok(
  $$delete from governance.sync_review_events where id = '96600000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'review event history cannot be deleted'
);
select throws_ok(
  $$update governance.raw_snapshots set etag = 'rewritten' where id = '96200000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'raw snapshot metadata is immutable'
);
select throws_ok(
  $$delete from governance.raw_snapshots where id = '96200000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'raw snapshots cannot be deleted'
);
select is(
  (
    select count(*)::integer
    from governance.sync_change_items
    where status = 'approved'
      and requested_verification_status = 'verified'
      and requested_routing_eligibility
      and sync_candidate_id = '96300000-0000-4000-8000-000000000001'
  ),
  1,
  'approved publication intent retains explicit verification and routing decisions'
);
select is(
  (
    select count(*)::integer
    from governance.sync_candidates
    where match_status in ('matched', 'new_entity', 'ambiguous', 'unmatched')
      and match_method in (
        'official_identifier', 'reviewed_crosswalk', 'scoped_natural_key',
        'reviewer_selected', 'none'
      )
  ),
  3,
  'staged candidates use the permanent matcher contract vocabulary'
);

select * from finish();
rollback;
