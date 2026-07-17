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
import { getSignedInAdminEmail } from '../lib/auth/service';
import { getGovernmentInvitationOptions } from '../lib/api/government-invitations';
import { createServerSupabaseClient } from '../lib/supabase/server';
import { GovernmentInvitationForm } from './invitation-form';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminConsole />;
}

type AdminConsoleLoadResult =
  | Readonly<{ status: 'error'; accountEmail: string | null; message: string }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      accessScope: Awaited<ReturnType<typeof getAdminAccessScope>>;
      accountEmail: string;
      invitationOptions: Awaited<ReturnType<typeof getGovernmentInvitationOptions>>;
    }>;

const loadAdminConsole = async (): Promise<AdminConsoleLoadResult> => {
  let accountEmail: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    accountEmail = await getSignedInAdminEmail(supabase);
    const accessScope = await getAdminAccessScope(accessToken);
    const invitationOptions = hasGovernmentInvitationAccess(accessScope)
      ? await getGovernmentInvitationOptions(accessToken)
      : { authorities: [], departments: [], wards: [] };

    return { accessScope, accountEmail, invitationOptions, status: 'success' };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { status: 'signed-out' };
    }

    return { accountEmail, message: getUserFacingApiError(error), status: 'error' };
  }
};

const SignedInAccount = ({ email }: Readonly<{ email: string }>) => (
  <aside
    aria-label="Signed-in administrator account"
    className="account-context account-context-wide"
  >
    <span>Signed in as</span>
    <strong>{email}</strong>
    <form action={signOutAction}>
      <button className="text-button" type="submit">
        Sign out and use another account
      </button>
    </form>
  </aside>
);

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
          {result.accountEmail === null ? null : <SignedInAccount email={result.accountEmail} />}
          <div className="button-row">
            <a className="primary-link" href="/">
              Try again
            </a>
            {result.accountEmail === null ? (
              <form action={signOutAction}>
                <button className="secondary-button" type="submit">
                  Clear session and sign in again
                </button>
              </form>
            ) : null}
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
          <SignedInAccount email={result.accountEmail} />
          <p>
            This signed-in account has no active platform or municipal administrator role. A
            Supabase Auth account alone is not authorization, and this console cannot grant its own
            privileges.
          </p>
          <p className="muted">
            Ask an existing authorized platform administrator to review the invitation, active
            membership, role, and scope. Standard government officials should use the Government
            Dashboard after they are invited.
          </p>
          <a className="help-link" href="/auth/help">
            View account and authorization help
          </a>
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
        <SignedInAccount email={result.accountEmail} />
      </header>

      <aside className="security-banner">
        <strong>
          {canAssignPrivilegedRoles
            ? 'Active global administrator scope verified'
            : 'Active municipal administrator scope verified'}
        </strong>
        <span>Current role and scope verified by the API</span>
      </aside>

      <section aria-labelledby="onboarding-heading" className="content-card onboarding-guidance">
        <p className="eyebrow">Before you invite an official</p>
        <h2 id="onboarding-heading">Authentication and authorization are separate</h2>
        <ol>
          <li>Use the official’s exact work email; that becomes their sign-in identity.</li>
          <li>Choose only the reviewed authority, role, and scope they actually need.</li>
          <li>The official accepts the invitation and enrolls their own authenticator.</li>
          <li>
            Standard officers work in the Government Dashboard. Only authorized platform or
            municipal administrators use this Admin Console.
          </li>
        </ol>
        <p className="muted">
          Never create a shared official account, scan another person’s QR code, or assign access
          through Auth metadata. The API and database remain authoritative.
        </p>
      </section>

      <section aria-labelledby="invitation-heading" className="content-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Privileged operation</p>
            <h2 id="invitation-heading">Create an invitation</h2>
          </div>
          <span className="audit-badge">Audited</span>
        </div>
        <p className="muted">
          Confirm the official email, reviewed authority, role, scope, and optional expiry before
          submitting. Placeholder governance records are excluded, and the browser never receives a
          service credential.
        </p>
        <GovernmentInvitationForm
          canAssignPrivilegedRoles={canAssignPrivilegedRoles}
          fixedAuthorityId={fixedAuthorityId}
          options={result.invitationOptions}
        />
      </section>
    </main>
  );
};
