import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClientError } from '@local-wellness/api-client';

import {
  createComplaintReopenEvidenceUploadIntent,
  finalizeComplaintReopenEvidence,
  getComplaintEvidenceAccess,
  getComplaintResolutionContext,
  getUserFacingComplaintError,
  reopenComplaint,
  shouldRotateSubmitIdempotencyKeyAfterError,
  submitComplaintResolutionFeedback,
} from '../src/complaints/complaint-service';

const complaintId = '11111111-1111-4111-8111-111111111111';
const resolutionId = '22222222-2222-4222-8222-222222222222';
const evidenceId = '33333333-3333-4333-8333-333333333333';
const feedbackId = '44444444-4444-4444-8444-444444444444';
const reopenId = '55555555-5555-4555-8555-555555555555';
const occurredAt = '2026-07-16T10:00:00.000Z';
const requestId = 'phase7-mobile-client-test';

const response = (data: unknown): Response =>
  new Response(JSON.stringify({ data, meta: { requestId } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });

const setPublicApiUrl = (value: string | undefined): void => {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
    return;
  }
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', value);
};

const reopenEvidence = {
  byteSize: 1_024,
  captureLocation: {
    accuracyMeters: 8,
    capturedAt: occurredAt,
    latitude: 18.5204,
    longitude: 73.8567,
    provider: 'gps',
  },
  capturedAt: occurredAt,
  createdAt: occurredAt,
  finalizedAt: null,
  id: evidenceId,
  kind: 'photo',
  mimeType: 'image/jpeg',
  uploadStatus: 'reserved',
} as const;

test('uses authenticated, replay-safe resolution accountability endpoints', async () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  const requests: Array<
    Readonly<{
      body: string | undefined;
      idempotencyKey: string | null;
      method: string;
      url: string;
    }>
  > = [];
  const feedback = {
    comment: 'The repair is holding.',
    id: feedbackId,
    outcome: 'resolved',
    ratings: { communication: 4, quality: 4, satisfaction: 5, speed: 3 },
    resolutionId,
    submittedAt: occurredAt,
  } as const;
  const reopenRequest = {
    attemptNumber: 1,
    evidenceIds: [evidenceId],
    explanation: 'The issue returned after the temporary repair.',
    id: reopenId,
    reasonCode: 'issue_returned',
    requestedAt: occurredAt,
    resolutionId,
    resultingStatus: 'reopened',
  } as const;
  const responses = [
    response({
      complaintId,
      availableReopenEvidence: [],
      escalations: [],
      feedback: [],
      latestResolution: null,
      policy: null,
      policyUnavailableReason: 'No verified policy is configured.',
      reopenRequests: [],
      status: 'submitted',
      workflowVersion: 1,
    }),
    response({
      complaintId,
      feedback,
      status: 'resolved',
      updatedAt: occurredAt,
      workflowVersion: 2,
    }),
    response({
      evidence: reopenEvidence,
      expiresAt: '2026-07-16T10:10:00.000Z',
      upload: {
        bucket: 'complaint-originals-private',
        objectPath: 'citizen/reopen/evidence.jpg',
        token: 'signed-upload-token',
      },
      workflowVersion: 2,
    }),
    response({
      evidence: { ...reopenEvidence, finalizedAt: occurredAt, uploadStatus: 'finalized' },
      workflowVersion: 2,
    }),
    response({
      evidenceId,
      expiresAt: '2026-07-16T10:05:00.000Z',
      role: 'reopen',
      signedUrl: 'https://storage.example.test/private-evidence',
    }),
    response({
      complaintId,
      escalation: null,
      reopenRequest,
      status: 'reopened',
      updatedAt: occurredAt,
      workflowVersion: 3,
    }),
  ];

  setPublicApiUrl('http://127.0.0.1:3001');
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer citizen-token');
    requests.push({
      body: typeof init?.body === 'string' ? init.body : undefined,
      idempotencyKey: headers.get('idempotency-key'),
      method: init?.method ?? 'GET',
      url: String(input),
    });
    const next = responses.shift();
    assert.ok(next);
    return next;
  };

  const feedbackInput = {
    comment: feedback.comment,
    expectedWorkflowVersion: 1,
    outcome: feedback.outcome,
    ratings: feedback.ratings,
    resolutionId,
  } as const;
  const evidenceInput = {
    byteSize: reopenEvidence.byteSize,
    captureLocation: {
      ...reopenEvidence.captureLocation,
      deviceRecordedAt: occurredAt,
      isMockLocation: false,
    },
    capturedAt: occurredAt,
    expectedWorkflowVersion: 2,
    heightPixels: 720,
    kind: 'photo',
    mimeType: 'image/jpeg',
    sha256: 'a'.repeat(64),
    widthPixels: 1_280,
  } as const;
  const finalizeInput = {
    byteSize: reopenEvidence.byteSize,
    expectedWorkflowVersion: 2,
    sha256: 'a'.repeat(64),
  };
  const reopenInput = {
    evidenceIds: [evidenceId],
    expectedWorkflowVersion: 2,
    explanation: reopenRequest.explanation,
    reasonCode: reopenRequest.reasonCode,
    resolutionId,
  };

  try {
    assert.equal((await getComplaintResolutionContext('citizen-token', complaintId)).policy, null);
    assert.equal(
      (
        await submitComplaintResolutionFeedback(
          'citizen-token',
          complaintId,
          feedbackInput,
          'complaint-feedback:11111111-1111-4111-8111-111111111111',
        )
      ).feedback.id,
      feedbackId,
    );
    assert.equal(
      (
        await createComplaintReopenEvidenceUploadIntent(
          'citizen-token',
          complaintId,
          evidenceInput,
          'complaint-reopen-evidence:11111111-1111-4111-8111-111111111111',
        )
      ).evidence.id,
      evidenceId,
    );
    assert.equal(
      (
        await finalizeComplaintReopenEvidence(
          'citizen-token',
          complaintId,
          evidenceId,
          finalizeInput,
          'complaint-reopen-evidence-finalize:11111111-1111-4111-8111-111111111111',
        )
      ).evidence.uploadStatus,
      'finalized',
    );
    assert.match(
      (await getComplaintEvidenceAccess('citizen-token', complaintId, evidenceId)).signedUrl,
      /^https:/u,
    );
    assert.equal(
      (
        await reopenComplaint(
          'citizen-token',
          complaintId,
          reopenInput,
          'complaint-reopen:11111111-1111-4111-8111-111111111111',
        )
      ).status,
      'reopened',
    );
  } finally {
    globalThis.fetch = originalFetch;
    setPublicApiUrl(originalApiUrl);
  }

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ['GET', `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/resolution-context`],
      ['POST', `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/feedback`],
      [
        'POST',
        `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/reopen-evidence/upload-intents`,
      ],
      [
        'POST',
        `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/reopen-evidence/${evidenceId}/finalize`,
      ],
      [
        'POST',
        `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/evidence/${evidenceId}/access`,
      ],
      ['POST', `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/reopen`],
    ],
  );
  assert.equal(requests[0]?.idempotencyKey, null);
  assert.match(requests[1]?.idempotencyKey ?? '', /^complaint-feedback:/u);
  assert.match(requests[2]?.idempotencyKey ?? '', /^complaint-reopen-evidence:/u);
  assert.match(requests[3]?.idempotencyKey ?? '', /^complaint-reopen-evidence-finalize:/u);
  assert.equal(requests[4]?.idempotencyKey, null);
  assert.match(requests[5]?.idempotencyKey ?? '', /^complaint-reopen:/u);
  assert.deepEqual(JSON.parse(requests[1]?.body ?? 'null'), feedbackInput);
  assert.deepEqual(JSON.parse(requests[2]?.body ?? 'null'), evidenceInput);
  assert.deepEqual(JSON.parse(requests[3]?.body ?? 'null'), finalizeInput);
  assert.equal(requests[4]?.body, undefined);
  assert.deepEqual(JSON.parse(requests[5]?.body ?? 'null'), reopenInput);
});

