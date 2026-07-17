# Testing

Verified on 2026-07-17 after the current citizen/category integration:

- API: 210 tests passed; lint, type-check, and production build passed;
- Citizen Web: 7 test files passed; lint, type-check, and production build passed;
- Government Dashboard: 51 tests passed; lint, type-check, and production build passed;
- Admin Console: 3 test files passed; lint, type-check, and production build passed;
- repository lint and strict type-check passed across all 16 workspaces;
- database: clean reset applied 42 migrations and reviewed seeds; 1,513 assertions across 43 pgTAP
  plans passed, including 9 invitation-options assertions;
- generated types, 42-migration master artifacts, BMC generator, whitespace, and tracked/local-history
  secret checks passed.
- the root-environment runner passed loading, injected-value precedence, app-local rejection,
  portable Node resolution, and missing-file tests; Turbo dry-run verification includes the root
  file and public variables in build inputs, and the three portals rebuilt from the aligned root
  environment after removing the stale Citizen override.

Interactive browser QA was not claimed because no in-app browser tab was available (`ENV-003`).
