import type { VerifiedGoverningBodyMatch } from '@local-wellness/types';

export interface GoverningBodyDirectoryQuery {
  location: Readonly<{
    latitude: number;
    longitude: number;
  }>;
  accuracyMeters: number;
  resolvedAt: string;
}

export class GovernanceDirectoryDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Governance-directory persistence operation failed: ${operation}.`);
    this.name = 'GovernanceDirectoryDataAccessError';
  }
}

export abstract class GovernanceDirectoryStore {
  public abstract resolveVerifiedGoverningBodies(
    query: GoverningBodyDirectoryQuery,
  ): Promise<VerifiedGoverningBodyMatch[]>;
}
