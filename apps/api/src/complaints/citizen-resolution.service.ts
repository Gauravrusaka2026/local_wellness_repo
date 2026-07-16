import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  ComplaintEvidenceAccess,
  ComplaintReopenEvidenceFinalization,
  ComplaintReopenEvidenceUploadIntent,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionFeedbackResult,
  CreateComplaintReopenEvidenceUploadIntentInput,
  FinalizeComplaintReopenEvidenceInput,
  GovernmentComplaintAccountability,
  ReopenComplaintInput,
  ReopenComplaintResult,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { CitizenResolutionStore } from '../data/citizen-resolution.store.js';
import {
  ResolutionEvidenceGateway,
  ResolutionEvidenceIntegrityError,
  type ResolutionEvidenceObject,
} from '../data/resolution-evidence.gateway.js';

const signedReadLifetimeSeconds = 300;

@Injectable()
export class CitizenResolutionService {
  private readonly logger = new Logger(CitizenResolutionService.name);

  public constructor(
    @Inject(CitizenResolutionStore)
    private readonly store: CitizenResolutionStore,
    @Inject(ResolutionEvidenceGateway)
    private readonly gateway: ResolutionEvidenceGateway,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public getResolutionContext(
    actorUserId: string,
    complaintId: string,
  ): Promise<ComplaintResolutionContext> {
    return this.store.getResolutionContext(actorUserId, complaintId);
  }

  public getGovernmentAccountability(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAccountability> {
    return this.store.getGovernmentAccountability(actorUserId, complaintId, scopeRoleAssignmentId);
  }

  public async createReopenEvidenceUploadIntent(
    actorUserId: string,
    complaintId: string,
    input: CreateComplaintReopenEvidenceUploadIntentInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<ComplaintReopenEvidenceUploadIntent> {
    const reserved = await this.store.reserveReopenEvidence(
      actorUserId,
      complaintId,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'citizen-complaint:reopen-evidence', {
        complaintId,
        input,
      }),
      requestId,
    );
    if (reserved.evidence.uploadStatus !== 'reserved') {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_NOT_READY',
        'Reopen evidence is not available for a new upload.',
      );
    }
    if (Date.parse(reserved.uploadExpiresAt) <= this.clock.now().getTime()) {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED',
        'The reopen evidence upload reservation has expired.',
      );
    }
    const upload = await this.gateway.createSignedUploadTarget(
      reserved.bucket,
      reserved.objectPath,
    );

    this.logger.log({
      event: 'citizen_reopen_evidence_reserved',
      actorUserId,
      complaintId,
      evidenceId: reserved.evidence.id,
      evidenceKind: reserved.evidence.kind,
    });
    return {
      evidence: reserved.evidence,
      upload: {
        bucket: reserved.bucket,
        objectPath: upload.objectPath,
        token: upload.token,
      },
      expiresAt: reserved.uploadExpiresAt,
      workflowVersion: reserved.workflowVersion,
    };
  }

  public async finalizeReopenEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeComplaintReopenEvidenceInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<ComplaintReopenEvidenceFinalization> {
    const locator = await this.store.getEvidenceObject(
      actorUserId,
      complaintId,
      evidenceId,
      'finalize',
    );
    if (locator.role !== 'reopen') {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_NOT_READY',
        'Only reserved reopen evidence can be finalized through this endpoint.',
      );
    }

