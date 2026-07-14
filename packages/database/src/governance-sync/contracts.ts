export type GovernanceSyncJson =
  boolean | number | string | null | GovernanceSyncJson[] | { [key: string]: GovernanceSyncJson };

export const governanceSyncSourceKinds = [
  'repository_bootstrap',
  'official_api',
  'official_file',
  'official_web',
] as const;

export type GovernanceSyncSourceKind = (typeof governanceSyncSourceKinds)[number];

export const governanceSyncRetrievalMethods = ['http_get', 'api', 'manual_upload'] as const;
export type GovernanceSyncRetrievalMethod = (typeof governanceSyncRetrievalMethods)[number];

export const governanceSyncFormats = [
  'csv',
  'geojson',
  'html',
  'json',
  'pdf',
  'text',
  'xlsx',
] as const;

export type GovernanceSyncFormat = (typeof governanceSyncFormats)[number];

export const governanceSyncDatasetKinds = [
  'bootstrap_bundle',
  'authority',
  'state',
  'district',
  'taluka',
  'local_body',
  'ward',
  'department',
  'office',
  'officer_role',
  'officer',
  'officer_assignment',
  'contact',
  'utility',
  'emergency_contact',
  'boundary',
  'routing_reference',
] as const;

export type GovernanceSyncDatasetKind = (typeof governanceSyncDatasetKinds)[number];

export const governanceSyncSourceStatuses = ['draft', 'active', 'paused', 'retired'] as const;
export type GovernanceSyncSourceStatus = (typeof governanceSyncSourceStatuses)[number];

export interface GovernanceSyncSource {
  id: string;
  key: string;
  referenceSourceId: string | null;
  importBatchId: string | null;
  authorityId: string | null;
  sourceKind: GovernanceSyncSourceKind;
  datasetKind: GovernanceSyncDatasetKind;
  retrievalMethod: GovernanceSyncRetrievalMethod;
  format: GovernanceSyncFormat;
  endpointUrl: string | null;
  repositoryPath: string | null;
  parserKey: string;
  parserContractVersion: string;
  expectedMediaTypes: readonly string[];
  allowedHosts: readonly string[];
  maxResponseBytes: number;
  fetchTimeoutSeconds: number;
  status: GovernanceSyncSourceStatus;
  refreshIntervalMinutes: number | null;
  nextRetrievalAt: string | null;
  sourceContractSha256: string;
  approvedContractSha256: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  secretReference: string | null;
}

export interface GovernanceSyncSourceRegistryPort {
  getById(sourceId: string): Promise<GovernanceSyncSource | null>;
  listDue(asOf: string, limit: number): Promise<GovernanceSyncSource[]>;
}

export interface GovernanceRetrievalRequest {
  runId: string;
  source: GovernanceSyncSource;
  requestedAt: string;
}

export interface GovernanceRetrievalResponseMetadata {
  contentType: string;
  etag: string | null;
  lastModified: string | null;
  statusCode: number;
  retrievedAt: string;
}

export interface GovernanceRetrievedResource {
  bytes: Uint8Array;
  metadata: GovernanceRetrievalResponseMetadata;
}

/**
 * Implementations are source-specific adapters. This package intentionally provides no network
 * connector or scraper.
 */
export interface GovernanceRetrieverPort {
  retrieve(request: GovernanceRetrievalRequest): Promise<GovernanceRetrievedResource>;
}

export interface GovernanceSnapshotPreservationRequest {
  runId: string;
  sourceId: string;
  bytes: Uint8Array;
  metadata: GovernanceRetrievalResponseMetadata;
}

export interface GovernanceSnapshotReference {
  id: string;
  runId: string;
  sourceId: string;
  storageBucket: string;
  storageObjectPath: string;
  contentSha256: string;
  byteLength: number;
  contentType: string;
  etag: string | null;
  lastModified: string | null;
  retrievedAt: string;
}

/** Raw snapshot implementations must use immutable object paths and verify the returned digest. */
export interface GovernanceSnapshotStorePort {
  preserve(request: GovernanceSnapshotPreservationRequest): Promise<GovernanceSnapshotReference>;
  findBySourceAndDigest(
    sourceId: string,
    contentSha256: string,
  ): Promise<GovernanceSnapshotReference | null>;
}

export const governanceSyncEntityTypes = [
  'authority',
  'state',
  'district',
  'taluka',
  'local_body',
  'ward',
  'department',
  'office',
  'officer_role',
  'officer',
  'officer_assignment',
  'contact',
  'utility',
  'emergency_contact',
  'jurisdiction_boundary',
  'routing_reference',
] as const;

