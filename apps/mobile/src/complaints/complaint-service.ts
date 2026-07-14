import { ApiClientError, createApiClient } from '@local-wellness/api-client';
import type {
  ComplaintDetail,
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  ComplaintListResult,
  ComplaintLocationCapture,
  ComplaintLocationEvidence,
  ComplaintMedia,
  ComplaintMediaUploadIntent,
  ComplaintReceipt,
  ComplaintTimeline,
  CreateComplaintDraftInput,
  CreateComplaintMediaUploadIntentInput,
  RoutingCategory,
  RoutingAssetDiscoveryResult,
  SubmitComplaintInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';
import {
  createComplaintDraftSchema,
  createComplaintMediaUploadIntentSchema,
  finalizeComplaintMediaSchema,
  submitComplaintSchema,
  updateComplaintDraftSchema,
  discoverRoutingAssetsRequestSchema,
} from '@local-wellness/validation';

import { getPublicApiUrl } from '../config/environment';
import {
  decodeComplaintDetail,
  decodeComplaintDraft,
  decodeComplaintDuplicateCheck,
  decodeComplaintList,
  decodeComplaintMedia,
  decodeComplaintMediaUploadIntent,
  decodeComplaintReceipt,
  decodeComplaintTimeline,
  decodeRoutingCategories,
  decodeRoutingAssetDiscovery,
} from './response-decoders';

const createClient = (accessToken: string) =>
  createApiClient({ baseUrl: getPublicApiUrl(), getAccessToken: () => accessToken });

export const listRoutingCategories = (accessToken: string): Promise<RoutingCategory[]> =>
  createClient(accessToken).get('/api/v1/routing/categories', { decode: decodeRoutingCategories });

export const discoverRoutingAssets = (
  accessToken: string,
  categoryId: string,
  location: ComplaintLocationEvidence,
): Promise<RoutingAssetDiscoveryResult> =>
  createClient(accessToken).post(
    '/api/v1/routing/assets/nearby',
    discoverRoutingAssetsRequestSchema.parse({
      accuracyMeters: location.accuracyMeters,
      capturedAt: location.capturedAt,
      categoryId,
      latitude: location.latitude,
      longitude: location.longitude,
    }),
    { decode: decodeRoutingAssetDiscovery },
  );

export const createComplaintDraft = (
  accessToken: string,
  input: CreateComplaintDraftInput,
  idempotencyKey: string,
): Promise<ComplaintDraft> =>
  createClient(accessToken).post(
    '/api/v1/complaints/drafts',
    createComplaintDraftSchema.parse(input),
    { decode: decodeComplaintDraft, idempotencyKey },
  );

export const getComplaintDraft = (accessToken: string, draftId: string): Promise<ComplaintDraft> =>
  createClient(accessToken).get(`/api/v1/complaints/drafts/${draftId}`, {
    decode: decodeComplaintDraft,
  });

export const updateComplaintDraft = (
  accessToken: string,
  draftId: string,
  input: UpdateComplaintDraftInput,
): Promise<ComplaintDraft> =>
  createClient(accessToken).patch(
    `/api/v1/complaints/drafts/${draftId}`,
    updateComplaintDraftSchema.parse(input),
    { decode: decodeComplaintDraft },
  );

export const setComplaintLocation = (
  accessToken: string,
  draftId: string,
  location: ComplaintLocationCapture,
): Promise<ComplaintDraft> =>
  updateComplaintDraft(accessToken, draftId, { assetId: null, location });

export const discardComplaintDraft = async (
  accessToken: string,
  draftId: string,
): Promise<void> => {
  await createClient(accessToken).delete(`/api/v1/complaints/drafts/${draftId}`, {
    decode: () => undefined,
  });
};

export const createMediaUploadIntent = (
  accessToken: string,
  input: CreateComplaintMediaUploadIntentInput,
  idempotencyKey: string,
): Promise<ComplaintMediaUploadIntent> =>
  createClient(accessToken).post(
    '/api/v1/media/upload-intents',
    createComplaintMediaUploadIntentSchema.parse(input),
    { decode: decodeComplaintMediaUploadIntent, idempotencyKey },
  );

export const finalizeComplaintMedia = (
  accessToken: string,
  mediaId: string,
  input: Readonly<{ byteSize: number; sha256: string }>,
): Promise<ComplaintMedia> =>
  createClient(accessToken).post(
    `/api/v1/media/${mediaId}/finalize`,
    finalizeComplaintMediaSchema.parse(input),
    { decode: decodeComplaintMedia },
  );

export const getComplaintMediaStatus = (
  accessToken: string,
  mediaId: string,
): Promise<ComplaintMedia> =>
  createClient(accessToken).get(`/api/v1/media/${mediaId}/status`, {
    decode: decodeComplaintMedia,
  });

export const checkComplaintDuplicates = (
  accessToken: string,
  draftId: string,
): Promise<ComplaintDuplicateCheckResult> =>
  createClient(accessToken).post(
    `/api/v1/complaints/drafts/${draftId}/duplicate-check`,
    {},
    { decode: decodeComplaintDuplicateCheck },
  );

export const submitComplaintDraft = (
  accessToken: string,
  draftId: string,
  input: SubmitComplaintInput,
  idempotencyKey: string,
): Promise<ComplaintReceipt> =>
  createClient(accessToken).post(
    `/api/v1/complaints/${draftId}/submit`,
    submitComplaintSchema.parse(input),
    { decode: decodeComplaintReceipt, idempotencyKey },
  );

export const listComplaints = (
  accessToken: string,
  cursor?: string,
): Promise<ComplaintListResult> => {
  const query =
    cursor === undefined ? '?limit=25' : `?limit=25&cursor=${encodeURIComponent(cursor)}`;
  return createClient(accessToken).get(`/api/v1/complaints${query}`, {
    decode: decodeComplaintList,
  });
};

export const getComplaint = (accessToken: string, complaintId: string): Promise<ComplaintDetail> =>
  createClient(accessToken).get(`/api/v1/complaints/${complaintId}`, {
    decode: decodeComplaintDetail,
  });

export const getComplaintTimeline = (
  accessToken: string,
  complaintId: string,
): Promise<ComplaintTimeline> =>
  createClient(accessToken).get(`/api/v1/complaints/${complaintId}/timeline`, {
    decode: decodeComplaintTimeline,
  });

export const getUserFacingComplaintError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session has expired. Sign in again.';
    if (error.code === 'UNSUPPORTED_AREA' || error.code === 'COMPLAINT_UNSUPPORTED_AREA') {
      return 'Complaint reporting is not available here yet.';
    }
    if (
      error.code === 'ROUTING_UNAVAILABLE' ||
      error.code === 'ROUTING_CONFIGURATION_UNAVAILABLE' ||
      error.code === 'DEPENDENCY_UNAVAILABLE'
    ) {
      return 'Verified routing is not available for this category and location yet.';
    }
    if (
      error.code === 'LOCATION_LOW_ACCURACY' ||
      error.code === 'COMPLAINT_LOCATION_NOT_VERIFIED'
    ) {
      return 'Location accuracy is too low. Move outdoors and capture it again.';
    }
    if (
      error.code === 'MEDIA_NOT_READY' ||
      error.code === 'COMPLAINT_MEDIA_NOT_READY' ||
      error.code === 'COMPLAINT_MEDIA_COUNT_INVALID'
    ) {
      return 'Your evidence is still being verified. Retry in a moment.';
    }
    if (error.code === 'COMPLAINT_MEDIA_LOCATION_MISMATCH') {
      return 'Evidence must be captured at the verified issue location.';
    }
    if (error.code === 'COMPLAINT_CATEGORY_NOT_ROUTABLE') {
      return 'This category is not currently verified for complaint routing.';
    }
    if (
      error.code === 'COMPLAINT_DUPLICATE_POLICY_NOT_FOUND' ||
      error.code === 'COMPLAINT_DUPLICATE_POLICY_AMBIGUOUS'
    ) {
      return 'Verified duplicate checking is not available for this category yet.';
    }
    if (error.code === 'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED') {
      return 'Review and acknowledge every similar-report suggestion before submitting.';
    }
    if (error.code === 'COMPLAINT_DRAFT_NOT_FOUND') {
      return 'This saved draft is no longer available.';
    }
    if (error.code === 'COMPLAINT_INCOMPLETE' || error.code === 'COMPLAINT_DRAFT_NOT_SUBMITTABLE') {
      return 'Complete the category, description, location, evidence, and duplicate review first.';
    }
    if (error.code === 'NETWORK_ERROR') return error.message;
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'The complaint operation could not be completed. Please try again.';
};
