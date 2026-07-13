import type { AuthenticatedUser } from '@local-wellness/types';

export interface RequestContext {
  authenticatedUser?: AuthenticatedUser;
  headers: Record<string, string | string[] | undefined>;
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
