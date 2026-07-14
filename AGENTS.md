# AGENTS.md

## Agent Autonomy

The agent should operate autonomously.

The agent does NOT need approval for:

- creating files
- modifying files
- moving files
- deleting generated files
- installing project dependencies
- formatting code
- creating migrations
- updating documentation
- creating tests
- running local builds
- running lint
- running unit tests
- updating `docs/TASKS.md`
- updating `docs/CHANGELOG.md`
- updating `docs/PROGRESS.md`
- updating `docs/DECISIONS.md`
- updating `docs/KNOWN_ISSUES.md`
- creating ADRs

The agent MUST ask for approval only when:

- production credentials are required;
- secrets or API keys are needed;
- production infrastructure would be modified;
- destructive operations (such as deleting production data) are requested;
- a new product requirement or architectural decision is needed that is not documented.

## Purpose

This file defines mandatory operating rules for AI coding agents working in the Local Wellness repository.

The agent must preserve architecture, security, documentation, and traceability.

---

## Required Reading Order

Before implementation, read:

1. `README.md`
2. `PROJECT_OVERVIEW.md`
3. `PLAN.md`
4. `docs/architecture.md`
5. `docs/database.md`
6. `docs/authentication.md`
7. `docs/api.md`
8. `docs/deployment.md`
9. `docs/supabase-setup.md`
10. applicable ADRs under `docs/adr/`
11. `docs/TASKS.md`
12. `docs/PROGRESS.md`
13. `docs/CHANGELOG.md`
14. `docs/DECISIONS.md`
15. `docs/KNOWN_ISSUES.md`

---

## Documentation Requirement

Documentation is part of the implementation.

When code changes, update the relevant documentation in the same change.

Required files:

- `README.md`
- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/authentication.md`
- `docs/database.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`

---

## ADR Requirement

Agents must create an ADR whenever a decision:

- changes architecture;
- introduces a major dependency;
- changes authentication;
- changes database structure strategy;
- changes deployment topology;
- changes storage strategy;
- changes realtime architecture;
- changes routing architecture;
- changes security policy;
- changes public visibility or privacy behavior;
- replaces a previous architectural decision.

ADR location:

```text
docs/adr/
```

ADR naming:

```text
0001-use-supabase-as-core-platform.md
0002-use-nestjs-for-api.md
0003-use-socketio-for-realtime.md
```

ADR status values:

```text
Proposed
Accepted
Deprecated
Superseded
Rejected
```

ADR format:

```markdown
# ADR-0001: Decision Title

## Status

Accepted

## Date

YYYY-MM-DD

## Context

Describe the problem and constraints.

## Decision

Describe the chosen decision.

## Alternatives Considered

Describe alternatives and why they were not selected.

## Consequences

Describe positive and negative consequences.

## Implementation Notes

Describe implementation requirements.

## Related Documents

