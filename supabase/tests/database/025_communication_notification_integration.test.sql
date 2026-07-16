begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(61);

insert into governance.reference_sources (id, title, url, source_type, last_checked_on)
values (
  'e0000000-0000-4000-8000-000000000001',
  'Synthetic Phase 6 fixture',
  'https://example.test/phase-6-fixture',
  'official',
  date '2026-07-14'
);

insert into governance.authorities (
  id, code, name, authority_type, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0100000-0000-4000-8000-000000000001', 'PHASE6_TEST_STATE',
  'Phase 6 Test State', 'state', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'e0100000-0000-4000-8000-000000000002',
  'e0100000-0000-4000-8000-000000000001', 'PHASE6_TEST_LOCAL_BODY',
  'Phase 6 Test Local Body', 'local_body', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.states (
  id, authority_id, name, iso_code, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0200000-0000-4000-8000-000000000001',
  'e0100000-0000-4000-8000-000000000001',
  'Phase 6 Test State', 'PX', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'e0300000-0000-4000-8000-000000000001',
  'e0100000-0000-4000-8000-000000000002',
  'e0200000-0000-4000-8000-000000000001',
  'Phase 6 Test Local Body', 'municipal_corporation', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0400000-0000-4000-8000-000000000001',
  'phase6_test_department', 'Phase 6 Test Department', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0500000-0000-4000-8000-000000000001',
  'e0100000-0000-4000-8000-000000000002',
  'e0400000-0000-4000-8000-000000000001', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0600000-0000-4000-8000-000000000001',
  'phase6_test_officer', 'Phase 6 Test Officer', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0700000-0000-4000-8000-000000000001', 'phase6_test_domain',
  'Phase 6 Test Domain', 'active', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'e0800000-0000-4000-8000-000000000001',
  'e0700000-0000-4000-8000-000000000001', 'phase6_test_category',
  'Phase 6 Test Category', 'active', 'verified', true,
  date '2026-07-14', 'e0000000-0000-4000-8000-000000000001'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'phase6-citizen@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'phase6-operator@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'phase6-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.authority_memberships (
  user_id, authority_id, invitation_email, status, effective_from,
  invited_by, approved_by, approved_at
)
values (
  'e1000000-0000-4000-8000-000000000002',
  'e0100000-0000-4000-8000-000000000002',
  'phase6-operator@example.test', 'active', now() - interval '1 day',
  'e1000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000002', now() - interval '1 day'
);

insert into public.user_roles (
  user_id, role_id, authority_id, scope_type, scope_id, effective_from, granted_by
)
select
  'e1000000-0000-4000-8000-000000000002', role.id,
  'e0100000-0000-4000-8000-000000000002', 'authority',
  'e0100000-0000-4000-8000-000000000002', now() - interval '1 day',
  'e1000000-0000-4000-8000-000000000002'
from public.roles as role
where role.code = 'government_operator';

insert into complaints.complaint_drafts (
  id, citizen_user_id, creation_idempotency_key_hash,
  creation_request_fingerprint, category_id, description
)
values (
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  repeat('a', 64), repeat('b', 64),
  'e0800000-0000-4000-8000-000000000001',
  'Synthetic complaint for communication integration tests.'
);

insert into complaints.complaint_location_evidence (
  id, draft_id, actor_user_id, evidence_type, location, accuracy_meters,
  provider, captured_at, device_recorded_at, verification_status, verification_score
)
values (
  'e2100000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001', 'current_location',
  extensions.st_setsrid(extensions.st_makepoint(73.8567, 18.5204), 4326),
  10, 'gps', now(), now(), 'verified', 1
);

set local session_replication_role = replica;
insert into routing.routing_decisions (
  id, actor_user_id, request_id, category_id, input_location,
  accuracy_meters, captured_at, resolved_at, decision_status
)
values (
  'e2200000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001', 'phase6-routing-request',
  'e0800000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.8567, 18.5204), 4326),
  10, now(), now(), 'manual_review'
);
set local session_replication_role = origin;

insert into complaints.complaints (
  id, draft_id, complaint_number, citizen_user_id, category_id, description,
  description_language, custom_attributes, location_evidence_id,
  routing_decision_id, submitted_at
)
values (
  'e2300000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001', 'LW-20260714-60000001',
  'e1000000-0000-4000-8000-000000000001',
  'e0800000-0000-4000-8000-000000000001',
  'Synthetic complaint for communication integration tests.',
  'en', '{}', 'e2100000-0000-4000-8000-000000000001',
  'e2200000-0000-4000-8000-000000000001', now()
);

insert into complaints.complaint_assignments (
  id, complaint_id, routing_decision_id, authority_id, local_body_id,
  department_id, authority_department_id, officer_role_id,
  assignment_source, status, assigned_at
)
values (
  'e2400000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001',
  'e2200000-0000-4000-8000-000000000001',
  'e0100000-0000-4000-8000-000000000002',
  'e0300000-0000-4000-8000-000000000001',
  'e0400000-0000-4000-8000-000000000001',
  'e0500000-0000-4000-8000-000000000001',
  'e0600000-0000-4000-8000-000000000001',
  'routing_decision', 'active', now()
);

insert into complaints.complaint_status_history (
  id, complaint_id, sequence, from_status, to_status, actor_user_id,
  event_source, reason_code, request_id, occurred_at
)
values (
  'e2500000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001', 1, null, 'submitted',
  'e1000000-0000-4000-8000-000000000001',
  'citizen_submission', 'COMPLAINT_SUBMITTED', 'phase6-submit-request', now()
);

select is((
  select count(*)::integer
  from complaints.conversation_rooms
  where complaint_id = 'e2300000-0000-4000-8000-000000000001'
), 1, 'complaint creation initializes exactly one private conversation');
select is((
  select count(*)::integer
  from complaints.room_members as member
  inner join complaints.conversation_rooms as room on room.id = member.room_id
  where room.complaint_id = 'e2300000-0000-4000-8000-000000000001'
    and member.user_id = 'e1000000-0000-4000-8000-000000000001'
    and member.membership_source = 'complaint_owner'
    and member.effective_to is null
), 1, 'complaint owner membership evidence is initialized');
select is((select authorized and actor_type = 'citizen' from public.authorize_realtime_room(
  'e1000000-0000-4000-8000-000000000001', 'complaint',
  'e2300000-0000-4000-8000-000000000001'
)), true, 'the complaint owner can authorize its realtime room');
select is((select authorized and actor_type = 'government' from public.authorize_realtime_room(
  'e1000000-0000-4000-8000-000000000002', 'complaint',
  'e2300000-0000-4000-8000-000000000001'
)), true, 'a currently scoped government operator can authorize the room');
select is((select not authorized and actor_type is null from public.authorize_realtime_room(
  'e1000000-0000-4000-8000-000000000003', 'complaint',
  'e2300000-0000-4000-8000-000000000001'
)), true, 'an unrelated active account cannot authorize the room or receive an author type');
select is((select is_active from public.get_realtime_account(
  'e1000000-0000-4000-8000-000000000001'
)), true, 'realtime account lookup reports an active profile');

create temporary table phase6_created_message as
select * from public.create_complaint_message(
  'e1000000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001',
  'e2600000-0000-4000-8000-000000000001',
  'Please share an update on this complaint.',
  'phase6-message-request'
);

select ok((
  select response_payload ?& array[
    'id', 'complaintId', 'kind', 'authorType', 'authoredByMe', 'body', 'createdAt'
  ] and response_payload - array[
    'id', 'complaintId', 'kind', 'authorType', 'authoredByMe', 'body', 'createdAt'
  ] = '{}'::jsonb
  from phase6_created_message
), 'message creation returns only the strict public message shape');
select is((select replayed from phase6_created_message), false, 'first message creation is not replayed');
select is((
  select count(*)::integer from complaints.messages
  where complaint_id = 'e2300000-0000-4000-8000-000000000001'
), 1, 'one immutable message is persisted');
select is((
  select count(*)::integer from complaints.notification_outbox
  where message_id = (select (response_payload ->> 'id')::uuid from phase6_created_message)
), 1, 'message persistence appends one immutable outbox event');
select is((
  select count(*)::integer
  from complaints.notification_outbox_jobs as job
  inner join complaints.notification_outbox as outbox on outbox.id = job.outbox_id
  where outbox.message_id = (select (response_payload ->> 'id')::uuid from phase6_created_message)
), 1, 'message outbox persistence initializes one materialization job');
select is((select replayed from public.create_complaint_message(
  'e1000000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001',
  'e2600000-0000-4000-8000-000000000001',
  'Please share an update on this complaint.',
  'phase6-message-request-retry'
)), true, 'the same sender/client message identity replays safely');
select is((
  select count(*)::integer from complaints.messages
  where complaint_id = 'e2300000-0000-4000-8000-000000000001'
), 1, 'message replay creates no duplicate row');
select throws_ok(
  $$select * from public.create_complaint_message(
      'e1000000-0000-4000-8000-000000000001',
      'e2300000-0000-4000-8000-000000000001',
      'e2600000-0000-4000-8000-000000000001',
      'A conflicting message body.', 'phase6-message-conflict'
    )$$,
  '23505', 'MESSAGE_IDEMPOTENCY_CONFLICT',
  'reusing a client message identity with different content is rejected'
);
select throws_ok(
  $$select * from public.create_complaint_message(
      'e1000000-0000-4000-8000-000000000003',
      'e2300000-0000-4000-8000-000000000001',
      'e2600000-0000-4000-8000-000000000002',
      'Unauthorized message.', 'phase6-outsider-message'
    )$$,
  '42501', 'COMMUNICATION_ACCESS_DENIED',
  'an unrelated account cannot create a complaint message'
);

create temporary table phase6_citizen_messages as
select response_payload from public.list_complaint_messages(
  'e1000000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001', 25, null, null
);
select is((
  select jsonb_array_length(response_payload -> 'items') from phase6_citizen_messages
), 1, 'the citizen message list returns its persisted message');
select is((
  select (response_payload #>> '{items,0,authoredByMe}')::boolean
  from phase6_citizen_messages
), true, 'message list computes authoredByMe for the requesting citizen');
select is((
  select (response_payload #>> '{items,0,authoredByMe}')::boolean
  from public.list_complaint_messages(
    'e1000000-0000-4000-8000-000000000002',
    'e2300000-0000-4000-8000-000000000001', 25, null, null
  )
), false, 'message list computes authoredByMe for the government recipient');
select throws_ok(
  $$select * from public.list_complaint_messages(
      'e1000000-0000-4000-8000-000000000003',
      'e2300000-0000-4000-8000-000000000001', 25, null, null
    )$$,
  '42501', 'COMMUNICATION_ACCESS_DENIED',
  'an unrelated account cannot list private messages'
);

create temporary table phase6_read_result as
select public.mark_complaint_message_read(
  'e1000000-0000-4000-8000-000000000002',
  'e2300000-0000-4000-8000-000000000001',
  (select (response_payload ->> 'id')::uuid from phase6_created_message),
  (select (response_payload ->> 'createdAt')::timestamptz from phase6_created_message),
  'phase6-read-request'
) as response_payload;
select ok((
  select response_payload ?& array[
    'complaintId', 'readThroughCreatedAt', 'readThroughMessageId', 'updatedAt'
  ] and response_payload - array[
    'complaintId', 'readThroughCreatedAt', 'readThroughMessageId', 'updatedAt'
  ] = '{}'::jsonb
  from phase6_read_result
), 'message read returns only the strict public receipt shape');
select is((
  select count(*)::integer from complaints.message_receipts
  where user_id = 'e1000000-0000-4000-8000-000000000002'
), 1, 'one monotonic read position is persisted per room and user');
select is(
  public.mark_complaint_message_read(
    'e1000000-0000-4000-8000-000000000002',
    'e2300000-0000-4000-8000-000000000001',
    (select (response_payload ->> 'id')::uuid from phase6_created_message),
    (select (response_payload ->> 'createdAt')::timestamptz from phase6_created_message),
    'phase6-read-request-retry'
  ),
  (select response_payload from phase6_read_result),
  'replaying the same read position does not mutate the receipt'
);

create temporary table phase6_claimed_outbox as
select * from public.claim_notification_outbox('phase6-worker', 10, 60);
select is((select count(*)::integer from phase6_claimed_outbox), 2,
  'submission and message outbox jobs are claimed together');
select is((
  select count(*)::integer from public.claim_notification_outbox('phase6-worker-2', 10, 60)
), 0, 'active outbox leases prevent duplicate claims');

do $$
declare
  claimed record;
begin
  for claimed in select * from phase6_claimed_outbox loop
    perform * from public.materialize_notification_outbox(
      claimed.outbox_id,
      claimed.lease_token
    );
  end loop;
end;
$$;

select is((
  select count(*)::integer
  from complaints.notification_outbox_jobs
  where state = 'completed'
    and outbox_id in (select outbox_id from phase6_claimed_outbox)
), 2, 'claimed outbox jobs materialize atomically to completion');
select is((
  select replayed
  from public.materialize_notification_outbox(
    (select outbox_id from phase6_claimed_outbox order by outbox_id limit 1),
    (select lease_token from phase6_claimed_outbox order by outbox_id limit 1)
  )
), true, 'completed outbox materialization is replay-safe');
select is((
  select count(*)::integer from complaints.notifications
  where recipient_user_id = 'e1000000-0000-4000-8000-000000000002'
), 2, 'the currently authorized government operator receives both notifications');
select is((
  select count(*)::integer from complaints.notifications
  where recipient_user_id = 'e1000000-0000-4000-8000-000000000001'
), 0, 'the event actor is excluded from its own notifications');
select ok(not exists (
  select 1 from complaints.notifications
  where payload ?| array['body', 'email', 'phone', 'pushToken', 'citizenUserId']
), 'persistent notification payloads contain no private body or destination value');
select is((
  select count(*)::integer
  from complaints.notification_deliveries as delivery
  inner join complaints.notifications as notification on notification.id = delivery.notification_id
  where notification.recipient_user_id = 'e1000000-0000-4000-8000-000000000002'
), 6, 'each notification records in-app, realtime, and deferred email delivery state');
select is((
  select count(*)::integer from complaints.notification_deliveries
  where channel = 'in_app' and state = 'delivered'
), 2, 'in-app availability is recorded as delivered');
select is((
  select count(*)::integer from complaints.notification_deliveries
  where channel = 'realtime' and state = 'pending'
), 2, 'realtime delivery starts pending');
select is((
  select count(*)::integer from complaints.notification_deliveries
  where channel = 'email' and state = 'unsupported'
), 2, 'deferred email delivery is explicit and non-runnable');
select ok(not exists (
  select 1 from complaints.notification_deliveries
  where destination_key like '%@%'
), 'delivery destinations reference users and never copy email addresses');

create temporary table phase6_notification_list as
select response_payload from public.list_notifications(
  'e1000000-0000-4000-8000-000000000002', 25, null, null
);
select is((
  select jsonb_array_length(response_payload -> 'items') from phase6_notification_list
), 2, 'notification listing returns both recipient notifications');
select ok((
  select (response_payload #> '{items,0}') ?& array[
    'id', 'eventId', 'eventType', 'payload', 'occurredAt', 'createdAt', 'readAt'
  ] and (response_payload #> '{items,0}') - array[
    'id', 'eventId', 'eventType', 'payload', 'occurredAt', 'createdAt', 'readAt'
  ] = '{}'::jsonb
  from phase6_notification_list
), 'notification listing returns the strict public notification shape');

create temporary table phase6_read_notification as
select public.mark_notification_read(
  'e1000000-0000-4000-8000-000000000002',
  (select id from complaints.notifications order by created_at, id limit 1)
) as response_payload;
select ok((
  select response_payload ?& array['notificationId', 'readAt']
    and response_payload - array['notificationId', 'readAt'] = '{}'::jsonb
  from phase6_read_notification
), 'notification read returns only notificationId and readAt');
select is((
  select count(*)::integer from complaints.notifications where read_at is not null
), 1, 'notification read state is persisted once');
select throws_ok(
  $$select public.mark_notification_read(
      'e1000000-0000-4000-8000-000000000003',
      (select id from complaints.notifications order by created_at, id limit 1)
    )$$,
  'P0002', 'NOTIFICATION_NOT_FOUND',
  'another account cannot mark a recipient notification as read'
);

create temporary table phase6_realtime_claims as
select * from public.claim_realtime_deliveries('phase6-realtime', 10, 30);
select is((select count(*)::integer from phase6_realtime_claims), 2,
  'realtime worker claims the two due deliveries');
select is((
  select count(distinct event_name)::integer from phase6_realtime_claims
), 2, 'submission and message deliveries retain their distinct event names');
select ok(not exists (
  select 1 from phase6_realtime_claims where claim_token is null
), 'every realtime claim receives an opaque UUID lease token');
select is((
  select count(*)::integer
  from public.claim_realtime_deliveries('phase6-realtime-2', 10, 30)
), 0, 'active realtime leases prevent duplicate claims');

select public.complete_notification_delivery(
  (select delivery_id from phase6_realtime_claims order by delivery_id limit 1),
  'phase6-realtime',
  (select claim_token from phase6_realtime_claims order by delivery_id limit 1),
  1
);
select public.fail_notification_delivery(
  (select delivery_id from phase6_realtime_claims order by delivery_id desc limit 1),
  'phase6-realtime',
  (select claim_token from phase6_realtime_claims order by delivery_id desc limit 1),
  'DELIVERY_EMIT_FAILED'
);
select is((
  select count(*)::integer from complaints.notification_deliveries
  where channel = 'realtime' and state = 'delivered'
), 1, 'successful realtime completion reaches delivered');
select is((
  select count(*)::integer from complaints.notification_deliveries
  where channel = 'realtime' and state = 'retry'
), 1, 'failed realtime completion schedules a database-owned retry');
select is((
  select count(*)::integer from complaints.notification_delivery_attempts
  where event_type = 'claimed'
), 2, 'claim attempts are appended for both deliveries');
select is((
  select count(*)::integer from complaints.notification_delivery_attempts
  where event_type = 'delivered'
), 1, 'successful delivery outcome is appended');
select is((
  select count(*)::integer from complaints.notification_delivery_attempts
  where event_type = 'failed'
), 1, 'failed delivery outcome is appended');
select throws_ok(
  format(
    'select public.complete_notification_delivery(%L, %L, %L, 1)',
    (select delivery_id from phase6_realtime_claims order by delivery_id desc limit 1),
    'phase6-realtime',
    (select claim_token from phase6_realtime_claims order by delivery_id desc limit 1)
  ),
  '42501', 'REALTIME_DELIVERY_CLAIM_INVALID',
  'a stale realtime lease cannot complete after failure'
);
select is((
  select count(*)::integer
  from public.claim_realtime_deliveries('phase6-realtime-3', 10, 30)
), 0, 'realtime retry backoff prevents an immediate hot loop');

insert into complaints.complaint_status_history (
  id, complaint_id, sequence, from_status, to_status, actor_user_id,
  event_source, reason_code, request_id, occurred_at
)
values (
  'e2500000-0000-4000-8000-000000000002',
  'e2300000-0000-4000-8000-000000000001', 2, 'submitted', 'validation_pending',
  'e1000000-0000-4000-8000-000000000002',
  'government_action', 'GOVERNMENT_STATUS_UPDATED', 'phase6-status-request', now()
);
insert into complaints.notification_outbox (
  id, complaint_id, status_history_id, event_type, aggregate_id, payload, occurred_at
)
values (
  'e2700000-0000-4000-8000-000000000001',
  'e2300000-0000-4000-8000-000000000001',
  'e2500000-0000-4000-8000-000000000002', 'complaint_status_changed',
  'e2300000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'complaintId', 'e2300000-0000-4000-8000-000000000001',
    'complaintNumber', 'LW-20260714-60000001',
    'status', 'validation_pending',
    'occurredAt', now()
  ),
  now()
);
create temporary table phase6_failed_outbox_claim as
select * from public.claim_notification_outbox('phase6-failing-worker', 1, 60);
select is((select count(*)::integer from phase6_failed_outbox_claim), 1,
  'a newly appended outbox job is claimable');
create temporary table phase6_failed_outbox_result as
select * from public.fail_notification_outbox(
  (select outbox_id from phase6_failed_outbox_claim),
  (select lease_token from phase6_failed_outbox_claim),
  'MATERIALIZATION_FAILED'
);
select is((select status from phase6_failed_outbox_result), 'retry_scheduled',
  'outbox materialization failure reports a scheduled retry');
select is((
  select state from complaints.notification_outbox_jobs
  where outbox_id = 'e2700000-0000-4000-8000-000000000001'
), 'retry', 'failed outbox materialization persists retry state');
select is((
  select count(*)::integer
  from public.claim_notification_outbox('phase6-failing-worker-2', 1, 60)
), 0, 'outbox retry backoff prevents an immediate hot loop');
select throws_ok(
  format(
    'select * from public.materialize_notification_outbox(%L, %L)',
    (select outbox_id from phase6_failed_outbox_claim),
    (select lease_token from phase6_failed_outbox_claim)
  ),
  '42501', 'NOTIFICATION_OUTBOX_CLAIM_INVALID',
  'a stale outbox lease cannot materialize after failure'
);
select throws_ok(
  $$select * from public.claim_notification_outbox('x', 1, 60)$$,
  '22023', 'NOTIFICATION_OUTBOX_CLAIM_INVALID',
  'outbox worker identity validation rejects undersized values'
);
select throws_ok(
  $$select * from public.claim_realtime_deliveries('phase6-realtime', 1, 1)$$,
  '22023', 'REALTIME_DELIVERY_CLAIM_INVALID',
  'realtime claim validation rejects unsafe lease durations'
);
select throws_ok(
  $$update complaints.messages set body = body where id = (
      select id from complaints.messages limit 1
    )$$,
  '55000', null,
  'persisted private messages are immutable'
);
select throws_ok(
  $$update complaints.notification_delivery_attempts set occurred_at = occurred_at
    where id = (select id from complaints.notification_delivery_attempts limit 1)$$,
  '55000', null,
  'delivery attempt evidence is immutable'
);
select throws_ok(
  $$update complaints.notification_outbox set payload = payload
    where id = (select id from complaints.notification_outbox limit 1)$$,
  '55000', null,
  'notification outbox events remain immutable'
);
select ok(not exists (
  select 1
  from phase6_realtime_claims
  where payload::text ~ '(phase6-operator@example|pushToken|phone)'
), 'realtime claims contain no copied contact or destination values');

select * from finish();
rollback;
