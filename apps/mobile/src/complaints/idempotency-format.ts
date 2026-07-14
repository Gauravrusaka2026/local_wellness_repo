export const formatComplaintIdempotencyKey = (
  operation: 'create' | 'media' | 'submit',
  identifier: string,
): string => `complaint-${operation}:${identifier}`;
