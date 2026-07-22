# V1 Simple Ward Routing Open Issues

## Delivery

- Deploy the implemented SMTP sender with an approved sender identity and server-only credentials,
  then run a controlled recipient-mailbox test through the complete complaint/outbox path.
- Add bounce, retry exhaustion, dead-letter alerting, provider receipt, and end-to-end recipient
  acceptance tests. A queued row must not be presented as a sent complaint.
- Phone and WhatsApp values are stored only as private operational references; no automated phone or
  WhatsApp delivery exists.

## Data and Geography

- Apply the current-session SQL to hosted staging and run a complaint from each representative ward
  family before inviting citizen testers.
- Replace deterministic K/P split crosswalk selection with exact operational boundary geometry.
- Confirm recipient mailbox ownership and acceptance before production; owner-approved staging data
  must not be silently promoted to production. Raw ward-directory status and documented conflicts
  remain evidence even though the owner approved all merged rows for staging routing.
- Maharashtra municipalities outside the BMC matrix still require location geometry and contact
  rows.

## Operations

- Monitor route latency and passive outbox growth after staging activation. No aggressive polling or
  scheduled worker should be enabled on the bounded Supabase compute.
- The generalized governance and routing schemas remain for history and later expansion. Any future
  physical schema reduction requires a separate migration and compatibility review.
- The service-only legacy candidate RPC can also see eligible `V1_WARD_*` audit rules. Current V1
  API submission bypasses that RPC and calls the facade directly; any future legacy consumer must
  define one route family rather than combining both result sets.
