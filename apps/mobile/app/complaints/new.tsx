import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageKey } from '@local-wellness/localization';
import type { ComplaintHandoffAction, ComplaintLocationEvidence } from '@local-wellness/types';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../src/auth/auth-context';
import {
  getComplaintSubmissionBlockers,
  getDraftReadiness,
  getSelectedCategory,
  isLocationEvidenceEligible,
  type ComplaintSubmissionBlockerCode,
} from '../../src/complaints/capture-state';
import { ComplaintEvidenceEntry } from '../../src/complaints/complaint-evidence-entry';
import { useComplaintCapture } from '../../src/complaints/complaint-context';
import {
  createComplaintDuplicateCheckFingerprint,
  getComplaintLocationRecoveryAction,
} from '../../src/complaints/complaint-form-automation';
import {
  getUserFacingComplaintError,
  isComplaintSubmissionOutcomeUnknown,
} from '../../src/complaints/complaint-service';
import { openOfficialHandoffAction } from '../../src/complaints/official-handoff';
import { TaxonomyDropdown } from '../../src/complaints/taxonomy-dropdown';
import {
  buildComplaintTaxonomyAttributes,
  formatComplaintWorkflowType,
  getSelectedComplaintTaxonomyItem,
  listComplaintTaxonomyPrimaryOptions,
  listComplaintTaxonomySubcategories,
} from '../../src/complaints/taxonomy-selection';
import { useComplaintDetailsAutosave } from '../../src/complaints/use-complaint-details-autosave';
import {
  getUserFacingInAppBrowserError,
  openSecureExternalPage,
} from '../../src/device/in-app-browser';
import { useAutomaticForegroundLocation } from '../../src/location/use-automatic-foreground-location';
import { useLocalization } from '../../src/ui/localization';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';
import { mobileTheme } from '../../src/ui/theme';

const submissionBlockerMessageKeys = {
  asset: 'blockerAsset',
  category: 'blockerCategory',
  category_details: 'blockerCategoryDetails',
  description: 'blockerDescription',
  duplicate_acknowledgement: 'blockerDuplicateAcknowledgement',
  emergency_acknowledgement: 'blockerEmergencyAcknowledgement',
  location: 'blockerLocation',
  media: 'blockerMedia',
  media_limit: 'blockerMediaLimit',
  offline: 'blockerOffline',
  taxonomy: 'blockerTaxonomy',
  unsaved_details: 'blockerUnsavedDetails',
  upload: 'blockerUpload',
  voice_confirmation: 'blockerVoiceConfirmation',
} as const satisfies Record<ComplaintSubmissionBlockerCode, MessageKey>;

const locationGuidanceMessageKey = (
  location: ComplaintLocationEvidence | null,
): MessageKey | null => {
  if (location === null) return 'captureLocationAtIssue';
  switch (location.verificationStatus) {
    case 'verified':
    case 'partially_verified':
      return null;
    case 'pending':
      return 'locationVerificationPending';
    case 'low_accuracy':
      return 'locationLowAccuracy';
    case 'location_mismatch':
      return 'locationMismatch';
    case 'suspected_spoofing':
      return 'locationUnsafeSignal';
    case 'unsupported_area':
      return 'locationCoverageUnavailable';
    case 'manual_review':
      return 'locationManualReview';
  }
};

