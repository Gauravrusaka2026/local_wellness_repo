import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useRef, useState } from 'react';
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
  PublicComplaintEngagementState,
  PublicComplaintHotspotResult,
  PublicComplaintMapItem,
  PublicComplaintMapResult,
  PublicComplaintSort,
  PublicComplaintStatus,
  PublicTransparencyViewport,
} from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import { buildHotspotVisuals } from '../../src/transparency/hotspot-visualization';
import {
  createNearbyViewport,
  createRegionalTrendingViewport,
  NearbyLocationError,
  requiresNearbyLocationSettings,
} from '../../src/transparency/nearby-viewport';
import {
  getUserFacingTransparencyError,
  listPublicComplaintEngagements,
  listPublicComplaintHotspots,
  listPublicComplaints,
  mergePublicComplaintPages,
  updatePublicComplaintEngagement,
} from '../../src/transparency/transparency-service';
import {
  createMobileHotspotQuery,
  createMobileTransparencyQuery,
  defaultMobileTransparencyFilters,
  ongoingPublicComplaintStatuses,
  type MobileTransparencyFilters,
} from '../../src/transparency/transparency-query';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { Screen } from '../../src/ui/screen';

type CommunitySegment = 'heatmap' | 'nearby' | 'trending';

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

const segmentOptions: readonly Readonly<{
  glyph: string;
  key: CommunitySegment;
  label: string;
}>[] = [
  { glyph: '⌖', key: 'nearby', label: 'Nearby' },
  { glyph: '↗', key: 'trending', label: 'Trending' },
  { glyph: '◉', key: 'heatmap', label: 'Heatmap' },
];

const feedSortFor = (segment: CommunitySegment): PublicComplaintSort =>
  segment === 'trending' ? 'trending' : 'recent';

const feedViewportFor = (
  nearbyViewport: PublicTransparencyViewport,
  sort: PublicComplaintSort,
): PublicTransparencyViewport =>
  sort === 'trending' ? createRegionalTrendingViewport(nearbyViewport) : nearbyViewport;

const captureNearbyViewport = async (): Promise<PublicTransparencyViewport> => {
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new NearbyLocationError('Turn on location services to see your community.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new NearbyLocationError(
      permission.canAskAgain
        ? 'Location access is needed to find reports near you.'
        : 'Enable location access for Local Wellness in device settings.',
      { requiresAppSettings: !permission.canAskAgain },
    );
  }

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return createNearbyViewport(location.coords.latitude, location.coords.longitude);
};

