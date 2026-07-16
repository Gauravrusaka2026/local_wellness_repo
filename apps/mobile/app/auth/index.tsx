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
import type { AuthChannel, CitizenAuthMode } from '../../src/auth/auth-input';
import { useOtpSignIn } from '../../src/auth/use-otp-sign-in';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

const channelLabels: Readonly<Record<AuthChannel, string>> = {
  email: 'Email',
  phone: 'Phone',
};

const primaryAuthModes = [
  'sign_in',
  'create_account',
] as const satisfies readonly CitizenAuthMode[];

const authModeLabels: Readonly<Record<(typeof primaryAuthModes)[number], string>> = {
  create_account: 'Create account',
  sign_in: 'Sign in',
};

const authModeContent: Readonly<
  Record<CitizenAuthMode, Readonly<{ action: string; description: string; title: string }>>
> = {
  create_account: {
    action: 'Send account verification code',
    description: 'Create a citizen account to report and track civic issues securely.',
    title: 'Create your account',
  },
  recover_account: {
    action: 'Send recovery code',
    description:
      'Local Wellness uses verification codes instead of passwords. Request a new code for your existing account.',
    title: 'Recover your account',
  },
  sign_in: {
    action: 'Send sign-in code',
    description: 'Sign in to create and track civic complaints securely.',
    title: 'Welcome back',
  },
};

