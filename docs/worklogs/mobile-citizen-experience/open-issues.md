# Open Issues

- Apply `20260724120000_verified_civic_area_office_contacts.sql` through the reconciled hosted
  migration workflow (or run the byte-identical SQL Editor artifact) and deploy the matching API/
  mobile build.
- Obtain and review official current pilot entity/boundary data before expecting Nearby to resolve;
  never use placeholders or synthetic test fixtures.
- Run the complete Expo Go physical-device matrix over LAN, including OTP, focus/refresh, permanent
  permission denial, GPS accuracy, photo/video/voice capture, upload interruption, resume, detail,
  notifications, and logout.
- Verify that Community → Nearby → Profile reuses one current-area acquisition within five
  minutes, that automatic permission is requested no more than once per process, that explicit
  recovery/refresh still works after denial or movement, and that sequential complaint/media
  evidence obtains fresh fixes.
- Activate reviewed operational categories, geometry, ownership, routing policy/rules, roles, and
  assignments before claiming real complaint submission.
- Run the four BMC SQL Editor deployment parts in order, reconcile all 43 migrations, and verify
  category, ward, routing, private photo, and complaint submission behavior on staging without
  enabling external delivery.
- Apply the engagement migration plus approved reviewed-public policy/data, then verify Local,
  Trending, Heat, one-support/account, private-star, withdrawal, quota, and device behavior. Staff
  pilot moderation/abuse operations before public activation; comments remain disabled.
- Submit one complaint on device and prove its owner-only Community preview appears without
  location or public publication and remains absent for another citizen.
- Complete native screen-reader, dynamic-text/long-label, contrast, reduced-motion, and physical
  touch-target review for English, Marathi, and Hindi.
- Add a citizen-facing way to remove an unwanted captured attachment from a draft before
  submission, with server/storage lifecycle and retry coverage.
- Add an owner-authorized short-lived signed-read endpoint and mobile viewer for finalized original
  complaint evidence; keep object paths/private Storage inaccessible directly.
- Paginate notification history beyond the current newest 100 records using the existing API cursor
  without weakening durable read state or realtime reconciliation.
- Configure OS push only after closing the owner/provider/policy inputs in `NOTIFY-001`.
- A persistent street address is not part of the current civic-area card. Before adding one, define
  a private profile-address table/API, consent, provenance/reverse-geocoding source, retention,
  correction/deletion, and scoped-access policy; do not add exact home location to the broadly
  readable profile row.
- Validate representative ward and municipality-wide office call, mail, and in-app source actions
  against hosted data. Provider publication does not prove that the mailbox or switchboard responds.
