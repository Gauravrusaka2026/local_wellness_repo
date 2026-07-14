import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import type {
  ComplaintLocationCapture,
  CreateComplaintMediaUploadIntentInput,
  DuplicateDetectionResult,
  JurisdictionResolution,
  RoutingCategory,
  RoutingDecision,
  RoutingResolutionInput,
} from '@local-wellness/types';
import type { JurisdictionResolutionQuery, RoutingContext } from '@local-wellness/routing-engine';

import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { ComplaintDataAccessError, ComplaintNotFoundError } from '../data/complaint.store.js';
import {
  RoutingStore,
  type RecordRoutingDecisionInput,
  type RecordedRoutingDecision,
} from '../data/routing.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseComplaintStore } from '../supabase/supabase-complaint.store.js';

const ids = {
  actor: '10000000-0000-4000-8000-000000000001',
  draft: '10000000-0000-4000-8000-000000000002',
  location: '10000000-0000-4000-8000-000000000003',
  media: '10000000-0000-4000-8000-000000000004',
  clientMedia: '10000000-0000-4000-8000-000000000005',
  category: '20000000-0000-4000-8000-000000000001',
  complaint: '20000000-0000-4000-8000-000000000002',
  secondComplaint: '20000000-0000-4000-8000-000000000003',
  duplicateRun: '20000000-0000-4000-8000-000000000004',
  policy: '30000000-0000-4000-8000-000000000001',
  policyVersion: '30000000-0000-4000-8000-000000000002',
  submission: '30000000-0000-4000-8000-000000000003',
  decision: '40000000-0000-4000-8000-000000000001',
  assignment: '40000000-0000-4000-8000-000000000002',
  authority: '50000000-0000-4000-8000-000000000001',
  localBody: '50000000-0000-4000-8000-000000000002',
  boundary: '50000000-0000-4000-8000-000000000003',
  department: '60000000-0000-4000-8000-000000000001',
  authorityDepartment: '60000000-0000-4000-8000-000000000002',
  officerRole: '60000000-0000-4000-8000-000000000003',
  rule: '70000000-0000-4000-8000-000000000001',
  ruleVersion: '70000000-0000-4000-8000-000000000002',
  timeline: '80000000-0000-4000-8000-000000000001',
} as const;

const timestamps = {
  captured: '2026-07-14T04:25:00.000Z',
  created: '2026-07-14T04:26:00.000Z',
  expires: '2026-08-13T04:26:00.000Z',
  finalized: '2026-07-14T04:28:00.000Z',
  submitted: '2026-07-14T04:30:00.000Z',
  updated: '2026-07-14T04:31:00.000Z',
  uploadExpires: '2026-07-14T04:41:00.000Z',
} as const;

const sha256 = 'a'.repeat(64);

const locationCapture: ComplaintLocationCapture = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 8,
  capturedAt: timestamps.captured,
  deviceRecordedAt: '2026-07-14T04:25:01.000Z',
  provider: 'gps',
  isMockLocation: false,
};

const draftRow = {
  draft_id: ids.draft,
  category_id: ids.category,
  asset_id: null,
  description: 'Broken streetlight near a bus stop.',
  description_language: 'en',
  custom_attributes: {},
  selected_location_evidence_id: ids.location,
  status: 'active',
  revision: 2,
  expires_at: timestamps.expires,
  created_at: timestamps.created,
  updated_at: timestamps.updated,
} as const;

const locationRow = {
  location_evidence_id: ids.location,
  evidence_type: 'current_location',
  longitude: locationCapture.longitude,
  latitude: locationCapture.latitude,
  accuracy_meters: locationCapture.accuracyMeters,
  provider: locationCapture.provider,
  captured_at: locationCapture.capturedAt,
  device_recorded_at: locationCapture.deviceRecordedAt,
  received_at: timestamps.created,
  mock_location_detected: locationCapture.isMockLocation,
  spoof_risk_status: 'low',
  verification_status: 'verified',
  verification_score: 0.98,
  created_at: timestamps.created,
} as const;

