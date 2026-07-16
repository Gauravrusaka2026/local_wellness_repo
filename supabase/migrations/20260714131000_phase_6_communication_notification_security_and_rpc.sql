create function complaints.reject_immutable_communication_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are immutable.', tg_table_schema, tg_table_name);
end;
$$;

create function complaints.validate_conversation_room_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.complaint_id is distinct from old.complaint_id
    or new.created_at is distinct from old.created_at
    or old.status = 'closed'
    or old.visibility = 'public'
    or (old.visibility = 'private' and new.visibility not in ('private', 'public'))
    or (old.status = 'active' and new.status not in ('active', 'closed')) then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_room_member_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or old.effective_to is not null
    or new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.user_id is distinct from old.user_id
    or new.member_type is distinct from old.member_type
    or new.membership_source is distinct from old.membership_source
    or new.role_assignment_id is distinct from old.role_assignment_id
    or new.effective_from is distinct from old.effective_from
    or new.created_at is distinct from old.created_at
    or new.effective_to is null then
    raise exception using errcode = '55000', message = 'ROOM_MEMBER_HISTORY_IMMUTABLE';
  end if;
  return new;
end;
$$;

create function complaints.validate_message_receipt_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.complaint_id is distinct from old.complaint_id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
    or new.version <> old.version + 1
    or (new.read_through_created_at, new.read_through_message_id)
      <= (old.read_through_created_at, old.read_through_message_id)
    or new.read_at < old.read_at
    or new.event_id is not distinct from old.event_id then
    raise exception using errcode = '55000', message = 'MESSAGE_READ_POSITION_NOT_MONOTONIC';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.outbox_id is distinct from old.outbox_id
    or new.complaint_id is distinct from old.complaint_id
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.event_type is distinct from old.event_type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.payload is distinct from old.payload
    or new.created_at is distinct from old.created_at
    or old.read_at is not null
    or new.read_at is null then
    raise exception using errcode = '55000', message = 'NOTIFICATION_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_delivery_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.id is distinct from old.id
    or new.notification_id is distinct from old.notification_id
    or new.channel is distinct from old.channel
    or new.event_name is distinct from old.event_name
    or new.destination_key is distinct from old.destination_key
    or new.device_id is distinct from old.device_id
    or new.created_at is distinct from old.created_at
    or new.attempt_count < old.attempt_count
    or new.attempt_count > old.attempt_count + 1
    or old.state in ('delivered', 'unsupported', 'dead')
    or (
      old.state in ('pending', 'retry')
      and new.state not in ('processing', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state not in ('processing', 'delivered', 'retry', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state = 'processing'
      and (
        old.lease_expires_at is null
        or old.lease_expires_at > clock_timestamp()
        or new.attempt_count <> old.attempt_count + 1
      )
    ) then
    raise exception using errcode = '55000', message = 'NOTIFICATION_DELIVERY_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create function complaints.validate_notification_outbox_job_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    or new.outbox_id is distinct from old.outbox_id
    or new.created_at is distinct from old.created_at
    or new.attempt_count < old.attempt_count
    or new.attempt_count > old.attempt_count + 1
    or old.state in ('completed', 'dead')
    or (
      old.state in ('pending', 'retry')
      and new.state not in ('processing', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state not in ('processing', 'completed', 'retry', 'dead')
    )
    or (
      old.state = 'processing'
      and new.state = 'processing'
      and (
        old.lease_expires_at is null
        or old.lease_expires_at > clock_timestamp()
        or new.attempt_count <> old.attempt_count + 1
      )
    ) then
    raise exception using errcode = '55000', message = 'NOTIFICATION_OUTBOX_JOB_MUTATION_DENIED';
  end if;
  return new;
end;
$$;

create trigger conversation_rooms_validate_mutation
before update or delete on complaints.conversation_rooms
for each row execute function complaints.validate_conversation_room_mutation();

create trigger room_members_validate_mutation
before update or delete on complaints.room_members
for each row execute function complaints.validate_room_member_mutation();

create trigger messages_immutable
before update or delete on complaints.messages
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger message_receipts_validate_mutation
before update or delete on complaints.message_receipts
for each row execute function complaints.validate_message_receipt_mutation();

create trigger complaint_comments_immutable
before update or delete on complaints.complaint_comments
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger notifications_validate_mutation
before update or delete on complaints.notifications
for each row execute function complaints.validate_notification_mutation();

create trigger notifications_set_updated_at
before update on complaints.notifications
for each row execute function private.set_updated_at();

create trigger notification_deliveries_validate_mutation
before update or delete on complaints.notification_deliveries
for each row execute function complaints.validate_notification_delivery_mutation();

create trigger notification_deliveries_set_updated_at
before update on complaints.notification_deliveries
for each row execute function private.set_updated_at();

create trigger notification_delivery_attempts_immutable
before update or delete on complaints.notification_delivery_attempts
for each row execute function complaints.reject_immutable_communication_mutation();

create trigger notification_outbox_jobs_validate_mutation
before update or delete on complaints.notification_outbox_jobs
for each row execute function complaints.validate_notification_outbox_job_mutation();

create trigger notification_outbox_jobs_set_updated_at
before update on complaints.notification_outbox_jobs
for each row execute function private.set_updated_at();

create function complaints.ensure_complaint_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_room_id uuid;
begin
  insert into complaints.conversation_rooms (complaint_id)
  values (new.id)
  on conflict (complaint_id) do update
    set complaint_id = excluded.complaint_id
  returning id into created_room_id;

  insert into complaints.room_members (
    room_id,
    user_id,
    member_type,
    membership_source,
    effective_from
  ) values (
    created_room_id,
    new.citizen_user_id,
    'citizen',
    'complaint_owner',
    new.submitted_at
  )
  on conflict (room_id, user_id) where effective_to is null do nothing;

  return new;
end;
$$;

create trigger complaints_ensure_conversation
after insert on complaints.complaints
for each row execute function complaints.ensure_complaint_conversation();

insert into complaints.conversation_rooms (complaint_id, created_at)
select complaint.id, complaint.created_at
from complaints.complaints as complaint
on conflict (complaint_id) do nothing;

insert into complaints.room_members (
  room_id,
  user_id,
  member_type,
  membership_source,
  effective_from,
  created_at
)
select
  room.id,
  complaint.citizen_user_id,
  'citizen',
  'complaint_owner',
  complaint.submitted_at,
  complaint.created_at
from complaints.conversation_rooms as room
inner join complaints.complaints as complaint on complaint.id = room.complaint_id
where not exists (
  select 1
  from complaints.room_members as current_member
  where current_member.room_id = room.id
    and current_member.user_id = complaint.citizen_user_id
    and current_member.effective_to is null
);

create function complaints.create_notification_outbox_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into complaints.notification_outbox_jobs (
    outbox_id,
    next_attempt_at,
    created_at,
    updated_at
  ) values (
    new.id,
    new.created_at,
    new.created_at,
    new.created_at
  )
  on conflict (outbox_id) do nothing;
  return new;
end;
$$;

create trigger notification_outbox_create_job
after insert on complaints.notification_outbox
for each row execute function complaints.create_notification_outbox_job();

insert into complaints.notification_outbox_jobs (
  outbox_id,
  next_attempt_at,
  created_at,
  updated_at
)
select outbox.id, outbox.created_at, outbox.created_at, outbox.created_at
from complaints.notification_outbox as outbox
on conflict (outbox_id) do nothing;

create function complaints.append_citizen_submission_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  if new.event_source <> 'citizen_submission' or new.reason_code <> 'COMPLAINT_SUBMITTED' then
    return new;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = new.complaint_id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;

  insert into complaints.notification_outbox (
    complaint_id,
    status_history_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_submitted',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', new.to_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'occurredAt', new.occurred_at
    )),
    new.occurred_at
  )
  on conflict (status_history_id) do nothing;

  return new;
end;
$$;

create trigger complaint_status_history_submission_outbox
after insert on complaints.complaint_status_history
for each row execute function complaints.append_citizen_submission_outbox();

insert into complaints.notification_outbox (
  complaint_id,
  status_history_id,
  event_type,
  aggregate_id,
  payload,
  occurred_at,
  created_at
)
select
  history.complaint_id,
  history.id,
  'complaint_submitted',
  history.complaint_id,
  jsonb_strip_nulls(jsonb_build_object(
    'complaintId', history.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'status', history.to_status,
    'authorityId', assignment.authority_id,
    'wardId', assignment.ward_id,
    'authorityDepartmentId', assignment.authority_department_id,
    'occurredAt', history.occurred_at
  )),
  history.occurred_at,
  history.occurred_at
from complaints.complaint_status_history as history
inner join complaints.complaints as complaint on complaint.id = history.complaint_id
inner join complaints.complaint_assignments as assignment
  on assignment.complaint_id = history.complaint_id
 and assignment.version = 1
where history.event_source = 'citizen_submission'
  and history.reason_code = 'COMPLAINT_SUBMITTED'
  and not exists (
    select 1
    from complaints.notification_outbox as existing
    where existing.status_history_id = history.id
  )
on conflict (status_history_id) do nothing;

create function complaints.append_assignment_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
begin
  if new.assignment_source = 'routing_decision' then
    return new;
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  insert into complaints.notification_outbox (
    complaint_id,
    assignment_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_assignment_changed',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', complaint.current_status,
      'authorityId', new.authority_id,
      'wardId', new.ward_id,
      'authorityDepartmentId', new.authority_department_id,
      'occurredAt', new.effective_from
    )),
    new.effective_from
  )
  on conflict (assignment_id) do nothing;

  return new;
