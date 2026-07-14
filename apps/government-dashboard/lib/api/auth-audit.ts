import type { ClientAuthAuditEventType } from '@local-wellness/types';

import { apiRequest } from './client';

const decodeAuditRecord = (value: unknown): true => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('occurredAt' in value) ||
    typeof value.occurredAt !== 'string'
  ) {
    throw new TypeError('Invalid authentication audit response.');
  }

  return true;
};

export const recordAuthAuditEventSafely = async (
  accessToken: string,
  eventType: ClientAuthAuditEventType,
): Promise<boolean> => {
  try {
    await apiRequest<unknown>('/api/v1/auth/audit-events', {
      accessToken,
      body: { eventType },
      decode: decodeAuditRecord,
      method: 'POST',
    });
    return true;
  } catch {
    // Access remains usable when non-critical audit delivery is temporarily unavailable.
    return false;
  }
};
