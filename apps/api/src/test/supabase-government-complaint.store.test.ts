import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GovernmentComplaintAssignmentSummary } from '@local-wellness/types';

import {
  GovernmentComplaintAccessDeniedError,
  GovernmentComplaintDataAccessError,
  GovernmentComplaintNotFoundError,
} from '../data/government-complaint.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseGovernmentComplaintStore } from '../supabase/supabase-government-complaint.store.js';

const identifiers = {
  action: '10000000-0000-4000-8000-000000000001',
  actor: '10000000-0000-4000-8000-000000000002',
  assignment: '10000000-0000-4000-8000-000000000003',
  authority: '10000000-0000-4000-8000-000000000004',
  authorityDepartment: '10000000-0000-4000-8000-000000000005',
  category: '10000000-0000-4000-8000-000000000006',
  complaint: '10000000-0000-4000-8000-000000000007',
  complaintTwo: '10000000-0000-4000-8000-000000000008',
  dependency: '10000000-0000-4000-8000-000000000009',
  department: '10000000-0000-4000-8000-000000000010',
  evidence: '10000000-0000-4000-8000-000000000011',
  localBody: '10000000-0000-4000-8000-000000000012',
  officerAssignment: '10000000-0000-4000-8000-000000000013',
  officerRole: '10000000-0000-4000-8000-000000000014',
  ward: '10000000-0000-4000-8000-000000000015',
} as const;

const timestamp = '2026-07-14T10:00:00.000Z';
const identity = {
  idempotencyKeyHash: 'a'.repeat(64),
  requestFingerprint: 'b'.repeat(64),
};
const assignment: GovernmentComplaintAssignmentSummary = {
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
};
const queueFlags = {
  isUnassigned: false,
  isReopened: false,
  isTransferred: false,
  isAwaitingCitizenVerification: false,
};
const queueRow = {
  complaint_id: identifiers.complaint,
  complaint_number: 'LW-2026-000001',
  category_id: identifiers.category,
  category_name: 'Garbage dump',
  status: 'submitted',
  submitted_at: timestamp,
  updated_at: timestamp,
  workflow_version: 1,
  current_assignment: assignment,
  queue_flags: queueFlags,
};
const actionPayload = {
  actionId: identifiers.action,
  complaintId: identifiers.complaint,
  complaintNumber: 'LW-2026-000001',
  status: 'work_in_progress',
  workflowVersion: 2,
  updatedAt: timestamp,
  currentAssignment: assignment,
};

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseGovernmentComplaintStore =>
  new SupabaseGovernmentComplaintStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public client must not be used.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

