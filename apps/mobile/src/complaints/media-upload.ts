import type {
  ComplaintLocationCapture,
  CreateComplaintMediaUploadIntentInput,
} from '@local-wellness/types';
import { createComplaintMediaUploadIntentSchema } from '@local-wellness/validation';

import type { PreparedComplaintMedia } from './media-service';

export const buildMediaUploadIntentInput = (
  draftId: string,
  media: PreparedComplaintMedia,
  captureLocation?: ComplaintLocationCapture,
): CreateComplaintMediaUploadIntentInput =>
  createComplaintMediaUploadIntentSchema.parse({
    byteSize: media.byteSize,
    captureSource: media.captureSource,
    capturedAt: media.capturedAt,
    ...(captureLocation === undefined ? {} : { captureLocation }),
    draftId,
    ...(media.durationMilliseconds === undefined
      ? {}
      : { durationMilliseconds: media.durationMilliseconds }),
    ...(media.heightPixels === undefined ? {} : { heightPixels: media.heightPixels }),
    kind: media.kind,
    mimeType: media.mimeType,
    sha256: media.sha256,
    ...(media.widthPixels === undefined ? {} : { widthPixels: media.widthPixels }),
  });
