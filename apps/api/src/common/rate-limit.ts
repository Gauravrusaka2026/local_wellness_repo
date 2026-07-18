import { createHash } from 'node:crypto';

import {
  Inject,
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';

import { RateLimitStore } from '../data/rate-limit.store.js';
import { ApiException } from './api-exception.js';
import { Clock } from './clock.js';
import type { RequestContext, ResponseContext } from './request-context.js';

export type RateLimitPolicy = Readonly<{
  limit: number;
  scope: string;
  subject: 'authenticated_user' | 'client_address';
  windowSeconds: number;
}>;

const RATE_LIMIT_POLICY = Symbol('RATE_LIMIT_POLICY');

export const RateLimit = (policy: RateLimitPolicy): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_POLICY, policy);

export const rateLimitPolicies = {
  authAuditAppend: {
    limit: 30,
    scope: 'auth_audit_append',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  complaintSubmission: {
    limit: 10,
    scope: 'complaint_submission',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  communityEngagementMutation: {
    limit: 60,
    scope: 'community_engagement_mutation',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  communityEngagementRead: {
    limit: 120,
    scope: 'community_engagement_read',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  deviceMutation: {
    limit: 20,
    scope: 'device_mutation',
    subject: 'authenticated_user',
    windowSeconds: 3_600,
  },
  governmentInvitation: {
    limit: 10,
    scope: 'government_invitation',
    subject: 'authenticated_user',
    windowSeconds: 3_600,
  },
  mediaMutation: {
    limit: 60,
    scope: 'media_mutation',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  privateMessage: {
    limit: 30,
    scope: 'private_message',
    subject: 'authenticated_user',
    windowSeconds: 60,
  },
  publicTransparencyRead: {
    limit: 120,
    scope: 'public_transparency_read',
    subject: 'client_address',
    windowSeconds: 60,
  },
} as const satisfies Readonly<Record<string, RateLimitPolicy>>;

const defaultMutationPolicy: RateLimitPolicy = {
  limit: 120,
  scope: 'authenticated_mutation',
  subject: 'authenticated_user',
  windowSeconds: 60,
};

const mutationMethods = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

const hashSubject = (subjectType: RateLimitPolicy['subject'], value: string): string =>
  createHash('sha256').update(`local-wellness:${subjectType}:${value}`).digest('hex');

const getSubject = (request: RequestContext, policy: RateLimitPolicy): string => {
  if (policy.subject === 'authenticated_user') {
    if (!request.authenticatedUser) {
      throw ApiException.authenticationRequired();
    }

    return request.authenticatedUser.id;
  }

  const clientAddress = request.ip?.trim();
  if (!clientAddress) {
    throw ApiException.dependencyUnavailable('The request quota could not be evaluated.');
  }

  return clientAddress;
};

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  public constructor(
    @Inject(RateLimitStore) private readonly store: RateLimitStore,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const response = context.switchToHttp().getResponse<ResponseContext>();
    const explicitPolicy = this.reflector.getAllAndOverride<RateLimitPolicy>(RATE_LIMIT_POLICY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const policy =
      explicitPolicy ?? (mutationMethods.has(request.method) ? defaultMutationPolicy : null);

    if (!policy) {
      return next.handle();
    }

    const subject = getSubject(request, policy);
    const consumption = await this.store.consume({
      limit: policy.limit,
      scope: policy.scope,
      subjectSha256: hashSubject(policy.subject, subject),
      windowSeconds: policy.windowSeconds,
    });

    response.setHeader('RateLimit-Limit', String(consumption.limit));
    response.setHeader('RateLimit-Remaining', String(consumption.remaining));
    response.setHeader(
      'RateLimit-Reset',
      String(Math.ceil(Date.parse(consumption.resetAt) / 1_000)),
    );

    if (!consumption.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((Date.parse(consumption.resetAt) - this.clock.now().getTime()) / 1_000),
      );
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw ApiException.rateLimited();
    }

    return next.handle();
  }
}
