import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

const supportedEmailOtpTypes: readonly EmailOtpType[] = ['email', 'magiclink', 'signup'];

export const getSupportedEmailOtpType = (value: string | null): EmailOtpType | null =>
  supportedEmailOtpTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;

export type EmailAuthCallback =
  | Readonly<{ code: string; method: 'pkce' }>
  | Readonly<{
      method: 'token_hash';
      tokenHash: string;
      type: EmailOtpType;
    }>;

const invalidCallback = (): Error => new Error('The authentication callback is invalid.');

const readSingleParameter = (parameters: URLSearchParams, name: string): string | null => {
  const values = parameters.getAll(name);
  if (values.length === 0) return null;
  const value = values.length === 1 ? values[0] : undefined;
  if (value === undefined || value === '' || value.length > 16_384 || value.trim() !== value) {
    throw invalidCallback();
  }
  return value;
};

export const resolveEmailAuthCallback = (callbackUrl: string): EmailAuthCallback => {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw invalidCallback();
  }
  const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  if (
    readSingleParameter(url.searchParams, 'error') ||
    readSingleParameter(url.searchParams, 'error_code') ||
    readSingleParameter(url.searchParams, 'error_description') ||
    readSingleParameter(fragment, 'error') ||
    readSingleParameter(fragment, 'error_code') ||
    readSingleParameter(fragment, 'error_description')
  ) {
    throw invalidCallback();
  }

  const code = readSingleParameter(url.searchParams, 'code');
  const tokenHash = readSingleParameter(url.searchParams, 'token_hash');
  const rawType = readSingleParameter(url.searchParams, 'type');
  const hasFragmentSession =
    readSingleParameter(fragment, 'access_token') !== null ||
    readSingleParameter(fragment, 'refresh_token') !== null;
  if (Number(code !== null) + Number(tokenHash !== null) !== 1 || hasFragmentSession) {
    throw invalidCallback();
  }
  if (code !== null) return { code, method: 'pkce' };
  if (tokenHash !== null) {
    const type = getSupportedEmailOtpType(rawType);
    if (type === null) throw invalidCallback();
    return { method: 'token_hash', tokenHash, type };
  }
  throw invalidCallback();
};

export const completeEmailAuthCallback = async (
  supabase: SupabaseClient,
  callbackUrl: string,
): Promise<string> => {
  const callback = resolveEmailAuthCallback(callbackUrl);
  const result =
    callback.method === 'pkce'
      ? await supabase.auth.exchangeCodeForSession(callback.code)
      : await supabase.auth.verifyOtp({
          token_hash: callback.tokenHash,
          type: callback.type,
        });
  if (result.error || !result.data.session?.access_token) {
    throw result.error ?? invalidCallback();
  }
  return result.data.session.access_token;
};

export const getCitizenEmailCallbackUrl = (origin: string): string =>
  new URL('/auth/callback', origin).toString();
