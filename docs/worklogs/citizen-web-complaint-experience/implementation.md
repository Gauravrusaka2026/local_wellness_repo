# Implementation

The protected `/complaints` route uses the existing owner-scoped list endpoint with bounded cursor
pagination. `/complaints/[complaintId]` combines strict detail, timeline, and resolution-context
decoding and excludes exact coordinates, internal routing identifiers, private object paths, and
government-only notes from presentation.

Feedback and reopen server actions reload current resolution/workflow context, validate the
allowlisted outcome/rating/reason inputs, generate idempotency keys, and ignore client-supplied
official identities. When policy requires new location evidence, the web action fails safely and
directs the owner to mobile instead of bypassing the requirement. Home/account navigation and the
authentication proxy include the new protected routes.
