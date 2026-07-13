begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(63);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'devices', 'devices table exists');
select has_table('public', 'roles', 'roles table exists');
select has_table('public', 'user_roles', 'user_roles table exists');
select has_table(
  'public',
  'authority_memberships',
  'authority_memberships table exists'
);
select has_table('public', 'auth_audit_events', 'auth_audit_events table exists');

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'profiles',
        'devices',
        'roles',
        'user_roles',
        'authority_memberships',
        'auth_audit_events'
      )
      and relation.relrowsecurity
  ),
  6,
  'RLS is enabled on every Phase 1 table'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'profiles',
        'devices',
        'roles',
        'user_roles',
        'authority_memberships',
        'auth_audit_events'
      )
      and relation.relforcerowsecurity
  ),
  6,
  'RLS is forced on every Phase 1 table'
);

select is((select count(*)::integer from public.roles), 7, 'all system roles are seeded');

select results_eq(
  $$
    select code, is_government, is_privileged
    from public.roles
    order by code
  $$,
  $$
    values
      ('citizen'::text, false, false),
      ('department_officer'::text, true, false),
      ('government_operator'::text, true, false),
      ('moderator'::text, true, true),
      ('municipal_admin'::text, true, true),
      ('platform_admin'::text, false, true),
      ('ward_officer'::text, true, false)
  $$,
  'seeded role classifications match the authorization contract'
);

select col_is_pk('public', 'profiles', 'id', 'profiles uses id as its primary key');
select col_is_pk('public', 'devices', 'id', 'devices uses id as its primary key');
select col_is_pk('public', 'roles', 'id', 'roles uses id as its primary key');
select col_is_pk('public', 'user_roles', 'id', 'user_roles uses id as its primary key');
select col_is_pk(
  'public',
  'authority_memberships',
  'id',
  'authority_memberships uses id as its primary key'
);
select col_is_pk(
  'public',
  'auth_audit_events',
  'id',
  'auth_audit_events uses id as its primary key'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_id_fkey'
      and confrelid = 'auth.users'::regclass
  ),
  'profiles references auth.users'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'devices_user_id_fkey'
      and confrelid = 'auth.users'::regclass
  ),
  'devices references auth.users'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'user_roles_user_id_fkey'
      and confrelid = 'auth.users'::regclass
  ),
  'user_roles references auth.users'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'authority_memberships_user_id_fkey'
      and confrelid = 'auth.users'::regclass
  ),
  'authority_memberships references auth.users'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where conname in (
      'auth_audit_events_actor_user_id_fkey',
      'auth_audit_events_subject_user_id_fkey',
      'auth_audit_events_device_id_fkey'
    )
  ),
  0,
  'audit actor, subject, and device identifiers are immutable snapshots without foreign keys'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where conname in (
      'authority_memberships_invited_by_fkey',
      'authority_memberships_approved_by_fkey',
      'authority_memberships_revoked_by_fkey',
      'user_roles_granted_by_fkey',
      'user_roles_revoked_by_fkey'
    )
      and confdeltype = 'r'
  ),
  5,
  'access lifecycle actor foreign keys retain provenance with ON DELETE RESTRICT'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'public.auth_audit_events'::regclass
      and attribute.attname in ('actor_user_id', 'subject_user_id', 'device_id')
      and attribute.atttypid = 'uuid'::regtype
      and pg_catalog.col_description(attribute.attrelid, attribute.attnum)
        like '%Immutable UUID snapshot%'
  ),
  3,
  'audit attribution snapshots remain documented UUID columns'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'user_roles_role_id_fkey'
      and confrelid = 'public.roles'::regclass
  ),
  'user_roles references roles'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where contype = 'f'
      and conrelid in (
        'public.user_roles'::regclass,
        'public.authority_memberships'::regclass,
        'public.auth_audit_events'::regclass
      )
      and pg_catalog.pg_get_constraintdef(oid) like '%authority_id%'
  ),
  0,
  'Phase 1 authority UUIDs intentionally have no Phase 2 foreign key'
);

