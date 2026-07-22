import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
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
  GoverningBodyResolution,
  VerifiedGovernanceEntitySummary,
  VerifiedGoverningBodyMatch,
} from '@local-wellness/types';

import { useAuth } from '../../src/auth/auth-context';
import {
  captureCurrentLocation,
  requiresLocationPermissionSettings,
} from '../../src/complaints/location-service';
import {
  getUserFacingGovernanceError,
  resolveGoverningBodies,
} from '../../src/governance/governance-service';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { CivicIcon } from '../../src/ui/civic-icon';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

type LookupState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ locationSettingsRequired: boolean; message: string; status: 'error' }>
  | Readonly<{ result: GoverningBodyResolution; status: 'ready' }>;

const entityLabels = {
  authority: 'Responsible authority',
  district: 'District',
  local_body: 'Local body',
  state: 'State',
  taluka: 'Taluka',
  ward: 'Ward',
} as const;

const MatchCard = ({ match }: Readonly<{ match: VerifiedGoverningBodyMatch }>) => {
  const entities = [
    match.localBody,
    match.ward,
    match.authority,
    match.district,
    match.taluka,
    match.state,
  ].filter((entity): entity is VerifiedGovernanceEntitySummary => entity !== null);

  return (
    <View style={styles.matchCard}>
      <View style={styles.officeHeading}>
        <View style={styles.officeIcon}>
          <CivicIcon color="#16834a" name="office" />
        </View>
        <View style={styles.entityCopy}>
          <Text style={styles.entityName}>{match.localBody.name}</Text>
          <Text style={styles.officeAddress}>
            {match.ward?.name ?? match.district?.name ?? 'Local authority'}
          </Text>
        </View>
      </View>
      <View style={styles.officeMetaRow}>
        <Text style={styles.officeMeta}>Serves this location</Text>
        <Text style={styles.officeMeta}>Verified governing body</Text>
      </View>
      <View style={styles.tags}>
        {entities.slice(0, 3).map((entity) => (
          <Text key={entity.kind} style={styles.tag}>
            {entityLabels[entity.kind]}
          </Text>
        ))}
      </View>
      <Pressable
        accessibilityHint="Opens the official verification source"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(match.localBody.sourceUrl)}
        style={styles.directoryButton}
      >
        <Text style={styles.directoryButtonText}>View official source</Text>
      </Pressable>
    </View>
  );
};

