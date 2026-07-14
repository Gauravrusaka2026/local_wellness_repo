import type { ComplaintLocationCapture, ComplaintLocationProvider } from '@local-wellness/types';

const EARTH_RADIUS_METERS = 6_371_000;
export const LOCATION_FUTURE_TOLERANCE_MILLISECONDS = 2 * 60 * 1_000;
export const LOCATION_MAXIMUM_AGE_MILLISECONDS = 5 * 60 * 1_000;
export const LOCATION_LOW_ACCURACY_METERS = 100;

export type LocationAssessment = Readonly<{
  isAcceptable: boolean;
  status: 'future' | 'low_accuracy' | 'mocked' | 'stale' | 'verified';
  message: string;
}>;

export const assessLocation = (
  location: ComplaintLocationCapture,
  nowMilliseconds = Date.now(),
): LocationAssessment => {
  const capturedAt = Date.parse(location.capturedAt);

  if (!Number.isFinite(capturedAt)) {
    return { isAcceptable: false, message: 'The location timestamp is invalid.', status: 'stale' };
  }

  if (capturedAt - nowMilliseconds > LOCATION_FUTURE_TOLERANCE_MILLISECONDS) {
    return {
      isAcceptable: false,
      message: 'The device clock places this location in the future.',
      status: 'future',
    };
  }

  if (nowMilliseconds - capturedAt > LOCATION_MAXIMUM_AGE_MILLISECONDS) {
    return {
      isAcceptable: false,
      message: 'The location is too old. Capture your current location again.',
      status: 'stale',
    };
  }

  if (location.isMockLocation === true) {
    return {
      isAcceptable: false,
      message: 'A simulated location cannot be used to submit a complaint.',
      status: 'mocked',
    };
  }

  if (location.accuracyMeters > LOCATION_LOW_ACCURACY_METERS) {
    return {
      isAcceptable: false,
      message: 'Location accuracy is too low. Move outdoors and try again.',
      status: 'low_accuracy',
    };
  }

  return {
    isAcceptable: true,
    message: 'Current location verified on this device.',
    status: 'verified',
  };
};

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

export const distanceBetweenLocationsMeters = (
  first: Pick<ComplaintLocationCapture, 'latitude' | 'longitude'>,
  second: Pick<ComplaintLocationCapture, 'latitude' | 'longitude'>,
): number => {
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(second.longitude - first.longitude);
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

export const assessMediaDistance = (
  complaintLocation: ComplaintLocationCapture,
  mediaLocation: ComplaintLocationCapture,
): Readonly<{ distanceMeters: number; isAcceptable: boolean }> => {
  const distanceMeters = distanceBetweenLocationsMeters(complaintLocation, mediaLocation);
  const allowedDistanceMeters = Math.max(
    100,
    complaintLocation.accuracyMeters + mediaLocation.accuracyMeters,
  );

  return { distanceMeters, isAcceptable: distanceMeters <= allowedDistanceMeters };
};

export const inferLocationProvider = (
  providerStatus: Readonly<{ gpsAvailable?: boolean; networkAvailable?: boolean }> | null,
): ComplaintLocationProvider => {
  if (providerStatus?.gpsAvailable === true && providerStatus.networkAvailable === true)
    return 'fused';
  if (providerStatus?.gpsAvailable === true) return 'gps';
  if (providerStatus?.networkAvailable === true) return 'network';
  return 'unknown';
};
