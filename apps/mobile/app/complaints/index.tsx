import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ComplaintListItem } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import {
  getUserFacingComplaintError,
  listComplaints,
} from '../../src/complaints/complaint-service';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type LoadState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; items: readonly ComplaintListItem[] }>;

export default function ComplaintListScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;
  useEffect(() => {
    if (accessToken === null) return;
    let isCurrent = true;
    const load = async (): Promise<void> => {
      setLoadState({ status: 'loading' });
      try {
        const result = await listComplaints(accessToken);
        if (isCurrent) setLoadState({ items: result.items, status: 'ready' });
      } catch (error) {
        if (isCurrent)
          setLoadState({ message: getUserFacingComplaintError(error), status: 'error' });
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [accessToken, attempt]);

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (loadState.status === 'loading') return <LoadingScreen label="Loading your complaints…" />;
  if (loadState.status === 'error') {
    return (
      <ErrorScreen
        action={{ label: 'Try again', onPress: () => setAttempt((value) => value + 1) }}
        message={loadState.message}
        title="Complaints unavailable"
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {loadState.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text accessibilityRole="header" style={styles.title}>
              No submitted complaints
            </Text>
            <Text style={styles.help}>Your safely submitted reports will appear here.</Text>
          </View>
        ) : (
          loadState.items.map((complaint) => (
            <Pressable
              accessibilityRole="button"
              key={complaint.id}
              onPress={() => router.push(`/complaints/${complaint.id}`)}
              style={styles.card}
            >
              <View style={styles.row}>
                <Text style={styles.number}>{complaint.complaintNumber}</Text>
                <Text style={styles.status}>{complaint.status.replaceAll('_', ' ')}</Text>
              </View>
              <Text style={styles.category}>{complaint.categoryName}</Text>
              <Text style={styles.date}>{new Date(complaint.submittedAt).toLocaleString()}</Text>
            </Pressable>
          ))
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/home')}
          style={styles.homeButton}
        >
          <Text style={styles.homeText}>Return home</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 16,
  },
  category: { color: '#334155', fontSize: 16, fontWeight: '700' },
  content: { gap: 12, padding: 20, paddingBottom: 44 },
  date: { color: '#64748b', fontSize: 13 },
  emptyCard: { alignItems: 'center', gap: 8, padding: 28 },
  help: { color: '#64748b', lineHeight: 21, textAlign: 'center' },
  homeButton: { alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  homeText: { color: '#166534', fontWeight: '800' },
  number: { color: '#14532d', fontSize: 17, fontWeight: '900' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  status: { color: '#475569', fontSize: 13, textTransform: 'capitalize' },
  title: { color: '#14281d', fontSize: 23, fontWeight: '800' },
});
