# ADR-0021: Use Private Owner-Scoped Profile Images

## Status

Accepted

## Date

2026-07-16

## Context

Citizens need a profile image, but complaint transparency is anonymous and reviewed. A public
avatar bucket or a durable public URL would create an unnecessary identity-disclosure path and
could accidentally connect a citizen identity to locality reports.

## Decision

- Store profile images in the private Supabase Storage bucket `profile-images-private`.
- Allow only JPEG, PNG, and WebP images up to 5 MiB. Web and mobile validate declared type, size,
  and leading file signature before upload; Storage enforces the bucket limits.
- Use one deterministic owner path, `<auth-user-id>/avatar.<extension>`, protected by owner-only
  Storage RLS. Clients upload with their verified Supabase session and never receive a service key.
- Persist the current object path and a server-owned version timestamp on `public.profiles` through
  the authenticated API. PostgreSQL constrains the path to the same profile ID and refreshes the
  version even when an object is replaced at the same path.
- Display the image only through a short-lived signed URL after an owner/session check. Profile
  image metadata and URLs are excluded from public complaint and transparency projections.
- Keep original complaint media and profile images in separate buckets and lifecycles.

## Alternatives Considered

### Public avatar bucket

Rejected because the V1 product does not need public citizen identity and durable URLs make
correlation and scraping easier.

### Store image bytes in PostgreSQL

Rejected because Supabase Storage is the documented binary-object boundary and provides bounded
object delivery without expanding database rows.

### Reuse complaint-media storage

Rejected because complaint evidence has reservation, integrity, moderation, and retention rules
that are materially different from an owner-managed profile image.

## Consequences

- Signed image links expire and clients must refresh them.
- Failed metadata/object cleanup can leave a private orphan that must be handled by the broader
  scheduled Storage reconciliation work.
- V1 validates headers and limits but does not claim full image decoding or malware scanning.
- No public feed item can display the reporter's avatar without a future privacy ADR and reviewed
  publication model.

## Implementation Notes

- Keep bucket privacy, MIME limits, path constraints, API ownership checks, and Storage RLS covered
  by migration and client tests.
- Never place signed URLs, object paths, image bytes, or hashes in logs or notification payloads.

## Related Documents

- `docs/adr/0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md`
- `docs/adr/0016-use-reviewed-public-complaint-projections.md`
- `docs/database.md`
- `docs/authentication.md`
