begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.auth_audit_events'::regclass
      and constraint_record.conname = 'auth_audit_events_event_type_check'
      and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%password_changed%'
  ),
  'the authentication audit constraint includes password changes'
);

select lives_ok(
  $$
    insert into public.auth_audit_events (
      event_type,
      outcome,
      metadata
    )
    values (
      'password_changed',
      'success',
      '{"authMethod":"phone_otp","clientSurface":"mobile","source":"client_reported"}'::jsonb
    )
  $$,
  'a successful password change can be retained without sensitive material'
);

select is(
  (
    select count(*)::integer
    from public.auth_audit_events
    where event_type = 'password_changed'
      and outcome = 'success'
      and metadata ->> 'authMethod' = 'phone_otp'
  ),
  1,
  'the password-change audit retains only reviewed metadata'
);

select throws_ok(
  $$
    insert into public.auth_audit_events (event_type, outcome)
    values ('password_reset_otp', 'success')
  $$,
  '23514',
  null,
  'unknown authentication audit event types remain rejected'
);

select * from finish();
rollback;