const mediaRow = {
  media_id: ids.media,
  draft_id: ids.draft,
  complaint_id: null,
  client_media_id: ids.clientMedia,
  media_kind: 'photo',
  capture_source: 'live_camera',
  bucket_id: 'complaint-originals-private',
  object_path: `${ids.actor}/${ids.draft}/${ids.media}/original`,
  declared_mime_type: 'image/jpeg',
  declared_byte_size: 1_024,
  client_sha256: sha256,
  width_pixels: 1_280,
  height_pixels: 720,
  duration_seconds: null,
  capture_location_evidence_id: ids.location,
  captured_at: timestamps.captured,
  distance_to_complaint_meters: null,
  upload_status: 'finalized',
  processing_status: 'pending',
  moderation_status: 'pending',
  upload_expires_at: timestamps.uploadExpires,
  finalized_at: timestamps.finalized,
  created_at: timestamps.created,
  updated_at: timestamps.updated,
} as const;

const mediaIntentRow = {
  media_id: ids.media,
  draft_id: ids.draft,
  bucket_id: mediaRow.bucket_id,
  object_path: mediaRow.object_path,
  declared_mime_type: mediaRow.declared_mime_type,
  declared_byte_size: mediaRow.declared_byte_size,
  client_sha256: mediaRow.client_sha256,
  width_pixels: mediaRow.width_pixels,
  height_pixels: mediaRow.height_pixels,
  duration_seconds: mediaRow.duration_seconds,
  upload_status: mediaRow.upload_status,
  upload_expires_at: mediaRow.upload_expires_at,
  finalized_at: mediaRow.finalized_at,
} as const;

const routingTarget = {
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
} as const;

const routingDecision: RoutingDecision = {
  status: 'routed',
  categoryId: ids.category,
  target: routingTarget,
  routingRuleId: ids.rule,
  routingRuleVersionId: ids.ruleVersion,
  confidence: {
    score: 0.95,
    band: 'high',
    factors: [
      {
        code: 'verified_mapping',
        matched: true,
        required: true,
        weight: 1,
        contribution: 1,
        explanation: 'Verified mapping matched.',
      },
    ],
  },
  explanation: {
    reason: 'route_resolved',
    policyId: ids.policy,
    policyVersionId: ids.policyVersion,
    policyVersion: 1,
    jurisdiction: {
      status: 'resolved',
      reason: 'verified_boundary_match',
      matches: [
        {
          stateId: ids.authority,
          districtId: null,
          talukaId: null,
          localBodyId: ids.localBody,
          wardId: null,
          stateBoundaryVersionId: null,
          districtBoundaryVersionId: null,
          talukaBoundaryVersionId: null,
          localBodyBoundaryVersionId: ids.boundary,
          wardBoundaryVersionId: null,
          evidence: [],
        },
      ],
    },
    selectedCandidateId: 'candidate:verified',
    selectedRoutingRuleId: ids.rule,
    selectedRoutingRuleVersionId: ids.ruleVersion,
    fallbackUsed: false,
    fallbackPath: [],
    ambiguousCandidateIds: [],
    candidateEvaluations: [],
  },
};

const recordedRoutingDecision: RecordedRoutingDecision = {
  id: ids.decision,
  actorUserId: ids.actor,
  requestId: `complaint-submit:${ids.submission}`,
  locationEvidence: {
    latitude: locationCapture.latitude,
    longitude: locationCapture.longitude,
    accuracyMeters: locationCapture.accuracyMeters,
    capturedAt: locationCapture.capturedAt,
  },
  routingInput: {
    categoryId: ids.category,
    location: {
      latitude: locationCapture.latitude,
      longitude: locationCapture.longitude,
    },
    accuracyMeters: locationCapture.accuracyMeters,
    assetId: null,
    resolvedAt: timestamps.submitted,
  },
  decision: routingDecision,
};

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

