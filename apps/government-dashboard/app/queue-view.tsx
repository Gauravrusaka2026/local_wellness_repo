import React from 'react';
import {
  complaintStatuses,
  governmentComplaintQueues,
  type GovernmentAccessScope,
  type GovernmentComplaintQueueResult,
} from '@local-wellness/types';

import { getScopeTypeLabel } from '../lib/api/access-scope';
import {
  buildComplaintHref,
  buildQueueHref,
  type ParsedQueueSearch,
} from '../lib/complaints/query';
import { formatDateTime, getQueueLabel, getStatusLabel } from '../lib/complaints/presentation';

export const QueueFilters = ({
  parsed,
  scope,
}: Readonly<{ parsed: ParsedQueueSearch; scope: GovernmentAccessScope }>) => (
  <section aria-labelledby="filters-heading" className="content-card filter-card">
    <div className="section-heading compact-heading">
      <div>
        <p className="eyebrow">Queue controls</p>
        <h2 id="filters-heading">Filter complaints</h2>
      </div>
      <a className="text-link" href="/">
        Clear all
      </a>
    </div>
    <form action="/" className="filter-grid" method="get">
      <div className="field-group">
        <label htmlFor="scope">Active access scope</label>
        <select defaultValue={parsed.filters.scopeRoleAssignmentId} id="scope" name="scope">
          <option value="">All permitted scopes</option>
          {scope.roles.map((role) => (
            <option key={role.assignmentId} value={role.assignmentId}>
              {role.name} — {getScopeTypeLabel(role.scopeType)}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="status">Status</label>
        <select defaultValue={parsed.filters.status} id="status" name="status">
          <option value="">All statuses</option>
          {complaintStatuses.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group filter-search">
        <label htmlFor="search">Complaint number</label>
        <input
          defaultValue={parsed.filters.search}
          id="search"
          maxLength={120}
          name="search"
          placeholder="LW-20260714-…"
          type="search"
        />
      </div>
      <div className="field-group">
        <label htmlFor="from">Submitted from (IST)</label>
        <input defaultValue={parsed.filters.fromDate} id="from" name="from" type="date" />
      </div>
      <div className="field-group">
        <label htmlFor="to">Submitted to (IST)</label>
        <input defaultValue={parsed.filters.toDate} id="to" name="to" type="date" />
      </div>
      {parsed.filters.queue === '' ? null : (
        <input name="queue" type="hidden" value={parsed.filters.queue} />
      )}
      <div className="filter-actions">
        <button className="primary-button" type="submit">
          Apply filters
        </button>
      </div>
    </form>
    {parsed.error === null ? null : (
      <p aria-live="assertive" className="error-notice" role="alert">
        {parsed.error}
      </p>
    )}
  </section>
);

export const QueueNavigation = ({ parsed }: Readonly<{ parsed: ParsedQueueSearch }>) => (
  <nav aria-label="Complaint queues" className="queue-tabs">
    <a
      aria-current={parsed.filters.queue === '' ? 'page' : undefined}
      href={buildQueueHref(parsed.filters, { cursor: '', queue: '' })}
    >
      All
    </a>
    {governmentComplaintQueues.map((queue) => (
      <a
        aria-current={parsed.filters.queue === queue ? 'page' : undefined}
        href={buildQueueHref(parsed.filters, { cursor: '', queue })}
        key={queue}
      >
        {getQueueLabel(queue)}
      </a>
    ))}
  </nav>
);

const ComplaintFlags = ({
  flags,
}: Readonly<{ flags: GovernmentComplaintQueueResult['items'][number]['flags'] }>) => {
  const labels = [
    flags.isUnassigned ? 'Unassigned' : null,
    flags.isReopened ? 'Reopened' : null,
    flags.isTransferred ? 'Transferred' : null,
    flags.isAwaitingCitizenVerification ? 'Awaiting citizen verification' : null,
  ].filter((value): value is string => value !== null);

  return labels.length === 0 ? (
    <span className="muted">None</span>
  ) : (
    <ul className="flag-list" aria-label="Operational flags">
      {labels.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
};

export const ComplaintQueue = ({
  parsed,
  result,
}: Readonly<{ parsed: ParsedQueueSearch; result: GovernmentComplaintQueueResult }>) => (
  <section aria-labelledby="queue-heading" className="content-card queue-card">
    <div className="section-heading compact-heading">
      <div>
        <p className="eyebrow">Current results</p>
        <h2 id="queue-heading">Complaint queue</h2>
      </div>
      <span aria-live="polite" className="result-count">
        {result.items.length} {result.items.length === 1 ? 'complaint' : 'complaints'} on this page
      </span>
    </div>

    {result.items.length === 0 ? (
      <div className="empty-state" role="status">
        <h3>No complaints found</h3>
        <p>No complaint currently matches this access scope and filter set.</p>
      </div>
    ) : (
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption className="visually-hidden">Access-scoped government complaint queue</caption>
          <thead>
            <tr>
              <th scope="col">Complaint</th>
              <th scope="col">Status</th>
              <th scope="col">Jurisdiction</th>
              <th scope="col">Assignment</th>
              <th scope="col">Submitted</th>
              <th scope="col">Flags</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <a
                    className="complaint-link"
                    href={buildComplaintHref(item.id, parsed.filters.scopeRoleAssignmentId)}
                  >
                    {item.complaintNumber}
                  </a>
                  <span>{item.categoryName}</span>
                </th>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>
                  <strong>{item.currentAssignment.localBodyName}</strong>
                  <span>{item.currentAssignment.wardName ?? 'Municipality-wide'}</span>
                </td>
                <td>
                  <strong>{item.currentAssignment.departmentName}</strong>
                  <span>
                    {item.currentAssignment.officerName ?? item.currentAssignment.officerRoleName}
                  </span>
                </td>
                <td>{formatDateTime(item.submittedAt)}</td>
                <td>
                  <ComplaintFlags flags={item.flags} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <nav aria-label="Queue pagination" className="pagination">
      {parsed.filters.cursor === '' ? (
        <span className="muted">First page</span>
      ) : (
        <a className="secondary-link" href={buildQueueHref(parsed.filters, { cursor: '' })}>
          Return to first page
        </a>
      )}
      {result.hasMore && result.nextCursor !== null ? (
        <a
          className="primary-link"
          href={buildQueueHref(parsed.filters, { cursor: result.nextCursor })}
          rel="next"
        >
          Next page
        </a>
      ) : (
        <span className="muted">End of results</span>
      )}
    </nav>
  </section>
);
