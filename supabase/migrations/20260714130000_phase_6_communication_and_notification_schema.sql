create table complaints.conversation_rooms (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique
    references complaints.complaints (id) on delete restrict,
  visibility text not null default 'private',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint conversation_rooms_visibility_check check (
    visibility in ('private', 'public')
  ),
  constraint conversation_rooms_status_check check (
    status in ('active', 'closed')
  ),
  constraint conversation_rooms_lifecycle_check check (
    (status = 'active' and closed_at is null)
    or (status = 'closed' and closed_at is not null and closed_at >= created_at)
  )
);

alter table complaints.conversation_rooms
  add constraint conversation_rooms_id_complaint_unique unique (id, complaint_id);

create table complaints.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  member_type text not null,
  membership_source text not null,
  role_assignment_id uuid references public.user_roles (id) on delete restrict,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint room_members_type_check check (
    member_type in ('citizen', 'government', 'platform')
  ),
  constraint room_members_source_check check (
    membership_source in ('complaint_owner', 'message_sender', 'role_scope', 'system')
  ),
  constraint room_members_effective_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint room_members_role_source_check check (
    (membership_source = 'role_scope' and role_assignment_id is not null)
    or membership_source <> 'role_scope'
  )
);

create unique index room_members_one_current_idx
  on complaints.room_members (room_id, user_id)
  where effective_to is null;

create index room_members_user_current_idx
  on complaints.room_members (user_id, room_id)
  where effective_to is null;

create table complaints.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  sender_user_id uuid not null references auth.users (id) on delete restrict,
  client_message_id uuid not null,
  body text not null,
  request_fingerprint text not null,
  request_id text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint messages_sender_client_id_unique unique (
    sender_user_id,
    client_message_id
  ),
  constraint messages_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  ),
  constraint messages_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint messages_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  )
);

alter table complaints.messages
  add constraint messages_room_complaint_fkey
    foreign key (room_id, complaint_id)
    references complaints.conversation_rooms (id, complaint_id) on delete restrict,
  add constraint messages_id_complaint_unique unique (id, complaint_id);

create index messages_room_keyset_idx
  on complaints.messages (room_id, created_at desc, id desc);

create index messages_complaint_keyset_idx
  on complaints.messages (complaint_id, created_at desc, id desc);

create table complaints.message_receipts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references complaints.conversation_rooms (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  read_through_message_id uuid not null
    references complaints.messages (id) on delete restrict,
  read_through_created_at timestamptz not null,
  read_at timestamptz not null default clock_timestamp(),
  event_id uuid not null unique default gen_random_uuid(),
  request_id text not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_receipts_room_user_unique unique (room_id, user_id),
  constraint message_receipts_version_check check (version >= 1),
  constraint message_receipts_request_id_check check (
    request_id = btrim(request_id)
    and request_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
  ),
  constraint message_receipts_time_check check (
    read_at >= read_through_created_at
  )
);

alter table complaints.message_receipts
  add constraint message_receipts_room_complaint_fkey
    foreign key (room_id, complaint_id)
    references complaints.conversation_rooms (id, complaint_id) on delete restrict,
  add constraint message_receipts_message_complaint_fkey
    foreign key (read_through_message_id, complaint_id)
    references complaints.messages (id, complaint_id) on delete restrict;

create index message_receipts_user_updated_idx
  on complaints.message_receipts (user_id, updated_at desc, id desc);

create table complaints.complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  client_message_id uuid not null,
  body text not null,
  visibility text not null default 'public',
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint complaint_comments_author_client_id_unique unique (
    author_user_id,
    client_message_id
  ),
  constraint complaint_comments_body_check check (
    body = btrim(body) and char_length(body) between 1 and 4000
  ),
  constraint complaint_comments_visibility_check check (visibility = 'public'),
  constraint complaint_comments_moderation_check check (
    moderation_status in ('pending', 'approved', 'rejected')
  )
);

create index complaint_comments_complaint_time_idx
  on complaints.complaint_comments (complaint_id, created_at desc, id desc);

alter table complaints.notification_outbox
  alter column status_history_id drop not null,
  add column message_id uuid unique
    references complaints.messages (id) on delete restrict,
  add column assignment_id uuid unique
    references complaints.complaint_assignments (id) on delete restrict;

alter table complaints.notification_outbox
  add constraint notification_outbox_id_complaint_unique unique (id, complaint_id);

