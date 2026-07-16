import type { ImagePickerAsset } from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';

import { updateProfileAvatar, type Profile } from './profile-service';

export const PROFILE_IMAGE_BUCKET = 'profile-images-private';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_SIGNED_URL_SECONDS = 10 * 60;

const profileImageExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type ProfileImageMimeType = keyof typeof profileImageExtensions;

export type ProfileImageDescriptor = Readonly<{
  byteSize: number;
  leadingBytes: Uint8Array;
  mimeType: string | null | undefined;
}>;

type SaveAvatarMetadata = (
  accessToken: string,
  avatarObjectPath: string | null,
) => Promise<Profile>;

export type PreparedProfileImage = Readonly<{
  bytes: Uint8Array;
  mimeType: ProfileImageMimeType;
}>;

type ProfileImageReader = (asset: ImagePickerAsset) => Promise<PreparedProfileImage>;

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

const byteSequenceMatches = (bytes: Uint8Array, expected: readonly number[], offset = 0): boolean =>
  expected.every((value, index) => bytes[offset + index] === value);

export const validateProfileImageDescriptor = (
  descriptor: ProfileImageDescriptor,
): ProfileImageMimeType => {
  if (!Number.isSafeInteger(descriptor.byteSize) || descriptor.byteSize < 1) {
    throw new ProfileImageError('Choose a non-empty image file.');
  }
  if (descriptor.byteSize > PROFILE_IMAGE_MAX_BYTES) {
    throw new ProfileImageError('Choose an image no larger than 5 MiB.');
  }
  if (!descriptor.mimeType || !isProfileImageMimeType(descriptor.mimeType)) {
    throw new ProfileImageError('Choose a JPEG, PNG, or WebP image.');
  }

  const signatureIsValid =
    (descriptor.mimeType === 'image/jpeg' &&
      byteSequenceMatches(descriptor.leadingBytes, [0xff, 0xd8, 0xff])) ||
    (descriptor.mimeType === 'image/png' &&
      byteSequenceMatches(
        descriptor.leadingBytes,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      )) ||
    (descriptor.mimeType === 'image/webp' &&
      byteSequenceMatches(descriptor.leadingBytes, [0x52, 0x49, 0x46, 0x46]) &&
      byteSequenceMatches(descriptor.leadingBytes, [0x57, 0x45, 0x42, 0x50], 8));

  if (!signatureIsValid) {
    throw new ProfileImageError('The selected file content does not match its image type.');
  }
  return descriptor.mimeType;
};

export const buildProfileImageObjectPath = (
  userId: string,
  mimeType: ProfileImageMimeType,
): string => `${requireUuid(userId)}/avatar.${profileImageExtensions[mimeType]}`;

export const isOwnedProfileImageObjectPath = (userId: string, objectPath: string): boolean => {
  const validUserId = requireUuid(userId);
  return new RegExp(`^${validUserId}/avatar\\.(?:jpg|jpeg|png|webp)$`, 'u').test(objectPath);
};

const getVerifiedMobileSession = async (
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

const readProfileImage = async (asset: ImagePickerAsset): Promise<PreparedProfileImage> => {
  if (asset.type !== 'image') throw new ProfileImageError('Choose a JPEG, PNG, or WebP image.');
  const { File } = await import('expo-file-system');
  const file = new File(asset.uri);
  if (!file.exists) throw new ProfileImageError('The selected image is no longer available.');
  const bytes = await file.bytes();
  const mimeType = validateProfileImageDescriptor({
    byteSize: file.size,
    leadingBytes: bytes.subarray(0, 12),
    mimeType: asset.mimeType,
  });
  return { bytes, mimeType };
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
  asset: ImagePickerAsset,
  saveAvatarMetadata: SaveAvatarMetadata = updateProfileAvatar,
  readImage: ProfileImageReader = readProfileImage,
): Promise<ProfileImageUploadResult> => {
  const { accessToken, userId } = await getVerifiedMobileSession(supabase, profile.id);
  const image = await readImage(asset);
  const objectPath = buildProfileImageObjectPath(userId, image.mimeType);
  const upload = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(objectPath, image.bytes.slice().buffer as ArrayBuffer, {
      cacheControl: '3600',
      contentType: image.mimeType,
      upsert: true,
    });
  if (upload.error) throw upload.error;

  let updatedProfile: Profile;
  try {
    updatedProfile = await saveAvatarMetadata(accessToken, objectPath);
  } catch (error) {
    if (objectPath !== profile.avatarObjectPath) {
      const cleanup = await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([objectPath]);
      if (cleanup.error) {
        throw new AggregateError(
          [error, cleanup.error],
          'Profile photo metadata failed and the uploaded object could not be cleaned up.',
          { cause: error },
        );
      }
    }
    throw error;
  }

  let previousObjectCleanupFailed = false;
  if (profile.avatarObjectPath && profile.avatarObjectPath !== objectPath) {
    const cleanup = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .remove([profile.avatarObjectPath]);
    previousObjectCleanupFailed = cleanup.error !== null;
  }
  return { previousObjectCleanupFailed, profile: updatedProfile };
};

export const removePrivateProfileImage = async (
  supabase: SupabaseClient,
  profile: Profile,
  saveAvatarMetadata: SaveAvatarMetadata = updateProfileAvatar,
): Promise<Profile> => {
  if (!profile.avatarObjectPath) return profile;
  const { accessToken, userId } = await getVerifiedMobileSession(supabase, profile.id);
  if (!isOwnedProfileImageObjectPath(userId, profile.avatarObjectPath)) {
    throw new ProfileImageError('The profile photo path is invalid.');
  }
  const removal = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .remove([profile.avatarObjectPath]);
  if (removal.error) throw removal.error;
  return saveAvatarMetadata(accessToken, null);
};

export const getProfileImageError = (error: unknown): string => {
  if (error instanceof ProfileImageError) return error.message;
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
