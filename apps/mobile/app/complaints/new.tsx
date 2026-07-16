import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
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
  getDraftReadiness,
  getLocationRecaptureGuidance,
  getSelectedCategory,
  isLocationEvidenceEligible,
} from '../../src/complaints/capture-state';
import { useComplaintCapture } from '../../src/complaints/complaint-context';
import { ComplaintVoiceCapture } from '../../src/complaints/voice-capture';
import { ErrorScreen, LoadingScreen, Screen } from '../../src/ui/screen';

const stepLabels = {
  details: 'Issue details',
  duplicates: 'Similar reports',
  location: 'Verify location',
  media: 'Capture evidence',
  review: 'Review and submit',
  submitted: 'Receipt',
} as const;

const orderedSteps = ['details', 'location', 'media', 'duplicates', 'review', 'submitted'] as const;

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
  const readiness = getDraftReadiness(draft, category);
  const locationEligible = isLocationEvidenceEligible(draft.location);
  const selectedAsset =
    capture.state.assetOptions.find((asset) => asset.id === draft.assetId) ?? null;
  const stepNumber = orderedSteps.indexOf(capture.state.step) + 1;
  const progressWidth = `${Math.round((stepNumber / orderedSteps.length) * 100)}%` as const;
  const finalizedEvidenceCount = draft.media.filter(
    (media) =>
      media.uploadStatus === 'finalized' &&
      (media.metadata.kind === 'photo' || media.metadata.kind === 'video'),
  ).length;
  const minimumMediaCount = category?.minimumMediaCount ?? 1;
  const maximumMediaCount = category?.maximumMediaCount ?? 20;

  const saveDetails = async (): Promise<void> => {
    try {
      await capture.updateDetails({ customAttributes, description });
      await capture.goToStep('location');
    } catch {
      // Sanitized errors are rendered from provider state.
    }
  };

  const submit = async (): Promise<void> => {
    try {
      await capture.submit();
    } catch {
      // Sanitized errors are rendered from provider state.
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
        <View style={styles.progressHeader}>
          <View style={styles.progressCopy}>
            <Text style={styles.stepLabel}>{stepLabels[capture.state.step]}</Text>
            <Text style={styles.stepCount}>
              Step {stepNumber} of {orderedSteps.length}
            </Text>
          </View>
          <View
            accessibilityLabel="Complaint progress"
            accessibilityRole="progressbar"
            accessibilityValue={{
              max: orderedSteps.length,
              min: 1,
              now: stepNumber,
              text: `${stepLabels[capture.state.step]}, step ${stepNumber} of ${orderedSteps.length}`,
            }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
        {!capture.state.isOnline ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            You are offline. Your server draft reference is saved, but this step needs a connection.
          </Text>
        ) : null}
        {capture.state.error === null ? null : (
          <View style={styles.errorPanel}>
            <Text accessibilityRole="alert" style={styles.error}>
              {capture.state.error}
            </Text>
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

        {capture.state.step === 'details' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              What needs attention?
            </Text>
            <Text style={styles.help}>Only verified, currently routable categories are shown.</Text>
            {capture.state.categories.length === 0 ? (
              <View style={styles.options}>
                <Text accessibilityRole="alert" style={styles.warning}>
                  No verified operational categories are available. Placeholder categories are never
                  offered for submission.
                </Text>
                <SecondaryAction
                  label="Check for available categories"
                  onPress={() => void capture.reloadCategories().catch(() => undefined)}
                />
              </View>
            ) : (
              <View style={styles.options}>
                {capture.state.categories.map((candidate) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft.categoryId === candidate.id }}
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
                      draft.categoryId === candidate.id && styles.optionSelected,
                    ]}
                  >
                    <Text style={styles.optionTitle}>{candidate.name}</Text>
                    {candidate.description === null ? null : (
                      <Text style={styles.optionDescription}>{candidate.description}</Text>
                    )}
                    {candidate.isEmergency ? (
                      <Text style={styles.emergencyTag}>May involve immediate danger</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
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
                capture.state.isBusy || draft.categoryId === null || description.trim().length === 0
              }
              label="Save and verify location"
              loading={capture.state.isBusy}
              onPress={() => void saveDetails()}
            />
          </View>
        ) : null}

        {capture.state.step === 'location' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              Verify the issue location
            </Text>
            <Text style={styles.help}>
              Capture your current foreground location while you are physically at the issue.
              Precise coordinates stay private.
            </Text>
            {draft.location === null ? (
              <Text style={styles.muted}>No current location has been accepted.</Text>
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
              disabled={capture.state.isBusy || !capture.state.isOnline}
              label={draft.location === null ? 'Capture current location' : 'Capture again'}
              loading={capture.state.isBusy}
              onPress={() => void capture.captureLocation().catch(() => undefined)}
            />
            {category?.requiresAsset === true && locationEligible ? (
              <View style={styles.section}>
                <Text style={styles.label}>Select the affected nearby asset</Text>
                <Text style={styles.help}>
                  Only current, verified, routable assets and ownership records are offered.
                </Text>
                {capture.state.assetOptions.length === 0 ? (
                  <Text accessibilityRole="alert" style={styles.warning}>
                    No verified nearby assets were found. Capture the location again or refresh the
                    search. This report cannot advance without a verified asset.
                  </Text>
                ) : (
                  <View style={styles.options}>
                    {capture.state.assetOptions.map((asset) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedAsset?.id === asset.id }}
                        key={asset.id}
                        onPress={() => void capture.selectAsset(asset.id).catch(() => undefined)}
                        style={[
                          styles.option,
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
                  label="Refresh nearby assets"
                  onPress={() => void capture.loadNearbyAssets().catch(() => undefined)}
                />
              </View>
            ) : null}
            <SecondaryAction label="Back" onPress={() => void capture.goToStep('details')} />
            <PrimaryAction
              disabled={
                !locationEligible ||
                (category?.requiresAsset === true && selectedAsset === null) ||
                capture.state.isBusy
              }
              label="Continue to evidence"
              onPress={() => void capture.goToStep('media')}
            />
          </View>
        ) : null}

        {capture.state.step === 'media' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              Capture live evidence
            </Text>
            <Text style={styles.help}>
              Originals upload privately. Gallery files are intentionally excluded because this
              pilot requires live capture evidence.
            </Text>
            <View style={styles.requirementCard}>
              <Text style={styles.requirementTitle}>Evidence requirement</Text>
              <Text style={styles.requirementText}>
                {minimumMediaCount === 0
                  ? `Photo or video evidence is optional; up to ${maximumMediaCount} may be attached.`
                  : `${minimumMediaCount}–${maximumMediaCount} finalized photo or video ${minimumMediaCount === 1 ? 'item is' : 'items are'} required.`}
              </Text>
              {category?.recommendedMediaKinds.length ? (
                <Text style={styles.requirementText}>
                  Recommended: {category.recommendedMediaKinds.join(', ')}
                </Text>
              ) : null}
            </View>
            {isCameraOpen ? (
              <ComplaintCameraCapture
                onCancel={() => setIsCameraOpen(false)}
                onCaptured={capture.uploadMedia}
              />
            ) : (
              <PrimaryAction
                disabled={
                  capture.state.upload !== null ||
                  draft.location === null ||
                  finalizedEvidenceCount >= maximumMediaCount
                }
                label="Open camera"
                onPress={() => setIsCameraOpen(true)}
              />
            )}
            <ComplaintVoiceCapture
              disabled={capture.state.upload !== null || draft.location === null}
              onCaptured={capture.uploadMedia}
            />
            {capture.state.upload === null ? null : (
              <View style={styles.uploadCard}>
                <Text style={styles.optionTitle}>
                  Private upload: {capture.state.upload.status}
                </Text>
                <Text style={styles.help}>{Math.round(capture.state.upload.progress * 100)}%</Text>
                {capture.state.upload.status === 'failed' ? (
                  <SecondaryAction
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
            <SecondaryAction label="Back" onPress={() => void capture.goToStep('location')} />
            <PrimaryAction
              disabled={
                finalizedEvidenceCount < minimumMediaCount ||
                finalizedEvidenceCount > maximumMediaCount ||
                capture.state.upload !== null ||
                capture.state.isBusy
              }
              label="Check for similar reports"
              loading={capture.state.isBusy}
              onPress={() => void capture.checkDuplicates().catch(() => undefined)}
            />
          </View>
        ) : null}

        {capture.state.step === 'duplicates' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              Similar nearby reports
            </Text>
            {capture.state.duplicateCheck === null ? (
              <Text accessibilityRole="alert" style={styles.warning}>
                Similar-report checking has not completed. Return to evidence and try again.
              </Text>
            ) : capture.state.duplicateCheck.suggestions.length > 0 ? (
              <>
                <Text style={styles.help}>
                  These are suggestions only. Local Wellness never merges reports automatically.
                </Text>
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
                  accessibilityState={{ checked: capture.state.duplicatesAcknowledged }}
                  onPress={() =>
                    capture.acknowledgeDuplicates(!capture.state.duplicatesAcknowledged)
                  }
                  style={styles.checkboxRow}
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
            <SecondaryAction label="Back" onPress={() => void capture.goToStep('media')} />
            <PrimaryAction
              disabled={
                capture.state.duplicateCheck === null ||
                (capture.state.duplicateCheck.suggestions.length > 0 &&
                  !capture.state.duplicatesAcknowledged)
              }
              label="Continue to review"
              onPress={() => void capture.goToStep('review')}
            />
          </View>
        ) : null}

        {capture.state.step === 'review' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              Review your private report
            </Text>
            <ReviewRow label="Category" value={category?.name ?? 'Not selected'} />
            <ReviewRow label="Description" value={draft.description ?? 'Not provided'} />
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
            <ReviewRow label="Routing" value="Resolved securely by the server at submission" />

            {hasVoice ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: voiceDescriptionConfirmed }}
                onPress={() =>
                  setConfirmedVoiceRevision(voiceDescriptionConfirmed ? null : reviewRevision)
                }
                style={styles.checkboxRow}
              >
                <Text style={styles.checkbox}>{voiceDescriptionConfirmed ? '✓' : ''}</Text>
                <Text style={styles.checkboxText}>
                  I typed and reviewed the description. Automatic transcription was not performed.
                </Text>
              </Pressable>
            ) : null}

            {category?.isEmergency === true ? (
              <View style={styles.emergencyCard}>
                <Text style={styles.emergencyTitle}>This is not emergency dispatch</Text>
                <Text style={styles.emergencyText}>
                  Call 112 immediately if anyone is in danger. A normal complaint does not guarantee
                  emergency response.
                </Text>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: capture.state.emergencyAcknowledged }}
                  onPress={() => capture.acknowledgeEmergency(!capture.state.emergencyAcknowledged)}
                  style={styles.checkboxRow}
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

            {!readiness.isReady ? (
              <Text accessibilityRole="alert" style={styles.warning}>
                Missing: {readiness.missing.join(', ')}
              </Text>
            ) : null}
            <SecondaryAction label="Back" onPress={() => void capture.goToStep('duplicates')} />
            <PrimaryAction
              disabled={
                !readiness.isReady ||
                (hasVoice && !voiceDescriptionConfirmed) ||
                ((capture.state.duplicateCheck?.suggestions.length ?? 0) > 0 &&
                  !capture.state.duplicatesAcknowledged) ||
                (category?.isEmergency === true && !capture.state.emergencyAcknowledged) ||
                capture.state.isBusy ||
                !capture.state.isOnline
              }
              label="Submit complaint"
              loading={capture.state.isBusy}
              onPress={() => void submit()}
            />
          </View>
        ) : null}

        {capture.state.step === 'submitted' && capture.state.receipt ? (
          <View style={styles.section}>
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
        ) : null}

        {capture.state.step !== 'submitted' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: capture.state.isBusy }}
            disabled={capture.state.isBusy}
            onPress={confirmDiscardDraft}
            style={styles.discardButton}
          >
            <Text style={styles.discardText}>Discard this draft</Text>
          </Pressable>
        ) : null}
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

const SecondaryAction = ({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
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
  emergencyTag: { color: '#c2410c', fontSize: 13, fontWeight: '800' },
  emergencyText: { color: '#7c2d12', lineHeight: 21 },
  emergencyTitle: { color: '#9a3412', fontSize: 18, fontWeight: '800' },
  error: {
    color: '#991b1b',
    lineHeight: 21,
  },
  errorPanel: { backgroundColor: '#fef2f2', borderRadius: 10, gap: 10, padding: 14 },
  fieldGroup: { gap: 7 },
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
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  optionDescription: { color: '#64748b', lineHeight: 20 },
  optionSelected: { backgroundColor: '#ecfdf5', borderColor: '#166534', borderWidth: 2 },
  optionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  options: { gap: 10 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
    padding: 13,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  progressCopy: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressFill: { backgroundColor: '#16a34a', borderRadius: 99, height: 6 },
  progressHeader: { gap: 10 },
  progressTrack: { backgroundColor: '#dcfce7', borderRadius: 99, height: 6, overflow: 'hidden' },
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
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  secondaryButtonText: { color: '#166534', fontWeight: '800' },
  section: { gap: 14 },
  settingsButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  settingsButtonText: { color: '#166534', fontWeight: '800' },
  stepLabel: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepCount: { color: '#64748b', fontSize: 13, fontWeight: '700' },
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
  warning: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    color: '#92400e',
    lineHeight: 21,
    padding: 14,
  },
});
