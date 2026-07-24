import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { usePasswordAuth, type PasswordAuthMode } from '../../src/auth/use-password-auth';
import { getPublicPhoneVerificationMode } from '../../src/config/environment';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

const accountModes = ['sign-in', 'create-account'] as const satisfies readonly PasswordAuthMode[];

export default function SignInScreen() {
  const auth = useAuth();
  const parameters = useLocalSearchParams<{
    globalSignOutFailed?: string | string[];
    passwordChanged?: string | string[];
    recovered?: string | string[];
  }>();
  const router = useRouter();
  const form = usePasswordAuth();
  const { t } = useLocalization();
  const phoneVerificationMode = getPublicPhoneVerificationMode();

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-in') return <Redirect href="/home" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  const submit = async (): Promise<void> => {
    if ((await form.submit()) === 'authenticated') router.replace('/auth/phone-verification');
  };

  const title =
    form.mode === 'create-account'
      ? t('createYourAccount')
      : form.mode === 'forgot-password'
        ? t('resetYourPassword')
        : t('welcomeBack');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>JS</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.eyebrow}>{t('appName').toUpperCase()}</Text>
            <Text style={styles.brandTagline}>{t('raiseTrackImprove')}</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>
          {form.mode === 'forgot-password'
            ? t('recoveryEmailHint')
            : t(
                phoneVerificationMode === 'enforce'
                  ? 'authEnforceDescription'
                  : 'authObserveDescription',
              )}
        </Text>

        {parameters.passwordChanged === '1' ? (
          <Text accessibilityLiveRegion="polite" style={styles.successText}>
            {parameters.globalSignOutFailed === '1'
              ? t('passwordChangedGlobalSignOutWarning')
              : parameters.recovered === '1'
                ? t('passwordResetSuccess')
                : t('passwordChangedSuccess')}
          </Text>
        ) : null}

        {form.mode === 'forgot-password' ? (
          <Pressable
            accessibilityRole="button"
            disabled={form.isPending}
            onPress={() => form.setMode('sign-in')}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>
              {t('back')} · {t('signIn')}
            </Text>
          </Pressable>
        ) : (
          <View accessibilityRole="radiogroup" style={styles.modeGroup}>
            {accountModes.map((mode) => {
              const selected = form.mode === mode;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: form.isPending }}
                  disabled={form.isPending}
                  key={mode}
                  onPress={() => form.setMode(mode)}
                  style={[styles.modeButton, selected && styles.modeButtonSelected]}
                >
                  <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                    {mode === 'sign-in' ? t('signIn') : t('createAccount')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>{t('emailAddress')}</Text>
          <TextInput
            accessibilityLabel={t('emailAddress')}
            autoCapitalize="none"
            autoComplete="email"
            editable={!form.isPending}
            keyboardType="email-address"
            onChangeText={form.setEmail}
            placeholder="you@example.org"
            style={styles.input}
            textContentType="emailAddress"
            value={form.email}
          />

          {form.mode === 'forgot-password' ? null : (
            <>
              <Text style={styles.label}>{t('password')}</Text>
              <TextInput
                accessibilityLabel={t('password')}
                autoCapitalize="none"
                autoComplete={form.mode === 'create-account' ? 'new-password' : 'current-password'}
                editable={!form.isPending}
                onChangeText={form.setPassword}
                placeholder={t('passwordMinimum')}
                secureTextEntry
                style={styles.input}
                textContentType={form.mode === 'create-account' ? 'newPassword' : 'password'}
                value={form.password}
              />
            </>
          )}

          {form.mode === 'create-account' ? (
            <>
              <Text style={styles.label}>{t('confirmPassword')}</Text>
              <TextInput
                accessibilityLabel={t('confirmPassword')}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!form.isPending}
                onChangeText={form.setPasswordConfirmation}
                placeholder={t('repeatPassword')}
                secureTextEntry
                style={styles.input}
                textContentType="newPassword"
                value={form.passwordConfirmation}
              />
            </>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: form.isPending }}
            disabled={form.isPending}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            {form.isPending ? (
              <ActivityIndicator
                accessibilityLabel={t('authenticating')}
                color={mobileTheme.colors.white}
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                {form.mode === 'create-account'
                  ? t('createAccount')
                  : form.mode === 'forgot-password'
                    ? t('sendRecoveryEmail')
                    : t('signIn')}
              </Text>
            )}
          </Pressable>

          {form.mode === 'sign-in' ? (
            <Pressable
              accessibilityRole="button"
              disabled={form.isPending}
              onPress={() => form.setMode('forgot-password')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('forgotPassword')}</Text>
            </Pressable>
          ) : null}
        </View>

        {form.message === null ? null : (
          <Text accessibilityLiveRegion="polite" style={styles.successText}>
            {form.message}
          </Text>
        )}
        {form.error === null ? null : (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {form.error}
          </Text>
        )}

        <Pressable
          accessibilityHint={t('browsePublicReportsHint')}
          accessibilityRole="button"
          onPress={() => router.push('/transparency')}
          style={styles.publicReportsButton}
        >
          <Text style={styles.publicReportsText}>{t('browsePublicReports')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCopy: { flex: 1, gap: 2 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#155d38',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  brandMarkText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 13, marginBottom: 34 },
  brandTagline: { color: mobileTheme.colors.muted, fontSize: mobileTheme.type.helper },
  buttonPressed: { opacity: 0.85 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 36, paddingTop: 42 },
  description: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    marginBottom: 20,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: '#991b1b',
    lineHeight: 22,
    marginTop: 14,
    padding: 14,
  },
  eyebrow: { color: '#237345', fontSize: 11, fontWeight: '900', letterSpacing: 1.25 },
  form: { gap: 12 },
  inlineButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  inlineButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  input: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: '#94a3b8',
    borderRadius: 14,
    borderWidth: 1,
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.body, fontWeight: '700' },
  modeButton: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  modeButtonSelected: {
    ...mobileTheme.shadow.surface,
    backgroundColor: mobileTheme.colors.surface,
  },
  modeGroup: {
    backgroundColor: '#e7efe9',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 22,
    padding: 4,
  },
  modeText: { color: mobileTheme.colors.muted, fontSize: 14, fontWeight: '700' },
  modeTextSelected: { color: '#14532d' },
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
  publicReportsButton: { alignItems: 'center', marginTop: 20, minHeight: 48, padding: 12 },
  publicReportsText: {
    color: mobileTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '700' },
  successText: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    color: '#14532d',
    lineHeight: 22,
    marginTop: 14,
    padding: 14,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.display,
    fontWeight: '900',
    marginBottom: 8,
  },
});
