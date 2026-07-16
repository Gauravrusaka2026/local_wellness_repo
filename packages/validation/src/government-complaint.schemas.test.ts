import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  acknowledgeGovernmentComplaintSchema,
  createGovernmentResolutionEvidenceUploadIntentSchema,
  decodeGovernmentComplaintQueueResult,
  governmentComplaintQueueQuerySchema,
  submitGovernmentComplaintResolutionSchema,
} from './government-complaint.schemas.js';

const identifiers = {
  assignment: '10000000-0000-4000-8000-000000000001',
  authority: '10000000-0000-4000-8000-000000000002',
  authorityDepartment: '10000000-0000-4000-8000-000000000003',
  category: '10000000-0000-4000-8000-000000000004',
  complaint: '10000000-0000-4000-8000-000000000005',
  department: '10000000-0000-4000-8000-000000000006',
  evidence: '10000000-0000-4000-8000-000000000007',
  localBody: '10000000-0000-4000-8000-000000000008',
  officerAssignment: '10000000-0000-4000-8000-000000000009',
  officerRole: '10000000-0000-4000-8000-000000000010',
  ward: '10000000-0000-4000-8000-000000000011',
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
  source: 'routing_decision',
  status: 'active',
  assignedAt: timestamp,
  endedAt: null,
} as const;

describe('government complaint validation', () => {
  it('requires a positive workflow version and rejects mass-assignment fields', () => {
    assert.equal(
      acknowledgeGovernmentComplaintSchema.safeParse({ expectedWorkflowVersion: 1 }).success,
      true,
    );
    assert.equal(
      acknowledgeGovernmentComplaintSchema.safeParse({ expectedWorkflowVersion: 0 }).success,
      false,
    );
    assert.equal(
      acknowledgeGovernmentComplaintSchema.safeParse({
        expectedWorkflowVersion: 1,
        authorityId: identifiers.authority,
      }).success,
      false,
    );
  });

  it('normalizes a single status query and validates the date range', () => {
    const parsed = governmentComplaintQueueQuerySchema.parse({
      statuses: 'submitted',
      submittedFrom: timestamp,
      submittedTo: '2026-07-14T11:00:00.000Z',
    });

    assert.deepEqual(parsed.statuses, ['submitted']);
    assert.equal(parsed.limit, 25);
    assert.equal(
      governmentComplaintQueueQuerySchema.safeParse({
        submittedFrom: '2026-07-14T12:00:00.000Z',
        submittedTo: timestamp,
      }).success,
      false,
    );
    assert.equal(
      governmentComplaintQueueQuerySchema.safeParse({
        submittedFrom: timestamp,
        submittedTo: timestamp,
      }).success,
      false,
    );
  });

  it('requires the evidence MIME type to match its kind', () => {
    const base = {
      expectedWorkflowVersion: 1,
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
    };

    assert.equal(
      createGovernmentResolutionEvidenceUploadIntentSchema.safeParse({
        ...base,
        kind: 'photo',
        mimeType: 'image/jpeg',
      }).success,
      true,
    );
    assert.equal(
      createGovernmentResolutionEvidenceUploadIntentSchema.safeParse({
        ...base,
        kind: 'photo',
        mimeType: 'video/mp4',
      }).success,
      false,
    );
  });

  it('requires final resolution evidence and rejects duplicate evidence identifiers', () => {
    const input = {
      expectedWorkflowVersion: 2,
      completionNote: 'Work completed and inspected.',
      completionLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: timestamp,
        deviceRecordedAt: timestamp,
        provider: 'gps',
        isMockLocation: false,
      },
      resolutionEvidenceIds: [identifiers.evidence, identifiers.evidence],
    };

    assert.equal(submitGovernmentComplaintResolutionSchema.safeParse(input).success, false);
    assert.equal(
      submitGovernmentComplaintResolutionSchema.safeParse({
        ...input,
        resolutionEvidenceIds: [identifiers.evidence],
      }).success,
      true,
    );
  });

  it('strictly decodes queue results without exposing exact coordinates', () => {
    const result = {
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

    assert.deepEqual(decodeGovernmentComplaintQueueResult(result), result);
    assert.throws(() =>
      decodeGovernmentComplaintQueueResult({
        ...result,
        items: [{ ...result.items[0], latitude: 18.52, longitude: 73.85 }],
      }),
    );
  });
});
