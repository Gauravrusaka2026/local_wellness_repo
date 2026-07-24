# Community Owned-Report Visibility

## Status

Implemented and automatically validated locally on 2026-07-23. Physical-device and hosted
actor-isolation validation remain release gates.

## Objective

Let a signed-in citizen find their newly submitted complaints from Community immediately without
publishing private complaint data or weakening the reviewed-public projection boundary.

## Scope

- Add a separate **Your reports** account view to Community.
- Read only the signed-in actor's existing complaint list.
- Show the newest three owned complaints with a link to the complete list.
- Refresh owned reports when Community gains focus.
- Keep owner loading independent of location and reviewed-public Community loading.
- Keep private owner items out of maps, heatmaps, trending, support, and star behavior.
- Add no API, database, migration, RLS, or Supabase configuration change.

## Decision

The complete privacy and presentation boundary is recorded in
[ADR-0030](../../adr/0030-show-owner-private-reports-in-community.md).

## Release State

The mobile screen now distinguishes immediate private account history from reviewed-public locality
content. Publication review, public projection, withdrawal, and engagement behavior remain
unchanged. See [testing.md](testing.md) for automated results and [open-issues.md](open-issues.md)
for the remaining release checks.
