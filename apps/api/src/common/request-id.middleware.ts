import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';

import type { NextFunction, RequestContext, ResponseContext } from './request-context.js';

const validRequestId = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  public use(request: RequestContext, response: ResponseContext, next: NextFunction): void {
    const requestIdHeader = request.headers['x-request-id'];
    const candidate = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    const requestId = candidate && validRequestId.test(candidate) ? candidate : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
