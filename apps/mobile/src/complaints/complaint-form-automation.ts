import type { ComplaintDraft, UpdateComplaintDraftInput } from '@local-wellness/types';

type AutomaticLocationStatus = 'error' | 'checking' | 'idle' | 'permission-required' | 'ready';

export type ComplaintLocationRecoveryAction = 'capture' | 'refresh' | null;

export const getComplaintLocationRecoveryAction = ({
  automaticStatus,
  hasLocation,
  locationEligible,
}: Readonly<{
  automaticStatus: AutomaticLocationStatus;
  hasLocation: boolean;
  locationEligible: boolean;
}>): ComplaintLocationRecoveryAction => {
  if (automaticStatus === 'checking' || locationEligible) return null;
  if (hasLocation) return 'refresh';
  if (automaticStatus === 'error' || automaticStatus === 'permission-required') return 'capture';
  return null;
};

const normalizeAttributes = (
  attributes: UpdateComplaintDraftInput['customAttributes'],
): readonly (readonly [string, boolean | number | string])[] =>
  Object.entries(attributes ?? {})
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value] as const)
    .sort(([left], [right]) => left.localeCompare(right));

export const createComplaintDetailsFingerprint = (
  input: Pick<UpdateComplaintDraftInput, 'categoryId' | 'customAttributes' | 'description'>,
): string =>
  JSON.stringify({
    categoryId: input.categoryId ?? null,
    customAttributes: normalizeAttributes(input.customAttributes),
    description: input.description?.trim() ?? '',
  });

export const createComplaintDuplicateCheckFingerprint = (
  draft: ComplaintDraft | null,
): string | null => {
  if (draft === null || draft.categoryId === null || draft.location === null) return null;

  return JSON.stringify({
    assetId: draft.assetId,
    categoryId: draft.categoryId,
    description: draft.description?.trim() ?? '',
    draftId: draft.id,
    locationEvidenceId: draft.location.id,
    media: draft.media
      .filter((media) => media.uploadStatus === 'finalized')
      .map((media) => media.id)
      .sort(),
  });
};
