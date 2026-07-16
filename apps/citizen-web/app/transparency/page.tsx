import Link from 'next/link';

import { TransparencyExplorer } from './transparency-explorer';

export const dynamic = 'force-dynamic';

export default function TransparencyPage() {
  return (
    <main className="transparency-page">
      <header className="transparency-page-header">
        <div>
          <p className="eyebrow">Local transparency</p>
          <h1>Reviewed civic reports near you</h1>
          <p className="lede">
            Explore public-safe complaint summaries and deliberately approximate locations. Private
            reports, citizen identities, original media, and internal government details are never
            included.
          </p>
        </div>
        <Link className="secondary-link" href="/">
          Back to home
        </Link>
      </header>
      <TransparencyExplorer />
    </main>
  );
}
