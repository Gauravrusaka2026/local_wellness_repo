# V1 Pilot Go/No-Go

The default decision is **no-go** until every mandatory evidence item has an owner and a current
approval. Local engineering completion is not production readiness.

## Engineering Evidence

- CI, generated governance seed, master checksum, formatting, lint, strict type-checking, tests,
  builds, Expo export, Compose validation, secret scan, and dependency audit pass on the release
  commit.
- Incremental migrations, forced RLS/function grants, private Storage, and generated types pass in
  staging.
- API/realtime/worker health, graceful shutdown, queue lease/retry/dead behavior, bounded load, and
  rollback compatibility are evidenced.
- Citizen, government, administrator, routing, complaint/media, realtime/offline recovery,
  resolution, transparency, SLA, escalation, and KPI critical flows pass in staging and on
  representative devices where applicable.
- No critical security finding or unresolved cross-scope/privacy failure remains.

## Data and Policy Evidence

- Pilot municipality and ward identities, effective geometry, categories, routing rules,
  departments, durable roles, current assignments, offices, contacts, utilities, and emergency
  references are official, current, reviewed, versioned, and non-placeholder.
- Visibility, moderation, duplicate review, resolution/reopening, SLA/calendar/escalation, KPI,
  retention, and correction policies are approved and active only for their intended scope.
- Routing accuracy and safe fallback behavior meet the approved pilot acceptance sample. No
  synthetic fixture remains active.

## Owner and Environment Evidence

- Separate staging/production projects, managed secrets, exact origins/redirects, provider limits,
  DNS/TLS, backups, restore rehearsal, monitoring, alert ownership, and incident contacts are
  verified.
- Email/SMS and any enabled notification provider pass delivered-message tests. Custom Auth
  templates remain optional.
- Municipal data ownership, authorized officers, support/moderation staffing, officer training,
  accessibility review, privacy/terms/consent/retention approval, and data-processing review are
  signed off.
- Rollback/forward-fix and outage communication rehearsals have current evidence.

Record the final decision, release commit/images, migration range, data/policy versions, approvers,
accepted limitations, and review expiry in the approved private operational system. Any failed
mandatory item results in no-go or a narrower explicitly approved non-public test.
