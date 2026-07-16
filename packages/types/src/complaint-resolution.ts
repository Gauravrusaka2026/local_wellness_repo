import type {
  ComplaintLocationCapture,
  ComplaintLocationProvider,
  ComplaintMediaKind,
  ComplaintMediaMimeType,
  ComplaintStatus,
} from './complaints.js';

export const complaintResolutionOutcomes = [
  'resolved',
  'partially_resolved',
  'not_resolved',
  'temporary_fix',
  'wrong_location',
] as const;
export type ComplaintResolutionOutcome = (typeof complaintResolutionOutcomes)[number];

export const complaintEvidenceRoles = ['before', 'after', 'reopen'] as const;
export type ComplaintEvidenceRole = (typeof complaintEvidenceRoles)[number];

export const complaintReopenEvidenceUploadStatuses = [
  'reserved',
  'finalized',
  'failed',
  'expired',
] as const;
export type ComplaintReopenEvidenceUploadStatus =
  (typeof complaintReopenEvidenceUploadStatuses)[number];

export interface ComplaintResolutionRatings {
  satisfaction: number;
  speed: number;
  quality: number;
  communication: number;
}

export interface ComplaintResolutionFeedbackInput {
  expectedWorkflowVersion: number;
  resolutionId: string;
  outcome: ComplaintResolutionOutcome;
  ratings?: ComplaintResolutionRatings | undefined;
  comment?: string | undefined;
}

export interface ReopenComplaintInput {
  expectedWorkflowVersion: number;
  resolutionId: string;
  reasonCode: string;
  explanation: string;
  evidenceIds: string[];
}

export interface CreateComplaintReopenEvidenceUploadIntentInput {
  expectedWorkflowVersion: number;
  kind: 'photo' | 'video';
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  sha256: string;
  capturedAt: string;
  widthPixels?: number | undefined;
  heightPixels?: number | undefined;
  durationMilliseconds?: number | undefined;
  captureLocation: ComplaintLocationCapture;
}

export interface FinalizeComplaintReopenEvidenceInput {
  expectedWorkflowVersion: number;
  byteSize: number;
  sha256: string;
}

export interface ComplaintResolutionLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  provider: ComplaintLocationProvider;
  capturedAt: string;
}

export interface ComplaintAccountabilityEvidence {
  id: string;
  role: ComplaintEvidenceRole;
  kind: ComplaintMediaKind;
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  capturedAt: string | null;
  createdAt: string;
}

export interface ComplaintResolutionWorkReference {
  id: string;
  referenceType: string;
  referenceNumber: string;
  description: string | null;
}

export interface ComplaintResolutionRecord {
  id: string;
  version: number;
  publicMessage: string | null;
  completedAt: string | null;
  completionLocation: ComplaintResolutionLocation | null;
  distanceFromComplaintMeters: number | null;
  workReference: ComplaintResolutionWorkReference | null;
  beforeEvidence: ComplaintAccountabilityEvidence[];
  afterEvidence: ComplaintAccountabilityEvidence[];
  reopenEvidence: ComplaintAccountabilityEvidence[];
}

export interface GovernmentComplaintResolutionRecord extends ComplaintResolutionRecord {
  completionNote: string;
}

export interface ComplaintResolutionFeedback {
  id: string;
  resolutionId: string;
  outcome: ComplaintResolutionOutcome;
  ratings: ComplaintResolutionRatings | null;
  comment: string | null;
  submittedAt: string;
}

export interface ComplaintReopenRequest {
  id: string;
  resolutionId: string;
  attemptNumber: number;
  reasonCode: string;
  explanation: string;
  evidenceIds: string[];
  resultingStatus: Extract<ComplaintStatus, 'reopened' | 'escalated'>;
  requestedAt: string;
}

export interface ComplaintEscalationEvent {
  id: string;
  level: number;
  reasonCode: string;
  occurredAt: string;
}

export interface ComplaintResolutionPolicyOption<Code extends string = string> {
  code: Code;
  label: string;
}

export interface ComplaintResolutionPolicy {
  id: string;
  version: number;
  outcomeOptions: ComplaintResolutionPolicyOption<ComplaintResolutionOutcome>[];
  reopenReasonOptions: ComplaintResolutionPolicyOption[];
  ratingMinimum: number;
  ratingMaximum: number;
  ratingsRequired: boolean;
  ratingLabels: {
    satisfaction: string;
    speed: string;
    quality: string;
    communication: string;
  };
  reopenDeadline: string | null;
  reopenAttemptsRemaining: number;
  reopenEvidenceRequired: boolean;
  feedbackAllowed: boolean;
  reopenAllowed: boolean;
  reopenEvidenceUploadAllowed: boolean;
  unavailableReason: string | null;
}

export interface ComplaintResolutionContext {
  complaintId: string;
  workflowVersion: number;
  status: ComplaintStatus;
  latestResolution: ComplaintResolutionRecord | null;
  policy: ComplaintResolutionPolicy | null;
  policyUnavailableReason: string | null;
  availableReopenEvidence: ComplaintReopenEvidence[];
  feedback: ComplaintResolutionFeedback[];
  reopenRequests: ComplaintReopenRequest[];
  escalations: ComplaintEscalationEvent[];
}

export interface ComplaintResolutionFeedbackResult {
  complaintId: string;
  status: ComplaintStatus;
  workflowVersion: number;
  updatedAt: string;
  feedback: ComplaintResolutionFeedback;
}

export interface ReopenComplaintResult {
  complaintId: string;
  status: Extract<ComplaintStatus, 'reopened' | 'escalated'>;
  workflowVersion: number;
  updatedAt: string;
  reopenRequest: ComplaintReopenRequest;
  escalation: ComplaintEscalationEvent | null;
}

export interface ComplaintReopenEvidence {
  id: string;
  kind: 'photo' | 'video';
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  uploadStatus: ComplaintReopenEvidenceUploadStatus;
  capturedAt: string;
  captureLocation: ComplaintResolutionLocation;
  finalizedAt: string | null;
  createdAt: string;
}

export interface ComplaintReopenEvidenceUploadTarget {
  bucket: string;
  objectPath: string;
  token: string;
}

export interface ComplaintReopenEvidenceUploadIntent {
  evidence: ComplaintReopenEvidence;
  upload: ComplaintReopenEvidenceUploadTarget;
  expiresAt: string;
  workflowVersion: number;
}

export interface ComplaintReopenEvidenceFinalization {
  evidence: ComplaintReopenEvidence;
  workflowVersion: number;
}

export interface ComplaintEvidenceAccess {
  evidenceId: string;
  role: ComplaintEvidenceRole;
  signedUrl: string;
  expiresAt: string;
}

export interface GovernmentComplaintAccountability {
  complaintId: string;
  workflowVersion: number;
  resolutionHistory: GovernmentComplaintResolutionRecord[];
  feedback: ComplaintResolutionFeedback[];
  reopenRequests: ComplaintReopenRequest[];
  escalations: ComplaintEscalationEvent[];
}
