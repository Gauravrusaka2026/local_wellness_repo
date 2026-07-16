begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, extensions;

select plan(15);

select has_trigger(
  'complaints',
  'complaint_location_evidence',
  'complaint_location_evidence_enforce_v1_proximity',
  'complaint evidence has a fail-closed V1 proximity trigger'
);
select ok(to_regprocedure('complaints.enforce_v1_location_proximity()') is not null);
select ok(
  not has_function_privilege(
    'authenticated',
    'complaints.enforce_v1_location_proximity()',
    'execute'
  ),
  'clients cannot call the proximity trigger function directly'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where (location_verification_requirements ->> 'maximumAccuracyMeters')::numeric > 50
  ),
  0,
  'every current category has a maximum 50 metre accuracy requirement'
);
select is(
  (
    select count(*)::integer
    from routing.issue_categories
    where (media_requirements ->> 'maximumCaptureDistanceMeters')::numeric > 50
  ),
  0,
  'every current category has a maximum 50 metre media distance'
);
select ok(
  pg_get_expr(attribute.adbin, attribute.adrelid) like '%50%',
  'new issue categories default to a 50 metre accuracy limit'
)
from pg_catalog.pg_attrdef as attribute
inner join pg_catalog.pg_class as relation on relation.oid = attribute.adrelid
inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
inner join pg_catalog.pg_attribute as column_definition
  on column_definition.attrelid = relation.oid
  and column_definition.attnum = attribute.adnum
where namespace.nspname = 'routing'
  and relation.relname = 'issue_categories'
  and column_definition.attname = 'location_verification_requirements';

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'c1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'proximity@example.test',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into complaints.complaint_drafts (
  id,
  citizen_user_id,
  creation_idempotency_key_hash,
  creation_request_fingerprint,
  category_id
)
values (
  'c2000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  repeat('a', 64),
  repeat('b', 64),
  (select id from routing.issue_categories order by code limit 1)
);

select throws_ok(
  $$
    insert into complaints.complaint_location_evidence (
      draft_id, actor_user_id, evidence_type, location, accuracy_meters, provider,
      captured_at, device_recorded_at, spoof_risk_status, verification_status,
      verification_score
    ) values (
      'c2000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      'current_location',
      extensions.st_setsrid(extensions.st_makepoint(73.8567, 18.5204), 4326),
      50.01, 'gps', now(), now(), 'low', 'verified', 0.9
    )
  $$,
  '23514',
  'COMPLAINT_LOCATION_ACCURACY_EXCEEDS_V1_LIMIT',
  'accuracy above 50 metres is rejected'
);
select lives_ok(
  $$
    insert into complaints.complaint_location_evidence (
      id, draft_id, actor_user_id, evidence_type, location, accuracy_meters, provider,
      captured_at, device_recorded_at, spoof_risk_status, verification_status,
      verification_score
    ) values (
      'c3000000-0000-4000-8000-000000000001',
      'c2000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      'current_location',
      extensions.st_setsrid(extensions.st_makepoint(73.8567, 18.5204), 4326),
      50, 'gps', now(), now(), 'low', 'verified', 0.9
    )
  $$,
  'accuracy at 50 metres is accepted'
);

update complaints.complaint_drafts
set selected_location_evidence_id = 'c3000000-0000-4000-8000-000000000001'
where id = 'c2000000-0000-4000-8000-000000000001';

select throws_ok(
  $$
    insert into complaints.complaint_location_evidence (
      draft_id, actor_user_id, evidence_type, location, accuracy_meters, provider,
      captured_at, device_recorded_at, spoof_risk_status, verification_status,
      verification_score
    ) values (
      'c2000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      'media_capture',
      extensions.st_setsrid(extensions.st_makepoint(73.8573, 18.5204), 4326),
      10, 'gps', now(), now(), 'low', 'verified', 0.9
    )
  $$,
  '23514',
  'COMPLAINT_MEDIA_LOCATION_MISMATCH',
  'media beyond 50 metres from the issue is rejected'
);
select lives_ok(
  $$
    insert into complaints.complaint_location_evidence (
      draft_id, actor_user_id, evidence_type, location, accuracy_meters, provider,
      captured_at, device_recorded_at, spoof_risk_status, verification_status,
      verification_score
    ) values (
      'c2000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      'media_capture',
      extensions.st_setsrid(extensions.st_makepoint(73.8569, 18.5204), 4326),
      10, 'gps', now(), now(), 'low', 'verified', 0.9
    )
  $$,
  'media within 50 metres from the issue is accepted'
);
select throws_ok(
  $$
    update routing.issue_categories
    set location_verification_requirements = jsonb_set(
      location_verification_requirements,
      '{maximumAccuracyMeters}',
      '51'::jsonb
    )
    where id = (select category_id from complaints.complaint_drafts limit 1)
  $$,
  '23514',
  null,
  'category configuration cannot weaken the V1 accuracy limit'
);
select throws_ok(
  $$
    update routing.issue_categories
    set media_requirements = jsonb_set(
      media_requirements,
      '{maximumCaptureDistanceMeters}',
      '51'::jsonb
    )
    where id = (select category_id from complaints.complaint_drafts limit 1)
  $$,
  '23514',
  null,
  'category configuration cannot weaken the V1 media limit'
);
select ok(
  (
    select pg_get_constraintdef(constraint_record.oid) like '%50%'
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conname = 'issue_categories_v1_location_accuracy_check'
  ),
  'the database constraint retains the 50 metre accuracy policy'
);
select ok(
  (
    select pg_get_constraintdef(constraint_record.oid) like '%50%'
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conname = 'issue_categories_v1_media_proximity_check'
  ),
  'the database constraint retains the 50 metre media policy'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as procedure
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'complaints'
      and procedure.proname = 'enforce_v1_location_proximity'
      and procedure.prosecdef
      and not ('search_path=""' = any(coalesce(procedure.proconfig, '{}'::text[])))
  ),
  'the security-definer proximity function pins an empty search path'
);

select * from finish();
rollback;
