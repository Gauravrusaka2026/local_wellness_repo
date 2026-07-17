# Decisions

- Use five stable primary mobile destinations and group secondary actions under More.
- Use email/password for citizen account creation and sign-in, provider-managed password recovery,
  and Supabase Phone MFA as a separate staged verification factor; never store application OTPs.
- Treat category attributes and media counts as database/API data, not client constants.
- Keep exact complaint routing/submission server-owned and preserve existing safety gates.
- Resolve citizen-facing governance through the authenticated verified-only projection in ADR-0017,
  not direct Supabase reads or municipality-specific client logic.
- Keep profile civic-area lookup ephemeral and retain only verified derived labels in component
  memory; a persisted street address requires a separate private data/privacy decision.
- Use the root environment for local processes and fail clearly for native loopback or detectable
  Supabase project mismatch.
- Defer OS push until Expo/EAS, FCM/APNs, consent/preferences, destination verification, and delivery
  policy are approved; keep durable in-app history as the source of truth.
