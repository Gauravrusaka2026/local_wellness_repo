import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { getOtpResendSecondsRemaining, OTP_RESEND_COOLDOWN_MS } from '../../src/auth/otp-challenge';
import {
  getConfirmedPhone,
  getPhoneUpdateAssurance,
  getUserFacingPhoneVerificationError,
  requestPhoneVerification,
  resendPhoneVerification,
  shouldInspectPhoneVerificationForUser,
  verifyPhoneUpdateAuthenticator,
  verifyPhoneVerification,
  type PendingPhoneVerification,
} from '../../src/auth/phone-verification';
import { getSupabaseClient } from '../../src/auth/supabase';
import { getPublicPhoneVerificationMode } from '../../src/config/environment';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type PhoneVerificationFlow =
  | Readonly<{ status: 'checking' }>
  | Readonly<{
      factorId: string;
      factorLabel: string | null;
      status: 'authenticator-entry';
    }>
  | Readonly<{ status: 'phone-entry' }>
  | Readonly<{ pending: PendingPhoneVerification; status: 'code-entry' }>
  | Readonly<{ status: 'unavailable' }>;

const readOptionalParameter = (value: string | string[] | undefined): boolean =>
  value === '1' || (Array.isArray(value) && value.length === 1 && value[0] === '1');

