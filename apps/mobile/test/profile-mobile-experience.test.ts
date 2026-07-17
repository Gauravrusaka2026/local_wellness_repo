import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CameraPermissionResponse,
  ImagePickerAsset,
  MediaLibraryPermissionResponse,
} from 'expo-image-picker';
import type { GoverningBodyResolution } from '@local-wellness/types';

import { getPhoneMfaSignInCopy } from '../src/auth/phone-mfa-copy';
import { createProfileCivicArea } from '../src/profile/profile-civic-area';
import {
  ProfilePhotoSelectionError,
  selectProfilePhoto,
  type ProfilePhotoPicker,
} from '../src/profile/profile-photo-picker';

const grantedPermission = {
  canAskAgain: true,
  granted: true,
} as CameraPermissionResponse;

const deniedPermission = (canAskAgain: boolean): CameraPermissionResponse =>
  ({ canAskAgain, granted: false }) as CameraPermissionResponse;

const asset = {
  height: 512,
  mimeType: 'image/jpeg',
  type: 'image',
  uri: 'file:///private/profile-camera.jpg',
  width: 512,
} as const satisfies ImagePickerAsset;

const createPicker = (
  overrides: Partial<ProfilePhotoPicker> = {},
): Readonly<{
  calls: Array<Readonly<{ name: string; options?: unknown }>>;
  picker: ProfilePhotoPicker;
}> => {
  const calls: Array<Readonly<{ name: string; options?: unknown }>> = [];
  const picker: ProfilePhotoPicker = {
    launchCameraAsync: async (options) => {
      calls.push({ name: 'launch-camera', options });
      return { assets: [asset], canceled: false };
    },
    launchImageLibraryAsync: async (options) => {
      calls.push({ name: 'launch-library', options });
      return { assets: [asset], canceled: false };
    },
    requestCameraPermissionsAsync: async () => {
      calls.push({ name: 'request-camera' });
      return grantedPermission;
    },
    requestMediaLibraryPermissionsAsync: async () => {
      calls.push({ name: 'request-library' });
      return grantedPermission as MediaLibraryPermissionResponse;
    },
    ...overrides,
  };
  return { calls, picker };
};

test('takes a square image through the camera before reusing the private avatar pipeline', async () => {
  const { calls, picker } = createPicker();

  assert.equal(await selectProfilePhoto(picker, 'camera'), asset);
  assert.deepEqual(calls, [
    { name: 'request-camera' },
    {
      name: 'launch-camera',
      options: {
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.85,
      },
    },
  ]);
});

test('requests device-settings recovery only after camera permission is permanently denied', async () => {
  const { calls, picker } = createPicker({
    requestCameraPermissionsAsync: async () => {
      calls.push({ name: 'request-camera' });
      return deniedPermission(false);
    },
  });

  await assert.rejects(
    selectProfilePhoto(picker, 'camera'),
    (error: unknown) =>
      error instanceof ProfilePhotoSelectionError &&
      error.source === 'camera' &&
      error.requiresAppSettings &&
      /device settings/u.test(error.message),
  );
  assert.deepEqual(calls, [{ name: 'request-camera' }]);
});

test('keeps a canceled library selection as a no-op', async () => {
  const { calls, picker } = createPicker({
    launchImageLibraryAsync: async (options) => {
      calls.push({ name: 'launch-library', options });
      return { assets: null, canceled: true };
    },
  });

  assert.equal(await selectProfilePhoto(picker, 'library'), null);
  assert.equal(calls[0]?.name, 'request-library');
  assert.equal(calls[1]?.name, 'launch-library');
  assert.deepEqual(
    (calls[1]?.options as Readonly<{ mediaTypes: string[]; selectionLimit: number }>).mediaTypes,
    ['images'],
  );
  assert.equal(
    (calls[1]?.options as Readonly<{ mediaTypes: string[]; selectionLimit: number }>)
      .selectionLimit,
    1,
  );
});

const verifiedResolution: GoverningBodyResolution = {
  matches: [
    {
      authority: {
        kind: 'authority',
        lastVerifiedOn: '2026-07-16',
        name: 'Brihanmumbai Municipal Corporation',
        sourceUrl: 'https://www.mcgm.gov.in/',
        type: 'municipal_corporation',
        verificationStatus: 'verified',
      },
      district: null,
      localBody: {
        kind: 'local_body',
        lastVerifiedOn: '2026-07-16',
        name: 'Brihanmumbai Municipal Corporation',
        sourceUrl: 'https://www.mcgm.gov.in/',
        type: 'municipal_corporation',
        verificationStatus: 'verified',
      },
      state: {
        kind: 'state',
        lastVerifiedOn: '2026-07-16',
        name: 'Maharashtra',
        sourceUrl: 'https://maharashtra.gov.in/',
        type: 'state',
        verificationStatus: 'verified',
      },
      taluka: null,
      ward: {
        kind: 'ward',
        lastVerifiedOn: '2026-07-16',
        name: 'A Ward',
        sourceUrl: 'https://www.mcgm.gov.in/',
        type: 'administrative_ward',
        verificationStatus: 'verified',
      },
    },
  ],
  maximumAccuracyMeters: 100,
  reason: 'verified_exact_match',
  status: 'resolved',
};

test('derives only verified civic labels for the ephemeral profile area', () => {
  assert.deepEqual(createProfileCivicArea(verifiedResolution), {
    authorityName: 'Brihanmumbai Municipal Corporation',
    lastVerifiedOn: '2026-07-16',
    localBodyName: 'Brihanmumbai Municipal Corporation',
    sourceUrl: 'https://www.mcgm.gov.in/',
    status: 'resolved',
    wardName: 'A Ward',
  });
  assert.equal(
    JSON.stringify(createProfileCivicArea(verifiedResolution)).includes('latitude'),
    false,
  );
  assert.equal(
    JSON.stringify(createProfileCivicArea(verifiedResolution)).includes('longitude'),
    false,
  );
});

test('does not invent a civic area for unsupported or ambiguous boundaries', () => {
  const verifiedMatch = verifiedResolution.matches[0];
  assert.ok(verifiedMatch);

  assert.deepEqual(
    createProfileCivicArea({
      matches: [],
      maximumAccuracyMeters: 100,
      reason: 'not_supported',
      status: 'unsupported',
    }),
    { maximumAccuracyMeters: 100, status: 'unsupported' },
  );
  assert.deepEqual(
    createProfileCivicArea({
      ...verifiedResolution,
      matches: [verifiedMatch, verifiedMatch],
      reason: 'multiple_verified_matches',
      status: 'ambiguous',
    }),
    { maximumAccuracyMeters: 100, status: 'ambiguous' },
  );
});

test('presents staged phone verification accurately in observe and enforce modes', () => {
  assert.match(getPhoneMfaSignInCopy('observe').trustText, /not required in this environment/u);
  assert.match(getPhoneMfaSignInCopy('observe').description, /optional/u);
  assert.match(getPhoneMfaSignInCopy('enforce').trustText, /OTP is required/u);
  assert.match(getPhoneMfaSignInCopy('enforce').description, /one-time code/u);
});
