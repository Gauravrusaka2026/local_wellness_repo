import { redirect } from 'next/navigation';

import { getGovernmentAccessScope, type GovernmentAccessScope } from '../../lib/api/access-scope';
import { getGovernmentKpiSnapshots, getUserFacingKpiError } from '../../lib/api/accountability';
import {
  ApiError,
  AuthenticationRequiredError,
  getVerifiedAccessToken,
} from '../../lib/api/client';
import { signOutAction } from '../../lib/auth/actions';
import {
  filterKpiSnapshots,
  parseKpiSearch,
  type AccountabilitySearchParameters,
  type ParsedKpiSearch,
} from '../../lib/accountability/query';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { KpiAuthorityRequired, KpiDashboard } from './kpi-view';

export const dynamic = 'force-dynamic';

type PageProperties = Readonly<{
  searchParams: Promise<AccountabilitySearchParameters>;
}>;

type LoadResult =
  | Readonly<{
      status: 'authority-required';
      parsed: ParsedKpiSearch;
      scope: GovernmentAccessScope;
    }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'no-scope' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      parsed: ParsedKpiSearch;
      result: Awaited<ReturnType<typeof getGovernmentKpiSnapshots>>;
      scope: GovernmentAccessScope;
    }>;

const loadKpis = async (search: AccountabilitySearchParameters): Promise<LoadResult> => {
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
    if (scope.roles.length === 0) return { status: 'no-scope' };
    const parsed = parseKpiSearch(search, scope);
    if (parsed.query.authorityId === undefined) {
      return { parsed, scope, status: 'authority-required' };
    }
    const result = await getGovernmentKpiSnapshots(accessToken, parsed.query);
    return { parsed, result, scope, status: 'success' };
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      return { status: 'signed-out' };
    }
    return { message: getUserFacingKpiError(error), status: 'error' };
  }
};

const SignOutButton = () => (
  <form action={signOutAction}>
    <button className="secondary-button" type="submit">
      Sign out
    </button>
  </form>
);

export default async function AccountabilityPage({ searchParams }: PageProperties) {
  const loaded = await loadKpis(await searchParams);
  if (loaded.status === 'signed-out') redirect('/auth/login?next=/accountability');

  if (loaded.status === 'authority-required') {
    return (
      <main className="dashboard-shell" id="main-content">
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
          <SignOutButton />
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
          <p className={loaded.status === 'error' ? 'error-notice' : undefined} role="alert">
            {loaded.status === 'no-scope'
              ? 'An active government role is required to view organizational snapshots.'
              : loaded.message}
          </p>
          <div className="button-row">
            <a className="primary-link" href="/">
              Return to complaint queue
            </a>
            <SignOutButton />
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
          <div className="header-actions">
            <a className="secondary-link" href="/">
              Complaint queue
            </a>
            <SignOutButton />
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
