import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completePasswordRecovery, getUserFacingAuthError } from '../../src/auth/auth-service';
import { PasswordPhoneChallenge } from '../../src/auth/password-phone-challenge';
import { getConfirmedPhone, type ConfirmedPhone } from '../../src/auth/phone-verification';
import { getSupabaseClient } from '../../src/auth/supabase';
import { useLocalization } from '../../src/ui/localization';
import { Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type RecoveryState =
  | Readonly<{ status: 'error' }>
  | Readonly<{ status: 'exchanging' }>
  | Readonly<{ phone: ConfirmedPhone; status: 'phone-required' }>
  | Readonly<{ status: 'phone-unavailable' }>;

const clearRecoverySession = async (): Promise<void> => {
  try {
    await getSupabaseClient().auth.signOut({ scope: 'local' });
  } catch {
    // The screen remains fail-closed even if provider cleanup also fails.
  }
};

export default function ResetPasswordScreen() {
  const parameters = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();
  const { t } = useLocalization();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RecoveryState>({ status: 'exchanging' });

  useEffect(() => {
    let isCurrent = true;

    void completePasswordRecovery({
      ...(parameters.code === undefined ? {} : { code: parameters.code }),
      ...(parameters.error === undefined ? {} : { error: parameters.error }),
      ...(parameters.error_code === undefined ? {} : { errorCode: parameters.error_code }),
      ...(parameters.error_description === undefined
        ? {}
        : { errorDescription: parameters.error_description }),
      ...(parameters.token_hash === undefined ? {} : { tokenHash: parameters.token_hash }),
      ...(parameters.type === undefined ? {} : { type: parameters.type }),
    })
      .then(async (session) => {
        if (!isCurrent) {
          await clearRecoverySession();
          return;
        }

        const phone = await getConfirmedPhone(getSupabaseClient());
        if (!isCurrent) {
          await clearRecoverySession();
          return;
        }

        if (phone === null || phone.userId !== session.user.id) {
          await clearRecoverySession();
          if (!isCurrent) return;
          setState({ status: 'phone-unavailable' });
          return;
        }
        setState({ phone, status: 'phone-required' });
      })
      .catch(async (recoveryError: unknown) => {
        await clearRecoverySession();
        if (!isCurrent) return;
        setError(getUserFacingAuthError(recoveryError, 'complete'));
        setState({ status: 'error' });
      });

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
  ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          {t('resetYourPassword')}
        </Text>
        <Text style={styles.description}>{t('resetPasswordDescription')}</Text>

        {state.status === 'exchanging' ? (
          <View accessibilityRole="progressbar" style={styles.loadingRow}>
            <ActivityIndicator
              accessibilityLabel={t('validatingRecovery')}
              color={mobileTheme.colors.primary}
            />
            <Text style={styles.description}>{t('validatingRecovery')}</Text>
          </View>
        ) : null}

        {state.status === 'phone-required' ? (
          <PasswordPhoneChallenge
            expectedUserId={state.phone.userId}
            onCompleted={(result) => {
              router.replace({
                pathname: '/auth',
                params: {
                  ...(result.status === 'locally-signed-out-global-revocation-failed'
                    ? { globalSignOutFailed: '1' }
                    : {}),
                  passwordChanged: '1',
                  recovered: '1',
                },
              });
            }}
            phone={state.phone.phone}
          />
        ) : null}

        {state.status === 'phone-unavailable' ? (
          <View style={styles.warningCard}>
            <Text accessibilityRole="header" style={styles.warningTitle}>
              {t('confirmedPhoneRequired')}
            </Text>
            <Text accessibilityRole="alert" style={styles.warningText}>
              {t('confirmedPhoneRecoveryBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/auth')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('returnToSignIn')}</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {state.status === 'error' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('requestRecoveryEmail')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14, padding: 20, paddingBottom: 36 },
  description: {
    color: mobileTheme.colors.muted,
    flex: 1,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: '#991b1b',
    lineHeight: 22,
    padding: 14,
  },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '700' },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.display, fontWeight: '900' },
  warningCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  warningText: { color: '#7c2d12', fontSize: 14, lineHeight: 21 },
  warningTitle: { color: '#9a3412', fontSize: 16, fontWeight: '800' },
});
