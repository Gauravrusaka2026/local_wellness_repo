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
- Keep citizen Phone MFA in observe mode until an approved SMS provider and recovery/device tests
  are operational (`AUTH-010`).
