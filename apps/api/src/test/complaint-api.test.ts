import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  ComplaintDetail,
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  ComplaintListQuery,
  ComplaintListResult,
  ComplaintLocationCapture,
  ComplaintMedia,
  ComplaintReceipt,
  ComplaintTimeline,
  CreateComplaintDraftInput,
  CreateComplaintMediaUploadIntentInput,
  DuplicateDetectionResult,
  FinalizeComplaintMediaInput,
  RoutingResolutionResult,
  SubmitComplaintInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { ComplaintDraftsController } from '../complaints/complaint-drafts.controller.js';
import { ComplaintDraftsService } from '../complaints/complaint-drafts.service.js';
import { ComplaintDuplicatesService } from '../complaints/complaint-duplicates.service.js';
import { ComplaintMediaController } from '../complaints/complaint-media.controller.js';
import { ComplaintMediaService } from '../complaints/complaint-media.service.js';
import { ComplaintsController } from '../complaints/complaints.controller.js';
import { ComplaintsService } from '../complaints/complaints.service.js';
import { API_CONFIGURATION } from '../configuration.js';
import {
  ComplaintMediaGateway,
  type ComplaintMediaObject,
  type ComplaintMediaUploadTarget,
} from '../data/complaint-media.gateway.js';
import {
  ComplaintStore,
  type CompleteComplaintSubmissionInput,
  type ComplaintDuplicateEvidence,
  type ComplaintMediaObjectLocator,
  type ComplaintMutationIdentity,
  type ComplaintSubmissionClaim,
  type ReservedComplaintMedia,
} from '../data/complaint.store.js';
import { IdentityStore } from '../data/identity.store.js';
import { RoutingService, type ResolveRoutingCommand } from '../routing/routing.service.js';
import {
  activeProfile,
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const ids = {
  draft: '11111111-1111-4111-8111-111111111111',
  category: '22222222-2222-4222-8222-222222222222',
  media: '33333333-3333-4333-8333-333333333333',
  complaint: '44444444-4444-4444-8444-444444444444',
  location: '55555555-5555-4555-8555-555555555555',
  duplicateComplaint: '66666666-6666-4666-8666-666666666666',
  duplicateCheck: '77777777-7777-4777-8777-777777777777',
  policy: '88888888-8888-4888-8888-888888888888',
  policyVersion: '99999999-9999-4999-8999-999999999999',
  submission: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  routingDecision: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  authority: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  localBody: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  department: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  authorityDepartment: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  officerRole: '01234567-89ab-4cde-8fab-0123456789ab',
} as const;

const idempotencyKey = 'complaint-request-00000001';
const mediaSha256 = 'a'.repeat(64);
const now = '2026-07-13T10:00:00.000Z';

const locationCapture: ComplaintLocationCapture = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 8,
  capturedAt: '2026-07-13T09:59:00.000Z',
  deviceRecordedAt: '2026-07-13T09:59:01.000Z',
  provider: 'gps',
  isMockLocation: false,
};

const mediaMetadata = {
  kind: 'photo' as const,
  captureSource: 'live_camera' as const,
  mimeType: 'image/jpeg' as const,
  byteSize: 1_024,
  sha256: mediaSha256,
  capturedAt: '2026-07-13T09:59:00.000Z',
  widthPixels: 1_280,
  heightPixels: 720,
  durationMilliseconds: null,
  captureLocation: locationCapture,
};

const reservedMedia: ComplaintMedia = {
  id: ids.media,
  draftId: ids.draft,
  complaintId: null,
  uploadStatus: 'reserved',
  processingStatus: 'pending',
  moderationStatus: 'pending',
  metadata: mediaMetadata,
  createdAt: now,
  updatedAt: now,
};

const finalizedMedia: ComplaintMedia = {
  ...reservedMedia,
  uploadStatus: 'finalized',
  updatedAt: '2026-07-13T10:01:00.000Z',
};

const locationEvidence = {
  id: ids.location,
  ...locationCapture,
  verificationStatus: 'verified' as const,
  verificationScore: 0.98,
};

const draft: ComplaintDraft = {
  id: ids.draft,
  status: 'active',
  visibility: 'private',
  categoryId: ids.category,
  customAttributes: {},
  assetId: null,
  description: 'Broken streetlight beside the bus stop.',
  location: locationEvidence,
  media: [finalizedMedia],
  createdAt: now,
  updatedAt: now,
  expiresAt: '2026-08-12T10:00:00.000Z',
};

