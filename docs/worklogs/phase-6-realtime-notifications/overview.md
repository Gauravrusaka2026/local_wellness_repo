# Phase 6 Realtime and Notifications Worklog

## Objective

Provide persistent private complaint communication, durable in-app notification history, and
authenticated low-latency delivery without making Socket.IO or an external provider the source of
truth.

## In Scope

- one private conversation room per submitted complaint;
- immutable, idempotent citizen/government messages and monotonic read-through receipts;
- authenticated REST message and notification history;
- Supabase-JWT-authenticated Socket.IO connections, database-authorized room joins, typing signals,
  persistent event envelopes, and bounded per-socket operation limits;
- transactional outbox events for submission, status, assignment, and private messages;
- PostgreSQL-leased outbox materialization and realtime delivery with retry/dead-letter evidence;
- data-minimized in-app notifications and read state;
- mobile notification history and private complaint conversation;
- government-dashboard private complaint conversation;
- structured identifier-only logs, health endpoints, and deployment configuration.

## Out of Scope

- public comments, public complaint visibility, moderation, or public subscriptions;
- push/email provider delivery, notification preferences, consent, quiet hours, and localization;
- Redis, BullMQ, Redis adapters/caching, Sentry, or multi-instance Socket.IO;
- SLA escalation and reopen workflow producers owned by later phases;
- production activation of placeholder or unverified governance/routing records.

## Status

The Phase 6 engineering surface is implemented and locally verified. A clean database reset, all
967 pgTAP assertions, strict application-schema lint, generated database types, repository format,
lint, type-check, tests, builds, Compose validation, Expo checks/export, and production dependency
audit passed. Operational push/email delivery, managed activation, physical-device/hosted testing,
and verified-pilot complaint traffic remain pending independent provider, policy, credential, and
data work.
