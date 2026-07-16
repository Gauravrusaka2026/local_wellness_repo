import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Profile } from '../lib/api/profile';
import {
  buildProfileImageObjectPath,
  createProfileImageSignedUrl,
  PROFILE_IMAGE_BUCKET,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_SIGNED_URL_SECONDS,
  ProfileImageError,
  removePrivateProfileImage,
  uploadPrivateProfileImage,
  validateProfileImage,
  validateProfileImageContent,
} from '../lib/profile-image';

const userId = '5724bc1f-754f-4da7-89fa-03a76e950d68';
const baseProfile: Profile = {
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

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

test('accepts only non-empty JPEG, PNG, or WebP files up to 5 MiB', () => {
  assert.equal(
    validateProfileImage(new File(['jpeg'], 'avatar.jpg', { type: 'image/jpeg' })),
    'image/jpeg',
  );
  assert.equal(
    validateProfileImage(new File(['png'], 'avatar.png', { type: 'image/png' })),
    'image/png',
  );
  assert.equal(
    validateProfileImage(new File(['webp'], 'avatar.webp', { type: 'image/webp' })),
    'image/webp',
  );
  assert.throws(
    () => validateProfileImage(new File([], 'empty.jpg', { type: 'image/jpeg' })),
    ProfileImageError,
  );
  assert.throws(
    () => validateProfileImage(new File(['gif'], 'avatar.gif', { type: 'image/gif' })),
    ProfileImageError,
  );
  assert.throws(
    () =>
      validateProfileImage({
        name: 'large.png',
        size: PROFILE_IMAGE_MAX_BYTES + 1,
        type: 'image/png',
      } as File),
    ProfileImageError,
  );
});

test('checks the image magic bytes instead of trusting the browser MIME alone', async () => {
  assert.equal(
    await validateProfileImageContent(new File([pngBytes], 'avatar.png', { type: 'image/png' })),
    'image/png',
  );
  await assert.rejects(
    validateProfileImageContent(new File(['not an image'], 'avatar.png', { type: 'image/png' })),
    /does not match/u,
  );
});

test('builds the exact owner-scoped canonical avatar object path', () => {
  assert.equal(
    buildProfileImageObjectPath(userId, new File(['avatar'], 'photo.jpeg', { type: 'image/jpeg' })),
    `${userId}/avatar.jpg`,
  );
  assert.throws(
    () =>
      buildProfileImageObjectPath(
        'not-a-user-id',
        new File(['avatar'], 'photo.png', { type: 'image/png' }),
      ),
    ProfileImageError,
  );
});

test('creates a short-lived signed URL from the private profile bucket', async () => {
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
    await createProfileImageSignedUrl(supabase, userId, `${userId}/avatar.webp`),
    'https://storage.example/signed-avatar',
  );
  assert.deepEqual(calls, [
    {
      bucket: PROFILE_IMAGE_BUCKET,
      expiresIn: PROFILE_IMAGE_SIGNED_URL_SECONDS,
      path: `${userId}/avatar.webp`,
    },
  ]);
});

test('uploads privately before saving profile metadata', async () => {
  const calls: unknown[] = [];
  const file = new File([pngBytes], 'photo.png', { type: 'image/png' });
  const objectPath = `${userId}/avatar.png`;
  const updatedProfile: Profile = {
    ...baseProfile,
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
        upload: async (path: string, value: File, options: unknown) => {
          calls.push({ bucket, options, path, value });
          return { data: { path }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;

  const result = await uploadPrivateProfileImage(
    supabase,
    baseProfile,
    file,
    async (accessToken, avatarObjectPath) => {
      calls.push({ accessToken, avatarObjectPath });
      return updatedProfile;
    },
  );

  assert.deepEqual(result, { previousObjectCleanupFailed: false, profile: updatedProfile });
  assert.equal((calls[0] as { path: string }).path, objectPath);
  assert.deepEqual((calls[0] as { options: unknown }).options, {
    cacheControl: '3600',
    contentType: 'image/png',
    upsert: true,
  });
  assert.deepEqual(calls[1], {
    accessToken: 'citizen-token',
    avatarObjectPath: objectPath,
  });
});

test('removes the private object before clearing profile metadata', async () => {
  const calls: unknown[] = [];
  const profileWithAvatar: Profile = {
    ...baseProfile,
    avatarObjectPath: `${userId}/avatar.jpg`,
    avatarUpdatedAt: '2026-07-16T11:00:00.000Z',
  };
  const clearedProfile: Profile = {
    ...profileWithAvatar,
    avatarObjectPath: null,
    avatarUpdatedAt: null,
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
      }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(
    await removePrivateProfileImage(
      supabase,
      profileWithAvatar,
      async (accessToken, avatarObjectPath) => {
        calls.push({ accessToken, avatarObjectPath });
        return clearedProfile;
      },
    ),
    clearedProfile,
  );
  assert.deepEqual(calls, [
    { bucket: PROFILE_IMAGE_BUCKET, remove: [`${userId}/avatar.jpg`] },
    { accessToken: 'citizen-token', avatarObjectPath: null },
  ]);
});

test('rejects a browser session whose user does not own the profile', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    uploadPrivateProfileImage(
      supabase,
      baseProfile,
      new File([webpBytes], 'photo.webp', { type: 'image/webp' }),
    ),
    /does not match/u,
  );
});