end;
$$;

create trigger complaint_assignments_assignment_outbox
after insert on complaints.complaint_assignments
for each row execute function complaints.append_assignment_outbox();

insert into complaints.notification_outbox (
  complaint_id,
  assignment_id,
  event_type,
  aggregate_id,
  payload,
  occurred_at,
  created_at
)
select
  assignment.complaint_id,
  assignment.id,
  'complaint_assignment_changed',
  assignment.complaint_id,
  jsonb_strip_nulls(jsonb_build_object(
    'complaintId', assignment.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'status', complaint.current_status,
    'authorityId', assignment.authority_id,
    'wardId', assignment.ward_id,
    'authorityDepartmentId', assignment.authority_department_id,
    'occurredAt', assignment.effective_from
  )),
  assignment.effective_from,
  assignment.created_at
from complaints.complaint_assignments as assignment
inner join complaints.complaints as complaint on complaint.id = assignment.complaint_id
where assignment.assignment_source <> 'routing_decision'
  and not exists (
    select 1
    from complaints.notification_outbox as existing
    where existing.assignment_id = assignment.id
  )
on conflict (assignment_id) do nothing;

create function complaints.append_message_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  complaint complaints.complaints%rowtype;
  assignment complaints.complaint_assignments%rowtype;
begin
  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = new.complaint_id;

  select current_assignment.* into assignment
  from complaints.complaint_assignments as current_assignment
  where current_assignment.complaint_id = new.complaint_id
    and current_assignment.status = 'active'
    and current_assignment.effective_to is null;

  insert into complaints.notification_outbox (
    complaint_id,
    message_id,
    event_type,
    aggregate_id,
    payload,
    occurred_at
  ) values (
    new.complaint_id,
    new.id,
    'complaint_message_created',
    new.complaint_id,
    jsonb_strip_nulls(jsonb_build_object(
      'complaintId', new.complaint_id,
      'complaintNumber', complaint.complaint_number,
      'status', complaint.current_status,
      'authorityId', assignment.authority_id,
      'wardId', assignment.ward_id,
      'authorityDepartmentId', assignment.authority_department_id,
      'messageId', new.id,
      'occurredAt', new.created_at
    )),
    new.created_at
  );

  return new;
end;
$$;

create trigger messages_create_outbox
after insert on complaints.messages
for each row execute function complaints.append_message_outbox();

create function complaints.actor_can_communicate(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from complaints.complaints as complaint
    inner join public.profiles as profile on profile.id = p_actor_user_id
    where complaint.id = p_complaint_id
      and profile.status = 'active'
      and (
        complaint.citizen_user_id = p_actor_user_id
        or exists (
          select 1
          from complaints.complaint_assignments as assignment
          where assignment.complaint_id = complaint.id
            and assignment.status = 'active'
            and assignment.effective_to is null
            and complaints.actor_can_access_assignment(
              p_actor_user_id,
              assignment.id,
              'view',
              null,
              p_at
            )
        )
      )
  );
$$;

