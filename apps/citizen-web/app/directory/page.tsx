import Link from 'next/link';

export default function DirectoryPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">Governing bodies</p>
      <h1>Find the authority for your location</h1>
      <p className="lede">
        Verified jurisdiction lookup is available inside the signed-in mobile flow. Contact values
        stay private and are never guessed from a ward name.
      </p>
      <div className="content-card">
        <h2>Directory preview</h2>
        <p className="muted">
          A public office directory is not active until its source, contact and privacy policy are
          approved.
        </p>
        <Link className="primary-link" href="/auth/login?next=/account">
          Sign in for location lookup
        </Link>
      </div>
    </main>
  );
}
