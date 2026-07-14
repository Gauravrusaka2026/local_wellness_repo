import { idempotencyKeySchema } from '@local-wellness/validation';

import { ZodValidationPipe } from './zod-validation.pipe.js';

const idempotencyKeyPipe = new ZodValidationPipe(idempotencyKeySchema);

export const requireIdempotencyKey = (value: unknown): string =>
  idempotencyKeyPipe.transform(value);
