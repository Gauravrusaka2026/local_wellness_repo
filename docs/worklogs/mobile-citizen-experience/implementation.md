# Implementation

## Mobile Shell and Authentication

The root layout supplies the authenticated providers and safe-area boundary. A persistent bottom
navigation maps stable routes to Home, Complaints, central Report, Community, and More. More groups
verified governance/Nearby and other secondary functionality without moving existing complaint/
deep-link routes. Visible cards/actions use concise labels; accessibility and state-specific help
retain the detail removed from repeated screen copy.

The auth screen selects email/password sign-in, create-account, or provider-managed password
recovery. Ordinary Supabase Phone Auth confirms the same user's phone after password entry; a
resend cooldown and escalating guidance prevent repeated sends. Fresh SMS is also required before
supported password changes. This citizen flow does not require Advanced Phone MFA or AAL2, while
privileged portal TOTP remains unchanged. The application never stores or delivers an OTP itself.
Sessions remain in Expo SecureStore.

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

The previous six-screen presentation is now one scrollable form. Category/details, location and
optional asset, evidence, similar-report review, and final submission remain visually separate
sections, but they do not require Back/Continue navigation. The persisted step still supports safe
resume and duplicate reloading internally. A pure readiness projection shows unsaved details,
location, asset, media, upload, duplicate, voice, emergency, and offline blockers immediately above
the only final submit action. Ward resolution is explained separately from category-specific route
availability; neither the UI nor the helper can promote database evidence. Server-mutating controls
are disabled during an in-flight draft request so the one-page layout cannot create overlapping
updates; an active recording can still be stopped safely.

The current presentation uses primary and subcategory dropdowns, debounced server autosave,
automatic complaint-location acquisition after a submit-capable category is selected, automatic
duplicate checking when prerequisites are ready, one combined evidence launcher, and a sticky
submit area. A committed receipt routes to an explicit success view; attributed failures route to
a failure view; ambiguous transport/decoding outcomes route to an unknown-state view that directs
the citizen to owner complaints before retry.

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

Community, Nearby, and Profile now use the same current-area coordinator. It reuses only a
non-mocked, at-most-100-metre fix for five minutes, coalesces identical concurrent work, consults a
bounded OS last-known fix, and keeps exact coordinates in memory only. Automatic feature entry may
show the native permission dialog once per process; later recovery is citizen-initiated. Complaint
and media evidence never use this cache and always request a fresh high-accuracy fix.

## Reviewed-Public Community

Community reuses the reviewed transparency projection through three compact modes. Local uses
recent ordering inside the selected viewport, Trending orders live aggregate support followed by
publication time/public ID, and Heat renders minimum-cohort hotspot aggregates without a basemap or
third-party coordinate transfer. Authenticated lookup restores only the current account's support
and star state; mutation sets those booleans idempotently for a current reviewed public ID. No
supporter identity, avatar, exact location, original media, or private complaint data is rendered.
Withdrawal removes the current surface, and support/star never changes official complaint state.

The screen loads owner reports independently of location and reviewed-public state, virtualises
report lists, and requests Heat aggregates only when Heat is selected. The owner preview uses the
existing authenticated complaint endpoint and never creates a public projection.

## Civic-Area Offices and Localisation

The governance resolver optionally returns at most 25 verified exact-ward and explicitly scoped
municipality-wide offices. The strict response omits null fields and exposes only public
name/type/address/phone/email, verification date, and official HTTPS source. Mobile hides missing
actions, validates phone/mail targets, opens sources in Expo's in-app browser, and ignores stale
responses after blur, identity change, or a newer lookup.

Core authenticated screens consume the typed localisation provider for English, Marathi, and
Hindi. The locale is restored from protected local preferences, updated immediately after a
successful profile-language save, and used for dates/status copy. Official entity names and
server-originated messages remain data rather than client translations.

Compact mobile tokens define a restrained civic palette, smaller type scale, subtle surfaces and
filled code-native icons. The bottom navigation is a detached capsule with five stable
destinations, while visible instructions are kept short and detailed guidance remains contextual
or accessible.

## Configuration and Notifications

The root `.env` is the single local environment source. Mobile startup checks detectable Supabase
URL/key project alignment and rejects loopback API/realtime URLs on native devices without echoing
values. Physical Expo Go testing must inject a LAN-reachable service URL.

No `expo-notifications` dependency or OS push-token registration was added. Expo/EAS ownership,
FCM/APNs credentials, consent/preferences, verified destinations, templates, and retry/fallback
policy are required before that channel can be implemented. Existing in-app notification entry
points use a bell glyph rather than a generic dot.
