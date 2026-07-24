# Decisions

- Extend the existing verified-governing-body JSON instead of introducing a second spatial RPC.
  This avoids duplicate PostGIS resolution and preserves one trusted lookup.
- Keep `offices` optional in the shared type for rolling deployments. The API store normalizes an
  absent database field to `[]`.
- Return the exact ward's offices and any wardless office explicitly scoped to the resolved local
  body. Never include another ward's office or an authority-wide office without resolved
  local-body scope.
- Require at least one address, official phone, or official email so an empty office card cannot be
  published.
- Display the complete published phone string, but derive the dial target only from one bounded,
  digit-validated first number.
- Keep governance-result caching out of this slice. The existing memory/last-known location
  coordinator prevents unnecessary native location acquisition; no cross-account result cache is
  introduced.
- Invalidate in-flight directory requests on blur and account change so stale responses cannot
  replace the current screen state.
