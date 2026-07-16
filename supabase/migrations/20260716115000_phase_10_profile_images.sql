alter table public.profiles
  add column avatar_object_path text,
  add column avatar_updated_at timestamptz,
  add constraint profiles_avatar_object_path_check check (
    avatar_object_path is null
    or avatar_object_path ~ (
      '^' || id::text || '/avatar\.(jpe?g|png|webp)$'
    )
  ),
  add constraint profiles_avatar_timestamp_check check (
    (avatar_object_path is null and avatar_updated_at is null)
    or (avatar_object_path is not null and avatar_updated_at is not null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images-private',
  'profile-images-private',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.set_profile_avatar_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.avatar_updated_at := case
    when new.avatar_object_path is null then null
    else clock_timestamp()
  end;

  return new;
end;
$$;

create function private.reject_profile_avatar_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'PROFILE_AVATAR_VERSION_SERVER_OWNED';
end;
$$;

create trigger profiles_set_avatar_version
before update of avatar_object_path on public.profiles
for each row
execute function private.set_profile_avatar_version();

create trigger profiles_reject_avatar_version_update
before update of avatar_updated_at on public.profiles
for each row
execute function private.reject_profile_avatar_version_update();

create policy profile_images_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
)
with check (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create policy profile_images_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images-private'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/avatar\.(jpe?g|png|webp)$'
);

create or replace function public.api_readiness_check()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.roles as role
      where role.code = 'citizen'
    )
    and (
      select count(*) = 5
      from storage.buckets as bucket
      where bucket.id in (
        'complaint-originals-private',
        'governance-raw-snapshots',
        'profile-images-private',
        'resolution-evidence-private',
        'voice-recordings-private'
      )
        and bucket.public = false
    );
$$;

revoke all on function private.set_profile_avatar_version() from public;
revoke all on function private.reject_profile_avatar_version_update() from public;
revoke all on function public.api_readiness_check() from public, anon, authenticated;
grant execute on function public.api_readiness_check() to service_role;

comment on column public.profiles.avatar_object_path is
  'Owner-private Supabase Storage path for the current profile image; never exposed in public complaint projections.';
comment on column public.profiles.avatar_updated_at is
  'Server-maintained cache/version timestamp for the current private profile image.';
comment on function private.set_profile_avatar_version() is
  'Versions private profile-image metadata without trusting a client-supplied timestamp.';
comment on function private.reject_profile_avatar_version_update() is
  'Rejects direct changes to the server-owned private profile-image version timestamp.';
