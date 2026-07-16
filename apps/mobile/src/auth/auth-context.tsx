import type { Session } from '@supabase/supabase-js';
import { ConfigurationError } from '@local-wellness/config';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { signOut as signOutFromSupabase } from './auth-service';
import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { validateMobileRuntimeEnvironment } from '../config/environment';
import { getSupabaseClient } from './supabase';

type AuthState =
  | Readonly<{ status: 'configuration-error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'signed-in'; session: Session }>
  | Readonly<{ status: 'signed-out' }>;

type AuthContextValue = Readonly<{
  signOut: () => Promise<void>;
  state: AuthState;
}>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    try {
      validateMobileRuntimeEnvironment({ isNativeRuntime: Platform.OS !== 'web' });
      const supabase = getSupabaseClient();

      void supabase.auth.getSession().then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setState({ status: 'signed-out' });
          return;
        }

        setState(
          data.session === null
            ? { status: 'signed-out' }
            : { session: data.session, status: 'signed-in' },
        );
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) {
          return;
        }

        setState(session === null ? { status: 'signed-out' } : { session, status: 'signed-in' });

        if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          void recordAuthAuditEventSafely(session.access_token, 'session_refreshed');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      void Promise.resolve().then(() => {
        if (isMounted) {
          setState({
            message:
              error instanceof ConfigurationError
                ? error.message
                : 'The app could not initialize secure authentication.',
            status: 'configuration-error',
          });
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await signOutFromSupabase();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      signOut,
      state,
    }),
    [signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
