import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GovernmentComplaintActionsService } from './government-complaint-actions.service.js';
import { GovernmentComplaintsController } from './government-complaints.controller.js';
import { GovernmentComplaintsService } from './government-complaints.service.js';
import { GovernmentResolutionEvidenceService } from './government-resolution-evidence.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GovernmentComplaintsController],
  providers: [
    GovernmentComplaintsService,
    GovernmentComplaintActionsService,
    GovernmentResolutionEvidenceService,
  ],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GovernmentComplaintsModule {}
