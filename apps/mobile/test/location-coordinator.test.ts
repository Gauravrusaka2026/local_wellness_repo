import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS,
  LocationAccessError,
  MobileLocationCoordinator,
  requiresLocationPermissionSettings,
  type MobileLocationAdapter,
  type NativeLocationFix,
} from '../src/location/location-coordinator';

const BASE_TIME = Date.parse('2026-07-23T08:00:00.000Z');

const fix = (overrides: Partial<NativeLocationFix> = {}): NativeLocationFix => ({
  accuracyMeters: 25,
  isMockLocation: false,
  latitude: 19.12,
  longitude: 72.85,
  timestamp: BASE_TIME,
  ...overrides,
});

type AdapterHarness = Readonly<{
  adapter: MobileLocationAdapter;
  calls: {
    currentAccuracies: Array<'balanced' | 'high'>;
    foregroundPermission: number;
    lastKnown: number;
    providerStatus: number;
    requestPermission: number;
    services: number;
  };
}>;

const createAdapter = (overrides: Partial<MobileLocationAdapter> = {}): AdapterHarness => {
  const calls = {
    currentAccuracies: [] as Array<'balanced' | 'high'>,
    foregroundPermission: 0,
    lastKnown: 0,
    providerStatus: 0,
    requestPermission: 0,
    services: 0,
  };
  const adapter: MobileLocationAdapter = {
    getCurrentPosition: async (accuracy) => {
      calls.currentAccuracies.push(accuracy);
      return fix();
    },
    getForegroundPermission: async () => {
      calls.foregroundPermission += 1;
      return { canAskAgain: true, granted: true };
    },
    getLastKnownPosition: async () => {
      calls.lastKnown += 1;
      return null;
    },
    getProviderStatus: async () => {
      calls.providerStatus += 1;
      return { gpsAvailable: true, networkAvailable: true };
    },
    hasServicesEnabled: async () => {
      calls.services += 1;
      return true;
    },
    requestForegroundPermission: async () => {
      calls.requestPermission += 1;
      return { canAskAgain: true, granted: true };
    },
    ...overrides,
  };
  return { adapter, calls };
};

