export type RateLimitConsumption = Readonly<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}>;

export type ConsumeRateLimitInput = Readonly<{
  limit: number;
  scope: string;
  subjectSha256: string;
  windowSeconds: number;
}>;

export class RateLimitDataAccessError extends Error {
  public constructor() {
    super('The API quota dependency is unavailable.');
    this.name = 'RateLimitDataAccessError';
  }
}

export abstract class RateLimitStore {
  public abstract consume(input: ConsumeRateLimitInput): Promise<RateLimitConsumption>;
}
