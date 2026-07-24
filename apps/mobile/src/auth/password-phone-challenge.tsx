import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  changePasswordAfterPhoneVerification,
  getUserFacingAuthError,
  sendPasswordPhoneCode,
} from './auth-service';
import { AuthInputError } from './auth-input';
import { getOtpResendSecondsRemaining, OTP_RESEND_COOLDOWN_MS } from './otp-challenge';
import type { PasswordPhoneOtpRequest, PasswordUpdateResult } from './password-auth';
import { getUserFacingPhoneVerificationError } from './phone-verification';
import { useLocalization } from '../ui/localization';

type PasswordPhoneChallengeProps = Readonly<{
  expectedUserId: string;
  onCompleted: (result: PasswordUpdateResult) => void;
  phone: string;
}>;

const maskedPhone = (phone: string): string => {
  const visibleDigits = phone.slice(-4);
  return `${phone.slice(0, Math.min(3, phone.length - visibleDigits.length))}••••••${visibleDigits}`;
};

export const PasswordPhoneChallenge = ({
  expectedUserId,
  onCompleted,
  phone,
}: PasswordPhoneChallengeProps) => {
  const { t } = useLocalization();
  const pending = useRef(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [request, setRequest] = useState<PasswordPhoneOtpRequest | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const resendSeconds = getOtpResendSecondsRemaining(resendAvailableAt, now);

  useEffect(() => {
    if (resendSeconds === 0) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), 1_000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const runExclusive = async (
    operation: () => Promise<void>,
    presentError: (operationError: unknown) => string,
  ): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setError(null);
    setIsPending(true);
    try {
      await operation();
    } catch (operationError) {
      setError(presentError(operationError));
    } finally {
      pending.current = false;
      setIsPending(false);
    }
  };

  const sendCode = (): Promise<void> =>
    runExclusive(async () => {
      if (getOtpResendSecondsRemaining(resendAvailableAt) > 0) return;
      const nextRequest = await sendPasswordPhoneCode(expectedUserId);
      const sentAt = Date.now();
      setRequest(nextRequest);
      setNow(sentAt);
      setOtp('');
      setResendAvailableAt(sentAt + OTP_RESEND_COOLDOWN_MS);
    }, getUserFacingPhoneVerificationError);

  const changePassword = (): Promise<void> =>
    runExclusive(
      async () => {
        if (request === null) return;
        if (password !== confirmation) {
          throw new AuthInputError(t('passwordsDoNotMatch'));
        }

        const result = await changePasswordAfterPhoneVerification(password, otp, request);
        setOtp('');
        setPassword('');
        setConfirmation('');
        setRequest(null);
        onCompleted(result);
      },
      (operationError) => getUserFacingAuthError(operationError, 'password'),
    );

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('verifyRegisteredPhone')}
      </Text>
      <Text style={styles.description}>
        {t('freshSmsBeforePassword', { phone: maskedPhone(phone) })}
      </Text>

      {request === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPending }}
          disabled={isPending}
          onPress={() => void sendCode()}
          style={styles.primaryButton}
        >
          {isPending ? (
            <ActivityIndicator
              accessibilityLabel={t('sendingPhoneVerificationCode')}
              color="#fff"
            />
          ) : (
            <Text style={styles.primaryButtonText}>{t('sendCodeToPhone')}</Text>
          )}
        </Pressable>
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.successText}>
            {t('smsCodePasswordInstruction')}
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
          <Text style={styles.label}>{t('newPassword')}</Text>
          <TextInput
            accessibilityLabel={t('newPassword')}
            autoComplete="new-password"
            editable={!isPending}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={password}
          />
          <Text style={styles.label}>{t('confirmNewPassword')}</Text>
          <TextInput
            accessibilityLabel={t('confirmNewPassword')}
            autoComplete="new-password"
            editable={!isPending}
            onChangeText={(value) => {
              setConfirmation(value);
              setError(null);
            }}
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={confirmation}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={() => void changePassword()}
            style={styles.primaryButton}
          >
            {isPending ? (
              <ActivityIndicator accessibilityLabel={t('changingPassword')} color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('verifyCodeChangePassword')}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPending || resendSeconds > 0 }}
            disabled={isPending || resendSeconds > 0}
            onPress={() => void sendCode()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {resendSeconds > 0
                ? t('sendAnotherCodeIn', { seconds: resendSeconds })
                : t('sendAnotherCode')}
            </Text>
          </Pressable>
        </>
      )}

      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : null}
      <Text style={styles.helpText}>{t('lostPhoneAdminHelp')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe7df',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  description: { color: '#475569', fontSize: 15, lineHeight: 22 },
  errorText: { color: '#991b1b', fontSize: 15, lineHeight: 22 },
  heading: { color: '#143b27', fontSize: 21, fontWeight: '800' },
  helpText: { color: '#64748b', fontSize: 13, lineHeight: 19 },
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 46, padding: 10 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  successText: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    color: '#14532d',
    lineHeight: 22,
    padding: 12,
  },
});
