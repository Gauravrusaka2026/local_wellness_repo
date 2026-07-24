# Implementation

## Sign-In and Enrollment Flow

1. The citizen signs in or creates an account with email and password through Supabase Auth.
2. The authentication provider inspects the current assurance level and phone factors.
3. If no verified phone factor exists, the citizen enrolls a phone number and verifies the SMS OTP.
4. If a verified factor exists but the session is AAL1, the newest verified phone factor is challenged.
5. A successful verification upgrades the session to AAL2 and protected navigation becomes
   available without waiting for non-critical audit delivery.
6. The handled best-effort `otp_verified` request may complete later and cannot hold the verified
   screen in a loading state.
7. In `enforce` mode, an AAL1 session cannot enter private citizen routes or use protected API
   endpoints.

## Signed-In Password Change

1. The profile screen opens the dedicated change-password route.
2. The app loads the current user and newest verified phone factor.
3. It sends a fresh challenge and verifies the submitted OTP.
4. Verification creates a user-and-factor-bound proof in component state.
5. The password form is available for five minutes.
6. Submission revalidates the proof and confirms that the same factor still exists.
7. Immediately before the provider mutation, the app confirms that the current Supabase
   authenticator assurance is still AAL2 and re-reads the current session user.
8. Supabase Auth updates the password.
9. The app immediately starts global sign-out, falling back to local sign-out if the global request fails or rejects.
10. After revocation has been attempted, the app gives the best-effort `password_changed` audit delivery no more than two seconds to settle. Late rejection remains handled.
11. The app returns the global result or the explicit local-only revocation warning.

## Password Recovery

1. The app requests a Supabase recovery email with the allowlisted mobile callback.
2. The callback establishes a session from a single reviewed recovery credential.
3. The app lists phone factors:
   - With a verified factor, a fresh OTP challenge is required before the password form appears.
   - With no factor, the temporary legacy fallback displays the password form and rechecks that the factor list is still empty at submission.
4. A registered but inaccessible factor stops the flow and presents the administrator-reset guidance.
5. A successful update follows the same immediate global/local sign-out and bounded-audit sequence as the signed-in flow. The deliberate zero-factor branch remains AAL1 and does not run the phone-proof AAL2 check.
6. A zero-factor account remains blocked by normal MFA enforcement at the next sign-in until phone enrollment succeeds.

## Error and Retry Behaviour

- Wrong, expired, throttled, and malformed OTP cases are translated into concise user-facing errors.
- Managed Supabase Auth error codes are translated before legacy message matching:
  - `mfa_phone_enroll_not_enabled` identifies disabled Advanced Phone MFA enrollment;
  - `mfa_phone_verify_not_enabled` identifies disabled phone-factor verification;
  - `sms_send_failed` identifies an enabled MFA flow whose provider could not send the SMS.
- The resend action displays the remaining cooldown and cannot run early.
- Expired local phone proof returns the user to verification instead of submitting a stale password update.
- Auth forms and OTP/password mutations prevent parallel submissions.
- Global revocation failure is a partial-success state, not an invalid-response or false failure state.

## Main Code Areas

- `apps/mobile/app/auth/index.tsx`: email/password entry, successful-auth continuation, and partial-success feedback.
- `apps/mobile/app/auth/phone-verification.tsx`: enrollment/challenge experience and resend handling.
- `apps/mobile/app/auth/change-password.tsx`: signed-in step-up password change.
- `apps/mobile/app/auth/reset-password.tsx`: recovery callback branching and password update.
- `apps/mobile/src/auth/password-auth.ts`: recovery credential review, temporary proof validation, password update, audit, and sign-out.
- `apps/mobile/src/auth/phone-mfa.ts`: verified-factor selection, challenge, verification, and OTP audit.
- `apps/mobile/src/auth/password-phone-challenge.tsx`: reusable OTP challenge UI.
- `apps/mobile/src/auth/otp-challenge.ts`: resend timing utilities.
- `apps/api/src/auth/legacy-password-change-audit.ts`: exact-request marker and predicate for the zero-factor audit exception.
- `apps/api/src/auth/bearer-auth.guard.ts`: enforcement of the narrow zero-factor audit condition.

## Data and Logging

Passwords, OTP values, recovery tokens, and temporary proof values are not written to application logs or persistent client storage. Audit events record event identity and authenticated subject through the existing server audit service.
