# JagrukSetu BMC intake V1

## Objective

Make the complete JagrukSetu complaint taxonomy useful for Mumbai V1 without creating one routing
profile and one 26-ward recipient matrix per citizen-facing issue type.

## Outcome

The 340 taxonomy leaves are divided into two explicit runtime paths:

- 256 ordinary civic issues submit through the existing server-owned location → BMC ward →
  complaint assignment → ward-email pipeline. Thirteen retain one of 12 specialised profiles and
  243 reuse one `general_ward_complaint` profile, for 13 operational profiles in total.
- 84 private or emergency-private issues do not create a normal complaint, assignment, ward email,
  or Community post. Mobile presents approved official telephone or credential-free HTTPS handoff
  actions instead.

The private ward-contact matrix grows from 312 to 338 rows: the original 26 wards × 12 profiles
plus one general profile per ward. It does not grow to 26 × 340.

## Scope Boundary

The general profile is a bounded Mumbai staging fallback, not evidence that every issue belongs to
the ward office in a production-grade authority graph. Future reviewed department, asset-owner,
police, regulator, transport, or state routes may replace individual taxonomy mappings.

Protected actions are external handoffs. Opening a dialler or government page does not create a
JagrukSetu complaint number, assignment, Community post, or delivery receipt from that authority.
No recipient email or protected-action source metadata is exposed to the mobile client.

Hosted Supabase is not changed by local generation or tests. The generated SQL Editor deployment
must be applied through the reviewed hosted migration workflow.
