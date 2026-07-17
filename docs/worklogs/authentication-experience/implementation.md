# Implementation

Citizen Web now identifies an existing session, retains the selected email through sign-in and
recovery, distinguishes authenticated signup from confirmation-pending signup, reports actual Phone
MFA factor state, and offers explicit account switching.

Government Dashboard and Admin Console show the verified email on MFA, success, denied, and error
states. Privileged copy explains the three gates: Auth identity, that user's own TOTP/AAL2, and
current authority membership/scoped role. A QR is rendered only when enrolling a new factor.

The Admin Console obtains invitation choices from
`GET /api/v1/admin/government-invitations/options`. The API reauthorizes the active administrator,
filters municipal administrators to their authority, and strictly decodes a service-role-only
database projection. Only active, verified, non-placeholder, routing-eligible authorities, wards,
and authority departments are eligible. Operators select names; opaque IDs remain transport values.

A stale ignored Citizen Web `.env.local` was also removed after it was found to target a different
Supabase project than the root API configuration. The API, mobile, and three web portal package
scripts now load the repository-root `.env`; explicitly injected shell/deployment values take
precedence, app-local environment files fail fast, and a missing local file remains valid for
CI/deployments. Turbo build inputs include the root file and public client variables to prevent
reuse of a bundle compiled for another project.
