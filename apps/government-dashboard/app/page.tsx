import { redirect } from 'next/navigation';

import { getGovernmentAccessScope, type GovernmentAccessScope } from '../lib/api/access-scope';
import { getGovernmentComplaintQueue } from '../lib/api/government-complaints';
import {
  ApiError,
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedGovernmentSession,
  type VerifiedGovernmentIdentity,
} from '../lib/api/client';
import {
  parseQueueSearch,
  type DashboardSearchParameters,
  type ParsedQueueSearch,
} from '../lib/complaints/query';
import { createServerSupabaseClient } from '../lib/supabase/server';
import { GovernmentAuthorizationNote } from './auth/government-authorization-note';
import { GovernmentAccountContext } from './government-account-context';
import { ComplaintQueue, QueueFilters, QueueNavigation } from './queue-view';

export const dynamic = 'force-dynamic';

type PageProperties = Readonly<{
  searchParams: Promise<DashboardSearchParameters>;
}>;

type DashboardLoadResult =
  | Readonly<{ status: 'error'; identity: VerifiedGovernmentIdentity | null; message: string }>
  | Readonly<{ status: 'no-scope'; identity: VerifiedGovernmentIdentity }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      identity: VerifiedGovernmentIdentity;
      parsed: ParsedQueueSearch;
      queue: Awaited<ReturnType<typeof getGovernmentComplaintQueue>>;
      scope: GovernmentAccessScope;
    }>;

const loadDashboard = async (
  searchParameters: DashboardSearchParameters,
): Promise<DashboardLoadResult> => {
  let session: Awaited<ReturnType<typeof getVerifiedGovernmentSession>>;

  try {
    const supabase = await createServerSupabaseClient();
    session = await getVerifiedGovernmentSession(supabase);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return { status: 'signed-out' };
    return { identity: null, message: getUserFacingApiError(error), status: 'error' };
  }

  try {
    let scope: GovernmentAccessScope;

    try {
      scope = await getGovernmentAccessScope(session.accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return { identity: session.identity, status: 'no-scope' };
      }
      throw error;
    }

    const parsed = parseQueueSearch(searchParameters, scope);
    const queue = await getGovernmentComplaintQueue(session.accessToken, parsed.query);
    return { identity: session.identity, parsed, queue, scope, status: 'success' };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      return { status: 'signed-out' };
    }
    return {
      identity: session.identity,
      message: getUserFacingApiError(error),
      status: 'error',
    };
  }
};

export default async function Page({ searchParams }: PageProperties) {
  const result = await loadDashboard(await searchParams);

  if (result.status === 'signed-out') redirect('/auth/login');

  if (result.status === 'no-scope') {
    return (
      <main className="centered-page" id="main-content">
        <section className="content-card denied-card">
          <p className="eyebrow">Access pending</p>
          <h1>Signed in, but government access is not active</h1>
          <p>
            Authentication and authenticator verification are complete. An administrator must now
            confirm that this exact account has both an active authority membership and a current
            role assignment for the correct authority, ward, or department.
          </p>
          <ol aria-label="Government access status" className="auth-stage-list">
            <li className="complete">
              <strong>1. Email identity</strong>
              <span>Verified</span>
            </li>
            <li className="complete">
              <strong>2. Authenticator</strong>
              <span>Verified</span>
            </li>
            <li className="attention">
              <strong>3. Government authorization</strong>
              <span>Membership or scoped role needs administrator review</span>
            </li>
          </ol>
          <GovernmentAuthorizationNote />
          <GovernmentAccountContext
            authorizationLabel="Government authorization needs review"
            identity={result.identity}
          />
          <div className="button-row">
            <a className="primary-link" href="/">
              Check access again
            </a>
          </div>
        </section>
      </main>
    );
  }

  if (result.status === 'error') {
    return (
      <main className="centered-page" id="main-content">
        <section className="content-card denied-card">
          <p className="eyebrow">Government operations</p>
          <h1>Workspace unavailable</h1>
          <p aria-live="assertive" className="error-notice" role="alert">
            {result.message}
          </p>
          {result.identity === null ? null : (
            <GovernmentAccountContext
              authorizationLabel="Signed-in session verified; workspace check failed"
              identity={result.identity}
            />
          )}
          <div className="button-row">
            <a className="primary-link" href="/">
              Try again
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to complaint queue
      </a>
      <main className="dashboard-shell" id="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Government operations</p>
            <h1>Complaint workspace</h1>
            <p className="lede">
              Review only complaints permitted by your current authority, ward, and department
              assignments. Every workflow action is validated and audited by the server.
            </p>
          </div>
          <GovernmentAccountContext
            authorizationLabel={`${result.scope.roles.length} active scoped role${result.scope.roles.length === 1 ? '' : 's'}`}
            identity={result.identity}
          />
        </header>
        <QueueNavigation parsed={result.parsed} />
        <QueueFilters parsed={result.parsed} scope={result.scope} />
        <ComplaintQueue parsed={result.parsed} result={result.queue} />
      </main>
    </>
  );
}
