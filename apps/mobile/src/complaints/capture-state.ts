import type {
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  ComplaintLocationEvidence,
  ComplaintLocationVerificationStatus,
  ComplaintReceipt,
  ComplaintTaxonomyCatalogItem,
  RoutingAssetOption,
  RoutingCategoryCatalogItem,
} from '@local-wellness/types';

export const complaintCaptureSteps = [
  'details',
  'location',
  'media',
  'duplicates',
  'review',
  'submitted',
] as const;

export type ComplaintCaptureStep = (typeof complaintCaptureSteps)[number];

export type UploadState = Readonly<{
  localUri: string;
  progress: number;
  status: 'preparing' | 'reserving' | 'uploading' | 'finalizing' | 'failed';
}>;

export type ComplaintCaptureState = Readonly<{
  assetOptions: readonly RoutingAssetOption[];
  categories: readonly RoutingCategoryCatalogItem[];
  taxonomyItems: readonly ComplaintTaxonomyCatalogItem[];
  draft: ComplaintDraft | null;
  duplicateCheck: ComplaintDuplicateCheckResult | null;
  duplicatesAcknowledged: boolean;
  emergencyAcknowledged: boolean;
  error: string | null;
  isBusy: boolean;
  isOnline: boolean;
  locationSettingsRequired: boolean;
  pendingOperationCount: number;
  receipt: ComplaintReceipt | null;
  step: ComplaintCaptureStep;
  upload: UploadState | null;
}>;

export const initialComplaintCaptureState: ComplaintCaptureState = {
  assetOptions: [],
  categories: [],
  taxonomyItems: [],
  draft: null,
  duplicateCheck: null,
  duplicatesAcknowledged: false,
  emergencyAcknowledged: false,
  error: null,
  isBusy: false,
  isOnline: true,
  locationSettingsRequired: false,
  pendingOperationCount: 0,
  receipt: null,
  step: 'details',
  upload: null,
};

export type ComplaintCaptureAction =
  | Readonly<{ type: 'assets_cleared' }>
  | Readonly<{ type: 'assets_loaded'; assets: readonly RoutingAssetOption[] }>
  | Readonly<{ type: 'busy'; value: boolean }>
  | Readonly<{ type: 'categories_loaded'; categories: readonly RoutingCategoryCatalogItem[] }>
  | Readonly<{
      type: 'taxonomy_loaded';
      taxonomyItems: readonly ComplaintTaxonomyCatalogItem[];
    }>
  | Readonly<{ type: 'draft_loaded'; draft: ComplaintDraft; step?: ComplaintCaptureStep }>
  | Readonly<{ type: 'draft_cleared' }>
  | Readonly<{ type: 'duplicates_loaded'; duplicateCheck: ComplaintDuplicateCheckResult }>
  | Readonly<{ type: 'duplicates_acknowledged'; value: boolean }>
  | Readonly<{ type: 'emergency_acknowledged'; value: boolean }>
  | Readonly<{
      type: 'error';
      message: string | null;
      locationSettingsRequired?: boolean;
    }>
  | Readonly<{ type: 'network_changed'; isOnline: boolean }>
  | Readonly<{ type: 'receipt_loaded'; receipt: ComplaintReceipt }>
  | Readonly<{ type: 'step_changed'; step: ComplaintCaptureStep }>
  | Readonly<{ type: 'upload_changed'; upload: UploadState | null }>;

export const complaintCaptureReducer = (
  state: ComplaintCaptureState,
  action: ComplaintCaptureAction,
): ComplaintCaptureState => {
  switch (action.type) {
    case 'assets_cleared':
      return { ...state, assetOptions: [] };
    case 'assets_loaded':
      return {
        ...state,
        assetOptions: action.assets,
        error: null,
        locationSettingsRequired: false,
      };
    case 'busy': {
      const pendingOperationCount = Math.max(
        0,
        state.pendingOperationCount + (action.value ? 1 : -1),
      );
      return { ...state, isBusy: pendingOperationCount > 0, pendingOperationCount };
    }
    case 'categories_loaded':
      return { ...state, categories: action.categories };
    case 'taxonomy_loaded':
      return { ...state, taxonomyItems: action.taxonomyItems };
    case 'draft_loaded':
      return {
        ...state,
        draft: action.draft,
        duplicateCheck: null,
        duplicatesAcknowledged: false,
        emergencyAcknowledged: false,
        error: null,
        locationSettingsRequired: false,
        receipt: null,
        step: action.step ?? state.step,
      };
    case 'draft_cleared':
      return {
        ...initialComplaintCaptureState,
        categories: state.categories,
        taxonomyItems: state.taxonomyItems,
        isBusy: state.isBusy,
        isOnline: state.isOnline,
        pendingOperationCount: state.pendingOperationCount,
      };
    case 'duplicates_loaded':
      return {
        ...state,
        duplicateCheck: action.duplicateCheck,
        duplicatesAcknowledged: false,
        error: null,
      };
    case 'duplicates_acknowledged':
      return { ...state, duplicatesAcknowledged: action.value };
    case 'emergency_acknowledged':
      return { ...state, emergencyAcknowledged: action.value };
    case 'error':
      return {
        ...state,
        error: action.message,
        locationSettingsRequired:
          action.message === null ? false : (action.locationSettingsRequired ?? false),
      };
    case 'network_changed':
      return { ...state, isOnline: action.isOnline };
    case 'receipt_loaded':
      return {
        ...state,
        error: null,
        receipt: action.receipt,
        step: 'submitted',
        upload: null,
      };
    case 'step_changed':
      return { ...state, error: null, locationSettingsRequired: false, step: action.step };
    case 'upload_changed':
      return { ...state, upload: action.upload };
  }
};

