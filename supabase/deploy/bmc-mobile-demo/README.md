# BMC mobile demo Supabase deployment

> Legacy pre-V1 bootstrap pack. Do not run this four-part bundle on a project that has applied
> `20260720100000_v1_simple_ward_routing.sql` or
> `20260723110000_prune_deferred_v1_subsystems.sql`. Current projects should use the adaptive
> master bundle or the dedicated V1 ward-routing artifact documented in the repository root.

These four generated SQL files load the missing Mumbai category, governance, boundary, and internal-routing records into an existing Local Wellness Supabase project. They do not enable external delivery to BMC phone numbers or email addresses.

For the current mobile Community update, first run the guarded 78 KB
`supabase/deploy/current-session/01_migrations_39_through_43.sql`. It requires a complete
migration-38 baseline, applies only the exact missing migrations 39–43, and safely skips a coherent
completed prefix. If it reports a baseline, partial, or non-contiguous-state error, stop and
reconcile the target; use the two adaptive master parts only when their coherent-prefix contract
applies. Do not run migration 43 by itself unless the target is independently confirmed complete
through migration 42.

## Run order

First bring the schema through migration 43. When migration 38 is confirmed
complete, run
`supabase/deploy/current-session/01_migrations_39_through_43.sql`. If that
query reports a baseline, partial, or non-contiguous-state error, stop and
reconcile or use `supabase/master.part-1.sql` followed by
`supabase/master.part-2.sql` as appropriate.

In Supabase Dashboard, open **SQL Editor → New query** and run each file completely in this order:

1. `01_baseline_categories_and_core.sql`
2. `02_official_boundaries.sql`
3. `03_ward_crosswalk_and_governance_verify.sql`
4. `04_routing_activation_and_verify.sql`

Each part is transaction-atomic, under the repository's SQL Editor size budget, and safe to retry after a successful complete deployment. If Part 1 reports `BMC_MOBILE_DEMO_SCHEMA_NOT_CURRENT`, stop and complete the schema prerequisite above before retrying these four files.

After this legacy bootstrap, apply exact migrations 44, 45 and 46 in order, run
`supabase/deploy/v1-simple-ward-routing.sql` for migrations 47/48 plus the 312-row seed, then
reconcile migrations 49 and 50. Do not replay these four files afterward.

## Expected result

- 12 complaint categories are visible in mobile.
- Garbage dump, missed sweeping, and mosquito breeding are enabled for internal demo routing.
- 22 one-to-one BMC operational wards resolve from official PostGIS geometry.
- K/S, K/N, P/E, and P/W remain fail-closed until child boundaries are available.
- Complaint photos continue to use the private `complaint-originals-private` bucket through signed uploads.
- No record is approved for automatic external government contact delivery.

Do not run the full Phase 2 seed after this targeted bundle unless you immediately rerun all four BMC parts: the broad Phase 2 seed intentionally restores its older non-routable bootstrap state.
