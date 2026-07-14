export default function ComplaintNotFound() {
  return (
    <main className="centered-page">
      <section className="content-card denied-card">
        <p className="eyebrow">Government complaint workspace</p>
        <h1>Complaint not found</h1>
        <p>The complaint does not exist or is not visible in your current scope.</p>
        <a className="primary-link" href="/">
          Return to queue
        </a>
      </section>
    </main>
  );
}
