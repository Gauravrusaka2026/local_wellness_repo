const MANIFEST_PREFIX = 'lw-secure-v1:';

export const SECURE_STORAGE_CHUNK_SIZE = 1_800;

export const splitSecureStorageValue = (value: string): readonly string[] => {
  if (value.length === 0) {
    return [''];
  }

  const chunks: string[] = [];

  for (let offset = 0; offset < value.length; offset += SECURE_STORAGE_CHUNK_SIZE) {
    chunks.push(value.slice(offset, offset + SECURE_STORAGE_CHUNK_SIZE));
  }

  return chunks;
};

export const createSecureStorageManifest = (chunkCount: number): string => {
  if (!Number.isSafeInteger(chunkCount) || chunkCount < 1) {
    throw new Error('Secure storage requires at least one chunk.');
  }

  return `${MANIFEST_PREFIX}${String(chunkCount)}`;
};

export const parseSecureStorageManifest = (value: string | null): number | null => {
  if (value === null || !value.startsWith(MANIFEST_PREFIX)) {
    return null;
  }

  const chunkCount = Number(value.slice(MANIFEST_PREFIX.length));

  return Number.isSafeInteger(chunkCount) && chunkCount >= 1 ? chunkCount : null;
};
