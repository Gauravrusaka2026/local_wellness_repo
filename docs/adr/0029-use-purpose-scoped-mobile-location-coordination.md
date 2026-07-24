# ADR-0029: Use Purpose-Scoped Mobile Location Coordination

## Status

Accepted

## Date

2026-07-23

## Context

The mobile client had no background watcher or periodic location task, but Community, Profile,
Nearby governance, complaint issue capture, and every live media capture independently requested a
native foreground position. Community duplicated the Expo Location integration, and every request
called the permission prompt API even when foreground permission was already granted.

Community, Profile, and Nearby need a recent approximate device context to discover local public
information. They do not need a new evidentiary fix each time the citizen moves between screens.
Complaint and live-media coordinates have a different trust purpose: V1 requires a current,
non-mocked, high-accuracy point and checks media proximity to the reported issue. Reusing an ambient
context position for evidence would weaken that boundary.

Persisting an exact location cache would create a new sensitive location-history surface. Periodic
or background polling would consume more battery and expand privacy scope without solving a V1
requirement.

## Decision

Use one mobile location boundary with two explicit acquisition purposes:

- **Current-area context** serves Community, Profile, and Nearby governance. It may reuse a
  non-mocked position no more than five minutes old and accurate to 100 metres or better. The
  coordinator checks its memory-only cache first, then Expo's bounded last-known position, and
  falls back to one balanced foreground acquisition. Identical concurrent requests share one
  in-flight promise. An explicit Refresh bypasses both caches.
- **Complaint evidence** serves the issue point and each photo, video, or voice capture. It always
  starts a fresh high-accuracy foreground acquisition and never reads the current-area or
  last-known cache. Existing five-minute age, 50-metre accuracy, mock-location, media-distance,
  API, and PostgreSQL checks remain authoritative. Distinct actions do not share an in-flight or
  completed evidence result.

The location boundary checks the current foreground-permission state before requesting permission,
uses foreground access only, and provides settings recovery after permanent denial. Automatic
feature entry may show the operating-system permission prompt at most once per application process.
If the citizen declines, later focus changes only show an explicit recovery action; they do not
prompt again. A citizen-initiated retry may request permission again when the operating system still
allows it. It creates no watcher, timer, background task, or persistent exact-coordinate store.

The current-area cache is cleared on sign-out or Auth user replacement. Clearing advances a
generation so a late native response cannot repopulate the cache for the next account. App
termination and normal memory pressure also discard it.

## Alternatives Considered

### Periodic foreground polling

Rejected because it continues acquiring coordinates when no feature needs them, increasing battery
use and privacy exposure.

### Background location tracking

Rejected because V1 has no background-location requirement. It would require broader operating
system permissions, disclosures, retention policy, store review, and a separate architectural
decision.

### Persist the latest exact coordinate in SQLite or SecureStore

Rejected because a cross-restart coordinate cache creates sensitive location history. The bounded
context benefit does not justify a new persistent-data surface.

### Reuse the context cache for complaint or media evidence

Rejected because cached context cannot prove that the citizen and media are currently near the
issue. Complaint evidence remains purpose-bound and fresh.

### Keep independent screen-level acquisition

Rejected because it repeats permission/native work, loses useful context on navigation, and allows
the location policies to drift between screens.

## Consequences

- Normal navigation between Community, Profile, and Nearby avoids repeated GPS fixes for five
  minutes.
- Automatic navigation cannot create a permission-prompt loop. After the one process-wide attempt,
  the citizen controls any later retry.
- Explicit Refresh still obtains a new current-area fix when the citizen has moved.
- Complaint and media security semantics do not change, so evidentiary actions can still invoke
  location more often than context browsing.
- Exact context coordinates exist only briefly in process memory and are not logged, persisted, or
  included in public projections.
- Native-device testing must verify cache reuse, movement plus forced refresh, sign-out/user
  replacement, permission changes, and fresh evidence behavior.
- No database migration, API route, Supabase setting, or background-location permission is added.

## Implementation Notes

- Keep the cache TTL and accuracy bounds named and tested.
- Reject malformed, future, mocked, stale, or inaccurate last-known positions before reuse.
- Query `getForegroundPermissionsAsync` first; call the request API only when permission is not
  already granted, the operating system permits another request, and the request is either the one
  permitted automatic attempt or an explicit citizen action.
- Do not expose whether a coordinate came from process memory in API payloads.
- Governance requests retain the existing strict latitude, longitude, accuracy, and capture-time
  DTO.
- Complaint evidence retains the complete device/provider/mock metadata required by the current
  complaint contract.

## Related Documents

- `docs/adr/0017-use-an-authenticated-verified-governance-directory-projection.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/database.md`
- `docs/worklogs/mobile-location-coordination/`
