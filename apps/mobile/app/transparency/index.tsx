import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  PublicComplaintHotspotResult,
  PublicComplaintMapItem,
  PublicComplaintMapResult,
  PublicComplaintStatus,
  PublicTransparencyViewport,
} from '@local-wellness/types';

import {
  createNearbyViewport,
  NearbyLocationError,
  requiresNearbyLocationSettings,
} from '../../src/transparency/nearby-viewport';
import { buildHotspotVisuals } from '../../src/transparency/hotspot-visualization';
import {
  getUserFacingTransparencyError,
  listPublicComplaintHotspots,
  listPublicComplaints,
  mergePublicComplaintPages,
} from '../../src/transparency/transparency-service';
import {
  createMobileHotspotQuery,
  createMobileTransparencyQuery,
  defaultMobileTransparencyFilters,
  ongoingPublicComplaintStatuses,
  type MobileTransparencyFilters,
} from '../../src/transparency/transparency-query';
import { Screen } from '../../src/ui/screen';

type TransparencySegment = 'feed' | 'heatmap';

type LoadState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ message: string; settingsRequired: boolean; status: 'error' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      feed: PublicComplaintMapResult;
      hotspots: PublicComplaintHotspotResult;
      status: 'ready';
    }>;

const statusLabels: Record<PublicComplaintStatus, string> = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
};

const statusColors: Record<
  PublicComplaintStatus,
  Readonly<{ background: string; text: string }>
> = {
  closed: { background: '#e2e8f0', text: '#475569' },
  in_progress: { background: '#fef3c7', text: '#92400e' },
  reported: { background: '#dbeafe', text: '#1d4ed8' },
  resolved: { background: '#dcfce7', text: '#166534' },
};

const captureNearbyViewport = async (): Promise<PublicTransparencyViewport> => {
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new NearbyLocationError('Turn on device location services to explore reports near you.');
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new NearbyLocationError(
      permission.canAskAgain
        ? 'Location access is needed to choose a nearby public viewport.'
        : 'Enable location access for Local Wellness in device settings.',
      { requiresAppSettings: !permission.canAskAgain },
    );
  }
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return createNearbyViewport(location.coords.latitude, location.coords.longitude);
};

