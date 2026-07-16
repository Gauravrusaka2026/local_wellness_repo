import type { ApiConfiguration } from '@local-wellness/config';
import { RequestMethod, type INestApplication } from '@nestjs/common';

import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import type { RateLimitInterceptor } from './common/rate-limit.js';
import type { NextFunction, RequestContext, ResponseContext } from './common/request-context.js';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor.js';
import { API_CONFIGURATION } from './configuration.js';

type ApiApplicationOptions = Readonly<{
  rateLimitInterceptor?: RateLimitInterceptor;
}>;

export const configureApiApplication = (
  application: INestApplication,
  options: ApiApplicationOptions = {},
): void => {
  const requestIdMiddleware = application.get(RequestIdMiddleware);
  const configuration = application.get<ApiConfiguration>(API_CONFIGURATION);

  application.setGlobalPrefix('api/v1', {
    exclude: [
      { method: RequestMethod.GET, path: 'health/live' },
      { method: RequestMethod.GET, path: 'health/ready' },
    ],
  });
  const expressApplication = application.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  expressApplication.disable?.('x-powered-by');
  application.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: [
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
      'X-Request-Id',
    ],
    methods: ['GET', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    origin: [...configuration.allowedOrigins],
  });
  application.use((request: RequestContext, response: ResponseContext, next: NextFunction) => {
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    );
    response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    requestIdMiddleware.use(request, response, next);
  });
  application.useGlobalFilters(new ApiExceptionFilter());
  application.useGlobalInterceptors(
    ...(options.rateLimitInterceptor ? [options.rateLimitInterceptor] : []),
    new ResponseEnvelopeInterceptor(),
  );
};
