# Implementation

## Source bundle

`resources/governance/csv/jagruksetu_bmc_intake_v1/` contains a versioned official-source registry
and protected handoff actions. The generator validates source URLs, supported hosts, action
targets, taxonomy codes, exact counts, and absence of client-visible email addresses.

Generated artifacts under `resources/governance/generated/jagruksetu-bmc-intake-v1/` contain:

- one 340-row taxonomy/route worklist;
- a public-safe import document;
- a validation report; and
- source/generated checksums in the governance manifests.

The same generator writes `supabase/seed/56_jagruksetu_bmc_intake.generated.sql` and
`supabase/deploy/jagruksetu-bmc-intake-v1.sql`. The deployment embeds the exact migration and seed
bytes with their SHA-256 values for one reviewed SQL Editor operation.

## Database

Migration `20260724110000_v1_bmc_general_intake_and_handoffs.sql` adds the protected status and
forced-RLS action registry, strengthens taxonomy validation, and extends the sanitized taxonomy
RPC. Submission availability now reflects complete V1 runtime prerequisites. The public API
projection uses camel-case `handoffActions`; each action contains only `key`, `kind`, `label`,
`description`, `target`, and `priority`.

Seed `56_jagruksetu_bmc_intake.generated.sql` creates the general profile/rule/version, derives 26
private contact rows from the existing 312-row specialised matrix, applies all leaf mappings, and
loads official actions. The result is 13 operational profiles, 338 private ward contacts, 256
internally submittable leaves, and 84 protected handoffs. Its final block verifies exact counts and
protected-route isolation.

Complaint owner views, government views, and ward email resolve a taxonomy-aware display label
from the canonical stored tuple, so a generic operational profile does not erase the detailed
issue type.

## API and mobile

Shared types and strict API/mobile decoders add `protected_handoff` and a bounded handoff-action
contract. Mobile replaces the normal one-page report sections with an official-help panel for a
protected selection. Telephone actions use the native dialler; browser actions use the existing
Expo in-app browser. Calls accept digits-only targets and browser actions require credential-free
HTTPS. This official-help path creates no normal complaint, email, or Community post.
