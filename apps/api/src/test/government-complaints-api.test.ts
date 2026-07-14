import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  GovernmentComplaintActionResult,
  GovernmentComplaintAssignmentOptions,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueQuery,
  GovernmentComplaintQueueResult,
  GovernmentResolutionEvidenceFinalization,
} from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import type { ComplaintMutationIdentity } from '../data/complaint.store.js';
import {
  type GovernmentComplaintAction,
  GovernmentComplaintStore,
  type GovernmentResolutionEvidenceObjectLocator,
  type ReservedGovernmentResolutionEvidence,
} from '../data/government-complaint.store.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  ResolutionEvidenceGateway,
  ResolutionEvidenceIntegrityError,
  type ResolutionEvidenceObject,
  type ResolutionEvidenceReadTarget,
  type ResolutionEvidenceUploadTarget,
} from '../data/resolution-evidence.gateway.js';
import { GovernmentComplaintActionsService } from '../government-complaints/government-complaint-actions.service.js';
import { GovernmentComplaintsController } from '../government-complaints/government-complaints.controller.js';
import { GovernmentComplaintsService } from '../government-complaints/government-complaints.service.js';
import { GovernmentResolutionEvidenceService } from '../government-complaints/government-resolution-evidence.service.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const identifiers = {
  action: '10000000-0000-4000-8000-000000000001',
  assignment: '10000000-0000-4000-8000-000000000002',
  authority: '10000000-0000-4000-8000-000000000003',
  authorityDepartment: '10000000-0000-4000-8000-000000000004',
  category: '10000000-0000-4000-8000-000000000005',
  complaint: '10000000-0000-4000-8000-000000000006',
  department: '10000000-0000-4000-8000-000000000007',
  dependency: '10000000-0000-4000-8000-000000000008',
  evidence: '10000000-0000-4000-8000-000000000009',
  localBody: '10000000-0000-4000-8000-000000000010',
  officerAssignment: '10000000-0000-4000-8000-000000000011',
  officerRole: '10000000-0000-4000-8000-000000000012',
  ward: '10000000-0000-4000-8000-000000000013',
} as const;

const timestamp = '2026-07-14T10:00:00.000Z';
const assignment = {
  id: identifiers.assignment,
  authorityId: identifiers.authority,
  authorityName: 'Verified authority',
  localBodyId: identifiers.localBody,
  localBodyName: 'Verified local body',
  wardId: identifiers.ward,
  wardName: 'Ward 1',
  departmentId: identifiers.department,
  departmentName: 'Sanitation',
  authorityDepartmentId: identifiers.authorityDepartment,
  officerRoleId: identifiers.officerRole,
  officerRoleName: 'Ward officer',
  officerAssignmentId: identifiers.officerAssignment,
  officerName: 'Verified officer',
  source: 'routing_decision' as const,
  status: 'active' as const,
  assignedAt: timestamp,
  endedAt: null,
};
const queueResult: GovernmentComplaintQueueResult = {
  items: [
    {
      id: identifiers.complaint,
      complaintNumber: 'LW-2026-000001',
      categoryId: identifiers.category,
      categoryName: 'Garbage dump',
      status: 'submitted',
      submittedAt: timestamp,
      updatedAt: timestamp,
      workflowVersion: 1,
      currentAssignment: assignment,
      flags: {
        isUnassigned: false,
        isReopened: false,
        isTransferred: false,
        isAwaitingCitizenVerification: false,
      },
    },
  ],
  nextCursor: null,
  hasMore: false,
};
const actionResult: GovernmentComplaintActionResult = {
  actionId: identifiers.action,
  complaintId: identifiers.complaint,
  complaintNumber: 'LW-2026-000001',
  status: 'acknowledged',
  workflowVersion: 2,
  updatedAt: timestamp,
  currentAssignment: assignment,
};
const evidenceFinalization: GovernmentResolutionEvidenceFinalization = {
  evidence: {
    id: identifiers.evidence,
    availableForResolution: true,
    kind: 'photo',
    mimeType: 'image/jpeg',
    byteSize: 1_024,
    uploadStatus: 'finalized',
    capturedAt: null,
    finalizedAt: timestamp,
    createdAt: timestamp,
  },
  workflowVersion: 2,
};

class FakeGovernmentComplaintStore extends GovernmentComplaintStore {
  public lastAction: GovernmentComplaintAction | null = null;
  public evidenceLocatorUploadStatus: GovernmentResolutionEvidenceObjectLocator['uploadStatus'] =
    'reserved';
  public evidenceLocatorUploadExpiresAt = '2026-07-14T10:10:00.000Z';
  public evidenceLocatorWorkflowVersion = 1;
  public failedEvidence: Readonly<{ evidenceId: string; failureCode: string }> | null = null;

  public override async listComplaints(
    _actorUserId: string,
    _query: GovernmentComplaintQueueQuery,
  ): Promise<GovernmentComplaintQueueResult> {
    void _actorUserId;
    void _query;
    return queueResult;
  }

