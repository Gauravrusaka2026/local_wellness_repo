import { ApiClientError, createApiClient } from '@local-wellness/api-client';
import type { GoverningBodyResolution, ResolveJurisdictionRequest } from '@local-wellness/types';
import {
  governingBodyResolutionSchema,
  resolveGoverningBodiesRequestSchema,
} from '@local-wellness/validation';

import { getPublicApiUrl } from '../config/environment';

const phoneRangePattern = /^(\d{6,})\s*-\s*\d{6,}$/u;
const phoneExtensionPattern = /\b(?:ext|extension)\.?\s*\d+.*$/iu;

export const isGovernanceLookupCurrent = (
  request: Readonly<{ accessToken: string; generation: number }>,
  current: Readonly<{ accessToken: string | null; generation: number; isFocused: boolean }>,
): boolean =>
  current.isFocused &&
  request.generation === current.generation &&
  request.accessToken === current.accessToken;

export const getOfficeDialUrl = (displayPhone: string): string | null => {
  const firstPublishedNumber = displayPhone.split(/[;/]/u)[0]?.trim();
  if (!firstPublishedNumber) return null;

  const withoutExtension = firstPublishedNumber.replace(phoneExtensionPattern, '').trim();
  const rangeStart = withoutExtension.match(phoneRangePattern)?.[1];
  const number = rangeStart ?? withoutExtension;
  const digits = number.replace(/\D/gu, '');
  if (digits.length < 3 || digits.length > 15) return null;

  return `tel:${number.startsWith('+') ? '+' : ''}${digits}`;
};

export const getOfficeEmailUrl = (email: string): string => `mailto:${encodeURIComponent(email)}`;

export const resolveGoverningBodies = (
  accessToken: string,
  location: ResolveJurisdictionRequest,
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
