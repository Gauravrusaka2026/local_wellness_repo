import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {
  ComplaintMessage,
  GovernmentAccessScope,
  GovernmentComplaintAccountability,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueResult,
} from '@local-wellness/types';

import { ComplaintQueue, QueueFilters, QueueNavigation } from '../app/queue-view';
import { ComplaintDetailView } from '../app/complaints/[complaintId]/detail-view';
import { realtimeEventMatchesComplaint } from '../app/complaints/[complaintId]/conversation-panel';
import {
  getAvailableResolutionEvidence,
  toCompletionLocation,
} from '../app/complaints/[complaintId]/action-forms';
import {
  decodeGovernmentComplaintAccountability,
  decodeGovernmentComplaintQueueResult,
} from '../lib/api/government-complaints';
import {
  buildComplaintHref,
  buildQueueHref,
  parseComplaintScope,
  parseQueueSearch,
} from '../lib/complaints/query';

const userId = '11111111-1111-4111-8111-111111111111';
const complaintId = '22222222-2222-4222-8222-222222222222';
const authorityId = '33333333-3333-4333-8333-333333333333';
const assignmentId = '44444444-4444-4444-8444-444444444444';
const roleId = '55555555-5555-4555-8555-555555555555';
const localBodyId = '66666666-6666-4666-8666-666666666666';
const departmentId = '77777777-7777-4777-8777-777777777777';
const authorityDepartmentId = '88888888-8888-4888-8888-888888888888';
const officerRoleId = '99999999-9999-4999-8999-999999999999';
const categoryId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const locationEvidenceId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const citizenMessage: ComplaintMessage = {
  authoredByMe: false,
  authorType: 'citizen',
  body: 'The issue is beside the main entrance.',
  complaintId,
  createdAt: '2026-07-14T10:30:00+05:30',
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  kind: 'private_message',
};

const testRouter: AppRouterInstance = {
  back: () => undefined,
  forward: () => undefined,
  prefetch: () => undefined,
  push: () => undefined,
  refresh: () => undefined,
  replace: () => undefined,
};

const scope: GovernmentAccessScope = {
  authorities: [
    {
      authorityId,
      effectiveFrom: '2026-07-14T08:00:00+05:30',
      effectiveUntil: null,
      invitationEmail: 'officer@example.gov.in',
      membershipId: userId,
      status: 'active',
    },
  ],
  roles: [
    {
      assignmentId,
      authorityId,
      code: 'government_operator',
      description: null,
      effectiveFrom: '2026-07-14T08:00:00+05:30',
      effectiveUntil: null,
      isGovernment: true,
      isPrivileged: false,
      name: 'Government operator',
      roleId,
      scopeId: authorityId,
      scopeType: 'authority',
    },
  ],
};

const currentAssignment = {
  assignedAt: '2026-07-14T09:00:00+05:30',
  authorityDepartmentId,
  authorityId,
  authorityName: 'Reference Municipal Authority',
  departmentId,
  departmentName: 'Roads Department',
  endedAt: null,
  id: assignmentId,
  localBodyId,
  localBodyName: 'Reference Municipal Corporation',
  officerAssignmentId: null,
  officerName: null,
  officerRoleId,
  officerRoleName: 'Ward Engineer',
  source: 'routing_decision' as const,
  status: 'active' as const,
  wardId: null,
  wardName: null,
};

const queueItem: GovernmentComplaintQueueResult['items'][number] = {
  categoryId,
  categoryName: 'Pothole',
  complaintNumber: 'LW-20260714-00000001',
  currentAssignment,
  flags: {
    isAwaitingCitizenVerification: false,
    isReopened: false,
    isTransferred: false,
    isUnassigned: true,
  },
  id: complaintId,
  status: 'submitted',
  submittedAt: '2026-07-14T09:00:00+05:30',
  updatedAt: '2026-07-14T09:00:00+05:30',
  workflowVersion: 1,
};

const queueResult: GovernmentComplaintQueueResult = {
  hasMore: true,
  items: [queueItem],
  nextCursor: 'next_cursor',
};

test('parses only current scope and valid bookmarkable queue filters', () => {
  const parsed = parseQueueSearch(
    {
      from: '2026-07-01',
      queue: 'new',
      scope: assignmentId,
      search: ' LW-20260714 ',
      status: 'submitted',
      to: '2026-07-14',
    },
    scope,
  );

  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.query, {
    limit: 25,
    queue: 'new',
    scopeRoleAssignmentId: assignmentId,
    search: 'LW-20260714',
    statuses: ['submitted'],
    submittedFrom: '2026-07-01T00:00:00+05:30',
    submittedTo: '2026-07-14T23:59:59.999+05:30',
  });
  assert.match(buildQueueHref(parsed.filters, { cursor: 'next_cursor' }), /cursor=next_cursor/u);
});

