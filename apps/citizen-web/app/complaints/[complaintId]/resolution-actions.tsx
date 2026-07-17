'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ComplaintResolutionContext } from '@local-wellness/types';

import { getResolutionActionAvailability } from '../../../lib/complaints/action-input';
import { formatComplaintCode, formatComplaintDateTime } from '../../../lib/complaints/presentation';
import {
  initialComplaintActionState,
  reopenComplaintAction,
  submitComplaintFeedbackAction,
  type ComplaintActionState,
} from './actions';

const ActionMessage = ({ state }: Readonly<{ state: ComplaintActionState }>) =>
  state.message === null ? null : (
    <p
      aria-live={state.status === 'success' ? 'polite' : 'assertive'}
      className={state.status === 'success' ? 'success-notice' : 'error-notice'}
      role={state.status === 'success' ? 'status' : 'alert'}
    >
      {state.message}
    </p>
  );

const SubmitButton = ({ idle, pending }: Readonly<{ idle: string; pending: string }>) => {
  const status = useFormStatus();
  return (
    <button className="primary-button" disabled={status.pending} type="submit">
      {status.pending ? pending : idle}
    </button>
  );
};

const ratingNames = ['satisfaction', 'speed', 'quality', 'communication'] as const;

const FeedbackForm = ({
  complaintId,
  context,
  idempotencyKey,
}: Readonly<{
  complaintId: string;
  context: ComplaintResolutionContext;
  idempotencyKey: string;
}>) => {
  const [state, formAction] = useActionState(
    submitComplaintFeedbackAction,
    initialComplaintActionState,
  );
  const policy = context.policy;
  if (policy === null) return null;

  return (
    <form action={formAction} className="complaint-action-form stack">
      <input name="complaintId" type="hidden" value={complaintId} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="field-group">
        <label htmlFor="feedback-outcome">How well was the issue resolved?</label>
        <select id="feedback-outcome" name="outcome" required>
          <option value="">Choose an outcome</option>
          {policy.outcomeOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="complaint-rating-grid">
        <legend>
          Ratings ({policy.ratingMinimum}–{policy.ratingMaximum})
          {policy.ratingsRequired ? ' · required' : ' · optional'}
        </legend>
        {ratingNames.map((name) => (
          <label key={name}>
            {policy.ratingLabels[name]}
            <select name={name} required={policy.ratingsRequired}>
              <option value="">Not rated</option>
              {Array.from(
                { length: policy.ratingMaximum - policy.ratingMinimum + 1 },
                (_, index) => policy.ratingMinimum + index,
              ).map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      <div className="field-group">
        <label htmlFor="feedback-comment">Comment (optional)</label>
        <textarea id="feedback-comment" maxLength={2_000} name="comment" rows={4} />
      </div>
      <SubmitButton idle="Send feedback" pending="Sending feedback…" />
      <ActionMessage state={state} />
    </form>
  );
};

const ReopenForm = ({
  complaintId,
  context,
  idempotencyKey,
}: Readonly<{
  complaintId: string;
  context: ComplaintResolutionContext;
  idempotencyKey: string;
}>) => {
  const [state, formAction] = useActionState(reopenComplaintAction, initialComplaintActionState);
  const policy = context.policy;
  if (policy === null) return null;

  return (
    <form action={formAction} className="complaint-action-form stack">
      <input name="complaintId" type="hidden" value={complaintId} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="field-group">
        <label htmlFor="reopen-reason">Why does this need another review?</label>
        <select id="reopen-reason" name="reasonCode" required>
          <option value="">Choose a reason</option>
          {policy.reopenReasonOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="reopen-explanation">What still needs attention?</label>
        <textarea
          id="reopen-explanation"
          maxLength={4_000}
          minLength={1}
          name="explanation"
          required
          rows={5}
        />
      </div>
      {context.availableReopenEvidence.length === 0 ? null : (
        <fieldset className="complaint-evidence-picker">
          <legend>
            Existing private evidence{policy.reopenEvidenceRequired ? ' · select at least one' : ''}
          </legend>
          {context.availableReopenEvidence.map((evidence) => (
            <label key={evidence.id}>
              <input name="evidenceId" type="checkbox" value={evidence.id} />
              <span>
                {formatComplaintCode(evidence.kind)} captured{' '}
                {formatComplaintDateTime(evidence.capturedAt)}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <p className="field-hint">
        A reopening is evaluated against the current verified policy. It may be escalated when the
        permitted reopening limit has been reached.
      </p>
      <SubmitButton idle="Request another review" pending="Submitting request…" />
      <ActionMessage state={state} />
    </form>
  );
};

export const ResolutionActions = ({
  complaintId,
  context,
  feedbackIdempotencyKey,
  reopenIdempotencyKey,
}: Readonly<{
  complaintId: string;
  context: ComplaintResolutionContext;
  feedbackIdempotencyKey: string;
  reopenIdempotencyKey: string;
}>) => {
  const availability = getResolutionActionAvailability(context);

  return (
    <section aria-labelledby="citizen-actions-heading" className="complaint-panel">
      <div className="complaint-section-heading">
        <div>
          <p className="eyebrow">Your response</p>
          <h2 id="citizen-actions-heading">Review government action</h2>
        </div>
        <span className="workflow-label">Workflow version {context.workflowVersion}</span>
      </div>

      <div className="complaint-action-grid">
        <section aria-labelledby="feedback-heading" className="complaint-action-card">
          <h3 id="feedback-heading">Resolution feedback</h3>
          {availability.feedbackAllowed ? (
            <FeedbackForm
              complaintId={complaintId}
              context={context}
              idempotencyKey={feedbackIdempotencyKey}
            />
          ) : (
            <p className="policy-notice">{availability.feedbackUnavailableReason}</p>
          )}
        </section>

        <section aria-labelledby="reopen-heading" className="complaint-action-card">
          <h3 id="reopen-heading">Request another review</h3>
          {availability.reopenAllowed ? (
            <ReopenForm
              complaintId={complaintId}
              context={context}
              idempotencyKey={reopenIdempotencyKey}
            />
          ) : (
            <p className="policy-notice">{availability.reopenUnavailableReason}</p>
          )}
        </section>
      </div>
    </section>
  );
};
