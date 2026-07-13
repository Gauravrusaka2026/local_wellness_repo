create schema if not exists private;

revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  status text not null default 'active',
  trust_score smallint not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 120
    )
  ),
  constraint profiles_phone_check check (
    phone is null
    or (
      phone = btrim(phone)
      and char_length(phone) between 3 and 32
    )
  ),
  constraint profiles_email_check check (
    email is null
    or (
      email = lower(btrim(email))
      and char_length(email) between 3 and 320
    )
  ),
  constraint profiles_preferred_language_check check (
    preferred_language in ('en', 'hi', 'mr')
  ),
  constraint profiles_status_check check (
    status in ('pending', 'active', 'suspended', 'disabled', 'deleted')
  ),
  constraint profiles_trust_score_check check (trust_score between 0 and 100)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_identifier_hash text not null,
  platform text not null,
  app_version text,
  push_token text,
  last_seen_at timestamptz not null default now(),
  risk_status text not null default 'unknown',
  revoked_at timestamptz,
  is_active boolean generated always as (revoked_at is null) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_user_identifier_unique unique (user_id, device_identifier_hash),
  constraint devices_identifier_hash_check check (
    device_identifier_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint devices_platform_check check (platform in ('android', 'ios', 'web')),
  constraint devices_app_version_check check (
    app_version is null
    or (
      app_version = btrim(app_version)
      and char_length(app_version) between 1 and 64
    )
  ),
  constraint devices_push_token_check check (
    push_token is null or char_length(push_token) between 1 and 4096
  ),
  constraint devices_risk_status_check check (
    risk_status in ('trusted', 'unknown', 'review', 'blocked')
  )
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  is_government boolean not null default false,
  is_privileged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_code_check check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint roles_name_check check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint roles_description_check check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 500
    )
  )
);

create table public.authority_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  authority_id uuid not null,
  invitation_email text not null,
  status text not null default 'invited',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_memberships_status_check check (
    status in ('invited', 'pending_approval', 'active', 'expired', 'revoked')
  ),
  constraint authority_memberships_invitation_email_check check (
    invitation_email = lower(btrim(invitation_email))
    and char_length(invitation_email) between 3 and 320
  ),
  constraint authority_memberships_effective_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint authority_memberships_expired_check check (
    status <> 'expired' or effective_until is not null
  ),
  constraint authority_memberships_approval_check check (
    (
      status in ('active', 'expired')
      and approved_by is not null
      and approved_at is not null
    )
    or (
      status not in ('active', 'expired')
      and approved_by is null
      and approved_at is null
    )
  ),
  constraint authority_memberships_revocation_check check (
    (
      status = 'revoked'
      and revoked_by is not null
      and revoked_at is not null
    )
    or (
      status <> 'revoked'
      and revoked_by is null
      and revoked_at is null
    )
  )
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  authority_id uuid,
  scope_type text not null,
  scope_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  status text not null default 'active',
  granted_by uuid references auth.users (id) on delete set null,
  revoked_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_scope_type_check check (
    scope_type in ('global', 'authority', 'ward', 'department')
  ),
  constraint user_roles_scope_check check (
    (
      scope_type = 'global'
      and authority_id is null
      and scope_id is null
    )
    or (
      scope_type = 'authority'
      and authority_id is not null
      and scope_id = authority_id
    )
    or (
      scope_type in ('ward', 'department')
      and authority_id is not null
      and scope_id is not null
    )
  ),
  constraint user_roles_effective_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  constraint user_roles_status_check check (status in ('active', 'expired', 'revoked')),
  constraint user_roles_expired_check check (
    status <> 'expired' or effective_until is not null
  ),
  constraint user_roles_revocation_check check (
    (
      status = 'revoked'
      and revoked_by is not null
      and revoked_at is not null
    )
    or (
      status <> 'revoked'
      and revoked_by is null
      and revoked_at is null
    )
  )
);

create table public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  subject_user_id uuid references auth.users (id) on delete set null,
  authority_id uuid,
  device_id uuid references public.devices (id) on delete set null,
  event_type text not null,
  outcome text not null,
  request_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint auth_audit_events_event_type_check check (
    event_type in (
      'sign_in_succeeded',
      'sign_in_failed',
      'sign_out_succeeded',
      'session_refreshed',
      'otp_requested',
      'otp_verified',
      'device_registered',
      'device_revoked',
      'government_invitation_created',
      'government_invitation_failed',
      'platform_admin_bootstrapped',
      'access_denied'
    )
  ),
  constraint auth_audit_events_outcome_check check (outcome in ('success', 'failure')),
  constraint auth_audit_events_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint auth_audit_events_user_agent_check check (
    user_agent is null or char_length(user_agent) between 1 and 1024
  )
);

