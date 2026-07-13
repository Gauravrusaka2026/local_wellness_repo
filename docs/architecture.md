# Architecture

## Purpose

This document defines the technical architecture for the Local Wellness platform.

The system is designed as a modular monolith for V1, with clear package and application boundaries that allow later service separation.

---

## Architectural Goals

- fast V1 development;
- strong domain separation;
- secure public-service workflows;
- scalable complaint routing;
- traceable government actions;
- reliable realtime communication;
- configurable city and ward data;
- Maharashtra-first, India-ready design.

---

## High-Level Architecture

```text
Citizen Mobile App
Citizen Web
Government Dashboard
Admin Console
        |
        v
API Gateway / NestJS API
        |
        +-------------------+
        |                   |
        v                   v
Complaint Services     Realtime Server
Routing Engine         Socket.IO
Location Service
Authority Service
        |
        v
Supabase PostgreSQL + PostGIS
Supabase Auth
Supabase Storage
        |
        v
Workers
Notifications
Media Processing
SLA Escalations
Analytics Aggregation
Government Integrations
```

---

## Runtime Components

### Mobile Application

Responsibilities:

- citizen onboarding;
- authentication;
- location permissions;
- live media capture;
- complaint creation;
- complaint tracking;
- notifications;
- feedback;
- reopening;
- nearby complaint map.

### Citizen Web

Responsibilities:

- public complaint views;
- complaint tracking;
- account access;
- locality map;
- public transparency pages.

### Government Dashboard

Responsibilities:

- complaint queue;
- ward and department views;
- assignment;
- status updates;
- internal notes;
- citizen communication;
- resolution evidence;
- SLA monitoring;
- KPI dashboards.

### Admin Console

Responsibilities:

- municipality setup;
- ward configuration;
- department configuration;
- officer assignments;
- routing rules;
- SLA rules;
- escalation policies;
- moderation;
- audit inspection.

### API

NestJS modular application.

Core modules:

- auth;
- profiles;
- devices;
- governance;
- jurisdictions;
- departments;
- officers;
- complaints;
- media;
- location;
- routing;
- assignments;
- statuses;
- feedback;
- reopening;
- notifications;
- moderation;
- analytics;
- integrations;
- audit.

### Realtime Server

Socket.IO server.

Responsibilities:

- complaint rooms;
- officer rooms;
- user rooms;
- comment delivery;
- complaint chat;
- presence;
- typing indicators;
- realtime status updates.

All permanent realtime events must first be persisted in PostgreSQL.

### Workers

Responsibilities:

- media processing;
- speech transcription;
- notification delivery;
- SLA scheduling;
- escalations;
- duplicate detection;
- analytics aggregation;
- government portal synchronization;
- contact data refresh jobs.

---

## Monorepo Boundaries

### Applications

Applications contain runtime-specific code.

Business logic should not be implemented directly inside React components.

### Shared Packages

#### `packages/database`

- generated database types;
- database helpers;
- migration utilities;
- query abstractions;
- test fixtures.

#### `packages/api-client`

- typed HTTP client;
- generated API models;
- authentication interceptors;
- error normalization.

#### `packages/types`

- shared domain interfaces;
- discriminated unions;
- constants;
- event types.

#### `packages/validation`

- Zod schemas;
- request validation;
- environment validation;
- import validation.

#### `packages/routing-engine`

- jurisdiction matching;
- category routing;
- asset ownership matching;
- officer-role resolution;
- fallback rules;
- routing explanation.

#### `packages/design-system`

- shared tokens;
- reusable components;
- accessibility primitives.

#### `packages/localization`

- Marathi;
- Hindi;
- English;
- translation keys;
- date and number formatting.

#### `packages/config`

- environment parsing;
- feature flags;
- application configuration.

#### `packages/observability`

- logging;
- tracing;
- error reporting;
- metrics;
- correlation IDs.

---

## Domain Model

### Identity Domain

- Supabase Auth identities;
- citizen profiles and preferred language;
- hashed device registrations;
- immutable system roles;
- time-bound scoped role assignments;
- authority memberships;
- append-only authentication audit events.

