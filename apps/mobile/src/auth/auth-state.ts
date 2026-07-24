import type { Session, User } from '@supabase/supabase-js';

import { getConfirmedPhoneFromUser } from './phone-verification';

export type RestoredAuthState =
  Readonly<{ status: 'signed-in'; session: Session }> | Readonly<{ status: 'signed-out' }>;

export type VerifiedAuthState =
  RestoredAuthState | Readonly<{ status: 'phone-verification-required'; session: Session }>;

type SessionResult = Readonly<{
  data: Readonly<{ session: Session | null }>;
  error: unknown;
}>;

export const scheduleAuthStateFollowUp = (operation: () => void): (() => void) => {
  const timeoutId = setTimeout(operation, 0);
  return () => clearTimeout(timeoutId);
};

export const restoreAuthSession = async (
  getSession: () => Promise<SessionResult>,
): Promise<RestoredAuthState> => {
  try {
    const { data, error } = await getSession();
    if (error || data.session === null) {
      return { status: 'signed-out' };
    }

    return { session: data.session, status: 'signed-in' };
  } catch {
    return { status: 'signed-out' };
  }
};

export const resolveSessionPhoneVerification = async (
  session: Session,
  getUser: () => Promise<Readonly<{ data: Readonly<{ user: User | null }>; error: unknown }>>,
  requirePhoneVerification = true,
): Promise<Exclude<VerifiedAuthState, Readonly<{ status: 'signed-out' }>>> => {
  if (!requirePhoneVerification) return { session, status: 'signed-in' };

  try {
    const { data, error } = await getUser();
    if (
      error ||
      data.user === null ||
      data.user.id !== session.user.id ||
      getConfirmedPhoneFromUser(data.user) === null
    ) {
      return { session, status: 'phone-verification-required' };
    }
    return { session, status: 'signed-in' };
  } catch {
    return { session, status: 'phone-verification-required' };
  }
};
