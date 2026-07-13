import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationError } from '@local-wellness/config';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { EmailInputError, normalizeEmail } from './input';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

export const requestGovernmentMagicLink = async (
  supabase: SupabaseClient,
  emailInput: string,
  emailRedirectTo: string,
): Promise<void> => {
  const email = normalizeEmail(emailInput);

  // Always present the same result so this surface cannot enumerate invited accounts.
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });
};

export const signOutGovernmentSession = async (
  supabase: SupabaseClient,
  recordAuditEvent: SignOutAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  if (accessToken) {
    await recordAuditEvent(accessToken, 'sign_out_succeeded');
  }
};

export const getGovernmentLoginError = (error: unknown): string => {
  if (error instanceof EmailInputError || error instanceof ConfigurationError) {
    return error.message;
  }

  return 'The sign-in request could not be sent. Please try again.';
};
