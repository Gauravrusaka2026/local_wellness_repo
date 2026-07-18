import { Module } from '@nestjs/common';

import { TransparencyController } from './transparency.controller.js';
import { TransparencyEngagementController } from './transparency-engagement.controller.js';
import { TransparencyService } from './transparency.service.js';

@Module({
  controllers: [TransparencyController, TransparencyEngagementController],
  providers: [TransparencyService],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TransparencyModule {}
