import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ComplaintResolutionContext } from '@local-wellness/types';

import {
  ApiError,
  AuthenticationRequiredError,
  getVerifiedCitizenSession,
} from '../../../lib/api/client';
import {
  getComplaint,
  getComplaintResolutionContext,
  getComplaintTimeline,
  getUserFacingComplaintError,
} from '../../../lib/api/complaints';
import { signOutAction } from '../../../lib/auth/actions';
import { getCitizenAccountLabel } from '../../../lib/auth/presentation';
import {
  formatComplaintCode,
  formatComplaintDateTime,
  getComplaintStatusLabel,
  getComplaintStatusTone,
} from '../../../lib/complaints/presentation';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { ResolutionActions } from './resolution-actions';

export const dynamic = 'force-dynamic';

type ResolutionContextResult =
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ context: ComplaintResolutionContext; status: 'success' }>;

type ComplaintDetailResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'not-found' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      complaint: Awaited<ReturnType<typeof getComplaint>>;
      identity: Awaited<ReturnType<typeof getVerifiedCitizenSession>>['identity'];
      resolution: ResolutionContextResult;
      status: 'success';
      timeline: Awaited<ReturnType<typeof getComplaintTimeline>>;
    }>;

const loadComplaintDetail = async (complaintId: string): Promise<ComplaintDetailResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await getVerifiedCitizenSession(supabase);
    const [complaint, timeline] = await Promise.all([
      getComplaint(session.accessToken, complaintId),
      getComplaintTimeline(session.accessToken, complaintId),
    ]);

    if (
      complaint.id !== complaintId ||
      timeline.complaintId !== complaint.id ||
      timeline.entries.some((entry) => entry.complaintId !== complaint.id)
    ) {
      return {
        message: 'Local Wellness returned inconsistent complaint history. Please try again.',
        status: 'error',
      };
    }

    let resolution: ResolutionContextResult;
    try {
      const context = await getComplaintResolutionContext(session.accessToken, complaintId);
      resolution =
        context.complaintId === complaint.id
          ? { context, status: 'success' }
          : {
              message: 'Complaint actions are unavailable because the policy response was invalid.',
              status: 'error',
            };
    } catch (error) {
      resolution = { message: getUserFacingComplaintError(error), status: 'error' };
    }

    return {
      complaint,
      identity: session.identity,
      resolution,
      status: 'success',
      timeline,
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return { status: 'signed-out' };
    if (error instanceof ApiError && error.status === 404) return { status: 'not-found' };
    return { message: getUserFacingComplaintError(error), status: 'error' };
  }
};

