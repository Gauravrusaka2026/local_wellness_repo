# Testing

## Automated coverage

Coverage includes:

- deterministic classification of all 340 taxonomy leaves;
- exact 13 specialised, 243 general, and 84 protected counts;
- source and generated-artifact drift detection;
- no email or unsupported URI scheme in public handoff data;
- forced-RLS action storage and sanitized RPC output;
- protected taxonomy and routing-profile isolation;
- complete profile/rule/version/contact submission readiness;
- taxonomy-aware owner, government, and email display labels;
- strict API/mobile action decoding;
- safe dialler and in-app-browser launch behavior; and
- suppression of normal complaint capture/submission for protected handoffs.

## Result

- Clean local Supabase reset: passed.
- Focused pgTAP plan 054: 33/33 passed.
- Full database suite: 50 files and 1,640/1,640 assertions passed.
- Application-schema database lint: no errors. An additional all-schema inspection reported only
  pre-existing PostGIS extension-body false positives and no project-function error.
- Intake generator: 6/6 tests, drift check, ESLint and Prettier passed.
- Focused API verification: 51 tests passed.
- Focused mobile taxonomy/handoff verification: 16 tests passed.
- Full API suite: 234/234 passed.
- Full mobile suite: 143/143 passed.
- Shared types, API and mobile type-check/lint passed.
- Master migration, generated database types and intake deployment drift checks passed.
- Tracked-file and available Git-history secret scan passed.
