export default function PublicComplaintLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="centered-page">
      <p className="loading-indicator">Loading reviewed public report…</p>
    </main>
  );
}
