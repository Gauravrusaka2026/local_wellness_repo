# Decisions

- Current-area context has a five-minute, memory-only TTL and a 100-metre accuracy ceiling.
- Community, Profile, and Nearby may consume context; complaint issue/media evidence may not.
- Explicit Refresh skips memory and operating-system last-known positions.
- Every complaint evidence action uses its own new high-accuracy native request; evidence actions
  do not share in-flight or completed results.
- Foreground permission state is read before the request API is called.
- Auth sign-out and user replacement clear current-area state and invalidate late acquisition
  generations.
- Exact context coordinates are not stored in SQLite, SecureStore, logs, analytics, or public
  projections.
- Periodic and background location acquisition are intentionally absent.
