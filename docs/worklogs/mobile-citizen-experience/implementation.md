# Implementation

## Mobile Shell and Authentication

The root layout supplies the authenticated providers and safe-area boundary. A persistent bottom
navigation maps stable routes to Home, Complaints, central Report, Nearby, and More. More groups
secondary functionality without moving existing complaint/deep-link routes.

The auth screen selects email/password sign-in, create-account, or provider-managed password
recovery. Supabase Phone MFA is a separate staged verification factor; observe mode explains that it
is optional during SMS-provider rollout, while enforce mode requires the verified factor and AAL2.
The application never stores or delivers an OTP itself. Sessions remain in Expo SecureStore.

## Complaint Experience

Home aggregates the owner's complaint pages into total, active, action-needed, and resolved cards
plus recent complaints. The complaint list supports pull-to-refresh, filters, and cursor pagination.
Home reloads on route focus so returning from report/detail reflects current server state without
requiring a manual pull.

The Report flow keeps the existing server draft/private upload/routing/submission boundary while
rendering category-defined required attributes, minimum/maximum photo-or-video evidence, and media
recommendations. Its authenticated catalog lists every non-placeholder category with an explicit
server-derived availability flag. Unavailable categories are visible but disabled; resumed drafts,
asset discovery, readiness checks, and draft updates all continue to reject them. Attributes are
persisted in the draft rather than held only in UI state.

Expo Location, Camera, and Audio remain the device capability adapters. SQLite/SecureStore retain
only the existing allow-listed resume evidence. Voice evidence does not satisfy a database
photo/video minimum. Missing or non-operational categories and routes remain explicit unavailable
states.

Permanent camera, microphone, or location denial offers an OS-settings route and rechecks the
app-visible permission after returning. Photo/video/voice flows obtain location before generating
the derived prepared upload file, avoiding a prepared-file orphan when location fails. Voice
processing tracks the completed URI so React effect/callback changes cannot process the same
recording twice.

The protected resume record retains an exact submission identity through ambiguous network
failures. Successful category/details/location/asset/media/duplicate mutations and explicit
route-unavailable/unsupported outcomes rotate it, preventing a later retry from replaying stale
routing evidence. The API returns `COMPLAINT_ROUTE_UNAVAILABLE` for that terminal state while
generic dependency failures keep a generic service-unavailable presentation.

## Verified Governance Directory

`POST /api/v1/governance/bodies/resolve` bearer-authenticates the citizen and rejects location
accuracy worse than 100 metres. A service-role-only PostgreSQL function reuses the accuracy-aware
PostGIS resolver and admits only current verified, routing-eligible, non-placeholder entities and
active official provenance for every matched entity/boundary.

Strict shared schemas expose entity kind/name/type, verification date, and official source URL.
They exclude internal IDs, coordinates/geometry, officers, contact channels, office details, and
routing evidence. Zero/multiple results remain unsupported/ambiguous. The mobile Nearby screen
links the returned provenance and never hardcodes Pune, Mumbai, a ward, or a fallback authority.

## Profile Camera and Current Civic Area

The profile offers separate **Take photo** and **Choose from library** actions. Expo Camera and
media-library permissions are requested only for the selected action, permanent denial offers an
OS-settings recovery path, and both results reuse the existing private profile-image validation,
owner upload, metadata update, and short-lived signed preview.

The current-area card requests a one-time high-accuracy foreground location and calls the verified
governance resolver. It holds only the derived ward/local-body/authority labels, verification date,
and official source URL in component memory. It persists no exact profile coordinate or street
address and keeps low-accuracy, ambiguous, and unsupported results explicit.

## Configuration and Notifications

The root `.env` is the single local environment source. Mobile startup checks detectable Supabase
URL/key project alignment and rejects loopback API/realtime URLs on native devices without echoing
values. Physical Expo Go testing must inject a LAN-reachable service URL.

No `expo-notifications` dependency or OS push-token registration was added. Expo/EAS ownership,
FCM/APNs credentials, consent/preferences, verified destinations, templates, and retry/fallback
policy are required before that channel can be implemented.