  public override async getComplaint(): Promise<GovernmentComplaintDetail> {
    throw new Error('Not used by this test.');
  }

  public override async listAssignmentOptions(): Promise<GovernmentComplaintAssignmentOptions> {
    throw new Error('Not used by this test.');
  }

  public override async performAction(
    _actorUserId: string,
    _complaintId: string,
    action: GovernmentComplaintAction,
    _identity: ComplaintMutationIdentity,
    _requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    void _actorUserId;
    void _complaintId;
    void _identity;
    void _requestId;
    this.lastAction = action;
    return actionResult;
  }

  public override async reserveResolutionEvidence(): Promise<ReservedGovernmentResolutionEvidence> {
    return {
      bucket: 'resolution-evidence-private',
      evidence: {
        id: identifiers.evidence,
        availableForResolution: false,
        kind: 'photo',
        mimeType: 'image/jpeg',
        byteSize: 1_024,
        uploadStatus: 'reserved',
        capturedAt: null,
        finalizedAt: null,
        createdAt: timestamp,
      },
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      uploadExpiresAt: '2026-07-14T10:10:00.000Z',
      workflowVersion: 2,
    };
  }

  public override async getResolutionEvidenceObject(
    _actorUserId: string,
    _complaintId: string,
    _evidenceId: string,
    purpose: 'finalize' | 'view',
  ): Promise<GovernmentResolutionEvidenceObjectLocator> {
    return {
      bucket: 'resolution-evidence-private',
      clientSha256: 'a'.repeat(64),
      declaredByteSize: 1_024,
      declaredMimeType: 'image/jpeg',
      observedByteSize:
        purpose === 'view' || this.evidenceLocatorUploadStatus === 'finalized' ? 1_024 : null,
      observedMimeType:
        purpose === 'view' || this.evidenceLocatorUploadStatus === 'finalized'
          ? 'image/jpeg'
          : null,
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      uploadExpiresAt: this.evidenceLocatorUploadExpiresAt,
      uploadStatus: purpose === 'view' ? 'finalized' : this.evidenceLocatorUploadStatus,
      workflowVersion: this.evidenceLocatorWorkflowVersion,
    };
  }

  public override async finalizeResolutionEvidence(): Promise<GovernmentResolutionEvidenceFinalization> {
    return evidenceFinalization;
  }

  public override async failResolutionEvidence(
    evidenceId: string,
    failureCode: 'CONTENT_TYPE_MISMATCH' | 'OBJECT_INTEGRITY_MISMATCH',
  ): Promise<void> {
    this.failedEvidence = { evidenceId, failureCode };
  }

  public override async submitResolution(): Promise<GovernmentComplaintActionResult> {
    throw new Error('Not used by this test.');
  }
}

class FakeResolutionEvidenceGateway extends ResolutionEvidenceGateway {
  public inspectCalls = 0;
  public inspectionError: Error | null = null;
  public removeCalls = 0;

  public override async createSignedUploadTarget(): Promise<ResolutionEvidenceUploadTarget> {
    return {
      objectPath: `${identifiers.complaint}/${identifiers.evidence}/original`,
      token: 'private-signed-upload-token',
    };
  }

  public override async createSignedReadTarget(): Promise<ResolutionEvidenceReadTarget> {
    return { signedUrl: 'https://storage.example.test/signed-evidence' };
  }

  public override async inspectObject(): Promise<ResolutionEvidenceObject> {
    this.inspectCalls += 1;
    if (this.inspectionError) {
      throw this.inspectionError;
    }
    return { byteSize: 1_024, mimeType: 'image/jpeg', sha256: 'a'.repeat(64) };
  }

  public override async removeObject(): Promise<void> {
    this.removeCalls += 1;
  }
}

