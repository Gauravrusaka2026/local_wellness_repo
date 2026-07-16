# Decisions

- Use five stable primary mobile destinations and group secondary actions under More.
- Keep citizen authentication passwordless and distinguish sign-in/create/recovery before OTP
  dispatch; only create-account may create an Auth identity.
- Treat category attributes and media counts as database/API data, not client constants.
- Keep exact complaint routing/submission server-owned and preserve existing safety gates.
- Resolve citizen-facing governance through the authenticated verified-only projection in ADR-0017,
  not direct Supabase reads or municipality-specific client logic.
- Use the root environment for local processes and fail clearly for native loopback or detectable
  Supabase project mismatch.
- Defer OS push until Expo/EAS, FCM/APNs, consent/preferences, destination verification, and delivery
  policy are approved; keep durable in-app history as the source of truth.
