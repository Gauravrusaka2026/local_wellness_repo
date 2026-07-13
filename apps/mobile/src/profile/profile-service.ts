import { supportedLanguages, type Profile, type SupportedLanguage } from '@local-wellness/types';

import { apiRequest } from '../api/client';

export const preferredLanguages = supportedLanguages;
export type PreferredLanguage = SupportedLanguage;
export type { Profile };

export type ProfileUpdate = Readonly<{
  displayName: string;
  preferredLanguage: PreferredLanguage;
}>;

export class ProfileValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

export const validateProfileUpdate = (input: ProfileUpdate): ProfileUpdate => {
  const displayName = input.displayName.trim();

  if (displayName.length < 2 || displayName.length > 100) {
    throw new ProfileValidationError('Your name must be between 2 and 100 characters.');
  }

  if (!preferredLanguages.includes(input.preferredLanguage)) {
    throw new ProfileValidationError('Choose a supported language.');
  }

  return {
    displayName,
    preferredLanguage: input.preferredLanguage,
  };
};

export const getProfile = (accessToken: string): Promise<Profile> =>
  apiRequest<Profile>('/api/v1/me', { accessToken });

export const updateProfile = (accessToken: string, input: ProfileUpdate): Promise<Profile> => {
  const validInput = validateProfileUpdate(input);

  return apiRequest<Profile>('/api/v1/me', {
    accessToken,
    body: {
      ...validInput,
      onboardingCompleted: true,
    },
    method: 'PATCH',
  });
};
