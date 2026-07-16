import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  ComplaintReopenEvidenceUploadStatus,
  ComplaintReopenEvidenceFinalization,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionFeedbackResult,
  CreateComplaintReopenEvidenceUploadIntentInput,
  GovernmentComplaintAccountability,
  ReopenComplaintInput,
  ReopenComplaintResult,
} from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import {
  CitizenResolutionController,
  GovernmentComplaintAccountabilityController,
} from '../complaints/citizen-resolution.controller.js';
import { CitizenResolutionService } from '../complaints/citizen-resolution.service.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import {
  CitizenResolutionStore,
  type CitizenComplaintEvidenceObjectLocator,
  type ReservedComplaintReopenEvidence,
} from '../data/citizen-resolution.store.js';
import type { ComplaintMutationIdentity } from '../data/complaint.store.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  ResolutionEvidenceGateway,
  type ResolutionEvidenceObject,
  type ResolutionEvidenceReadTarget,
  type ResolutionEvidenceUploadTarget,
} from '../data/resolution-evidence.gateway.js';
import {
  activeProfile,
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const identifiers = {
  complaint: '10000000-0000-4000-8000-000000000001',
  evidence: '10000000-0000-4000-8000-000000000002',
  escalation: '10000000-0000-4000-8000-000000000003',
  feedback: '10000000-0000-4000-8000-000000000004',
  policy: '10000000-0000-4000-8000-000000000005',
  reopen: '10000000-0000-4000-8000-000000000006',
  resolution: '10000000-0000-4000-8000-000000000007',
  scope: '10000000-0000-4000-8000-000000000008',
} as const;

const timestamp = '2026-07-13T10:00:00.000Z';
const locationCapture = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 8,
  capturedAt: timestamp,
  deviceRecordedAt: timestamp,
  provider: 'gps' as const,
  isMockLocation: false,
};
const evidence = {
  id: identifiers.evidence,
  kind: 'photo' as const,
  mimeType: 'image/jpeg' as const,
  byteSize: 1_024,
  uploadStatus: 'finalized' as const,
  capturedAt: timestamp,
  captureLocation: {
    latitude: locationCapture.latitude,
    longitude: locationCapture.longitude,
    accuracyMeters: locationCapture.accuracyMeters,
    provider: locationCapture.provider,
    capturedAt: locationCapture.capturedAt,
  },
  finalizedAt: timestamp,
  createdAt: timestamp,
};
const feedback = {
  id: identifiers.feedback,
  resolutionId: identifiers.resolution,
  outcome: 'resolved' as const,
  ratings: { satisfaction: 5, speed: 4, quality: 5, communication: 4 },
  comment: 'The repair is holding.',
  submittedAt: timestamp,
};
const resolution = {
  id: identifiers.resolution,
  version: 1,
  publicMessage: 'The repair is ready for review.',
  completedAt: timestamp,
  completionLocation: evidence.captureLocation,
  distanceFromComplaintMeters: 4,
  workReference: null,
  beforeEvidence: [],
  afterEvidence: [],
  reopenEvidence: [],
};
const context: ComplaintResolutionContext = {
  complaintId: identifiers.complaint,
  workflowVersion: 4,
  status: 'citizen_verification_pending',
  latestResolution: resolution,
  policy: {
    id: identifiers.policy,
    version: 1,
    outcomeOptions: [{ code: 'resolved', label: 'Resolved' }],
    reopenReasonOptions: [{ code: 'issue_persists', label: 'Issue persists' }],
    ratingMinimum: 1,
    ratingMaximum: 5,
    ratingsRequired: true,
    ratingLabels: {
      satisfaction: 'Overall satisfaction',
      speed: 'Speed',
      quality: 'Quality',
      communication: 'Communication',
    },
    reopenDeadline: '2026-07-20T10:00:00.000Z',
    reopenAttemptsRemaining: 2,
    reopenEvidenceRequired: false,
    feedbackAllowed: true,
    reopenAllowed: true,
    reopenEvidenceUploadAllowed: true,
    unavailableReason: null,
  },
  policyUnavailableReason: null,
  availableReopenEvidence: [evidence],
  feedback: [],
  reopenRequests: [],
  escalations: [],
};
const feedbackResult: ComplaintResolutionFeedbackResult = {
  complaintId: identifiers.complaint,
  status: 'resolved',
  workflowVersion: 5,
  updatedAt: timestamp,
  feedback,
};
const reopenRequest = {
  id: identifiers.reopen,
  resolutionId: identifiers.resolution,
  attemptNumber: 1,
  reasonCode: 'issue_persists',
  explanation: 'The issue is still present.',
  evidenceIds: [identifiers.evidence],
  resultingStatus: 'reopened' as const,
  requestedAt: timestamp,
};
const reopenResult: ReopenComplaintResult = {
  complaintId: identifiers.complaint,
  status: 'reopened',
  workflowVersion: 5,
  updatedAt: timestamp,
  reopenRequest,
  escalation: null,
};
const governmentAccountability: GovernmentComplaintAccountability = {
  complaintId: identifiers.complaint,
  workflowVersion: 4,
  resolutionHistory: [{ ...resolution, completionNote: 'Field repair completed.' }],
  feedback: [],
  reopenRequests: [],
  escalations: [],
};

