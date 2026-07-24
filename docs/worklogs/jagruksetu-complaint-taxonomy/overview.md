# JagrukSetu complaint taxonomy

## Objective

Replace the mobile complaint form's long flat category list with a data-driven primary-category and
subcategory selection while retaining server-owned routing and detailed, validated complaint
classification.

## Outcome

The reference taxonomy contains 17 primary categories and 340 subcategories after adding
Corruption, Bribery & Public Integrity. Mobile presents primary and subcategory dropdowns and shows
the derived workflow type and routing readiness. The database retains the selected taxonomy tuple
on the resumable draft and maps only reviewed subcategories to existing operational routing
profiles.

Thirteen taxonomy subcategories map to the twelve stable V1 operational routing profiles. The
remaining 327 subcategories are discoverable and resumable but cannot be submitted until their
independent routing evidence is approved. The taxonomy defines 19 derived workflow types; it does
not define concrete issue-variant records in V1.

## Scope Boundary

This slice does not invent issue variants, departments, officials, oversight contacts or route
rules missing from the reference data. It does not make a protected corruption allegation public
or send it to an ordinary ward mailbox. Those operations require separately reviewed source data
and privacy controls.

Hosted Supabase was not modified by this implementation. The generated SQL Editor artifact is an
explicit operator deployment path after migration `20260723110000_prune_deferred_v1_subsystems.sql`.
