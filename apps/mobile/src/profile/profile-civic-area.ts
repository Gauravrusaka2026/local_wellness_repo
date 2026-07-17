import type { GoverningBodyResolution } from '@local-wellness/types';

export type ProfileCivicArea =
  | Readonly<{
      authorityName: string;
      lastVerifiedOn: string;
      localBodyName: string;
      sourceUrl: string;
      status: 'resolved';
      wardName: string | null;
    }>
  | Readonly<{
      maximumAccuracyMeters: number;
      status: 'ambiguous' | 'low_accuracy' | 'unsupported';
    }>;

export const createProfileCivicArea = (resolution: GoverningBodyResolution): ProfileCivicArea => {
  if (resolution.status !== 'resolved') {
    return {
      maximumAccuracyMeters: resolution.maximumAccuracyMeters,
      status: resolution.status,
    };
  }

  const match = resolution.matches[0];
  if (!match) {
    return {
      maximumAccuracyMeters: resolution.maximumAccuracyMeters,
      status: 'unsupported',
    };
  }

  return {
    authorityName: match.authority.name,
    lastVerifiedOn: match.localBody.lastVerifiedOn,
    localBodyName: match.localBody.name,
    sourceUrl: match.localBody.sourceUrl,
    status: 'resolved',
    wardName: match.ward?.name ?? null,
  };
};