const CommunityCard = ({
  busy,
  engagement,
  item,
  onOpen,
  onStar,
  onSupport,
}: Readonly<{
  busy: boolean;
  engagement: PublicComplaintEngagementState;
  item: PublicComplaintMapItem;
  onOpen: () => void;
  onStar: () => void;
  onSupport: () => void;
}>) => {
  const colors = statusColors[item.status];
  return (
    <View style={styles.feedCard}>
      <Pressable
        accessibilityLabel={`${item.title}, ${statusLabels[item.status]}, ${item.localBody.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}
      >
        <View style={styles.feedHeader}>
          <View style={styles.categoryIcon}>
            <Text accessibilityElementsHidden style={styles.categoryInitial}>
              {item.category.name.charAt(0).toLocaleUpperCase()}
            </Text>
          </View>
          <View style={styles.feedMetaCopy}>
            <Text numberOfLines={1} style={styles.localityName}>
              {item.ward?.name ?? item.localBody.name}
            </Text>
            <Text style={styles.feedDate}>
              {item.category.name} · {new Date(item.submittedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: colors.background }]}>
            <Text style={[styles.statusPillText, { color: colors.text }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.feedTitle}>
          {item.title}
        </Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={`${engagement.supported ? 'Remove support from' : 'Support'} ${item.title}`}
          accessibilityRole="button"
          accessibilityState={{ busy, selected: engagement.supported }}
          disabled={busy}
          onPress={onSupport}
          style={({ pressed }) => [
            styles.actionButton,
            engagement.supported && styles.actionButtonSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.actionGlyph, engagement.supported && styles.actionTextSelected]}>
            ↑
          </Text>
          <Text style={[styles.actionText, engagement.supported && styles.actionTextSelected]}>
            {engagement.supportCount.toLocaleString()}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${engagement.starred ? 'Unstar' : 'Star'} ${item.title}`}
          accessibilityRole="button"
          accessibilityState={{ busy, selected: engagement.starred }}
          disabled={busy}
          onPress={onStar}
          style={({ pressed }) => [
            styles.actionButton,
            engagement.starred && styles.starButtonSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.actionGlyph, engagement.starred && styles.starTextSelected]}>
            {engagement.starred ? '★' : '☆'}
          </Text>
          <Text style={[styles.actionText, engagement.starred && styles.starTextSelected]}>
            Star
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Open ${item.title}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
        >
          <Text style={styles.openButtonText}>View</Text>
          <Text accessibilityElementsHidden style={styles.chevron}>
            ›
          </Text>
        </Pressable>
      </View>
    </View>
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
      accessibilityLabel={`${visuals.length} privacy-protected complaint density areas`}
      accessibilityRole="image"
      style={styles.heatmapPlot}
    >
      <View style={[styles.mapRoad, styles.mapRoadHorizontal]} />
      <View style={[styles.mapRoad, styles.mapRoadVertical]} />
      <View style={[styles.mapRoad, styles.mapRoadDiagonal]} />
      <View style={styles.centerMarker}>
        <View style={styles.centerDot} />
      </View>
      {visuals.map((visual) => (
        <View
          accessibilityLabel={`${visual.complaintCount} reports in this generalized area`}
          accessible
          key={visual.id}
          style={[
            styles.densityCircle,
            {
              backgroundColor: `rgba(239, 68, 68, ${visual.intensity})`,
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
      <View style={styles.mapBadge}>
        <Text style={styles.mapBadgeText}>Approximate areas</Text>
      </View>
    </View>
  );
};

export default function TransparencyScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<CommunitySegment>('nearby');
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [viewport, setViewport] = useState<PublicTransparencyViewport | null>(null);
  const [filters, setFilters] = useState<MobileTransparencyFilters>(
    defaultMobileTransparencyFilters,
  );
  const [appliedFilters, setAppliedFilters] = useState<MobileTransparencyFilters>(
    defaultMobileTransparencyFilters,
  );
  const [appliedSort, setAppliedSort] = useState<PublicComplaintSort>('recent');
  const [engagements, setEngagements] = useState<
    Readonly<Record<string, PublicComplaintEngagementState>>
  >({});
  const [busyEngagementId, setBusyEngagementId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSegmentRef = useRef<CommunitySegment>('nearby');
  const requestGenerationRef = useRef(0);
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;
  const isBusy = loadState.status === 'loading' || isLoadingMore;

  const categories = useMemo(() => {
    const items = loadState.status === 'ready' ? loadState.feed.items : [];
    return [...new Map(items.map((item) => [item.category.code, item.category])).values()].sort(
      (left, right) => left.name.localeCompare(right.name),
    );
  }, [loadState]);

  const hydrateEngagements = async (
    items: readonly PublicComplaintMapItem[],
    requestGeneration?: number,
  ): Promise<void> => {
    if (accessToken === null || items.length === 0) return;
    try {
      const states = await listPublicComplaintEngagements(accessToken, {
        publicIds: items.slice(0, 100).map(({ publicId }) => publicId),
      });
      if (requestGeneration !== undefined && requestGeneration !== requestGenerationRef.current) {
        return;
      }
      setEngagements((current) => ({
        ...current,
        ...Object.fromEntries(states.map((state) => [state.publicId, state])),
      }));
    } catch (error) {
      if (requestGeneration !== undefined && requestGeneration !== requestGenerationRef.current) {
        return;
      }
      setOperationError(getUserFacingTransparencyError(error));
    }
  };

  const load = async (
    requestedViewport: PublicTransparencyViewport,
    requestedFilters: MobileTransparencyFilters,
    segment: CommunitySegment,
  ): Promise<void> => {
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const sort = feedSortFor(segment);
    const feedViewport = feedViewportFor(requestedViewport, sort);
    setLoadState({ status: 'loading' });
    setOperationError(null);
    setViewport(requestedViewport);
    try {
      const [feed, hotspots] = await Promise.all([
        listPublicComplaints(
          createMobileTransparencyQuery(feedViewport, requestedFilters, undefined, sort),
        ),
        listPublicComplaintHotspots(createMobileHotspotQuery(requestedViewport, requestedFilters)),
      ]);
      if (requestGeneration !== requestGenerationRef.current) return;
      setAppliedFilters(requestedFilters);
      setAppliedSort(sort);
      setLoadState({ feed, hotspots, status: 'ready' });
      await hydrateEngagements(feed.items, requestGeneration);
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return;
      setLoadState({
        message: getUserFacingTransparencyError(error),
        settingsRequired: false,
        status: 'error',
      });
    }
  };

  const handleCurrentArea = async (): Promise<void> => {
    const locationRequestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = locationRequestGeneration;
    setLoadState({ status: 'loading' });
    try {
      const requestedViewport = await captureNearbyViewport();
      if (locationRequestGeneration !== requestGenerationRef.current) return;
      await load(requestedViewport, filters, activeSegmentRef.current);
    } catch (error) {
      if (locationRequestGeneration !== requestGenerationRef.current) return;
      setLoadState({
        message: error instanceof Error ? error.message : 'Your nearby area is unavailable.',
        settingsRequired: requiresNearbyLocationSettings(error),
        status: 'error',
      });
    }
  };

  const selectSegment = (segment: CommunitySegment): void => {
    activeSegmentRef.current = segment;
    setActiveSegment(segment);
    if (viewport !== null && (feedSortFor(segment) !== appliedSort || isBusy)) {
      void load(viewport, filters, segment);
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
    setOperationError(null);
    const requestGeneration = requestGenerationRef.current;
    try {
      const next = await listPublicComplaints(
        createMobileTransparencyQuery(
          feedViewportFor(viewport, appliedSort),
          appliedFilters,
          loadState.feed.nextCursor,
          appliedSort,
        ),
      );
      if (requestGeneration !== requestGenerationRef.current) return;
      const merged = mergePublicComplaintPages(loadState.feed, next);
      setLoadState({ ...loadState, feed: merged });
      await hydrateEngagements(next.items, requestGeneration);
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return;
      setOperationError(getUserFacingTransparencyError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const setComplaintEngagement = async (
    item: PublicComplaintMapItem,
    change: 'star' | 'support',
  ): Promise<void> => {
    if (accessToken === null) {
      router.push('/auth' as Href);
      return;
    }

    const current = engagements[item.publicId] ?? {
      publicId: item.publicId,
      starred: false,
      supportCount: item.supportCount,
      supported: false,
    };
    setBusyEngagementId(item.publicId);
    setOperationError(null);
    try {
      const updated = await updatePublicComplaintEngagement(accessToken, item.publicId, {
        starred: change === 'star' ? !current.starred : current.starred,
        supported: change === 'support' ? !current.supported : current.supported,
      });
      setEngagements((states) => ({ ...states, [item.publicId]: updated }));
      setLoadState((state) =>
        state.status === 'ready'
          ? {
              ...state,
              feed: {
                ...state.feed,
                items: state.feed.items.map((candidate) =>
                  candidate.publicId === item.publicId
                    ? { ...candidate, supportCount: updated.supportCount }
                    : candidate,
                ),
              },
            }
          : state,
      );
    } catch (error) {
      setOperationError(getUserFacingTransparencyError(error));
    } finally {
      setBusyEngagementId(null);
    }
  };

  const loadedFeed = loadState.status === 'ready' ? loadState.feed : null;
  const loadedHotspots = loadState.status === 'ready' ? loadState.hotspots : null;
  const isAnonymous = auth.state.status === 'signed-out';

  const returnFromCommunity = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/auth' as Href);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {isAnonymous ? (
          <View style={styles.guestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={returnFromCommunity}
              style={({ pressed }) => [styles.guestBackButton, pressed && styles.pressed]}
            >
              <Text accessibilityElementsHidden style={styles.guestBackGlyph}>
                ‹
              </Text>
              <Text style={styles.guestBackText}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/auth' as Href)}
              style={({ pressed }) => [styles.guestSignInButton, pressed && styles.pressed]}
            >
              <Text style={styles.guestSignInText}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.hero}>
          <View>
            <Text style={styles.eyebrow}>COMMUNITY</Text>
            <Text accessibilityRole="header" style={styles.title}>
              What’s happening nearby
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh current area"
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void handleCurrentArea()}
            style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
          >
            {loadState.status === 'loading' ? (
              <ActivityIndicator color="#17683b" size="small" />
            ) : (
              <Text accessibilityElementsHidden style={styles.locationGlyph}>
                ⌖
              </Text>
            )}
          </Pressable>
        </View>

        <View accessibilityRole="tablist" style={styles.segmentedControl}>
          {segmentOptions.map((segment) => {
            const selected = activeSegment === segment.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={segment.key}
                onPress={() => selectSegment(segment.key)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentGlyph, selected && styles.segmentTextSelected]}>
                  {segment.glyph}
                </Text>
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {segment.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {viewport === null && loadState.status !== 'loading' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleCurrentArea()}
            style={({ pressed }) => [styles.areaCard, pressed && styles.pressed]}
          >
            <View style={styles.areaIcon}>
              <Text accessibilityElementsHidden style={styles.areaIconText}>
                ◎
              </Text>
            </View>
            <View style={styles.areaCopy}>
              <Text style={styles.areaTitle}>Use my current area</Text>
              <Text style={styles.areaHint}>Find reviewed civic reports around you</Text>
            </View>
            <Text accessibilityElementsHidden style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        ) : null}

        {viewport ? (
          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <FilterChip
                  label="All ongoing"
                  onPress={() => setFilters((current) => ({ ...current, status: null }))}
                  selected={filters.status === null}
                />
                {ongoingPublicComplaintStatuses.map((status) => (
                  <FilterChip
                    key={status}
                    label={statusLabels[status]}
                    onPress={() => setFilters((current) => ({ ...current, status }))}
                    selected={filters.status === status}
                  />
                ))}
                {categories.map((category) => (
                  <FilterChip
                    key={category.code}
                    label={category.name}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        categoryCode: current.categoryCode === category.code ? null : category.code,
                      }))
                    }
                    selected={filters.categoryCode === category.code}
                  />
                ))}
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void load(viewport, filters, activeSegment)}
                  style={styles.applyChip}
                >
                  <Text style={styles.applyChipText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        ) : null}

        {loadState.status === 'loading' ? (
          <View accessibilityLiveRegion="polite" style={styles.loadingCard}>
            <ActivityIndicator accessibilityLabel="Loading community reports" color="#17683b" />
            <Text style={styles.loadingText}>Loading community reports…</Text>
          </View>
        ) : null}

        {loadState.status === 'error' ? (
          <View style={styles.errorCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {loadState.message}
            </Text>
            <View style={styles.errorActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleCurrentArea()}
                style={styles.errorButton}
              >
                <Text style={styles.errorButtonText}>Try again</Text>
              </Pressable>
              {loadState.settingsRequired ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openSettings()}
                  style={styles.errorButton}
                >
                  <Text style={styles.errorButtonText}>Settings</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {operationError ? (
          <Text accessibilityRole="alert" style={styles.operationError}>
            {operationError}
          </Text>
        ) : null}

        {activeSegment !== 'heatmap' && loadedFeed ? (
          loadedFeed.items.length ? (
            <View accessibilityRole="list" style={styles.feedList}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeSegment === 'trending' ? 'Trending across your region' : 'Latest nearby'}
                </Text>
                <Text style={styles.resultCount}>{loadedFeed.items.length} loaded</Text>
              </View>
              {loadedFeed.items.map((item) => {
                const engagement = engagements[item.publicId] ?? {
                  publicId: item.publicId,
                  starred: false,
                  supportCount: item.supportCount,
                  supported: false,
                };
                return (
                  <CommunityCard
                    busy={busyEngagementId === item.publicId}
                    engagement={engagement}
                    item={item}
                    key={item.publicId}
                    onOpen={() => router.push(`/transparency/${item.publicId}`)}
                    onStar={() => void setComplaintEngagement(item, 'star')}
                    onSupport={() => void setComplaintEngagement(item, 'support')}
                  />
                );
              })}
              {loadedFeed.hasMore && loadedFeed.nextCursor ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoadingMore}
                  onPress={() => void loadMore()}
                  style={styles.loadMoreButton}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator color="#17683b" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : (
            <EmptyState title="Nothing reported here yet" />
          )
        ) : null}

        {activeSegment === 'heatmap' && loadedHotspots && viewport ? (
          loadedHotspots.items.length ? (
            <View style={styles.heatmapSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Issue density</Text>
                <Text style={styles.resultCount}>Privacy protected</Text>
              </View>
              <HotspotDensityPlot hotspots={loadedHotspots} viewport={viewport} />
              <View style={styles.legendRow}>
                <Text style={styles.legendText}>Fewer</Text>
                <View style={styles.legendGradient} />
                <Text style={styles.legendText}>More reports</Text>
              </View>
            </View>
          ) : (
            <EmptyState title="No public hotspots yet" />
          )
        ) : null}

        {loadedFeed ? (
          <Text style={styles.privacyNote}>
            Exact locations and citizen identities stay private.
          </Text>
        ) : null}
      </ScrollView>
      {auth.state.status === 'signed-in' ? <AppBottomNavigation current="nearby" /> : null}
    </Screen>
  );
}

const FilterChip = ({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; onPress: () => void; selected: boolean }>) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.filterChip, selected && styles.filterChipSelected]}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
  </Pressable>
);

const EmptyState = ({ title }: Readonly<{ title: string }>) => (
  <View style={styles.emptyCard}>
    <Text accessibilityElementsHidden style={styles.emptyGlyph}>
      ◌
    </Text>
    <Text style={styles.emptyTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderColor: '#dce5df',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  actionButtonSelected: { backgroundColor: '#e8f7ed', borderColor: '#74b88d' },
  actionGlyph: { color: '#52665a', fontSize: 17, fontWeight: '900' },
  actionRow: {
    alignItems: 'center',
    borderTopColor: '#edf1ee',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  actionText: { color: '#52665a', fontSize: 13, fontWeight: '800' },
  actionTextSelected: { color: '#17683b' },
  applyChip: {
    backgroundColor: '#17683b',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
  },
  applyChipText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  areaCard: {
    alignItems: 'center',
    backgroundColor: '#173f2a',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 13,
    padding: 17,
  },
  areaCopy: { flex: 1, gap: 3 },
  areaHint: { color: '#cfe1d5', fontSize: 13 },
  areaIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  areaIconText: { color: '#fff', fontSize: 21 },
  areaTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  cardContent: { gap: 12, padding: 15 },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#e7f5eb',
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  categoryInitial: { color: '#17683b', fontSize: 14, fontWeight: '900' },
  centerDot: { backgroundColor: '#17683b', borderRadius: 6, height: 10, width: 10 },
  centerMarker: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 4,
    height: 28,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -14,
    marginTop: -14,
    position: 'absolute',
    top: '50%',
    width: 28,
    zIndex: 4,
  },
  chevron: { color: '#6c7f72', fontSize: 24, lineHeight: 24 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  content: { gap: 15, padding: 18, paddingBottom: 34 },
  densityCircle: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  densityCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 2,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8e3',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 34,
  },
  emptyGlyph: { color: '#88a493', fontSize: 34 },
  emptyTitle: { color: '#3d5345', fontSize: 16, fontWeight: '800' },
  errorActions: { flexDirection: 'row', justifyContent: 'center' },
  errorButton: { minHeight: 42, padding: 11 },
  errorButtonText: { color: '#991b1b', fontWeight: '800' },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 16, gap: 5, padding: 15 },
  errorText: { color: '#991b1b', lineHeight: 20, textAlign: 'center' },
  eyebrow: { color: '#2b774c', fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  feedCard: {
    backgroundColor: '#fff',
    borderColor: '#dfe7e1',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  feedDate: { color: '#718078', fontSize: 12 },
  feedHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  feedList: { gap: 12 },
  feedMetaCopy: { flex: 1, gap: 2 },
  feedTitle: { color: '#183526', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  filterChip: {
    backgroundColor: '#fff',
    borderColor: '#d7e1da',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
  },
  filterChipSelected: { backgroundColor: '#e7f5eb', borderColor: '#75ad87' },
  filterChipText: { color: '#617268', fontSize: 13, fontWeight: '700' },
  filterChipTextSelected: { color: '#17683b' },
  filters: { marginHorizontal: -18, paddingLeft: 18 },
  guestActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  guestBackButton: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 38 },
  guestBackGlyph: { color: '#52665a', fontSize: 27, lineHeight: 27 },
  guestBackText: { color: '#52665a', fontSize: 14, fontWeight: '800' },
  guestSignInButton: {
    backgroundColor: '#17683b',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 17,
  },
  guestSignInText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  heatmapPlot: {
    backgroundColor: '#edf4ef',
    borderColor: '#d3e0d7',
    borderRadius: 24,
    borderWidth: 1,
    height: 390,
    overflow: 'hidden',
    position: 'relative',
  },
  heatmapSection: { gap: 12 },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  legendGradient: {
    backgroundColor: 'rgba(239,68,68,0.52)',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  legendText: { color: '#718078', fontSize: 11, fontWeight: '700' },
  loadingCard: { alignItems: 'center', gap: 11, padding: 40 },
  loadingText: { color: '#5e7164', fontWeight: '700' },
  localityName: { color: '#31483a', fontSize: 13, fontWeight: '800' },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#e6f3ea',
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  locationGlyph: { color: '#17683b', fontSize: 21, fontWeight: '900' },
  loadMoreButton: { alignItems: 'center', minHeight: 48, padding: 12 },
  loadMoreText: { color: '#17683b', fontWeight: '900' },
  mapBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    bottom: 13,
    left: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: 'absolute',
  },
  mapBadgeText: { color: '#4c6354', fontSize: 11, fontWeight: '800' },
  mapRoad: { backgroundColor: 'rgba(255,255,255,0.9)', position: 'absolute' },
  mapRoadDiagonal: {
    height: 9,
    left: '-8%',
    top: '62%',
    transform: [{ rotate: '-18deg' }],
    width: '120%',
  },
  mapRoadHorizontal: { height: 12, left: 0, right: 0, top: '33%' },
  mapRoadVertical: { bottom: 0, left: '65%', top: 0, width: 10 },
  openButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginLeft: 'auto',
    minHeight: 38,
    paddingHorizontal: 5,
  },
  openButtonText: { color: '#52665a', fontSize: 13, fontWeight: '800' },
  operationError: { color: '#991b1b', fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.68 },
  privacyNote: { color: '#819087', fontSize: 11, textAlign: 'center' },
  resultCount: { color: '#7a8980', fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: '#1a3827', fontSize: 18, fontWeight: '900' },
  segment: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 43,
  },
  segmentGlyph: { color: '#718078', fontSize: 15, fontWeight: '900' },
  segmentSelected: { backgroundColor: '#fff', elevation: 1 },
  segmentText: { color: '#718078', fontSize: 13, fontWeight: '800' },
  segmentTextSelected: { color: '#17683b' },
  segmentedControl: {
    backgroundColor: '#e8efea',
    borderRadius: 17,
    flexDirection: 'row',
    padding: 4,
  },
  starButtonSelected: { backgroundColor: '#fff8df', borderColor: '#e9c85d' },
  starTextSelected: { color: '#9a6800' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  title: { color: '#173b27', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
});
