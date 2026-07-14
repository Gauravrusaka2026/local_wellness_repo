# Phase 5 Decisions

- Keep complaint tables private and forced-RLS; all government access is service-mediated through
  database functions that revalidate current roles and scopes.
- Treat moderators as read-only, municipal administrators and government operators as
  authority-scoped operators, ward/department officers as exact-scope operators, and platform
  administrators as global operators.
- Version assignments with one active row and preserve the original routing decision.
- Keep complaints recoverable when an incumbent version expires: hide the stale incumbent from the
  current summary, retain it in historical assignment versions, and allow authority/global repair.
- Restrict assign and transfer capabilities to authority/global scopes; ward/department officers
  remain exact-scope operators for their non-assignment capabilities.
- Restrict transfer targets to the complaint's current verified authority until an explicit
  cross-authority policy exists.
- Require finalized private resolution evidence and a completion note before resolution submission.
- Mark evidence explicitly as `availableForResolution`; linked or superseded-assignment evidence
  stays visible as immutable history but cannot be reused by a later resolution.
- Validate Storage MIME metadata against dependency-free binary signatures before finalization,
  retain the byte-size/SHA-256 checks, remove a mismatched upload, and force signed reads to
  download rather than render inline.
- Check evidence status, complaint workflow version, and reservation expiry before downloading;
  exact finalized idempotency replays use stored verification metadata without downloading again.
- Bound active, unlinked reserved/finalized evidence to 20 rows per current complaint assignment.
- Keep a complaint in its current waiting state while any external dependency remains active; move
  to work in progress only after the final active dependency closes.
- Reject transfer or manual status exit while a scheduled inspection or active dependency remains,
  so child workflow records cannot be stranded.
- Store a data-minimized notification outbox event transactionally, but leave delivery to Phase 6.
- Omit queue coordinates and external basemap calls; show exact location only on an authorized
  detail route.
- Mark every government-workspace HTTP response `private, no-store` and emit structured evidence-
  access logs with identifiers only, never signed URLs or object paths.

The architectural rationale is recorded in ADR-0013.
