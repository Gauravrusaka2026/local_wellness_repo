export type ComplaintAccountabilityOperation =
  'feedback' | 'reopen' | 'reopen-evidence' | 'reopen-evidence-finalize';

export const formatComplaintAccountabilityIdempotencyKey = (
  operation: ComplaintAccountabilityOperation,
  identifier: string,
): string => `complaint-${operation}:${identifier}`;

export type StableComplaintMutationIdentity = Readonly<{
  fingerprint: string;
  key: string;
}>;

export const retainStableComplaintMutationIdentity = (
  current: StableComplaintMutationIdentity | null,
  operation: ComplaintAccountabilityOperation,
  fingerprint: string,
  createIdentifier: () => string,
): StableComplaintMutationIdentity =>
  current?.fingerprint === fingerprint
    ? current
    : {
        fingerprint,
        key: formatComplaintAccountabilityIdempotencyKey(operation, createIdentifier()),
      };
