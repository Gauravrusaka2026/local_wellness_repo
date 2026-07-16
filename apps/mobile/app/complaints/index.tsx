import type { Href } from 'expo-router';
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
import { ComplaintCard } from '../../src/ui/complaint-card';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

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

const filters: readonly Readonly<{ key: ComplaintFilter; label: string }>[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'attention', label: 'Needs you' },
  { key: 'resolved', label: 'Resolved' },
];

export default function ComplaintListScreen() {
  const auth = useAuth();
  const router = useRouter();
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

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} />;
  }
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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={['#17683b']}
            onRefresh={() => void refresh()}
            refreshing={isRefreshing}
            tintColor="#17683b"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MY ACTIVITY</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Your complaints
            </Text>
            <Text style={styles.help}>
              Follow every submitted report, government update and resolution.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            onPress={() => router.push('/menu' as Href)}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
          >
            <Text accessibilityElementsHidden style={styles.menuGlyph}>
              ≡
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <SummaryItem label={loadState.hasMore ? 'Loaded' : 'Total'} value={summary.total} />
          <View style={styles.summaryDivider} />
          <SummaryItem label="Active" value={summary.active} />
          <View style={styles.summaryDivider} />
          <SummaryItem label="Needs you" value={summary.attention} />
          <View style={styles.summaryDivider} />
          <SummaryItem label="Resolved" value={summary.resolved} />
        </View>

        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((candidate) => {
            const isSelected = filter === candidate.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                key={candidate.key}
                onPress={() => setFilter(candidate.key)}
                style={({ pressed }) => [
                  styles.filter,
                  isSelected && styles.filterSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {candidate.label}
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
              <Text accessibilityElementsHidden style={styles.emptyIconText}>
                ✓
              </Text>
            </View>
            <Text style={styles.emptyTitle}>
              {loadState.items.length === 0
                ? 'No submitted complaints'
                : `No ${filters.find(({ key }) => key === filter)?.label.toLowerCase()} complaints`}
            </Text>
            <Text style={styles.emptyText}>
              {loadState.items.length === 0
                ? 'Use Report below when you find a local issue. Your receipt and progress will appear here.'
                : 'Choose another status to see the rest of your complaint history.'}
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
              <ActivityIndicator accessibilityLabel="Loading more complaints" color="#17683b" />
            ) : (
              <Text style={styles.loadMoreText}>Load more complaints</Text>
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
  content: { gap: 17, padding: 20, paddingBottom: 36 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e0e8e2',
    borderRadius: 20,
    borderWidth: 1,
    gap: 9,
    padding: 30,
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
  emptyIconText: { color: '#1f7141', fontSize: 24, fontWeight: '900' },
  emptyText: { color: '#64766a', lineHeight: 21, textAlign: 'center' },
  emptyTitle: { color: '#173b27', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  eyebrow: { color: '#2b774c', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
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
  filterText: { color: '#506559', fontSize: 13, fontWeight: '800' },
  filterTextSelected: { color: '#ffffff' },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 8 },
  headerCopy: { flex: 1, gap: 5 },
  help: { color: '#65766b', lineHeight: 21 },
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
  loadMoreText: { color: '#17683b', fontWeight: '900' },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuGlyph: { color: '#235c3b', fontSize: 24, fontWeight: '800' },
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
  title: { color: '#153b27', fontSize: 29, fontWeight: '900' },
});
