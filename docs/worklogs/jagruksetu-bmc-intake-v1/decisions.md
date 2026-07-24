# Decisions

## Ordinary intake

- Preserve the thirteen specialised taxonomy mappings.
- Reuse one general operational profile for the other 243 public/restricted leaves.
- Reuse the current 26 owner-approved ward recipients and provenance rather than copying contact
  values into application source.
- Continue deriving the ward and official assignment on the server from captured location.
- Require profile, domain, rule/version, and complete ward-contact readiness before the catalog
  advertises submission.

## Protected intake

- Classify every private/emergency-private leaf as `protected_handoff`.
- Allow only digits-only telephone and credential-free HTTPS actions.
- Keep the action registry private and expose only its sanitized projection through the trusted
  taxonomy RPC.
- Do not create ordinary complaint, outbox, Community, or result records for a protected handoff.
- Prefer an exact subcategory action over a duplicate primary action.

## Data and size

- Keep the canonical Maharashtra CSVs/workbook and supplied BMC archives read-only.
- Generate a versioned overlay, 340-row crosswalk, validation report, manifest, seed, and SQL
  Editor deployment.
- Add one protected-action table; the current application table count is therefore 115 after the
  earlier 129-to-114 prune.
