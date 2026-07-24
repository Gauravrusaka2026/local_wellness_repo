import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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
  ResolveJurisdictionRequest,
  VerifiedCivicAreaOffice,
  VerifiedGovernanceEntitySummary,
  VerifiedGoverningBodyMatch,
} from '@local-wellness/types';
import type { MessageKey } from '@local-wellness/localization';

import { useAuth } from '../../src/auth/auth-context';
import {
  getCurrentAreaLocation,
  getCurrentAreaLocationAutomatically,
  requiresLocationPermissionSettings,
} from '../../src/location/device-location';
import { useAutomaticForegroundLocation } from '../../src/location/use-automatic-foreground-location';
import {
  getOfficeDialUrl,
  getOfficeEmailUrl,
  getUserFacingGovernanceError,
  isGovernanceLookupCurrent,
  resolveGoverningBodies,
} from '../../src/governance/governance-service';
import {
  getUserFacingInAppBrowserError,
  openSecureExternalPage,
} from '../../src/device/in-app-browser';
import { AppBottomNavigation } from '../../src/ui/app-bottom-navigation';
import { CivicIcon } from '../../src/ui/civic-icon';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type LookupState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ locationSettingsRequired: boolean; message: string; status: 'error' }>
  | Readonly<{ result: GoverningBodyResolution; status: 'ready' }>;

const entityLabelKeys: Record<VerifiedGovernanceEntitySummary['kind'], MessageKey> = {
  authority: 'responsibleAuthority',
  district: 'district',
  local_body: 'localBody',
  state: 'state',
  taluka: 'taluka',
  ward: 'ward',
} as const;

const formatOfficeType = (officeType: string): string =>
  officeType
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');

