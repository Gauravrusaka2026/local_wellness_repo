import type {
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ReopenComplaintInput,
} from '@local-wellness/types';
import {
  complaintIdParametersSchema,
  complaintResolutionFeedbackSchema,
  idempotencyKeySchema,
  reopenComplaintSchema,
} from '@local-wellness/validation';

const ratingNames = ['satisfaction', 'speed', 'quality', 'communication'] as const;

export class ComplaintActionInputError extends Error {
  public constructor(message = 'The complaint action is invalid. Reload the page and try again.') {
    super(message);
    this.name = 'ComplaintActionInputError';
  }
}

export type ComplaintActionIdentifiers = Readonly<{
  complaintId: string;
  idempotencyKey: string;
}>;

export type ResolutionActionAvailability = Readonly<{
  feedbackAllowed: boolean;
  feedbackUnavailableReason: string | null;
  reopenAllowed: boolean;
  reopenUnavailableReason: string | null;
}>;

const formText = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

export const parseComplaintActionIdentifiers = (formData: FormData): ComplaintActionIdentifiers => {
  const complaint = complaintIdParametersSchema.safeParse({
    complaintId: formText(formData, 'complaintId'),
  });
  const idempotencyKey = idempotencyKeySchema.safeParse(formText(formData, 'idempotencyKey'));

  if (!complaint.success || !idempotencyKey.success) throw new ComplaintActionInputError();
  return { complaintId: complaint.data.complaintId, idempotencyKey: idempotencyKey.data };
};

export const getResolutionActionAvailability = (
  context: ComplaintResolutionContext,
): ResolutionActionAvailability => {
  if (context.latestResolution === null) {
    const reason = 'No completed government resolution is available for citizen review yet.';
    return {
      feedbackAllowed: false,
      feedbackUnavailableReason: reason,
      reopenAllowed: false,
      reopenUnavailableReason: reason,
    };
  }

  if (context.policy === null) {
    const reason =
      context.policyUnavailableReason ??
      'The verified complaint action policy is currently unavailable.';
    return {
      feedbackAllowed: false,
      feedbackUnavailableReason: reason,
      reopenAllowed: false,
      reopenUnavailableReason: reason,
    };
  }

  const feedbackAllowed = context.policy.feedbackAllowed;
  const reopenHasRequiredEvidence =
    !context.policy.reopenEvidenceRequired || context.availableReopenEvidence.length > 0;
  const reopenAllowed = context.policy.reopenAllowed && reopenHasRequiredEvidence;

  return {
    feedbackAllowed,
    feedbackUnavailableReason: feedbackAllowed
      ? null
      : (context.policy.unavailableReason ??
        'Feedback is not available for the current complaint status.'),
    reopenAllowed,
    reopenUnavailableReason: reopenAllowed
      ? null
      : context.policy.reopenAllowed && !reopenHasRequiredEvidence
        ? 'The verified policy requires location-bound evidence. Add it in the mobile app before reopening.'
        : (context.policy.unavailableReason ??
          'Reopening is not available for the current complaint status.'),
  };
};

const requireCurrentResolution = (context: ComplaintResolutionContext) => {
  if (context.latestResolution === null || context.policy === null) {
    throw new ComplaintActionInputError(
      'The verified complaint action policy is currently unavailable.',
    );
  }
  return { policy: context.policy, resolution: context.latestResolution };
};

export const parseComplaintFeedbackInput = (
  formData: FormData,
  context: ComplaintResolutionContext,
): ComplaintResolutionFeedbackInput => {
  const availability = getResolutionActionAvailability(context);
  if (!availability.feedbackAllowed) {
    throw new ComplaintActionInputError(
      availability.feedbackUnavailableReason ?? 'Feedback is not available.',
    );
  }

  const { policy, resolution } = requireCurrentResolution(context);
  const outcome = formText(formData, 'outcome');
  if (!policy.outcomeOptions.some((option) => option.code === outcome)) {
    throw new ComplaintActionInputError('Choose an outcome allowed by the current policy.');
  }

  const ratingValues = ratingNames.map((name) => formText(formData, name));
  const hasAnyRating = ratingValues.some((value) => value.length > 0);
  const hasEveryRating = ratingValues.every((value) => value.length > 0);
  if ((policy.ratingsRequired || hasAnyRating) && !hasEveryRating) {
    throw new ComplaintActionInputError(
      'Choose every rating, or leave all optional ratings blank.',
    );
  }

  const parsedRatings = ratingValues.map(Number);
  if (
    hasEveryRating &&
    parsedRatings.some(
      (value) =>
        !Number.isInteger(value) || value < policy.ratingMinimum || value > policy.ratingMaximum,
    )
  ) {
    throw new ComplaintActionInputError('Choose ratings within the current policy range.');
  }

  const comment = formText(formData, 'comment');
  const result = complaintResolutionFeedbackSchema.safeParse({
    ...(comment.length === 0 ? {} : { comment }),
    expectedWorkflowVersion: context.workflowVersion,
    outcome,
    ...(hasEveryRating
      ? {
          ratings: Object.fromEntries(
            ratingNames.map((name, index) => [name, parsedRatings[index]]),
          ),
        }
      : {}),
    resolutionId: resolution.id,
  });

  if (!result.success) {
    throw new ComplaintActionInputError('Check the feedback fields and try again.');
  }
  return result.data;
};

export const parseComplaintReopenInput = (
  formData: FormData,
  context: ComplaintResolutionContext,
): ReopenComplaintInput => {
  const availability = getResolutionActionAvailability(context);
  if (!availability.reopenAllowed) {
    throw new ComplaintActionInputError(
      availability.reopenUnavailableReason ?? 'Reopening is not available.',
    );
  }

  const { policy, resolution } = requireCurrentResolution(context);
  const reasonCode = formText(formData, 'reasonCode');
  if (!policy.reopenReasonOptions.some((option) => option.code === reasonCode)) {
    throw new ComplaintActionInputError('Choose a reopening reason allowed by the current policy.');
  }

  const evidenceIds = formData
    .getAll('evidenceId')
    .filter((value): value is string => typeof value === 'string');
  const allowedEvidenceIds = new Set(context.availableReopenEvidence.map(({ id }) => id));
  if (
    new Set(evidenceIds).size !== evidenceIds.length ||
    evidenceIds.some((identifier) => !allowedEvidenceIds.has(identifier))
  ) {
    throw new ComplaintActionInputError('The selected reopening evidence is no longer available.');
  }
  if (policy.reopenEvidenceRequired && evidenceIds.length === 0) {
    throw new ComplaintActionInputError('Select the evidence required by the current policy.');
  }

  const result = reopenComplaintSchema.safeParse({
    evidenceIds,
    expectedWorkflowVersion: context.workflowVersion,
    explanation: formText(formData, 'explanation'),
    reasonCode,
    resolutionId: resolution.id,
  });

  if (!result.success) {
    throw new ComplaintActionInputError('Check the reopening explanation and try again.');
  }
  return result.data;
};
