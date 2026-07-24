# Open Issues

## Physical-Device Focus Refresh

**Priority:** P0 before pilot release

Automated tests verify preview selection and contract boundaries but cannot prove Expo Router focus
timing after a real complaint submission, background/resume behavior, or native navigation state.
Complete the device matrix in [testing.md](testing.md) on managed Android and iOS builds.

## Hosted Actor Isolation

**Priority:** P0 before pilot release

Run the hosted smoke matrix with two synthetic citizens. Confirm that `GET /api/v1/complaints`
returns only the authenticated actor's records and that sign-out/account replacement cannot leave a
prior account's preview visible.

## Reviewed-Public Publication

**Status:** Deliberately separate

The owner preview does not activate complaint publication. Private reports remain absent from
nearby, trending, maps, heatmaps, support, and star behavior until a sanitized reviewed projection
is approved under ADR-0016. Do not add an automatic submission-to-publication path without a new
privacy decision and ADR.
