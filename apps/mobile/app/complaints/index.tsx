import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import {
  getUserFacingComplaintError,
  listComplaints,
} from '../../src/complaints/complaint-service';
import {
  buildComplaintDashboardSummary,
  getComplaintStatusGroup,
  type ComplaintStatusGroup,
} from '../../src/dashboard/complaint-summary';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { CivicIcon } from '../../src/ui/civic-icon';
import { ComplaintCard } from '../../src/ui/complaint-card';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type ComplaintFilter = 'all' | ComplaintStatusGroup;

type LoadState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'ready';
      hasMore: boolean;
      items: readonly ComplaintListItem[];
      nextCursor: string | null;
    }>;

const filterKeys: readonly ComplaintFilter[] = ['all', 'active', 'attention', 'resolved'];

export default function ComplaintListScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { t } = useLocalization();
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<ComplaintFilter>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [operationError, setOperationError] = useState<string | null>(null);
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;

  useEffect(() => {
    if (accessToken === null) return;
    let isCurrent = true;

    const load = async (): Promise<void> => {
      setLoadState({ status: 'loading' });
      setOperationError(null);
      try {
        const result = await listComplaints(accessToken);
        if (isCurrent) {
          setLoadState({
            hasMore: result.hasMore,
            items: result.items,
            nextCursor: result.nextCursor,
            status: 'ready',
          });
        }
      } catch (error) {
        if (isCurrent) {
          setLoadState({ message: getUserFacingComplaintError(error), status: 'error' });
        }
      }
    };

    void load();
    return () => {
      isCurrent = false;
    };
  }, [accessToken, attempt]);

  const filteredItems = useMemo(() => {
    if (loadState.status !== 'ready' || filter === 'all') {
      return loadState.status === 'ready' ? loadState.items : [];
    }

    return loadState.items.filter(
      (complaint) => getComplaintStatusGroup(complaint.status) === filter,
    );
  }, [filter, loadState]);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }
  if (loadState.status === 'loading') return <LoadingScreen label={t('loadingComplaints')} />;
  if (loadState.status === 'error') {
    return (
      <ErrorScreen
        action={{ label: t('tryAgain'), onPress: () => setAttempt((value) => value + 1) }}
        message={loadState.message}
        title={t('unableToContinue')}
      />
    );
  }

  const refresh = async (): Promise<void> => {
    if (accessToken === null || isRefreshing) return;
    setIsRefreshing(true);
    setOperationError(null);
    try {
      const result = await listComplaints(accessToken);
      setLoadState({
        hasMore: result.hasMore,
        items: result.items,
        nextCursor: result.nextCursor,
        status: 'ready',
      });
    } catch (error) {
      setOperationError(getUserFacingComplaintError(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMore = async (): Promise<void> => {
    if (
      accessToken === null ||
      isLoadingMore ||
      !loadState.hasMore ||
      loadState.nextCursor === null
    ) {
      return;
    }

    setIsLoadingMore(true);
    setOperationError(null);
    try {
      const result = await listComplaints(accessToken, loadState.nextCursor);
      const merged = new Map(loadState.items.map((complaint) => [complaint.id, complaint]));
      result.items.forEach((complaint) => merged.set(complaint.id, complaint));
      setLoadState({
        hasMore: result.hasMore,
        items: [...merged.values()],
        nextCursor: result.nextCursor,
        status: 'ready',
      });
    } catch (error) {
      setOperationError(getUserFacingComplaintError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const summary = buildComplaintDashboardSummary(loadState.items);
  const filterLabels: Readonly<Record<ComplaintFilter, string>> = {
    active: t('active'),
    all: t('all'),
    attention: t('needsYou'),
    resolved: t('resolved'),
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[mobileTheme.colors.primary]}
            onRefresh={() => void refresh()}
            refreshing={isRefreshing}
            tintColor={mobileTheme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t('myActivity').toUpperCase()}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {t('yourComplaints')}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryItem label={loadState.hasMore ? t('loaded') : t('total')} value={summary.total} />
          <View style={styles.summaryDivider} />
          <SummaryItem label={t('active')} value={summary.active} />
          <View style={styles.summaryDivider} />
          <SummaryItem label={t('needsYou')} value={summary.attention} />
          <View style={styles.summaryDivider} />
          <SummaryItem label={t('resolved')} value={summary.resolved} />
        </View>

        <View accessibilityRole="tablist" style={styles.filters}>
          {filterKeys.map((candidate) => {
            const isSelected = filter === candidate;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                key={candidate}
                onPress={() => setFilter(candidate)}
                style={({ pressed }) => [
                  styles.filter,
                  isSelected && styles.filterSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {filterLabels[candidate]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {operationError === null ? null : (
          <Text accessibilityRole="alert" style={styles.operationError}>
            {operationError}
          </Text>
        )}

        {filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <CivicIcon color={mobileTheme.colors.primary} name="complaint" />
            </View>
            <Text style={styles.emptyTitle}>
              {loadState.items.length === 0 ? t('noComplaints') : t('noFilteredComplaints')}
            </Text>
            <Text style={styles.emptyText}>
              {loadState.items.length === 0 ? t('tapReportToStart') : t('tryAnotherStatus')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredItems.map((complaint) => (
              <ComplaintCard
                complaint={complaint}
                key={complaint.id}
                onPress={() => router.push(`/complaints/${complaint.id}`)}
              />
            ))}
          </View>
        )}

        {loadState.hasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoadingMore }}
            disabled={isLoadingMore}
            onPress={() => void loadMore()}
            style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
          >
            {isLoadingMore ? (
              <ActivityIndicator
                accessibilityLabel={t('loadingMore')}
                color={mobileTheme.colors.primary}
              />
            ) : (
              <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      <AppBottomNavigation current="complaints" />
    </Screen>
  );
}

const SummaryItem = ({ label, value }: Readonly<{ label: string; value: number }>) => (
  <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.summaryItem}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 28 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 9,
    padding: 24,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#e6f6eb',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 3,
    width: 48,
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
    fontWeight: '900',
    textAlign: 'center',
  },
  eyebrow: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.type.caption,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filter: {
    alignItems: 'center',
    borderColor: '#d4dfd7',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterSelected: { backgroundColor: '#1b6940', borderColor: '#1b6940' },
  filterText: { color: mobileTheme.colors.muted, fontSize: 12, fontWeight: '800' },
  filterTextSelected: { color: mobileTheme.colors.white },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 8 },
  headerCopy: { flex: 1, gap: 5 },
  list: { gap: 11 },
  loadMoreButton: {
    alignItems: 'center',
    borderColor: '#277348',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    padding: 12,
  },
  loadMoreText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '900' },
  operationError: {
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    color: '#982727',
    lineHeight: 21,
    padding: 14,
  },
  pressed: { opacity: 0.68 },
  summaryCard: {
    backgroundColor: '#174f2f',
    borderRadius: 18,
    flexDirection: 'row',
    paddingHorizontal: 7,
    paddingVertical: 16,
  },
  summaryDivider: { alignSelf: 'stretch', backgroundColor: '#397056', width: 1 },
  summaryItem: { alignItems: 'center', flex: 1, gap: 3 },
  summaryLabel: { color: '#cbe1d3', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  summaryValue: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.title, fontWeight: '900' },
});
