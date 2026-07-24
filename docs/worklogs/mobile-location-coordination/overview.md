# Mobile Location Coordination

## Status

Implemented and automatically validated locally on 2026-07-23. Managed physical-device validation
remains a release gate.

## Objective

Stop repeated non-evidentiary GPS work while preserving the stronger location rules used to submit
complaints and attach live media.

## Scope

- Share a bounded, memory-only current-area position across Community, Profile, and Nearby.
- Check existing foreground permission before requesting it again.
- Coalesce identical concurrent requests.
- Let explicit Refresh bypass the context cache.
- Keep issue and media evidence on fresh high-accuracy acquisitions.
- Clear current-area state across Auth identity transitions.
- Add no watcher, timer, background location, or persisted coordinate history.

## Decision

The complete architecture and privacy boundary is recorded in
[ADR-0029](../../adr/0029-use-purpose-scoped-mobile-location-coordination.md).

## Release State

This slice changes only the mobile acquisition strategy. It does not change location API payloads,
database evidence, routing, or public precision. See [testing.md](testing.md) for validation and
[open-issues.md](open-issues.md) for the remaining device gate.
