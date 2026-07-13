# Phase 0 Foundation Decisions

## Architectural Decisions

- [ADR-0001: Use pnpm and Turborepo for the Monorepo](../../adr/0001-use-pnpm-and-turborepo-for-the-monorepo.md)
- [ADR-0002: Use Expo for the Mobile Application](../../adr/0002-use-expo-for-the-mobile-application.md)
- [ADR-0003: Use Next.js for Web Applications](../../adr/0003-use-nextjs-for-web-applications.md)
- [ADR-0004: Use NestJS for the API](../../adr/0004-use-nestjs-for-the-api.md)
- [ADR-0005: Use Socket.IO for Realtime Delivery](../../adr/0005-use-socketio-for-realtime-delivery.md)

## Implementation Conventions

Detailed non-architectural conventions are recorded in [`docs/DECISIONS.md`](../../DECISIONS.md), including workspace naming, pinned versions, TypeScript reference targets, development ports, dependency security controls, generated-file handling, and container conventions.

## Decisions Deliberately Deferred

No implementation decision was made for:

- Supabase project configuration;
- Auth providers or session behavior;
- database schema, migration, or RLS strategy implementation;
- Redis application integration;
- BullMQ queues;
- Socket.IO room or event contracts;
- hosting providers or production topology.

These remain governed by the existing architecture documents and require ADRs when actually implemented or changed.
