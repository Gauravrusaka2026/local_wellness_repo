export default function ComplaintsLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="centered-page">
      <p className="loading-indicator">Loading your complaint history…</p>
    </main>
  );
}
