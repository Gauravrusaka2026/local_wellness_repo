import Link from 'next/link';

export default function CitizenAccessUnavailablePage() {
  return (
    <main className="centered-page">
      <section aria-labelledby="citizen-access-heading" className="content-card">
        <p className="eyebrow">Mobile app required</p>
        <h1 id="citizen-access-heading">Citizen account features are not available on the web</h1>
        <p className="lede">
          Use the JagrukSetu mobile app to sign in, report an issue, or track complaints registered
          under your account.
        </p>
        <p className="muted">
          You can still browse reviewed, privacy-protected public reports here without signing in.
        </p>
        <div className="button-row">
          <Link className="primary-link" href="/transparency">
            Browse public reports
          </Link>
          <Link className="secondary-link" href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