test('reports invalid or unauthorized queue filters without forwarding them', () => {
  const parsed = parseQueueSearch(
    { queue: 'secret', scope: complaintId, status: 'invented', from: '2026-02-31' },
    scope,
  );
  assert.match(parsed.error ?? '', /queue/u);
  assert.deepEqual(parsed.query, { limit: 25 });
});

test('preserves only an authorized effective scope on complaint navigation', () => {
  assert.deepEqual(parseComplaintScope({ scope: assignmentId }, scope), {
    isValid: true,
    scopeRoleAssignmentId: assignmentId,
  });
  assert.deepEqual(parseComplaintScope({ scope: complaintId }, scope), {
    isValid: false,
    scopeRoleAssignmentId: undefined,
  });
  assert.equal(
    buildComplaintHref(complaintId, assignmentId),
    `/complaints/${complaintId}?scope=${assignmentId}`,
  );
});

test('strictly decodes queue responses and rejects malformed server data', () => {
  assert.deepEqual(decodeGovernmentComplaintQueueResult(queueResult), queueResult);
  assert.throws(() =>
    decodeGovernmentComplaintQueueResult({ ...queueResult, items: [{ id: complaintId }] }),
  );
});

test('renders an accessible queue, filters, scoped links, and cursor navigation', () => {
  const parsed = parseQueueSearch({ queue: 'new', scope: assignmentId }, scope);
  const markup = renderToStaticMarkup(
    <>
      <QueueNavigation parsed={parsed} />
      <QueueFilters parsed={parsed} scope={scope} />
      <ComplaintQueue parsed={parsed} result={queueResult} />
    </>,
  );

  assert.match(markup, /aria-label="Complaint queues"/u);
  assert.match(
    markup,
    /<caption class="visually-hidden">Access-scoped government complaint queue/u,
  );
  assert.match(markup, /LW-20260714-00000001/u);
  assert.match(markup, new RegExp(`complaints/${complaintId}\\?scope=${assignmentId}`, 'u'));
  assert.match(markup, /No verified incumbent|Ward Engineer/u);
  assert.match(markup, /Next page/u);
});

test('renders authorized text location context without an external map or coordinate link', () => {
  const detail: GovernmentComplaintDetail = {
    ...queueItem,
    allowedActions: [],
    allowedStatusTransitions: [],
    assignmentHistory: [currentAssignment],
    description: 'A road surface defect requires inspection.',
    externalDependencies: [
      {
        createdAt: '2026-07-14T09:00:00+05:30',
        dependencyType: 'utility',
        description: 'Awaiting utility clearance.',
        expectedBy: '2026-07-15T09:00:00+05:30',
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        resolutionSummary: 'Clearance received.',
        resolvedAt: '2026-07-14T11:00:00+05:30',
        status: 'resolved',
      },
    ],
    inspections: [],
    internalNotes: [],
    location: {
      accuracyMeters: 8,
      capturedAt: '2026-07-14T09:00:00+05:30',
      latitude: 18.5204,
      longitude: 73.8567,
      provider: 'gps',
      verificationScore: 0.95,
      verificationStatus: 'verified',
    },
    media: [],
    resolutionEvidence: [],
    routingSummary: {
      confidenceScore: 0.86,
      decisionStatus: 'routed',
      explanationCode: null,
      fallbackDepth: 0,
      fallbackUsed: false,
      resolvedAt: '2026-07-14T09:00:00+05:30',
    },
    timeline: [
      {
        fromStatus: 'draft',
        id: locationEvidenceId,
        occurredAt: '2026-07-14T09:00:00+05:30',
        publicMessage: null,
        reasonCode: 'CITIZEN_SUBMITTED',
        sequence: 1,
        toStatus: 'submitted',
      },
    ],
    workReferences: [],
  };
  const accountability: GovernmentComplaintAccountability = {
    complaintId,
    escalations: [
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        level: 1,
        occurredAt: '2026-07-14T13:00:00+05:30',
        reasonCode: 'repeat_reopen',
      },
    ],
    feedback: [
      {
        comment: 'The repair did not last.',
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        outcome: 'temporary_fix',
        ratings: { communication: 3, quality: 2, satisfaction: 2, speed: 4 },
        resolutionId: '12121212-1212-4212-8212-121212121212',
        submittedAt: '2026-07-14T12:00:00+05:30',
      },
    ],
    reopenRequests: [
      {
        attemptNumber: 1,
        evidenceIds: [],
        explanation: 'The road surface failed again.',
        id: '13131313-1313-4313-8313-131313131313',
        reasonCode: 'issue_returned',
        requestedAt: '2026-07-14T12:30:00+05:30',
        resolutionId: '12121212-1212-4212-8212-121212121212',
        resultingStatus: 'escalated',
      },
    ],
    resolutionHistory: [
      {
        afterEvidence: [],
        beforeEvidence: [],
        completedAt: '2026-07-14T11:30:00+05:30',
        completionLocation: {
          accuracyMeters: 7,
          capturedAt: '2026-07-14T11:29:00+05:30',
          latitude: 18.5205,
          longitude: 73.8568,
          provider: 'gps',
        },
        completionNote: 'Temporary patch installed by the road crew.',
        distanceFromComplaintMeters: 14,
        id: '12121212-1212-4212-8212-121212121212',
        publicMessage: 'The reported road defect was repaired.',
        reopenEvidence: [],
        version: 1,
        workReference: null,
      },
    ],
    workflowVersion: 4,
  };
  const markup = renderToStaticMarkup(
    <AppRouterContext.Provider value={testRouter}>
      <ComplaintDetailView
        accountability={accountability}
        assignmentOptions={[]}
        complaint={detail}
        messages={[citizenMessage]}
      />
    </AppRouterContext.Provider>,
  );

  assert.match(markup, /Authorized location context/u);
  assert.match(markup, /18\.520400/u);
  assert.match(markup, /Interactive map not configured/u);
  assert.match(markup, /Routing explanation/u);
  assert.match(markup, /Explanation code.*Unavailable/u);
  assert.match(markup, /Resolution:.*Clearance received/u);
  assert.doesNotMatch(markup, /google\.com|openstreetmap|mapbox|maps\.apple/u);
  assert.doesNotMatch(markup, /href="[^"]*18\.520400/u);
  assert.match(markup, /Private internal notes/u);
  assert.match(markup, /Private conversation/u);
  assert.match(markup, /The issue is beside the main entrance/u);
  assert.match(markup, /visible only to the citizen and currently authorized complaint staff/u);
  assert.match(markup, /Resolution, feedback, and reopening history/u);
  assert.match(markup, /Temporary patch installed by the road crew/u);
  assert.match(markup, /The repair did not last/u);
  assert.match(markup, /Attempt 1.*escalated/u);
  assert.match(markup, /Escalation level 1/u);
  assert.deepEqual(decodeGovernmentComplaintAccountability(accountability), accountability);
  assert.throws(() =>
    decodeGovernmentComplaintAccountability({
      ...accountability,
      resolutionHistory: [{ ...accountability.resolutionHistory[0], officerPhone: 'private' }],
    }),
  );
});

