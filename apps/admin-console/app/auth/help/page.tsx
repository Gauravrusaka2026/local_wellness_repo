import { signOutAction } from '../../../lib/auth/actions';

export default function AuthenticationHelpPage() {
  return (
    <main className="centered-page">
      <section aria-labelledby="auth-help-heading" className="auth-card auth-help-card">
        <p className="eyebrow">Admin Console access help</p>
        <h1 id="auth-help-heading">Choose and recover the right account</h1>
        <p className="lede">
          Authentication proves who is signing in. Government membership, role, and scope are
          separate server-controlled authorization records.
        </p>

        <section className="help-section">
          <h2>Which email should I use?</h2>
          <p>
            Use the exact official email address that an existing administrator invited and
            authorized. Requesting a sign-in email never creates an administrator or adds a role.
          </p>
          <p>
            Platform and municipal administrators may use this Admin Console. Government operators,
            ward officers, and department officers should sign in to the Government Dashboard.
          </p>
        </section>

        <section className="help-section">
          <h2>I used the wrong email</h2>
          <p>
            Sign out below, then request a new verification email for the correct account. Do not
            complete MFA for another person and do not share email or authenticator codes.
          </p>
        </section>

        <section className="help-section">
          <h2>I lost access to my authenticator</h2>
          <p>
            The Admin Console does not provide a self-service MFA reset or bypass. Contact the Local
            Wellness platform security administrator through a verified official channel. Recovery
            requires administrator approval, forced session revocation, provider-managed factor
            recovery, and an audit entry.
          </p>
          <p>
            Do not create a duplicate Supabase Auth user and do not ask someone to scan a QR code on
            your behalf.
          </p>
        </section>

        <section className="help-section">
          <h2>I am onboarding a government official</h2>
          <ol>
            <li>An authorized administrator creates an invitation for the official email.</li>
            <li>The invitation records the authority membership, role, and scope on the server.</li>
            <li>The official accepts the newest invitation and signs in using that same email.</li>
            <li>The official sets up their own authenticator on their own device.</li>
          </ol>
        </section>

        <div className="button-row auth-help-actions">
          <form action={signOutAction}>
            <button className="primary-button" type="submit">
              Sign out and start with another email
            </button>
          </form>
          <a className="secondary-link" href="/auth/login">
            Return to sign in
          </a>
        </div>
      </section>
    </main>
  );
}
