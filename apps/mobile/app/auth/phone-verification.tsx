import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import {
  challengePhoneMfa,
  enrollPhoneMfa,
  getUserFacingPhoneMfaError,
  inspectPhoneMfa,
  verifyPhoneMfa,
  type PhoneMfaChallenge,
} from '../../src/auth/phone-mfa';
import { getSupabaseClient } from '../../src/auth/supabase';
import { getPublicPhoneMfaMode } from '../../src/config/environment';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type PhoneMfaFlow =
  | Readonly<{ status: 'checking' }>
  | Readonly<{ status: 'enrollment-required' }>
  | Readonly<{ factorId: string; status: 'challenge-required' }>
  | Readonly<{ challenge: PhoneMfaChallenge; status: 'verify' }>
  | Readonly<{ status: 'unavailable' }>;

export default function PhoneVerificationScreen() {
  const auth = useAuth();
  const parameters = useLocalSearchParams<{ optional?: string | string[] }>();
  const router = useRouter();
  const isOptional = getPublicPhoneMfaMode() === 'observe' && parameters.optional === '1';
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<PhoneMfaFlow>({ status: 'checking' });
  const [isPending, setIsPending] = useState(false);
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (
      auth.state.status !== 'mfa-required' &&
      !(auth.state.status === 'signed-in' && isOptional)
    ) {
      return;
    }
    let isCurrent = true;

    const inspect = async (): Promise<void> => {
      try {
        const status = await inspectPhoneMfa(getSupabaseClient());
        if (!isCurrent) return;
        if (status.status === 'assured') {
          if (!isOptional) await auth.refreshAssurance();
          router.replace(isOptional ? '/profile' : '/home');
          return;
        }
        setFlow(status);
      } catch (inspectionError) {
        if (isCurrent) {
          setError(getUserFacingPhoneMfaError(inspectionError, isOptional));
          setFlow({ status: 'unavailable' });
        }
      }
    };

    void inspect();
    return () => {
      isCurrent = false;
    };
  }, [auth, isOptional, router]);

  if (auth.state.status === 'loading') return <LoadingScreen label="Securing your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'signed-in' && !isOptional) return <Redirect href="/home" />;

  const run = async (operation: () => Promise<void>): Promise<void> => {
    setError(null);
    setIsPending(true);
    try {
      await operation();
    } catch (operationError) {
      setError(getUserFacingPhoneMfaError(operationError, isOptional));
    } finally {
      setIsPending(false);
    }
  };

  const enroll = (): Promise<void> =>
    run(async () => {
      const challenge = await enrollPhoneMfa(getSupabaseClient(), phone);
      setOtp('');
      setFlow({ challenge, status: 'verify' });
    });

  const challenge = (factorId: string): Promise<void> =>
    run(async () => {
      const nextChallenge = await challengePhoneMfa(getSupabaseClient(), factorId);
      setOtp('');
      setFlow({ challenge: nextChallenge, status: 'verify' });
    });

  const verify = (activeChallenge: PhoneMfaChallenge): Promise<void> =>
    run(async () => {
      await verifyPhoneMfa(getSupabaseClient(), activeChallenge, otp);
      if (!isOptional) await auth.refreshAssurance();
      router.replace(isOptional ? '/profile' : '/home');
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            {isOptional ? 'OPTIONAL SECURITY SETUP' : 'STEP 2 OF 2'}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Verify your phone
        </Text>
        <Text style={styles.description}>
          {isOptional
            ? 'Phone verification is staged until an SMS provider is connected. You can try setup now or return to your profile.'
            : 'A one-time SMS code protects your private complaint history, profile, and submissions.'}
        </Text>

        {flow.status === 'checking' ? (
          <View accessibilityRole="progressbar" style={styles.loadingCard}>
            <ActivityIndicator color="#166534" />
            <Text style={styles.loadingText}>Checking your phone verification…</Text>
          </View>
        ) : null}

        {flow.status === 'enrollment-required' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Mobile number</Text>
            <TextInput
              accessibilityLabel="Mobile number with country code"
              autoComplete="tel"
              editable={!isPending}
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setPhone(value);
                setError(null);
              }}
              placeholder="+91 98765 43210"
              style={styles.input}
              textContentType="telephoneNumber"
              value={phone}
            />
            <Text style={styles.hint}>
              Include the country code. This number becomes your verified Supabase phone MFA factor;
              it is not used as a separate sign-in identity.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={() => void enroll()}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator
                  accessibilityLabel="Sending phone verification code"
                  color="#fff"
                />
              ) : (
                <Text style={styles.primaryButtonText}>Send verification code</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {flow.status === 'challenge-required' ? (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Registered phone factor found</Text>
            <Text style={styles.hint}>
              Send a fresh SMS code to the phone already protected by Supabase.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={() => void challenge(flow.factorId)}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator
                  accessibilityLabel="Sending phone verification code"
                  color="#fff"
                />
              ) : (
                <Text style={styles.primaryButtonText}>Send code to my phone</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {flow.status === 'verify' ? (
          <View style={styles.form}>
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              A new code was sent by SMS. Enter the newest code below.
            </Text>
            <Text style={styles.label}>One-time code</Text>
            <TextInput
              accessibilityLabel="Phone verification code"
              autoComplete="one-time-code"
              editable={!isPending}
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={(value) => {
                setOtp(value);
                setError(null);
              }}
              placeholder="123456"
              style={styles.input}
              textContentType="oneTimeCode"
              value={otp}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={() => void verify(flow.challenge)}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator accessibilityLabel="Verifying phone" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify and continue</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={() => void challenge(flow.challenge.factorId)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Send a new code</Text>
            </Pressable>
          </View>
        ) : null}

        {error === null ? null : (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        {isOptional ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => router.replace('/profile')}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Not now — return to profile</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => void auth.signOut()}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  confirmCard: { backgroundColor: '#edf7f0', borderRadius: 16, gap: 12, padding: 18 },
  confirmTitle: { color: '#14532d', fontSize: 17, fontWeight: '800' },
  content: { flexGrow: 1, padding: 24, paddingBottom: 40, paddingTop: 54 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 28 },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: '#991b1b',
    lineHeight: 22,
    marginTop: 16,
    padding: 14,
  },
  form: { gap: 12 },
  hint: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '700' },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 18,
  },
  loadingText: { color: '#475569', flex: 1 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  signOutButton: { alignItems: 'center', marginTop: 26, minHeight: 48, padding: 12 },
  signOutText: { color: '#64748b', fontWeight: '700' },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  stepBadgeText: { color: '#166534', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  successText: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    color: '#14532d',
    lineHeight: 22,
    padding: 14,
  },
  title: { color: '#143b27', fontSize: 34, fontWeight: '900', marginBottom: 10 },
});
