# Decisions

- Use a new forward migration; never rewrite an applied historical migration.
- Physically drop only tables with no current application runtime dependency.
- Replace versioned-contact delivery readiness with `routing.ward_issue_contacts` before dropping
  its source tables.
- Preserve the existing public RPC shapes used by the Government Dashboard.
- Refuse to delete any existing public-comment history and require a complete replacement matrix
  before removing populated historical governance tables.
- Use dependency-restricted drops so unknown hosted-only dependencies abort the migration.
- Lock the historical lease table while checking active work so no new lease can race the prune.
- Use a private, non-executable marker function for adaptive master-bundle continuity.
- Keep any existing raw snapshot Storage objects and bucket until reviewed through the Storage API.
- Do not claim that relation-count reduction fixes the previously observed request-loop CPU load.