export default async function ComplaintDetailPage({
  params,
}: Readonly<{ params: Promise<{ complaintId: string }> }>) {
  const { complaintId } = await params;
  const result = await loadComplaintDetail(complaintId);

  if (result.status === 'signed-out') {
    redirect(`/auth/login?next=${encodeURIComponent(`/complaints/${complaintId}`)}`);
  }
  if (result.status === 'not-found') notFound();
  if (result.status === 'error') {
    return (
      <main className="complaint-shell">
        <section className="complaint-state-card error-card">
          <p className="eyebrow">Private complaint</p>
          <h1>Complaint unavailable</h1>
          <p aria-live="assertive" className="error-notice" role="alert">
            {result.message}
          </p>
          <div className="button-row">
            <Link className="primary-link" href={`/complaints/${complaintId}`}>
              Try again
            </Link>
            <Link className="secondary-link" href="/complaints">
              Back to your complaints
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const complaint = result.complaint;
  const tone = getComplaintStatusTone(complaint.status);
  const resolution = result.resolution.status === 'success' ? result.resolution.context : null;
  const latestResolution = resolution?.latestResolution ?? null;

  return (
    <main className="complaint-shell complaint-detail-shell">
      <header className="complaint-page-header">
        <div>
          <p className="eyebrow">Private complaint · {complaint.complaintNumber}</p>
          <h1>{getComplaintStatusLabel(complaint.status)}</h1>
          <p className="lede">
            Submitted {formatComplaintDateTime(complaint.submittedAt)} · last updated{' '}
            {formatComplaintDateTime(complaint.updatedAt)}
          </p>
          <div className="auth-context compact">
            <span>Viewing as</span>
            <strong>{getCitizenAccountLabel(result.identity)}</strong>
            <p>This complaint and its private government updates are visible to this account.</p>
          </div>
        </div>
        <nav aria-label="Citizen navigation" className="complaint-navigation">
          <Link className="primary-link" href="/complaints">
            All complaints
          </Link>
          <Link className="secondary-link" href="/account">
            Profile
          </Link>
          <form action={signOutAction}>
            <button className="secondary-button" type="submit">
              Sign out / switch account
            </button>
          </form>
        </nav>
      </header>

      <section aria-labelledby="complaint-summary-heading" className="complaint-panel">
        <div className="complaint-section-heading">
          <div>
            <p className="eyebrow">Current position</p>
            <h2 id="complaint-summary-heading">Complaint status</h2>
          </div>
          <span className={`complaint-status complaint-status-${tone}`}>
            {getComplaintStatusLabel(complaint.status)}
          </span>
        </div>
        <dl className="complaint-detail-grid">
          <div>
            <dt>Complaint number</dt>
            <dd>{complaint.complaintNumber}</dd>
          </div>
          <div>
            <dt>Routing status</dt>
            <dd>{formatComplaintCode(complaint.routing.status)}</dd>
          </div>
          <div>
            <dt>Routing confidence</dt>
            <dd>{formatComplaintCode(complaint.routing.confidence.band)}</dd>
          </div>
          <div>
            <dt>Location verification</dt>
            <dd>{formatComplaintCode(complaint.location.verificationStatus)}</dd>
          </div>
          <div>
            <dt>Captured accuracy</dt>
            <dd>Within about {Math.round(complaint.location.accuracyMeters)} metres</dd>
          </div>
          <div>
            <dt>Private evidence</dt>
            <dd>{complaint.media.length.toLocaleString('en-IN')} item(s)</dd>
          </div>
        </dl>
        <div className="complaint-copy-block">
          <h3>Your report</h3>
          <p>{complaint.description ?? 'No description was stored with this complaint.'}</p>
        </div>
        <div className="complaint-copy-block">
          <h3>Routing explanation</h3>
          <p>{formatComplaintCode(complaint.routing.explanation.reason)}</p>
          {complaint.routing.explanation.fallbackUsed ? (
            <p className="field-hint">
              Verified fallback routing was used at depth{' '}
              {complaint.routing.explanation.fallbackDepth}.
            </p>
          ) : null}
        </div>
        <p className="security-note">
          Exact coordinates, internal assignment identifiers, and original private media are not
          rendered on this page.
        </p>
      </section>

      <section aria-labelledby="government-update-heading" className="complaint-panel">
        <div className="complaint-section-heading">
          <div>
            <p className="eyebrow">Government action</p>
            <h2 id="government-update-heading">Latest resolution update</h2>
          </div>
        </div>
        {result.resolution.status === 'error' ? (
          <p className="policy-notice" role="status">
            Accountability details are temporarily unavailable. {result.resolution.message}
          </p>
        ) : latestResolution === null ? (
          <p className="complaint-empty-copy">
            No completed resolution has been submitted by the governing body yet. Status changes
            remain visible in the timeline below.
          </p>
        ) : (
          <div className="resolution-summary">
            <p>
              {latestResolution.publicMessage ??
                'The governing body did not provide a public resolution message.'}
            </p>
            <dl className="complaint-detail-grid">
              <div>
                <dt>Resolution version</dt>
                <dd>{latestResolution.version}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>
                  {latestResolution.completedAt === null
                    ? 'Not recorded'
                    : formatComplaintDateTime(latestResolution.completedAt)}
                </dd>
              </div>
              <div>
                <dt>After-action evidence</dt>
                <dd>{latestResolution.afterEvidence.length.toLocaleString('en-IN')} item(s)</dd>
              </div>
              <div>
                <dt>Work reference</dt>
                <dd>{latestResolution.workReference?.referenceNumber ?? 'Not recorded'}</dd>
              </div>
            </dl>
            {latestResolution.workReference?.description === null ||
            latestResolution.workReference === null ? null : (
              <p className="field-hint">{latestResolution.workReference.description}</p>
            )}
          </div>
        )}
      </section>

      {resolution === null ? null : (
        <ResolutionActions
          complaintId={complaint.id}
          context={resolution}
          feedbackIdempotencyKey={`citizen-web-feedback:${globalThis.crypto.randomUUID()}`}
          reopenIdempotencyKey={`citizen-web-reopen:${globalThis.crypto.randomUUID()}`}
        />
      )}

      {resolution === null ? null : (
        <section aria-labelledby="accountability-history-heading" className="complaint-panel">
          <div className="complaint-section-heading">
            <div>
              <p className="eyebrow">Citizen accountability</p>
              <h2 id="accountability-history-heading">Your action history</h2>
            </div>
          </div>
          {resolution.feedback.length === 0 &&
          resolution.reopenRequests.length === 0 &&
          resolution.escalations.length === 0 ? (
            <p className="complaint-empty-copy">No feedback or reopening requests yet.</p>
          ) : (
            <ul className="accountability-history-list">
              {resolution.feedback.map((feedback) => (
                <li key={feedback.id}>
                  <strong>Feedback: {formatComplaintCode(feedback.outcome)}</strong>
                  <time dateTime={feedback.submittedAt}>
                    {formatComplaintDateTime(feedback.submittedAt)}
                  </time>
                  {feedback.comment === null ? null : <p>{feedback.comment}</p>}
                </li>
              ))}
              {resolution.reopenRequests.map((request) => (
                <li key={request.id}>
                  <strong>
                    Review request {request.attemptNumber} ·{' '}
                    {formatComplaintCode(request.resultingStatus)}
                  </strong>
                  <time dateTime={request.requestedAt}>
                    {formatComplaintDateTime(request.requestedAt)}
                  </time>
                  <p>{request.explanation}</p>
                </li>
              ))}
              {resolution.escalations.map((escalation) => (
                <li key={escalation.id}>
                  <strong>Escalated to level {escalation.level}</strong>
                  <time dateTime={escalation.occurredAt}>
                    {formatComplaintDateTime(escalation.occurredAt)}
                  </time>
                  <p>{formatComplaintCode(escalation.reasonCode)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="complaint-timeline-heading" className="complaint-panel">
        <div className="complaint-section-heading">
          <div>
            <p className="eyebrow">Official history</p>
            <h2 id="complaint-timeline-heading">Complaint timeline</h2>
          </div>
        </div>
        {result.timeline.entries.length === 0 ? (
          <p className="complaint-empty-copy">No official timeline events are available yet.</p>
        ) : (
          <ol className="complaint-timeline">
            {result.timeline.entries.map((entry) => (
              <li key={entry.id}>
                <span aria-hidden="true" className="timeline-marker" />
                <div>
                  <div className="timeline-topline">
                    <strong>{entry.title}</strong>
                    <time dateTime={entry.occurredAt}>
                      {formatComplaintDateTime(entry.occurredAt)}
                    </time>
                  </div>
                  <span className="timeline-status">{getComplaintStatusLabel(entry.status)}</span>
                  {entry.description === null ? null : <p>{entry.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
