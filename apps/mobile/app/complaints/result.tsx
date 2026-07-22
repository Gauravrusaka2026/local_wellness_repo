import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../src/ui/screen';

export default function ComplaintResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string;
    complaintId?: string;
    number?: string;
    message?: string;
  }>();
  const success = params.status === 'success';
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.icon, success ? styles.success : styles.failure]}>
          {success ? '✓' : '!'}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {success ? 'Report submitted' : 'Report not submitted'}
        </Text>
        <Text style={styles.message}>
          {success
            ? `Your complaint ${params.number ?? ''} was received and routed.`
            : (params.message ?? 'We could not submit this report. Your draft is safe to retry.')}
        </Text>
        {success && params.complaintId ? (
          <Action
            label="View complaint"
            onPress={() => router.replace(`/complaints/${params.complaintId}`)}
          />
        ) : null}
        <Action label="Open your complaints" onPress={() => router.replace('/complaints')} />
        {!success ? (
          <Action label="Return to report" onPress={() => router.replace('/complaints/new')} />
        ) : null}
      </View>
    </Screen>
  );
}

const Action = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.action}>
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  action: {
    backgroundColor: '#17683b',
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 14,
    width: '100%',
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  container: { alignItems: 'center', flex: 1, gap: 18, justifyContent: 'center', padding: 24 },
  failure: { backgroundColor: '#fff7ed', color: '#c2410c' },
  icon: { borderRadius: 999, fontSize: 42, fontWeight: '900', padding: 16 },
  message: { color: '#334155', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  success: { backgroundColor: '#ecfdf5', color: '#15803d' },
  title: { color: '#143b2a', fontSize: 28, fontWeight: '900', textAlign: 'center' },
});
