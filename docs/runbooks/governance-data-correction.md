# Governance Data Correction and Contact Refresh

## Source Rules

Use only reviewed official sources. The canonical CSV files and workbook under
`resources/governance/` are read-only bootstrap evidence and must never be silently rewritten by a
refresh job. Preserve source URL, snapshot/hash, retrieval time, parser version, verification state,
and reviewer provenance.

## Correction Workflow

1. Register or select the approved official source contract; do not store credentials in it.
2. Preserve exact raw bytes in the private snapshot boundary.
3. Parse into staged records, normalize without overwriting evidence, and validate identifiers,
   hierarchy, cardinality, placeholders, dates, duplicates, and contacts.
4. Match entities explicitly. Ambiguous ward/local-body/office/role matches enter review rather
   than becoming active.
5. Produce a change proposal showing additions, closures, conflicts, verification changes, and
   routing impact.
6. A currently authorized reviewer approves or rejects each change through the audited workflow.
7. Publish transactionally by closing the prior effective version and creating a new version.
   Never overwrite officer assignments, contacts, ward boundaries, offices, or routing rules.
8. Re-run eligibility/routing validation and verify that placeholder, unverified, conflicting,
   stale, or superseded rows remain non-routable.

## Ward and Contact Refresh

Ward identity, geometry, office contact, durable officer role, and changing incumbent assignment
are separate records and require separate evidence. A source-verified office phone does not verify
an officer name; an official ward label does not verify its polygon. Record effective dates and
close superseded versions without erasing history.

If the workbook, CSV, official source, or existing active version conflicts, stop promotion, mark
the staged record conflicting, preserve all evidence, and escalate to governance review. Never
resolve a mismatch by hardcoding Pune, Mumbai, a ward, department, officer, or route in application
source.