export default function NewComplaintScreen() {
  const auth = useAuth();
  const capture = useComplaintCapture();
  const { captureLocation, captureLocationAutomatically, checkDuplicates, updateDetails } = capture;
  const router = useRouter();
  const { t } = useLocalization();
  const draft = capture.state.draft;
  const [descriptionEdit, setDescriptionEdit] = useState<
    Readonly<{ draftId: string | null; value: string }>
  >({ draftId: draft?.id ?? null, value: draft?.description ?? '' });
  const [attributeEdit, setAttributeEdit] = useState<
    Readonly<{ draftId: string | null; values: Record<string, boolean | number | string> }>
  >({ draftId: draft?.id ?? null, values: draft?.customAttributes ?? {} });
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [primaryCategoryEdit, setPrimaryCategoryEdit] = useState<
    Readonly<{ code: string | null; draftId: string | null }>
  >({ code: null, draftId: draft?.id ?? null });
  const [subcategoryEdit, setSubcategoryEdit] = useState<
    Readonly<{ code: string | null; draftId: string | null }>
  >({ code: null, draftId: draft?.id ?? null });
  const hasVoice =
    draft?.media.some(
      (media) => media.metadata.kind === 'voice' && media.uploadStatus === 'finalized',
    ) ?? false;
  const description =
    descriptionEdit.draftId === draft?.id ? descriptionEdit.value : (draft?.description ?? '');
  const customAttributes =
    attributeEdit.draftId === draft?.id ? attributeEdit.values : (draft?.customAttributes ?? {});
  const persistedTaxonomyItem = getSelectedComplaintTaxonomyItem(
    capture.state.taxonomyItems,
    draft,
  );
  const selectedPrimaryCode =
    primaryCategoryEdit.draftId === draft?.id
      ? primaryCategoryEdit.code
      : (persistedTaxonomyItem?.primaryCode ?? null);
  const selectedSubcategoryCode =
    subcategoryEdit.draftId === draft?.id
      ? subcategoryEdit.code
      : (persistedTaxonomyItem?.subcategoryCode ?? null);
  const taxonomyItem =
    capture.state.taxonomyItems.find(
      (candidate) =>
        candidate.primaryCode === selectedPrimaryCode &&
        candidate.subcategoryCode === selectedSubcategoryCode,
    ) ?? null;
  const desiredCustomAttributes =
    taxonomyItem === null
      ? {}
      : {
          ...customAttributes,
          ...buildComplaintTaxonomyAttributes(taxonomyItem),
        };
  const desiredDetails = {
    categoryId: taxonomyItem?.routingProfileCategoryId ?? null,
    customAttributes: desiredCustomAttributes,
    description,
  };
  const detailsAutosave = useComplaintDetailsAutosave({
    draftId: draft?.id ?? null,
    enabled:
      draft !== null &&
      capture.state.receipt === null &&
      capture.state.isOnline &&
      auth.state.status === 'signed-in',
    input: desiredDetails,
    persistedInput: {
      categoryId: draft?.categoryId ?? null,
      customAttributes: draft?.customAttributes ?? {},
      description: draft?.description ?? '',
    },
    save: updateDetails,
  });
  const category = getSelectedCategory(capture.state);
  const locationEligible = isLocationEvidenceEligible(draft?.location ?? null);
  const hasUnsavedDetails = detailsAutosave.hasPendingChanges;
  const selectedAsset =
    capture.state.assetOptions.find((asset) => asset.id === draft?.assetId) ?? null;
  const readiness = getDraftReadiness(draft, category);
  const hasSelectedRequiredAsset = category?.requiresAsset !== true || selectedAsset !== null;
  const tryAutomaticComplaintLocation = useCallback(
    () => captureLocationAutomatically(),
    [captureLocationAutomatically],
  );
  const requestComplaintLocation = useCallback(async (): Promise<boolean> => {
    await captureLocation();
    return true;
  }, [captureLocation]);
  const automaticLocation = useAutomaticForegroundLocation({
    attemptKey: `${draft?.id ?? 'none'}:${draft?.categoryId ?? 'none'}:${draft?.location?.id ?? 'missing'}`,
    automaticAcquire: tryAutomaticComplaintLocation,
    enabled:
      draft !== null &&
      persistedTaxonomyItem?.submissionAvailability === 'available' &&
      !locationEligible &&
      !hasUnsavedDetails &&
      capture.state.isOnline &&
      !capture.state.isBusy,
    explicitAcquire: requestComplaintLocation,
  });
  const automaticLocationStatus = automaticLocation.status;
  const locationRecoveryAction = getComplaintLocationRecoveryAction({
    automaticStatus: automaticLocationStatus,
    hasLocation: draft?.location !== null && draft?.location !== undefined,
    locationEligible,
  });
  const duplicateFingerprint = createComplaintDuplicateCheckFingerprint(draft);
  const lastAutomaticDuplicateFingerprint = useRef<string | null>(null);
  const reviewRevision =
    draft === null
      ? null
      : `${draft.description ?? ''}:${draft.media.map((media) => media.id).join(',')}`;
  const [confirmedVoiceRevision, setConfirmedVoiceRevision] = useState<string | null>(null);
  const voiceDescriptionConfirmed =
    reviewRevision !== null && confirmedVoiceRevision === reviewRevision;
  const resultRedirected = useRef(false);

  useEffect(() => {
    if (
      duplicateFingerprint === null ||
      duplicateFingerprint === lastAutomaticDuplicateFingerprint.current ||
      !readiness.isReady ||
      hasUnsavedDetails ||
      !hasSelectedRequiredAsset ||
      capture.state.upload !== null ||
      !capture.state.isOnline ||
      capture.state.isBusy
    ) {
      return;
    }

    const timer = setTimeout(() => {
      lastAutomaticDuplicateFingerprint.current = duplicateFingerprint;
      void checkDuplicates().catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [
    capture.state.isBusy,
    capture.state.isOnline,
    capture.state.upload,
    checkDuplicates,
    duplicateFingerprint,
    hasSelectedRequiredAsset,
    hasUnsavedDetails,
    readiness.isReady,
  ]);

  useEffect(() => {
    const receipt = capture.state.receipt;
    if (receipt === null || resultRedirected.current) return;
    resultRedirected.current = true;
    router.replace({
      pathname: '/complaints/result',
      params: { complaintId: receipt.id, number: receipt.complaintNumber, status: 'success' },
    });
  }, [capture.state.receipt, router]);

  if (auth.state.status === 'loading') return <LoadingScreen label={t('restoringSession')} />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title={t('appConfigurationRequired')} />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'phone-verification-required') {
    return <Redirect href="/auth/phone-verification" />;
  }
  if (capture.state.isBusy && draft === null) return <LoadingScreen label={t('loadingDraft')} />;
  if (draft === null) {
    return (
      <ErrorScreen
        action={{ label: t('returnHome'), onPress: () => router.replace('/home') }}
        message={t('noActiveReportBody')}
        title={t('noActiveReportTitle')}
      />
    );
  }
  if (capture.state.receipt !== null) {
    return <LoadingScreen label={t('openingSubmissionResult')} />;
  }

  const primaryCategoryOptions = listComplaintTaxonomyPrimaryOptions(capture.state.taxonomyItems);
  const subcategoryOptions = listComplaintTaxonomySubcategories(
    capture.state.taxonomyItems,
    selectedPrimaryCode,
  );
  const isOfficialHandoff = taxonomyItem?.routingStatus === 'protected_handoff';
  const isEmergencyIssue = taxonomyItem?.isEmergency === true || category?.isEmergency === true;
  const finalizedEvidenceCount = draft.media.filter(
    (media) =>
      media.uploadStatus === 'finalized' &&
      (media.metadata.kind === 'photo' || media.metadata.kind === 'video'),
  ).length;
  const minimumMediaCount = category?.minimumMediaCount ?? 1;
  const maximumMediaCount = category?.maximumMediaCount ?? 20;
  const submissionBlockers = getComplaintSubmissionBlockers({
    assetOptions: capture.state.assetOptions,
    category,
    taxonomyItem,
    draft,
    duplicateCheck: capture.state.duplicateCheck,
    duplicatesAcknowledged: capture.state.duplicatesAcknowledged,
    emergencyAcknowledged: capture.state.emergencyAcknowledged,
    hasUnsavedDetails,
    hasVoice,
    isEmergencyIssue,
    isOnline: capture.state.isOnline,
    upload: capture.state.upload,
    voiceDescriptionConfirmed,
  });
  const locationGuidanceKey = locationGuidanceMessageKey(draft.location);

  const selectPrimaryCategory = (primaryCode: string): void => {
    if (primaryCode === selectedPrimaryCode) return;

    setAttributeEdit({ draftId: draft.id, values: {} });
    setPrimaryCategoryEdit({ code: primaryCode, draftId: draft.id });
    setSubcategoryEdit({ code: null, draftId: draft.id });
  };

  const selectComplaintType = (subcategoryCode: string): void => {
    const item = capture.state.taxonomyItems.find(
      (candidate) =>
        candidate.primaryCode === selectedPrimaryCode &&
        candidate.subcategoryCode === subcategoryCode,
    );
    if (!item) return;

    const taxonomyAttributes = buildComplaintTaxonomyAttributes(item);
    setHandoffError(null);
    setAttributeEdit({ draftId: draft.id, values: taxonomyAttributes });
    setPrimaryCategoryEdit({ code: item.primaryCode, draftId: draft.id });
    setSubcategoryEdit({ code: item.subcategoryCode, draftId: draft.id });
  };

  const submit = async (): Promise<void> => {
    try {
      await capture.submit();
    } catch (error) {
      if (isComplaintSubmissionOutcomeUnknown(error)) {
        router.replace({ pathname: '/complaints/result', params: { status: 'unknown' } });
        return;
      }

      router.replace({
        pathname: '/complaints/result',
        params: { status: 'failure', message: getUserFacingComplaintError(error) },
      });
    }
  };

  const openOfficialHelp = async (action: ComplaintHandoffAction): Promise<void> => {
    setHandoffError(null);
    try {
      await openOfficialHandoffAction(action, {
        openBrowser: openSecureExternalPage,
        openCall: (url) => Linking.openURL(url),
      });
    } catch (error) {
      setHandoffError(
        action.kind === 'browser'
          ? getUserFacingInAppBrowserError(error)
          : t('officialPhoneOpenError'),
      );
    }
  };

  const confirmDiscardDraft = (): void => {
    Alert.alert(t('discardDraftTitle'), t('discardDraftBody'), [
      { style: 'cancel', text: t('keepEditing') },
      {
        onPress: () => {
          void capture
            .discardDraft()
            .then(() => router.replace('/home'))
            .catch(() => undefined);
        },
        style: 'destructive',
        text: t('discardDraft'),
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <Text style={styles.eyebrow}>{t('reportIssue').toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.formTitle}>
            {t(isOfficialHandoff ? 'officialHelpIssue' : 'completeComplaintForm')}
          </Text>
          <Text style={styles.help}>
            {t(isOfficialHandoff ? 'officialHelpFormHint' : 'onePageAutosaveHint')}
          </Text>
        </View>
        {!capture.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            {t('offlineReportNotice')}
          </Text>
        ) : null}
        {capture.state.error === null ? null : (
          <View style={styles.errorPanel}>
            <Text accessibilityRole="alert" style={styles.error}>
              {capture.state.error}
            </Text>
            {capture.state.error.includes('already submitted') ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/complaints')}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>{t('openComplaints')}</Text>
              </Pressable>
            ) : null}
            {capture.state.locationSettingsRequired ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openSettings()}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>{t('openLocationSettings')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        {capture.state.isBusy && capture.state.upload === null ? (
          <View accessibilityLiveRegion="polite" style={styles.busyCard}>
            <ActivityIndicator accessibilityElementsHidden color="#17683b" size="small" />
            <Text style={styles.busyText}>{t('updatingReport')}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>{t('issue').toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {t('categoryDetails')}
          </Text>
          <Text style={styles.help}>{t('categoryDetailsHint')}</Text>
          {capture.state.taxonomyItems.length === 0 ? (
            <View style={styles.options}>
              <Text accessibilityRole="alert" style={styles.warning}>
                {t('taxonomyUnavailable')}
              </Text>
              <SecondaryAction
                label={t('checkComplaintTypes')}
                onPress={() => void capture.reloadCategories().catch(() => undefined)}
              />
            </View>
          ) : (
            <View style={styles.options}>
              <TaxonomyDropdown
                disabled={capture.state.isBusy}
                label={t('primaryCategory')}
                onSelect={selectPrimaryCategory}
                options={primaryCategoryOptions.map((option) => ({
                  label: option.name,
                  value: option.code,
                }))}
                placeholder={t('selectPrimaryCategory')}
                value={selectedPrimaryCode}
              />
              <TaxonomyDropdown
                disabled={capture.state.isBusy || selectedPrimaryCode === null}
                label={t('complaintType')}
                onSelect={selectComplaintType}
                options={subcategoryOptions.map((item) => ({
                  description: item.subcategoryDescription ?? item.workflowType,
                  label: item.subcategoryName,
                  statusLabel:
                    item.submissionAvailability === 'available'
                      ? t('readyToSubmit')
                      : item.routingStatus === 'protected_handoff'
                        ? t('officialHelpAvailable')
                        : item.routingStatus === 'protected_pending'
                          ? t('protectedIntakePending')
                          : t('routingSetupPending'),
                  value: item.subcategoryCode,
                }))}
                placeholder={
                  selectedPrimaryCode === null ? t('choosePrimaryFirst') : t('selectSpecificIssue')
                }
                value={taxonomyItem?.subcategoryCode ?? null}
              />
            </View>
          )}
          {taxonomyItem === null ? null : (
            <View
              style={[
                styles.routingProfileCard,
                taxonomyItem.submissionAvailability === 'available'
                  ? styles.routingProfileReady
                  : taxonomyItem.routingStatus === 'protected_handoff'
                    ? styles.routingProfileHandoff
                    : styles.routingProfilePending,
              ]}
            >
              <View style={styles.routingProfileHeading}>
                <Text style={styles.routingProfileTitle}>
                  {formatComplaintWorkflowType(taxonomyItem.workflowType)}
                </Text>
                <Text
                  style={[
                    styles.routingProfileStatus,
                    taxonomyItem.submissionAvailability === 'available'
                      ? styles.routingProfileStatusReady
                      : taxonomyItem.routingStatus === 'protected_handoff'
                        ? styles.routingProfileStatusHandoff
                        : styles.routingProfileStatusPending,
                  ]}
                >
                  {taxonomyItem.submissionAvailability === 'available'
                    ? t('routeReady')
                    : taxonomyItem.routingStatus === 'protected_handoff'
                      ? t('officialHelp')
                      : taxonomyItem.routingStatus === 'protected_pending'
                        ? t('protectedIntakePending')
                        : t('routePending')}
                </Text>
              </View>
              <Text style={styles.routingProfileText}>
                {taxonomyItem.submissionAvailability === 'available'
                  ? t('routeReadyBody')
                  : taxonomyItem.routingStatus === 'protected_handoff'
                    ? t('officialPrivateChannelHint')
                    : taxonomyItem.routingStatus === 'protected_pending'
                      ? t('protectedIntakePreparing')
                      : t('inAppSubmissionUnavailable')}
              </Text>
            </View>
          )}
          {isOfficialHandoff && taxonomyItem ? (
            <View style={styles.officialHelpCard}>
              <Text accessibilityRole="header" style={styles.officialHelpTitle}>
                {t('officialHelp')}
              </Text>
              <Text style={styles.officialHelpText}>{t('officialHelpProtectedBody')}</Text>
              {taxonomyItem.handoffActions.map((action) => (
                <View key={action.key} style={styles.officialHelpAction}>
                  <View style={styles.officialHelpActionCopy}>
                    <Text style={styles.officialHelpActionTitle}>{action.label}</Text>
                    <Text style={styles.officialHelpActionDescription}>{action.description}</Text>
                  </View>
                  <Pressable
                    accessibilityHint={
                      action.kind === 'call' ? t('opensPhoneDialler') : t('opensOfficialPage')
                    }
                    accessibilityRole={action.kind === 'browser' ? 'link' : 'button'}
                    onPress={() => void openOfficialHelp(action)}
                    style={styles.officialHelpButton}
                  >
                    <Text style={styles.officialHelpButtonText}>
                      {t(action.kind === 'call' ? 'call' : 'open')}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {handoffError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {handoffError}
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              {category?.requiredAttributes.map((attribute) => (
                <View key={attribute} style={styles.fieldGroup}>
                  <Text style={styles.label}>{attribute.replaceAll('_', ' ')}</Text>
                  <TextInput
                    accessibilityLabel={attribute.replaceAll('_', ' ')}
                    editable={!capture.state.isBusy}
                    maxLength={500}
                    onChangeText={(value) =>
                      setAttributeEdit({
                        draftId: draft.id,
                        values: { ...desiredCustomAttributes, [attribute]: value },
                      })
                    }
                    placeholder={t('enterField', { field: attribute.replaceAll('_', ' ') })}
                    style={styles.input}
                    value={String(customAttributes[attribute] ?? '')}
                  />
                </View>
              ))}
              <Text style={styles.label}>{t('description')}</Text>
              <TextInput
                accessibilityLabel={t('complaintDescription')}
                editable={!capture.state.isBusy}
                maxLength={4_000}
                multiline
                onChangeText={(value) => setDescriptionEdit({ draftId: draft.id, value })}
                placeholder={t('descriptionPlaceholder')}
                style={styles.descriptionInput}
                textAlignVertical="top"
                value={description}
              />
              <View style={styles.autosaveRow}>
                <Text style={styles.counter}>{description.trim().length} / 4,000</Text>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.autosaveText,
                    detailsAutosave.status === 'error' && styles.autosaveError,
                  ]}
                >
                  {detailsAutosave.status === 'pending'
                    ? t('savingSoon')
                    : detailsAutosave.status === 'saving'
                      ? t('saving')
                      : detailsAutosave.status === 'error'
                        ? t('couldNotSave')
                        : t('saved')}
                </Text>
              </View>
              {detailsAutosave.status === 'error' ? (
                <SecondaryAction label={t('trySavingAgain')} onPress={detailsAutosave.retry} />
              ) : null}
            </>
          )}
        </View>

        {isOfficialHandoff ? null : (
          <>
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>{t('locationQuestion').toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {t('issueLocation')}
              </Text>
              <Text style={styles.help}>{t('issueLocationHint')}</Text>
              {draft.location === null ? (
                automaticLocationStatus === 'checking' ? (
                  <View accessibilityLiveRegion="polite" style={styles.locationStatusRow}>
                    <ActivityIndicator color="#17683b" size="small" />
                    <Text style={styles.muted}>{t('findingCurrentLocation')}</Text>
                  </View>
                ) : (
                  <Text style={styles.muted}>
                    {automaticLocationStatus === 'permission-required'
                      ? t('allowLocationContinue')
                      : t('currentLocationNeeded')}
                  </Text>
                )
              ) : (
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>
                    {locationEligible ? t('currentLocationConfirmed') : t('checkLocationAgain')}
                  </Text>
                  <Text style={styles.successText}>
                    {locationEligible ? t('closeEnoughToSubmit') : t('moveCloser')}
                  </Text>
                </View>
              )}
              {locationGuidanceKey === null ? null : (
                <Text accessibilityRole="alert" style={styles.warning}>
                  {t(locationGuidanceKey)}
                </Text>
              )}
              {locationRecoveryAction === null ? null : (
                <PrimaryAction
                  disabled={
                    capture.state.isBusy ||
                    !capture.state.isOnline ||
                    hasUnsavedDetails ||
                    category?.submissionAvailability !== 'available'
                  }
                  label={
                    locationRecoveryAction === 'capture'
                      ? t('tryCurrentLocationAgain')
                      : t('refreshLocation')
                  }
                  onPress={() => void automaticLocation.refresh().catch(() => undefined)}
                />
              )}
              {category?.requiresAsset === true && locationEligible ? (
                <View style={styles.subsection}>
                  <Text style={styles.label}>{t('affectedNearbyAsset')}</Text>
                  {capture.state.assetOptions.length === 0 ? (
                    <Text accessibilityRole="alert" style={styles.warning}>
                      {t('noNearbyAssets')}
                    </Text>
                  ) : (
                    <View style={styles.options}>
                      {capture.state.assetOptions.map((asset) => (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: selectedAsset?.id === asset.id,
                            disabled: capture.state.isBusy,
                          }}
                          disabled={capture.state.isBusy}
                          key={asset.id}
                          onPress={() => void capture.selectAsset(asset.id).catch(() => undefined)}
                          style={[
                            styles.option,
                            capture.state.isBusy && styles.disabledButton,
                            selectedAsset?.id === asset.id && styles.optionSelected,
                          ]}
                        >
                          <Text style={styles.optionTitle}>{asset.displayName}</Text>
                          <Text style={styles.optionDescription}>
                            {asset.assetTypeName} ·{' '}
                            {t('distanceMetersAway', {
                              distance: Math.round(asset.distanceMeters),
                            })}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <SecondaryAction
                    disabled={capture.state.isBusy}
                    label={t('refreshNearbyAssets')}
                    onPress={() => void capture.loadNearbyAssets().catch(() => undefined)}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>{t('evidence').toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {t('photoVideoVoice')}
              </Text>
              <Text style={styles.help}>{t('captureEvidencePrivate')}</Text>
              <View style={styles.requirementCard}>
                <Text style={styles.requirementTitle}>{t('requiredEvidence')}</Text>
                <Text style={styles.requirementText}>
                  {minimumMediaCount === 0
                    ? t('optionalEvidenceRequirement', { maximum: maximumMediaCount })
                    : t('requiredEvidenceRequirement', {
                        maximum: maximumMediaCount,
                        minimum: minimumMediaCount,
                      })}
                </Text>
                {category?.recommendedMediaKinds.length ? (
                  <Text style={styles.requirementText}>
                    {t('recommended')}: {category.recommendedMediaKinds.join(', ')}
                  </Text>
                ) : null}
              </View>
              <ComplaintEvidenceEntry
                disabled={
                  capture.state.isBusy ||
                  capture.state.upload !== null ||
                  !locationEligible ||
                  hasUnsavedDetails
                }
                onCaptured={capture.uploadMedia}
                photoVideoDisabled={finalizedEvidenceCount >= maximumMediaCount}
              />
              {capture.state.upload === null ? null : (
                <View style={styles.uploadCard}>
                  <Text style={styles.optionTitle}>{t('addingEvidence')}</Text>
                  <Text style={styles.help}>
                    {Math.round(capture.state.upload.progress * 100)}%
                  </Text>
                  {capture.state.upload.status === 'failed' ? (
                    <SecondaryAction
                      disabled={capture.state.isBusy}
                      label={t('retryUpload')}
                      onPress={() => void capture.retryPendingUpload()}
                    />
                  ) : null}
                </View>
              )}
              {draft.media.map((media) => (
                <View key={media.id} style={styles.mediaRow}>
                  <Text style={styles.optionTitle}>
                    {media.metadata.kind === 'voice'
                      ? t('voiceNote')
                      : media.metadata.kind === 'photo'
                        ? t('photo')
                        : t('video')}
                  </Text>
                  <Text style={styles.muted}>
                    {t(media.uploadStatus === 'finalized' ? 'ready' : 'processing')}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>{t('similarReports').toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {t('similarReports')}
              </Text>
              {capture.state.duplicateCheck === null ? (
                <Text style={styles.muted}>{t('similarReportsPendingHint')}</Text>
              ) : capture.state.duplicateCheck.suggestions.length > 0 ? (
                <>
                  <Text style={styles.help}>{t('duplicateReviewHint')}</Text>
                  {capture.state.duplicateCheck.suggestions.map((suggestion) => (
                    <View key={suggestion.complaintId} style={styles.option}>
                      <Text style={styles.optionTitle}>
                        {suggestion.categoryName} · {suggestion.complaintNumber}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {t('distanceSimilarity', {
                          distance: Math.round(suggestion.approximateDistanceMeters),
                          similarity: Math.round(suggestion.score * 100),
                        })}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: capture.state.duplicatesAcknowledged,
                      disabled: capture.state.isBusy,
                    }}
                    disabled={capture.state.isBusy}
                    onPress={() =>
                      capture.acknowledgeDuplicates(!capture.state.duplicatesAcknowledged)
                    }
                    style={[styles.checkboxRow, capture.state.isBusy && styles.disabledButton]}
                  >
                    <Text style={styles.checkbox}>
                      {capture.state.duplicatesAcknowledged ? '✓' : ''}
                    </Text>
                    <Text style={styles.checkboxText}>{t('duplicateAcknowledgement')}</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.successText}>{t('noSimilarReports')}</Text>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>{t('reviewReport').toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {t('reviewAndSubmit')}
              </Text>
              <ReviewRow
                label={t('primaryCategory')}
                value={taxonomyItem?.primaryName ?? t('notSelected')}
              />
              <ReviewRow
                label={t('complaintType')}
                value={taxonomyItem?.subcategoryName ?? t('notSelected')}
              />
              <ReviewRow label={t('description')} value={description.trim() || t('notProvided')} />
              <ReviewRow
                label={t('locationQuestion')}
                value={t(locationEligible ? 'confirmed' : 'needed')}
              />
              <ReviewRow
                label={t('evidence')}
                value={`${t('evidenceReadySummary', { count: finalizedEvidenceCount })}${
                  draft.media.some(
                    (media) =>
                      media.metadata.kind === 'voice' && media.uploadStatus === 'finalized',
                  )
                    ? ` · ${t('voiceAttached')}`
                    : ''
                }`}
              />
              {category?.requiresAsset === true ? (
                <ReviewRow
                  label={t('asset')}
                  value={selectedAsset?.displayName ?? t('notSelected')}
                />
              ) : null}
              <ReviewRow
                label={t('routing')}
                value={
                  taxonomyItem?.submissionAvailability === 'available'
                    ? t('routingByWard')
                    : taxonomyItem?.routingStatus === 'protected_pending'
                      ? t('privateIntakeUnavailable')
                      : t('notAvailableYet')
                }
              />

              {hasVoice ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: voiceDescriptionConfirmed,
                    disabled: capture.state.isBusy,
                  }}
                  disabled={capture.state.isBusy}
                  onPress={() =>
                    setConfirmedVoiceRevision(voiceDescriptionConfirmed ? null : reviewRevision)
                  }
                  style={[styles.checkboxRow, capture.state.isBusy && styles.disabledButton]}
                >
                  <Text style={styles.checkbox}>{voiceDescriptionConfirmed ? '✓' : ''}</Text>
                  <Text style={styles.checkboxText}>{t('voiceDescriptionAcknowledgement')}</Text>
                </Pressable>
              ) : null}

              {isEmergencyIssue ? (
                <View style={styles.emergencyCard}>
                  <Text style={styles.emergencyTitle}>{t('complaintsNotEmergency')}</Text>
                  <Text style={styles.emergencyText}>{t('emergencyNormalComplaintWarning')}</Text>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: capture.state.emergencyAcknowledged,
                      disabled: capture.state.isBusy,
                    }}
                    disabled={capture.state.isBusy}
                    onPress={() =>
                      capture.acknowledgeEmergency(!capture.state.emergencyAcknowledged)
                    }
                    style={[styles.checkboxRow, capture.state.isBusy && styles.disabledButton]}
                  >
                    <Text style={styles.checkbox}>
                      {capture.state.emergencyAcknowledged ? '✓' : ''}
                    </Text>
                    <Text style={styles.checkboxText}>{t('emergencyAcknowledgement')}</Text>
                  </Pressable>
                </View>
              ) : null}

              {submissionBlockers.length > 0 ? (
                <View accessibilityRole="alert" style={styles.blockerCard}>
                  <Text style={styles.blockerTitle}>{t('beforeSubmit')}</Text>
                  {submissionBlockers.map((blocker) => (
                    <Text key={blocker} style={styles.blockerText}>
                      • {t(submissionBlockerMessageKeys[blocker])}
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>{t('readyToSubmit')}</Text>
                  <Text style={styles.successText}>{t('serverFinalRoutingCheck')}</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: capture.state.isBusy }}
          disabled={capture.state.isBusy}
          onPress={confirmDiscardDraft}
          style={styles.discardButton}
        >
          <Text style={styles.discardText}>{t('discardDraftTitle')}</Text>
        </Pressable>
      </ScrollView>
      {isOfficialHandoff ? null : (
        <View style={styles.stickySubmit}>
          <Text accessibilityLiveRegion="polite" style={styles.stickyHint}>
            {submissionBlockers.length === 0
              ? t('readyToSend')
              : t('itemsLeft', { count: submissionBlockers.length })}
          </Text>
          <PrimaryAction
            disabled={submissionBlockers.length > 0 || capture.state.isBusy}
            label={t('submitComplaint')}
            loading={capture.state.isBusy && capture.state.upload === null}
            onPress={() => void submit()}
          />
        </View>
      )}
    </Screen>
  );
}

const PrimaryAction = ({
  disabled = false,
  label,
  loading = false,
  onPress,
}: Readonly<{ disabled?: boolean; label: string; loading?: boolean; onPress: () => void }>) => {
  const { t } = useLocalization();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={loading ? t('actionInProgress', { action: label }) : label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.primaryButton, isDisabled && styles.disabledButton]}
    >
      {loading ? (
        <ActivityIndicator accessibilityElementsHidden color="#ffffff" />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
};

const SecondaryAction = ({
  disabled = false,
  label,
  onPress,
}: Readonly<{ disabled?: boolean; label: string; onPress: () => void }>) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={[styles.secondaryButton, disabled && styles.disabledButton]}
  >
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>
);

const ReviewRow = ({ label, value }: Readonly<{ label: string; value: string }>) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  autosaveError: { color: '#b45309' },
  autosaveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  autosaveText: { color: '#4f6b59', fontSize: 13, fontWeight: '800' },
  blockerCard: {
    backgroundColor: '#fff8e8',
    borderColor: '#f2d38a',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  blockerText: { color: '#75520c', lineHeight: 20 },
  blockerTitle: { color: '#6f4c06', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  busyCard: {
    alignItems: 'center',
    backgroundColor: '#eef7f1',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  busyText: { color: '#24583a', fontWeight: '700' },
  checkbox: {
    borderColor: '#166534',
    borderRadius: 4,
    borderWidth: 2,
    color: '#166534',
    fontWeight: '900',
    height: 24,
    textAlign: 'center',
    width: 24,
  },
  checkboxRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, paddingVertical: 8 },
  checkboxText: { color: '#334155', flex: 1, lineHeight: 21 },
  content: { gap: 18, padding: 20, paddingBottom: 48 },
  counter: { color: '#64748b', fontSize: 13, textAlign: 'right' },
  descriptionInput: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    minHeight: 130,
    padding: 14,
  },
  disabledButton: { opacity: 0.45 },
  discardButton: { alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  discardText: { color: '#991b1b', fontWeight: '700' },
  emergencyCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fb923c',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  emergencyText: { color: '#7c2d12', lineHeight: 21 },
  emergencyTitle: { color: '#9a3412', fontSize: 18, fontWeight: '800' },
  error: {
    color: '#991b1b',
    lineHeight: 21,
  },
  errorPanel: { backgroundColor: '#fef2f2', borderRadius: 10, gap: 10, padding: 14 },
  eyebrow: { color: '#247047', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  fieldGroup: { gap: 7 },
  formHeader: { gap: 6, marginBottom: 2 },
  formSection: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e8e2',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 17,
  },
  formTitle: { color: '#14281d', fontSize: 22, fontWeight: '900' },
  help: { color: '#475569', lineHeight: 22 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '800' },
  locationStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  mediaRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  muted: { color: '#64748b', lineHeight: 21 },
  option: {
    backgroundColor: '#ffffff',
    borderColor: '#dce5df',
    borderRadius: 15,
    borderWidth: 1,
    gap: 4,
    padding: 15,
  },
  optionDescription: { color: '#64748b', lineHeight: 20 },
  optionSelected: { backgroundColor: '#eef9f1', borderColor: '#237345', borderWidth: 2 },
  optionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  options: { gap: 9 },
  officialHelpAction: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  officialHelpActionCopy: { flex: 1, gap: 3 },
  officialHelpActionDescription: { color: '#405a73', fontSize: 13, lineHeight: 18 },
  officialHelpActionTitle: { color: '#123f66', fontSize: 15, fontWeight: '900' },
  officialHelpButton: {
    alignItems: 'center',
    backgroundColor: '#0b6fa4',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 68,
    paddingHorizontal: 14,
  },
  officialHelpButtonText: { color: '#ffffff', fontWeight: '900' },
  officialHelpCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderRadius: 15,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  officialHelpText: { color: '#294d69', lineHeight: 20 },
  officialHelpTitle: { color: '#123f66', fontSize: 20, fontWeight: '900' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#16834a',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    padding: 13,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  reviewLabel: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  reviewRow: { backgroundColor: '#f8fafc', borderRadius: 9, gap: 4, padding: 12 },
  reviewValue: { color: '#1e293b', lineHeight: 21 },
  requirementCard: { backgroundColor: '#eef7f1', borderRadius: 12, gap: 5, padding: 14 },
  requirementText: { color: '#42614e', lineHeight: 20 },
  requirementTitle: { color: '#155d38', fontSize: 15, fontWeight: '800' },
  routingProfileCard: {
    borderRadius: 13,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  routingProfileHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  routingProfileHandoff: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  routingProfilePending: { backgroundColor: '#fff8ed', borderColor: '#fdba74' },
  routingProfileReady: { backgroundColor: '#effaf3', borderColor: '#86efac' },
  routingProfileStatus: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  routingProfileStatusHandoff: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  routingProfileStatusPending: { backgroundColor: '#ffedd5', color: '#9a3412' },
  routingProfileStatusReady: { backgroundColor: '#dcfce7', color: '#166534' },
  routingProfileText: { color: '#405a73', lineHeight: 19 },
  routingProfileTitle: { color: '#14281d', flex: 1, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#166534',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  secondaryButtonText: { color: '#166534', fontWeight: '800' },
  sectionLabel: { color: '#0b6fa4', fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  settingsButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  settingsButtonText: { color: '#166534', fontWeight: '800' },
  stickyHint: { color: '#5f7165', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  stickySubmit: {
    ...mobileTheme.shadow.floating,
    backgroundColor: '#ffffff',
    borderTopColor: '#dfe8e1',
    borderTopWidth: 1,
    gap: 7,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  subsection: { gap: 12, marginTop: 2 },
  successCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  successText: { color: '#166534', lineHeight: 21 },
  successTitle: { color: '#14532d', fontSize: 17, fontWeight: '800' },
  title: { color: '#14281d', fontSize: 18, fontWeight: '900' },
  uploadCard: { backgroundColor: '#eff6ff', borderRadius: 10, gap: 6, padding: 13 },
  warning: {
    backgroundColor: '#fff4e6',
    borderRadius: 10,
    color: '#b45309',
    lineHeight: 21,
    padding: 14,
  },
});