const acceptedLocationStatuses = new Set<ComplaintLocationVerificationStatus>([
  'verified',
  'partially_verified',
]);

export const isLocationEvidenceEligible = (
  location: ComplaintLocationEvidence | null,
): location is ComplaintLocationEvidence =>
  location !== null && acceptedLocationStatuses.has(location.verificationStatus);

export const getLocationRecaptureGuidance = (
  location: ComplaintLocationEvidence | null,
): string | null => {
  if (location === null) {
    return 'Capture your current location while you are physically at the issue.';
  }

  switch (location.verificationStatus) {
    case 'verified':
    case 'partially_verified':
      return null;
    case 'pending':
      return 'Location verification did not finish. Wait a moment, then capture it again.';
    case 'low_accuracy':
      return 'Accuracy is too low. Move outdoors, enable precise location, and capture again.';
    case 'location_mismatch':
      return 'This location does not match the issue evidence. Return to the issue and capture again.';
    case 'suspected_spoofing':
      return 'The device reported an unsafe location signal. Disable mock-location tools and capture again.';
    case 'unsupported_area':
      return 'Verified complaint coverage is not available at this location yet.';
    case 'manual_review':
      return 'This location needs manual review and cannot advance in the capture flow. Capture again with a clearer signal.';
  }
};

export type DraftReadiness = Readonly<{
  isReady: boolean;
  missing: readonly (
    'category' | 'category details' | 'description' | 'location' | 'media' | 'media limit'
  )[];
}>;

export const complaintSubmissionBlockerCodes = [
  'category',
  'taxonomy',
  'category_details',
  'description',
  'unsaved_details',
  'location',
  'asset',
  'media',
  'media_limit',
  'upload',
  'duplicate_acknowledgement',
  'voice_confirmation',
  'emergency_acknowledgement',
  'offline',
] as const;

export type ComplaintSubmissionBlockerCode = (typeof complaintSubmissionBlockerCodes)[number];

export const complaintSubmissionBlockerMessages: Readonly<
  Record<ComplaintSubmissionBlockerCode, string>
> = {
  asset: 'Choose a verified nearby asset.',
  category: 'Choose a category with verified routing.',
  taxonomy: 'Choose a primary category and complaint type.',
  category_details: 'Complete and save the category details.',
  description: 'Add and save a description.',
  duplicate_acknowledgement: 'Review and confirm the similar reports.',
  emergency_acknowledgement: 'Acknowledge the emergency warning.',
  location: 'Capture an accepted current location.',
  media: 'Add the required photo or video evidence.',
  media_limit: 'The report has more evidence than this category allows.',
  offline: 'Reconnect to submit the complaint.',
  unsaved_details: 'Save your latest issue details.',
  upload: 'Wait for the private evidence upload to finish.',
  voice_confirmation: 'Confirm the typed description for the voice note.',
};

type ComplaintSubmissionBlockerInput = Readonly<{
  assetOptions: ComplaintCaptureState['assetOptions'];
  category: RoutingCategoryCatalogItem | null;
  taxonomyItem?: ComplaintTaxonomyCatalogItem | null;
  draft: ComplaintDraft;
  duplicateCheck: ComplaintCaptureState['duplicateCheck'];
  duplicatesAcknowledged: boolean;
  emergencyAcknowledged: boolean;
  hasUnsavedDetails: boolean;
  hasVoice: boolean;
  isEmergencyIssue?: boolean;
  isOnline: boolean;
  upload: ComplaintCaptureState['upload'];
  voiceDescriptionConfirmed: boolean;
}>;

