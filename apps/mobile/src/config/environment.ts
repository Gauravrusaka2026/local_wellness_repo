import {
  ConfigurationError,
  firstConfiguredValue,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '@local-wellness/config';

type MobileRuntimeEnvironment = Readonly<{ isNativeRuntime: boolean }>;
export type PhoneVerificationMode = 'enforce' | 'observe';

const readJwtPayload = (key: string): Record<string, unknown> | null => {
  const encodedPayload = key.split('.')[1];
  const decodeBase64 = (
    globalThis as typeof globalThis & { atob?: (encodedValue: string) => string }
  ).atob;

  if (encodedPayload === undefined || decodeBase64 === undefined) return null;

  try {
    const normalizedPayload = encodedPayload.replace(/-/gu, '+').replace(/_/gu, '/');
    const paddingLength = (4 - (normalizedPayload.length % 4)) % 4;
    const value: unknown = JSON.parse(
      decodeBase64(normalizedPayload.padEnd(normalizedPayload.length + paddingLength, '=')),
    );
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const projectReferenceFromHostname = (hostname: string): string | null => {
  const normalizedHostname = hostname.toLowerCase();
  const suffix = '.supabase.co';
  if (!normalizedHostname.endsWith(suffix)) return null;

  const reference = normalizedHostname.slice(0, -suffix.length);
  return reference.length > 0 && !reference.includes('.') ? reference : null;
};

const projectReferenceFromPublicKey = (key: string): string | null => {
  const payload = readJwtPayload(key);
  if (payload === null) return null;

  const reference = payload['ref'];
  if (typeof reference === 'string' && reference.trim().length > 0) {
    return reference.trim().toLowerCase();
  }

  const issuer = payload['iss'];
  if (typeof issuer !== 'string') return null;

  try {
    return projectReferenceFromHostname(new URL(issuer).hostname);
  } catch {
    return null;
  }
};

export const assertSupabaseProjectAlignment = (
  configuration: Readonly<{ anonKey: string; url: string }>,
): void => {
  const urlReference = projectReferenceFromHostname(new URL(configuration.url).hostname);
  const keyReference = projectReferenceFromPublicKey(configuration.anonKey);

  if (urlReference !== null && keyReference !== null && urlReference !== keyReference) {
    throw new ConfigurationError(
      'The Supabase URL and public key belong to different projects. Update the mobile environment together.',
    );
  }
};

export const isLoopbackUrl = (value: string): boolean => {
  const hostname = new URL(value).hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === '::' ||
    hostname === '[::]' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    /^127(?:\.\d{1,3}){3}$/u.test(hostname)
  );
};

export const assertNativeUrlIsReachable = (
  value: string,
  name: string,
  runtime: MobileRuntimeEnvironment,
): void => {
  if (runtime.isNativeRuntime && isLoopbackUrl(value)) {
    throw new ConfigurationError(
      `${name} cannot use localhost or a loopback address on a phone. Use the development computer's LAN address.`,
    );
  }
};

export const getPublicSupabaseConfiguration = () => {
  const configuration = parsePublicSupabaseConfiguration({
    anonKey: firstConfiguredValue(
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });

  assertSupabaseProjectAlignment(configuration);
  return configuration;
};

export const getPublicApiUrl = (): string =>
  parsePublicHttpUrl(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL');

export const getPublicRealtimeUrl = (): string | null => {
  const value = process.env.EXPO_PUBLIC_REALTIME_URL?.trim();
  return value ? parsePublicHttpUrl(value, 'EXPO_PUBLIC_REALTIME_URL') : null;
};

export const getPublicPhoneVerificationMode = (
  value: string | undefined = firstConfiguredValue(
    process.env.EXPO_PUBLIC_PHONE_VERIFICATION_MODE,
    process.env.EXPO_PUBLIC_PHONE_MFA_MODE,
  ),
): PhoneVerificationMode => {
  const mode = value?.trim().toLowerCase() || 'enforce';
  if (mode !== 'observe' && mode !== 'enforce') {
    throw new ConfigurationError('EXPO_PUBLIC_PHONE_VERIFICATION_MODE must be observe or enforce.');
  }
  return mode;
};

export const validateMobileRuntimeEnvironment = (runtime: MobileRuntimeEnvironment): void => {
  getPublicPhoneVerificationMode();
  const supabase = getPublicSupabaseConfiguration();
  assertNativeUrlIsReachable(supabase.url, 'EXPO_PUBLIC_SUPABASE_URL', runtime);
  assertNativeUrlIsReachable(getPublicApiUrl(), 'EXPO_PUBLIC_API_URL', runtime);

  const realtimeUrl = getPublicRealtimeUrl();
  if (realtimeUrl !== null) {
    assertNativeUrlIsReachable(realtimeUrl, 'EXPO_PUBLIC_REALTIME_URL', runtime);
  }
};
