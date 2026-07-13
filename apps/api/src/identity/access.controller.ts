import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, GovernmentAccessScope, UserAccess } from '@local-wellness/types';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { AccessService } from './access.service.js';

@Controller()
@UseGuards(BearerAuthGuard)
export class AccessController {
  public constructor(@Inject(AccessService) private readonly accessService: AccessService) {}

  @Get('me/access')
  public getUserAccess(@Authenticated() user: AuthenticatedUser): Promise<UserAccess> {
    return this.accessService.getUserAccess(user.id);
  }

  @Get('government/access-scope')
  public getGovernmentAccessScope(
    @Authenticated() user: AuthenticatedUser,
  ): Promise<GovernmentAccessScope> {
    return this.accessService.getGovernmentAccessScope(user.id);
  }
}
