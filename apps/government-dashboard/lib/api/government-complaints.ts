import type {
  GovernmentComplaintActionResult,
  GovernmentComplaintAssignmentOptions,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueQuery,
  GovernmentComplaintQueueResult,
  GovernmentResolutionEvidenceAccess,
  GovernmentResolutionEvidenceFinalization,
  GovernmentResolutionEvidenceUploadIntent,
} from '@local-wellness/types';
import {
  decodeGovernmentComplaintActionResult,
  decodeGovernmentComplaintAssignmentOptions,
  decodeGovernmentComplaintDetail,
  decodeGovernmentComplaintQueueResult,
  decodeGovernmentResolutionEvidenceAccess,
  decodeGovernmentResolutionEvidenceFinalization,
  decodeGovernmentResolutionEvidenceUploadIntent,
} from '@local-wellness/validation';

import { createGovernmentApiClient } from './client';

export {
  decodeGovernmentComplaintActionResult,
  decodeGovernmentComplaintAssignmentOptions,
  decodeGovernmentComplaintDetail,
  decodeGovernmentComplaintQueueResult,
  decodeGovernmentResolutionEvidenceAccess,
  decodeGovernmentResolutionEvidenceFinalization,
  decodeGovernmentResolutionEvidenceUploadIntent,
};

const complaintIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const assertIdentifier = (value: string, label: string): void => {
  if (!complaintIdPattern.test(value)) {
    throw new TypeError(`The ${label} identifier is invalid.`);
  }
};

const toScopeSearch = (scopeRoleAssignmentId?: string): string => {
  if (scopeRoleAssignmentId === undefined) return '';
  assertIdentifier(scopeRoleAssignmentId, 'scope role assignment');
  return `?${new URLSearchParams({ scopeRoleAssignmentId }).toString()}`;
};

const toQueueSearch = (query: GovernmentComplaintQueueQuery): string => {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(query.limit));
  if (query.cursor) parameters.set('cursor', query.cursor);
  if (query.scopeRoleAssignmentId)
    parameters.set('scopeRoleAssignmentId', query.scopeRoleAssignmentId);
  if (query.queue) parameters.set('queue', query.queue);
  query.statuses?.forEach((status) => parameters.append('statuses', status));
  if (query.categoryId) parameters.set('categoryId', query.categoryId);
  if (query.wardId) parameters.set('wardId', query.wardId);
  if (query.authorityDepartmentId)
    parameters.set('authorityDepartmentId', query.authorityDepartmentId);
  if (query.officerAssignmentId) parameters.set('officerAssignmentId', query.officerAssignmentId);
  if (query.submittedFrom) parameters.set('submittedFrom', query.submittedFrom);
  if (query.submittedTo) parameters.set('submittedTo', query.submittedTo);
  if (query.search) parameters.set('search', query.search);
  return parameters.toString();
};

export const getGovernmentComplaintQueue = (
  accessToken: string,
  query: GovernmentComplaintQueueQuery,
): Promise<GovernmentComplaintQueueResult> =>
  createGovernmentApiClient(accessToken).get(
    `/api/v1/government/complaints?${toQueueSearch(query)}`,
    { decode: decodeGovernmentComplaintQueueResult },
  );

export const getGovernmentComplaint = (
  accessToken: string,
  complaintId: string,
  scopeRoleAssignmentId?: string,
): Promise<GovernmentComplaintDetail> => {
  assertIdentifier(complaintId, 'complaint');
  return createGovernmentApiClient(accessToken).get(
    `/api/v1/government/complaints/${complaintId}${toScopeSearch(scopeRoleAssignmentId)}`,
    { decode: decodeGovernmentComplaintDetail },
  );
};

export const getGovernmentComplaintAssignmentOptions = (
  accessToken: string,
  complaintId: string,
  scopeRoleAssignmentId?: string,
): Promise<GovernmentComplaintAssignmentOptions> => {
  assertIdentifier(complaintId, 'complaint');
  return createGovernmentApiClient(accessToken).get(
    `/api/v1/government/complaints/${complaintId}/assignment-options${toScopeSearch(scopeRoleAssignmentId)}`,
    { decode: decodeGovernmentComplaintAssignmentOptions },
  );
};

export type GovernmentComplaintActionPath =
  | 'acknowledge'
  | 'assign'
  | 'external-dependencies'
  | 'inspections'
  | 'internal-notes'
  | 'resolution'
  | 'status'
  | 'transfer'
  | 'work-references';

export const postGovernmentComplaintAction = (
  accessToken: string,
  complaintId: string,
  actionPath: GovernmentComplaintActionPath,
  body: unknown,
  idempotencyKey: string,
): Promise<GovernmentComplaintActionResult> => {
  assertIdentifier(complaintId, 'complaint');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/${actionPath}`,
    body,
    { decode: decodeGovernmentComplaintActionResult, idempotencyKey },
  );
};

export const completeGovernmentComplaintInspection = (
  accessToken: string,
  complaintId: string,
  inspectionId: string,
  body: unknown,
  idempotencyKey: string,
): Promise<GovernmentComplaintActionResult> => {
  assertIdentifier(complaintId, 'complaint');
  assertIdentifier(inspectionId, 'inspection');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/inspections/${inspectionId}/complete`,
    body,
    { decode: decodeGovernmentComplaintActionResult, idempotencyKey },
  );
};

export const resolveGovernmentComplaintExternalDependency = (
  accessToken: string,
  complaintId: string,
  dependencyId: string,
  body: unknown,
  idempotencyKey: string,
): Promise<GovernmentComplaintActionResult> => {
  assertIdentifier(complaintId, 'complaint');
  assertIdentifier(dependencyId, 'external dependency');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/external-dependencies/${dependencyId}/resolve`,
    body,
    { decode: decodeGovernmentComplaintActionResult, idempotencyKey },
  );
};

export const createResolutionEvidenceUploadIntent = (
  accessToken: string,
  complaintId: string,
  body: unknown,
  idempotencyKey: string,
): Promise<GovernmentResolutionEvidenceUploadIntent> => {
  assertIdentifier(complaintId, 'complaint');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/resolution-evidence/upload-intents`,
    body,
    { decode: decodeGovernmentResolutionEvidenceUploadIntent, idempotencyKey },
  );
};

export const finalizeResolutionEvidence = (
  accessToken: string,
  complaintId: string,
  evidenceId: string,
  body: unknown,
  idempotencyKey: string,
): Promise<GovernmentResolutionEvidenceFinalization> => {
  assertIdentifier(complaintId, 'complaint');
  assertIdentifier(evidenceId, 'resolution evidence');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/resolution-evidence/${evidenceId}/finalize`,
    body,
    { decode: decodeGovernmentResolutionEvidenceFinalization, idempotencyKey },
  );
};

export const getResolutionEvidenceAccess = (
  accessToken: string,
  complaintId: string,
  evidenceId: string,
  scopeRoleAssignmentId?: string,
): Promise<GovernmentResolutionEvidenceAccess> => {
  assertIdentifier(complaintId, 'complaint');
  assertIdentifier(evidenceId, 'resolution evidence');
  return createGovernmentApiClient(accessToken).post(
    `/api/v1/government/complaints/${complaintId}/resolution-evidence/${evidenceId}/access${toScopeSearch(scopeRoleAssignmentId)}`,
    undefined,
    { decode: decodeGovernmentResolutionEvidenceAccess },
  );
};
