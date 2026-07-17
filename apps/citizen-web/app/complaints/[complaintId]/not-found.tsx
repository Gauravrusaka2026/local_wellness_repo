import Link from 'next/link';

export default function ComplaintNotFound() {
  return (
    <main className="centered-page">
      <section className="content-card error-card">
        <p className="eyebrow">Private complaint</p>
        <h1>Complaint not available</h1>
        <p>This complaint does not exist or is not owned by the account you are currently using.</p>
        <div className="button-row">
          <Link className="primary-link" href="/complaints">
            Back to your complaints
          </Link>
          <Link className="secondary-link" href="/auth/login?next=/complaints">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}
