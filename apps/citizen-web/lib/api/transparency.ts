import {
  type PublicComplaintDetail,
  type PublicComplaintMapItem,
  type PublicComplaintMapQuery,
  type PublicComplaintMapResult,
  type PublicTransparencyViewport,
} from '@local-wellness/types';
import {
  publicComplaintDetailSchema,
  publicComplaintIdParametersSchema,
  publicComplaintMapQuerySchema,
  publicComplaintMapResultSchema,
} from '@local-wellness/validation';

import { getPublicApiUrl } from '../environment';
import { ApiError } from './client';

type PublicApiEnvelope = Readonly<{
  data?: unknown;
  error?: Readonly<{ code?: unknown; message?: unknown }>;
  meta?: Readonly<{ requestId?: unknown }>;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getRequestId = (value: unknown): string | null => {
  if (!isRecord(value) || !isRecord(value['meta'])) return null;
  return typeof value['meta']['requestId'] === 'string' ? value['meta']['requestId'] : null;
};

const invalidTransparencyResponse = (): ApiError =>
  new ApiError({
    code: 'INVALID_RESPONSE',
    message: 'Local Wellness returned an invalid transparency response. Please try again.',
    status: 200,
  });

const invalidTransparencyRequest = (): ApiError =>
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

const publicApiRequest = async (path: `/${string}`): Promise<unknown> => {
  let response: Response;

  try {
    response = await fetch(`${getPublicApiUrl()}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      method: 'GET',
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to load public reports. Please try again.',
      status: 0,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const envelope = isRecord(payload) ? (payload as PublicApiEnvelope) : undefined;
  if (!response.ok) {
    throw new ApiError({
      code: typeof envelope?.error?.code === 'string' ? envelope.error.code : 'REQUEST_FAILED',
      message:
        typeof envelope?.error?.message === 'string'
          ? envelope.error.message
          : 'Public reports are temporarily unavailable.',
      requestId: getRequestId(payload),
      status: response.status,
    });
  }

  if (envelope === undefined || !('data' in envelope)) throw invalidTransparencyResponse();
  return envelope.data;
};

const appendFilters = (parameters: URLSearchParams, query: PublicComplaintMapQuery): void => {
  query.categoryCodes?.forEach((categoryCode) => parameters.append('categoryCodes', categoryCode));
  query.statuses?.forEach((status) => parameters.append('statuses', status));
  if (query.from !== undefined) parameters.set('from', query.from);
  if (query.to !== undefined) parameters.set('to', query.to);
};

export const buildPublicComplaintMapPath = (query: PublicComplaintMapQuery): `/${string}` => {
  const validatedQuery = publicComplaintMapQuerySchema.safeParse(query);
  if (!validatedQuery.success) throw invalidTransparencyRequest();

  const parameters = new URLSearchParams({
    east: String(validatedQuery.data.east),
    limit: String(validatedQuery.data.limit),
    north: String(validatedQuery.data.north),
    south: String(validatedQuery.data.south),
    west: String(validatedQuery.data.west),
    zoom: String(validatedQuery.data.zoom),
  });
  appendFilters(parameters, validatedQuery.data);
  if (validatedQuery.data.cursor !== undefined) {
    parameters.set('cursor', validatedQuery.data.cursor);
  }
  return `/api/v1/transparency/complaints?${parameters.toString()}`;
};

export const listPublicComplaints = async (
  query: PublicComplaintMapQuery,
): Promise<PublicComplaintMapResult> => {
  const result = publicComplaintMapResultSchema.safeParse(
    await publicApiRequest(buildPublicComplaintMapPath(query)),
  );
  if (!result.success) throw invalidTransparencyResponse();
  return result.data;
};

export const getPublicComplaint = async (publicId: string): Promise<PublicComplaintDetail> => {
  const parameters = publicComplaintIdParametersSchema.safeParse({ publicId });
  if (!parameters.success) throw missingPublicComplaint();

  const result = publicComplaintDetailSchema.safeParse(
    await publicApiRequest(`/api/v1/transparency/complaints/${parameters.data.publicId}`),
  );
  if (!result.success) throw invalidTransparencyResponse();
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

export const createNearbyViewport = (
  latitude: number,
  longitude: number,
  halfSpanDegrees = 0.15,
): PublicTransparencyViewport => {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(halfSpanDegrees) ||
    halfSpanDegrees <= 0 ||
    halfSpanDegrees > 1
  ) {
    throw new RangeError('The nearby transparency viewport is invalid.');
  }

  const centerLatitude = Math.round(latitude * 100) / 100;
  const centerLongitude = Math.round(longitude * 100) / 100;
  const latitudeSpan = halfSpanDegrees * 2;
  const longitudeSpan = halfSpanDegrees * 2;
  const south = Math.min(Math.max(centerLatitude - halfSpanDegrees, -90), 90 - latitudeSpan);
  const west = Math.min(Math.max(centerLongitude - halfSpanDegrees, -180), 180 - longitudeSpan);

  return {
    east: Number((west + longitudeSpan).toFixed(6)),
    north: Number((south + latitudeSpan).toFixed(6)),
    south: Number(south.toFixed(6)),
    west: Number(west.toFixed(6)),
  };
};

export const projectApproximatePoint = (
  location: Pick<PublicComplaintMapItem['location'], 'latitude' | 'longitude'>,
  viewport: PublicTransparencyViewport,
): Readonly<{ xPercent: number; yPercent: number }> => {
  const longitudeSpan = viewport.east - viewport.west;
  const latitudeSpan = viewport.north - viewport.south;
  if (longitudeSpan <= 0 || latitudeSpan <= 0) {
    throw new RangeError('The transparency viewport is invalid.');
  }

  const clampPercent = (value: number): number =>
    Math.round(Math.max(2, Math.min(98, value)) * 1_000_000) / 1_000_000;
  return {
    xPercent: clampPercent(((location.longitude - viewport.west) / longitudeSpan) * 100),
    yPercent: clampPercent(((viewport.north - location.latitude) / latitudeSpan) * 100),
  };
};
