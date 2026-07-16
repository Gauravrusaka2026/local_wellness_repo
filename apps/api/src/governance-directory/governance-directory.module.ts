import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GovernanceDirectoryController } from './governance-directory.controller.js';
import { GovernanceDirectoryService } from './governance-directory.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GovernanceDirectoryController],
  providers: [GovernanceDirectoryService],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GovernanceDirectoryModule {}
