# Maharashtra Batch 0 Intake Decisions

## Preserve the ZIP as the Immutable Source Artifact

The supplied ZIP is retained unchanged and identified by its SHA-256. The import ledger records the archive plus every safe member rather than rewriting the archive into the canonical Phase 2 CSV dataset.

## Support Source-Bundle-Backed Import Batches

`governance.import_batches` accepts a `source_bundle_sha256` for an immutable archive-backed intake. A batch must identify at least one immutable source artifact through either `workbook_sha256` or `source_bundle_sha256`; a fabricated workbook hash is not used for this ZIP.

## Permit Only Exact Hierarchy Enrichment

Automatic reconciliation is limited to exact normalized-name matches against the existing canonical Maharashtra hierarchy. The seed fills only missing LGD codes and preserves existing verification, provenance, and routing eligibility.

## Quarantine Ambiguous Mumbai Identity

The source `district:lgd:482` is named `Mumbai`, while the existing canonical record is `Mumbai City`. It is stored as `reference_only` with `AMBIGUOUS_CANONICAL_NAME` and receives no normalized record identifier. A reviewed alias or official identity crosswalk is required before enrichment.

## Keep Operational Records Non-Promotable

All operational CSVs in this batch are empty. Batch 0 cannot create or promote operational entities, routing rules, routing eligibility, external complaint delivery, or synchronization endpoints.

## Redact Transient Security Tokens

Transient `OWASP_CSRFTOKEN` query values are removed from generated source URLs and raw payloads. The ledger retains the SHA-256 of each original source row so its immutable identity remains auditable without persisting the token value.

## Treat Non-Enrichment Rows as Reference Evidence

The 124 records that are not the Maharashtra state or one of the 35 exact district matches remain `reference_only`. They preserve source, discrepancy, refresh, issue, and empty-table evidence without changing production governance entities.
