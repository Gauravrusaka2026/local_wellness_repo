import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApiError } from '../../../lib/api/client';
import { getPublicComplaint } from '../../../lib/api/transparency';

export const dynamic = 'force-dynamic';

const statusLabels = {
  closed: 'Closed',
  in_progress: 'In progress',
  reported: 'Reported',
  resolved: 'Resolved',
} as const;

export default async function PublicComplaintPage({
  params,
}: Readonly<{ params: Promise<{ publicId: string }> }>) {
  const { publicId } = await params;
  let complaint;
  try {
    complaint = await getPublicComplaint(publicId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const relatedPublicReports =
    complaint.duplicateGroup === null
      ? []
      : complaint.duplicateGroup.relatedPublicIds.map((relatedPublicId) => ({
          label:
            relatedPublicId === complaint.duplicateGroup?.canonicalPublicId
              ? 'Primary public report'
              : 'Related public report',
          publicId: relatedPublicId,
        }));

  return (
    <main className="public-detail-page">
      <header className="public-detail-header">
        <div>
          <p className="eyebrow">Reviewed public report</p>
          <h1>{complaint.title}</h1>
          <p className="lede">
            {statusLabels[complaint.status]} · submitted{' '}
            {new Date(complaint.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <Link className="secondary-link" href="/transparency">
          Back to nearby reports
        </Link>
      </header>

      <section aria-labelledby="public-summary-heading" className="public-detail-card">
        <div className="public-detail-grid">
          <div>
            <span>Public reference</span>
            <strong>{complaint.publicId}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{statusLabels[complaint.status]}</strong>
          </div>
          <div>
            <span>Local body</span>
            <strong>{complaint.localBody.name}</strong>
          </div>
          <div>
            <span>Ward</span>
            <strong>{complaint.ward?.name ?? 'Not published'}</strong>
          </div>
          <div>
            <span>Location precision</span>
            <strong>About {complaint.location.precisionMeters.toLocaleString()} metres</strong>
          </div>
        </div>
        <h2 id="public-summary-heading">Public summary</h2>
        <p className="public-summary">{complaint.summary}</p>
        {complaint.duplicateGroup === null ? null : (
          <section
            aria-labelledby="related-public-reports-heading"
            className="related-public-reports"
          >
            <h2 id="related-public-reports-heading">Related public reports</h2>
            <p>
              This is one of {complaint.duplicateGroup.totalCount.toLocaleString()} reviewed public
              reports linked to the same issue.
            </p>
            <ul>
              {relatedPublicReports.map((relatedReport) => (
                <li key={relatedReport.publicId}>
                  <span>{relatedReport.label}</span>
                  <Link href={`/transparency/${relatedReport.publicId}`}>
                    {relatedReport.publicId}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="public-location-note">
          <strong>Privacy-protected location</strong>
          <p>
            This report uses an approved approximate point. Exact complaint coordinates, citizen
            identity, private messages, original media, and internal notes are not part of this
            page.
          </p>
        </div>
      </section>
    </main>
  );
}
