create function private.backfill_missing_auth_identities()
returns table (
  profiles_inserted bigint,
  citizen_roles_inserted bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  citizen_role_id uuid;
begin
  select role.id
  into strict citizen_role_id
  from public.roles as role
  where role.code = 'citizen'
    and not role.is_privileged
    and not role.is_government;

  insert into public.profiles (
    id,
    display_name,
    phone,
    email,
    preferred_language,
    status
  )
  select
    auth_user.id,
    case
      when char_length(
        btrim(
          coalesce(
            auth_user.raw_user_meta_data ->> 'display_name',
            auth_user.raw_user_meta_data ->> 'name'
          )
        )
      ) between 1 and 120
        then btrim(
          coalesce(
            auth_user.raw_user_meta_data ->> 'display_name',
            auth_user.raw_user_meta_data ->> 'name'
          )
        )
      else null
    end,
    case
      when char_length(btrim(auth_user.phone)) between 3 and 32
        then btrim(auth_user.phone)
      else null
    end,
    case
      when char_length(lower(btrim(auth_user.email))) between 3 and 320
        then lower(btrim(auth_user.email))
      else null
    end,
    case
      when auth_user.raw_user_meta_data ->> 'preferred_language' in ('en', 'hi', 'mr')
        then auth_user.raw_user_meta_data ->> 'preferred_language'
      else 'en'
    end,
    'active'
  from auth.users as auth_user
  where not exists (
    select 1
    from public.profiles as profile
    where profile.id = auth_user.id
  )
  on conflict (id) do nothing;

  get diagnostics profiles_inserted = row_count;

  insert into public.user_roles (
    user_id,
    role_id,
    scope_type,
    status,
    effective_from
  )
  select
    auth_user.id,
    citizen_role_id,
    'global',
    'active',
    now()
  from auth.users as auth_user
  where not exists (
    select 1
    from public.user_roles as user_role
    where user_role.user_id = auth_user.id
      and user_role.role_id = citizen_role_id
      and user_role.scope_type = 'global'
      and user_role.authority_id is null
      and user_role.scope_id is null
  )
  on conflict do nothing;

  get diagnostics citizen_roles_inserted = row_count;

  return next;
end;
$$;

revoke all on function private.backfill_missing_auth_identities()
  from public, anon, authenticated, service_role;

select *
from private.backfill_missing_auth_identities();

comment on function private.backfill_missing_auth_identities() is
  'Idempotently repairs missing application profiles and non-privileged global citizen roles for existing Supabase Auth users without overwriting application identity data or reactivating revoked citizen access.';
