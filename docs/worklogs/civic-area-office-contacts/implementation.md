# Implementation

## Database

`20260724120000_verified_civic_area_office_contacts.sql` adds a partial office-scope index and
replaces the existing service-role projection body. The relational function signature remains
unchanged. A correlated, bounded office subquery emits sanitized JSON and never joins the private
ward issue-contact matrix. An exact ward match includes exact-ward offices and wardless offices
explicitly scoped to the resolved local body.

The SQL Editor deployment file is byte-for-byte identical to the migration and is safe to rerun
because the index uses `if not exists` and the function uses `create or replace`.

## API and Contracts

The shared contract adds `VerifiedCivicAreaOffice` and an optional `offices` collection. The strict
validator permits only the approved fields. `SupabaseGovernanceDirectoryStore` continues to use
only the service-role RPC and normalizes an absent collection to an empty array.

## Mobile

The directory is named “Your civic area”. It starts the lookup automatically with the shared,
focus-aware current-area coordinator. Explicit force refresh and settings links are recovery
actions. Request generations and account/focus checks prevent late responses from replacing current
screen state. Verified office cards omit unavailable fields and offer:

- a safe dialler target derived from the first published number;
- a schema-validated mail target;
- an HTTPS source opened in Expo's in-app browser.

The schematic area panel remains first-party and does not imply office distance or directions.
