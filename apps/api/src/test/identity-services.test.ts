import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiException } from '../common/api-exception.js';
import { AccessService } from '../identity/access.service.js';
import { DevicesService } from '../identity/devices.service.js';
import { FakeIdentityStore, FixedClock } from './test-doubles.js';

describe('identity services', () => {
  it('rehashes client device digests before delegating atomic registration', async () => {
    const identityStore = new FakeIdentityStore();
    const service = new DevicesService(identityStore, new FixedClock());

    const device = await service.registerDevice(identityStore.profile?.id ?? '', {
      deviceIdentifier: '8cb3134f9945efd5727c816ef1226edcbb949b8af948fd8babe6487a3dfb23ec',
      platform: 'android',
      appVersion: '1.0.0',
      pushToken: 'push-notification-token',
    });

    assert.equal(
      identityStore.lastDeviceRegistration?.deviceIdentifierHash,
      '7bc5f5394e6f52239aab6fb2d3e63232ca9c38219b57913aa41dd23d55b9f5db',
    );
    assert.equal(
      identityStore.lastDeviceRegistration?.deviceIdentifierHash.includes(
        '8cb3134f9945efd5727c816ef1226edcbb949b8af948fd8babe6487a3dfb23ec',
      ),
      false,
    );
    assert.equal(device.pushNotificationsEnabled, true);
    assert.deepEqual(identityStore.auditEvents, []);
  });

  it('preserves idempotent repeated device revocation without appending a second audit', async () => {
    const identityStore = new FakeIdentityStore();
    const revokedAt = '2026-07-13T10:00:00.000Z';
    identityStore.devices = [
      {
        id: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
        platform: 'android',
        appVersion: '1.0.0',
        pushNotificationsEnabled: false,
        lastSeenAt: revokedAt,
        riskStatus: 'unknown',
        revokedAt,
        createdAt: revokedAt,
        updatedAt: revokedAt,
      },
    ];
    const service = new DevicesService(identityStore, new FixedClock());

    const firstResult = await service.revokeDevice(
      identityStore.profile?.id ?? '',
      identityStore.devices[0]?.id ?? '',
    );
    const secondResult = await service.revokeDevice(
      identityStore.profile?.id ?? '',
      identityStore.devices[0]?.id ?? '',
    );

    assert.deepEqual(firstResult, secondResult);
    assert.equal(identityStore.revokeDeviceCalls, 2);
    assert.deepEqual(identityStore.auditEvents, []);
  });

  it('rejects government scope without an active government role', async () => {
    const identityStore = new FakeIdentityStore();
    const service = new AccessService(identityStore, new FixedClock());

    await assert.rejects(
      service.getGovernmentAccessScope(identityStore.profile?.id ?? ''),
      (error: unknown) =>
        error instanceof ApiException &&
        error.getStatus() === 403 &&
        error.code === 'ACCESS_DENIED',
    );
  });

  it('rejects an orphaned scoped government role without active authority membership', async () => {
    const identityStore = new FakeIdentityStore();
    const orphanedAuthorityId = 'c7092acf-47b1-4646-9053-5f329315753a';
    identityStore.access.roles = [
      {
        assignmentId: '0867b03c-060e-49b7-baa7-a9388c4460a6',
        authorityId: orphanedAuthorityId,
        roleId: '00000000-0000-4000-8000-000000000002',
        code: 'government_operator',
        name: 'Government operator',
        description: null,
        isGovernment: true,
        isPrivileged: false,
        scopeType: 'authority',
        scopeId: orphanedAuthorityId,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
    ];
    identityStore.access.authorities = [];

    await assert.rejects(
      new AccessService(identityStore, new FixedClock()).getGovernmentAccessScope(
        identityStore.profile?.id ?? '',
      ),
      (error: unknown) =>
        error instanceof ApiException &&
        error.getStatus() === 403 &&
        error.code === 'ACCESS_DENIED',
    );
  });

  it('returns only authority memberships covered by government roles', async () => {
    const identityStore = new FakeIdentityStore();
    const coveredAuthorityId = '1579439f-6e87-46d4-8411-e6559f4ddf51';
    identityStore.access = {
      roles: [
        {
          assignmentId: 'dd5df9ca-0e7f-45c4-93c5-c6db4c8161bf',
          authorityId: coveredAuthorityId,
          roleId: '6e59a3c4-7853-499d-b61c-cbc503d495fb',
          code: 'municipal_admin',
          name: 'Municipal administrator',
          description: null,
          isGovernment: true,
          isPrivileged: true,
          scopeType: 'authority',
          scopeId: coveredAuthorityId,
          effectiveFrom: '2026-07-01T00:00:00.000Z',
          effectiveUntil: null,
        },
      ],
      authorities: [
        {
          membershipId: 'a5ba57d2-f9b2-4c88-bb9c-3815fd506b03',
          authorityId: coveredAuthorityId,
          status: 'active',
          invitationEmail: 'admin@example.com',
          effectiveFrom: '2026-07-01T00:00:00.000Z',
          effectiveUntil: null,
        },
        {
          membershipId: 'e913d3fc-90a9-4700-aabb-7338f66a976c',
          authorityId: 'e7543f98-cedd-45b9-8262-285cc9e331b1',
          status: 'active',
          invitationEmail: 'admin@example.com',
          effectiveFrom: '2026-07-01T00:00:00.000Z',
          effectiveUntil: null,
        },
      ],
    };

    const scope = await new AccessService(identityStore, new FixedClock()).getGovernmentAccessScope(
      identityStore.profile?.id ?? '',
    );

    assert.deepEqual(
      scope.authorities.map((membership) => membership.authorityId),
      [coveredAuthorityId],
    );
  });

  it('recognizes a global platform administrator without an authority membership', async () => {
    const identityStore = new FakeIdentityStore();
    identityStore.access.roles = [
      {
        assignmentId: '10e744eb-16ac-4786-a39e-054db708bc8c',
        authorityId: null,
        roleId: '00000000-0000-4000-8000-000000000006',
        code: 'platform_admin',
        name: 'Platform administrator',
        description: null,
        isGovernment: false,
        isPrivileged: true,
        scopeType: 'global',
        scopeId: null,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
    ];

    const scope = await new AccessService(identityStore, new FixedClock()).getGovernmentAccessScope(
      identityStore.profile?.id ?? '',
    );

    assert.equal(scope.roles[0]?.code, 'platform_admin');
    assert.deepEqual(scope.authorities, []);
  });
});
