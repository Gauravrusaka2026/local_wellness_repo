import Link from 'next/link';

export default function ReportPage() {
  return (
    <main className="content-page">
      <p className="eyebrow">Report an issue</p>
      <h1>Start with the mobile capture flow</h1>
      <p className="lede">
        The secure report form uses live camera, location and private evidence checks. Sign in, then
        continue in the Expo app while you are at the issue.
      </p>
      <div className="button-row">
        <Link className="primary-link" href="/auth/login?next=/account">
          Sign in to continue
        </Link>
        <Link className="secondary-link" href="/transparency">
          Browse reviewed issues first
        </Link>
      </div>
      <div className="content-card">
        <h2>What happens next</h2>
        <ol>
          <li>Capture a photo or video at the issue.</li>
          <li>Confirm the current location and category.</li>
          <li>Review the private routing and submit.</li>
        </ol>
        <p className="muted">
          No report is created from this preview page, and no contact details are exposed here.
        </p>
      </div>
    </main>
  );
}
