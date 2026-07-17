# Mobile Citizen Experience Completion

## Scope

This cross-phase sprint makes the implemented identity, complaint, communication,
accountability, transparency, and governance capabilities discoverable in the Expo SDK 54 client.
It does not activate placeholder governance/routing data, introduce complaint data outside the
existing server-owned workflow, select a map provider, or claim OS push delivery.

## Implemented Outcome

- Modern authenticated navigation for Home, Complaints, Report, Nearby, and More.
- Explicit email/password sign-in, create-account, and provider-managed recovery modes, with staged
  Supabase Phone MFA.
- Refreshable owned-complaint summaries, recent records, filters, pagination, and detail links.
- Grouped profile, language, notifications, public reports, device guidance, and sign-out actions.
- Database-driven complaint attributes and photo/video limits across API and mobile form state.
- Expo foreground location, camera, video, and voice capture with the existing private upload,
  draft resume, duplicate review, submission, messages, and accountability workflows.
- Authenticated verified-only governance lookup with official provenance and honest unsupported,
  ambiguous, and low-accuracy states.
- Owner-private profile photos from Expo Camera or the media library, plus an ephemeral verified
  current-civic-area card that does not persist exact coordinates.
- Native configuration diagnostics for stale/mismatched Supabase projects and loopback services.

## Operational Boundary

The code is locally engineered. Staging still needs the additive directory migration and reviewed
official geometry; a physical-device LAN smoke has not run. The canonical baseline has no verified
routable category. The optional BMC non-production pack activates only three asset-independent
categories across 22 one-to-one wards; nine categories and split K/P wards remain fail-closed. OS
push remains deferred under `NOTIFY-001`; durable in-app history and optional Socket.IO refresh are
the implemented notification channels.
