export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export type PublicSupabaseConfiguration = Readonly<{
  anonKey: string;
  url: string;
}>;

export type ApiConfiguration = Readonly<{
  allowedOrigins: readonly string[];
  citizenPhoneMfaMode: 'enforce' | 'observe';
  governmentInviteRedirectUrl: string;
  port: number;
  privilegedMfaMode: 'enforce' | 'observe';
  supabase: Readonly<{
    anonKey: string;
    serviceRoleKey: string;
    url: string;
  }>;
}>;

export type RealtimeConfiguration = Readonly<{
  allowedOrigins: readonly string[];
  delivery: Readonly<{
    batchSize: number;
    leaseSeconds: number;
    pollIntervalMilliseconds: number;
  }>;
  eventRateLimitPerMinute: number;
  maxHttpBufferSizeBytes: number;
  maxRoomsPerSocket: number;
  port: number;
  supabase: Readonly<{
    anonKey: string;
    serviceRoleKey: string;
    url: string;
  }>;
}>;

type PublicSupabaseInput = Readonly<{
  anonKey: string | undefined;
  url: string | undefined;
}>;

type ApiConfigurationInput = Readonly<{
  allowedOrigins: string | undefined;
  citizenPhoneMfaMode: string | undefined;
  governmentInviteRedirectUrl: string | undefined;
  port: string | undefined;
  privilegedMfaMode: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  supabaseUrl: string | undefined;
}>;

type RealtimeConfigurationInput = Readonly<{
  allowedOrigins: string | undefined;
  deliveryBatchSize: string | undefined;
  deliveryLeaseSeconds: string | undefined;
  deliveryPollIntervalMilliseconds: string | undefined;
  eventRateLimitPerMinute: string | undefined;
  maxHttpBufferSizeBytes: string | undefined;
  maxRoomsPerSocket: string | undefined;
  port: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  supabaseUrl: string | undefined;
}>;

export const firstConfiguredValue = (
  ...values: readonly (string | undefined)[]
): string | undefined => values.find((value) => Boolean(value?.trim()));

const requireValue = (value: string | undefined, name: string): string => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new ConfigurationError(`${name} is required.`);
  }

  return normalizedValue;
};

const requireHttpUrl = (value: string | undefined, name: string): string => {
  const normalizedValue = requireValue(value, name);

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new ConfigurationError(`${name} must be a valid HTTP(S) URL.`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ConfigurationError(`${name} must be a valid HTTP(S) URL.`);
  }

  return parsedUrl.toString().replace(/\/$/, '');
};

const parseIntegerInRange = (
  value: string | undefined,
  options: Readonly<{ defaultValue: number; maximum: number; minimum: number; name: string }>,
): number => {
  const normalizedValue = value?.trim() || String(options.defaultValue);
  const parsedValue = Number(normalizedValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < options.minimum ||
    parsedValue > options.maximum
  ) {
    throw new ConfigurationError(
      `${options.name} must be an integer between ${options.minimum} and ${options.maximum}.`,
    );
  }

  return parsedValue;
};

const parseAllowedOrigins = (value: string | undefined, name: string): readonly string[] => {
  const allowedOrigins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => requireHttpUrl(origin, name));

  if (allowedOrigins.length === 0) {
    throw new ConfigurationError(`At least one ${name.toLowerCase()} is required.`);
  }

  return [...new Set(allowedOrigins)];
};

const parseMfaMode = (value: string | undefined, name: string): 'enforce' | 'observe' => {
  const normalizedValue = value?.trim() || 'observe';

  if (normalizedValue !== 'observe' && normalizedValue !== 'enforce') {
    throw new ConfigurationError(`${name} must be either observe or enforce.`);
  }

  return normalizedValue;
};

export const parsePublicHttpUrl = (value: string | undefined, name = 'Public API URL'): string =>
  requireHttpUrl(value, name);

export const parsePublicSupabaseConfiguration = (
  input: PublicSupabaseInput,
): PublicSupabaseConfiguration => ({
  anonKey: requireValue(input.anonKey, 'Supabase public key'),
  url: requireHttpUrl(input.url, 'Supabase URL'),
});

export const parseApiConfiguration = (input: ApiConfigurationInput): ApiConfiguration => {
  const port = parseIntegerInRange(input.port, {
    defaultValue: 3001,
    maximum: 65_535,
    minimum: 1,
    name: 'API port',
  });

  return {
    allowedOrigins: parseAllowedOrigins(input.allowedOrigins, 'API allowed origin'),
    citizenPhoneMfaMode: parseMfaMode(input.citizenPhoneMfaMode, 'API citizen phone MFA mode'),
    governmentInviteRedirectUrl: requireHttpUrl(
      input.governmentInviteRedirectUrl,
      'Government invitation redirect URL',
    ),
    port,
    privilegedMfaMode: parseMfaMode(input.privilegedMfaMode, 'API privileged MFA mode'),
    supabase: {
      ...parsePublicSupabaseConfiguration({
        anonKey: input.supabaseAnonKey,
        url: input.supabaseUrl,
      }),
      serviceRoleKey: requireValue(input.supabaseServiceRoleKey, 'Supabase service role key'),
    },
  };
};

export const parseRealtimeConfiguration = (
  input: RealtimeConfigurationInput,
): RealtimeConfiguration => ({
  allowedOrigins: parseAllowedOrigins(input.allowedOrigins, 'Realtime allowed origin'),
  delivery: {
    batchSize: parseIntegerInRange(input.deliveryBatchSize, {
      defaultValue: 25,
      maximum: 100,
      minimum: 1,
      name: 'Realtime delivery batch size',
    }),
    leaseSeconds: parseIntegerInRange(input.deliveryLeaseSeconds, {
      defaultValue: 30,
      maximum: 300,
      minimum: 5,
      name: 'Realtime delivery lease seconds',
    }),
    pollIntervalMilliseconds: parseIntegerInRange(input.deliveryPollIntervalMilliseconds, {
      defaultValue: 1_000,
      maximum: 60_000,
      minimum: 250,
      name: 'Realtime delivery poll interval',
    }),
  },
  eventRateLimitPerMinute: parseIntegerInRange(input.eventRateLimitPerMinute, {
    defaultValue: 120,
    maximum: 1_000,
    minimum: 10,
    name: 'Realtime event rate limit',
  }),
  maxHttpBufferSizeBytes: parseIntegerInRange(input.maxHttpBufferSizeBytes, {
    defaultValue: 64 * 1_024,
    maximum: 1_024 * 1_024,
    minimum: 1_024,
    name: 'Realtime maximum HTTP buffer size',
  }),
  maxRoomsPerSocket: parseIntegerInRange(input.maxRoomsPerSocket, {
    defaultValue: 32,
    maximum: 128,
    minimum: 1,
    name: 'Realtime maximum rooms per socket',
  }),
  port: parseIntegerInRange(input.port, {
    defaultValue: 3002,
    maximum: 65_535,
    minimum: 1,
    name: 'Realtime port',
  }),
  supabase: {
    ...parsePublicSupabaseConfiguration({
      anonKey: input.supabaseAnonKey,
      url: input.supabaseUrl,
    }),
    serviceRoleKey: requireValue(input.supabaseServiceRoleKey, 'Supabase service role key'),
  },
});
