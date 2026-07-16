import { randomUUID } from 'node:crypto';
import React from 'react';
import {
  governmentComplaintAllowedActions,
  type GovernmentComplaintAssignmentOption,
  type GovernmentComplaintAccountability,
  type GovernmentComplaintDetail,
  type GovernmentComplaintSlaSummary,
  type ComplaintMessage,
} from '@local-wellness/types';

import { formatBytes, formatDateTime, getStatusLabel } from '../../../lib/complaints/presentation';
import { GovernmentActionForms } from './action-forms';
import { ConversationPanel } from './conversation-panel';
import { ComplaintSlaPanel } from './sla-panel';

const DefinitionList = ({
  items,
}: Readonly<{ items: ReadonlyArray<readonly [string, string]> }>) => (
  <dl className="definition-grid">
    {items.map(([term, description]) => (
      <div key={term}>
        <dt>{term}</dt>
        <dd>{description}</dd>
      </div>
    ))}
  </dl>
);

export const ComplaintDetailView = ({
  accountability = null,
  accountabilityError = null,
  assignmentOptions,
  communicationError = null,
  complaint,
  messages,
  queueHref = '/',
  sla = null,
  slaError = null,
}: Readonly<{
  accountability?: GovernmentComplaintAccountability | null;
  accountabilityError?: string | null;
  assignmentOptions: GovernmentComplaintAssignmentOption[];
  communicationError?: string | null;
  complaint: GovernmentComplaintDetail;
  messages: ComplaintMessage[];
  queueHref?: string;
  sla?: GovernmentComplaintSlaSummary | null;
  slaError?: string | null;
}>) => {
  const assignment = complaint.currentAssignment;
  const operationKeys = Object.fromEntries(
    governmentComplaintAllowedActions.map((action) => [action, randomUUID()]),
  ) as Record<(typeof governmentComplaintAllowedActions)[number], string>;

  return (
    <>
      <a className="back-link" href={queueHref}>
        ← Back to complaint queue
      </a>
      <header className="complaint-header">
        <div>
          <p className="eyebrow">Government complaint workspace</p>
          <h1>{complaint.complaintNumber}</h1>
          <p className="lede">{complaint.categoryName}</p>
        </div>
        <div className="header-status">
          <span className={`status-badge status-${complaint.status}`}>
            {getStatusLabel(complaint.status)}
          </span>
          <span>Updated {formatDateTime(complaint.updatedAt)}</span>
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section aria-labelledby="issue-heading" className="content-card">
            <p className="eyebrow">Citizen report</p>
            <h2 id="issue-heading">Issue description</h2>
            <p className="complaint-description">{complaint.description}</p>
            <DefinitionList
              items={[
                ['Submitted', formatDateTime(complaint.submittedAt)],
                ['Current status', getStatusLabel(complaint.status)],
                ['Workflow version', String(complaint.workflowVersion)],
              ]}
            />
          </section>

          <ComplaintSlaPanel error={slaError} summary={sla} />

          <section aria-labelledby="location-heading" className="content-card location-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Authorized location context</p>
                <h2 id="location-heading">Complaint location</h2>
              </div>
              <span className="privacy-badge">Restricted operational data</span>
            </div>
            <p>
              The location is shown as verified text. No external map, tile provider, or coordinate
              link is used, so this private location is not sent to another service.
            </p>
            <DefinitionList
              items={[
                ['Municipality', assignment.localBodyName],
                ['Ward', assignment.wardName ?? 'Municipality-wide scope'],
                ['Latitude', complaint.location.latitude.toFixed(6)],
                ['Longitude', complaint.location.longitude.toFixed(6)],
                ['Reported accuracy', `${complaint.location.accuracyMeters.toFixed(1)} metres`],
                ['Verification', complaint.location.verificationStatus.replaceAll('_', ' ')],
                ['Captured', formatDateTime(complaint.location.capturedAt)],
                ['Provider', complaint.location.provider],
              ]}
            />
            <div className="map-placeholder" role="note">
              <strong>Interactive map not configured</strong>
              <span>A reviewed map provider and coordinate-sharing policy are required first.</span>
            </div>
          </section>

          <section aria-labelledby="assignment-heading" className="content-card">
            <p className="eyebrow">Current responsibility</p>
            <h2 id="assignment-heading">Assignment</h2>
            <DefinitionList
              items={[
                ['Authority', assignment.authorityName],
                ['Department', assignment.departmentName],
                ['Officer role', assignment.officerRoleName],
                ['Current officer', assignment.officerName ?? 'No verified incumbent assigned'],
                ['Assignment source', assignment.source.replaceAll('_', ' ')],
                ['Assigned', formatDateTime(assignment.assignedAt)],
              ]}
            />
            <h3>Routing explanation</h3>
            <DefinitionList
              items={[
                ['Decision status', complaint.routingSummary.decisionStatus.replaceAll('_', ' ')],
                ['Confidence', `${Math.round(complaint.routingSummary.confidenceScore * 100)}%`],
                ['Explanation code', complaint.routingSummary.explanationCode ?? 'Unavailable'],
                [
                  'Fallback',
                  complaint.routingSummary.fallbackUsed
                    ? `Used (${complaint.routingSummary.fallbackDepth} levels)`
                    : 'Not used',
                ],
                ['Resolved', formatDateTime(complaint.routingSummary.resolvedAt)],
              ]}
            />
            <h3>Assignment history</h3>
            <ol className="activity-list">
              {complaint.assignmentHistory.map((history) => (
                <li key={history.id}>
                  <div>
                    <strong>
                      {history.departmentName} · {history.officerRoleName}
                    </strong>
                    <span>
                      {history.officerName ?? 'No verified incumbent'} · {history.status}
                    </span>
                  </div>
                  <time dateTime={history.assignedAt}>{formatDateTime(history.assignedAt)}</time>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="evidence-heading" className="content-card">
            <p className="eyebrow">Private evidence</p>
            <h2 id="evidence-heading">Submitted media</h2>
            {complaint.media.length === 0 ? (
              <p className="empty-state">No media metadata is available.</p>
            ) : (
              <ul className="record-list">
                {complaint.media.map((media) => (
                  <li key={media.id}>
                    <strong>{media.kind}</strong>
                    <span>
                      {media.mimeType} · {formatBytes(media.byteSize)}
                    </span>
                    <span>
                      Processing: {media.processingStatus}; moderation: {media.moderationStatus}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="field-hint">
              This view exposes metadata only; it never creates a public original-media URL.
            </p>
          </section>

          <section aria-labelledby="timeline-heading" className="content-card">
            <p className="eyebrow">Immutable activity</p>
            <h2 id="timeline-heading">Status timeline</h2>
            <ol className="timeline">
              {complaint.timeline.map((entry) => (
                <li key={entry.id}>
                  <span className="timeline-marker" aria-hidden="true" />
                  <div>
                    <strong>{getStatusLabel(entry.toStatus)}</strong>
                    <span>{entry.publicMessage ?? entry.reasonCode.replaceAll('_', ' ')}</span>
                    <time dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="operations-heading" className="content-card">
            <p className="eyebrow">Operational records</p>
            <h2 id="operations-heading">Inspections, work, and dependencies</h2>
            <h3>Inspections</h3>
            {complaint.inspections.length === 0 ? (
              <p className="muted">No inspections recorded.</p>
            ) : (
              <ul className="record-list">
                {complaint.inspections.map((item) => (
                  <li key={item.id}>
                    <strong>{item.status}</strong>
                    <span>{formatDateTime(item.scheduledFor)}</span>
                    <span>{item.summary ?? item.instructions ?? 'No notes'}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3>Work references</h3>
            {complaint.workReferences.length === 0 ? (
              <p className="muted">No work references recorded.</p>
            ) : (
              <ul className="record-list">
                {complaint.workReferences.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.referenceType}: {item.referenceNumber}
                    </strong>
                    <span>{item.description ?? 'No description'}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3>External dependencies</h3>
            {complaint.externalDependencies.length === 0 ? (
              <p className="muted">No external dependencies recorded.</p>
            ) : (
              <ul className="record-list">
                {complaint.externalDependencies.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.dependencyType.replaceAll('_', ' ')} · {item.status}
                    </strong>
                    <span>{item.description}</span>
                    <span>Expected: {formatDateTime(item.expectedBy)}</span>
                    {item.status === 'resolved' ? (
                      <>
                        <span>Resolution: {item.resolutionSummary ?? 'No summary recorded'}</span>
                        <span>Resolved: {formatDateTime(item.resolvedAt)}</span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="notes-heading" className="content-card private-panel">
            <p className="eyebrow">Government-only</p>
            <h2 id="notes-heading">Private internal notes</h2>
            <p>These notes are restricted to authorized staff and are never shown to citizens.</p>
            {complaint.internalNotes.length === 0 ? (
              <p className="muted">No private notes recorded.</p>
            ) : (
              <ol className="record-list">
                {complaint.internalNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.authorDisplayName ?? 'Authorized staff member'}</strong>
                    <span>{note.body}</span>
                    <time dateTime={note.createdAt}>{formatDateTime(note.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <ConversationPanel
            complaintId={complaint.id}
            loadError={communicationError}
            messages={messages}
          />

          <section aria-labelledby="resolution-evidence-heading" className="content-card">
            <p className="eyebrow">Private completion evidence</p>
            <h2 id="resolution-evidence-heading">Resolution evidence</h2>
            {complaint.resolutionEvidence.length === 0 ? (
              <p className="muted">No resolution evidence uploaded.</p>
            ) : (
              <ul className="record-list">
                {complaint.resolutionEvidence.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.kind} · {item.uploadStatus}
                    </strong>
                    <span>
                      {item.mimeType} · {formatBytes(item.byteSize)}
                    </span>
                    <span>
                      {item.availableForResolution
                        ? 'Available for a resolution submission'
                        : 'Retained as resolution history'}
                    </span>
                    <span>Added {formatDateTime(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="accountability-heading" className="content-card">
            <p className="eyebrow">Resolution accountability</p>
            <h2 id="accountability-heading">Resolution, feedback, and reopening history</h2>
            <p className="field-hint">
              This history is versioned and access-scoped. Completion notes remain government-only;
              citizens receive only the public resolution message.
            </p>
            {accountabilityError === null ? null : (
              <p className="error-notice" role="alert">
                Accountability history is temporarily unavailable. {accountabilityError}
              </p>
            )}
            {accountability === null ? (
              accountabilityError === null ? (
                <p className="muted">No accountability history is available.</p>
              ) : null
            ) : (
              <>
                <h3>Resolution history</h3>
                {accountability.resolutionHistory.length === 0 ? (
                  <p className="muted">No resolutions recorded.</p>
                ) : (
                  <ol className="record-list">
                    {accountability.resolutionHistory.map((resolution) => (
                      <li key={resolution.id}>
                        <strong>Resolution version {resolution.version}</strong>
                        <span>{resolution.completionNote}</span>
                        <span>
                          Citizen message:{' '}
                          {resolution.publicMessage ?? 'No public message recorded'}
                        </span>
                        <span>
                          Completed:{' '}
                          {resolution.completedAt === null
                            ? 'Time unavailable'
                            : formatDateTime(resolution.completedAt)}
                        </span>
                        {resolution.completionLocation === null ? (
                          <span>Completion location unavailable</span>
                        ) : (
                          <span>
                            Completion location: {resolution.completionLocation.latitude.toFixed(6)}
                            , {resolution.completionLocation.longitude.toFixed(6)} · accuracy{' '}
                            {resolution.completionLocation.accuracyMeters.toFixed(1)} metres
                          </span>
                        )}
                        {resolution.distanceFromComplaintMeters === null ? null : (
                          <span>
                            Distance from report:{' '}
                            {Math.round(resolution.distanceFromComplaintMeters)} metres
                          </span>
                        )}
                        {resolution.workReference === null ? null : (
                          <span>
                            Work reference: {resolution.workReference.referenceType} ·{' '}
                            {resolution.workReference.referenceNumber}
                          </span>
                        )}
                        <span>
                          Evidence: {resolution.beforeEvidence.length} before ·{' '}
                          {resolution.afterEvidence.length} after ·{' '}
                          {resolution.reopenEvidence.length} reopen
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                <h3>Citizen feedback</h3>
                {accountability.feedback.length === 0 ? (
                  <p className="muted">No citizen feedback recorded.</p>
                ) : (
                  <ol className="record-list">
                    {accountability.feedback.map((feedback) => (
                      <li key={feedback.id}>
                        <strong>{feedback.outcome.replaceAll('_', ' ')}</strong>
                        <span>{feedback.comment ?? 'No citizen comment'}</span>
                        {feedback.ratings === null ? (
                          <span>No ratings recorded</span>
                        ) : (
                          <span>
                            Satisfaction {feedback.ratings.satisfaction} · Speed{' '}
                            {feedback.ratings.speed} · Quality {feedback.ratings.quality} ·
                            Communication {feedback.ratings.communication}
                          </span>
                        )}
                        <time dateTime={feedback.submittedAt}>
                          {formatDateTime(feedback.submittedAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}

                <h3>Reopen requests</h3>
                {accountability.reopenRequests.length === 0 ? (
                  <p className="muted">No reopen requests recorded.</p>
                ) : (
                  <ol className="record-list">
                    {accountability.reopenRequests.map((request) => (
                      <li key={request.id}>
                        <strong>
                          Attempt {request.attemptNumber} · {request.resultingStatus}
                        </strong>
                        <span>{request.reasonCode.replaceAll('_', ' ')}</span>
                        <span>{request.explanation}</span>
                        <span>{request.evidenceIds.length} evidence item(s)</span>
                        <time dateTime={request.requestedAt}>
                          {formatDateTime(request.requestedAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}

                <h3>Escalations</h3>
                {accountability.escalations.length === 0 ? (
                  <p className="muted">No escalations recorded.</p>
                ) : (
                  <ol className="record-list">
                    {accountability.escalations.map((event) => (
                      <li key={event.id}>
                        <strong>Escalation level {event.level}</strong>
                        <span>{event.reasonCode.replaceAll('_', ' ')}</span>
                        <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>
        </div>

        <aside aria-labelledby="actions-heading" className="content-card action-panel">
          <p className="eyebrow">Authorized operations</p>
          <h2 id="actions-heading">Take action</h2>
          <p className="field-hint">
            Available actions come from the server for your current role, scope, and this workflow
            version.
          </p>
          <GovernmentActionForms
            allowedActions={complaint.allowedActions}
            allowedStatusTransitions={complaint.allowedStatusTransitions}
            assignmentOptions={assignmentOptions}
            complaintId={complaint.id}
            evidence={complaint.resolutionEvidence}
            externalDependencies={complaint.externalDependencies}
            inspections={complaint.inspections}
            operationKeys={operationKeys}
            workReferences={complaint.workReferences}
            workflowVersion={complaint.workflowVersion}
          />
        </aside>
      </div>
    </>
  );
};
