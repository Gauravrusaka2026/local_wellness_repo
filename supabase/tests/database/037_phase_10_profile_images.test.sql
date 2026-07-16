begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions;

select plan(31);

select has_column(
  'public',
  'profiles',
  'avatar_object_path',
  'profiles store the current private avatar path'
);
select has_column(
  'public',
  'profiles',
  'avatar_updated_at',
  'profiles store the server-owned avatar version timestamp'
);
select has_trigger(
  'public',
  'profiles',
  'profiles_set_avatar_version',
  'profile avatar metadata has a server-owned version trigger'
);
select has_trigger(
  'public',
  'profiles',
  'profiles_reject_avatar_version_update',
  'direct profile avatar version updates are rejected'
);
select is(
  (
    select public
    from storage.buckets
    where id = 'profile-images-private'
  ),
  false,
  'the profile image bucket is private'
);
select is(
  (
    select file_size_limit
    from storage.buckets
    where id = 'profile-images-private'
  ),
  5242880::bigint,
  'the profile image bucket limits files to 5 MiB'
);
select is(
  (
    select allowed_mime_types
    from storage.buckets
    where id = 'profile-images-private'
  ),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'the profile image bucket accepts only supported image media types'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'profile_images_%'
  ),
  4,
  'owner-only CRUD policies cover private profile images'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'avatar_object_path', 'update'),
  'authenticated clients cannot change profile image metadata outside the API'
);
select ok(
  has_column_privilege('service_role', 'public.profiles', 'avatar_object_path', 'update'),
  'the service boundary can change profile image metadata'
);

set local role service_role;
select is(public.api_readiness_check(), true, 'readiness includes the private profile image bucket');
reset role;

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
values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'avatar.a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'avatar.b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local "request.jwt.claims" = '{"role":"authenticated","sub":"a1000000-0000-4000-8000-000000000001"}';
set local role authenticated;

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'profile-images-private',
      'a1000000-0000-4000-8000-000000000001/avatar.jpg',
      'a1000000-0000-4000-8000-000000000001',
      '{"size":1024,"mimetype":"image/jpeg"}'::jsonb
    )
  $$,
  'a citizen can upload an image only below their own exact profile path'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'profile-images-private'
  ),
  1,
  'a citizen can read their own private profile image'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'profile-images-private',
      'b1000000-0000-4000-8000-000000000002/avatar.jpg',
      'a1000000-0000-4000-8000-000000000001',
      '{"size":1024,"mimetype":"image/jpeg"}'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a citizen cannot upload into another account path'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'profile-images-private',
      'a1000000-0000-4000-8000-000000000001/cover.jpg',
      'a1000000-0000-4000-8000-000000000001',
      '{"size":1024,"mimetype":"image/jpeg"}'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'arbitrary owner paths are rejected'
);
select throws_ok(
  $$
    update public.profiles
    set avatar_object_path = 'a1000000-0000-4000-8000-000000000001/avatar.jpg'
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table profiles',
  'profile image metadata is written through the API service boundary'
);

reset role;
set local "request.jwt.claims" = '{"role":"authenticated","sub":"b1000000-0000-4000-8000-000000000002"}';
set local role authenticated;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'profile-images-private'
  ),
  0,
  'another citizen cannot read a private profile image'
);
select throws_ok(
  $$
    delete from storage.objects
    where bucket_id = 'profile-images-private'
  $$,
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'direct SQL cannot bypass private Storage deletion controls'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'profile-images-private'
  ),
  1,
  'the unauthorized delete leaves the private profile image intact'
);

select lives_ok(
  $$
    update public.profiles
    set avatar_object_path = 'a1000000-0000-4000-8000-000000000001/avatar.jpg'
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  'the API service can attach an owner-scoped profile image'
);
select ok(
  (
    select avatar_updated_at is not null
    from public.profiles
    where id = 'a1000000-0000-4000-8000-000000000001'
  ),
  'attaching an image sets the server-owned version timestamp'
);
select lives_ok(
  $$
    update public.profiles
    set avatar_object_path = 'a1000000-0000-4000-8000-000000000001/avatar.jpg'
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  'replacing an image at the same deterministic path refreshes its version'
);
select throws_ok(
  $$
    update public.profiles
    set avatar_updated_at = now() + interval '1 day'
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'PROFILE_AVATAR_VERSION_SERVER_OWNED',
  'callers cannot forge the profile image version timestamp'
);
select throws_ok(
  $$
    update public.profiles
    set avatar_object_path = 'b1000000-0000-4000-8000-000000000002/avatar.jpg'
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_avatar_object_path_check"',
  'database constraints reject cross-account profile image metadata'
);
select lives_ok(
  $$
    update public.profiles
    set avatar_object_path = null
    where id = 'a1000000-0000-4000-8000-000000000001'
  $$,
  'the API service can remove profile image metadata'
);
select is(
  (
    select avatar_updated_at
    from public.profiles
    where id = 'a1000000-0000-4000-8000-000000000001'
  ),
  null::timestamptz,
  'removing the image clears its version timestamp'
);
select ok(
  (
    select pg_get_constraintdef(constraint_record.oid) like '%avatar%'
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conname = 'profiles_avatar_object_path_check'
  ),
  'profile metadata is constrained to the account-scoped avatar path'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'profile_images_%'
      and (
        coalesce(qual, '') not like '%auth.uid%'
        and coalesce(with_check, '') not like '%auth.uid%'
      )
  ),
  'every profile image policy is bound to the authenticated user id'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_complaint_map_items'
      and column_name like '%avatar%'
  ),
  0,
  'profile image metadata is absent from public transparency projections'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in ('avatar_object_path', 'avatar_updated_at')
  ),
  2,
  'both profile image metadata columns exist exactly once'
);
select ok(
  (
    select not bucket.public
      and bucket.file_size_limit = 5242880
    from storage.buckets as bucket
    where bucket.id = 'profile-images-private'
  ),
  'profile image privacy and size limits remain fail-closed'
);

select * from finish();
rollback;
