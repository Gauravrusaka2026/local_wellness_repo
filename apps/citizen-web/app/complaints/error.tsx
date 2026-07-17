'use client';

import Link from 'next/link';

export default function ComplaintsError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="centered-page">
      <section className="content-card error-card">
        <h1>We could not load your complaints</h1>
        <p className="error-notice" role="alert">
          Please try again. No complaint data has been changed.
        </p>
        <div className="button-row">
          <button className="primary-button" onClick={reset} type="button">
            Try again
          </button>
          <Link className="secondary-link" href="/account">
            Open account
          </Link>
        </div>
      </section>
    </main>
  );
}
