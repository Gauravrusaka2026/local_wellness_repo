import { createHash } from 'node:crypto';

import type { ComplaintMutationIdentity } from '../data/complaint.store.js';

const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }

  throw new TypeError('The idempotent request payload must contain only JSON values.');
};

export const createComplaintMutationIdentity = (
  idempotencyKey: string,
  scope: string,
  payload: unknown,
): ComplaintMutationIdentity => ({
  idempotencyKeyHash: hash(idempotencyKey),
  requestFingerprint: hash(`${scope}\n${canonicalJson(payload)}`),
});
