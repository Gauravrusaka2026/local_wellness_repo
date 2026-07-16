import Link from 'next/link';

export default function Page() {
  return (
    <main className="landing-page">
      <section className="hero">
        <p className="eyebrow">Maharashtra civic access</p>
        <h1>Report local problems. Follow what happens next.</h1>
        <p className="hero-copy">
          Local Wellness helps residents reach the correct civic authority without needing to know
          the ward, department, or officer in advance.
        </p>
        <div className="button-row">
          <Link className="primary-link" href="/auth/login?next=/account">
            Sign in or create an account
          </Link>
          <Link className="secondary-link" href="/account">
            Open your account
          </Link>
          <Link className="secondary-link" href="/transparency">
            Explore reviewed public reports
          </Link>
        </div>
        <p className="emergency-note">
          Local Wellness is not an emergency service. For immediate danger, call 112.
        </p>
      </section>
    </main>
  );
}
