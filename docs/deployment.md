# Deployment

## Purpose

This document defines environment, release, infrastructure, and Supabase deployment practices.

---

## Environments

Use four environments:

```text
local
development
staging
production
```

### Local

- Supabase CLI local stack;
- local API;
- local workers;
- local realtime server;
- Expo development build.

### Development

- shared development Supabase project;
- non-production cloud deployments;
- synthetic data;
- developer testing.

### Staging

- production-like Supabase project;
- production-like infrastructure;
- anonymized or synthetic data;
- release candidate validation.

### Production

- production Supabase project;
- production API;
- production realtime;
- production workers;
- monitoring and alerting;
- restricted access.

---

## Supabase Project Strategy

Create separate Supabase projects for:

- development;
- staging;
- production.

Never reuse one project for all environments.

Each project should have:

- separate database;
- separate Auth users;
- separate Storage buckets;
- separate API keys;
- separate secrets;
- separate redirect URLs;
- separate monitoring.

---

## Deployment Targets

### Mobile

- Expo EAS Build;
- Android Play Console;
- Apple App Store later.

### Web

- Vercel or equivalent;
- separate projects for citizen web, government dashboard, and admin console.

### API

- containerized NestJS application;
- Railway, Fly.io, Render, AWS ECS, or equivalent.

### Realtime

- containerized Socket.IO server;
- one instance for the V1 pilot;
- horizontal scaling requires a later reviewed delivery mechanism and ADR.

### Workers

- containerized worker process;
- independent scaling when a V1 phase introduces background work;
- no Redis or BullMQ dependency in V1.

---

## CI/CD Pipeline

Recommended stages:

1. install;
2. canonical governance source/hash and generated-seed drift check;
3. lint;
4. type-check and generated-database-type drift check;
5. unit test;
6. integration and pgTAP migration/RLS/seed/spatial test;
7. clean local migration/seed reset and schema lint;
8. build;
9. security scan;
10. deploy;
11. smoke test.

---

## Database Deployment

### Development

```bash
supabase link --project-ref <dev-project-ref>
supabase db push
```

### Staging

Apply migrations through CI.

### Production

Production migration requires:

- reviewed SQL;
- staging success;
- backup confirmation;
- migration plan;
- rollback or forward-fix plan;
- deployment approval.

Phase 2 governance deployments additionally require the reviewed manifest, canonical source checksums, machine-readable validation report, generated main-seed/checksum-companion pair, and explicit review of additions/removals, verification promotions, hierarchy changes, and temporal-version closures. Apply migrations before both generated seed files. Do not hand-edit governance rows in a hosted dashboard or silently replace a canonical CSV. Placeholder/template data must remain non-routable and excluded from effective authority access in every environment.

The baseline contains no pilot geometry or verified incumbents. A successful deployment therefore proves schema/import integrity only; it must not be represented as production jurisdiction coverage or a current officer directory. Redis, BullMQ, and Sentry remain absent from the V1 deployment topology.

---

## Secrets

Store secrets in:

- GitHub Actions secrets;
- cloud provider secret manager;
- Supabase project secrets;
- EAS secrets;
- Vercel environment variables.

Never store secrets in:

- Git;
- `.env.example`;
- issue comments;
- logs;
- screenshots;
- client bundles.

---

## Environment Variable Categories

### Public mobile

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_MAPS_KEY
```

### Public web

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
```

### Server

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
GOVERNMENT_INVITE_REDIRECT_URL
EMAIL_PROVIDER_API_KEY
SMS_PROVIDER_API_KEY
```

Prefer `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for current projects. Anon and service-role variables are supported as legacy fallbacks. Secret/service-role values must never appear in a client-visible environment.

---

## Release Process

### Development Release

- merge to development branch;
- deploy development environment;
- run smoke tests.

### Staging Release

- create release candidate;
- deploy staging;
- run end-to-end tests;
- run security checks;
- verify migrations;
- verify mobile build.

### Production Release

- tag release;
- backup database;
- apply migrations;
- deploy API;
- deploy workers;
- deploy realtime;
- deploy web;
- publish mobile build;
- run smoke tests;
- monitor errors.

---

## Health Checks

Required before launch; these endpoints are not part of the Phase 1 implementation:

```text
/health/live
/health/ready
```

Readiness should check:

- database;
- storage dependency;
- any background-work dependency implemented by the active release.

---

## Monitoring

The deployed V1 target must track:

- API error rate;
- API latency;
- database connections;
- notification-outbox backlog when implemented;
- background-work failures when implemented;
- Socket.IO connections;
- message delivery;
- upload failures;
- notification failures;
- crash-free mobile sessions;
- routing failures.

---

## Rollback

Rollback strategy:

- application rollback through prior container/image;
- web rollback through prior deployment;
- mobile rollback through feature flags or hotfix;
- database forward-fix preferred;
- disable incomplete feature through feature flag.

Never depend on destructive database rollback as the only recovery strategy.

---

## Infrastructure as Code

Use Terraform later for:

- cloud applications;
- secrets;
- DNS;
- monitoring;
- object storage external services.

Supabase project creation may remain managed manually initially, but configuration must be documented.

---

## Deployment ADRs

Create ADRs when changing:

- hosting provider;
- deployment topology;
- cross-instance realtime or background-work provider;
- Supabase environment strategy;
- mobile distribution;
- infrastructure as code tool;
- secret management approach.

Redis, BullMQ and Sentry are intentionally deferred beyond V1. The approved V1 monitoring target is structured logs, request correlation, health checks, uptime checks and provider-native metrics without a Sentry SDK or DSN. Phase 1 implements request correlation and application error logging; health endpoints, uptime checks and hosted metrics remain deployment work.
