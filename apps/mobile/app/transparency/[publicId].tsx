import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PublicComplaintDetail } from '@local-wellness/types';

import {
  getPublicComplaint,
  getUserFacingTransparencyError,
} from '../../src/transparency/transparency-service';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type DetailState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ complaint: PublicComplaintDetail; status: 'ready' }>;

const statusLabels = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
} as const;

const firstParameter = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function PublicComplaintDetailScreen() {
  const router = useRouter();
  const parameters = useLocalSearchParams<{ publicId?: string | string[] }>();
  const publicId = firstParameter(parameters.publicId);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DetailState>({ status: 'loading' });

  useEffect(() => {
    if (publicId === undefined) return;
    let isCurrent = true;
    void getPublicComplaint(publicId).then(
      (complaint) => {
        if (isCurrent) setState({ complaint, status: 'ready' });
      },
      (error: unknown) => {
        if (isCurrent)
          setState({ message: getUserFacingTransparencyError(error), status: 'error' });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [attempt, publicId]);

  if (publicId === undefined) {
    return <ErrorScreen message="The public report link is incomplete." />;
  }
  if (state.status === 'loading') return <LoadingScreen label="Loading public report…" />;
  if (state.status === 'error') {
    return (
      <ErrorScreen
        action={{
          label: 'Try again',
          onPress: () => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          },
        }}
        message={state.message}
        title="Public report unavailable"
      />
    );
  }

  const relatedPublicReports =
    state.complaint.duplicateGroup === null
      ? []
      : state.complaint.duplicateGroup.relatedPublicIds.map((relatedPublicId) => ({
          label:
            relatedPublicId === state.complaint.duplicateGroup?.canonicalPublicId
              ? 'Primary public report'
              : 'Related public report',
          publicId: relatedPublicId,
        }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Reviewed public report</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {state.complaint.title}
          </Text>
          <Text style={styles.status}>{statusLabels[state.complaint.status]}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{state.complaint.category.name}</Text>
          <Text style={styles.label}>Local body</Text>
          <Text style={styles.value}>{state.complaint.localBody.name}</Text>
          <Text style={styles.label}>Ward</Text>
          <Text style={styles.value}>{state.complaint.ward?.name ?? 'Not published'}</Text>
          <Text style={styles.label}>Submitted</Text>
          <Text style={styles.value}>{new Date(state.complaint.submittedAt).toLocaleString()}</Text>
          <Text style={styles.label}>Approximate location precision</Text>
          <Text style={styles.value}>
            About {state.complaint.location.precisionMeters.toLocaleString()} metres
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>
            Public summary
          </Text>
          <Text style={styles.body}>{state.complaint.summary}</Text>
        </View>

        {state.complaint.duplicateGroup === null ? null : (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>
              Related public reports
            </Text>
            <Text style={styles.body}>
              This is one of {state.complaint.duplicateGroup.totalCount.toLocaleString()} reviewed
              public reports linked to the same issue.
            </Text>
            <View style={styles.relatedList}>
              {relatedPublicReports.map((relatedReport) => (
                <Pressable
                  accessibilityLabel={`Open ${relatedReport.label.toLowerCase()} ${relatedReport.publicId}`}
                  accessibilityRole="link"
                  key={relatedReport.publicId}
                  onPress={() => router.push(`/transparency/${relatedReport.publicId}`)}
                  style={styles.relatedReport}
                >
                  <Text style={styles.relatedLabel}>{relatedReport.label}</Text>
                  <Text style={styles.relatedLink}>{relatedReport.publicId}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Privacy-protected view</Text>
          <Text style={styles.privacyText}>
            This page excludes exact coordinates, citizen identity, original media, private
            messages, comments, and government internal notes.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/transparency')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back to public reports</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  backText: { color: '#166534', fontWeight: '800' },
  body: { color: '#334155', fontSize: 16, lineHeight: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    padding: 16,
  },
  content: { gap: 14, padding: 20, paddingBottom: 46 },
  eyebrow: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heading: { color: '#14281d', fontSize: 20, fontWeight: '800' },
  hero: { gap: 7, marginTop: 10 },
  label: { color: '#64748b', fontSize: 13, marginTop: 5 },
  privacyCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 15,
  },
  privacyText: { color: '#365943', lineHeight: 21 },
  privacyTitle: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  relatedLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  relatedLink: { color: '#166534', fontSize: 14, fontWeight: '800' },
  relatedList: { gap: 9, marginTop: 4 },
  relatedReport: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    minHeight: 48,
    padding: 12,
  },
  status: { color: '#475569', fontSize: 16, fontWeight: '700' },
  title: { color: '#14281d', fontSize: 29, fontWeight: '900' },
  value: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
});
