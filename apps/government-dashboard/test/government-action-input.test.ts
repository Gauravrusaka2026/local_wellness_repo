import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GovernmentActionInputError,
  parseGovernmentActionForm,
} from '../lib/complaints/action-input';

const complaintId = '22222222-2222-4222-8222-222222222222';
const dependencyId = '33333333-3333-4333-8333-333333333333';

const baseForm = (action: string): FormData => {
  const form = new FormData();
  form.set('action', action);
  form.set('complaintId', complaintId);
  form.set('expectedWorkflowVersion', '3');
  form.set('idempotencyKey', '11111111-1111-4111-8111-111111111111');
  return form;
};

test('parses a private note with workflow and stable idempotency evidence', () => {
  const form = baseForm('add_internal_note');
  form.set('body', '  Inspection requested by the ward office.  ');
  assert.deepEqual(parseGovernmentActionForm(form), {
    action: 'add_internal_note',
    body: { body: 'Inspection requested by the ward office.', expectedWorkflowVersion: 3 },
    complaintId,
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
  });
});

test('normalizes Maharashtra-local inspection input to an explicit offset timestamp', () => {
  const form = baseForm('schedule_inspection');
  form.set('scheduledFor', '2026-07-15T10:30');
  assert.deepEqual(parseGovernmentActionForm(form).body, {
    expectedWorkflowVersion: 3,
    instructions: undefined,
    scheduledFor: '2026-07-15T10:30:00+05:30',
  });
});

test('resolves only an exact path-owned dependency with workflow evidence', () => {
  const form = baseForm('resolve_external_dependency');
  form.set('dependencyId', dependencyId);
  form.set('resolutionSummary', '  Utility clearance received.  ');
  assert.deepEqual(parseGovernmentActionForm(form), {
    action: 'resolve_external_dependency',
    body: {
      expectedWorkflowVersion: 3,
      resolutionSummary: 'Utility clearance received.',
    },
    complaintId,
    dependencyId,
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
  });
});

test('rejects malformed identifiers, workflow versions, keys, and official target fields', () => {
  const invalidId = baseForm('acknowledge');
  invalidId.set('complaintId', 'not-a-complaint');
  assert.throws(() => parseGovernmentActionForm(invalidId), GovernmentActionInputError);

  const invalidKey = baseForm('acknowledge');
  invalidKey.set('idempotencyKey', 'short');
  assert.throws(() => parseGovernmentActionForm(invalidKey), GovernmentActionInputError);

  const invalidTarget = baseForm('assign');
  invalidTarget.set('officerAssignmentId', 'free-text-target');
  invalidTarget.set('reason', 'initial_assignment');
  assert.throws(() => parseGovernmentActionForm(invalidTarget), GovernmentActionInputError);

  const invalidDependency = baseForm('resolve_external_dependency');
  invalidDependency.set('dependencyId', 'free-text-dependency');
  assert.throws(() => parseGovernmentActionForm(invalidDependency), GovernmentActionInputError);
});