export type GovernanceSyncEntityType = (typeof governanceSyncEntityTypes)[number];

export const governanceSyncValidationSeverities = ['information', 'warning', 'error'] as const;
export type GovernanceSyncValidationSeverity = (typeof governanceSyncValidationSeverities)[number];

export interface GovernanceSyncValidationIssue {
  code: string;
  severity: GovernanceSyncValidationSeverity;
  message: string;
  field: string | null;
}

export interface GovernanceNormalizedCandidate {
  id: string;
  runId: string;
  snapshotId: string;
  sourceEntityKey: string;
  sourceRecordLocator: string;
  entityType: GovernanceSyncEntityType;
  normalizedPayload: GovernanceSyncJson;
  isPlaceholder: boolean;
  claimedVerificationStatus: string | null;
  claimedLastVerifiedOn: string | null;
  validationIssues: GovernanceSyncValidationIssue[];
}

export interface GovernanceNormalizationRequest {
  source: GovernanceSyncSource;
  snapshot: GovernanceSnapshotReference;
}

export interface GovernanceNormalizationResult {
  parserContractVersion: string;
  candidates: GovernanceNormalizedCandidate[];
  runIssues: GovernanceSyncValidationIssue[];
}

export interface GovernanceNormalizerPort {
  normalize(request: GovernanceNormalizationRequest): Promise<GovernanceNormalizationResult>;
}

export const governanceContactChannelTypes = [
  'address',
  'contact_directory',
  'email',
  'helpline',
  'phone',
  'website',
] as const;

export type GovernanceContactChannelType = (typeof governanceContactChannelTypes)[number];

export const governanceContactOwnerEntityTypes = [
  'authority',
  'local_body',
  'ward',
  'department',
  'office',
  'officer_role',
  'officer',
  'officer_assignment',
  'utility',
  'emergency_contact',
] as const;

export type GovernanceContactOwnerEntityType = (typeof governanceContactOwnerEntityTypes)[number];

/**
 * Parser adapters emit this deliberately loose shape. The normalizer validates every value before
 * a record may enter the review queue.
 */
export interface GovernanceExtractedContactRecord {
  ownerEntityType: unknown;
  ownerSourceEntityKey: unknown;
  channelType: unknown;
  purpose: unknown;
  extractedValue: unknown;
  sourceRecordLocator: unknown;
  recordSpecificSourceUrl: unknown;
  claimedVerificationStatus: unknown;
}

export interface GovernanceContactExtractionExpectations {
  minimumRecords: number;
  maximumRecords: number | null;
  expectedLayoutFingerprint: string | null;
  observedLayoutFingerprint: string | null;
}

export type GovernanceContactSourceTrust = 'official' | 'unverified';

export interface GovernanceContactNormalizationRequest {
  records: readonly GovernanceExtractedContactRecord[];
  sourceTrust: GovernanceContactSourceTrust;
  sourceContractApproved: boolean;
  registeredSourceUrl: unknown;
  approvedSourceHosts: readonly string[];
  expectations: GovernanceContactExtractionExpectations;
}

/** A pure normalizer can stage evidence, but it cannot manually verify or publish it. */
export type GovernanceContactNormalizerVerificationStatus =
  'placeholder' | 'source_verified' | 'unverified';

export interface GovernanceNormalizedContactCandidate {
  ownerEntityType: GovernanceContactOwnerEntityType | null;
  ownerSourceEntityKey: string | null;
  channelType: GovernanceContactChannelType | null;
  purpose: string | null;
  extractedValue: string | null;
  normalizedValue: string | null;
  sourceRecordLocator: string | null;
  sourceUrl: string | null;
  claimedVerificationStatus: string | null;
  verificationStatus: GovernanceContactNormalizerVerificationStatus;
  status: 'staged';
  isPlaceholder: boolean;
  deduplicationKey: string | null;
  reviewRequired: true;
  eligibleForAutomaticPublication: false;
  eligibleForComplaintDelivery: false;
  validationIssues: GovernanceSyncValidationIssue[];
}

export interface GovernanceContactNormalizationResult {
  candidates: GovernanceNormalizedContactCandidate[];
  runIssues: GovernanceSyncValidationIssue[];
}

export const governanceEntityMatchStatuses = [
  'matched',
  'new_entity',
  'ambiguous',
  'unmatched',
] as const;

