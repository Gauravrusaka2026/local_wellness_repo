# Phase 6 Open Issues

- Push and email are not operational. Select providers and define notification consent,
  preferences, quiet hours, localization, destination verification, fallback, retention, and
  provider-error policy before activation.
- The V1 realtime topology supports one Socket.IO instance. Horizontal delivery requires a reviewed
  cross-instance mechanism and a later ADR; Redis remains intentionally absent.
- Public comments have storage structure only and no create/read RPC or client route. Public
  complaint visibility, privacy, moderation, abuse controls, and retention must be approved first.
- Reopen and escalation notification event types are modeled, but their domain-event producers
  belong to later workflow phases.
- A recipient without a connected socket relies on durable in-app history. Push/email cannot yet
  wake an offline device.
- Hosted and physical-device validation remains pending, including reconnect/deduplication,
  token-expiry disconnect, cross-scope denial, and delivery-backlog monitoring.
- Real pilot complaints remain blocked until verified Pune governance, geometry, recipient, and
  routing records are reviewed and activated. Synthetic fixtures do not satisfy that requirement.
