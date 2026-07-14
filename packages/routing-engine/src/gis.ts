import type { GeoPoint, JurisdictionResolution } from '@local-wellness/types';

export interface JurisdictionResolutionQuery {
  location: GeoPoint;
  accuracyMeters: number;
  resolvedAt: string;
}

export interface JurisdictionResolver {
  resolveJurisdiction(query: JurisdictionResolutionQuery): Promise<JurisdictionResolution>;
}
