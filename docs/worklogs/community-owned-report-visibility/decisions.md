# Decisions

- Community presents private owned reports and reviewed-public reports in visually and
  behaviorally separate sections.
- The owner preview is available only with a signed-in session and uses the actor-scoped
  `GET /api/v1/complaints` contract.
- The preview shows the newest three owned complaints and links to the complete My Complaints list.
- Community focus starts an owner-list refresh so a newly submitted complaint appears on return.
- Owner loading does not require location and does not depend on public feed, map, or hotspot
  success.
- Owner cards navigate to authenticated complaint details and expose no support or star actions.
- Private complaints are never converted into public projection items or included in nearby,
  trending, map, or heatmap data.
- Submission does not imply publication. ADR-0016 review remains the only path to reviewed-public
  visibility, and ADR-0024 engagements remain public-projection-only.
- No API, database, migration, RLS, Storage, or Supabase configuration change is introduced.
