# Open Issues

## Physical-Device Location Validation

**Priority:** P0 before pilot release

Node tests can prove policy, cache, permission, and concurrency behavior through an injected adapter,
but cannot prove native GPS latency, operating-system last-known behavior, movement across a ward
boundary, permission UI, or vendor battery indicators. Complete the matrix in
[testing.md](testing.md) on managed Android and iOS builds.

## Background Location

**Status:** Deliberately out of scope

The app has no V1 reason to track citizens in the background. Do not add background permission,
watchers, timers, or persisted location history without a new owner-approved requirement, privacy
review, store disclosure, and ADR.
