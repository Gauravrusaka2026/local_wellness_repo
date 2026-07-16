import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createGovernmentInvitationSchema,
  recordAuthAuditEventSchema,
  registerDeviceSchema,
  updateProfileSchema,
} from './index.js';

describe('identity validation schemas', () => {
  it('normalizes profile and invitation input', () => {
    assert.deepEqual(updateProfileSchema.parse({ displayName: '  Asha Patil  ' }), {
      displayName: 'Asha Patil',
    });

    assert.equal(
      createGovernmentInvitationSchema.parse({
        email: '  OFFICER@EXAMPLE.COM ',
        authorityId: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6',
        roleCode: 'government_operator',
      }).email,
      'officer@example.com',
    );
  });

  it('rejects empty profile patches and unknown device fields', () => {
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(
      registerDeviceSchema.safeParse({
        deviceIdentifier: '8cb3134f9945efd5727c816ef1226edcbb949b8af948fd8babe6487a3dfb23ec',
        platform: 'android',
        userId: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6',
      }).success,
      false,
    );
  });

  it('accepts only account-scoped supported profile image paths or removal', () => {
    assert.deepEqual(
      updateProfileSchema.parse({
        avatarObjectPath: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6/avatar.webp',
      }),
      { avatarObjectPath: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6/avatar.webp' },
    );
    assert.deepEqual(updateProfileSchema.parse({ avatarObjectPath: null }), {
      avatarObjectPath: null,
    });
    assert.equal(
      updateProfileSchema.safeParse({
        avatarObjectPath: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6/avatar.svg',
      }).success,
      false,
    );
  });

  it('accepts only an exact lowercase SHA-256 device identifier', () => {
    const digest = '8cb3134f9945efd5727c816ef1226edcbb949b8af948fd8babe6487a3dfb23ec';

    assert.equal(
      registerDeviceSchema.safeParse({ deviceIdentifier: digest, platform: 'android' }).success,
      true,
    );
    assert.equal(
      registerDeviceSchema.safeParse({
        deviceIdentifier: digest.toUpperCase(),
        platform: 'android',
      }).success,
      false,
    );
    assert.equal(
      registerDeviceSchema.safeParse({ deviceIdentifier: ` ${digest}`, platform: 'android' })
        .success,
      false,
    );
    assert.equal(
      registerDeviceSchema.safeParse({ deviceIdentifier: 'device-identifier', platform: 'android' })
        .success,
      false,
    );
  });

  it('rejects nested credential-like audit metadata', () => {
    const result = recordAuthAuditEventSchema.safeParse({
      eventType: 'sign_in_succeeded',
      metadata: {
        provider: 'email',
        nested: { refreshToken: 'must-not-be-persisted' },
      },
    });

    assert.equal(result.success, false);
  });

  it('rejects server-owned audit events and client-provided outcomes', () => {
    assert.equal(
      recordAuthAuditEventSchema.safeParse({
        eventType: 'government_invitation_created',
      }).success,
      false,
    );
    assert.equal(
      recordAuthAuditEventSchema.safeParse({
        eventType: 'session_refreshed',
        outcome: 'failure',
      }).success,
      false,
    );
  });
});
