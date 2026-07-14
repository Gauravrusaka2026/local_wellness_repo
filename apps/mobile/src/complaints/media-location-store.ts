import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { ComplaintLocationCapture } from '@local-wellness/types';
import { complaintLocationCaptureSchema } from '@local-wellness/validation';

const STORAGE_PREFIX = 'local-wellness.complaint-media-location';

const getStorageKey = async (idempotencyKey: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    idempotencyKey,
  );
  return `${STORAGE_PREFIX}.${digest}`;
};

export const saveMediaCaptureLocation = async (
  idempotencyKey: string,
  location: ComplaintLocationCapture,
): Promise<void> => {
  const validated = complaintLocationCaptureSchema.parse(location);
  await SecureStore.setItemAsync(await getStorageKey(idempotencyKey), JSON.stringify(validated), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const loadMediaCaptureLocation = async (
  idempotencyKey: string,
): Promise<ComplaintLocationCapture | null> => {
  const stored = await SecureStore.getItemAsync(await getStorageKey(idempotencyKey));
  if (stored === null) return null;

  try {
    return complaintLocationCaptureSchema.parse(JSON.parse(stored));
  } catch {
    return null;
  }
};

export const clearMediaCaptureLocation = async (idempotencyKey: string): Promise<void> => {
  await SecureStore.deleteItemAsync(await getStorageKey(idempotencyKey));
};
