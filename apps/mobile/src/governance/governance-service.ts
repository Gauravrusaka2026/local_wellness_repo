import { ApiClientError, createApiClient } from '@local-wellness/api-client';
import type { ComplaintLocationCapture, GoverningBodyResolution } from '@local-wellness/types';
import {
  governingBodyResolutionSchema,
  resolveGoverningBodiesRequestSchema,
} from '@local-wellness/validation';

import { getPublicApiUrl } from '../config/environment';

export const resolveGoverningBodies = (
  accessToken: string,
  location: ComplaintLocationCapture,
): Promise<GoverningBodyResolution> =>
  createApiClient({ baseUrl: getPublicApiUrl(), getAccessToken: () => accessToken }).post(
    '/api/v1/governance/bodies/resolve',
    resolveGoverningBodiesRequestSchema.parse({
      accuracyMeters: location.accuracyMeters,
      capturedAt: location.capturedAt,
      latitude: location.latitude,
      longitude: location.longitude,
    }),
    {
      decode: (value) => governingBodyResolutionSchema.parse(value),
    },
  );

export const getUserFacingGovernanceError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session expired. Sign in again to use your location.';
    if (error.code === 'NETWORK_ERROR') {
      return 'The governance directory could not be reached. Check your connection and try again.';
    }
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : 'Governing bodies are temporarily unavailable. Please try again.';
};
