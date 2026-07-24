import type { Href } from 'expo-router';
import { Link, Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getUserFacingApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/auth-context';
import { getUserFacingAuthError } from '../../src/auth/auth-service';
import { getPublicPhoneVerificationMode } from '../../src/config/environment';
import {
  getUserFacingInAppBrowserError,
  openSecureExternalPage,
} from '../../src/device/in-app-browser';
import { useDeviceRegistration } from '../../src/device/use-device-registration';
import {
  getCurrentAreaLocation,
  getCurrentAreaLocationAutomatically,
  requiresLocationPermissionSettings,
} from '../../src/location/device-location';
import { useAutomaticForegroundLocation } from '../../src/location/use-automatic-foreground-location';
import {
  getUserFacingGovernanceError,
  resolveGoverningBodies,
} from '../../src/governance/governance-service';
import {
  createProfileCivicArea,
  type ProfileCivicArea,
} from '../../src/profile/profile-civic-area';
import {
  getProfile,
  preferredLanguages,
  updateProfile,
  type PreferredLanguage,
  type Profile,
} from '../../src/profile/profile-service';
import {
  createProfileImageSignedUrl,
  getProfileImageError,
  removePrivateProfileImage,
  uploadPrivateProfileImage,
} from '../../src/profile/profile-image';
import {
  ProfilePhotoSelectionError,
  selectProfilePhoto,
  type ProfilePhotoSource,
} from '../../src/profile/profile-photo-picker';
import { getSupabaseClient } from '../../src/auth/supabase';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

type ProfileLoadState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; profile: Profile }>;

const languageLabels: Readonly<Record<PreferredLanguage, string>> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
};

