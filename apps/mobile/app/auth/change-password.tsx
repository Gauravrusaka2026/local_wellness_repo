import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { getUserFacingAuthError } from '../../src/auth/auth-service';
import { PasswordPhoneChallenge } from '../../src/auth/password-phone-challenge';
import { getConfirmedPhone, type ConfirmedPhone } from '../../src/auth/phone-verification';
import { getSupabaseClient } from '../../src/auth/supabase';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type PhoneState =
  | Readonly<{ status: 'checking' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ phone: ConfirmedPhone; status: 'ready' }>;

export default function ChangePasswordScreen() {
  const { state } = useAuth();
  const router = useRouter();
  const { t } = useLocalization();
  const [phoneState, setPhoneState] = useState<PhoneState>({ status: 'checking' });

  const signedInUserId = state.status === 'signed-in' ? state.session.user.id : null;

  useEffect(() => {
    if (signedInUserId === null) return;
    let isCurrent = true;

    void getConfirmedPhone(getSupabaseClient())
      .then((phone) => {
        if (!isCurrent) return;
        if (phone === null || phone.userId !== signedInUserId) {
          setPhoneState({
            message: t('verifiedPhoneRequired'),
            status: 'error',
          });
          return;
        }
        setPhoneState({ phone, status: 'ready' });
      })
      .catch((inspectionError: unknown) => {
        if (!isCurrent) return;
        setPhoneState({
          message: getUserFacingAuthError(inspectionError, 'verify'),
          status: 'error',
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [signedInUserId, t]);

  if (state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title={t('appConfigurationRequired')} />;
  }
  if (state.status === 'signed-out') return <Redirect href="/auth" />;
  if (state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          {t('changePassword')}
        </Text>
        <Text style={styles.description}>{t('changePasswordDescription')}</Text>

        {phoneState.status === 'checking' ? (
          <View accessibilityRole="progressbar" style={styles.loadingRow}>
            <ActivityIndicator color={mobileTheme.colors.primary} />
            <Text style={styles.description}>{t('checkingConfirmedPhone')}</Text>
          </View>
        ) : null}

        {phoneState.status === 'error' ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {phoneState.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.replace({
                  pathname: '/auth/phone-verification',
                  params: { optional: '1' },
                })
              }
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('verifyPhoneNumber')}</Text>
            </Pressable>
          </View>
        ) : null}

        {phoneState.status === 'ready' ? (
          <PasswordPhoneChallenge
            expectedUserId={phoneState.phone.userId}
            onCompleted={(result) => {
              router.replace({
                pathname: '/auth',
                params: {
                  ...(result.status === 'locally-signed-out-global-revocation-failed'
                    ? { globalSignOutFailed: '1' }
                    : {}),
                  passwordChanged: '1',
                },
              });
            }}
            phone={phoneState.phone.phone}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  content: { flexGrow: 1, gap: 14, padding: 20, paddingBottom: 36 },
  description: {
    color: mobileTheme.colors.muted,
    flex: 1,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '700' },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.display, fontWeight: '900' },
});