create unique index authority_memberships_one_live_membership_idx
  on public.authority_memberships (user_id, authority_id)
  where status in ('invited', 'pending_approval', 'active');

create index authority_memberships_active_lookup_idx
  on public.authority_memberships (
    user_id,
    authority_id,
    status,
    effective_from,
    effective_until
  );

create index authority_memberships_authority_status_idx
  on public.authority_memberships (authority_id, status, user_id);

create unique index user_roles_one_active_assignment_idx
  on public.user_roles (
    user_id,
    role_id,
    scope_type,
    coalesce(authority_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'active';

create index user_roles_active_lookup_idx
  on public.user_roles (
    user_id,
    role_id,
    status,
    effective_from,
    effective_until
  );

create index user_roles_authority_scope_idx
  on public.user_roles (authority_id, scope_type, scope_id, status, user_id)
  where authority_id is not null;

create index devices_user_active_idx
  on public.devices (user_id, is_active, last_seen_at desc);

create index auth_audit_events_actor_time_idx
  on public.auth_audit_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

create index auth_audit_events_subject_time_idx
  on public.auth_audit_events (subject_user_id, occurred_at desc)
  where subject_user_id is not null;

create index auth_audit_events_authority_time_idx
  on public.auth_audit_events (authority_id, occurred_at desc)
  where authority_id is not null;

insert into public.roles (
  id,
  code,
  name,
  description,
  is_system,
  is_government,
  is_privileged
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'citizen',
    'Citizen',
    'Creates and follows civic complaints as a resident.',
    true,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'government_operator',
    'Government operator',
    'Performs operational work within an assigned authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'ward_officer',
    'Ward officer',
    'Handles work within an assigned ward and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'department_officer',
    'Department officer',
    'Handles work within an assigned department and authority.',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'municipal_admin',
    'Municipal administrator',
    'Manages identity access within an assigned municipal authority.',
    true,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'platform_admin',
    'Platform administrator',
    'Manages restricted platform-wide administrative access.',
    true,
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000007',
    'moderator',
    'Moderator',
    'Moderates content within an assigned authority.',
    true,
    true,
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_government = excluded.is_government,
  is_privileged = excluded.is_privileged,
  updated_at = now();

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger devices_set_updated_at
before update on public.devices
for each row execute function private.set_updated_at();

create trigger roles_set_updated_at
before update on public.roles
for each row execute function private.set_updated_at();

create trigger authority_memberships_set_updated_at
before update on public.authority_memberships
for each row execute function private.set_updated_at();

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function private.set_updated_at();

create function private.user_has_active_role(
  candidate_user_id uuid,
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = candidate_user_id
      and profile.status = 'active'
      and role.code = required_role_code
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
      and (
        required_scope_type is null
        or (
          user_role.scope_type = required_scope_type
          and user_role.scope_id is not distinct from required_scope_id
        )
      )
      and (
        user_role.scope_type = 'global'
        or exists (
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
      )
  );
$$;

create function private.has_active_role(
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_active_role(
    (select auth.uid()),
    required_role_code,
    required_scope_type,
    required_scope_id
  );
$$;

create function private.user_can_manage_authority(
  candidate_user_id uuid,
  target_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_authority_id is not null
    and (
      private.user_has_active_role(
        candidate_user_id,
        'platform_admin',
        'global',
        null
      )
      or private.user_has_active_role(
        candidate_user_id,
        'municipal_admin',
        'authority',
        target_authority_id
      )
    );
$$;

create function private.can_manage_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_can_manage_authority(
    (select auth.uid()),
    target_authority_id
  );
$$;

create function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  citizen_role_id uuid;
  requested_language text;
begin
  requested_language := new.raw_user_meta_data ->> 'preferred_language';

  insert into public.profiles (
    id,
    display_name,
    phone,
    email,
    preferred_language,
    status
  )
  values (
    new.id,
    nullif(
      btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')),
      ''
    ),
    nullif(btrim(new.phone), ''),
    nullif(lower(btrim(new.email)), ''),
    case when requested_language in ('en', 'hi', 'mr') then requested_language else 'en' end,
    'active'
  )
  on conflict (id) do nothing;

  select role.id
  into strict citizen_role_id
  from public.roles as role
  where role.code = 'citizen';

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  values (
    new.id,
    citizen_role_id,
    'global',
    'active',
    now()
  );

  return new;
end;
$$;

create function private.handle_auth_user_identity_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    phone = nullif(btrim(new.phone), ''),
    email = nullif(lower(btrim(new.email)), '')
  where id = new.id;

  return new;
end;
$$;

create trigger on_local_wellness_auth_user_created
after insert on auth.users
for each row execute function private.handle_auth_user_created();

create trigger on_local_wellness_auth_user_identity_updated
after update of email, phone on auth.users
for each row
when (old.email is distinct from new.email or old.phone is distinct from new.phone)
execute function private.handle_auth_user_identity_updated();

create function public.provision_government_invitation(
  invited_user_id uuid,
  invitation_email text,
  authority_id uuid,
  role_id uuid,
  scope_type text,
  scope_id uuid,
  effective_from timestamptz,
  effective_until timestamptz,
  actor_user_id uuid
)
returns table (membership_id uuid, role_assignment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role_code text;
  selected_role_is_privileged boolean;
begin
  if invited_user_id is null
    or invitation_email is null
    or authority_id is null
    or role_id is null
    or scope_type is null
    or scope_id is null
    or effective_from is null
    or actor_user_id is null then
    raise exception 'Government invitation arguments must not be null.'
      using errcode = '22004';
  end if;

  if effective_until is not null and effective_until <= effective_from then
    raise exception 'effective_until must be later than effective_from.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = invited_user_id
      and profile.email = lower(btrim(invitation_email))
  ) then
    raise exception 'The invited Auth user and invitation email do not match.'
      using errcode = '23503';
  end if;

  if not private.user_can_manage_authority(actor_user_id, authority_id) then
    raise exception 'The actor cannot manage the requested authority.'
      using errcode = '42501';
  end if;

  select role.code, role.is_privileged
  into selected_role_code, selected_role_is_privileged
  from public.roles as role
  where role.id = role_id;

  if selected_role_code is null then
    raise exception 'The requested role does not exist.'
      using errcode = '23503';
  end if;

  if selected_role_is_privileged
    and not private.user_has_active_role(actor_user_id, 'platform_admin', 'global', null) then
    raise exception 'Only an active platform administrator may grant a privileged role.'
      using errcode = '42501';
  end if;

  if not (
    (selected_role_code in ('government_operator', 'municipal_admin', 'moderator')
      and scope_type = 'authority'
      and scope_id = authority_id)
    or (selected_role_code = 'ward_officer' and scope_type = 'ward')
    or (selected_role_code = 'department_officer' and scope_type = 'department')
  ) then
    raise exception 'The requested role and scope combination is not permitted.'
      using errcode = '23514';
  end if;

  insert into public.authority_memberships (
    user_id,
    authority_id,
    invitation_email,
    status,
    effective_from,
    effective_until,
    invited_by,
    approved_by,
    approved_at
  )
  values (
    invited_user_id,
    authority_id,
    lower(btrim(invitation_email)),
    'active',
    effective_from,
    effective_until,
    actor_user_id,
    actor_user_id,
    now()
  )
  returning id into membership_id;

  insert into public.user_roles (
    user_id,
    role_id,
    authority_id,
    scope_type,
    scope_id,
    effective_from,
    effective_until,
    status,
    granted_by
  )
  values (
    invited_user_id,
    role_id,
    authority_id,
    scope_type,
    scope_id,
    effective_from,
    effective_until,
    'active',
    actor_user_id
  )
  returning id into role_assignment_id;

  insert into public.auth_audit_events (
    actor_user_id,
    subject_user_id,
    authority_id,
    event_type,
    outcome,
    metadata
  )
  values (
    actor_user_id,
    invited_user_id,
    authority_id,
    'government_invitation_created',
    'success',
    jsonb_build_object(
      'roleCode', selected_role_code,
      'membershipId', membership_id,
      'roleAssignmentId', role_assignment_id
    )
  );

  return next;
end;
$$;

create function public.bootstrap_platform_administrator(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  platform_admin_role_id uuid;
  role_assignment_id uuid;
begin
  if target_user_id is null then
    raise exception 'target_user_id must not be null.'
      using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('local_wellness.bootstrap_platform_administrator', 0)
  );

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = target_user_id
      and profile.status = 'active'
  ) then
    raise exception 'The target user must have an active profile.'
      using errcode = '23514';
  end if;

  select role.id
  into strict platform_admin_role_id
  from public.roles as role
  where role.code = 'platform_admin';

  if exists (
    select 1
    from public.user_roles as user_role
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.role_id = platform_admin_role_id
      and user_role.scope_type = 'global'
      and user_role.status = 'active'
      and profile.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
  ) then
    raise exception 'An active platform administrator already exists.'
      using errcode = '55000';
  end if;

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  values (
    target_user_id,
    platform_admin_role_id,
    'global',
    'active',
    now()
  )
  returning id into role_assignment_id;

  insert into public.auth_audit_events (
    subject_user_id,
    event_type,
    outcome,
    metadata
  )
  values (
    target_user_id,
    'platform_admin_bootstrapped',
    'success',
    jsonb_build_object('roleAssignmentId', role_assignment_id)
  );

  return role_assignment_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.devices enable row level security;
alter table public.devices force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.authority_memberships enable row level security;
alter table public.authority_memberships force row level security;
alter table public.auth_audit_events enable row level security;
alter table public.auth_audit_events force row level security;

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
      and (select private.can_manage_authority(membership.authority_id))
  )
);

create policy profiles_update_own_safe_fields
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and status in ('pending', 'active')
)
with check (
  id = (select auth.uid())
  and status in ('pending', 'active')
);

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
      and (select private.can_manage_authority(membership.authority_id))
  )
);

