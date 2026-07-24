# Decisions

## Authentication Model

- Email plus password remains the primary citizen credential.
- A verified Supabase phone factor and an AAL2 session are required before private citizen routes and protected API access.
- Phone verification is MFA, not a replacement for the email/password account.
- TOTP factors do not satisfy the citizen phone-verification requirement.

## Password Change

- Every password update requires a fresh phone OTP challenge, including when the session is already AAL2.
- Phone verification creates an app-local proof with an exact five-minute lifetime.
- The proof is bound to the authenticated user and verified factor. Before updating the password, the app rechecks the current session, proof lifetime, user identity, and presence of that factor.
- The current Supabase authenticator assurance is checked again immediately before `updateUser`. It must still be AAL2, preventing a same-user AAL1 session replacement from consuming a valid-looking proof.
- The proof exists only in React state and is never written to device storage or sent to the application API.
- Supabase Auth performs the password update directly. The application API never transports or processes the plaintext password.

## Recovery

- Recovery callbacks accept exactly one of:
  - a Supabase PKCE `code`; or
  - a `token_hash` whose type is `recovery`.
- Provider errors, arrays, whitespace-altered values, overlong values, missing credentials, and mixed credentials are rejected.
- If the recovered account already has a phone factor, recovery email ownership does not bypass it. A fresh phone OTP is mandatory.
- If no phone factor exists, the email recovery session may update the password once. The absence of a factor is checked again immediately before the update.
- If a factor exists but the phone is unavailable, the user must use the administrator-assisted factor-reset process. There is no client-side bypass.

## Session Revocation

- A successful password update requests Supabase global sign-out to revoke refresh-token families on other devices.
- If global sign-out fails, local sign-out is attempted and the result explicitly warns that global revocation was not confirmed.
- The application never reports the password change as failed after Supabase has already accepted it.

## Auditing

- Successful phone verification records `otp_verified`.
- A successful provider password update starts global revocation immediately, with local sign-out as the failure fallback, before waiting on audit delivery.
- `password_changed` delivery is bounded to two seconds. Synchronous errors, rejected promises, and rejections that arrive after the deadline are contained, so audit delivery cannot prevent revocation or create an unhandled promise.
- Audit writes are best effort so an observability outage cannot turn an already-completed identity-provider action into a misleading failure.
- Audit requests contain the fixed event type only; OTPs, passwords, proof objects, and recovery credentials are excluded.
- The legacy zero-factor recovery path originally exposed an AAL1 audit gap because normal API access requires phone MFA. The integrated API change closes that gap with a narrowly decorated exception that permits only an exact `{ "eventType": "password_changed" }` request for an AAL1 citizen who has no verified phone factor. It does not apply to privileged users, users who already have a factor, expanded payloads, or other audit events, and it preserves bearer validation and rate limiting.

## Resend and Submission Controls

- OTP resend uses a 30-second client cooldown in addition to Supabase/Twilio server-side controls.
- Authentication, OTP, and password submissions use synchronous in-flight guards so rapid taps cannot start parallel mutations before the next render.

## External Links

- Mobile external URLs are routed through the shared Expo in-app browser adapter.
- Only validated `http` and `https` URLs may be opened; local application routes remain in Expo Router.
