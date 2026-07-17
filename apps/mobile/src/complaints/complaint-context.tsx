import NetInfo from '@react-native-community/netinfo';
import { ApiClientError } from '@local-wellness/api-client';
import type {
  ComplaintLocationCapture,
  SubmitComplaintInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { useAuth } from '../auth/auth-context';
import {
  complaintCaptureReducer,
  getDraftReadiness,
  getSelectedCategory,
  initialComplaintCaptureState,
  isLocationEvidenceEligible,
  type ComplaintCaptureState,
  type ComplaintCaptureStep,
} from './capture-state';
import {
  checkComplaintDuplicates,
  createComplaintDraft,
  createMediaUploadIntent,
  discoverRoutingAssets,
  discardComplaintDraft,
  finalizeComplaintMedia,
  getComplaintDraft,
  getComplaintMediaStatus,
  getUserFacingComplaintError,
  listRoutingCategoryCatalog,
  setComplaintLocation,
  shouldRotateSubmitIdempotencyKeyAfterError,
  submitComplaintDraft,
  updateComplaintDraft,
} from './complaint-service';
import { createComplaintIdempotencyKey, createComplaintIdempotencyKeys } from './idempotency';
import { rotateComplaintSubmitIdempotencyKey } from './idempotency-format';
import { assessMediaDistance } from './location-evidence';
import { captureCurrentLocation, requiresLocationPermissionSettings } from './location-service';
import {
  clearMediaCaptureLocation,
  loadMediaCaptureLocation,
  saveMediaCaptureLocation,
} from './media-location-store';
import {
  deletePreparedMedia,
  uploadPreparedMedia,
  type PreparedComplaintMedia,
} from './media-service';
import { buildMediaUploadIntentInput } from './media-upload';
import {
  createPendingMediaResume,
  pendingMediaToPreparedMedia,
  type ComplaintResumeRecord,
  type PendingMediaResume,
} from './resume-record';
import { clearComplaintResume, loadComplaintResume, saveComplaintResume } from './resume-store';
import { runSingleFlight } from './single-flight';

type ComplaintContextValue = Readonly<{
  acknowledgeDuplicates: (value: boolean) => void;
  acknowledgeEmergency: (value: boolean) => void;
  captureLocation: () => Promise<void>;
  checkDuplicates: () => Promise<void>;
  clearError: () => void;
  discardDraft: () => Promise<void>;
  goToStep: (step: ComplaintCaptureStep) => Promise<void>;
  loadNearbyAssets: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  refresh: () => Promise<void>;
  retryPendingUpload: () => Promise<void>;
  selectAsset: (assetId: string) => Promise<void>;
  startDraft: () => Promise<void>;
  state: ComplaintCaptureState;
  submit: () => Promise<void>;
  updateDetails: (input: UpdateComplaintDraftInput) => Promise<void>;
  uploadMedia: (
    media: PreparedComplaintMedia,
    captureLocation: ComplaintLocationCapture,
  ) => Promise<void>;
}>;

const ComplaintContext = createContext<ComplaintContextValue | undefined>(undefined);

const currentSession = (state: ReturnType<typeof useAuth>['state']) =>
  state.status === 'signed-in'
    ? { accessToken: state.session.access_token, userId: state.session.user.id }
    : null;

const clearPendingMediaArtifacts = async (resume: ComplaintResumeRecord): Promise<void> => {
  if (resume.pendingMedia === null) return;
  await clearMediaCaptureLocation(resume.pendingMedia.idempotencyKey);
  deletePreparedMedia(resume.pendingMedia.localUri);
};

const loadAssetOptions = async (
  accessToken: string,
  categories: ComplaintCaptureState['categories'],
  draft: NonNullable<ComplaintCaptureState['draft']>,
) => {
  const category = categories.find((candidate) => candidate.id === draft.categoryId);
  if (
    category?.submissionAvailability !== 'available' ||
    !category.requiresAsset ||
    !isLocationEvidenceEligible(draft.location)
  )
    return [];

  const result = await discoverRoutingAssets(accessToken, category.id, draft.location);
  if (result.categoryId !== category.id) {
    throw new Error('The nearby asset response did not match the selected category.');
  }

  return result.assets;
};

export const ComplaintProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const auth = useAuth();
  const session = useMemo(() => currentSession(auth.state), [auth.state]);
  const [state, dispatch] = useReducer(complaintCaptureReducer, initialComplaintCaptureState);
  const duplicateCheckOperationRef = useRef<Promise<void> | null>(null);
  const resumeRef = useRef<ComplaintResumeRecord | null>(null);

  const persistResume = useCallback(async (overrides: Partial<ComplaintResumeRecord> = {}) => {
    if (resumeRef.current === null) return;
    const next = { ...resumeRef.current, ...overrides, updatedAt: new Date().toISOString() };
    await saveComplaintResume(next);
    resumeRef.current = next;
  }, []);

  const persistWithRotatedSubmitKey = useCallback(
    async (overrides: Partial<ComplaintResumeRecord> = {}): Promise<void> => {
      const resume = resumeRef.current;
      if (resume === null) {
        throw new Error('The resumable submission state is unavailable.');
      }
      await persistResume({
        ...overrides,
        submitIdempotencyKey: rotateComplaintSubmitIdempotencyKey(resume.submitIdempotencyKey, () =>
          createComplaintIdempotencyKey('submit'),
        ),
      });
    },
    [persistResume],
  );

  useEffect(() => {
    const subscription = NetInfo.addEventListener((network) => {
      dispatch({ isOnline: network.isConnected === true, type: 'network_changed' });
    });
    return () => subscription();
  }, []);

  useEffect(() => {
    if (session === null) {
      resumeRef.current = null;
      dispatch({ type: 'draft_cleared' });
      return;
    }

    let isCurrent = true;
    const restore = async (): Promise<void> => {
      let loadedResume: ComplaintResumeRecord | null = null;
      dispatch({ type: 'busy', value: true });
      try {
        const resume = await loadComplaintResume(session.userId);
        if (!isCurrent) return;
        loadedResume = resume;
        resumeRef.current = resume;
        const categories = await listRoutingCategoryCatalog(session.accessToken);
        if (!isCurrent) return;
        dispatch({ categories, type: 'categories_loaded' });

        if (resume?.draftId) {
          const draft = await getComplaintDraft(session.accessToken, resume.draftId);
          if (!isCurrent) return;
          if (draft.status !== 'active') {
            await clearPendingMediaArtifacts(resume);
            await clearComplaintResume(session.userId);
            resumeRef.current = null;
            dispatch({ type: 'draft_cleared' });
            throw new Error(
              draft.status === 'submitted'
                ? 'This report was already submitted. Open Your complaints to view it.'
                : 'This saved draft is no longer active.',
            );
          }
          const mustReviewDuplicatesAgain =
            resume.step === 'duplicates' || resume.step === 'review';
          dispatch({
            draft,
            step: mustReviewDuplicatesAgain ? 'duplicates' : resume.step,
            type: 'draft_loaded',
          });
          dispatch({
            assets: await loadAssetOptions(session.accessToken, categories, draft),
            type: 'assets_loaded',
          });
          if (mustReviewDuplicatesAgain) {
            const duplicateCheck = await checkComplaintDuplicates(session.accessToken, draft.id);
            if (!isCurrent) return;
            dispatch({ duplicateCheck, type: 'duplicates_loaded' });
          }
        }
      } catch (error) {
        if (
          isCurrent &&
          loadedResume !== null &&
          error instanceof ApiClientError &&
          error.code === 'COMPLAINT_DRAFT_NOT_FOUND'
        ) {
          await clearPendingMediaArtifacts(loadedResume);
          await clearComplaintResume(session.userId);
          resumeRef.current = null;
          dispatch({ type: 'draft_cleared' });
        }
        if (isCurrent) dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      } finally {
        if (isCurrent) dispatch({ type: 'busy', value: false });
      }
    };

    void restore();
    return () => {
      isCurrent = false;
    };
  }, [session]);

  const requireSession = useCallback(() => {
    const value = currentSession(auth.state);
    if (value === null) throw new Error('A verified session is required.');
    return value;
  }, [auth.state]);

  const requireDraft = useCallback(() => {
    if (state.draft === null) throw new Error('Start a complaint draft first.');
    return state.draft;
  }, [state.draft]);

  const reloadCategories = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    dispatch({ message: null, type: 'error' });
    dispatch({ type: 'busy', value: true });
    try {
      const categories = await listRoutingCategoryCatalog(activeSession.accessToken);
      dispatch({ categories, type: 'categories_loaded' });
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [requireSession]);

  const startDraft = useCallback(async (): Promise<void> => {
    if (state.draft !== null) return;
    const activeSession = requireSession();
    dispatch({ message: null, type: 'error' });
    dispatch({ type: 'busy', value: true });

    try {
      const existingResume = resumeRef.current;
      if (existingResume?.ownerUserId === activeSession.userId && existingResume.draftId !== null) {
        try {
          const resumedDraft = await getComplaintDraft(
            activeSession.accessToken,
            existingResume.draftId,
          );
          if (resumedDraft.status !== 'active') {
            await clearPendingMediaArtifacts(existingResume);
            await clearComplaintResume(activeSession.userId);
            resumeRef.current = null;
            dispatch({ type: 'draft_cleared' });
            throw new Error(
              resumedDraft.status === 'submitted'
                ? 'This report was already submitted. Open Your complaints to view it.'
                : 'This saved draft is no longer active.',
            );
          }
          const mustReviewDuplicatesAgain =
            existingResume.step === 'duplicates' || existingResume.step === 'review';
          dispatch({
            draft: resumedDraft,
            step: mustReviewDuplicatesAgain ? 'duplicates' : existingResume.step,
            type: 'draft_loaded',
          });
          dispatch({
            assets: await loadAssetOptions(
              activeSession.accessToken,
              state.categories,
              resumedDraft,
            ),
            type: 'assets_loaded',
          });
          if (mustReviewDuplicatesAgain) {
            const duplicateCheck = await checkComplaintDuplicates(
              activeSession.accessToken,
              resumedDraft.id,
            );
            dispatch({ duplicateCheck, type: 'duplicates_loaded' });
          }
          return;
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.code !== 'COMPLAINT_DRAFT_NOT_FOUND') {
            throw error;
          }
          await clearPendingMediaArtifacts(existingResume);
          await clearComplaintResume(activeSession.userId);
          resumeRef.current = null;
        }
      }

      const resume =
        existingResume?.ownerUserId === activeSession.userId && existingResume.draftId === null
          ? existingResume
          : (() => {
              const keys = createComplaintIdempotencyKeys();
              return {
                createIdempotencyKey: keys.create,
                draftId: null,
                ownerUserId: activeSession.userId,
                pendingMedia: null,
                step: 'details' as const,
                submitIdempotencyKey: keys.submit,
                updatedAt: new Date().toISOString(),
              } satisfies ComplaintResumeRecord;
            })();
      if (existingResume !== resume) await saveComplaintResume(resume);
      resumeRef.current = resume;

      const draft = await createComplaintDraft(
        activeSession.accessToken,
        {},
        resume.createIdempotencyKey,
      );
      await persistResume({ draftId: draft.id });
      dispatch({ draft, step: 'details', type: 'draft_loaded' });
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [persistResume, requireSession, state.categories, state.draft]);

  const refresh = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    const draft = requireDraft();
    dispatch({ type: 'busy', value: true });
    try {
      const refreshed = await getComplaintDraft(activeSession.accessToken, draft.id);
      dispatch({ draft: refreshed, type: 'draft_loaded' });
      dispatch({
        assets: await loadAssetOptions(activeSession.accessToken, state.categories, refreshed),
        type: 'assets_loaded',
      });
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [requireDraft, requireSession, state.categories]);

  const updateDetails = useCallback(
    async (input: UpdateComplaintDraftInput): Promise<void> => {
      const activeSession = requireSession();
      const draft = requireDraft();
      dispatch({ type: 'busy', value: true });
      try {
        if (input.categoryId !== undefined) {
          const category = state.categories.find((candidate) => candidate.id === input.categoryId);
          if (category?.submissionAvailability !== 'available') {
            throw new Error(
              'This category is not currently available for verified complaint submission.',
            );
          }
        }
        const categoryChanged =
          input.categoryId !== undefined && input.categoryId !== draft.categoryId;
        const updated = await updateComplaintDraft(
          activeSession.accessToken,
          draft.id,
          categoryChanged ? { ...input, assetId: null } : input,
        );
        await persistWithRotatedSubmitKey();
        dispatch({ draft: updated, type: 'draft_loaded' });
        if (categoryChanged) {
          dispatch({ type: 'assets_cleared' });
          dispatch({
            assets: await loadAssetOptions(activeSession.accessToken, state.categories, updated),
            type: 'assets_loaded',
          });
        }
      } catch (error) {
        dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
        throw error;
      } finally {
        dispatch({ type: 'busy', value: false });
      }
    },
    [persistWithRotatedSubmitKey, requireDraft, requireSession, state.categories],
  );

  const captureLocation = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    const draft = requireDraft();
    dispatch({ type: 'busy', value: true });
    dispatch({ message: null, type: 'error' });
    try {
      const location = await captureCurrentLocation();
      const updated = await setComplaintLocation(activeSession.accessToken, draft.id, location);
      await persistWithRotatedSubmitKey();
      dispatch({ draft: updated, type: 'draft_loaded' });
      dispatch({ type: 'assets_cleared' });
      dispatch({
        assets: await loadAssetOptions(activeSession.accessToken, state.categories, updated),
        type: 'assets_loaded',
      });
    } catch (error) {
      dispatch({
        locationSettingsRequired: requiresLocationPermissionSettings(error),
        message: getUserFacingComplaintError(error),
        type: 'error',
      });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [persistWithRotatedSubmitKey, requireDraft, requireSession, state.categories]);

  const loadNearbyAssets = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    const draft = requireDraft();
    dispatch({ type: 'busy', value: true });
    try {
      dispatch({
        assets: await loadAssetOptions(activeSession.accessToken, state.categories, draft),
        type: 'assets_loaded',
      });
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [requireDraft, requireSession, state.categories]);

  const selectAsset = useCallback(
    async (assetId: string): Promise<void> => {
      if (!state.assetOptions.some((asset) => asset.id === assetId)) {
        throw new Error('Choose a verified nearby asset from the current results.');
      }
      await updateDetails({ assetId });
    },
    [state.assetOptions, updateDetails],
  );

  const performUpload = useCallback(
    async (
      media: PreparedComplaintMedia,
      pending: PendingMediaResume,
      mediaLocation?: ComplaintLocationCapture,
    ): Promise<void> => {
      const activeSession = requireSession();
      const draft = requireDraft();
      const finishUpload = async (): Promise<void> => {
        const updated = await getComplaintDraft(activeSession.accessToken, draft.id);
        await clearMediaCaptureLocation(pending.idempotencyKey);
        await persistWithRotatedSubmitKey({ pendingMedia: null });
        deletePreparedMedia(media.localUri);
        dispatch({ draft: updated, type: 'draft_loaded' });
        dispatch({ type: 'upload_changed', upload: null });
      };

      dispatch({
        type: 'upload_changed',
        upload: { localUri: media.localUri, progress: 0.2, status: 'reserving' },
      });

      if (pending.mediaId !== null) {
        const existing = await getComplaintMediaStatus(activeSession.accessToken, pending.mediaId);
        if (existing.uploadStatus === 'finalized') {
          await finishUpload();
          return;
        }
        if (existing.uploadStatus === 'expired' || existing.uploadStatus === 'failed') {
          throw new Error('This upload can no longer be resumed. Discard the draft and try again.');
        }
      }

      const storedMediaLocation =
        mediaLocation ?? (await loadMediaCaptureLocation(pending.idempotencyKey));
      if (storedMediaLocation === null) {
        throw new Error(
          'The protected media location needed for a safe retry is unavailable. Discard the draft and capture the evidence again.',
        );
      }

      const intent = await createMediaUploadIntent(
        activeSession.accessToken,
        buildMediaUploadIntentInput(draft.id, media, storedMediaLocation),
        pending.idempotencyKey,
      );
      await persistResume({ pendingMedia: { ...pending, mediaId: intent.media.id } });
      if (intent.media.uploadStatus === 'finalized') {
        await finishUpload();
        return;
      }
      if (intent.media.uploadStatus === 'expired' || intent.media.uploadStatus === 'failed') {
        throw new Error('This upload can no longer be resumed. Discard the draft and try again.');
      }
      dispatch({
        type: 'upload_changed',
        upload: { localUri: media.localUri, progress: 0.5, status: 'uploading' },
      });
      const finalize = async (): Promise<void> => {
        dispatch({
          type: 'upload_changed',
          upload: { localUri: media.localUri, progress: 0.85, status: 'finalizing' },
        });
        await finalizeComplaintMedia(activeSession.accessToken, intent.media.id, {
          byteSize: media.byteSize,
          sha256: media.sha256,
        });
      };

      let finalizedAfterExistingUpload = false;
      try {
        await uploadPreparedMedia(media, intent.upload);
      } catch (uploadError) {
        try {
          await finalize();
          finalizedAfterExistingUpload = true;
        } catch {
          throw uploadError;
        }
      }
      if (!finalizedAfterExistingUpload) await finalize();
      await finishUpload();
    },
    [persistResume, persistWithRotatedSubmitKey, requireDraft, requireSession],
  );

  const uploadMedia = useCallback(
    async (
      media: PreparedComplaintMedia,
      mediaLocation: ComplaintLocationCapture,
    ): Promise<void> => {
      const draft = requireDraft();
      if (!isLocationEvidenceEligible(draft.location))
        throw new Error('Verify the complaint location before adding media.');
      const distance = assessMediaDistance(draft.location, mediaLocation);
      if (!distance.isAcceptable) {
        throw new Error(
          `The media was captured ${Math.round(distance.distanceMeters)} metres from the complaint location. Capture it at the issue location.`,
        );
      }

      const pending = createPendingMediaResume(media, createComplaintIdempotencyKey('media'));
      if (resumeRef.current === null) {
        throw new Error('The resumable draft state is unavailable. Return home and try again.');
      }
      try {
        await saveMediaCaptureLocation(pending.idempotencyKey, mediaLocation);
        await persistResume({ pendingMedia: pending });
      } catch (error) {
        await clearMediaCaptureLocation(pending.idempotencyKey).catch(() => undefined);
        deletePreparedMedia(media.localUri);
        throw error;
      }
      try {
        await performUpload(media, pending, mediaLocation);
      } catch (error) {
        dispatch({
          type: 'upload_changed',
          upload: { localUri: media.localUri, progress: 0, status: 'failed' },
        });
        dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
        throw error;
      }
    },
    [performUpload, persistResume, requireDraft],
  );

  const retryPendingUpload = useCallback(async (): Promise<void> => {
    const pending = resumeRef.current?.pendingMedia;
    if (pending === null || pending === undefined) return;
    try {
      await performUpload(pendingMediaToPreparedMedia(pending), pending);
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
    }
  }, [performUpload]);

  const checkDuplicates = useCallback(
    (): Promise<void> =>
      runSingleFlight(duplicateCheckOperationRef, async () => {
        const activeSession = requireSession();
        const draft = requireDraft();
        dispatch({ type: 'busy', value: true });
        try {
          const duplicateCheck = await checkComplaintDuplicates(
            activeSession.accessToken,
            draft.id,
          );
          dispatch({ duplicateCheck, type: 'duplicates_loaded' });
          await persistWithRotatedSubmitKey({ step: 'duplicates' });
          dispatch({ step: 'duplicates', type: 'step_changed' });
        } catch (error) {
          dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
          throw error;
        } finally {
          dispatch({ type: 'busy', value: false });
        }
      }),
    [persistWithRotatedSubmitKey, requireDraft, requireSession],
  );

  const submit = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    const draft = requireDraft();
    const resume = resumeRef.current;
    if (resume === null) throw new Error('The resumable submission state is unavailable.');
    const category = getSelectedCategory(state);
    const readiness = getDraftReadiness(draft, category);
    if (!readiness.isReady) {
      throw new Error(`Complete the required fields: ${readiness.missing.join(', ')}.`);
    }
    if (
      category?.requiresAsset === true &&
      !state.assetOptions.some((asset) => asset.id === draft.assetId)
    ) {
      throw new Error('This category requires a verified asset selection before submission.');
    }
    if (state.duplicateCheck === null) {
      throw new Error('Check and review similar nearby reports before submitting.');
    }
    if (state.duplicateCheck.suggestions.length > 0 && !state.duplicatesAcknowledged) {
      throw new Error('Review and acknowledge the similar-report suggestions before submitting.');
    }
    if (category?.isEmergency === true && !state.emergencyAcknowledged) {
      throw new Error('Acknowledge the emergency-services warning before submitting.');
    }

    dispatch({ type: 'busy', value: true });
    try {
      const input: SubmitComplaintInput = {
        acknowledgedDuplicateSuggestionIds: state.duplicateCheck.suggestions.map(
          (suggestion) => suggestion.complaintId,
        ),
        ...(category?.isEmergency === true ? { emergencyDisclaimerAcknowledged: true } : {}),
      };
      const receipt = await submitComplaintDraft(
        activeSession.accessToken,
        draft.id,
        input,
        resume.submitIdempotencyKey,
      );
      await clearComplaintResume(activeSession.userId);
      resumeRef.current = null;
      dispatch({ receipt, type: 'receipt_loaded' });
    } catch (error) {
      if (shouldRotateSubmitIdempotencyKeyAfterError(error)) {
        try {
          await persistWithRotatedSubmitKey();
        } catch (rotationError) {
          dispatch({ message: getUserFacingComplaintError(rotationError), type: 'error' });
          throw rotationError;
        }
      }
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [persistWithRotatedSubmitKey, requireDraft, requireSession, state]);

  const discardDraft = useCallback(async (): Promise<void> => {
    const activeSession = requireSession();
    const draft = requireDraft();
    dispatch({ type: 'busy', value: true });
    try {
      await discardComplaintDraft(activeSession.accessToken, draft.id);
      const pending = resumeRef.current?.pendingMedia;
      if (pending) await clearMediaCaptureLocation(pending.idempotencyKey);
      const pendingUri = pending?.localUri;
      if (pendingUri) deletePreparedMedia(pendingUri);
      await clearComplaintResume(activeSession.userId);
      resumeRef.current = null;
      dispatch({ type: 'draft_cleared' });
    } catch (error) {
      dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      throw error;
    } finally {
      dispatch({ type: 'busy', value: false });
    }
  }, [requireDraft, requireSession]);

  const goToStep = useCallback(
    async (step: ComplaintCaptureStep): Promise<void> => {
      if (
        state.step === 'location' &&
        step === 'media' &&
        !isLocationEvidenceEligible(state.draft?.location ?? null)
      ) {
        dispatch({
          message: 'Capture a verified or partially verified location before continuing.',
          type: 'error',
        });
        return;
      }

      try {
        await persistResume({ step });
        dispatch({ step, type: 'step_changed' });
      } catch (error) {
        dispatch({ message: getUserFacingComplaintError(error), type: 'error' });
      }
    },
    [persistResume, state.draft?.location, state.step],
  );

  const value = useMemo<ComplaintContextValue>(
    () => ({
      acknowledgeDuplicates: (acknowledged) =>
        dispatch({ type: 'duplicates_acknowledged', value: acknowledged }),
      acknowledgeEmergency: (acknowledged) =>
        dispatch({ type: 'emergency_acknowledged', value: acknowledged }),
      captureLocation,
      checkDuplicates,
      clearError: () => dispatch({ message: null, type: 'error' }),
      discardDraft,
      goToStep,
      loadNearbyAssets,
      reloadCategories,
      refresh,
      retryPendingUpload,
      selectAsset,
      startDraft,
      state,
      submit,
      updateDetails,
      uploadMedia,
    }),
    [
      captureLocation,
      checkDuplicates,
      discardDraft,
      goToStep,
      loadNearbyAssets,
      reloadCategories,
      refresh,
      retryPendingUpload,
      selectAsset,
      startDraft,
      state,
      submit,
      updateDetails,
      uploadMedia,
    ],
  );

  return <ComplaintContext.Provider value={value}>{children}</ComplaintContext.Provider>;
};

export const useComplaintCapture = (): ComplaintContextValue => {
  const context = useContext(ComplaintContext);
  if (context === undefined) {
    throw new Error('useComplaintCapture must be used within ComplaintProvider.');
  }
  return context;
};