const routedResult: RoutingResolutionResult = {
  status: 'routed',
  categoryId: ids.category,
  target: {
    authorityId: ids.authority,
    localBodyId: ids.localBody,
    wardId: null,
    departmentId: ids.department,
    authorityDepartmentId: ids.authorityDepartment,
    officerRoleId: ids.officerRole,
    officerAssignmentId: null,
    assetTypeId: null,
    assetId: null,
    assetVersionId: null,
    assetMatchDistanceMeters: null,
    assetOwnershipVersionId: null,
  },
  confidence: { score: 0.95, band: 'high' },
  explanation: {
    reason: 'route_resolved',
    policyId: ids.policy,
    policyVersionId: ids.policyVersion,
    policyVersion: 1,
    jurisdictionStatus: 'resolved',
    localBodyBoundaryVersionId: ids.localBody,
    wardBoundaryVersionId: null,
    selectedRoutingRuleId: ids.routingDecision,
    selectedRoutingRuleVersionId: ids.routingDecision,
    fallbackUsed: false,
    fallbackDepth: 0,
  },
};

const receipt: ComplaintReceipt = {
  id: ids.complaint,
  complaintNumber: 'LW-2026-000001',
  status: 'submitted',
  visibility: 'private',
  categoryId: ids.category,
  submittedAt: now,
  routing: routedResult,
};

const detail: ComplaintDetail = {
  ...receipt,
  description: draft.description,
  location: locationEvidence,
  media: [finalizedMedia],
  updatedAt: now,
};

const timeline: ComplaintTimeline = {
  complaintId: ids.complaint,
  entries: [
    {
      id: ids.submission,
      complaintId: ids.complaint,
      eventType: 'submitted',
      status: 'submitted',
      title: 'Complaint submitted',
      description: null,
      occurredAt: now,
    },
  ],
};

const duplicateCheck: ComplaintDuplicateCheckResult = {
  id: ids.duplicateCheck,
  draftId: ids.draft,
  policyId: ids.policy,
  policyVersionId: ids.policyVersion,
  policyVersion: 1,
  checkedAt: now,
  suggestions: [
    {
      complaintId: ids.duplicateComplaint,
      complaintNumber: 'LW-2026-000002',
      categoryId: ids.category,
      categoryName: 'Broken streetlight',
      status: 'submitted',
      score: 0.9,
      approximateDistanceMeters: 20,
      submittedAt: '2026-07-13T09:30:00.000Z',
    },
  ],
};

interface ActorCall {
  actorUserId: string;
  resourceId?: string;
}

class FakeComplaintStore extends ComplaintStore {
  public createdDrafts: Array<{
    actorUserId: string;
    input: CreateComplaintDraftInput;
    identity: ComplaintMutationIdentity;
  }> = [];
  public getDraftCalls: ActorCall[] = [];
  public reserveMediaCalls: Array<{
    actorUserId: string;
    input: CreateComplaintMediaUploadIntentInput;
    identity: ComplaintMutationIdentity;
  }> = [];
  public getMediaCalls: ActorCall[] = [];
  public getMediaObjectCalls: ActorCall[] = [];
  public finalizedMediaCalls: Array<{
    actorUserId: string;
    mediaId: string;
    input: FinalizeComplaintMediaInput;
  }> = [];
  public duplicateEvidenceCalls: ActorCall[] = [];
  public recordedDuplicateResults: DuplicateDetectionResult[] = [];
  public claimedSubmissions: Array<{
    actorUserId: string;
    draftId: string;
    identity: ComplaintMutationIdentity;
  }> = [];
  public completedSubmissions: CompleteComplaintSubmissionInput[] = [];
  public listCalls: Array<{ actorUserId: string; query: ComplaintListQuery }> = [];
  public complaintCalls: ActorCall[] = [];
  public timelineCalls: ActorCall[] = [];
  public activeDraft: ComplaintDraft = draft;
  public activeMedia: ComplaintMedia = reservedMedia;
  public submissionClaim: ComplaintSubmissionClaim = {
    complaintId: null,
    response: null,
    routingRequestId: 'server-routing-request-0001',
    state: 'claimed',
    submissionRequestId: ids.submission,
  };

