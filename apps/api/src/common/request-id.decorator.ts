import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestContext } from './request-context.js';

export const RequestIdentifier = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestContext>();
    return request.requestId ?? 'unavailable';
  },
);