const readinessBlockerByMissingField: Readonly<
  Record<DraftReadiness['missing'][number], ComplaintSubmissionBlockerCode>
> = {
  category: 'category',
  'category details': 'category_details',
  description: 'description',
  location: 'location',
  media: 'media',
  'media limit': 'media_limit',
};

export const getComplaintSubmissionBlockers = ({
  assetOptions,
  category,
  taxonomyItem,
  draft,
  duplicateCheck,
  duplicatesAcknowledged,
  emergencyAcknowledged,
  hasUnsavedDetails,
  hasVoice,
  isEmergencyIssue,
  isOnline,
  upload,
  voiceDescriptionConfirmed,
}: ComplaintSubmissionBlockerInput): readonly ComplaintSubmissionBlockerCode[] => {
  const blockers = new Set<ComplaintSubmissionBlockerCode>();

  for (const missingField of getDraftReadiness(draft, category).missing) {
    blockers.add(readinessBlockerByMissingField[missingField]);
  }
  if (taxonomyItem === null) blockers.add('taxonomy');
  if (hasUnsavedDetails) blockers.add('unsaved_details');
  if (
    category?.requiresAsset === true &&
    !assetOptions.some((asset) => asset.id === draft.assetId)
  ) {
    blockers.add('asset');
  }
  if (upload !== null) blockers.add('upload');
  if (duplicateCheck !== null && duplicateCheck.suggestions.length > 0 && !duplicatesAcknowledged) {
    blockers.add('duplicate_acknowledgement');
  }
  if (hasVoice && !voiceDescriptionConfirmed) blockers.add('voice_confirmation');
  if ((isEmergencyIssue ?? category?.isEmergency) === true && !emergencyAcknowledged) {
    blockers.add('emergency_acknowledgement');
  }
  if (!isOnline) blockers.add('offline');

  return complaintSubmissionBlockerCodes.filter((code) => blockers.has(code));
};

export const getAcknowledgedDuplicateSuggestionIds = (
  duplicateCheck: ComplaintDuplicateCheckResult | null,
): string[] => duplicateCheck?.suggestions.map((suggestion) => suggestion.complaintId) ?? [];

const normalizedAttributes = (
  attributes: Record<string, boolean | number | string>,
): readonly (readonly [string, boolean | number | string])[] =>
  Object.entries(attributes)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value] as const)
    .sort(([left], [right]) => left.localeCompare(right));

export const hasUnsavedComplaintDetails = (
  draft: ComplaintDraft,
  details: Readonly<{
    customAttributes: Record<string, boolean | number | string>;
    description: string;
  }>,
): boolean =>
  details.description.trim() !== (draft.description ?? '').trim() ||
  JSON.stringify(normalizedAttributes(details.customAttributes)) !==
    JSON.stringify(normalizedAttributes(draft.customAttributes));

export const getDraftReadiness = (
  draft: ComplaintDraft | null,
  category?: RoutingCategoryCatalogItem | null,
): DraftReadiness => {
  if (draft === null) {
    return { isReady: false, missing: ['category', 'description', 'location', 'media'] };
  }

  const missing: DraftReadiness['missing'][number][] = [];
  if (draft.categoryId === null || category?.submissionAvailability !== 'available') {
    missing.push('category');
  }
  if (draft.description === null || draft.description.trim().length === 0)
    missing.push('description');
  if (!isLocationEvidenceEligible(draft.location)) {
    missing.push('location');
  }
  if (
    category?.requiredAttributes.some(
      (attribute) => !Object.hasOwn(draft.customAttributes, attribute),
    ) === true
  ) {
    missing.push('category details');
  }
  const finalizedEvidenceCount = draft.media.filter(
    (media) =>
      media.uploadStatus === 'finalized' &&
      (media.metadata.kind === 'photo' || media.metadata.kind === 'video'),
  ).length;
  const minimumMediaCount = category?.minimumMediaCount ?? 1;
  const maximumMediaCount = category?.maximumMediaCount ?? 20;
  if (finalizedEvidenceCount < minimumMediaCount) missing.push('media');
  if (finalizedEvidenceCount > maximumMediaCount) missing.push('media limit');

  return { isReady: missing.length === 0, missing };
};

export const getSelectedCategory = (
  state: Pick<ComplaintCaptureState, 'categories' | 'draft'>,
): RoutingCategoryCatalogItem | null =>
  state.categories.find((category) => category.id === state.draft?.categoryId) ?? null;
