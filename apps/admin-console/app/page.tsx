import { redirect } from 'next/navigation';

import {
  getAdminAccessScope,
  hasGovernmentInvitationAccess,
  hasPlatformAdminAccess,
} from '../lib/api/access-scope';
import {
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedAccessToken,
} from '../lib/api/client';
import { signOutAction } from '../lib/auth/actions';
import { createServerSupabaseClient } from '../lib/supabase/server';
import { GovernmentInvitationForm } from './invitation-form';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminConsole />;
}

type AdminConsoleLoadResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{ status: 'success'; accessScope: Awaited<ReturnType<typeof getAdminAccessScope>> }>;

const loadAdminConsole = async (): Promise<AdminConsoleLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const accessScope = await getAdminAccessScope(accessToken);

    return { accessScope, status: 'success' };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { status: 'signed-out' };
    }

    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

const AdminConsole = async () => {
  const result = await loadAdminConsole();

  if (result.status === 'signed-out') {
    redirect('/auth/login');
  }

  if (result.status === 'error') {
    return (
      <main className="centered-page">
        <section className="content-card denied-card">
          <p className="eyebrow">Platform administration</p>
          <h1>Administrator access could not be verified</h1>
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

  if (!hasGovernmentInvitationAccess(result.accessScope)) {
    return (
      <main className="centered-page">
        <section className="content-card denied-card">
          <p className="eyebrow">Authorization denied</p>
          <h1>Government invitation access required</h1>
          <p>
            Your identity is signed in, but it has no active platform or municipal administrator
            role. This console cannot grant its own privileges.
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

  const platformRole = result.accessScope.roles.find(
    (role) => role.code === 'platform_admin' && role.scopeType === 'global',
  );
  const canAssignPrivilegedRoles = hasPlatformAdminAccess(result.accessScope);
  const invitationAdminRole =
    platformRole ??
    result.accessScope.roles.find(
      (role) => role.code === 'municipal_admin' && role.scopeType === 'authority',
    );
  const fixedAuthorityId = canAssignPrivilegedRoles ? null : (invitationAdminRole?.scopeId ?? '');

  return (
    <main className="admin-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Platform administration</p>
          <h1>Government identity invitations</h1>
          <p className="lede">
            Invite one verified government user at a time. Authority membership and scoped role
            assignment are created atomically by the API.
          </p>
        </div>
        <form action={signOutAction}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <aside className="security-banner">
        <strong>
          {canAssignPrivilegedRoles
            ? 'Active global administrator scope verified'
            : 'Active municipal administrator scope verified'}
        </strong>
        <span>Assignment {invitationAdminRole?.assignmentId ?? 'verified by API'}</span>
      </aside>

      <section aria-labelledby="invitation-heading" className="content-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Privileged operation</p>
            <h2 id="invitation-heading">Create an invitation</h2>
          </div>
          <span className="audit-badge">Audited</span>
        </div>
        <p className="muted">
          Confirm the official email, authority UUID, role, scope, and optional expiry before
          submitting. The browser never receives a service credential.
        </p>
        <GovernmentInvitationForm
          canAssignPrivilegedRoles={canAssignPrivilegedRoles}
          fixedAuthorityId={fixedAuthorityId}
        />
      </section>
    </main>
  );
};
