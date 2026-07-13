import {
  firstConfiguredValue,
  parseApiConfiguration,
  type ApiConfiguration,
} from '@local-wellness/config';

export const API_CONFIGURATION = Symbol('API_CONFIGURATION');

export const loadApiConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfiguration =>
  parseApiConfiguration({
    allowedOrigins: environment['API_ALLOWED_ORIGINS'],
    governmentInviteRedirectUrl: environment['GOVERNMENT_INVITE_REDIRECT_URL'],
    port: environment['PORT'],
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
