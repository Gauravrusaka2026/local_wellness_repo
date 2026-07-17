import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicApiUrl } from '../environment';

type ApiRequestOptions = Readonly<{
  accessToken: string;
  body?: unknown;
  idempotencyKey?: string;
  method?: 'GET' | 'PATCH' | 'POST';
}>;

export type VerifiedCitizenSession = Readonly<{
  accessToken: string;
  identity: Readonly<{
    email: string | null;
    phone: string | null;
    userId: string;
  }>;
}>;

export class AuthenticationRequiredError extends Error {
  public constructor() {
    super('A verified session is required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly requestId: string | null;
  public readonly status: number;

  public constructor(options: {
    code: string;
    message: string;
    requestId?: string | null;
    status: number;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.requestId = options.requestId ?? null;
    this.status = options.status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getRequestId = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload['meta'])) {
    return null;
  }

  return typeof payload['meta']['requestId'] === 'string' ? payload['meta']['requestId'] : null;
};

export const getVerifiedCitizenSession = async (
  supabase: SupabaseClient,
): Promise<VerifiedCitizenSession> => {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || typeof claims?.sub !== 'string') {
    throw new AuthenticationRequiredError();
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new AuthenticationRequiredError();
  }

  return {
    accessToken: sessionData.session.access_token,
    identity: {
      email: typeof claims.email === 'string' ? claims.email : null,
      phone: typeof claims.phone === 'string' ? claims.phone : null,
      userId: claims.sub,
    },
  };
};

export const getVerifiedAccessToken = async (supabase: SupabaseClient): Promise<string> =>
  (await getVerifiedCitizenSession(supabase)).accessToken;

export const apiRequest = async <T>(path: `/${string}`, options: ApiRequestOptions): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${getPublicApiUrl()}${path}`, {
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${options.accessToken}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.idempotencyKey === undefined
          ? {}
          : { 'Idempotency-Key': options.idempotencyKey }),
      },
      method: options.method ?? 'GET',
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach Local Wellness. Please try again.',
      status: 0,
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload['error']) ? payload['error'] : undefined;
    throw new ApiError({
      code: typeof error?.['code'] === 'string' ? error['code'] : 'REQUEST_FAILED',
      message:
        typeof error?.['message'] === 'string'
          ? error['message']
          : 'The request could not be completed. Please try again.',
      requestId: getRequestId(payload),
      status: response.status,
    });
  }

  if (!isRecord(payload) || !('data' in payload)) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Local Wellness returned an invalid response. Please try again.',
      requestId: getRequestId(payload),
      status: response.status,
    });
  }

  return payload['data'] as T;
};

export const getUserFacingApiError = (error: unknown): string => {
  if (error instanceof AuthenticationRequiredError) {
    return 'Your session has expired. Sign in again.';
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};
