# Open issues

## Hosted activation

Apply the focused generated SQL Editor artifact only after hosted staging contains the V1 ward
facade, email-provenance migration, complete 26-ward contact matrix, taxonomy migration, and seed 55. SQL Editor execution does not update the Supabase CLI migration ledger; reconcile the ledger
before later CLI migration use.

Repository generation and local test success do not mean hosted Supabase has been updated. Until
the focused artifact is applied and its post-deployment checks pass, hosted clients may still show
the older taxonomy counts or routing behavior.

After deployment, restart or refresh the API catalog cache and smoke:

- one specialised issue;
- one general-ward issue in K/W and another ward;
- one protected call action;
- one protected browser action;
- confirmation that a protected action creates no complaint, ward-email job, or Community post;
- owner complaint list/detail;
- Government Dashboard list/detail; and
- one ward-email message containing the detailed taxonomy label.

## Operational precision

The general ward profile is deliberately coarse. Replace individual leaves with reviewed
department, asset-owner, external-authority, or regulator profiles as operational evidence becomes
available. Do not treat the V1 fallback as statewide routing coverage.

## External handoffs and email

Official pages and helplines can change and require periodic source review. A handoff action proves
only that the app opened the official channel.

Ward email remains a separate outbox/SMTP operation. Provider acceptance, recipient arrival,
bounces, dead letters, abuse controls, and government operating agreement remain release gates.
