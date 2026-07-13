'use client';

export default function AccountError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="centered-page">
      <section className="content-card error-card">
        <h1>We could not load your account</h1>
        <p className="error-notice" role="alert">
          Please try again. Your saved account data has not been changed.
        </p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
