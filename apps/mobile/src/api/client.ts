import { getPublicApiUrl } from '../config/environment';

type ErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: unknown;
    details?: unknown;
    message?: unknown;
  }>;
  meta?: Readonly<{
    requestId?: unknown;
  }>;
}>;

type SuccessEnvelope<T> = Readonly<{
  data: T;
  meta?: Readonly<{
    requestId?: unknown;
  }>;
}>;

type ApiRequestOptions = Readonly<{
  accessToken: string;
  body?: unknown;
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT';
}>;

export class ApiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly requestId: string | null;
  public readonly status: number;

  public constructor(options: {
    code: string;
    details?: unknown;
    message: string;
    requestId?: string | null;
    status: number;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId ?? null;
    this.status = options.status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readRequestId = (value: unknown): string | null => {
  if (!isRecord(value) || !isRecord(value['meta'])) {
    return null;
  }

  return typeof value['meta']['requestId'] === 'string' ? value['meta']['requestId'] : null;
};

const readError = (value: unknown, status: number): ApiError => {
  const envelope = isRecord(value) ? (value as ErrorEnvelope) : undefined;
  const error = envelope?.error;

  return new ApiError({
    code: typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
    details: error?.details,
    message:
      typeof error?.message === 'string'
        ? error.message
        : 'The request could not be completed. Please try again.',
    requestId: readRequestId(value),
    status,
  });
};

export const apiRequest = async <T>(path: `/${string}`, options: ApiRequestOptions): Promise<T> => {
  const apiUrl = getPublicApiUrl();
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${options.accessToken}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      method: options.method ?? 'GET',
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach JagrukSetu. Check your connection and try again.',
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
    throw readError(payload, response.status);
  }

  if (!isRecord(payload) || !('data' in payload)) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'JagrukSetu returned an invalid response. Please try again.',
      requestId: readRequestId(payload),
      status: response.status,
    });
  }

  return (payload as SuccessEnvelope<T>).data;
};

export const getUserFacingApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    return error.message;
  }

  return 'Something went wrong. Please try again.';
};
