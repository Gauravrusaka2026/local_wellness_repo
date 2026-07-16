# Phase 7 Resolution, Feedback and Reopening

## Objective

Complete the private accountability loop after a government resolution: capture defensible
completion evidence, let the complaint owner review and rate the outcome, allow policy-controlled
reopening with additional evidence, and escalate repeated reopening without client-selected
workflow state.

## Scope

- effective-dated resolution policy and approval records;
- completion time, captured location, work-reference linkage, and before/after evidence roles;
- citizen resolution context, feedback, confirmation, reopening, and private evidence access;
- post-submission private reopen evidence;
- repeated-reopen escalation and existing Phase 6 notification integration;
- mobile review/reopen UX and government accountability history;
- migration, RLS, API, integration, and client tests.

Phase 8 public maps/transparency, public comments, provider-backed media scanning, push/email
providers, Redis, BullMQ, and Sentry are outside this worklog.

## Policy Activation Boundary

The repository contains no approved reopen window, rating scale, evidence requirement, attempt
limit, or escalation threshold. Phase 7 therefore implements and tests the policy mechanism but
does not seed an active operational policy. Managed activation remains an explicit product-policy
and deployment action tracked by `RESOLUTION-001`.
