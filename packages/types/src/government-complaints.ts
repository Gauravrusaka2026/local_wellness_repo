import type {
  ComplaintLocationProvider,
  ComplaintLocationVerificationStatus,
  ComplaintMediaKind,
  ComplaintMediaMimeType,
  ComplaintStatus,
} from './complaints.js';
import type { RoutingDecisionStatus } from './routing.js';

export const governmentComplaintQueues = [
  'new',
  'unassigned',
  'assigned',
  'reopened',
  'transferred',
  'awaiting_citizen_verification',
] as const;
export type GovernmentComplaintQueue = (typeof governmentComplaintQueues)[number];

export const governmentComplaintAllowedActions = [
  'acknowledge',
  'assign',
  'transfer',
  'update_status',
  'add_internal_note',
  'schedule_inspection',
  'complete_inspection',
  'add_work_reference',
  'add_external_dependency',
  'resolve_external_dependency',
  'upload_resolution_evidence',
  'submit_resolution',
] as const;
export type GovernmentComplaintAllowedAction = (typeof governmentComplaintAllowedActions)[number];

export const governmentComplaintAssignmentReasons = [
  'initial_assignment',
  'workload_balance',
  'officer_unavailable',
  'specialist_required',
  'routing_correction',
] as const;
export type GovernmentComplaintAssignmentReason =
  (typeof governmentComplaintAssignmentReasons)[number];

export const governmentComplaintTransferReasons = [
  'incorrect_department',
  'specialist_required',
  'routing_correction',
  'operational_transfer',
] as const;
export type GovernmentComplaintTransferReason = (typeof governmentComplaintTransferReasons)[number];

export const governmentInspectionOutcomes = [
  'confirmed',
  'not_found',
  'partially_confirmed',
  'access_blocked',
  'external_dependency',
] as const;
export type GovernmentInspectionOutcome = (typeof governmentInspectionOutcomes)[number];

export const governmentExternalDependencyTypes = [
  'material',
  'external_agency',
  'permit',
  'utility',
  'other',
] as const;
export type GovernmentExternalDependencyType = (typeof governmentExternalDependencyTypes)[number];

export const governmentResolutionEvidenceKinds = ['photo', 'video'] as const;
export type GovernmentResolutionEvidenceKind = (typeof governmentResolutionEvidenceKinds)[number];

export const governmentResolutionEvidenceUploadStatuses = [
  'reserved',
  'finalized',
  'failed',
  'expired',
] as const;
export type GovernmentResolutionEvidenceUploadStatus =
  (typeof governmentResolutionEvidenceUploadStatuses)[number];

export interface GovernmentComplaintQueueQuery {
  cursor?: string | undefined;
  limit: number;
  scopeRoleAssignmentId?: string | undefined;
  queue?: GovernmentComplaintQueue | undefined;
  statuses?: ComplaintStatus[] | undefined;
  categoryId?: string | undefined;
  wardId?: string | undefined;
  authorityDepartmentId?: string | undefined;
  officerAssignmentId?: string | undefined;
  submittedFrom?: string | undefined;
  submittedTo?: string | undefined;
  search?: string | undefined;
}

export interface GovernmentComplaintScopeQuery {
  scopeRoleAssignmentId?: string | undefined;
}

export interface GovernmentComplaintAssignmentSummary {
  id: string;
  authorityId: string;
  authorityName: string;
  localBodyId: string;
  localBodyName: string;
  wardId: string | null;
  wardName: string | null;
  departmentId: string;
  departmentName: string;
  authorityDepartmentId: string;
  officerRoleId: string;
  officerRoleName: string;
  officerAssignmentId: string | null;
  officerName: string | null;
  source: 'routing_decision' | 'manual_assignment' | 'transfer';
  status: 'active' | 'superseded' | 'cancelled';
  assignedAt: string;
  endedAt: string | null;
}

export interface GovernmentComplaintQueueFlags {
  isUnassigned: boolean;
  isReopened: boolean;
  isTransferred: boolean;
  isAwaitingCitizenVerification: boolean;
}

