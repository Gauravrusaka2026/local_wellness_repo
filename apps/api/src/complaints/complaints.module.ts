import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { RoutingModule } from '../routing/routing.module.js';
import { ComplaintDraftsController } from './complaint-drafts.controller.js';
import { ComplaintDraftsService } from './complaint-drafts.service.js';
import { ComplaintDuplicatesService } from './complaint-duplicates.service.js';
import { ComplaintMediaController } from './complaint-media.controller.js';
import { ComplaintMediaService } from './complaint-media.service.js';
import { ComplaintsController } from './complaints.controller.js';
import { ComplaintsService } from './complaints.service.js';

@Module({
  imports: [AuthModule, RoutingModule],
  controllers: [ComplaintDraftsController, ComplaintMediaController, ComplaintsController],
  providers: [
    ComplaintDraftsService,
    ComplaintDuplicatesService,
    ComplaintMediaService,
    ComplaintsService,
  ],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ComplaintsModule {}
