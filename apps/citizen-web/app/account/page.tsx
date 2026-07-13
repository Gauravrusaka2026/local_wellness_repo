import { redirect } from 'next/navigation';

import {
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedAccessToken,
} from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';
import { signOutAction } from '../../lib/auth/actions';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

type AccountLoadResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{ status: 'success'; profile: Awaited<ReturnType<typeof getProfile>> }>;

const loadAccount = async (): Promise<AccountLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const profile = await getProfile(accessToken);

    return { profile, status: 'success' };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { status: 'signed-out' };
    }

    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

export default async function AccountPage() {
  const result = await loadAccount();

  if (result.status === 'signed-out') {
    redirect('/auth/login?next=/account');
  }

  if (result.status === 'error') {
    return (
      <main className="centered-page">
        <section className="content-card error-card">
          <p className="eyebrow">Citizen account</p>
          <h1>Profile unavailable</h1>
          <p aria-live="assertive" className="error-notice" role="alert">
            {result.message}
          </p>
          <div className="button-row">
            <a className="primary-link" href="/account">
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

  return (
    <main className="account-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Citizen account</p>
          <h1>Your profile</h1>
          <p className="lede">
            Complete your profile now so future complaint updates use your chosen language.
          </p>
        </div>
        <form action={signOutAction}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <section aria-labelledby="profile-heading" className="content-card">
        <h2 id="profile-heading">Personal details</h2>
        <ProfileForm profile={result.profile} />
      </section>
    </main>
  );
}
