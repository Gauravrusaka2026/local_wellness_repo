import { Redirect } from 'expo-router';
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
      <View style={styles.verifiedRow}>
        <View style={styles.verifiedDot} />
        <Text style={styles.verifiedText}>Official-source verified</Text>
      </View>
      {entities.map((entity) => (
        <View key={entity.kind} style={styles.entityRow}>
          <View style={styles.entityCopy}>
            <Text style={styles.entityLabel}>{entityLabels[entity.kind]}</Text>
            <Text style={styles.entityName}>{entity.name}</Text>
            <Text style={styles.entityType}>{entity.type.replaceAll('_', ' ')}</Text>
          </View>
          <Pressable
            accessibilityHint="Opens the official verification source"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(entity.sourceUrl)}
            style={styles.sourceButton}
          >
            <Text style={styles.sourceButtonText}>Source</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.verifiedDate}>
        Last verified {new Date(match.localBody.lastVerifiedOn).toLocaleDateString()}
      </Text>
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
        <Text style={styles.sectionDescription}>
          This match uses current verified jurisdiction boundaries for your captured location.
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
      <Text style={styles.emptyGlyph}>{result.status === 'low_accuracy' ? '⌖' : '◇'}</Text>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {result.status === 'low_accuracy'
          ? 'A more precise location is needed'
          : 'Verified coverage is not available here yet'}
      </Text>
      <Text style={styles.emptyText}>
        {result.status === 'low_accuracy'
          ? `Move into an open area and try again. Accuracy must be within ${result.maximumAccuracyMeters} metres.`
          : 'Local Wellness only names a governing body when its official identity and boundary have been verified. No placeholder has been shown.'}
      </Text>
    </View>
  );
};

export default function GovernanceDirectoryScreen() {
  const auth = useAuth();
  const [state, setState] = useState<LookupState>({ status: 'idle' });

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
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
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>LOCATION-AWARE DIRECTORY</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Who looks after your area?
            </Text>
            <Text style={styles.description}>
              Find the verified ward, local body, and authority for where you are standing—without
              publishing your coordinates.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: state.status === 'loading' }}
              disabled={state.status === 'loading'}
              onPress={() => void locate()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              {state.status === 'loading' ? (
                <ActivityIndicator accessibilityLabel="Finding governing bodies" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {state.status === 'ready' ? 'Refresh my location' : 'Use my current location'}
                </Text>
              )}
            </Pressable>
          </View>

          {state.status === 'idle' ? (
            <View style={styles.privacyCard}>
              <Text style={styles.privacyTitle}>Private by design</Text>
              <Text style={styles.privacyText}>
                Your precise position is sent securely for a one-time boundary lookup. Only verified
                public governance information is returned.
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
        <AppBottomNavigation current="nearby" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, padding: 18, paddingBottom: 32 },
  description: { color: '#d7f4e3', fontSize: 16, lineHeight: 24 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 22,
    borderWidth: 1,
    gap: 9,
    padding: 24,
  },
  emptyGlyph: { color: '#28724a', fontSize: 34 },
  emptyText: { color: '#5c6f63', lineHeight: 22, textAlign: 'center' },
  emptyTitle: { color: '#143b27', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  entityCopy: { flex: 1, gap: 2 },
  entityLabel: { color: '#66786c', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  entityName: { color: '#173c29', fontSize: 17, fontWeight: '800' },
  entityRow: {
    alignItems: 'center',
    borderTopColor: '#e7eee9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 13,
  },
  entityType: { color: '#718078', fontSize: 13, textTransform: 'capitalize' },
  errorCard: { backgroundColor: '#fff1f2', borderRadius: 16, gap: 12, padding: 16 },
  errorText: { color: '#9f1239', lineHeight: 21 },
  hero: { backgroundColor: '#155d38', borderRadius: 26, gap: 14, padding: 22 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: { color: '#d7f4e3', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  matchCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  noticeCard: { backgroundColor: '#fff7ed', borderRadius: 16, gap: 6, padding: 16 },
  noticeText: { color: '#7c2d12', lineHeight: 21 },
  noticeTitle: { color: '#9a3412', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#155d38', fontSize: 16, fontWeight: '900' },
  privacyCard: { backgroundColor: '#eaf7ef', borderRadius: 18, gap: 6, padding: 18 },
  privacyText: { color: '#41624e', lineHeight: 22 },
  privacyTitle: { color: '#155d38', fontSize: 17, fontWeight: '800' },
  resultSection: { gap: 12 },
  retryText: { color: '#9f1239', fontWeight: '900' },
  sectionDescription: { color: '#617066', lineHeight: 21 },
  sectionTitle: { color: '#173c29', fontSize: 24, fontWeight: '900' },
  shell: { flex: 1 },
  sourceButton: {
    backgroundColor: '#eef7f1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourceButtonText: { color: '#17683b', fontSize: 12, fontWeight: '800' },
  title: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  verifiedDate: { color: '#718078', fontSize: 12, marginTop: 6 },
  verifiedDot: { backgroundColor: '#22c55e', borderRadius: 999, height: 8, width: 8 },
  verifiedRow: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingBottom: 11 },
  verifiedText: { color: '#237345', fontSize: 12, fontWeight: '800' },
});
