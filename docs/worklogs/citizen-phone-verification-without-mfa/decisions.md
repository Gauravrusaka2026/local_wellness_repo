# Decisions

- Use ordinary Supabase Phone Auth rather than `auth.mfa.*` for citizens.
- Read confirmed-phone state from `auth.users` through a service-only boolean RPC.
- Keep citizen access at AAL1 and retain privileged TOTP/AAL2 independently.
- Use isolated, non-persistent Supabase clients for fresh password-change OTP sessions.
- Locally sign out a just-established isolated recovery session if reset-password navigation
  unmounts before the phone inspection/password flow completes.
- Require `shouldCreateUser: false` for password-change OTP delivery.
- Keep Phone Auth signup capability enabled because it gates existing-linked-phone OTP delivery,
  and reject actual phone-only user creation with the email-required Before User Created Auth Hook.
- Fail closed when recovery accounts lack an already confirmed phone.
- Retain legacy environment-variable names only as temporary compatibility inputs.
- Do not add an application OTP store, password endpoint or Twilio secret to the repository.