export default function SignInScreen() {
  const { state } = useAuth();
  const router = useRouter();
  const signIn = useOtpSignIn();
  const modeContent = authModeContent[signIn.mode];

  if (state.status === 'loading') {
    return <LoadingScreen label="Checking your session…" />;
  }

  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title="App configuration required" />;
  }

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  const handleVerify = async (): Promise<void> => {
    const isVerified = await signIn.verify();

    if (isVerified) {
      router.replace('/home');
    }
  };

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
          {modeContent.title}
        </Text>
        <Text style={styles.description}>{modeContent.description}</Text>

        {signIn.mode === 'recover_account' ? (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>No password is required</Text>
            <Text style={styles.hint}>
              Enter the phone number or email already connected to your citizen account. Account
              details are never revealed by this form.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={signIn.isPending}
              onPress={() => signIn.setMode('sign_in')}
              style={styles.inlineButton}
            >
              <Text style={styles.inlineButtonText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View accessibilityRole="radiogroup" style={styles.modeGroup}>
            {primaryAuthModes.map((mode) => {
              const isSelected = signIn.mode === mode;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: signIn.isPending }}
                  disabled={signIn.isPending}
                  key={mode}
                  onPress={() => signIn.setMode(mode)}
                  style={[styles.modeButton, isSelected && styles.modeButtonSelected]}
                >
                  <Text style={[styles.modeText, isSelected && styles.modeTextSelected]}>
                    {authModeLabels[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View accessibilityRole="radiogroup" style={styles.channelGroup}>
          {(Object.keys(channelLabels) as AuthChannel[]).map((channel) => {
            const isSelected = signIn.channel === channel;

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: signIn.isPending }}
                disabled={signIn.isPending}
                key={channel}
                onPress={() => {
                  signIn.setChannel(channel);
                }}
                style={[styles.channelButton, isSelected && styles.channelButtonSelected]}
              >
                <Text style={[styles.channelText, isSelected && styles.channelTextSelected]}>
                  {channelLabels[channel]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {signIn.step === 'request' ? (
          <View style={styles.form}>
            <Text style={styles.label}>
              {signIn.channel === 'phone' ? 'Mobile number' : 'Email address'}
            </Text>
            <TextInput
              accessibilityLabel={
                signIn.channel === 'phone' ? 'Mobile number with country code' : 'Email address'
              }
              autoCapitalize="none"
              autoComplete={signIn.channel === 'phone' ? 'tel' : 'email'}
              editable={!signIn.isPending}
              keyboardType={signIn.channel === 'phone' ? 'phone-pad' : 'email-address'}
              onChangeText={signIn.setIdentifier}
              placeholder={signIn.channel === 'phone' ? '+91 98765 43210' : 'you@example.org'}
              style={styles.input}
              value={signIn.identifier}
            />
            {signIn.channel === 'email' ? (
              <Text style={styles.hint}>
                Your email may contain a 6-digit verification code, a secure sign-in link, or both.
                No password is required.
              </Text>
            ) : (
              <Text style={styles.hint}>
                We will text a verification code. Standard SMS charges may apply.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: signIn.isPending }}
              disabled={signIn.isPending}
              onPress={() => {
                void signIn.request();
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              {signIn.isPending ? (
                <ActivityIndicator accessibilityLabel="Sending verification code" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {signIn.channel === 'email' ? 'Send verification email' : modeContent.action}
                </Text>
              )}
            </Pressable>
            {signIn.mode === 'sign_in' ? (
              <Pressable
                accessibilityRole="button"
                disabled={signIn.isPending}
                onPress={() => signIn.setMode('recover_account')}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Forgot password or can’t sign in?</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.form}>
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              If this contact can be used, check {signIn.normalizedIdentifier}. Enter the code or
              open the newest secure sign-in link on this device.
            </Text>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              accessibilityLabel="Verification code"
              autoComplete="one-time-code"
              editable={!signIn.isPending}
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={signIn.setOtp}
              placeholder="123456"
              style={styles.input}
              value={signIn.otp}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: signIn.isPending }}
              disabled={signIn.isPending}
              onPress={() => {
                void handleVerify();
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              {signIn.isPending ? (
                <ActivityIndicator accessibilityLabel="Verifying code" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {signIn.mode === 'create_account'
                    ? 'Verify and create account'
                    : 'Verify and sign in'}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={signIn.isPending}
              onPress={signIn.startAgain}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Didn’t receive it? Try again</Text>
            </Pressable>
          </View>
        )}

        {signIn.error === null ? null : (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {signIn.error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/transparency')}
          style={styles.publicReportsButton}
        >
          <Text style={styles.publicReportsText}>
            Explore reviewed public reports without signing in
          </Text>
        </Pressable>
        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>Secure and private</Text>
          <Text style={styles.trustText}>
            Passwordless verification protects your account. Complaint locations, original media,
            and conversations stay private by default.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonPressed: { opacity: 0.85 },
  brandCopy: { flex: 1, gap: 2 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#155d38',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  brandMarkText: { color: '#ffffff', fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 13, marginBottom: 34 },
  brandTagline: { color: '#68796e', fontSize: 13 },
  channelButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  channelButtonSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#166534',
  },
  channelGroup: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  channelText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  channelTextSelected: { color: '#14532d' },
  content: { flexGrow: 1, padding: 24, paddingBottom: 40, paddingTop: 54 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 24 },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    color: '#991b1b',
    lineHeight: 22,
    marginTop: 18,
    padding: 14,
  },
  eyebrow: { color: '#237345', fontSize: 11, fontWeight: '900', letterSpacing: 1.25 },
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
  label: { color: '#1e293b', fontSize: 15, fontWeight: '600' },
  inlineButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  inlineButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  modeButton: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
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
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  publicReportsButton: { alignItems: 'center', marginTop: 20, minHeight: 48, padding: 12 },
  publicReportsText: { color: '#166534', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  recoveryCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 20,
    padding: 14,
  },
  recoveryTitle: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '600' },
  successText: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    color: '#14532d',
    lineHeight: 22,
    marginBottom: 8,
    padding: 14,
  },
  title: {
    color: '#143b27',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  trustCard: { backgroundColor: '#edf7f0', borderRadius: 16, gap: 5, marginTop: 8, padding: 15 },
  trustText: { color: '#4d6857', fontSize: 13, lineHeight: 19 },
  trustTitle: { color: '#185b36', fontSize: 14, fontWeight: '900' },
});
