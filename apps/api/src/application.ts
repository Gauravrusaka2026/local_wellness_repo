import type { ApiConfiguration } from '@local-wellness/config';
import type { INestApplication } from '@nestjs/common';

import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import type { NextFunction, RequestContext, ResponseContext } from './common/request-context.js';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor.js';
import { API_CONFIGURATION } from './configuration.js';

export const configureApiApplication = (application: INestApplication): void => {
  const requestIdMiddleware = application.get(RequestIdMiddleware);
  const configuration = application.get<ApiConfiguration>(API_CONFIGURATION);

  application.setGlobalPrefix('api/v1');
  application.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    methods: ['GET', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    origin: [...configuration.allowedOrigins],
  });
  application.use((request: RequestContext, response: ResponseContext, next: NextFunction) => {
    requestIdMiddleware.use(request, response, next);
  });
  application.useGlobalFilters(new ApiExceptionFilter());
  application.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
};