create policy devices_insert_own
on public.devices
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.status in ('pending', 'active')
  )
);

create policy devices_update_own_safe_fields
on public.devices
for update
to authenticated
using (
  user_id = (select auth.uid())
  and risk_status <> 'blocked'
)
with check (user_id = (select auth.uid()));

create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

create policy user_roles_select_own_or_managed_authority
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
);

create policy authority_memberships_select_own_or_managed_authority
on public.authority_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy auth_audit_events_select_own_or_managed_authority
on public.auth_audit_events
for select
to authenticated
using (
  actor_user_id = (select auth.uid())
  or subject_user_id = (select auth.uid())
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
);

revoke all on public.profiles from anon, authenticated, service_role;
revoke all on public.devices from anon, authenticated, service_role;
revoke all on public.roles from anon, authenticated, service_role;
revoke all on public.user_roles from anon, authenticated, service_role;
revoke all on public.authority_memberships from anon, authenticated, service_role;
revoke all on public.auth_audit_events from anon, authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (display_name, preferred_language) on public.profiles to authenticated;

grant select on public.devices to authenticated;
grant insert (
  user_id,
  device_identifier_hash,
  platform,
  app_version,
  push_token
) on public.devices to authenticated;
grant update (app_version, push_token, last_seen_at)
  on public.devices to authenticated;

