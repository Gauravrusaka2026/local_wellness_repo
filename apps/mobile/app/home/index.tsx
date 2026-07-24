import type { Href } from 'expo-router';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ComplaintListItem } from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import { getSupabaseClient } from '../../src/auth/supabase';
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
import { CivicIcon, type CivicIconName } from '../../src/ui/civic-icon';
import { ComplaintCard } from '../../src/ui/complaint-card';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';
import { getTimeGreetingKey } from '../../src/ui/time-greeting';
import { createProfileImageSignedUrl } from '../../src/profile/profile-image';
import { getProfile, type Profile } from '../../src/profile/profile-service';

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
  const { locale, setLocale, t } = useLocalization();
  const [dashboardState, setDashboardState] = useState<DashboardState>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

      const loadIdentity = async (): Promise<void> => {
        try {
          const loadedProfile = await getProfile(accessToken);
          if (!isCurrent) return;
          setProfile(loadedProfile);
          if (loadedProfile.preferredLanguage !== locale) {
            await setLocale(loadedProfile.preferredLanguage);
          }
          if (loadedProfile.avatarObjectPath) {
            const url = await createProfileImageSignedUrl(
              getSupabaseClient(),
              loadedProfile.id,
              loadedProfile.avatarObjectPath,
            );
            if (isCurrent) setAvatarUrl(url);
          } else {
            setAvatarUrl(null);
          }
        } catch {
          // The dashboard remains usable when optional identity decoration is unavailable.
        }
      };

      void loadDashboard();
      void loadIdentity();
      return () => {
        isCurrent = false;
      };
    }, [accessToken, locale, setLocale]),
  );

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

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
  const displayName =
    profile?.displayName ?? auth.state.session.user.email?.split('@')[0] ?? t('citizen');
  const greeting = t(getTimeGreetingKey(new Date()));
  const initial = displayName.trim().charAt(0).toUpperCase() || 'C';

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
          <Pressable
            accessibilityLabel={t('openProfile')}
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            {avatarUrl ? (
              <Image
                onError={() => setAvatarUrl(null)}
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </Pressable>
          <View style={styles.brandBlock}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
              {displayName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderAction
              accessibilityLabel={t('openNotifications')}
              icon="bell"
              onPress={() => router.push('/notifications')}
            />
          </View>
        </View>

        <Pressable
          accessibilityHint={t('browseServicesHint')}
          accessibilityLabel={t('searchServices')}
          accessibilityRole="button"
          onPress={() => router.push('/menu')}
          style={({ pressed }) => [styles.searchBar, pressed && styles.buttonPressed]}
        >
          <CivicIcon color={mobileTheme.colors.muted} name="search" />
          <Text style={styles.searchText}>{t('searchServices')}</Text>
          <View style={styles.searchFilter}>
            <CivicIcon color={mobileTheme.colors.white} name="filter" />
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('quickActions')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/menu')}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>{t('viewAll')}</Text>
          </Pressable>
        </View>
        <View style={styles.quickActions}>
          <QuickAction
            color={mobileTheme.colors.success}
            disabled={complaintCapture.state.isBusy || !complaintCapture.state.isOnline}
            icon="complaint"
            isLoading={complaintCapture.state.isBusy}
            label={complaintCapture.state.draft ? t('resumeReport') : t('raiseComplaint')}
            onPress={() => void openDraft()}
          />
          <QuickAction
            color={mobileTheme.colors.info}
            icon="status"
            label={t('trackStatus')}
            onPress={() => router.push('/complaints')}
          />
          <QuickAction
            color={mobileTheme.colors.accent}
            icon="location"
            label={t('nearbyOffices')}
            onPress={() => router.push('/governance' as Href)}
          />
        </View>

        {!complaintCapture.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            {t('offlineNotice')}
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
            <Text style={styles.retryText}>{t('retryPendingUpload')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {t('complaintOverview')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/complaints')}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>{t('viewAll')}</Text>
          </Pressable>
        </View>

        {dashboardState.status === 'loading' ? (
          <View accessibilityLiveRegion="polite" style={styles.loadingCard}>
            <ActivityIndicator
              accessibilityLabel={t('loadingActivity')}
              color={mobileTheme.colors.primary}
            />
            <Text style={styles.loadingText}>{t('loadingActivity')}</Text>
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
              <Text style={styles.inlineRetryText}>{t('tryAgain')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.metricsRow}>
            <MetricCard
              label={dashboardState.hasMore ? t('recent') : t('total')}
              tone="neutral"
              value={dashboardSummary?.total ?? 0}
            />
            <MetricCard label={t('active')} tone="active" value={dashboardSummary?.active ?? 0} />
            <MetricCard
              label={t('needsYou')}
              tone="attention"
              value={dashboardSummary?.attention ?? 0}
            />
            <MetricCard
              label={t('resolved')}
              tone="resolved"
              value={dashboardSummary?.resolved ?? 0}
            />
          </View>
        )}

        {dashboardState.status === 'ready' ? (
          recentComplaints.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('noComplaintsSubmitted')}</Text>
              <Text style={styles.emptyText}>{t('newReportsHere')}</Text>
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
            </View>
          )
        ) : null}

        <Pressable
          accessibilityHint={t('governingBodiesHint')}
          accessibilityRole="button"
          onPress={() => router.push('/governance' as Href)}
          style={({ pressed }) => [styles.nearbyCard, pressed && styles.buttonPressed]}
        >
          <View style={styles.nearbyIcon}>
            <CivicIcon color={mobileTheme.colors.primary} name="office" />
          </View>
          <View style={styles.nearbyCopy}>
            <Text style={styles.nearbyTitle}>{t('yourGoverningBodies')}</Text>
          </View>
          <CivicIcon color={mobileTheme.colors.primary} name="chevron-right" />
        </Pressable>

        {availableCategoryCount === 0 && !complaintCapture.state.isBusy ? (
          <View style={styles.coverageCard}>
            <Text style={styles.coverageTitle}>{t('routingCoverage')}</Text>
            <Text accessibilityRole="alert" style={styles.coverageText}>
              {t('routingUnavailable')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void complaintCapture.reloadCategories().catch(() => undefined)}
              style={({ pressed }) => [styles.coverageButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.coverageButtonText}>{t('refreshCategories')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>{t('immediateDanger')}</Text>
          <Text style={styles.emergencyText}>{t('complaintsNotEmergency')}</Text>
        </View>
      </ScrollView>
      <AppBottomNavigation current="home" />
    </Screen>
  );
}

const HeaderAction = ({
  accessibilityLabel,
  icon,
  onPress,
}: Readonly<{
  accessibilityLabel: string;
  icon: CivicIconName;
  onPress: () => void;
}>) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.headerAction, pressed && styles.buttonPressed]}
  >
    <CivicIcon color="#17683b" name={icon} />
  </Pressable>
);

const QuickAction = ({
  color,
  disabled = false,
  icon,
  isLoading = false,
  label,
  onPress,
}: Readonly<{
  color: string;
  disabled?: boolean;
  icon: CivicIconName;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
}>) => {
  const { t } = useLocalization();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.buttonPressed,
        disabled && styles.quickActionDisabled,
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        {isLoading ? (
          <ActivityIndicator
            accessibilityLabel={t('preparingReport')}
            color={mobileTheme.colors.white}
            size="small"
          />
        ) : (
          <CivicIcon color={mobileTheme.colors.white} name={icon} />
        )}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
};

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
  avatar: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.primarySoft,
    borderColor: mobileTheme.colors.white,
    borderRadius: 27,
    borderWidth: 2,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  avatarImage: { height: '100%', width: '100%' },
  avatarInitial: { color: mobileTheme.colors.primary, fontSize: 20, fontWeight: '900' },
  brandBlock: { flex: 1, gap: 3 },
  buttonPressed: { opacity: 0.76 },
  cardList: { gap: 11 },
  content: { gap: 14, padding: 16, paddingBottom: 22 },
  coverageCard: {
    backgroundColor: mobileTheme.colors.warningSoft,
    borderRadius: mobileTheme.radius.large,
    gap: 6,
    padding: 14,
  },
  coverageButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingTop: 5,
  },
  coverageButtonText: { color: mobileTheme.colors.primary, fontWeight: '900' },
  coverageText: {
    color: mobileTheme.colors.warning,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  coverageTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '800',
  },
  emergencyCard: {
    backgroundColor: mobileTheme.colors.accentSoft,
    borderColor: '#ffd0ba',
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emergencyText: {
    color: '#7c3518',
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  emergencyTitle: {
    color: '#8f3412',
    fontSize: mobileTheme.type.heading,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 7,
    padding: 24,
  },
  emptyText: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
    textAlign: 'center',
  },
  emptyTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '800',
  },
  error: {
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    color: '#9b2626',
    lineHeight: 21,
    padding: 14,
  },
  greeting: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    fontWeight: '600',
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 8 },
  headerAction: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
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
  loadingText: { color: mobileTheme.colors.muted, fontSize: mobileTheme.type.body },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    ...mobileTheme.shadow.surface,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 106,
    padding: 10,
  },
  quickActionDisabled: { opacity: 0.55 },
  quickActionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  quickActionLabel: {
    color: '#263241',
    fontSize: mobileTheme.type.helper,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'center',
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  searchFilter: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.success,
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  searchText: { color: mobileTheme.colors.muted, flex: 1, fontSize: mobileTheme.type.body },
  metricActive: { backgroundColor: '#e9f1ff' },
  metricAttention: { backgroundColor: '#fff4df' },
  metricCard: { borderRadius: 16, flex: 1, gap: 3, minWidth: '46%', padding: 14 },
  metricLabel: { color: '#52685a', fontSize: 12, fontWeight: '700' },
  metricNeutral: { backgroundColor: '#edf3ef' },
  metricResolved: { backgroundColor: '#e8f7ed' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricValue: { color: mobileTheme.colors.text, fontSize: 22, fontWeight: '900' },
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
  nearbyCopy: { flex: 1 },
  nearbyIcon: {
    alignItems: 'center',
    backgroundColor: '#d6efde',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  nearbyTitle: {
    color: mobileTheme.colors.primaryDark,
    fontSize: mobileTheme.type.body,
    fontWeight: '800',
  },
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
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.heading,
    fontWeight: '900',
  },
  textButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  textButtonLabel: { color: '#217044', fontSize: 14, fontWeight: '800' },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.title, fontWeight: '900' },
  warning: {
    backgroundColor: '#fff8e8',
    borderRadius: 12,
    color: '#805a15',
    lineHeight: 21,
    padding: 14,
  },
});
