import { createHash } from 'node:crypto';

const governanceNamespace = 'f4f74f8d-dfe5-5b1f-a5d2-64705c90d68c';

const uuidBytes = (value: string): Buffer => Buffer.from(value.replaceAll('-', ''), 'hex');

const formatUuid = (value: Buffer): string => {
  const hex = value.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-')
    .toLowerCase();
};

export const sha256Hex = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex');

export const stableGovernanceUuid = (kind: string, naturalKey: string): string => {
  const digest = createHash('sha1')
    .update(uuidBytes(governanceNamespace))
    .update(Buffer.from(`${kind}:${naturalKey}`, 'utf8'))
    .digest()
    .subarray(0, 16);

  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  return formatUuid(digest);
};