class FakeRoutingStore extends RoutingStore {
  public async discoverRoutingAssets(): Promise<never[]> {
    throw new Error('Unexpected routing asset discovery.');
  }

  public replay: RecordedRoutingDecision | null = recordedRoutingDecision;
  public replayCalls: Array<{ actorUserId: string; requestId: string }> = [];

  public async findRecordedRoutingDecision(
    actorUserId: string,
    requestId: string,
  ): Promise<RecordedRoutingDecision | null> {
    this.replayCalls.push({ actorUserId, requestId });
    return this.replay?.actorUserId === actorUserId && this.replay.requestId === requestId
      ? this.replay
      : null;
  }

  public async findRoutingCategory(): Promise<RoutingCategory | null> {
    throw new Error('Unexpected routing category read.');
  }

  public async listRoutingCategories(): Promise<RoutingCategory[]> {
    throw new Error('Unexpected routing category list.');
  }

  public async loadRoutingContext(
    input: RoutingResolutionInput,
    jurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext> {
    void input;
    void jurisdiction;
    throw new Error('Unexpected routing context read.');
  }

  public async recordRoutingDecision(input: RecordRoutingDecisionInput): Promise<string> {
    void input;
    throw new Error('Unexpected routing decision write.');
  }

  public async resolveJurisdiction(
    query: JurisdictionResolutionQuery,
  ): Promise<JurisdictionResolution> {
    void query;
    throw new Error('Unexpected jurisdiction resolution.');
  }
}

const createStore = (
  rpc: RpcHandler,
  routingStore = new FakeRoutingStore(),
): { routingStore: FakeRoutingStore; store: SupabaseComplaintStore } => {
  const clients = {
    publicClient: {
      rpc: () => {
        throw new Error('The public client must not be used for complaint persistence.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients;

  return { routingStore, store: new SupabaseComplaintStore(clients, routingStore) };
};

const standardDraftRpc = async (
  functionName: string,
  arguments_: Record<string, unknown>,
): Promise<Readonly<{ data: unknown; error: unknown }>> => {
  void arguments_;
  switch (functionName) {
    case 'get_complaint_draft':
      return { data: [draftRow], error: null };
    case 'list_complaint_location_evidence':
      return { data: [locationRow], error: null };
    case 'list_complaint_media':
      return { data: [mediaRow], error: null };
    default:
      throw new Error(`Unexpected RPC: ${functionName}`);
  }
};

describe('Supabase complaint store drafts and media', () => {
  it('creates a draft, appends location evidence, and never forwards a raw idempotency key', async () => {
    const rawKey = 'raw-complaint-key-000001';
    const input = {
      categoryId: ids.category,
      description: draftRow.description,
      location: locationCapture,
    };
    const identity = createComplaintMutationIdentity(rawKey, 'create-complaint-draft', input);
    const calls: RpcCall[] = [];
    let draftReadCount = 0;
    let locationListCount = 0;
    const { store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      switch (functionName) {
        case 'create_complaint_draft':
          return {
            data: [
              {
                draft_id: ids.draft,
                status: 'active',
                revision: 1,
                created_at: timestamps.created,
                replayed: false,
              },
            ],
            error: null,
          };
        case 'get_complaint_draft': {
          draftReadCount += 1;
          return {
            data: [
              {
                ...draftRow,
                revision: draftReadCount === 3 ? 2 : 1,
                selected_location_evidence_id: draftReadCount === 3 ? ids.location : null,
              },
            ],
            error: null,
          };
        }
        case 'list_complaint_location_evidence':
          locationListCount += 1;
          return { data: locationListCount === 2 ? [locationRow] : [], error: null };
        case 'list_complaint_media':
          return { data: [], error: null };
        case 'append_complaint_location_evidence':
          return { data: ids.location, error: null };
        case 'update_complaint_draft':
          return {
            data: [
              {
                draft_id: ids.draft,
                status: 'active',
                revision: 2,
                updated_at: timestamps.updated,
              },
            ],
            error: null,
          };
        default:
          throw new Error(`Unexpected RPC: ${functionName}`);
      }
    });

    const created = await store.createDraft(ids.actor, input, identity);

    assert.equal(created.id, ids.draft);
    assert.equal(created.visibility, 'private');
    assert.deepEqual(created.location, {
      id: ids.location,
      latitude: locationCapture.latitude,
      longitude: locationCapture.longitude,
      accuracyMeters: locationCapture.accuracyMeters,
      capturedAt: locationCapture.capturedAt,
      deviceRecordedAt: locationCapture.deviceRecordedAt,
      provider: locationCapture.provider,
      isMockLocation: locationCapture.isMockLocation,
      verificationStatus: 'verified',
      verificationScore: 0.98,
    });
    const createCall = calls.find((call) => call.functionName === 'create_complaint_draft');
    assert.equal(createCall?.arguments_['p_idempotency_key_hash'], identity.idempotencyKeyHash);
    assert.equal(createCall?.arguments_['p_request_fingerprint'], identity.requestFingerprint);
    assert.equal(JSON.stringify(calls).includes(rawKey), false);
    const locationCall = calls.find(
      (call) => call.functionName === 'append_complaint_location_evidence',
    );
    assert.equal(locationCall?.arguments_['p_longitude'], locationCapture.longitude);
    assert.equal(locationCall?.arguments_['p_latitude'], locationCapture.latitude);
    assert.equal(locationCall?.arguments_['p_evidence_type'], 'current_location');
  });

  it('uses deterministic media identity, a private locator, and verified finalization arguments', async () => {
    const rawKey = 'raw-media-key-000000001';
    const input: CreateComplaintMediaUploadIntentInput = {
      draftId: ids.draft,
      kind: 'photo',
      captureSource: 'live_camera',
      mimeType: 'image/jpeg',
      byteSize: mediaRow.declared_byte_size,
      sha256,
      capturedAt: timestamps.captured,
      widthPixels: mediaRow.width_pixels,
      heightPixels: mediaRow.height_pixels,
    };
    const identity = createComplaintMutationIdentity(rawKey, 'create-media-upload-intent', input);
    const calls: RpcCall[] = [];
    let finalized = false;
    const { store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      switch (functionName) {
        case 'reserve_complaint_media':
          return {
            data: [
              {
                media_id: ids.media,
                bucket_id: mediaRow.bucket_id,
                object_path: mediaRow.object_path,
                upload_status: 'reserved',
                upload_expires_at: timestamps.uploadExpires,
                replayed: false,
              },
            ],
            error: null,
          };
        case 'get_complaint_media_intent':
          return {
            data: [
              {
                ...mediaIntentRow,
                upload_status: finalized ? 'finalized' : 'reserved',
                finalized_at: finalized ? timestamps.finalized : null,
              },
            ],
            error: null,
          };
        case 'list_complaint_location_evidence':
          return { data: [locationRow], error: null };
        case 'list_complaint_media':
          return {
            data: [
              {
                ...mediaRow,
                upload_status: finalized ? 'finalized' : 'reserved',
                finalized_at: finalized ? timestamps.finalized : null,
              },
            ],
            error: null,
          };
        case 'finalize_complaint_media':
          finalized = true;
          return {
            data: [
              {
                media_id: ids.media,
                upload_status: 'finalized',
                processing_status: 'pending',
                moderation_status: 'pending',
                finalized_at: timestamps.finalized,
                replayed: false,
              },
            ],
            error: null,
          };
        default:
          throw new Error(`Unexpected RPC: ${functionName}`);
      }
    });

    const reserved = await store.reserveMedia(ids.actor, input, identity);
    const locator = await store.getMediaObject(ids.actor, ids.media);
    const result = await store.finalizeMedia(ids.actor, ids.media, {
      byteSize: mediaRow.declared_byte_size,
      sha256,
    });

    assert.equal(reserved.bucket, 'complaint-originals-private');
    assert.equal(reserved.objectPath, mediaRow.object_path);
    assert.deepEqual(locator, {
      bucket: 'complaint-originals-private',
      objectPath: mediaRow.object_path,
    });
    assert.equal(result.uploadStatus, 'finalized');
    const reserveCall = calls.find((call) => call.functionName === 'reserve_complaint_media');
    const expectedClientMediaId = (() => {
      const characters = identity.idempotencyKeyHash.slice(0, 32).split('');
      characters[12] = '4';
      const variant = Number.parseInt(characters[16] ?? '0', 16);
      characters[16] = ((variant & 0x3) | 0x8).toString(16);
      const value = characters.join('');
      return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
    })();
    assert.equal(reserveCall?.arguments_['p_client_media_id'], expectedClientMediaId);
    assert.equal(JSON.stringify(calls).includes(rawKey), false);
    const finalizeCall = calls.find((call) => call.functionName === 'finalize_complaint_media');
    assert.deepEqual(finalizeCall?.arguments_, {
      p_actor_user_id: ids.actor,
      p_media_id: ids.media,
      p_observed_mime_type: 'image/jpeg',
      p_observed_byte_size: 1_024,
      p_verified_sha256: sha256,
    });
  });

  it('rejects malformed strict RPC rows with a safe data-access error', async () => {
    const { store } = createStore(async (functionName) => {
      assert.equal(functionName, 'get_complaint_draft');
      return { data: [{ ...draftRow, unexpected_private_column: 'secret' }], error: null };
    });

    await assert.rejects(store.getDraft(ids.actor, ids.draft), (error: unknown) => {
      assert.ok(error instanceof ComplaintDataAccessError);
      assert.equal(error.message, 'Complaint persistence operation failed: get complaint draft.');
      assert.equal(error.message.includes('unexpected_private_column'), false);
      return true;
    });
  });

  it('treats an empty actor-scoped result as not found without a broader lookup', async () => {
    const calls: RpcCall[] = [];
    const { store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      assert.equal(functionName, 'get_complaint_draft');
      return { data: [], error: null };
    });

    await assert.rejects(store.getDraft(ids.actor, ids.draft), (error: unknown) => {
      assert.ok(error instanceof ComplaintNotFoundError);
      assert.equal(error.resource, 'draft');
      return true;
    });
    assert.deepEqual(calls, [
      {
        functionName: 'get_complaint_draft',
        arguments_: { p_actor_user_id: ids.actor, p_draft_id: ids.draft },
      },
    ]);
  });
});

const duplicateCandidateRow = {
  policy_id: ids.policy,
  policy_version_id: ids.policyVersion,
  policy_version: 1,
  maximum_distance_meters: 100,
  maximum_age_seconds: 86_400,
  minimum_score: 0.6,
  maximum_results: 5,
  weights: {
    category: 1,
    location: 1,
    time: 1,
    description: 1,
    media: 1,
    asset: 1,
  },
  candidate_complaint_id: ids.secondComplaint,
  complaint_number: 'LW-20260714-00000002',
  category_id: ids.category,
  category_name: 'Broken streetlight',
  asset_id: null,
  public_status: 'submitted',
  candidate_submitted_at: '2026-07-14T04:00:00.000Z',
  distance_meters: 20,
  age_seconds: 1_800,
  description_similarity: 0.9,
  matching_media_hashes: 1,
} as const;

describe('Supabase complaint store duplicate detection', () => {
  it('decodes policy and candidates and records a privacy-safe public result', async () => {
    const checkedAt = timestamps.submitted;
    const calls: RpcCall[] = [];
    const { store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      if (functionName === 'find_complaint_duplicate_candidates') {
        return { data: [duplicateCandidateRow], error: null };
      }
      if (functionName === 'record_complaint_duplicate_check') {
        return { data: ids.duplicateRun, error: null };
      }
      return standardDraftRpc(functionName, arguments_);
    });

    const evidence = await store.loadDuplicateEvidence(ids.actor, ids.draft, checkedAt);
    assert.equal(evidence.policy.versionId, ids.policyVersion);
    assert.deepEqual(evidence.input.mediaHashes, [sha256]);
    assert.deepEqual(evidence.candidates, [
      {
        complaintId: ids.secondComplaint,
        categoryId: ids.category,
        assetId: null,
        distanceMeters: 20,
        ageSeconds: 1_800,
        descriptionSimilarity: 0.9,
        matchingMediaHashes: 1,
      },
    ]);

    const result: DuplicateDetectionResult = {
      policyId: ids.policy,
      policyVersionId: ids.policyVersion,
      policyVersion: 1,
      matches: [
        {
          complaintId: ids.secondComplaint,
          score: 0.9,
          distanceMeters: 20,
          factors: [
            {
              code: 'category',
              similarity: 1,
              weight: 1,
              contribution: 1,
            },
          ],
        },
      ],
    };
    const recorded = await store.recordDuplicateCheck(
      ids.actor,
      ids.draft,
      result,
      evidence,
      checkedAt,
    );

    assert.deepEqual(recorded.suggestions, [
      {
        complaintId: ids.secondComplaint,
        complaintNumber: duplicateCandidateRow.complaint_number,
        categoryId: ids.category,
        categoryName: duplicateCandidateRow.category_name,
        status: 'submitted',
        submittedAt: duplicateCandidateRow.candidate_submitted_at,
        score: 0.9,
        approximateDistanceMeters: 20,
      },
    ]);
    const serialized = JSON.stringify(recorded);
    assert.equal(serialized.includes('latitude'), false);
    assert.equal(serialized.includes('longitude'), false);
    assert.equal(serialized.includes('descriptionSimilarity'), false);
    assert.equal(serialized.includes('matchingMediaHashes'), false);
    assert.equal(serialized.includes('factors'), false);

    const recordCall = calls.find(
      (call) => call.functionName === 'record_complaint_duplicate_check',
    );
    assert.match(String(recordCall?.arguments_['p_request_id']), /^duplicate-check:[0-9a-f]{32}$/u);
    assert.match(String(recordCall?.arguments_['p_result_fingerprint']), /^[0-9a-f]{64}$/u);
    assert.deepEqual(recordCall?.arguments_['p_matches'], [
      {
        candidateComplaintId: ids.secondComplaint,
        score: 0.9,
        distanceMeters: 20,
        ageSeconds: 1_800,
        factors: result.matches[0]?.factors,
      },
    ]);
  });

  it('accepts the policy-only left-join sentinel when no duplicate candidate exists', async () => {
    const emptyCandidate = {
      ...duplicateCandidateRow,
      candidate_complaint_id: null,
      complaint_number: null,
      category_id: null,
      category_name: null,
      asset_id: null,
      public_status: null,
      candidate_submitted_at: null,
      distance_meters: null,
      age_seconds: null,
      description_similarity: null,
      matching_media_hashes: null,
    };
    const { store } = createStore(async (functionName, arguments_) => {
      if (functionName === 'find_complaint_duplicate_candidates') {
        return { data: [emptyCandidate], error: null };
      }
      return standardDraftRpc(functionName, arguments_);
    });

    const evidence = await store.loadDuplicateEvidence(ids.actor, ids.draft, timestamps.submitted);

    assert.equal(evidence.policy.id, ids.policy);
    assert.deepEqual(evidence.candidates, []);
    assert.deepEqual(evidence.suggestions, []);
  });
});

const listRow = (complaintId: string, submittedAt: string, number: string) => ({
  complaint_id: complaintId,
  draft_id: ids.draft,
  complaint_number: number,
  category_id: ids.category,
  category_name: 'Broken streetlight',
  status: 'submitted',
  visibility: 'private',
  submitted_at: submittedAt,
  updated_at: submittedAt,
  authority_id: ids.authority,
  local_body_id: ids.localBody,
  ward_id: null,
  department_id: ids.department,
});

const complaintDetailRow = {
  complaint_id: ids.complaint,
  draft_id: ids.draft,
  complaint_number: 'LW-20260714-00000001',
  category_id: ids.category,
  category_name: 'Broken streetlight',
  asset_id: null,
  description: draftRow.description,
  description_language: 'en',
  custom_attributes: {},
  status: 'submitted',
  visibility: 'private',
  submitted_at: timestamps.submitted,
  updated_at: timestamps.updated,
  location_evidence_id: ids.location,
  longitude: locationCapture.longitude,
  latitude: locationCapture.latitude,
  accuracy_meters: locationCapture.accuracyMeters,
  location_provider: locationCapture.provider,
  location_captured_at: locationCapture.capturedAt,
  location_device_recorded_at: locationCapture.deviceRecordedAt,
  mock_location_detected: false,
  location_verification_status: 'verified',
  location_verification_score: 0.98,
  routing_decision_id: ids.decision,
  routing_request_id: recordedRoutingDecision.requestId,
  assignment_id: ids.assignment,
  authority_id: ids.authority,
  local_body_id: ids.localBody,
  ward_id: null,
  department_id: ids.department,
  authority_department_id: ids.authorityDepartment,
  officer_role_id: ids.officerRole,
} as const;

describe('Supabase complaint store submission and history', () => {
  it('composes a completed submission replay from stored payload, draft, and routing audit', async () => {
    const identity = {
      idempotencyKeyHash: 'b'.repeat(64),
      requestFingerprint: 'c'.repeat(64),
    };
    const calls: RpcCall[] = [];
    const { routingStore, store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      if (functionName === 'claim_complaint_submission') {
        return {
          data: [
            {
              submission_request_id: ids.submission,
              state: 'completed',
              routing_request_id: recordedRoutingDecision.requestId,
              complaint_id: ids.complaint,
              response_payload: {
                complaintId: ids.complaint,
                draftId: ids.draft,
                complaintNumber: complaintDetailRow.complaint_number,
                status: 'submitted',
                submittedAt: timestamps.submitted,
                routingDecisionId: ids.decision,
                assignmentId: ids.assignment,
                authorityId: ids.authority,
                localBodyId: ids.localBody,
                wardId: null,
                departmentId: ids.department,
                officerRoleId: ids.officerRole,
              },
              replayed: true,
            },
          ],
          error: null,
        };
      }
      return standardDraftRpc(functionName, arguments_);
    });

    const claim = await store.claimSubmission(ids.actor, ids.draft, identity);

    assert.equal(claim.state, 'completed');
    assert.equal(claim.response?.visibility, 'private');
    assert.equal(claim.response?.categoryId, ids.category);
    assert.deepEqual(claim.response?.routing.target, routingTarget);
    assert.equal(claim.response?.routing.confidence.score, 0.95);
    assert.equal(JSON.stringify(claim.response).includes('candidateEvaluations'), false);
    assert.deepEqual(routingStore.replayCalls, [
      { actorUserId: ids.actor, requestId: recordedRoutingDecision.requestId },
    ]);
    const claimCall = calls.find((call) => call.functionName === 'claim_complaint_submission');
    assert.deepEqual(claimCall?.arguments_, {
      p_actor_user_id: ids.actor,
      p_draft_id: ids.draft,
      p_idempotency_key_hash: identity.idempotencyKeyHash,
      p_request_fingerprint: identity.requestFingerprint,
    });
  });

  it('encodes and decodes an opaque keyset cursor for owned complaint lists', async () => {
    const firstSubmitted = '2026-07-14T04:30:00.000Z';
    const secondSubmitted = '2026-07-14T04:20:00.000Z';
    const calls: RpcCall[] = [];
    const { store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      assert.equal(functionName, 'list_owned_complaints');
      return {
        data:
          arguments_['p_before_id'] === null
            ? [
                listRow(ids.complaint, firstSubmitted, 'LW-20260714-00000001'),
                listRow(ids.secondComplaint, secondSubmitted, 'LW-20260714-00000002'),
              ]
            : [],
        error: null,
      };
    });

    const firstPage = await store.listComplaints(ids.actor, { limit: 2 });
    assert.equal(firstPage.hasMore, true);
    assert.equal(typeof firstPage.nextCursor, 'string');
    const secondPage = await store.listComplaints(ids.actor, {
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    assert.deepEqual(secondPage, { items: [], hasMore: false, nextCursor: null });
    assert.deepEqual(calls[1]?.arguments_, {
      p_actor_user_id: ids.actor,
      p_limit: 2,
      p_before_submitted_at: secondSubmitted,
      p_before_id: ids.secondComplaint,
    });
    assert.equal(firstPage.items[0]?.visibility, 'private');
    assert.equal('draftId' in (firstPage.items[0] ?? {}), false);
  });

  it('composes private complaint detail and timeline views from exact RPC rows', async () => {
    const calls: RpcCall[] = [];
    const { routingStore, store } = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      switch (functionName) {
        case 'get_owned_complaint':
          return { data: [complaintDetailRow], error: null };
        case 'list_complaint_location_evidence':
          return { data: [locationRow], error: null };
        case 'list_complaint_media':
          return { data: [mediaRow], error: null };
        case 'get_complaint_timeline':
          return {
            data: [
              {
                event_id: ids.timeline,
                sequence: 1,
                from_status: 'draft',
                to_status: 'submitted',
                reason_code: 'COMPLAINT_SUBMITTED',
                public_message: 'Complaint submitted successfully.',
                occurred_at: timestamps.submitted,
              },
            ],
            error: null,
          };
        default:
          throw new Error(`Unexpected RPC: ${functionName}`);
      }
    });

    const detail = await store.getComplaint(ids.actor, ids.complaint);
    const timeline = await store.getTimeline(ids.actor, ids.complaint);

    assert.equal(detail.visibility, 'private');
    assert.equal(detail.location.id, ids.location);
    assert.equal(detail.media[0]?.complaintId, ids.complaint);
    assert.equal(detail.media[0]?.metadata.captureLocation?.latitude, locationCapture.latitude);
    assert.deepEqual(detail.routing.target, routingTarget);
    assert.deepEqual(timeline, {
      complaintId: ids.complaint,
      entries: [
        {
          id: ids.timeline,
          complaintId: ids.complaint,
          eventType: 'submitted',
          status: 'submitted',
          title: 'Complaint submitted successfully.',
          description: null,
          occurredAt: timestamps.submitted,
        },
      ],
    });
    assert.deepEqual(routingStore.replayCalls, [
      { actorUserId: ids.actor, requestId: recordedRoutingDecision.requestId },
    ]);
    assert.equal(
      calls.every(
        (call) =>
          call.arguments_['p_actor_user_id'] === ids.actor &&
          !('p_service_role_key' in call.arguments_),
      ),
      true,
    );
  });
});

describe('Supabase complaint store deterministic helpers', () => {
  it('uses SHA-256 digests rather than recoverable raw keys', () => {
    const raw = 'complaint-raw-key-000001';
    const expected = createHash('sha256').update(raw).digest('hex');
    const identity = createComplaintMutationIdentity(raw, 'test-scope', {});

    assert.equal(identity.idempotencyKeyHash, expected);
    assert.equal(identity.idempotencyKeyHash.includes(raw), false);
  });
});
