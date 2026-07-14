import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ComplaintDetail, ComplaintTimeline } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import {
  getComplaint,
  getComplaintTimeline,
  getUserFacingComplaintError,
} from '../../src/complaints/complaint-service';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type DetailState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; complaint: ComplaintDetail; timeline: ComplaintTimeline }>;

const firstParameter = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function ComplaintDetailScreen() {
  const auth = useAuth();
  const parameters = useLocalSearchParams<{ complaintId?: string | string[] }>();
  const complaintId = firstParameter(parameters.complaintId);
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;

  useEffect(() => {
    if (accessToken === null || complaintId === undefined) return;
    let isCurrent = true;
    const load = async (): Promise<void> => {
      try {
        const [complaint, timeline] = await Promise.all([
          getComplaint(accessToken, complaintId),
          getComplaintTimeline(accessToken, complaintId),
        ]);
        if (isCurrent) setState({ complaint, status: 'ready', timeline });
      } catch (error) {
        if (isCurrent) setState({ message: getUserFacingComplaintError(error), status: 'error' });
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [accessToken, complaintId]);

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error')
    return <ErrorScreen message={auth.state.message} />;
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (complaintId === undefined) return <ErrorScreen message="The complaint link is incomplete." />;
  if (state.status === 'loading') return <LoadingScreen label="Loading complaint…" />;
  if (state.status === 'error')
    return <ErrorScreen message={state.message} title="Complaint unavailable" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.receiptCard}>
          <Text accessibilityRole="header" style={styles.number}>
            {state.complaint.complaintNumber}
          </Text>
          <Text style={styles.status}>{state.complaint.status.replaceAll('_', ' ')}</Text>
          <Text style={styles.help}>
            Private complaint · submitted {new Date(state.complaint.submittedAt).toLocaleString()}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Description</Text>
          <Text style={styles.body}>
            {state.complaint.description ?? 'No description was stored.'}
          </Text>
          <Text style={styles.heading}>Routing</Text>
          <Text style={styles.body}>
            {state.complaint.routing.status.replaceAll('_', ' ')} ·{' '}
            {state.complaint.routing.explanation.reason.replaceAll('_', ' ')}
          </Text>
          <Text style={styles.heading}>Evidence</Text>
          <Text style={styles.body}>{state.complaint.media.length} private media item(s)</Text>
        </View>
        <Text accessibilityRole="header" style={styles.timelineTitle}>
          Timeline
        </Text>
        {state.timeline.entries.map((entry) => (
          <View key={entry.id} style={styles.timelineEntry}>
            <Text style={styles.heading}>{entry.title}</Text>
            <Text style={styles.help}>{new Date(entry.occurredAt).toLocaleString()}</Text>
            {entry.description === null ? null : (
              <Text style={styles.body}>{entry.description}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: '#334155', lineHeight: 22 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  content: { gap: 14, padding: 20, paddingBottom: 46 },
  heading: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  help: { color: '#64748b', lineHeight: 20 },
  number: { color: '#14532d', fontSize: 27, fontWeight: '900' },
  receiptCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 17,
  },
  status: { color: '#166534', fontSize: 17, fontWeight: '800', textTransform: 'capitalize' },
  timelineEntry: {
    borderLeftColor: '#86efac',
    borderLeftWidth: 3,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timelineTitle: { color: '#14281d', fontSize: 22, fontWeight: '900', marginTop: 6 },
});