alter table complaints.notification_outbox
  drop constraint notification_outbox_event_type_check,
  drop constraint notification_outbox_payload_check,
  add constraint notification_outbox_event_type_check check (
    event_type in (
      'complaint_submitted',
      'complaint_status_changed',
      'complaint_assignment_changed',
      'complaint_message_created'
    )
  ),
  add constraint notification_outbox_source_check check (
    num_nonnulls(status_history_id, message_id, assignment_id) = 1
  ),
  add constraint notification_outbox_event_source_check check (
    (event_type in ('complaint_submitted', 'complaint_status_changed')
      and status_history_id is not null)
    or (event_type = 'complaint_assignment_changed' and assignment_id is not null)
    or (event_type = 'complaint_message_created' and message_id is not null)
  ),
  add constraint notification_outbox_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'status', 'authorityId', 'wardId',
      'authorityDepartmentId', 'messageId', 'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'body', 'exactLocation', 'latitude', 'longitude',
        'citizenUserId', 'senderUserId', 'phone', 'email', 'objectPath',
        'signedUrl', 'token', 'pushToken'
      ]
    )
    and (event_type <> 'complaint_message_created' or payload ? 'messageId')
    and (
      event_type not in ('complaint_submitted', 'complaint_status_changed')
      or payload ? 'status'
    )
  );

create index notification_outbox_complaint_created_idx
  on complaints.notification_outbox (complaint_id, created_at, id);

create table complaints.notifications (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null
    references complaints.notification_outbox (id) on delete restrict,
  complaint_id uuid not null references complaints.complaints (id) on delete restrict,
  recipient_user_id uuid not null references auth.users (id) on delete restrict,
  event_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_outbox_recipient_unique unique (
    outbox_id,
    recipient_user_id
  ),
  constraint notifications_event_type_check check (
    event_type in (
      'submission', 'assignment', 'acknowledgement', 'transfer', 'message',
      'status_update', 'resolution', 'reopen', 'escalation'
    )
  ),
  constraint notifications_title_check check (
    title = btrim(title) and char_length(title) between 1 and 160
  ),
  constraint notifications_body_check check (
    body = btrim(body) and char_length(body) between 1 and 1000
  ),
  constraint notifications_payload_check check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['complaintId', 'eventType', 'occurredAt']
    and payload - array[
      'complaintId', 'complaintNumber', 'eventType', 'status', 'messageId',
      'occurredAt'
    ] = '{}'::jsonb
    and not (
      payload ?| array[
        'description', 'body', 'exactLocation', 'latitude', 'longitude',
        'citizenUserId', 'senderUserId', 'phone', 'email', 'objectPath',
        'signedUrl', 'token', 'pushToken'
      ]
    )
  )
);

alter table complaints.notifications
  add constraint notifications_outbox_complaint_fkey
    foreign key (outbox_id, complaint_id)
    references complaints.notification_outbox (id, complaint_id) on delete restrict;

create index notifications_recipient_keyset_idx
  on complaints.notifications (recipient_user_id, created_at desc, id desc);

create index notifications_recipient_unread_idx
  on complaints.notifications (recipient_user_id, created_at desc, id desc)
  where read_at is null;

create table complaints.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null
    references complaints.notifications (id) on delete restrict,
  channel text not null,
  event_name text not null,
  destination_key text not null,
  device_id uuid references public.devices (id) on delete restrict,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  last_failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_destination_unique unique (
    notification_id,
    channel,
    event_name,
    destination_key
  ),
  constraint notification_deliveries_channel_check check (
    channel in ('in_app', 'realtime', 'push', 'email')
  ),
  constraint notification_deliveries_event_name_check check (
    event_name in (
      'complaint:status_changed', 'message:created', 'notification:created'
    )
  ),
  constraint notification_deliveries_destination_check check (
    destination_key = btrim(destination_key)
    and char_length(destination_key) between 38 and 80
    and destination_key ~ '^(user|device):[0-9a-f-]{36}$'
    and (
      (channel = 'push' and device_id is not null
        and destination_key = 'device:' || device_id::text)
      or (channel <> 'push' and device_id is null
        and destination_key ~ '^user:[0-9a-f-]{36}$')
    )
  ),
  constraint notification_deliveries_state_check check (
    state in ('pending', 'processing', 'retry', 'delivered', 'unsupported', 'dead')
  ),
  constraint notification_deliveries_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint notification_deliveries_worker_check check (
    leased_by is null
    or (
      leased_by = btrim(leased_by)
      and leased_by ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    )
  ),
  constraint notification_deliveries_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint notification_deliveries_lifecycle_check check (
    (state in ('pending', 'retry')
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is null)
    or (state = 'processing'
      and lease_token is not null and leased_by is not null and lease_expires_at is not null
      and delivered_at is null and attempt_count >= 1)
    or (state = 'delivered'
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is not null)
    or (state in ('unsupported', 'dead')
      and lease_token is null and leased_by is null and lease_expires_at is null
      and delivered_at is null)
  )
);

