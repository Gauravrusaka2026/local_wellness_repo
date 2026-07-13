export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="centered-page">
      <p className="loading-indicator">Verifying administrator access…</p>
    </main>
  );
}
