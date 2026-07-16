import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  publicComplaintStatuses,
  type PublicComplaintMapItem,
  type PublicComplaintMapResult,
  type PublicComplaintStatus,
  type PublicTransparencyViewport,
} from '@local-wellness/types';

import {
  createNearbyViewport,
  projectApproximatePoint,
} from '../../src/transparency/nearby-viewport';
import {
  getUserFacingTransparencyError,
  listPublicComplaints,
  mergePublicComplaintPages,
} from '../../src/transparency/transparency-service';
import {
  createMobileTransparencyQuery,
  defaultMobileTransparencyFilters,
  type MobileTransparencyFilters,
} from '../../src/transparency/transparency-query';
import { Screen } from '../../src/ui/screen';

type LoadState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ result: PublicComplaintMapResult; status: 'ready' }>;

const statusLabels: Record<PublicComplaintStatus, string> = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
};

const pointColors: Record<PublicComplaintStatus, string> = {
  closed: '#475569',
  in_progress: '#b45309',
  reported: '#1d4ed8',
  resolved: '#15803d',
};

const captureNearbyViewport = async (): Promise<PublicTransparencyViewport> => {
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Turn on device location services to explore reports near you.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? 'Location access is needed to choose a nearby public viewport.'
        : 'Enable location access for Local Wellness in device settings.',
    );
  }

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return createNearbyViewport(location.coords.latitude, location.coords.longitude);
};

const ApproximateLocationPlot = ({
  items,
  onOpen,
  viewport,
}: Readonly<{
  items: readonly PublicComplaintMapItem[];
  onOpen: (publicId: string) => void;
  viewport: PublicTransparencyViewport;
}>) => (
  <View
    accessibilityLabel={`${items.length} approximate public report locations. Use the list below for complete details.`}
    accessibilityRole="image"
    style={styles.plotCard}
  >
    <View style={[styles.plotGridLine, styles.horizontalOne]} />
    <View style={[styles.plotGridLine, styles.horizontalTwo]} />
    <View style={[styles.plotGridLine, styles.verticalOne]} />
    <View style={[styles.plotGridLine, styles.verticalTwo]} />
    {items.map((item) => {
      const point = projectApproximatePoint(item.location, viewport);
      return (
        <Pressable
          accessibilityLabel={`${item.category.name}, ${statusLabels[item.status]}, approximate public location`}
          accessibilityRole="button"
          hitSlop={8}
          key={item.publicId}
          onPress={() => onOpen(item.publicId)}
          style={[
            styles.plotPoint,
            {
              backgroundColor: pointColors[item.status],
              left: `${point.xPercent}%`,
              top: `${point.yPercent}%`,
            },
          ]}
        />
      );
    })}
  </View>
);

