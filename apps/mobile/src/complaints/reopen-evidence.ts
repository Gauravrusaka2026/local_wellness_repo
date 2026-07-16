import type {
  ComplaintLocationCapture,
  ComplaintReopenEvidence,
  CreateComplaintReopenEvidenceUploadIntentInput,
} from '@local-wellness/types';
import { createComplaintReopenEvidenceUploadIntentSchema } from '@local-wellness/validation';

import type { PreparedComplaintMedia } from './media-service';

export const buildReopenEvidenceUploadIntentInput = (
  workflowVersion: number,
  media: PreparedComplaintMedia,
  captureLocation: ComplaintLocationCapture,
): CreateComplaintReopenEvidenceUploadIntentInput =>
  createComplaintReopenEvidenceUploadIntentSchema.parse({
    byteSize: media.byteSize,
    captureLocation,
    capturedAt: media.capturedAt,
    ...(media.durationMilliseconds === undefined
      ? {}
      : { durationMilliseconds: media.durationMilliseconds }),
    expectedWorkflowVersion: workflowVersion,
    ...(media.heightPixels === undefined ? {} : { heightPixels: media.heightPixels }),
    kind: media.kind,
    mimeType: media.mimeType,
    sha256: media.sha256,
    ...(media.widthPixels === undefined ? {} : { widthPixels: media.widthPixels }),
  });

export const createRatingValues = (minimum: number, maximum: number): number[] => {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
    return [];
  }

  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
};

export const getFinalizedReopenEvidenceIds = (evidence: ComplaintReopenEvidence[]): string[] => [
  ...new Set(
    evidence
      .filter(
        ({ finalizedAt, uploadStatus }) => uploadStatus === 'finalized' && finalizedAt !== null,
      )
      .map(({ id }) => id),
  ),
];
