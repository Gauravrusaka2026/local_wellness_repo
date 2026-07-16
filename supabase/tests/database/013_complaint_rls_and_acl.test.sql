begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'phase4-owner@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'phase4-other@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash, creation_request_fingerprint
)
values (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  repeat('a', 64), repeat('b', 64)
);

insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, verification_status
)
values (
  'a3000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  10, 'gps', now(), now(), 'pending'
);

select ok(not has_schema_privilege('anon', 'complaints', 'usage'));
select ok(not has_schema_privilege('authenticated', 'complaints', 'usage'));
select ok(not has_schema_privilege('service_role', 'complaints', 'usage'));
select ok(not has_table_privilege('anon', 'complaints.complaint_drafts', 'select'));
select ok(not has_table_privilege('authenticated', 'complaints.complaint_drafts', 'select'));
select ok(not has_table_privilege('service_role', 'complaints.complaint_drafts', 'select'));
select ok(not has_table_privilege('service_role', 'complaints.complaints', 'delete'));
select ok(not has_table_privilege('service_role', 'complaints.complaint_status_history', 'delete'));
select ok(not has_table_privilege('service_role', 'complaints.complaint_media', 'delete'));

select ok(not has_function_privilege('anon', 'public.create_complaint_draft(uuid,text,text,uuid,uuid,text,text,jsonb)', 'execute'));
select ok(not has_function_privilege('authenticated', 'public.create_complaint_draft(uuid,text,text,uuid,uuid,text,text,jsonb)', 'execute'));
select ok(has_function_privilege('service_role', 'public.create_complaint_draft(uuid,text,text,uuid,uuid,text,text,jsonb)', 'execute'));
select ok(not has_function_privilege('authenticated', 'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)', 'execute'));
select ok(has_function_privilege('service_role', 'public.submit_complaint(uuid,uuid,uuid,uuid[],boolean)', 'execute'));
select ok(not has_function_privilege('authenticated', 'public.get_routing_decision_replay(uuid,text)', 'execute'));
select ok(has_function_privilege('service_role', 'public.get_routing_decision_replay(uuid,text)', 'execute'));

select throws_ok(
  $$update complaints.complaint_location_evidence set accuracy_meters = 20 where id = 'a3000000-0000-4000-8000-000000000001'$$,
  '55000',
  'complaints.complaint_location_evidence records are append-only.',
  'location evidence cannot be rewritten'
);
select throws_ok(
  $$delete from complaints.complaint_location_evidence where id = 'a3000000-0000-4000-8000-000000000001'$$,
  '55000',
  'complaints.complaint_location_evidence records are append-only.',
  'location evidence cannot be deleted'
);

set local "request.jwt.claims" = '{"role":"authenticated","sub":"a1000000-0000-4000-8000-000000000001"}';
set local role authenticated;
select throws_ok($$select * from complaints.complaint_drafts$$);
select throws_ok($$select * from complaints.complaint_location_evidence$$);
select throws_ok($$select public.get_complaint_draft('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001')$$);

reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from complaints.complaint_drafts$$);
select throws_ok($$select public.list_owned_complaints('a1000000-0000-4000-8000-000000000001',25,null,null)$$);

reset role;
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger
    where tgrelid = 'complaints.complaint_status_history'::regclass
      and not tgisinternal
  ),
  3,
  'status history retains append-only and derived-event triggers'
);

select * from finish();
rollback;
