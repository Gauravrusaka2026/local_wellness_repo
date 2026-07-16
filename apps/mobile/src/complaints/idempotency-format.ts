export const formatComplaintIdempotencyKey = (
  operation: 'create' | 'media' | 'submit',
  identifier: string,
): string => `complaint-${operation}:${identifier}`;

export const rotateComplaintSubmitIdempotencyKey = (
  currentKey: string,
  createKey: () => string,
): string => {
  const nextKey = createKey();
  if (nextKey === currentKey) {
    throw new Error('The complaint submission identity could not be rotated.');
  }
  return nextKey;
};
