import type { AuthenticatedUser } from '@local-wellness/types';

export interface RequestContext {
  authenticatedUser?: AuthenticatedUser;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  method: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
}

export interface ResponseContext {
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  status(statusCode: number): ResponseContext;
}

export type NextFunction = () => void;
