import { Inject, Injectable } from '@nestjs/common';
import type { Profile, UpdateProfileInput } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { IdentityStore, type ProfileUpdate } from '../data/identity.store.js';

@Injectable()
export class ProfilesService {
  public constructor(
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async getProfile(userId: string): Promise<Profile> {
    const profile = await this.identityStore.findProfile(userId);

    if (!profile) {
      throw ApiException.notFound('PROFILE_NOT_FOUND', 'The account profile was not found.');
    }

    return profile;
  }

  public async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    if (
      input.avatarObjectPath !== undefined &&
      input.avatarObjectPath !== null &&
      !input.avatarObjectPath.startsWith(`${userId}/avatar.`)
    ) {
      throw ApiException.badRequest(
        'PROFILE_IMAGE_PATH_INVALID',
        'The profile image does not belong to this account.',
      );
    }

    const existingProfile =
      input.onboardingCompleted === true ? await this.getProfile(userId) : null;
    const update: ProfileUpdate = {
      ...(input.avatarObjectPath === undefined ? {} : { avatarObjectPath: input.avatarObjectPath }),
      ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
      ...(input.preferredLanguage === undefined
        ? {}
        : { preferredLanguage: input.preferredLanguage }),
      ...(input.onboardingCompleted === true && !existingProfile?.onboardingCompletedAt
        ? { onboardingCompletedAt: this.clock.now().toISOString() }
        : {}),
    };

    if (Object.keys(update).length === 0 && existingProfile) {
      return existingProfile;
    }

    return this.identityStore.updateProfile(userId, update);
  }
}