export interface GovernmentComplaintQueueItem {
  id: string;
  complaintNumber: string;
  categoryId: string;
  categoryName: string;
  status: ComplaintStatus;
  submittedAt: string;
  updatedAt: string;
  workflowVersion: number;
  currentAssignment: GovernmentComplaintAssignmentSummary;
  flags: GovernmentComplaintQueueFlags;
}

export interface GovernmentComplaintQueueResult {
  items: GovernmentComplaintQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GovernmentComplaintExactLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  provider: ComplaintLocationProvider;
  capturedAt: string;
  verificationStatus: ComplaintLocationVerificationStatus;
  verificationScore: number | null;
}

export interface GovernmentComplaintMediaSummary {
  id: string;
  kind: ComplaintMediaKind;
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  capturedAt: string | null;
  widthPixels: number | null;
  heightPixels: number | null;
  durationMilliseconds: number | null;
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
  moderationStatus: 'pending' | 'review_required' | 'approved' | 'rejected';
}

export interface GovernmentComplaintRoutingSummary {
  decisionStatus: RoutingDecisionStatus;
  confidenceScore: number;
  explanationCode: string | null;
  fallbackUsed: boolean;
  fallbackDepth: number;
  resolvedAt: string;
}

export interface GovernmentComplaintStatusEntry {
  id: string;
  sequence: number;
  fromStatus: ComplaintStatus | 'draft' | null;
  toStatus: ComplaintStatus;
  reasonCode: string;
  publicMessage: string | null;
  occurredAt: string;
}

export interface GovernmentComplaintInternalNote {
  id: string;
  body: string;
  authorDisplayName: string | null;
  createdAt: string;
}

