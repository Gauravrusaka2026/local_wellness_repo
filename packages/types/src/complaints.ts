import type {
  PublicRoutingConfidence,
  PublicRoutingExplanation,
  RoutingDecisionStatus,
  RoutingTarget,
} from './routing.js';

export const complaintDraftStatuses = ['active', 'discarded', 'submitted'] as const;
export type ComplaintDraftStatus = (typeof complaintDraftStatuses)[number];

export const complaintStatuses = [
  'submitted',
  'validation_pending',
  'validated',
  'routing_pending',
  'assigned',
  'acknowledged',
  'inspection_scheduled',
  'inspection_completed',
  'work_order_created',
  'work_in_progress',
  'resolution_submitted',
  'resolved',
  'transferred',
  'waiting_for_material',
  'waiting_for_external_agency',
  'reopened',
  'rejected',
  'cancelled',
  'escalated',
] as const;
export type ComplaintStatus = (typeof complaintStatuses)[number];

export const complaintLocationProviders = ['gps', 'network', 'fused', 'unknown'] as const;
export type ComplaintLocationProvider = (typeof complaintLocationProviders)[number];

export const complaintLocationVerificationStatuses = [
  'pending',
  'verified',
  'partially_verified',
  'low_accuracy',
  'location_mismatch',
  'suspected_spoofing',
  'unsupported_area',
  'manual_review',
] as const;
export type ComplaintLocationVerificationStatus =
  (typeof complaintLocationVerificationStatuses)[number];

export const complaintMediaKinds = ['photo', 'video', 'voice'] as const;
export type ComplaintMediaKind = (typeof complaintMediaKinds)[number];

export const complaintMediaCaptureSources = [
  'live_camera',
  'live_video',
  'live_microphone',
] as const;
export type ComplaintMediaCaptureSource = (typeof complaintMediaCaptureSources)[number];

export const complaintMediaMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
] as const;
export type ComplaintMediaMimeType = (typeof complaintMediaMimeTypes)[number];

export const complaintMediaUploadStatuses = ['reserved', 'finalized', 'failed', 'expired'] as const;
export type ComplaintMediaUploadStatus = (typeof complaintMediaUploadStatuses)[number];

export const complaintMediaProcessingStatuses = [
  'pending',
  'processing',
  'ready',
  'failed',
] as const;
export type ComplaintMediaProcessingStatus = (typeof complaintMediaProcessingStatuses)[number];

export const complaintMediaModerationStatuses = [
  'pending',
  'review_required',
  'approved',
  'rejected',
] as const;
export type ComplaintMediaModerationStatus = (typeof complaintMediaModerationStatuses)[number];

export const complaintVisibilityValues = ['private', 'public'] as const;
export type ComplaintVisibility = (typeof complaintVisibilityValues)[number];

export const complaintTimelineEventTypes = [
  'submitted',
  'status_changed',
  'assigned',
  'transferred',
  'resolution_submitted',
  'reopened',
] as const;
export type ComplaintTimelineEventType = (typeof complaintTimelineEventTypes)[number];

export const complaintIdempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;

export interface ComplaintLocationCapture {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  deviceRecordedAt: string;
  provider: ComplaintLocationProvider;
  isMockLocation: boolean | null;
}

export interface ComplaintLocationEvidence extends ComplaintLocationCapture {
  id: string;
  verificationStatus: ComplaintLocationVerificationStatus;
  verificationScore: number | null;
}

export interface CreateComplaintDraftInput {
  categoryId?: string | undefined;
  assetId?: string | null | undefined;
  description?: string | null | undefined;
  location?: ComplaintLocationCapture | null | undefined;
}

export type UpdateComplaintDraftInput = CreateComplaintDraftInput;

export interface ComplaintMediaMetadata {
  kind: ComplaintMediaKind;
  captureSource: ComplaintMediaCaptureSource;
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  sha256: string;
  capturedAt: string | null;
  widthPixels: number | null;
  heightPixels: number | null;
  durationMilliseconds: number | null;
  captureLocation: ComplaintLocationCapture | null;
}

export interface CreateComplaintMediaUploadIntentInput {
  draftId: string;
  kind: ComplaintMediaKind;
  captureSource: ComplaintMediaCaptureSource;
  mimeType: ComplaintMediaMimeType;
  byteSize: number;
  sha256: string;
  capturedAt?: string | undefined;
  widthPixels?: number | undefined;
  heightPixels?: number | undefined;
  durationMilliseconds?: number | undefined;
  captureLocation?: ComplaintLocationCapture | undefined;
}

export interface ComplaintMediaUploadTarget {
  bucket: string;
  objectPath: string;
  token: string;
}

export interface ComplaintMedia {
  id: string;
  draftId: string | null;
  complaintId: string | null;
  uploadStatus: ComplaintMediaUploadStatus;
  processingStatus: ComplaintMediaProcessingStatus;
  moderationStatus: ComplaintMediaModerationStatus;
  metadata: ComplaintMediaMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintMediaUploadIntent {
  media: ComplaintMedia;
  upload: ComplaintMediaUploadTarget;
  expiresAt: string;
}

export interface FinalizeComplaintMediaInput {
  byteSize: number;
  sha256: string;
}

export interface ComplaintDraft {
  id: string;
  status: ComplaintDraftStatus;
  visibility: 'private';
  categoryId: string | null;
  assetId: string | null;
  description: string | null;
  location: ComplaintLocationEvidence | null;
  media: ComplaintMedia[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface ComplaintDuplicateSuggestion {
  complaintId: string;
  complaintNumber: string;
  categoryId: string;
  categoryName: string;
  status: ComplaintStatus;
  score: number;
  approximateDistanceMeters: number;
  submittedAt: string;
}

export interface ComplaintDuplicateCheckResult {
  id: string;
  draftId: string;
  policyId: string;
  policyVersionId: string;
  policyVersion: number;
  checkedAt: string;
  suggestions: ComplaintDuplicateSuggestion[];
}

export interface SubmitComplaintInput {
  acknowledgedDuplicateSuggestionIds?: string[] | undefined;
  emergencyDisclaimerAcknowledged?: true | undefined;
}

export interface ComplaintRoutingSummary {
  status: RoutingDecisionStatus;
  target: RoutingTarget | null;
  confidence: PublicRoutingConfidence;
  explanation: PublicRoutingExplanation;
}

export interface ComplaintReceipt {
  id: string;
  complaintNumber: string;
  status: ComplaintStatus;
  visibility: 'private';
  categoryId: string;
  submittedAt: string;
  routing: ComplaintRoutingSummary;
}

export interface ComplaintListItem {
  id: string;
  complaintNumber: string;
  categoryId: string;
  categoryName: string;
  status: ComplaintStatus;
  visibility: ComplaintVisibility;
  submittedAt: string;
  updatedAt: string;
}

export interface ComplaintListQuery {
  cursor?: string | undefined;
  limit: number;
}

export interface ComplaintListResult {
  items: ComplaintListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ComplaintDetail extends ComplaintReceipt {
  description: string | null;
  location: ComplaintLocationEvidence;
  media: ComplaintMedia[];
  updatedAt: string;
}

export interface ComplaintTimelineEntry {
  id: string;
  complaintId: string;
  eventType: ComplaintTimelineEventType;
  status: ComplaintStatus;
  title: string;
  description: string | null;
  occurredAt: string;
}

export interface ComplaintTimeline {
  complaintId: string;
  entries: ComplaintTimelineEntry[];
}