export type GovernanceEntityMatchStatus = (typeof governanceEntityMatchStatuses)[number];

export const governanceEntityMatchMethods = [
  'official_identifier',
  'reviewed_crosswalk',
  'scoped_natural_key',
  'reviewer_selected',
  'none',
] as const;

export type GovernanceEntityMatchMethod = (typeof governanceEntityMatchMethods)[number];

export interface GovernanceEntityMatch {
  candidateId: string;
  status: GovernanceEntityMatchStatus;
  method: GovernanceEntityMatchMethod;
  targetRecordId: string | null;
  alternativeTargetRecordIds: string[];
  confidence: number;
  evidence: GovernanceSyncJson;
}

export interface GovernanceEntityMatchingRequest {
  source: GovernanceSyncSource;
  candidates: GovernanceNormalizedCandidate[];
}

export interface GovernanceEntityMatcherPort {
  match(request: GovernanceEntityMatchingRequest): Promise<GovernanceEntityMatch[]>;
}

export const governanceChangeOperations = [
  'create',
  'update',
  'append_version',
  'close_version',
  'deactivate',
  'quarantine',
  'reference_only',
  'no_change',
] as const;

export type GovernanceChangeOperation = (typeof governanceChangeOperations)[number];

export const governancePublicationDispositions = [
  'normalized',
  'quarantined',
  'reference_only',
] as const;

export type GovernancePublicationDisposition = (typeof governancePublicationDispositions)[number];

export interface GovernanceChangeProposal {
  id: string;
  changeSetId: string;
  candidate: GovernanceNormalizedCandidate;
  match: GovernanceEntityMatch;
  operation: GovernanceChangeOperation;
  disposition: GovernancePublicationDisposition;
  currentRecord: GovernanceSyncJson | null;
  proposedRecord: GovernanceSyncJson | null;
  requestedVerificationStatus: 'verified' | 'partially_verified' | 'unverified' | 'placeholder';
  requestedRoutingEligibility: boolean;
  reviewRequired: true;
}

export interface GovernanceChangeDetectionRequest {
  runId: string;
  candidates: GovernanceNormalizedCandidate[];
  matches: GovernanceEntityMatch[];
}

export interface GovernanceChangeSet {
  id: string;
  runId: string;
  proposals: GovernanceChangeProposal[];
  createdAt: string;
}

export interface GovernanceChangeDetectorPort {
  detect(request: GovernanceChangeDetectionRequest): Promise<GovernanceChangeSet>;
}

export const governanceReviewStatuses = [
  'pending',
  'approved',
  'rejected',
  'needs_information',
] as const;

export type GovernanceReviewStatus = (typeof governanceReviewStatuses)[number];

export const governanceVerificationDecisions = [
  'retain_unverified',
  'mark_verified',
  'mark_partially_verified',
  'mark_placeholder',
] as const;

export type GovernanceVerificationDecision = (typeof governanceVerificationDecisions)[number];

export const governanceRoutingEligibilityDecisions = ['retain_disabled', 'enable'] as const;
export type GovernanceRoutingEligibilityDecision =
  (typeof governanceRoutingEligibilityDecisions)[number];

export interface GovernanceReviewDecision {
  id: string;
  changeProposalId: string;
  status: GovernanceReviewStatus;
  reviewerId: string;
  reviewedAt: string;
  notes: string;
  verificationDecision: GovernanceVerificationDecision;
  routingEligibilityDecision: GovernanceRoutingEligibilityDecision;
}

export interface GovernanceReviewQueuePort {
  enqueue(changeSet: GovernanceChangeSet): Promise<void>;
  recordDecision(decision: GovernanceReviewDecision): Promise<void>;
  getLatestDecision(changeProposalId: string): Promise<GovernanceReviewDecision | null>;
}

export interface GovernancePublicationRequest {
  runId: string;
  changeSetId: string;
  idempotencyKey: string;
  proposals: GovernanceChangeProposal[];
  reviews: GovernanceReviewDecision[];
}

export interface GovernancePublicationResult {
  publicationId: string;
  importBatchId: string;
  appliedProposalIds: string[];
  quarantinedProposalIds: string[];
  publishedAt: string;
}

/** Publication adapters apply one approved change set transactionally and append history. */
export interface GovernancePublisherPort {
  publish(request: GovernancePublicationRequest): Promise<GovernancePublicationResult>;
}
