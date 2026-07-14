import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintMedia,
  ComplaintMediaUploadIntent,
  CreateComplaintMediaUploadIntentInput,
  FinalizeComplaintMediaInput,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { ComplaintMediaGateway } from '../data/complaint-media.gateway.js';
import { ComplaintStore } from '../data/complaint.store.js';

@Injectable()
export class ComplaintMediaService {
  private readonly logger = new Logger(ComplaintMediaService.name);

  public constructor(
    @Inject(ComplaintStore)
    private readonly complaintStore: ComplaintStore,
    @Inject(ComplaintMediaGateway)
    private readonly mediaGateway: ComplaintMediaGateway,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async createUploadIntent(
    actor: AuthenticatedUser,
    input: CreateComplaintMediaUploadIntentInput,
    idempotencyKey: string,
  ): Promise<ComplaintMediaUploadIntent> {
    if (input.captureLocation) {
      const now = this.clock.now().getTime();
      const capturedAt = Date.parse(input.captureLocation.capturedAt);
      const deviceRecordedAt = Date.parse(input.captureLocation.deviceRecordedAt);
      if (
        capturedAt > now + 120_000 ||
        deviceRecordedAt > now + 120_000 ||
        Math.abs(capturedAt - deviceRecordedAt) > 300_000
      ) {
        throw ApiException.badRequest(
          'MEDIA_LOCATION_TIMESTAMP_INVALID',
          'The media location timestamps are invalid.',
        );
      }
    }

    const reserved = await this.complaintStore.reserveMedia(
      actor.id,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'create-media-upload-intent', input),
    );
    const upload = await this.mediaGateway.createSignedUploadTarget(
      reserved.bucket,
      reserved.objectPath,
    );

    this.logger.log({
      event: 'complaint_media_upload_reserved',
      actorUserId: actor.id,
      draftId: input.draftId,
      mediaId: reserved.media.id,
      mediaKind: input.kind,
    });
    return {
      media: reserved.media,
      upload: {
        bucket: reserved.bucket,
        objectPath: upload.objectPath,
        token: upload.token,
      },
      expiresAt: reserved.uploadExpiresAt,
    };
  }

  public getMedia(actor: AuthenticatedUser, mediaId: string): Promise<ComplaintMedia> {
    return this.complaintStore.getMedia(actor.id, mediaId);
  }

  public async finalizeMedia(
    actor: AuthenticatedUser,
    mediaId: string,
    input: FinalizeComplaintMediaInput,
  ): Promise<ComplaintMedia> {
    const media = await this.complaintStore.getMedia(actor.id, mediaId);

    if (media.uploadStatus === 'finalized') {
      if (media.metadata.byteSize === input.byteSize && media.metadata.sha256 === input.sha256) {
        return media;
      }

      throw ApiException.conflict(
        'MEDIA_FINALIZATION_CONFLICT',
        'The media object was already finalized with different evidence.',
      );
    }

    const reserved = await this.complaintStore.getMediaObject(actor.id, mediaId);
    const object = await this.mediaGateway.inspectObject(reserved.bucket, reserved.objectPath);
    const matchesReservation =
      object.byteSize === media.metadata.byteSize &&
      object.byteSize === input.byteSize &&
      object.sha256 === media.metadata.sha256 &&
      object.sha256 === input.sha256 &&
      object.mimeType === media.metadata.mimeType;

    if (!matchesReservation) {
      await this.mediaGateway.removeObject(reserved.bucket, reserved.objectPath);
      throw ApiException.conflict(
        'MEDIA_INTEGRITY_MISMATCH',
        'The uploaded media does not match the reserved checksum, size, or content type.',
      );
    }

    const finalized = await this.complaintStore.finalizeMedia(actor.id, mediaId, input);
    this.logger.log({
      event: 'complaint_media_finalized',
      actorUserId: actor.id,
      mediaId,
      mediaKind: finalized.metadata.kind,
      byteSize: finalized.metadata.byteSize,
    });
    return finalized;
  }
}
