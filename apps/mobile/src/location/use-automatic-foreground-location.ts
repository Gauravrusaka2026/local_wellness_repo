import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export type AutomaticForegroundLocationStatus =
  'idle' | 'checking' | 'ready' | 'permission-required' | 'error';

type AutomaticForegroundLocationOptions = Readonly<{
  attemptKey: string;
  automaticAcquire: () => Promise<boolean>;
  enabled: boolean;
  explicitAcquire: () => Promise<boolean>;
  onError?: (error: unknown) => void;
}>;

type AutomaticForegroundLocationController = Readonly<{
  refresh: () => Promise<boolean>;
  status: AutomaticForegroundLocationStatus;
}>;

/**
 * Coordinates one navigation-safe automatic attempt per focused route and an
 * explicit recovery action. The location coordinator owns permission policy,
 * exact-coordinate caching and the session-wide one-prompt gate.
 */
export const useAutomaticForegroundLocation = ({
  attemptKey,
  automaticAcquire,
  enabled,
  explicitAcquire,
  onError,
}: AutomaticForegroundLocationOptions): AutomaticForegroundLocationController => {
  const automaticAcquireRef = useRef(automaticAcquire);
  const attemptKeyRef = useRef(attemptKey);
  const explicitAcquireRef = useRef(explicitAcquire);
  const errorRef = useRef(onError);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const isFocusedRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const [status, setStatus] = useState<AutomaticForegroundLocationStatus>('idle');

  useEffect(() => {
    automaticAcquireRef.current = automaticAcquire;
    attemptKeyRef.current = attemptKey;
    explicitAcquireRef.current = explicitAcquire;
    errorRef.current = onError;
  }, [attemptKey, automaticAcquire, explicitAcquire, onError]);

  const run = useCallback(
    async (mode: 'automatic' | 'explicit', requestAttemptKey: string): Promise<boolean> => {
      const generation = requestGenerationRef.current + 1;
      requestGenerationRef.current = generation;
      if (isFocusedRef.current) setStatus('checking');

      const acquire =
        mode === 'automatic' ? automaticAcquireRef.current : explicitAcquireRef.current;
      let request = inFlightRef.current;
      if (request === null) {
        const acquired = acquire();
        const trackedRequest = acquired.finally(() => {
          if (inFlightRef.current === trackedRequest) inFlightRef.current = null;
        });
        inFlightRef.current = trackedRequest;
        request = trackedRequest;
      }

      try {
        const acquired = await request;
        if (
          isFocusedRef.current &&
          requestGenerationRef.current === generation &&
          attemptKeyRef.current === requestAttemptKey
        ) {
          setStatus(acquired ? 'ready' : 'permission-required');
        }
        return acquired;
      } catch (error) {
        if (
          isFocusedRef.current &&
          requestGenerationRef.current === generation &&
          attemptKeyRef.current === requestAttemptKey
        ) {
          setStatus('error');
          errorRef.current?.(error);
        }
        throw error;
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (!enabled) {
        setStatus('idle');
      } else {
        void run('automatic', attemptKey).catch(() => undefined);
      }

      return () => {
        isFocusedRef.current = false;
        requestGenerationRef.current += 1;
      };
    }, [attemptKey, enabled, run]),
  );

  return {
    refresh: () => run('explicit', attemptKeyRef.current),
    status,
  };
};
