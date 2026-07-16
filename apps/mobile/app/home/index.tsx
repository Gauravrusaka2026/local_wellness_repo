import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import { useComplaintCapture } from '../../src/complaints/complaint-context';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

export default function HomeScreen() {
  const auth = useAuth();
  const complaints = useComplaintCapture();
  const router = useRouter();

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;

  const openDraft = async (): Promise<void> => {
    try {
      await complaints.startDraft();
      router.push('/complaints/new');
    } catch {
      // The provider exposes the sanitized error in its state.
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.title}>
            Report a local issue
          </Text>
          <Text style={styles.description}>
            Capture evidence at the issue location. Local Wellness will use verified government data
            to determine whether submission is supported.
          </Text>
        </View>

        {!complaints.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            You are offline. A saved draft can be resumed, but server operations need a connection.
          </Text>
        ) : null}
        {complaints.state.categories.length === 0 && !complaints.state.isBusy ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            No verified operational complaint categories are available in this environment yet. You
            may inspect the flow, but submission will remain blocked safely.
          </Text>
        ) : null}
        {complaints.state.error === null ? null : (
          <Text accessibilityRole="alert" style={styles.error}>
            {complaints.state.error}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={complaints.state.isBusy || !complaints.state.isOnline}
          onPress={() => void openDraft()}
          style={styles.primaryButton}
        >
          {complaints.state.isBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {complaints.state.draft === null ? 'Report an issue' : 'Resume saved report'}
            </Text>
          )}
        </Pressable>

        {complaints.state.upload?.status === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void complaints.retryPendingUpload()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry pending private upload</Text>
          </Pressable>
        ) : null}

        <View style={styles.navigationCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/complaints')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Your complaints</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Profile and device security</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/notifications')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Notifications</Text>
          </Pressable>
        </View>

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>Immediate danger?</Text>
          <Text style={styles.emergencyText}>
            Local Wellness is not an emergency dispatch service. Call 112 for immediate police,
            fire, or medical help.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 22, paddingBottom: 48 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24 },
  emergencyCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fb923c',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emergencyText: { color: '#7c2d12', lineHeight: 21 },
  emergencyTitle: { color: '#9a3412', fontSize: 18, fontWeight: '800' },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    color: '#991b1b',
    lineHeight: 21,
    padding: 14,
  },
  hero: { gap: 10, marginBottom: 8, marginTop: 24 },
  linkButton: { minHeight: 48, justifyContent: 'center' },
  linkText: { color: '#166534', fontSize: 16, fontWeight: '700' },
  navigationCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 56,
    padding: 14,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  retryButton: {
    alignItems: 'center',
    borderColor: '#b45309',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
  },
  retryText: { color: '#92400e', fontWeight: '700' },
  title: { color: '#14281d', fontSize: 32, fontWeight: '900' },
  warning: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    color: '#92400e',
    lineHeight: 21,
    padding: 14,
  },
});
