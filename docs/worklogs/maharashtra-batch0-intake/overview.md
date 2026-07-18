# Maharashtra Batch 0 Intake

## Status

Safe repository intake completed on 2026-07-18. The generated migration and seed artifacts are local deployment inputs; this worklog does not claim that they have been applied to a hosted Supabase project.

## Purpose

Batch 0 establishes an immutable, auditable Maharashtra governance source baseline. It preserves the supplied archive and its provenance, records every CSV row in the governance import ledger, catalogues official sources, and applies only conservative LGD-code enrichment to exact existing hierarchy matches.

## Intake Summary

| Item                                         |                                                                  Result |
| -------------------------------------------- | ----------------------------------------------------------------------: |
| Immutable source archive                     | `resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip` |
| Archive SHA-256                              |      `731c4aaad413b529ffdbd3638627d222bc4d3cf0714fe130ac54a75e06b1b7e4` |
| Safe regular archive members                 |                                                                      28 |
| Verified internal member hashes              |                                                                      27 |
| Import-ledger files, including the archive   |                                                                      29 |
| Machine-readable CSV files                   |                                                                      22 |
| CSV records preserved in the ledger          |                                                                     160 |
| Official reference sources catalogued        |                                                                      38 |
| State rows                                   |                                                                       1 |
| District rows                                |                                                                      36 |
| Exact existing district matches              |                                                                      35 |
| Normalized hierarchy records                 |                                                                      36 |
| Reference-only records                       |                                                                     124 |
| Records with transient token values redacted |                                                                       4 |
| Populated operational rows                   |                                                                       0 |

The independent intake status is `passed_with_warnings`. Maharashtra and 35 exact existing district matches receive LGD-code enrichment only. The source row named `Mumbai` with LGD code `482` remains quarantined because the canonical repository hierarchy uses `Mumbai City`; no alias was inferred automatically.

## Safety Boundary

Batch 0 does not add or activate talukas, local bodies, wards, boundaries, departments, offices, officer roles, officers, assignments, contacts, utilities, emergency contacts, assets, ownership records, or routing references. It does not make any record routable, approve external complaint delivery, activate synchronization endpoints, or promote placeholder or unverified operational data.

The canonical archive and existing governance CSV sources remain unchanged.