List related files and ADRs.
```

The agent must not silently change an accepted architectural decision.

If a prior ADR is replaced:

- create a new ADR;
- mark the old ADR as superseded;
- link both records.

---

## Supabase Rules

- use Supabase PostgreSQL as source of truth;
- use PostGIS for geographic routing;
- use Supabase Auth for V1;
- use Supabase Storage for media;
- enable RLS on exposed tables;
- store all schema changes as migrations;
- test migrations locally;
- test RLS policies;
- never expose service role keys;
- never modify production only through dashboard;
- keep development, staging, and production separate.

---

## Code Structure Rules

Follow repository boundaries.

Do not move business logic into UI components.

Do not duplicate domain types.

Use:

- `packages/types`;
- `packages/validation`;
- `packages/database`;
- `packages/routing-engine`;
- `packages/config`;
- `packages/observability`.

---

## Security Rules

Never:

- disable RLS for convenience;
- trust client-provided roles;
- allow clients to choose official assignments;
- expose private media publicly;
- log secrets or OTPs;
- allow arbitrary Socket.IO room joins;
- change official complaint status without server validation;
- delete complaint history.

---

## Database Rules

- migrations are additive where possible;
- applied migrations are immutable;
- use forward-fix migrations;
- version officer assignments;
- version ward boundaries;
- version routing rules;
- use UTC timestamps;
- use append-only status history;
- add indexes for common query paths;
- include migration tests.

---

## Testing Requirements

Every feature must include appropriate tests.

Required test categories:

- unit;
- integration;
- RLS;
- migration;
- API;
- realtime;
- end-to-end for critical flows.

---

## Work Tracking

For every substantial feature:

- update `PLAN.md`;
- create or update `docs/TASKS.md`;
- update `docs/CHANGELOG.md`;
- update relevant docs;
- create ADR when required;
- document open issues;
- document test results.

Recommended worklog structure:

```text
docs/worklogs/<feature>/
├── overview.md
├── decisions.md
├── implementation.md
├── testing.md
└── open-issues.md
```

---

## Definition of Done

A task is complete only when:

- code works;
- tests pass;
- lint passes;
- type-check passes;
- migrations are included;
- RLS is reviewed;
- documentation is updated;
- ADR is created if required;
- observability is added;
- security impact is reviewed;
- no critical unresolved TODO remains.

---

## Agent Completion Report

For substantial tasks, provide:

1. summary;
2. files changed;
3. migrations created;
4. tests added;
5. documentation updated;
6. ADR created or explanation why not required;
7. security impact;
8. remaining risks;
9. next recommended task.


---

# Project Documentation Lifecycle

Documentation is considered part of the implementation.

A coding session is **NOT complete** until all required project documentation has been updated.

The repository should always accurately describe the current implementation state without relying on previous conversations.

---

# Required Project Documents

The repository maintains the following project-tracking documents.

README.md

Overall repository introduction.

Must always describe:

- project purpose
- architecture overview
- setup
- repository structure
- technology stack
- development workflow

---

PROJECT_OVERVIEW.md

High-level product vision.

Contains:

- product goals
- supported platforms
- user roles
- scope
- roadmap
- module overview

Only update when the product direction changes.

---

PLAN.md

Long-term implementation roadmap.

Contains:

- project phases
- milestones
- implementation order
- future roadmap

Only update when:

- phases change
- roadmap changes
- milestone order changes

Do NOT use PLAN.md as a task tracker.

---

`docs/TASKS.md`

`docs/TASKS.md` is the primary execution tracker.

This file represents the current implementation backlog.

Before beginning any implementation the agent MUST:

- read `docs/TASKS.md`
- determine the highest priority unfinished task

After implementation the agent MUST:

- mark completed tasks using `[x]`
- add newly discovered tasks
- update current sprint
- update blockers
- update next recommended task
- update progress percentage

Never silently ignore newly discovered work.

Every implementation session must update `docs/TASKS.md`.

---

`docs/CHANGELOG.md`

`docs/CHANGELOG.md` records repository history.

Every meaningful implementation session must append a new entry.

Each entry should include:

- date
- summary
- feature
- files modified
- migrations created
- documentation updated
- breaking changes (if any)

Never modify previous changelog entries.

Only append.

---

`docs/DECISIONS.md`

`docs/DECISIONS.md` stores implementation decisions that do not require a formal ADR.

Examples include:

- naming conventions
- folder conventions
- package selection
- helper utilities
- UI conventions
- coding standards
- validation conventions

Whenever a recurring implementation convention is introduced,
update `docs/DECISIONS.md`.

---

`docs/KNOWN_ISSUES.md`

`docs/KNOWN_ISSUES.md` tracks:

- bugs
- technical debt
- temporary workarounds
- incomplete features
- performance concerns
- future improvements

When an issue is discovered:

- add it

When an issue is resolved:

- mark it resolved or remove it

Never silently ignore technical debt.

---

`docs/PROGRESS.md`

`docs/PROGRESS.md` provides a high-level overview of project completion.

Update after every implementation session.

Include:

Overall Completion

Phase Completion

Sprint Completion

Completed Milestones

Current Milestone

Next Milestone

Progress percentages should reflect implementation,
not planning.

---

# Documentation Update Checklist

Before ending any implementation session verify:

- [ ] `docs/TASKS.md` updated
- [ ] `docs/CHANGELOG.md` updated
- [ ] `docs/PROGRESS.md` updated
- [ ] `docs/DECISIONS.md` updated (if applicable)
- [ ] `docs/KNOWN_ISSUES.md` updated (if applicable)
- [ ] PLAN.md updated (if roadmap changed)
- [ ] PROJECT_OVERVIEW.md updated (if scope changed)
- [ ] README.md updated (if setup changed)
- [ ] ADR created (if architectural decision changed)

Implementation is NOT complete until this checklist passes.

---

# Automatically Discovered Tasks

During development, the agent will frequently discover additional work.

Examples:

- missing tests
- missing validation
- missing migrations
- missing indexes
- missing documentation
- missing utilities
- missing APIs

These MUST immediately be added to `docs/TASKS.md`.

Do not rely on conversational memory.

The repository backlog must always remain complete.

---

# Session Completion Report

At the end of every substantial implementation session,
the agent must produce a summary including:

1. Tasks completed

2. Newly discovered tasks

3. Files modified

4. Documentation updated

5. ADRs created

6. Migrations created

7. Tests added

8. Remaining blockers

9. Recommended next task

The same information should be reflected in the project documentation.

---

# Repository as the Source of Truth

The repository should always be sufficient for a new developer or AI agent to understand:

- current implementation
- architecture
- completed work
- remaining work
- known issues
- implementation decisions
- project progress
- architectural history

The project must never depend on previous chat history.

All important project knowledge must exist inside the repository.

## Reference Data

The repository contains authoritative reference datasets.

These files are considered read-only unless explicitly instructed.

Before implementing governance, routing, municipalities, wards, officer assignments, or departments, the agent must inspect:

- `resources/governance/csv/` as the machine-readable source of truth;
- `resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx` as the human reference copy.

These read-only datasets are the canonical reference for Phase 2. If the workbook and CSV exports differ, stop automated promotion and resolve the discrepancy without silently rewriting either source.

Do not hardcode municipalities, wards, departments, or officer roles.

Always derive implementation from the reference datasets.
