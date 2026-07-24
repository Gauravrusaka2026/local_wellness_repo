import {
  ConfigurationError,
  firstConfiguredValue,
  parseApiConfiguration,
  type ApiConfiguration,
} from '@local-wellness/config';

export const API_CONFIGURATION = Symbol('API_CONFIGURATION');

export const loadApiConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfiguration => {
  const citizenPhoneVerificationMode = firstConfiguredValue(
    environment['API_CITIZEN_PHONE_VERIFICATION_MODE'],
    environment['API_CITIZEN_PHONE_MFA_MODE'],
  );

  if (
    environment['NODE_ENV'] === 'production' &&
    citizenPhoneVerificationMode?.trim() !== 'enforce'
  ) {
    throw new ConfigurationError(
      'API_CITIZEN_PHONE_VERIFICATION_MODE must be explicitly set to enforce in production.',
    );
  }

  return parseApiConfiguration({
    allowedOrigins: environment['API_ALLOWED_ORIGINS'],
    citizenPhoneVerificationMode,
    governmentInviteRedirectUrl: environment['GOVERNMENT_INVITE_REDIRECT_URL'],
    port: environment['PORT'],
    privilegedMfaMode: environment['API_PRIVILEGED_MFA_MODE'],
    supabaseAnonKey: firstConfiguredValue(
      environment['SUPABASE_PUBLISHABLE_KEY'],
      environment['SUPABASE_ANON_KEY'],
    ),
    supabaseServiceRoleKey: firstConfiguredValue(
      environment['SUPABASE_SECRET_KEY'],
      environment['SUPABASE_SERVICE_ROLE_KEY'],
    ),
    supabaseUrl: environment['SUPABASE_URL'],
  });
};
