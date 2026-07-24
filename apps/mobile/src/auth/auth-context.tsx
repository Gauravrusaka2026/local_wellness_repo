import { ConfigurationError } from '@local-wellness/config';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { signOut as signOutFromSupabase } from './auth-service';
import { recordAuthAuditEventSafely } from '../api/auth-audit';
import {
  getPublicPhoneVerificationMode,
  validateMobileRuntimeEnvironment,
} from '../config/environment';
import { clearCurrentAreaLocationCache } from '../location/device-location';
import {
  resolveSessionPhoneVerification,
  scheduleAuthStateFollowUp,
  type VerifiedAuthState,
} from './auth-state';
import { getSupabaseClient } from './supabase';

type AuthState =
  | Readonly<{ status: 'configuration-error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | VerifiedAuthState;

type AuthContextValue = Readonly<{
  refreshAssurance: () => Promise<void>;
  signOut: () => Promise<void>;
  state: AuthState;
}>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const authResolutionId = useRef(0);
  const locationCacheOwnerId =
    state.status === 'signed-in' || state.status === 'phone-verification-required'
      ? state.session.user.id
      : null;

  useEffect(() => {
    clearCurrentAreaLocationCache();
  }, [locationCacheOwnerId]);

  const resolveSession = useCallback(async (session: Session, requestedResolutionId?: number) => {
    const resolutionId = requestedResolutionId ?? ++authResolutionId.current;
    const supabase = getSupabaseClient();
    const nextState = await resolveSessionPhoneVerification(
      session,
      () => supabase.auth.getUser(),
      getPublicPhoneVerificationMode() === 'enforce',
    );
    if (authResolutionId.current === resolutionId) setState(nextState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cancelScheduledResolution: (() => void) | undefined;

    try {
      validateMobileRuntimeEnvironment({ isNativeRuntime: Platform.OS !== 'web' });
      const supabase = getSupabaseClient();
      const initialResolutionId = ++authResolutionId.current;

      void supabase.auth.getSession().then(({ data, error }) => {
        if (!isMounted || authResolutionId.current !== initialResolutionId) return;
        if (error || data.session === null) {
          setState({ status: 'signed-out' });
          return;
        }
        void resolveSession(data.session, initialResolutionId);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) {
          return;
        }

        cancelScheduledResolution?.();
        cancelScheduledResolution = undefined;

        if (session === null) {
          authResolutionId.current += 1;
          setState({ status: 'signed-out' });
        } else {
          const resolutionId = ++authResolutionId.current;
          cancelScheduledResolution = scheduleAuthStateFollowUp(() => {
            cancelScheduledResolution = undefined;
            if (!isMounted || authResolutionId.current !== resolutionId) return;
            void resolveSession(session, resolutionId);
          });
        }

        if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          void recordAuthAuditEventSafely(session.access_token, 'session_refreshed');
        }
      });

      return () => {
        isMounted = false;
        authResolutionId.current += 1;
        cancelScheduledResolution?.();
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
  }, [resolveSession]);

  const refreshAssurance = useCallback(async (): Promise<void> => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    if (data.session === null) {
      setState({ status: 'signed-out' });
      return;
    }
    await resolveSession(data.session);
  }, [resolveSession]);

  const signOut = useCallback(async (): Promise<void> => {
    await signOutFromSupabase();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      refreshAssurance,
      signOut,
      state,
    }),
    [refreshAssurance, signOut, state],
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
