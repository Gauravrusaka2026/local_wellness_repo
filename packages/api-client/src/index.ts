type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;

export type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ApiResponseDecoder<Output> = (value: unknown) => Output;

export interface ApiClientConfiguration {
  baseUrl: string;
  fetch?: ApiFetch | undefined;
  getAccessToken: () => Promise<string> | string;
}

export interface ApiRequestOptions<Output> {
  body?: unknown;
  decode: ApiResponseDecoder<Output>;
  idempotencyKey?: string | undefined;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | undefined;
  signal?: AbortSignal | undefined;
}

export type ApiReadOptions<Output> = Readonly<{
  decode: ApiResponseDecoder<Output>;
  signal?: AbortSignal | undefined;
}>;

export type ApiWriteOptions<Output> = Readonly<{
  decode: ApiResponseDecoder<Output>;
  idempotencyKey?: string | undefined;
  signal?: AbortSignal | undefined;
}>;

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly details: JsonValue | undefined;
  public readonly requestId: string | null;
  public readonly status: number;

  public constructor(options: {
    code: string;
    details?: JsonValue | undefined;
    message: string;
    requestId?: string | null | undefined;
    status: number;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId ?? null;
    this.status = options.status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJsonValue = (value: unknown, depth = 0): value is JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }

  if (depth >= 8) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry, depth + 1));
  }

  return isRecord(value) && Object.values(value).every((entry) => isJsonValue(entry, depth + 1));
};

const readBoundedString = (value: unknown, maximumLength: number): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength ? normalized : null;
};

const readRequestId = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload['meta'])) {
    return null;
  }

  return readBoundedString(payload['meta']['requestId'], 128);
};

const invalidResponse = (status: number, requestId: string | null): ApiClientError =>
  new ApiClientError({
    code: 'INVALID_RESPONSE',
    message: 'Local Wellness returned an invalid response. Please try again.',
    requestId,
    status,
  });

const decodeErrorResponse = (payload: unknown, status: number): ApiClientError => {
  const error = isRecord(payload) && isRecord(payload['error']) ? payload['error'] : undefined;
  const details = error?.['details'];

  return new ApiClientError({
    code: readBoundedString(error?.['code'], 128) ?? 'REQUEST_FAILED',
    ...(isJsonValue(details) ? { details } : {}),
    message:
      readBoundedString(error?.['message'], 2_000) ??
      'The request could not be completed. Please try again.',
    requestId: readRequestId(payload),
    status,
  });
};

const normalizeBaseUrl = (value: string): string => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new TypeError('The API base URL must be a valid HTTP(S) URL.');
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new TypeError('The API base URL must be a valid HTTP(S) URL.');
  }

  return url.toString().replace(/\/$/u, '');
};

const containsControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });

const assertPath = (path: string): void => {
  if (!path.startsWith('/') || path.startsWith('//') || containsControlCharacter(path)) {
    throw new TypeError('The API path must be an origin-relative path.');
  }
};

const defaultFetch: ApiFetch = (input, init) => globalThis.fetch(input, init);

export class LocalWellnessApiClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: ApiFetch;
  private readonly getAccessToken: ApiClientConfiguration['getAccessToken'];

  public constructor(configuration: ApiClientConfiguration) {
    this.baseUrl = normalizeBaseUrl(configuration.baseUrl);
    this.fetchImplementation = configuration.fetch ?? defaultFetch;
    this.getAccessToken = configuration.getAccessToken;
  }

  public get<Output>(path: `/${string}`, options: ApiReadOptions<Output>): Promise<Output> {
    return this.request(path, { ...options, method: 'GET' });
  }

  public post<Output>(
    path: `/${string}`,
    body: unknown,
    options: ApiWriteOptions<Output>,
  ): Promise<Output> {
    return this.request(path, { ...options, body, method: 'POST' });
  }

  public patch<Output>(
    path: `/${string}`,
    body: unknown,
    options: ApiWriteOptions<Output>,
  ): Promise<Output> {
    return this.request(path, { ...options, body, method: 'PATCH' });
  }

  public delete<Output>(path: `/${string}`, options: ApiWriteOptions<Output>): Promise<Output> {
    return this.request(path, { ...options, method: 'DELETE' });
  }

  public async request<Output>(
    path: `/${string}`,
    options: ApiRequestOptions<Output>,
  ): Promise<Output> {
    assertPath(path);

    if (
      options.idempotencyKey !== undefined &&
      !idempotencyKeyPattern.test(options.idempotencyKey)
    ) {
      throw new TypeError('The idempotency key has an invalid format.');
    }

    const accessToken = await this.getAccessToken();
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
      throw new ApiClientError({
        code: 'AUTH_REQUIRED',
        message: 'A verified session is required.',
        status: 401,
      });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    let body: string | undefined;

    if (options.body !== undefined) {
      try {
        body = JSON.stringify(options.body);
      } catch {
        throw new TypeError('The API request body must be JSON serializable.');
      }

      if (body === undefined) {
        throw new TypeError('The API request body must be JSON serializable.');
      }

      headers['Content-Type'] = 'application/json';
    }

    if (options.idempotencyKey !== undefined) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const requestInit: RequestInit = {
      headers,
      method: options.method ?? 'GET',
    };
    if (body !== undefined) {
      requestInit.body = body;
    }
    if (options.signal !== undefined) {
      requestInit.signal = options.signal;
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, requestInit);
    } catch {
      throw new ApiClientError({
        code: options.signal?.aborted === true ? 'REQUEST_ABORTED' : 'NETWORK_ERROR',
        message:
          options.signal?.aborted === true
            ? 'The request was cancelled.'
            : 'Unable to reach Local Wellness. Please try again.',
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
      throw decodeErrorResponse(payload, response.status);
    }

    const requestId = readRequestId(payload);
    if (!isRecord(payload) || !Object.hasOwn(payload, 'data') || requestId === null) {
      throw invalidResponse(response.status, requestId);
    }

    try {
      return options.decode(payload['data']);
    } catch {
      throw invalidResponse(response.status, requestId);
    }
  }
}

export const createApiClient = (configuration: ApiClientConfiguration): LocalWellnessApiClient =>
  new LocalWellnessApiClient(configuration);
