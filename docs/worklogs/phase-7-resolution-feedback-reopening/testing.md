# Phase 7 Testing

## Coverage

- pgTAP plan 026 covers tables/columns/PostGIS types, forced RLS, direct ACL denial, service-only
  execute grants, pinned search paths, append-only triggers, policy overlap, Storage denial, and
  Phase 5 compatibility (56 assertions).
- pgTAP plan 027 covers policy approval/ambiguity/rollover, assignment anchoring, mock/stale/
  inaccurate completion and reopen locations, evidence integrity/expiry/recovery, ownership,
  feedback replay and confirmation, reopen replay/non-reuse, repeated escalation, audit/history,
  and notification outbox integration (49 assertions).
- Shared validation, API/controller/store, mobile, and dashboard tests cover strict decoding,
  no-store authenticated routes, stable retry identities, evidence access, unavailable policy,
  live capture, external refresh, durable citizen receipts, and completion-location input.

## Results — 2026-07-16

- Clean seeded Supabase reset: passed through all 27 migrations.
- Full pgTAP: 27 files, 1,072 assertions, 0 failures.
- Database lint: exit 0; only pre-existing PostGIS extension diagnostics in broad output.
- Generated database types: regenerated; drift check passed.
- API: 144 tests passed. Shared validation: 45 tests across 7 suites passed.
- Mobile: 7 test files passed. Government dashboard: 22 tests passed.
- Workspace: all 28 test tasks, 16 lint tasks, and 16 strict type-check tasks passed; root safety/
  resource tests passed.
- All production application builds and the Expo Android export passed (1,243 modules). Offline
  `expo install --check` used the SDK 54 bundled dependency map and reported dependencies current;
  Prettier check and development Compose validation passed, and `pnpm audit --prod` reported no
  known vulnerabilities.

Managed staging, delivered notifications, browser/device camera/GPS/upload behavior, and an active
operational policy were not exercised. All policy-sensitive positive paths use synthetic fixtures
that roll back.

No test may activate a placeholder governance/routing record or persist a synthetic policy outside
its rollback transaction.
