# Implementation

## Portal Entry

The Government Dashboard and Admin Console accept an existing email/password pair in addition to
their existing email code/link flow. Input validation remains bounded and errors stay
non-enumerating. A successful password session is passed to the same MFA routing and current access
checks as every other privileged session.

## Staging Matrix

`scripts/provision-staging-demo-accounts.mjs` creates separate synthetic identities for:

- global platform administration;
- BMC municipal administration;
- BMC government operations;
- BMC A Ward and K West Ward officer scopes;
- BMC Solid Waste Management and Public Health department scopes.

The command requires `--acknowledge-staging`, the exact hosted project reference, the exact reviewed
authority name, and a 1–90-day lifetime. It rejects a project-host mismatch, ambiguous scope,
partial access, unexpected active platform administration, and an existing synthetic identity
unless password rotation was explicitly requested.

Non-global scopes come from `list_government_invitation_options`. Access is preassigned through
`bootstrap_platform_administrator` and `provision_government_invitation`, then bounded with
`effective_until`. Every generated password is verified through a separate public Supabase Auth
client before the local credential artifact is written.

## Operator Command

```bash
pnpm access:provision-staging-demo -- \
  --acknowledge-staging \
  --project-ref <20-character-project-ref> \
  --authority-name "Brihanmumbai Municipal Corporation" \
  --expires-in-days 30
```

The script loads the root environment. It requires the server-only secret/service-role key and a
public key but never prints either value, a password, an OTP, or an authenticator secret.
