import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '@local-wellness/types';

import { ApiException } from './api-exception.js';
import type { RequestContext } from './request-context.js';

export const Authenticated = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestContext>();

    if (!request.authenticatedUser) {
      throw ApiException.authenticationRequired();
    }

    return request.authenticatedUser;
  },
);
