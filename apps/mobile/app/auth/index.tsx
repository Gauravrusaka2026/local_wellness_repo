import { Redirect, useRouter } from 'expo-router';
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
import { getPhoneMfaSignInCopy } from '../../src/auth/phone-mfa-copy';
import { usePasswordAuth, type PasswordAuthMode } from '../../src/auth/use-password-auth';
import { getPublicPhoneMfaMode } from '../../src/config/environment';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

const accountModes = ['sign-in', 'create-account'] as const satisfies readonly PasswordAuthMode[];

export default function SignInScreen() {
  const auth = useAuth();
  const router = useRouter();
  const form = usePasswordAuth();
  const phoneMfaCopy = getPhoneMfaSignInCopy(getPublicPhoneMfaMode());

  if (auth.state.status === 'loading') return <LoadingScreen label="Checking your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-in') return <Redirect href="/home" />;
  if (auth.state.status === 'mfa-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  const submit = async (): Promise<void> => {
    if ((await form.submit()) === 'authenticated') router.replace('/auth/phone-verification');
  };

  const title =
    form.mode === 'create-account'
      ? 'Create your account'
      : form.mode === 'forgot-password'
        ? 'Reset your password'
        : 'Welcome back';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>LW</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.eyebrow}>LOCAL WELLNESS</Text>
            <Text style={styles.brandTagline}>Civic services, made clearer</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>
          {form.mode === 'forgot-password'
            ? 'We will email a secure recovery link without revealing whether an account exists.'
            : phoneMfaCopy.description}
        </Text>

        {form.mode === 'forgot-password' ? (
          <Pressable
            accessibilityRole="button"
            disabled={form.isPending}
            onPress={() => form.setMode('sign-in')}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>‹ Back to sign in</Text>
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
                    {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
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
              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={form.mode === 'create-account' ? 'new-password' : 'current-password'}
                editable={!form.isPending}
                onChangeText={form.setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                style={styles.input}
                textContentType={form.mode === 'create-account' ? 'newPassword' : 'password'}
                value={form.password}
              />
            </>
          )}

          {form.mode === 'create-account' ? (
            <>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                accessibilityLabel="Confirm password"
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!form.isPending}
                onChangeText={form.setPasswordConfirmation}
                placeholder="Repeat your password"
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
              <ActivityIndicator accessibilityLabel="Authenticating" color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {form.mode === 'create-account'
                  ? 'Create account'
                  : form.mode === 'forgot-password'
                    ? 'Send recovery email'
                    : 'Sign in'}
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
              <Text style={styles.secondaryButtonText}>Forgot password?</Text>
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
          accessibilityHint="Shows reviewed, privacy-protected reports"
          accessibilityRole="button"
          onPress={() => router.push('/transparency')}
          style={styles.publicReportsButton}
        >
          <Text style={styles.publicReportsText}>Browse public reports</Text>
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
  brandTagline: { color: '#68796e', fontSize: 13 },
  buttonPressed: { opacity: 0.85 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 40, paddingTop: 54 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 24 },
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
  modeButton: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  modeButtonSelected: { backgroundColor: '#ffffff', elevation: 1 },
  modeGroup: {
    backgroundColor: '#e7efe9',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 22,
    padding: 4,
  },
  modeText: { color: '#64748b', fontSize: 16, fontWeight: '700' },
  modeTextSelected: { color: '#14532d' },
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
  publicReportsButton: { alignItems: 'center', marginTop: 20, minHeight: 48, padding: 12 },
  publicReportsText: { color: '#166534', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  successText: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    color: '#14532d',
    lineHeight: 22,
    marginTop: 14,
    padding: 14,
  },
  title: { color: '#143b27', fontSize: 34, fontWeight: '900', marginBottom: 10 },
});
