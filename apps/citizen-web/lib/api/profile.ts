import { supportedLanguages, type Profile, type SupportedLanguage } from '@local-wellness/types';

import { apiRequest } from './client';

export const preferredLanguages = supportedLanguages;
export type PreferredLanguage = SupportedLanguage;
export type { Profile };

export const getProfile = (accessToken: string): Promise<Profile> =>
  apiRequest<Profile>('/api/v1/me', { accessToken });

export const saveProfile = (
  accessToken: string,
  input: Readonly<{ displayName: string; preferredLanguage: PreferredLanguage }>,
): Promise<Profile> =>
  apiRequest<Profile>('/api/v1/me', {
    accessToken,
    body: {
      ...input,
      onboardingCompleted: true,
    },
    method: 'PATCH',
  });
