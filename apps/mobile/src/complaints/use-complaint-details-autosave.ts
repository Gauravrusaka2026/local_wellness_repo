import type { UpdateComplaintDraftInput } from '@local-wellness/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createComplaintDetailsFingerprint } from './complaint-form-automation';

export type ComplaintDetailsAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type ComplaintDetailsAutosaveOptions = Readonly<{
  delayMilliseconds?: number;
  draftId: string | null;
  enabled: boolean;
  input: Pick<UpdateComplaintDraftInput, 'categoryId' | 'customAttributes' | 'description'>;
  persistedInput: Pick<
    UpdateComplaintDraftInput,
    'categoryId' | 'customAttributes' | 'description'
  >;
  save: (input: UpdateComplaintDraftInput) => Promise<void>;
}>;

export const useComplaintDetailsAutosave = ({
  delayMilliseconds = 650,
  draftId,
  enabled,
  input,
  persistedInput,
  save,
}: ComplaintDetailsAutosaveOptions): Readonly<{
  hasPendingChanges: boolean;
  retry: () => void;
  status: ComplaintDetailsAutosaveStatus;
}> => {
  const desiredFingerprint = createComplaintDetailsFingerprint(input);
  const persistedFingerprint = createComplaintDetailsFingerprint(persistedInput);
  const [operation, setOperation] = useState<Readonly<{
    draftId: string;
    fingerprint: string;
    status: 'error' | 'saved' | 'saving';
  }> | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const activeDraftIdRef = useRef<string | null>(draftId);
  const inputRef = useRef(input);
  const lastQueuedKeyRef = useRef<string | null>(null);
  const persistedFingerprintRef = useRef(persistedFingerprint);
  const saveRef = useRef(save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeDraftIdRef.current = draftId;
    inputRef.current = input;
    persistedFingerprintRef.current = persistedFingerprint;
    saveRef.current = save;
  }, [draftId, input, persistedFingerprint, save]);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const queueLatest = useCallback(
    (forceRetry = false): void => {
      const latestInput = inputRef.current;
      const fingerprint = createComplaintDetailsFingerprint(latestInput);
      if (!enabled || fingerprint === persistedFingerprintRef.current) {
        return;
      }

      const queuedDraftId = activeDraftIdRef.current;
      if (queuedDraftId === null) return;
      const queuedKey = `${queuedDraftId}:${fingerprint}`;
      if (!forceRetry && queuedKey === lastQueuedKeyRef.current) return;

      lastQueuedKeyRef.current = queuedKey;
      const task = chainRef.current
        .catch(() => undefined)
        .then(async () => {
          if (activeDraftIdRef.current !== queuedDraftId) return;
          if (persistedFingerprintRef.current === fingerprint) {
            setOperation({ draftId: queuedDraftId, fingerprint, status: 'saved' });
            return;
          }
          setOperation({ draftId: queuedDraftId, fingerprint, status: 'saving' });
          await saveRef.current(latestInput);
          if (activeDraftIdRef.current !== queuedDraftId) return;
          setOperation({ draftId: queuedDraftId, fingerprint, status: 'saved' });
        })
        .catch((error: unknown) => {
          if (activeDraftIdRef.current === queuedDraftId) {
            if (lastQueuedKeyRef.current === queuedKey) {
              lastQueuedKeyRef.current = null;
            }
            setOperation({ draftId: queuedDraftId, fingerprint, status: 'error' });
          }
          throw error;
        });
      chainRef.current = task.catch(() => undefined);
    },
    [enabled],
  );

  useEffect(() => {
    clearTimer();
    if (!enabled || draftId === null || persistedFingerprint === desiredFingerprint) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      queueLatest();
    }, delayMilliseconds);
    return clearTimer;
  }, [
    clearTimer,
    delayMilliseconds,
    desiredFingerprint,
    draftId,
    enabled,
    persistedFingerprint,
    queueLatest,
  ]);

  useEffect(() => clearTimer, [clearTimer]);

  const status: ComplaintDetailsAutosaveStatus =
    !enabled || draftId === null
      ? 'idle'
      : desiredFingerprint === persistedFingerprint
        ? 'saved'
        : operation?.draftId === draftId && operation.fingerprint === desiredFingerprint
          ? operation.status
          : 'pending';

  return {
    hasPendingChanges: desiredFingerprint !== persistedFingerprint,
    retry: () => {
      clearTimer();
      queueLatest(true);
    },
    status,
  };
};
