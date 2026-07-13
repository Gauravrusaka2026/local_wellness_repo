# Phase 1 Open Issues

## Hosted Environment Activation

Separate development, staging and production Supabase projects, provider credentials, redirect URLs and rate limits remain owner-managed operational inputs. Local Auth behavior is testable without those credentials.

## Security Remediation

Previously exposed Supabase, database and Redis credentials still require owner rotation and audit-log review before hosted integration. Redis remains deferred, but its old token must still be revoked.

## Manual Validation

Real SMS/email delivery, deep links in an Expo development build, OS SecureStore behavior and browser callback URLs require environment/device smoke testing before pilot release.

## Existing-Account Access Assignment

The Phase 1 invitation endpoint creates a new Supabase Auth user and returns a non-enumerating conflict for an existing email. Promoting an existing citizen, adding another authority, or assigning another role requires a dedicated server-authorized access-management flow that preserves membership and role history. In addition, authorization correctly ignores rows after `effective_until`, but no lifecycle operation transitions their stored status to `expired`; the partial unique indexes can therefore block renewal while the old row still says `active`. Explicit expire/renew/revoke operations remain necessary before broader government onboarding.

## Device Session Enforcement

Soft device revocation blocks re-registration of the same installation identifier and clears its push token, but it does not revoke or device-bind an already-issued Supabase session. Provider-side session revocation and device-bound checks remain pre-launch hardening.

## Abuse Controls

Client-reported session audit ingestion and distinct device registration are authenticated but do not yet have an application quota, deduplication window or endpoint rate limit. Because both append immutable rows, a valid account can amplify storage. Phase 10 hardening must add PostgreSQL/platform-backed limits and abuse monitoring without introducing the V1-deferred Redis dependency.

## Phase 2 Relationship

Authority UUIDs cannot receive a governance foreign key until Phase 2 defines the canonical authority table. Phase 2 must add that key through a forward migration and provide pilot authority data.

## Privileged Access Hardening

The data model is MFA-ready, but mandatory assurance-level checks for privileged operations remain a pre-launch hardening task.
