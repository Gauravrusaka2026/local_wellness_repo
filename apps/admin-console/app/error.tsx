'use client';

export default function ErrorPage({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="centered-page">
      <section className="content-card denied-card">
        <h1>Admin console unavailable</h1>
        <p className="error-notice" role="alert">
          No invitation was created. Try loading the console again.
        </p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
