import type {
  ComplaintLocationCapture,
  ComplaintLocationProvider,
  ResolveJurisdictionRequest,
} from '@local-wellness/types';
import { complaintLocationCaptureSchema } from '@local-wellness/validation';

import {
  assessLocation,
  inferLocationProvider,
  LOCATION_FUTURE_TOLERANCE_MILLISECONDS,
} from '../complaints/location-evidence';

export const CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS = 5 * 60 * 1_000;
export const CURRENT_AREA_MAXIMUM_ACCURACY_METERS = 100;

type ForegroundPermission = Readonly<{
  canAskAgain: boolean;
  granted: boolean;
}>;

export type NativeLocationFix = Readonly<{
  accuracyMeters: number | null;
  isMockLocation: boolean | null;
  latitude: number;
  longitude: number;
  timestamp: number;
}>;

export type MobileLocationAdapter = Readonly<{
  getCurrentPosition: (accuracy: 'balanced' | 'high') => Promise<NativeLocationFix>;
  getForegroundPermission: () => Promise<ForegroundPermission>;
  getLastKnownPosition: (
    options: Readonly<{ maxAgeMilliseconds: number; requiredAccuracyMeters: number }>,
  ) => Promise<NativeLocationFix | null>;
  getProviderStatus: () => Promise<Readonly<{
    gpsAvailable?: boolean;
    networkAvailable?: boolean;
  }> | null>;
  hasServicesEnabled: () => Promise<boolean>;
  requestForegroundPermission: () => Promise<ForegroundPermission>;
}>;

export class LocationAccessError extends Error {
  public readonly requiresAppSettings: boolean;

  public constructor(message: string, options: Readonly<{ requiresAppSettings?: boolean }> = {}) {
    super(message);
    this.name = 'LocationAccessError';
    this.requiresAppSettings = options.requiresAppSettings ?? false;
  }
}

export const requiresLocationPermissionSettings = (error: unknown): boolean =>
  error instanceof LocationAccessError && error.requiresAppSettings;

const isFiniteCoordinate = (value: number, minimum: number, maximum: number): boolean =>
  Number.isFinite(value) && value >= minimum && value <= maximum;

const getUsableFix = (
  fix: NativeLocationFix,
  nowMilliseconds: number,
  maximumAgeMilliseconds: number,
  maximumAccuracyMeters: number,
): ResolveJurisdictionRequest | null => {
  const ageMilliseconds = nowMilliseconds - fix.timestamp;
  if (
    !Number.isFinite(fix.timestamp) ||
    ageMilliseconds > maximumAgeMilliseconds ||
    ageMilliseconds < -LOCATION_FUTURE_TOLERANCE_MILLISECONDS ||
    fix.isMockLocation === true ||
    fix.accuracyMeters === null ||
    !Number.isFinite(fix.accuracyMeters) ||
    fix.accuracyMeters < 0 ||
    fix.accuracyMeters > maximumAccuracyMeters ||
    !isFiniteCoordinate(fix.latitude, -90, 90) ||
    !isFiniteCoordinate(fix.longitude, -180, 180)
  ) {
    return null;
  }

  return {
    accuracyMeters: fix.accuracyMeters,
    capturedAt: new Date(fix.timestamp).toISOString(),
    latitude: fix.latitude,
    longitude: fix.longitude,
  };
};

const toComplaintLocation = (
  fix: NativeLocationFix,
  provider: ComplaintLocationProvider,
  nowMilliseconds: number,
): ComplaintLocationCapture => {
  try {
    return complaintLocationCaptureSchema.parse({
      accuracyMeters: fix.accuracyMeters,
      capturedAt: new Date(fix.timestamp).toISOString(),
      deviceRecordedAt: new Date(nowMilliseconds).toISOString(),
      isMockLocation: fix.isMockLocation,
      latitude: fix.latitude,
      longitude: fix.longitude,
      provider,
    });
  } catch {
    throw new LocationAccessError('The device did not provide a usable location.');
  }
};

