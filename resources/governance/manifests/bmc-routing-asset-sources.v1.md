# BMC Routing-Asset Source Manifest V1

## Purpose

`bmc-routing-asset-sources.v1.json` records a bounded discovery contract for official MCGM GIS
layers that may support the nine BMC pilot categories which are still fail closed. It records layer
IDs, selected metadata fields, category mappings, and review blockers. It does not contain feature
records, publish a governance source, create assets, activate routes, or approve external delivery.

The source is the official MCGM ArcGIS MapServer:

```text
https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer
```

Layer metadata and informational feature counts were observed on 2026-07-18. Counts are drift
signals, not import acceptance criteria. `OBJECTID` is also only a candidate identifier until
stability across immutable snapshots is demonstrated.

## Candidate Coverage

| Category             | Official layer candidates                    | Why routing remains blocked                                                |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Pothole              | 22 Roadway                                   | Cross-agency road ownership and stable identifiers need review             |
| Blocked drain        | 6 Storm Water Manholes; 7 Storm Water Drains | Ownership, ward spatial join, and network matching need review             |
| Sewage overflow      | 3 Manhole; 4 Sewer Line                      | Sewer ownership, identifier stability, and ward crosswalk need review      |
| Water leakage        | 219 Pipeline                                 | Owner/maintainer fields require completeness and authority matching        |
| Broken streetlight   | 291 Street Light                             | Municipal-versus-utility ownership is not established                      |
| Open manhole         | 3 Manhole; 6 Storm Water Manholes            | Sanitary/storm-water disambiguation, ownership, and emergency UX are open  |
| Illegal construction | 283 Building                                 | A building inventory does not establish authorization or illegality        |
| Encroachment         | 22 Roadway; 283 Building                     | Public-land/right-of-way ownership and authorization evidence are absent   |
| Fallen tree          | 66 Trees                                     | Ownership, maintenance responsibility, and current hazard state are absent |

All nine BMC routing-reference rows require asset ownership. This is stricter than the current
generic category seed for illegal construction, encroachment, and fallen tree; that seed must be
forward-fixed and reviewed before any BMC expansion.

## Validation

Run the deterministic, network-free contract validator with:

```bash
corepack pnpm governance:bmc:assets:validate
node --test tests/bmc-routing-asset-sources.test.mjs
```

The validator rejects unofficial metadata URLs, unknown fields, missing category/layer coverage,
automatic fetch, bulk-download approval, source publication, route activation, production routing,
or external-delivery approval.

## Required Next Steps

Before importing features or changing routing eligibility:

1. Review source terms and approve a bounded refresh cadence.
2. Register the source through the existing review-gated governance synchronization subsystem.
3. Preserve immutable raw snapshots and implement bounded, versioned parser contracts.
4. Profile nulls, duplicates, identifier stability, geometry validity, and ward coverage.
5. Match source owners/maintainers to reviewed authorities and versioned asset ownership.
6. Approve department, durable role, current assignment, and fallback evidence.
7. Run routing, migration, RLS, and complaint-submission tests before activation.

The canonical CSV files and workbooks remain unchanged.