export default function TransparencyScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [viewport, setViewport] = useState<PublicTransparencyViewport | null>(null);
  const [filters, setFilters] = useState<MobileTransparencyFilters>(
    defaultMobileTransparencyFilters,
  );
  const [appliedFilters, setAppliedFilters] = useState<MobileTransparencyFilters>(
    defaultMobileTransparencyFilters,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const isBusy = loadState.status === 'loading' || isLoadingMore;

  const categories = useMemo(() => {
    const items = loadState.status === 'ready' ? loadState.result.items : [];
    return [...new Map(items.map((item) => [item.category.code, item.category])).values()].sort(
      (left, right) => left.name.localeCompare(right.name),
    );
  }, [loadState]);

  const load = async (
    requestedViewport: PublicTransparencyViewport,
    requestedFilters: MobileTransparencyFilters,
  ): Promise<void> => {
    setLoadState({ status: 'loading' });
    setPaginationError(null);
    setViewport(requestedViewport);
    try {
      const result = await listPublicComplaints(
        createMobileTransparencyQuery(requestedViewport, requestedFilters),
      );
      setAppliedFilters(requestedFilters);
      setLoadState({ result, status: 'ready' });
    } catch (error) {
      setLoadState({ message: getUserFacingTransparencyError(error), status: 'error' });
    }
  };

  const handleCurrentArea = async (): Promise<void> => {
    setLoadState({ status: 'loading' });
    try {
      await load(await captureNearbyViewport(), filters);
    } catch (error) {
      setLoadState({
        message: error instanceof Error ? error.message : 'Your nearby area is unavailable.',
        status: 'error',
      });
    }
  };

  const loadMore = async (): Promise<void> => {
    if (
      viewport === null ||
      loadState.status !== 'ready' ||
      loadState.result.nextCursor === null ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);
    setPaginationError(null);
    try {
      const next = await listPublicComplaints(
        createMobileTransparencyQuery(viewport, appliedFilters, loadState.result.nextCursor),
      );
      setLoadState({
        result: mergePublicComplaintPages(loadState.result, next),
        status: 'ready',
      });
    } catch (error) {
      setPaginationError(getUserFacingTransparencyError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.title}>
            Public reports near you
          </Text>
          <Text style={styles.description}>
            Explore reviewed summaries and deliberately approximate locations. No external map or
            tile provider receives these coordinates.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void handleCurrentArea()}
          style={styles.primaryButton}
        >
          {loadState.status === 'loading' ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {viewport === null ? 'Use my current area' : 'Refresh current area'}
            </Text>
          )}
        </Pressable>

        {viewport === null ? null : (
          <View style={styles.filterCard}>
            <Text style={styles.filterHeading}>Status</Text>
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => setFilters((current) => ({ ...current, status: null }))}
                style={[styles.filterChip, filters.status === null ? styles.selectedChip : null]}
              >
                <Text style={styles.filterChipText}>All</Text>
              </Pressable>
              {publicComplaintStatuses.map((status) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  key={status}
                  onPress={() => setFilters((current) => ({ ...current, status }))}
                  style={[
                    styles.filterChip,
                    filters.status === status ? styles.selectedChip : null,
                  ]}
                >
                  <Text style={styles.filterChipText}>{statusLabels[status]}</Text>
                </Pressable>
              ))}
            </View>
            {categories.length === 0 ? null : (
              <>
                <Text style={styles.filterHeading}>Category</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => setFilters((current) => ({ ...current, categoryCode: null }))}
                    style={[
                      styles.filterChip,
                      filters.categoryCode === null ? styles.selectedChip : null,
                    ]}
                  >
                    <Text style={styles.filterChipText}>All</Text>
                  </Pressable>
                  {categories.map((category) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      key={category.code}
                      onPress={() =>
                        setFilters((current) => ({ ...current, categoryCode: category.code }))
                      }
                      style={[
                        styles.filterChip,
                        filters.categoryCode === category.code ? styles.selectedChip : null,
                      ]}
                    >
                      <Text style={styles.filterChipText}>{category.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void load(viewport, filters)}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Apply filters</Text>
            </Pressable>
          </View>
        )}

        {loadState.status === 'idle' ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Choose your nearby area</Text>
            <Text style={styles.stateText}>
              Location access selects a bounded search area. Private and unreviewed complaints are
              never returned.
            </Text>
          </View>
        ) : null}
        {loadState.status === 'error' ? (
          <View style={styles.errorCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {loadState.message}
            </Text>
            {viewport === null ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void load(viewport, filters)}
                style={styles.errorRetry}
              >
                <Text style={styles.errorRetryText}>Try this area again</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {loadState.status === 'ready' && loadState.result.items.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No reviewed public reports here</Text>
            <Text style={styles.stateText}>
              Private, sensitive, withdrawn, and unreviewed complaints remain hidden. Try again
              later or change the filters.
            </Text>
          </View>
        ) : null}
        {loadState.status === 'ready' && loadState.result.items.length > 0 && viewport !== null ? (
          <>
            <View style={styles.plotIntroduction}>
              <Text style={styles.sectionTitle}>Approximate location plot</Text>
              <Text style={styles.help}>
                Points represent generalized areas, not exact complaint locations.
              </Text>
            </View>
            <ApproximateLocationPlot
              items={loadState.result.items}
              onOpen={(publicId) => router.push(`/transparency/${publicId}`)}
              viewport={viewport}
            />
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Reviewed public reports
            </Text>
            {loadState.result.items.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.publicId}
                onPress={() => router.push(`/transparency/${item.publicId}`)}
                style={styles.reportCard}
              >
                <View style={styles.reportTopline}>
                  <Text style={[styles.status, { color: pointColors[item.status] }]}>
                    {statusLabels[item.status]}
                  </Text>
                  <Text style={styles.date}>{new Date(item.submittedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reportCategory}>{item.title}</Text>
                <Text style={styles.help}>
                  {item.category.name} · {item.localBody.name}
                  {item.ward === null ? '' : ` · ${item.ward.name}`} · generalized to about{' '}
                  {item.location.precisionMeters.toLocaleString()} m
                </Text>
              </Pressable>
            ))}
            {loadState.result.hasMore && loadState.result.nextCursor !== null ? (
              <>
                {paginationError === null ? null : (
                  <Text accessibilityRole="alert" style={styles.paginationError}>
                    {paginationError}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoadingMore}
                  onPress={() => void loadMore()}
                  style={styles.loadMoreButton}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator color="#166534" />
                  ) : (
                    <Text style={styles.loadMoreText}>
                      {paginationError === null
                        ? 'Load more public reports'
                        : 'Try loading more again'}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Public-safe by design</Text>
          <Text style={styles.privacyText}>
            Citizen identity, exact coordinates, original media, private messages, comments, and
            government internal notes are not shown.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  applyButton: {
    alignItems: 'center',
    borderColor: '#166534',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    padding: 10,
  },
  applyButtonText: { color: '#166534', fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 14, padding: 20, paddingBottom: 48 },
  date: { color: '#64748b', fontSize: 13 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16 },
  errorRetry: { alignItems: 'center', marginTop: 8, minHeight: 40, padding: 8 },
  errorRetryText: { color: '#991b1b', fontWeight: '800' },
  errorText: { color: '#991b1b', lineHeight: 22 },
  filterCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  filterChip: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: { color: '#334155', fontWeight: '700' },
  filterHeading: { color: '#334155', fontWeight: '800', marginTop: 2 },
  help: { color: '#64748b', lineHeight: 21 },
  hero: { gap: 8, marginTop: 12 },
  horizontalOne: { left: 0, right: 0, top: '33%' },
  horizontalTwo: { left: 0, right: 0, top: '66%' },
  loadMoreButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  loadMoreText: { color: '#166534', fontWeight: '800' },
  paginationError: { color: '#991b1b', lineHeight: 20, textAlign: 'center' },
  plotCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderRadius: 14,
    borderWidth: 1,
    height: 250,
    overflow: 'hidden',
    position: 'relative',
  },
  plotGridLine: { backgroundColor: '#cbd5e1', position: 'absolute' },
  plotIntroduction: { gap: 3, marginTop: 4 },
  plotPoint: {
    borderColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    position: 'absolute',
    width: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 54,
    padding: 14,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  privacyCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 15,
  },
  privacyText: { color: '#365943', lineHeight: 21 },
  privacyTitle: { color: '#14532d', fontSize: 16, fontWeight: '800' },
  reportCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 16,
  },
  reportCategory: { color: '#1e293b', fontSize: 17, fontWeight: '800' },
  reportTopline: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#14281d', fontSize: 20, fontWeight: '800' },
  selectedChip: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  stateCard: { alignItems: 'center', gap: 7, padding: 26 },
  stateText: { color: '#64748b', lineHeight: 21, textAlign: 'center' },
  stateTitle: { color: '#14281d', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  status: { fontSize: 13, fontWeight: '900' },
  title: { color: '#14281d', fontSize: 30, fontWeight: '900' },
  verticalOne: { bottom: 0, left: '33%', top: 0, width: 1 },
  verticalTwo: { bottom: 0, left: '66%', top: 0, width: 1 },
});
