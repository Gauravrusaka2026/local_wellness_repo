export const governingBodyResolutionStatuses = [
  'resolved',
  'ambiguous',
  'unsupported',
  'low_accuracy',
] as const;

export type GoverningBodyResolutionStatus = (typeof governingBodyResolutionStatuses)[number];

export const verifiedGovernanceEntityKinds = [
  'state',
  'district',
  'taluka',
  'authority',
  'local_body',
  'ward',
] as const;

export type VerifiedGovernanceEntityKind = (typeof verifiedGovernanceEntityKinds)[number];

export const maximumGoverningBodyAccuracyMeters = 100;

export interface VerifiedGovernanceEntitySummary {
  kind: VerifiedGovernanceEntityKind;
  name: string;
  type: string;
  verificationStatus: 'verified';
  lastVerifiedOn: string;
  sourceUrl: string;
}

export interface VerifiedCivicAreaOffice {
  name: string;
  type: string;
  address?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  lastVerifiedOn: string;
  sourceUrl: string;
}

export interface VerifiedGoverningBodyMatch {
  state: VerifiedGovernanceEntitySummary;
  district: VerifiedGovernanceEntitySummary | null;
  taluka: VerifiedGovernanceEntitySummary | null;
  authority: VerifiedGovernanceEntitySummary;
  localBody: VerifiedGovernanceEntitySummary;
  ward: VerifiedGovernanceEntitySummary | null;
  /**
   * Older API/database deployments omit this field. Consumers must treat an
   * absent value as an empty directory until both sides are upgraded.
   */
  offices?: VerifiedCivicAreaOffice[] | undefined;
}

export interface GoverningBodyResolution {
  status: GoverningBodyResolutionStatus;
  reason: string;
  maximumAccuracyMeters: typeof maximumGoverningBodyAccuracyMeters;
  matches: VerifiedGoverningBodyMatch[];
}
