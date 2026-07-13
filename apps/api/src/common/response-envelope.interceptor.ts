import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { ApiSuccess } from '@local-wellness/types';
import { map, type Observable } from 'rxjs';

import type { RequestContext } from './request-context.js';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  public intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<RequestContext>();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          requestId: request.requestId ?? 'unavailable',
        },
      })),
    );
  }
}
