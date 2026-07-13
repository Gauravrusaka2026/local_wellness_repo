revoke select on public.devices from authenticated;

grant select (
  id,
  user_id,
  platform,
  app_version,
  last_seen_at,
  risk_status,
  revoked_at,
  is_active,
  created_at,
  updated_at
) on public.devices to authenticated;

comment on column public.devices.device_identifier_hash is
  'Sensitive server-only device fingerprint. Never expose through authenticated SQL queries.';
comment on column public.devices.push_token is
  'Sensitive server-only notification address. Never expose through authenticated SQL queries.';
