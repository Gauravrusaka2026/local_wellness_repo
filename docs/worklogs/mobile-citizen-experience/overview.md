# Mobile Citizen Experience Completion

> Authentication note: the staged citizen Phone-MFA statements in this historical worklog are
> superseded by ADR-0033. Current citizens use ordinary confirmed-phone OTP at AAL1; privileged
> TOTP/AAL2 remains separate.

## Scope

This cross-phase sprint makes the implemented identity, complaint, communication,
accountability, transparency, and governance capabilities discoverable in the Expo SDK 54 client.
It does not activate placeholder governance/routing data, introduce complaint data outside the
existing server-owned workflow, select a map provider, or claim OS push delivery.

## Implemented Outcome

- Compact authenticated navigation for Home, Complaints, Report, Community, and More, with verified
  governance/Nearby available under More.
- Explicit email/password sign-in and account creation with ordinary Supabase confirmed-phone OTP,
  resend guidance, provider-managed recovery, and fresh-SMS password change.
- Refreshable owned-complaint summaries, recent records, filters, pagination, and detail links.
- Grouped profile, language, notifications, public reports, device guidance, and sign-out actions.
- Database-driven complaint attributes and photo/video limits across API and mobile form state.
- One autosaving, scrollable complaint form with two taxonomy dropdowns, automatic location and
  duplicate checks, unified evidence capture, an explicit blocker checklist, and dedicated
  success/failure/unknown result routes.
- Expo foreground location, camera, video, and voice capture with the existing private upload,
  draft resume, duplicate review, submission, messages, and accountability workflows.
- Authenticated verified-only governance lookup with official provenance, an optional sanitized
  ward/municipality office directory, safe phone/email/source actions, and honest unsupported,
  ambiguous, low-accuracy, and empty-office states.
- Owner-private profile photos from Expo Camera or the media library, plus an ephemeral verified
  current-civic-area card that does not persist exact coordinates.
- Reviewed Local and Trending community lists, a minimum-cohort Heat view, one support per active
  authenticated account, and private star/follow state without public identity disclosure or an
  official-workflow effect.
- A separate owner-private **Your reports** preview in Community that works without location and
  never promotes unreviewed complaints into public Local, Trending, Heat, support, or star state.
- Compact green/saffron/white/blue mobile tokens, filled code-native navigation icons, a detached
  bottom capsule, smaller type, shorter visible copy, and typed English/Marathi/Hindi core-screen
  localisation.
- One process-wide automatic foreground-permission attempt and a five-minute memory-only
  current-area cache; explicit recovery remains available while every complaint/media evidence
  action obtains a fresh high-accuracy fix.
- Native configuration diagnostics for stale/mismatched Supabase projects and loopback services.

## Operational Boundary

The code is locally engineered. Hosted staging still needs the additive
`20260724120000_verified_civic_area_office_contacts.sql` migration and the matching API/mobile
deployment; a physical-device LAN smoke has not run. The current JagrukSetu BMC V1 intake provides
256 submittable leaves and 84 protected official handoffs locally, but hosted activation and
progressively more precise replacements for the general ward route remain separate gates. OS push
remains deferred under `NOTIFY-001`; durable in-app history and optional Socket.IO refresh are the
implemented notification channels. Their mobile entry points use a recognizable bell icon.

The office projection never returns operational routing recipients, WhatsApp values, officer
direct mobiles, internal identifiers, geometry, or unpublished records. Current-area coordinates
remain process memory only. The BMC intake, office-directory, and engagement SQL Editor artifacts
remain operator activation steps; local UI capability does not imply hosted data availability.
