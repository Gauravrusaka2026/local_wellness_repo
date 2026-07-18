# Phase 8 Decisions

- Preserve the private complaint row and exact evidence unchanged.
- Materialize immutable, sanitized public projection versions after explicit review.
- Derive public position from reviewed ward geometry inside PostgreSQL.
- Serve anonymous data through NestJS and service-only RPCs; expose no tables directly.
- Derive filters, hotspots, detail, and duplicate groups only from current projections.
- Never auto-publish a duplicate relationship from a similarity score. A service-role review
  operation may group at most 100 already-published reports from one local body and category and
  records reviewer attribution, ordered membership, and version history.
- Return duplicate relationships only inside public detail as a canonical public ID, a stable
  sorted list of related public IDs excluding the report being viewed, and the total group size.
  Internal complaint IDs, review notes, and similarity evidence never cross the public contract.
- Withdraw a public duplicate-group version instead of overwriting or deleting it.
- Store one private forced-RLS engagement row per complaint/account and publish only its aggregate
  support count. Return the current account's support/star flags only through authenticated,
  non-cacheable API responses.
- Rank `trending` by live support count, publication time, and public ID inside the requested
  viewport. Cursor pages may shift when support changes; the ranking is not a frozen snapshot.
- Make Local, Trending, and Heat the mobile community modes while keeping all source data reviewed,
  generalized, and provider-neutral.
- Never let engagement modify official routing, assignment, status, escalation, SLA, or KPI state.
  Keep comments, public participant identity, and engagement notifications disabled.
- Use provider-neutral client rendering and retain an accessible list fallback.
- Seed no operational policy or public complaint.
