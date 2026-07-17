import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  AuthenticationRequiredError,
  getVerifiedCitizenSession,
  type VerifiedCitizenSession,
} from '../../lib/api/client';
import { getUserFacingComplaintError, listComplaints } from '../../lib/api/complaints';
import { signOutAction } from '../../lib/auth/actions';
import { getCitizenAccountLabel } from '../../lib/auth/presentation';
import {
  formatComplaintDateTime,
  getComplaintStatusLabel,
  getComplaintStatusTone,
} from '../../lib/complaints/presentation';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type ComplaintHistoryResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{
      identity: VerifiedCitizenSession['identity'];
      page: Awaited<ReturnType<typeof listComplaints>>;
      status: 'success';
    }>
  | Readonly<{ status: 'signed-out' }>;

const loadComplaintHistory = async (cursor?: string): Promise<ComplaintHistoryResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await getVerifiedCitizenSession(supabase);
    const page = await listComplaints(session.accessToken, cursor);
    return { identity: session.identity, page, status: 'success' };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return { status: 'signed-out' };
    return { message: getUserFacingComplaintError(error), status: 'error' };
  }
};

export default async function ComplaintHistoryPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ cursor?: string | string[] }> }>) {
  const parameters = await searchParams;
  const cursor = typeof parameters.cursor === 'string' ? parameters.cursor : undefined;
  const result = await loadComplaintHistory(cursor);

  if (result.status === 'signed-out') redirect('/auth/login?next=/complaints');

  if (result.status === 'error') {
    return (
      <main className="complaint-shell">
        <section className="complaint-state-card error-card">
          <p className="eyebrow">Your complaints</p>
          <h1>Complaint history unavailable</h1>
          <p aria-live="assertive" className="error-notice" role="alert">
            {result.message}
          </p>
          <div className="button-row">
            <Link className="primary-link" href="/complaints">
              Try again
            </Link>
            <Link className="secondary-link" href="/account">
              Open account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="complaint-shell">
      <header className="complaint-page-header">
        <div>
          <p className="eyebrow">Citizen complaint history</p>
          <h1>Your complaints</h1>
          <p className="lede">
            Track status changes and government action for complaints registered under this account.
          </p>
          <div className="auth-context compact">
            <span>Signed in as</span>
            <strong>{getCitizenAccountLabel(result.identity)}</strong>
            <p>Only complaints owned by this verified account are shown.</p>
          </div>
        </div>
        <nav aria-label="Citizen navigation" className="complaint-navigation">
          <Link className="secondary-link" href="/account">
            Profile
          </Link>
          <Link className="secondary-link" href="/transparency">
            Public reports
          </Link>
          <form action={signOutAction}>
            <button className="secondary-button" type="submit">
              Sign out / switch account
            </button>
          </form>
        </nav>
      </header>

      {result.page.items.length === 0 ? (
        <section className="complaint-state-card">
          <h2>No complaints on this page</h2>
          <p>
            {cursor === undefined
              ? 'No submitted complaints are registered under this account yet.'
              : 'This complaint-history page is empty. Return to the first page.'}
          </p>
          <div className="button-row">
            {cursor === undefined ? null : (
              <Link className="primary-link" href="/complaints">
                Return to first page
              </Link>
            )}
            <Link className="secondary-link" href="/transparency">
              Explore reviewed public reports
            </Link>
          </div>
        </section>
      ) : (
        <ol className="complaint-history-list">
          {result.page.items.map((complaint) => {
            const tone = getComplaintStatusTone(complaint.status);
            return (
              <li key={complaint.id}>
                <article className="complaint-history-card">
                  <div className="complaint-card-topline">
                    <span className={`complaint-status complaint-status-${tone}`}>
                      {getComplaintStatusLabel(complaint.status)}
                    </span>
                    <time dateTime={complaint.updatedAt}>
                      Updated {formatComplaintDateTime(complaint.updatedAt)}
                    </time>
                  </div>
                  <h2>{complaint.categoryName}</h2>
                  <dl className="complaint-card-metadata">
                    <div>
                      <dt>Complaint number</dt>
                      <dd>{complaint.complaintNumber}</dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>
                        <time dateTime={complaint.submittedAt}>
                          {formatComplaintDateTime(complaint.submittedAt)}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Visibility</dt>
                      <dd>
                        {complaint.visibility === 'private' ? 'Private to your account' : 'Public'}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    className="primary-link complaint-card-link"
                    href={`/complaints/${complaint.id}`}
                  >
                    View status and government action
                  </Link>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <nav aria-label="Complaint history pages" className="complaint-pagination">
        {cursor === undefined ? (
          <span />
        ) : (
          <Link className="secondary-link" href="/complaints">
            First page
          </Link>
        )}
        {result.page.hasMore && result.page.nextCursor !== null ? (
          <Link
            className="primary-link"
            href={`/complaints?cursor=${encodeURIComponent(result.page.nextCursor)}`}
          >
            Older complaints
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
