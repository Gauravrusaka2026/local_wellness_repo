# Testing

## Automated

- API test suite: passed.
- Mobile: 141/141 tests passed, including unknown-outcome classification; strict type-check and
  lint passed.
- Workers: 30/30 tests passed; strict type-check, lint, and build passed.

## Hosted-Staging Smoke

- Confirmed the complaint exists, is submitted, and resolved through the K/W V1 route.
- Verified the expected K/W ward-recipient mapping.
- Verified SMTP authentication without sending a probe message.
- Ran bounded one-row sends until the current complaint was processed.
- Persisted provider message IDs through the lease-checked completion RPC.

## Not Proven

- Recipient inbox placement or reading.
- Bounce/dead-letter and quota/abuse behavior.
- Continuously supervised hosted worker deployment.
- Physical-device resubmission after the response-contract fix.