const OfficeContactCard = ({ office }: Readonly<{ office: VerifiedCivicAreaOffice }>) => {
  const { formatDate, t } = useLocalization();
  const [pendingAction, setPendingAction] = useState<'call' | 'email' | 'source' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dialUrl = office.phone === undefined ? null : getOfficeDialUrl(office.phone);
  const emailUrl = office.email === undefined ? null : getOfficeEmailUrl(office.email);

  const runAction = async (action: 'call' | 'email' | 'source', target: string): Promise<void> => {
    if (pendingAction !== null) return;
    setPendingAction(action);
    setActionError(null);

    try {
      if (action === 'source') await openSecureExternalPage(target);
      else await Linking.openURL(target);
    } catch (error) {
      setActionError(
        action === 'source'
          ? getUserFacingInAppBrowserError(error)
          : t('officeContactOpenError', {
              channel: t(action === 'call' ? 'officialPhone' : 'email'),
            }),
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactHeading}>
        <View style={styles.contactIcon}>
          <CivicIcon color="#1565c0" name="office" />
        </View>
        <View style={styles.entityCopy}>
          <Text style={styles.contactName}>{office.name}</Text>
          <Text style={styles.contactType}>{formatOfficeType(office.type)}</Text>
        </View>
      </View>
      {office.address === undefined ? null : (
        <View style={styles.contactDetailRow}>
          <Text style={styles.contactDetailLabel}>{t('address')}</Text>
          <Text selectable style={styles.contactDetailValue}>
            {office.address}
          </Text>
        </View>
      )}
      {office.phone === undefined ? null : (
        <View style={styles.contactDetailRow}>
          <Text style={styles.contactDetailLabel}>{t('officialPhone')}</Text>
          <Text selectable style={styles.contactDetailValue}>
            {office.phone}
          </Text>
        </View>
      )}
      {office.email === undefined ? null : (
        <View style={styles.contactDetailRow}>
          <Text style={styles.contactDetailLabel}>{t('email')}</Text>
          <Text selectable style={styles.contactDetailValue}>
            {office.email}
          </Text>
        </View>
      )}
      <Text style={styles.verifiedDate}>
        {t('verifiedOn', { date: formatDate(office.lastVerifiedOn) })}
      </Text>
      <View style={styles.contactActions}>
        {dialUrl === null ? null : (
          <Pressable
            accessibilityHint={t('openVerifiedOfficePhone')}
            accessibilityRole="button"
            accessibilityState={{ disabled: pendingAction !== null }}
            disabled={pendingAction !== null}
            onPress={() => void runAction('call', dialUrl)}
            style={({ pressed }) => [styles.contactAction, pressed && styles.pressed]}
          >
            <Text style={styles.contactActionText}>
              {t(pendingAction === 'call' ? 'opening' : 'call')}
            </Text>
          </Pressable>
        )}
        {emailUrl === null ? null : (
          <Pressable
            accessibilityHint={t('openVerifiedOfficeEmail')}
            accessibilityRole="button"
            accessibilityState={{ disabled: pendingAction !== null }}
            disabled={pendingAction !== null}
            onPress={() => void runAction('email', emailUrl)}
            style={({ pressed }) => [styles.contactAction, pressed && styles.pressed]}
          >
            <Text style={styles.contactActionText}>
              {t(pendingAction === 'email' ? 'opening' : 'email')}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityHint={t('officeSourceHint')}
          accessibilityRole="link"
          accessibilityState={{ disabled: pendingAction !== null }}
          disabled={pendingAction !== null}
          onPress={() => void runAction('source', office.sourceUrl)}
          style={({ pressed }) => [styles.sourceAction, pressed && styles.pressed]}
        >
          <Text style={styles.sourceActionText}>
            {t(pendingAction === 'source' ? 'opening' : 'source')}
          </Text>
        </Pressable>
      </View>
      {actionError === null ? null : (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {actionError}
        </Text>
      )}
    </View>
  );
};

const MatchCard = ({ match }: Readonly<{ match: VerifiedGoverningBodyMatch }>) => {
  const { t } = useLocalization();
  const [isOpeningSource, setIsOpeningSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const entities = [
    match.localBody,
    match.ward,
    match.authority,
    match.district,
    match.taluka,
    match.state,
  ].filter((entity): entity is VerifiedGovernanceEntitySummary => entity !== null);
  const offices = match.offices ?? [];

  const openOfficialSource = async (): Promise<void> => {
    if (isOpeningSource) return;
    setIsOpeningSource(true);
    setSourceError(null);
    try {
      await openSecureExternalPage(match.localBody.sourceUrl);
    } catch (error) {
      setSourceError(getUserFacingInAppBrowserError(error));
    } finally {
      setIsOpeningSource(false);
    }
  };

  return (
    <View style={styles.matchCard}>
      <View style={styles.officeHeading}>
        <View style={styles.officeIcon}>
          <CivicIcon color="#16834a" name="office" />
        </View>
        <View style={styles.entityCopy}>
          <Text style={styles.entityName}>{match.localBody.name}</Text>
          <Text style={styles.officeAddress}>
            {match.ward?.name ?? match.district?.name ?? t('localAuthority')}
          </Text>
        </View>
      </View>
      <View style={styles.officeMetaRow}>
        <Text style={styles.officeMeta}>{t('servesLocation')}</Text>
        <Text style={styles.officeMeta}>{t('verifiedGoverningBody')}</Text>
      </View>
      <View style={styles.tags}>
        {entities.slice(0, 3).map((entity) => (
          <Text key={entity.kind} style={styles.tag}>
            {t(entityLabelKeys[entity.kind])}
          </Text>
        ))}
      </View>
      {offices.length === 0 ? (
        <View style={styles.officeUnavailable}>
          <Text style={styles.officeUnavailableTitle}>{t('officeContactsUnavailable')}</Text>
          <Text style={styles.officeUnavailableText}>{t('officeContactsUnavailableBody')}</Text>
        </View>
      ) : (
        <View style={styles.officeList}>
          <Text accessibilityRole="header" style={styles.officeListTitle}>
            {t('nearbyOffices')}
          </Text>
          {offices.map((office) => (
            <OfficeContactCard
              key={`${office.name}-${office.type}-${office.sourceUrl}`}
              office={office}
            />
          ))}
        </View>
      )}
      <Pressable
        accessibilityHint={t('officialSourceHint')}
        accessibilityRole="link"
        accessibilityState={{ disabled: isOpeningSource }}
        disabled={isOpeningSource}
        onPress={() => void openOfficialSource()}
        style={styles.directoryButton}
      >
        <Text style={styles.directoryButtonText}>
          {t(isOpeningSource ? 'openingOfficialSource' : 'viewCivicAreaSource')}
        </Text>
      </Pressable>
      {sourceError === null ? null : (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {sourceError}
        </Text>
      )}
    </View>
  );
};

const ResolutionContent = ({ result }: Readonly<{ result: GoverningBodyResolution }>) => {
  const { t } = useLocalization();
  if (result.status === 'resolved') {
    return (
      <View style={styles.resultSection}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('yourCivicArea')}
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
          <Text style={styles.noticeTitle}>{t('boundaryReviewNeeded')}</Text>
          <Text style={styles.noticeText}>{t('boundaryAmbiguousBody')}</Text>
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
        {result.status === 'low_accuracy' ? t('preciseLocationNeeded') : t('coverageUnavailable')}
      </Text>
      <Text style={styles.emptyText}>
        {result.status === 'low_accuracy'
          ? t('lowAccuracyGuidance', { accuracy: result.maximumAccuracyMeters })
          : t('verifiedOnlyBody')}
      </Text>
    </View>
  );
};

export default function GovernanceDirectoryScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { t } = useLocalization();
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  const accessToken = auth.state.status === 'signed-in' ? auth.state.session.access_token : null;
  const activeAccessTokenRef = useRef(accessToken);
  const isFocusedRef = useRef(false);
  const requestGenerationRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const accountChanged = activeAccessTokenRef.current !== accessToken;
      activeAccessTokenRef.current = accessToken;
      isFocusedRef.current = true;
      requestGenerationRef.current += 1;
      if (accountChanged) setState({ status: 'idle' });

      return () => {
        isFocusedRef.current = false;
        requestGenerationRef.current += 1;
      };
    }, [accessToken]),
  );

  const resolveLocation = useCallback(
    async (location: ResolveJurisdictionRequest): Promise<boolean> => {
      if (
        accessToken === null ||
        activeAccessTokenRef.current !== accessToken ||
        !isFocusedRef.current
      ) {
        return false;
      }
      const requestGeneration = requestGenerationRef.current + 1;
      requestGenerationRef.current = requestGeneration;
      setState({ status: 'loading' });
      const result = await resolveGoverningBodies(accessToken, location);
      if (
        !isGovernanceLookupCurrent(
          { accessToken, generation: requestGeneration },
          {
            accessToken: activeAccessTokenRef.current,
            generation: requestGenerationRef.current,
            isFocused: isFocusedRef.current,
          },
        )
      ) {
        return false;
      }
      setState({ result, status: 'ready' });
      return true;
    },
    [accessToken],
  );

  const acquireAreaAutomatically = useCallback(async (): Promise<boolean> => {
    const location = await getCurrentAreaLocationAutomatically();
    if (location === null) return false;
    return resolveLocation(location);
  }, [resolveLocation]);

  const acquireAreaExplicitly = useCallback(async (): Promise<boolean> => {
    const location = await getCurrentAreaLocation({ forceRefresh: true });
    return resolveLocation(location);
  }, [resolveLocation]);

  const handleLocationError = useCallback((error: unknown) => {
    setState({
      locationSettingsRequired: requiresLocationPermissionSettings(error),
      message: getUserFacingGovernanceError(error),
      status: 'error',
    });
  }, []);

  const automaticLocation = useAutomaticForegroundLocation({
    attemptKey: accessToken ?? 'signed-out',
    automaticAcquire: acquireAreaAutomatically,
    enabled: accessToken !== null && state.status !== 'ready',
    explicitAcquire: acquireAreaExplicitly,
    onError: handleLocationError,
  });
  const isChecking = state.status === 'loading' || automaticLocation.status === 'checking';
  const needsLocationRecovery =
    state.status === 'error' ||
    automaticLocation.status === 'permission-required' ||
    automaticLocation.status === 'error';

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  return (
    <Screen>
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.pageHeader}>
            <Pressable
              accessibilityLabel={t('back')}
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <CivicIcon color="#15271c" name="arrow-left" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                {t('yourCivicArea')}
              </Text>
              <Text style={styles.description}>{t('verifiedPublicOffices')}</Text>
            </View>
          </View>
          <View style={styles.locationBar}>
            <CivicIcon color="#e77817" name="location" />
            <Text style={styles.locationText}>
              {state.status === 'ready'
                ? t('currentVerifiedArea')
                : needsLocationRecovery
                  ? t('locationAccessNeeded')
                  : t('findingCivicArea')}
            </Text>
            {isChecking ? (
              <View style={styles.locateButton}>
                <ActivityIndicator
                  accessibilityLabel={t('findingGoverningBodies')}
                  color="#ffffff"
                />
              </View>
            ) : needsLocationRecovery ? (
              <Pressable
                accessibilityLabel={t('refresh')}
                accessibilityRole="button"
                onPress={() => void automaticLocation.refresh().catch(() => undefined)}
                style={({ pressed }) => [styles.locateButton, pressed && styles.pressed]}
              >
                <CivicIcon color="#ffffff" name="locate" />
              </Pressable>
            ) : null}
          </View>

          <View accessible accessibilityLabel={t('schematicAreaOverview')} style={styles.mapCard}>
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
                    ? t('verifiedOfficesFound', {
                        count: state.result.matches.reduce(
                          (count, match) => count + (match.offices?.length ?? 0),
                          0,
                        ),
                      })
                    : t('findingCivicArea')}
                </Text>
                <Text style={styles.mapSummaryText}>{t('basedOnVerifiedArea')}</Text>
              </View>
            </View>
          </View>

          {state.status === 'idle' && automaticLocation.status === 'permission-required' ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{t('allowLocationForCivicArea')}</Text>
              <Text style={styles.noticeText}>{t('allowLocationBody')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void automaticLocation.refresh().catch(() => undefined)}
              >
                <Text style={styles.retryText}>{t('refresh')}</Text>
              </Pressable>
            </View>
          ) : null}
          {(state.status === 'idle' && automaticLocation.status !== 'permission-required') ||
          state.status === 'loading' ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{t('checkingCurrentArea')}</Text>
              <Text style={styles.noticeText}>{t('checkingCurrentAreaBody')}</Text>
            </View>
          ) : null}
          {state.status === 'error' ? (
            <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {state.message}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void automaticLocation.refresh().catch(() => undefined)}
              >
                <Text style={styles.retryText}>{t('tryAgain')}</Text>
              </Pressable>
              {state.locationSettingsRequired ? (
                <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                  <Text style={styles.retryText}>{t('openLocationSettings')}</Text>
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
  contactAction: {
    alignItems: 'center',
    backgroundColor: '#e8f2ff',
    borderColor: '#b8d7f6',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 13,
  },
  contactActionText: { color: '#155797', fontSize: 13, fontWeight: '800' },
  contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contactCard: {
    backgroundColor: '#f8fbff',
    borderColor: '#d5e5f4',
    borderRadius: 15,
    borderWidth: 1,
    gap: 11,
    padding: 13,
  },
  contactDetailLabel: {
    color: '#60736a',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  contactDetailRow: { gap: 3 },
  contactDetailValue: { color: '#243a2d', fontSize: 14, lineHeight: 20 },
  contactHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  contactIcon: {
    alignItems: 'center',
    backgroundColor: '#e8f2ff',
    borderRadius: 11,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  contactName: { color: '#173c29', fontSize: 15, fontWeight: '900' },
  contactType: { color: '#5f7468', fontSize: 12, marginTop: 2 },
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
    ...mobileTheme.shadow.surface,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    bottom: 12,
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
    ...mobileTheme.shadow.surface,
    backgroundColor: '#ffffff',
    borderColor: '#dce6df',
    borderRadius: 20,
    borderWidth: 1,
    gap: 13,
    padding: 16,
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
  officeList: { gap: 10 },
  officeListTitle: { color: '#244433', fontSize: 15, fontWeight: '900' },
  officeUnavailable: {
    backgroundColor: '#f5f7f6',
    borderRadius: 12,
    gap: 4,
    padding: 12,
  },
  officeUnavailableText: { color: '#60736a', fontSize: 12, lineHeight: 18 },
  officeUnavailableTitle: { color: '#30483a', fontSize: 13, fontWeight: '800' },
  resultSection: { gap: 12 },
  retryText: { color: '#9f1239', fontWeight: '900' },
  sectionTitle: { color: '#173c29', fontSize: 24, fontWeight: '900' },
  shell: { flex: 1 },
  sourceAction: {
    alignItems: 'center',
    borderColor: '#d6ded9',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 13,
  },
  sourceActionText: { color: '#365848', fontSize: 13, fontWeight: '800' },
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
  verifiedDate: { color: '#16834a', fontSize: 11, fontWeight: '800' },
});
