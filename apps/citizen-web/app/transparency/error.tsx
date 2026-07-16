'use client';

export default function TransparencyError({
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="centered-page">
      <section className="content-card error-card">
        <h1>Public transparency is unavailable</h1>
        <p className="error-notice" role="alert">
          We could not load this public view. No private complaint information was exposed.
        </p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
