import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeProfile, validateProfileUpdate } from '../src/profile/profile-service';

const profile = {
  avatarObjectPath: null,
  avatarUpdatedAt: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  displayName: 'Citizen Tester',
  email: 'citizen@example.test',
  id: '11111111-1111-4111-8111-111111111111',
  onboardingCompletedAt: '2026-07-14T10:01:00.000Z',
  phone: null,
  preferredLanguage: 'en',
  status: 'active',
  updatedAt: '2026-07-14T10:01:00.000Z',
} as const;

describe('mobile profile service validation', () => {
  it('decodes only the complete public profile contract', () => {
    assert.deepEqual(decodeProfile(profile), profile);
    assert.throws(() => decodeProfile({ ...profile, role: 'platform_admin' }));
    assert.throws(() => decodeProfile({ ...profile, preferredLanguage: 'unsupported' }));
    assert.throws(() => decodeProfile({ ...profile, updatedAt: 'not-a-timestamp' }));
  });

  it('normalizes profile updates before sending them', () => {
    assert.deepEqual(
      validateProfileUpdate({ displayName: '  Citizen Tester  ', preferredLanguage: 'mr' }),
      { displayName: 'Citizen Tester', preferredLanguage: 'mr' },
    );
  });
});