create function public.get_realtime_account(p_actor_user_id uuid)
returns table (user_id uuid, is_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_actor_user_id,
    exists (
      select 1
      from public.profiles as profile
      where profile.id = p_actor_user_id
        and profile.status = 'active'
    );
$$;

create function public.authorize_realtime_room(
  p_actor_user_id uuid,
  p_room_type text,
  p_resource_id uuid
)
returns table (authorized boolean, actor_type text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_platform_administrator boolean;
begin
  if p_actor_user_id is null
    or p_resource_id is null
    or p_room_type not in ('complaint', 'authority', 'ward', 'department') then
    return query select false, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_user_id and profile.status = 'active'
  ) then
    return query select false, null::text;
    return;
  end if;

  if p_room_type = 'complaint' then
    return query
    with access_result as (
      select complaints.actor_can_communicate(
        p_actor_user_id,
        p_resource_id,
        current_timestamp
      ) as is_authorized
    )
    select
      access_result.is_authorized,
      case
        when not access_result.is_authorized then null::text
        when exists (
          select 1
          from complaints.complaints as complaint
          where complaint.id = p_resource_id
            and complaint.citizen_user_id = p_actor_user_id
        ) then 'citizen'::text
        else 'government'::text
      end
    from access_result;
    return;
  end if;

  select exists (
    select 1
    from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
    inner join public.roles as role on role.id = user_role.role_id
    where role.code = 'platform_admin'
      and user_role.scope_type = 'global'
  ) into is_platform_administrator;

  if p_room_type = 'authority' then
    return query
    select
      (
        is_platform_administrator
        and private.is_verified_governance_authority(p_resource_id)
      )
      or exists (
        select 1
        from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
        inner join public.roles as role on role.id = user_role.role_id
        where role.is_government
          and user_role.scope_type = 'authority'
          and user_role.scope_id = p_resource_id
          and user_role.authority_id = p_resource_id
          and exists (
            select 1
            from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = user_role.authority_id
              and membership.status = 'active'
              and membership.effective_from <= current_timestamp
              and (
                membership.effective_until is null
                or membership.effective_until > current_timestamp
              )
          )
      ),
      null::text;
    return;
  end if;

  if p_room_type = 'ward' then
    return query
    select
      (
        is_platform_administrator
        and exists (
          select 1
          from governance.wards as ward
          inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
          where ward.id = p_resource_id
            and ward.status = 'active'
            and ward.verification_status = 'verified'
            and not ward.is_placeholder
            and private.is_verified_governance_authority(local_body.authority_id)
        )
      )
      or exists (
        select 1
        from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
        inner join public.roles as role on role.id = user_role.role_id
        where role.is_government
          and user_role.scope_type = 'ward'
          and user_role.scope_id = p_resource_id
          and exists (
            select 1
            from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = user_role.authority_id
              and membership.status = 'active'
              and membership.effective_from <= current_timestamp
              and (
                membership.effective_until is null
                or membership.effective_until > current_timestamp
              )
          )
      ),
      null::text;
    return;
  end if;

  return query
  select
    (
      is_platform_administrator
      and exists (
        select 1
        from governance.authority_departments as authority_department
        inner join governance.departments as department
          on department.id = authority_department.department_id
        where authority_department.id = p_resource_id
          and authority_department.status = 'active'
          and authority_department.verification_status = 'verified'
          and not authority_department.is_placeholder
          and department.status = 'active'
          and department.verification_status = 'verified'
          and not department.is_placeholder
          and private.is_verified_governance_authority(authority_department.authority_id)
      )
    )
    or exists (
      select 1
      from public.get_active_user_roles(p_actor_user_id, current_timestamp) as user_role
      inner join public.roles as role on role.id = user_role.role_id
      where role.is_government
        and user_role.scope_type = 'department'
        and user_role.scope_id = p_resource_id
        and exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= current_timestamp
            and (
              membership.effective_until is null
              or membership.effective_until > current_timestamp
            )
        )
    ),
    null::text;
end;
$$;

