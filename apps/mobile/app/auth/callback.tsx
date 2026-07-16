import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { completeAuthCallback, getUserFacingAuthError } from '../../src/auth/auth-service';
import { ErrorScreen, LoadingScreen } from '../../src/ui/screen';

export default function AuthCallbackScreen() {
  const parameters = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let isCurrent = true;

    const complete = async (): Promise<void> => {
      try {
        await completeAuthCallback({
          ...(parameters.code === undefined ? {} : { code: parameters.code }),
          ...(parameters.error === undefined ? {} : { error: parameters.error }),
          ...(parameters.error_code === undefined ? {} : { errorCode: parameters.error_code }),
          ...(parameters.error_description === undefined
            ? {}
            : { errorDescription: parameters.error_description }),
          ...(parameters.token_hash === undefined ? {} : { tokenHash: parameters.token_hash }),
          ...(parameters.type === undefined ? {} : { type: parameters.type }),
        });

        if (isCurrent) {
          router.replace('/home');
        }
      } catch (callbackError) {
        if (isCurrent) {
          setError(getUserFacingAuthError(callbackError));
        }
      }
    };

    void complete();

    return () => {
      isCurrent = false;
    };
  }, [
    parameters.code,
    parameters.error,
    parameters.error_code,
    parameters.error_description,
    parameters.token_hash,
    parameters.type,
    router,
  ]);

  return error === null ? (
    <LoadingScreen label="Completing your secure sign-in…" />
  ) : (
    <ErrorScreen
      action={{ label: 'Return to sign in', onPress: () => router.replace('/auth') }}
      message={error}
      title="Sign-in link not accepted"
    />
  );
}
