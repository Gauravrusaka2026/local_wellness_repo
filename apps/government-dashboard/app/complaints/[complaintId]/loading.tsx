export default function ComplaintLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="centered-page">
      <p className="loading-indicator">Loading the authorized complaint record…</p>
    </main>
  );
}