export class MobileLocationCoordinator {
  private automaticPermissionAttempted = false;
  private automaticPermissionRequest: Promise<boolean> | null = null;
  private currentAreaCache: ResolveJurisdictionRequest | null = null;
  private currentAreaRequest: Readonly<{
    forceRefresh: boolean;
    promise: Promise<ResolveJurisdictionRequest>;
  }> | null = null;
  private generation = 0;
  private permissionRequest: Promise<void> | null = null;

  public constructor(
    private readonly adapter: MobileLocationAdapter,
    private readonly now: () => number = Date.now,
  ) {}

  public clearCurrentAreaCache(): void {
    this.generation += 1;
    this.currentAreaCache = null;
    this.currentAreaRequest = null;
  }

  public async getCurrentAreaLocation(
    options: Readonly<{ forceRefresh?: boolean }> = {},
  ): Promise<ResolveJurisdictionRequest> {
    const requestGeneration = this.generation;
    await this.ensureForegroundAccess();
    if (this.generation !== requestGeneration) {
      throw new LocationAccessError('The location request was cancelled. Try again.');
    }

    return this.getCurrentAreaLocationAfterAccess(options, requestGeneration);
  }

  public async getCurrentAreaLocationAutomatically(
    options: Readonly<{ forceRefresh?: boolean }> = {},
  ): Promise<ResolveJurisdictionRequest | null> {
    const requestGeneration = this.generation;
    if (!(await this.ensureAutomaticForegroundAccess())) return null;
    if (this.generation !== requestGeneration) {
      throw new LocationAccessError('The location request was cancelled. Try again.');
    }

    return this.getCurrentAreaLocationAfterAccess(options, requestGeneration);
  }

  public async captureComplaintEvidenceLocation(): Promise<ComplaintLocationCapture> {
    await this.ensureForegroundAccess();
    return this.acquireComplaintEvidence();
  }

  public async captureComplaintEvidenceLocationAutomatically(): Promise<ComplaintLocationCapture | null> {
    if (!(await this.ensureAutomaticForegroundAccess())) return null;
    return this.acquireComplaintEvidence();
  }

  private async getCurrentAreaLocationAfterAccess(
    options: Readonly<{ forceRefresh?: boolean }>,
    requestGeneration: number,
  ): Promise<ResolveJurisdictionRequest> {
    const forceRefresh = options.forceRefresh === true;
    const nowMilliseconds = this.now();
    if (
      !forceRefresh &&
      this.currentAreaCache !== null &&
      getUsableFix(
        {
          accuracyMeters: this.currentAreaCache.accuracyMeters,
          isMockLocation: false,
          latitude: this.currentAreaCache.latitude,
          longitude: this.currentAreaCache.longitude,
          timestamp: Date.parse(this.currentAreaCache.capturedAt),
        },
        nowMilliseconds,
        CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS,
        CURRENT_AREA_MAXIMUM_ACCURACY_METERS,
      ) !== null
    ) {
      return this.currentAreaCache;
    }

    if (this.currentAreaRequest !== null) {
      if (!forceRefresh || this.currentAreaRequest.forceRefresh) {
        return this.currentAreaRequest.promise;
      }

      await this.currentAreaRequest.promise.catch(() => undefined);
      if (this.generation !== requestGeneration) {
        throw new LocationAccessError('The location request was cancelled. Try again.');
      }
      return this.getCurrentAreaLocationAfterAccess({ forceRefresh: true }, requestGeneration);
    }

    const request = this.acquireCurrentArea(forceRefresh).then((location) => {
      if (this.generation !== requestGeneration) {
        throw new LocationAccessError('The location request was cancelled. Try again.');
      }
      this.currentAreaCache = location;
      return location;
    });
    const trackedRequest = request.finally(() => {
      if (this.currentAreaRequest?.promise === trackedRequest) this.currentAreaRequest = null;
    });
    this.currentAreaRequest = { forceRefresh, promise: trackedRequest };
    return trackedRequest;
  }

