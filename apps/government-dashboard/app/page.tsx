import { redirect } from 'next/navigation';

import {
  getGovernmentAccessScope,
  getScopeTypeLabel,
  hasGovernmentAccess,
  type GovernmentAccessScope,
} from '../lib/api/access-scope';
import {
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedAccessToken,
} from '../lib/api/client';
import { signOutAction } from '../lib/auth/actions';
import { createServerSupabaseClient } from '../lib/supabase/server';

export const dynamic = 'force-dynamic';

const formatDate = (value: string | null): string => {
  if (value === null) {
    return 'No scheduled expiry';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const AccessScopeView = ({ scope }: Readonly<{ scope: GovernmentAccessScope }>) => (
  <>
    <section aria-labelledby="role-scope-heading" className="content-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Authorization</p>
          <h2 id="role-scope-heading">Active role scopes</h2>
        </div>
        <span className="status-badge">Verified by server</span>
      </div>
      <div className="scope-grid">
        {scope.roles.map((role) => (
          <article className="scope-card" key={role.assignmentId}>
            <p className="scope-type">{getScopeTypeLabel(role.scopeType)}</p>
            <h3>{role.name}</h3>
            <dl>
              <div>
                <dt>Role code</dt>
                <dd>{role.code}</dd>
              </div>
              <div>
                <dt>Scope ID</dt>
                <dd>{role.scopeId ?? 'Global platform scope'}</dd>
              </div>
              <div>
                <dt>Effective from</dt>
                <dd>{formatDate(role.effectiveFrom)}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{formatDate(role.effectiveUntil)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>

    <section aria-labelledby="authority-heading" className="content-card">
      <h2 id="authority-heading">Authority memberships</h2>
      {scope.authorities.length === 0 ? (
        <p className="muted">This role uses global scope and has no municipal membership.</p>
      ) : (
        <ul className="membership-list">
          {scope.authorities.map((membership) => (
            <li key={membership.membershipId}>
              <div>
                <strong>Authority {membership.authorityId}</strong>
                <span>Active from {formatDate(membership.effectiveFrom)}</span>
              </div>
              <span>{formatDate(membership.effectiveUntil)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
);

export default function Page() {
  return <Dashboard />;
}

type DashboardLoadResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{ status: 'success'; scope: GovernmentAccessScope }>;

const loadDashboard = async (): Promise<DashboardLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const scope = await getGovernmentAccessScope(accessToken);

    return { scope, status: 'success' };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { status: 'signed-out' };
    }

    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

const Dashboard = async () => {
  const result = await loadDashboard();

  if (result.status === 'signed-out') {
    redirect('/auth/login');
  }

  if (result.status === 'error') {
    return (
      <main className="centered-page">
        <section className="content-card denied-card">
          <p className="eyebrow">Government operations</p>
          <h1>Access could not be verified</h1>
          <p aria-live="assertive" className="error-notice" role="alert">
            {result.message}
          </p>
          <div className="button-row">
            <a className="primary-link" href="/">
              Try again
            </a>
            <form action={signOutAction}>
              <button className="secondary-button" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  if (!hasGovernmentAccess(result.scope)) {
    return (
      <main className="centered-page">
        <section className="content-card denied-card">
          <p className="eyebrow">Access pending</p>
          <h1>No active government scope</h1>
          <p>
            Your identity is verified, but no active role assignment is available. Contact your
            municipal administrator; this dashboard cannot grant access.
          </p>
          <form action={signOutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Government operations</p>
          <h1>Your assigned access</h1>
          <p className="lede">
            The API returns only current roles and authority memberships permitted by server-side
            authorization and database policies.
          </p>
        </div>
        <form action={signOutAction}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <AccessScopeView scope={result.scope} />
    </main>
  );
};
