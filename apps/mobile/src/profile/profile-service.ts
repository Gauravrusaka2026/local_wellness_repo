import {
  profileStatuses,
  supportedLanguages,
  type Profile,
  type SupportedLanguage,
} from '@local-wellness/types';
import { z } from 'zod';

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

const profileSchema = z
  .object({
    createdAt: z.iso.datetime({ offset: true }),
    displayName: z.string().min(1).max(100).nullable(),
    email: z.email().max(254).nullable(),
    id: z.uuid(),
    onboardingCompletedAt: z.iso.datetime({ offset: true }).nullable(),
    phone: z.string().min(1).max(32).nullable(),
    preferredLanguage: z.enum(supportedLanguages),
    status: z.enum(profileStatuses),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const decodeProfile = (value: unknown): Profile => profileSchema.parse(value) as Profile;

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
  apiRequest<unknown>('/api/v1/me', { accessToken }).then(decodeProfile);

export const updateProfile = (accessToken: string, input: ProfileUpdate): Promise<Profile> => {
  const validInput = validateProfileUpdate(input);

  return apiRequest<unknown>('/api/v1/me', {
    accessToken,
    body: {
      ...validInput,
      onboardingCompleted: true,
    },
    method: 'PATCH',
  }).then(decodeProfile);
};