export default function PhoneVerificationScreen() {
  const auth = useAuth();
  const { t } = useLocalization();
  const parameters = useLocalSearchParams<{ optional?: string | string[] }>();
  const router = useRouter();
  const inspectedUserId = useRef<string | null>(null);
  const operationPending = useRef(false);
  const isOptional =
    getPublicPhoneVerificationMode() === 'observe' && readOptionalParameter(parameters.optional);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<PhoneVerificationFlow>({ status: 'checking' });
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const resendSeconds = getOtpResendSecondsRemaining(resendAvailableAt, now);

  const activeSession =
    auth.state.status === 'signed-in' || auth.state.status === 'phone-verification-required'
      ? auth.state.session
      : null;
  const activeUserId = activeSession?.user.id ?? null;
  const authStatus = auth.state.status;
  const refreshAssurance = auth.refreshAssurance;

  useEffect(() => {
    if (resendSeconds === 0) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), 1_000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (
      activeUserId === null ||
      (authStatus !== 'phone-verification-required' && !isOptional) ||
      !shouldInspectPhoneVerificationForUser(inspectedUserId.current, activeUserId)
    ) {
      return;
    }

    inspectedUserId.current = activeUserId;
    let isCurrent = true;
    const inspect = async (): Promise<void> => {
      try {
        const confirmedPhone = await getConfirmedPhone(getSupabaseClient());
        if (!isCurrent) return;
        if (confirmedPhone !== null && confirmedPhone.userId === activeUserId) {
          if (!isOptional) await refreshAssurance();
          router.replace(isOptional ? '/profile' : '/home');
          return;
        }

        const assurance = await getPhoneUpdateAssurance(getSupabaseClient(), activeUserId);
        if (!isCurrent) return;
        setFlow(
          assurance.status === 'authenticator-required'
            ? {
                factorId: assurance.factorId,
                factorLabel: assurance.factorLabel,
                status: 'authenticator-entry',
              }
            : { status: 'phone-entry' },
        );
      } catch (inspectionError) {
        if (!isCurrent) return;
        setError(getUserFacingPhoneVerificationError(inspectionError));
        setFlow({ status: 'unavailable' });
      }
    };

    void inspect();
    return () => {
      isCurrent = false;
    };
  }, [activeUserId, authStatus, isOptional, refreshAssurance, router]);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'signed-in' && !isOptional) return <Redirect href="/home" />;

  const expectedUserId = auth.state.session.user.id;

  const run = async (operation: () => Promise<void>): Promise<void> => {
    if (operationPending.current) return;
    operationPending.current = true;
    setError(null);
    setIsPending(true);
    try {
      await operation();
    } catch (operationError) {
      setError(getUserFacingPhoneVerificationError(operationError));
    } finally {
      operationPending.current = false;
      setIsPending(false);
    }
  };

  const sendCode = (): Promise<void> =>
    run(async () => {
      const sentAt = Date.now();
      const pending = await requestPhoneVerification(
        getSupabaseClient(),
        expectedUserId,
        phone,
        sentAt,
      );
      setNow(sentAt);
      setResendAvailableAt(sentAt + OTP_RESEND_COOLDOWN_MS);
      setOtp('');
      setFlow({ pending, status: 'code-entry' });
    });

  const verifyAuthenticator = (
    factor: Extract<PhoneVerificationFlow, { status: 'authenticator-entry' }>,
  ): Promise<void> =>
    run(async () => {
      await verifyPhoneUpdateAuthenticator(
        getSupabaseClient(),
        expectedUserId,
        factor.factorId,
        authenticatorCode,
      );
      setAuthenticatorCode('');
      setFlow({ status: 'phone-entry' });
    });

  const resendCode = (pending: PendingPhoneVerification): Promise<void> =>
    run(async () => {
      if (getOtpResendSecondsRemaining(resendAvailableAt) > 0) return;
      const sentAt = Date.now();
      const nextPending = await resendPhoneVerification(getSupabaseClient(), pending, sentAt);
      setNow(sentAt);
      setResendAvailableAt(sentAt + OTP_RESEND_COOLDOWN_MS);
      setOtp('');
      setFlow({ pending: nextPending, status: 'code-entry' });
    });

  const verifyCode = (pending: PendingPhoneVerification): Promise<void> =>
    run(async () => {
      await verifyPhoneVerification(getSupabaseClient(), pending, otp);
      await auth.refreshAssurance();
      router.replace(isOptional ? '/profile' : '/home');
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            {t(isOptional ? 'optionalPhoneSetup' : 'stepTwoOfTwo').toUpperCase()}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t('verifyYourPhone')}
        </Text>
        <Text style={styles.description}>
          {t(isOptional ? 'optionalPhoneDescription' : 'requiredPhoneDescription')}
        </Text>

        {flow.status === 'checking' ? (
          <View accessibilityRole="progressbar" style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.colors.primary} />
            <Text style={styles.loadingText}>{t('checkingConfirmedPhone')}</Text>
          </View>
        ) : null}

        {flow.status === 'authenticator-entry' ? (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>{t('openAuthenticatorApp')}</Text>
            <Text style={styles.hint}>{t('authenticatorInstruction')}</Text>
            {flow.factorLabel ? (
              <Text style={styles.factorLabel}>
                {t('lookForFactor', { label: flow.factorLabel })}
              </Text>
            ) : null}
            <Text style={styles.hint}>{t('authenticatorAfter')}</Text>
            <Text style={styles.label}>{t('authenticatorCode')}</Text>
            <TextInput
              accessibilityLabel={t('existingAuthenticatorCode')}
              autoComplete="one-time-code"
              editable={!isPending}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => {
                setAuthenticatorCode(value);
                setError(null);
              }}
              placeholder="123456"
              style={styles.input}
              textContentType="oneTimeCode"
              value={authenticatorCode}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending }}
              disabled={isPending}
              onPress={() => void verifyAuthenticator(flow)}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator
                  accessibilityLabel={t('checkingAuthenticator')}
                  color={mobileTheme.colors.white}
                />
              ) : (
                <Text style={styles.primaryButtonText}>{t('confirmAuthenticator')}</Text>
              )}
            </Pressable>
            <View style={styles.recoveryCard}>
              <Text style={styles.recoveryTitle}>{t('authenticatorRecoveryTitle')}</Text>
              <Text style={styles.recoveryText}>{t('authenticatorRecoveryBody')}</Text>
            </View>
          </View>
        ) : null}

        {flow.status === 'phone-entry' ? (
          <View style={styles.form}>
            <Text style={styles.label}>{t('mobileNumber')}</Text>
            <TextInput
              accessibilityLabel={t('mobileNumberCountryCode')}
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
            <Text style={styles.hint}>{t('phoneCountryHint')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending }}
              disabled={isPending}
              onPress={() => void sendCode()}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator
                  accessibilityLabel={t('sendingVerificationCode')}
                  color={mobileTheme.colors.white}
                />
              ) : (
                <Text style={styles.primaryButtonText}>{t('sendVerificationCode')}</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {flow.status === 'code-entry' ? (
          <View style={styles.form}>
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {t('codeSentTo', { phone: flow.pending.phone })}
            </Text>
            <Text style={styles.label}>{t('oneTimeCode')}</Text>
            <TextInput
              accessibilityLabel={t('phoneVerificationCode')}
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
              accessibilityState={{ disabled: isPending }}
              disabled={isPending}
              onPress={() => void verifyCode(flow.pending)}
              style={styles.primaryButton}
            >
              {isPending ? (
                <ActivityIndicator
                  accessibilityLabel={t('verifyingPhone')}
                  color={mobileTheme.colors.white}
                />
              ) : (
                <Text style={styles.primaryButtonText}>{t('verifyAndContinue')}</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending || resendSeconds > 0 }}
              disabled={isPending || resendSeconds > 0}
              onPress={() => void resendCode(flow.pending)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {resendSeconds > 0
                  ? t('sendNewCodeIn', { seconds: resendSeconds })
                  : t('sendNewCode')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={() => {
                setError(null);
                setOtp('');
                setFlow({ status: 'phone-entry' });
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('useDifferentNumber')}</Text>
            </Pressable>
          </View>
        ) : null}

        {flow.status === 'unavailable' ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => {
              setError(null);
              setFlow({ status: 'phone-entry' });
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{t('tryPhoneAgain')}</Text>
          </Pressable>
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
            <Text style={styles.signOutText}>{t('returnToProfile')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => void auth.signOut()}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>{t('signOut')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, paddingBottom: 36, paddingTop: 42 },
  description: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    marginBottom: 22,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: '#991b1b',
    lineHeight: 22,
    marginTop: 16,
    padding: 14,
  },
  factorLabel: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1e3a8a',
    fontSize: mobileTheme.type.body,
    fontWeight: '800',
    padding: 12,
  },
  form: { gap: 12 },
  hint: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 14,
    borderWidth: 1,
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: { color: mobileTheme.colors.text, fontSize: 14, fontWeight: '700' },
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
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: mobileTheme.colors.white, fontSize: 14, fontWeight: '800' },
  recoveryCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    marginTop: 8,
    padding: 14,
  },
  recoveryText: { color: '#9a3412', fontSize: 13, lineHeight: 19 },
  recoveryTitle: { color: '#7c2d12', fontSize: 14, fontWeight: '800' },
  sectionTitle: { color: mobileTheme.colors.text, fontSize: 18, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '700' },
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
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.display,
    fontWeight: '900',
    marginBottom: 8,
  },
});
