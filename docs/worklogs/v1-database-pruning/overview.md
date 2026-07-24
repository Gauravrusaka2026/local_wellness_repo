# V1 database pruning

## Objective

Physically remove database structures that no current V1 runtime uses while preserving every
active authentication, complaint, media, routing, email, Community and government workflow.

## Outcome

The forward migration removes 14 governance synchronization/contact tables and the unused public
comments table, reducing the custom table count from 129 to 114. It also removes the undeployed
Edge fetch boundary and keeps delivery-readiness responses compatible through the existing private
ward/category matrix.

## Scope boundary

This slice does not remove active SLA/KPI, private messaging, notifications, transparency,
accountability, generalized routing evidence or complaint-history tables. Those require separate
compact replacements before a safe physical drop.
