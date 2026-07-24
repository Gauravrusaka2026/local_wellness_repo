# Decisions

- Use five stable primary mobile destinations—Home, Complaints, Report, Community, and More—and
  group verified governance/Nearby plus other secondary actions under More.
- Prefer short visible labels and state summaries. Keep detailed instructions in contextual help,
  errors, and accessibility labels instead of repeating them under every option.
- Use email/password as the primary citizen credential, ordinary Supabase Phone Auth to confirm the
  same user's number, and fresh-SMS password change/recovery; never store application OTPs or
  weaken privileged TOTP/AAL2.
- Treat category attributes and media counts as database/API data, not client constants.
- Keep exact complaint routing/submission server-owned and preserve existing safety gates.
- Resolve citizen-facing governance through the authenticated verified-only projection in ADR-0017,
  not direct Supabase reads or municipality-specific client logic.
- Share a five-minute, memory-only current-area fix across Community, Nearby, and Profile; permit
  only one automatic permission prompt per process and retain explicit recovery. Keep complaint
  issue/media evidence on a separate fresh high-accuracy path. A persisted street address requires
  a separate private data/privacy decision.
- Use the root environment for local processes and fail clearly for native loopback or detectable
  Supabase project mismatch.
- Defer OS push until Expo/EAS, FCM/APNs, consent/preferences, destination verification, and delivery
  policy are approved; keep durable in-app history as the source of truth.
- Apply ADR-0024 for community interaction: one account-bound support, private star/follow state,
  aggregate-only public counts, current reviewed projections only, and no routing/workflow/SLA/KPI
  side effect. Comments remain disabled.
- Keep the Community owner preview actor-scoped and separate from reviewed-public map/ranking/
  engagement data.
- Expose only the sanitized office contract approved by ADR-0037. Operational routing recipients,
  WhatsApp contacts, officer mobiles, geometry, and internal identifiers remain server-private.
- Use typed localisation keys for core mobile copy and apply locale changes immediately after
  profile save; official names and server-provided data remain untranslated.
- Prefer compact 11–24 px mobile type, subtle state colour, filled code-native icons, and at least
  44 px interactive targets.
