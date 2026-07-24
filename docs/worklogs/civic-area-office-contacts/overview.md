# Civic-Area Office Contacts

## Goal

Add a bounded, authenticated office-contact directory to the existing verified civic-area lookup
without exposing complaint-routing recipients or private official data.

## Scope

- additive Supabase projection/index migration and SQL Editor artifact;
- strict shared TypeScript/Zod contract;
- NestJS service-role store and endpoint response;
- Expo “Your civic area” automatic lookup, office cards, and safe contact actions;
- focused database, API, validation, and mobile tests.

## Non-goals

- changing complaint routing or email recipients;
- exposing `routing.ward_issue_contacts`, WhatsApp contacts, officer mobiles, or internal IDs;
- adding a persistent location/result cache, map provider, directions, or opening-hours data;
- changing canonical governance CSV/XLSX files.

## Data Boundary

Only active, verified, non-placeholder `governance.offices` rows with an active official HTTPS
source, verification date, exact resolved ward or resolved-local-body-wide scope, and at least one
public contact field are eligible. Absent address/phone/email fields are omitted.

## Related Decision

[ADR-0037](../../adr/0037-expose-sanitized-civic-area-office-contacts.md)
