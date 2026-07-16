'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import {
  publicComplaintStatuses,
  type PublicComplaintMapItem,
  type PublicComplaintMapResult,
  type PublicComplaintStatus,
  type PublicTransparencyViewport,
} from '@local-wellness/types';

import { getUserFacingApiError } from '../../lib/api/client';
import {
  createNearbyViewport,
  listPublicComplaints,
  mergePublicComplaintPages,
  projectApproximatePoint,
} from '../../lib/api/transparency';
import {
  createWebTransparencyQuery,
  defaultWebTransparencyFilters,
  type WebTransparencyFilters,
} from '../../lib/api/transparency-filters';

type LoadState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ result: PublicComplaintMapResult; status: 'ready' }>;

const statusLabels: Record<PublicComplaintStatus, string> = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
};

const statusClassNames: Record<PublicComplaintStatus, string> = {
  closed: 'is-closed',
  in_progress: 'is-in-progress',
  reported: 'is-reported',
  resolved: 'is-resolved',
};

const requestBrowserViewport = (): Promise<PublicTransparencyViewport> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot provide a location.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(createNearbyViewport(coords.latitude, coords.longitude)),
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access was not granted. Allow it to explore public reports near you.'
            : 'Your nearby area could not be determined. Check location services and try again.';
        reject(new Error(message));
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    );
  });

const CoordinatePlot = ({
  items,
  viewport,
}: Readonly<{
  items: readonly PublicComplaintMapItem[];
  viewport: PublicTransparencyViewport;
}>) => (
  <figure className="transparency-plot-card">
    <figcaption>
      <strong>Approximate public locations</strong>
      <span>
        This first-party plot has no basemap and sends no coordinates to a map provider. Use the
        report list for full accessible details.
      </span>
    </figcaption>
    <svg
      aria-labelledby="transparency-plot-title transparency-plot-description"
      className="transparency-plot"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 100 100"
    >
      <title id="transparency-plot-title">Approximate positions of public civic reports</title>
      <desc id="transparency-plot-description">
        {items.length} generalized report locations are shown. Exact complaint and viewer
        coordinates are not displayed.
      </desc>
      {[20, 40, 60, 80].map((position) => (
        <g key={position}>
          <line className="plot-grid-line" x1={position} x2={position} y1="0" y2="100" />
          <line className="plot-grid-line" x1="0" x2="100" y1={position} y2={position} />
        </g>
      ))}
      {items.map((item) => {
        const point = projectApproximatePoint(item.location, viewport);
        return (
          <circle
            className={`plot-point ${statusClassNames[item.status]}`}
            cx={point.xPercent}
            cy={point.yPercent}
            key={item.publicId}
            r="2.4"
          >
            <title>
              {item.category.name} · {statusLabels[item.status]} · generalized to about{' '}
              {item.location.precisionMeters} metres
            </title>
          </circle>
        );
      })}
    </svg>
    <ul aria-label="Plot status legend" className="plot-legend">
      {publicComplaintStatuses.map((status) => (
        <li key={status}>
          <span aria-hidden="true" className={`legend-dot ${statusClassNames[status]}`} />
          {statusLabels[status]}
        </li>
      ))}
    </ul>
  </figure>
);

