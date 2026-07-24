# Testing

## Automated Coverage

The owner-preview helper coverage verifies:

- the newest three owned complaints are selected deterministically;
- the source API result is not mutated;
- private visibility is preserved;
- no public projection identifier is fabricated or required;
- API pagination is reflected in the preview's **View all** state;
- an empty owned-complaint result produces an empty preview.

Existing mobile suites continue to cover private complaint cards, complaint list/detail navigation,
reviewed-public Community behavior, and locality/location error states.

## Result

Local automated verification on 2026-07-23:

- `corepack pnpm --filter @local-wellness/mobile lint`: passed.
- `corepack pnpm --filter @local-wellness/mobile typecheck`: passed.
- `corepack pnpm --filter @local-wellness/mobile test`: 22/22 test files passed, including both
  owner-preview helper subtests.

## Physical-Device and Hosted Matrix

Before pilot release:

1. Submit a complaint, return directly to Community, and confirm it appears in **Your reports**
   without a manual application restart.
2. Deny location permission and confirm the owner preview still loads.
3. Simulate a public-feed failure and confirm owned complaints remain visible with only the public
   section showing its error.
4. Sign out and confirm the owner section and records disappear.
5. Sign in as a second synthetic citizen and confirm the first citizen's complaints never appear.
6. Open an owner card and confirm it routes to the authenticated private detail screen.
7. Confirm private owner cards never appear on the map or heatmap and expose no support or star
   actions.
8. Publish a sanitized projection through the reviewed process and confirm the public item remains
   distinct from the private owner card.
