# Testing

## Automated Coverage

`tests/staging-demo-accounts.test.mjs` covers:

- mandatory non-production acknowledgement;
- exact hosted project-reference/URL matching, including port/path/query/fragment/user-info
  rejection;
- bounded expiry parsing;
- explicit password-rotation parsing;
- server-controlled staging marker enforcement for password rotation;
- equivalent-instant expiry comparison and nonblank credential fallback;
- unique synthetic account and scope definitions;
- strong non-deterministic generated password shape.

Government Dashboard and Admin Console authentication tests cover bounded password input,
`signInWithPassword` behavior, audit recording, failure handling, and convergence on the existing
MFA/access routing.

## Verification Commands

```bash
node --test tests/staging-demo-accounts.test.mjs
corepack pnpm --filter @local-wellness/government-dashboard test
corepack pnpm --filter @local-wellness/admin-console test
```

All three commands exited successfully on 2026-07-18. The Government Dashboard run reported 53
passing tests, including password-session audit/failure behavior and the existing TOTP assurance
path. The Admin Console package reported all three test files passing. The focused provisioner file
reported seven passing tests. Both portal production builds, lint, and strict type-check also pass.

## Managed Staging Result

The guarded provisioner completed against the explicitly acknowledged staging project on
2026-07-18. It created and password-verified seven distinct confirmed identities, verified their
active profiles, resolved BMC/A Ward/K-W Ward/Solid Waste Management/Public Health only from the
reviewed invitation catalog, and persisted 30-day privileged assignments through
`2026-08-17T07:14:01.280Z`. The credential artifact is gitignored and verified as mode `0600`; no
password, server key, OTP, or authenticator secret was printed.

## Managed Staging Checks Still Required

- enroll a different TOTP factor for every account exercised;
- verify AAL1 denial and AAL2 success under the intended privileged MFA mode;
- verify municipal, ward, and department queue isolation;
- confirm expiry removes effective database access;
- perform and record artifact and Auth-identity teardown.
