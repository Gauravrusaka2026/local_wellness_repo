import type { PublicComplaintMapItem, PublicTransparencyViewport } from '@local-wellness/types';

export class NearbyLocationError extends Error {
  public readonly requiresAppSettings: boolean;

  public constructor(message: string, options: Readonly<{ requiresAppSettings?: boolean }> = {}) {
    super(message);
    this.name = 'NearbyLocationError';
    this.requiresAppSettings = options.requiresAppSettings ?? false;
  }
}

export const requiresNearbyLocationSettings = (error: unknown): boolean =>
  error instanceof NearbyLocationError && error.requiresAppSettings;

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

export const createRegionalTrendingViewport = (
  nearbyViewport: PublicTransparencyViewport,
  halfSpanDegrees = 0.75,
): PublicTransparencyViewport => {
  const longitudeSpan = nearbyViewport.east - nearbyViewport.west;
  const latitudeSpan = nearbyViewport.north - nearbyViewport.south;
  if (
    !Number.isFinite(longitudeSpan) ||
    !Number.isFinite(latitudeSpan) ||
    longitudeSpan <= 0 ||
    latitudeSpan <= 0 ||
    longitudeSpan > 2 ||
    latitudeSpan > 2
  ) {
    throw new RangeError('The nearby transparency viewport is invalid.');
  }

  return createNearbyViewport(
    nearbyViewport.south + latitudeSpan / 2,
    nearbyViewport.west + longitudeSpan / 2,
    halfSpanDegrees,
  );
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
    Math.round(Math.max(3, Math.min(97, value)) * 1_000_000) / 1_000_000;
  return {
    xPercent: clampPercent(((location.longitude - viewport.west) / longitudeSpan) * 100),
    yPercent: clampPercent(((viewport.north - location.latitude) / latitudeSpan) * 100),
  };
};
