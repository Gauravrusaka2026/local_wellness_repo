import type { SupabaseClient } from '@supabase/supabase-js';

import { saveProfileAvatar, type Profile } from './api/profile';

export const PROFILE_IMAGE_BUCKET = 'profile-images-private';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_SIGNED_URL_SECONDS = 10 * 60;

const profileImageExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type ProfileImageMimeType = keyof typeof profileImageExtensions;

type SaveAvatarMetadata = (
  accessToken: string,
  avatarObjectPath: string | null,
) => Promise<Profile>;

export type ProfileImageUploadResult = Readonly<{
  previousObjectCleanupFailed: boolean;
  profile: Profile;
}>;

export class ProfileImageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ProfileImageError';
  }
}

const isProfileImageMimeType = (value: string): value is ProfileImageMimeType =>
  Object.hasOwn(profileImageExtensions, value);

const requireUuid = (value: string): string => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new ProfileImageError('The signed-in citizen identity is invalid.');
  }

  return value;
};

export const validateProfileImage = (file: File): ProfileImageMimeType => {
  if (file.size < 1) {
    throw new ProfileImageError('Choose a non-empty image file.');
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new ProfileImageError('Choose an image no larger than 5 MiB.');
  }

  if (!isProfileImageMimeType(file.type)) {
    throw new ProfileImageError('Choose a JPEG, PNG, or WebP image.');
  }

  return file.type;
};

const byteSequenceMatches = (bytes: Uint8Array, expected: readonly number[], offset = 0): boolean =>
  expected.every((value, index) => bytes[offset + index] === value);

export const validateProfileImageContent = async (file: File): Promise<ProfileImageMimeType> => {
  const contentType = validateProfileImage(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signatureIsValid =
    (contentType === 'image/jpeg' && byteSequenceMatches(bytes, [0xff, 0xd8, 0xff])) ||
    (contentType === 'image/png' &&
      byteSequenceMatches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (contentType === 'image/webp' &&
      byteSequenceMatches(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      byteSequenceMatches(bytes, [0x57, 0x45, 0x42, 0x50], 8));

  if (!signatureIsValid) {
    throw new ProfileImageError('The selected file content does not match its image type.');
  }

  return contentType;
};

export const buildProfileImageObjectPath = (userId: string, file: File): string => {
  const contentType = validateProfileImage(file);
  return `${requireUuid(userId)}/avatar.${profileImageExtensions[contentType]}`;
};

export const isOwnedProfileImageObjectPath = (userId: string, objectPath: string): boolean => {
  const validUserId = requireUuid(userId);
  return new RegExp(`^${validUserId}/avatar\\.(?:jpg|jpeg|png|webp)$`, 'u').test(objectPath);
};

const getVerifiedBrowserSession = async (
  supabase: SupabaseClient,
  expectedUserId: string,
): Promise<Readonly<{ accessToken: string; userId: string }>> => {
  const validExpectedUserId = requireUuid(expectedUserId);
  const userResult = await supabase.auth.getUser();
  if (userResult.error || !userResult.data.user?.id) {
    throw userResult.error ?? new ProfileImageError('Sign in again to manage your profile photo.');
  }

  if (userResult.data.user.id !== validExpectedUserId) {
    throw new ProfileImageError('The signed-in account does not match this profile.');
  }

  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;
  if (sessionResult.error || !accessToken) {
    throw (
      sessionResult.error ?? new ProfileImageError('Sign in again to manage your profile photo.')
    );
  }

  return { accessToken, userId: validExpectedUserId };
};

export const createProfileImageSignedUrl = async (
  supabase: SupabaseClient,
  userId: string,
  objectPath: string,
): Promise<string> => {
  if (!isOwnedProfileImageObjectPath(userId, objectPath)) {
    throw new ProfileImageError('The profile photo path is invalid.');
  }

  const result = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(objectPath, PROFILE_IMAGE_SIGNED_URL_SECONDS);
  if (result.error || !result.data?.signedUrl) {
    throw result.error ?? new ProfileImageError('The profile photo is temporarily unavailable.');
  }

  return result.data.signedUrl;
};

export const uploadPrivateProfileImage = async (
  supabase: SupabaseClient,
  profile: Profile,
  file: File,
  saveAvatarMetadata: SaveAvatarMetadata = saveProfileAvatar,
): Promise<ProfileImageUploadResult> => {
  const contentType = await validateProfileImageContent(file);
  const { accessToken, userId } = await getVerifiedBrowserSession(supabase, profile.id);
  const objectPath = buildProfileImageObjectPath(userId, file);
  const uploadResult = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  let updatedProfile: Profile;
  try {
    updatedProfile = await saveAvatarMetadata(accessToken, objectPath);
  } catch (error) {
    if (objectPath !== profile.avatarObjectPath) {
      const cleanupResult = await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([objectPath]);
      if (cleanupResult.error) {
        throw new AggregateError(
          [error, cleanupResult.error],
          'Profile photo metadata failed and the uploaded object could not be cleaned up.',
          { cause: error },
        );
      }
    }
    throw error;
  }

  let previousObjectCleanupFailed = false;
  if (profile.avatarObjectPath && profile.avatarObjectPath !== objectPath) {
    const cleanupResult = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .remove([profile.avatarObjectPath]);
    previousObjectCleanupFailed = cleanupResult.error !== null;
  }

  return { previousObjectCleanupFailed, profile: updatedProfile };
};

export const removePrivateProfileImage = async (
  supabase: SupabaseClient,
  profile: Profile,
  saveAvatarMetadata: SaveAvatarMetadata = saveProfileAvatar,
): Promise<Profile> => {
  if (!profile.avatarObjectPath) {
    return profile;
  }

  const { accessToken, userId } = await getVerifiedBrowserSession(supabase, profile.id);
  if (!isOwnedProfileImageObjectPath(userId, profile.avatarObjectPath)) {
    throw new ProfileImageError('The profile photo path is invalid.');
  }

  const removalResult = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .remove([profile.avatarObjectPath]);
  if (removalResult.error) {
    throw removalResult.error;
  }

  return saveAvatarMetadata(accessToken, null);
};

export const getProfileImageError = (error: unknown): string => {
  if (error instanceof ProfileImageError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('row-level security') || message.includes('unauthorized')) {
      return 'Sign in again to manage your profile photo.';
    }

    if (message.includes('payload') || message.includes('too large')) {
      return 'Choose an image no larger than 5 MiB.';
    }
  }

  return 'The profile photo could not be updated. Please try again.';
};
