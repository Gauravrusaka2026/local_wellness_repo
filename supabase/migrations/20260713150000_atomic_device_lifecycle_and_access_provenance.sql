alter table public.authority_memberships
  drop constraint authority_memberships_approval_check;

alter table public.authority_memberships
  add constraint authority_memberships_approval_check check (
    (
      status in ('active', 'expired')
      and approved_by is not null
      and approved_at is not null
    )
    or (
      status in ('invited', 'pending_approval')
      and approved_by is null
      and approved_at is null
    )
    or (
      status = 'revoked'
      and (
        (approved_by is null and approved_at is null)
        or (approved_by is not null and approved_at is not null)
      )
    )
  );

alter table public.authority_memberships
  drop constraint authority_memberships_invited_by_fkey,
  drop constraint authority_memberships_approved_by_fkey,
  drop constraint authority_memberships_revoked_by_fkey;

alter table public.authority_memberships
  add constraint authority_memberships_invited_by_fkey
    foreign key (invited_by) references auth.users (id) on delete restrict,
  add constraint authority_memberships_approved_by_fkey
    foreign key (approved_by) references auth.users (id) on delete restrict,
  add constraint authority_memberships_revoked_by_fkey
    foreign key (revoked_by) references auth.users (id) on delete restrict;

alter table public.user_roles
  drop constraint user_roles_granted_by_fkey,
  drop constraint user_roles_revoked_by_fkey;

alter table public.user_roles
  add constraint user_roles_granted_by_fkey
    foreign key (granted_by) references auth.users (id) on delete restrict,
  add constraint user_roles_revoked_by_fkey
    foreign key (revoked_by) references auth.users (id) on delete restrict;

alter table public.auth_audit_events
  drop constraint auth_audit_events_actor_user_id_fkey,
  drop constraint auth_audit_events_subject_user_id_fkey,
  drop constraint auth_audit_events_device_id_fkey;

comment on column public.auth_audit_events.actor_user_id is
  'Immutable UUID snapshot of the actor at event time; intentionally has no foreign key.';
comment on column public.auth_audit_events.subject_user_id is
  'Immutable UUID snapshot of the subject at event time; intentionally has no foreign key.';
comment on column public.auth_audit_events.device_id is
  'Immutable UUID snapshot of the device at event time; intentionally has no foreign key.';

drop policy profiles_select_own_or_managed_authority on public.profiles;

create policy profiles_select_own_or_managed_authority
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = profiles.id
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (
        membership.effective_until is null
        or membership.effective_until > current_timestamp
      )
      and (select private.can_manage_authority(membership.authority_id))
  )
);

drop policy devices_select_own_or_managed_authority on public.devices;

create policy devices_select_own_or_managed_authority
on public.devices
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from public.authority_memberships as membership
    where membership.user_id = devices.user_id
      and membership.status = 'active'
      and membership.effective_from <= current_timestamp
      and (
        membership.effective_until is null
        or membership.effective_until > current_timestamp
      )
      and (select private.can_manage_authority(membership.authority_id))
  )
);

drop policy devices_insert_own on public.devices;
drop policy devices_update_own_safe_fields on public.devices;

revoke insert, update on public.devices from authenticated;
revoke insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices from authenticated;
revoke update (app_version, push_token, last_seen_at)
  on public.devices from authenticated;

create function public.register_device(
  p_user_id uuid,
  p_device_identifier_hash text,
  p_platform text,
  p_last_seen_at timestamptz,
  p_app_version text default null,
  p_push_token text default null,
  p_push_token_supplied boolean default false,
  p_request_id uuid default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_device public.devices%rowtype;
  conflicting_risk_status text;
  conflicting_revoked_at timestamptz;
begin
  if p_user_id is null
    or p_device_identifier_hash is null
    or p_platform is null
    or p_last_seen_at is null then
    raise exception using
      errcode = '22004',
      message = 'DEVICE_REGISTRATION_INVALID';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
      and profile.status in ('pending', 'active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_OWNER_INACTIVE';
  end if;

  insert into public.devices as existing_device (
    user_id,
    device_identifier_hash,
    platform,
    app_version,
    push_token,
    last_seen_at
  )
  values (
    p_user_id,
    p_device_identifier_hash,
    p_platform,
    p_app_version,
    case when p_push_token_supplied then p_push_token else null end,
    p_last_seen_at
  )
  on conflict (user_id, device_identifier_hash) do update
  set
    platform = excluded.platform,
    app_version = coalesce(excluded.app_version, existing_device.app_version),
    push_token = case
      when p_push_token_supplied then excluded.push_token
      else existing_device.push_token
    end,
    last_seen_at = excluded.last_seen_at
  where existing_device.risk_status <> 'blocked'
    and existing_device.revoked_at is null
  returning * into registered_device;

  if registered_device.id is null then
    select device.risk_status, device.revoked_at
    into conflicting_risk_status, conflicting_revoked_at
    from public.devices as device
    where device.user_id = p_user_id
      and device.device_identifier_hash = p_device_identifier_hash;

    if conflicting_risk_status = 'blocked' then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_BLOCKED';
    end if;

    if conflicting_revoked_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_REVOKED';
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_REGISTRATION_CONFLICT';
  end if;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    device_id,
    event_type,
    outcome,
    request_id,
    ip_address,
    user_agent,
    metadata
  )
  values (
    p_user_id,
    p_user_id,
    registered_device.id,
    'device_registered',
    'success',
    p_request_id,
    p_ip_address,
    p_user_agent,
    jsonb_build_object('platform', registered_device.platform)
  );

  return registered_device;
end;
$$;

create function public.revoke_device(
  p_user_id uuid,
  p_device_id uuid,
  p_revoked_at timestamptz,
  p_request_id uuid default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  revoked_device public.devices%rowtype;
begin
  if p_user_id is null or p_device_id is null or p_revoked_at is null then
    raise exception using
      errcode = '22004',
      message = 'DEVICE_REVOCATION_INVALID';
  end if;

  update public.devices as device
  set
    push_token = null,
    revoked_at = p_revoked_at
  where device.id = p_device_id
    and device.user_id = p_user_id
    and device.revoked_at is null
  returning device.* into revoked_device;

  if revoked_device.id is null then
    select device.*
    into revoked_device
    from public.devices as device
    where device.id = p_device_id
      and device.user_id = p_user_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'DEVICE_NOT_FOUND';
    end if;

    if revoked_device.revoked_at is not null then
      return revoked_device;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'DEVICE_REVOCATION_CONFLICT';
  end if;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    device_id,
    event_type,
    outcome,
    request_id,
    ip_address,
    user_agent
  )
  values (
    p_user_id,
    p_user_id,
    revoked_device.id,
    'device_revoked',
    'success',
    p_request_id,
    p_ip_address,
    p_user_agent
  );

  return revoked_device;
end;
$$;

revoke all on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) from public, anon, authenticated;
revoke all on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) from public, anon, authenticated;

grant execute on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) to service_role;
grant execute on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) to service_role;

comment on function public.register_device(
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  boolean,
  uuid,
  inet,
  text
) is
  'Service-only atomic device registration/upsert with a device_registered audit event.';
comment on function public.revoke_device(
  uuid,
  uuid,
  timestamptz,
  uuid,
  inet,
  text
) is
  'Service-only atomic soft revocation with a device_revoked audit event.';