const ResolutionContent = ({ result }: Readonly<{ result: GoverningBodyResolution }>) => {
  if (result.status === 'resolved') {
    return (
      <View style={styles.resultSection}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Your governing bodies
        </Text>
        {result.matches.map((match, index) => (
          <MatchCard key={`${match.localBody.name}-${index}`} match={match} />
        ))}
      </View>
    );
  }

  if (result.status === 'ambiguous') {
    return (
      <View style={styles.resultSection}>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Boundary review needed</Text>
          <Text style={styles.noticeText}>
            More than one verified boundary matched this location. The app will not guess which one
            is responsible.
          </Text>
        </View>
        {result.matches.map((match, index) => (
          <MatchCard key={`${match.localBody.name}-${index}`} match={match} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <CivicIcon color="#28724a" name={result.status === 'low_accuracy' ? 'locate' : 'office'} />
      </View>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {result.status === 'low_accuracy'
          ? 'A more precise location is needed'
          : 'Verified coverage is not available here yet'}
      </Text>
      <Text style={styles.emptyText}>
        {result.status === 'low_accuracy'
          ? `Move into an open area and try again. Accuracy must be within ${result.maximumAccuracyMeters} metres.`
          : 'JagrukSetu only names a governing body when its official identity and boundary have been verified. No placeholder has been shown.'}
      </Text>
    </View>
  );
};

export default function GovernanceDirectoryScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [state, setState] = useState<LookupState>({ status: 'idle' });

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'mfa-required') return <Redirect href="/auth/phone-verification" />;
  const accessToken = auth.state.session.access_token;

  const locate = async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const location = await captureCurrentLocation();
      const result = await resolveGoverningBodies(accessToken, location);
      setState({ result, status: 'ready' });
    } catch (error) {
      setState({
        locationSettingsRequired: requiresLocationPermissionSettings(error),
        message: getUserFacingGovernanceError(error),
        status: 'error',
      });
    }
  };

  return (
    <Screen>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.pageHeader}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <CivicIcon color="#15271c" name="arrow-left" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Nearby governing bodies
              </Text>
              <Text style={styles.description}>Find public offices serving your area</Text>
            </View>
          </View>
          <View style={styles.locationBar}>
            <CivicIcon color="#e77817" name="location" />
            <Text style={styles.locationText}>
              {state.status === 'ready' ? 'Current verified area' : 'Use your current location'}
            </Text>
            <Pressable
              accessibilityLabel={
                state.status === 'ready' ? 'Refresh current location' : 'Use current location'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: state.status === 'loading' }}
              disabled={state.status === 'loading'}
              onPress={() => void locate()}
              style={({ pressed }) => [styles.locateButton, pressed && styles.pressed]}
            >
              {state.status === 'loading' ? (
                <ActivityIndicator accessibilityLabel="Finding governing bodies" color="#ffffff" />
              ) : (
                <CivicIcon color="#ffffff" name="locate" />
              )}
            </Pressable>
          </View>

          <View
            accessible
            accessibilityLabel="Schematic area overview. Use current location to resolve governing bodies."
            style={styles.mapCard}
          >
            <View style={styles.mapRoadHorizontal} />
            <View style={styles.mapRoadVertical} />
            <View style={styles.mapWater} />
            {state.status === 'ready' && state.result.matches.length > 0 ? (
              <View style={styles.mapMarker}>
                <CivicIcon color="#ffffff" name="location" />
              </View>
            ) : null}
            <View style={styles.mapSummary}>
              <View style={styles.mapSummaryIcon}>
                <CivicIcon color="#ffffff" name="office" />
              </View>
              <View style={styles.mapSummaryCopy}>
                <Text style={styles.mapSummaryTitle}>
                  {state.status === 'ready' && state.result.matches.length > 0
                    ? `${state.result.matches.length} governing bodies found`
                    : 'Find offices near you'}
                </Text>
                <Text style={styles.mapSummaryText}>Based on your verified civic area</Text>
              </View>
            </View>
          </View>

          {state.status === 'idle' ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Find the right office</Text>
              <Text style={styles.noticeText}>
                Use your location to identify your municipality, ward and responsible authority.
              </Text>
            </View>
          ) : null}
          {state.status === 'error' ? (
            <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {state.message}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void locate()}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
              {state.locationSettingsRequired ? (
                <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                  <Text style={styles.retryText}>Open location settings</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {state.status === 'ready' ? <ResolutionContent result={state.result} /> : null}
        </ScrollView>
        <AppBottomNavigation current="governance" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: '#f4f7f5',
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: { gap: 18, padding: 18, paddingBottom: 32 },
  description: { color: '#718078', fontSize: 13, lineHeight: 19 },
  directoryButton: {
    alignItems: 'center',
    backgroundColor: '#16834a',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    padding: 12,
  },
  directoryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 22,
    borderWidth: 1,
    gap: 9,
    padding: 24,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#e8f7ed',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyText: { color: '#5c6f63', lineHeight: 22, textAlign: 'center' },
  emptyTitle: { color: '#143b27', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  entityCopy: { flex: 1, gap: 2 },
  entityName: { color: '#173c29', fontSize: 17, fontWeight: '800' },
  errorCard: { backgroundColor: '#fff1f2', borderRadius: 16, gap: 12, padding: 16 },
  errorText: { color: '#9f1239', lineHeight: 21 },
  headerCopy: { flex: 1, gap: 2 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 4 },
  locationBar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#dce5df',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  locationText: { color: '#334155', flex: 1, fontSize: 14, fontWeight: '700' },
  locateButton: {
    alignItems: 'center',
    backgroundColor: '#16834a',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  mapCard: {
    backgroundColor: '#e9f2ed',
    borderRadius: 18,
    height: 230,
    overflow: 'hidden',
    position: 'relative',
  },
  mapRoadHorizontal: {
    backgroundColor: '#fff',
    height: 22,
    left: -20,
    position: 'absolute',
    top: 70,
    transform: [{ rotate: '-8deg' }],
    width: 430,
  },
  mapRoadVertical: {
    backgroundColor: '#fff',
    height: 300,
    left: 190,
    position: 'absolute',
    top: -20,
    transform: [{ rotate: '20deg' }],
    width: 18,
  },
  mapWater: {
    backgroundColor: '#b9dcf2',
    borderRadius: 80,
    height: 190,
    position: 'absolute',
    right: -55,
    top: -25,
    transform: [{ rotate: '12deg' }],
    width: 90,
  },
  mapMarker: {
    alignItems: 'center',
    backgroundColor: '#e84b3c',
    borderColor: '#fff',
    borderRadius: 20,
    borderWidth: 4,
    height: 36,
    justifyContent: 'center',
    left: '48%',
    position: 'absolute',
    top: 78,
    width: 36,
  },
  mapSummary: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    bottom: 12,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
    left: 12,
    padding: 12,
    position: 'absolute',
    right: 12,
  },
  mapSummaryIcon: {
    alignItems: 'center',
    backgroundColor: '#16834a',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  mapSummaryCopy: { flex: 1 },
  mapSummaryText: { color: '#718078', fontSize: 11 },
  mapSummaryTitle: { color: '#1e293b', fontSize: 14, fontWeight: '800' },
  matchCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: 13,
    padding: 16,
    shadowColor: '#173c28',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
  },
  noticeCard: { backgroundColor: '#fff7ed', borderRadius: 16, gap: 6, padding: 16 },
  noticeText: { color: '#7c2d12', lineHeight: 21 },
  noticeTitle: { color: '#9a3412', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  officeAddress: { color: '#718078', fontSize: 13, marginTop: 2 },
  officeHeading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  officeIcon: {
    alignItems: 'center',
    backgroundColor: '#e7f8ee',
    borderRadius: 13,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  officeMeta: { color: '#16834a', fontSize: 11, fontWeight: '700' },
  officeMetaRow: { flexDirection: 'row', gap: 14 },
  resultSection: { gap: 12 },
  retryText: { color: '#9f1239', fontWeight: '900' },
  sectionTitle: { color: '#173c29', fontSize: 24, fontWeight: '900' },
  shell: { flex: 1 },
  tag: {
    backgroundColor: '#e8fbef',
    borderRadius: 999,
    color: '#16834a',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  title: { color: '#17231c', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
});