describe('mobile location coordination', () => {
  it('does not touch native location while idle', () => {
    const { adapter, calls } = createAdapter();
    new MobileLocationCoordinator(adapter, () => BASE_TIME);

    assert.equal(calls.services, 0);
    assert.equal(calls.foregroundPermission, 0);
    assert.equal(calls.lastKnown, 0);
    assert.deepEqual(calls.currentAccuracies, []);
  });

  it('reuses a current-area fix in memory for five minutes', async () => {
    const { adapter, calls } = createAdapter();
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const first = await coordinator.getCurrentAreaLocation();
    const second = await coordinator.getCurrentAreaLocation();

    assert.deepEqual(second, first);
    assert.equal(calls.lastKnown, 1);
    assert.deepEqual(calls.currentAccuracies, ['balanced']);
    assert.equal(calls.requestPermission, 0);
  });

  it('coalesces concurrent current-area requests', async () => {
    let release: ((value: NativeLocationFix) => void) | undefined;
    const pending = new Promise<NativeLocationFix>((resolve) => {
      release = resolve;
    });
    const { adapter, calls } = createAdapter({
      getCurrentPosition: async (accuracy) => {
        calls.currentAccuracies.push(accuracy);
        return pending;
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const first = coordinator.getCurrentAreaLocation();
    const second = coordinator.getCurrentAreaLocation();
    await new Promise((resolve) => setImmediate(resolve));
    release?.(fix());

    assert.deepEqual(await first, await second);
    assert.deepEqual(calls.currentAccuracies, ['balanced']);
  });

  it('refreshes an expired area and lets explicit refresh bypass both caches', async () => {
    let now = BASE_TIME;
    let currentIndex = 0;
    const currentFixes = [
      fix(),
      fix({ latitude: 19.13, timestamp: BASE_TIME + CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS + 1 }),
      fix({ latitude: 19.14, timestamp: BASE_TIME + CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS + 2 }),
    ];
    const { adapter, calls } = createAdapter({
      getCurrentPosition: async (accuracy) => {
        calls.currentAccuracies.push(accuracy);
        const location = currentFixes[currentIndex];
        currentIndex += 1;
        assert.ok(location);
        return location;
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => now);

    assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.12);
    now += CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS + 1;
    assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.13);
    now += 1;
    assert.equal(
      (await coordinator.getCurrentAreaLocation({ forceRefresh: true })).latitude,
      19.14,
    );

    assert.equal(calls.lastKnown, 2);
    assert.deepEqual(calls.currentAccuracies, ['balanced', 'balanced', 'balanced']);
  });

  it('waits for a non-forced request before starting a distinct forced refresh', async () => {
    let releaseFirst: ((value: NativeLocationFix) => void) | undefined;
    const firstPending = new Promise<NativeLocationFix>((resolve) => {
      releaseFirst = resolve;
    });
    let currentCall = 0;
    const { adapter, calls } = createAdapter({
      getCurrentPosition: async (accuracy) => {
        calls.currentAccuracies.push(accuracy);
        currentCall += 1;
        return currentCall === 1 ? firstPending : fix({ latitude: 19.2 });
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const ordinary = coordinator.getCurrentAreaLocation();
    await new Promise((resolve) => setImmediate(resolve));
    const forced = coordinator.getCurrentAreaLocation({ forceRefresh: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls.currentAccuracies, ['balanced']);

    releaseFirst?.(fix({ latitude: 19.1 }));
    assert.equal((await ordinary).latitude, 19.1);
    assert.equal((await forced).latitude, 19.2);
    assert.deepEqual(calls.currentAccuracies, ['balanced', 'balanced']);
  });

  it('uses only a valid bounded last-known fix for current-area context', async () => {
    const { adapter, calls } = createAdapter({
      getLastKnownPosition: async () => {
        calls.lastKnown += 1;
        return fix({ accuracyMeters: 100 });
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    assert.equal((await coordinator.getCurrentAreaLocation()).accuracyMeters, 100);
    assert.deepEqual(calls.currentAccuracies, []);
  });

  it('rejects unusable last-known positions and falls back to one balanced fix', async () => {
    for (const lastKnown of [
      fix({ accuracyMeters: 100.01 }),
      fix({ isMockLocation: true }),
      fix({ timestamp: BASE_TIME - CURRENT_AREA_CACHE_MAX_AGE_MILLISECONDS - 1 }),
      fix({ timestamp: BASE_TIME + 120_001 }),
      fix({ latitude: Number.NaN }),
    ]) {
      const { adapter, calls } = createAdapter({
        getLastKnownPosition: async () => {
          calls.lastKnown += 1;
          return lastKnown;
        },
      });
      const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

      assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.12);
      assert.deepEqual(calls.currentAccuracies, ['balanced']);
    }
  });

  it('checks existing permission before requesting it and distinguishes permanent denial', async () => {
    const askable = createAdapter({
      getForegroundPermission: async () => {
        askable.calls.foregroundPermission += 1;
        return { canAskAgain: true, granted: false };
      },
    });
    await new MobileLocationCoordinator(askable.adapter, () => BASE_TIME).getCurrentAreaLocation();
    assert.equal(askable.calls.requestPermission, 1);

    const permanent = createAdapter({
      getForegroundPermission: async () => {
        permanent.calls.foregroundPermission += 1;
        return { canAskAgain: false, granted: false };
      },
    });
    await assert.rejects(
      new MobileLocationCoordinator(permanent.adapter, () => BASE_TIME).getCurrentAreaLocation(),
      (error: unknown) =>
        error instanceof LocationAccessError &&
        requiresLocationPermissionSettings(error) &&
        /device settings/u.test(error.message),
    );
    assert.equal(permanent.calls.requestPermission, 0);
  });

  it('automatically prompts at most once across repeated feature focus attempts', async () => {
    const denied = createAdapter({
      getForegroundPermission: async () => {
        denied.calls.foregroundPermission += 1;
        return { canAskAgain: true, granted: false };
      },
      requestForegroundPermission: async () => {
        denied.calls.requestPermission += 1;
        return { canAskAgain: true, granted: false };
      },
    });
    const coordinator = new MobileLocationCoordinator(denied.adapter, () => BASE_TIME);

    await assert.rejects(
      coordinator.getCurrentAreaLocationAutomatically(),
      /Location permission is required/u,
    );
    assert.equal(await coordinator.getCurrentAreaLocationAutomatically(), null);
    assert.equal(await coordinator.captureComplaintEvidenceLocationAutomatically(), null);
    coordinator.clearCurrentAreaCache();
    assert.equal(await coordinator.getCurrentAreaLocationAutomatically(), null);
    assert.equal(denied.calls.requestPermission, 1);
    assert.deepEqual(denied.calls.currentAccuracies, []);
  });

  it('keeps explicit permission recovery available after the automatic prompt is declined', async () => {
    let requestCount = 0;
    let granted = false;
    const recovering = createAdapter({
      getForegroundPermission: async () => {
        recovering.calls.foregroundPermission += 1;
        return { canAskAgain: true, granted };
      },
      requestForegroundPermission: async () => {
        recovering.calls.requestPermission += 1;
        requestCount += 1;
        granted = requestCount > 1;
        return { canAskAgain: true, granted };
      },
    });
    const coordinator = new MobileLocationCoordinator(recovering.adapter, () => BASE_TIME);

    await assert.rejects(coordinator.getCurrentAreaLocationAutomatically());
    assert.equal(await coordinator.getCurrentAreaLocationAutomatically(), null);
    assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.12);
    assert.equal(recovering.calls.requestPermission, 2);
    assert.deepEqual(recovering.calls.currentAccuracies, ['balanced']);
  });

  it('fails before native acquisition when device services are disabled', async () => {
    const { adapter, calls } = createAdapter({
      hasServicesEnabled: async () => {
        calls.services += 1;
        return false;
      },
    });
    await assert.rejects(
      new MobileLocationCoordinator(adapter, () => BASE_TIME).getCurrentAreaLocation(),
      /Turn on device location services/u,
    );
    assert.equal(calls.foregroundPermission, 0);
    assert.equal(calls.lastKnown, 0);
    assert.deepEqual(calls.currentAccuracies, []);
  });

  it('never uses current-area or last-known cache for sequential complaint evidence', async () => {
    const { adapter, calls } = createAdapter({
      getLastKnownPosition: async () => {
        calls.lastKnown += 1;
        return fix();
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    await coordinator.getCurrentAreaLocation();
    const first = await coordinator.captureComplaintEvidenceLocation();
    const second = await coordinator.captureComplaintEvidenceLocation();

    assert.equal(first.provider, 'fused');
    assert.equal(second.provider, 'fused');
    assert.equal(calls.lastKnown, 1);
    assert.deepEqual(calls.currentAccuracies, ['high', 'high']);
  });

  it('keeps simultaneous evidence actions on distinct high-accuracy acquisitions', async () => {
    let currentCall = 0;
    const { adapter, calls } = createAdapter({
      getCurrentPosition: async (accuracy) => {
        calls.currentAccuracies.push(accuracy);
        currentCall += 1;
        return fix({ latitude: 19.12 + currentCall / 100 });
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const first = coordinator.captureComplaintEvidenceLocation();
    const second = coordinator.captureComplaintEvidenceLocation();

    assert.notEqual((await first).latitude, (await second).latitude);
    assert.deepEqual(calls.currentAccuracies, ['high', 'high']);
  });

  it('retains the 50 metre and mock-location evidence boundary', async () => {
    for (const unsafeFix of [fix({ accuracyMeters: 50.01 }), fix({ isMockLocation: true })]) {
      const { adapter } = createAdapter({
        getCurrentPosition: async () => unsafeFix,
      });
      await assert.rejects(
        new MobileLocationCoordinator(adapter, () => BASE_TIME).captureComplaintEvidenceLocation(),
        LocationAccessError,
      );
    }
  });

  it('prevents a late request from repopulating a cleared identity cache', async () => {
    let releaseFirst: ((value: NativeLocationFix) => void) | undefined;
    const firstPending = new Promise<NativeLocationFix>((resolve) => {
      releaseFirst = resolve;
    });
    let currentCall = 0;
    const { adapter, calls } = createAdapter({
      getCurrentPosition: async (accuracy) => {
        calls.currentAccuracies.push(accuracy);
        currentCall += 1;
        return currentCall === 1 ? firstPending : fix({ latitude: 19.2 });
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const oldIdentityRequest = coordinator.getCurrentAreaLocation();
    await new Promise((resolve) => setImmediate(resolve));
    coordinator.clearCurrentAreaCache();
    releaseFirst?.(fix({ latitude: 19.1 }));
    await assert.rejects(oldIdentityRequest, /location request was cancelled/iu);

    assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.2);
    assert.deepEqual(calls.currentAccuracies, ['balanced', 'balanced']);
  });

  it('cancels an old identity request when the cache is cleared during permission lookup', async () => {
    let releasePermission:
      ((value: { canAskAgain: boolean; granted: boolean }) => void) | undefined;
    const pendingPermission = new Promise<{ canAskAgain: boolean; granted: boolean }>((resolve) => {
      releasePermission = resolve;
    });
    let permissionCall = 0;
    const { adapter, calls } = createAdapter({
      getForegroundPermission: async () => {
        calls.foregroundPermission += 1;
        permissionCall += 1;
        return permissionCall === 1 ? pendingPermission : { canAskAgain: true, granted: true };
      },
    });
    const coordinator = new MobileLocationCoordinator(adapter, () => BASE_TIME);

    const oldIdentityRequest = coordinator.getCurrentAreaLocation();
    await new Promise((resolve) => setImmediate(resolve));
    coordinator.clearCurrentAreaCache();
    releasePermission?.({ canAskAgain: true, granted: true });

    await assert.rejects(oldIdentityRequest, /location request was cancelled/iu);
    assert.equal(calls.lastKnown, 0);
    assert.deepEqual(calls.currentAccuracies, []);

    assert.equal((await coordinator.getCurrentAreaLocation()).latitude, 19.12);
    assert.deepEqual(calls.currentAccuracies, ['balanced']);
  });
});
