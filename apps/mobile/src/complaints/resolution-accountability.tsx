import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  ComplaintAccountabilityEvidence,
  ComplaintLocationCapture,
  ComplaintReopenEvidenceUploadIntent,
  ComplaintReopenEvidenceFinalization,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionOutcome,
  ComplaintResolutionRatings,
  CreateComplaintReopenEvidenceUploadIntentInput,
  FinalizeComplaintReopenEvidenceInput,
} from '@local-wellness/types';

import {
  getUserFacingInAppBrowserError,
  InAppBrowserError,
  openSecureExternalPage,
} from '../device/in-app-browser';
import { useLocalization } from '../ui/localization';
import {
  retainStableComplaintMutationIdentity,
  type StableComplaintMutationIdentity,
} from './accountability-idempotency';
import { ComplaintCameraCapture } from './camera-capture';
import {
  createComplaintReopenEvidenceUploadIntent,
  finalizeComplaintReopenEvidence,
  getComplaintEvidenceAccess,
  getComplaintResolutionContext,
  getUserFacingComplaintError,
  reopenComplaint,
  submitComplaintResolutionFeedback,
} from './complaint-service';
import {
  deletePreparedMedia,
  uploadPreparedMedia,
  type PreparedComplaintMedia,
} from './media-service';
import {
  buildReopenEvidenceUploadIntentInput,
  createRatingValues,
  getFinalizedReopenEvidenceIds,
} from './reopen-evidence';
import {
  buildCitizenAccountabilityHistory,
  shouldRefreshResolutionAccountability,
  type ResolutionAccountabilityRefreshCursor,
} from './resolution-accountability-view';

const ratingKeys = ['satisfaction', 'speed', 'quality', 'communication'] as const;

const toCompleteRatings = (
  ratings: Partial<ComplaintResolutionRatings>,
): ComplaintResolutionRatings | null => {
  const { communication, quality, satisfaction, speed } = ratings;
  if (
    communication === undefined ||
    quality === undefined ||
    satisfaction === undefined ||
    speed === undefined
  ) {
    return null;
  }
  return { communication, quality, satisfaction, speed };
};

type ContextState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; value: ComplaintResolutionContext }>;

type PendingEvidenceUpload = Readonly<{
  captureLocation: ComplaintLocationCapture;
  finalizeIdentity?: StableComplaintMutationIdentity | undefined;
  finalizeInput?: FinalizeComplaintReopenEvidenceInput | undefined;
  input: CreateComplaintReopenEvidenceUploadIntentInput;
  intent?: ComplaintReopenEvidenceUploadIntent | undefined;
  media: PreparedComplaintMedia;
  uploadIdentity: StableComplaintMutationIdentity;
}>;

const readableCode = (value: string): string => value.replaceAll('_', ' ');