  private async acquireComplaintEvidence(): Promise<ComplaintLocationCapture> {
    const [fix, providerStatus] = await Promise.all([
      this.adapter.getCurrentPosition('high'),
      this.adapter.getProviderStatus().catch(() => null),
    ]);
    const captured = toComplaintLocation(fix, inferLocationProvider(providerStatus), this.now());
    const assessment = assessLocation(captured, this.now());
    if (!assessment.isAcceptable) throw new LocationAccessError(assessment.message);
    return captured;
  }

  private async acquireCurrentArea(forceRefresh: boolean): Promise<ResolveJurisdictionRequest> {
    if (!forceRefresh) {
      const lastKnown = await this.adapter
        .getLastKnownPosition({
          maxAgeMilliseconds: CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS,
          requiredAccuracyMeters: CURRENT_AREA_MAXIMUM_ACCURACY_METERS,
        })
        .catch(() => null);
      if (lastKnown !== null) {
        const reusable = getUsableFix(
          lastKnown,
          this.now(),
          CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS,
          CURRENT_AREA_MAXIMUM_ACCURACY_METERS,
        );
        if (reusable !== null) return reusable;
      }
    }

    const current = await this.adapter.getCurrentPosition('balanced');
    const usable = getUsableFix(
      current,
      this.now(),
      CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS,
      CURRENT_AREA_MAXIMUM_ACCURACY_METERS,
    );
    if (usable === null) {
      throw new LocationAccessError(
        'A more precise current location is needed. Move outdoors and try again.',
      );
    }
    return usable;
  }

  private async ensureAutomaticForegroundAccess(): Promise<boolean> {
    if (this.automaticPermissionRequest !== null) return this.automaticPermissionRequest;

    const request = (async () => {
      if (!(await this.adapter.hasServicesEnabled())) {
        throw new LocationAccessError('Turn on device location services and try again.');
      }

      const existing = await this.adapter.getForegroundPermission();
      if (existing.granted) return true;
      if (this.automaticPermissionAttempted) return false;
      this.automaticPermissionAttempted = true;
      if (!existing.canAskAgain) {
        throw new LocationAccessError(
          'Enable location permission for JagrukSetu in your device settings.',
          { requiresAppSettings: true },
        );
      }

      const requested = await this.adapter.requestForegroundPermission();
      if (!requested.granted) {
        throw new LocationAccessError(
          requested.canAskAgain
            ? 'Location permission is required to use this feature.'
            : 'Enable location permission for JagrukSetu in your device settings.',
          { requiresAppSettings: !requested.canAskAgain },
        );
      }
      return true;
    })();
    const trackedRequest = request.finally(() => {
      if (this.automaticPermissionRequest === trackedRequest) {
        this.automaticPermissionRequest = null;
      }
    });
    this.automaticPermissionRequest = trackedRequest;
    return trackedRequest;
  }

  private async ensureForegroundAccess(): Promise<void> {
    if (this.permissionRequest !== null) return this.permissionRequest;

    const request = (async () => {
      if (!(await this.adapter.hasServicesEnabled())) {
        throw new LocationAccessError('Turn on device location services and try again.');
      }

      const existing = await this.adapter.getForegroundPermission();
      if (existing.granted) return;
      if (!existing.canAskAgain) {
        throw new LocationAccessError(
          'Enable location permission for JagrukSetu in your device settings.',
          { requiresAppSettings: true },
        );
      }

      const requested = await this.adapter.requestForegroundPermission();
      if (!requested.granted) {
        throw new LocationAccessError(
          requested.canAskAgain
            ? 'Location permission is required to use this feature.'
            : 'Enable location permission for JagrukSetu in your device settings.',
          { requiresAppSettings: !requested.canAskAgain },
        );
      }
    })();
    const trackedRequest = request.finally(() => {
      if (this.permissionRequest === trackedRequest) this.permissionRequest = null;
    });
    this.permissionRequest = trackedRequest;
    return trackedRequest;
  }
}
