begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(26);

select has_table('governance', 'contact_channels', 'durable contact channels exist');
select has_table('governance', 'contact_channel_versions', 'contact value versions exist');
select has_view('governance', 'current_verified_contacts', 'verified contact projection exists');
select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'governance.contact_channel_versions'::regclass
  ),
  'contact versions use forced RLS'
);
select ok(not has_table_privilege('anon', 'governance.contact_channels', 'select'));
select ok(not has_table_privilege('authenticated', 'governance.contact_channel_versions', 'select'));
select ok(has_table_privilege('service_role', 'governance.current_verified_contacts', 'select'));
select ok(not has_table_privilege('authenticated', 'governance.current_verified_contacts', 'select'));
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'governance.contact_channel_versions'::regclass
      and conname = 'contact_channel_versions_published_period_excl'
      and contype = 'x'
  ),
  'published contact versions cannot have overlapping effective periods'
);

select throws_ok(
  $$
    update governance.offices
    set official_phone = '+912012345678'
    where id = (select id from governance.offices order by id limit 1)
  $$,
  '55000',
  'LEGACY_CONTACT_FIELD_IMMUTABLE',
  'legacy office contacts cannot be overwritten'
);

select throws_ok(
  $$
    insert into governance.contact_channels (
      channel_key, channel_type, authority_id, local_body_id
    ) values (
      'invalid:two_owners', 'phone',
      'aa3f9456-c120-5d9b-b96e-27604b138fea',
      '1c814ec3-0126-527a-9888-a4a00b70551d'
    )
  $$,
  '23514',
  null,
  'each durable contact channel has exactly one owner'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'd1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'contact-reviewer@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into governance.sync_runs (id, source_endpoint_id, trigger_kind)
values (
  'd2000000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001',
  'manual'
);
update governance.sync_runs
set status = 'retrieving', started_at = timestamptz '2026-07-14 09:00:00+00'
where id = 'd2000000-0000-4000-8000-000000000001';

insert into governance.raw_snapshots (
  id, source_endpoint_id, first_sync_run_id, storage_object_path,
  sha256, media_type, byte_size, http_status, retrieved_at
)
values (
  'd3000000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001/' || repeat('d', 64) || '.html',
  repeat('d', 64), 'text/html', 1024, 200,
  timestamptz '2026-07-14 09:01:00+00'
);
insert into governance.sync_run_snapshots (sync_run_id, raw_snapshot_id)
values (
  'd2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001'
);

insert into governance.sync_candidates (
  id, sync_run_id, raw_snapshot_id, source_record_key, source_record_locator,
  entity_type, source_record_sha256, raw_payload, normalized_payload,
  validation_status, match_status, match_method, match_confidence
)
values (
  'd4000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'pmc:contact:general_email', 'main#contact-email', 'contact', repeat('e', 64),
  '{"email":"info@example.gov.in"}',
  '{"ownerEntityType":"local_body","ownerSourceEntityKey":"pmc:local-body","channelType":"email","normalizedValue":"info@example.gov.in","sourceUrl":"https://www.pmc.gov.in/en"}',
  'valid', 'new_entity', 'none', 0
);

insert into governance.source_evidence (
  id, source_endpoint_id, raw_snapshot_id, sync_candidate_id, evidence_kind,
  source_record_locator, source_field_path, extracted_value_sha256
)
values (
  'd5000000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001',
  'html_element', 'main#contact-email', 'textContent',
  encode(extensions.digest(convert_to('info@example.gov.in', 'UTF8'), 'sha256'), 'hex')
);

update governance.sync_runs set status = 'snapshot_preserved'
where id = 'd2000000-0000-4000-8000-000000000001';
update governance.sync_runs set status = 'normalizing'
where id = 'd2000000-0000-4000-8000-000000000001';
update governance.sync_runs set status = 'matching'
where id = 'd2000000-0000-4000-8000-000000000001';
update governance.sync_runs set status = 'detecting_changes'
where id = 'd2000000-0000-4000-8000-000000000001';
update governance.sync_runs set status = 'awaiting_review'
where id = 'd2000000-0000-4000-8000-000000000001';

insert into governance.sync_change_items (
  id, sync_candidate_id, detection_status, change_kind, target_table,
  proposed_changes, disposition, requested_verification_status,
  requested_routing_eligibility
)
values (
  'd6000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001',
  'new', 'create', 'governance.contact_channels',
  '{"channelKey":"pmc:general_email","ownerRecordId":"1c814ec3-0126-527a-9888-a4a00b70551d","channelType":"email","visibility":"public_official","intendedUse":"complaint_intake","normalizedValue":"info@example.gov.in","isComplaintDeliveryApproved":true}',
  'normalized', 'verified', false
);
update governance.sync_change_items
set status = 'review_required'
where id = 'd6000000-0000-4000-8000-000000000001';

insert into governance.sync_review_items (
  id, sync_change_item_id, review_reason
)
values (
  'd7000000-0000-4000-8000-000000000001',
  'd6000000-0000-4000-8000-000000000001',
  'A public complaint-delivery channel requires attributed manual review.'
);
insert into governance.sync_review_events (
  id, sync_review_item_id, actor_user_id, action, verification_decision,
  routing_eligibility_decision, notes, occurred_at
)
values (
  'd8000000-0000-4000-8000-000000000001',
  'd7000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'approved', 'mark_verified', 'retain_disabled',
  'Confirmed against the official page and approved for public complaint delivery.',
  timestamptz '2026-07-14 09:10:00+00'
);
update governance.sync_review_items
set
  review_status = 'approved',
  reviewed_at = timestamptz '2026-07-14 09:10:00+00',
  reviewed_by = 'd1000000-0000-4000-8000-000000000001',
  reviewer_notes = 'Official public channel confirmed.'
where id = 'd7000000-0000-4000-8000-000000000001';
update governance.sync_change_items
set status = 'approved'
where id = 'd6000000-0000-4000-8000-000000000001';

insert into governance.contact_channels (
  id, channel_key, channel_type, visibility, intended_use, purpose,
  local_body_id, status
)
values (
  'd9000000-0000-4000-8000-000000000001',
  'pmc:general_email', 'email', 'public_official', 'complaint_intake',
  'Official general civic complaint intake.',
  '1c814ec3-0126-527a-9888-a4a00b70551d', 'active'
);

insert into governance.contact_channel_versions (
  id, contact_channel_id, version, contact_value, normalized_value,
  effective_from, status, verification_status, source_endpoint_id,
  source_snapshot_id, source_evidence_id, source_url, source_record_locator,
  last_verified
)
values (
  'da000000-0000-4000-8000-000000000001',
  'd9000000-0000-4000-8000-000000000001', 1,
  'info@example.gov.in', 'info@example.gov.in',
  current_timestamp - interval '2 minutes', 'staged', 'source_verified',
  '94100000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd5000000-0000-4000-8000-000000000001',
  'https://www.pmc.gov.in/en', 'main#contact-email',
  timestamptz '2026-07-14 09:01:00+00'
);

select throws_ok(
  $$
    update governance.contact_channels
    set visibility = 'restricted'
    where id = 'd9000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'CONTACT_CHANNEL_IDENTITY_IMMUTABLE',
  'reviewed ownership, type, use, and visibility cannot be rewritten in place'
);
select is(
  (select count(*)::integer from governance.current_verified_contacts),
  0,
  'source-verified contact values remain staged and invisible'
);
select throws_ok(
  $$
    insert into governance.contact_channel_versions (
      contact_channel_id, version, contact_value, normalized_value,
      effective_from, status, verification_status, source_endpoint_id,
      source_snapshot_id, source_url, source_record_locator, last_verified
    ) values (
      'd9000000-0000-4000-8000-000000000001', 2,
      'info@example.gov.in', 'info@example.gov.in', now(),
      'published', 'source_verified',
      '94100000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'https://www.pmc.gov.in/en', 'main#contact-email', now()
    )
  $$,
  '23514',
  null,
  'source verification alone can never publish a contact'
);
select throws_ok(
  $$
    insert into governance.contact_channel_versions (
      contact_channel_id, version, contact_value, normalized_value,
      effective_from, status, verification_status, source_endpoint_id,
      source_snapshot_id, source_evidence_id, source_url, source_record_locator,
      last_verified, is_complaint_delivery_approved, sync_review_item_id,
      reviewed_at, reviewed_by
    ) values (
      'd9000000-0000-4000-8000-000000000001', 2,
      'unreviewed@example.gov.in', 'unreviewed@example.gov.in',
      current_timestamp - interval '1 minute', 'published', 'manually_verified',
      '94100000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'd5000000-0000-4000-8000-000000000001',
      'https://www.pmc.gov.in/en', 'main#contact-email', now(), true,
      'd7000000-0000-4000-8000-000000000001',
      timestamptz '2026-07-14 09:10:00+00',
      'd1000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'CONTACT_SOURCE_EVIDENCE_MISMATCH',
  'an approved contact proposal cannot publish a value unsupported by its evidence hash'
);

insert into governance.contact_channel_versions (
  id, contact_channel_id, version, contact_value, normalized_value,
  effective_from, status, verification_status, source_endpoint_id,
  source_snapshot_id, source_evidence_id, source_url, source_record_locator,
  last_verified, is_complaint_delivery_approved, sync_review_item_id,
  reviewed_at, reviewed_by
)
values (
  'da000000-0000-4000-8000-000000000002',
  'd9000000-0000-4000-8000-000000000001', 2,
  'info@example.gov.in', 'info@example.gov.in',
  current_timestamp - interval '1 minute', 'published', 'manually_verified',
  '94100000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd5000000-0000-4000-8000-000000000001',
  'https://www.pmc.gov.in/en', 'main#contact-email',
  timestamptz '2026-07-14 09:10:00+00', true,
  'd7000000-0000-4000-8000-000000000001',
  timestamptz '2026-07-14 09:10:00+00',
  'd1000000-0000-4000-8000-000000000001'
);

select is(
  (select count(*)::integer from governance.current_verified_contacts),
  1,
  'only the manually reviewed public version is exposed'
);
select is(
  (select is_complaint_delivery_approved from governance.current_verified_contacts),
  true,
  'complaint delivery approval is explicit and independently recorded'
);
select is(
  (select contact_value from governance.current_verified_contacts),
  'info@example.gov.in',
  'the effective manually verified value is projected'
);
select throws_ok(
  $$
    update governance.contact_channel_versions
    set contact_value = 'changed@example.gov.in', normalized_value = 'changed@example.gov.in'
    where id = 'da000000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'CONTACT_VERSION_IMMUTABLE',
  'published contact values cannot be overwritten'
);
select throws_ok(
  $$
    do $replay$
    begin
    update governance.contact_channel_versions
    set
      status = 'superseded',
      verification_status = 'superseded',
      effective_to = current_timestamp
    where id = 'da000000-0000-4000-8000-000000000002';

    insert into governance.contact_channel_versions (
      contact_channel_id, version, contact_value, normalized_value,
      effective_from, status, verification_status, source_endpoint_id,
      source_snapshot_id, source_evidence_id, source_url, source_record_locator,
      last_verified, is_complaint_delivery_approved, sync_review_item_id,
      reviewed_at, reviewed_by
    ) values (
      'd9000000-0000-4000-8000-000000000001', 3,
      'info@example.gov.in', 'info@example.gov.in',
      current_timestamp, 'published', 'manually_verified',
      '94100000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'd5000000-0000-4000-8000-000000000001',
      'https://www.pmc.gov.in/en', 'main#contact-email',
      timestamptz '2026-07-14 09:10:00+00', true,
      'd7000000-0000-4000-8000-000000000001',
      timestamptz '2026-07-14 09:10:00+00',
      'd1000000-0000-4000-8000-000000000001'
    );
    end
    $replay$;
  $$,
  '23505',
  null,
  'one approved review cannot be replayed to publish or stage another version'
);

select lives_ok(
  $$
    update governance.contact_channel_versions
    set
      status = 'superseded',
      verification_status = 'superseded',
      effective_to = current_timestamp
    where id = 'da000000-0000-4000-8000-000000000002'
  $$,
  'a published value is closed rather than overwritten'
);
select is(
  (select count(*)::integer from governance.current_verified_contacts),
  0,
  'superseded values disappear from the current verified projection'
);
select is(
  (
    select count(*)::integer
    from governance.contact_channel_versions
    where contact_channel_id = 'd9000000-0000-4000-8000-000000000001'
  ),
  2,
  'staged and superseded history remains preserved'
);
select throws_ok(
  $$delete from governance.source_evidence where id = 'd5000000-0000-4000-8000-000000000001'$$,
  '55000',
  null,
  'field-level source evidence is append-only'
);
select throws_ok(
  $$
    insert into governance.contact_channels (
      channel_key, channel_type, local_body_id, status, is_placeholder
    ) values (
      'pmc:placeholder_phone', 'phone',
      '1c814ec3-0126-527a-9888-a4a00b70551d', 'active', true
    )
  $$,
  '23514',
  null,
  'placeholder channels cannot become active'
);
select is(
  (
    select count(*)::integer
    from governance.source_evidence
    where raw_snapshot_id = 'd3000000-0000-4000-8000-000000000001'
      and source_record_locator = 'main#contact-email'
  ),
  1,
  'record-specific evidence retains its exact snapshot locator'
);

select * from finish();
rollback;