export const ResolutionAccountability = ({
  accessToken,
  complaintId,
  onChanged,
  refreshSignal,
}: Readonly<{
  accessToken: string;
  complaintId: string;
  onChanged: () => Promise<void>;
  refreshSignal: number;
}>) => {
  const { formatDateTime, t } = useLocalization();
  const [state, setState] = useState<ContextState>({ status: 'loading' });
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [evidenceAccessError, setEvidenceAccessError] = useState<string | null>(null);
  const [feedbackOutcome, setFeedbackOutcome] = useState<ComplaintResolutionOutcome | null>(null);
  const [ratings, setRatings] = useState<Partial<ComplaintResolutionRatings>>({});
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackConfirmed, setFeedbackConfirmed] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [reopenReason, setReopenReason] = useState<string | null>(null);
  const [reopenExplanation, setReopenExplanation] = useState('');
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [isCapturingEvidence, setIsCapturingEvidence] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidenceUpload | null>(null);
  const [finalizedEvidenceIds, setFinalizedEvidenceIds] = useState<string[]>([]);
  const activeLoadRef = useRef(0);
  const contextRef = useRef<ComplaintResolutionContext | null>(null);
  const workflowVersionRef = useRef(1);
  const isMountedRef = useRef(true);
  const pendingEvidenceRef = useRef<PendingEvidenceUpload | null>(null);
  const feedbackIdentityRef = useRef<StableComplaintMutationIdentity | null>(null);
  const reopenIdentityRef = useRef<StableComplaintMutationIdentity | null>(null);
  const refreshCursorRef = useRef<ResolutionAccountabilityRefreshCursor>({
    complaintId,
    signal: refreshSignal,
  });

  const rememberPendingEvidence = useCallback((pending: PendingEvidenceUpload | null): void => {
    pendingEvidenceRef.current = pending;
    if (isMountedRef.current) setPendingEvidence(pending);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const sequence = ++activeLoadRef.current;
    try {
      const context = await getComplaintResolutionContext(accessToken, complaintId);
      if (!isMountedRef.current || sequence !== activeLoadRef.current) return;
      contextRef.current = context;
      workflowVersionRef.current = context.workflowVersion;
      setFinalizedEvidenceIds(getFinalizedReopenEvidenceIds(context.availableReopenEvidence));
      setState({ status: 'ready', value: context });
    } catch (error) {
      if (!isMountedRef.current || sequence !== activeLoadRef.current) return;
      setState({ message: getUserFacingComplaintError(error), status: 'error' });
    }
  }, [accessToken, complaintId]);

  useEffect(() => {
    isMountedRef.current = true;
    contextRef.current = null;
    workflowVersionRef.current = 1;
    feedbackIdentityRef.current = null;
    reopenIdentityRef.current = null;
    const initialLoadTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      setState({ status: 'loading' });
      setFinalizedEvidenceIds([]);
      void load();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
      isMountedRef.current = false;
      activeLoadRef.current += 1;
      const pending = pendingEvidenceRef.current;
      if (pending !== null) deletePreparedMedia(pending.media.localUri);
      pendingEvidenceRef.current = null;
    };
  }, [complaintId, load]);

  useEffect(() => {
    const nextCursor = { complaintId, signal: refreshSignal };
    const shouldRefresh = shouldRefreshResolutionAccountability(
      refreshCursorRef.current,
      nextCursor,
    );
    refreshCursorRef.current = nextCursor;
    if (shouldRefresh) void load();
  }, [complaintId, load, refreshSignal]);

  const openEvidence = async (evidence: ComplaintAccountabilityEvidence): Promise<void> => {
    if (openingEvidenceId !== null) return;
    setOpeningEvidenceId(evidence.id);
    setEvidenceAccessError(null);
    try {
      const access = await getComplaintEvidenceAccess(accessToken, complaintId, evidence.id);
      await openSecureExternalPage(access.signedUrl);
    } catch (error) {
      setEvidenceAccessError(
        error instanceof InAppBrowserError
          ? getUserFacingInAppBrowserError(error)
          : getUserFacingComplaintError(error),
      );
    } finally {
      setOpeningEvidenceId(null);
    }
  };

  const submitFeedback = async (): Promise<void> => {
    const context = contextRef.current;
    if (
      context === null ||
      context.latestResolution === null ||
      context.policy === null ||
      !context.policy.feedbackAllowed ||
      feedbackOutcome === null ||
      !feedbackConfirmed ||
      isSubmittingFeedback
    ) {
      return;
    }

    const selectedRatings = ratingKeys.map((key) => ratings[key]);
    const hasAnyRating = selectedRatings.some((value) => value !== undefined);
    const completeRatings = toCompleteRatings(ratings);
    const hasEveryRating = completeRatings !== null;
    if ((context.policy.ratingsRequired || hasAnyRating) && !hasEveryRating) {
      setFeedbackError(t('chooseAllRatings'));
      return;
    }
    const ratingValues = createRatingValues(
      context.policy.ratingMinimum,
      context.policy.ratingMaximum,
    );
    if (
      hasEveryRating &&
      selectedRatings.some((value) => value === undefined || !ratingValues.includes(value))
    ) {
      setFeedbackError(t('ratingRangeError'));
      return;
    }

    const comment = feedbackComment.trim();
    const input: ComplaintResolutionFeedbackInput = {
      ...(comment.length === 0 ? {} : { comment }),
      expectedWorkflowVersion: workflowVersionRef.current,
      outcome: feedbackOutcome,
      ...(hasEveryRating
        ? {
            ratings: completeRatings,
          }
        : {}),
      resolutionId: context.latestResolution.id,
    };
    const fingerprint = JSON.stringify(input);
    const identity = retainStableComplaintMutationIdentity(
      feedbackIdentityRef.current,
      'feedback',
      fingerprint,
      Crypto.randomUUID,
    );
    feedbackIdentityRef.current = identity;
    setFeedbackError(null);
    setIsSubmittingFeedback(true);
    try {
      const result = await submitComplaintResolutionFeedback(
        accessToken,
        complaintId,
        input,
        identity.key,
      );
      workflowVersionRef.current = result.workflowVersion;
      feedbackIdentityRef.current = null;
      setFeedbackOutcome(null);
      setRatings({});
      setFeedbackComment('');
      setFeedbackConfirmed(false);
      await load();
      void onChanged();
    } catch (error) {
      if (isMountedRef.current) setFeedbackError(getUserFacingComplaintError(error));
    } finally {
      if (isMountedRef.current) setIsSubmittingFeedback(false);
    }
  };

  const completeEvidenceUpload = useCallback(
    async (initial: PendingEvidenceUpload): Promise<void> => {
      if (isUploadingEvidence) return;
      setIsUploadingEvidence(true);
      setReopenError(null);
      let pending = initial;
      try {
        let intent = pending.intent;
        if (intent === undefined) {
          intent = await createComplaintReopenEvidenceUploadIntent(
            accessToken,
            complaintId,
            pending.input,
            pending.uploadIdentity.key,
          );
          pending = { ...pending, intent };
          rememberPendingEvidence(pending);
        }

        const finish = (evidenceId: string, workflowVersion: number): void => {
          workflowVersionRef.current = workflowVersion;
          setFinalizedEvidenceIds((current) =>
            current.includes(evidenceId) ? current : [...current, evidenceId],
          );
          deletePreparedMedia(pending.media.localUri);
          rememberPendingEvidence(null);
        };
        if (intent.evidence.uploadStatus === 'finalized') {
          finish(intent.evidence.id, intent.workflowVersion);
          return;
        }
        if (
          intent.evidence.uploadStatus === 'expired' ||
          intent.evidence.uploadStatus === 'failed'
        ) {
          throw new Error(t('evidenceReservationExpired'));
        }

        const finalizeInput =
          pending.finalizeInput ??
          ({
            byteSize: pending.media.byteSize,
            expectedWorkflowVersion: intent.workflowVersion,
            sha256: pending.media.sha256,
          } satisfies FinalizeComplaintReopenEvidenceInput);
        const finalizeFingerprint = JSON.stringify({
          evidenceId: intent.evidence.id,
          finalizeInput,
        });
        const finalizeIdentity = retainStableComplaintMutationIdentity(
          pending.finalizeIdentity ?? null,
          'reopen-evidence-finalize',
          finalizeFingerprint,
          Crypto.randomUUID,
        );
        pending = { ...pending, finalizeIdentity, finalizeInput };
        rememberPendingEvidence(pending);

        const finalize = () =>
          finalizeComplaintReopenEvidence(
            accessToken,
            complaintId,
            intent.evidence.id,
            finalizeInput,
            finalizeIdentity.key,
          );
        let finalization: ComplaintReopenEvidenceFinalization;
        try {
          await uploadPreparedMedia(pending.media, intent.upload);
          finalization = await finalize();
        } catch (uploadError) {
          try {
            finalization = await finalize();
          } catch {
            throw uploadError;
          }
        }
        finish(finalization.evidence.id, finalization.workflowVersion);
      } catch (error) {
        if (isMountedRef.current) setReopenError(getUserFacingComplaintError(error));
        throw error;
      } finally {
        if (isMountedRef.current) setIsUploadingEvidence(false);
      }
    },
    [accessToken, complaintId, isUploadingEvidence, rememberPendingEvidence, t],
  );

  const captureEvidence = async (
    media: PreparedComplaintMedia,
    captureLocation: ComplaintLocationCapture,
  ): Promise<void> => {
    if (isMountedRef.current) setIsCapturingEvidence(false);
    try {
      const input = buildReopenEvidenceUploadIntentInput(
        workflowVersionRef.current,
        media,
        captureLocation,
      );
      const identity = retainStableComplaintMutationIdentity(
        null,
        'reopen-evidence',
        JSON.stringify(input),
        Crypto.randomUUID,
      );
      const pending = { captureLocation, input, media, uploadIdentity: identity };
      rememberPendingEvidence(pending);
      await completeEvidenceUpload(pending);
    } catch (error) {
      if (isMountedRef.current) setReopenError(getUserFacingComplaintError(error));
    }
  };

  const discardPendingEvidence = (): void => {
    const pending = pendingEvidenceRef.current;
    if (pending !== null) deletePreparedMedia(pending.media.localUri);
    rememberPendingEvidence(null);
    setReopenError(null);
  };

  const submitReopen = async (): Promise<void> => {
    const context = contextRef.current;
    if (
      context === null ||
      context.latestResolution === null ||
      context.policy === null ||
      !context.policy.reopenAllowed ||
      reopenReason === null ||
      isSubmittingReopen ||
      pendingEvidence !== null
    ) {
      return;
    }
    const explanation = reopenExplanation.trim();
    if (explanation.length === 0) {
      setReopenError(t('explainReviewRequired'));
      return;
    }
    if (context.policy.reopenEvidenceRequired && finalizedEvidenceIds.length === 0) {
      setReopenError(t('addReopenEvidenceRequired'));
      return;
    }

    const input = {
      evidenceIds: finalizedEvidenceIds,
      expectedWorkflowVersion: workflowVersionRef.current,
      explanation,
      reasonCode: reopenReason,
      resolutionId: context.latestResolution.id,
    };
    const identity = retainStableComplaintMutationIdentity(
      reopenIdentityRef.current,
      'reopen',
      JSON.stringify(input),
      Crypto.randomUUID,
    );
    reopenIdentityRef.current = identity;
    setReopenError(null);
    setIsSubmittingReopen(true);
    try {
      const result = await reopenComplaint(accessToken, complaintId, input, identity.key);
      workflowVersionRef.current = result.workflowVersion;
      reopenIdentityRef.current = null;
      setReopenReason(null);
      setReopenExplanation('');
      setFinalizedEvidenceIds([]);
      await load();
      void onChanged();
    } catch (error) {
      if (isMountedRef.current) setReopenError(getUserFacingComplaintError(error));
    } finally {
      if (isMountedRef.current) setIsSubmittingReopen(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <View style={styles.card}>
        <ActivityIndicator accessibilityLabel={t('loadingResolutionOptions')} color="#166534" />
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('resolutionFollowUp')}
        </Text>
        <Text accessibilityRole="alert" style={styles.error}>
          {t('resolutionUnavailable', { message: state.message })}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('retryResolutionDetails')}</Text>
        </Pressable>
      </View>
    );
  }

  const context = state.value;
  const resolution = context.latestResolution;
  const policy = context.policy;
  const ratingValues =
    policy === null ? [] : createRatingValues(policy.ratingMinimum, policy.ratingMaximum);
  const feedbackAvailable =
    policy !== null &&
    resolution !== null &&
    policy.feedbackAllowed &&
    policy.outcomeOptions.length > 0 &&
    ratingValues.length > 0;
  const reopenAvailable =
    policy !== null &&
    resolution !== null &&
    policy.reopenAllowed &&
    policy.reopenAttemptsRemaining > 0 &&
    policy.reopenReasonOptions.length > 0;
  const unavailableReason =
    context.policyUnavailableReason ?? policy?.unavailableReason ?? t('unavailableAction');
  const evidence =
    resolution === null
      ? []
      : [...resolution.beforeEvidence, ...resolution.afterEvidence, ...resolution.reopenEvidence];
  const hasEveryRating = ratingKeys.every((key) => ratings[key] !== undefined);
  const hasAnyRating = ratingKeys.some((key) => ratings[key] !== undefined);
  const feedbackReady =
    feedbackAvailable &&
    feedbackOutcome !== null &&
    feedbackConfirmed &&
    (policy === null || !policy.ratingsRequired || hasEveryRating) &&
    (!hasAnyRating || hasEveryRating);
  const reopenReady =
    reopenAvailable &&
    reopenReason !== null &&
    reopenExplanation.trim().length > 0 &&
    pendingEvidence === null &&
    (policy === null || !policy.reopenEvidenceRequired || finalizedEvidenceIds.length > 0);
  const recoveredEvidence = context.availableReopenEvidence.filter((item) =>
    finalizedEvidenceIds.includes(item.id),
  );
  const newlyFinalizedEvidenceCount = Math.max(
    0,
    finalizedEvidenceIds.length - recoveredEvidence.length,
  );
  const accountabilityHistory = buildCitizenAccountabilityHistory(context, t);

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('resolutionFollowUp')}
      </Text>
      {resolution === null ? (
        <Text style={styles.muted}>{t('noCompletedResolution')}</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.heading}>{t('resolutionRecord')}</Text>
          <Text style={styles.body}>{resolution.publicMessage ?? t('noPublicMessage')}</Text>
          <Text style={styles.muted}>
            {resolution.completedAt === null
              ? t('completionTimeUnavailable')
              : t('completedOn', { date: formatDateTime(resolution.completedAt) })}
          </Text>
          {resolution.distanceFromComplaintMeters === null ? null : (
            <Text style={styles.muted}>
              {t('completionEvidenceDistance', {
                distance: Math.round(resolution.distanceFromComplaintMeters),
              })}
            </Text>
          )}
          {resolution.workReference === null ? null : (
            <Text style={styles.muted}>
              {t('workReference', {
                number: resolution.workReference.referenceNumber,
                type: resolution.workReference.referenceType,
              })}
            </Text>
          )}
          <Text style={styles.privacyNote}>{t('evidencePrivateBody')}</Text>
          {evidence.length === 0 ? (
            <Text style={styles.muted}>{t('noBeforeAfterEvidence')}</Text>
          ) : (
            evidence.map((item) => (
              <Pressable
                accessibilityRole="button"
                disabled={openingEvidenceId !== null}
                key={item.id}
                onPress={() => void openEvidence(item)}
                style={styles.evidenceButton}
              >
                <Text style={styles.evidenceButtonText}>
                  {openingEvidenceId === item.id
                    ? t('opening')
                    : t('openEvidence', {
                        label: t('evidenceLabel', {
                          kind: readableCode(item.kind),
                          role: readableCode(item.role),
                        }),
                      })}
                </Text>
                <Text style={styles.muted}>{formatDateTime(item.createdAt)}</Text>
              </Pressable>
            ))
          )}
          {evidenceAccessError === null ? null : (
            <Text accessibilityRole="alert" style={styles.error}>
              {evidenceAccessError}
            </Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.heading}>{t('yourResolutionHistory')}</Text>
        {accountabilityHistory.length === 0 ? (
          <Text style={styles.muted}>{t('noFeedbackHistory')}</Text>
        ) : (
          accountabilityHistory.map((item) => (
            <View key={item.id} style={styles.historyReceipt}>
              <Text style={styles.label}>{item.title}</Text>
              <Text style={styles.muted}>{formatDateTime(item.occurredAt)}</Text>
              {item.details.map((detail, index) => (
                <Text key={`${item.id}:${index}`} style={styles.body}>
                  {detail}
                </Text>
              ))}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('confirmOutcome')}</Text>
        {policy === null || !feedbackAvailable ? (
          <Text style={styles.unavailable}>{unavailableReason}</Text>
        ) : (
          <>
            <View accessibilityRole="radiogroup" style={styles.optionGrid}>
              {policy.outcomeOptions.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: feedbackOutcome === option.code }}
                  key={option.code}
                  onPress={() => {
                    feedbackIdentityRef.current = null;
                    setFeedbackOutcome(option.code);
                  }}
                  style={[
                    styles.option,
                    feedbackOutcome === option.code ? styles.optionSelected : null,
                  ]}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            {ratingKeys.map((key) => (
              <View key={key} style={styles.ratingGroup}>
                <Text style={styles.label}>{policy.ratingLabels[key]}</Text>
                <View accessibilityRole="radiogroup" style={styles.ratingRow}>
                  {ratingValues.map((value) => (
                    <Pressable
                      accessibilityLabel={`${policy.ratingLabels[key]} ${value}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: ratings[key] === value }}
                      key={value}
                      onPress={() => {
                        feedbackIdentityRef.current = null;
                        setRatings((current) => ({ ...current, [key]: value }));
                      }}
                      style={[styles.rating, ratings[key] === value ? styles.ratingSelected : null]}
                    >
                      <Text style={styles.ratingText}>{value}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.muted}>
              {policy.ratingsRequired ? t('allRatingsRequired') : t('ratingsOptionalCompleteAll')}
            </Text>
            <TextInput
              accessibilityLabel={t('optionalFeedbackComment')}
              maxLength={2_000}
              multiline
              onChangeText={(value) => {
                feedbackIdentityRef.current = null;
                setFeedbackComment(value);
              }}
              placeholder={t('optionalComment')}
              style={styles.input}
              value={feedbackComment}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: feedbackConfirmed }}
              onPress={() => {
                feedbackIdentityRef.current = null;
                setFeedbackConfirmed((current) => !current);
              }}
              style={styles.confirmRow}
            >
              <Text style={styles.checkbox}>{feedbackConfirmed ? '✓' : ''}</Text>
              <Text style={styles.body}>{t('confirmFeedbackCurrentOutcome')}</Text>
            </Pressable>
            {feedbackError === null ? null : (
              <Text accessibilityRole="alert" style={styles.error}>
                {feedbackError}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !feedbackReady || isSubmittingFeedback }}
              disabled={!feedbackReady || isSubmittingFeedback}
              onPress={() => void submitFeedback()}
              style={[styles.primary, !feedbackReady ? styles.disabled : null]}
            >
              {isSubmittingFeedback ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryText}>{t('submitConfirmedFeedback')}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{t('requestAnotherReview')}</Text>
        {recoveredEvidence.length === 0 ? null : (
          <View style={styles.recoveredPanel}>
            <Text style={styles.success}>
              {t('restoredEvidence', { count: recoveredEvidence.length })}
            </Text>
            {recoveredEvidence.map((item) => (
              <Text key={item.id} style={styles.muted}>
                {t('capturedOn', {
                  date: formatDateTime(item.capturedAt),
                  kind: readableCode(item.kind),
                })}
              </Text>
            ))}
          </View>
        )}
        {newlyFinalizedEvidenceCount === 0 ? null : (
          <Text style={styles.success}>
            {t('newEvidenceReady', { count: newlyFinalizedEvidenceCount })}
          </Text>
        )}
        {policy === null || !reopenAvailable ? (
          <Text style={styles.unavailable}>{unavailableReason}</Text>
        ) : (
          <>
            <Text style={styles.muted}>
              {policy.reopenDeadline === null
                ? t('reopenAttemptsRemain', { count: policy.reopenAttemptsRemaining })
                : t('reopenAttemptsUntil', {
                    count: policy.reopenAttemptsRemaining,
                    date: formatDateTime(policy.reopenDeadline),
                  })}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.optionGrid}>
              {policy.reopenReasonOptions.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reopenReason === option.code }}
                  key={option.code}
                  onPress={() => {
                    reopenIdentityRef.current = null;
                    setReopenReason(option.code);
                  }}
                  style={[
                    styles.option,
                    reopenReason === option.code ? styles.optionSelected : null,
                  ]}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel={t('reasonAnotherReview')}
              maxLength={4_000}
              multiline
              onChangeText={(value) => {
                reopenIdentityRef.current = null;
                setReopenExplanation(value);
              }}
              placeholder={t('explainUnresolved')}
              style={styles.input}
              value={reopenExplanation}
            />
            <Text style={styles.muted}>
              {policy.reopenEvidenceRequired
                ? t('additionalEvidenceRequired')
                : t('additionalEvidenceOptional')}
            </Text>
            {isCapturingEvidence ? (
              <ComplaintCameraCapture
                onCancel={() => setIsCapturingEvidence(false)}
                onCaptured={captureEvidence}
              />
            ) : null}
            {pendingEvidence === null ? null : (
              <View style={styles.pendingPanel}>
                <Text style={styles.body}>{t('capturedEvidenceAwaiting')}</Text>
                <View style={styles.buttonRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isUploadingEvidence}
                    onPress={() =>
                      void completeEvidenceUpload(pendingEvidence).catch(() => undefined)
                    }
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      {t(isUploadingEvidence ? 'uploading' : 'retryEvidenceUpload')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isUploadingEvidence}
                    onPress={discardPendingEvidence}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>{t('discardCapture')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {policy.reopenEvidenceUploadAllowed && !isCapturingEvidence ? (
              <Pressable
                accessibilityRole="button"
                disabled={pendingEvidence !== null || isUploadingEvidence}
                onPress={() => setIsCapturingEvidence(true)}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{t('captureAdditionalEvidence')}</Text>
              </Pressable>
            ) : null}
            {!policy.reopenEvidenceUploadAllowed && policy.reopenEvidenceRequired ? (
              <Text style={styles.unavailable}>{t('requiredEvidenceUploadUnavailable')}</Text>
            ) : null}
            {reopenError === null ? null : (
              <Text accessibilityRole="alert" style={styles.error}>
                {reopenError}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !reopenReady || isSubmittingReopen }}
              disabled={!reopenReady || isSubmittingReopen}
              onPress={() => void submitReopen()}
              style={[styles.primary, !reopenReady ? styles.disabled : null]}
            >
              {isSubmittingReopen ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryText}>{t('submitReopenRequest')}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: { color: '#334155', lineHeight: 21 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    gap: 18,
    padding: 16,
  },
  checkbox: {
    borderColor: '#166534',
    borderRadius: 4,
    borderWidth: 1,
    color: '#166534',
    fontWeight: '900',
    height: 22,
    textAlign: 'center',
    width: 22,
  },
  confirmRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  disabled: { backgroundColor: '#94a3b8' },
  error: { color: '#991b1b', lineHeight: 20 },
  evidenceButton: {
    borderColor: '#cbd5e1',
    borderRadius: 9,
    borderWidth: 1,
    gap: 3,
    padding: 11,
  },
  evidenceButtonText: { color: '#166534', fontWeight: '800' },
  heading: { color: '#1e293b', fontSize: 17, fontWeight: '800' },
  historyReceipt: { backgroundColor: '#f8fafc', borderRadius: 8, gap: 4, padding: 10 },
  input: {
    borderColor: '#94a3b8',
    borderRadius: 9,
    borderWidth: 1,
    color: '#0f172a',
    minHeight: 88,
    padding: 11,
    textAlignVertical: 'top',
  },
  label: { color: '#334155', fontWeight: '700' },
  muted: { color: '#64748b', lineHeight: 20 },
  option: { borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, padding: 10 },
  optionGrid: { gap: 7 },
  optionSelected: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  optionText: { color: '#1e293b', fontWeight: '700' },
  pendingPanel: { backgroundColor: '#fffbeb', borderRadius: 8, gap: 8, padding: 10 },
  primary: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  primaryText: { color: '#ffffff', fontWeight: '800' },
  privacyNote: { color: '#475569', fontSize: 13, lineHeight: 19 },
  rating: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    minWidth: 38,
    padding: 8,
  },
  ratingGroup: { gap: 7 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ratingSelected: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  ratingText: { color: '#1e293b', fontWeight: '700' },
  recoveredPanel: { backgroundColor: '#f0fdf4', borderRadius: 8, gap: 4, padding: 10 },
  secondary: {
    alignItems: 'center',
    borderColor: '#166534',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    padding: 10,
  },
  secondaryText: { color: '#166534', fontWeight: '800' },
  section: { borderTopColor: '#e2e8f0', borderTopWidth: 1, gap: 10, paddingTop: 16 },
  success: { color: '#166534', fontWeight: '700', lineHeight: 20 },
  title: { color: '#14281d', fontSize: 22, fontWeight: '900' },
  unavailable: { color: '#92400e', lineHeight: 20 },
});
