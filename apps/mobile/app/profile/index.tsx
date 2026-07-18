import type { Href } from 'expo-router';
import { Link, Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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
import { getPublicPhoneMfaMode } from '../../src/config/environment';
import { useDeviceRegistration } from '../../src/device/use-device-registration';
import {
  captureCurrentLocation,
  requiresLocationPermissionSettings,
} from '../../src/complaints/location-service';
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
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

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
    return <LoadingScreen label="Loading your profile…" />;
  }

  if (profileState.status === 'error') {
    return (
      <Screen>
        <View style={styles.centeredPanel}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Your profile is unavailable
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
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => {
              void handleSignOut();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Sign out</Text>
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
      setError('Choose a JPEG, PNG, or WebP image first.');
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
          ? 'Your photo was saved. An older private image is awaiting cleanup.'
          : 'Your private profile photo was saved.',
      );
    } catch (uploadError) {
      setError(getProfileImageError(uploadError));
    } finally {
      setIsPending(false);
    }
  };

  const confirmRemoval = (): void => {
    Alert.alert('Remove profile photo?', 'The private image will be permanently removed.', [
      { style: 'cancel', text: 'Keep photo' },
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
              setSuccess('Your private profile photo was removed.');
            })
            .catch((removalError: unknown) => {
              setError(getProfileImageError(removalError));
            })
            .finally(() => setIsPending(false));
        },
        style: 'destructive',
        text: 'Remove',
      },
    ]);
  };

  const previewUrl = selectedAsset?.uri ?? signedUrl;
  return (
    <View style={styles.card}>
      <View style={styles.avatarHeading}>
        <View style={styles.avatarCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Profile photo
          </Text>
          <Text style={styles.mutedText}>Visible only to your account.</Text>
        </View>
        <View accessibilityLabel="Current profile photo" style={styles.avatarPreview}>
          {previewUrl ? (
            <Image
              accessibilityLabel="Citizen profile photo"
              onError={() => {
                if (!selectedAsset) {
                  setSignedUrl(null);
                  setAvatarLoadError('The profile photo is temporarily unavailable.');
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
      <Text style={styles.mutedText}>JPEG, PNG or WebP · max 5 MiB</Text>
      <View style={styles.avatarActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => void choose('camera')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => void choose('library')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Choose from library</Text>
        </Pressable>
        {selectedAsset ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => void upload()}
            style={styles.primaryButton}
          >
            {isPending ? (
              <ActivityIndicator accessibilityLabel="Uploading profile photo" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {profile.avatarObjectPath ? 'Replace photo' : 'Upload photo'}
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
          <Text style={styles.removeAvatarText}>Remove photo</Text>
        </Pressable>
      ) : null}
      {settingsSource ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            Open {settingsSource === 'camera' ? 'camera' : 'photo'} settings
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
  const [state, setState] = useState<CivicAreaLookupState>({ status: 'idle' });
  const resolvedArea =
    state.status === 'ready' && state.area.status === 'resolved' ? state.area : null;
  const unresolvedArea =
    state.status === 'ready' && state.area.status !== 'resolved' ? state.area : null;

  const locate = async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const location = await captureCurrentLocation();
      const resolution = await resolveGoverningBodies(accessToken, location);
      setState({ area: createProfileCivicArea(resolution), status: 'ready' });
    } catch (lookupError) {
      setState({
        locationSettingsRequired: requiresLocationPermissionSettings(lookupError),
        message: getUserFacingGovernanceError(lookupError),
        status: 'error',
      });
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Current civic area
      </Text>
      <Text style={styles.mutedText}>Find your verified ward and local body.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: state.status === 'loading' }}
        disabled={state.status === 'loading'}
        onPress={() => void locate()}
        style={styles.secondaryButton}
      >
        {state.status === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Finding current civic area" color="#166534" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            {state.status === 'ready' ? 'Refresh current area' : 'Use my current location'}
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
              <Text style={styles.secondaryButtonText}>Open location settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {resolvedArea ? (
        <View accessibilityLiveRegion="polite" style={styles.civicAreaResult}>
          <Text style={styles.verifiedText}>Official-source verified</Text>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>Ward</Text>
            <Text style={styles.civicAreaValue}>{resolvedArea.wardName ?? 'No ward returned'}</Text>
          </View>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>Local body</Text>
            <Text style={styles.civicAreaValue}>{resolvedArea.localBodyName}</Text>
          </View>
          <View style={styles.civicAreaRow}>
            <Text style={styles.civicAreaLabel}>Authority</Text>
            <Text style={styles.civicAreaValue}>{resolvedArea.authorityName}</Text>
          </View>
          <Text style={styles.mutedText}>
            Last verified {new Date(resolvedArea.lastVerifiedOn).toLocaleDateString()}
          </Text>
          <Pressable
            accessibilityHint="Opens the official verification source"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(resolvedArea.sourceUrl)}
            style={styles.sourceLink}
          >
            <Text style={styles.secondaryButtonText}>View official source</Text>
          </Pressable>
        </View>
      ) : null}

      {unresolvedArea ? (
        <View accessibilityLiveRegion="polite" style={styles.inlineResult}>
          <Text style={styles.civicAreaValue}>
            {unresolvedArea.status === 'ambiguous'
              ? 'Boundary review is needed'
              : unresolvedArea.status === 'low_accuracy'
                ? 'A more precise location is needed'
                : 'Verified coverage is not available here yet'}
          </Text>
          <Text style={styles.mutedText}>
            {unresolvedArea.status === 'ambiguous'
              ? 'More than one verified boundary matched. Local Wellness will not guess your civic area.'
              : unresolvedArea.status === 'low_accuracy'
                ? `Move into an open area and try again. Accuracy must be within ${unresolvedArea.maximumAccuracyMeters} metres.`
                : 'No placeholder or unverified governing body has been added to your profile.'}
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
      setSuccessMessage('Your profile and language preference have been saved.');
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
          Your profile
        </Text>

        <ProfileImageCard onProfileUpdated={onProfileUpdated} profile={profile} />

        <CurrentCivicAreaCard accessToken={accessToken} />

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            accessibilityLabel="Your name"
            autoComplete="name"
            editable={!isSaving}
            maxLength={100}
            onChangeText={setDisplayName}
            placeholder="Your name"
            style={styles.input}
            value={displayName}
          />

          <Text style={styles.label}>Preferred language</Text>
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
              <ActivityIndicator accessibilityLabel="Saving profile" color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save profile</Text>
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

        {getPublicPhoneMfaMode() === 'observe' ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Phone verification
            </Text>
            <Text style={styles.mutedText}>Optional in this environment.</Text>
            <Link href={'/auth/phone-verification?optional=1' as Href} asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Set up phone verification</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Device security
          </Text>
          {deviceRegistration.state.status === 'registering' ? (
            <View accessibilityLiveRegion="polite" style={styles.inlineStatus}>
              <ActivityIndicator accessibilityLabel="Registering this device" color="#166534" />
              <Text style={styles.mutedText}>Registering this device securely…</Text>
            </View>
          ) : null}
          {deviceRegistration.state.status === 'registered' ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              This device is securely registered.
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
                <Text style={styles.secondaryButtonText}>Retry device registration</Text>
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
            <ActivityIndicator accessibilityLabel="Signing out" color="#991b1b" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign out</Text>
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

  if (state.status === 'loading') {
    return <LoadingScreen label="Restoring your secure session…" />;
  }

  if (state.status === 'configuration-error') {
    return <ErrorScreen message={state.message} title="App configuration required" />;
  }

  if (state.status === 'signed-out') {
    return <Redirect href="/auth" />;
  }

  if (state.status === 'mfa-required') {
    return <Redirect href="/auth/phone-verification" />;
  }

  return <SignedInProfile accessToken={state.session.access_token} signOut={signOut} />;
}

const styles = StyleSheet.create({
  avatarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarCopy: { flex: 1, gap: 6 },
  avatarHeading: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  avatarImage: { height: 92, width: 92 },
  avatarInitial: { color: '#166534', fontSize: 34, fontWeight: '900' },
  avatarPreview: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderRadius: 46,
    borderWidth: 1,
    height: 92,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 92,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  centeredPanel: { flex: 1, gap: 18, justifyContent: 'center', padding: 24 },
  content: { gap: 18, padding: 20, paddingBottom: 40 },
  errorText: { color: '#991b1b', fontSize: 15, lineHeight: 22 },
  inlineStatus: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  inlineResult: { backgroundColor: '#f8fafc', borderRadius: 10, gap: 8, padding: 12 },
  input: {
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '700', marginTop: 4 },
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
  languageButtonText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  languageButtonTextSelected: { color: '#14532d' },
  languageGroup: { flexDirection: 'row', gap: 8 },
  mutedText: { color: '#64748b', flex: 1, lineHeight: 21 },
  civicAreaLabel: { color: '#64748b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  civicAreaResult: { backgroundColor: '#f0fdf4', borderRadius: 12, gap: 10, padding: 14 },
  civicAreaRow: { gap: 2 },
  civicAreaValue: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  removeAvatarButton: { alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, padding: 10 },
  removeAvatarText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', minHeight: 46, padding: 10 },
  secondaryButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: '#1e293b', fontSize: 20, fontWeight: '700' },
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
  signOutButtonText: { color: '#991b1b', fontSize: 16, fontWeight: '700' },
  successText: { color: '#166534', fontSize: 15, lineHeight: 22 },
  title: { color: '#14281d', fontSize: 30, fontWeight: '800' },
  verifiedText: { color: '#166534', fontSize: 13, fontWeight: '800' },
});