create function public.create_complaint_message(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_client_message_id uuid,
  p_body text,
  p_request_id text default null
)
returns table (response_payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  room complaints.conversation_rooms%rowtype;
  complaint complaints.complaints%rowtype;
  existing_message complaints.messages%rowtype;
  created_message complaints.messages%rowtype;
  fingerprint text;
  normalized_request_id text;
  author_type text;
begin
  normalized_request_id := coalesce(
    nullif(btrim(p_request_id), ''),
    'message:' || coalesce(p_client_message_id::text, '')
  );

  if p_actor_user_id is null
    or p_complaint_id is null
    or p_client_message_id is null
    or p_body is null
    or p_body <> btrim(p_body)
    or char_length(p_body) not between 1 and 4000
    or normalized_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as candidate where candidate.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = p_complaint_id;

  select candidate.* into room
  from complaints.conversation_rooms as candidate
  where candidate.complaint_id = p_complaint_id
    and candidate.visibility = 'private'
    and candidate.status = 'active';

  if not found then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_NOT_AVAILABLE';
  end if;

  fingerprint := encode(
    sha256(convert_to(p_complaint_id::text || ':' || p_body, 'UTF8')),
    'hex'
  );

  select message.* into existing_message
  from complaints.messages as message
  where message.sender_user_id = p_actor_user_id
    and message.client_message_id = p_client_message_id;

  if found then
    if existing_message.complaint_id <> p_complaint_id
      or existing_message.room_id <> room.id
      or existing_message.request_fingerprint <> fingerprint
      or existing_message.body <> p_body then
      raise exception using errcode = '23505', message = 'MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;

    author_type := case
      when complaint.citizen_user_id = existing_message.sender_user_id then 'citizen'
      else 'government'
    end;

    return query select jsonb_build_object(
      'id', existing_message.id,
      'complaintId', existing_message.complaint_id,
      'kind', 'private_message',
      'authorType', author_type,
      'authoredByMe', true,
      'body', existing_message.body,
      'createdAt', existing_message.created_at
    ), true;
    return;
  end if;

  insert into complaints.messages (
    room_id,
    complaint_id,
    sender_user_id,
    client_message_id,
    body,
    request_fingerprint,
    request_id
  ) values (
    room.id,
    p_complaint_id,
    p_actor_user_id,
    p_client_message_id,
    p_body,
    fingerprint,
    normalized_request_id
  )
  on conflict (sender_user_id, client_message_id) do nothing
  returning * into created_message;

  if not found then
    select message.* into existing_message
    from complaints.messages as message
    where message.sender_user_id = p_actor_user_id
      and message.client_message_id = p_client_message_id;

    if existing_message.id is null
      or existing_message.complaint_id <> p_complaint_id
      or existing_message.room_id <> room.id
      or existing_message.request_fingerprint <> fingerprint
      or existing_message.body <> p_body then
      raise exception using errcode = '23505', message = 'MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;

    created_message := existing_message;
    replayed := true;
  else
    replayed := false;
  end if;

  author_type := case
    when complaint.citizen_user_id = p_actor_user_id then 'citizen'
    else 'government'
  end;

  insert into complaints.room_members (
    room_id,
    user_id,
    member_type,
    membership_source,
    effective_from
  ) values (
    room.id,
    p_actor_user_id,
    author_type,
    case when author_type = 'citizen' then 'complaint_owner' else 'message_sender' end,
    created_message.created_at
  )
  on conflict (room_id, user_id) where effective_to is null do nothing;

  response_payload := jsonb_build_object(
    'id', created_message.id,
    'complaintId', created_message.complaint_id,
    'kind', 'private_message',
    'authorType', author_type,
    'authoredByMe', true,
    'body', created_message.body,
    'createdAt', created_message.created_at
  );
  return next;
end;
$$;

create function public.list_complaint_messages(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_limit integer default 25,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (response_payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item_count integer;
  items jsonb;
  last_created_at timestamptz;
  last_id uuid;
begin
  if p_actor_user_id is null
    or p_complaint_id is null
    or p_limit is null
    or p_limit not between 1 and 100
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  with selected as materialized (
    select
      message.id,
      message.complaint_id,
      message.sender_user_id,
      message.body,
      message.created_at,
      complaint.citizen_user_id
    from complaints.messages as message
    inner join complaints.complaints as complaint on complaint.id = message.complaint_id
    where message.complaint_id = p_complaint_id
      and (
        p_before_created_at is null
        or (message.created_at, message.id) < (p_before_created_at, p_before_id)
      )
    order by message.created_at desc, message.id desc
    limit p_limit
  )
  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', selected.id,
          'complaintId', selected.complaint_id,
          'kind', 'private_message',
          'authorType', case
            when selected.sender_user_id = selected.citizen_user_id then 'citizen'
            else 'government'
          end,
          'authoredByMe', selected.sender_user_id = p_actor_user_id,
          'body', selected.body,
          'createdAt', selected.created_at
        ) order by selected.created_at desc, selected.id desc
      ),
      '[]'::jsonb
    ),
    min(selected.created_at),
    (
      select tail.id
      from selected as tail
      order by tail.created_at, tail.id
      limit 1
    )
  into item_count, items, last_created_at, last_id
  from selected;

  response_payload := jsonb_build_object(
    'items', items,
    'nextCursor', case
      when item_count = p_limit then jsonb_build_object(
        'beforeCreatedAt', last_created_at,
        'beforeId', last_id
      )
      else null
    end
  );
  return next;
end;
$$;

create function public.mark_complaint_message_read(
  p_actor_user_id uuid,
  p_complaint_id uuid,
  p_read_through_message_id uuid,
  p_read_through_created_at timestamptz,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room complaints.conversation_rooms%rowtype;
  read_message complaints.messages%rowtype;
  receipt complaints.message_receipts%rowtype;
  operation_at timestamptz := clock_timestamp();
  normalized_request_id text;
begin
  normalized_request_id := coalesce(
    nullif(btrim(p_request_id), ''),
    'message-read:' || coalesce(p_read_through_message_id::text, '')
  );

  if p_actor_user_id is null
    or p_complaint_id is null
    or p_read_through_message_id is null
    or p_read_through_created_at is null
    or normalized_request_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1 from complaints.complaints as complaint where complaint.id = p_complaint_id
  ) then
    raise exception using errcode = 'P0002', message = 'COMPLAINT_NOT_FOUND';
  end if;

  if not complaints.actor_can_communicate(
    p_actor_user_id,
    p_complaint_id,
    current_timestamp
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  select candidate.* into room
  from complaints.conversation_rooms as candidate
  where candidate.complaint_id = p_complaint_id
    and candidate.visibility = 'private'
    and candidate.status = 'active'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'CONVERSATION_ROOM_NOT_AVAILABLE';
  end if;

  select message.* into read_message
  from complaints.messages as message
  where message.id = p_read_through_message_id
    and message.room_id = room.id
    and message.complaint_id = p_complaint_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'MESSAGE_NOT_FOUND';
  end if;

  if read_message.created_at is distinct from p_read_through_created_at then
    raise exception using errcode = '23514', message = 'MESSAGE_READ_POSITION_INVALID';
  end if;

  select current_receipt.* into receipt
  from complaints.message_receipts as current_receipt
  where current_receipt.room_id = room.id
    and current_receipt.user_id = p_actor_user_id
  for update;

  if not found then
    insert into complaints.message_receipts (
      room_id,
      complaint_id,
      user_id,
      read_through_message_id,
      read_through_created_at,
      read_at,
      request_id,
      updated_at
    ) values (
      room.id,
      p_complaint_id,
      p_actor_user_id,
      read_message.id,
      read_message.created_at,
      operation_at,
      normalized_request_id,
      operation_at
    ) returning * into receipt;
  elsif (read_message.created_at, read_message.id)
    > (receipt.read_through_created_at, receipt.read_through_message_id) then
    update complaints.message_receipts as current_receipt
    set
      read_through_message_id = read_message.id,
      read_through_created_at = read_message.created_at,
      read_at = operation_at,
      event_id = gen_random_uuid(),
      request_id = normalized_request_id,
      version = current_receipt.version + 1,
      updated_at = operation_at
    where current_receipt.id = receipt.id
    returning * into receipt;
  end if;

  return jsonb_build_object(
    'complaintId', receipt.complaint_id,
    'readThroughCreatedAt', receipt.read_through_created_at,
    'readThroughMessageId', receipt.read_through_message_id,
    'updatedAt', receipt.updated_at
  );
end;
$$;

create function public.list_notifications(
  p_actor_user_id uuid,
  p_limit integer default 25,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (response_payload jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item_count integer;
  items jsonb;
  last_created_at timestamptz;
  last_id uuid;
begin
  if p_actor_user_id is null
    or p_limit is null
    or p_limit not between 1 and 100
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_user_id and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'COMMUNICATION_ACCESS_DENIED';
  end if;

  with selected as materialized (
    select
      notification.id,
      notification.outbox_id,
      notification.event_type,
      notification.payload - 'eventType' - 'occurredAt' as safe_payload,
      outbox.occurred_at,
      notification.created_at,
      notification.read_at
    from complaints.notifications as notification
    inner join complaints.notification_outbox as outbox on outbox.id = notification.outbox_id
    where notification.recipient_user_id = p_actor_user_id
      and complaints.actor_can_communicate(
        p_actor_user_id,
        notification.complaint_id,
        current_timestamp
      )
      and (
        p_before_created_at is null
        or (notification.created_at, notification.id) < (p_before_created_at, p_before_id)
      )
    order by notification.created_at desc, notification.id desc
    limit p_limit
  )
  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', selected.id,
          'eventId', selected.outbox_id,
          'eventType', selected.event_type,
          'payload', selected.safe_payload,
          'occurredAt', selected.occurred_at,
          'createdAt', selected.created_at,
          'readAt', selected.read_at
        ) order by selected.created_at desc, selected.id desc
      ),
      '[]'::jsonb
    ),
    min(selected.created_at),
    (
      select tail.id
      from selected as tail
      order by tail.created_at, tail.id
      limit 1
    )
  into item_count, items, last_created_at, last_id
  from selected;

  response_payload := jsonb_build_object(
    'items', items,
    'nextCursor', case
      when item_count = p_limit then jsonb_build_object(
        'beforeCreatedAt', last_created_at,
        'beforeId', last_id
      )
      else null
    end
  );
  return next;
