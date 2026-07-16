import type { Session } from '@supabase/supabase-js';

export type RestoredAuthState =
  Readonly<{ status: 'signed-in'; session: Session }> | Readonly<{ status: 'signed-out' }>;

export type AssuredAuthState =
  RestoredAuthState | Readonly<{ status: 'mfa-required'; session: Session }>;

type SessionResult = Readonly<{
  data: Readonly<{ session: Session | null }>;
  error: unknown;
}>;

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

export const resolveSessionAssurance = async (
  session: Session,
  getAssuranceLevel: () => Promise<
    Readonly<{ data: Readonly<{ currentLevel: string | null }> | null; error: unknown }>
  >,
  hasVerifiedPhoneFactor: () => Promise<boolean>,
  requirePhoneMfa = true,
): Promise<Exclude<AssuredAuthState, Readonly<{ status: 'signed-out' }>>> => {
  if (!requirePhoneMfa) return { session, status: 'signed-in' };

  try {
    const [{ data, error }, hasPhoneFactor] = await Promise.all([
      getAssuranceLevel(),
      hasVerifiedPhoneFactor(),
    ]);
    if (error || data?.currentLevel !== 'aal2' || !hasPhoneFactor) {
      return { session, status: 'mfa-required' };
    }
    return { session, status: 'signed-in' };
  } catch {
    return { session, status: 'mfa-required' };
  }
};
