import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ApiError } from '../lib/api/client';
import {
  getComplaint,
  getComplaintResolutionContext,
  getComplaintTimeline,
  listComplaints,
  reopenComplaint,
  submitComplaintFeedback,
} from '../lib/api/complaints';

const ids = {
  assignment: '10000000-0000-4000-8000-000000000001',
  authority: '10000000-0000-4000-8000-000000000002',
  authorityDepartment: '10000000-0000-4000-8000-000000000003',
  category: '10000000-0000-4000-8000-000000000004',
  complaint: '10000000-0000-4000-8000-000000000005',
  department: '10000000-0000-4000-8000-000000000006',
  feedback: '10000000-0000-4000-8000-000000000007',
  localBody: '10000000-0000-4000-8000-000000000008',
  location: '10000000-0000-4000-8000-000000000009',
  officerRole: '10000000-0000-4000-8000-000000000010',
  policy: '10000000-0000-4000-8000-000000000011',
  resolution: '10000000-0000-4000-8000-000000000012',
  reopen: '10000000-0000-4000-8000-000000000013',
  routingRule: '10000000-0000-4000-8000-000000000014',
  timeline: '10000000-0000-4000-8000-000000000015',
} as const;

const timestamp = '2026-07-17T10:00:00.000Z';
const listItem = {
  categoryId: ids.category,
  categoryName: 'Broken streetlight',
  complaintNumber: 'LW-2026-000001',
  id: ids.complaint,
  status: 'citizen_verification_pending',
  submittedAt: timestamp,
  updatedAt: timestamp,
  visibility: 'private',
} as const;

const complaintDetail = {
  categoryId: ids.category,
  complaintNumber: listItem.complaintNumber,
  description: 'The streetlight is not working.',
  id: ids.complaint,
  location: {
    accuracyMeters: 8,
    capturedAt: timestamp,
    deviceRecordedAt: timestamp,
    id: ids.location,
    isMockLocation: false,
    latitude: 18.52,
    longitude: 73.86,
    provider: 'gps',
    verificationScore: 0.98,
    verificationStatus: 'verified',
  },
  media: [],
  routing: {
    confidence: { band: 'high', score: 0.95 },
    explanation: {
      fallbackDepth: 0,
      fallbackUsed: false,
      jurisdictionStatus: 'resolved',
      localBodyBoundaryVersionId: null,
      policyId: ids.policy,
      policyVersion: 1,
      policyVersionId: ids.policy,
      reason: 'route_resolved',
      selectedRoutingRuleId: ids.routingRule,
      selectedRoutingRuleVersionId: ids.routingRule,
      wardBoundaryVersionId: null,
    },
    status: 'routed',
    target: {
      assetId: null,
      assetMatchDistanceMeters: null,
      assetOwnershipVersionId: null,
      assetTypeId: null,
      assetVersionId: null,
      authorityDepartmentId: ids.authorityDepartment,
      authorityId: ids.authority,
      departmentId: ids.department,
      localBodyId: ids.localBody,
      officerAssignmentId: ids.assignment,
      officerRoleId: ids.officerRole,
      wardId: null,
    },
  },
  status: listItem.status,
  submittedAt: timestamp,
  updatedAt: timestamp,
  visibility: 'private',
} as const;

const resolutionContext = {
  availableReopenEvidence: [],
  complaintId: ids.complaint,
  escalations: [],
  feedback: [],
  latestResolution: {
    afterEvidence: [],
    beforeEvidence: [],
    completedAt: timestamp,
    completionLocation: null,
    distanceFromComplaintMeters: null,
    id: ids.resolution,
    publicMessage: 'The streetlight was repaired.',
    reopenEvidence: [],
    version: 1,
    workReference: null,
  },
  policy: {
    feedbackAllowed: true,
    id: ids.policy,
    outcomeOptions: [{ code: 'resolved', label: 'Resolved' }],
    ratingLabels: {
      communication: 'Communication',
      quality: 'Quality',
      satisfaction: 'Satisfaction',
      speed: 'Speed',
    },
    ratingMaximum: 5,
    ratingMinimum: 1,
    ratingsRequired: false,
    reopenAllowed: true,
    reopenAttemptsRemaining: 2,
    reopenDeadline: null,
    reopenEvidenceRequired: false,
    reopenEvidenceUploadAllowed: true,
    reopenReasonOptions: [{ code: 'issue_persists', label: 'Issue persists' }],
    unavailableReason: null,
    version: 1,
  },
  policyUnavailableReason: null,
  reopenRequests: [],
  status: listItem.status,
  workflowVersion: 3,
} as const;

