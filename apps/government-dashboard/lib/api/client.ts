import {
  ApiClientError,
  createApiClient,
  type ApiResponseDecoder,
  type LocalWellnessApiClient,
} from '@local-wellness/api-client';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicApiUrl } from '../environment';

export { ApiClientError as ApiError };

export class AuthenticationRequiredError extends Error {
  public constructor() {
    super('A verified government session is required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export const getVerifiedAccessToken = async (supabase: SupabaseClient): Promise<string> => {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== 'string') {
    throw new AuthenticationRequiredError();
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new AuthenticationRequiredError();
  }

  return sessionData.session.access_token;
};

export const createGovernmentApiClient = (accessToken: string): LocalWellnessApiClient =>
  createApiClient({
    baseUrl: getPublicApiUrl(),
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    getAccessToken: () => accessToken,
  });

type ApiRequestOptions<Output> = Readonly<{
  accessToken: string;
  body?: unknown;
  decode: ApiResponseDecoder<Output>;
  idempotencyKey?: string;
  method?: 'GET' | 'POST';
}>;

export const apiRequest = <Output>(
  path: `/${string}`,
  options: ApiRequestOptions<Output>,
): Promise<Output> =>
  createGovernmentApiClient(options.accessToken).request(path, {
    ...(options.body === undefined ? {} : { body: options.body }),
    decode: options.decode,
    ...(options.idempotencyKey === undefined ? {} : { idempotencyKey: options.idempotencyKey }),
    method: options.method ?? 'GET',
  });

export const getUserFacingApiError = (error: unknown): string => {
  if (error instanceof AuthenticationRequiredError) {
    return 'Your session has expired. Sign in again.';
  }

  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return 'Your session has expired. Sign in again.';
    }

    if (error.status === 403) {
      return 'Your government access is not active for this complaint.';
    }

    if (error.status === 404) {
      return 'The complaint was not found in your current access scope.';
    }

    if (error.status === 409) {
      return 'This complaint changed while you were working. Review the latest version and try again.';
    }

    return error.message;
  }

  return 'Something went wrong. Please try again.';
};
