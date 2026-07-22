import * as Location from 'expo-location';
import type { ComplaintLocationCapture } from '@local-wellness/types';
import { complaintLocationCaptureSchema } from '@local-wellness/validation';

import { assessLocation, inferLocationProvider } from './location-evidence';

export class LocationCaptureError extends Error {
  public readonly requiresAppSettings: boolean;

  public constructor(message: string, options: Readonly<{ requiresAppSettings?: boolean }> = {}) {
    super(message);
    this.name = 'LocationCaptureError';
    this.requiresAppSettings = options.requiresAppSettings ?? false;
  }
}

export const requiresLocationPermissionSettings = (error: unknown): boolean =>
  error instanceof LocationCaptureError && error.requiresAppSettings;

export const captureCurrentLocation = async (): Promise<ComplaintLocationCapture> => {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationCaptureError('Turn on device location services and try again.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new LocationCaptureError(
      permission.canAskAgain
        ? 'Location permission is required to verify a civic complaint.'
        : 'Enable location permission for JagrukSetu in your device settings.',
      { requiresAppSettings: !permission.canAskAgain },
    );
  }

  const [location, providerStatus] = await Promise.all([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    Location.getProviderStatusAsync().catch(() => null),
  ]);
  const accuracyMeters = location.coords.accuracy;
  if (accuracyMeters === null || !Number.isFinite(accuracyMeters)) {
    throw new LocationCaptureError('The device did not provide a usable accuracy estimate.');
  }

  const captured = complaintLocationCaptureSchema.parse({
    accuracyMeters,
    capturedAt: new Date(location.timestamp).toISOString(),
    deviceRecordedAt: new Date().toISOString(),
    isMockLocation: location.mocked ?? null,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    provider: inferLocationProvider(providerStatus),
  });
  const assessment = assessLocation(captured);
  if (!assessment.isAcceptable) {
    throw new LocationCaptureError(assessment.message);
  }

  return captured;
};
