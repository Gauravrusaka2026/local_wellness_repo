# Implementation

## Owner Preview

The mobile Community screen starts a separate authenticated complaint-list request whenever the
screen gains focus. The request uses the existing actor-scoped `GET /api/v1/complaints` endpoint
and derives a preview containing the newest three complaints. A **View all** action opens the
complete My Complaints list, while selecting a card opens the authenticated complaint-detail route.

The preview is marked as an account view. Its explanatory copy makes the lifecycle explicit:
submission makes the report available to its owner immediately, while reviewed-public visibility
requires a later privacy review.

## Failure Isolation

Owned-report state is independent from the public Community request and the current-area location
flow. A citizen can therefore see their complaints when location permission is denied, GPS is
unavailable, no public projection exists, or the public feed reports an error. Empty, loading,
retryable error, and ready states are rendered within the owner section instead of replacing the
whole screen.

Focus-load cancellation prevents a stale completion from updating an inactive screen or a changed
Auth context.

## Privacy Boundary

The implementation reuses the private `ComplaintCard` model and never converts an owned complaint
to a public complaint DTO. Owner items are absent from Community maps, heatmaps, nearby and
trending lists, aggregate support counts, and support/star controls.

Public data continues to come only from current reviewed projections under ADR-0016. Engagement
continues to require an eligible reviewed-public projection under ADR-0024.

## Contracts and Persistence

No HTTP endpoint, DTO, database schema, index, RLS policy, Storage bucket, migration, Supabase
setting, or generated database type changed. The feature is a mobile presentation over an existing
authenticated, actor-scoped contract.
