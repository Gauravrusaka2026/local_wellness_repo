import { useCallback, useEffect, useState } from 'react';

import { getUserFacingApiError } from '../api/client';
import { registerCurrentDevice } from './device-service';

type DeviceRegistrationState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'registered' }>
  | Readonly<{ status: 'registering' }>;

export const useDeviceRegistration = (accessToken: string) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DeviceRegistrationState>({ status: 'registering' });

  useEffect(() => {
    let isCurrent = true;

    const register = async (): Promise<void> => {
      setState({ status: 'registering' });

      try {
        await registerCurrentDevice(accessToken);

        if (isCurrent) {
          setState({ status: 'registered' });
        }
      } catch (error) {
        if (isCurrent) {
          setState({ message: getUserFacingApiError(error), status: 'error' });
        }
      }
    };

    void register();

    return () => {
      isCurrent = false;
    };
  }, [accessToken, attempt]);

  const retry = useCallback((): void => {
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  return { retry, state } as const;
};
