import type { User } from '@supabase/supabase-js';

import { normalizePhone } from './input';

export const normalizeStoredPhone = (phone: string | null | undefined): string | null => {
  if (!phone) {
    return null;
  }

  try {
    return normalizePhone(/^[1-9]\d{7,14}$/u.test(phone) ? `+${phone}` : phone);
  } catch {
    return null;
  }
};

export const hasConfirmedPhoneTimestamp = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));

export const isCitizenPhoneVerifiedUser = (
  user: Pick<User, 'phone' | 'phone_confirmed_at'>,
): boolean =>
  normalizeStoredPhone(user.phone) !== null && hasConfirmedPhoneTimestamp(user.phone_confirmed_at);
