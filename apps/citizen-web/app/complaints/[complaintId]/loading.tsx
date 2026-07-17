export default function ComplaintDetailLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="centered-page">
      <p className="loading-indicator">Loading complaint status and government action…</p>
    </main>
  );
}
