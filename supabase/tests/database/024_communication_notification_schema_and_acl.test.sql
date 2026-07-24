begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, complaints, routing, governance, extensions;

select plan(60);

select has_table('complaints', 'conversation_rooms');
select has_table('complaints', 'room_members');
select has_table('complaints', 'messages');
select has_table('complaints', 'message_receipts');
select hasnt_table(
  'complaints',
  'complaint_comments',
  'the deferred public-comment table is pruned from V1'
);
select has_table('complaints', 'notifications');
select has_table('complaints', 'notification_deliveries');
select has_table('complaints', 'notification_delivery_attempts');
select has_table('complaints', 'notification_outbox_jobs');

select has_column('complaints', 'conversation_rooms', 'complaint_id',
  'conversation rooms belong to one complaint');
select has_column('complaints', 'room_members', 'effective_to',
  'room membership evidence is effective-dated');
select has_column('complaints', 'messages', 'client_message_id',
  'messages retain a client idempotency identity');
select has_column('complaints', 'message_receipts', 'read_through_message_id',
  'receipts retain their exact read-through message');
select has_column('complaints', 'notifications', 'recipient_user_id',
  'notifications belong to a specific recipient');
select has_column('complaints', 'notification_deliveries', 'lease_token',
  'delivery work uses opaque leases');
select has_column('complaints', 'notification_delivery_attempts', 'claim_token',
  'attempt evidence retains its claim token');
select has_column('complaints', 'notification_outbox_jobs', 'next_attempt_at',
  'outbox work has database-owned retry scheduling');

select has_index(
  'complaints', 'messages', 'messages_room_keyset_idx',
  'message history supports stable keyset pagination'
);
select has_index(
  'complaints', 'notifications', 'notifications_recipient_unread_idx',
  'recipient unread notifications are indexed'
);
select has_index(
  'complaints', 'notification_deliveries', 'notification_deliveries_claim_idx',
  'realtime delivery claims are indexed'
);
select has_index(
  'complaints', 'notification_outbox_jobs', 'notification_outbox_jobs_claim_idx',
  'outbox materialization claims are indexed'
);

select ok(to_regprocedure('public.get_realtime_account(uuid)') is not null);
select ok(to_regprocedure('public.authorize_realtime_room(uuid,text,uuid)') is not null);
select ok(to_regprocedure(
  'public.create_complaint_message(uuid,uuid,uuid,text,text)'
) is not null);
select ok(to_regprocedure(
  'public.list_complaint_messages(uuid,uuid,integer,timestamp with time zone,uuid)'
) is not null);
select ok(to_regprocedure(
  'public.mark_complaint_message_read(uuid,uuid,uuid,timestamp with time zone,text)'
) is not null);
select ok(to_regprocedure(
  'public.list_notifications(uuid,integer,timestamp with time zone,uuid)'
) is not null);
select ok(to_regprocedure('public.mark_notification_read(uuid,uuid)') is not null);
select ok(to_regprocedure('public.claim_notification_outbox(text,integer,integer)') is not null);
select ok(to_regprocedure('public.materialize_notification_outbox(uuid,uuid)') is not null);
select ok(to_regprocedure('public.fail_notification_outbox(uuid,uuid,text)') is not null);
select ok(to_regprocedure('public.claim_realtime_deliveries(text,integer,integer)') is not null);
select ok(to_regprocedure(
  'public.complete_notification_delivery(uuid,text,uuid,integer)'
) is not null);
select ok(to_regprocedure('public.fail_notification_delivery(uuid,text,uuid,text)') is not null);

select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'conversation_rooms'
), 'conversation rooms enable and force RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'room_members'
), 'room membership evidence enables and forces RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'messages'
), 'private messages enable and force RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'message_receipts'
), 'message receipts enable and force RLS');
select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'complaints'
      and tablename = 'complaint_comments'
  ),
  'the pruned public-comment structure leaves no stale RLS policies'
);
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'notifications'
), 'notifications enable and force RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'notification_deliveries'
), 'notification delivery state enables and forces RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'notification_delivery_attempts'
), 'delivery attempts enable and force RLS');
select ok((
  select relation.relrowsecurity and relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints' and relation.relname = 'notification_outbox_jobs'
), 'outbox jobs enable and force RLS');

select ok(not has_schema_privilege('anon', 'complaints', 'usage'));
select ok(not has_table_privilege('service_role', 'complaints.messages', 'select'));
select ok(
  to_regclass('complaints.complaint_comments') is null,
  'authenticated clients have no public-comment table to query'
);
select ok(not has_function_privilege(
  'authenticated',
  'public.create_complaint_message(uuid,uuid,uuid,text,text)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.create_complaint_message(uuid,uuid,uuid,text,text)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.claim_notification_outbox(text,integer,integer)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.claim_notification_outbox(text,integer,integer)',
  'execute'
));
select ok(not has_function_privilege(
  'authenticated',
  'public.claim_realtime_deliveries(text,integer,integer)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.claim_realtime_deliveries(text,integer,integer)',
  'execute'
));
select ok(has_function_privilege(
  'service_role',
  'public.mark_notification_read(uuid,uuid)',
  'execute'
));

select has_trigger(
  'complaints', 'messages', 'messages_create_outbox',
  'message persistence appends its outbox event atomically'
);
select has_trigger(
  'complaints', 'complaints', 'complaints_ensure_conversation',
  'complaint creation initializes its private conversation'
);
select has_trigger(
  'complaints', 'notification_delivery_attempts',
  'notification_delivery_attempts_immutable',
  'delivery attempts are append-only'
);

select ok((
  select not attribute.attnotnull
  from pg_catalog.pg_attribute as attribute
  inner join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
  inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'complaints'
    and relation.relname = 'notification_outbox'
    and attribute.attname = 'status_history_id'
), 'outbox status source is nullable after adding message and assignment sources');
select ok(exists (
  select 1
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname = 'notification_outbox_source_check'
), 'outbox requires exactly one durable source');
select hasnt_column(
  'complaints', 'notification_deliveries', 'destination_value',
  'delivery state never copies a raw email address or push token'
);
select ok(to_regprocedure(
  'public.create_complaint_comment(uuid,uuid,uuid,text)'
) is null, 'no public-comment write RPC is exposed in Phase 6');

select * from finish();
rollback;
