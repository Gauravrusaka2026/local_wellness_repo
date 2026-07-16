import { Controller, Get, Header, Inject } from '@nestjs/common';

import { ApiException } from '../common/api-exception.js';
import { HealthService } from './health.service.js';

type HealthStatus = Readonly<{ status: 'live' | 'ready' }>;

@Controller('health')
export class HealthController {
  public constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  public live(): HealthStatus {
    return { status: 'live' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  public async ready(): Promise<HealthStatus> {
    if (!(await this.healthService.isReady())) {
      throw ApiException.dependencyUnavailable('The API is not ready.');
    }

    return { status: 'ready' };
  }
}
