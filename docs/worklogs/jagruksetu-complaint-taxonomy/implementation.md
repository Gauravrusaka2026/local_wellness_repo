# Implementation

## Reference Data

The Markdown taxonomy is the reviewed human source. A deterministic generator parses its primary
and subcategory rows, verifies expected totals and emits retry-safe SQL seed data. Stable UUIDs are
derived from canonical taxonomy codes.

The generator produces:

- migration `20260723120000_jagruksetu_complaint_taxonomy.sql`;
- generated seed `55_jagruksetu_complaint_taxonomy.generated.sql`;
- `supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql` for SQL Editor;
- a drift check that covers the source, migration, seed and deployment artifact.

## Database

The existing category table is extended rather than duplicated. Taxonomy rows identify their
purpose, stable code, workflow, sensitivity and optional operational routing-profile mapping. A
sanitized service-role RPC returns only mobile/API-safe fields.

Reserved taxonomy custom attributes are validated as one complete canonical tuple. Mapped choices
must use the database-owned operational category ID; pending/protected choices must not carry one.
Submission repeats that validation.

## API

The authenticated taxonomy endpoint validates the RPC shape, rejects inconsistent mappings and
uses the same bounded, process-local cache policy as the category catalog. It exposes no official
contact or assignment evidence. `GET /api/v1/routing/categories/taxonomy` caches only a successful
public-safe projection for 30 seconds and coalesces concurrent misses.

## Mobile

The single-page report form uses accessible modal dropdowns for primary and subcategory selection.
Changing a primary clears the previous subcategory, asset and operational category. Selecting a
subcategory saves its validated taxonomy tuple, displays the derived workflow/routing state and
uses a mapped operational category only when submission is available.

The second control is labelled **Subcategory / issue type**. Workflow type is derived and read-only
because the V1 source defines no concrete issue-variant rows.
