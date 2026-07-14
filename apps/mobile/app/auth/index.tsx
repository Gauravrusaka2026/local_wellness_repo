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
import type { AuthChannel } from '../../src/auth/auth-input';
import { useOtpSignIn } from '../../src/auth/use-otp-sign-in';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

const channelLabels: Readonly<Record<AuthChannel, string>> = {
  email: 'Email',
  phone: 'Phone',
};

export default function SignInScreen() {
  const { state } = useAuth();
  const router = useRouter();
  const signIn = useOtpSignIn();

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
        <Text accessibilityRole="header" style={styles.title}>
          Welcome to Local Wellness
        </Text>
        <Text style={styles.description}>
          Sign in to create and track civic complaints. Standard SMS or data charges may apply.
        </Text>

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
                We will email you a 6-digit verification code. No sign-in link is required.
              </Text>
            ) : null}
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
                <Text style={styles.primaryButtonText}>Send verification code</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              Check {signIn.normalizedIdentifier} for your 6-digit verification code.
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
                <Text style={styles.primaryButtonText}>Verify and continue</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={signIn.isPending}
              onPress={signIn.startAgain}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Use a different contact</Text>
            </Pressable>
          </View>
        )}

        {signIn.error === null ? null : (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {signIn.error}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonPressed: { opacity: 0.85 },
  channelButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  channelButtonSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#166534',
  },
  channelGroup: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  channelText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  channelTextSelected: { color: '#14532d' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 24 },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    color: '#991b1b',
    lineHeight: 22,
    marginTop: 18,
    padding: 14,
  },
  form: { gap: 12 },
  hint: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '600' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
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
  title: { color: '#14281d', fontSize: 30, fontWeight: '800', marginBottom: 12 },
});
