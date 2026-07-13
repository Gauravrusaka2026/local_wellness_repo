import { Global, Module } from '@nestjs/common';

import { Clock, SystemClock } from './clock.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

@Global()
@Module({
  providers: [
    RequestIdMiddleware,
    {
      provide: Clock,
      useClass: SystemClock,
    },
  ],
  exports: [Clock, RequestIdMiddleware],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonModule {}
