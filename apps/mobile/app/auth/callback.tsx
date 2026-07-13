import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { completeAuthCallback, getUserFacingAuthError } from '../../src/auth/auth-service';
import { ErrorScreen, LoadingScreen } from '../../src/ui/screen';

const firstParameter = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function AuthCallbackScreen() {
  const parameters = useLocalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const complete = async (): Promise<void> => {
      try {
        const code = firstParameter(parameters.code);
        const tokenHash = firstParameter(parameters.token_hash);
        await completeAuthCallback({
          ...(code === undefined ? {} : { code }),
          ...(tokenHash === undefined ? {} : { tokenHash }),
        });

        if (isCurrent) {
          router.replace('/profile');
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
  }, [parameters.code, parameters.token_hash, router]);

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
