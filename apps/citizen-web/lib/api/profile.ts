import {
  profileStatuses,
  supportedLanguages,
  type Profile,
  type SupportedLanguage,
} from '@local-wellness/types';

import { ApiError, apiRequest } from './client';

export const preferredLanguages = supportedLanguages;
export type PreferredLanguage = SupportedLanguage;
export type { Profile };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

export const decodeProfile = (value: unknown): Profile => {
  if (
    !isRecord(value) ||
    typeof value['id'] !== 'string' ||
    !isNullableString(value['displayName']) ||
    !isNullableString(value['avatarObjectPath']) ||
    !isNullableString(value['avatarUpdatedAt']) ||
    !isNullableString(value['phone']) ||
    !isNullableString(value['email']) ||
    !supportedLanguages.includes(value['preferredLanguage'] as SupportedLanguage) ||
    !profileStatuses.includes(value['status'] as Profile['status']) ||
    !isNullableString(value['onboardingCompletedAt']) ||
    typeof value['createdAt'] !== 'string' ||
    typeof value['updatedAt'] !== 'string'
  ) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Local Wellness returned an invalid profile. Please try again.',
      status: 200,
    });
  }

  return value as unknown as Profile;
};

export const getProfile = async (accessToken: string): Promise<Profile> =>
  decodeProfile(await apiRequest<unknown>('/api/v1/me', { accessToken }));

export const isProfileSetupRequired = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.code === 'ACCOUNT_UNAVAILABLE' || error.code === 'PROFILE_NOT_FOUND');

export const isProfileOnboardingComplete = (profile: Profile): boolean =>
  profile.displayName !== null && profile.onboardingCompletedAt !== null;

export const saveProfile = (
  accessToken: string,
  input: Readonly<{ displayName: string; preferredLanguage: PreferredLanguage }>,
): Promise<Profile> =>
  apiRequest<unknown>('/api/v1/me', {
    accessToken,
    body: {
      ...input,
      onboardingCompleted: true,
    },
    method: 'PATCH',
  }).then(decodeProfile);

export const saveProfileAvatar = (
  accessToken: string,
  avatarObjectPath: string | null,
): Promise<Profile> =>
  apiRequest<unknown>('/api/v1/me', {
    accessToken,
    body: { avatarObjectPath },
    method: 'PATCH',
  }).then(decodeProfile);
