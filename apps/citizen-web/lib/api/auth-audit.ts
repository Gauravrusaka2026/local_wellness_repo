import type { ClientAuthAuditEventType } from '@local-wellness/types';

import { apiRequest } from './client';

export const AUTH_AUDIT_TIMEOUT_MS = 2_000;

export const recordAuthAuditEventSafely = async (
  accessToken: string,
  eventType: ClientAuthAuditEventType,
): Promise<boolean> => {
  try {
    await apiRequest<unknown>('/api/v1/auth/audit-events', {
      accessToken,
      body: { eventType },
      method: 'POST',
    });
    return true;
  } catch {
    // Audit delivery is best effort so a temporary API outage cannot strand the user's session.
    return false;
  }
};

type AuthAuditRecorder = (
  accessToken: string,
  eventType: ClientAuthAuditEventType,
) => Promise<boolean>;

export const recordAuthAuditEventWithin = async (
  accessToken: string,
  eventType: ClientAuthAuditEventType,
  recordAuditEvent: AuthAuditRecorder = recordAuthAuditEventSafely,
  timeoutMs = AUTH_AUDIT_TIMEOUT_MS,
): Promise<boolean> => {
  const boundedTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : AUTH_AUDIT_TIMEOUT_MS;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const delivery = Promise.resolve()
    .then(() => recordAuditEvent(accessToken, eventType))
    .catch(() => false);
  const deadline = new Promise<false>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(false), boundedTimeoutMs);
  });

  const delivered = await Promise.race([delivery, deadline]);
  if (timeoutHandle !== undefined) {
    clearTimeout(timeoutHandle);
  }

  return delivered;
};