select has_index(
  'public',
  'devices',
  'devices_user_identifier_unique',
  'device identifiers are unique per user'
);
select has_index(
  'public',
  'user_roles',
  'user_roles_one_active_assignment_idx',
  'duplicate active role assignments are prevented'
);
select has_index(
  'public',
  'authority_memberships',
  'authority_memberships_one_live_membership_idx',
  'duplicate live authority memberships are prevented'
);

select ok(
  to_regprocedure('private.has_active_role(text,text,uuid)') is not null,
  'private.has_active_role exists'
);
select ok(
  to_regprocedure('private.can_manage_authority(uuid)') is not null,
  'private.can_manage_authority exists'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc
    where oid in (
      'private.has_active_role(text,text,uuid)'::regprocedure,
      'private.can_manage_authority(uuid)'::regprocedure
    )
      and prosecdef
  ),
  2,
  'RLS helpers are security definer functions'
);
select ok(
  to_regprocedure(
    'public.provision_government_invitation(uuid,text,uuid,uuid,text,uuid,timestamptz,timestamptz,uuid)'
  ) is not null,
  'government invitation RPC exists'
);
select ok(
  to_regprocedure('public.bootstrap_platform_administrator(uuid)') is not null,
  'platform administrator bootstrap RPC exists'
);
select ok(
  to_regprocedure(
    'public.register_device(uuid,text,text,timestamptz,text,text,boolean,uuid,inet,text)'
  ) is not null,
  'atomic device registration RPC exists'
);
select ok(
  to_regprocedure(
    'public.revoke_device(uuid,uuid,timestamptz,uuid,inet,text)'
  ) is not null,
  'atomic device revocation RPC exists'
);
select ok(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid =
      'public.provision_government_invitation(uuid,text,uuid,uuid,text,uuid,timestamptz,timestamptz,uuid)'::regprocedure
  ),
  'government invitation RPC is security definer'
);
select ok(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'public.bootstrap_platform_administrator(uuid)'::regprocedure
  ),
  'platform administrator bootstrap RPC is security definer'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc
    where oid in (
      'public.register_device(uuid,text,text,timestamptz,text,text,boolean,uuid,inet,text)'::regprocedure,
      'public.revoke_device(uuid,uuid,timestamptz,uuid,inet,text)'::regprocedure
    )
      and prosecdef
  ),
  2,
  'device lifecycle RPCs are security definer functions'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anonymous users have no profile read privilege'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'select'),
  'authenticated users can query profiles through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.roles', 'insert'),
  'authenticated users cannot create roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'insert'),
  'authenticated users cannot assign roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.devices', 'delete'),
  'authenticated users cannot hard-delete devices'
);
select ok(
  not has_column_privilege('authenticated', 'public.devices', 'user_id', 'insert')
    and not has_column_privilege(
      'authenticated',
      'public.devices',
      'device_identifier_hash',
      'insert'
    )
    and not has_column_privilege('authenticated', 'public.devices', 'platform', 'insert')
    and not has_column_privilege('authenticated', 'public.devices', 'app_version', 'insert')
    and not has_column_privilege('authenticated', 'public.devices', 'push_token', 'insert'),
  'authenticated users cannot bypass atomic registration with direct device inserts'
);
select ok(
  not has_column_privilege('authenticated', 'public.devices', 'app_version', 'update')
    and not has_column_privilege('authenticated', 'public.devices', 'push_token', 'update')
    and not has_column_privilege('authenticated', 'public.devices', 'last_seen_at', 'update'),
  'authenticated users cannot bypass atomic lifecycle handling with direct device updates'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.devices',
    'device_identifier_hash',
    'select'
  ),
  'authenticated users cannot read device identifier hashes'
);
select ok(
  not has_column_privilege('authenticated', 'public.devices', 'push_token', 'select'),
  'authenticated users cannot read device push tokens'
);
select ok(
  has_column_privilege('authenticated', 'public.devices', 'id', 'select'),
  'authenticated users may read safe device identifiers through RLS'
);
select ok(
  has_column_privilege('authenticated', 'public.devices', 'platform', 'select'),
  'authenticated users may read safe device platform metadata through RLS'
);
select ok(
  has_column_privilege('service_role', 'public.devices', 'device_identifier_hash', 'select')
    and has_column_privilege('service_role', 'public.devices', 'push_token', 'select'),
  'service role retains access to sensitive device fields'
);
select ok(
  has_table_privilege('service_role', 'public.auth_audit_events', 'insert'),
  'service role may append audit events'
);
select ok(
  not has_table_privilege('service_role', 'public.auth_audit_events', 'update'),
  'service role cannot update audit events'
);
select ok(
  not has_table_privilege('service_role', 'public.auth_audit_events', 'delete'),
  'service role cannot delete audit events'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.provision_government_invitation(uuid,text,uuid,uuid,text,uuid,timestamptz,timestamptz,uuid)',
    'execute'
  ),
  'authenticated users cannot call the invitation RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.provision_government_invitation(uuid,text,uuid,uuid,text,uuid,timestamptz,timestamptz,uuid)',
    'execute'
  ),
  'service role may call the invitation RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.bootstrap_platform_administrator(uuid)',
    'execute'
  ),
  'authenticated users cannot bootstrap a platform administrator'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.bootstrap_platform_administrator(uuid)',
    'execute'
  ),
  'service role may perform the one-time platform administrator bootstrap'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_device(uuid,text,text,timestamptz,text,text,boolean,uuid,inet,text)',
    'execute'
  )
    and not has_function_privilege(
      'authenticated',
      'public.register_device(uuid,text,text,timestamptz,text,text,boolean,uuid,inet,text)',
      'execute'
    )
    and not has_function_privilege(
      'anon',
      'public.revoke_device(uuid,uuid,timestamptz,uuid,inet,text)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.revoke_device(uuid,uuid,timestamptz,uuid,inet,text)',
      'execute'
    ),
  'anonymous and authenticated clients cannot execute device lifecycle RPCs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.register_device(uuid,text,text,timestamptz,text,text,boolean,uuid,inet,text)',
    'execute'
  )
    and has_function_privilege(
      'service_role',
      'public.revoke_device(uuid,uuid,timestamptz,uuid,inet,text)',
      'execute'
    ),
  'service role may execute both device lifecycle RPCs'
);
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'devices'
      and policy.cmd in ('INSERT', 'UPDATE')
  ),
  0,
  'authenticated device mutation policies are removed so grants cannot bypass atomic auditing'
);
select ok(
  (
    select policy.qual
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'profiles'
      and policy.policyname = 'profiles_select_own_or_managed_authority'
  ) like '%membership.status = ''active''%'
    and (
      select policy.qual
      from pg_catalog.pg_policies as policy
      where policy.schemaname = 'public'
        and policy.tablename = 'profiles'
        and policy.policyname = 'profiles_select_own_or_managed_authority'
    ) like '%membership.effective_from <= CURRENT_TIMESTAMP%',
  'managed profile reads require a currently active target membership'
);
select ok(
  (
    select policy.qual
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'devices'
      and policy.policyname = 'devices_select_own_or_managed_authority'
  ) like '%membership.status = ''active''%'
    and (
      select policy.qual
      from pg_catalog.pg_policies as policy
      where policy.schemaname = 'public'
        and policy.tablename = 'devices'
        and policy.policyname = 'devices_select_own_or_managed_authority'
    ) like '%membership.effective_from <= CURRENT_TIMESTAMP%',
  'managed device reads require a currently active target membership'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.devices'::regclass
      and attname = 'is_active'
      and attgenerated = 's'
      and attnotnull
  ),
  'device active state is a non-null value derived from revoked_at'
);
select * from finish();
rollback;
