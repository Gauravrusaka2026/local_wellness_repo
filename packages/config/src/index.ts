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
  governmentInviteRedirectUrl: string;
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
  governmentInviteRedirectUrl: string | undefined;
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

export const parsePublicHttpUrl = (value: string | undefined, name = 'Public API URL'): string =>
  requireHttpUrl(value, name);

export const parsePublicSupabaseConfiguration = (
  input: PublicSupabaseInput,
): PublicSupabaseConfiguration => ({
  anonKey: requireValue(input.anonKey, 'Supabase public key'),
  url: requireHttpUrl(input.url, 'Supabase URL'),
});

export const parseApiConfiguration = (input: ApiConfigurationInput): ApiConfiguration => {
  const portValue = input.port?.trim() || '3001';
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError('API port must be an integer between 1 and 65535.');
  }

  const allowedOrigins = (input.allowedOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => requireHttpUrl(origin, 'API allowed origin'));

  if (allowedOrigins.length === 0) {
    throw new ConfigurationError('At least one API allowed origin is required.');
  }

  return {
    allowedOrigins: [...new Set(allowedOrigins)],
    governmentInviteRedirectUrl: requireHttpUrl(
      input.governmentInviteRedirectUrl,
      'Government invitation redirect URL',
    ),
    port,
    supabase: {
      ...parsePublicSupabaseConfiguration({
        anonKey: input.supabaseAnonKey,
        url: input.supabaseUrl,
      }),
      serviceRoleKey: requireValue(input.supabaseServiceRoleKey, 'Supabase service role key'),
    },
  };
};