create index notification_deliveries_claim_idx
  on complaints.notification_deliveries (
    channel,
    state,
    next_attempt_at,
    created_at,
    id
  )
  where state in ('pending', 'retry', 'processing');

create index notification_deliveries_lease_expiry_idx
  on complaints.notification_deliveries (lease_expires_at, id)
  where state = 'processing';

create table complaints.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null
    references complaints.notification_deliveries (id) on delete restrict,
  attempt_number integer not null,
  event_type text not null,
  worker_id text not null,
  claim_token uuid not null,
  failure_code text,
  delivered_socket_count integer,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint notification_delivery_attempts_event_unique unique (
    delivery_id,
    attempt_number,
    event_type
  ),
  constraint notification_delivery_attempts_attempt_check check (
    attempt_number between 1 and 5
  ),
  constraint notification_delivery_attempts_event_check check (
    event_type in ('claimed', 'delivered', 'failed', 'lease_expired')
  ),
  constraint notification_delivery_attempts_worker_check check (
    worker_id = btrim(worker_id)
    and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
  ),
  constraint notification_delivery_attempts_failure_check check (
    (event_type in ('failed', 'lease_expired')
      and failure_code is not null
      and failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$')
    or (event_type not in ('failed', 'lease_expired') and failure_code is null)
  ),
  constraint notification_delivery_attempts_socket_count_check check (
    (event_type = 'delivered' and delivered_socket_count between 0 and 10000)
    or (event_type <> 'delivered' and delivered_socket_count is null)
  )
);

create index notification_delivery_attempts_delivery_time_idx
  on complaints.notification_delivery_attempts (delivery_id, occurred_at, id);

create table complaints.notification_outbox_jobs (
  outbox_id uuid primary key
    references complaints.notification_outbox (id) on delete restrict,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  worker_id text,
  lease_expires_at timestamptz,
  last_failure_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_jobs_state_check check (
    state in ('pending', 'processing', 'retry', 'completed', 'dead')
  ),
  constraint notification_outbox_jobs_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint notification_outbox_jobs_worker_check check (
    worker_id is null
    or (
      worker_id = btrim(worker_id)
      and worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    )
  ),
  constraint notification_outbox_jobs_failure_check check (
    last_failure_code is null
    or last_failure_code ~ '^[A-Z][A-Z0-9_]{1,79}$'
  ),
  constraint notification_outbox_jobs_lifecycle_check check (
    (state in ('pending', 'retry')
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is null)
    or (state = 'processing'
      and lease_token is not null and worker_id is not null and lease_expires_at is not null
      and completed_at is null and attempt_count >= 1)
    or (state = 'completed'
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is not null)
    or (state = 'dead'
      and lease_token is null and worker_id is null and lease_expires_at is null
      and completed_at is null)
  )
);

create index notification_outbox_jobs_claim_idx
  on complaints.notification_outbox_jobs (
    state,
    next_attempt_at,
    created_at,
    outbox_id
  )
  where state in ('pending', 'retry', 'processing');

create index notification_outbox_jobs_lease_expiry_idx
  on complaints.notification_outbox_jobs (lease_expires_at, outbox_id)
  where state = 'processing';

comment on table complaints.conversation_rooms is
  'One complaint-scoped conversation room. Phase 6 creates private rooms only.';
comment on table complaints.room_members is
  'Effective-dated participation evidence; never an authorization source.';
comment on table complaints.messages is
  'Immutable private complaint messages persisted before realtime delivery.';
comment on table complaints.message_receipts is
  'Monotonic per-user read-through position for a private complaint conversation.';
comment on table complaints.complaint_comments is
  'Structural public-comment record; no Phase 6 creation or read RPC is granted while complaints remain private.';
comment on table complaints.notifications is
  'Persistent data-minimized per-user in-app notifications.';
comment on table complaints.notification_deliveries is
  'Channel delivery state. Destinations remain referenced by user/device identifiers, never copied values.';
comment on table complaints.notification_delivery_attempts is
  'Append-only notification-delivery claim and outcome evidence.';
comment on table complaints.notification_outbox_jobs is
  'Mutable PostgreSQL lease/retry projection for the immutable notification outbox.';
