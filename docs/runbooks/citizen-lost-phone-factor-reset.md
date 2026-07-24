# Citizen Lost-Phone Factor Reset

> **Superseded — do not use for the current citizen flow.** ADR-0033 replaced citizen Advanced
> Phone MFA factors with ordinary confirmed-phone Auth. Deleting an MFA factor does not change a
> linked `auth.users.phone`, and the AAL2/re-enrollment verification below is not applicable.
> Preserve this file only as the ADR-0028 historical procedure. Current lost-phone recovery remains
> a release blocker under `AUTH-015` and requires a separately reviewed support procedure.

## Purpose

Use this runbook only when a citizen has a verified Supabase Phone MFA factor but no longer
controls that phone. The mobile client intentionally provides no email-only bypass for this case.
This is an attributed administrator recovery action, not a normal support shortcut.

This runbook applies only to non-privileged citizen accounts. Government and platform
administrators follow the privileged-access recovery process.

## Roles and Separation of Duties

Each managed environment must map these roles to named people in the approved private operational
roster:

- **request owner** — receives the recovery request and opens the private case;
- **identity approver** — independently confirms the approved identity evidence;
- **Auth operator** — performs the Supabase factor deletion after approval;
- **audit reviewer** — verifies the evidence and closes the case.

The request owner and identity approver must be different people. The Auth operator must not approve
their own request. Never put citizen identity evidence, credentials, OTPs, recovery links, or
service-role values in source control or chat.

## Preconditions

Do not change Auth state until all of the following are true:

1. A private case has an immutable case ID, UTC request time, request owner, intended environment,
   and reason code `lost_phone_factor`.
2. The citizen has been identified by the exact Supabase Auth user UUID through an approved private
   account lookup. An email address or phone number alone is not sufficient.
3. The identity approver has recorded the environment's approved out-of-band evidence. Do not use
   an OTP sent to the lost phone, ask for a password, or ask the citizen to send a recovery token.
4. The account is a non-privileged citizen. Stop and escalate if any current government role,
   authority membership, platform role, administrative claim, or unresolved account dispute is
   present.
5. The citizen cannot use another verified phone factor. If one remains accessible, use the normal
   MFA challenge instead of deleting factors.
6. The factor ID selected for deletion and its `phone`/`verified` state have been independently
   reviewed. Do not select a factor from user-supplied text.
7. The identity approver has explicitly approved the exact user UUID and factor ID in the private
   case.

## Supported Supabase Operation

Run the operation only from approved server-side operator tooling with a server-only Supabase
credential. Never place a service-role key in a mobile/web client, command history, ticket, or log.

The tooling must first use:

```ts
const { data, error } = await supabase.auth.admin.mfa.listFactors({
  userId,
});
```

Select only the independently approved factor whose `factor_type` is `phone` and whose `status` is
`verified`. Then call:

```ts
const { data, error } = await supabase.auth.admin.mfa.deleteFactor({
  userId,
  id: factorId,
});
```

Treat any returned error, unexpected user/factor state, or ambiguous result as a failed operation.
Stop rather than trying a different factor. Supabase documents that deleting a verified factor
logs the user out of active sessions:

- [Supabase Auth Admin: deleteFactor](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor)
- [Supabase Auth sessions](https://supabase.com/docs/guides/auth/sessions)

Do not delete rows directly from the `auth` schema. Factor deletion is irreversible; recovery is
completed by enrolling a replacement factor, not by restoring the old row.

## Verification

The Auth operator must complete and record each check:

1. List factors again and confirm the approved factor ID is absent.
2. Confirm the provider operation appears in the managed Supabase Auth audit/log surface.
3. Confirm a previously authenticated device cannot use the protected JagrukSetu API. The API must
   reject a citizen without a current verified phone factor even if a short-lived access token has
   not reached its expiry time.
4. Tell the citizen to reopen the installed app and sign in with email/password, or use the normal
   generic recovery-email flow if the password is also forgotten.
5. Confirm the app requires enrolment of a replacement phone factor before private mobile/API
   access.
6. Confirm the replacement SMS challenge succeeds, the session reaches AAL2, and protected access
   is restored.
7. Confirm the removed factor cannot satisfy a later challenge and no password, OTP, recovery
   credential, full phone number, or bearer token appears in case evidence or application logs.

Do not close the case merely because the delete request returned success. Steps 1–7 are the
recovery evidence.

## Audit Record

The private case must retain:

- case ID and reason code;
- exact environment and Auth user UUID;
- request owner, identity approver, Auth operator, and audit reviewer;
- approval and execution UTC timestamps;
- approved factor ID and non-sensitive before/after factor states;
- provider request/audit identifier when available;
- old-session denial result;
- replacement-enrolment and AAL2 verification result;
- user communication UTC timestamps;
- exceptions, incident reference, and final disposition.

Do not store identity documents, passwords, OTPs, recovery URLs/tokens, service credentials, full
phone numbers, or raw access tokens in the audit record.

## Citizen Communication Template

Send only after the request is approved:

> We approved your JagrukSetu phone-security reset. Your previous verified phone factor has been
> removed and your active sessions were signed out. Reopen the official app, sign in with your
> email and password (or use Forgot password), then verify the replacement phone before accessing
> private features. We will never ask for your password or OTP. Reference: **[case ID]**.

If the operation fails, say only that the security reset was not completed and that support will
follow up through the approved channel. Do not disclose internal factor details.

## Failure and Escalation

- If identity evidence is incomplete or conflicting, deny the reset and keep the account unchanged.
- If the account is privileged, stop and use the privileged recovery process.
- If factor state changes between approval and execution, stop and obtain a new approval.
- If deletion succeeds but old protected access remains available, open a security incident and do
  not complete replacement enrolment until the authorization boundary is understood.
- If replacement SMS delivery fails, retain the case as recovery-pending; do not enable an
  email-only bypass.
- If sensitive values enter a log or ticket, handle it as a credential/privacy incident.

## Rehearsal and Release Gate

Before the external pilot, rehearse this runbook with a synthetic non-privileged citizen in managed
staging. The rehearsal must cover approval, factor discovery, exact deletion, old-session denial,
replacement enrolment, AAL2 access, provider audit evidence, and the communication template. Record
evidence privately and link only the non-sensitive case ID from the release checklist.
