import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ComplaintOperationInProgressError,
  isComplaintOperationInProgress,
  runExclusiveComplaintOperation,
  type ComplaintMutationGuardState,
} from '../src/complaints/mutation-guard';

const createGuard = (): ComplaintMutationGuardState => ({ current: null });

describe('complaint mutation guard', () => {
  it('shares one submit promise across rapid repeated submit actions', async () => {
    const guard = createGuard();
    const busyChanges: boolean[] = [];
    let finish: ((value: string) => void) | undefined;
    let submitCalls = 0;
    const submit = () => {
      submitCalls += 1;
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    };

    const first = runExclusiveComplaintOperation(guard, 'submit', submit, {
      onBusyChange: (isBusy) => busyChanges.push(isBusy),
      singleFlight: true,
    });
    const second = runExclusiveComplaintOperation(guard, 'submit', submit, {
      onBusyChange: (isBusy) => busyChanges.push(isBusy),
      singleFlight: true,
    });

    assert.equal(first, second);
    assert.equal(isComplaintOperationInProgress(guard), true);
    assert.equal(submitCalls, 0);
    await Promise.resolve();
    assert.equal(submitCalls, 1);

    finish?.('submitted');
    assert.equal(await first, 'submitted');
    assert.equal(isComplaintOperationInProgress(guard), false);
    assert.deepEqual(busyChanges, [true, false]);
  });

  it('rejects a different report mutation while submission is in flight', async () => {
    const guard = createGuard();
    let finishSubmit: (() => void) | undefined;
    let updateCalls = 0;
    const pendingSubmit = runExclusiveComplaintOperation(
      guard,
      'submit',
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve;
        }),
      { singleFlight: true },
    );

    await assert.rejects(
      runExclusiveComplaintOperation(guard, 'update_details', async () => {
        updateCalls += 1;
      }),
      (error: unknown) => {
        assert.ok(error instanceof ComplaintOperationInProgressError);
        assert.equal(error.activeOperation, 'submit');
        assert.equal(error.attemptedOperation, 'update_details');
        return true;
      },
    );
    assert.equal(updateCalls, 0);
    assert.equal(isComplaintOperationInProgress(guard), true);

    await Promise.resolve();
    finishSubmit?.();
    await pendingSubmit;
  });

  it('does not merge two distinct media uploads and releases the guard after failure', async () => {
    const guard = createGuard();
    let rejectUpload: ((reason: Error) => void) | undefined;
    const firstUpload = runExclusiveComplaintOperation(
      guard,
      'upload_media',
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectUpload = reject;
        }),
    );

    await assert.rejects(
      runExclusiveComplaintOperation(guard, 'upload_media', async () => undefined),
      ComplaintOperationInProgressError,
    );

    await Promise.resolve();
    rejectUpload?.(new Error('upload failed'));
    await assert.rejects(firstUpload, /upload failed/u);
    assert.equal(isComplaintOperationInProgress(guard), false);

    assert.equal(
      await runExclusiveComplaintOperation(guard, 'capture_location', async () => 'captured'),
      'captured',
    );
  });
});
