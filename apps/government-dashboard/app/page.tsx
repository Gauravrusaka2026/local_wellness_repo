import { redirect } from 'next/navigation';

import { getGovernmentAccessScope, type GovernmentAccessScope } from '../lib/api/access-scope';
import { getGovernmentComplaintQueue } from '../lib/api/government-complaints';
import {
  ApiError,
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedAccessToken,
} from '../lib/api/client';
import { signOutAction } from '../lib/auth/actions';
import {
  parseQueueSearch,
  type DashboardSearchParameters,
  type ParsedQueueSearch,
} from '../lib/complaints/query';
import { createServerSupabaseClient } from '../lib/supabase/server';
import { ComplaintQueue, QueueFilters, QueueNavigation } from './queue-view';

export const dynamic = 'force-dynamic';

type PageProperties = Readonly<{
  searchParams: Promise<DashboardSearchParameters>;
}>;

type DashboardLoadResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'no-scope' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      parsed: ParsedQueueSearch;
      queue: Awaited<ReturnType<typeof getGovernmentComplaintQueue>>;
      scope: GovernmentAccessScope;
    }>;

const loadDashboard = async (
  searchParameters: DashboardSearchParameters,
): Promise<DashboardLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    let scope: GovernmentAccessScope;

    try {
      scope = await getGovernmentAccessScope(accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) return { status: 'no-scope' };
      throw error;
    }

    const parsed = parseQueueSearch(searchParameters, scope);
    const queue = await getGovernmentComplaintQueue(accessToken, parsed.query);
    return { parsed, queue, scope, status: 'success' };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      return { status: 'signed-out' };
    }
    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

const SignOutButton = () => (
  <form action={signOutAction}>
    <button className="secondary-button" type="submit">
      Sign out
    </button>
  </form>
);

export default async function Page({ searchParams }: PageProperties) {
  const result = await loadDashboard(await searchParams);

  if (result.status === 'signed-out') redirect('/auth/login');

  if (result.status === 'no-scope') {
    return (
      <main className="centered-page" id="main-content">
        <section className="content-card denied-card">
          <p className="eyebrow">Access pending</p>
          <h1>No active government scope</h1>
          <p>
            Your identity is verified, but no active role assignment is available. Contact your
            municipal administrator; this dashboard cannot grant access.
          </p>
          <SignOutButton />
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
          <div className="button-row">
            <a className="primary-link" href="/">
              Try again
            </a>
            <SignOutButton />
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
          <SignOutButton />
        </header>
        <QueueNavigation parsed={result.parsed} />
        <QueueFilters parsed={result.parsed} scope={result.scope} />
        <ComplaintQueue parsed={result.parsed} result={result.queue} />
      </main>
    </>
  );
}
