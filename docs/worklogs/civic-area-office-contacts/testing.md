# Testing

## Results

- `@local-wellness/types` type-check: passed.
- `@local-wellness/validation` tests: 61 passed; type-check passed.
- Focused API governance controller/store tests: 9 passed; API type-check passed.
- Focused mobile governance service tests: 5 passed, including stale lookup rejection after blur,
  account change, or a newer request.
- Focused ESLint for the changed types, validation, API, and mobile files: passed with zero
  warnings.
- Migration applied directly to the running local Supabase PostgreSQL instance with
  `ON_ERROR_STOP=1`: passed.
- `055_verified_civic_area_office_contacts.test.sql`: 15 pgTAP assertions passed. The test
  transaction rolled back its synthetic fixtures.
- Database lint across `public`, `private`, `governance`, `routing`, and `complaints`: passed with no
  schema errors.
- Generated database type check: passed.
- The SQL Editor deployment artifact is byte-for-byte identical to the migration.

## Coordinating-Session Verification

- A full repository Supabase reset and complete pgTAP suite remain with the coordinating session so
  concurrent migration work is applied from one stable filesystem snapshot.
- The full mobile type-check was attempted. It reached this slice successfully but was blocked by
  unrelated translation keys being added by another active mobile workstream. Focused mobile lint
  and tests for this slice pass.
