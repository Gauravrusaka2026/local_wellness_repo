export const complaintOperationNames = [
  'reload_categories',
  'start_draft',
  'refresh_draft',
  'update_details',
  'capture_location',
  'load_assets',
  'upload_media',
  'retry_upload',
  'check_duplicates',
  'submit',
  'discard_draft',
  'change_step',
] as const;

export type ComplaintOperationName = (typeof complaintOperationNames)[number];

type ActiveComplaintOperation = Readonly<{
  name: ComplaintOperationName;
  promise: Promise<unknown>;
}>;

export type ComplaintMutationGuardState = {
  current: ActiveComplaintOperation | null;
};

export class ComplaintOperationInProgressError extends Error {
  readonly activeOperation: ComplaintOperationName;
  readonly attemptedOperation: ComplaintOperationName;

  constructor(activeOperation: ComplaintOperationName, attemptedOperation: ComplaintOperationName) {
    super('Wait for the current report update to finish.');
    this.name = 'ComplaintOperationInProgressError';
    this.activeOperation = activeOperation;
    this.attemptedOperation = attemptedOperation;
  }
}

export const isComplaintOperationInProgress = (state: ComplaintMutationGuardState): boolean =>
  state.current !== null;

export const runExclusiveComplaintOperation = <Result>(
  state: ComplaintMutationGuardState,
  name: ComplaintOperationName,
  operation: () => Promise<Result>,
  options: Readonly<{
    onBusyChange?: (isBusy: boolean) => void;
    singleFlight?: boolean;
  }> = {},
): Promise<Result> => {
  const active = state.current;
  if (active !== null) {
    if (options.singleFlight === true && active.name === name) {
      return active.promise as Promise<Result>;
    }

    return Promise.reject(new ComplaintOperationInProgressError(active.name, name));
  }

  const pending = Promise.resolve()
    .then(operation)
    .finally(() => {
      if (state.current?.promise !== pending) return;
      state.current = null;
      options.onBusyChange?.(false);
    });

  state.current = { name, promise: pending };
  options.onBusyChange?.(true);
  return pending;
};
