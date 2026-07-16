import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { normalizeEmail, normalizePassword } from './auth-input';

type PasswordAuthAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

export type PasswordSignUpResult =
  | Readonly<{ status: 'email-confirmation-required' }>
  | Readonly<{ session: Session; status: 'signed-in' }>;

export const signInWithPassword = async (
  supabase: SupabaseClient,
  emailValue: string,
  passwordValue: string,
  recordAuditEvent: PasswordAuthAuditRecorder = recordAuthAuditEventSafely,
): Promise<Session> => {
  const email = normalizeEmail(emailValue);
  const password = normalizePassword(passwordValue);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (data.session === null) throw new Error('Authentication session was not established.');

  await recordAuditEvent(data.session.access_token, 'sign_in_succeeded');
  return data.session;
};

export const createPasswordAccount = async (
  supabase: SupabaseClient,
  emailValue: string,
  passwordValue: string,
  recordAuditEvent: PasswordAuthAuditRecorder = recordAuthAuditEventSafely,
): Promise<PasswordSignUpResult> => {
  const email = normalizeEmail(emailValue);
  const password = normalizePassword(passwordValue);
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) throw error;
  if (data.session === null) return { status: 'email-confirmation-required' };

  await recordAuditEvent(data.session.access_token, 'sign_in_succeeded');
  return { session: data.session, status: 'signed-in' };
};

export const requestPasswordRecovery = async (
  supabase: SupabaseClient,
  emailValue: string,
  redirectTo: string,
): Promise<string> => {
  const email = normalizeEmail(emailValue);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return email;
};

export const exchangePasswordRecoveryCode = async (
  supabase: SupabaseClient,
  code: string,
): Promise<void> => {
  const normalizedCode = code.trim();
  if (normalizedCode.length === 0) throw new Error('The password recovery link is invalid.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(normalizedCode);
  if (error) throw error;
  if (data.session === null) throw new Error('Password recovery session was not established.');
};

export const updatePassword = async (
  supabase: SupabaseClient,
  passwordValue: string,
): Promise<void> => {
  const password = normalizePassword(passwordValue);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};