class FakeCitizenResolutionStore extends CitizenResolutionStore {
  public feedbackCalls: Array<{
    actorUserId: string;
    complaintId: string;
    identity: ComplaintMutationIdentity;
    input: ComplaintResolutionFeedbackInput;
    requestId: string;
  }> = [];
  public reopenCalls: Array<{
    actorUserId: string;
    complaintId: string;
    identity: ComplaintMutationIdentity;
    input: ReopenComplaintInput;
    requestId: string;
  }> = [];
  public accountabilityScope: string | undefined;
  public reservedUploadStatus: ComplaintReopenEvidenceUploadStatus = 'reserved';
  public reservedUploadExpiresAt = '2026-07-13T10:10:00.000Z';

  public override async getResolutionContext(): Promise<ComplaintResolutionContext> {
    return context;
  }

  public override async getGovernmentAccountability(
    _actorUserId: string,
    _complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAccountability> {
    this.accountabilityScope = scopeRoleAssignmentId;
    return governmentAccountability;
  }

  public override async reserveReopenEvidence(
    _actorUserId: string,
    _complaintId: string,
    input: CreateComplaintReopenEvidenceUploadIntentInput,
  ): Promise<ReservedComplaintReopenEvidence> {
    return {
      bucket: 'complaint-originals-private',
      evidence: {
        ...evidence,
        uploadStatus: this.reservedUploadStatus,
        finalizedAt: null,
        captureLocation: {
          latitude: input.captureLocation.latitude,
          longitude: input.captureLocation.longitude,
          accuracyMeters: input.captureLocation.accuracyMeters,
          provider: input.captureLocation.provider,
          capturedAt: input.captureLocation.capturedAt,
        },
      },
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      uploadExpiresAt: this.reservedUploadExpiresAt,
      workflowVersion: input.expectedWorkflowVersion,
    };
  }

  public override async getEvidenceObject(
    _actorUserId: string,
    _complaintId: string,
    _evidenceId: string,
    purpose: 'finalize' | 'view',
  ): Promise<CitizenComplaintEvidenceObjectLocator> {
    return {
      evidenceId: identifiers.evidence,
      role: 'reopen',
      bucket: 'complaint-originals-private',
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      clientSha256: 'a'.repeat(64),
      declaredByteSize: 1_024,
      declaredMimeType: 'image/jpeg',
      observedByteSize: purpose === 'view' ? 1_024 : null,
      observedMimeType: purpose === 'view' ? 'image/jpeg' : null,
      uploadExpiresAt: '2026-07-13T10:10:00.000Z',
      uploadStatus: purpose === 'view' ? 'finalized' : 'reserved',
      workflowVersion: 4,
    };
  }

  public override async finalizeReopenEvidence(): Promise<ComplaintReopenEvidenceFinalization> {
    return { evidence, workflowVersion: 4 };
  }

  public override async failReopenEvidence(): Promise<void> {}

  public override async submitFeedback(
    actorUserId: string,
    complaintId: string,
    input: ComplaintResolutionFeedbackInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ComplaintResolutionFeedbackResult> {
    this.feedbackCalls.push({ actorUserId, complaintId, input, identity, requestId });
    return feedbackResult;
  }

  public override async reopenComplaint(
    actorUserId: string,
    complaintId: string,
    input: ReopenComplaintInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReopenComplaintResult> {
    this.reopenCalls.push({ actorUserId, complaintId, input, identity, requestId });
    return reopenResult;
  }
}

class FakeResolutionEvidenceGateway extends ResolutionEvidenceGateway {
  public inspectCalls = 0;
  public uploadTargetCalls = 0;

  public override async createSignedUploadTarget(): Promise<ResolutionEvidenceUploadTarget> {
    this.uploadTargetCalls += 1;
    return {
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      token: 'private-reopen-upload-token',
    };
  }

  public override async createSignedReadTarget(): Promise<ResolutionEvidenceReadTarget> {
    return { signedUrl: 'https://storage.example.test/signed-citizen-evidence' };
  }

  public override async inspectObject(): Promise<ResolutionEvidenceObject> {
    this.inspectCalls += 1;
    return { byteSize: 1_024, mimeType: 'image/jpeg', sha256: 'a'.repeat(64) };
  }

  public override async removeObject(): Promise<void> {}
}

describe('citizen resolution API contract', () => {
  let application: INestApplication;
  let store: FakeCitizenResolutionStore;
  let gateway: FakeResolutionEvidenceGateway;

  beforeEach(async () => {
    store = new FakeCitizenResolutionStore();
    gateway = new FakeResolutionEvidenceGateway();
    const testingModule = await Test.createTestingModule({
      controllers: [CitizenResolutionController, GovernmentComplaintAccountabilityController],
      providers: [
        CitizenResolutionService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: IdentityStore, useValue: new FakeIdentityStore() },
        { provide: AuthenticationGateway, useValue: new FakeAuthenticationGateway() },
        { provide: CitizenResolutionStore, useValue: store },
        { provide: ResolutionEvidenceGateway, useValue: gateway },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('requires authentication for citizen resolution and government accountability routes', async () => {
    await request(application.getHttpServer())
      .get(`/api/v1/complaints/${identifiers.complaint}/resolution-context`)
      .expect(401);
    await request(application.getHttpServer())
      .get(`/api/v1/government/complaints/${identifiers.complaint}/accountability`)
      .expect(401);
    await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/feedback`)
      .send({})
      .expect(401);
  });

  it('returns no-store citizen context and scoped government accountability', async () => {
    const citizenResponse = await request(application.getHttpServer())
      .get(`/api/v1/complaints/${identifiers.complaint}/resolution-context`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);
    const governmentResponse = await request(application.getHttpServer())
      .get(
        `/api/v1/government/complaints/${identifiers.complaint}/accountability?scopeRoleAssignmentId=${identifiers.scope}`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(citizenResponse.body.data, context);
    assert.deepEqual(governmentResponse.body.data, governmentAccountability);
    assert.equal(citizenResponse.headers['cache-control'], 'private, no-store');
    assert.equal(governmentResponse.headers['cache-control'], 'private, no-store');
    assert.equal(store.accountabilityScope, identifiers.scope);
  });

  it('validates and idempotently dispatches all-or-none citizen feedback', async () => {
    const input = {
      expectedWorkflowVersion: 4,
      resolutionId: identifiers.resolution,
      outcome: 'resolved',
      ratings: feedback.ratings,
      comment: feedback.comment,
    };
    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/feedback`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-feedback-request-1')
      .set('x-request-id', 'citizen-feedback-request-1')
      .send(input)
      .expect(201);

    assert.deepEqual(response.body.data, feedbackResult);
    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.deepEqual(store.feedbackCalls[0]?.input, input);
    assert.equal(store.feedbackCalls[0]?.actorUserId, activeProfile.id);
    assert.match(store.feedbackCalls[0]?.identity.idempotencyKeyHash ?? '', /^[0-9a-f]{64}$/u);
    assert.notEqual(
      store.feedbackCalls[0]?.identity.idempotencyKeyHash,
      'citizen-feedback-request-1',
    );

    await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/feedback`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-feedback-request-2')
      .send({
        ...input,
        ratings: { satisfaction: 5 },
        citizenUserId: activeProfile.id,
      })
      .expect(400);
    assert.equal(store.feedbackCalls.length, 1);
  });

  it('uses signed private upload, finalization, and role-bearing evidence access contracts', async () => {
    const uploadInput = {
      expectedWorkflowVersion: 4,
      kind: 'photo',
      mimeType: 'image/jpeg',
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
      capturedAt: timestamp,
      widthPixels: 1_280,
      heightPixels: 720,
      captureLocation: locationCapture,
    };
    const uploadResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/reopen-evidence/upload-intents`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-upload-1')
      .send(uploadInput)
      .expect(201);
    const finalizeResponse = await request(application.getHttpServer())
      .post(
        `/api/v1/complaints/${identifiers.complaint}/reopen-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-finalize-1')
      .send({ expectedWorkflowVersion: 4, byteSize: 1_024, sha256: 'a'.repeat(64) })
      .expect(201);
    const accessResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/evidence/${identifiers.evidence}/access`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(201);

    assert.equal(uploadResponse.body.data.upload.token, 'private-reopen-upload-token');
    assert.deepEqual(finalizeResponse.body.data, { evidence, workflowVersion: 4 });
    assert.deepEqual(accessResponse.body.data, {
      evidenceId: identifiers.evidence,
      role: 'reopen',
      signedUrl: 'https://storage.example.test/signed-citizen-evidence',
      expiresAt: '2026-07-13T10:05:00.000Z',
    });
    assert.equal(gateway.inspectCalls, 1);
    assert.equal(uploadResponse.headers['cache-control'], 'private, no-store');
    assert.equal(accessResponse.headers['cache-control'], 'private, no-store');
  });

  it('does not mint upload targets for terminal or expired evidence reservations', async () => {
    const input = {
      expectedWorkflowVersion: 4,
      kind: 'photo',
      mimeType: 'image/jpeg',
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
      capturedAt: timestamp,
      captureLocation: locationCapture,
    };
    store.reservedUploadStatus = 'finalized';
    const terminalResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/reopen-evidence/upload-intents`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-upload-terminal')
      .send(input)
      .expect(409);

    store.reservedUploadStatus = 'reserved';
    store.reservedUploadExpiresAt = '2026-07-13T09:59:59.000Z';
    const expiredResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/reopen-evidence/upload-intents`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-upload-expired')
      .send(input)
      .expect(409);

    assert.equal(terminalResponse.body.error.code, 'COMPLAINT_REOPEN_EVIDENCE_NOT_READY');
    assert.equal(expiredResponse.body.error.code, 'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED');
    assert.equal(gateway.uploadTargetCalls, 0);
  });

  it('validates and dispatches a citizen reopen request with unique evidence', async () => {
    const input = {
      expectedWorkflowVersion: 4,
      resolutionId: identifiers.resolution,
      reasonCode: 'issue_persists',
      explanation: reopenRequest.explanation,
      evidenceIds: [identifiers.evidence],
    };
    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/reopen`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-request-1')
      .send(input)
      .expect(201);

    assert.deepEqual(response.body.data, reopenResult);
    assert.deepEqual(store.reopenCalls[0]?.input, input);

    await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/reopen`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'citizen-reopen-request-2')
      .send({ ...input, evidenceIds: [identifiers.evidence, identifiers.evidence] })
      .expect(400);
    assert.equal(store.reopenCalls.length, 1);
  });
});
