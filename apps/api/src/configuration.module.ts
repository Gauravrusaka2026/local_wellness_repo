import { Global, Module } from '@nestjs/common';

import { API_CONFIGURATION, loadApiConfiguration } from './configuration.js';

@Global()
@Module({
  providers: [
    {
      provide: API_CONFIGURATION,
      useFactory: loadApiConfiguration,
    },
  ],
  exports: [API_CONFIGURATION],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ConfigurationModule {}
