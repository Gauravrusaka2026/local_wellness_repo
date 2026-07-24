# Testing

## Automated Coverage

The implementation covers:

- deterministic parsing of 17 primaries and 340 unique subcategories;
- corruption privacy and no-routing invariants;
- stable mapping of the supported taxonomy subset to existing operational categories;
- RPC shape, access control and absence of official contact fields;
- complete/valid custom-attribute tuples and rejection of tampered or partial tuples;
- submission revalidation and fail-closed pending/protected categories;
- API decoding, cache and malformed-row rejection;
- mobile hierarchy projection, dropdown selection, upstream clearing and draft resume;
- preservation of all existing operational category IDs and BMC ward-contact rows.

## Result

- A clean local database run applied the complete current migration/seed history.
- All 47 pgTAP files passed 1,589 assertions, including the 51st taxonomy plan.
- The deterministic generator and deployment-artifact drift checks passed.
- Focused API verification passed 50 tests.
- Focused mobile taxonomy/client verification passed all four selected test files.
- Database lint, generated database types and master-migration checks passed as part of the
  integrated verification.

Hosted Supabase was not changed. Physical-device dropdown, long-label, screen-reader and
draft-resume checks remain release work rather than automated-test claims.
