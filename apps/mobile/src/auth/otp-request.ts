import type { SignInWithPasswordlessCredentials } from '@supabase/supabase-js';

import {
  normalizeEmail,
  normalizePhone,
  type AuthChannel,
  type CitizenAuthMode,
} from './auth-input';

export const shouldCreateCitizenForMode = (mode: CitizenAuthMode): boolean =>
  mode === 'create_account';

export const createOtpRequest = (
  channel: AuthChannel,
  identifier: string,
  mode: CitizenAuthMode,
  emailRedirectTo: string,
): Readonly<{ credentials: SignInWithPasswordlessCredentials; normalizedIdentifier: string }> => {
  const shouldCreateUser = shouldCreateCitizenForMode(mode);

  if (channel === 'phone') {
    const phone = normalizePhone(identifier);
    return {
      credentials: { phone, options: { shouldCreateUser } },
      normalizedIdentifier: phone,
    };
  }

  const email = normalizeEmail(identifier);
  return {
    credentials: {
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser,
      },
    },
    normalizedIdentifier: email,
  };
};