const FeedCard = ({
  item,
  onOpen,
}: Readonly<{ item: PublicComplaintMapItem; onOpen: () => void }>) => {
  const colors = statusColors[item.status];
  return (
    <Pressable
      accessibilityLabel={`${item.title}, ${statusLabels[item.status]}, ${item.localBody.name}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.feedCard, pressed && styles.pressedCard]}
    >
      <View style={styles.feedHeader}>
        <View style={styles.categoryIcon}>
          <Text accessibilityElementsHidden style={styles.categoryInitial}>
            {item.category.name.charAt(0).toLocaleUpperCase()}
          </Text>
        </View>
        <View style={styles.feedMetaCopy}>
          <Text style={styles.localityName}>{item.localBody.name}</Text>
          <Text style={styles.feedDate}>
            {item.ward ? `${item.ward.name} · ` : ''}
            {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.background }]}>
          <Text style={[styles.statusPillText, { color: colors.text }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.feedTitle}>{item.title}</Text>
      <Text style={styles.categoryLabel}>{item.category.name}</Text>
      <View style={styles.feedFooter}>
        <Text style={styles.approximateLabel}>
          Approximate area · {item.location.precisionMeters.toLocaleString()} m privacy radius
        </Text>
        <Text style={styles.openLabel}>Open report →</Text>
      </View>
    </Pressable>
  );
};

const HotspotDensityPlot = ({
  hotspots,
  viewport,
}: Readonly<{
  hotspots: PublicComplaintHotspotResult;
  viewport: PublicTransparencyViewport;
}>) => {
  const visuals = buildHotspotVisuals(hotspots.items, viewport);
  return (
    <View
      accessibilityLabel={`${visuals.length} privacy-preserving complaint density areas. Darker, larger areas contain more reviewed ongoing reports.`}
      accessibilityRole="image"
      style={styles.heatmapPlot}
    >
      <View style={[styles.gridLine, styles.horizontalOne]} />
      <View style={[styles.gridLine, styles.horizontalTwo]} />
      <View style={[styles.gridLine, styles.verticalOne]} />
      <View style={[styles.gridLine, styles.verticalTwo]} />
      <View style={styles.centerMarker} />
      {visuals.map((visual) => (
        <View
          accessibilityLabel={`${visual.complaintCount} reviewed ongoing complaints in this generalized area`}
          accessible
          key={visual.id}
          style={[
            styles.densityCircle,
            {
              backgroundColor: `rgba(220, 38, 38, ${visual.intensity})`,
              height: visual.diameter,
              left: `${visual.xPercent}%`,
              marginLeft: -visual.diameter / 2,
              marginTop: -visual.diameter / 2,
              top: `${visual.yPercent}%`,
              width: visual.diameter,
            },
          ]}
        >
          <Text style={styles.densityCount}>{visual.complaintCount}</Text>
        </View>
      ))}
    </View>
  );
};

export default function TransparencyScreen() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<TransparencySegment>('feed');
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
    const items = loadState.status === 'ready' ? loadState.feed.items : [];
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
      const [feed, hotspots] = await Promise.all([
        listPublicComplaints(createMobileTransparencyQuery(requestedViewport, requestedFilters)),
        listPublicComplaintHotspots(createMobileHotspotQuery(requestedViewport, requestedFilters)),
      ]);
      setAppliedFilters(requestedFilters);
      setLoadState({ feed, hotspots, status: 'ready' });
    } catch (error) {
      setLoadState({
        message: getUserFacingTransparencyError(error),
        settingsRequired: false,
        status: 'error',
      });
    }
  };

  const handleCurrentArea = async (): Promise<void> => {
    setLoadState({ status: 'loading' });
    try {
      await load(await captureNearbyViewport(), filters);
    } catch (error) {
      setLoadState({
        message: error instanceof Error ? error.message : 'Your nearby area is unavailable.',
        settingsRequired: requiresNearbyLocationSettings(error),
        status: 'error',
      });
    }
  };

  const loadMore = async (): Promise<void> => {
    if (
      viewport === null ||
      loadState.status !== 'ready' ||
      loadState.feed.nextCursor === null ||
      isLoadingMore
    ) {
      return;
    }
    setIsLoadingMore(true);
    setPaginationError(null);
    try {
      const next = await listPublicComplaints(
        createMobileTransparencyQuery(viewport, appliedFilters, loadState.feed.nextCursor),
      );
      setLoadState({
        ...loadState,
        feed: mergePublicComplaintPages(loadState.feed, next),
      });
    } catch (error) {
      setPaginationError(getUserFacingTransparencyError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadedFeed = loadState.status === 'ready' ? loadState.feed : null;
  const loadedHotspots = loadState.status === 'ready' ? loadState.hotspots : null;
  const hotspotComplaintCount =
    loadedHotspots?.items.reduce((total, item) => total + item.complaintCount, 0) ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LOCAL TRANSPARENCY</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Your locality
          </Text>
          <Text style={styles.description}>
            Reviewed, ongoing civic reports near a rounded device viewport. No map or tile provider
            receives these coordinates.
          </Text>
        </View>

        <View accessibilityRole="tablist" style={styles.segmentedControl}>
          {(['feed', 'heatmap'] as const).map((segment) => {
            const selected = activeSegment === segment;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={segment}
                onPress={() => setActiveSegment(segment)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {segment === 'feed' ? 'Feed' : 'Heatmap'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: loadState.status === 'loading', disabled: isBusy }}
          disabled={isBusy}
          onPress={() => void handleCurrentArea()}
          style={styles.primaryButton}
        >
          {loadState.status === 'loading' ? (
            <ActivityIndicator accessibilityLabel="Finding reviewed reports nearby" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {viewport === null ? 'Use my current area' : 'Refresh current area'}
            </Text>
          )}
        </Pressable>

        {loadState.status === 'ready' ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{loadState.feed.items.length}</Text>
              <Text style={styles.statLabel}>Feed reports loaded</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{hotspotComplaintCount}</Text>
              <Text style={styles.statLabel}>Reports in density cohorts</Text>
            </View>
          </View>
        ) : null}

        {viewport ? (
          <View style={styles.filterCard}>
            <Text style={styles.filterHeading}>Ongoing status</Text>
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filters.status === null }}
                disabled={isBusy}
                onPress={() => setFilters((current) => ({ ...current, status: null }))}
                style={[styles.filterChip, filters.status === null && styles.selectedChip]}
              >
                <Text style={styles.filterChipText}>All ongoing</Text>
              </Pressable>
              {ongoingPublicComplaintStatuses.map((status) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: filters.status === status }}
                  disabled={isBusy}
                  key={status}
                  onPress={() => setFilters((current) => ({ ...current, status }))}
                  style={[styles.filterChip, filters.status === status && styles.selectedChip]}
                >
                  <Text style={styles.filterChipText}>{statusLabels[status]}</Text>
                </Pressable>
              ))}
            </View>
            {categories.length ? (
              <>
                <Text style={styles.filterHeading}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: filters.categoryCode === null }}
                      disabled={isBusy}
                      onPress={() => setFilters((current) => ({ ...current, categoryCode: null }))}
                      style={[
                        styles.filterChip,
                        filters.categoryCode === null && styles.selectedChip,
                      ]}
                    >
                      <Text style={styles.filterChipText}>All categories</Text>
                    </Pressable>
                    {categories.map((category) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: filters.categoryCode === category.code }}
                        disabled={isBusy}
                        key={category.code}
                        onPress={() =>
                          setFilters((current) => ({ ...current, categoryCode: category.code }))
                        }
                        style={[
                          styles.filterChip,
                          filters.categoryCode === category.code && styles.selectedChip,
                        ]}
                      >
                        <Text style={styles.filterChipText}>{category.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void load(viewport, filters)}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Apply locality filters</Text>
            </Pressable>
          </View>
        ) : null}

        {loadState.status === 'idle' ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Choose your nearby area</Text>
            <Text style={styles.stateText}>
              Location access selects a bounded, rounded search area. Exact device coordinates are
              not sent to the public transparency endpoint.
            </Text>
          </View>
        ) : null}

        {loadState.status === 'error' ? (
          <View style={styles.errorCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {loadState.message}
            </Text>
            {viewport ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void load(viewport, filters)}
                style={styles.errorRetry}
              >
                <Text style={styles.errorRetryText}>Try this area again</Text>
              </Pressable>
            ) : null}
            {loadState.settingsRequired ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openSettings()}
                style={styles.errorRetry}
              >
                <Text style={styles.errorRetryText}>Open location settings</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {activeSegment === 'feed' && loadedFeed ? (
          loadedFeed.items.length ? (
            <View accessibilityRole="list" style={styles.feedList}>
              {loadedFeed.items.map((item) => (
                <FeedCard
                  item={item}
                  key={item.publicId}
                  onOpen={() => router.push(`/transparency/${item.publicId}`)}
                />
              ))}
              {loadedFeed.hasMore && loadedFeed.nextCursor ? (
                <>
                  {paginationError ? (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {paginationError}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isLoadingMore}
                    onPress={() => void loadMore()}
                    style={styles.loadMoreButton}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator color="#166534" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load more ongoing reports</Text>
                    )}
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No reviewed ongoing reports here</Text>
              <Text style={styles.stateText}>
                Try another filter or refresh later. Unreviewed and private reports remain hidden.
              </Text>
            </View>
          )
        ) : null}

        {activeSegment === 'heatmap' && loadedHotspots && viewport ? (
          loadedHotspots.items.length ? (
            <View style={styles.heatmapSection}>
              <View>
                <Text style={styles.sectionTitle}>Complaint density</Text>
                <Text style={styles.stateText}>
                  Aggregated cohorts only. Larger, darker areas contain more reviewed ongoing
                  reports.
                </Text>
              </View>
              <HotspotDensityPlot hotspots={loadedHotspots} viewport={viewport} />
              <View style={styles.legendRow}>
                <Text style={styles.legendText}>Lower density</Text>
                <View style={styles.legendGradient} />
                <Text style={styles.legendText}>Higher density</Text>
              </View>
            </View>
          ) : (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No public density cohort yet</Text>
              <Text style={styles.stateText}>
                A hotspot appears only after enough reviewed reports meet the privacy threshold.
              </Text>
            </View>
          )
        ) : null}

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Public-safe by design</Text>
          <Text style={styles.privacyText}>
            Citizen identities, exact coordinates, original media, private messages, and internal
            government notes never appear in this guest experience.
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
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
    padding: 12,
  },
  applyButtonText: { color: '#166534', fontWeight: '800' },
  approximateLabel: { color: '#64748b', flex: 1, fontSize: 12, lineHeight: 17 },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categoryInitial: { color: '#166534', fontSize: 15, fontWeight: '900' },
  categoryLabel: { color: '#166534', fontSize: 13, fontWeight: '800' },
  centerMarker: {
    backgroundColor: '#166534',
    borderColor: '#fff',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    left: '50%',
    marginLeft: -6,
    marginTop: -6,
    position: 'absolute',
    top: '50%',
    width: 12,
    zIndex: 3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { gap: 16, padding: 20, paddingBottom: 48 },
  densityCircle: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  densityCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 3,
  },
  description: { color: '#475569', fontSize: 16, lineHeight: 24 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 14, gap: 8, padding: 16 },
  errorRetry: { alignItems: 'center', minHeight: 42, padding: 9 },
  errorRetryText: { color: '#991b1b', fontWeight: '800' },
  errorText: { color: '#991b1b', lineHeight: 21, textAlign: 'center' },
  eyebrow: { color: '#237345', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  feedCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    gap: 10,
    padding: 16,
  },
  feedDate: { color: '#64748b', fontSize: 12 },
  feedFooter: {
    alignItems: 'flex-end',
    borderTopColor: '#f1f5f9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  feedHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  feedList: { gap: 12 },
  feedMetaCopy: { flex: 1, gap: 2 },
  feedTitle: { color: '#17251d', fontSize: 18, fontWeight: '800', lineHeight: 25 },
  filterCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 11,
    padding: 15,
  },
  filterChip: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: { color: '#334155', fontWeight: '700' },
  filterHeading: { color: '#334155', fontWeight: '800' },
  gridLine: { backgroundColor: 'rgba(148,163,184,0.3)', position: 'absolute' },
  heatmapPlot: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    height: 310,
    overflow: 'hidden',
    position: 'relative',
  },
  heatmapSection: { gap: 12 },
  hero: { gap: 7, marginTop: 8 },
  horizontalOne: { height: 1, left: 0, right: 0, top: '33%' },
  horizontalTwo: { height: 1, left: 0, right: 0, top: '66%' },
  legendGradient: {
    backgroundColor: 'rgba(220,38,38,0.55)',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  legendText: { color: '#64748b', fontSize: 11 },
  loadMoreButton: { alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  loadMoreText: { color: '#166534', fontWeight: '800' },
  localityName: { color: '#334155', fontSize: 13, fontWeight: '800' },
  openLabel: { color: '#166534', fontSize: 12, fontWeight: '800' },
  pressedCard: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    padding: 14,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  privacyCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: 16,
  },
  privacyText: { color: '#3f6650', lineHeight: 21 },
  privacyTitle: { color: '#14532d', fontSize: 16, fontWeight: '900' },
  sectionTitle: { color: '#1e293b', fontSize: 20, fontWeight: '900' },
  segment: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  segmentSelected: { backgroundColor: '#fff', elevation: 1 },
  segmentText: { color: '#64748b', fontSize: 15, fontWeight: '800' },
  segmentTextSelected: { color: '#14532d' },
  segmentedControl: {
    backgroundColor: '#e7efe9',
    borderRadius: 15,
    flexDirection: 'row',
    padding: 4,
  },
  selectedChip: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  statCard: { backgroundColor: '#eff6ff', borderRadius: 14, flex: 1, gap: 2, padding: 13 },
  statLabel: { color: '#475569', fontSize: 11, lineHeight: 15 },
  statValue: { color: '#1e3a5f', fontSize: 22, fontWeight: '900' },
  stateCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  stateText: { color: '#64748b', lineHeight: 21 },
  stateTitle: { color: '#1e293b', fontSize: 18, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusPillText: { fontSize: 11, fontWeight: '900' },
  title: { color: '#143b27', fontSize: 34, fontWeight: '900' },
  verticalOne: { bottom: 0, left: '33%', top: 0, width: 1 },
  verticalTwo: { bottom: 0, left: '66%', top: 0, width: 1 },
});
