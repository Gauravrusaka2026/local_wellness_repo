# Phase 5 Implementation

## Database

- The additive workflow migrations version complaint assignments, add optimistic
  `workflow_version`, seed role capabilities and status transitions, and introduce exact-replay
  action requests, append-only action audit, internal notes, inspections, work references,
  dependencies, resolution evidence, versioned resolutions/evidence links, and the notification
  outbox.
- Forced RLS and revoked direct grants keep the schema private. Service-only functions reauthorize
  the actor's current role, membership, exact stored scope, capability, workflow state, and active
  verified authority. New recipient targets separately require the complete current verified,
  non-placeholder governance chain.
- An expired/superseded incumbent does not hide the complaint. Current summaries treat it as
  unassigned, assignment history retains the former officer provenance, and authority/global
  operators can select a new current verified assignment.
- Evidence reservations are valid for 15 minutes. A complaint row lock enforces at most 20 unlinked
  reserved/finalized evidence records for the current assignment. Expired exact reservation replay
  fails rather than minting a fresh token for an old path.
- Evidence detail exposes `availableForResolution`: finalized and unlinked records owned by the
  current assignment are selectable; linked or superseded-assignment evidence remains immutable
  history with the flag set to false.
- Resolving one dependency leaves the complaint waiting when another active dependency exists. The
  final dependency closure advances it to `work_in_progress`. Transfer and manual status exit are
  unavailable while a scheduled inspection or active dependency remains.
- Service-only bounded functions can mark expired reservations or failed evidence. Scheduling and
  private Storage-object reconciliation/removal are not wired in this phase.

## API and Storage

- The NestJS module exposes scope-aware queue/detail/assignment options and guarded workflow action,
  evidence, dependency, inspection, work-reference, and resolution routes.
- All government-workspace responses send `Cache-Control: private, no-store`.
- Finalization retrieves an authorized locator first and rejects a stale workflow version,
  non-reserved state, expired reservation, or declared metadata mismatch before downloading bytes.
  An exact replay of a completed finalized request uses stored observed metadata and does not
  download the object again.
- The Storage gateway retains the 50 MiB, exact byte-size, and SHA-256 checks and uses bounded
  parsing to derive MIME from JPEG, PNG, WebP, HEIC/HEIF, MP4, QuickTime, or WebM signatures.
  Storage metadata and detected MIME must match. Signature/metadata, size, or checksum mismatches
  remove the reserved object before the API returns an integrity conflict.
- Authorized evidence reads use five-minute signed URLs configured as forced downloads. Structured
  access logs contain actor, complaint, and evidence IDs only; signed URLs and object paths are not
  logged.

## Dashboard

- The server-rendered workspace provides filtered queues, scoped complaint detail, state-aware
  action forms, assignment history, internal operational records, direct private evidence upload,
  and resolution submission.
- Linked evidence remains visible but is excluded from resolution checkboxes through
  `availableForResolution`. Exact coordinates render as authorized text until a provider and
  privacy policy are approved.