test('refreshes durable complaint data only for matching realtime event envelopes', () => {
  assert.equal(
    realtimeEventMatchesComplaint(
      'message:created',
      { payload: { complaintId }, schemaVersion: 1 },
      complaintId,
    ),
    true,
  );
  assert.equal(
    realtimeEventMatchesComplaint(
      'notification:created',
      { payload: { payload: { complaintId } }, schemaVersion: 1 },
      complaintId,
    ),
    true,
  );
  assert.equal(
    realtimeEventMatchesComplaint(
      'complaint:status_changed',
      { payload: { payload: { complaintId: authorityId } }, schemaVersion: 1 },
      complaintId,
    ),
    false,
  );
  assert.equal(realtimeEventMatchesComplaint('message:created', null, complaintId), false);
});

test('offers only finalized evidence that has not already been linked to a resolution', () => {
  const available = getAvailableResolutionEvidence([
    {
      availableForResolution: false,
      byteSize: 1_024,
      capturedAt: null,
      createdAt: '2026-07-14T09:00:00+05:30',
      finalizedAt: '2026-07-14T09:05:00+05:30',
      id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      kind: 'photo',
      mimeType: 'image/jpeg',
      uploadStatus: 'finalized',
    },
    {
      availableForResolution: true,
      byteSize: 2_048,
      capturedAt: null,
      createdAt: '2026-07-14T10:00:00+05:30',
      finalizedAt: '2026-07-14T10:05:00+05:30',
      id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      kind: 'photo',
      mimeType: 'image/png',
      uploadStatus: 'finalized',
    },
    {
      availableForResolution: true,
      byteSize: 2_048,
      capturedAt: null,
      createdAt: '2026-07-14T10:00:00+05:30',
      finalizedAt: null,
      id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      kind: 'photo',
      mimeType: 'image/png',
      uploadStatus: 'reserved',
    },
  ]);

  assert.deepEqual(
    available.map(({ id }) => id),
    ['cccccccc-cccc-4ccc-8ccc-ccccccccccc2'],
  );
});

test('normalizes browser geolocation into restricted completion evidence', () => {
  assert.deepEqual(
    toCompletionLocation(
      {
        coords: { accuracy: 8.25, latitude: 18.5204, longitude: 73.8567 },
        timestamp: Date.parse('2026-07-16T10:00:00.000Z'),
      },
      '2026-07-16T10:00:01.000Z',
    ),
    {
      accuracyMeters: 8.25,
      capturedAt: '2026-07-16T10:00:00.000Z',
      deviceRecordedAt: '2026-07-16T10:00:01.000Z',
      isMockLocation: null,
      latitude: 18.5204,
      longitude: 73.8567,
      provider: 'unknown',
    },
  );
});
