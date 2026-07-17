import type {
  ComplaintDetail,
  ComplaintListResult,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionFeedbackResult,
  ComplaintTimeline,
  ReopenComplaintInput,
  ReopenComplaintResult,
} from '@local-wellness/types';
import {
  complaintIdParametersSchema,
  complaintListQuerySchema,
  complaintResolutionFeedbackSchema,
  decodeComplaintDetail,
  decodeComplaintListResult,
  decodeComplaintResolutionContext,
  decodeComplaintResolutionFeedbackResult,
  decodeComplaintTimeline,
  decodeReopenComplaintResult,
  idempotencyKeySchema,
  reopenComplaintSchema,
} from '@local-wellness/validation';

import { ApiError, apiRequest, getUserFacingApiError } from './client';

const invalidResponse = (resource: string): ApiError =>
  new ApiError({
    code: 'INVALID_RESPONSE',
    message: `Local Wellness returned invalid ${resource} data. Please try again.`,
    status: 200,
  });

const decode = <Result>(decoder: (value: unknown) => Result, value: unknown, resource: string) => {
  try {
    return decoder(value);
  } catch {
    throw invalidResponse(resource);
  }
};

const parseComplaintId = (complaintId: string): string => {
  const result = complaintIdParametersSchema.safeParse({ complaintId });
  if (!result.success) {
    throw new ApiError({
      code: 'COMPLAINT_NOT_FOUND',
      message: 'The requested complaint was not found.',
      status: 404,
    });
  }
  return result.data.complaintId;
};

const parseIdempotencyKey = (idempotencyKey: string): string => {
  const result = idempotencyKeySchema.safeParse(idempotencyKey);
  if (!result.success) {
    throw new ApiError({
      code: 'INVALID_REQUEST',
      message: 'The complaint action request is invalid. Reload and try again.',
      status: 400,
    });
  }
  return result.data;
};

export const listComplaints = async (
  accessToken: string,
  cursor?: string,
): Promise<ComplaintListResult> => {
  const query = complaintListQuerySchema.safeParse({ cursor, limit: 25 });
  if (!query.success) {
    throw new ApiError({
      code: 'INVALID_REQUEST',
      message: 'The complaint history page is invalid. Return to the first page.',
      status: 400,
    });
  }

  const parameters = new URLSearchParams({ limit: String(query.data.limit) });
  if (query.data.cursor !== undefined) parameters.set('cursor', query.data.cursor);
  const value = await apiRequest<unknown>(`/api/v1/complaints?${parameters.toString()}`, {
    accessToken,
  });
  return decode(decodeComplaintListResult, value, 'complaint history');
};

export const getComplaint = async (
  accessToken: string,
  complaintId: string,
): Promise<ComplaintDetail> => {
  const identifier = parseComplaintId(complaintId);
  const value = await apiRequest<unknown>(`/api/v1/complaints/${identifier}`, { accessToken });
  return decode(decodeComplaintDetail, value, 'complaint');
};

export const getComplaintTimeline = async (
  accessToken: string,
  complaintId: string,
): Promise<ComplaintTimeline> => {
  const identifier = parseComplaintId(complaintId);
  const value = await apiRequest<unknown>(`/api/v1/complaints/${identifier}/timeline`, {
    accessToken,
  });
  return decode(decodeComplaintTimeline, value, 'complaint timeline');
};

export const getComplaintResolutionContext = async (
  accessToken: string,
  complaintId: string,
): Promise<ComplaintResolutionContext> => {
  const identifier = parseComplaintId(complaintId);
  const value = await apiRequest<unknown>(`/api/v1/complaints/${identifier}/resolution-context`, {
    accessToken,
  });
  return decode(decodeComplaintResolutionContext, value, 'complaint action policy');
};

export const submitComplaintFeedback = async (
  accessToken: string,
  complaintId: string,
  input: ComplaintResolutionFeedbackInput,
  idempotencyKey: string,
): Promise<ComplaintResolutionFeedbackResult> => {
  const identifier = parseComplaintId(complaintId);
  const body = complaintResolutionFeedbackSchema.parse(input);
  const value = await apiRequest<unknown>(`/api/v1/complaints/${identifier}/feedback`, {
    accessToken,
    body,
    idempotencyKey: parseIdempotencyKey(idempotencyKey),
    method: 'POST',
  });
  return decode(decodeComplaintResolutionFeedbackResult, value, 'complaint feedback');
};

export const reopenComplaint = async (
  accessToken: string,
  complaintId: string,
  input: ReopenComplaintInput,
  idempotencyKey: string,
): Promise<ReopenComplaintResult> => {
  const identifier = parseComplaintId(complaintId);
  const body = reopenComplaintSchema.parse(input);
  const value = await apiRequest<unknown>(`/api/v1/complaints/${identifier}/reopen`, {
    accessToken,
    body,
    idempotencyKey: parseIdempotencyKey(idempotencyKey),
    method: 'POST',
  });
  return decode(decodeReopenComplaintResult, value, 'complaint reopen result');
};

export const getUserFacingComplaintError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'COMPLAINT_WORKFLOW_VERSION_CONFLICT') {
      return 'This complaint changed while you were reviewing it. Reload the latest details and try again.';
    }
    if (
      error.code === 'RESOLUTION_POLICY_UNAVAILABLE' ||
      error.code === 'COMPLAINT_RESOLUTION_POLICY_NOT_FOUND' ||
      error.code === 'COMPLAINT_FEEDBACK_NOT_ALLOWED' ||
      error.code === 'RESOLUTION_FEEDBACK_NOT_ALLOWED' ||
      error.code === 'COMPLAINT_REOPEN_NOT_ALLOWED' ||
      error.code === 'COMPLAINT_REOPEN_EVIDENCE_REQUIRED'
    ) {
      return 'This action is not available under the complaint’s current verified policy.';
    }
  }

  return getUserFacingApiError(error);
};