end;
$$;

create function public.mark_notification_read(
  p_actor_user_id uuid,
  p_notification_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification complaints.notifications%rowtype;
  operation_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or p_notification_id is null then
    raise exception using errcode = '22023', message = 'COMMUNICATION_REQUEST_INVALID';
  end if;

  select candidate.* into notification
  from complaints.notifications as candidate
  where candidate.id = p_notification_id
    and candidate.recipient_user_id = p_actor_user_id
    and complaints.actor_can_communicate(
      p_actor_user_id,
      candidate.complaint_id,
      current_timestamp
    )
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification.read_at is null then
    update complaints.notifications as candidate
    set read_at = operation_at, updated_at = operation_at
    where candidate.id = notification.id
    returning * into notification;
  end if;

  return jsonb_build_object(
    'notificationId', notification.id,
    'readAt', notification.read_at
  );
end;
$$;

create function public.claim_notification_outbox(
  p_worker_id text,
  p_limit integer default 25,
  p_lease_seconds integer default 60
)
returns table (outbox_id uuid, lease_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_at timestamptz := clock_timestamp();
begin
  if p_worker_id is null
    or p_worker_id <> btrim(p_worker_id)
    or p_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    or p_limit is null
    or p_limit not between 1 and 100
    or p_lease_seconds is null
    or p_lease_seconds not between 15 and 300 then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  update complaints.notification_outbox_jobs as job
  set
    state = 'dead',
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    last_failure_code = 'LEASE_EXPIRED',
    updated_at = operation_at
  where job.state = 'processing'
    and job.lease_expires_at <= operation_at
    and job.attempt_count >= 5;

  return query
  with candidates as materialized (
    select job.outbox_id
    from complaints.notification_outbox_jobs as job
    where (
        job.state in ('pending', 'retry')
        and job.next_attempt_at <= operation_at
      )
      or (
        job.state = 'processing'
        and job.lease_expires_at <= operation_at
        and job.attempt_count < 5
      )
    order by
      case when job.state = 'processing' then 0 else 1 end,
      coalesce(job.lease_expires_at, job.next_attempt_at),
      job.created_at,
      job.outbox_id
    for update skip locked
    limit p_limit
  ), claimed as (
    update complaints.notification_outbox_jobs as job
    set
      state = 'processing',
      attempt_count = job.attempt_count + 1,
      lease_token = gen_random_uuid(),
      worker_id = p_worker_id,
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case
        when job.state = 'processing' then 'LEASE_EXPIRED'
        else job.last_failure_code
      end,
      updated_at = operation_at
    from candidates
    where job.outbox_id = candidates.outbox_id
    returning job.outbox_id, job.lease_token
  )
  select claimed.outbox_id, claimed.lease_token
  from claimed;
end;
$$;

create function public.materialize_notification_outbox(
  p_outbox_id uuid,
  p_lease_token uuid
)
returns table (notification_count integer, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job complaints.notification_outbox_jobs%rowtype;
  outbox complaints.notification_outbox%rowtype;
  complaint complaints.complaints%rowtype;
  history complaints.complaint_status_history%rowtype;
  current_assignment complaints.complaint_assignments%rowtype;
  event_assignment complaints.complaint_assignments%rowtype;
  message complaints.messages%rowtype;
  operation_at timestamptz := clock_timestamp();
  actor_user_id uuid;
  semantic_event_type text;
  notification_title text;
  notification_body text;
  notification_payload jsonb;
  materialized_count integer;
begin
  if p_outbox_id is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_REQUEST_INVALID';
  end if;

  select job.* into current_job
  from complaints.notification_outbox_jobs as job
  where job.outbox_id = p_outbox_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_OUTBOX_JOB_NOT_FOUND';
  end if;

  if current_job.state = 'completed' then
    select count(*)::integer into materialized_count
    from complaints.notifications as notification
    where notification.outbox_id = p_outbox_id;
    return query select materialized_count, true;
    return;
  end if;

  if current_job.state <> 'processing'
    or current_job.lease_token is distinct from p_lease_token
    or current_job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  select candidate.* into outbox
  from complaints.notification_outbox as candidate
  where candidate.id = p_outbox_id;

  select candidate.* into complaint
  from complaints.complaints as candidate
  where candidate.id = outbox.complaint_id;

  select candidate.* into current_assignment
  from complaints.complaint_assignments as candidate
  where candidate.complaint_id = outbox.complaint_id
    and candidate.status = 'active'
    and candidate.effective_to is null;

  if outbox.message_id is not null then
    select candidate.* into message
    from complaints.messages as candidate
    where candidate.id = outbox.message_id;
    actor_user_id := message.sender_user_id;
    semantic_event_type := 'message';
  elsif outbox.assignment_id is not null then
    select candidate.* into event_assignment
    from complaints.complaint_assignments as candidate
    where candidate.id = outbox.assignment_id;
    actor_user_id := event_assignment.assigned_by_user_id;
    semantic_event_type := case
      when event_assignment.assignment_source = 'government_transfer' then 'transfer'
      else 'assignment'
    end;
  else
    select candidate.* into history
    from complaints.complaint_status_history as candidate
    where candidate.id = outbox.status_history_id;
    actor_user_id := history.actor_user_id;
    semantic_event_type := case
      when outbox.event_type = 'complaint_submitted' then 'submission'
      when history.reason_code = 'COMPLAINT_ACKNOWLEDGED'
        or history.to_status = 'acknowledged' then 'acknowledgement'
      when history.reason_code = 'COMPLAINT_TRANSFERRED'
        or history.to_status = 'transferred' then 'transfer'
      when history.reason_code = 'COMPLAINT_ASSIGNED'
        or history.to_status = 'assigned' then 'assignment'
      when history.reason_code = 'RESOLUTION_SUBMITTED'
        or history.to_status in ('resolution_submitted', 'resolved', 'closed') then 'resolution'
      when history.to_status = 'reopened' then 'reopen'
      when history.to_status = 'escalated' then 'escalation'
      else 'status_update'
    end;
  end if;

  notification_title := case semantic_event_type
    when 'submission' then 'Complaint submitted'
    when 'assignment' then 'Complaint assignment updated'
    when 'acknowledgement' then 'Complaint acknowledged'
    when 'transfer' then 'Complaint transferred'
    when 'message' then 'New complaint message'
    when 'resolution' then 'Complaint resolution updated'
    when 'reopen' then 'Complaint reopened'
    when 'escalation' then 'Complaint escalated'
    else 'Complaint status updated'
  end;
  notification_body := case semantic_event_type
    when 'submission' then 'A complaint has been submitted and routed.'
    when 'assignment' then 'The responsible government assignment has changed.'
    when 'acknowledgement' then 'The complaint has been acknowledged.'
    when 'transfer' then 'The complaint has been transferred to another responsible team.'
    when 'message' then 'A new private message is available on the complaint.'
    when 'resolution' then 'The complaint resolution has been updated.'
    when 'reopen' then 'The complaint has been reopened.'
    when 'escalation' then 'The complaint has been escalated.'
    else 'The complaint status has changed.'
  end;
  notification_payload := jsonb_strip_nulls(jsonb_build_object(
    'complaintId', outbox.complaint_id,
    'complaintNumber', complaint.complaint_number,
    'eventType', semantic_event_type,
    'status', outbox.payload ->> 'status',
    'messageId', outbox.message_id,
    'occurredAt', outbox.occurred_at
  ));

  with recipient_candidates as materialized (
    select complaint.citizen_user_id as user_id
    where complaint.citizen_user_id is distinct from actor_user_id
      and exists (
        select 1 from public.profiles as profile
        where profile.id = complaint.citizen_user_id and profile.status = 'active'
      )
    union
    select user_role.user_id
    from public.user_roles as user_role
    where current_assignment.id is not null
      and user_role.user_id is distinct from actor_user_id
      and complaints.actor_can_access_assignment(
        user_role.user_id,
        current_assignment.id,
        'view',
        user_role.id,
        operation_at
      )
  )
  insert into complaints.notifications (
    outbox_id,
    complaint_id,
    recipient_user_id,
    event_type,
    title,
    body,
    payload,
    created_at,
    updated_at
  )
  select
    outbox.id,
    outbox.complaint_id,
    recipient.user_id,
    semantic_event_type,
    notification_title,
    notification_body,
    notification_payload,
    operation_at,
    operation_at
  from recipient_candidates as recipient
  on conflict (outbox_id, recipient_user_id) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    delivered_at,
    created_at,
    updated_at
  )
  select
    notification.id,
    'in_app',
    'notification:created',
    'user:' || notification.recipient_user_id::text,
    'delivered',
    operation_at,
    operation_at,
    operation_at,
    operation_at
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    created_at,
    updated_at
  )
  select
    notification.id,
    'realtime',
    case when semantic_event_type = 'message'
      then 'message:created'
      else 'complaint:status_changed'
    end,
    'user:' || notification.recipient_user_id::text,
    'pending',
    operation_at,
    operation_at,
    operation_at
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    state,
    next_attempt_at,
    last_failure_code,
    created_at,
    updated_at
  )
  select
    notification.id,
    'email',
    'notification:created',
    'user:' || notification.recipient_user_id::text,
    'unsupported',
    operation_at,
    'CHANNEL_DEFERRED',
    operation_at,
    operation_at
  from complaints.notifications as notification
  inner join public.profiles as profile on profile.id = notification.recipient_user_id
  where notification.outbox_id = outbox.id
    and profile.email is not null
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  insert into complaints.notification_deliveries (
    notification_id,
    channel,
    event_name,
    destination_key,
    device_id,
    state,
    next_attempt_at,
    last_failure_code,
    created_at,
    updated_at
  )
  select
    notification.id,
    'push',
    'notification:created',
    'device:' || device.id::text,
    device.id,
    'unsupported',
    operation_at,
    'CHANNEL_DEFERRED',
    operation_at,
    operation_at
  from complaints.notifications as notification
  inner join public.devices as device on device.user_id = notification.recipient_user_id
  where notification.outbox_id = outbox.id
    and device.is_active
    and device.risk_status <> 'blocked'
    and device.push_token is not null
  on conflict (notification_id, channel, event_name, destination_key) do nothing;

  update complaints.notification_outbox_jobs as job
  set
    state = 'completed',
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    completed_at = operation_at,
    updated_at = operation_at
  where job.outbox_id = current_job.outbox_id;

  select count(*)::integer into materialized_count
  from complaints.notifications as notification
  where notification.outbox_id = outbox.id;

  return query select materialized_count, false;