describe('Supabase government complaint store', () => {
  it('passes the requested limit once and creates an opaque keyset cursor from overfetch', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      if (calls.length === 1) {
        return {
          data: [
            queueRow,
            {
              ...queueRow,
              complaint_id: identifiers.complaintTwo,
              complaint_number: 'LW-2026-000002',
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const first = await store.listComplaints(identifiers.actor, { limit: 1 });
    assert.equal(calls[0]?.functionName, 'list_government_complaints');
    assert.equal(calls[0]?.arguments_['p_limit'], 1);
    assert.equal(first.items.length, 1);
    assert.equal(first.hasMore, true);
    assert.equal(typeof first.nextCursor, 'string');

    await store.listComplaints(identifiers.actor, {
      cursor: first.nextCursor ?? undefined,
      limit: 1,
    });
    assert.equal(calls[1]?.arguments_['p_before_submitted_at'], timestamp);
    assert.equal(calls[1]?.arguments_['p_before_id'], identifiers.complaint);
  });

  it('decodes the single assignment-options payload and preserves workflow version', async () => {
    const store = createStore(async () => ({
      data: [
        {
          complaint_id: identifiers.complaint,
          workflow_version: 4,
          options: [
            {
              allowedActions: ['assign'],
              officerAssignmentId: identifiers.officerAssignment,
              authorityDepartmentId: identifiers.authorityDepartment,
              departmentId: identifiers.department,
              departmentName: 'Sanitation',
              wardId: identifiers.ward,
              wardName: 'Ward 1',
              officerRoleId: identifiers.officerRole,
              officerRoleName: 'Ward officer',
              officerName: 'Verified officer',
            },
          ],
        },
      ],
      error: null,
    }));

    const result = await store.listAssignmentOptions(identifiers.actor, identifiers.complaint);
    assert.equal(result.workflowVersion, 4);
    assert.equal(result.options[0]?.officerAssignmentId, identifiers.officerAssignment);
  });

  it('injects path-owned dependency IDs and omits workflow version from the action payload', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [{ response_payload: actionPayload, replayed: false }], error: null };
    });

    const result = await store.performAction(
      identifiers.actor,
      identifiers.complaint,
      {
        kind: 'resolve_external_dependency',
        dependencyId: identifiers.dependency,
        input: { expectedWorkflowVersion: 1, resolutionSummary: 'Permit received.' },
      },
      identity,
      'request-1',
    );

    assert.equal(result.workflowVersion, 2);
    assert.deepEqual(calls[0]?.arguments_, {
      p_actor_user_id: identifiers.actor,
      p_complaint_id: identifiers.complaint,
      p_action_type: 'resolve_external_dependency',
      p_expected_workflow_version: 1,
      p_idempotency_key_hash: identity.idempotencyKeyHash,
      p_request_fingerprint: identity.requestFingerprint,
      p_request_id: 'request-1',
      p_payload: {
        dependencyId: identifiers.dependency,
        resolutionSummary: 'Permit received.',
      },
    });
  });

  it('decodes only the privacy-safe routing summary on authorized detail', async () => {
    const routingSummary = {
      decisionStatus: 'routed',
      confidenceScore: 0.91,
      explanationCode: 'category_and_ward_match',
      fallbackUsed: false,
      fallbackDepth: 0,
      resolvedAt: timestamp,
    };
    const store = createStore(async () => ({
      data: [
        {
          ...queueRow,
          description: 'Garbage has accumulated near the public road.',
          longitude: 73.8567,
          latitude: 18.5204,
          accuracy_meters: 12,
          location_provider: 'gps',
          location_captured_at: timestamp,
          location_verification_status: 'verified',
          location_verification_score: 0.95,
          routing_summary: routingSummary,
          media: [],
          assignment_history: [{ ...assignment, status: 'cancelled' }],
          timeline: [],
          internal_notes: [],
          inspections: [],
          work_references: [],
          external_dependencies: [
            {
              id: identifiers.dependency,
              dependencyType: 'permit',
              description: 'Road closure permit required.',
              expectedBy: timestamp,
              status: 'resolved',
              resolutionSummary: 'Permit received.',
              resolvedAt: timestamp,
              createdAt: timestamp,
            },
          ],
          resolution_evidence: [],
          allowed_actions: ['acknowledge'],
          allowed_status_transitions: ['acknowledged'],
        },
      ],
      error: null,
    }));

    const result = await store.getComplaint(identifiers.actor, identifiers.complaint);
    assert.deepEqual(result.routingSummary, routingSummary);
    assert.equal('candidateEvaluations' in result.routingSummary, false);
    assert.equal(result.assignmentHistory[0]?.status, 'cancelled');
    assert.equal(result.externalDependencies[0]?.resolutionSummary, 'Permit received.');
  });

  it('strictly decodes the complete evidence locator and passes its authorization purpose', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            evidence_id: identifiers.evidence,
            complaint_id: identifiers.complaint,
            bucket_id: 'resolution-evidence-private',
            object_path: `${identifiers.complaint}/${identifiers.evidence}/original`,
            declared_mime_type: 'image/jpeg',
            declared_byte_size: 1_024,
            client_sha256: 'c'.repeat(64),
            observed_mime_type: null,
            observed_byte_size: null,
            upload_expires_at: '2026-07-14T10:15:00.000Z',
            upload_status: 'reserved',
            workflow_version: 3,
          },
        ],
        error: null,
      };
    });

    const result = await store.getResolutionEvidenceObject(
      identifiers.actor,
      identifiers.complaint,
      identifiers.evidence,
      'finalize',
    );

    assert.equal(result.declaredByteSize, 1_024);
    assert.equal(result.observedByteSize, null);
    assert.equal(result.observedMimeType, null);
    assert.equal(result.uploadExpiresAt, '2026-07-14T10:15:00.000Z');
    assert.equal(result.workflowVersion, 3);
    assert.equal(calls[0]?.arguments_['p_purpose'], 'finalize');
    assert.equal(calls[0]?.arguments_['p_complaint_id'], identifiers.complaint);
  });

  it('marks a rejected private evidence object terminal through the service-only RPC', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            evidence_id: identifiers.evidence,
            upload_status: 'failed',
            failure_code: 'CONTENT_TYPE_MISMATCH',
          },
        ],
        error: null,
      };
    });

    await store.failResolutionEvidence(identifiers.evidence, 'CONTENT_TYPE_MISMATCH');

    assert.deepEqual(calls, [
      {
        functionName: 'fail_government_resolution_evidence',
        arguments_: {
          p_evidence_id: identifiers.evidence,
          p_failure_code: 'CONTENT_TYPE_MISMATCH',
        },
      },
    ]);
  });

  it('fails closed for malformed strict rows and maps access markers separately', async () => {
    const malformed = createStore(async () => ({
      data: [{ ...queueRow, latitude: 18.52 }],
      error: null,
    }));
    await assert.rejects(
      malformed.listComplaints(identifiers.actor, { limit: 25 }),
      GovernmentComplaintDataAccessError,
    );

    const denied = createStore(async () => ({
      data: null,
      error: { message: 'GOVERNMENT_ACCESS_REQUIRED' },
    }));
    await assert.rejects(
      denied.listComplaints(identifiers.actor, { limit: 25 }),
      GovernmentComplaintAccessDeniedError,
    );

    const missingDependency = createStore(async () => ({
      data: null,
      error: { message: 'COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND' },
    }));
    await assert.rejects(
      missingDependency.performAction(
        identifiers.actor,
        identifiers.complaint,
        {
          kind: 'resolve_external_dependency',
          dependencyId: identifiers.dependency,
          input: { expectedWorkflowVersion: 1 },
        },
        identity,
        'request-2',
      ),
      (error: unknown) =>
        error instanceof GovernmentComplaintNotFoundError && error.resource === 'dependency',
    );
  });
});
