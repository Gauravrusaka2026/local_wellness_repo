import type {
  PublicComplaintDetail,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
} from '@local-wellness/types';
import {
  publicComplaintDetailSchema,
  publicComplaintIdParametersSchema,
  publicComplaintMapQuerySchema,
  publicComplaintMapResultSchema,
} from '@local-wellness/validation';

import { ApiError } from '../api/client';
import { getPublicApiUrl } from '../config/environment';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readRequestId = (value: unknown): string | null => {
  if (!isRecord(value) || !isRecord(value['meta'])) return null;
  return typeof value['meta']['requestId'] === 'string' ? value['meta']['requestId'] : null;
};

const requestPublicTransparency = async (path: `/${string}`): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(`${getPublicApiUrl()}${path}`, {
      headers: { Accept: 'application/json' },
      method: 'GET',
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to load public reports. Check your connection and try again.',
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
      details: error?.['details'],
      message:
        typeof error?.['message'] === 'string'
          ? error['message']
          : 'Public reports are temporarily unavailable.',
      requestId: readRequestId(payload),
      status: response.status,
    });
  }

  if (!isRecord(payload) || !('data' in payload)) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Local Wellness returned an invalid transparency response.',
      requestId: readRequestId(payload),
      status: response.status,
    });
  }

  return payload['data'];
};

export const buildPublicComplaintMapPath = (query: PublicComplaintMapQuery): `/${string}` => {
  const validatedQuery = publicComplaintMapQuerySchema.safeParse(query);
  if (!validatedQuery.success) throw invalidRequest();

  const parameters = new URLSearchParams({
    east: String(validatedQuery.data.east),
    limit: String(validatedQuery.data.limit),
    north: String(validatedQuery.data.north),
    south: String(validatedQuery.data.south),
    west: String(validatedQuery.data.west),
    zoom: String(validatedQuery.data.zoom),
  });
  validatedQuery.data.categoryCodes?.forEach((categoryCode) =>
    parameters.append('categoryCodes', categoryCode),
  );
  validatedQuery.data.statuses?.forEach((status) => parameters.append('statuses', status));
  if (validatedQuery.data.from !== undefined) parameters.set('from', validatedQuery.data.from);
  if (validatedQuery.data.to !== undefined) parameters.set('to', validatedQuery.data.to);
  if (validatedQuery.data.cursor !== undefined) {
    parameters.set('cursor', validatedQuery.data.cursor);
  }
  return `/api/v1/transparency/complaints?${parameters.toString()}`;
};

const invalidResponse = (): ApiError =>
  new ApiError({
    code: 'INVALID_RESPONSE',
    message: 'Local Wellness returned an invalid transparency response.',
    status: 200,
  });

const invalidRequest = (): ApiError =>
  new ApiError({
    code: 'INVALID_REQUEST',
    message: 'The public transparency request is invalid.',
    status: 400,
  });

const missingPublicComplaint = (): ApiError =>
  new ApiError({
    code: 'PUBLIC_COMPLAINT_NOT_FOUND',
    message: 'The public complaint was not found.',
    status: 404,
  });

export const listPublicComplaints = async (
  query: PublicComplaintMapQuery,
): Promise<PublicComplaintMapResult> => {
  const result = publicComplaintMapResultSchema.safeParse(
    await requestPublicTransparency(buildPublicComplaintMapPath(query)),
  );
  if (!result.success) throw invalidResponse();
  return result.data;
};

export const getPublicComplaint = async (publicId: string): Promise<PublicComplaintDetail> => {
  const parameters = publicComplaintIdParametersSchema.safeParse({ publicId });
  if (!parameters.success) throw missingPublicComplaint();

  const result = publicComplaintDetailSchema.safeParse(
    await requestPublicTransparency(`/api/v1/transparency/complaints/${parameters.data.publicId}`),
  );
  if (!result.success) throw invalidResponse();
  return result.data;
};

export const mergePublicComplaintPages = (
  current: PublicComplaintMapResult,
  next: PublicComplaintMapResult,
): PublicComplaintMapResult => {
  const items = new Map(current.items.map((item) => [item.publicId, item]));
  next.items.forEach((item) => items.set(item.publicId, item));
  return { hasMore: next.hasMore, items: [...items.values()], nextCursor: next.nextCursor };
};

export const getUserFacingTransparencyError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'This public report is unavailable or has been withdrawn.';
    }
    return error.message;
  }
  return 'Public reports are temporarily unavailable. Please try again.';
};