  public async createDraft(
    actorUserId: string,
    input: CreateComplaintDraftInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintDraft> {
    this.createdDrafts.push({ actorUserId, input, identity });
    return this.activeDraft;
  }

  public async getDraft(actorUserId: string, draftId: string): Promise<ComplaintDraft> {
    this.getDraftCalls.push({ actorUserId, resourceId: draftId });
    return this.activeDraft;
  }

  public async updateDraft(
    actorUserId: string,
    draftId: string,
    input: UpdateComplaintDraftInput,
  ): Promise<ComplaintDraft> {
    this.getDraftCalls.push({ actorUserId, resourceId: draftId });
    void input;
    return this.activeDraft;
  }

  public async discardDraft(actorUserId: string, draftId: string): Promise<void> {
    this.getDraftCalls.push({ actorUserId, resourceId: draftId });
  }

  public async appendLocation(
    actorUserId: string,
    draftId: string,
    input: ComplaintLocationCapture,
  ): Promise<ComplaintDraft> {
    this.getDraftCalls.push({ actorUserId, resourceId: draftId });
    return {
      ...this.activeDraft,
      location: {
        id: ids.location,
        ...input,
        verificationStatus: 'pending',
        verificationScore: null,
      },
    };
  }

  public async reserveMedia(
    actorUserId: string,
    input: CreateComplaintMediaUploadIntentInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ReservedComplaintMedia> {
    this.reserveMediaCalls.push({ actorUserId, input, identity });
    return {
      bucket: 'complaint-originals-private',
      media: this.activeMedia,
      objectPath: `${actorUserId}/${ids.draft}/${ids.media}.jpg`,
      uploadExpiresAt: '2026-07-13T12:00:00.000Z',
    };
  }

  public async getMedia(actorUserId: string, mediaId: string): Promise<ComplaintMedia> {
    this.getMediaCalls.push({ actorUserId, resourceId: mediaId });
    return this.activeMedia;
  }

  public async getMediaObject(
    actorUserId: string,
    mediaId: string,
  ): Promise<ComplaintMediaObjectLocator> {
    this.getMediaObjectCalls.push({ actorUserId, resourceId: mediaId });
    return {
      bucket: 'complaint-originals-private',
      objectPath: `${actorUserId}/${ids.draft}/${mediaId}.jpg`,
    };
  }

  public async finalizeMedia(
    actorUserId: string,
    mediaId: string,
    input: FinalizeComplaintMediaInput,
  ): Promise<ComplaintMedia> {
    this.finalizedMediaCalls.push({ actorUserId, mediaId, input });
    return finalizedMedia;
  }

  public async loadDuplicateEvidence(
    actorUserId: string,
    draftId: string,
    checkedAt: string,
  ): Promise<ComplaintDuplicateEvidence> {
    this.duplicateEvidenceCalls.push({ actorUserId, resourceId: draftId });
    assert.equal(checkedAt, now);
    return {
      input: {
        categoryId: ids.category,
        location: { latitude: 18.5204, longitude: 73.8567 },
        occurredAt: now,
        assetId: null,
        description: draft.description,
        mediaHashes: [mediaSha256],
      },
      candidates: [
        {
          complaintId: ids.duplicateComplaint,
          categoryId: ids.category,
          assetId: null,
          distanceMeters: 20,
          ageSeconds: 1_800,
          descriptionSimilarity: 0.9,
          matchingMediaHashes: 1,
        },
      ],
      policy: {
        id: ids.policy,
        versionId: ids.policyVersion,
        version: 1,
        maximumDistanceMeters: 100,
        maximumAgeSeconds: 86_400,
        minimumScore: 0.5,
        maximumResults: 5,
        weights: {
          category: 1,
          location: 1,
          time: 1,
          description: 1,
          media: 1,
          asset: 1,
        },
      },
      suggestions: [
        {
          complaintId: ids.duplicateComplaint,
          complaintNumber: 'LW-2026-000002',
          categoryId: ids.category,
          categoryName: 'Broken streetlight',
          status: 'submitted',
          submittedAt: '2026-07-13T09:30:00.000Z',
        },
      ],
    };
  }

  public async recordDuplicateCheck(
    actorUserId: string,
    draftId: string,
    result: DuplicateDetectionResult,
    evidence: ComplaintDuplicateEvidence,
    checkedAt: string,
  ): Promise<ComplaintDuplicateCheckResult> {
    this.duplicateEvidenceCalls.push({ actorUserId, resourceId: draftId });
    this.recordedDuplicateResults.push(result);
    assert.equal(evidence.suggestions[0]?.complaintId, ids.duplicateComplaint);
    assert.equal(checkedAt, now);
    return duplicateCheck;
  }

  public async claimSubmission(
    actorUserId: string,
    draftId: string,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintSubmissionClaim> {
    this.claimedSubmissions.push({ actorUserId, draftId, identity });
    return this.submissionClaim;
  }

  public async completeSubmission(
    input: CompleteComplaintSubmissionInput,
  ): Promise<ComplaintReceipt> {
    this.completedSubmissions.push(input);
    return receipt;
  }

  public async listComplaints(
    actorUserId: string,
    query: ComplaintListQuery,
  ): Promise<ComplaintListResult> {
    this.listCalls.push({ actorUserId, query });
    return {
      items: [
        {
          id: ids.complaint,
          complaintNumber: receipt.complaintNumber,
          categoryId: ids.category,
          categoryName: 'Broken streetlight',
          status: 'submitted',
          visibility: 'private',
          submittedAt: now,
          updatedAt: now,
        },
      ],
      nextCursor: null,
      hasMore: false,
    };
  }

  public async getComplaint(actorUserId: string, complaintId: string): Promise<ComplaintDetail> {
    this.complaintCalls.push({ actorUserId, resourceId: complaintId });
    return detail;
  }

  public async getTimeline(actorUserId: string, complaintId: string): Promise<ComplaintTimeline> {
    this.timelineCalls.push({ actorUserId, resourceId: complaintId });
    return timeline;
  }
}

class FakeComplaintMediaGateway extends ComplaintMediaGateway {
  public uploadTargetCalls: Array<{ bucket: string; objectPath: string }> = [];
  public inspectCalls: Array<{ bucket: string; objectPath: string }> = [];
  public removedObjects: Array<{ bucket: string; objectPath: string }> = [];
  public object: ComplaintMediaObject = {
    byteSize: mediaMetadata.byteSize,
    mimeType: mediaMetadata.mimeType,
    sha256: mediaMetadata.sha256,
  };

  public async createSignedUploadTarget(
    bucket: string,
    objectPath: string,
  ): Promise<ComplaintMediaUploadTarget> {
    this.uploadTargetCalls.push({ bucket, objectPath });
    return { objectPath, token: 'private-one-time-upload-token' };
  }

  public async inspectObject(bucket: string, objectPath: string): Promise<ComplaintMediaObject> {
    this.inspectCalls.push({ bucket, objectPath });
    return this.object;
  }

  public async removeObject(bucket: string, objectPath: string): Promise<void> {
    this.removedObjects.push({ bucket, objectPath });
  }
}

class FakeComplaintRoutingService {
  public commands: ResolveRoutingCommand[] = [];
  public result: RoutingResolutionResult = routedResult;

  public async resolveStoredRouting(command: ResolveRoutingCommand) {
    this.commands.push(command);
    return { decisionId: ids.routingDecision, result: this.result };
  }
}

const mediaUploadInput: CreateComplaintMediaUploadIntentInput = {
  draftId: ids.draft,
  kind: 'photo',
  captureSource: 'live_camera',
  mimeType: 'image/jpeg',
  byteSize: mediaMetadata.byteSize,
  sha256: mediaSha256,
  capturedAt: mediaMetadata.capturedAt ?? now,
  widthPixels: mediaMetadata.widthPixels ?? undefined,
  heightPixels: mediaMetadata.heightPixels ?? undefined,
  captureLocation: locationCapture,
};

describe('API complaint capture contract', () => {
  let application: INestApplication;
  let complaintStore: FakeComplaintStore;
  let mediaGateway: FakeComplaintMediaGateway;
  let routingService: FakeComplaintRoutingService;

  beforeEach(async () => {
    complaintStore = new FakeComplaintStore();
    mediaGateway = new FakeComplaintMediaGateway();
    routingService = new FakeComplaintRoutingService();

    const testingModule = await Test.createTestingModule({
      controllers: [ComplaintDraftsController, ComplaintMediaController, ComplaintsController],
      providers: [
        ComplaintDraftsService,
        ComplaintDuplicatesService,
        ComplaintMediaService,
        ComplaintsService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: ComplaintStore, useValue: complaintStore },
        { provide: ComplaintMediaGateway, useValue: mediaGateway },
        { provide: RoutingService, useValue: routingService },
        { provide: IdentityStore, useValue: new FakeIdentityStore() },
        { provide: AuthenticationGateway, useValue: new FakeAuthenticationGateway() },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('requires authentication for draft, media, duplicate, submission, and history resources', async () => {
    await request(application.getHttpServer())
      .post('/api/v1/complaints/drafts')
      .send({})
      .expect(401);
    await request(application.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .send({})
      .expect(401);
    await request(application.getHttpServer())
      .post(`/api/v1/complaints/drafts/${ids.draft}/duplicate-check`)
      .expect(401);
    await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .send({})
      .expect(401);
    await request(application.getHttpServer()).get('/api/v1/complaints').expect(401);

    assert.equal(complaintStore.createdDrafts.length, 0);
    assert.equal(complaintStore.reserveMediaCalls.length, 0);
    assert.equal(complaintStore.claimedSubmissions.length, 0);
  });

  it('rejects mass assignment fields before complaint persistence', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/complaints/drafts')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send({
        categoryId: ids.category,
        status: 'submitted',
        visibility: 'public',
        actorUserId: ids.complaint,
        routingDecisionId: ids.routingDecision,
      })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.equal(complaintStore.createdDrafts.length, 0);
  });

  it('requires idempotency keys for draft, upload-intent, and submission creation', async () => {
    const draftResponse = await request(application.getHttpServer())
      .post('/api/v1/complaints/drafts')
      .set('authorization', 'Bearer valid-access-token')
      .send({ categoryId: ids.category })
      .expect(400);
    const mediaResponse = await request(application.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .set('authorization', 'Bearer valid-access-token')
      .send(mediaUploadInput)
      .expect(400);
    const submissionResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .set('authorization', 'Bearer valid-access-token')
      .send({})
      .expect(400);

    assert.equal(draftResponse.body.error.code, 'VALIDATION_ERROR');
    assert.equal(mediaResponse.body.error.code, 'VALIDATION_ERROR');
    assert.equal(submissionResponse.body.error.code, 'VALIDATION_ERROR');
    assert.equal(complaintStore.createdDrafts.length, 0);
    assert.equal(complaintStore.reserveMediaCalls.length, 0);
    assert.equal(complaintStore.claimedSubmissions.length, 0);
  });

  it('passes a stable replay identity to draft persistence without exposing the raw key', async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(application.getHttpServer())
        .post('/api/v1/complaints/drafts')
        .set('authorization', 'Bearer valid-access-token')
        .set('idempotency-key', idempotencyKey)
        .send({
          categoryId: ids.category,
          customAttributes: { hazard_level: 'high' },
          description: 'Broken streetlight',
        })
        .expect(201);
    }

    assert.equal(complaintStore.createdDrafts.length, 2);
    assert.deepEqual(
      complaintStore.createdDrafts.map(({ actorUserId }) => actorUserId),
      [activeProfile.id, activeProfile.id],
    );
    assert.deepEqual(complaintStore.createdDrafts[0]?.input.customAttributes, {
      hazard_level: 'high',
    });
    assert.deepEqual(
      complaintStore.createdDrafts[0]?.identity,
      complaintStore.createdDrafts[1]?.identity,
    );
    assert.match(
      complaintStore.createdDrafts[0]?.identity.idempotencyKeyHash ?? '',
      /^[0-9a-f]{64}$/u,
    );
    assert.match(
      complaintStore.createdDrafts[0]?.identity.requestFingerprint ?? '',
      /^[0-9a-f]{64}$/u,
    );
    assert.equal(JSON.stringify(complaintStore.createdDrafts).includes(idempotencyKey), false);
  });

  it('rejects complaint location accuracy above the 50 metre V1 limit', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/complaints/drafts')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send({
        categoryId: ids.category,
        location: { ...locationCapture, accuracyMeters: 50.01 },
      })
      .expect(400);

    assert.equal(response.body.error.code, 'LOCATION_LOW_ACCURACY');
    assert.equal(complaintStore.createdDrafts.length, 0);
  });

  it('delegates draft ownership checks to the store using the authenticated actor', async () => {
    await request(application.getHttpServer())
      .get(`/api/v1/complaints/drafts/${ids.draft}`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(complaintStore.getDraftCalls, [
      { actorUserId: activeProfile.id, resourceId: ids.draft },
    ]);
  });

  it('returns only the server-reserved private signed upload target', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send(mediaUploadInput)
      .expect(201);

    const expectedObjectPath = `${activeProfile.id}/${ids.draft}/${ids.media}.jpg`;
    assert.equal(response.body.data.upload.bucket, 'complaint-originals-private');
    assert.equal(response.body.data.upload.objectPath, expectedObjectPath);
    assert.equal(response.body.data.upload.token, 'private-one-time-upload-token');
    assert.deepEqual(mediaGateway.uploadTargetCalls, [
      { bucket: 'complaint-originals-private', objectPath: expectedObjectPath },
    ]);
    assert.equal(complaintStore.reserveMediaCalls[0]?.actorUserId, activeProfile.id);
    assert.equal(JSON.stringify(complaintStore.reserveMediaCalls).includes(idempotencyKey), false);
  });

  it('finalizes media only after checking the stored object checksum, size, and MIME type', async () => {
    const response = await request(application.getHttpServer())
      .post(`/api/v1/media/${ids.media}/finalize`)
      .set('authorization', 'Bearer valid-access-token')
      .send({ byteSize: mediaMetadata.byteSize, sha256: mediaSha256 })
      .expect(201);

    assert.equal(response.body.data.uploadStatus, 'finalized');
    assert.equal(mediaGateway.inspectCalls.length, 1);
    assert.equal(mediaGateway.removedObjects.length, 0);
    assert.deepEqual(complaintStore.finalizedMediaCalls, [
      {
        actorUserId: activeProfile.id,
        mediaId: ids.media,
        input: { byteSize: mediaMetadata.byteSize, sha256: mediaSha256 },
      },
    ]);
  });

  it('removes an uploaded object when its checksum, size, or MIME type differs from the reservation', async () => {
    const mismatches: Array<{ label: string; object: ComplaintMediaObject }> = [
      { label: 'checksum', object: { ...mediaGateway.object, sha256: 'b'.repeat(64) } },
      { label: 'size', object: { ...mediaGateway.object, byteSize: 1_025 } },
      { label: 'MIME type', object: { ...mediaGateway.object, mimeType: 'image/png' } },
    ];

    for (const mismatch of mismatches) {
      mediaGateway.object = mismatch.object;
      mediaGateway.removedObjects = [];
      complaintStore.finalizedMediaCalls = [];

      const response = await request(application.getHttpServer())
        .post(`/api/v1/media/${ids.media}/finalize`)
        .set('authorization', 'Bearer valid-access-token')
        .send({ byteSize: mediaMetadata.byteSize, sha256: mediaSha256 })
        .expect(409);

      assert.equal(response.body.error.code, 'MEDIA_INTEGRITY_MISMATCH', mismatch.label);
      assert.equal(mediaGateway.removedObjects.length, 1, mismatch.label);
      assert.equal(complaintStore.finalizedMediaCalls.length, 0, mismatch.label);
    }
  });

  it('records deterministic duplicate evidence while returning only privacy-safe suggestions', async () => {
    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/drafts/${ids.draft}/duplicate-check`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(201);

    assert.equal(complaintStore.recordedDuplicateResults.length, 1);
    assert.equal(
      complaintStore.recordedDuplicateResults[0]?.matches[0]?.complaintId,
      ids.duplicateComplaint,
    );
    assert.equal(response.body.data.suggestions[0].complaintId, ids.duplicateComplaint);
    assert.equal(response.body.data.suggestions[0].approximateDistanceMeters, 20);
    const serialized = JSON.stringify(response.body.data);
    assert.equal(serialized.includes('latitude'), false);
    assert.equal(serialized.includes('longitude'), false);
    assert.equal(serialized.includes('descriptionSimilarity'), false);
    assert.equal(serialized.includes('matchingMediaHashes'), false);
    assert.equal(serialized.includes('factors'), false);
  });

  it('submits only a routed decision and persists duplicate and emergency acknowledgements', async () => {
    const input: SubmitComplaintInput = {
      acknowledgedDuplicateSuggestionIds: [ids.duplicateComplaint],
      emergencyDisclaimerAcknowledged: true,
    };
    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send(input)
      .expect(201);

    assert.equal(response.body.data.id, ids.complaint);
    assert.equal(routingService.commands.length, 1);
    assert.equal(routingService.commands[0]?.idempotencyKey, 'server-routing-request-0001');
    assert.equal(routingService.commands[0]?.actor.id, activeProfile.id);
    assert.deepEqual(complaintStore.completedSubmissions, [
      {
        acknowledgedDuplicateSuggestionIds: [ids.duplicateComplaint],
        actorUserId: activeProfile.id,
        categoryId: ids.category,
        emergencyDisclaimerAcknowledged: true,
        routing: routedResult,
        routingDecisionId: ids.routingDecision,
        submissionRequestId: ids.submission,
      },
    ]);
    assert.equal(JSON.stringify(complaintStore.claimedSubmissions).includes(idempotencyKey), false);
  });

  it('returns a stored receipt for an idempotent replay without routing or resubmitting', async () => {
    complaintStore.submissionClaim = {
      complaintId: ids.complaint,
      response: receipt,
      routingRequestId: 'server-routing-request-0001',
      state: 'completed',
      submissionRequestId: ids.submission,
    };

    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send({})
      .expect(201);

    assert.deepEqual(response.body.data, receipt);
    assert.equal(complaintStore.getDraftCalls.length, 0);
    assert.equal(routingService.commands.length, 0);
    assert.equal(complaintStore.completedSubmissions.length, 0);
  });

  it('rejects unsupported locations with a safe error and never creates a complaint', async () => {
    routingService.result = {
      ...routedResult,
      status: 'unsupported_area',
      target: null,
      confidence: { score: 0, band: 'none' },
      explanation: {
        ...routedResult.explanation,
        reason: 'no_verified_jurisdiction_match',
        policyId: null,
        policyVersionId: null,
        policyVersion: null,
        jurisdictionStatus: 'unsupported',
      },
    };

    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send({})
      .expect(422);

    assert.equal(response.body.error.code, 'COMPLAINT_UNSUPPORTED_AREA');
    assert.equal(
      response.body.error.message,
      'This location is outside the currently verified service area.',
    );
    assert.equal(JSON.stringify(response.body).includes('routingDecisionId'), false);
    assert.equal(complaintStore.completedSubmissions.length, 0);
  });

  it('does not submit a complaint when routing requires review', async () => {
    routingService.result = {
      ...routedResult,
      status: 'manual_review',
      target: null,
      confidence: { score: 0.6, band: 'medium' },
    };

    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${ids.draft}/submit`)
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', idempotencyKey)
      .send({})
      .expect(503);

    assert.equal(response.body.error.code, 'COMPLAINT_ROUTE_UNAVAILABLE');
    assert.equal(
      response.body.error.message,
      'A verified complaint route is not currently available for this location and category.',
    );
    assert.equal(complaintStore.completedSubmissions.length, 0);
  });

  it('lists, reads, and returns timeline data through actor-scoped store calls', async () => {
    const listResponse = await request(application.getHttpServer())
      .get('/api/v1/complaints?limit=10')
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);
    const detailResponse = await request(application.getHttpServer())
      .get(`/api/v1/complaints/${ids.complaint}`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);
    const timelineResponse = await request(application.getHttpServer())
      .get(`/api/v1/complaints/${ids.complaint}/timeline`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.equal(listResponse.body.data.items[0].visibility, 'private');
    assert.equal(detailResponse.body.data.id, ids.complaint);
    assert.deepEqual(timelineResponse.body.data, timeline);
    assert.deepEqual(complaintStore.listCalls, [
      { actorUserId: activeProfile.id, query: { limit: 10 } },
    ]);
    assert.deepEqual(complaintStore.complaintCalls, [
      { actorUserId: activeProfile.id, resourceId: ids.complaint },
    ]);
    assert.deepEqual(complaintStore.timelineCalls, [
      { actorUserId: activeProfile.id, resourceId: ids.complaint },
    ]);
  });
});
