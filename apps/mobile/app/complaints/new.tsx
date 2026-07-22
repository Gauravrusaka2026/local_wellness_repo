import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { ComplaintCameraCapture } from '../../src/complaints/camera-capture';
import {
  complaintSubmissionBlockerMessages,
  getComplaintSubmissionBlockers,
  getDraftReadiness,
  getLocationRecaptureGuidance,
  getSelectedCategory,
  hasUnsavedComplaintDetails,
  isLocationEvidenceEligible,
} from '../../src/complaints/capture-state';
import { useComplaintCapture } from '../../src/complaints/complaint-context';
import { ComplaintVoiceCapture } from '../../src/complaints/voice-capture';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

export default function NewComplaintScreen() {
  const auth = useAuth();
  const capture = useComplaintCapture();
  const router = useRouter();
  const draft = capture.state.draft;
  const [descriptionEdit, setDescriptionEdit] = useState<
    Readonly<{ draftId: string | null; value: string }>
  >({ draftId: draft?.id ?? null, value: draft?.description ?? '' });
  const [attributeEdit, setAttributeEdit] = useState<
    Readonly<{ draftId: string | null; values: Record<string, boolean | number | string> }>
  >({ draftId: draft?.id ?? null, values: draft?.customAttributes ?? {} });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const hasVoice =
    draft?.media.some(
      (media) => media.metadata.kind === 'voice' && media.uploadStatus === 'finalized',
    ) ?? false;
  const description =
    descriptionEdit.draftId === draft?.id ? descriptionEdit.value : (draft?.description ?? '');
  const customAttributes =
    attributeEdit.draftId === draft?.id ? attributeEdit.values : (draft?.customAttributes ?? {});
  const reviewRevision =
    draft === null
      ? null
      : `${draft.description ?? ''}:${draft.media.map((media) => media.id).join(',')}`;
  const [confirmedVoiceRevision, setConfirmedVoiceRevision] = useState<string | null>(null);
  const voiceDescriptionConfirmed =
    reviewRevision !== null && confirmedVoiceRevision === reviewRevision;
  const resultRedirected = useRef(false);

  useEffect(() => {
    const receipt = capture.state.receipt;
    if (receipt === null || resultRedirected.current) return;
    resultRedirected.current = true;
    router.replace({
      pathname: '/complaints/result',
      params: { complaintId: receipt.id, number: receipt.complaintNumber, status: 'success' },
    });
  }, [capture.state.receipt, router]);

  if (auth.state.status === 'loading') return <LoadingScreen label="Restoring your session…" />;
  if (auth.state.status === 'configuration-error') {
    return <ErrorScreen message={auth.state.message} title="App configuration required" />;
  }
  if (auth.state.status === 'signed-out') return <Redirect href="/auth" />;
  if (auth.state.status === 'mfa-required') return <Redirect href="/auth/phone-verification" />;
  if (capture.state.isBusy && draft === null) return <LoadingScreen label="Loading your draft…" />;
  if (draft === null) {
    return (
      <ErrorScreen
        action={{ label: 'Return home', onPress: () => router.replace('/home') }}
        message="Start or resume a complaint from the home screen."
        title="No active report"
      />
    );
  }

  const category = getSelectedCategory(capture.state);
  const availableCategoryCount = capture.state.categories.filter(
    (candidate) => candidate.submissionAvailability === 'available',
  ).length;
  const readiness = getDraftReadiness(draft, category);
  const locationEligible = isLocationEvidenceEligible(draft.location);
  const selectedAsset =
    capture.state.assetOptions.find((asset) => asset.id === draft.assetId) ?? null;
  const finalizedEvidenceCount = draft.media.filter(
    (media) =>
      media.uploadStatus === 'finalized' &&
      (media.metadata.kind === 'photo' || media.metadata.kind === 'video'),
  ).length;
  const minimumMediaCount = category?.minimumMediaCount ?? 1;
  const maximumMediaCount = category?.maximumMediaCount ?? 20;
  const hasUnsavedDetails = hasUnsavedComplaintDetails(draft, {
    customAttributes,
    description,
  });
  const hasSelectedRequiredAsset = category?.requiresAsset !== true || selectedAsset !== null;
  const canCheckDuplicates =
    readiness.isReady &&
    !hasUnsavedDetails &&
    hasSelectedRequiredAsset &&
    capture.state.upload === null &&
    capture.state.isOnline &&
    !capture.state.isBusy;
  const submissionBlockers = getComplaintSubmissionBlockers({
    assetOptions: capture.state.assetOptions,
    category,
    draft,
    duplicateCheck: capture.state.duplicateCheck,
    duplicatesAcknowledged: capture.state.duplicatesAcknowledged,
    emergencyAcknowledged: capture.state.emergencyAcknowledged,
    hasUnsavedDetails,
    hasVoice,
    isOnline: capture.state.isOnline,
    upload: capture.state.upload,
    voiceDescriptionConfirmed,
  });
  const reportProgress = [
    { key: 'evidence', label: 'Evidence', complete: finalizedEvidenceCount >= minimumMediaCount },
    { key: 'location', label: 'Location', complete: locationEligible },
    { key: 'category', label: 'Category', complete: category !== null },
    { key: 'description', label: 'Details', complete: description.trim().length > 0 },
    { key: 'review', label: 'Review', complete: submissionBlockers.length === 0 },
  ] as const;
  const completedReportSteps = reportProgress.filter((step) => step.complete).length;

  const saveDetails = async (): Promise<void> => {
    try {
      await capture.updateDetails({ customAttributes, description });
    } catch {
      // Sanitized errors are rendered from provider state.
    }
  };

  const submit = async (): Promise<void> => {
    try {
      await capture.submit();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not submit this report.';
      router.replace({ pathname: '/complaints/result', params: { status: 'failure', message } });
    }
  };

  const confirmDiscardDraft = (): void => {
    Alert.alert(
      'Discard this draft?',
      'This permanently removes the saved report and its pending evidence.',
      [
        { style: 'cancel', text: 'Keep editing' },
        {
          onPress: () => {
            void capture
              .discardDraft()
              .then(() => router.replace('/home'))
              .catch(() => undefined);
          },
          style: 'destructive',
          text: 'Discard draft',
        },
      ],
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <Text style={styles.eyebrow}>REPORT AN ISSUE</Text>
          <Text accessibilityRole="header" style={styles.formTitle}>
            Complete one complaint form
          </Text>
          <Text style={styles.help}>Add the issue, location and evidence below.</Text>
          <View
            accessibilityLabel={`Report progress: ${completedReportSteps} of ${reportProgress.length} sections complete`}
            accessibilityRole="progressbar"
            accessibilityValue={{ max: reportProgress.length, min: 0, now: completedReportSteps }}
            style={styles.progressRail}
          >
            {reportProgress.map((step) => (
              <View key={step.key} style={styles.progressItem}>
                <View style={[styles.progressDot, step.complete && styles.progressDotComplete]}>
                  <Text style={styles.progressDotText}>{step.complete ? '✓' : ''}</Text>
                </View>
                <Text style={[styles.progressLabel, step.complete && styles.progressLabelComplete]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {!capture.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            You are offline. Reconnect to save or submit.
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
                <Text style={styles.settingsButtonText}>Open Your complaints</Text>
              </Pressable>
            ) : null}
            {capture.state.locationSettingsRequired ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openSettings()}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>Open location settings</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        {capture.state.isBusy && capture.state.upload === null ? (
          <View accessibilityLiveRegion="polite" style={styles.busyCard}>
            <ActivityIndicator accessibilityElementsHidden color="#17683b" size="small" />
            <Text style={styles.busyText}>Updating report…</Text>
          </View>
        ) : null}

        {capture.state.step === 'submitted' && capture.state.receipt ? (
          <View style={styles.formSection}>
            <Text accessibilityRole="header" style={styles.title}>
              Complaint received
            </Text>
            <View style={styles.successCard}>
              <Text style={styles.receiptNumber}>{capture.state.receipt.complaintNumber}</Text>
              <Text style={styles.successText}>
                Status: {capture.state.receipt.status.replaceAll('_', ' ')}
              </Text>
              <Text style={styles.successText}>
                Routing: {capture.state.receipt.routing.status.replaceAll('_', ' ')}
              </Text>
            </View>
            <PrimaryAction
              label="View complaint"
              onPress={() => router.replace(`/complaints/${capture.state.receipt?.id}`)}
            />
            <SecondaryAction label="Return home" onPress={() => router.replace('/home')} />
          </View>
        ) : (
          <>
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>ISSUE</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Category and details
              </Text>
              <Text style={styles.help}>Choose the closest category.</Text>
              {capture.state.categories.length === 0 ? (
                <View style={styles.options}>
                  <Text accessibilityRole="alert" style={styles.warning}>
                    Complaint categories are unavailable. Try again shortly.
                  </Text>
                  <SecondaryAction
                    label="Check for available categories"
                    onPress={() => void capture.reloadCategories().catch(() => undefined)}
                  />
                </View>
              ) : (
                <View style={styles.options}>
                  {capture.state.categories.map((candidate) => {
                    const isAvailable = candidate.submissionAvailability === 'available';
                    return (
                      <Pressable
                        accessibilityHint={
                          isAvailable
                            ? `${candidate.description ?? candidate.name}. Select this category.`
                            : `${candidate.description ?? candidate.name}. Verified routing is unavailable.`
                        }
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: draft.categoryId === candidate.id,
                          disabled: !isAvailable || capture.state.isBusy,
                        }}
                        disabled={!isAvailable || capture.state.isBusy}
                        key={candidate.id}
                        onPress={() => {
                          if (candidate.id === draft.categoryId) return;
                          setAttributeEdit({ draftId: draft.id, values: {} });
                          void capture
                            .updateDetails({ categoryId: candidate.id, customAttributes: {} })
                            .catch(() => undefined);
                        }}
                        style={[
                          styles.option,
                          !isAvailable && styles.optionUnavailable,
                          draft.categoryId === candidate.id && styles.optionSelected,
                        ]}
                      >
                        <View style={styles.optionHeading}>
                          <Text
                            style={[
                              styles.optionTitle,
                              styles.optionTitleFlexible,
                              !isAvailable && styles.unavailableText,
                            ]}
                          >
                            {candidate.name}
                          </Text>
                          <View style={styles.optionBadges}>
                            {!isAvailable ? (
                              <Text style={styles.unavailableTag}>Routing unavailable</Text>
                            ) : null}
                            {candidate.isEmergency ? (
                              <Text style={styles.emergencyTag}>Urgent risk</Text>
                            ) : null}
                            {draft.categoryId === candidate.id ? (
                              <Text accessibilityLabel="Selected" style={styles.selectedMark}>
                                ✓
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {capture.state.categories.length > 0 &&
              availableCategoryCount < capture.state.categories.length ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>
                    {availableCategoryCount} of {capture.state.categories.length} categories
                    available
                  </Text>
                  <Text style={styles.infoText}>
                    Ward lookup and category availability are separate. Disabled categories are not
                    enabled for verified submission. The server checks the exact local route when
                    you submit.
                  </Text>
                </View>
              ) : null}
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
                        values: { ...customAttributes, [attribute]: value },
                      })
                    }
                    placeholder={`Enter ${attribute.replaceAll('_', ' ')}`}
                    style={styles.input}
                    value={String(customAttributes[attribute] ?? '')}
                  />
                </View>
              ))}
              <Text style={styles.label}>Description</Text>
              <TextInput
                accessibilityLabel="Complaint description"
                editable={!capture.state.isBusy}
                maxLength={4_000}
                multiline
                onChangeText={(value) => setDescriptionEdit({ draftId: draft.id, value })}
                placeholder="Describe what you can see and why it needs attention."
                style={styles.descriptionInput}
                textAlignVertical="top"
                value={description}
              />
              <Text style={styles.counter}>{description.trim().length} / 4,000</Text>
              <PrimaryAction
                disabled={
                  capture.state.isBusy ||
                  category?.submissionAvailability !== 'available' ||
                  description.trim().length === 0 ||
                  !hasUnsavedDetails
                }
                label={hasUnsavedDetails ? 'Save issue details' : 'Details saved'}
                onPress={() => void saveDetails()}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>LOCATION</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Issue location
              </Text>
              <Text style={styles.help}>Capture your location while standing near the issue.</Text>
              {draft.location === null ? (
                <Text style={styles.muted}>Location not captured</Text>
              ) : (
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>
                    {locationEligible ? 'Location evidence accepted' : 'Location needs recapture'}
                  </Text>
                  <Text style={styles.successText}>
                    Accuracy: {Math.round(draft.location.accuracyMeters)} m · Server status:{' '}
                    {draft.location.verificationStatus.replaceAll('_', ' ')}
                  </Text>
                </View>
              )}
              {getLocationRecaptureGuidance(draft.location) === null ? null : (
                <Text accessibilityRole="alert" style={styles.warning}>
                  {getLocationRecaptureGuidance(draft.location)}
                </Text>
              )}
              <PrimaryAction
                disabled={
                  capture.state.isBusy ||
                  !capture.state.isOnline ||
                  category?.submissionAvailability !== 'available'
                }
                label={draft.location === null ? 'Capture current location' : 'Capture again'}
                onPress={() => void capture.captureLocation().catch(() => undefined)}
              />
              {category?.requiresAsset === true && locationEligible ? (
                <View style={styles.subsection}>
                  <Text style={styles.label}>Select the affected nearby asset</Text>
                  {capture.state.assetOptions.length === 0 ? (
                    <Text accessibilityRole="alert" style={styles.warning}>
                      No verified nearby assets found. Refresh or capture the location again.
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
                            {asset.assetTypeName} · about {Math.round(asset.distanceMeters)} m away
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <SecondaryAction
                    disabled={capture.state.isBusy}
                    label="Refresh nearby assets"
                    onPress={() => void capture.loadNearbyAssets().catch(() => undefined)}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>EVIDENCE</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Photo, video or voice
              </Text>
              <Text style={styles.help}>Capture evidence now. Originals stay private.</Text>
              <View style={styles.requirementCard}>
                <Text style={styles.requirementTitle}>Required evidence</Text>
                <Text style={styles.requirementText}>
                  {minimumMediaCount === 0
                    ? `Photo or video optional · maximum ${maximumMediaCount}`
                    : `${minimumMediaCount}–${maximumMediaCount} finalized photo/video ${minimumMediaCount === 1 ? 'item' : 'items'}`}
                </Text>
                {category?.recommendedMediaKinds.length ? (
                  <Text style={styles.requirementText}>
                    Recommended: {category.recommendedMediaKinds.join(', ')}
                  </Text>
                ) : null}
              </View>
              {isCameraOpen ? (
                <ComplaintCameraCapture
                  disabled={capture.state.isBusy}
                  onCancel={() => setIsCameraOpen(false)}
                  onCaptured={capture.uploadMedia}
                />
              ) : (
                <PrimaryAction
                  disabled={
                    capture.state.isBusy ||
                    capture.state.upload !== null ||
                    !locationEligible ||
                    finalizedEvidenceCount >= maximumMediaCount
                  }
                  label="Open camera"
                  onPress={() => setIsCameraOpen(true)}
                />
              )}
              <ComplaintVoiceCapture
                disabled={
                  capture.state.isBusy || capture.state.upload !== null || !locationEligible
                }
                onCaptured={capture.uploadMedia}
              />
              {capture.state.upload === null ? null : (
                <View style={styles.uploadCard}>
                  <Text style={styles.optionTitle}>
                    Private upload: {capture.state.upload.status}
                  </Text>
                  <Text style={styles.help}>
                    {Math.round(capture.state.upload.progress * 100)}%
                  </Text>
                  {capture.state.upload.status === 'failed' ? (
                    <SecondaryAction
                      disabled={capture.state.isBusy}
                      label="Retry upload"
                      onPress={() => void capture.retryPendingUpload()}
                    />
                  ) : null}
                </View>
              )}
              {draft.media.map((media) => (
                <View key={media.id} style={styles.mediaRow}>
                  <Text style={styles.optionTitle}>{media.metadata.kind}</Text>
                  <Text style={styles.muted}>
                    {media.uploadStatus} · {media.processingStatus}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>SIMILAR REPORTS</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Check similar reports (optional)
              </Text>
              {capture.state.duplicateCheck === null ? (
                <Text style={styles.muted}>
                  You can check for nearby reports or submit without checking.
                </Text>
              ) : capture.state.duplicateCheck.suggestions.length > 0 ? (
                <>
                  <Text style={styles.help}>Review these before creating another report.</Text>
                  {capture.state.duplicateCheck.suggestions.map((suggestion) => (
                    <View key={suggestion.complaintId} style={styles.option}>
                      <Text style={styles.optionTitle}>
                        {suggestion.categoryName} · {suggestion.complaintNumber}
                      </Text>
                      <Text style={styles.optionDescription}>
                        About {Math.round(suggestion.approximateDistanceMeters)} m away ·{' '}
                        {Math.round(suggestion.score * 100)}% similarity
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
                    <Text style={styles.checkboxText}>
                      I reviewed these suggestions and still want to submit a separate report.
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.successText}>No similar reports were suggested.</Text>
              )}
              <PrimaryAction
                disabled={!canCheckDuplicates}
                label={
                  capture.state.duplicateCheck === null ? 'Check similar reports' : 'Check again'
                }
                onPress={() => void capture.checkDuplicates().catch(() => undefined)}
              />
              {!canCheckDuplicates && capture.state.duplicateCheck === null ? (
                <Text style={styles.compactHint}>
                  Save the details, location and required evidence first.
                </Text>
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>REVIEW</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Review and submit
              </Text>
              <ReviewRow label="Category" value={category?.name ?? 'Not selected'} />
              <ReviewRow label="Description" value={description.trim() || 'Not provided'} />
              <ReviewRow
                label="Location"
                value={
                  draft.location === null
                    ? 'Missing'
                    : `${Math.round(draft.location.accuracyMeters)} m accuracy`
                }
              />
              <ReviewRow
                label="Evidence"
                value={`${finalizedEvidenceCount} photo/video ready${draft.media.some((media) => media.metadata.kind === 'voice' && media.uploadStatus === 'finalized') ? ' · voice note attached' : ''}`}
              />
              {category?.requiresAsset === true ? (
                <ReviewRow label="Asset" value={selectedAsset?.displayName ?? 'Not selected'} />
              ) : null}
              <ReviewRow label="Routing" value="Verified by the server at submission" />

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
                  <Text style={styles.checkboxText}>
                    I typed and reviewed the voice-note description.
                  </Text>
                </Pressable>
              ) : null}

              {category?.isEmergency === true ? (
                <View style={styles.emergencyCard}>
                  <Text style={styles.emergencyTitle}>This is not emergency dispatch</Text>
                  <Text style={styles.emergencyText}>
                    Call 112 immediately if anyone is in danger. A normal complaint does not
                    guarantee emergency response.
                  </Text>
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
                    <Text style={styles.checkboxText}>
                      I understand and still want to submit a civic complaint.
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {submissionBlockers.length > 0 ? (
                <View accessibilityRole="alert" style={styles.blockerCard}>
                  <Text style={styles.blockerTitle}>Before you submit</Text>
                  {submissionBlockers.map((blocker) => (
                    <Text key={blocker} style={styles.blockerText}>
                      • {complaintSubmissionBlockerMessages[blocker]}
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>Ready to submit</Text>
                  <Text style={styles.successText}>
                    The server will verify routing one final time.
                  </Text>
                </View>
              )}
              <PrimaryAction
                disabled={submissionBlockers.length > 0 || capture.state.isBusy}
                label="Submit complaint"
                onPress={() => void submit()}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: capture.state.isBusy }}
              disabled={capture.state.isBusy}
              onPress={confirmDiscardDraft}
              style={styles.discardButton}
            >
              <Text style={styles.discardText}>Discard this draft</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const PrimaryAction = ({
  disabled = false,
  label,
  loading = false,
  onPress,
}: Readonly<{ disabled?: boolean; label: string; loading?: boolean; onPress: () => void }>) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={loading ? `${label} in progress` : label}
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
  compactHint: { color: '#64748b', fontSize: 13, lineHeight: 18, textAlign: 'center' },
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
  emergencyTag: {
    backgroundColor: '#fff1e8',
    borderRadius: 999,
    color: '#b54716',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  formTitle: { color: '#14281d', fontSize: 29, fontWeight: '900' },
  help: { color: '#475569', lineHeight: 22 },
  infoCard: { backgroundColor: '#eef5ff', borderRadius: 13, gap: 5, padding: 13 },
  infoText: { color: '#405a73', fontSize: 13, lineHeight: 19 },
  infoTitle: { color: '#244e72', fontSize: 14, fontWeight: '900' },
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
  optionBadges: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  optionDescription: { color: '#64748b', lineHeight: 20 },
  optionHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  optionSelected: { backgroundColor: '#eef9f1', borderColor: '#237345', borderWidth: 2 },
  optionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  optionTitleFlexible: { flex: 1 },
  optionUnavailable: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', opacity: 0.8 },
  options: { gap: 9 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#16834a',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    padding: 13,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  progressDot: {
    alignItems: 'center',
    backgroundColor: '#eef2f0',
    borderColor: '#c9d8d0',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  progressDotComplete: { backgroundColor: '#17683b', borderColor: '#17683b' },
  progressDotText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  progressItem: { alignItems: 'center', flex: 1, gap: 4 },
  progressLabel: { color: '#64756b', fontSize: 11, fontWeight: '700' },
  progressLabelComplete: { color: '#17683b' },
  progressRail: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  receiptNumber: { color: '#14532d', fontSize: 25, fontWeight: '900' },
  reviewLabel: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  reviewRow: { backgroundColor: '#f8fafc', borderRadius: 9, gap: 4, padding: 12 },
  reviewValue: { color: '#1e293b', lineHeight: 21 },
  requirementCard: { backgroundColor: '#eef7f1', borderRadius: 12, gap: 5, padding: 14 },
  requirementText: { color: '#42614e', lineHeight: 20 },
  requirementTitle: { color: '#155d38', fontSize: 15, fontWeight: '800' },
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
  title: { color: '#14281d', fontSize: 27, fontWeight: '900' },
  uploadCard: { backgroundColor: '#eff6ff', borderRadius: 10, gap: 6, padding: 13 },
  selectedMark: { color: '#17683b', fontSize: 18, fontWeight: '900' },
  unavailableTag: {
    backgroundColor: '#eef1ef',
    borderRadius: 999,
    color: '#6b766e',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  unavailableText: { color: '#64748b' },
  warning: {
    backgroundColor: '#fff4e6',
    borderRadius: 10,
    color: '#b45309',
    lineHeight: 21,
    padding: 14,
  },
});
