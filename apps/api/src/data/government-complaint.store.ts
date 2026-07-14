import type {
  AcknowledgeGovernmentComplaintInput,
  AddGovernmentComplaintExternalDependencyInput,
  AddGovernmentComplaintInternalNoteInput,
  AddGovernmentComplaintWorkReferenceInput,
  AssignGovernmentComplaintInput,
  CompleteGovernmentComplaintInspectionInput,
  CreateGovernmentResolutionEvidenceUploadIntentInput,
  FinalizeGovernmentResolutionEvidenceInput,
  GovernmentComplaintActionResult,
  GovernmentComplaintAssignmentOptions,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueQuery,
  GovernmentComplaintQueueResult,
  GovernmentResolutionEvidence,
  GovernmentResolutionEvidenceFinalization,
  ResolveGovernmentComplaintExternalDependencyInput,
  ScheduleGovernmentComplaintInspectionInput,
  SubmitGovernmentComplaintResolutionInput,
  TransferGovernmentComplaintInput,
  UpdateGovernmentComplaintStatusInput,
} from '@local-wellness/types';

import type { ComplaintMutationIdentity } from './complaint.store.js';
import type { ResolutionEvidenceObject } from './resolution-evidence.gateway.js';

export type GovernmentComplaintAction =
  | Readonly<{ kind: 'acknowledge'; input: AcknowledgeGovernmentComplaintInput }>
  | Readonly<{ kind: 'assign'; input: AssignGovernmentComplaintInput }>
  | Readonly<{ kind: 'transfer'; input: TransferGovernmentComplaintInput }>
  | Readonly<{ kind: 'update_status'; input: UpdateGovernmentComplaintStatusInput }>
  | Readonly<{ kind: 'add_internal_note'; input: AddGovernmentComplaintInternalNoteInput }>
  | Readonly<{
      kind: 'schedule_inspection';
      input: ScheduleGovernmentComplaintInspectionInput;
    }>
  | Readonly<{
      inspectionId: string;
      kind: 'complete_inspection';
      input: CompleteGovernmentComplaintInspectionInput;
    }>
  | Readonly<{ kind: 'add_work_reference'; input: AddGovernmentComplaintWorkReferenceInput }>
  | Readonly<{
      kind: 'add_external_dependency';
      input: AddGovernmentComplaintExternalDependencyInput;
    }>
  | Readonly<{
      dependencyId: string;
      kind: 'resolve_external_dependency';
      input: ResolveGovernmentComplaintExternalDependencyInput;
    }>
  | Readonly<{
      kind: 'submit_resolution';
      input: SubmitGovernmentComplaintResolutionInput;
    }>;

export interface ReservedGovernmentResolutionEvidence {
  bucket: 'resolution-evidence-private';
  evidence: GovernmentResolutionEvidence;
  objectPath: string;
  uploadExpiresAt: string;
  workflowVersion: number;
}

export interface GovernmentResolutionEvidenceObjectLocator {
  bucket: 'resolution-evidence-private';
  clientSha256: string;
  declaredByteSize: number;
  declaredMimeType: string;
  observedByteSize: number | null;
  observedMimeType: string | null;
  objectPath: string;
  uploadExpiresAt: string;
  uploadStatus: 'reserved' | 'finalized' | 'failed' | 'expired';
  workflowVersion: number;
}

export class GovernmentComplaintDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Government complaint persistence operation failed: ${operation}.`);
    this.name = 'GovernmentComplaintDataAccessError';
  }
}

export class GovernmentComplaintNotFoundError extends GovernmentComplaintDataAccessError {
  public constructor(
    public readonly resource: 'complaint' | 'dependency' | 'evidence' | 'inspection',
  ) {
    super(`find ${resource}`);
    this.name = 'GovernmentComplaintNotFoundError';
  }
}

export class GovernmentComplaintAccessDeniedError extends GovernmentComplaintDataAccessError {
  public constructor() {
    super('authorize government complaint access');
    this.name = 'GovernmentComplaintAccessDeniedError';
  }
}

export class GovernmentComplaintConflictError extends GovernmentComplaintDataAccessError {
  public constructor(public readonly marker: string) {
    super('validate government complaint workflow');
    this.name = 'GovernmentComplaintConflictError';
  }
}

export abstract class GovernmentComplaintStore {
  public abstract listComplaints(
    actorUserId: string,
    query: GovernmentComplaintQueueQuery,
  ): Promise<GovernmentComplaintQueueResult>;

  public abstract getComplaint(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintDetail>;

  public abstract listAssignmentOptions(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAssignmentOptions>;

  public abstract performAction(
    actorUserId: string,
    complaintId: string,
    action: GovernmentComplaintAction,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult>;

  public abstract reserveResolutionEvidence(
    actorUserId: string,
    complaintId: string,
    input: CreateGovernmentResolutionEvidenceUploadIntentInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReservedGovernmentResolutionEvidence>;

  public abstract getResolutionEvidenceObject(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    purpose: 'finalize' | 'view',
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentResolutionEvidenceObjectLocator>;

  public abstract finalizeResolutionEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeGovernmentResolutionEvidenceInput,
    observed: ResolutionEvidenceObject,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentResolutionEvidenceFinalization>;

  public abstract failResolutionEvidence(
    evidenceId: string,
    failureCode: 'CONTENT_TYPE_MISMATCH' | 'OBJECT_INTEGRITY_MISMATCH',
  ): Promise<void>;

  public abstract submitResolution(
    actorUserId: string,
    complaintId: string,
    input: SubmitGovernmentComplaintResolutionInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult>;
}
