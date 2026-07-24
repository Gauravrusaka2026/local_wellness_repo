# Open Issues

- Apply/reconcile migrations through `20260716119000` on managed staging before using the invitation
  selector there.
- Run one complete managed-browser official invitation, acceptance, personal TOTP enrollment, and
  scoped dashboard smoke.
- Implement audited existing-user assignment/revocation/renewal (`AUTH-001`).
- Rehearse privileged MFA recovery before switching managed enforcement from observe to enforce
  (`AUTH-002`).
- Add bounded authority-first search and pagination before statewide invitation rollout
  (`AUTH-011`).
- Apply migrations 52–53, enable the ordinary Phone provider/Twilio Verify, phone confirmations and
  Phone Auth signup capability, activate the email-required Before User Created hook, set the
  preferred `*_PHONE_VERIFICATION_MODE` values to `enforce`, and complete the managed
  recovery/device matrix (`AUTH-010`, `AUTH-014`, `AUTH-015`). Advanced Phone MFA is not required
  for citizens.
