import type { SupportedStorage } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  createSecureStorageManifest,
  parseSecureStorageManifest,
  splitSecureStorageValue,
} from './secure-storage-format';

const STORAGE_PREFIX = 'local-wellness.auth';

const getStorageKey = async (key: string): Promise<string> => {
  const keyDigest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
  return `${STORAGE_PREFIX}.${keyDigest}`;
};

const getChunkKey = (storageKey: string, chunkIndex: number): string =>
  `${storageKey}.${String(chunkIndex)}`;

const deleteChunks = async (storageKey: string, chunkCount: number): Promise<void> => {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, chunkIndex) =>
      SecureStore.deleteItemAsync(getChunkKey(storageKey, chunkIndex)),
    ),
  );
};

export const secureSessionStorage: SupportedStorage = {
  async getItem(key: string) {
    const storageKey = await getStorageKey(key);
    const storedManifest = await SecureStore.getItemAsync(storageKey);
    const chunkCount = parseSecureStorageManifest(storedManifest);

    if (chunkCount === null) {
      // This also supports values written by the pre-chunking adapter.
      return storedManifest;
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, chunkIndex) =>
        SecureStore.getItemAsync(getChunkKey(storageKey, chunkIndex)),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },

  async removeItem(key: string) {
    const storageKey = await getStorageKey(key);
    const storedManifest = await SecureStore.getItemAsync(storageKey);
    const chunkCount = parseSecureStorageManifest(storedManifest);

    if (chunkCount !== null) {
      await deleteChunks(storageKey, chunkCount);
    }

    await SecureStore.deleteItemAsync(storageKey);
  },

  async setItem(key: string, value: string) {
    const storageKey = await getStorageKey(key);
    const previousManifest = await SecureStore.getItemAsync(storageKey);
    const previousChunkCount = parseSecureStorageManifest(previousManifest) ?? 0;
    const chunks = splitSecureStorageValue(value);

    await Promise.all(
      chunks.map((chunk, chunkIndex) =>
        SecureStore.setItemAsync(getChunkKey(storageKey, chunkIndex), chunk, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      ),
    );
    await SecureStore.setItemAsync(storageKey, createSecureStorageManifest(chunks.length), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    if (previousChunkCount > chunks.length) {
      await Promise.all(
        Array.from({ length: previousChunkCount - chunks.length }, (_, chunkOffset) =>
          SecureStore.deleteItemAsync(getChunkKey(storageKey, chunks.length + chunkOffset)),
        ),
      );
    }
  },
};
