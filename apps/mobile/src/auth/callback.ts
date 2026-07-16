import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

export type MobileAuthCallbackParameters = Readonly<{
  code?: string | string[];
  error?: string | string[];
  errorCode?: string | string[];
  errorDescription?: string | string[];
  tokenHash?: string | string[];
  type?: string | string[];
}>;

export type MobileAuthCallback =
  | Readonly<{ code: string; method: 'pkce' }>
  | Readonly<{ method: 'token_hash'; tokenHash: string; type: EmailOtpType }>;

const supportedEmailTypes: readonly EmailOtpType[] = ['email', 'magiclink', 'signup'];

type SignInAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

const invalidCallback = (): Error => new Error('The authentication callback is invalid.');

const readSingleParameter = (value: string | string[] | undefined): string | null => {
  if (value === undefined) return null;
  if (Array.isArray(value) || value === '' || value.length > 16_384 || value.trim() !== value) {
    throw invalidCallback();
  }
  return value;
};

export const resolveMobileAuthCallback = (
  parameters: MobileAuthCallbackParameters,
): MobileAuthCallback => {
  const error = readSingleParameter(parameters.error);
  const errorCode = readSingleParameter(parameters.errorCode);
  const errorDescription = readSingleParameter(parameters.errorDescription);
  const code = readSingleParameter(parameters.code);
  const tokenHash = readSingleParameter(parameters.tokenHash);
  const rawType = readSingleParameter(parameters.type);
  if (
    error !== null ||
    errorCode !== null ||
    errorDescription !== null ||
    Number(code !== null) + Number(tokenHash !== null) !== 1
  ) {
    throw invalidCallback();
  }
  if (code !== null) return { code, method: 'pkce' };
  const type = supportedEmailTypes.includes(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;
  if (tokenHash === null || type === null) throw invalidCallback();
  return { method: 'token_hash', tokenHash, type };
};

export const completeMobileAuthCallback = async (
  supabase: SupabaseClient,
  parameters: MobileAuthCallbackParameters,
  recordAuditEvent: SignInAuditRecorder,
): Promise<void> => {
  const callback = resolveMobileAuthCallback(parameters);
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

  await recordAuditEvent(result.data.session.access_token, 'sign_in_succeeded');
};
