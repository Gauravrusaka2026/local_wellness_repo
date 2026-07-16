import type {
  ComplaintEvidenceRole,
  ComplaintMediaMimeType,
  ComplaintReopenEvidence,
  ComplaintReopenEvidenceFinalization,
  ComplaintReopenEvidenceUploadStatus,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionFeedbackResult,
  CreateComplaintReopenEvidenceUploadIntentInput,
  FinalizeComplaintReopenEvidenceInput,
  GovernmentComplaintAccountability,
  ReopenComplaintInput,
  ReopenComplaintResult,
} from '@local-wellness/types';

import type { ComplaintMutationIdentity } from './complaint.store.js';
import type { ResolutionEvidenceObject } from './resolution-evidence.gateway.js';

export interface ReservedComplaintReopenEvidence {
  bucket: string;
  evidence: ComplaintReopenEvidence;
  objectPath: string;
  uploadExpiresAt: string;
  workflowVersion: number;
}

export interface CitizenComplaintEvidenceObjectLocator {
  evidenceId: string;
  role: ComplaintEvidenceRole;
  bucket: string;
  objectPath: string;
  clientSha256: string;
  declaredByteSize: number;
  declaredMimeType: ComplaintMediaMimeType;
  observedByteSize: number | null;
  observedMimeType: ComplaintMediaMimeType | null;
  uploadExpiresAt: string;
  uploadStatus: ComplaintReopenEvidenceUploadStatus;
  workflowVersion: number;
}

export class CitizenResolutionDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Citizen resolution persistence operation failed: ${operation}.`);
    this.name = 'CitizenResolutionDataAccessError';
  }
}

export class CitizenResolutionNotFoundError extends CitizenResolutionDataAccessError {
  public constructor(public readonly resource: 'complaint' | 'evidence' | 'policy' | 'resolution') {
    super(`find ${resource}`);
    this.name = 'CitizenResolutionNotFoundError';
  }
}

export class CitizenResolutionAccessDeniedError extends CitizenResolutionDataAccessError {
  public constructor() {
    super('authorize government accountability access');
    this.name = 'CitizenResolutionAccessDeniedError';
  }
}

export class CitizenResolutionConflictError extends CitizenResolutionDataAccessError {
  public constructor(public readonly marker: string) {
    super('validate resolution feedback or reopening state');
    this.name = 'CitizenResolutionConflictError';
  }
}

export abstract class CitizenResolutionStore {
  public abstract getResolutionContext(
    actorUserId: string,
    complaintId: string,
  ): Promise<ComplaintResolutionContext>;

  public abstract getGovernmentAccountability(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAccountability>;

  public abstract reserveReopenEvidence(
    actorUserId: string,
    complaintId: string,
    input: CreateComplaintReopenEvidenceUploadIntentInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReservedComplaintReopenEvidence>;

  public abstract getEvidenceObject(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    purpose: 'finalize' | 'view',
  ): Promise<CitizenComplaintEvidenceObjectLocator>;

  public abstract finalizeReopenEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeComplaintReopenEvidenceInput,
    observed: ResolutionEvidenceObject,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ComplaintReopenEvidenceFinalization>;

  public abstract failReopenEvidence(
    evidenceId: string,
    failureCode: 'CONTENT_TYPE_MISMATCH' | 'OBJECT_INTEGRITY_MISMATCH',
  ): Promise<void>;

  public abstract submitFeedback(
    actorUserId: string,
    complaintId: string,
    input: ComplaintResolutionFeedbackInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ComplaintResolutionFeedbackResult>;

  public abstract reopenComplaint(
    actorUserId: string,
    complaintId: string,
    input: ReopenComplaintInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReopenComplaintResult>;
}
