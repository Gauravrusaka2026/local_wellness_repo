# V1 Monitoring Signals

## Boundary

V1 monitoring uses structured service logs, request IDs, Supabase/PostgreSQL evidence, health
checks, uptime checks, and provider-native metrics. Redis, BullMQ, and Sentry are not part of the
V1 topology.

Never use complaint text, exact coordinates, citizen/contact identifiers, officer contacts, raw
source content, media/object paths, tokens, credentials, lease tokens, or OTPs as metric labels or
log fields. Prefer service, environment, safe event code, status, bounded category, and aggregate
counts. Keep actor/resource identifiers only in access-controlled logs where the documented event
contract requires them; never use them as high-cardinality metrics.

## Minimum Signals

| Area                | Signals                                                                                                                      | Initial alert condition for pilot review                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| API                 | liveness/readiness, request count, 4xx/5xx rate, p50/p95 latency, routing/submission/upload failure codes                    | readiness fails twice; 5xx exceeds 2% over 5 minutes with at least 20 requests; p95 exceeds 2 seconds for 10 minutes |
| Database/Storage    | connections, saturation, query/API errors, private upload/finalization failures, backup freshness                            | provider critical alert; backup exceeds approved recovery-point objective; integrity mismatch count above zero       |
| Notifications       | pending/leased/retry/dead outbox count and oldest age, materialization failures                                              | any dead work; oldest eligible work exceeds 5 minutes twice                                                          |
| Realtime            | liveness/readiness, connections, authorization failures, delivery retry/dead/age, zero-socket delivery                       | readiness fails twice; any dead delivery; oldest eligible delivery exceeds 5 minutes twice                           |
| SLA/escalation      | active/paused/breached clocks, due/retry/dead jobs, oldest eligible job, policy-missing failures                             | any dead job; policy ambiguity; eligible work older than twice the configured poll/lease window                      |
| KPI                 | run pending/running/failed counts, duration, latest source cutoff and completed snapshot age                                 | failed run; latest approved snapshot older than twice its approved cadence                                           |
| Governance sync     | claim/fetch/finalization failures, lease expiry, retry age, snapshot freshness, parser/cardinality conflicts, review backlog | repeated source backoff; snapshot older than twice approved cadence; any integrity mismatch                          |
| Security/Auth       | rate-limited requests, repeated provider/auth failures, privileged access denial, invitation/device quota rejection          | sustained surge above reviewed baseline; any unexpected privileged success or cross-scope finding                    |
| Public transparency | anonymous error/latency rate, review/withdrawal failures, stale projection count                                             | withdrawal failure; privacy test failure; unexpected unpublished projection count above zero                         |

These are conservative starting conditions, not immutable policy. Validate them with bounded staging
load and observed pilot volume; record every threshold change with owner, reason, date, and rollback
condition.

## Health and Ownership

External uptime checks should call liveness frequently and readiness separately from at least one
independent location. Readiness responses must remain generic and non-cacheable. A process that is
live but repeatedly not ready is an operational failure, not a healthy deployment.

Every alert needs a named operational owner, severity, notification route, acknowledgement target,
runbook link, maintenance-window behavior, and test date. Provider dashboards and alert rules are
environment configuration and must not contain repository or service credentials.

## Release Evidence

Before pilot approval, exercise one safe synthetic alert for API readiness, notification backlog,
worker failure, and backup staleness. Record delivery, acknowledgement, escalation, and closure in
the approved private system. Do not manufacture production complaint or governance data to test an
alert.
