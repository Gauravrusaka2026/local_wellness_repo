# Decisions

## Hierarchy

- Primary category and subcategory are selectable.
- Workflow type is derived from the subcategory and is read-only.
- A third issue-variant selector is deferred because taxonomy v1 defines no concrete variants.

## Routing

- Existing operational routing-profile identifiers remain stable.
- A database-owned mapping connects a taxonomy subcategory to an operational category.
- Thirteen taxonomy entries map to twelve existing operational profiles; 327 entries remain
  explicitly pending.
- Mobile never submits authority, ward, office, department, role, recipient or routing-rule IDs.
- Unmapped taxonomy selections may be retained in a draft but cannot be submitted.

## Detailed Registration

- Draft custom attributes retain the canonical primary code, subcategory code and workflow type.
- PostgreSQL validates the tuple together with the mapped operational category.
- Human labels remain catalog data rather than duplicated client input.
- The authenticated API exposes one public-safe taxonomy projection and caches a successful
  projection for 30 seconds; exact-coordinate routing and submission are never served from it.

## Corruption

- `COR` is protected and private by default.
- No Corruption subcategory falls back to the current ward-email matrix.
- Activation requires an independent oversight recipient, accused-chain exclusion and a reviewed
  confidentiality, evidence, retention and access-audit policy.
