import React from 'react';
import type { GovernmentComplaintSlaSummary } from '@local-wellness/types';

import { formatDateTime } from '../../../lib/complaints/presentation';

const unavailableCopy = {
  no_approved_policy: {
    title: 'No approved SLA policy',
    message: 'No approved policy applies to this complaint and assignment at this time.',
  },
  ambiguous_policy: {
    title: 'SLA policy is ambiguous',
    message: 'More than one approved policy matched, so the system did not choose a deadline.',
  },
  invalid_configuration: {
    title: 'SLA policy configuration is invalid',
    message: 'A candidate policy failed validation. No deadline should be inferred manually.',
  },
  not_materialized: {
    title: 'SLA clocks are not materialized',
    message: 'A policy may apply, but durable milestone clocks are not available yet.',
  },
} as const;

const milestoneLabels = {
  acknowledgement: 'Acknowledgement',
  inspection: 'Inspection',
  resolution: 'Resolution',
} as const;

const formatOptionalTime = (value: string | null): string =>
  value === null ? 'Not recorded' : formatDateTime(value);

export const ComplaintSlaPanel = ({
  error = null,
  summary = null,
}: Readonly<{
  error?: string | null;
  summary?: GovernmentComplaintSlaSummary | null;
}>) => (
  <section aria-labelledby="sla-heading" className="content-card">
    <div className="section-heading compact-heading">
      <div>
        <p className="eyebrow">Service accountability</p>
        <h2 id="sla-heading">SLA milestones</h2>
      </div>
      <span className="privacy-badge">Policy-derived</span>
    </div>
    <p className="field-hint">
      Deadlines and escalation events come only from the reviewed, versioned policy recorded by the
      system.
    </p>
    {error === null ? null : (
      <p className="error-notice" role="alert">
        SLA information is temporarily unavailable. {error}
      </p>
    )}
    {summary === null ? (
      error === null ? (
        <p className="muted">No SLA information was returned.</p>
      ) : null
    ) : !summary.policyApplied ? (
      <div className="warning-notice" role="status">
        <strong>
          {unavailableCopy[summary.unavailableReason ?? 'invalid_configuration'].title}
        </strong>
        <p>{unavailableCopy[summary.unavailableReason ?? 'invalid_configuration'].message}</p>
      </div>
    ) : summary.clocks.length === 0 ? (
      <div className="warning-notice" role="status">
        <strong>SLA clocks are not materialized</strong>
        <p>An applied policy was returned without durable milestone clocks.</p>
      </div>
    ) : (
      <>
        <ul className="sla-clock-grid">
          {summary.clocks.map((clock) => (
            <li key={clock.id}>
              <div className="sla-clock-heading">
                <h3>{milestoneLabels[clock.milestone]}</h3>
                <span className={`sla-state sla-state-${clock.state}`}>
                  {clock.state.replaceAll('_', ' ')}
                </span>
              </div>
              <dl className="definition-grid">
                <div>
                  <dt>Target</dt>
                  <dd>{formatDateTime(clock.targetAt)}</dd>
                </div>
                <div>
                  <dt>Business time</dt>
                  <dd>{clock.targetBusinessMinutes.toLocaleString()} minutes</dd>
                </div>
                <div>
                  <dt>Policy</dt>
                  <dd>
                    {clock.policyCode} · v{clock.policyVersion}
                  </dd>
                </div>
                <div>
                  <dt>Cycle</dt>
                  <dd>{clock.cycle}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{formatOptionalTime(clock.completedAt)}</dd>
                </div>
                <div>
                  <dt>Breached</dt>
                  <dd>{formatOptionalTime(clock.breachedAt)}</dd>
                </div>
              </dl>
              {clock.externalDependencySegment ? (
                <p className="field-hint">Measured in the external-dependency segment.</p>
              ) : null}
            </li>
          ))}
        </ul>
        <h3>Recorded SLA escalations</h3>
        {summary.escalations.length === 0 ? (
          <p className="muted">No SLA escalation event has been recorded.</p>
        ) : (
          <ol className="record-list">
            {summary.escalations.map((event) => (
              <li key={event.id}>
                <strong>
                  {milestoneLabels[event.milestone]} · level {event.level}
                </strong>
                <span>
                  {event.action.replaceAll('_', ' ')} · resulting status{' '}
                  {event.resultingStatus.replaceAll('_', ' ')}
                </span>
                <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
              </li>
            ))}
          </ol>
        )}
      </>
    )}
  </section>
);