export function TransparencyExplorer() {
  const [filters, setFilters] = useState<WebTransparencyFilters>(defaultWebTransparencyFilters);
  const [appliedFilters, setAppliedFilters] = useState<WebTransparencyFilters>(
    defaultWebTransparencyFilters,
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [viewport, setViewport] = useState<PublicTransparencyViewport | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const isBusy = loadState.status === 'loading' || isLoadingMore;

  const categoryOptions = useMemo(() => {
    const items = loadState.status === 'ready' ? loadState.result.items : [];
    return [...new Map(items.map((item) => [item.category.code, item.category])).values()].sort(
      (left, right) => left.name.localeCompare(right.name),
    );
  }, [loadState]);

  const load = async (
    requestedViewport: PublicTransparencyViewport,
    requestedFilters: WebTransparencyFilters,
  ): Promise<void> => {
    setLoadState({ status: 'loading' });
    setPaginationError(null);
    setViewport(requestedViewport);
    try {
      const result = await listPublicComplaints(
        createWebTransparencyQuery(requestedViewport, requestedFilters),
      );
      setAppliedFilters(requestedFilters);
      setLoadState({ result, status: 'ready' });
    } catch (error) {
      setLoadState({ message: getUserFacingApiError(error), status: 'error' });
    }
  };

  const loadCurrentArea = async (): Promise<void> => {
    setLoadState({ status: 'loading' });
    try {
      const requestedViewport = await requestBrowserViewport();
      await load(requestedViewport, filters);
    } catch (error) {
      setLoadState({
        message: error instanceof Error ? error.message : 'Your nearby area is unavailable.',
        status: 'error',
      });
    }
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (viewport !== null) void load(viewport, filters);
  };

  const loadMore = async (): Promise<void> => {
    if (
      viewport === null ||
      loadState.status !== 'ready' ||
      loadState.result.nextCursor === null ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);
    setPaginationError(null);
    try {
      const next = await listPublicComplaints(
        createWebTransparencyQuery(viewport, appliedFilters, loadState.result.nextCursor),
      );
      setLoadState({
        result: mergePublicComplaintPages(loadState.result, next),
        status: 'ready',
      });
    } catch (error) {
      setPaginationError(getUserFacingApiError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="transparency-layout">
      <aside aria-labelledby="transparency-filter-heading" className="transparency-sidebar">
        <h2 id="transparency-filter-heading">Explore an area</h2>
        <p>
          Choose your current area before Local Wellness requests public, already-generalized report
          locations. Your exact position is not displayed.
        </p>
        <button
          className="primary-button"
          disabled={isBusy}
          onClick={() => void loadCurrentArea()}
          type="button"
        >
          {viewport === null ? 'Use my current area' : 'Refresh current area'}
        </button>
        <form className="transparency-filters" onSubmit={applyFilters}>
          <label htmlFor="transparency-status">Status</label>
          <select
            disabled={viewport === null || isBusy}
            id="transparency-status"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as WebTransparencyFilters['status'],
              }))
            }
            value={filters.status}
          >
            <option value="">All public statuses</option>
            {publicComplaintStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <label htmlFor="transparency-category">Category</label>
          <select
            disabled={viewport === null || isBusy}
            id="transparency-category"
            onChange={(event) =>
              setFilters((current) => ({ ...current, categoryCode: event.target.value }))
            }
            value={filters.categoryCode}
          >
            <option value="">All public categories</option>
            {categoryOptions.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="transparency-date-grid">
            <label htmlFor="transparency-from">
              From
              <input
                disabled={viewport === null || isBusy}
                id="transparency-from"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value }))
                }
                type="date"
                value={filters.from}
              />
            </label>
            <label htmlFor="transparency-to">
              To
              <input
                disabled={viewport === null || isBusy}
                id="transparency-to"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value }))
                }
                type="date"
                value={filters.to}
              />
            </label>
          </div>
          <button className="secondary-button" disabled={viewport === null || isBusy} type="submit">
            Apply filters
          </button>
        </form>
      </aside>

      <section aria-busy={loadState.status === 'loading'} className="transparency-results">
        {loadState.status === 'idle' ? (
          <div className="transparency-state-card">
            <h2>Public reports are ready when you are</h2>
            <p>
              Location access is used only to choose a nearby viewport. No external map or tile
              service is loaded.
            </p>
          </div>
        ) : null}
        {loadState.status === 'loading' ? (
          <div aria-live="polite" className="transparency-state-card">
            <p className="loading-indicator">Loading reviewed public reports…</p>
          </div>
        ) : null}
        {loadState.status === 'error' ? (
          <div className="transparency-state-card">
            <h2>Public reports unavailable</h2>
            <p aria-live="assertive" className="error-notice" role="alert">
              {loadState.message}
            </p>
            <button
              className="secondary-button"
              onClick={() => void (viewport === null ? loadCurrentArea() : load(viewport, filters))}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
        {loadState.status === 'ready' && loadState.result.items.length === 0 ? (
          <div className="transparency-state-card">
            <h2>No reviewed public reports in this area</h2>
            <p>
              Private, sensitive, withdrawn, and unreviewed complaints are never shown here. Try a
              different filter later.
            </p>
          </div>
        ) : null}
        {loadState.status === 'ready' && loadState.result.items.length > 0 && viewport !== null ? (
          <>
            <CoordinatePlot items={loadState.result.items} viewport={viewport} />
            <div className="transparency-list-heading">
              <div>
                <p className="eyebrow">Reviewed public records</p>
                <h2>{loadState.result.items.length} nearby report(s)</h2>
              </div>
              <p>Locations are approximate and may represent an area rather than an exact point.</p>
            </div>
            <ol className="transparency-list">
              {loadState.result.items.map((item) => (
                <li key={item.publicId}>
                  <article className="transparency-report-card">
                    <div className="transparency-report-topline">
                      <span className={`status-chip ${statusClassNames[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                      <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>
                      {item.category.name} · {item.localBody.name}
                      {item.ward === null ? '' : ` · ${item.ward.name}`} · location generalized to
                      about {item.location.precisionMeters.toLocaleString()} m
                    </p>
                    <Link href={`/transparency/${item.publicId}`}>View public report</Link>
                  </article>
                </li>
              ))}
            </ol>
            {loadState.result.hasMore && loadState.result.nextCursor !== null ? (
              <div>
                {paginationError === null ? null : (
                  <p aria-live="assertive" className="error-notice" role="alert">
                    {paginationError}
                  </p>
                )}
                <button
                  className="secondary-button transparency-load-more"
                  disabled={isLoadingMore}
                  onClick={() => void loadMore()}
                  type="button"
                >
                  {isLoadingMore
                    ? 'Loading…'
                    : paginationError === null
                      ? 'Load more public reports'
                      : 'Try loading more again'}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
