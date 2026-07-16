import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCitizenAccountabilityHistory,
  shouldRefreshResolutionAccountability,
} from '../src/complaints/resolution-accountability-view';

describe('resolution accountability refresh and history view', () => {
  it('refreshes only when the same complaint receives a new parent signal', () => {
    const current = { complaintId: 'complaint-1', signal: 4 };

    assert.equal(
      shouldRefreshResolutionAccountability(current, { complaintId: 'complaint-1', signal: 5 }),
      true,
    );
    assert.equal(
      shouldRefreshResolutionAccountability(current, { complaintId: 'complaint-1', signal: 4 }),
      false,
    );
    assert.equal(
      shouldRefreshResolutionAccountability(current, { complaintId: 'complaint-2', signal: 5 }),
      false,
    );
  });

  it('builds durable newest-first citizen receipts from persisted accountability records', () => {
    const history = buildCitizenAccountabilityHistory({
      escalations: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          level: 2,
          occurredAt: '2026-07-16T12:00:00.000Z',
          reasonCode: 'repeat_reopen_threshold',
        },
      ],
      feedback: [
        {
          comment: 'The repair did not last.',
          id: '11111111-1111-4111-8111-111111111111',
          outcome: 'temporary_fix',
          ratings: { communication: 3, quality: 2, satisfaction: 2, speed: 4 },
          resolutionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          submittedAt: '2026-07-16T10:00:00.000Z',
        },
      ],
      reopenRequests: [
        {
          attemptNumber: 1,
          evidenceIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
          explanation: 'The issue returned after rain.',
          id: '22222222-2222-4222-8222-222222222222',
          reasonCode: 'issue_returned',
          requestedAt: '2026-07-16T11:00:00.000Z',
          resolutionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          resultingStatus: 'reopened',
        },
      ],
    });

    assert.deepEqual(
      history.map(({ title, type }) => [type, title]),
      [
        ['escalation', 'Escalation receipt'],
        ['reopen', 'Reopen request 1'],
        ['feedback', 'Feedback receipt'],
      ],
    );
    assert.deepEqual(history[1]?.details, [
      'Result: reopened',
      'Reason: issue returned',
      'Explanation: The issue returned after rain.',
      '1 evidence item(s) attached',
    ]);
    assert.deepEqual(history[2]?.details, [
      'Outcome: temporary fix',
      'Ratings: satisfaction 2 · speed 4 · quality 2 · communication 3',
      'Comment: The repair did not last.',
    ]);
  });
});
