import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  CreateGovernmentResolutionEvidenceUploadIntentInput,
  FinalizeGovernmentResolutionEvidenceInput,
  GovernmentComplaintActionResult,
  GovernmentResolutionEvidenceAccess,
  GovernmentResolutionEvidenceFinalization,
  GovernmentResolutionEvidenceUploadIntent,
  SubmitGovernmentComplaintResolutionInput,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { GovernmentComplaintStore } from '../data/government-complaint.store.js';
import {
  ResolutionEvidenceGateway,
  ResolutionEvidenceIntegrityError,
  type ResolutionEvidenceObject,
} from '../data/resolution-evidence.gateway.js';

const signedReadLifetimeSeconds = 300;

@Injectable()
export class GovernmentResolutionEvidenceService {
  private readonly logger = new Logger(GovernmentResolutionEvidenceService.name);

  public constructor(
    @Inject(GovernmentComplaintStore)
    private readonly store: GovernmentComplaintStore,
    @Inject(ResolutionEvidenceGateway)
    private readonly gateway: ResolutionEvidenceGateway,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async createUploadIntent(
    actorUserId: string,
    complaintId: string,
    input: CreateGovernmentResolutionEvidenceUploadIntentInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<GovernmentResolutionEvidenceUploadIntent> {
    const reserved = await this.store.reserveResolutionEvidence(
      actorUserId,
      complaintId,
      input,
      createComplaintMutationIdentity(
        idempotencyKey,
        'government-complaint:upload_resolution_evidence',
        { complaintId, input },
      ),
      requestId,
    );
    const upload = await this.gateway.createSignedUploadTarget(
      reserved.bucket,
      reserved.objectPath,
    );

    this.logger.log({
      event: 'government_resolution_evidence_reserved',
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

  public async finalizeEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeGovernmentResolutionEvidenceInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<GovernmentResolutionEvidenceFinalization> {
    const locator = await this.store.getResolutionEvidenceObject(
      actorUserId,
      complaintId,
      evidenceId,
      'finalize',
    );
    const identity = createComplaintMutationIdentity(
      idempotencyKey,
      'government-complaint:finalize_resolution_evidence',
      { complaintId, evidenceId, input },
    );
    if (locator.uploadStatus === 'finalized') {
      if (locator.observedByteSize === null || locator.observedMimeType === null) {
        throw ApiException.conflict(
          'RESOLUTION_EVIDENCE_NOT_READY',
          'Finalized resolution evidence is missing its verification metadata.',
        );
      }
      return this.store.finalizeResolutionEvidence(
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
        'RESOLUTION_EVIDENCE_NOT_READY',
        'Resolution evidence is not ready for finalization.',
      );
    }
    if (Date.parse(locator.uploadExpiresAt) <= this.clock.now().getTime()) {
      throw ApiException.conflict(
        'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED',
        'The resolution evidence upload reservation has expired.',
      );
    }
    if (input.byteSize !== locator.declaredByteSize || input.sha256 !== locator.clientSha256) {
      throw ApiException.conflict(
        'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
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
      await this.store.failResolutionEvidence(evidenceId, 'CONTENT_TYPE_MISMATCH');
      this.logger.warn({
        event: 'government_resolution_evidence_rejected',
        actorUserId,
        complaintId,
        evidenceId,
        failureCode: 'CONTENT_TYPE_MISMATCH',
      });
      throw ApiException.conflict(
        'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
        'The uploaded evidence content does not match its declared media type.',
      );
    }

    if (
      observed.byteSize !== input.byteSize ||
      observed.sha256 !== input.sha256 ||
      observed.mimeType !== locator.declaredMimeType
    ) {
      if (locator.uploadStatus === 'reserved') {
        await this.gateway.removeObject(locator.bucket, locator.objectPath);
        await this.store.failResolutionEvidence(evidenceId, 'OBJECT_INTEGRITY_MISMATCH');
        this.logger.warn({
          event: 'government_resolution_evidence_rejected',
          actorUserId,
          complaintId,
          evidenceId,
          failureCode: 'OBJECT_INTEGRITY_MISMATCH',
        });
      }
      throw ApiException.conflict(
        'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
        'The uploaded evidence does not match its reserved checksum or size.',
      );
    }

    const result = await this.store.finalizeResolutionEvidence(
      actorUserId,
      complaintId,
      evidenceId,
      input,
      observed,
      identity,
      requestId,
    );
    this.logger.log({
      event: 'government_resolution_evidence_finalized',
      actorUserId,
      complaintId,
      evidenceId,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }

  public async createReadAccess(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentResolutionEvidenceAccess> {
    const locator = await this.store.getResolutionEvidenceObject(
      actorUserId,
      complaintId,
      evidenceId,
      'view',
      scopeRoleAssignmentId,
    );
    if (locator.uploadStatus !== 'finalized') {
      throw ApiException.conflict(
        'RESOLUTION_EVIDENCE_NOT_READY',
        'Resolution evidence is not ready for viewing.',
      );
    }
    const target = await this.gateway.createSignedReadTarget(
      locator.bucket,
      locator.objectPath,
      signedReadLifetimeSeconds,
    );
    this.logger.log({
      event: 'government_resolution_evidence_access_granted',
      actorUserId,
      complaintId,
      evidenceId,
    });
    return {
      evidenceId,
      signedUrl: target.signedUrl,
      expiresAt: new Date(
        this.clock.now().getTime() + signedReadLifetimeSeconds * 1_000,
      ).toISOString(),
    };
  }

  public async submitResolution(
    actorUserId: string,
    complaintId: string,
    input: SubmitGovernmentComplaintResolutionInput,
    idempotencyKey: string,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    const result = await this.store.submitResolution(
      actorUserId,
      complaintId,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'government-complaint:submit_resolution', {
        complaintId,
        input,
      }),
      requestId,
    );
    this.logger.log({
      event: 'government_complaint_resolution_submitted',
      actorUserId,
      complaintId,
      evidenceCount: input.resolutionEvidenceIds.length,
      status: result.status,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }
}
