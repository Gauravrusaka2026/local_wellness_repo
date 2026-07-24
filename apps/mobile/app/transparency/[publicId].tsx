import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PublicComplaintDetail } from '@local-wellness/types';
import { localeForIntl, type MessageKey } from '@local-wellness/localization';

import {
  getPublicComplaint,
  getUserFacingTransparencyError,
} from '../../src/transparency/transparency-service';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type DetailState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ complaint: PublicComplaintDetail; status: 'ready' }>;

const statusMessageKeys = {
  closed: 'statusClosed',
  in_progress: 'statusInProgress',
  reported: 'statusReported',
  resolved: 'statusResolved',
} as const satisfies Readonly<Record<PublicComplaintDetail['status'], MessageKey>>;

const firstParameter = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function PublicComplaintDetailScreen() {
  const router = useRouter();
  const { formatDateTime, locale, t } = useLocalization();
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
    return <ErrorScreen message={t('publicReportLinkIncomplete')} />;
  }
  if (state.status === 'loading') return <LoadingScreen label={t('loadPublicReport')} />;
  if (state.status === 'error') {
    return (
      <ErrorScreen
        action={{
          label: t('tryAgain'),
          onPress: () => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          },
        }}
        message={state.message}
        title={t('publicReportUnavailable')}
      />
    );
  }

  const relatedPublicReports =
    state.complaint.duplicateGroup === null
      ? []
      : state.complaint.duplicateGroup.relatedPublicIds.map((relatedPublicId) => ({
          label:
            relatedPublicId === state.complaint.duplicateGroup?.canonicalPublicId
              ? t('primaryPublicReport')
              : t('relatedPublicReport'),
          publicId: relatedPublicId,
        }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('reviewedPublicReport')}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {state.complaint.title}
          </Text>
          <Text style={styles.status}>{t(statusMessageKeys[state.complaint.status])}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('category')}</Text>
          <Text style={styles.value}>{state.complaint.category.name}</Text>
          <Text style={styles.label}>{t('localBody')}</Text>
          <Text style={styles.value}>{state.complaint.localBody.name}</Text>
          <Text style={styles.label}>{t('ward')}</Text>
          <Text style={styles.value}>{state.complaint.ward?.name ?? t('notPublished')}</Text>
          <Text style={styles.label}>{t('submittedLabel')}</Text>
          <Text style={styles.value}>{formatDateTime(state.complaint.submittedAt)}</Text>
          <Text style={styles.label}>{t('approximateLocationPrecision')}</Text>
          <Text style={styles.value}>
            {state.complaint.location.precisionMeters.toLocaleString(localeForIntl(locale))} m
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>
            {t('publicSummary')}
          </Text>
          <Text style={styles.body}>{state.complaint.summary}</Text>
        </View>

        {state.complaint.duplicateGroup === null ? null : (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>
              {t('relatedPublicReports')}
            </Text>
            <Text style={styles.body}>
              {t('relatedReportsSummary', {
                count: state.complaint.duplicateGroup.totalCount.toLocaleString(
                  localeForIntl(locale),
                ),
              })}
            </Text>
            <View style={styles.relatedList}>
              {relatedPublicReports.map((relatedReport) => (
                <Pressable
                  accessibilityLabel={t('openRelatedPublicReport', {
                    id: relatedReport.publicId,
                    label: relatedReport.label.toLowerCase(),
                  })}
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
          <Text style={styles.privacyTitle}>{t('privacyProtectedView')}</Text>
          <Text style={styles.privacyText}>{t('privacyProtectedViewBody')}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/transparency')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{t('backToPublicReports')}</Text>
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
  title: { color: '#14281d', fontSize: 24, fontWeight: '900' },
  value: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
});
