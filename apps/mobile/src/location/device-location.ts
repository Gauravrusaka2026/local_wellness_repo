import * as Location from 'expo-location';
import type { ComplaintLocationCapture, ResolveJurisdictionRequest } from '@local-wellness/types';

import {
  MobileLocationCoordinator,
  type MobileLocationAdapter,
  type NativeLocationFix,
} from './location-coordinator';

export { LocationAccessError, requiresLocationPermissionSettings } from './location-coordinator';

const toNativeFix = (location: Location.LocationObject): NativeLocationFix => ({
  accuracyMeters: location.coords.accuracy,
  isMockLocation: location.mocked ?? null,
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  timestamp: location.timestamp,
});

const expoLocationAdapter: MobileLocationAdapter = {
  getCurrentPosition: async (accuracy) =>
    toNativeFix(
      await Location.getCurrentPositionAsync({
        accuracy: accuracy === 'high' ? Location.Accuracy.High : Location.Accuracy.Balanced,
      }),
    ),
  getForegroundPermission: () => Location.getForegroundPermissionsAsync(),
  getLastKnownPosition: async ({ maxAgeMilliseconds, requiredAccuracyMeters }) => {
    const location = await Location.getLastKnownPositionAsync({
      maxAge: maxAgeMilliseconds,
      requiredAccuracy: requiredAccuracyMeters,
    });
    return location === null ? null : toNativeFix(location);
  },
  getProviderStatus: () => Location.getProviderStatusAsync(),
  hasServicesEnabled: () => Location.hasServicesEnabledAsync(),
  requestForegroundPermission: () => Location.requestForegroundPermissionsAsync(),
};

const coordinator = new MobileLocationCoordinator(expoLocationAdapter);

export const getCurrentAreaLocation = (
  options: Readonly<{ forceRefresh?: boolean }> = {},
): Promise<ResolveJurisdictionRequest> => coordinator.getCurrentAreaLocation(options);

export const getCurrentAreaLocationAutomatically = (
  options: Readonly<{ forceRefresh?: boolean }> = {},
): Promise<ResolveJurisdictionRequest | null> =>
  coordinator.getCurrentAreaLocationAutomatically(options);

export const captureComplaintEvidenceLocation = (): Promise<ComplaintLocationCapture> =>
  coordinator.captureComplaintEvidenceLocation();

export const captureComplaintEvidenceLocationAutomatically =
  (): Promise<ComplaintLocationCapture | null> =>
    coordinator.captureComplaintEvidenceLocationAutomatically();

export const clearCurrentAreaLocationCache = (): void => {
  coordinator.clearCurrentAreaCache();
};
