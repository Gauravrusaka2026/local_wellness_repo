import type {
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  ComplaintReceipt,
  RoutingCategory,
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
  categories: readonly RoutingCategory[];
  draft: ComplaintDraft | null;
  duplicateCheck: ComplaintDuplicateCheckResult | null;
  duplicatesAcknowledged: boolean;
  emergencyAcknowledged: boolean;
  error: string | null;
  isBusy: boolean;
  isOnline: boolean;
  receipt: ComplaintReceipt | null;
  step: ComplaintCaptureStep;
  upload: UploadState | null;
}>;

export const initialComplaintCaptureState: ComplaintCaptureState = {
  categories: [],
  draft: null,
  duplicateCheck: null,
  duplicatesAcknowledged: false,
  emergencyAcknowledged: false,
  error: null,
  isBusy: false,
  isOnline: true,
  receipt: null,
  step: 'details',
  upload: null,
};

export type ComplaintCaptureAction =
  | Readonly<{ type: 'busy'; value: boolean }>
  | Readonly<{ type: 'categories_loaded'; categories: readonly RoutingCategory[] }>
  | Readonly<{ type: 'draft_loaded'; draft: ComplaintDraft; step?: ComplaintCaptureStep }>
  | Readonly<{ type: 'draft_cleared' }>
  | Readonly<{ type: 'duplicates_loaded'; duplicateCheck: ComplaintDuplicateCheckResult }>
  | Readonly<{ type: 'duplicates_acknowledged'; value: boolean }>
  | Readonly<{ type: 'emergency_acknowledged'; value: boolean }>
  | Readonly<{ type: 'error'; message: string | null }>
  | Readonly<{ type: 'network_changed'; isOnline: boolean }>
  | Readonly<{ type: 'receipt_loaded'; receipt: ComplaintReceipt }>
  | Readonly<{ type: 'step_changed'; step: ComplaintCaptureStep }>
  | Readonly<{ type: 'upload_changed'; upload: UploadState | null }>;

export const complaintCaptureReducer = (
  state: ComplaintCaptureState,
  action: ComplaintCaptureAction,
): ComplaintCaptureState => {
  switch (action.type) {
    case 'busy':
      return { ...state, isBusy: action.value };
    case 'categories_loaded':
      return { ...state, categories: action.categories };
    case 'draft_loaded':
      return {
        ...state,
        draft: action.draft,
        duplicateCheck: null,
        duplicatesAcknowledged: false,
        emergencyAcknowledged: false,
        error: null,
        receipt: null,
        step: action.step ?? state.step,
      };
    case 'draft_cleared':
      return {
        ...initialComplaintCaptureState,
        categories: state.categories,
        isOnline: state.isOnline,
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
      return { ...state, error: action.message, isBusy: false };
    case 'network_changed':
      return { ...state, isOnline: action.isOnline };
    case 'receipt_loaded':
      return {
        ...state,
        error: null,
        isBusy: false,
        receipt: action.receipt,
        step: 'submitted',
        upload: null,
      };
    case 'step_changed':
      return { ...state, error: null, step: action.step };
    case 'upload_changed':
      return { ...state, upload: action.upload };
  }
};

export type DraftReadiness = Readonly<{
  isReady: boolean;
  missing: readonly ('category' | 'description' | 'location' | 'media')[];
}>;

export const getDraftReadiness = (draft: ComplaintDraft | null): DraftReadiness => {
  if (draft === null) {
    return { isReady: false, missing: ['category', 'description', 'location', 'media'] };
  }

  const missing: DraftReadiness['missing'][number][] = [];
  if (draft.categoryId === null) missing.push('category');
  if (draft.description === null || draft.description.trim().length === 0)
    missing.push('description');
  if (
    draft.location === null ||
    !['verified', 'partially_verified'].includes(draft.location.verificationStatus)
  ) {
    missing.push('location');
  }
  if (!draft.media.some((media) => media.uploadStatus === 'finalized')) missing.push('media');

  return { isReady: missing.length === 0, missing };
};

export const getSelectedCategory = (
  state: Pick<ComplaintCaptureState, 'categories' | 'draft'>,
): RoutingCategory | null =>
  state.categories.find((category) => category.id === state.draft?.categoryId) ?? null;
