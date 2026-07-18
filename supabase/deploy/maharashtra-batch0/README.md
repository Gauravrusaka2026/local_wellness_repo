# Maharashtra Batch 0 SQL Editor deployment

This package stages the reviewed Batch 0 archive and applies only safe LGD enrichment. It does **not** create or activate municipalities, wards, geometry, contacts, officers, routing rules, synchronization endpoints, or external complaint delivery.

Run these files in Supabase **SQL Editor** in order:

1. `01_source_bundle_import_support.sql`
2. `02_batch0_reference_and_lgd_seed.sql`
3. `03_batch0_seed_checksum.sql`

The target must already contain the Local Wellness schema through `20260718100000_complaint_routing_evidence_diagnostics.sql` and the canonical Phase 2 Maharashtra seed. The second file fails closed if Maharashtra or any of the 35 exact district matches is missing or has a conflicting LGD code.

Reviewed artifact hashes:

- schema forward-fix: `9e0d2ff843a82e8e4ae7395f281da321791d228fabf91665d9cbf0cb438b64af`
- Batch 0 seed: `cc0c42f336269f1a98665ebade85b051684619a63b02454954943ee05cec3b2b`
- checksum companion: `9a5c4565d1802596144fc2f6a2aabeb5e8dc18c706b2cc01361883cefe72d9aa`

The seed is rerunnable after a successful application. The schema guard skips only a complete prior application and rejects partial state.