const SignedInProfile = ({
  accessToken,
  signOut,
}: Readonly<{ accessToken: string; signOut: () => Promise<void> }>) => {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [profileState, setProfileState] = useState<ProfileLoadState>({ status: 'loading' });
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const deviceRegistration = useDeviceRegistration(accessToken);
  const { t } = useLocalization();

  useEffect(() => {
    let isCurrent = true;

    const loadProfile = async (): Promise<void> => {
      setProfileState({ status: 'loading' });

      try {
        const profile = await getProfile(accessToken);

        if (isCurrent) {
          setProfileState({ profile, status: 'ready' });
        }
      } catch (error) {
        if (isCurrent) {
          setProfileState({ message: getUserFacingApiError(error), status: 'error' });
        }
      }
    };

    void loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [accessToken, loadAttempt]);

  const handleSignOut = async (): Promise<void> => {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      setSignOutError(getUserFacingAuthError(error));
      setIsSigningOut(false);
    }
  };

  if (profileState.status === 'loading') {
    return <LoadingScreen label={t('loadingProfile')} />;
  }

  if (profileState.status === 'error') {
    return (
      <Screen>
        <View style={styles.centeredPanel}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('profileUnavailable')}
          </Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {profileState.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoadAttempt((attempt) => attempt + 1);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{t('tryAgain')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => {
              void handleSignOut();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('signOut')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <ProfileEditor
      accessToken={accessToken}
      deviceRegistration={deviceRegistration}
      isSigningOut={isSigningOut}
      onProfileUpdated={(profile) => {
        setProfileState({ profile, status: 'ready' });
      }}
      onSignOut={() => {
        void handleSignOut();
      }}
      profile={profileState.profile}
      signOutError={signOutError}
    />
  );
};

type DeviceRegistrationResult = ReturnType<typeof useDeviceRegistration>;

const getProfileInitial = (profile: Profile): string => {
  const label = profile.displayName ?? profile.email ?? 'Citizen';
  return label.trim().charAt(0).toLocaleUpperCase() || 'C';
};

const ProfileImageCard = ({
  onProfileUpdated,
  profile,
}: Readonly<{ onProfileUpdated: (profile: Profile) => void; profile: Profile }>) => {
  const { t } = useLocalization();
  const [avatarLoadError, setAvatarLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [settingsSource, setSettingsSource] = useState<ProfilePhotoSource | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    if (!profile.avatarObjectPath) {
      return undefined;
    }

    void createProfileImageSignedUrl(getSupabaseClient(), profile.id, profile.avatarObjectPath)
      .then((url) => {
        if (!isCurrent) return;
        setSignedUrl(url);
        setAvatarLoadError(null);
      })
      .catch((loadError: unknown) => {
        if (!isCurrent) return;
        setSignedUrl(null);
        setAvatarLoadError(getProfileImageError(loadError));
      });

    return () => {
      isCurrent = false;
    };
  }, [profile.avatarObjectPath, profile.avatarUpdatedAt, profile.id]);

  const choose = async (source: ProfilePhotoSource): Promise<void> => {
    setError(null);
    setSuccess(null);
    setSettingsSource(null);

    try {
      const asset = await selectProfilePhoto(ImagePicker, source);
      if (asset) setSelectedAsset(asset);
    } catch (selectionError) {
      if (selectionError instanceof ProfilePhotoSelectionError) {
        setSettingsSource(selectionError.requiresAppSettings ? selectionError.source : null);
        setError(selectionError.message);
      } else {
        setError(getProfileImageError(selectionError));
      }
    }
  };

  const upload = async (): Promise<void> => {
    if (!selectedAsset) {
      setError(t('chooseImageFirst'));
      return;
    }
    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const result = await uploadPrivateProfileImage(getSupabaseClient(), profile, selectedAsset);
      setSelectedAsset(null);
      setSignedUrl(null);
      setAvatarLoadError(null);
      onProfileUpdated(result.profile);
      setSuccess(
        result.previousObjectCleanupFailed
          ? t('profilePhotoCleanupPending')
          : t('profilePhotoSaved'),
      );
    } catch (uploadError) {
      setError(getProfileImageError(uploadError));
    } finally {
      setIsPending(false);
    }
  };

  const confirmRemoval = (): void => {
    Alert.alert(t('removeProfilePhotoQuestion'), t('removeProfilePhotoBody'), [
      { style: 'cancel', text: t('keepPhoto') },
      {
        onPress: () => {
          setError(null);
          setSuccess(null);
          setIsPending(true);
          void removePrivateProfileImage(getSupabaseClient(), profile)
            .then((updatedProfile) => {
              setSelectedAsset(null);
              setSignedUrl(null);
              setAvatarLoadError(null);
              onProfileUpdated(updatedProfile);
              setSuccess(t('profilePhotoRemoved'));
            })
            .catch((removalError: unknown) => {
              setError(getProfileImageError(removalError));
            })
            .finally(() => setIsPending(false));
        },
        style: 'destructive',
        text: t('remove'),
      },
    ]);
  };

  const previewUrl = selectedAsset?.uri ?? signedUrl;
  return (
    <View style={styles.card}>
      <View style={styles.avatarHeading}>
        <View style={styles.avatarCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('profilePhoto')}
          </Text>
          <Text style={styles.mutedText}>{t('profilePhotoPrivate')}</Text>
        </View>
        <View accessibilityLabel={t('currentProfilePhoto')} style={styles.avatarPreview}>
          {previewUrl ? (
            <Image
              accessibilityLabel={t('profilePhotoCurrentAccessibility')}
              onError={() => {
                if (!selectedAsset) {
                  setSignedUrl(null);
                  setAvatarLoadError(t('profilePhotoUnavailable'));
                }
              }}
              source={{ uri: previewUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text accessibilityElementsHidden style={styles.avatarInitial}>
              {getProfileInitial(profile)}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.mutedText}>{t('profilePhotoFormatHint')}</Text>
      <View style={styles.avatarActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => void choose('camera')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{t('takePhoto')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => void choose('library')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{t('chooseLibrary')}</Text>
        </Pressable>
        {selectedAsset ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => void upload()}
            style={styles.primaryButton}
          >
            {isPending ? (
              <ActivityIndicator accessibilityLabel={t('uploadingProfilePhoto')} color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t(profile.avatarObjectPath ? 'replacePhoto' : 'uploadPhoto')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {profile.avatarObjectPath && !selectedAsset ? (
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={confirmRemoval}
          style={styles.removeAvatarButton}
        >
          <Text style={styles.removeAvatarText}>{t('removeProfilePhoto')}</Text>
        </Pressable>
      ) : null}
      {settingsSource ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {settingsSource === 'camera'
              ? t('openCameraSettings')
              : t('openProfilePhotoSettings', { source: t('photo') })}
          </Text>
        </Pressable>
      ) : null}
      {avatarLoadError ? <Text style={styles.mutedText}>{avatarLoadError}</Text> : null}
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : null}
      {success ? (
        <Text accessibilityLiveRegion="polite" style={styles.successText}>
          {success}
        </Text>
      ) : null}
    </View>
  );
};

type CivicAreaLookupState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ locationSettingsRequired: boolean; message: string; status: 'error' }>
  | Readonly<{ area: ProfileCivicArea; status: 'ready' }>;

const CurrentCivicAreaCard = ({ accessToken }: Readonly<{ accessToken: string }>) => {
  const { formatDate, t } = useLocalization();
  const [state, setState] = useState<CivicAreaLookupState>({ status: 'idle' });
  const [isOpeningSource, setIsOpeningSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const resolvedArea =
    state.status === 'ready' && state.area.status === 'resolved' ? state.area : null;
  const unresolvedArea =
    state.status === 'ready' && state.area.status !== 'resolved' ? state.area : null;

  const locate = useCallback(
    async (mode: 'automatic' | 'explicit'): Promise<boolean> => {
      setState({ status: 'loading' });
      setSourceError(null);
      try {
        const location =
          mode === 'automatic'
            ? await getCurrentAreaLocationAutomatically()
            : await getCurrentAreaLocation({ forceRefresh: true });
        if (location === null) {
          setState({ status: 'idle' });
          return false;
        }
        const resolution = await resolveGoverningBodies(accessToken, location);
        setState({ area: createProfileCivicArea(resolution), status: 'ready' });
        return true;
      } catch (lookupError) {
        setState({
          locationSettingsRequired: requiresLocationPermissionSettings(lookupError),
          message: getUserFacingGovernanceError(lookupError),
          status: 'error',
        });
        throw lookupError;
      }
    },
    [accessToken],
  );

  const locationController = useAutomaticForegroundLocation({
    attemptKey: 'profile-civic-area',
    automaticAcquire: () => locate('automatic'),
    enabled: true,
    explicitAcquire: () => locate('explicit'),
  });
  const isLocating = locationController.status === 'checking' || state.status === 'loading';

  const openOfficialSource = async (sourceUrl: string): Promise<void> => {
    if (isOpeningSource) return;
    setIsOpeningSource(true);
    setSourceError(null);
    try {
      await openSecureExternalPage(sourceUrl);
    } catch (openError) {
      setSourceError(getUserFacingInAppBrowserError(openError));
    } finally {
      setIsOpeningSource(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {t('currentCivicArea')}
      </Text>
      <Text style={styles.mutedText}>{t('governingBodiesHint')}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isLocating }}
        disabled={isLocating}
        onPress={() => void locationController.refresh().catch(() => undefined)}
        style={styles.secondaryButton}
      >
        {isLocating ? (
          <ActivityIndicator
            accessibilityLabel={t('findingCivicArea')}
            color={mobileTheme.colors.primary}
          />
        ) : (
          <Text style={styles.secondaryButtonText}>
            {t(state.status === 'ready' ? 'refreshCurrentArea' : 'useCurrentLocation')}
          </Text>
        )}
      </Pressable>

      {state.status === 'error' ? (
        <View accessibilityLiveRegion="assertive" style={styles.inlineResult}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {state.message}
          </Text>
          {state.locationSettingsRequired ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
              <Text style={styles.secondaryButtonText}>{t('openLocationSettings')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {resolvedArea ? (
        <View accessibilityLiveRegion="polite" style={styles.civicAreaResult}>
          <Text style={styles.verifiedText}>{t('officialSourceVerified')}</Text>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>{t('ward')}</Text>
            <Text style={styles.civicAreaValue}>
              {resolvedArea.wardName ?? t('noWardReturned')}
            </Text>
          </View>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>{t('localBody')}</Text>
            <Text style={styles.civicAreaValue}>{resolvedArea.localBodyName}</Text>
          </View>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>{t('authority')}</Text>
            <Text style={styles.civicAreaValue}>{resolvedArea.authorityName}</Text>
          </View>
          <Text style={styles.mutedText}>
            {t('lastVerified', { date: formatDate(resolvedArea.lastVerifiedOn) })}
          </Text>
          <Pressable
            accessibilityHint={t('officialSourceHint')}
            accessibilityRole="link"
            accessibilityState={{ disabled: isOpeningSource }}
            disabled={isOpeningSource}
            onPress={() => void openOfficialSource(resolvedArea.sourceUrl)}
            style={styles.sourceLink}
          >
            <Text style={styles.secondaryButtonText}>
              {t(isOpeningSource ? 'openingOfficialSource' : 'viewOfficialSource')}
            </Text>
          </Pressable>
          {sourceError === null ? null : (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {sourceError}
            </Text>
          )}
        </View>
      ) : null}

      {unresolvedArea ? (
        <View accessibilityLiveRegion="polite" style={styles.inlineResult}>
          <Text style={styles.civicAreaValue}>
            {unresolvedArea.status === 'ambiguous'
              ? t('boundaryReviewNeeded')
              : unresolvedArea.status === 'low_accuracy'
                ? t('preciseLocationNeeded')
                : t('coverageUnavailable')}
          </Text>
          <Text style={styles.mutedText}>
            {unresolvedArea.status === 'ambiguous'
              ? t('boundaryAmbiguousBody')
              : unresolvedArea.status === 'low_accuracy'
                ? t('lowAccuracyGuidance', {
                    accuracy: unresolvedArea.maximumAccuracyMeters,
                  })
                : t('noPlaceholderProfile')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const ProfileEditor = ({
  accessToken,
  deviceRegistration,
  isSigningOut,
  onProfileUpdated,
  onSignOut,
  profile,
  signOutError,
}: Readonly<{
  accessToken: string;
  deviceRegistration: DeviceRegistrationResult;
  isSigningOut: boolean;
  onProfileUpdated: (profile: Profile) => void;
  onSignOut: () => void;
  profile: Profile;
  signOutError: string | null;
}>) => {
  const { setLocale, t } = useLocalization();
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const saveProfile = async (): Promise<void> => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const updatedProfile = await updateProfile(accessToken, {
        displayName,
        preferredLanguage,
      });
      onProfileUpdated(updatedProfile);
      setDisplayName(updatedProfile.displayName ?? '');
      setPreferredLanguage(updatedProfile.preferredLanguage);
      await setLocale(updatedProfile.preferredLanguage);
      setSuccessMessage(t('profileSaved'));
    } catch (saveError) {
      setError(getUserFacingApiError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          {t('profileTitle')}
        </Text>

        <ProfileImageCard onProfileUpdated={onProfileUpdated} profile={profile} />

        <CurrentCivicAreaCard accessToken={accessToken} />

        <View style={styles.card}>
          <Text style={styles.label}>{t('name')}</Text>
          <TextInput
            accessibilityLabel={t('yourName')}
            autoComplete="name"
            editable={!isSaving}
            maxLength={100}
            onChangeText={setDisplayName}
            placeholder={t('yourName')}
            style={styles.input}
            value={displayName}
          />

          <Text style={styles.label}>{t('preferredLanguage')}</Text>
          <View accessibilityRole="radiogroup" style={styles.languageGroup}>
            {preferredLanguages.map((language) => {
              const isSelected = preferredLanguage === language;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: isSaving }}
                  disabled={isSaving}
                  key={language}
                  onPress={() => {
                    setPreferredLanguage(language);
                  }}
                  style={[styles.languageButton, isSelected && styles.languageButtonSelected]}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      isSelected && styles.languageButtonTextSelected,
                    ]}
                  >
                    {languageLabels[language]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={() => {
              void saveProfile();
            }}
            style={styles.primaryButton}
          >
            {isSaving ? (
              <ActivityIndicator
                accessibilityLabel={t('savingProfile')}
                color={mobileTheme.colors.white}
              />
            ) : (
              <Text style={styles.primaryButtonText}>{t('saveProfile')}</Text>
            )}
          </Pressable>

          {successMessage === null ? null : (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {successMessage}
            </Text>
          )}
          {error === null ? null : (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorText}
            >
              {error}
            </Text>
          )}
        </View>

        {getPublicPhoneVerificationMode() === 'observe' ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {t('phoneConfirmation')}
            </Text>
            <Text style={styles.mutedText}>{t('optionalEnvironment')}</Text>
            <Link href={'/auth/phone-verification?optional=1' as Href} asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t('confirmPhoneNumber')}</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('passwordSecurity')}
          </Text>
          <Text style={styles.mutedText}>{t('passwordSecurityHint')}</Text>
          <Link href={'/auth/change-password' as Href} asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('changePassword')}</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('deviceSecurity')}
          </Text>
          {deviceRegistration.state.status === 'registering' ? (
            <View accessibilityLiveRegion="polite" style={styles.inlineStatus}>
              <ActivityIndicator
                accessibilityLabel={t('registeringDevice')}
                color={mobileTheme.colors.primary}
              />
              <Text style={styles.mutedText}>{t('registeringDevice')}</Text>
            </View>
          ) : null}
          {deviceRegistration.state.status === 'registered' ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {t('deviceRegistered')}
            </Text>
          ) : null}
          {deviceRegistration.state.status === 'error' ? (
            <>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {deviceRegistration.state.message}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={deviceRegistration.retry}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>{t('retryDeviceRegistration')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={onSignOut}
          style={styles.signOutButton}
        >
          {isSigningOut ? (
            <ActivityIndicator
              accessibilityLabel={t('signingOut')}
              color={mobileTheme.colors.danger}
            />
          ) : (
            <Text style={styles.signOutButtonText}>{t('signOut')}</Text>
          )}
        </Pressable>
        {signOutError === null ? null : (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {signOutError}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
};

export default function ProfileScreen() {
  const { signOut, state } = useAuth();
  const { t } = useLocalization();

  if (state.status === 'loading') {
    return <LoadingScreen label={t('restoringSession')} />;
  }

  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title={t('appConfigurationRequired')} />;
  }

  if (state.status === 'signed-out') {
    return <Redirect href="/auth" />;
  }

  if (state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  return <SignedInProfile accessToken={state.session.access_token} signOut={signOut} />;
}

const styles = StyleSheet.create({
  avatarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarCopy: { flex: 1, gap: 6 },
  avatarHeading: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  avatarImage: { height: 92, width: 92 },
  avatarInitial: { color: mobileTheme.colors.primary, fontSize: 28, fontWeight: '900' },
  avatarPreview: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.primarySoft,
    borderColor: '#86efac',
    borderRadius: 46,
    borderWidth: 1,
    height: 92,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 92,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  centeredPanel: { flex: 1, gap: 18, justifyContent: 'center', padding: 24 },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  inlineStatus: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  inlineResult: { backgroundColor: '#f8fafc', borderRadius: 10, gap: 8, padding: 12 },
  input: {
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  label: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    fontWeight: '700',
    marginTop: 4,
  },
  languageButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    padding: 10,
  },
  languageButtonSelected: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  languageButtonText: { color: mobileTheme.colors.muted, fontSize: 14, fontWeight: '600' },
  languageButtonTextSelected: { color: '#14532d' },
  languageGroup: { flexDirection: 'row', gap: 8 },
  mutedText: {
    color: mobileTheme.colors.muted,
    flex: 1,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  civicAreaLabel: {
    color: mobileTheme.colors.muted,
    fontSize: mobileTheme.type.helper,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  civicAreaResult: { backgroundColor: '#f0fdf4', borderRadius: 12, gap: 10, padding: 14 },
  civicAreaRow: { gap: 2 },
  civicAreaValue: { color: mobileTheme.colors.text, fontSize: 14, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radius.small,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: mobileTheme.colors.white, fontSize: 14, fontWeight: '700' },
  removeAvatarButton: { alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, padding: 10 },
  removeAvatarText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', minHeight: 46, padding: 10 },
  secondaryButtonText: { color: mobileTheme.colors.primary, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: mobileTheme.colors.text, fontSize: 18, fontWeight: '800' },
  sourceLink: { alignSelf: 'flex-start', minHeight: 44, paddingVertical: 10 },
  signOutButton: {
    alignItems: 'center',
    borderColor: '#b91c1c',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  signOutButtonText: { color: mobileTheme.colors.danger, fontSize: 14, fontWeight: '700' },
  successText: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.type.body,
    lineHeight: mobileTheme.type.bodyLineHeight,
  },
  title: { color: mobileTheme.colors.text, fontSize: mobileTheme.type.title, fontWeight: '900' },
  verifiedText: { color: mobileTheme.colors.primary, fontSize: 12, fontWeight: '800' },
});
