import { HttpException, HttpStatus } from '@nestjs/common';
import type { JsonObject } from '@local-wellness/types';

export class ApiException extends HttpException {
  public constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly details?: JsonObject,
  ) {
    super(message, status);
  }

  public static authenticationRequired(
    message = 'A valid bearer token is required.',
  ): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'AUTH_REQUIRED', message);
  }

  public static accessDenied(message = 'You do not have access to this resource.'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, 'ACCESS_DENIED', message);
  }

  public static notFound(code: string, message: string): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, code, message);
  }

  public static conflict(code: string, message: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, code, message);
  }

  public static dependencyUnavailable(message: string): ApiException {
    return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, 'DEPENDENCY_UNAVAILABLE', message);
  }
}
