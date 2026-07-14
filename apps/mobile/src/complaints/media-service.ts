import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type {
  ComplaintMediaCaptureSource,
  ComplaintMediaKind,
  ComplaintMediaMimeType,
  ComplaintMediaUploadTarget,
} from '@local-wellness/types';

import { getSupabaseClient } from '../auth/supabase';

const MAXIMUM_MEDIA_BYTES = 50 * 1_024 * 1_024;
const mediaDirectory = new Directory(Paths.document, 'complaint-media');

export type PreparedComplaintMedia = Readonly<{
  byteSize: number;
  captureSource: ComplaintMediaCaptureSource;
  capturedAt: string;
  durationMilliseconds?: number | undefined;
  heightPixels?: number | undefined;
  kind: ComplaintMediaKind;
  localUri: string;
  mimeType: ComplaintMediaMimeType;
  sha256: string;
  thumbnailUri?: string | undefined;
  widthPixels?: number | undefined;
}>;

export class ComplaintMediaError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ComplaintMediaError';
  }
}

const bytesToHex = (bytes: Uint8Array): string =>
  [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');

const ensureMediaDirectory = (): void => {
  mediaDirectory.create({ idempotent: true, intermediates: true });
};

const persistFile = async (sourceUri: string, extension: string): Promise<File> => {
  ensureMediaDirectory();
  const source = new File(sourceUri);
  if (!source.exists) {
    throw new ComplaintMediaError('The captured media file is no longer available.');
  }

  const destination = new File(mediaDirectory, `${Crypto.randomUUID()}${extension}`);
  source.copy(destination);
  return destination;
};

const inspectFile = async (file: File): Promise<Readonly<{ byteSize: number; sha256: string }>> => {
  const byteSize = file.size;
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > MAXIMUM_MEDIA_BYTES) {
    throw new ComplaintMediaError('Media must be between 1 byte and 50 MB.');
  }

  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes());
  return { byteSize, sha256: bytesToHex(new Uint8Array(digest)) };
};

export const prepareCapturedPhoto = async (input: {
  capturedAt: string;
  height: number;
  uri: string;
  width: number;
}): Promise<PreparedComplaintMedia> => {
  const resized = await manipulateAsync(
    input.uri,
    input.width > 1_920 ? [{ resize: { width: 1_920 } }] : [],
    { compress: 0.78, format: SaveFormat.JPEG },
  );
  const file = await persistFile(resized.uri, '.jpg');

  return {
    ...(await inspectFile(file)),
    captureSource: 'live_camera',
    capturedAt: input.capturedAt,
    heightPixels: resized.height,
    kind: 'photo',
    localUri: file.uri,
    mimeType: 'image/jpeg',
    widthPixels: resized.width,
  };
};

export const prepareCapturedVideo = async (input: {
  capturedAt: string;
  durationMilliseconds: number;
  uri: string;
}): Promise<PreparedComplaintMedia> => {
  const file = await persistFile(input.uri, '.mp4');
  const thumbnail = await VideoThumbnails.getThumbnailAsync(file.uri, { quality: 0.65, time: 500 });

  return {
    ...(await inspectFile(file)),
    captureSource: 'live_video',
    capturedAt: input.capturedAt,
    durationMilliseconds: input.durationMilliseconds,
    heightPixels: thumbnail.height,
    kind: 'video',
    localUri: file.uri,
    mimeType: 'video/mp4',
    thumbnailUri: thumbnail.uri,
    widthPixels: thumbnail.width,
  };
};

export const prepareCapturedVoice = async (input: {
  capturedAt: string;
  durationMilliseconds: number;
  uri: string;
}): Promise<PreparedComplaintMedia> => {
  const file = await persistFile(input.uri, '.m4a');

  return {
    ...(await inspectFile(file)),
    captureSource: 'live_microphone',
    capturedAt: input.capturedAt,
    durationMilliseconds: input.durationMilliseconds,
    kind: 'voice',
    localUri: file.uri,
    mimeType: 'audio/mp4',
  };
};

export const uploadPreparedMedia = async (
  media: PreparedComplaintMedia,
  target: ComplaintMediaUploadTarget,
): Promise<void> => {
  const file = new File(media.localUri);
  if (!file.exists) {
    throw new ComplaintMediaError('The pending media file is no longer available.');
  }

  const { error } = await getSupabaseClient()
    .storage.from(target.bucket)
    .uploadToSignedUrl(target.objectPath, target.token, await file.arrayBuffer(), {
      cacheControl: '0',
      contentType: media.mimeType,
      upsert: false,
    });

  if (error) {
    throw new ComplaintMediaError('The private media upload failed. You can retry safely.');
  }
};

export const deletePreparedMedia = (localUri: string): void => {
  const file = new File(localUri);
  if (file.exists) file.delete();
};
