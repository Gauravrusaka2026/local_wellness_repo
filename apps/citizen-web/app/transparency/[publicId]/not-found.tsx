import Link from 'next/link';

export default function PublicComplaintNotFound() {
  return (
    <main className="centered-page">
      <section className="content-card error-card">
        <p className="eyebrow">Public transparency</p>
        <h1>Report not available</h1>
        <p className="lede">
          This reference is not public, has been withdrawn, or does not exist. Local Wellness does
          not reveal which case applies.
        </p>
        <Link className="primary-link" href="/transparency">
          Explore public reports
        </Link>
      </section>
    </main>
  );
}
