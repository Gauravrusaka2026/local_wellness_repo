# Implementation

## Coordinator

`apps/mobile/src/location/location-coordinator.ts` owns the policy through an injected native
adapter:

- `getCurrentAreaLocation()` checks services and existing foreground permission, reuses an eligible
  memory or operating-system last-known fix, coalesces concurrent reads, and falls back to a
  balanced native acquisition;
- `{ forceRefresh: true }` skips both reusable location sources;
- `captureComplaintEvidenceLocation()` always requests a fresh high-accuracy native fix, applies
  the existing complaint evidence assessment, and never shares a result across evidence actions;
- `clearCurrentAreaCache()` removes memory state and advances a generation so late completion
  cannot repopulate it.

`apps/mobile/src/location/device-location.ts` is the only Expo Location adapter. Community,
Profile, and Nearby consume the current-area API; complaint issue/photo/video/voice capture consume
the evidence API.

## Identity and Privacy

The Auth provider clears current-area state whenever the derived signed-in user ID changes,
including sign-out. Exact context coordinates remain process memory only. There is no
`watchPositionAsync`, timer, background permission, SecureStore/SQLite location cache, or telemetry
event.

## Contracts and Persistence

The governance request remains the existing strict four-field
`ResolveJurisdictionRequest`. Complaint evidence retains the existing
`ComplaintLocationCapture`. No HTTP endpoint, database schema, RLS policy, Storage bucket, migration,
Supabase setting, or generated database type changed for this feature.
