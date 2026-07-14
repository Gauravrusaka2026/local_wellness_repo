import * as Crypto from 'expo-crypto';

import { formatComplaintIdempotencyKey } from './idempotency-format';

export type ComplaintIdempotencyKeys = Readonly<{
  create: string;
  submit: string;
}>;

export const createComplaintIdempotencyKey = (operation: 'create' | 'media' | 'submit'): string =>
  formatComplaintIdempotencyKey(operation, Crypto.randomUUID());

export const createComplaintIdempotencyKeys = (): ComplaintIdempotencyKeys => ({
  create: createComplaintIdempotencyKey('create'),
  submit: createComplaintIdempotencyKey('submit'),
});
