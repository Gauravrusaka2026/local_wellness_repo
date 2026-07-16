import * as Linking from 'expo-linking';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { completeMobileAuthCallback, type MobileAuthCallbackParameters } from './callback';
import { signOutWithAudit } from './sign-out';
import { getSupabaseClient } from './supabase';
import {
  createPasswordAccount,
  exchangePasswordRecoveryCode,
  requestPasswordRecovery,
  signInWithPassword,
  updatePassword,
  type PasswordSignUpResult,
} from './password-auth';

export { getUserFacingAuthError } from './auth-error';

export const completeAuthCallback = (parameters: MobileAuthCallbackParameters): Promise<void> =>
  completeMobileAuthCallback(getSupabaseClient(), parameters, recordAuthAuditEventSafely);

export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  await signOutWithAudit(supabase);
};

export const signInWithEmailPassword = async (email: string, password: string): Promise<void> => {
  await signInWithPassword(getSupabaseClient(), email, password);
};

export const createEmailPasswordAccount = (
  email: string,
  password: string,
): Promise<PasswordSignUpResult> => createPasswordAccount(getSupabaseClient(), email, password);

export const sendPasswordRecoveryEmail = (email: string): Promise<string> =>
  requestPasswordRecovery(getSupabaseClient(), email, Linking.createURL('auth/reset-password'));

export const completePasswordRecovery = (code: string): Promise<void> =>
  exchangePasswordRecoveryCode(getSupabaseClient(), code);

export const setNewPassword = (password: string): Promise<void> =>
  updatePassword(getSupabaseClient(), password);
