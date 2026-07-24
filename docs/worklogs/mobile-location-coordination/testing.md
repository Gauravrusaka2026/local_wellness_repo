# Testing

## Automated Coverage

The focused coordinator suite must verify:

- no native location request while idle;
- current-area memory reuse inside the TTL;
- stale, inaccurate, future, malformed, and mocked cache rejection;
- bounded Expo last-known reuse for current-area context only;
- one in-flight native request for concurrent context calls;
- explicit Refresh bypass;
- no repeated permission request after permission is granted;
- disabled-service and permanent-denial errors;
- fresh high-accuracy complaint evidence on sequential and simultaneous calls;
- no current-area/last-known reuse for complaint evidence;
- cache invalidation and protection from late completion after Auth reset.

Existing complaint tests continue to verify five-minute evidence age, 50-metre accuracy,
mock-location rejection, and 50-metre media-to-issue proximity.

## Physical-Device Matrix

Before pilot release, verify on representative Android and iOS devices:

1. Open Community, then Nearby, then Profile inside five minutes; only the first action should start
   a native current-area acquisition.
2. Tap explicit Refresh after moving across a known boundary and confirm the new area is resolved.
3. Disable and re-enable foreground location permission and verify the recovery copy/settings path.
4. Turn location services off and confirm the app fails without starting a native fix.
5. Sign out, sign in as another synthetic citizen, and confirm no prior area result is reused.
6. Start a complaint and capture issue location plus photo/video/voice evidence; each sequential
   evidentiary action must obtain a fresh high-accuracy point.
7. Background and resume the app beyond the context TTL and confirm a new area acquisition occurs.
8. Inspect device logs and local stores to confirm exact context coordinates are absent.

## Result

Local automated verification on 2026-07-23:

- `node --import tsx test/location-coordinator.test.ts` from `apps/mobile`: 14/14 subtests passed.
- `corepack pnpm --filter @local-wellness/mobile typecheck`: passed.
- `corepack pnpm --filter @local-wellness/mobile lint`: passed.
- `corepack pnpm --filter @local-wellness/mobile test`: 21/21 test files passed.
- `corepack pnpm format:check`: passed.
- `corepack pnpm lint`: all 16 workspace packages passed.
- `corepack pnpm typecheck`: all 16 workspace packages plus the root reference build passed.
- `corepack pnpm test`: all workspace test tasks passed; the root Node suite passed 72 tests with
  three provider-gated cases skipped.
- `corepack pnpm build`: all 16 workspace packages passed, including the 1,289-module Android Expo
  export.
- `corepack pnpm security:secrets`: passed across tracked files and local Git history.
- `git diff --check`: passed.

The physical-device matrix remains open and is not implied by these adapter-level, workspace, and
bundle checks.