test('maps current and legacy policy conflicts to a safe citizen message', () => {
  for (const code of [
    'COMPLAINT_FEEDBACK_NOT_ALLOWED',
    'RESOLUTION_POLICY_UNAVAILABLE',
    'COMPLAINT_RESOLUTION_POLICY_NOT_FOUND',
  ]) {
    assert.equal(
      getUserFacingComplaintError(
        new ApiClientError({ code, message: 'internal policy marker', status: 409 }),
      ),
      'Resolution feedback or reopening is not available under the current policy.',
    );
  }
});

test('classifies routing terminal errors separately from ambiguous submission outcomes', () => {
  const routeUnavailable = new ApiClientError({
    code: 'COMPLAINT_ROUTE_UNAVAILABLE',
    message: 'server route detail',
    status: 503,
  });
  const unsupportedArea = new ApiClientError({
    code: 'COMPLAINT_UNSUPPORTED_AREA',
    message: 'server boundary detail',
    status: 422,
  });

  assert.equal(
    getUserFacingComplaintError(routeUnavailable),
    'Verified routing is not available for this category and location yet.',
  );
  assert.equal(shouldRotateSubmitIdempotencyKeyAfterError(routeUnavailable), true);
  assert.equal(shouldRotateSubmitIdempotencyKeyAfterError(unsupportedArea), true);

  for (const code of [
    'NETWORK_ERROR',
    'REQUEST_ABORTED',
    'INVALID_RESPONSE',
    'DEPENDENCY_UNAVAILABLE',
    'ROUTING_CONFIGURATION_UNAVAILABLE',
  ]) {
    assert.equal(
      shouldRotateSubmitIdempotencyKeyAfterError(
        new ApiClientError({ code, message: 'ambiguous outcome', status: 0 }),
      ),
      false,
    );
  }

  assert.equal(
    getUserFacingComplaintError(
      new ApiClientError({
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'internal dependency detail',
        status: 503,
      }),
    ),
    'Local Wellness is temporarily unavailable. Please try again shortly.',
  );
});