    const identity = createComplaintMutationIdentity(
      idempotencyKey,
      'citizen-complaint:finalize-reopen-evidence',
      { complaintId, evidenceId, input },
    );
    if (locator.uploadStatus === 'finalized') {
      if (locator.observedByteSize === null || locator.observedMimeType === null) {
        throw ApiException.conflict(
          'COMPLAINT_REOPEN_EVIDENCE_NOT_READY',
          'Finalized reopen evidence is missing its verification metadata.',
        );
      }
      return this.store.finalizeReopenEvidence(
        actorUserId,
        complaintId,
        evidenceId,
        input,
        {
          byteSize: locator.observedByteSize,
          mimeType: locator.observedMimeType,
          sha256: locator.clientSha256,
        },
        identity,
        requestId,
      );
    }
    if (locator.workflowVersion !== input.expectedWorkflowVersion) {
      throw ApiException.conflict(
        'COMPLAINT_WORKFLOW_VERSION_CONFLICT',
        'The complaint changed before the evidence could be finalized.',
      );
    }
    if (locator.uploadStatus !== 'reserved') {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_NOT_READY',
        'Reopen evidence is not ready for finalization.',
      );
    }
    if (Date.parse(locator.uploadExpiresAt) <= this.clock.now().getTime()) {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED',
        'The reopen evidence upload reservation has expired.',
      );
    }
    if (input.byteSize !== locator.declaredByteSize || input.sha256 !== locator.clientSha256) {
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH',
        'The finalization metadata does not match the reserved evidence.',
      );
    }

    let observed: ResolutionEvidenceObject;
    try {
      observed = await this.gateway.inspectObject(locator.bucket, locator.objectPath);
    } catch (error) {
      if (!(error instanceof ResolutionEvidenceIntegrityError)) {
        throw error;
      }
      await this.gateway.removeObject(locator.bucket, locator.objectPath);
      await this.store.failReopenEvidence(evidenceId, 'CONTENT_TYPE_MISMATCH');
      this.logger.warn({
        event: 'citizen_reopen_evidence_rejected',
        actorUserId,
        complaintId,
        evidenceId,
        failureCode: 'CONTENT_TYPE_MISMATCH',
      });
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH',
        'The uploaded evidence content does not match its declared media type.',
      );
    }

    if (
      observed.byteSize !== input.byteSize ||
      observed.sha256 !== input.sha256 ||
      observed.mimeType !== locator.declaredMimeType
    ) {
      await this.gateway.removeObject(locator.bucket, locator.objectPath);
      await this.store.failReopenEvidence(evidenceId, 'OBJECT_INTEGRITY_MISMATCH');
      this.logger.warn({
        event: 'citizen_reopen_evidence_rejected',
        actorUserId,
        complaintId,
        evidenceId,
        failureCode: 'OBJECT_INTEGRITY_MISMATCH',
      });
      throw ApiException.conflict(
        'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH',
        'The uploaded evidence does not match its reserved checksum or size.',
      );
    }

    const result = await this.store.finalizeReopenEvidence(
      actorUserId,
      complaintId,
      evidenceId,
      input,
      observed,
      identity,
      requestId,
    );
    this.logger.log({
      event: 'citizen_reopen_evidence_finalized',
      actorUserId,
      complaintId,
      evidenceId,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }

  public async createEvidenceAccess(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
  ): Promise<ComplaintEvidenceAccess> {
    const locator = await this.store.getEvidenceObject(
      actorUserId,
      complaintId,
      evidenceId,
      'view',
    );
    if (locator.uploadStatus !== 'finalized') {
      throw ApiException.conflict(
        'COMPLAINT_EVIDENCE_NOT_READY',
        'Complaint evidence is not ready for viewing.',
      );
    }
    const target = await this.gateway.createSignedReadTarget(
      locator.bucket,
      locator.objectPath,
      signedReadLifetimeSeconds,
    );
    this.logger.log({
      event: 'citizen_complaint_evidence_access_granted',
      actorUserId,
      complaintId,
      evidenceId,
      evidenceRole: locator.role,
    });
    return {
      evidenceId,
      role: locator.role,
      signedUrl: target.signedUrl,
      expiresAt: new Date(
        this.clock.now().getTime() + signedReadLifetimeSeconds * 1_000,
      ).toISOString(),
    };
  }

  public async submitFeedback(
    actorUserId: string,
    complaintId: string,
    input: ComplaintResolutionFeedbackInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<ComplaintResolutionFeedbackResult> {
    const result = await this.store.submitFeedback(
      actorUserId,
      complaintId,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'citizen-complaint:feedback', {
        complaintId,
        input,
      }),
      requestId,
    );
    this.logger.log({
      event: 'citizen_resolution_feedback_submitted',
      actorUserId,
      complaintId,
      feedbackId: result.feedback.id,
      outcome: result.feedback.outcome,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }

  public async reopenComplaint(
    actorUserId: string,
    complaintId: string,
    input: ReopenComplaintInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<ReopenComplaintResult> {
    const result = await this.store.reopenComplaint(
      actorUserId,
      complaintId,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'citizen-complaint:reopen', {
        complaintId,
        input,
      }),
      requestId,
    );
    this.logger.log({
      event: 'citizen_complaint_reopened',
      actorUserId,
      complaintId,
      reopenRequestId: result.reopenRequest.id,
      status: result.status,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }
}