grant select on public.roles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.authority_memberships to authenticated;
grant select on public.auth_audit_events to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.devices to service_role;
grant select, insert, update, delete on public.roles to service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select, insert, update, delete on public.authority_memberships to service_role;
grant select, insert on public.auth_audit_events to service_role;

grant usage on schema private to authenticated, service_role;

revoke all on function private.set_updated_at() from public;
revoke all on function private.user_has_active_role(uuid, text, text, uuid) from public;
revoke all on function private.has_active_role(text, text, uuid) from public;
revoke all on function private.user_can_manage_authority(uuid, uuid) from public;
revoke all on function private.can_manage_authority(uuid) from public;
revoke all on function private.handle_auth_user_created() from public;
revoke all on function private.handle_auth_user_identity_updated() from public;
revoke all on function public.provision_government_invitation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid
) from public, anon, authenticated;
revoke all on function public.bootstrap_platform_administrator(uuid)
  from public, anon, authenticated;

grant execute on function private.has_active_role(text, text, uuid)
  to authenticated, service_role;
grant execute on function private.can_manage_authority(uuid)
  to authenticated, service_role;
grant execute on function public.provision_government_invitation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid
) to service_role;
grant execute on function public.bootstrap_platform_administrator(uuid)
  to service_role;

comment on schema private is
  'Non-exposed security-definer helpers used by Local Wellness RLS policies.';
comment on table public.profiles is
  'Application identity data extending Supabase Auth users.';
comment on table public.devices is
  'Hashed user device registrations and server-managed risk state.';
comment on table public.roles is
  'System role reference data. Role assignments are stored separately.';
comment on table public.user_roles is
  'Versioned, expiring role assignments with explicit authority scope.';
comment on table public.authority_memberships is
  'Invitation and membership state for a user within an authority.';
comment on table public.auth_audit_events is
  'Append-only authentication and access audit events.';
comment on column public.user_roles.authority_id is
  'Phase 1 authority UUID. A governance foreign key is added in Phase 2.';
comment on column public.authority_memberships.authority_id is
  'Phase 1 authority UUID. A governance foreign key is added in Phase 2.';
