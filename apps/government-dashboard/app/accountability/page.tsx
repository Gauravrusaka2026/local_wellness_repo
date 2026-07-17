import { redirect } from 'next/navigation';

import { getGovernmentAccessScope, type GovernmentAccessScope } from '../../lib/api/access-scope';
import { getGovernmentKpiSnapshots, getUserFacingKpiError } from '../../lib/api/accountability';
import {
  ApiError,
  AuthenticationRequiredError,
  getVerifiedGovernmentSession,
  type VerifiedGovernmentIdentity,
} from '../../lib/api/client';
import {
  filterKpiSnapshots,
  parseKpiSearch,
  type AccountabilitySearchParameters,
  type ParsedKpiSearch,
} from '../../lib/accountability/query';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { GovernmentAccountContext } from '../government-account-context';
import { AccountabilityUnavailableMessage, KpiAuthorityRequired, KpiDashboard } from './kpi-view';

export const dynamic = 'force-dynamic';

type PageProperties = Readonly<{
  searchParams: Promise<AccountabilitySearchParameters>;
}>;

type LoadResult =
  | Readonly<{
      status: 'authority-required';
      identity: VerifiedGovernmentIdentity;
      parsed: ParsedKpiSearch;
      scope: GovernmentAccessScope;
    }>
  | Readonly<{ status: 'error'; identity: VerifiedGovernmentIdentity; message: string }>
  | Readonly<{ status: 'no-scope'; identity: VerifiedGovernmentIdentity }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      identity: VerifiedGovernmentIdentity;
      parsed: ParsedKpiSearch;
      result: Awaited<ReturnType<typeof getGovernmentKpiSnapshots>>;
      scope: GovernmentAccessScope;
    }>;

const loadKpis = async (search: AccountabilitySearchParameters): Promise<LoadResult> => {
  let session: Awaited<ReturnType<typeof getVerifiedGovernmentSession>>;

  try {
    const supabase = await createServerSupabaseClient();
    session = await getVerifiedGovernmentSession(supabase);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return { status: 'signed-out' };
    throw error;
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
    if (scope.roles.length === 0) return { identity: session.identity, status: 'no-scope' };
    const parsed = parseKpiSearch(search, scope);
    if (parsed.query.authorityId === undefined) {
      return { identity: session.identity, parsed, scope, status: 'authority-required' };
    }
    const result = await getGovernmentKpiSnapshots(session.accessToken, parsed.query);
    return { identity: session.identity, parsed, result, scope, status: 'success' };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      return { status: 'signed-out' };
    }
    return {
      identity: session.identity,
      message: getUserFacingKpiError(error),
      status: 'error',
    };
  }
};

export default async function AccountabilityPage({ searchParams }: PageProperties) {
  const loaded = await loadKpis(await searchParams);
  if (loaded.status === 'signed-out') redirect('/auth/login?next=/accountability');

  if (loaded.status === 'authority-required') {
    return (
      <main className="dashboard-shell" id="main-content">
        <GovernmentAccountContext
          authorizationLabel={`${loaded.scope.roles.length} active scoped role${loaded.scope.roles.length === 1 ? '' : 's'}`}
          identity={loaded.identity}
        />
        {loaded.parsed.error === null ? null : (
          <p aria-live="assertive" className="error-notice" role="alert">
            {loaded.parsed.error}
          </p>
        )}
        <KpiAuthorityRequired
          accessScope={loaded.scope}
          selectedScopeRoleAssignmentId={loaded.parsed.filters.scopeRoleAssignmentId}
        />
        <div className="button-row">
          <a className="secondary-link" href="/">
            Return to complaint queue
          </a>
        </div>
      </main>
    );
  }

  if (loaded.status === 'no-scope' || loaded.status === 'error') {
    return (
      <main className="centered-page" id="main-content">
        <section className="content-card denied-card">
          <p className="eyebrow">Organizational accountability</p>
          <h1>
            {loaded.status === 'no-scope' ? 'No active government scope' : 'KPIs unavailable'}
          </h1>
          {loaded.status === 'error' ? (
            <AccountabilityUnavailableMessage message={loaded.message} status="error" />
          ) : (
            <AccountabilityUnavailableMessage status="no-scope" />
          )}
          <GovernmentAccountContext
            authorizationLabel={
              loaded.status === 'no-scope'
                ? 'Government authorization needs review'
                : 'Signed-in session verified; KPI check failed'
            }
            identity={loaded.identity}
          />
          <div className="button-row">
            <a className="primary-link" href="/">
              Return to complaint queue
            </a>
          </div>
        </section>
      </main>
    );
  }

  const items = filterKpiSnapshots(loaded.result.items, loaded.parsed);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to organizational KPIs
      </a>
      <main className="dashboard-shell" id="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Government accountability</p>
            <h1>Organizational performance</h1>
            <p className="lede">
              Review reproducible KPI snapshots for authorized municipalities, wards, and
              departments. Results remain organizational and never identify individual staff.
            </p>
          </div>
          <div className="header-account-stack">
            <a className="secondary-link" href="/">
              Complaint queue
            </a>
            <GovernmentAccountContext
              authorizationLabel={`${loaded.scope.roles.length} active scoped role${loaded.scope.roles.length === 1 ? '' : 's'}`}
              identity={loaded.identity}
            />
          </div>
        </header>
        {loaded.parsed.error === null ? null : (
          <p aria-live="assertive" className="error-notice" role="alert">
            {loaded.parsed.error}
          </p>
        )}
        <KpiDashboard
          accessScope={loaded.scope}
          filters={loaded.parsed.filters}
          items={items}
          result={loaded.result}
        />
      </main>
    </>
  );
}
