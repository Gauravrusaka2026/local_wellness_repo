import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, Profile } from '@local-wellness/types';
import { updateProfileSchema, type UpdateProfileRequest } from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ProfilesService } from './profiles.service.js';

@Controller('me')
@UseGuards(BearerAuthGuard)
export class ProfilesController {
  public constructor(@Inject(ProfilesService) private readonly profilesService: ProfilesService) {}

  @Get()
  public getProfile(@Authenticated() user: AuthenticatedUser): Promise<Profile> {
    return this.profilesService.getProfile(user.id);
  }

  @Patch()
  public updateProfile(
    @Authenticated() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileRequest,
  ): Promise<Profile> {
    return this.profilesService.updateProfile(user.id, input);
  }
}
