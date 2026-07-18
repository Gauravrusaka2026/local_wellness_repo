# Maharashtra Batch 0 Intake Open Issues

## Mumbai District Crosswalk Requires Review

The source row `district:lgd:482` uses `Mumbai`, while the canonical hierarchy uses `Mumbai City`. An official, reviewed alias or identity crosswalk is required before LGD code `482` can enrich the canonical record. Until then it remains reference-only and non-routable.

## Operational Governance Data Is Absent

Batch 0 contains no populated taluka, local-body, ward, boundary, department, office, officer-role, officer, assignment, contact, utility, emergency-contact, routing-reference, asset, ownership, or village rows. It therefore cannot enable complaint routing or external delivery.

## Source Discrepancies Need Resolution

The archive records one supplied validation failure, 6 discrepancy groups, and 21 data issues. These warnings must be resolved or explicitly accepted with evidence before later data is promoted.

## Current Official Extracts Are Still Needed

The district source is an undated official snapshot. Generated LGD exports with preserved generation/effective dates are still needed before broader production use. Municipal, ward, office, contact, officer-assignment, geometry, and routing datasets require their own current official evidence and versioned imports.

## Stale Evidence Must Remain Historical

The legacy PMC CARE booklet and other stale or conflicting source observations remain evidence only. They must not become active contacts, officer assignments, routing destinations, or complaint-delivery channels without current official confirmation.

## Deployment Verification Remains Environment-Specific

The migration and generated seeds must be applied in order to the intended local or staging database, followed by the pgTAP migration and seed suites. This worklog records repository artifacts only and does not establish hosted Supabase deployment status.