describe('government complaints API contract', () => {
  let application: INestApplication;
  let gateway: FakeResolutionEvidenceGateway;
  let store: FakeGovernmentComplaintStore;

  beforeEach(async () => {
    store = new FakeGovernmentComplaintStore();
    gateway = new FakeResolutionEvidenceGateway();
    const testingModule = await Test.createTestingModule({
      controllers: [GovernmentComplaintsController],
      providers: [
        GovernmentComplaintsService,
        GovernmentComplaintActionsService,
        GovernmentResolutionEvidenceService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: IdentityStore, useValue: new FakeIdentityStore() },
        { provide: AuthenticationGateway, useValue: new FakeAuthenticationGateway() },
        { provide: GovernmentComplaintStore, useValue: store },
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

  it('returns the scoped queue without exact coordinates', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/government/complaints?queue=new')
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(response.body.data, queueResult);
    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(JSON.stringify(response.body.data).includes('latitude'), false);
    assert.equal(JSON.stringify(response.body.data).includes('longitude'), false);
  });

  it('rejects an empty submitted-time interval at the HTTP contract boundary', async () => {
    await request(application.getHttpServer())
      .get(
        `/api/v1/government/complaints?submittedFrom=${encodeURIComponent(timestamp)}&submittedTo=${encodeURIComponent(timestamp)}`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .expect(400);
  });

  it('requires an idempotency key and a positive workflow version for mutations', async () => {
    await request(application.getHttpServer())
      .post(`/api/v1/government/complaints/${identifiers.complaint}/acknowledge`)
      .set('authorization', 'Bearer valid-access-token')
      .send({ expectedWorkflowVersion: 1 })
      .expect(400);

    await request(application.getHttpServer())
      .post(`/api/v1/government/complaints/${identifiers.complaint}/acknowledge`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-acknowledge-1')
      .send({ expectedWorkflowVersion: 0 })
      .expect(400);

    assert.equal(store.lastAction, null);
  });

  it('dispatches a validated action and returns the updated workflow version', async () => {
    const response = await request(application.getHttpServer())
      .post(`/api/v1/government/complaints/${identifiers.complaint}/acknowledge`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-acknowledge-2')
      .set('x-request-id', 'government-action-2')
      .send({ expectedWorkflowVersion: 1, publicMessage: 'Work accepted.' })
      .expect(201);

    assert.deepEqual(store.lastAction, {
      kind: 'acknowledge',
      input: { expectedWorkflowVersion: 1, publicMessage: 'Work accepted.' },
    });
    assert.deepEqual(response.body.data, actionResult);
  });

  it('marks short-lived signed evidence access as non-cacheable', async () => {
    const response = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/access`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .expect(201);

    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(response.body.data.evidenceId, identifiers.evidence);
    assert.equal(response.body.data.signedUrl, 'https://storage.example.test/signed-evidence');
  });

  it('marks private signed evidence upload intents as non-cacheable', async () => {
    const response = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/upload-intents`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-upload-1')
      .send({
        expectedWorkflowVersion: 1,
        kind: 'photo',
        mimeType: 'image/jpeg',
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(201);

    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(response.body.data.upload.token, 'private-signed-upload-token');
    assert.equal(response.body.data.evidence.id, identifiers.evidence);
  });

  it('returns the strict evidence finalization contract after object verification', async () => {
    const response = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-finalize-1')
      .send({
        expectedWorkflowVersion: 1,
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(201);

    assert.deepEqual(response.body.data, evidenceFinalization);
    assert.equal(gateway.inspectCalls, 1);
  });

  it('removes and rejects evidence whose binary signature contradicts its media type', async () => {
    gateway.inspectionError = new ResolutionEvidenceIntegrityError(
      'verify uploaded object content type',
    );

    const response = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-finalize-signature-mismatch')
      .send({
        expectedWorkflowVersion: 1,
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(409);

    assert.equal(response.body.error.code, 'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH');
    assert.equal(gateway.inspectCalls, 1);
    assert.equal(gateway.removeCalls, 1);
    assert.deepEqual(store.failedEvidence, {
      evidenceId: identifiers.evidence,
      failureCode: 'CONTENT_TYPE_MISMATCH',
    });
  });

  it('rejects stale or expired evidence before downloading the private object', async () => {
    store.evidenceLocatorWorkflowVersion = 2;
    const staleResponse = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-finalize-stale')
      .send({
        expectedWorkflowVersion: 1,
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(409);

    assert.equal(staleResponse.body.error.code, 'COMPLAINT_WORKFLOW_VERSION_CONFLICT');
    assert.equal(gateway.inspectCalls, 0);

    store.evidenceLocatorWorkflowVersion = 1;
    store.evidenceLocatorUploadExpiresAt = '2026-07-13T09:59:59.000Z';
    const expiredResponse = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-finalize-expired')
      .send({
        expectedWorkflowVersion: 1,
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(409);

    assert.equal(expiredResponse.body.error.code, 'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED');
    assert.equal(gateway.inspectCalls, 0);
  });

  it('replays finalized evidence without downloading the private object again', async () => {
    store.evidenceLocatorUploadStatus = 'finalized';
    store.evidenceLocatorWorkflowVersion = 2;

    const response = await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/resolution-evidence/${identifiers.evidence}/finalize`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-evidence-finalize-replay')
      .send({
        expectedWorkflowVersion: 1,
        byteSize: 1_024,
        sha256: 'a'.repeat(64),
      })
      .expect(201);

    assert.deepEqual(response.body.data, evidenceFinalization);
    assert.equal(gateway.inspectCalls, 0);
  });

  it('uses the exact path-owned dependency identifier for closure', async () => {
    await request(application.getHttpServer())
      .post(
        `/api/v1/government/complaints/${identifiers.complaint}/external-dependencies/${identifiers.dependency}/resolve`,
      )
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', 'government-dependency-resolve-1')
      .send({ expectedWorkflowVersion: 1, resolutionSummary: 'Permit received.' })
      .expect(201);

    assert.deepEqual(store.lastAction, {
      kind: 'resolve_external_dependency',
      dependencyId: identifiers.dependency,
      input: { expectedWorkflowVersion: 1, resolutionSummary: 'Permit received.' },
    });
  });
});
