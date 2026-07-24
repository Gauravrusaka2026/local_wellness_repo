alter table public.auth_audit_events
  drop constraint auth_audit_events_event_type_check;

alter table public.auth_audit_events
  add constraint auth_audit_events_event_type_check check (
    event_type in (
      'sign_in_succeeded',
      'sign_in_failed',
      'sign_out_succeeded',
      'session_refreshed',
      'otp_requested',
      'otp_verified',
      'password_changed',
      'device_registered',
      'device_revoked',
      'government_invitation_created',
      'government_invitation_failed',
      'platform_admin_bootstrapped',
      'access_denied'
    )
  );

comment on constraint auth_audit_events_event_type_check on public.auth_audit_events is
  'Limits authentication audit rows to reviewed event types, including client-reported password changes after fresh phone verification.';
