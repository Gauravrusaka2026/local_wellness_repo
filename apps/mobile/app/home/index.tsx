import type { Href } from 'expo-router';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ComplaintListItem } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import { useComplaintCapture } from '../../src/complaints/complaint-context';
import {
  getUserFacingComplaintError,
  listComplaints,
} from '../../src/complaints/complaint-service';
import {
  buildComplaintDashboardSummary,
  getRecentComplaints,
} from '../../src/dashboard/complaint-summary';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { ComplaintCard } from '../../src/ui/complaint-card';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type DashboardState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'ready';
      complaints: readonly ComplaintListItem[];
      hasMore: boolean;
    }>;

export default function HomeScreen() {
  const auth = useAuth();
  const complaintCapture = useComplaintCapture();
  const router = useRouter();
  const [dashboardState, setDashboardState] = useState<DashboardState>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;

  useFocusEffect(
    useCallback(() => {
      if (accessToken === null) return undefined;
      let isCurrent = true;

      const loadDashboard = async (): Promise<void> => {
        setDashboardState({ status: 'loading' });
        try {
          const result = await listComplaints(accessToken);
          if (isCurrent) {
            setDashboardState({
              complaints: result.items,
              hasMore: result.hasMore,
              status: 'ready',
            });
          }
        } catch (error) {
          if (isCurrent) {
            setDashboardState({ message: getUserFacingComplaintError(error), status: 'error' });
          }
        }
      };

      void loadDashboard();
      return () => {
        isCurrent = false;
      };
    }, [accessToken]),
  );

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'mfa-required') return <Redirect href="/auth/phone-verification" />;

  const openDraft = async (): Promise<void> => {
    try {
      await complaintCapture.startDraft();
      router.push('/complaints/new');
    } catch {
      // The complaint provider exposes the sanitized error below.
    }
  };

  const refreshDashboard = async (): Promise<void> => {
    if (accessToken === null || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await listComplaints(accessToken);
      setDashboardState({
        complaints: result.items,
        hasMore: result.hasMore,
        status: 'ready',
      });
    } catch (error) {
      setDashboardState({ message: getUserFacingComplaintError(error), status: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const dashboardSummary =
    dashboardState.status === 'ready'
      ? buildComplaintDashboardSummary(dashboardState.complaints)
      : null;
  const recentComplaints =
    dashboardState.status === 'ready' ? getRecentComplaints(dashboardState.complaints) : [];
  const availableCategoryCount = complaintCapture.state.categories.filter(
    (category) => category.submissionAvailability === 'available',
  ).length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#17683b']}
            onRefresh={() => void refreshDashboard()}
            refreshing={isRefreshing}
            tintColor="#17683b"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.eyebrow}>LOCAL WELLNESS</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Your civic dashboard
            </Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderAction
              accessibilityLabel="Open notifications"
              glyph="●"
              onPress={() => router.push('/notifications')}
            />
            <HeaderAction
              accessibilityLabel="Open menu"
              glyph="≡"
              onPress={() => router.push('/menu' as Href)}
            />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>See it. Report it. Track it.</Text>
            <Text style={styles.heroDescription}>
              Send verified location and private evidence to the right governing body.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Begins the guided complaint form"
            accessibilityRole="button"
            accessibilityState={{
              disabled: complaintCapture.state.isBusy || !complaintCapture.state.isOnline,
            }}
            disabled={complaintCapture.state.isBusy || !complaintCapture.state.isOnline}
            onPress={() => void openDraft()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              (complaintCapture.state.isBusy || !complaintCapture.state.isOnline) &&
                styles.disabledButton,
            ]}
          >
            {complaintCapture.state.isBusy ? (
              <ActivityIndicator accessibilityLabel="Preparing report" color="#174b2d" />
            ) : (
              <>
                <Text accessibilityElementsHidden style={styles.primaryButtonGlyph}>
                  ＋
                </Text>
                <Text style={styles.primaryButtonText}>
                  {complaintCapture.state.draft === null
                    ? 'Report a local issue'
                    : 'Resume saved report'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {!complaintCapture.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            You are offline. Saved reports remain on this device, but server actions need a
            connection.
          </Text>
        ) : null}
        {complaintCapture.state.error === null ? null : (
          <Text accessibilityRole="alert" style={styles.error}>
            {complaintCapture.state.error}
          </Text>
        )}
        {complaintCapture.state.upload?.status === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void complaintCapture.retryPendingUpload()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry pending private upload</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Complaint overview
            </Text>
            <Text style={styles.sectionHint}>Your latest submitted reports</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/complaints')}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>View all</Text>
          </Pressable>
        </View>

        {dashboardState.status === 'loading' ? (
          <View accessibilityLiveRegion="polite" style={styles.loadingCard}>
            <ActivityIndicator accessibilityLabel="Loading complaint summary" color="#216b42" />
            <Text style={styles.loadingText}>Loading your activity…</Text>
          </View>
        ) : dashboardState.status === 'error' ? (
          <View style={styles.inlineErrorCard}>
            <Text accessibilityRole="alert" style={styles.inlineErrorText}>
              {dashboardState.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshDashboard()}
              style={styles.inlineRetry}
            >
              <Text style={styles.inlineRetryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.metricsRow}>
            <MetricCard
              label={dashboardState.hasMore ? 'Recent' : 'Total'}
              tone="neutral"
              value={dashboardSummary?.total ?? 0}
            />
            <MetricCard label="Active" tone="active" value={dashboardSummary?.active ?? 0} />
            <MetricCard
              label="Needs you"
              tone="attention"
              value={dashboardSummary?.attention ?? 0}
            />
            <MetricCard label="Resolved" tone="resolved" value={dashboardSummary?.resolved ?? 0} />
          </View>
        )}

        {dashboardState.status === 'ready' ? (
          recentComplaints.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No complaints submitted yet</Text>
              <Text style={styles.emptyText}>
                Your complaint numbers, status changes and government updates will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {recentComplaints.map((complaint) => (
                <ComplaintCard
                  complaint={complaint}
                  key={complaint.id}
                  onPress={() => router.push(`/complaints/${complaint.id}`)}
                />
              ))}
              {dashboardState.hasMore ? (
                <Text style={styles.moreHint}>
                  More complaints are available in Your complaints.
                </Text>
              ) : null}
            </View>
          )
        ) : null}

        <Pressable
          accessibilityHint="Uses your location to find verified public governing bodies"
          accessibilityRole="button"
          onPress={() => router.push('/governance' as Href)}
          style={({ pressed }) => [styles.nearbyCard, pressed && styles.buttonPressed]}
        >
          <View style={styles.nearbyIcon}>
            <Text accessibilityElementsHidden style={styles.nearbyIconText}>
              ◎
            </Text>
          </View>
          <View style={styles.nearbyCopy}>
            <Text style={styles.nearbyTitle}>Governing bodies near you</Text>
            <Text style={styles.nearbyText}>
              Check verified municipality, ward and public office coverage for your location.
            </Text>
          </View>
          <Text accessibilityElementsHidden style={styles.nearbyChevron}>
            ›
          </Text>
        </Pressable>

        {availableCategoryCount === 0 && !complaintCapture.state.isBusy ? (
          <View style={styles.coverageCard}>
            <Text style={styles.coverageTitle}>Complaint coverage update</Text>
            <Text accessibilityRole="alert" style={styles.coverageText}>
              No category currently has verified operational routing in this environment. You can
              inspect every configured category in the complaint flow, but unavailable categories
              remain safely disabled.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void complaintCapture.reloadCategories().catch(() => undefined)}
              style={({ pressed }) => [styles.coverageButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.coverageButtonText}>Check available categories</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>Immediate danger?</Text>
          <Text style={styles.emergencyText}>
            Local Wellness is not an emergency dispatch service. Call 112 for immediate police, fire
            or medical help.
          </Text>
        </View>
      </ScrollView>
      <AppBottomNavigation current="home" />
    </Screen>
  );
}

const HeaderAction = ({
  accessibilityLabel,
  glyph,
  onPress,
}: Readonly<{ accessibilityLabel: string; glyph: string; onPress: () => void }>) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.headerAction, pressed && styles.buttonPressed]}
  >
    <Text accessibilityElementsHidden style={styles.headerActionGlyph}>
      {glyph}
    </Text>
  </Pressable>
);

const MetricCard = ({
  label,
  tone,
  value,
}: Readonly<{
  label: string;
  tone: 'active' | 'attention' | 'neutral' | 'resolved';
  value: number;
}>) => (
  <View
    accessible
    accessibilityLabel={`${label}: ${value}`}
    style={[
      styles.metricCard,
      tone === 'active'
        ? styles.metricActive
        : tone === 'attention'
          ? styles.metricAttention
          : tone === 'resolved'
            ? styles.metricResolved
            : styles.metricNeutral,
    ]}
  >
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  brandBlock: { flex: 1, gap: 3 },
  buttonPressed: { opacity: 0.76 },
  cardList: { gap: 11 },
  content: { gap: 18, padding: 20, paddingBottom: 36 },
  coverageCard: { backgroundColor: '#fff9e9', borderRadius: 16, gap: 6, padding: 16 },
  coverageButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingTop: 5,
  },
  coverageButtonText: { color: '#17683b', fontWeight: '900' },
  coverageText: { color: '#785516', lineHeight: 21 },
  coverageTitle: { color: '#63430e', fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
  emergencyCard: {
    backgroundColor: '#fff3ed',
    borderColor: '#ffd0ba',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emergencyText: { color: '#7c3518', lineHeight: 21 },
  emergencyTitle: { color: '#8f3412', fontSize: 17, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e1e8e3',
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 24,
  },
  emptyText: { color: '#65776b', lineHeight: 21, textAlign: 'center' },
  emptyTitle: { color: '#193b29', fontSize: 18, fontWeight: '800' },
  error: {
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    color: '#9b2626',
    lineHeight: 21,
    padding: 14,
  },
  eyebrow: { color: '#2b774c', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 8 },
  headerAction: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde7e0',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActionGlyph: { color: '#235c3b', fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  heroCard: {
    backgroundColor: '#174f2f',
    borderRadius: 24,
    gap: 18,
    overflow: 'hidden',
    padding: 21,
  },
  heroCopy: { gap: 7 },
  heroDescription: { color: '#d7eadf', fontSize: 15, lineHeight: 22 },
  heroTitle: { color: '#ffffff', fontSize: 25, fontWeight: '900', lineHeight: 31 },
  inlineErrorCard: { backgroundColor: '#fff0f0', borderRadius: 16, gap: 10, padding: 16 },
  inlineErrorText: { color: '#972626', lineHeight: 21 },
  inlineRetry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  inlineRetryText: { color: '#17683b', fontWeight: '800' },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 18,
  },
  loadingText: { color: '#5a6f61' },
  metricActive: { backgroundColor: '#e9f1ff' },
  metricAttention: { backgroundColor: '#fff4df' },
  metricCard: { borderRadius: 16, flex: 1, gap: 3, minWidth: '46%', padding: 14 },
  metricLabel: { color: '#52685a', fontSize: 12, fontWeight: '700' },
  metricNeutral: { backgroundColor: '#edf3ef' },
  metricResolved: { backgroundColor: '#e8f7ed' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricValue: { color: '#173c28', fontSize: 25, fontWeight: '900' },
  moreHint: { color: '#6b7e71', fontSize: 13, textAlign: 'center' },
  nearbyCard: {
    alignItems: 'center',
    backgroundColor: '#eef8f1',
    borderColor: '#c8e5d1',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 16,
  },
  nearbyChevron: { color: '#286443', fontSize: 28 },
  nearbyCopy: { flex: 1, gap: 4 },
  nearbyIcon: {
    alignItems: 'center',
    backgroundColor: '#d6efde',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  nearbyIconText: { color: '#17683b', fontSize: 24 },
  nearbyText: { color: '#53705e', fontSize: 13, lineHeight: 19 },
  nearbyTitle: { color: '#17492c', fontSize: 16, fontWeight: '800' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d8f56b',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
    padding: 13,
  },
  primaryButtonGlyph: { color: '#174b2d', fontSize: 25, lineHeight: 26 },
  primaryButtonText: { color: '#174b2d', fontSize: 16, fontWeight: '900' },
  retryButton: {
    alignItems: 'center',
    borderColor: '#b57817',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  retryText: { color: '#89590d', fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionHint: { color: '#718076', fontSize: 13, marginTop: 3 },
  sectionTitle: { color: '#173b27', fontSize: 20, fontWeight: '900' },
  textButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  textButtonLabel: { color: '#217044', fontSize: 14, fontWeight: '800' },
  title: { color: '#153b27', fontSize: 26, fontWeight: '900' },
  warning: {
    backgroundColor: '#fff8e8',
    borderRadius: 12,
    color: '#805a15',
    lineHeight: 21,
    padding: 14,
  },
});
