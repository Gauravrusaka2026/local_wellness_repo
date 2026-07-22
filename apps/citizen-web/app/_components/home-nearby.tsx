'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PublicComplaintMapItem } from '@local-wellness/types';

import { getUserFacingApiError } from '../../lib/api/client';
import { createNearbyViewport, listPublicComplaints } from '../../lib/api/transparency';
import { ProvenanceBadge } from './badges';
import { CivicIcon } from './icons';

type NearbyState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ message: string; status: 'error' }>
  | Readonly<{ items: readonly PublicComplaintMapItem[]; status: 'ready' }>;

const requestCurrentPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot provide a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 12_000,
    });
  });

const statusLabels = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
} as const;

const getLocationError = (error: unknown): string => {
  if (error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED) {
    return 'Location access was not granted. You can still open the public explorer and choose another area later.';
  }
  if (error instanceof Error && error.message === 'This browser cannot provide a location.') {
    return error.message;
  }
  return getUserFacingApiError(error);
};

export function HomeNearbyReports() {
  const [state, setState] = useState<NearbyState>({ status: 'idle' });

  const load = async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const position = await requestCurrentPosition();
      const viewport = createNearbyViewport(position.coords.latitude, position.coords.longitude);
      const result = await listPublicComplaints({
        ...viewport,
        limit: 6,
        sort: 'recent',
        zoom: 12,
      });
      setState({ items: result.items, status: 'ready' });
    } catch (error) {
      setState({ message: getLocationError(error), status: 'error' });
    }
  };

  return (
    <section aria-labelledby="nearby-heading" className="home-section nearby-preview">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Your area</p>
          <h2 id="nearby-heading">Nearby reviewed issues</h2>
        </div>
        <Link className="text-link" href="/transparency">
          Open map and filters <CivicIcon aria-hidden="true" name="arrow" />
        </Link>
      </div>

      {state.status === 'idle' ? (
        <div className="nearby-consent-card">
          <div className="feature-icon is-blue">
            <CivicIcon aria-hidden="true" name="location" />
          </div>
          <div>
            <h3>See what has already been reported</h3>
            <p>
              Use your current area to find reviewed reports and avoid a duplicate. Your exact
              position is not displayed or sent to an external map provider.
            </p>
          </div>
          <button className="secondary-button" onClick={() => void load()} type="button">
            Use my current area
          </button>
        </div>
      ) : null}
      {state.status === 'loading' ? (
        <div aria-live="polite" className="nearby-consent-card is-loading" role="status">
          <span aria-hidden="true" className="activity-spinner" />
          <p>Finding reviewed issues near you…</p>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="nearby-consent-card is-error">
          <CivicIcon aria-hidden="true" name="report" />
          <p aria-live="assertive" role="alert">
            {state.message}
          </p>
          <button className="secondary-button" onClick={() => void load()} type="button">
            Try again
          </button>
        </div>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <div className="empty-state-card">
          <div className="feature-icon is-green">
            <CivicIcon aria-hidden="true" name="check" />
          </div>
          <h3>No reviewed issues nearby yet</h3>
          <p>Private and unreviewed complaints are intentionally not shown.</p>
          <Link className="primary-link" href="/report">
            Report a civic issue
          </Link>
        </div>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <div className="home-report-grid">
          {state.items.map((item) => (
            <article className="public-report-card" key={item.publicId}>
              <div className="report-card-header">
                <span className={`status-pill status-${item.status}`}>
                  {statusLabels[item.status]}
                </span>
                <time dateTime={item.updatedAt}>
                  {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                    new Date(item.updatedAt),
                  )}
                </time>
              </div>
              <div className="report-card-body">
                <span className="category-label">{item.category.name}</span>
                <h3>{item.title}</h3>
                <p>{item.ward?.name ?? item.localBody.name} · approximate public location</p>
              </div>
              <div className="report-card-signals">
                <ProvenanceBadge provenance="citizen_reported" />
                {item.supportCount > 0 ? <span>{item.supportCount} supporter(s)</span> : null}
              </div>
              <Link className="card-link" href={`/transparency/${item.publicId}`}>
                View public report <CivicIcon aria-hidden="true" name="arrow" />
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