const originalApiUrl = process.env['NEXT_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', 'http://127.0.0.1:3001');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
  else Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', originalApiUrl);
});

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

describe('citizen complaint history API client', () => {
  it('loads only the owner-scoped page with bearer authentication and no caching', async () => {
    let request: Readonly<{ input: string; init: RequestInit }> | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { input: String(input), init: init ?? {} };
      return jsonResponse({ hasMore: false, items: [listItem], nextCursor: null });
    }) as typeof fetch;

    const result = await listComplaints('citizen-access-token', 'cursor_123');

    assert.equal(result.items[0]?.id, ids.complaint);
    assert.match(request?.input ?? '', /\/api\/v1\/complaints\?limit=25&cursor=cursor_123/u);
    assert.equal(request?.init.cache, 'no-store');
    assert.deepEqual(request?.init.headers, {
      Accept: 'application/json',
      Authorization: 'Bearer citizen-access-token',
    });
  });

  it('strictly decodes private detail, timeline, and action-policy contracts', async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const path = String(input);
      if (path.endsWith('/timeline')) {
        return jsonResponse({
          complaintId: ids.complaint,
          entries: [
            {
              complaintId: ids.complaint,
              description: null,
              eventType: 'status_changed',
              id: ids.timeline,
              occurredAt: timestamp,
              status: listItem.status,
              title: 'Resolution submitted for citizen review',
            },
          ],
        });
      }
      if (path.endsWith('/resolution-context')) return jsonResponse(resolutionContext);
      return jsonResponse(complaintDetail);
    }) as typeof fetch;

    assert.equal(
      (await getComplaint('token', ids.complaint)).complaintNumber,
      listItem.complaintNumber,
    );
    assert.equal((await getComplaintTimeline('token', ids.complaint)).entries.length, 1);
    assert.equal(
      (await getComplaintResolutionContext('token', ids.complaint)).policy?.feedbackAllowed,
      true,
    );
  });

  it('rejects unknown private response fields instead of rendering them', async () => {
    globalThis.fetch = (async () =>
      jsonResponse({
        ...complaintDetail,
        internalAssignmentNote: 'private internal text',
      })) as typeof fetch;

    await assert.rejects(
      getComplaint('token', ids.complaint),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('sends policy-sensitive mutations with a validated idempotency key', async () => {
    const requests: Array<Readonly<{ input: string; init: RequestInit }>> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init: init ?? {} });
      if (String(input).endsWith('/feedback')) {
        return jsonResponse({
          complaintId: ids.complaint,
          feedback: {
            comment: null,
            id: ids.feedback,
            outcome: 'resolved',
            ratings: null,
            resolutionId: ids.resolution,
            submittedAt: timestamp,
          },
          status: 'citizen_verification_pending',
          updatedAt: timestamp,
          workflowVersion: 4,
        });
      }
      return jsonResponse({
        complaintId: ids.complaint,
        escalation: null,
        reopenRequest: {
          attemptNumber: 1,
          evidenceIds: [],
          explanation: 'The light is still off.',
          id: ids.reopen,
          reasonCode: 'issue_persists',
          requestedAt: timestamp,
          resolutionId: ids.resolution,
          resultingStatus: 'reopened',
        },
        status: 'reopened',
        updatedAt: timestamp,
        workflowVersion: 5,
      });
    }) as typeof fetch;

    await submitComplaintFeedback(
      'token',
      ids.complaint,
      {
        expectedWorkflowVersion: 3,
        outcome: 'resolved',
        resolutionId: ids.resolution,
      },
      'citizen-web-feedback:00000001',
    );
    await reopenComplaint(
      'token',
      ids.complaint,
      {
        evidenceIds: [],
        expectedWorkflowVersion: 4,
        explanation: 'The light is still off.',
        reasonCode: 'issue_persists',
        resolutionId: ids.resolution,
      },
      'citizen-web-reopen:00000001',
    );

    assert.equal(
      (requests[0]?.init.headers as Record<string, string>)['Idempotency-Key'],
      'citizen-web-feedback:00000001',
    );
    assert.equal(
      (requests[1]?.init.headers as Record<string, string>)['Idempotency-Key'],
      'citizen-web-reopen:00000001',
    );
    assert.equal(
      requests.every(({ init }) => init.method === 'POST'),
      true,
    );
  });
});
