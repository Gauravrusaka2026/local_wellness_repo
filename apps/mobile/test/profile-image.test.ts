import assert from 'node:assert/strict';
import test from 'node:test';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@local-wellness/types';

import {
  buildProfileImageObjectPath,
  createProfileImageSignedUrl,
  PROFILE_IMAGE_BUCKET,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_SIGNED_URL_SECONDS,
  ProfileImageError,
  removePrivateProfileImage,
  uploadPrivateProfileImage,
  validateProfileImageDescriptor,
} from '../src/profile/profile-image';

const userId = '5724bc1f-754f-4da7-89fa-03a76e950d68';
const profile: Profile = {
  avatarObjectPath: null,
  avatarUpdatedAt: null,
  createdAt: '2026-07-16T10:00:00.000Z',
  displayName: 'Asha Patil',
  email: 'asha@example.org',
  id: userId,
  onboardingCompletedAt: '2026-07-16T10:05:00.000Z',
  phone: null,
  preferredLanguage: 'en',
  status: 'active',
  updatedAt: '2026-07-16T10:05:00.000Z',
};

const asset = {
  height: 512,
  mimeType: 'image/png',
  type: 'image',
  uri: 'file:///private/avatar.png',
  width: 512,
} as const satisfies ImagePickerAsset;

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('validates image size, MIME allowlist, and magic bytes before mobile upload', () => {
  assert.equal(
    validateProfileImageDescriptor({
      byteSize: pngBytes.byteLength,
      leadingBytes: pngBytes,
      mimeType: 'image/png',
    }),
    'image/png',
  );
  assert.throws(
    () =>
      validateProfileImageDescriptor({
        byteSize: PROFILE_IMAGE_MAX_BYTES + 1,
        leadingBytes: pngBytes,
        mimeType: 'image/png',
      }),
    /5 MiB/u,
  );
  assert.throws(
    () =>
      validateProfileImageDescriptor({
        byteSize: 8,
        leadingBytes: new Uint8Array([1, 2, 3]),
        mimeType: 'image/png',
      }),
    /does not match/u,
  );
  assert.throws(
    () =>
      validateProfileImageDescriptor({
        byteSize: 8,
        leadingBytes: pngBytes,
        mimeType: 'image/gif',
      }),
    /JPEG, PNG, or WebP/u,
  );
});

test('builds only the canonical owner-scoped private avatar path', () => {
  assert.equal(buildProfileImageObjectPath(userId, 'image/jpeg'), `${userId}/avatar.jpg`);
  assert.equal(buildProfileImageObjectPath(userId, 'image/webp'), `${userId}/avatar.webp`);
  assert.throws(() => buildProfileImageObjectPath('not-a-user-id', 'image/png'), ProfileImageError);
});

test('creates a short-lived signed URL and never requests a public URL', async () => {
  const calls: unknown[] = [];
  const supabase = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          calls.push({ bucket, expiresIn, path });
          return { data: { signedUrl: 'https://storage.example/signed-avatar' }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await createProfileImageSignedUrl(supabase, userId, `${userId}/avatar.png`),
    'https://storage.example/signed-avatar',
  );
  assert.deepEqual(calls, [
    {
      bucket: PROFILE_IMAGE_BUCKET,
      expiresIn: PROFILE_IMAGE_SIGNED_URL_SECONDS,
      path: `${userId}/avatar.png`,
    },
  ]);
});

test('uploads an ArrayBuffer privately before saving owner-scoped profile metadata', async () => {
  const calls: unknown[] = [];
  const objectPath = `${userId}/avatar.png`;
  const updatedProfile = {
    ...profile,
    avatarObjectPath: objectPath,
    avatarUpdatedAt: '2026-07-16T11:00:00.000Z',
  };
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'citizen-token' } },
        error: null,
      }),
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push({ bucket, remove: paths });
          return { data: [], error: null };
        },
        upload: async (path: string, value: ArrayBuffer, options: unknown) => {
          calls.push({ bucket, options, path, value });
          return { data: { path }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;

  const result = await uploadPrivateProfileImage(
    supabase,
    profile,
    asset,
    async (accessToken, avatarObjectPath) => {
      calls.push({ accessToken, avatarObjectPath });
      return updatedProfile;
    },
    async () => ({ bytes: pngBytes, mimeType: 'image/png' }),
  );

  assert.deepEqual(result, { previousObjectCleanupFailed: false, profile: updatedProfile });
  assert.equal((calls[0] as { path: string }).path, objectPath);
  assert.ok((calls[0] as { value: unknown }).value instanceof ArrayBuffer);
  assert.deepEqual((calls[0] as { options: unknown }).options, {
    cacheControl: '3600',
    contentType: 'image/png',
    upsert: true,
  });
  assert.deepEqual(calls[1], { accessToken: 'citizen-token', avatarObjectPath: objectPath });
});

test('removes the private object before clearing avatar metadata', async () => {
  const calls: unknown[] = [];
  const current = { ...profile, avatarObjectPath: `${userId}/avatar.jpg` };
  const cleared = { ...current, avatarObjectPath: null, avatarUpdatedAt: null };
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'citizen-token' } },
        error: null,
      }),
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push({ bucket, paths });
          return { data: [], error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(
    await removePrivateProfileImage(supabase, current, async (accessToken, avatarObjectPath) => {
      calls.push({ accessToken, avatarObjectPath });
      return cleared;
    }),
    cleared,
  );
  assert.deepEqual(calls, [
    { bucket: PROFILE_IMAGE_BUCKET, paths: [`${userId}/avatar.jpg`] },
    { accessToken: 'citizen-token', avatarObjectPath: null },
  ]);
});
