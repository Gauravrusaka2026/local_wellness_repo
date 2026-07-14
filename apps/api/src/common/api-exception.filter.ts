import { Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { RoutingConfigurationError } from '@local-wellness/routing-engine';
import type { ApiErrorBody, ApiErrorResponse } from '@local-wellness/types';

import {
  ComplaintConflictError,
  ComplaintDataAccessError,
  ComplaintNotFoundError,
} from '../data/complaint.store.js';
import { ComplaintMediaGatewayError } from '../data/complaint-media.gateway.js';
import {
  DeviceBlockedError,
  DeviceRevokedError,
  IdentityDataAccessError,
} from '../data/identity.store.js';
import {
  RoutingDataAccessError,
  RoutingDecisionIdempotencyConflictError,
} from '../data/routing.store.js';
import { ApiException } from './api-exception.js';
import type { RequestContext, ResponseContext } from './request-context.js';

const statusCodeToErrorCode = (status: number): string => {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'AUTH_REQUIRED';
    case HttpStatus.FORBIDDEN:
      return 'ACCESS_DENIED';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
};

const safeHttpMessage = (status: number): string => {
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return 'An unexpected error occurred.';
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'The request is invalid.';
    case HttpStatus.UNAUTHORIZED:
      return 'A valid bearer token is required.';
    case HttpStatus.FORBIDDEN:
      return 'You do not have access to this resource.';
    case HttpStatus.NOT_FOUND:
      return 'The requested resource was not found.';
    case HttpStatus.CONFLICT:
      return 'The request conflicts with the current resource state.';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'Too many requests were received.';
    default:
      return 'The request could not be completed.';
  }
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestContext>();
    const response = http.getResponse<ResponseContext>();
    const requestId = request.requestId ?? 'unavailable';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiErrorBody = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    };

    if (exception instanceof ApiException) {
      status = exception.getStatus();
      error = {
        code: exception.code,
        message: exception.message,
        ...(exception.details === undefined ? {} : { details: exception.details }),
      };
    } else if (exception instanceof DeviceBlockedError) {
      status = HttpStatus.FORBIDDEN;
      error = {
        code: 'DEVICE_BLOCKED',
        message: 'This device is blocked from registration.',
      };
    } else if (exception instanceof DeviceRevokedError) {
      status = HttpStatus.FORBIDDEN;
      error = {
        code: 'DEVICE_REVOKED',
        message: 'This device registration has been revoked.',
      };
    } else if (exception instanceof IdentityDataAccessError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Identity data is temporarily unavailable.',
      };
    } else if (exception instanceof ComplaintNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      error = {
        code:
          exception.resource === 'complaint'
            ? 'COMPLAINT_NOT_FOUND'
            : `COMPLAINT_${exception.resource.toUpperCase()}_NOT_FOUND`,
        message: 'The requested complaint resource was not found.',
      };
    } else if (exception instanceof ComplaintConflictError) {
      status = HttpStatus.CONFLICT;
      error = {
        code: exception.marker,
        message: 'The complaint request conflicts with its current state or prior request.',
      };
    } else if (
      exception instanceof ComplaintDataAccessError ||
      exception instanceof ComplaintMediaGatewayError
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Complaint data or private media storage is temporarily unavailable.',
      };
    } else if (exception instanceof RoutingDecisionIdempotencyConflictError) {
      status = HttpStatus.CONFLICT;
      error = {
        code: 'ROUTING_IDEMPOTENCY_CONFLICT',
        message: 'This request identifier was already used for a different routing decision.',
      };
    } else if (exception instanceof RoutingDataAccessError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Routing data is temporarily unavailable.',
      };
    } else if (exception instanceof RoutingConfigurationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = {
        code: 'ROUTING_CONFIGURATION_UNAVAILABLE',
        message: 'A verified routing configuration is unavailable.',
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = {
        code: statusCodeToErrorCode(status),
        message: safeHttpMessage(status),
      };
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Request ${requestId} failed with ${error.code} (${request.method} ${request.originalUrl ?? request.url ?? ''}).`,
      );
    }

    const body: ApiErrorResponse = {
      error,
      meta: { requestId },
    };

    response.status(status).json(body);
  }
}
