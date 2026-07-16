import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import {
  completePasswordRecovery,
  getUserFacingAuthError,
  setNewPassword,
} from '../../src/auth/auth-service';
import { Screen } from '../../src/ui/screen';

type RecoveryState = 'error' | 'exchanging' | 'ready' | 'saving';

export default function ResetPasswordScreen() {
  const parameters = useLocalSearchParams<{ code?: string | string[] }>();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<RecoveryState>('exchanging');

  useEffect(() => {
    let isCurrent = true;
    const code = typeof parameters.code === 'string' ? parameters.code : '';

    void completePasswordRecovery(code)
      .then(() => {
        if (isCurrent) setState('ready');
      })
      .catch((recoveryError: unknown) => {
        if (!isCurrent) return;
        setError(getUserFacingAuthError(recoveryError, 'complete'));
        setState('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [parameters.code]);

  const save = async (): Promise<void> => {
    setError(null);
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setState('saving');
    try {
      await setNewPassword(password);
      router.replace('/auth/phone-verification');
    } catch (saveError) {
      setError(getUserFacingAuthError(saveError, 'password'));
      setState('ready');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          Choose a new password
        </Text>
        <Text style={styles.description}>
          After saving, verify your phone to continue into Local Wellness.
        </Text>

        {state === 'exchanging' ? (
          <ActivityIndicator accessibilityLabel="Validating recovery link" color="#166534" />
        ) : null}

        {state === 'ready' || state === 'saving' ? (
          <>
            <Text style={styles.label}>New password</Text>
            <TextInput
              accessibilityLabel="New password"
              autoComplete="new-password"
              editable={state !== 'saving'}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={password}
            />
            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              accessibilityLabel="Confirm new password"
              autoComplete="new-password"
              editable={state !== 'saving'}
              onChangeText={setConfirmation}
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={confirmation}
            />
            <Pressable
              accessibilityRole="button"
              disabled={state === 'saving'}
              onPress={() => void save()}
              style={styles.primaryButton}
            >
              {state === 'saving' ? (
                <ActivityIndicator accessibilityLabel="Saving new password" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save password</Text>
              )}
            </Pressable>
          </>
        ) : null}

        {error === null ? null : (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {state === 'error' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Request another recovery email</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 12, padding: 24, paddingBottom: 40, paddingTop: 54 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: '#991b1b',
    lineHeight: 22,
    padding: 14,
  },
  input: {
    backgroundColor: '#fff',
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
    marginTop: 8,
    minHeight: 56,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  title: { color: '#143b27', fontSize: 34, fontWeight: '900' },
});
