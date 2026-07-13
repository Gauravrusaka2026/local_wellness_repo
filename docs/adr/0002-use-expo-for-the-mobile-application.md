# ADR-0002: Use Expo for the Mobile Application

## Status

Accepted

## Date

2026-07-11

## Context

The citizen mobile application requires a React Native foundation that can later support camera, location, secure storage, offline data, notifications, and managed Android and iOS builds.

## Decision

Use Expo with TypeScript and Expo Router for the citizen mobile application.

Phase 0 provides only the application shell, routing entry point, strict TypeScript configuration, and Android export validation. It does not implement screens, permissions, native capabilities, or product behavior.

## Alternatives Considered

- Bare React Native: offers direct native control but increases initial native project maintenance before it is needed.
- Separate native Android and iOS applications: provides maximum platform control at substantially higher implementation and coordination cost.
- A mobile web application only: cannot satisfy the documented native capture, location, notification, and offline requirements.

## Consequences

- Expo provides a consistent mobile toolchain and EAS-compatible project structure.
- Expo SDK compatibility constrains React and React Native versions.
- Native modules must be evaluated against Expo development builds before adoption.
- Platform-specific native customization may require prebuild configuration later.

## Implementation Notes

- `apps/mobile` is a private Expo Router workspace.
- The root route intentionally renders no product UI in Phase 0.
- CI disables Expo telemetry and verifies an Android export.
- Feature libraries and native capabilities are deferred to their implementation phases.

## Related Documents

- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/deployment.md`
