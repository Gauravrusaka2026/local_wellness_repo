import { complaintIdempotencyKeyPattern, type ComplaintMediaKind } from '@local-wellness/types';

import { complaintCaptureSteps, type ComplaintCaptureStep } from './capture-state';
import type { PreparedComplaintMedia } from './media-service';

export type PendingMediaResume = Readonly<{
  byteSize: number;
  capturedAt: string;
  durationMilliseconds: number | null;
  heightPixels: number | null;
  idempotencyKey: string;
  kind: ComplaintMediaKind;
  localUri: string;
  mediaId: string | null;
  mimeType: PreparedComplaintMedia['mimeType'];
  sha256: string;
  widthPixels: number | null;
}>;

export type ComplaintResumeRecord = Readonly<{
  createIdempotencyKey: string;
  draftId: string | null;
  ownerUserId: string;
  pendingMedia: PendingMediaResume | null;
  step: ComplaintCaptureStep;
  submitIdempotencyKey: string;
  updatedAt: string;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNullableNumber = (value: unknown): number | null | undefined =>
  value === null ? null : typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readNullableString = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === 'string' ? value : undefined;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAXIMUM_MEDIA_BYTES = 50 * 1_024 * 1_024;

export const createPendingMediaResume = (
  media: PreparedComplaintMedia,
  idempotencyKey: string,
): PendingMediaResume => ({
  byteSize: media.byteSize,
  capturedAt: media.capturedAt,
  durationMilliseconds: media.durationMilliseconds ?? null,
  heightPixels: media.heightPixels ?? null,
  idempotencyKey,
  kind: media.kind,
  localUri: media.localUri,
  mediaId: null,
  mimeType: media.mimeType,
  sha256: media.sha256,
  widthPixels: media.widthPixels ?? null,
});

export const pendingMediaToPreparedMedia = (value: PendingMediaResume): PreparedComplaintMedia => ({
  byteSize: value.byteSize,
  captureSource:
    value.kind === 'photo'
      ? 'live_camera'
      : value.kind === 'video'
        ? 'live_video'
        : 'live_microphone',
  capturedAt: value.capturedAt,
  ...(value.durationMilliseconds === null
    ? {}
    : { durationMilliseconds: value.durationMilliseconds }),
  ...(value.heightPixels === null ? {} : { heightPixels: value.heightPixels }),
  kind: value.kind,
  localUri: value.localUri,
  mimeType: value.mimeType,
  sha256: value.sha256,
  ...(value.widthPixels === null ? {} : { widthPixels: value.widthPixels }),
});

export const decodePendingMediaResume = (value: unknown): PendingMediaResume | null => {
  if (!isRecord(value)) return null;

  const durationMilliseconds = readNullableNumber(value['durationMilliseconds']);
  const heightPixels = readNullableNumber(value['heightPixels']);
  const mediaId = readNullableString(value['mediaId']);
  const widthPixels = readNullableNumber(value['widthPixels']);
  const kind = value['kind'];
  const mimeType = value['mimeType'];
  const supportedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
  ];
  const hasValidDimensions = [heightPixels, widthPixels].every(
    (dimension) =>
      dimension === null ||
      (typeof dimension === 'number' && Number.isSafeInteger(dimension) && dimension > 0),
  );
  const hasValidDuration =
    durationMilliseconds === null ||
    (typeof durationMilliseconds === 'number' &&
      Number.isSafeInteger(durationMilliseconds) &&
      durationMilliseconds > 0 &&
      durationMilliseconds <= 60_000);
  const hasCompatibleMimeType =
    (kind === 'photo' && String(mimeType).startsWith('image/')) ||
    (kind === 'video' && String(mimeType).startsWith('video/')) ||
    (kind === 'voice' && String(mimeType).startsWith('audio/'));
  if (
    typeof value['byteSize'] !== 'number' ||
    !Number.isSafeInteger(value['byteSize']) ||
    value['byteSize'] <= 0 ||
    value['byteSize'] > MAXIMUM_MEDIA_BYTES ||
    typeof value['capturedAt'] !== 'string' ||
    !Number.isFinite(Date.parse(value['capturedAt'])) ||
    durationMilliseconds === undefined ||
    !hasValidDuration ||
    heightPixels === undefined ||
    typeof value['idempotencyKey'] !== 'string' ||
    !complaintIdempotencyKeyPattern.test(value['idempotencyKey']) ||
    !['photo', 'video', 'voice'].includes(String(kind)) ||
    typeof value['localUri'] !== 'string' ||
    !value['localUri'].startsWith('file://') ||
    mediaId === undefined ||
    (mediaId !== null && !UUID_PATTERN.test(mediaId)) ||
    !supportedMimeTypes.includes(String(mimeType)) ||
    !hasCompatibleMimeType ||
    typeof value['sha256'] !== 'string' ||
    !SHA256_PATTERN.test(value['sha256']) ||
    !hasValidDimensions ||
    widthPixels === undefined
  ) {
    return null;
  }

  return {
    byteSize: value['byteSize'],
    capturedAt: value['capturedAt'],
    durationMilliseconds,
    heightPixels,
    idempotencyKey: value['idempotencyKey'],
    kind: kind as ComplaintMediaKind,
    localUri: value['localUri'],
    mediaId,
    mimeType: mimeType as PreparedComplaintMedia['mimeType'],
    sha256: value['sha256'],
    widthPixels,
  };
};

export const serializePendingMediaResume = (value: PendingMediaResume): string =>
  JSON.stringify({
    byteSize: value.byteSize,
    capturedAt: value.capturedAt,
    durationMilliseconds: value.durationMilliseconds,
    heightPixels: value.heightPixels,
    idempotencyKey: value.idempotencyKey,
    kind: value.kind,
    localUri: value.localUri,
    mediaId: value.mediaId,
    mimeType: value.mimeType,
    sha256: value.sha256,
    widthPixels: value.widthPixels,
  });

export const isComplaintCaptureStep = (value: string): value is ComplaintCaptureStep =>
  complaintCaptureSteps.some((step) => step === value);
