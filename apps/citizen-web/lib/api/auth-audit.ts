import type { ClientAuthAuditEventType } from '@local-wellness/types';

import { apiRequest } from './client';

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
