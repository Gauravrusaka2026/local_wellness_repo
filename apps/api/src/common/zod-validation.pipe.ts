import { Injectable, type PipeTransform } from '@nestjs/common';
import type { JsonObject } from '@local-wellness/types';
import type { ZodType } from 'zod';

import { ApiException } from './api-exception.js';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  public constructor(private readonly schema: ZodType<T>) {}

  public transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const details: JsonObject = {
      issues: result.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.map(String),
      })),
    };

    throw new ApiException(400, 'VALIDATION_ERROR', 'The request is invalid.', details);
  }
}