export interface GovernmentComplaintInspection {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledFor: string;
  instructions: string | null;
  outcome: GovernmentInspectionOutcome | null;
  summary: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface GovernmentComplaintWorkReference {
  id: string;
  referenceType: string;
  referenceNumber: string;
  description: string | null;
  createdAt: string;
}

export interface GovernmentComplaintExternalDependency {
  id: string;
  dependencyType: GovernmentExternalDependencyType;
  description: string;
  expectedBy: string | null;
  status: 'active' | 'resolved' | 'cancelled';
  resolutionSummary: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface GovernmentResolutionEvidence {
  id: string;
  availableForResolution: boolean;
  kind: GovernmentResolutionEvidenceKind;
  mimeType: string;
  byteSize: number;
  uploadStatus: GovernmentResolutionEvidenceUploadStatus;
  capturedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
}

export interface GovernmentComplaintDetail extends GovernmentComplaintQueueItem {
  description: string;
  location: GovernmentComplaintExactLocation;
  routingSummary: GovernmentComplaintRoutingSummary;
  media: GovernmentComplaintMediaSummary[];
  assignmentHistory: GovernmentComplaintAssignmentSummary[];
  timeline: GovernmentComplaintStatusEntry[];
  internalNotes: GovernmentComplaintInternalNote[];
  inspections: GovernmentComplaintInspection[];
  workReferences: GovernmentComplaintWorkReference[];
  externalDependencies: GovernmentComplaintExternalDependency[];
  resolutionEvidence: GovernmentResolutionEvidence[];
  allowedActions: GovernmentComplaintAllowedAction[];
  allowedStatusTransitions: ComplaintStatus[];
}

export interface GovernmentComplaintAssignmentOption {
  allowedActions: ('assign' | 'transfer')[];
  officerAssignmentId: string;
  authorityDepartmentId: string;
  departmentId: string;
  departmentName: string;
  wardId: string | null;
  wardName: string | null;
  officerRoleId: string;
  officerRoleName: string;
  officerName: string;
}

export interface GovernmentComplaintAssignmentOptions {
  complaintId: string;
  workflowVersion: number;
  options: GovernmentComplaintAssignmentOption[];
}

export interface GovernmentComplaintMutationInput {
  expectedWorkflowVersion: number;
}

export interface AcknowledgeGovernmentComplaintInput extends GovernmentComplaintMutationInput {
  publicMessage?: string | undefined;
}

export interface AssignGovernmentComplaintInput extends GovernmentComplaintMutationInput {
  officerAssignmentId: string;
  reason: GovernmentComplaintAssignmentReason;
  note?: string | undefined;
}

export interface TransferGovernmentComplaintInput extends GovernmentComplaintMutationInput {
  officerAssignmentId: string;
  reason: GovernmentComplaintTransferReason;
  note?: string | undefined;
}

export interface UpdateGovernmentComplaintStatusInput extends GovernmentComplaintMutationInput {
  status: ComplaintStatus;
  publicMessage?: string | undefined;
}

export interface AddGovernmentComplaintInternalNoteInput extends GovernmentComplaintMutationInput {
  body: string;
}

export interface ScheduleGovernmentComplaintInspectionInput extends GovernmentComplaintMutationInput {
  scheduledFor: string;
  instructions?: string | undefined;
}

export interface CompleteGovernmentComplaintInspectionInput extends GovernmentComplaintMutationInput {
  outcome: GovernmentInspectionOutcome;
  summary: string;
}

export interface AddGovernmentComplaintWorkReferenceInput extends GovernmentComplaintMutationInput {
  referenceType: string;
  referenceNumber: string;
  description?: string | undefined;
}

export interface AddGovernmentComplaintExternalDependencyInput extends GovernmentComplaintMutationInput {
  dependencyType: GovernmentExternalDependencyType;
  description: string;
  expectedBy?: string | undefined;
}

export interface ResolveGovernmentComplaintExternalDependencyInput extends GovernmentComplaintMutationInput {
  resolutionSummary?: string | undefined;
}

export interface CreateGovernmentResolutionEvidenceUploadIntentInput extends GovernmentComplaintMutationInput {
  kind: GovernmentResolutionEvidenceKind;
  mimeType: string;
  byteSize: number;
  sha256: string;
  capturedAt?: string | undefined;
}

export interface FinalizeGovernmentResolutionEvidenceInput extends GovernmentComplaintMutationInput {
  byteSize: number;
  sha256: string;
}

export interface SubmitGovernmentComplaintResolutionInput extends GovernmentComplaintMutationInput {
  completionNote: string;
  resolutionEvidenceIds: string[];
  publicMessage?: string | undefined;
}

export interface GovernmentComplaintActionResult {
  actionId: string;
  complaintId: string;
  complaintNumber: string;
  status: ComplaintStatus;
  workflowVersion: number;
  updatedAt: string;
  currentAssignment: GovernmentComplaintAssignmentSummary;
}

export interface GovernmentResolutionEvidenceUploadTarget {
  bucket: 'resolution-evidence-private';
  objectPath: string;
  token: string;
}

export interface GovernmentResolutionEvidenceUploadIntent {
  evidence: GovernmentResolutionEvidence;
  upload: GovernmentResolutionEvidenceUploadTarget;
  expiresAt: string;
  workflowVersion: number;
}

export interface GovernmentResolutionEvidenceFinalization {
  evidence: GovernmentResolutionEvidence;
  workflowVersion: number;
}

export interface GovernmentResolutionEvidenceAccess {
  evidenceId: string;
  signedUrl: string;
  expiresAt: string;
}

export const governmentComplaintErrorCodes = [
  'GOVERNMENT_ACCESS_REQUIRED',
  'COMPLAINT_NOT_FOUND',
  'COMPLAINT_INSPECTION_NOT_FOUND',
  'COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND',
  'COMPLAINT_WORKFLOW_VERSION_CONFLICT',
  'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_ACTION_IN_PROGRESS',
  'INVALID_STATUS_TRANSITION',
  'OFFICER_ASSIGNMENT_REQUIRED',
  'OFFICER_ASSIGNMENT_INVALID',
  'RESOLUTION_EVIDENCE_NOT_FOUND',
  'RESOLUTION_EVIDENCE_NOT_READY',
  'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED',
  'RESOLUTION_EVIDENCE_LIMIT_REACHED',
  'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
  'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
] as const;
export type GovernmentComplaintErrorCode = (typeof governmentComplaintErrorCodes)[number];
