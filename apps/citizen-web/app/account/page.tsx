import { redirect } from 'next/navigation';

import {
  AuthenticationRequiredError,
  getUserFacingApiError,
  getVerifiedCitizenSession,
  type VerifiedCitizenSession,
} from '../../lib/api/client';
import {
  getProfile,
  isProfileOnboardingComplete,
  isProfileSetupRequired,
} from '../../lib/api/profile';
import { signOutAction } from '../../lib/auth/actions';
import { getCitizenPhoneMfaMode } from '../../lib/environment';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { ProfileForm } from './profile-form';
import { ProfileImageCard } from './profile-image-card';

export const dynamic = 'force-dynamic';

type AccountLoadResult =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{
      status: 'profile-setup-required';
      identity: VerifiedCitizenSession['identity'];
    }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{
      status: 'success';
      identity: VerifiedCitizenSession['identity'];
      profile: Awaited<ReturnType<typeof getProfile>>;
    }>;

const loadAccount = async (): Promise<AccountLoadResult> => {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await getVerifiedCitizenSession(supabase);

    try {
      const profile = await getProfile(session.accessToken);

      return { identity: session.identity, profile, status: 'success' };
    } catch (error) {
      if (isProfileSetupRequired(error)) {
        return { identity: session.identity, status: 'profile-setup-required' };
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { status: 'signed-out' };
    }

    return { message: getUserFacingApiError(error), status: 'error' };
  }
};

const getSignedInContact = (
  identity: VerifiedCitizenSession['identity'],
  profile?: Awaited<ReturnType<typeof getProfile>>,
): string =>
  identity.email ?? identity.phone ?? profile?.email ?? profile?.phone ?? 'Verified account';

const AccountActions = () => (
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
);

export default async function AccountPage() {
  const result = await loadAccount();
  const phoneMfaIsEnforced = getCitizenPhoneMfaMode() === 'enforce';

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
          <AccountActions />
        </section>
      </main>
    );
  }

  if (result.status === 'profile-setup-required') {
    return (
      <main className="centered-page">
        <section className="content-card error-card">
          <p className="eyebrow">Citizen account</p>
          <h1>Account setup is not ready</h1>
          <p className="account-contact">Signed in as {getSignedInContact(result.identity)}</p>
          <p aria-live="polite" className="error-notice" role="status">
            Your sign-in succeeded, but we could not finish creating your account profile. Try
            again. If this continues, ask the Local Wellness administrator to check account
            provisioning.
          </p>
          <AccountActions />
        </section>
      </main>
    );
  }

  const onboardingComplete = isProfileOnboardingComplete(result.profile);

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
      <section aria-label="Account status" className="account-summary">
        <div>
          <span>Signed in as</span>
          <strong>{getSignedInContact(result.identity, result.profile)}</strong>
        </div>
        <div>
          <span>Profile status</span>
          <strong>{onboardingComplete ? 'Complete' : 'Setup needed'}</strong>
        </div>
      </section>
      {!phoneMfaIsEnforced ? (
        <p className="setup-notice" role="status">
          Email-and-password access is active. Phone OTP verification is staged and will become
          required after the project SMS provider is configured.
        </p>
      ) : null}
      <ProfileImageCard profile={result.profile} />
      <section aria-labelledby="profile-heading" className="content-card">
        <h2 id="profile-heading">Personal details</h2>
        {onboardingComplete ? null : (
          <p aria-live="polite" className="setup-notice" role="status">
            Your account is active. Add your name and language preference to finish setup.
          </p>
        )}
        <ProfileForm profile={result.profile} />
      </section>
    </main>
  );
}
