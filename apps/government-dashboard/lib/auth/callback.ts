import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

const supportedTypes: readonly EmailOtpType[] = ['invite', 'magiclink', 'email'];

export const getSupportedEmailOtpType = (value: string | null): EmailOtpType | null =>
  supportedTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;

export type EmailAuthCallback =
  | Readonly<{ code: string; method: 'pkce' }>
  | Readonly<{
      method: 'token_hash';
      tokenHash: string;
      type: EmailOtpType;
    }>
  | Readonly<{
      accessToken: string;
      method: 'implicit';
      refreshToken: string;
      type: 'invite';
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
  const accessToken = readSingleParameter(fragment, 'access_token');
  const refreshToken = readSingleParameter(fragment, 'refresh_token');
  const fragmentType = readSingleParameter(fragment, 'type');
  const hasImplicitSession = accessToken !== null || refreshToken !== null;
  const methodCount =
    Number(code !== null) + Number(tokenHash !== null) + Number(hasImplicitSession);
  if (methodCount !== 1 || (accessToken === null) !== (refreshToken === null)) {
    throw invalidCallback();
  }
  if (code !== null) {
    if (fragmentType !== null) throw invalidCallback();
    return { code, method: 'pkce' };
  }
  if (tokenHash !== null) {
    if (fragmentType !== null) throw invalidCallback();
    const type = getSupportedEmailOtpType(rawType);
    if (type === null) throw invalidCallback();
    return { method: 'token_hash', tokenHash, type };
  }
  if (accessToken !== null && refreshToken !== null) {
    if (rawType !== null || fragmentType !== 'invite') throw invalidCallback();
    return { accessToken, method: 'implicit', refreshToken, type: 'invite' };
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
      : callback.method === 'token_hash'
        ? await supabase.auth.verifyOtp({
            token_hash: callback.tokenHash,
            type: callback.type,
          })
        : await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });
  if (result.error || !result.data.session?.access_token) {
    throw result.error ?? invalidCallback();
  }
  return result.data.session.access_token;
};

export const getGovernmentEmailCallbackUrl = (origin: string): string =>
  new URL('/auth/callback', origin).toString();