Supabase Auth proves identity. Current database state determines authorization so revoked or expired access does not remain valid until a JWT refresh. Client applications receive only the public project URL and publishable key (or legacy anonymous key); the secret/service-role key exists only in the trusted API runtime. The API verifies each bearer token with Supabase Auth, reauthorizes ownership and scope, and performs identity writes through audited database operations. RLS and column privileges remain a second boundary for direct data-API access.

Device registration and soft revocation are atomic with their audit events. Sensitive device hashes and push tokens remain server-only. Client session events are explicitly marked as client-reported; provider logs and server-generated access events carry the authoritative security meaning.

### Governance Domain

- state;
- district;
- local body;
- zone;
- ward;
- department;
- office;
- officer role;
- officer;
- officer assignment.

### Complaint Domain

- complaint;
- category;
- subcategory;
- media;
- location evidence;
- status history;
- assignment;
- resolution evidence;
- feedback;
- reopen request.

### Routing Domain

- jurisdiction boundary;
- asset;
- asset owner;
- routing rule;
- routing decision;
- fallback route;
- SLA policy;
- escalation rule.

### Communication Domain

- public comment;
- complaint room;
- message;
- message receipt;
- notification;
- notification delivery.

---

## Core Workflow

```text
Citizen captures media
        |
        v
GPS location verified
        |
        v
Complaint category selected
        |
        v
Duplicate check
        |
        v
Complaint submitted
        |
        v
Routing engine resolves:
municipality
ward
department
officer role
SLA
        |
        v
Complaint assigned
        |
        v
Officer handles complaint
        |
        v
Resolution evidence submitted
        |
        v
Citizen confirms or reopens
```

---

## Routing Architecture

Routing must use:

1. GPS point;
2. municipality polygon;
3. ward polygon;
4. category;
5. subcategory;
6. asset type;
7. asset ownership;
8. active routing rule;
9. department;
10. officer role;
11. officer assignment;
12. SLA and escalation rule.

Routing must return an explanation record.

Example:

```json
{
  "municipalityId": "uuid",
  "wardId": "uuid",
  "departmentId": "uuid",
  "officerRoleId": "uuid",
  "officerAssignmentId": "uuid",
  "routingRuleId": "uuid",
  "confidence": 0.94,
  "fallbackUsed": false
}
```

---

## Realtime Architecture

Socket.IO is used for realtime delivery.

PostgreSQL remains the source of truth.

```text
Client sends message
        |
        v
Socket server validates access
        |
        v
Message saved in PostgreSQL
        |
        v
Transaction succeeds
        |
        v
Message broadcast to room
        |
        v
Offline notification queued
```

The V1 pilot runs a single realtime instance. If horizontal scaling is introduced after V1:

- select and document a reviewed cross-instance delivery mechanism;
- use sticky sessions if the selected transport requires them;
- define shared presence semantics explicitly;
- preserve database-first persistence.

---

## Background Work Architecture

Redis and BullMQ are not part of V1. The phase that first implements background work must select a durable PostgreSQL- or platform-backed mechanism and record any architectural decision required by `AGENTS.md`.

Background work must be:

- idempotent;
- retryable;
- observable;
- persisted before delivery;
- dead-lettered after terminal failure.

---

## Security Architecture

This is the V1 target security architecture. Phase 1 implements the identity, current-scope authorization, RLS, audit, request-correlation, and secret-isolation controls. Rate limits and broader device-risk enforcement remain tracked hardening work.

- Supabase Auth for identity;
- JWT verification at API;
- RLS on every exposed table;
- server-side authorization;
- scoped government access;
- private storage buckets;
- signed media URLs;
- append-only audit records;
- rate limiting;
- device risk checks;
- secret isolation;
- structured security logs.

---

## Deployment Architecture

V1:

```text
Mobile app → Expo/EAS
Web apps → Vercel or equivalent
API → container platform
Realtime server → container platform
Workers → container platform
Supabase → managed
Monitoring → V1 target: structured logs, health checks, uptime and platform metrics
```

Redis, BullMQ and Sentry are explicitly deferred beyond V1 by ADR-0007.

---

## Architectural Decision Records

Any architectural change must create an ADR.

See `docs/adr/`.

The `AGENTS.md` file defines mandatory ADR creation rules.
