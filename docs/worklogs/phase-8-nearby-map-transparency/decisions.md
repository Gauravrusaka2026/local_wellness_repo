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
- Use provider-neutral client rendering and retain an accessible list fallback.
- Seed no operational policy or public complaint.
