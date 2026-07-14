import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { JurisdictionsController } from './jurisdictions.controller.js';
import { JurisdictionsService } from './jurisdictions.service.js';
import { RoutingController } from './routing.controller.js';
import { RoutingService } from './routing.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AssetsController, CategoriesController, JurisdictionsController, RoutingController],
  providers: [AssetsService, CategoriesService, JurisdictionsService, RoutingService],
  exports: [RoutingService],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RoutingModule {}