end;
$$;

create function public.fail_notification_outbox(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job complaints.notification_outbox_jobs%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
begin
  if p_outbox_id is null
    or p_lease_token is null
    or p_error_code <> 'MATERIALIZATION_FAILED' then
    raise exception using errcode = '22023', message = 'NOTIFICATION_OUTBOX_FAILURE_INVALID';
  end if;

  select job.* into current_job
  from complaints.notification_outbox_jobs as job
  where job.outbox_id = p_outbox_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_OUTBOX_JOB_NOT_FOUND';
  end if;

  if current_job.state <> 'processing'
    or current_job.lease_token is distinct from p_lease_token
    or current_job.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'NOTIFICATION_OUTBOX_CLAIM_INVALID';
  end if;

  if current_job.attempt_count >= 5 then
    update complaints.notification_outbox_jobs as job
    set
      state = 'dead',
      lease_token = null,
      worker_id = null,
      lease_expires_at = null,
      last_failure_code = p_error_code,
      updated_at = operation_at
    where job.outbox_id = current_job.outbox_id;
    return query select 'dead'::text, null::timestamptz;
    return;
  end if;

  retry_at := operation_at + make_interval(
    secs => least(300, (5 * power(2, current_job.attempt_count - 1))::integer)
  );
  update complaints.notification_outbox_jobs as job
  set
    state = 'retry',
    next_attempt_at = retry_at,
    lease_token = null,
    worker_id = null,
    lease_expires_at = null,
    last_failure_code = p_error_code,
    updated_at = operation_at
  where job.outbox_id = current_job.outbox_id;

  return query select 'retry_scheduled'::text, retry_at;
end;
$$;

create function public.claim_realtime_deliveries(
  p_instance_id text,
  p_batch_size integer default 25,
  p_lease_seconds integer default 30
)
returns table (
  delivery_id uuid,
  event_id uuid,
  event_name text,
  recipient_user_id uuid,
  complaint_id uuid,
  payload jsonb,
  attempt_count integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  claimed complaints.notification_deliveries%rowtype;
  notification complaints.notifications%rowtype;
  outbox complaints.notification_outbox%rowtype;
  message complaints.messages%rowtype;
  complaint complaints.complaints%rowtype;
  operation_at timestamptz := clock_timestamp();
  new_claim_token uuid;
begin
  if p_instance_id is null
    or p_instance_id <> btrim(p_instance_id)
    or p_instance_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
    or p_batch_size is null
    or p_batch_size not between 1 and 100
    or p_lease_seconds is null
    or p_lease_seconds not between 5 and 300 then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  for candidate in
    select delivery.*
    from complaints.notification_deliveries as delivery
    where delivery.channel = 'realtime'
      and (
        (delivery.state in ('pending', 'retry') and delivery.next_attempt_at <= operation_at)
        or (delivery.state = 'processing' and delivery.lease_expires_at <= operation_at)
      )
    order by
      case when delivery.state = 'processing' then 0 else 1 end,
      coalesce(delivery.lease_expires_at, delivery.next_attempt_at),
      delivery.created_at,
      delivery.id
    for update skip locked
    limit p_batch_size
  loop
    select current_notification.* into notification
    from complaints.notifications as current_notification
    where current_notification.id = candidate.notification_id;

    if candidate.state = 'processing' then
      insert into complaints.notification_delivery_attempts (
        delivery_id,
        attempt_number,
        event_type,
        worker_id,
        claim_token,
        failure_code,
        occurred_at
      ) values (
        candidate.id,
        candidate.attempt_count,
        'lease_expired',
        candidate.leased_by,
        candidate.lease_token,
        'LEASE_EXPIRED',
        operation_at
      ) on conflict on constraint notification_delivery_attempts_event_unique do nothing;
    end if;

    if candidate.attempt_count >= 5 then
      update complaints.notification_deliveries as delivery
      set
        state = 'dead',
        lease_token = null,
        leased_by = null,
        lease_expires_at = null,
        last_failure_code = 'LEASE_EXPIRED',
        updated_at = operation_at
      where delivery.id = candidate.id;
      continue;
    end if;

    if not complaints.actor_can_communicate(
      notification.recipient_user_id,
      notification.complaint_id,
      operation_at
    ) then
      update complaints.notification_deliveries as delivery
      set
        state = 'dead',
        lease_token = null,
        leased_by = null,
        lease_expires_at = null,
        last_failure_code = 'RECIPIENT_ACCESS_REVOKED',
        updated_at = operation_at
      where delivery.id = candidate.id;
      continue;
    end if;

    new_claim_token := gen_random_uuid();
    update complaints.notification_deliveries as delivery
    set
      state = 'processing',
      attempt_count = delivery.attempt_count + 1,
      lease_token = new_claim_token,
      leased_by = p_instance_id,
      lease_expires_at = operation_at + make_interval(secs => p_lease_seconds),
      last_failure_code = case
        when delivery.state = 'processing' then 'LEASE_EXPIRED'
        else delivery.last_failure_code
      end,
      updated_at = operation_at
    where delivery.id = candidate.id
    returning * into claimed;

    insert into complaints.notification_delivery_attempts (
      delivery_id,
      attempt_number,
      event_type,
      worker_id,
      claim_token,
      occurred_at
    ) values (
      claimed.id,
      claimed.attempt_count,
      'claimed',
      p_instance_id,
      new_claim_token,
      operation_at
    );

    select candidate_outbox.* into outbox
    from complaints.notification_outbox as candidate_outbox
    where candidate_outbox.id = notification.outbox_id;

    if outbox.message_id is not null then
      select candidate_message.* into message
      from complaints.messages as candidate_message
      where candidate_message.id = outbox.message_id;
      select candidate_complaint.* into complaint
      from complaints.complaints as candidate_complaint
      where candidate_complaint.id = message.complaint_id;
      payload := jsonb_build_object(
        'message', jsonb_build_object(
          'id', message.id,
          'complaintId', message.complaint_id,
          'kind', 'private_message',
          'authorType', case
            when message.sender_user_id = complaint.citizen_user_id then 'citizen'
            else 'government'
          end,
          'authoredByMe', message.sender_user_id = notification.recipient_user_id,
          'body', message.body,
          'createdAt', message.created_at
        )
      );
    else
      payload := jsonb_build_object(
        'notification', jsonb_build_object(
          'id', notification.id,
          'eventId', notification.outbox_id,
          'eventType', notification.event_type,
          'payload', notification.payload - 'eventType' - 'occurredAt',
          'occurredAt', outbox.occurred_at,
          'createdAt', notification.created_at,
          'readAt', notification.read_at
        )
      );
    end if;

    delivery_id := claimed.id;
    event_id := notification.outbox_id;
    event_name := claimed.event_name;
    recipient_user_id := notification.recipient_user_id;
    complaint_id := notification.complaint_id;
    attempt_count := claimed.attempt_count;
    claim_token := new_claim_token;
    return next;
  end loop;
end;
$$;

create function public.complete_notification_delivery(
  p_delivery_id uuid,
  p_instance_id text,
  p_claim_token uuid,
  p_delivered_socket_count integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery complaints.notification_deliveries%rowtype;
  operation_at timestamptz := clock_timestamp();
begin
  if p_delivery_id is null
    or p_instance_id is null
    or p_claim_token is null
    or p_delivered_socket_count is null
    or p_delivered_socket_count not between 0 and 10000 then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_COMPLETION_INVALID';
  end if;

  select candidate.* into delivery
  from complaints.notification_deliveries as candidate
  where candidate.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_DELIVERY_NOT_FOUND';
  end if;

  if delivery.channel <> 'realtime'
    or delivery.state <> 'processing'
    or delivery.leased_by is distinct from p_instance_id
    or delivery.lease_token is distinct from p_claim_token
    or delivery.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  update complaints.notification_deliveries as candidate
  set
    state = 'delivered',
    lease_token = null,
    leased_by = null,
    lease_expires_at = null,
    delivered_at = operation_at,
    last_failure_code = null,
    updated_at = operation_at
  where candidate.id = delivery.id;

  insert into complaints.notification_delivery_attempts (
    delivery_id,
    attempt_number,
    event_type,
    worker_id,
    claim_token,
    delivered_socket_count,
    occurred_at
  ) values (
    delivery.id,
    delivery.attempt_count,
    'delivered',
    p_instance_id,
    p_claim_token,
    p_delivered_socket_count,
    operation_at
  );
end;
$$;

create function public.fail_notification_delivery(
  p_delivery_id uuid,
  p_instance_id text,
  p_claim_token uuid,
  p_failure_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery complaints.notification_deliveries%rowtype;
  operation_at timestamptz := clock_timestamp();
  retry_at timestamptz;
  next_state text;
begin
  if p_delivery_id is null
    or p_instance_id is null
    or p_claim_token is null
    or p_failure_code not in (
      'DELIVERY_DEPENDENCY_UNAVAILABLE',
      'DELIVERY_EMIT_FAILED'
    ) then
    raise exception using errcode = '22023', message = 'REALTIME_DELIVERY_FAILURE_INVALID';
  end if;

  select candidate.* into delivery
  from complaints.notification_deliveries as candidate
  where candidate.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_DELIVERY_NOT_FOUND';
  end if;

  if delivery.channel <> 'realtime'
    or delivery.state <> 'processing'
    or delivery.leased_by is distinct from p_instance_id
    or delivery.lease_token is distinct from p_claim_token
    or delivery.lease_expires_at <= operation_at then
    raise exception using errcode = '42501', message = 'REALTIME_DELIVERY_CLAIM_INVALID';
  end if;

  if delivery.attempt_count >= 5 then
    next_state := 'dead';
    retry_at := delivery.next_attempt_at;
  else
    next_state := 'retry';
    retry_at := operation_at + make_interval(
      secs => least(300, (5 * power(2, delivery.attempt_count - 1))::integer)
    );
  end if;

  update complaints.notification_deliveries as candidate
  set
    state = next_state,
    next_attempt_at = retry_at,
    lease_token = null,
    leased_by = null,
    lease_expires_at = null,
    last_failure_code = p_failure_code,
    updated_at = operation_at
  where candidate.id = delivery.id;

  insert into complaints.notification_delivery_attempts (
    delivery_id,
    attempt_number,
    event_type,
    worker_id,
    claim_token,
    failure_code,
    occurred_at
  ) values (
    delivery.id,
    delivery.attempt_count,
    'failed',
    p_instance_id,
    p_claim_token,
    p_failure_code,
    operation_at
  );
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'conversation_rooms',
    'room_members',
    'messages',
    'message_receipts',
    'complaint_comments',
    'notifications',
    'notification_deliveries',
    'notification_delivery_attempts',
    'notification_outbox_jobs'
  ]
  loop
    execute format('alter table complaints.%I enable row level security', table_name);
    execute format('alter table complaints.%I force row level security', table_name);
  end loop;
end;
$$;

revoke all privileges on all tables in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all sequences in schema complaints
  from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema complaints
  from public, anon, authenticated, service_role;

revoke all on function public.get_realtime_account(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.authorize_realtime_room(uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_complaint_message(uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke all on function public.list_notifications(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_notification_read(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_notification_outbox(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_notification_outbox(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_notification_outbox(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_realtime_deliveries(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_notification_delivery(uuid, text, uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_notification_delivery(uuid, text, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.get_realtime_account(uuid) to service_role;
grant execute on function public.authorize_realtime_room(uuid, text, uuid) to service_role;
grant execute on function public.create_complaint_message(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text)
  to service_role;
grant execute on function public.list_notifications(uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.mark_notification_read(uuid, uuid) to service_role;
grant execute on function public.claim_notification_outbox(text, integer, integer)
  to service_role;
grant execute on function public.materialize_notification_outbox(uuid, uuid)
  to service_role;
grant execute on function public.fail_notification_outbox(uuid, uuid, text)
  to service_role;
grant execute on function public.claim_realtime_deliveries(text, integer, integer)
  to service_role;
grant execute on function public.complete_notification_delivery(uuid, text, uuid, integer)
  to service_role;
grant execute on function public.fail_notification_delivery(uuid, text, uuid, text)
  to service_role;

comment on function public.create_complaint_message(uuid, uuid, uuid, text, text) is
  'Service-only idempotent private complaint-message creation with current authorization.';
comment on function public.list_complaint_messages(uuid, uuid, integer, timestamptz, uuid) is
  'Service-only private complaint-message keyset listing with current authorization.';
comment on function public.mark_complaint_message_read(uuid, uuid, uuid, timestamptz, text) is
  'Service-only monotonic private complaint-message read position.';
comment on function public.claim_notification_outbox(text, integer, integer) is
  'Service-only PostgreSQL lease claim for immutable notification-outbox materialization.';
comment on function public.materialize_notification_outbox(uuid, uuid) is
  'Service-only, claim-guarded, idempotent and data-minimized notification materialization.';
comment on function public.claim_realtime_deliveries(text, integer, integer) is
  'Service-only bounded PostgreSQL lease claim with current recipient authorization.';
